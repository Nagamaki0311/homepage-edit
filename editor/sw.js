// editor/sw.js
// アプリシェル（editor/, core/, sites/ 配下の静的ファイル）をcache-firstでキャッシュするService Worker。
// バージョンはCACHE_VERSIONで管理し、更新時にactivateイベントで古いキャッシュを破棄する。
// GitHub公開等のオンライン専用機能はこのSWの対象外（フェッチはネットワークにそのまま委譲される）。

const CACHE_VERSION = "v1";
const CACHE_NAME = `homepage-edit-${CACHE_VERSION}`;

// ponytail: ビルドツールを持たないため、キャッシュ対象は手動列挙する。
// 新しいファイルを追加した場合はここにも追記すること。
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./app/main.js",
  "./app/store.js",
  "./app/autosave.js",
  "./app/history.js",
  "./ui/canvas.js",
  "./ui/panels/props-panel.js",
  "./ui/panels/theme-panel.js",
  "./ui/sheets/structure-sheet.js",
  "./media/import.js",
  "./media/zip.js",
  "./media/resize-webp.js",

  "../core/render/assets.js",
  "../core/render/html.js",
  "../core/render/render-page.js",
  "../core/render/render-site.js",
  "../core/render/url.js",
  "../core/schema/site.schema.json",
  "../core/schema/validate.js",
  "../core/sections/index.js",
  "../core/sections/hero/define.js",
  "../core/sections/hero/render.js",
  "../core/sections/hero/style.css",
  "../core/sections/text/define.js",
  "../core/sections/text/render.js",
  "../core/sections/text/style.css",
  "../core/sections/image-text/define.js",
  "../core/sections/image-text/render.js",
  "../core/sections/image-text/style.css",
  "../core/sections/contact-social/define.js",
  "../core/sections/contact-social/render.js",
  "../core/sections/contact-social/style.css",
  "../core/sections/activity-cards/define.js",
  "../core/sections/activity-cards/render.js",
  "../core/sections/activity-cards/style.css",
  "../core/theme/tokens-to-css.js",
  "../core/theme/presets/quiet-mincho.json",
  "../core/theme/presets/warm-sunset.json",
  "../core/theme/presets/cool-mono.json",

  "../sites/teate1122/site.json",
  "../sites/teate1122/pages/home.json",
  "../sites/teate1122/pages/about.json",
  "../sites/teate1122/pages/activities.json",
  "../sites/teate1122/pages/contact.json",
  "../sites/teate1122/pages/privacy.json",
  "../sites/teate1122/assets/hero.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // ponytail: 一部ファイルの事前キャッシュが失敗してもインストール自体は継続する
        // （fetch時のcache-firstフォールバックが個別に補う）。
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
