// editor/ui/sheets/structure-sheet.js
// 「構成シート」: 現在ページのセクションを縦リストで表示し、並び替え・表示切替・複製・削除を行う。
// 並び替えは 上/下ボタン（確実な代替手段）と、Pointer Eventsによる短距離ドラッグの両方に対応する。
// SortableJs等の外部ライブラリは使わず自前実装（依存ゼロ方針）。

import { sections as sectionRegistry } from "../../../core/sections/index.js";

function moveSection(store, pageId, from, to) {
  if (from === to) return;
  store.setState((prev) => {
    const next = structuredClone(prev);
    const arr = next.pages[pageId].sections;
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    return next;
  });
}

function duplicateSection(store, pageId, index) {
  store.setState((prev) => {
    const next = structuredClone(prev);
    const arr = next.pages[pageId].sections;
    const clone = structuredClone(arr[index]);
    clone.id = `s${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
    arr.splice(index + 1, 0, clone);
    return next;
  });
}

function deleteSection(store, pageId, index) {
  store.setState((prev) => {
    const next = structuredClone(prev);
    next.pages[pageId].sections.splice(index, 1);
    return next;
  });
}

function toggleVisible(store, pageId, index, visible) {
  store.setPath(`pages.${pageId}.sections.${index}.visible`, visible);
}

/**
 * @param {HTMLElement} container
 * @param {object} store - editor/app/store.js の store
 * @param {object} [options]
 * @param {(sectionId: string) => void} [options.onSelect] - 行タップ時（プロパティ編集への遷移用）
 */
export function renderStructureSheet(container, store, { onSelect } = {}) {
  container.innerHTML = "";
  const { pages, currentPageId } = store.getState();
  const page = pages[currentPageId];

  const title = document.createElement("h3");
  title.textContent = "セクション構成";
  container.appendChild(title);

  const hint = document.createElement("p");
  hint.className = "structure-hint";
  hint.textContent = "ハンドル(⠿)をドラッグするか、上下ボタンで並び替えできます。";
  container.appendChild(hint);

  const list = document.createElement("div");
  list.className = "structure-list";
  container.appendChild(list);

  let dragState = null;

  function mkBtn(text, disabled, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.className = "structure-row__btn";
    b.disabled = disabled;
    b.addEventListener("click", onClick);
    return b;
  }

  function onDragMove(e) {
    if (!dragState) return;
    const delta = e.clientY - dragState.startY;
    dragState.row.style.transform = `translateY(${delta}px)`;

    const rowRect = dragState.row.getBoundingClientRect();
    const centerY = rowRect.top + rowRect.height / 2;
    let target = dragState.index;
    dragState.rows.forEach((r, i) => {
      if (r === dragState.row) return;
      const rect = r.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (i < dragState.index && centerY < mid) target = Math.min(target, i);
      if (i > dragState.index && centerY > mid) target = Math.max(target, i);
    });
    dragState.currentTarget = target;
  }

  function onDragEnd() {
    if (!dragState) return;
    const { row, index, currentTarget } = dragState;
    row.style.transform = "";
    row.classList.remove("is-dragging");
    row.removeEventListener("pointermove", onDragMove);
    row.removeEventListener("pointerup", onDragEnd);
    row.removeEventListener("pointercancel", onDragEnd);
    dragState = null;
    if (currentTarget !== index) {
      moveSection(store, currentPageId, index, currentTarget);
    }
  }

  function startDrag(e, row, index) {
    e.preventDefault();
    const rows = Array.from(list.children);
    dragState = { index, startY: e.clientY, row, rows, currentTarget: index };
    row.classList.add("is-dragging");
    row.setPointerCapture(e.pointerId);
    row.addEventListener("pointermove", onDragMove);
    row.addEventListener("pointerup", onDragEnd);
    row.addEventListener("pointercancel", onDragEnd);
  }

  function buildRow(section, index, total) {
    const def = sectionRegistry[section.type]?.define;
    const row = document.createElement("div");
    row.className = "structure-row";
    row.dataset.index = String(index);

    const handle = document.createElement("span");
    handle.className = "structure-row__handle";
    handle.textContent = "⠿";
    handle.addEventListener("pointerdown", (e) => startDrag(e, row, index));
    row.appendChild(handle);

    const label = document.createElement("button");
    label.type = "button";
    label.className = "structure-row__label";
    label.textContent = def?.label || section.type;
    label.addEventListener("click", () => onSelect?.(section.id));
    row.appendChild(label);

    const visibleToggle = document.createElement("input");
    visibleToggle.type = "checkbox";
    visibleToggle.className = "structure-row__visible";
    visibleToggle.checked = section.visible !== false;
    visibleToggle.title = "このセクションを表示する";
    visibleToggle.addEventListener("change", () =>
      toggleVisible(store, currentPageId, index, visibleToggle.checked)
    );
    row.appendChild(visibleToggle);

    row.appendChild(mkBtn("↑", index === 0, () => moveSection(store, currentPageId, index, index - 1)));
    row.appendChild(mkBtn("↓", index === total - 1, () => moveSection(store, currentPageId, index, index + 1)));
    row.appendChild(mkBtn("複製", false, () => duplicateSection(store, currentPageId, index)));

    const delBtn = mkBtn("削除", total <= 1, () => {
      if (window.confirm("このセクションを削除しますか？")) {
        deleteSection(store, currentPageId, index);
      }
    });
    delBtn.classList.add("structure-row__danger");
    row.appendChild(delBtn);

    return row;
  }

  page.sections.forEach((section, index) => {
    list.appendChild(buildRow(section, index, page.sections.length));
  });
}
