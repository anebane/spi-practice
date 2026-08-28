#!/usr/bin/env node
/**
 * 導線のE2E検査。
 *
 * 【なぜ必要か】
 * `/?cat=12`（語句の関係）が壊れていた。押すと非言語の模試が始まる状態で、
 * 例外も落ちも起きず画面は正常に見えるので、公開直前に偶然見つかるまで
 * 誰も気づかなかった。`/?cat=11`（四則逆算）も同じ理由で壊れていた。
 *
 * 「押した先が期待した状態になるか」を機械で見る検査が1つも無かった。
 *
 * 【2つの独立した経路】
 *   経路A … サイトのHTMLに書かれているリンク（?cat=N）
 *   経路B … その N を与えて app.js を実際に起動したときの出題
 * 片方だけでは「壊れていない」と言えない。突き合わせて初めて分かる。
 *
 * 【一方向であること】
 * 「HTMLにあるリンクは動く」は必須。
 * 「動くカテゴリにはリンクがある」は**要求しない**。
 * 四則逆算(11)と語句の関係(12)は、意図的にトップの出題分野の箱に載せて
 * いない（非言語の模擬試験に言語や玉手箱形式を混ぜないため）。
 *
 * リンクを増やしたら自動的に検査対象が増える。列挙はハードコードしない。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createHarness } = require("./helpers/app-harness");
const { Coverage } = require("./helpers/coverage");

const ROOT = path.join(__dirname, "..");
const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });
const cov = new Coverage();

// --- サイト内の全HTMLを集める（html.spec.js と同じ範囲） ---
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

// --- 経路A: HTMLに書かれている ?cat=N を全部拾う ---
const links = new Map();          // カテゴリID → 書かれているページ
for (const p of collectPages(".")) {
  const html = fs.readFileSync(path.join(ROOT, p), "utf8");
  for (const m of html.matchAll(/href="[^"]*[?&]cat=(\d+)[^"]*"/g)) {
    const id = parseInt(m[1], 10);
    if (!links.has(id)) links.set(id, []);
    if (links.get(id).indexOf(p) === -1) links.get(id).push(p);
  }
}

// --- 実在するカテゴリ（問題側の事実） ---
const ctx = vm.createContext({ console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite });
vm.runInContext(fs.readFileSync(path.join(ROOT, "questions.js"), "utf8"), ctx, { filename: "questions.js" });
const TEMPLATES = vm.runInContext("QUESTION_TEMPLATES", ctx);
const categoryName = (id) => {
  const t = TEMPLATES.find(x => x.categoryId === id);
  return t ? t.category : null;
};

// --- トップの出題分野チェックボックス（画面側の事実） ---
// ここをハードコードすると、箱を増減したときに検査が現実とずれる。
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
// 値だけでなくラベルも取る。app.js は案内文の分野名を「箱の親要素のテキスト」から
// 取るので、ラベルを渡さないと案内文が空になり誤検知する。
const gridMatch = indexHtml.match(/<div class="category-grid" id="category-select">([\s\S]*?)<\/div>/);
const visibleCategories = gridMatch
  ? [...gridMatch[1].matchAll(/<input type="checkbox" value="(\d+)"[^>]*><span>([^<]+)<\/span>/g)]
      .map(m => ({ value: parseInt(m[1], 10), label: m[2] }))
  : [];

// 対象が0件なら「リンクは全部正しい」ではなく「何も見ていない」。
// リンクを拾う正規表現を1つ間違えるだけで、この検査は静かに空になる。
cov.covered("?cat= のリンク", links.size, 1);
cov.covered("トップの出題分野の箱", visibleCategories.length, 5);

// --- 経路B: 実際に起動して出題を見る ---
for (const [id, pages] of [...links.entries()].sort((a, b) => a[0] - b[0])) {
  const where = pages.join(", ");
  const name = categoryName(id);

  if (!name) {
    fail("リンク先の分野が存在しない", `?cat=${id} （${where}）… その categoryId の問題が1問も無い`);
    continue;
  }

  let h;
  try {
    h = createHarness({ questionCount: 10, visibleCategories, search: `?cat=${id}` });
    h.start();
    for (let i = 0; i < 40 && !h.onResult(); i++) h.answerOne();
  } catch (e) {
    fail("起動できない", `?cat=${id}（${name} / ${where}）… 例外: ${e.message}`);
    continue;
  }

  // ① 実際に生成された問題が全部そのカテゴリか
  const got = [...new Set(h.events.filter(e => e.name === "question_answer").map(e => e.params.category))];
  if (got.length !== 1 || got[0] !== name) {
    fail("別の分野が出題される",
      `?cat=${id}（${name} / ${where}）… 出題: ${got.join("、") || "(出題なし)"}`);
  }

  // ② 何問か実際に出ているか（0問でも①は空配列で通ってしまう）
  const answered = h.count("question_answer");
  if (answered !== 10) {
    fail("問題数が合わない", `?cat=${id}（${name}）… 10問のはずが ${answered}問`);
  }

  // ③ 「この分野だけ出題する」案内が出るか
  const note = h.byId("category-param-note");
  if (note.style.display === "none" || String(note.textContent).indexOf(name) === -1) {
    fail("案内文が出ない",
      `?cat=${id}（${name} / ${where}）… 表示=${note.style.display === "none" ? "非表示" : "表示"} 本文=「${note.textContent}」`);
  }

  // ④ 計測が飛ぶか（分野別ページの効果を測る唯一の手がかり）
  const ev = h.find("category_practice_start");
  if (!ev || ev.params.category_id !== String(id)) {
    fail("category_practice_start が飛ばない",
      `?cat=${id}（${name}）… ${ev ? "category_id=" + ev.params.category_id : "イベントなし"}`);
  }
}

// --- 出力 ---
const list = [...links.entries()].sort((a, b) => a[0] - b[0])
  .map(([id, p]) => `cat=${id}(${categoryName(id) || "不明"})`).join(" / ");
console.log(`導線のE2E: ?cat= リンク ${links.size}種を実際に起動して検証`);
console.log(`   対象: ${list}`);
console.log(`   トップの出題分野の箱: ${visibleCategories.map(c => c.value).join(", ")}`);
cov.print();
for (const p of cov.failures) fail("検査対象", p);
if (!failures.length) {
  console.log("   ✅ すべて「その分野だけ」が出題され、案内文と計測も出る");
} else {
  console.log(`   ❌ ${failures.length}件`);
  for (const f of failures) console.log(`   - [${f.rule}] ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
