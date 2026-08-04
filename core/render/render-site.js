// core/render/render-site.js
// 依存ゼロ・ブラウザ/Node共有。ページ単位で完全なHTMLドキュメントとCSSを生成する。

import { esc } from "./html.js";
import { renderPage } from "./render-page.js";
import { tokensToCss } from "../theme/tokens-to-css.js";
import { sections as sectionRegistry } from "../sections/index.js";

/**
 * サイト全体のテーマCSS＋登録済み全セクションのCSSを結合する。
 * P0ではセクション種別は静的な既知集合のため、ページごとの遅延読み込みは行わない。
 */
export function renderThemeCss(site) {
  const themeCss = tokensToCss(site.theme);
  const sectionsCss = Object.values(sectionRegistry)
    .map((s) => s.css)
    .join("\n");
  return `${themeCss}\n${sectionsCss}`;
}

/**
 * 1ページ分の完全なHTMLドキュメントとCSSを生成する。
 * @param {object} site - site.json
 * @param {object} page - pages/*.json
 * @param {object} [options]
 * @param {string} [options.assetBase] - アセットURLの前置パス
 * @param {string} [options.cssHref] - 生成HTMLが参照するCSSファイル名（既定 style.css）
 * @returns {{ html: string, css: string }}
 */
export function renderSite(site, page, options = {}) {
  const { html: bodyHtml } = renderPage(page, site, options);
  const css = renderThemeCss(site);
  const siteName = esc(site?.site?.name || "");
  const title = esc(page?.title ? `${page.title} | ${site?.site?.name || ""}` : site?.site?.name || "");
  const description = esc(site?.site?.meta?.description || "");
  const locale = esc(site?.site?.locale || "ja");
  const cssHref = options.cssHref || "style.css";

  const fullHtml = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="stylesheet" href="${esc(cssHref)}">
</head>
<body>
<main>
${bodyHtml}
</main>
</body>
</html>
`;

  return { html: fullHtml, css, siteName };
}
