// core/sections/contact-social/render.js
// 依存ゼロ・ブラウザ/Node共有。

import { html, esc } from "../../render/html.js";
import { resolveUrl } from "../../render/url.js";

export function render(props, ctx) {
  const { heading = "", body = "", showEmail = true, showSocial = true, showForm = true } = props || {};
  const email = ctx.site?.contact?.email;
  const social = ctx.site?.social || [];
  const isNetlifyForm = showForm && ctx.site?.contact?.formProvider === "netlify";

  return html`<div class="contact-social">
    ${heading ? html`<h2>${esc(heading)}</h2>` : ""}
    ${body ? html`<p class="contact-social__body">${esc(body)}</p>` : ""}
    ${isNetlifyForm ? renderNetlifyForm() : ""}
    ${
      showEmail && email
        ? html`<p class="contact-social__email"><a href="${esc(resolveUrl(`mailto:${email}`))}">${esc(email)}</a></p>`
        : ""
    }
    ${
      showSocial && social.length
        ? html`<ul class="contact-social__list">
      ${social.map(
        (s) =>
          html`<li><a href="${esc(resolveUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.handle || s.platform)}</a></li>`
      )}
    </ul>`
        : ""
    }
  </div>`;
}

// Netlify Formsは静的ビルド時にフォームのname/inputをHTMLから検出するため、
// フィールド名・honeypot・form-name hidden inputは固定のリテラルとして出力する
// （ユーザー入力を含まないためescは不要）。
function renderNetlifyForm() {
  return html`<form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" class="contact-social__form">
      <input type="hidden" name="form-name" value="contact">
      <p class="contact-social__hp"><label>入力しないでください<input name="bot-field"></label></p>
      <div class="contact-social__field">
        <label for="contact-name">お名前</label>
        <input id="contact-name" name="name" type="text" required>
      </div>
      <div class="contact-social__field">
        <label for="contact-email">メールアドレス</label>
        <input id="contact-email" name="email" type="email" required>
      </div>
      <div class="contact-social__field">
        <label for="contact-message">お問い合わせ内容</label>
        <textarea id="contact-message" name="message" rows="6" required></textarea>
      </div>
      <button type="submit" class="btn">送信する</button>
    </form>`;
}

export const css = `
.contact-social__body { color: var(--color-text-muted); max-width: 34em; margin-inline: auto; }
.contact-social__list { list-style: none; padding: 0; margin: 1.5rem 0 0; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
.contact-social__list a { color: var(--color-text); text-decoration: underline; text-underline-offset: 4px; }
.contact-social__form { display: flex; flex-direction: column; gap: 1.25rem; max-width: 34em; margin: 1.5rem auto 0; text-align: left; }
.contact-social__hp { position: absolute; left: -9999px; }
.contact-social__field { display: flex; flex-direction: column; gap: 0.4rem; }
.contact-social__field label { font-size: 0.85rem; }
.contact-social__field input, .contact-social__field textarea { border: 1px solid var(--color-border); padding: 0.7rem 1rem; font: inherit; background: var(--color-bg); color: var(--color-text); }
.contact-social__form .btn { align-self: flex-start; cursor: pointer; }
.section[data-align="left"] .contact-social__body,
.section[data-align="left"] .contact-social__list,
.section[data-align="left"] .contact-social__form { margin-inline: 0; justify-content: flex-start; }
`;
