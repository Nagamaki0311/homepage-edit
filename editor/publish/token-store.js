// editor/publish/token-store.js
// GitHub fine-grained PAT（Personal Access Token）のIndexedDB保存・読み出し・削除、
// 保存前の同意画面表示、末尾4文字のみのマスク表示ロジック。
//
// セキュリティ上の注意（D-010）:
// - PATは対象リポジトリ限定・Contents読み書きのみのスコープのfine-grained PATを想定する。
// - 画面には常に末尾4文字のみを表示し、全体を表示しない。
// - IndexedDBはブラウザのオリジン単位で保護されるが、同一オリジン上のXSS等でアクセスされ得るため
//   「保存しない（毎回入力）」を選べるようにし、保存する場合も明示的な同意画面を必須とする。
// - 削除ボタンは常設し、いつでもPATをブラウザから消去できるようにする。

const DB_NAME = "homepage-edit-publish";
const DB_VERSION = 1;
const STORE_NAME = "tokens";
const TOKEN_KEY = "github-pat";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 保存済みPATを取得する。保存されていなければnull。 */
export async function getStoredToken() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(TOKEN_KEY);
    req.onsuccess = () => resolve(req.result?.token ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** PATをIndexedDBに保存する。呼び出し前に必ず同意画面（renderTokenPrompt）を経由すること。 */
export async function storeToken(token) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ token, savedAt: Date.now() }, TOKEN_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 保存済みPATを削除する。 */
export async function deleteStoredToken() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(TOKEN_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 末尾4文字のみを残したマスク表示用文字列を返す（例: "••••••••ab12"）。 */
export function maskToken(token) {
  if (!token) return "";
  const last4 = token.slice(-4);
  return `${"•".repeat(8)}${last4}`;
}

/**
 * PAT入力・保存同意画面をcontainerにレンダリングする。
 * 「保存する」を選んだ場合のみ同意チェックが必須になる。
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string|null} options.storedMasked - 既に保存済みPATがある場合のマスク済み表示文字列（なければnull）
 * @param {(result: {token: string, remember: boolean}) => void} options.onSubmit
 * @param {() => void} [options.onDelete] - 「保存済みトークンを削除」時に呼ばれる
 * @param {() => void} [options.onCancel]
 */
export function renderTokenPrompt(container, { storedMasked = null, onSubmit, onDelete, onCancel } = {}) {
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "publish-token-form";

  const title = document.createElement("h3");
  title.textContent = "GitHubトークンの設定";
  wrap.appendChild(title);

  if (storedMasked) {
    const stored = document.createElement("p");
    stored.className = "publish-token-form__stored";
    stored.textContent = `保存済みトークン: ${storedMasked}`;
    wrap.appendChild(stored);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "保存済みトークンを削除";
    deleteBtn.className = "publish-token-form__delete";
    deleteBtn.addEventListener("click", () => onDelete?.());
    wrap.appendChild(deleteBtn);
  }

  const desc = document.createElement("p");
  desc.className = "publish-token-form__desc";
  desc.textContent =
    "対象リポジトリ限定・Contents読み書きのみのfine-grained PATを入力してください。トークンは公開処理にのみ使用します。";
  wrap.appendChild(desc);

  const label = document.createElement("label");
  label.className = "field";
  label.innerHTML = `<span class="field__label">Personal Access Token</span>`;
  const input = document.createElement("input");
  input.type = "password";
  input.className = "field__input";
  input.autocomplete = "off";
  input.placeholder = "github_pat_...";
  label.appendChild(input);
  wrap.appendChild(label);

  const rememberLabel = document.createElement("label");
  rememberLabel.className = "publish-token-form__remember";
  const rememberCheckbox = document.createElement("input");
  rememberCheckbox.type = "checkbox";
  rememberLabel.appendChild(rememberCheckbox);
  rememberLabel.appendChild(
    document.createTextNode(" このブラウザのIndexedDBにトークンを保存する（次回から入力を省略）")
  );
  wrap.appendChild(rememberLabel);

  const consentLabel = document.createElement("label");
  consentLabel.className = "publish-token-form__consent";
  const consentCheckbox = document.createElement("input");
  consentCheckbox.type = "checkbox";
  consentLabel.appendChild(consentCheckbox);
  consentLabel.appendChild(
    document.createTextNode(
      " 同意します: トークンをこのブラウザ内（IndexedDB）に保存すること、削除は「保存済みトークンを削除」からいつでも行えることを理解しました。"
    )
  );
  consentLabel.style.display = "none";
  wrap.appendChild(consentLabel);

  rememberCheckbox.addEventListener("change", () => {
    consentLabel.style.display = rememberCheckbox.checked ? "" : "none";
    if (!rememberCheckbox.checked) consentCheckbox.checked = false;
  });

  const errorEl = document.createElement("p");
  errorEl.className = "publish-token-form__error";
  errorEl.style.display = "none";
  wrap.appendChild(errorEl);

  const actions = document.createElement("div");
  actions.className = "publish-token-form__actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "キャンセル";
  cancelBtn.addEventListener("click", () => onCancel?.());
  actions.appendChild(cancelBtn);

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.textContent = "次へ";
  submitBtn.addEventListener("click", () => {
    const token = input.value.trim();
    if (!token) {
      errorEl.textContent = "トークンを入力してください。";
      errorEl.style.display = "";
      return;
    }
    if (rememberCheckbox.checked && !consentCheckbox.checked) {
      errorEl.textContent = "保存する場合は同意チェックが必要です。";
      errorEl.style.display = "";
      return;
    }
    onSubmit?.({ token, remember: rememberCheckbox.checked });
  });
  actions.appendChild(submitBtn);

  wrap.appendChild(actions);
  container.appendChild(wrap);
}
