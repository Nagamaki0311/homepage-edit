// editor/ui/panels/theme-panel.js
// テーマの色トークンを編集する簡易パネル（サイト全体に反映される）。

const COLOR_FIELDS = [
  { key: "bg", label: "背景色" },
  { key: "surface", label: "サーフェス色" },
  { key: "text", label: "文字色" },
  { key: "textMuted", label: "文字色（弱）" },
  { key: "accent", label: "アクセント色" },
  { key: "border", label: "境界線色" },
];

export function renderThemePanel(container, store) {
  container.innerHTML = "";
  const title = document.createElement("h3");
  title.textContent = "テーマカラー";
  container.appendChild(title);

  const { site } = store.getState();
  COLOR_FIELDS.forEach((field) => {
    const wrap = document.createElement("label");
    wrap.className = "field";
    const labelEl = document.createElement("span");
    labelEl.className = "field__label";
    labelEl.textContent = field.label;
    wrap.appendChild(labelEl);

    const input = document.createElement("input");
    input.type = "color";
    input.className = "field__input";
    input.value = site.theme.tokens.color[field.key] || "#ffffff";
    input.addEventListener("input", () => {
      store.setPath(`site.theme.tokens.color.${field.key}`, input.value);
    });
    wrap.appendChild(input);
    container.appendChild(wrap);
  });
}
