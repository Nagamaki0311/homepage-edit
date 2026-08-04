// core/theme/tokens-to-css.js
// 依存ゼロ・ブラウザ/Node共有。theme.tokens を CSS変数 + 少数の構造クラスに変換する。
// site.json 側の style は常にトークン名/列挙値のみを持ち、生CSS・px値は持たない。
// px値やフォントスタック文字列などの「実際のCSS値」への変換はここに閉じ込める。

const FONT_STACKS = {
  "zen-old-mincho": "'Zen Old Mincho','Yu Mincho','Hiragino Mincho ProN',serif",
  "noto-sans-jp": "'Noto Sans JP','BIZ UDPGothic','Hiragino Sans',system-ui,sans-serif",
  system: "system-ui,sans-serif",
};

const SPACE_Y = { sm: "2rem", md: "3rem", lg: "5rem", xl: "8rem" };
const GAP = { sm: "0.5rem", md: "1rem", lg: "2rem" };

function fontStack(id) {
  return FONT_STACKS[id] || FONT_STACKS.system;
}

/** theme（{preset, tokens}）から :root 変数と基本レイアウトCSSを生成する。 */
export function tokensToCss(theme) {
  const t = theme?.tokens || {};
  const color = t.color || {};
  const font = t.font || {};
  const button = t.button || {};
  const animation = t.animation || {};

  const vars = `:root {
  --color-bg: ${color.bg || "#ffffff"};
  --color-surface: ${color.surface || "#f4f4f4"};
  --color-text: ${color.text || "#111111"};
  --color-text-muted: ${color.textMuted || "#666666"};
  --color-accent: ${color.accent || "#888888"};
  --color-border: ${color.border || "#dddddd"};
  --font-heading: ${fontStack(font.heading)};
  --font-body: ${fontStack(font.body)};
  --font-scale: ${font.scale ?? 1};
  --space-y-sm: ${SPACE_Y.sm};
  --space-y-md: ${SPACE_Y.md};
  --space-y-lg: ${SPACE_Y.lg};
  --space-y-xl: ${SPACE_Y.xl};
  --gap-sm: ${GAP.sm};
  --gap-md: ${GAP.md};
  --gap-lg: ${GAP.lg};
  --anim-duration: ${animation.duration ?? 600}ms;
}`;

  const base = `
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: calc(16px * var(--font-scale));
  line-height: 1.9;
}
h1, h2, h3 { font-family: var(--font-heading); line-height: 1.5; margin: 0 0 0.5em; }
h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }
p { margin: 0 0 1em; }
img { max-width: 100%; display: block; }
.section__inner { max-width: 960px; margin: 0 auto; padding-inline: 1.25rem; }
.section[data-padding-y="sm"] { padding-block: var(--space-y-sm); }
.section[data-padding-y="md"] { padding-block: var(--space-y-md); }
.section[data-padding-y="lg"] { padding-block: var(--space-y-lg); }
.section[data-padding-y="xl"] { padding-block: var(--space-y-xl); }
.section[data-align="center"] { text-align: center; }
.section[data-align="left"] { text-align: left; }
.section[data-align="right"] { text-align: right; }
.section[data-bg-type="token"][data-bg-value="surface"] { background-color: var(--color-surface); }
.section[data-bg-type="token"][data-bg-value="bg"] { background-color: var(--color-bg); }
.section[data-bg-type="token"][data-bg-value="accent"] { background-color: var(--color-accent); }
.btn {
  display: inline-block;
  padding: 0.75rem 2rem;
  font-size: 0.875rem;
  text-decoration: none;
  border: 1px solid var(--color-text);
  color: var(--color-text);
  background: transparent;
  transition: background-color 0.2s, color 0.2s;
}
.btn:hover { background: var(--color-text); color: var(--color-bg); }
${button.shape === "round" ? "\n.btn { border-radius: 999px; }" : ""}
${button.fill === "solid" ? "\n.btn { background: var(--color-text); color: var(--color-bg); }\n.btn:hover { opacity: 0.85; background: var(--color-text); color: var(--color-bg); }" : ""}
`;

  return `${vars}\n${base}`;
}
