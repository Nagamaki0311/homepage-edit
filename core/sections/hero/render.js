// core/sections/hero/render.js
// 依存ゼロ・ブラウザ/Node共有。DOM/Node APIは使用しない。

import { html, esc } from "../../render/html.js";
import { resolveAssetUrl, findAsset } from "../../render/assets.js";

export function render(props, ctx) {
  const { heading = "", body = "", image, cta } = props || {};
  const asset = image?.assetId ? findAsset(ctx.site, image.assetId) : null;
  const src = asset ? resolveAssetUrl(ctx.site, image.assetId, ctx.assetBase) : null;
  const focalX = ((image?.focal?.[0] ?? 0.5) * 100).toFixed(1);
  const focalY = ((image?.focal?.[1] ?? 0.5) * 100).toFixed(1);
  const zoom = image?.zoom ?? 1;

  return html`<div class="hero">
    ${
      src
        ? html`<div class="hero__media" style="--focal-x:${esc(focalX)}%;--focal-y:${esc(focalY)}%;--zoom:${esc(zoom)}">
      <img class="hero__img" src="${esc(src)}" alt="${esc(image.alt || asset?.alt || "")}">
    </div>`
        : ""
    }
    <div class="hero__content">
      <h1>${esc(heading)}</h1>
      <p class="hero__body">${esc(body)}</p>
      ${cta?.label ? html`<a class="btn" href="${esc(cta.href || "#")}">${esc(cta.label)}</a>` : ""}
    </div>
  </div>`;
}

export const css = `
.hero { display: flex; flex-direction: column; align-items: center; gap: 2rem; }
.hero__media { width: 100%; max-width: 480px; aspect-ratio: 1 / 1; overflow: hidden; }
.hero__img { width: 100%; height: 100%; object-fit: cover; object-position: var(--focal-x) var(--focal-y); transform: scale(var(--zoom)); }
.hero__body { color: var(--color-text-muted); max-width: 34em; margin-inline: auto; }
@media (min-width: 768px) {
  .hero { flex-direction: row; text-align: left; gap: 4rem; }
  .hero__media { max-width: none; flex: 1; }
  .hero__content { flex: 1; }
}
.section[data-align="center"] .hero__body { margin-inline: auto; }
`;
