// core/render/assets.js
// 依存ゼロ・ブラウザ/Node共有。site.json の assets 配列からアセットURLを解決する。

/** assetId から asset レコードを探す。見つからなければ null。 */
export function findAsset(site, assetId) {
  if (!assetId) return null;
  return (site?.assets || []).find((a) => a.id === assetId) || null;
}

/**
 * assetId をURLに解決する。
 * asset.file が data: / http(s): のような絶対URLの場合はそのまま返す（エディタでのアップロード直後のプレビュー用）。
 * それ以外は assetBase を前置した相対パスを返す（本番ビルド/エディタのプレビューiframeそれぞれが assetBase を指定する）。
 */
export function resolveAssetUrl(site, assetId, assetBase = "") {
  const asset = findAsset(site, assetId);
  if (!asset) return null;
  if (/^(data:|https?:)/.test(asset.file)) return asset.file;
  return `${assetBase}${asset.file}`;
}

function resolveOne(file, assetBase) {
  if (/^(data:|https?:)/.test(file)) return file;
  return `${assetBase}${file}`;
}

/**
 * asset.srcset（[{width, file}]）を `<url> <width>w` 形式のsrcset属性値に変換する。
 * srcsetを持たない、または空配列の場合は null を返す。
 */
export function resolveSrcset(site, assetId, assetBase = "") {
  const asset = findAsset(site, assetId);
  if (!asset || !Array.isArray(asset.srcset) || asset.srcset.length === 0) return null;
  return asset.srcset
    .filter((entry) => entry?.file && entry?.width)
    .map((entry) => `${resolveOne(entry.file, assetBase)} ${entry.width}w`)
    .join(", ");
}
