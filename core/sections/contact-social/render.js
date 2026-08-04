// core/sections/contact-social/render.js
// 依存ゼロ・ブラウザ/Node共有。

import { html, esc } from "../../render/html.js";

export function render(props, ctx) {
  const { heading = "", body = "", showEmail = true, showSocial = true } = props || {};
  const email = ctx.site?.contact?.email;
  const social = ctx.site?.social || [];

  return html`<div class="contact-social">
    ${heading ? html`<h2>${esc(heading)}</h2>` : ""}
    ${body ? html`<p class="contact-social__body">${esc(body)}</p>` : ""}
    ${
      showEmail && email
        ? html`<p class="contact-social__email"><a href="mailto:${esc(email)}">${esc(email)}</a></p>`
        : ""
    }
    ${
      showSocial && social.length
        ? html`<ul class="contact-social__list">
      ${social.map(
        (s) =>
          html`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.handle || s.platform)}</a></li>`
      )}
    </ul>`
        : ""
    }
  </div>`;
}

export const css = `
.contact-social__body { color: var(--color-text-muted); max-width: 34em; margin-inline: auto; }
.contact-social__list { list-style: none; padding: 0; margin: 1.5rem 0 0; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
.contact-social__list a { color: var(--color-text); text-decoration: underline; text-underline-offset: 4px; }
.section[data-align="left"] .contact-social__body,
.section[data-align="left"] .contact-social__list { margin-inline: 0; justify-content: flex-start; }
`;
