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
const allProfiles = Object.keys(profiles).map(k => profiles[k]);

// ⚠️ **spi プロファイルの分野だけを見ると、公務員専用の分野が漏れる。**
//    2026-09-06に同じ取り違えを4回した（この spec の検査1・2・4・5と html.spec）。
//    分野を横断して見たいときは必ずこれを使う。spi 限定で見たい検査は
//    profiles.spi から直接取ること（いまは無い）。
const allCategories = [];
{
  const seen = new Set();
  for (const prof of allProfiles) {
    for (const c of prof.examCategories.concat(prof.extraCategories || [])) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      allCategories.push(c);
    }
  }
}
const all = allCategories;   // 既存の記述との互換。新しく書くなら allCategories を使う

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
  // ⚠️ spi だけを見ると、公務員だけの分野（整数の性質）を「載っていない」と
  //    誤判定する。2026-09-06に実際に踏んだ。どれか1つのプロファイルに
  //    載っていればよい。
  const declared = new Set();
  for (const prof of allProfiles) {
    for (const c of prof.examCategories.concat(prof.extraCategories || [])) declared.add(c.id);
  }
  const inTemplates = new Set(ctx.QUESTION_TEMPLATES.map(q => q.categoryId));
  for (const id of inTemplates) {
    if (!declared.has(id)) {
      const name = ctx.QUESTION_TEMPLATES.find(q => q.categoryId === id).category;
      fail("どのプロファイルにも載っていない分野がある", `${name}（id ${id}）。出題も導線も出ない`);
    }
  }
  cov.covered("テンプレートの分野", inTemplates.size, 12);
}

// --- 3. 画面のチェックボックスと、examCategories が一致するか ---
// page を持つプロファイルすべてを見る（/ と /koumuin/ など）。
{
for (const prof of allProfiles.filter(x => x.page)) {
  const rel = prof.page === "/" ? "index.html" : prof.page.replace(/^\/|\/$/g, "") + "/index.html";
  const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const block = html.match(/id="category-select"([\s\S]*?)<\/div>/);
  if (!block) {
    fail("index.html の分野選択が見つからない", 'id="category-select" のブロックが無い');
    cov.covered("画面のチェックボックス", 0, 10);
  } else {
    const boxes = [...block[1].matchAll(/value="(\d+)"[^>]*><span>([^<]+)<\/span>/g)]
      .map(m => ({ id: Number(m[1]), name: m[2] }));
    const want = prof.examCategories;

    for (const b of boxes) {
      const c = want.find(x => x.id === b.id);
      if (!c) fail("画面にあるがプロファイルに無い分野", `${rel}: ${b.name}（id ${b.id}）`);
      else if (c.name !== b.name) fail("画面とプロファイルで分野名が違う", `${rel}: 画面「${b.name}」 / 宣言「${c.name}」（id ${b.id}）`);
    }
    for (const c of want) {
      if (!boxes.find(b => b.id === c.id)) {
        fail("プロファイルにあるが画面に無い分野", `${rel}: ${c.name}（id ${c.id}）。模擬試験に出す宣言なのに選べない`);
      }
    }
    cov.covered("画面のチェックボックス（" + prof.id + "）", boxes.length, 10);
  }

  // --- 難易度のチェックボックスが、宣言した帯と一致するか ---
  // ⚠️ ここが最重要。画面が「易」を出していると、利用者が選べてしまい
  //    プロファイルの difficulties が**上書きされる**。
  //    2026-09-06に実際に踏んだ: /koumuin/ が難易度[2,3]を宣言しているのに
  //    画面は易/中/難を全部チェック済みで出していて、難易度1が出題されていた。
  //    宣言が静かに無効化され、SPIと同じ問題が出る状態だった。
  {
    const dblock = html.match(/id="difficulty-select"([\s\S]*?)<\/div>/);
    if (!dblock) {
      fail("画面の難易度選択が見つからない", `${rel}: id="difficulty-select" が無い`);
    } else {
      const vals = [...dblock[1].matchAll(/value="(\d+)"/g)].map(m => Number(m[1])).sort();
      const want = prof.difficulties.slice().sort();
      if (JSON.stringify(vals) !== JSON.stringify(want)) {
        fail("画面の難易度が宣言と違う",
          `${rel}: 画面 [${vals}] / 宣言 [${want}]。画面で選べる帯が宣言を上書きする`);
      }
      cov.covered("難易度の選択肢（" + prof.id + "）", vals.length, 2);
    }
  }
}
}

// --- 4. slug が指す解説ページが実在するか ---
// 404へのリンクを出さないための検査。app.js の CATEGORY_PAGES は
// プロファイル由来になったので、ここがずれると全ページで導線が壊れる。
{
  // ⚠️ 以前はここが `if (!c.slug) continue;` で終わっていた。
  //    「slug があるなら実在すること」しか見ておらず、
  //    **slug: null と書けば検査を素通りできた**。
  //    実際、整数の性質と操作と手順は「まだ作っていない」とコメントを書いたまま
  //    解説ページが無い状態で放置された（2026-09-06）。
  //    コメントは検査ではないので誰も催促しない。宿題は台帳に登録させる。
  const TODO = new Set(
    JSON.parse(fs.readFileSync(path.join(__dirname, "category-pages-todo.json"), "utf8"))
      .pending.map(x => x.id)
  );

  // ⚠️ `all` は spi プロファイルの分野だけ。公務員専用の分野（整数の性質・操作と手順）
  //    が漏れるので、全プロファイルの分野を id で重複排除して見る。
  //    今朝も同じ取り違えをして誤検知した（2026-09-06）。
  const everyCat = [];
  const seenId = new Set();
  for (const prof of allProfiles) {
    for (const c of prof.examCategories.concat(prof.extraCategories || [])) {
      if (seenId.has(c.id)) continue;
      seenId.add(c.id);
      everyCat.push(c);
    }
  }

  let checked = 0;
  for (const c of everyCat) {
    checked++;
    if (!c.slug) {
      if (!TODO.has(c.id)) {
        fail("解説ページを作らないまま分野を足している",
          `${c.name}（id ${c.id}）に slug が無い。作るなら categories/ にページを、`
          + `後回しにするなら理由を添えて test/category-pages-todo.json に登録すること`);
      }
      continue;
    }
    const p = path.join(ROOT, "categories", c.slug, "index.html");
    if (!fs.existsSync(p)) {
      fail("解説ページが無い分野に導線を出している", `${c.name} → categories/${c.slug}/ が存在しない`);
    }
  }

  // 台帳に載っているのに slug が付いた（＝ページを作った）ものは、台帳から消す。
  // 宿題台帳は縮む方向にのみ動かす。
  for (const id of TODO) {
    const c = everyCat.find(x => x.id === id);
    if (!c) {
      fail("宿題の台帳に存在しない分野が載っている", `id ${id}。分野を消したら台帳からも消すこと`);
    } else if (c.slug) {
      fail("宿題が済んでいるのに台帳に残っている",
        `${c.name}: slug「${c.slug}」が付いている。test/category-pages-todo.json から消すこと`);
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
  // ⚠️ `all` は spi プロファイルの分野だけ。公務員専用の分野が漏れる。
  //    2026-09-06に同じ取り違えを4回した（検査2・検査4・html.spec・ここ）。
  //    プロファイルが増えたら `all` ではなく全プロファイルを見る、が原則。
  const declared = new Set();
  for (const prof of allProfiles) {
    for (const c of prof.examCategories.concat(prof.extraCategories || [])) {
      if (c.slug) declared.add(c.slug);
    }
  }
  for (const s of slugs) {
    if (!declared.has(s)) {
      fail("プロファイルに載っていない解説ページがある", `categories/${s}/ を作ったのに導線が出ない`);
    }
  }
  cov.covered("実在する解説ページ", slugs.length, 12);
}

// --- 6. 問題数の選択肢が、画面と一致するか ---
{
for (const prof of allProfiles.filter(x => x.page)) {
  const rel = prof.page === "/" ? "index.html" : prof.page.replace(/^\/|\/$/g, "") + "/index.html";
  const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const block = html.match(/id="question-count"([\s\S]*?)<\/div>/);
  if (!block) {
    fail("index.html の問題数選択が見つからない", 'id="question-count" のブロックが無い');
    cov.covered("問題数の選択肢", 0, 2);
  } else {
    const vals = [...block[1].matchAll(/data-value="(\d+)"/g)].map(m => Number(m[1]));
    const want = prof.questionCounts;
    if (JSON.stringify(vals) !== JSON.stringify(want)) {
      fail("問題数の選択肢が画面と違う", `画面 [${vals}] / 宣言 [${want}]`);
    }
    // 既定値が選択肢に無いと、画面の初期状態と宣言がずれる。
    if (!want.includes(prof.defaultQuestionCount)) {
      fail("既定の問題数が選択肢に無い", `${rel}: ${prof.defaultQuestionCount} が [${want}] に含まれない`);
    }
    const active = block[1].match(/class="config-btn active" data-value="(\d+)"/);
    if (active && Number(active[1]) !== prof.defaultQuestionCount) {
      fail("画面の初期選択と既定値が違う", `${rel}: 画面 ${active[1]}問 / 宣言 ${prof.defaultQuestionCount}問`);
    }
    cov.covered("問題数の選択肢（" + prof.id + "）", vals.length, 2);
  }
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
    // ⚠️ ここは spi 限定で比べる。profileCategoryPages("spi") が返すのは
    //    spi プロファイルの分野だけなので、全プロファイルの合計と比べると
    //    公務員専用の分野のぶんだけ必ず少なくなり、誤検知する（実際にした）。
    const spiCats = P.examCategories.concat(P.extraCategories || []).filter(c => c.slug);
    const pages = ctx.profileCategoryPages("spi");
    const n = Object.keys(pages || {}).length;
    if (n < spiCats.length) {
      fail("引き当てた一覧が宣言より少ない", `${n}件 / spiの宣言 ${spiCats.length}件`);
    }
  }
  cov.covered("app.js の引き当て", 1, 1);
}

// --- 7b. 画面が自分のプロファイルを宣言しているか ---
// ⚠️ app.js は ACTIVE_PROFILE が無ければ "spi" にフォールバックする。
//    /koumuin/ で宣言を落とすと、見た目は公務員ページのままSPIの出題になる。
//    2026-09-06に変異で試したら、他のどの検査も捕まえられなかった。
//    分野や難易度の表示は画面側のHTMLなので、出題だけが静かに入れ替わる。
{
  let checked = 0;
  for (const prof of allProfiles.filter(x => x.page)) {
    const rel = prof.page === "/" ? "index.html" : prof.page.replace(/^\/|\/$/g, "") + "/index.html";
    const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
    checked++;

    // 既定は "spi"。/ は宣言しなくてよいが、それ以外は必須。
    const m = html.match(/(^|[^\/*\s])\s*var\s+ACTIVE_PROFILE\s*=\s*"([^"]+)"\s*;/m);
    if (prof.id === "spi") {
      if (m && m[2] !== "spi") {
        fail("トップページが別のプロファイルを宣言している", `${rel}: ACTIVE_PROFILE = "${m[2]}"`);
      }
    } else if (!m) {
      fail("画面がプロファイルを宣言していない",
        `${rel}: ACTIVE_PROFILE が無い。app.js は "spi" にフォールバックするので、見た目はそのままで出題だけSPIになる`);
    } else if (m[2] !== prof.id) {
      fail("画面が宣言しているプロファイルが違う", `${rel}: 宣言 "${m[2]}" / このページは "${prof.id}"`);
    }

    // 宣言の位置も見る。questions.js より前だと QUESTION_PROFILES がまだ無い。
    if (m) {
      // ⚠️ indexOf("app.js") ではコメント中の言及を拾う（実際に誤検知した）。
      //    読み込み順を見たいので <script src=...> の位置だけを取る。
      const at = (re) => { const m = html.match(re); return m ? m.index : -1; };
      const iQ = at(/<script[^>]+src="[^"]*questions\.js"/);
      const iP = html.indexOf("ACTIVE_PROFILE");
      const iA = at(/<script[^>]+src="[^"]*app\.js"/);
      if (iQ === -1 || iP < iQ) {
        fail("プロファイルの宣言が questions.js より前にある", `${rel}: 宣言時点で QUESTION_PROFILES が読めない`);
      }
      if (iA !== -1 && iP > iA) {
        fail("プロファイルの宣言が app.js より後にある", `${rel}: app.js が読む時点で未定義`);
      }
    }
  }
  cov.covered("プロファイル宣言を調べた画面", checked, 2);
}

// --- 8. どのプロファイルも、宣言した条件で試験を組めるか ---
// ⚠️ 宣言はできても、その難易度帯・分野構成でテンプレートが足りなければ
//    問題数がそろわない。「プロファイルを足したが実際には出題できない」を防ぐ。
{
  const gsrc = fs.readFileSync(path.join(ROOT, "generator.js"), "utf8");
  const gctx = Object.assign({}, ctx);
  vm.createContext(gctx);
  vm.runInContext(gsrc, gctx);
  const G = gctx.QuestionGenerator;

  let checked = 0;
  for (const prof of allProfiles) {
    checked++;
    const want = prof.defaultQuestionCount;
    const cfg = ctx.profileExamConfig(prof.id, { totalQuestions: want });
    if (!cfg) { fail("プロファイルの設定を作れない", prof.id); continue; }

    const seen = {};
    let short = 0;
    for (let i = 0; i < 20; i++) {
      const set = G.generateExamSet(cfg);
      if (set.length !== want) short++;
      for (const q of set) seen[q.difficulty] = (seen[q.difficulty] || 0) + 1;
    }
    if (short > 0) {
      fail("宣言した条件で問題数がそろわない",
        `${prof.id}: ${want}問に届かない回が20回中${short}回。分野か難易度の宣言に対してテンプレートが足りない`);
    }
    // 宣言した難易度帯の外が混ざっていないか（帯の宣言が効いていない証拠になる）
    for (const d of Object.keys(seen)) {
      if (prof.difficulties.indexOf(Number(d)) === -1) {
        fail("宣言していない難易度が出ている", `${prof.id}: 難易度${d} が ${seen[d]}問。difficulties の宣言が効いていない`);
      }
    }
    // 宣言した帯のうち、実際には1問も出ない帯があれば知らせる。
    // ⚠️ 落とさない。テンプレートが偏っているだけで、出題自体は成立するため。
    //    ただし黙っていると「難しい試験だ」と宣言しただけの状態に気づけない。
    const total = Object.values(seen).reduce((a, b) => a + b, 0);
    for (const d of prof.difficulties) {
      const n = seen[d] || 0;
      if (total > 0 && n / total < 0.1) {
        console.log(`   ℹ️ ${prof.id}: 宣言した難易度${d}が全体の${(n / total * 100).toFixed(1)}%しか出ていない（テンプレートが少ない）`);
      }
    }
  }
  cov.covered("試験を組めるか調べたプロファイル", checked, 2);
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
