// editor/sw.js
// P0時点では最小構成のService Worker。PWAとしてインストール可能にするための登録のみ行う。
// 本格的なオフラインキャッシュ戦略はP1スコープ（docs/decisions.md D-009参照）。

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", () => {
  // ponytail: P0はキャッシュ戦略を持たずネットワークにそのまま委譲する。オフライン対応はP1で追加する。
});
