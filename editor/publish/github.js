// editor/publish/github.js
// GitHub Git Data API クライアント（fetch経由）。
// blob作成 → tree作成（base_treeに現在のtree shaを指定し変更ファイルのみ含める）→ commit作成 → ref更新（fast-forwardのみ）
// という手順で、変更ファイル一式を単一コミットとして対象リポジトリへpushする。
//
// エラーハンドリング方針（D-010）:
// - 401/403（認証エラー・権限不足）は PublishAuthError として投げ、呼び出し側でPAT再入力導線を表示する。
// - 409/422（非fast-forward。リモートが進んでいる場合）は PublishConflictError として投げ、
//   自動上書き（force push）はせず、呼び出し側でユーザーに再取得/再試行または中断を選ばせる。
// - ネットワークエラー（fetch自体の失敗、5xx）は指数バックオフで最大3回まで自動リトライする。

const API_BASE = "https://api.github.com";

export class PublishAuthError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "PublishAuthError";
    this.status = status;
  }
}

export class PublishConflictError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "PublishConflictError";
    this.status = status;
  }
}

export class PublishNetworkError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "PublishNetworkError";
    this.cause = cause;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GitHub APIへの1回のfetch呼び出し。ネットワークエラー（fetch例外・5xx）は
 * 呼び出し元の withRetry でリトライ対象として扱えるよう、そのまま投げる/PublishNetworkErrorに変換する。
 */
async function request(token, path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new PublishNetworkError(`GitHub APIへの接続に失敗しました: ${err.message}`, err);
  }

  if (res.status === 401 || res.status === 403) {
    let detail = "";
    try {
      detail = (await res.json()).message || "";
    } catch {
      /* ignore parse error */
    }
    throw new PublishAuthError(
      `GitHub認証に失敗しました（${res.status}）。トークンの権限・有効期限を確認してください。${detail}`,
      res.status
    );
  }
  if (res.status === 409 || res.status === 422) {
    let detail = "";
    try {
      detail = (await res.json()).message || "";
    } catch {
      /* ignore parse error */
    }
    throw new PublishConflictError(
      `リモートのブランチが更新されているため反映できませんでした（${res.status}）。${detail}`,
      res.status
    );
  }
  if (res.status >= 500) {
    throw new PublishNetworkError(`GitHub APIが一時的に失敗しました（${res.status}）`);
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).message || "";
    } catch {
      /* ignore parse error */
    }
    throw new Error(`GitHub APIエラー（${res.status}）: ${detail}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** ネットワークエラーのみ指数バックオフで最大retries回リトライする。認証・競合エラーは即座に再送出する。 */
async function withRetry(fn, { retries = 3, baseDelayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof PublishNetworkError) || attempt === retries) {
        throw err;
      }
      lastErr = err;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastErr;
}

/** 現在のref（ブランチ先頭commit sha）を取得する。 */
export async function getRef(token, { owner, repo, branch }) {
  return withRetry(() => request(token, `/repos/${owner}/${repo}/git/ref/heads/${branch}`));
}

/** 指定commit shaのcommitオブジェクト（tree shaを含む）を取得する。 */
export async function getCommit(token, { owner, repo, commitSha }) {
  return withRetry(() => request(token, `/repos/${owner}/${repo}/git/commits/${commitSha}`));
}

/**
 * blobを1件作成する。テキストはutf-8、バイナリ（Uint8Array）はbase64でエンコードする。
 * @returns {Promise<string>} 作成されたblobのsha
 */
export async function createBlob(token, { owner, repo }, data) {
  const isBinary = data instanceof Uint8Array;
  const content = isBinary ? bytesToBase64(data) : data;
  const result = await withRetry(() =>
    request(token, `/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      body: { content, encoding: isBinary ? "base64" : "utf-8" },
    })
  );
  return result.sha;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * 変更ファイルのみを含むtreeを作成する（base_treeに現在のtree shaを指定）。
 * @param {Array<{path: string, sha: string}>} entries
 * @returns {Promise<string>} 作成されたtreeのsha
 */
export async function createTree(token, { owner, repo }, baseTreeSha, entries) {
  const result = await withRetry(() =>
    request(token, `/repos/${owner}/${repo}/git/trees`, {
      method: "POST",
      body: {
        base_tree: baseTreeSha,
        tree: entries.map((e) => ({ path: e.path, mode: "100644", type: "blob", sha: e.sha })),
      },
    })
  );
  return result.sha;
}

/** commitを作成する。 @returns {Promise<string>} 作成されたcommitのsha */
export async function createCommit(token, { owner, repo }, { message, treeSha, parentSha }) {
  const result = await withRetry(() =>
    request(token, `/repos/${owner}/${repo}/git/commits`, {
      method: "POST",
      body: { message, tree: treeSha, parents: [parentSha] },
    })
  );
  return result.sha;
}

/**
 * refをfast-forwardのみで更新する（force指定なし）。
 * リモートが進んでいる場合はGitHub側が422を返し、PublishConflictErrorとして呼び出し側に伝播する。
 */
export async function updateRef(token, { owner, repo, branch }, commitSha) {
  return withRetry(() =>
    request(token, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: { sha: commitSha, force: false },
    })
  );
}

/**
 * 変更ファイル一式を単一コミットとして対象リポジトリのブランチへpushする。
 * @param {string} token - fine-grained PAT
 * @param {{owner: string, repo: string, branch: string}} target
 * @param {Array<{name: string, data: Uint8Array | string}>} files
 * @param {object} [options]
 * @param {string} [options.message] - コミットメッセージ
 * @param {(step: string) => void} [options.onProgress] - 進捗コールバック（"ref取得中" 等のステップ名を渡す）
 * @returns {Promise<{commitSha: string, ref: object}>}
 */
export async function publishFiles(token, target, files, { message = "サイトエディタから更新", onProgress } = {}) {
  const notify = (step) => onProgress?.(step);

  notify("最新のブランチ情報を取得中");
  const ref = await getRef(token, target);
  const baseCommitSha = ref.object.sha;
  const baseCommit = await getCommit(token, { ...target, commitSha: baseCommitSha });
  const baseTreeSha = baseCommit.tree.sha;

  notify("ファイルをアップロード中（blob作成）");
  const entries = [];
  for (const file of files) {
    const sha = await createBlob(token, target, file.data);
    entries.push({ path: file.name, sha });
  }

  notify("変更をtreeにまとめています");
  const treeSha = await createTree(token, target, baseTreeSha, entries);

  notify("コミットを作成中");
  const commitSha = await createCommit(token, target, { message, treeSha, parentSha: baseCommitSha });

  notify("ブランチへpush中");
  const updatedRef = await updateRef(token, target, commitSha);

  return { commitSha, ref: updatedRef };
}
