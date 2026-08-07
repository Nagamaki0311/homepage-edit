// editor/publish/build-files.js
// state（site + pages）から公開用ファイル一式（HTML/CSS/JSON/画像）を組み立てる。
// editor/media/zip.js（ZIP書き出し）と editor/publish/github.js を使うGitHub直接公開フローの
// 両方から共有される。dataPrefixで site.json / pages/*.json の格納先ディレクトリ名を切り替える
// （ZIP出力は歴史的経緯で"sites-data"、teate1122の実サイトは"site-data"とディレクトリ名が異なるため）。

import { renderSite } from "../../core/render/render-site.js";

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
 * 現在のstate(site + pages)から dist/ 相当のファイル一式（{ name, data }[]）を組み立てて返す。
 * アップロード画像（data URL）はバイナリファイルに変換し、site.jsonのasset.fileを相対パスに書き換える。
 * 既存ファイル参照のアセットは assetBase 経由でfetchして実バイトを取得する。
 * ダウンロードやAPI送信は行わない（呼び出し側の責務）。
 * @param {object} state
 * @param {object} [options]
 * @param {string} [options.assetBase] - 既存アセットを取得する際の相対パス前置（editorの現在位置基準）
 * @param {string} [options.dataPrefix] - site.json/pages/*.jsonの格納先ディレクトリ名（既定: "sites-data"）
 * @returns {Promise<Array<{name: string, data: Uint8Array | string}>>}
 */
export async function buildSiteFiles(state, { assetBase = "", dataPrefix = "sites-data" } = {}) {
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

    if (Array.isArray(asset.srcset)) {
      for (let j = 0; j < asset.srcset.length; j++) {
        const entry = asset.srcset[j];
        if (typeof entry.file === "string" && entry.file.startsWith("data:")) {
          const ext = extFromMime(entry.file);
          const filename = `${asset.id || `asset-${i}`}-${entry.width}w.${ext}`;
          files.push({ name: `assets/${filename}`, data: dataUrlToBytes(entry.file) });
          entry.file = filename;
        } else if (typeof entry.file === "string") {
          const res = await fetch(`${assetBase}${entry.file}`);
          const buf = new Uint8Array(await res.arrayBuffer());
          files.push({ name: `assets/${entry.file}`, data: buf });
        }
      }
    }
  }

  for (const pageId of site.pages) {
    const page = state.pages[pageId];
    const { html, css } = renderSite(site, page, { assetBase: "assets/", cssHref: "style.css", pages: state.pages });
    const filename = page.slug === "/" ? "index.html" : `${page.slug.replace(/^\/+|\/+$/g, "")}.html`;
    files.push({ name: filename, data: html });
    files.push({ name: "style.css", data: css });
    files.push({ name: `${dataPrefix}/pages/${pageId}.json`, data: JSON.stringify(page, null, 2) });
  }
  files.push({ name: `${dataPrefix}/site.json`, data: JSON.stringify(site, null, 2) });

  return files;
}
