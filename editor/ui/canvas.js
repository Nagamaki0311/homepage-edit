// editor/ui/canvas.js
// core/render の出力をiframeに描画するライブプレビュー。
// core/renderはブラウザ・Node共有の依存ゼロモジュールであり、ここではそれをそのままimportして使う。

import { renderSite } from "../../core/render/render-site.js";

/**
 * iframe要素にプレビューを描画し、store変更のたびに再描画する。
 * @param {HTMLIFrameElement} iframeEl
 * @param {object} store - editor/app/store.js のstore
 * @param {object} options
 * @param {string} options.assetBase - アセットURLの前置パス（editorからの相対パス）
 * @param {(sectionId: string) => void} options.onSelectSection - プレビュー内のセクションタップ時に呼ばれる
 */
export function mountCanvas(iframeEl, store, { assetBase, onSelectSection }) {
  function render() {
    const { site, pages, currentPageId } = store.getState();
    const page = pages[currentPageId];
    const { html, css } = renderSite(site, page, { assetBase, cssHref: "" });
    const withInlineCss = html.replace(
      '<link rel="stylesheet" href="">',
      `<style>${css}</style><style>
        [data-section-id] { cursor: pointer; outline-offset: -2px; }
        [data-section-id].is-selected { outline: 2px solid #4a7dff; }
      </style>`
    );
    iframeEl.srcdoc = withInlineCss;
  }

  iframeEl.addEventListener("load", () => {
    const doc = iframeEl.contentDocument;
    if (!doc) return;
    doc.querySelectorAll("[data-section-id]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        onSelectSection?.(el.getAttribute("data-section-id"));
      });
    });
  });

  store.subscribe(render);
  render();

  return { rerender: render };
}

/** 選択中セクションのハイライト表示をiframe内に反映する。 */
export function highlightSection(iframeEl, sectionId) {
  const doc = iframeEl.contentDocument;
  if (!doc) return;
  doc.querySelectorAll("[data-section-id]").forEach((el) => {
    el.classList.toggle("is-selected", el.getAttribute("data-section-id") === sectionId);
  });
}
