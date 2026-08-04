// core/sections/image-text/render.js
// 依存ゼロ・ブラウザ/Node共有。

import { html, esc } from "../../render/html.js";
import { resolveAssetUrl, findAsset } from "../../render/assets.js";

export function render(props, ctx) {
  const { heading = "", body = "", image, imagePosition = "left" } = props || {};
  const asset = image?.assetId ? findAsset(ctx.site, image.assetId) : null;
  const src = asset ? resolveAssetUrl(ctx.site, image.assetId, ctx.assetBase) : null;
  const focalX = ((image?.focal?.[0] ?? 0.5) * 100).toFixed(1);
  const focalY = ((image?.focal?.[1] ?? 0.5) * 100).toFixed(1);
  const zoom = image?.zoom ?? 1;

  return html`<div class="image-text" data-image-position="${esc(imagePosition)}">
    <div class="image-text__media">
      ${
        src
          ? html`<img class="image-text__img" style="--focal-x:${esc(focalX)}%;--focal-y:${esc(focalY)}%;--zoom:${esc(zoom)}" src="${esc(src)}" alt="${esc(image.alt || asset?.alt || "")}">`
          : ""
      }
    </div>
    <div class="image-text__content">
      ${heading ? html`<h2>${esc(heading)}</h2>` : ""}
      <p class="image-text__body">${esc(body)}</p>
    </div>
  </div>`;
}

export const css = `
.image-text { display: flex; flex-direction: column; gap: 1.5rem; }
.image-text__media { width: 100%; aspect-ratio: 4 / 3; overflow: hidden; background: var(--color-surface); }
.image-text__img { width: 100%; height: 100%; object-fit: cover; object-position: var(--focal-x) var(--focal-y); transform: scale(var(--zoom)); }
.image-text__body { color: var(--color-text-muted); }
@media (min-width: 768px) {
  .image-text { flex-direction: row; align-items: center; gap: 3rem; }
  .image-text__media, .image-text__content { flex: 1; }
  .image-text[data-image-position="right"] { flex-direction: row-reverse; }
}
`;
