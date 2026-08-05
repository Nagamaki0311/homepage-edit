// core/sections/contact-social/render.js
// 依存ゼロ・ブラウザ/Node共有。

import { html, esc } from "../../render/html.js";
import { resolveUrl } from "../../render/url.js";

export function render(props, ctx) {
  const { heading = "", body = "", showEmail = true, showSocial = true, showForm = true } = props || {};
  const email = ctx.site?.contact?.email;
  const social = ctx.site?.social || [];
  const isNetlifyForm = showForm && ctx.site?.contact?.formProvider === "netlify";
  const hasSocial = showSocial && social.length > 0;
  const hasContact = isNetlifyForm || (showEmail && email);

  return html`<div class="contact-social">
    ${heading ? html`<h2>${esc(heading)}</h2>` : ""}
    ${body ? html`<p class="contact-social__body">${esc(body)}</p>` : ""}
    <div class="contact-social__blocks">
      ${hasSocial ? renderSocialBlock(social) : ""}
      ${hasContact ? renderContactBlock({ isNetlifyForm, showEmail, email }) : ""}
    </div>
  </div>`;
}

function renderSocialBlock(social) {
  return html`<div class="contact-social__block contact-social__block--social">
    <h3 class="contact-social__subheading">SNS</h3>
    <ul class="contact-social__list">
      ${social.map(
        (s) =>
          html`<li><a class="contact-social__social-btn" href="${esc(resolveUrl(s.url))}" target="_blank" rel="noopener noreferrer">${socialIcon(s.platform)}<span>${esc(s.handle || s.platform)}</span></a></li>`
      )}
    </ul>
  </div>`;
}

function renderContactBlock({ isNetlifyForm, showEmail, email }) {
  return html`<div class="contact-social__block contact-social__block--form">
    <h3 class="contact-social__subheading">お問い合わせ</h3>
    ${isNetlifyForm ? renderNetlifyForm() : ""}
    ${
      showEmail && email
        ? html`<p class="contact-social__email"><a href="${esc(resolveUrl(`mailto:${email}`))}">${esc(email)}</a></p>`
        : ""
    }
  </div>`;
}

// プラットフォーム名からアイコンを返す。未知のプラットフォームは汎用の外部リンクアイコンにフォールバックする。
// platform名はsite.jsonの列挙値のみが想定されるため、esc不要（ユーザー自由入力ではない）。
const SOCIAL_ICON_PATHS = {
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
  x: '<path d="M4 4l16 16M20 4L4 20"/>',
  twitter: '<path d="M4 4l16 16M20 4L4 20"/>',
  facebook: '<path d="M14 21v-7h2.5l.5-3H14V9c0-.9.3-1.5 1.7-1.5H17V5c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V11H8v3h2.5v7"/>',
  youtube: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none"/>',
  line: '<rect x="3" y="4" width="18" height="14" rx="6"/><path d="M8 14V9m4 5V9l3 5V9"/>',
  tiktok: '<path d="M14 4v9.5a3 3 0 1 1-2-2.83V4h2z"/><path d="M14 6c.5 2 2 3 4 3v2"/>',
};
const SOCIAL_ICON_DEFAULT = '<circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/>';

function socialIcon(platform) {
  const path = SOCIAL_ICON_PATHS[platform] || SOCIAL_ICON_DEFAULT;
  return `<svg class="contact-social__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
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
.contact-social__blocks { display: flex; flex-direction: column; gap: var(--space-y-sm); max-width: 34em; margin: var(--space-y-sm) auto 0; }
.contact-social__block { text-align: center; }
.contact-social__block + .contact-social__block { padding-top: var(--space-y-sm); border-top: 1px solid var(--color-border); }
.contact-social__subheading { font-family: var(--font-heading); margin: 0 0 1rem; font-size: 1.1rem; }
.contact-social__list { list-style: none; padding: 0; margin: 0; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
.contact-social__social-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.5rem;
  border: 1px solid var(--color-text);
  color: var(--color-text);
  text-decoration: none;
  background: transparent;
  transition: background-color 0.2s, color 0.2s;
}
.contact-social__social-btn:hover { background: var(--color-text); color: var(--color-bg); }
.contact-social__icon { flex-shrink: 0; }
.contact-social__form { display: flex; flex-direction: column; gap: 1.25rem; text-align: left; }
.contact-social__hp { position: absolute; left: -9999px; }
.contact-social__field { display: flex; flex-direction: column; gap: 0.4rem; }
.contact-social__field label { font-size: 0.85rem; }
.contact-social__field input, .contact-social__field textarea { border: 1px solid var(--color-border); padding: 0.7rem 1rem; font: inherit; background: var(--color-bg); color: var(--color-text); }
.contact-social__form .btn { align-self: flex-start; cursor: pointer; }
.contact-social__email { margin: 1rem 0 0; }
.section[data-align="left"] .contact-social__body,
.section[data-align="left"] .contact-social__blocks { margin-inline: 0; }
.section[data-align="left"] .contact-social__block { text-align: left; }
.section[data-align="left"] .contact-social__list { justify-content: flex-start; }
`;
