// core/render/url.js
// 依存ゼロ・ブラウザ/Node共有。DOM/Node APIは使用しない（正規表現のみで判定する）。
// href/URL値のスキームを検査し、http(s)/mailto/tel/相対パス（/, #, ?で始まる）以外を拒否する。

const SAFE_SCHEME_PREFIX = /^(https?|mailto|tel):/i;
const RELATIVE_START = /^[/#?]/;
// "javascript:", "data:", "vbscript:" など、コロンの前に空白・制御文字・全角文字等が
// 混入していても検出できるよう、まずコロンより前を素直に抜き出して比較する。
const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * URL文字列を検証し、安全であればそのまま、危険であれば"#"を返す。
 * 許可: http:, https:, mailto:, tel:, および "/" "#" "?" で始まる相対パス。
 * null/undefined/空文字列は"#"にフォールバックする。
 */
export function resolveUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) return "#";
  if (RELATIVE_START.test(value)) return value;
  if (SAFE_SCHEME_PREFIX.test(value)) return value;
  if (HAS_SCHEME.test(value)) return "#";
  // スキームを持たない相対パス（例: "about" など）はそのまま許可する。
  return value;
}
