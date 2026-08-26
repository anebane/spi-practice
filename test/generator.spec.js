#!/usr/bin/env node
/**
 * 問題ジェネレータの数学的正当性テスト。
 *
 * generator.js はテンプレートの変数を乱数で埋めて問題を作る。つまり
 * 「特定の乱数の組み合わせのときだけ破綻する」バグが混入しうる。
 * 実際に2026-03に「集合問題の変数範囲バグ」が本番で発生している。
 *
 * 各テンプレートを大量に生成して不変条件を検査することで、
 * AIが問題を自動追加しても壊れたまま公開されないようにする。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const ITERATIONS = parseInt(process.env.ITERATIONS || "300", 10);

// ブラウザ用のグローバル前提のスクリプトを1つのコンテキストで読み込む
const ctx = vm.createContext({ console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite });
for (const f of ["questions.js", "generator.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
}
const TEMPLATES = vm.runInContext("QUESTION_TEMPLATES", ctx);
const GEN = vm.runInContext("QuestionGenerator", ctx);

const VALID_FORMATS = ["webtesting", "testcenter"];

const failures = [];
function fail(tid, rule, detail) {
  failures.push({ tid, rule, detail });
}

/** 答えを数値に正規化する。answerType="fraction" は {numerator,denominator} 形式。 */
function parseAnswer(a) {
  if (typeof a === "number") return a;
  if (a && typeof a === "object" && "numerator" in a && "denominator" in a) {
    if (!Number.isFinite(a.numerator) || !Number.isFinite(a.denominator)) return NaN;
    if (a.denominator === 0) return Infinity;          // 0除算は別途バグとして検出
    return a.numerator / a.denominator;
  }
  if (typeof a === "string") {
    if (/^-?\d+(\.\d+)?$/.test(a.trim())) return parseFloat(a);
    const m = a.trim().match(/^(-?\d+)\s*\/\s*(\d+)$/);
    if (m) return parseInt(m[1], 10) / parseInt(m[2], 10);
  }
  return NaN;
}

/** 答えの一意キー。分数はオブジェクトなので String() だと全部同じになってしまう。 */
function answerKey(a) {
  if (a && typeof a === "object" && "numerator" in a) return a.numerator + "/" + a.denominator;
  return String(a);
}

/**
 * 負の値が原理的にありえない単位。
 * 「利益」は赤字でマイナスになりうるし、「変動・差」も符号付きが正解なので円・万円は含めない。
 * 誤検知を出すテストは信用されなくなるため、確実な場合だけ落とす。
 */
const NON_NEGATIVE_UNITS = ["人", "個", "通り", "km", "m", "分", "時間", "時速", "km/h", "g", "kg", "L"];

const seen = new Map();   // テンプレートごとの答えの分布（固定化の検出用）

for (const t of TEMPLATES) {
  // --- テンプレート定義そのものの検査（生成前） ---
  // formats はテストセンター対応を判断する唯一の情報源。宣言漏れを許すと
  // 「電卓不可・選択式」の環境に数値入力問題が混ざる事故になる。
  if (!Array.isArray(t.formats) || t.formats.length === 0) {
    fail(t.id, "formats未宣言", "対応形式を配列で宣言してください");
  } else {
    for (const f of t.formats) {
      if (VALID_FORMATS.indexOf(f) === -1) fail(t.id, "formatsに未知の値", f);
    }
    // テストセンターは選択式のみ。数値入力の問題を testcenter に含めてはいけない
    if (t.formats.indexOf("testcenter") !== -1 &&
        t.answerType !== "choice" && t.type !== "pattern") {
      fail(t.id, "testcenter非対応の回答形式", `answerType=${t.answerType} / type=${t.type}（テストセンターは選択式）`);
    }
  }
  if (!t.category || !t.categoryId) fail(t.id, "カテゴリ未設定", `${t.category}/${t.categoryId}`);
  if (![1, 2, 3].includes(t.difficulty)) fail(t.id, "難易度が1〜3でない", String(t.difficulty));

  const answers = new Set();
  for (let i = 0; i < ITERATIONS; i++) {
    let q;
    try {
      q = GEN.generateQuestion(t);
    } catch (e) {
      fail(t.id, "例外", `${e.message}`);
      break;
    }
    if (!q) { fail(t.id, "生成失敗", "generateQuestion が null を返した"); break; }

    // --- 不変条件 ---
    // 1. 変数が未展開のまま残っていないか
    if (/\{\{[^}]+\}\}/.test(q.text)) fail(t.id, "未展開の変数(問題文)", q.text.match(/\{\{[^}]+\}\}/)[0]);
    if (q.explanation && /\{\{[^}]+\}\}/.test(q.explanation))
      fail(t.id, "未展開の変数(解説)", q.explanation.match(/\{\{[^}]+\}\}/)[0]);

    // 2. 問題文・解説が空でないか
    if (!q.text || !q.text.trim()) fail(t.id, "問題文が空", "");
    if (q.explanation !== undefined && !String(q.explanation).trim()) fail(t.id, "解説が空", "");

    // 3. 答えが存在し、不正値でないか
    if (q.correctAnswer === undefined || q.correctAnswer === null) {
      fail(t.id, "答えなし", String(q.correctAnswer));
    } else if (q.answerType === "choice" || t.type === "pattern") {
      // 選択式は必ず choices を持たなければならない。
      // distractors が誤答を作れず choices が null のまま出ると、
      // 回答できない問題が本番に出る。
      if (!Array.isArray(q.choices)) fail(t.id, "選択式なのにchoicesが無い", String(q.choices));
      const n = Array.isArray(q.choices) ? q.choices.length : 0;
      if (n < 2) fail(t.id, "選択肢が不足", `${n}個`);
      if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer >= n)
        fail(t.id, "正解indexが範囲外", `index=${q.correctAnswer} / 選択肢${n}個`);
      if (Array.isArray(q.choices) && new Set(q.choices.map(String)).size !== n)
        fail(t.id, "選択肢が重複", JSON.stringify(q.choices));
    } else {
      const v = parseAnswer(q.correctAnswer);
      const isFrac = q.correctAnswer && typeof q.correctAnswer === "object" && "numerator" in q.correctAnswer;
      if (isFrac && q.correctAnswer.denominator === 0) {
        fail(t.id, "分母が0", JSON.stringify(q.correctAnswer));
      } else if (!isFinite(v)) {
        fail(t.id, "答えが数値でない", JSON.stringify(q.correctAnswer));
      } else {
        // 4. 原理的に負になりえない単位が負（人数・個数・距離・時間など）
        //    利益(円)は赤字、差・変動は符号付きが正解なので対象外
        if (v < 0 && NON_NEGATIVE_UNITS.indexOf(q.unit) !== -1)
          fail(t.id, "ありえない負の値", `${q.correctAnswer}${q.unit}`);
        // 5. 確率は 0〜1 の範囲でなければならない
        if (q.answerType === "fraction" && (v < 0 || v > 1))
          fail(t.id, "確率が0〜1の外", `${answerKey(q.correctAnswer)} = ${v}`);
        // 6. 濃度は 0〜100% （割合は108%等がありうるので対象外）
        if (/濃度/.test(q.category) && q.unit === "%" && (v < 0 || v > 100))
          fail(t.id, "濃度が0〜100%の外", `${q.correctAnswer}%`);
        // 7. 約分されていない分数（3/6 のような答えは不正解扱いされうる）
        if (isFrac) {
          const g = (a, b) => b ? g(b, a % b) : a;
          const d = g(Math.abs(q.correctAnswer.numerator), Math.abs(q.correctAnswer.denominator));
          if (d > 1) fail(t.id, "分数が約分されていない", answerKey(q.correctAnswer));
        }
      }
    }

    // 6. 問題文中に不正な数値表現が出ていないか（NaN, undefined, Infinity）
    if (/NaN|undefined|Infinity/.test(q.text)) fail(t.id, "問題文に不正値", q.text.match(/NaN|undefined|Infinity/)[0]);
    if (q.explanation && /NaN|undefined|Infinity/.test(String(q.explanation)))
      fail(t.id, "解説に不正値", String(q.explanation).match(/NaN|undefined|Infinity/)[0]);

    // 7. 制限時間が妥当か
    if (!(q.timeLimitSec > 0)) fail(t.id, "制限時間が不正", String(q.timeLimitSec));

    answers.add(answerKey(q.correctAnswer));
  }
  seen.set(t.id, { n: answers.size, cat: t.category, type: t.type });
}

// --- 出力 ---
const byRule = {};
for (const f of failures) (byRule[f.rule] ||= []).push(f);

console.log(`テンプレート ${TEMPLATES.length}件 x ${ITERATIONS}回 = ${(TEMPLATES.length * ITERATIONS).toLocaleString()}問を検証\n`);

if (failures.length === 0) {
  console.log("✅ 全テンプレートが全ての不変条件を満たしました");
} else {
  const badTemplates = new Set(failures.map(f => f.tid));
  console.log(`❌ ${badTemplates.size}件のテンプレートで ${failures.length}件の違反\n`);
  for (const [rule, list] of Object.entries(byRule)) {
    const ids = [...new Set(list.map(f => f.tid))];
    console.log(`【${rule}】 ${list.length}件 / テンプレート${ids.length}種`);
    for (const id of ids.slice(0, 8)) {
      const ex = list.find(f => f.tid === id);
      console.log(`   - ${id}: ${ex.detail.slice(0, 90)}`);
    }
    if (ids.length > 8) console.log(`   ...他${ids.length - 8}種`);
    console.log("");
  }
}

// 答えが1種類しか出ないテンプレート = ランダム生成が効いていない
const fixed = [...seen.entries()].filter(([, v]) => v.n === 1 && v.type !== "pattern");
if (fixed.length) {
  console.log(`⚠️ 答えが常に同じテンプレート ${fixed.length}件（ランダム化が効いていない可能性）`);
  for (const [id, v] of fixed.slice(0, 10)) console.log(`   - ${id} (${v.cat}/${v.type})`);
}

// 終了コードはファイル末尾でまとめて決める。ここで exit すると
// 以降に追記したテストが実行されない（実際に見落としが起きた）。
if (failures.length) process.exitCode = 1;

// --- 試験セットが指定どおりの問題数を返すか ---
// 生成失敗でpushされないと「20問」指定なのに19問になる無言の不具合が起きる。
{
  let shortfall = 0, runs = 300;
  for (let i = 0; i < runs; i++) {
    for (const n of [10, 20, 30]) {
      const set = GEN.generateExamSet({ totalQuestions: n, selectedCategories: [], selectedDifficulties: [1, 2, 3] });
      if (set.length !== n || set.some(q => !q)) shortfall++;
    }
  }
  console.log(`\n試験セット ${runs * 3}回: 出題数の過不足 ${shortfall}件`);
  if (shortfall) process.exitCode = 1;
}

// --- 選択式問題で、正解の「大きさの順位」が偏っていないか ---
// 誤答が片側に寄ると「常に最大を選ぶ」「両端を避ける」だけで正解できてしまい、
// 速度を測るテストとして成立しなくなる。新しい選択式問題を追加したときに
// 壊れやすい性質なので機械的に守る。
{
  const choiceTemplates = TEMPLATES.filter(t => t.distractors);
  let biased = [];
  for (const t of choiceTemplates) {
    const rank = [0, 0, 0, 0];
    let n = 0;
    for (let i = 0; i < 2000; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.choices) continue;
      const nums = q.choices.map(Number);
      if (nums.some(isNaN)) continue;
      const a = nums[q.correctAnswer];
      rank[nums.slice().sort((x, y) => x - y).indexOf(a)]++;
      n++;
    }
    if (!n) continue;
    const worst = Math.max(...rank) / n * 100;
    if (worst > 35) biased.push(`${t.id}: 最頻の順位が ${worst.toFixed(0)}%（一様なら25%）`);
  }
  console.log(`\n選択式 ${choiceTemplates.length}種の正解位置の偏り: ${biased.length ? "❌" : "✅ なし"}`);
  for (const b of biased) console.log("   - " + b);
  if (biased.length) process.exitCode = 1;
}


// --- 多様性: 各テンプレートが何種類の問題を作れるか ---
//
// なぜ必要か: 既存の検査は「1問1問が壊れていないか」しか見ていない。
// そのため「テンプレートは13個あるが、実際には33種類しか作れない」という
// 欠陥が半年間検出されなかった（推論は type:"pattern" の固定プールで、
// 変数を埋める真のランダム生成ではない）。テンプレート数を数えても分からない。
//
// 利用者に見える形での影響は、分野を絞って解いたときの重複として出る。
// 全分野デフォルトでは10分野に分散するので露出しないが、分野別ページは
// まさに「その分野だけ練習」へ誘導するので、そこで表面化する。
//
// 測る単位は「利用者が別の問題と認識するもの」にする。問題文だけで数えると
// chart 型を過小評価する（グラフはCanvas描画で問題文に含まれず、
// chartConfig と答えだけが変わるため。実際 chart_bar_01 は問題文1種類だが
// 中身は800種類ある）。
{
  // 目標は1テンプレあたり50種類。ただし現時点で未達が29件あり、
  // 全部を今日中には直せない。閾値50のままだとCIが赤で鳴り続け、
  // 失敗メールが無視されるようになって本物の異常を見逃す。
  //
  // そこで「全体の閾値を下げる」のではなく、現在値をテンプレートIDごとに
  // ベースラインとして記録し、落とすのは次の2つだけにする。
  //   ① 新しく追加されたテンプレートが目標50に届いていない
  //   ② 既存のテンプレートがベースラインを下回った（＝退行）
  // こうすれば「どこが未達か」は常に見えたまま、悪化と新規だけを検出できる。
  //
  // ベースラインは test/diversity-baseline.json。改善したら値を更新する
  // （UPDATE_BASELINE=1 で再生成できる）。
  const DIVERSITY_TARGET = 50;
  const TOLERANCE = 0.8;   // 実測の振れ幅は最大1.3%。20%見ておけば誤検知しない
  const SAMPLES = 400;
  const BASELINE_PATH = path.join(__dirname, "diversity-baseline.json");

  const variantKey = (q) => [
    q.text,
    q.chartConfig ? JSON.stringify(q.chartConfig) : "",
    q.choices ? q.choices.join("|") : "",
    answerKey(q.correctAnswer)
  ].join("##");

  const rows = [];
  for (const t of TEMPLATES) {
    const set = new Set();
    for (let i = 0; i < SAMPLES; i++) {
      const q = GEN.generateQuestion(t);
      if (q) set.add(variantKey(q));
    }
    rows.push({ id: t.id, cat: t.category, n: set.size, capped: set.size >= SAMPLES });
  }

  if (process.env.UPDATE_BASELINE) {
    const out = {};
    for (const r of rows.slice().sort((a, b) => a.id.localeCompare(b.id))) out[r.id] = r.n;
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(`\nベースラインを更新: ${BASELINE_PATH}`);
  }

  let baseline = {};
  try { baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")); }
  catch (e) { console.log("\n⚠️ ベースラインが読めません。UPDATE_BASELINE=1 で作成してください。"); }

  const byCat = {};
  for (const r of rows) (byCat[r.cat] ||= []).push(r);

  console.log(`\n問題の多様性（各テンプレート ${SAMPLES} 回生成・目標 ${DIVERSITY_TARGET}種類/テンプレ）`);
  const cats = Object.entries(byCat)
    .map(([cat, v]) => ({
      cat, n: v.length,
      sum: v.reduce((a, b) => a + b.n, 0),
      min: Math.min(...v.map(x => x.n)),
      short: v.filter(x => x.n < DIVERSITY_TARGET).length,
      capped: v.some(x => x.capped)
    }))
    .sort((a, b) => a.sum / a.n - b.sum / b.n);
  for (const c of cats) {
    const avg = c.sum / c.n;
    const mark = c.short ? ` ← 目標未達 ${c.short}件`
               : c.capped ? " （試行上限に到達＝実際はこれ以上）" : "";
    console.log(`   ${c.cat.padEnd(12)} ${String(c.n).padStart(2)}テンプレ  計${String(c.sum).padStart(5)}種  平均${avg.toFixed(1).padStart(6)}  最小${String(c.min).padStart(4)}${mark}`);
  }

  const newBelow = [], regressed = [], improved = [];
  for (const r of rows) {
    const base = baseline[r.id];
    if (base === undefined) {
      if (r.n < DIVERSITY_TARGET) newBelow.push(r);
    } else {
      if (r.n < Math.floor(base * TOLERANCE)) regressed.push({ ...r, base });
      else if (r.n > base * 1.5 && base < DIVERSITY_TARGET) improved.push({ ...r, base });
    }
  }

  const totalShort = rows.filter(r => r.n < DIVERSITY_TARGET).length;
  console.log(`\n   目標(${DIVERSITY_TARGET}種類)未満: ${totalShort} / ${rows.length} テンプレート（既知の宿題）`);

  if (improved.length) {
    console.log(`   📈 改善したテンプレート ${improved.length}件（UPDATE_BASELINE=1 で記録を更新してください）`);
    for (const r of improved.slice(0, 5)) console.log(`      - ${r.id}: ${r.base} → ${r.n}`);
  }

  if (newBelow.length || regressed.length) {
    if (newBelow.length) {
      console.log(`\n❌ 新規テンプレートが目標 ${DIVERSITY_TARGET} 種類に未達 ${newBelow.length}件`);
      for (const r of newBelow) console.log(`   - ${r.id} (${r.cat}): ${r.n}種類`);
    }
    if (regressed.length) {
      console.log(`\n❌ ベースラインから退行 ${regressed.length}件`);
      for (const r of regressed) console.log(`   - ${r.id}: ${r.base} → ${r.n}`);
    }
    process.exitCode = 1;
  } else {
    console.log("   ✅ 新規テンプレートの未達なし・既存テンプレートの退行なし");
  }

}


// --- 順序推論: 条件から導かれる解がちょうど1通りか ---
//
// 変数化で最も危険なのがここ。条件の組み合わせ次第で順序が一意に定まらない
// 問題が生まれ、「正解が2つある問題」になる。固定パターンでは人間が
// 保証していた部分なので、生成にした以上は機械で保証する必要がある。
//
// 生成器の内部実装を信用せず、出来上がった問題文をパースして数え直す。
{
  const ordered = TEMPLATES.filter(t => /^suiron_order_/.test(t.id));
  const permutations = (a) => {
    if (a.length <= 1) return [a];
    const out = [];
    a.forEach((x, i) => {
      permutations(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => out.push([x, ...p]));
    });
    return out;
  };

  let checked = 0, zero = 0, multi = 0, mismatch = 0, unparsed = 0;
  for (const t of ordered) {
    for (let i = 0; i < 400; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.choices) continue;
      const names = q.choices;
      const lines = q.text.split("\n").filter(l => l.startsWith("・"));
      const conds = lines
        .map(l => { const m = l.slice(1).match(/^(.+?)は(.+?)より/); return m ? [m[1], m[2]] : null; })
        .filter(Boolean);
      if (conds.length !== lines.length || !conds.length) { unparsed++; continue; }

      const sols = permutations(names).filter(p => {
        const pos = {};
        p.forEach((n, k) => { pos[n] = k; });
        return conds.every(([a, b]) => pos[a] < pos[b]);
      });
      checked++;
      if (sols.length === 0) zero++;
      else if (sols.length > 1) multi++;
      else {
        const askLine = q.text.split("\n").pop();
        let idx = null;
        if (/先頭|1位|最も点数が高い|最も背が高い/.test(askLine)) idx = 0;
        else if (/最後尾|最下位|最も点数が低い|最も背が低い/.test(askLine)) idx = names.length - 1;
        else { const m = askLine.match(/(\d+)/); if (m) idx = parseInt(m[1], 10) - 1; }
        if (idx !== null && sols[0][idx] !== names[q.correctAnswer]) mismatch++;
      }
    }
  }

  console.log(`\n順序推論の解の一意性: ${checked.toLocaleString()}問を総当たりで検証`);
  const bad = zero + multi + mismatch + unparsed;
  if (bad === 0) {
    console.log("   ✅ すべて解がちょうど1通り、答えも一致");
  } else {
    console.log(`   ❌ 解なし ${zero} / 解が複数 ${multi} / 答え不一致 ${mismatch} / パース不能 ${unparsed}`);
    process.exitCode = 1;
  }
}


// --- 生成された日本語が壊れていないか ---
//
// 既存の不変条件（未展開変数・答えの存在・選択肢の重複）は、文法や論理が
// 壊れていても素通りする。実際に目視で3件見つかった:
//   「Pはコーヒー選んでいない」        助詞が抜けている
//   「甲は福岡を住んでいるていない」    活用が二重になっている
//   「駅前を通るならば駅前を通らない」  自己矛盾で誤答が機能していない
//
// 多様性を上げるほど、こうした破綻が出る面が増える。目視に頼ると必ず漏れるので
// 機械で落とす。ルールは「生成物に対して確実に言えること」だけに絞り、
// 誤検知でテストが無視されるようになる事態を避ける。
{
  const SAMPLES = 300;

  // ルールA: 活用の二重化。「住んでいる」+「ていない」のような連結ミス。
  const BROKEN_CONJUGATION = [
    /(て|で)いる(て|で)いない/,
    /(て|で)いる(て|で)いる/,
    /していしない/,
    /ないない/,
    /(まし|ませ)んない/
  ];

  // ルールB: 目的語の助詞。「〜を飼っていない」「〜も選んでいない」のように、
  // 他動詞の否定で終わる条件文には必ず目的語の助詞が要る。
  //
  // 対象を「他動詞の否定で終わる行」に限定しているのは誤検知を避けるため。
  // 最初は「・で始まる全行に助詞を要求」にしたところ、
  // 「・Aの発言:「Bは嘘つきだ」」のような別の文型を誤って落とした。
  // 誤検知を出すルールは無視されるようになり、結果として本物を見逃す。
  const TRANSITIVE_NEGATIVE = /(ていない|でいない|しない)$/;
  const OBJECT_PARTICLE = /[をもがに]/;

  // ルールC: 「AならばB」で A と B が同じ述語の肯定と否定＝自己矛盾。
  //          内容を読まなくても誤りと分かるので選択肢として機能しない。
  const stripNegation = (t) => t
    .replace(/ではない$/, "").replace(/ないない$/, "")
    .replace(/でない$/, "").replace(/ない$/, "")
    .replace(/なかった$/, "").replace(/ません$/, "")
    .replace(/だ$/, "").trim();

  const problems = [];
  const note = (tid, rule, sample) => {
    if (problems.length < 40) problems.push({ tid, rule, sample: sample.slice(0, 60) });
  };

  for (const t of TEMPLATES) {
    for (let i = 0; i < SAMPLES; i++) {
      const q = GEN.generateQuestion(t);
      if (!q) continue;
      const all = [q.text, String(q.explanation || "")].concat(q.choices || []);

      for (const text of all) {
        for (const re of BROKEN_CONJUGATION) {
          if (re.test(text)) { note(t.id, "活用の二重化", text.match(re)[0] + " … " + text); break; }
        }
      }

      // 条件文（・で始まる行）のうち、他動詞の否定で終わるものだけを見る
      for (const line of q.text.split("\n")) {
        if (!line.startsWith("・")) continue;
        if (!TRANSITIVE_NEGATIVE.test(line)) continue;
        const body = line.slice(1).replace(/^.+?は/, "");   // 「Xは」を落とした残り
        if (!OBJECT_PARTICLE.test(body)) note(t.id, "目的語の助詞が無い", line);
      }

      // 自己矛盾
      for (const ch of (q.choices || [])) {
        const parts = String(ch).split("ならば");
        if (parts.length !== 2) continue;
        if (stripNegation(parts[0]) === stripNegation(parts[1])) {
          note(t.id, "自己矛盾の選択肢", ch);
        }
      }
    }
  }

  console.log(`\n生成文の健全性: ${TEMPLATES.length}テンプレ x ${SAMPLES}回`);
  if (!problems.length) {
    console.log("   ✅ 活用の二重化・助詞の欠落・自己矛盾のいずれも検出されず");
  } else {
    const byRule = {};
    for (const p of problems) (byRule[p.rule] ||= []).push(p);
    console.log(`   ❌ ${problems.length}件`);
    for (const [rule, list] of Object.entries(byRule)) {
      const ids = [...new Set(list.map(x => x.tid))];
      console.log(`   【${rule}】 ${ids.join(", ")}`);
      console.log(`      例: ${list[0].sample}`);
    }
    process.exitCode = 1;
  }
}


// --- 嘘つき問題: 整合する仮定がちょうど1通りか ---
// 発言の組み合わせ次第で「特定できない」「矛盾して解が無い」問題が生まれる。
// 順序推論と同じく、生成器を信用せず問題文をパースして判定し直す。
{
  const t = TEMPLATES.find(x => x.id === "suiron_statement_01");
  let checked = 0, zero = 0, multi = 0, mismatch = 0;
  if (t) {
    for (let i = 0; i < 600; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.choices) continue;
      const names = q.choices;
      const stmts = q.text.split("\n").filter(l => l.startsWith("・")).map(l => {
        const m = l.match(/^・(.+?)の発言:「(.+?)は嘘つき(だ|ではない)」$/);
        return m ? { by: m[1], about: m[2], claimsLiar: m[3] === "だ" } : null;
      }).filter(Boolean);
      if (stmts.length !== names.length) continue;

      const ok = names.filter(cand => stmts.every(st => {
        const speakerLiar = st.by === cand;
        const truthful = (st.claimsLiar === (st.about === cand));
        return speakerLiar ? !truthful : truthful;
      }));
      checked++;
      if (ok.length === 0) zero++;
      else if (ok.length > 1) multi++;
      else if (ok[0] !== names[q.correctAnswer]) mismatch++;
    }
  }
  console.log(`\n嘘つき問題の一意性: ${checked}問を全パターンで検証`);
  if (zero + multi + mismatch === 0) {
    console.log("   ✅ すべて整合する仮定がちょうど1通り、答えも一致");
  } else {
    console.log(`   ❌ 解なし ${zero} / 複数 ${multi} / 答え不一致 ${mismatch}`);
    process.exitCode = 1;
  }
}

process.exit(process.exitCode ? 1 : 0);
