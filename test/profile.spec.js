// 出題プロファイルと、実体（index.html・categories/・テンプレート）の突き合わせ。
//
// ⚠️ なぜ要るか（2026-09-06）
// 分野の一覧は以前 index.html のチェックボックスと app.js の CATEGORY_PAGES に
// 二重に書かれていた。片方だけ直しても何も落ちないので、静かにずれる。
// src/questions/_profile.js に出所を1つにしたが、**宣言と実体がずれる余地は残る**。
// 宣言が実体と合っているかは、機械で突き合わせないと分からない。
//
// ⚠️ この検査が緑でも「分野の中身が正しい」は見ていない。並びの整合だけ。

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

// 検査対象が0件のまま緑になっていないかを見るための集計。
const cov = {
  counts: {}, failures: [],
  covered(name, n, min) {
    this.counts[name] = n;
    if (n < min) this.failures.push(`${name}: ${n}件（${min}件以上を見るはず）`);
  },
  print() {
    for (const [k, v] of Object.entries(this.counts)) console.log(`   ・検査対象 ${k}: ${v}件`);
  }
};

// --- プロファイルとテンプレートを読む ---
const ctx = { QUESTION_TEMPLATES: [], console, Math, Number, Array, Object, JSON, String };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "questions.js"), "utf8"), ctx);

const profiles = ctx.QUESTION_PROFILES;
if (!profiles || !profiles.spi) {
  console.log("出題プロファイルを検査");
  console.log("   ❌ QUESTION_PROFILES.spi が読めない。以降の検査が成立しない");
  process.exit(1);
}
const P = profiles.spi;
const all = P.examCategories.concat(P.extraCategories || []);

// --- 1. 宣言した分野が、テンプレートとして実在するか ---
{
  const byId = {};
  for (const q of ctx.QUESTION_TEMPLATES) byId[q.categoryId] = q.category;
  for (const c of all) {
    if (byId[c.id] === undefined) {
      fail("実在しない分野を宣言している", `${c.name}（id ${c.id}）のテンプレートが1本も無い`);
    } else if (byId[c.id] !== c.name) {
      // 名前がずれると CATEGORY_PAGES の引き当てが静かに外れる。
      fail("分野名がテンプレートと違う", `プロファイル「${c.name}」 / テンプレート「${byId[c.id]}」（id ${c.id}）`);
    }
  }
  cov.covered("宣言した分野", all.length, 12);
}

// --- 2. テンプレートにある分野が、プロファイルから漏れていないか ---
// 逆向きも見る。分野を足したのにプロファイルに書き忘れると、
// 出題も解説ページの導線も出ないまま静かに埋もれる。
{
  const declared = new Set(all.map(c => c.id));
  const inTemplates = new Set(ctx.QUESTION_TEMPLATES.map(q => q.categoryId));
  for (const id of inTemplates) {
    if (!declared.has(id)) {
      const name = ctx.QUESTION_TEMPLATES.find(q => q.categoryId === id).category;
      fail("プロファイルに載っていない分野がある", `${name}（id ${id}）。出題も導線も出ない`);
    }
  }
  cov.covered("テンプレートの分野", inTemplates.size, 12);
}

// --- 3. index.html のチェックボックスと、examCategories が一致するか ---
{
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const block = html.match(/id="category-select"([\s\S]*?)<\/div>/);
  if (!block) {
    fail("index.html の分野選択が見つからない", 'id="category-select" のブロックが無い');
    cov.covered("画面のチェックボックス", 0, 10);
  } else {
    const boxes = [...block[1].matchAll(/value="(\d+)"[^>]*><span>([^<]+)<\/span>/g)]
      .map(m => ({ id: Number(m[1]), name: m[2] }));
    const want = P.examCategories;

    for (const b of boxes) {
      const c = want.find(x => x.id === b.id);
      if (!c) fail("画面にあるがプロファイルに無い分野", `${b.name}（id ${b.id}）`);
      else if (c.name !== b.name) fail("画面とプロファイルで分野名が違う", `画面「${b.name}」 / 宣言「${c.name}」（id ${b.id}）`);
    }
    for (const c of want) {
      if (!boxes.find(b => b.id === c.id)) {
        fail("プロファイルにあるが画面に無い分野", `${c.name}（id ${c.id}）。模擬試験に出す宣言なのに選べない`);
      }
    }
    cov.covered("画面のチェックボックス", boxes.length, 10);
  }
}

// --- 4. slug が指す解説ページが実在するか ---
// 404へのリンクを出さないための検査。app.js の CATEGORY_PAGES は
// プロファイル由来になったので、ここがずれると全ページで導線が壊れる。
{
  let checked = 0;
  for (const c of all) {
    if (!c.slug) continue;
    checked++;
    const p = path.join(ROOT, "categories", c.slug, "index.html");
    if (!fs.existsSync(p)) {
      fail("解説ページが無い分野に導線を出している", `${c.name} → categories/${c.slug}/ が存在しない`);
    }
  }
  cov.covered("slug を調べた分野", checked, 12);
}

// --- 5. 逆向き: 存在する解説ページが、プロファイルから漏れていないか ---
{
  const dir = path.join(ROOT, "categories");
  const slugs = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
  const declared = new Set(all.map(c => c.slug).filter(Boolean));
  for (const s of slugs) {
    if (!declared.has(s)) {
      fail("プロファイルに載っていない解説ページがある", `categories/${s}/ を作ったのに導線が出ない`);
    }
  }
  cov.covered("実在する解説ページ", slugs.length, 12);
}

// --- 6. 問題数の選択肢が、画面と一致するか ---
{
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const block = html.match(/id="question-count"([\s\S]*?)<\/div>/);
  if (!block) {
    fail("index.html の問題数選択が見つからない", 'id="question-count" のブロックが無い');
    cov.covered("問題数の選択肢", 0, 2);
  } else {
    const vals = [...block[1].matchAll(/data-value="(\d+)"/g)].map(m => Number(m[1]));
    const want = P.questionCounts;
    if (JSON.stringify(vals) !== JSON.stringify(want)) {
      fail("問題数の選択肢が画面と違う", `画面 [${vals}] / 宣言 [${want}]`);
    }
    // 既定値が選択肢に無いと、画面の初期状態と宣言がずれる。
    if (!want.includes(P.defaultQuestionCount)) {
      fail("既定の問題数が選択肢に無い", `${P.defaultQuestionCount} が [${want}] に含まれない`);
    }
    const active = block[1].match(/class="config-btn active" data-value="(\d+)"/);
    if (active && Number(active[1]) !== P.defaultQuestionCount) {
      fail("画面の初期選択と既定値が違う", `画面 ${active[1]}問 / 宣言 ${P.defaultQuestionCount}問`);
    }
    cov.covered("問題数の選択肢", vals.length, 2);
  }
}

// --- 7. app.js がプロファイル由来の一覧を使っているか ---
// ⚠️ ここが無いと、app.js 側で CATEGORY_PAGES を空にしたり
//    自前の表に戻したりしても、この検査は何も言わない。
//    実際 2026-09-06 に「CATEGORY_PAGES を {} にする」変異が落ちなかった。
//    プロファイルを作っても、使われていなければ意味がない。
{
  const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  const m = app.match(/var CATEGORY_PAGES = ([^;]+);/);
  if (!m) {
    fail("app.js に CATEGORY_PAGES が無い", "解説ページへの導線を引く先が読めない");
  } else if (m[1].indexOf("profileCategoryPages") === -1) {
    fail("app.js がプロファイルを使っていない",
      `CATEGORY_PAGES = ${m[1].trim().slice(0, 40)} … 分野の一覧を二重に持つと静かにずれる`);
  } else {
    // 使っているだけでなく、中身が空でないことも見る。
    const pages = ctx.profileCategoryPages("spi");
    const n = Object.keys(pages || {}).length;
    if (n < all.filter(c => c.slug).length) {
      fail("引き当てた一覧が宣言より少ない", `${n}件 / 宣言 ${all.filter(c => c.slug).length}件`);
    }
  }
  cov.covered("app.js の引き当て", 1, 1);
}

// --- 出力 ---
console.log("出題プロファイルと実体の突き合わせを検査");
cov.print();
for (const p of cov.failures) failures.push({ rule: "検査対象", detail: p });
if (!failures.length) {
  console.log("✅ 問題なし");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const x of failures) console.log(`  ${x.rule}: ${x.detail}`);
}
process.exit(failures.length ? 1 : 0);
