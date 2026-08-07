// editor/app/main.js
// エディタのエントリポイント。store/autosave/canvas/panelsを配線する。

import { createStore } from "./store.js";
import { attachHistory } from "./history.js";
import { attachAutosave, loadSite } from "./autosave.js";
import { mountCanvas, highlightSection } from "../ui/canvas.js";
import { renderPropsPanel } from "../ui/panels/props-panel.js";
import { renderThemePanel } from "../ui/panels/theme-panel.js";
import { renderStructureSheet } from "../ui/sheets/structure-sheet.js";
import { openPublishFlow } from "../ui/sheets/publish-sheet.js";
import { exportSiteAsZip } from "../media/zip.js";

const SITE_ID = "teate1122";
const ASSET_BASE = "../sites/teate1122/assets/";

const statusEl = document.getElementById("status");
const panelEl = document.getElementById("panel");
const iframeEl = document.getElementById("preview");
const exportBtn = document.getElementById("export-zip-btn");
const publishBtn = document.getElementById("publish-btn");
const undoBtn = document.getElementById("undo-btn");
const redoBtn = document.getElementById("redo-btn");
const tabButtons = document.querySelectorAll(".app__tabs button");

let activeTab = "sections";
let selectedSectionId = null;

async function loadInitialState() {
  const cached = await loadSite(SITE_ID);
  if (cached) return cached;

  const site = await fetch(`../sites/${SITE_ID}/site.json`).then((r) => r.json());
  const pageEntries = await Promise.all(
    site.pages.map((pageId) =>
      fetch(`../sites/${SITE_ID}/pages/${pageId}.json`)
        .then((r) => r.json())
        .then((page) => [pageId, page])
    )
  );
  const pages = Object.fromEntries(pageEntries);
  return { site, pages, currentPageId: "home" };
}

function renderSectionsTab(store) {
  panelEl.innerHTML = "";
  const { pages, currentPageId } = store.getState();
  const page = pages[currentPageId];

  const chips = document.createElement("div");
  chips.style.display = "flex";
  chips.style.gap = "0.5rem";
  chips.style.overflowX = "auto";
  chips.style.marginBottom = "0.75rem";
  page.sections.forEach((section) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = section.type;
    btn.style.whiteSpace = "nowrap";
    btn.style.padding = "0.4rem 0.75rem";
    btn.style.border = section.id === selectedSectionId ? "2px solid #4a7dff" : "1px solid #ccc";
    btn.style.borderRadius = "999px";
    btn.style.background = "#fff";
    btn.addEventListener("click", () => selectSection(store, section.id));
    chips.appendChild(btn);
  });
  panelEl.appendChild(chips);

  const propsContainer = document.createElement("div");
  panelEl.appendChild(propsContainer);
  if (selectedSectionId) {
    renderPropsPanel(propsContainer, store, selectedSectionId);
  } else {
    const hint = document.createElement("p");
    hint.textContent = "プレビュー内、またはこの上のタブから編集したいセクションを選んでください。";
    hint.style.fontSize = "0.85rem";
    hint.style.color = "#666";
    propsContainer.appendChild(hint);
  }
}

function renderActivePanel(store) {
  if (activeTab === "sections") {
    renderSectionsTab(store);
  } else if (activeTab === "structure") {
    renderStructureSheet(panelEl, store, {
      onSelect: (sectionId) => {
        activeTab = "sections";
        tabButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.tab === "sections"));
        selectSection(store, sectionId);
      },
    });
  } else {
    renderThemePanel(panelEl, store);
  }
}

function selectSection(store, sectionId) {
  selectedSectionId = sectionId;
  highlightSection(iframeEl, sectionId);
  renderActivePanel(store);
}

async function main() {
  statusEl.textContent = "読み込み中...";
  const initialState = await loadInitialState();
  const store = createStore(initialState);
  const history = attachHistory(store);

  function updateHistoryButtons() {
    undoBtn.disabled = !history.canUndo();
    redoBtn.disabled = !history.canRedo();
  }

  undoBtn.addEventListener("click", () => {
    history.undo();
    updateHistoryButtons();
  });
  redoBtn.addEventListener("click", () => {
    history.redo();
    updateHistoryButtons();
  });

  attachAutosave(store, SITE_ID);
  store.subscribe(() => {
    statusEl.textContent = "自動保存済み";
    updateHistoryButtons();
    renderActivePanel(store);
  });

  mountCanvas(iframeEl, store, {
    assetBase: ASSET_BASE,
    onSelectSection: (sectionId) => selectSection(store, sectionId),
  });

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      activeTab = btn.dataset.tab;
      renderActivePanel(store);
    });
  });

  exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    exportBtn.textContent = "書き出し中...";
    try {
      await exportSiteAsZip(store.getState(), ASSET_BASE);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = "ZIPで書き出し";
    }
  });

  publishBtn.addEventListener("click", () => {
    openPublishFlow({ store, siteId: SITE_ID, assetBase: ASSET_BASE });
  });

  renderActivePanel(store);
  statusEl.textContent = "";

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

main();
