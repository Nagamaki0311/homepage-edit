// core/sections/text/render.js
// 依存ゼロ・ブラウザ/Node共有。

import { html, esc } from "../../render/html.js";

export function render(props) {
  const { heading = "", body = "" } = props || {};
  return html`<div class="text-block">
    ${heading ? html`<h2>${esc(heading)}</h2>` : ""}
    <p class="text-block__body">${esc(body)}</p>
  </div>`;
}

export const css = `
.text-block__body { color: var(--color-text-muted); max-width: 34em; }
.section[data-align="center"] .text-block__body { margin-inline: auto; }
`;
