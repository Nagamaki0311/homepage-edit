// editor/app/autosave.js
// IndexedDBへの自動保存の薄いwrapper。ブラウザ専用。

const DB_NAME = "homepage-edit";
const DB_VERSION = 1;
const STORE_NAME = "sites";

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

/** siteId をキーに state（{site, pages}）を保存する。 */
export async function saveSite(siteId, state) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(state, siteId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** siteId に対応する保存済みstateを読み込む。なければ null。 */
export async function loadSite(siteId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(siteId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** store の変更を一定間隔でデバウンスしてIndexedDBに保存する。 */
export function attachAutosave(store, siteId, { delayMs = 800 } = {}) {
  let timer = null;
  return store.subscribe((state) => {
    clearTimeout(timer);
    timer = setTimeout(() => saveSite(siteId, state), delayMs);
  });
}
