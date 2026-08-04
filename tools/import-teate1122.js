#!/usr/bin/env node
// tools/import-teate1122.js
// teate1122（実サイト、../teate1122）専用の1回限りのインポートスクリプト。
// Astroソース(.astro)・social.ts・content/events/*.md・global.cssから実コンテンツを抽出し、
// core/schema/site.schema.json に準拠した site.json / pages/*.json を生成して sites/teate1122/ に書き出す。
//
// ponytail: 汎用Astro→JSONパーサーを作るのは今回のスコープに対して過剰なため作らない。
// teate1122の既知の固定構造（見出し・段落・特定のクラス名）を前提にした正規表現抽出に留める。
// 将来、他サイト/他形式のインポートが必要になった時点で、その時の要件に応じて汎用化を検討すればよい（YAGNI）。
// 依存ゼロ制約は core/ 配下のみに適用される。本スクリプトは tools/ 配下のNode CLIのため、
// node標準モジュール（fs/path/url）のみを使い、外部パッケージは追加していない。
//
// 使い方: node tools/import-teate1122.js [--src <teate1122リポジトリのパス>]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { validateSite, validatePage } from "../core/schema/validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseArgs(argv) {
  const args = { src: "/home/user/teate1122" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--src") args.src = argv[i + 1];
  }
  return args;
}

// ---------------------------------------------------------------------------
// 汎用テキスト抽出ヘルパー（このスクリプト専用。core/には持ち込まない）
// ---------------------------------------------------------------------------

/** HTMLタグを除去し、空白を正規化してテキストのみ返す。 */
function stripTags(str) {
  return str.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** source内の全ての <tag ...>...</tag> の中身をテキストで配列で返す。
 *  JSXの式展開（例: {item.title}）は動的な値でありソースの静的解析では復元できないため除外する。
 */
function extractAllTags(source, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  const out = [];
  let m;
  while ((m = re.exec(source))) {
    const text = stripTags(m[1]);
    if (!text || text.includes("{")) continue;
    out.push(text);
  }
  return out;
}

/** ノイズとして除外したい既知の文言（フォームのハニーポット案内等）を取り除く。 */
function excludeNoise(list, noiseTexts) {
  return list.filter((t) => !noiseTexts.includes(t));
}

/** frontmatter（--- 区切りのYAMLもどき）付きMarkdownを簡易パースする。
 *  値は "..." で囲まれた文字列 or 素の値（日付・enum）のみを想定した最小実装。
 */
function parseFrontmatter(markdown) {
  const m = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: "" };
  const [, yaml, rest] = m;
  const data = {};
  yaml.split("\n").forEach((line) => {
    const lm = line.match(/^(\w+):\s*(.*)$/);
    if (!lm) return;
    let [, key, value] = lm;
    value = value.trim();
    if (/^".*"$/.test(value)) value = value.slice(1, -1);
    data[key] = value;
  });
  return { data, body: rest.trim() };
}

function read(srcRoot, relPath) {
  return readFileSync(join(srcRoot, relPath), "utf-8");
}

/** astro.config.mjs の site: '...' フィールド（サイトURL）を読む。存在しなければundefined。 */
function extractAstroSiteUrl(srcRoot) {
  const path = join(srcRoot, "astro.config.mjs");
  if (!existsSync(path)) return undefined;
  const source = readFileSync(path, "utf-8");
  const m = source.match(/site:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : undefined;
}

// ---------------------------------------------------------------------------
// テーマ抽出: src/styles/global.css の @theme ブロックから色トークンを読む
// ---------------------------------------------------------------------------

function extractThemeColors(css) {
  const colorVars = {};
  const re = /--color-([a-z-]+):\s*(#[0-9a-fA-F]{3,8});/g;
  let m;
  while ((m = re.exec(css))) colorVars[m[1]] = m[2];

  return {
    bg: colorVars["bg"],
    surface: colorVars["surface"],
    text: colorVars["text"],
    textMuted: colorVars["text-muted"],
    accent: colorVars["accent-sage"],
    border: colorVars["border"],
  };
}

// font-heading/font-body はCSSのフォントスタック文字列だが、site.jsonが持つのは
// core/theme/tokens-to-css.js が既知のフォントIDセット（zen-old-mincho/noto-sans-jp/system）
// なので、CSS中の代表的なフォント名からIDへ対応づける（この2つのみの固定マッピングでよい）。
function detectFontId(css, varName, fallback) {
  const m = css.match(new RegExp(`--${varName}:\\s*"([^"]+)"`));
  const family = m ? m[1] : "";
  if (family.includes("Zen Old Mincho")) return "zen-old-mincho";
  if (family.includes("Noto Sans JP")) return "noto-sans-jp";
  return fallback;
}

// ---------------------------------------------------------------------------
// social.ts からSNSリンクを抽出
// ---------------------------------------------------------------------------

function extractSocialLinks(ts) {
  const links = [];
  const re = /\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*url:\s*"([^"]+)",\s*handle:\s*"([^"]+)",?\s*\}/g;
  let m;
  while ((m = re.exec(ts))) {
    const [, id, , url, handle] = m;
    links.push({ platform: id, url, handle });
  }
  return links;
}

// ---------------------------------------------------------------------------
// content/events/*.md からイベント/ワークショップを抽出
// ---------------------------------------------------------------------------

function extractEvents(srcRoot) {
  const files = ["autumn-market.md", "candle-workshop.md", "spring-fair.md"];
  return files.map((file) => {
    const raw = read(srcRoot, `src/content/events/${file}`);
    const { data } = parseFrontmatter(raw);
    return {
      title: data.title,
      date: data.date,
      location: data.location,
      description: data.description,
      type: data.type,
    };
  });
}

function eventToCardItem(event) {
  return {
    title: event.title,
    description: `${event.date}・${event.location} — ${event.description}`,
  };
}

/** イベント群を開催予定（日付昇順）/過去（日付降順）に分類する。
 *  src/pages/activities.astro の upcomingEvents/pastEvents と同じロジック。
 */
function splitUpcomingPast(events) {
  const now = new Date();
  const upcoming = events
    .filter((e) => new Date(e.date).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = events
    .filter((e) => new Date(e.date).getTime() < now.getTime())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { upcoming, past };
}

// ---------------------------------------------------------------------------
// 各ページの抽出
// ---------------------------------------------------------------------------

function buildHomePage(srcRoot) {
  const source = read(srcRoot, "src/pages/index.astro");
  const [heading] = extractAllTags(source, "h1");
  const headings2 = extractAllTags(source, "h2"); // [理念, 活動, SNS, お問い合わせ]
  const paragraphs = extractAllTags(source, "p"); // [heroBody, philosophyBody, snsBody, contactBody]

  // activityItems はJSリテラル配列なのでタグ抽出では拾えず、フロントマターのJSから直接読む。
  const arrayMatch = source.match(/const activityItems = \[([\s\S]*?)\n\];/);
  const items = [];
  if (arrayMatch) {
    const itemRe = /title:\s*"([^"]+)",\s*description:\s*"([^"]+)",/g;
    let m;
    while ((m = itemRe.exec(arrayMatch[1]))) items.push({ title: m[1], description: m[2] });
  }

  return {
    id: "home",
    slug: "/",
    title: "トップ",
    sections: [
      {
        id: "s1",
        type: "hero",
        visible: true,
        props: {
          heading,
          body: paragraphs[0],
          image: { assetId: "a1", focal: [0.5, 0.4], zoom: 1.0, alt: "ヒーロー画像準備中" },
          cta: { label: "活動を見る", href: "/activities" },
        },
        style: { paddingY: "xl", align: "center", bg: { type: "token", value: "bg" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s2",
        type: "text",
        visible: true,
        props: { heading: headings2[0], body: paragraphs[1] },
        style: { paddingY: "lg", align: "center", bg: { type: "token", value: "surface" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s3",
        type: "activity-cards",
        visible: true,
        props: { heading: headings2[1], items },
        style: { paddingY: "lg", align: "center", bg: { type: "token", value: "bg" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s4",
        type: "contact-social",
        visible: true,
        props: {
          heading: `${headings2[2]}・${headings2[3]}`,
          body: `${paragraphs[2]} ${paragraphs[3]}`,
          showEmail: false,
          showSocial: true,
        },
        style: { paddingY: "lg", align: "center", bg: { type: "token", value: "surface" } },
        animation: { preset: "inherit", delay: 0 },
      },
    ],
  };
}

function buildAboutPage(srcRoot) {
  const source = read(srcRoot, "src/pages/about.astro");
  const [heading] = extractAllTags(source, "h1");
  const [philosophyHeading] = extractAllTags(source, "h2");
  const paragraphs = extractAllTags(source, "p"); // [profile1, profile2, philosophy]

  return {
    id: "about",
    slug: "/about",
    title: "プロフィール",
    sections: [
      {
        id: "s1",
        type: "image-text",
        visible: true,
        props: {
          heading,
          body: `${paragraphs[0]} ${paragraphs[1]}`,
          image: { assetId: "a2", focal: [0.5, 0.5], zoom: 1.0, alt: "プロフィール写真準備中" },
          imagePosition: "left",
        },
        style: { paddingY: "xl", align: "left", bg: { type: "token", value: "bg" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s2",
        type: "text",
        visible: true,
        props: { heading: philosophyHeading, body: paragraphs[2] },
        style: { paddingY: "lg", align: "center", bg: { type: "token", value: "surface" } },
        animation: { preset: "inherit", delay: 0 },
      },
    ],
  };
}

function buildActivitiesPage(srcRoot, events) {
  const source = read(srcRoot, "src/pages/activities.astro");
  const [heading] = extractAllTags(source, "h1");
  const paragraphs = extractAllTags(source, "p"); // [intro, candle, events, workshop]
  const headings2 = extractAllTags(source, "h2"); // [キャンドル制作, イベント出店, ワークショップ]

  const { upcoming: upcomingEvents, past: pastEvents } = splitUpcomingPast(
    events.filter((e) => e.type === "event")
  );
  const { upcoming: upcomingWorkshops, past: pastWorkshops } = splitUpcomingPast(
    events.filter((e) => e.type === "workshop")
  );

  return {
    id: "activities",
    slug: "/activities",
    title: "活動",
    sections: [
      {
        id: "s1",
        type: "text",
        visible: true,
        props: { heading, body: paragraphs[0] },
        style: { paddingY: "xl", align: "center", bg: { type: "token", value: "bg" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s2",
        type: "image-text",
        visible: true,
        props: {
          heading: headings2[0],
          body: paragraphs[1],
          image: { assetId: "a1", focal: [0.5, 0.5], zoom: 1.0, alt: "キャンドル制作 画像準備中" },
          imagePosition: "right",
        },
        style: { paddingY: "lg", align: "left", bg: { type: "token", value: "surface" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s3",
        type: "image-text",
        visible: true,
        props: {
          heading: headings2[1],
          body: paragraphs[2],
          image: { assetId: "a1", focal: [0.5, 0.5], zoom: 1.0, alt: "イベント出店 画像準備中" },
          imagePosition: "left",
        },
        style: { paddingY: "lg", align: "left", bg: { type: "token", value: "bg" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s4",
        type: "activity-cards",
        visible: true,
        props: { heading: "イベント出店・開催予定", items: upcomingEvents.map(eventToCardItem) },
        style: { paddingY: "lg", align: "center", bg: { type: "token", value: "surface" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s4b",
        type: "activity-cards",
        visible: true,
        props: { heading: "イベント出店・過去のイベント", items: pastEvents.map(eventToCardItem) },
        style: { paddingY: "lg", align: "center", bg: { type: "token", value: "surface" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s5",
        type: "image-text",
        visible: true,
        props: {
          heading: headings2[2],
          body: paragraphs[3],
          image: { assetId: "a1", focal: [0.5, 0.5], zoom: 1.0, alt: "ワークショップ 画像準備中" },
          imagePosition: "right",
        },
        style: { paddingY: "lg", align: "left", bg: { type: "token", value: "bg" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s6",
        type: "activity-cards",
        visible: true,
        props: { heading: "ワークショップ・開催予定", items: upcomingWorkshops.map(eventToCardItem) },
        style: { paddingY: "lg", align: "center", bg: { type: "token", value: "surface" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s6b",
        type: "activity-cards",
        visible: true,
        props: { heading: "ワークショップ・過去のワークショップ", items: pastWorkshops.map(eventToCardItem) },
        style: { paddingY: "lg", align: "center", bg: { type: "token", value: "surface" } },
        animation: { preset: "inherit", delay: 0 },
      },
    ],
  };
}

function buildContactPage(srcRoot) {
  const source = read(srcRoot, "src/pages/contact.astro");
  const [heading] = extractAllTags(source, "h1");
  const [snsHeading] = extractAllTags(source, "h2");
  const paragraphs = excludeNoise(extractAllTags(source, "p"), ["入力しないでください"]); // [intro]

  return {
    id: "contact",
    slug: "/contact",
    title: "お問い合わせ",
    sections: [
      {
        id: "s1",
        type: "text",
        visible: true,
        props: {
          heading,
          body: `${paragraphs[0]} お問い合わせフォーム（お名前・メールアドレス・お問い合わせ内容）よりご連絡ください。`,
        },
        style: { paddingY: "xl", align: "center", bg: { type: "token", value: "bg" } },
        animation: { preset: "inherit", delay: 0 },
      },
      {
        id: "s2",
        type: "contact-social",
        visible: true,
        props: { heading: snsHeading, body: "", showEmail: false, showSocial: true },
        style: { paddingY: "lg", align: "center", bg: { type: "token", value: "surface" } },
        animation: { preset: "inherit", delay: 0 },
      },
    ],
  };
}

function buildPrivacyPage(srcRoot) {
  const source = read(srcRoot, "src/pages/privacy.astro");
  const [heading] = extractAllTags(source, "h1");
  const headings2 = extractAllTags(source, "h2"); // [1.収集する情報, 2.利用目的, 3.第三者提供, 4.お問い合わせ窓口]
  const paragraphs = extractAllTags(source, "p"); // [intro, clause1..4]

  const sections = [
    {
      id: "s1",
      type: "text",
      visible: true,
      props: { heading, body: paragraphs[0] },
      style: { paddingY: "xl", align: "center", bg: { type: "token", value: "bg" } },
      animation: { preset: "inherit", delay: 0 },
    },
  ];

  headings2.forEach((h, i) => {
    sections.push({
      id: `s${i + 2}`,
      type: "text",
      visible: true,
      props: { heading: h, body: paragraphs[i + 1] },
      style: { paddingY: "sm", align: "left", bg: { type: "token", value: i % 2 === 0 ? "surface" : "bg" } },
      animation: { preset: "inherit", delay: 0 },
    });
  });

  return { id: "privacy", slug: "/privacy", title: "プライバシーポリシー", sections };
}

// ---------------------------------------------------------------------------
// site.json 組み立て
// ---------------------------------------------------------------------------

function buildSite(srcRoot) {
  const css = read(srcRoot, "src/styles/global.css");
  const color = extractThemeColors(css);
  const socialTs = read(srcRoot, "src/data/social.ts");
  const social = extractSocialLinks(socialTs);
  const baseUrl = extractAstroSiteUrl(srcRoot);

  return {
    schemaVersion: 1,
    site: {
      id: "teate1122",
      name: "teate1122",
      locale: "ja",
      ...(baseUrl ? { baseUrl } : {}),
      meta: {
        title: "teate1122 | 心をほどく、灯りのある暮らし",
        description: "teate1122は、日々の暮らしに寄り添う手作りキャンドルをお届けしています。",
        ogImage: "a1",
      },
    },
    theme: {
      preset: "quiet-mincho",
      tokens: {
        color,
        font: {
          heading: detectFontId(css, "font-heading", "zen-old-mincho"),
          body: detectFontId(css, "font-body", "noto-sans-jp"),
          scale: 1.0,
        },
        space: { sectionY: "lg", gap: "md" },
        button: { shape: "square", fill: "outline" },
        animation: { preset: "fade-up", duration: 600 },
      },
    },
    nav: {
      auto: true,
      items: [
        { pageId: "about", label: "プロフィール", visible: true },
        { pageId: "activities", label: "活動", visible: true },
        { pageId: "contact", label: "お問い合わせ", visible: true },
      ],
    },
    social,
    contact: { formProvider: "netlify" },
    pages: ["home", "about", "activities", "contact", "privacy"],
    assets: [
      { id: "a1", file: "hero.svg", w: 1440, h: 1440, alt: "ヒーロー画像準備中" },
      { id: "a2", file: "hero.svg", w: 1440, h: 1440, alt: "プロフィール写真準備中" },
    ],
  };
}

// ---------------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------------

function main() {
  const { src } = parseArgs(process.argv.slice(2));
  if (!existsSync(src)) {
    console.error(`teate1122 のソースディレクトリが見つかりません: ${src}`);
    process.exit(1);
  }

  const site = buildSite(src);
  const events = extractEvents(src);
  const pages = [
    buildHomePage(src),
    buildAboutPage(src),
    buildActivitiesPage(src, events),
    buildContactPage(src),
    buildPrivacyPage(src),
  ];

  const siteValidation = validateSite(site);
  if (!siteValidation.valid) {
    console.error("site.json の検証に失敗しました:");
    siteValidation.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  for (const page of pages) {
    const v = validatePage(page);
    if (!v.valid) {
      console.error(`${page.id}.json の検証に失敗しました:`);
      v.errors.forEach((e) => console.error(`  - ${e}`));
      process.exit(1);
    }
  }

  const outDir = join(ROOT, "sites", "teate1122");
  const pagesDir = join(outDir, "pages");
  mkdirSync(pagesDir, { recursive: true });

  writeFileSync(join(outDir, "site.json"), `${JSON.stringify(site, null, 2)}\n`, "utf-8");
  console.log("generated: sites/teate1122/site.json");

  for (const page of pages) {
    writeFileSync(join(pagesDir, `${page.id}.json`), `${JSON.stringify(page, null, 2)}\n`, "utf-8");
    console.log(`generated: sites/teate1122/pages/${page.id}.json`);
  }

  console.log("インポート完了。");
}

main();
