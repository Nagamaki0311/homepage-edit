// editor/ui/panels/theme-panel.js
// テーマの色トークンを編集する簡易パネル（サイト全体に反映される）。
// プリセット一覧からの一括置換（色・フォント・ボタン・アニメーション・余白）にも対応する。

const COLOR_FIELDS = [
  { key: "bg", label: "背景色" },
  { key: "surface", label: "サーフェス色" },
  { key: "text", label: "文字色" },
  { key: "textMuted", label: "文字色（弱）" },
  { key: "accent", label: "アクセント色" },
  { key: "border", label: "境界線色" },
];

// core/theme/presets/ に置かれているプリセットの一覧。
// ponytail: ディレクトリを動的スキャンする仕組みは持たず、追加時にここへ1行足す運用とする。
const THEME_PRESETS = [
  { id: "quiet-mincho", label: "静かな明朝" },
  { id: "warm-sunset", label: "温かな夕焼け" },
  { id: "cool-mono", label: "クールモノトーン" },
];
const PRESET_BASE = "../core/theme/presets/";

async function applyPreset(store, id) {
  const res = await fetch(`${PRESET_BASE}${id}.json`);
  const theme = await res.json();
  store.setPath("site.theme", theme);
}

function renderPresetPicker(container, store, site) {
  const title = document.createElement("h4");
  title.textContent = "プリセットから選ぶ";
  container.appendChild(title);

  const list = document.createElement("div");
  list.className = "theme-preset-list";
  THEME_PRESETS.forEach((preset) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-preset-btn";
    if (site.theme?.preset === preset.id) btn.classList.add("is-active");
    btn.textContent = preset.label;
    btn.addEventListener("click", () => applyPreset(store, preset.id));
    list.appendChild(btn);
  });
  container.appendChild(list);
}

export function renderThemePanel(container, store) {
  container.innerHTML = "";
  const title = document.createElement("h3");
  title.textContent = "テーマ";
  container.appendChild(title);

  const { site } = store.getState();
  renderPresetPicker(container, store, site);

  const colorTitle = document.createElement("h4");
  colorTitle.textContent = "個別に色を調整する";
  container.appendChild(colorTitle);

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
