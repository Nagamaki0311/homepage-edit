// editor/app/store.js
// 最小限のpub/sub状態管理。ブラウザ専用（core/とは異なりDOM APIに依存してよい）。

export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  function getState() {
    return state;
  }

  /** state をイミュータブルに置き換える。 */
  function setState(patch) {
    state = typeof patch === "function" ? patch(state) : { ...state, ...patch };
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  /**
   * ドット区切りのパスで単一の値を更新する（例: "pages.home.sections.0.props.heading"）。
   * セクション編集フォームからの単純な値更新に使う。
   */
  function setPath(path, value) {
    setState((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let target = next;
      for (let i = 0; i < keys.length - 1; i++) {
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;
      return next;
    });
  }

  function getPath(path) {
    return path.split(".").reduce((acc, k) => acc?.[k], state);
  }

  return { getState, setState, setPath, getPath, subscribe };
}
