// core/render/render-site.js
// 依存ゼロ・ブラウザ/Node共有。ページ単位で完全なHTMLドキュメントとCSSを生成する。

import { html, esc } from "./html.js";
import { renderPage } from "./render-page.js";
import { resolveAssetUrl } from "./assets.js";
import { resolveUrl } from "./url.js";
import { tokensToCss } from "../theme/tokens-to-css.js";
import { sections as sectionRegistry } from "../sections/index.js";

// Google Fonts経由のCDN読み込み。core/配下はnpm依存ゼロのため、
// Fontsource（npmパッケージ）を直接importできない代わりの手段として採用する。
// 外部CDNへの依存はプライバシー・表示速度の観点でトレードオフがあるが、
// フォールバックのシステムフォントスタック（tokens-to-css.js）は既に用意済みのため
// この<link>読み込みが失敗・ブロックされてもレイアウトは崩れない。
// 既知のfont id（theme.tokens.font.heading/body）のみ対応し、未知のidは無視する。
const GOOGLE_FONTS_MAP = {
  "zen-old-mincho": "Zen+Old+Mincho:wght@400;500",
  "noto-sans-jp": "Noto+Sans+JP:wght@400;500;700",
};

/**
 * サイト全体のテーマCSS＋登録済み全セクションのCSSを結合する。
 * P0ではセクション種別は静的な既知集合のため、ページごとの遅延読み込みは行わない。
 */
export function renderThemeCss(site) {
  const themeCss = tokensToCss(site.theme);
  const sectionsCss = Object.values(sectionRegistry)
    .map((s) => s.css)
    .join("\n");
  return `${themeCss}\n${sectionsCss}\n${CHROME_CSS}`;
}

function renderWebfontLinks(theme) {
  const font = theme?.tokens?.font || {};
  const families = [font.heading, font.body].filter(
    (id, i, arr) => id && GOOGLE_FONTS_MAP[id] && arr.indexOf(id) === i
  );
  if (families.length === 0) return "";
  const query = families.map((id) => `family=${GOOGLE_FONTS_MAP[id]}`).join("&");
  const href = esc(`https://fonts.googleapis.com/css2?${query}&display=swap`);
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${href}">`;
}

/** site.nav.items（pageId参照）を、pagesにより解決したhref付きリンクへ変換する。 */
function renderNavLinks(site, page, pages) {
  const items = site?.nav?.items || [];
  return items
    .filter((item) => item.visible !== false)
    .map((item) => {
      const target = pages?.[item.pageId];
      if (!target) return "";
      const current = page?.id === item.pageId ? ' aria-current="page"' : "";
      return `<a href="${esc(resolveUrl(target.slug))}"${current}>${esc(item.label)}</a>`;
    })
    .join("\n");
}

function renderHeader(site, page, pages) {
  const siteName = esc(site?.site?.name || "");
  return html`<header class="site-header">
  <div class="site-header__inner">
    <a class="site-header__brand" href="${esc(resolveUrl("/"))}">${siteName}</a>
    <nav class="site-header__nav" aria-label="サイト内ナビゲーション">
      ${renderNavLinks(site, page, pages)}
    </nav>
  </div>
</header>`;
}

function renderFooter(site) {
  const siteName = esc(site?.site?.name || "");
  const social = site?.social || [];
  const year = new Date().getFullYear();
  const socialHtml = social.length
    ? html`<ul class="site-footer__social">
      ${social.map(
        (s) =>
          html`<li><a href="${esc(resolveUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.handle || s.platform)}</a></li>`
      )}
    </ul>`
    : "";

  return html`<footer class="site-footer">
  <div class="site-footer__inner">
    ${socialHtml}
    <p class="site-footer__copyright">&copy; ${year} ${siteName}. All rights reserved.</p>
  </div>
</footer>`;
}

const CHROME_CSS = `
.site-header { border-bottom: 1px solid var(--color-border); background: var(--color-bg); }
.site-header__inner { max-width: 960px; margin: 0 auto; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
.site-header__brand { font-family: var(--font-heading); font-size: 1.1rem; color: var(--color-text); text-decoration: none; }
.site-header__nav { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.site-header__nav a { color: var(--color-text-muted); text-decoration: none; font-size: 0.9rem; }
.site-header__nav a:hover, .site-header__nav a[aria-current="page"] { color: var(--color-text); }
.site-footer { border-top: 1px solid var(--color-border); background: var(--color-surface); }
.site-footer__inner { max-width: 960px; margin: 0 auto; padding: 2rem 1.25rem; text-align: center; }
.site-footer__social { list-style: none; display: flex; gap: 1rem; justify-content: center; padding: 0; margin: 0 0 1rem; flex-wrap: wrap; }
.site-footer__social a { color: var(--color-text); text-decoration: underline; text-underline-offset: 4px; }
.site-footer__copyright { margin: 0; font-size: 0.8rem; color: var(--color-text-muted); }
`;

/**
 * 1ページ分の完全なHTMLドキュメントとCSSを生成する。
 * @param {object} site - site.json
 * @param {object} page - pages/*.json
 * @param {object} [options]
 * @param {string} [options.assetBase] - アセットURLの前置パス
 * @param {string} [options.cssHref] - 生成HTMLが参照するCSSファイル名（既定 style.css）
 * @param {Record<string, object>} [options.pages] - pageId -> pages/*.json のマップ（ナビゲーション解決用。他ページのslug/titleを引くために必要）
 * @returns {{ html: string, css: string }}
 */
export function renderSite(site, page, options = {}) {
  const assetBase = options.assetBase ?? "";
  const { html: bodyHtml } = renderPage(page, site, options);
  const css = renderThemeCss(site);
  const siteName = esc(site?.site?.name || "");
  const title = esc(page?.title ? `${page.title} | ${site?.site?.name || ""}` : site?.site?.name || "");
  const description = esc(site?.site?.meta?.description || "");
  const locale = esc(site?.site?.locale || "ja");
  const cssHref = options.cssHref !== undefined ? options.cssHref : "style.css";

  const ogImageId = site?.site?.meta?.ogImage;
  const ogImageUrl = ogImageId ? resolveAssetUrl(site, ogImageId, assetBase) || ogImageId : "";
  const faviconRaw = site?.site?.meta?.favicon;
  const faviconUrl = faviconRaw ? resolveAssetUrl(site, faviconRaw, assetBase) || faviconRaw : "/favicon.svg";

  // baseUrlが設定されている場合、og:image/og:urlを絶対URL化する（未設定時は相対パスのまま＝後方互換）。
  const baseUrl = site?.site?.baseUrl ? String(site.site.baseUrl).replace(/\/+$/, "") : "";
  const toAbsoluteUrl = (path) => {
    if (!baseUrl || !path) return path;
    if (/^(https?:|data:)/i.test(path)) return path;
    return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  };
  const ogImageAbsUrl = toAbsoluteUrl(ogImageUrl);
  const ogUrl = baseUrl ? toAbsoluteUrl(resolveUrl(page?.slug || "/")) : "";

  const fullHtml = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="icon" href="${esc(faviconUrl)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
${ogImageAbsUrl ? `<meta property="og:image" content="${esc(ogImageAbsUrl)}">` : ""}
${ogUrl ? `<meta property="og:url" content="${esc(ogUrl)}">` : ""}
${renderWebfontLinks(site.theme)}
<link rel="stylesheet" href="${esc(cssHref)}">
</head>
<body>
${renderHeader(site, page, options.pages)}
<main>
${bodyHtml}
</main>
${renderFooter(site)}
</body>
</html>
`;

  return { html: fullHtml, css, siteName };
}
