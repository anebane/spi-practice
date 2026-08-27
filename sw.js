/**
 * 適性検査無限ドリル — Service Worker
 *
 * 方針:
 *  - ページ(HTML)は「ネットワーク優先」。常に最新を出し、繋がらないときだけキャッシュに落ちる。
 *    記事や問題を更新したその日に読者へ届く必要があるので、キャッシュ優先にはしない。
 *  - CSS/JS/画像は stale-while-revalidate（キャッシュを即返しつつ裏で更新）。
 *  - 問題は generator.js がクライアント側で生成するので、この app shell さえ入れば
 *    オフラインでも無限に出題できる。これがこのサイトをPWAにする最大の理由。
 *  - Googlebot は Service Worker を実行しないので、この仕組みは検索評価に影響しない。
 *
 * ⚠️ PRECACHE_URLS は test/pwa.spec.js が実在チェックしている。
 *    1つでも 404 があると addAll ごと失敗してインストールされないため。
 */
// ⚠️ PR表記など景表法に関わる表示や、CSS/JSの見た目を変えたときは必ず上げること。
// 上げないと再訪問者に旧版が1回配られる（stale-while-revalidate のため2回目で直るが、
// 広告表示の要件を満たさない版が1回でも出るのは避ける）。
const VERSION = "2026-08-27b";
const PRECACHE = `precache-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/style.css",
  "/questions.js",
  "/generator.js",
  "/app.js",
  "/favicon.svg",
  "/manifest.json",
  OFFLINE_URL,
  "/tamatebako-shisoku/",
  "/tamatebako-shisoku/app.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== PRECACHE && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // 別オリジン（GA等）は一切触らない。計測を歪めないため。
  if (url.origin !== self.location.origin) return;
  // GSCの生データ等は配信物ではないので対象外
  if (url.pathname.startsWith("/data/")) return;

  if (req.mode === "navigate") {
    event.respondWith(networkFirstPage(req));
  } else {
    event.respondWith(staleWhileRevalidate(req));
  }
});

/** ページ: ネットワーク優先 → キャッシュ → オフライン用ページ */
async function networkFirstPage(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    // `/?cat=1` のようなクエリ付きは ignoreSearch で `/` のキャッシュに当てる
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

/** 静的アセット: キャッシュを即返し、裏で更新 */
async function staleWhileRevalidate(req) {
  const cached = await caches.match(req);
  const fetching = fetch(req)
    .then((res) => {
      if (res && res.ok && res.type === "basic") {
        caches.open(RUNTIME).then((cache) => cache.put(req, res.clone()));
      }
      return res;
    })
    .catch(() => cached || Response.error());
  return cached || fetching;
}
