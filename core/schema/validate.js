// core/schema/validate.js
// 依存ゼロ・ブラウザ/Node共有。外部JSON Schemaライブラリ（ajv等）は使わず、
// site.schema.json が定める制約を手書きの軽量チェックで検証する。
// ponytail: 汎用JSON Schemaインタプリタを実装するのはP0の要件に対して過剰なため、
// 本アプリのスキーマ（v1固定・セクション種別が既知集合）に特化した検証のみ行う。

const SECTION_TYPES = ["hero", "text", "image-text", "contact-social", "activity-cards"];
const PADDING_Y = ["sm", "md", "lg", "xl"];
const ALIGN = ["left", "center", "right"];
const BG_TYPE = ["token", "none"];
const BG_VALUE = ["bg", "surface", "accent", ""];
const COLOR_TOKEN_KEYS = ["bg", "surface", "text", "textMuted", "accent", "border"];

// hex表記（#RGB/#RGBA/#RRGGBB/#RRGGBBAA）のみ許可する。
// CSS名前付き色・rgb()等はエスケープ不要なCSS識別子・数値のみで構成されるため許可するが、
// 本実装ではP0の範囲としてhex表記のみを安全な値として受け付ける（ホワイトリスト方式）。
const HEX_COLOR = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** CSS colorとして妥当なhex表記かどうかを判定する（依存ゼロ・正規表現のみ）。 */
export function isSafeCssColor(value) {
  return typeof value === "string" && HEX_COLOR.test(value.trim());
}

function err(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

/** site.json を検証する。{valid, errors} を返す。 */
export function validateSite(site) {
  const errors = [];
  if (!site || typeof site !== "object") {
    return { valid: false, errors: ["site: オブジェクトである必要があります"] };
  }
  if (site.schemaVersion !== 1) {
    err(errors, "schemaVersion", "1である必要があります");
  }
  if (!site.site || typeof site.site !== "object") {
    err(errors, "site.site", "必須です");
  } else {
    if (!site.site.id) err(errors, "site.site.id", "必須です");
    if (!site.site.name) err(errors, "site.site.name", "必須です");
    if (!site.site.locale) err(errors, "site.site.locale", "必須です");
  }
  if (!site.theme || typeof site.theme !== "object") {
    err(errors, "site.theme", "必須です");
  } else if (!site.theme.tokens || typeof site.theme.tokens !== "object") {
    err(errors, "site.theme.tokens", "必須です");
  } else if (site.theme.tokens.color && typeof site.theme.tokens.color === "object") {
    const color = site.theme.tokens.color;
    COLOR_TOKEN_KEYS.forEach((key) => {
      if (color[key] !== undefined && !isSafeCssColor(color[key])) {
        err(
          errors,
          `site.theme.tokens.color.${key}`,
          "CSS color として妥当なhex表記（#RGB/#RGBA/#RRGGBB/#RRGGBBAA）である必要があります"
        );
      }
    });
  }
  if (!Array.isArray(site.pages)) {
    err(errors, "site.pages", "配列である必要があります");
  }
  if (site.assets && !Array.isArray(site.assets)) {
    err(errors, "site.assets", "配列である必要があります");
  }
  if (Array.isArray(site.assets)) {
    site.assets.forEach((a, i) => {
      if (!a.id) err(errors, `site.assets[${i}].id`, "必須です");
      if (!a.file) err(errors, `site.assets[${i}].file`, "必須です");
    });
  }
  return { valid: errors.length === 0, errors };
}

/** pages/*.json を検証する。{valid, errors} を返す。 */
export function validatePage(page) {
  const errors = [];
  if (!page || typeof page !== "object") {
    return { valid: false, errors: ["page: オブジェクトである必要があります"] };
  }
  if (!page.id) err(errors, "page.id", "必須です");
  if (!page.slug) err(errors, "page.slug", "必須です");
  if (!Array.isArray(page.sections)) {
    err(errors, "page.sections", "配列である必要があります");
    return { valid: errors.length === 0, errors };
  }
  page.sections.forEach((section, i) => {
    const p = `page.sections[${i}]`;
    if (!section.id) err(errors, `${p}.id`, "必須です");
    if (!SECTION_TYPES.includes(section.type)) {
      err(errors, `${p}.type`, `未知のセクション種別です（${SECTION_TYPES.join(", ")} のいずれか）`);
    }
    if (!section.props || typeof section.props !== "object") {
      err(errors, `${p}.props`, "必須です");
    }
    if (section.style) {
      validateSectionStyle(section.style, `${p}.style`, errors);
    }
  });
  return { valid: errors.length === 0, errors };
}

function validateSectionStyle(style, path, errors) {
  if (style.paddingY !== undefined && !PADDING_Y.includes(style.paddingY)) {
    err(errors, `${path}.paddingY`, `トークン名のみ許可されます（${PADDING_Y.join(", ")}）。生CSS/px値は使用できません`);
  }
  if (style.align !== undefined && !ALIGN.includes(style.align)) {
    err(errors, `${path}.align`, `列挙値のみ許可されます（${ALIGN.join(", ")}）`);
  }
  if (style.bg !== undefined) {
    if (!BG_TYPE.includes(style.bg.type)) {
      err(errors, `${path}.bg.type`, `列挙値のみ許可されます（${BG_TYPE.join(", ")}）`);
    }
    if (style.bg.value !== undefined && !BG_VALUE.includes(style.bg.value)) {
      err(errors, `${path}.bg.value`, `トークン名のみ許可されます（${BG_VALUE.join(", ")}）。生CSS/カラーコードは使用できません`);
    }
  }
}
