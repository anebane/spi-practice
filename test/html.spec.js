#!/usr/bin/env node
/**
 * 公開HTMLの健全性チェック。
 * 記事をAIが自動追加していく前提なので、リンク切れ・メタ情報の欠落・
 * 旧ドメインの混入を機械的に落とせるようにしておく。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://tekisei-drill.com";
/** ルートと articles/ 以下の HTML を再帰的に集める（node_modules等は除外） */
function collectPages(dir, base = "") {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "src"
        || e.name === "test" || e.name === "tools" || e.name === "data" || e.name === "reports") continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...collectPages(path.join(dir, e.name), rel));
    else if (e.name.endsWith(".html")) out.push(rel);
  }
  return out;
}
const pages = collectPages(".");
const failures = [];
const fail = (f, rule, detail) => failures.push({ f, rule, detail });

for (const p of pages) {
  const html = fs.readFileSync(path.join(ROOT, p), "utf8");

  // 1. 旧ドメインの残骸（移行後に混入すると301が二重になり評価が分散する）
  if (/anebane\.github\.io/.test(html)) fail(p, "旧ドメインが残っている", "anebane.github.io");

  // 2. 必須メタ
  if (!/<title>[^<]{5,}<\/title>/.test(html)) fail(p, "titleが無い/短い", "");
  if (!/name="description" content="[^"]{20,}"/.test(html)) fail(p, "descriptionが無い/短い", "");
  if (!/rel="canonical" href="https:\/\//.test(html)) fail(p, "canonicalが無い", "");

  // 3. canonical が自分自身を指しているか（コピペ時の典型的な事故）
  const c = html.match(/rel="canonical" href="([^"]+)"/);
  if (c) {
    // index.html はディレクトリURLで正規化する（/ と /articles/）
    const expect = SITE + "/" + p.replace(/(^|\/)index\.html$/, "$1");
    if (c[1] !== expect) fail(p, "canonicalが自分を指していない", `${c[1]} ≠ ${expect}`);
  }

  // 4. 内部リンクの参照先が存在するか（絶対パスと相対パスの両方）
  const dir = path.dirname(p);
  for (const m of html.matchAll(/href="(?!https?:|#|mailto:)([^"]+)"/g)) {
    let t = m[1].split("#")[0];
    if (!t) continue;
    const abs = t.startsWith("/")
      ? path.join(ROOT, t.slice(1))
      : path.join(ROOT, dir === "." ? "" : dir, t);
    const ok = fs.existsSync(abs) ||
               (t.endsWith("/") && fs.existsSync(path.join(abs, "index.html"))) ||
               (t === "/" );
    if (!ok) fail(p, "リンク先が存在しない", m[1]);
  }

  // 5. 未展開のテンプレート変数
  if (/\{\{[^}]+\}\}/.test(html)) fail(p, "未展開の変数", html.match(/\{\{[^}]+\}\}/)[0]);
}

// 6. sitemap に載せた URL が実在するか
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  let rel = m[1].replace(SITE, "").replace(/^\//, "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  if (!fs.existsSync(path.join(ROOT, rel))) fail("sitemap.xml", "存在しないURLを登録", m[1]);
}

console.log(`HTML ${pages.length}ページを検査`);
if (!failures.length) {
  console.log("✅ 問題なし");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const x of failures) console.log(`  [${x.f}] ${x.rule}: ${x.detail}`);
}
process.exit(failures.length ? 1 : 0);
