// core/render/render-page.js
// 依存ゼロ・ブラウザ/Node共有。ページJSON→HTMLフラグメントの中核ロジック。

import { html, esc } from "./html.js";
import { sections as sectionRegistry } from "../sections/index.js";

/**
 * ページ（セクション配列）をHTMLに変換する。
 * @param {object} page - pages/*.json の内容
 * @param {object} site - site.json の内容
 * @param {object} [options]
 * @param {string} [options.assetBase] - アセットURLの前置パス（本番ビルドとエディタプレビューで異なる）
 * @returns {{ html: string }}
 */
export function renderPage(page, site, options = {}) {
  const assetBase = options.assetBase ?? "";
  const ctx = { site, assetBase };
  const visibleSections = (page?.sections || []).filter((s) => s.visible !== false);
  const body = visibleSections.map((section) => renderSection(section, ctx)).join("\n");
  return { html: body };
}

function renderSection(section, ctx) {
  const def = sectionRegistry[section.type];
  if (!def) return "";
  const style = section.style || {};
  const bg = style.bg || { type: "none", value: "" };
  const inner = def.render(section.props || {}, ctx);

  return html`<section class="section" data-type="${esc(section.type)}" data-section-id="${esc(section.id)}" data-padding-y="${esc(style.paddingY || "lg")}" data-align="${esc(style.align || "left")}" data-bg-type="${esc(bg.type || "none")}" data-bg-value="${esc(bg.value || "")}">
  <div class="section__inner">
    ${inner}
  </div>
</section>`;
}
