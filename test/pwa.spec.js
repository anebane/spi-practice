#!/usr/bin/env node
/**
 * PWAの構成が壊れていないかの検査。
 *
 * Service Worker は「壊れても画面上は何も起きない」種類の仕組みで、
 * 気づいたときにはインストールできなくなっている。特に sw.js の
 * PRECACHE_URLS は1つでも404があると addAll ごと失敗して丸ごと入らない。
 * ファイルを消した・移動したときにCIで落とすのが目的。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const THEME = "#1a237e";
const { Coverage } = require("./helpers/coverage");
const cov = new Coverage();
const failures = [];
const fail = (f, rule, detail = "") => failures.push({ f, rule, detail });

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
/** URLパスを実ファイルへ。ディレクトリ表記は index.html に落とす */
const resolveUrl = (u) => {
  let rel = u.replace(/^\//, "").split("?")[0];
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  return path.join(ROOT, rel);
};
/** PNGのIHDRから実寸を読む（宣言サイズとの食い違いはインストール不可の原因になる） */
function pngSize(abs) {
  const b = fs.readFileSync(abs);
  if (b.length < 24 || b.toString("ascii", 12, 16) !== "IHDR") return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// ---- 1. manifest.json ----
let manifest = null;
try {
  manifest = JSON.parse(read("manifest.json"));
} catch (e) {
  fail("manifest.json", "JSONとして読めない", e.message);
}

if (manifest) {
  for (const k of ["id", "name", "short_name", "start_url", "scope", "display",
                   "background_color", "theme_color", "icons"]) {
    if (!manifest[k]) fail("manifest.json", "必須項目が無い", k);
  }
  if (manifest.theme_color !== THEME) {
    fail("manifest.json", "theme_colorがHTMLと不一致", `${manifest.theme_color} ≠ ${THEME}`);
  }
  if (manifest.display !== "standalone") {
    fail("manifest.json", "displayがstandaloneでない", manifest.display);
  }

  const icons = manifest.icons || [];
  const sizes = new Set();
  for (const ic of icons) {
    const abs = resolveUrl(ic.src);
    if (!fs.existsSync(abs)) { fail("manifest.json", "アイコンが存在しない", ic.src); continue; }
    const actual = pngSize(abs);
    const [w, h] = String(ic.sizes).split("x").map(Number);
    if (!actual) fail("manifest.json", "PNGとして読めない", ic.src);
    else if (actual.w !== w || actual.h !== h) {
      fail("manifest.json", "宣言サイズと実寸が違う", `${ic.src} 宣言${ic.sizes} 実際${actual.w}x${actual.h}`);
    }
    if ((ic.purpose || "any").includes("any")) sizes.add(String(ic.sizes));
  }
  // Chrome のインストール要件（192と512は必須）
  for (const need of ["192x192", "512x512"]) {
    if (!sizes.has(need)) fail("manifest.json", "purpose:any のアイコンが足りない", need);
  }
  if (!icons.some((ic) => (ic.purpose || "").includes("maskable"))) {
    fail("manifest.json", "maskableアイコンが無い", "Androidで白い余白付きになる");
  }
  // ショートカットの飛び先が消えていないか
  for (const sc of manifest.shortcuts || []) {
    if (!fs.existsSync(resolveUrl(sc.url))) fail("manifest.json", "shortcutのURLが存在しない", sc.url);
    for (const ic of sc.icons || []) {
      if (!fs.existsSync(resolveUrl(ic.src))) fail("manifest.json", "shortcutのアイコンが存在しない", ic.src);
    }
  }
}

// ---- 2. sw.js のプリキャッシュ対象が実在するか ----
const sw = read("sw.js");
const block = sw.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
if (!block) {
  fail("sw.js", "PRECACHE_URLS が見つからない", "");
} else {
  const urls = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (urls.length < 5) fail("sw.js", "PRECACHE_URLSが少なすぎる", `${urls.length}件`);
  for (const u of urls) {
    if (!fs.existsSync(resolveUrl(u))) fail("sw.js", "プリキャッシュ対象が存在しない", u);
  }
  // OFFLINE_URL は定数経由なので別途
  const off = sw.match(/const OFFLINE_URL = "([^"]+)"/);
  if (!off) fail("sw.js", "OFFLINE_URLが無い", "");
  else if (!fs.existsSync(resolveUrl(off[1]))) fail("sw.js", "オフラインページが存在しない", off[1]);
}

// ---- 3. 全ページにPWAのタグが入っているか ----
function collectPages(dir, base = "") {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (e.name.startsWith(".") || ["node_modules", "src", "test", "tools", "data", "reports", "icons"].includes(e.name)) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...collectPages(path.join(dir, e.name), rel));
    else if (e.name.endsWith(".html")) out.push(rel);
  }
  return out;
}
const pages = collectPages(".");
cov.covered("HTMLページ", pages.length, 5);
for (const p of pages) {
  const html = read(p);
  if (!/<link rel="manifest" href="\/manifest\.json">/.test(html)) fail(p, "manifestへのlinkが無い");
  if (!new RegExp(`<meta name="theme-color" content="${THEME}">`).test(html)) fail(p, "theme-colorが無い/色が違う");
  if (!/<link rel="apple-touch-icon"/.test(html)) fail(p, "apple-touch-iconが無い");
  if (!/<script src="\/pwa\.js"/.test(html)) fail(p, "pwa.jsを読み込んでいない");
}

// ---- 4. オフライン用ページを検索に出さない ----
const offlineHtml = read("offline.html");
if (!/name="robots" content="noindex/.test(offlineHtml)) {
  fail("offline.html", "noindexが無い", "中身の薄いページを検索に出すとサイト評価に響く");
}
if (/offline\.html/.test(read("sitemap.xml"))) {
  fail("sitemap.xml", "offline.htmlを登録している", "noindexページをサイトマップに入れない");
}

// ---- 5. 配信アセットを変えたのに sw.js の VERSION を上げていないか ----
//
// staleWhileRevalidate は caches.match(req) をキャッシュ名なしで呼ぶ。
// この形はキャッシュを作成順に検索するので、PRECACHE（install で最初に作られる）に
// 載っているURLは常に古い版が先に見つかる。裏で取った新しい版は RUNTIME に
// 入るだけで二度と読まれない。**VERSION を上げない限り永久に旧版が配られる。**
//
// 上げ忘れは画面上まったく無症状で、開発者の手元では（Service Worker を
// 登録していないので）正常に見える。気づくのは利用者から「直っていない」と
// 言われたときになる。機械で止める。
{
  const cp = require("child_process");
  const git = (args) => {
    const r = cp.spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
    return r.status === 0 ? (r.stdout || "").trim() : null;
  };

  const swSrc = read("sw.js");
  const blk = swSrc.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
  const offm = swSrc.match(/const OFFLINE_URL = "([^"]+)"/);
  const urls = blk ? [...blk[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
  if (offm) urls.push(offm[1]);
  cov.covered("プリキャッシュ対象のURL", urls.length, 5);

  // URL → リポジトリ内の相対パス。ディレクトリURLは index.html に落ちる。
  const assetPaths = [...new Set(urls.map((u) => {
    const abs = resolveUrl(u);
    return path.relative(ROOT, abs);
  }))].filter((p) => p && !p.startsWith(".."));

  const shallow = git(["rev-parse", "--is-shallow-repository"]);
  if (shallow === null) {
    cov.skipped("VERSIONの上げ忘れ検査", 1, "gitが使えない");
  } else if (shallow === "true") {
    // 浅いクローンだと履歴を遡れず、判定できない。黙って緑にすると
    // 「検査しているつもり」になるので、はっきり出す。
    fail("sw.js", "VERSION検査ができない", "浅いクローンです。CIでは actions/checkout に fetch-depth: 0 を指定してください");
  } else {
    // 作業ツリーに未コミットのアセット変更があるか
    const dirtyAssets = (git(["status", "--porcelain", "--"].concat(assetPaths)) || "")
      .split("\n").map((l) => l.replace(/^..\s+/, "").trim()).filter(Boolean);
    const versionTouchedNow = /^[+-]const VERSION = /m.test(git(["diff", "HEAD", "--", "sw.js"]) || "");

    if (versionTouchedNow) {
      // 作業ツリーで VERSION を上げている。これから入るコミットで解消されるので、
      // 過去の上げ忘れも含めて指摘しない。
    } else if (dirtyAssets.length) {
      fail("sw.js", "VERSIONを上げずに配信アセットを変更している",
        `${dirtyAssets.join(", ")} が未コミットで変更されています。VERSION を上げないと再訪問者に旧版が配られ続けます`);
    } else {
      // コミット済みの履歴で見る。
      // アセットを最後に変えたコミットが、VERSION を最後に変えたコミットより
      // 新しければ上げ忘れ。
      const cAssets = git(["log", "-1", "--format=%H", "--"].concat(assetPaths));
      // -S は出現回数の増減しか見ないので、値だけ変わる VERSION 行には効かない。-G を使う。
      const cVersion = git(["log", "-1", "--format=%H", "-G", "^const VERSION = ", "--", "sw.js"]);
      if (!cAssets) {
        cov.skipped("VERSIONの上げ忘れ検査", 1, "アセットの変更履歴が取れない");
      } else if (!cVersion) {
        fail("sw.js", "VERSIONを変更したコミットが履歴に無い", "検査が成立しません");
      } else {
        const ok = cp.spawnSync("git", ["merge-base", "--is-ancestor", cAssets, cVersion],
          { cwd: ROOT, encoding: "utf8" }).status === 0;
        if (!ok) {
          const when = git(["log", "-1", "--format=%h %ad %s", "--date=short", cAssets]);
          fail("sw.js", "VERSIONを上げずに配信アセットを変更したコミットがある",
            `${when} 以降 VERSION が据え置きです。再訪問者に旧版が配られ続けます`);
        }
      }
    }
  }
}

console.log(`PWA構成を検査（${pages.length}ページ / manifest / sw.js）`);
cov.print();
for (const p of cov.failures) fail("検査対象", p);
if (!failures.length) {
  console.log("✅ 問題なし");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const x of failures) console.log(`  [${x.f}] ${x.rule}${x.detail ? ": " + x.detail : ""}`);
}
process.exit(failures.length ? 1 : 0);
