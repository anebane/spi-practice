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
const { Coverage } = require("./helpers/coverage");
const cov = new Coverage();

const pages = collectPages(".");
// 検査対象が0件だと「壊れているものが無い」ではなく「何も見ていない」。
// collectPages の除外条件を1つ書き間違えるだけで起こる。
cov.covered("HTMLページ", pages.length, 5);
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
    // クエリ文字列(?cat=1)は同じページへのパラメータ付きリンクなので取り除く
    let t = m[1].split("#")[0].split("?")[0];
    if (!t) continue;
    const abs = t.startsWith("/")
      ? path.join(ROOT, t.slice(1))
      : path.join(ROOT, dir === "." ? "" : dir, t);
    const ok = fs.existsSync(abs) ||
               (t.endsWith("/") && fs.existsSync(path.join(abs, "index.html"))) ||
               (t === "/" );
    if (!ok) fail(p, "リンク先が存在しない", m[1]);
  }

  // 5. 広告リンクがHTMLに直書きされていないか
  //    直書きすると PR表記が漏れる。景表法（ステマ規制）の要件であると同時に、
  //    広告主が「広告表示がない場合、提携を解除する可能性」と明記した
  //    提携維持の条件でもある。リンクは affiliate.js の PROGRAMS だけに置き、
  //    PR表記を必ず伴う render() 経由でしか出せないようにする。
  //    ASPごとにドメインが違う。A8だけを見ていると、他のASPの素材を
  //    直書きする経路が開いたままになる（アクセストレードで実際に空いていた）。
  //    ASPを増やしたらここに足す。
  for (const m of html.matchAll(/(px\.a8\.net|www\d*\.a8\.net|a8mat=|h\.accesstrade\.net|accesstrade\.net\/sp\/(?:cc|rr))/g)) {
    fail(p, "広告リンクの直書き", `${m[1]} … affiliate.js の render() 経由で出してください`);
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

// 7. 出題分野のチェックボックスが、実在するカテゴリと一致しているか
//
// 分野の追加・付け替えのときに揃える箇所が複数ある（テンプレート定義と
// index.html のチェックボックス）。片方だけ直すと、選んでも1問も出ない
// 分野ができたり、分野別成績の名前だけ古いまま残ったりする。
// どちらも例外にならず、画面上も一見それらしく見えるので気づけない。
//
// チェックボックスは「出題される分野の一部」でよい（四則逆算と語句の関係は
// 別ページ扱いで意図的に載せていない）ので、検査は一方向にする＝
// 載っているものが実在し、名前が一致していること。
{
  const vm = require("vm");
  const ctx = vm.createContext({ console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite });
  vm.runInContext(fs.readFileSync(path.join(ROOT, "questions.js"), "utf8"), ctx, { filename: "questions.js" });
  const templates = vm.runInContext("QUESTION_TEMPLATES", ctx);

  const nameById = new Map();
  for (const t of templates) nameById.set(String(t.categoryId), t.category);

  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const block = html.match(/<div class="category-grid" id="category-select">([\s\S]*?)<\/div>/);
  if (!block) {
    fail("index.html", "出題分野の選択欄が見つからない", "category-select");
  } else {
    const boxes = [...block[1].matchAll(/<input type="checkbox" value="(\d+)"[^>]*><span>([^<]+)<\/span>/g)];
    if (!boxes.length) fail("index.html", "出題分野のチェックボックスが0件", "");
    for (const [, id, label] of boxes) {
      if (!nameById.has(id)) {
        fail("index.html", "存在しない分野が選択欄にある", `value=${id} (${label}) … その categoryId の問題が1問も無い`);
      } else if (nameById.get(id) !== label) {
        fail("index.html", "分野名がテンプレートと不一致", `value=${id}: 画面「${label}」 ≠ 問題側「${nameById.get(id)}」`);
      }
    }

    // 「対応分野」の静的な控えが、チェックボックスとずれていないか。
    // ここは JS が埋め直すが、JS が動かない利用者にはこの静的な中身が見える。
    // 「10分野」と書きながら11分野を出題していたのは、同じ事実を2箇所に
    // 手で書いていたため。控えを置くなら、一致していることを機械的に確かめる。
    const listed = html.match(/<div class="categories-list" id="categories-list">([^<]*)<\/div>/);
    if (!listed) {
      fail("index.html", "対応分野の一覧が見つからない", "categories-list");
    } else {
      const shown = listed[1].split("/").map(s => s.trim()).filter(Boolean);
      const want = boxes.map(b => b[2]);
      if (shown.join("|") !== want.join("|")) {
        fail("index.html", "対応分野の一覧がチェックボックスと不一致",
          `一覧「${shown.join(" / ")}」 ≠ 選択欄「${want.join(" / ")}」`);
      }
    }

    // 分野の数を手で書いていないか。書くと分野を足したときにずれる
    //（「10分野」と書きながら11分野を出題していた）。
    //
    // 見るのは画面の本文だけ。head の title / meta は対象外にしている。
    // さらに、構造化データと同じ文が本文に出ている箇所も対象外にする。
    // FAQ の回答は JSON-LD と本文が一致していることが要件で、本文だけ直すと
    // 不整合になる。「片方だけ直せない対（つい）」は、この検査が扱う話ではない。
    const jsonld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map(m => m[1]).join("\n").replace(/\s+/g, "");
    const bodyText = (html.match(/<body[\s\S]*<\/body>/) || [""])[0]
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<[^>]+>/g, "");
    for (const sentence of bodyText.split(/[。\n]/)) {
      if (!/\d+\s*分野/.test(sentence)) continue;
      const packed = sentence.replace(/\s+/g, "");
      if (packed.length > 10 && jsonld.includes(packed)) continue;   // 構造化データと対
      fail("index.html", "分野の数が本文に手書きされている",
        `「${sentence.trim().slice(0, 40)}」… チェックボックスの数から算出してください（app.js の fillCategorySummary）`);
    }
  }
}

// --- AdSense の審査用スニペットが全ページの <head> に入っているか ---
// 審査はサイト単位なので、1ページでも欠けると「コードが見つかりません」で
// 弾かれる。手で貼ると必ず漏れるので機械的に守る。新しいページを足したとき
// これが落ちれば、貼り忘れたまま公開することはない。
{
  const PUB = "ca-pub-5409685648363967";
  for (const p of pages) {
    const html = fs.readFileSync(path.join(ROOT, p), "utf8");
    const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/);
    if (!head) { fail(p, "head が見つからない", ""); continue; }
    if (!head[1].includes(PUB)) {
      fail(p, "AdSenseスニペットが head に無い", `${PUB} を含む <script> が必要`);
    }
  }
}

console.log(`HTML ${pages.length}ページを検査`);
cov.print();
for (const p of cov.failures) failures.push({ f: "検査対象", rule: p, detail: "" });
if (!failures.length) {
  console.log("✅ 問題なし");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const x of failures) console.log(`  [${x.f}] ${x.rule}: ${x.detail}`);
}
process.exit(failures.length ? 1 : 0);
