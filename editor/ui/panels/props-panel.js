// editor/ui/panels/props-panel.js
// 選択中セクションのプロパティ編集フォームを、core/sections/*/define.js の定義から生成する。

import { sections as sectionRegistry } from "../../../core/sections/index.js";
import { readImageAsAsset } from "../../media/import.js";

function getSectionIndex(page, sectionId) {
  return page.sections.findIndex((s) => s.id === sectionId);
}

function propsBasePath(pageId, index) {
  return `pages.${pageId}.sections.${index}.props`;
}

function renderField(field, value, onChange, store) {
  const wrap = document.createElement("label");
  wrap.className = "field";
  const labelEl = document.createElement("span");
  labelEl.className = "field__label";
  labelEl.textContent = field.label;
  wrap.appendChild(labelEl);

  let input;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
    input.value = value ?? "";
    input.addEventListener("input", () => onChange(input.value));
  } else if (field.type === "boolean") {
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
    input.addEventListener("change", () => onChange(input.checked));
  } else if (field.type === "select") {
    input = document.createElement("select");
    (field.options || []).forEach((opt) => {
      const optEl = document.createElement("option");
      optEl.value = opt;
      optEl.textContent = opt;
      if (opt === value) optEl.selected = true;
      input.appendChild(optEl);
    });
    input.addEventListener("change", () => onChange(input.value));
  } else if (field.type === "image") {
    input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const asset = await readImageAsAsset(store, file);
      onChange(asset);
    });
  } else {
    input = document.createElement("input");
    input.type = "text";
    input.value = value ?? "";
    input.addEventListener("input", () => onChange(input.value));
  }
  input.className = "field__input";
  wrap.appendChild(input);
  return wrap;
}

/**
 * 選択中セクションの編集フォームをcontainerに描画する。
 * @param {HTMLElement} container
 * @param {object} store
 * @param {string} sectionId
 */
export function renderPropsPanel(container, store, sectionId) {
  container.innerHTML = "";
  const { pages, currentPageId } = store.getState();
  const page = pages[currentPageId];
  const index = getSectionIndex(page, sectionId);
  if (index === -1) return;
  const section = page.sections[index];
  const def = sectionRegistry[section.type]?.define;
  if (!def) return;

  const title = document.createElement("h3");
  title.textContent = def.label;
  container.appendChild(title);

  const basePath = propsBasePath(currentPageId, index);

  for (const field of def.fields) {
    if (field.type === "list") {
      const items = section.props[field.key] || [];
      const listTitle = document.createElement("p");
      listTitle.className = "field__label";
      listTitle.textContent = field.label;
      container.appendChild(listTitle);
      items.forEach((item, i) => {
        const itemWrap = document.createElement("div");
        itemWrap.className = "field-list-item";
        field.itemFields.forEach((sub) => {
          const path = `${basePath}.${field.key}.${i}.${sub.key}`;
          itemWrap.appendChild(
            renderField(sub, item[sub.key], (v) => store.setPath(path, v), store)
          );
        });
        container.appendChild(itemWrap);
      });
      continue;
    }

    const keys = field.key.split(".");
    const value = keys.reduce((acc, k) => acc?.[k], section.props);
    const path = `${basePath}.${field.key}`;
    container.appendChild(renderField(field, value, (v) => store.setPath(path, v), store));
  }

  const visibleToggle = renderField(
    { key: "visible", label: "このセクションを表示する", type: "boolean" },
    section.visible !== false,
    (v) => store.setPath(`pages.${currentPageId}.sections.${index}.visible`, v),
    store
  );
  container.appendChild(visibleToggle);
}
