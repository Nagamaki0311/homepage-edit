#!/usr/bin/env node
// build/build.js
// Node CLI。sites/<siteId>/ のJSONを core/render で静的HTML/CSSに変換し dist/ に出力する。
// core/ 配下は依存ゼロ・DOM/Node API非依存だが、build/ はNode CLIなのでfs/pathを自由に使ってよい。
//
// 使い方: node build/build.js --site teate1122

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { renderSite } from "../core/render/render-site.js";
import { validateSite, validatePage } from "../core/schema/validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--site") args.site = argv[i + 1];
  }
  return args;
}

function slugToFilename(slug) {
  if (slug === "/" || slug === "") return "index.html";
  const trimmed = slug.replace(/^\/+|\/+$/g, "");
  return `${trimmed}.html`;
}

function main() {
  const { site: siteId } = parseArgs(process.argv.slice(2));
  if (!siteId) {
    console.error("使い方: node build/build.js --site <siteId>");
    process.exit(1);
  }

  const siteDir = join(ROOT, "sites", siteId);
  const sitePath = join(siteDir, "site.json");
  if (!existsSync(sitePath)) {
    console.error(`site.json が見つかりません: ${sitePath}`);
    process.exit(1);
  }

  const site = JSON.parse(readFileSync(sitePath, "utf-8"));
  const siteValidation = validateSite(site);
  if (!siteValidation.valid) {
    console.error("site.json の検証に失敗しました:");
    siteValidation.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const distDir = join(ROOT, "dist");
  if (existsSync(distDir)) rmSync(distDir, { recursive: true });
  mkdirSync(distDir, { recursive: true });

  const pages = {};
  for (const pageId of site.pages) {
    const pagePath = join(siteDir, "pages", `${pageId}.json`);
    if (!existsSync(pagePath)) {
      console.error(`ページJSONが見つかりません: ${pagePath}`);
      process.exit(1);
    }
    const page = JSON.parse(readFileSync(pagePath, "utf-8"));
    const pageValidation = validatePage(page);
    if (!pageValidation.valid) {
      console.error(`${pageId}.json の検証に失敗しました:`);
      pageValidation.errors.forEach((e) => console.error(`  - ${e}`));
      process.exit(1);
    }
    pages[pageId] = page;
  }

  let cssWritten = false;
  for (const pageId of site.pages) {
    const page = pages[pageId];
    const { html, css } = renderSite(site, page, { assetBase: "assets/", cssHref: "style.css", pages });
    const outFile = join(distDir, slugToFilename(page.slug));
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, html, "utf-8");
    console.log(`generated: dist/${slugToFilename(page.slug)}`);

    if (!cssWritten) {
      writeFileSync(join(distDir, "style.css"), css, "utf-8");
      cssWritten = true;
      console.log("generated: dist/style.css");
    }
  }

  const assetsDir = join(siteDir, "assets");
  if (existsSync(assetsDir)) {
    cpSync(assetsDir, join(distDir, "assets"), { recursive: true });
    console.log("copied: dist/assets/");
  }

  console.log(`ビルド完了: ${siteId} -> dist/`);
}

main();
