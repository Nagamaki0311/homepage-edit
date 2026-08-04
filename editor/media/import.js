// editor/media/import.js
// 画像アップロード → site.assets へ追加し、セクションpropsで参照するassetIdを返す。
// P0では画像をdata URLとしてそのまま保持する（WebP変換・リサイズはP1: resize-webp.js）。

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

  store.setState((prev) => {
    const next = structuredClone(prev);
    next.site.assets = next.site.assets || [];
    next.site.assets.push({ id: assetId, file: dataUrl, w, h, alt: file.name });
    return next;
  });

  return { assetId, focal: [0.5, 0.5], zoom: 1, alt: file.name };
}
