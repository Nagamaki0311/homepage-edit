// editor/media/import.js
// 画像アップロード → site.assets へ追加し、セクションpropsで参照するassetIdを返す。
// 元画像はdata URLとしてそのまま保持しつつ、resize-webp.jsで生成した複数幅のWebPを
// asset.srcsetとして併せて保存する（core/render側でsrcset属性として出力される）。

import { generateWebpSrcset } from "./resize-webp.js";

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readImageSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = dataUrl;
  });
}

/**
 * アップロードされたファイルを store の site.assets に追加し、
 * セクションpropsの image フィールドにそのまま設定できる値を返す。
 * @param {object} store
 * @param {File} file
 * @returns {Promise<{assetId: string, focal: [number, number], zoom: number, alt: string}>}
 */
export async function readImageAsAsset(store, file) {
  const dataUrl = await readAsDataUrl(file);
  const { w, h } = await readImageSize(dataUrl);
  const assetId = `a${Date.now().toString(36)}`;

  // WebP生成に失敗してもアップロード自体は失敗させない（元画像のdata URLのみで動作する）。
  const webp = await generateWebpSrcset(file).catch(() => null);

  store.setState((prev) => {
    const next = structuredClone(prev);
    next.site.assets = next.site.assets || [];
    const asset = { id: assetId, file: dataUrl, w, h, alt: file.name };
    if (webp?.srcset?.length) {
      asset.srcset = webp.srcset.map((entry) => ({
        width: entry.width,
        height: entry.height,
        file: entry.file,
      }));
    }
    next.site.assets.push(asset);
    return next;
  });

  return { assetId, focal: [0.5, 0.5], zoom: 1, alt: file.name };
}
