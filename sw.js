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
// ⚠️⚠️ PRECACHE_URLS のファイルを1文字でも変えたら、必ずこの VERSION を上げること。
//
// 「2回目のアクセスで直る」わけではない。**永久に直らない。**
// staleWhileRevalidate は `caches.match(req)` をキャッシュ名を指定せずに呼ぶ。
// この形は**キャッシュを作成順に検索**する。PRECACHE は install で最初に作られ、
// RUNTIME はその後なので、プリキャッシュに載っているURLは常に PRECACHE の
// 古い版が先に見つかる。裏で取得した新しい版は RUNTIME に入るが、
// 二度と読まれない。
//
// つまり app.js / style.css / questions.js / generator.js / トップページは、
// VERSION を上げない限り再訪問者に旧版が配られ続ける。
// （プリキャッシュに無いファイルだけは RUNTIME が使われるので2回目で直る）
//
// 上げ忘れは test/pwa.spec.js が検出する。
// 以前ここには「2回目で直る」と書いてあったが誤りだった。
// 実際、2026-08-28 の開発中に app.js を直したのに反映されず、
// Service Worker を手で解除するまで旧版が配られ続けた。
const VERSION = "2026-08-29e";
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
