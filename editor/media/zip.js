// editor/media/zip.js
// 依存ゼロの最小ZIP(STORE=無圧縮)エンコーダ。
// ponytail: DEFLATE圧縮は実装せずSTOREのみとする。
// 本アプリが生成するファイル（HTML/CSS/JSON、数枚の画像）は小さく、圧縮率よりも
// 追加ライブラリを持ち込まないことを優先した。将来ファイルサイズが問題になれば
// ブラウザ標準の CompressionStream('deflate-raw') を使ったDEFLATE対応を検討する。

import { renderSite } from "../../core/render/render-site.js";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  return new TextEncoder().encode(data);
}

function writeUint32LE(view, offset, value) {
  view.setUint32(offset, value, true);
}
function writeUint16LE(view, offset, value) {
  view.setUint16(offset, value, true);
}

/**
 * files: [{ name: string, data: Uint8Array | string }]
 * STORE方式（無圧縮）のZIPバイナリ(Uint8Array)を返す。
 */
export function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = toBytes(file.data);
    const crc = crc32(dataBytes);

    const localHeader = new ArrayBuffer(30);
    const lv = new DataView(localHeader);
    writeUint32LE(lv, 0, 0x04034b50);
    writeUint16LE(lv, 4, 20);
    writeUint16LE(lv, 6, 0);
    writeUint16LE(lv, 8, 0); // 無圧縮(STORE)
    writeUint16LE(lv, 10, 0);
    writeUint16LE(lv, 12, 0);
    writeUint32LE(lv, 14, crc);
    writeUint32LE(lv, 18, dataBytes.length);
    writeUint32LE(lv, 22, dataBytes.length);
    writeUint16LE(lv, 26, nameBytes.length);
    writeUint16LE(lv, 28, 0);

    localParts.push(new Uint8Array(localHeader), nameBytes, dataBytes);

    const centralHeader = new ArrayBuffer(46);
    const cv = new DataView(centralHeader);
    writeUint32LE(cv, 0, 0x02014b50);
    writeUint16LE(cv, 4, 20);
    writeUint16LE(cv, 6, 20);
    writeUint16LE(cv, 8, 0);
    writeUint16LE(cv, 10, 0);
    writeUint16LE(cv, 12, 0);
    writeUint16LE(cv, 14, 0);
    writeUint32LE(cv, 16, crc);
    writeUint32LE(cv, 20, dataBytes.length);
    writeUint32LE(cv, 24, dataBytes.length);
    writeUint16LE(cv, 28, nameBytes.length);
    writeUint16LE(cv, 30, 0);
    writeUint16LE(cv, 32, 0);
    writeUint16LE(cv, 34, 0);
    writeUint16LE(cv, 36, 0);
    writeUint32LE(cv, 38, 0);
    writeUint32LE(cv, 42, offset);

    centralParts.push(new Uint8Array(centralHeader), nameBytes);

    offset += localHeader.byteLength + nameBytes.length + dataBytes.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  centralParts.forEach((p) => (centralSize += p.length));

  const endRecord = new ArrayBuffer(22);
  const ev = new DataView(endRecord);
  writeUint32LE(ev, 0, 0x06054b50);
  writeUint16LE(ev, 4, 0);
  writeUint16LE(ev, 6, 0);
  writeUint16LE(ev, 8, files.length);
  writeUint16LE(ev, 10, files.length);
  writeUint32LE(ev, 12, centralSize);
  writeUint32LE(ev, 16, centralStart);
  writeUint16LE(ev, 20, 0);

  const total = [...localParts, ...centralParts, new Uint8Array(endRecord)];
  const totalLength = total.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of total) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function extFromMime(dataUrl) {
  const m = /^data:image\/([a-zA-Z0-9+.-]+);/.exec(dataUrl);
  if (!m) return "bin";
  return m[1] === "svg+xml" ? "svg" : m[1];
}

/**
 * 現在のstate(site + pages)から dist/ 相当のファイル一式を組み立て、ZIPとしてダウンロードする。
 * アップロード画像（data URL）はバイナリファイルに変換し、site.jsonのasset.fileを相対パスに書き換える。
 * 既存ファイル参照のアセットは assetBase 経由でfetchして実バイトを取得する。
 * @param {object} state
 * @param {string} assetBase - 既存アセットを取得する際の相対パス前置（editorの現在位置基準）
 */
export async function exportSiteAsZip(state, assetBase = "") {
  const site = structuredClone(state.site);
  const files = [];

  for (let i = 0; i < (site.assets || []).length; i++) {
    const asset = site.assets[i];
    if (asset.file.startsWith("data:")) {
      const ext = extFromMime(asset.file);
      const filename = `${asset.id || `asset-${i}`}.${ext}`;
      files.push({ name: `assets/${filename}`, data: dataUrlToBytes(asset.file) });
      asset.file = filename;
    } else {
      const res = await fetch(`${assetBase}${asset.file}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      files.push({ name: `assets/${asset.file}`, data: buf });
    }
  }

  for (const pageId of site.pages) {
    const page = state.pages[pageId];
    const { html, css } = renderSite(site, page, { assetBase: "assets/", cssHref: "style.css" });
    const filename = page.slug === "/" ? "index.html" : `${page.slug.replace(/^\/+|\/+$/g, "")}.html`;
    files.push({ name: filename, data: html });
    files.push({ name: "style.css", data: css });
    files.push({ name: `sites-data/pages/${pageId}.json`, data: JSON.stringify(page, null, 2) });
  }
  files.push({ name: "sites-data/site.json", data: JSON.stringify(site, null, 2) });

  const zipBytes = createZip(files);
  const blob = new Blob([zipBytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${site.site.id || "site"}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
