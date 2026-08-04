// core/render/html.js
// 依存ゼロ・ブラウザ/Node共有。DOM/Node APIは一切使用しない。

const ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** HTML特殊文字をエスケープする。null/undefinedは空文字列として扱う。 */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/**
 * タグ付きテンプレートリテラル。展開値は呼び出し側でescした文字列（またはescした文字列の配列）を渡すこと。
 * html`<p>${esc(text)}</p>` のように使う。
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    out += Array.isArray(v) ? v.join("") : v ?? "";
    out += strings[i + 1];
  }
  return out;
}
