// core/sections/activity-cards/render.js
// 依存ゼロ・ブラウザ/Node共有。

import { html, esc } from "../../render/html.js";

export function render(props) {
  const { heading = "", items = [] } = props || {};
  return html`<div class="activity-cards">
    ${heading ? html`<h2>${esc(heading)}</h2>` : ""}
    <div class="activity-cards__grid">
      ${items.map(
        (item) =>
          html`<div class="activity-cards__card">
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.description)}</p>
      </div>`
      )}
    </div>
  </div>`;
}

export const css = `
.activity-cards__grid { margin-top: 2rem; display: grid; gap: 1.5rem; }
.activity-cards__card { border: 1px solid var(--color-border); background: var(--color-bg); padding: 1.5rem; text-align: center; }
.activity-cards__card p { color: var(--color-text-muted); font-size: 0.875rem; margin-top: 0.5rem; margin-bottom: 0; }
@media (min-width: 768px) {
  .activity-cards__grid { grid-template-columns: repeat(3, 1fr); }
}
`;
