// editor/app/history.js
// Undo/Redoの逆パッチスタック。JSON Patch風の {op, path, value} を対で積む。
// path は store.setPath と同じドット区切り表記。store.setState 経由の変更（並び替え・
// 複製・削除・画像アップロード等、単一パスで表現できない変更）は path:"" （state全体の
// 置き換え）として扱う。
//
// store.setPath / store.setState をラップして呼び出しを横取りし、変更前後の値から
// undo/redoパッチを自動生成する。ラップは store オブジェクトのメソッドを直接差し替える
// ことで行う（呼び出し側は常に store.setPath(...) のようにプロパティ経由で呼ぶため、
// 差し替えのタイミングは createStore 直後であればよい）。

/**
 * @param {object} store - editor/app/store.js の store
 * @param {object} [options]
 * @param {number} [options.coalesceMs] - 同一pathへの連続変更をまとめる猶予時間(ms)
 */
export function attachHistory(store, { coalesceMs = 500 } = {}) {
  const undoStack = [];
  const redoStack = [];

  const originalSetPath = store.setPath;
  const originalSetState = store.setState;

  let coalesceKey = null;
  let coalesceTimer = null;

  function stopCoalescing() {
    coalesceKey = null;
    clearTimeout(coalesceTimer);
    coalesceTimer = null;
  }

  // store.setState/setPathはstate変更と同時にstoreのlistenersへ通知するため、
  // 「undo/redoパッチを積む」処理はstoreへ通知が飛ぶ前（=originalSetState/originalSetPathを
  // 呼び出す前）に完了させる必要がある。そうしないと、UIのボタン活性状態を更新するlistener側から
  // 見た時点でまだスタックが空のままになってしまう。そのためundo側の値のみ先に確定させてpushし、
  // redo側の値はstate変更後にエントリを直接書き換える形で後から埋める。
  function beginEntry(key, undoPatch) {
    redoStack.length = 0;
    const last = undoStack[undoStack.length - 1];
    clearTimeout(coalesceTimer);
    coalesceTimer = setTimeout(stopCoalescing, coalesceMs);
    if (key && key === coalesceKey && last) {
      // 直近の変更と同じpathへの連続入力: undoは初回の値のまま、redoだけ後で更新する。
      coalesceKey = key;
      return last;
    }
    const entry = { undo: undoPatch, redo: null };
    undoStack.push(entry);
    coalesceKey = key;
    return entry;
  }

  store.setPath = (path, value) => {
    const before = store.getPath(path);
    const entry = beginEntry(path, { op: "replace", path, value: before });
    originalSetPath(path, value);
    entry.redo = { op: "replace", path, value };
  };

  store.setState = (patch) => {
    const before = store.getState();
    // setState は複合的な変更（並び替え等）を表すことが多く、pathで安全にコアレスできないため
    // 毎回独立したエントリとして積む。
    const entry = beginEntry(null, { op: "replace", path: "", value: before });
    originalSetState(patch);
    entry.redo = { op: "replace", path: "", value: store.getState() };
  };

  function applyPatch(patch) {
    if (patch.path === "") {
      originalSetState(patch.value);
    } else {
      originalSetPath(patch.path, patch.value);
    }
  }

  function undo() {
    const entry = undoStack.pop();
    if (!entry) return;
    stopCoalescing();
    applyPatch(entry.undo);
    redoStack.push(entry);
  }

  function redo() {
    const entry = redoStack.pop();
    if (!entry) return;
    stopCoalescing();
    applyPatch(entry.redo);
    undoStack.push(entry);
  }

  function canUndo() {
    return undoStack.length > 0;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  return { undo, redo, canUndo, canRedo };
}
