// editor/ui/sheets/publish-sheet.js
// 「更新」ボタン押下時のフロー全体（PAT設定→変更ファイル確認シート→push進捗→結果表示）を
// document.body直下のオーバーレイとして表示する。

import { buildSiteFiles } from "../../publish/build-files.js";
import {
  publishFiles,
  PublishAuthError,
  PublishConflictError,
  PublishNetworkError,
} from "../../publish/github.js";
import { getStoredToken, storeToken, deleteStoredToken, maskToken, renderTokenPrompt } from "../../publish/token-store.js";

function createOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "publish-overlay";
  const panel = document.createElement("div");
  panel.className = "publish-overlay__panel";
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  return { overlay, panel };
}

function renderMessage(panel, { title, body, actions = [] }) {
  panel.innerHTML = "";
  const h = document.createElement("h3");
  h.textContent = title;
  panel.appendChild(h);
  if (body) {
    const p = document.createElement("p");
    p.className = "publish-overlay__message";
    p.textContent = body;
    panel.appendChild(p);
  }
  const actionsEl = document.createElement("div");
  actionsEl.className = "publish-token-form__actions";
  actions.forEach(({ label, onClick, primary }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    if (primary) btn.className = "publish-overlay__primary";
    btn.addEventListener("click", onClick);
    actionsEl.appendChild(btn);
  });
  panel.appendChild(actionsEl);
}

function renderProgress(panel, step) {
  panel.innerHTML = "";
  const h = document.createElement("h3");
  h.textContent = "公開中...";
  panel.appendChild(h);
  const p = document.createElement("p");
  p.className = "publish-overlay__message";
  p.textContent = step;
  panel.appendChild(p);
}

function renderConfirmSheet(panel, { files, target, onConfirm, onCancel }) {
  panel.innerHTML = "";
  const h = document.createElement("h3");
  h.textContent = "変更内容の確認";
  panel.appendChild(h);

  const target_p = document.createElement("p");
  target_p.className = "publish-overlay__message";
  target_p.textContent = `公開先: ${target.owner}/${target.repo} (${target.branch})`;
  panel.appendChild(target_p);

  const countP = document.createElement("p");
  countP.className = "publish-overlay__message";
  countP.textContent = `以下の${files.length}件のファイルをコミットします。`;
  panel.appendChild(countP);

  const list = document.createElement("ul");
  list.className = "publish-overlay__file-list";
  files.forEach((f) => {
    const li = document.createElement("li");
    li.textContent = f.name;
    list.appendChild(li);
  });
  panel.appendChild(list);

  const actionsEl = document.createElement("div");
  actionsEl.className = "publish-token-form__actions";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "中断";
  cancelBtn.addEventListener("click", onCancel);
  actionsEl.appendChild(cancelBtn);

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.textContent = "この内容で公開する";
  confirmBtn.className = "publish-overlay__primary";
  confirmBtn.addEventListener("click", onConfirm);
  actionsEl.appendChild(confirmBtn);

  panel.appendChild(actionsEl);
}

/**
 * 「更新」ボタンの公開フローを開始する。
 * @param {object} options
 * @param {object} options.store - editor/app/store.js のstore
 * @param {string} options.siteId
 * @param {string} options.assetBase - 既存アセットfetch用の相対パス前置
 */
export async function openPublishFlow({ store, siteId, assetBase }) {
  const { overlay, panel } = createOverlay();
  const close = () => overlay.remove();

  let target;
  try {
    renderProgress(panel, "公開先の設定を読み込み中");
    target = await fetch(`../sites/${siteId}/publish.json`).then((r) => {
      if (!r.ok) throw new Error("publish.jsonの取得に失敗しました");
      return r.json();
    });
  } catch (err) {
    renderMessage(panel, {
      title: "設定の読み込みに失敗しました",
      body: `sites/${siteId}/publish.json を確認してください。（${err.message}）`,
      actions: [{ label: "閉じる", onClick: close }],
    });
    return;
  }

  async function step_promptToken() {
    const stored = await getStoredToken();
    renderTokenPrompt(panel, {
      storedMasked: stored ? maskToken(stored) : null,
      onSubmit: async ({ token, remember }) => {
        if (remember) await storeToken(token);
        step_confirmSheet(token);
      },
      onDelete: async () => {
        await deleteStoredToken();
        step_promptToken();
      },
      onCancel: close,
    });
  }

  async function step_confirmSheet(token) {
    renderProgress(panel, "変更ファイルを組み立て中");
    let files;
    try {
      files = await buildSiteFiles(store.getState(), { assetBase, dataPrefix: "site-data" });
    } catch (err) {
      renderMessage(panel, {
        title: "ファイルの組み立てに失敗しました",
        body: err.message,
        actions: [{ label: "閉じる", onClick: close }],
      });
      return;
    }
    renderConfirmSheet(panel, {
      files,
      target,
      onCancel: close,
      onConfirm: () => step_publish(token, files),
    });
  }

  async function step_publish(token, files) {
    try {
      const result = await publishFiles(token, target, files, {
        message: "サイトエディタから更新",
        onProgress: (stepText) => renderProgress(panel, stepText),
      });
      renderMessage(panel, {
        title: "公開が完了しました",
        body: `コミット ${result.commitSha.slice(0, 7)} を ${target.owner}/${target.repo} (${target.branch}) へpushしました。`,
        actions: [{ label: "閉じる", onClick: close, primary: true }],
      });
    } catch (err) {
      if (err instanceof PublishAuthError) {
        renderMessage(panel, {
          title: "認証エラー",
          body: err.message,
          actions: [
            { label: "トークンを再入力", onClick: () => step_promptToken(), primary: true },
            { label: "中断", onClick: close },
          ],
        });
        return;
      }
      if (err instanceof PublishConflictError) {
        renderMessage(panel, {
          title: "競合が発生しました",
          body: `${err.message} リモートの最新状態を取得して再試行するか、中断してください。`,
          actions: [
            { label: "再取得して再試行", onClick: () => step_confirmSheet(token), primary: true },
            { label: "中断", onClick: close },
          ],
        });
        return;
      }
      if (err instanceof PublishNetworkError) {
        renderMessage(panel, {
          title: "ネットワークエラー",
          body: `${err.message}（自動リトライ後も失敗しました）`,
          actions: [
            { label: "再試行", onClick: () => step_publish(token, files), primary: true },
            { label: "中断", onClick: close },
          ],
        });
        return;
      }
      renderMessage(panel, {
        title: "公開に失敗しました",
        body: err.message,
        actions: [{ label: "閉じる", onClick: close }],
      });
    }
  }

  step_promptToken();
}
