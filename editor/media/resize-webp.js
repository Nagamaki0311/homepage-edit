// editor/media/resize-webp.js
// アップロードされた画像を複数幅のWebPに変換する。
// createImageBitmap + canvas.toBlob('image/webp') のみを使い、追加の依存は持たない。
// ponytail: アスペクト比は常に元画像を維持する単純な幅基準リサイズのみ行う（トリミング等は行わない）。

const WIDTHS = [480, 960, 1440];
const QUALITY = 0.82;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function resizeToWidth(bitmap, width) {
  const scale = width / bitmap.width;
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
  if (!blob) return null;
  return { width, height, file: await blobToDataUrl(blob) };
}

/**
 * ファイルから480/960/1440px幅（元画像より大きい幅はスキップ）のWebP画像を生成する。
 * createImageBitmapやWebPエンコードが使えない環境ではnullを返し、呼び出し側は
 * 従来通り元画像のdata URLのみを使うフォールバックを行う。
 * @param {File} file
 * @returns {Promise<{ srcset: Array<{width:number,height:number,file:string}>, w:number, h:number } | null>}
 */
export async function generateWebpSrcset(file) {
  if (typeof createImageBitmap !== "function") return null;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  const widths = WIDTHS.filter((w) => w < bitmap.width);
  widths.push(bitmap.width);

  const srcset = [];
  for (const width of widths) {
    const entry = await resizeToWidth(bitmap, width);
    if (entry) srcset.push(entry);
  }
  const w = bitmap.width;
  const h = bitmap.height;
  bitmap.close?.();

  if (srcset.length === 0) return null;
  return { srcset, w, h };
}
