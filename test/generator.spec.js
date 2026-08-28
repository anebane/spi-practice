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
const { Coverage } = require("./helpers/coverage");
const cov = new Coverage();

const TEMPLATES = vm.runInContext("QUESTION_TEMPLATES", ctx);
// テンプレートが取れていなければ、以降の検査はすべて空回りする。
// 「壊れているものが無い」と「何も見ていない」を取り違えないための最初の一線。
cov.covered("問題テンプレート", TEMPLATES.length, 50);
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
  // distractors を持つもの＝数値の選択肢に加え、選択肢に大小の順序がある
  // テンプレートも対象にする。順序の読み取り方はテンプレートが rankOf で示す
  // （例: リーグ戦の「2勝1敗」は勝ち数が大小の順序になる）。
  // 人名や語句のように順序が無い選択肢は、そもそも「大きさ順位」が定義できない
  // ので対象外のまま。
  const choiceTemplates = TEMPLATES.filter(t => t.distractors || t.rankOf);
  let biased = [];
  for (const t of choiceTemplates) {
    // 選択肢が4つとは限らない。長さ4の配列で数えると、5択のときに
    // rank[4] が undefined++ で NaN になり、NaN > 35 が常に false になって
    // **そのテンプレートの検査が丸ごと無効化される**（実際にそうなっていた）。
    const rank = [];
    let n = 0, maxLen = 0;
    for (let i = 0; i < 2000; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.choices) continue;
      const nums = q.choices.map(x => t.rankOf ? t.rankOf(x) : Number(x));
      if (nums.some(isNaN)) continue;
      const a = nums[q.correctAnswer];
      const idx = nums.slice().sort((x, y) => x - y).indexOf(a);
      rank[idx] = (rank[idx] || 0) + 1;
      maxLen = Math.max(maxLen, q.choices.length);
      n++;
    }
    if (!n) continue;
    const counts = [];
    for (let k = 0; k < Math.max(maxLen, rank.length); k++) counts.push(rank[k] || 0);
    const worst = Math.max(...counts) / n * 100;
    const even = (100 / maxLen).toFixed(0);
    if (worst > 35) biased.push(`${t.id}: 最頻の順位が ${worst.toFixed(0)}%（${maxLen}択なので一様なら${even}%）`);
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

  cov.covered("順序推論の一意性で検証した問題", checked, 100);
  console.log(`\n順序推論の解の一意性: ${checked.toLocaleString()}問を総当たりで検証`);
  // checked が0だと「1問も検証していない」のに緑になる。
  // 生成が全滅したり、問題文の書式が変わってパースできなくなったときに、
  // 静かに合格してしまう。他のセクションと同じく0件を失敗にする。
  const bad = zero + multi + mismatch + unparsed;
  if (checked && bad === 0) {
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
  let checked = 0, zero = 0, multi = 0, mismatch = 0, unparsed = 0;
  if (t) {
    for (let i = 0; i < 600; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.choices) continue;
      const names = q.choices;
      const stmts = q.text.split("\n").filter(l => l.startsWith("・")).map(l => {
        const m = l.match(/^・(.+?)の発言:「(.+?)は嘘つき(だ|ではない)」$/);
        return m ? { by: m[1], about: m[2], claimsLiar: m[3] === "だ" } : null;
      }).filter(Boolean);
      // 発言の書式が変わると全件ここで落ちる。無言で continue すると
      // 1問も検証しないまま緑になるので、数えて失敗にする。
      if (stmts.length !== names.length) { unparsed++; continue; }

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
  cov.covered("嘘つき問題の一意性で検証した問題", checked, 100);
  console.log(`\n嘘つき問題の一意性: ${checked}問を全パターンで検証`);
  if (checked && zero + multi + mismatch + unparsed === 0) {
    console.log("   ✅ すべて整合する仮定がちょうど1通り、答えも一致");
  } else {
    console.log(`   ❌ 解なし ${zero} / 複数 ${multi} / 答え不一致 ${mismatch} / パース不能 ${unparsed} / 検証数 ${checked}`);
    process.exitCode = 1;
  }
}

// --- 条件からの絞り込み: 「考えられるものは何通りか」が正しいか ---
//
// 順序推論・嘘つき問題と同じ方針で、生成器の内部状態は一切見ない。
// 問題文から場面・名前・条件・問い先を読み直し、1〜5 の全順列(120通り)を
// 総当たりして候補の個数を数え、選択肢の正解と一致するかを確かめる。
{
  const SCENE_PARSERS = [
    {
      name: "箱",
      setup: /^箱(.+?) の5つの箱に、/,
      split: "、箱",
      gt: /^・箱(.+?)のカードの番号は箱(.+?)より大きい$/,
      eq: /^・箱(.+?)のカードの番号は(\d+)である$/,
      ask: /^箱(.+?)のカードの番号として考えられるものは何通りあるか。$/
    },
    {
      name: "順位",
      setup: /^(.+?) の5人が徒競走をし、/,
      split: "、",
      // 「順位が下」＝内部の値が大きい
      gt: /^・(.+?)は(.+?)より順位が下だった$/,
      eq: /^・(.+?)は(\d+)位だった$/,
      ask: /^(.+?)の順位として考えられるものは何通りあるか。$/
    },
    {
      name: "札",
      setup: /^(.+?) の5人が、1から5までの番号が書かれた札を/,
      split: "、",
      gt: /^・(.+?)の札の番号は(.+?)より大きい$/,
      eq: /^・(.+?)の札の番号は(\d+)である$/,
      ask: /^(.+?)の札の番号として考えられるものは何通りあるか。$/
    },
    {
      name: "得点",
      setup: /^(.+?) の5人がゲームをし、/,
      split: "、",
      gt: /^・(.+?)の得点は(.+?)より高い$/,
      eq: /^・(.+?)の得点は(\d+)点である$/,
      ask: /^(.+?)の得点として考えられるものは何通りあるか。$/
    }
  ];

  // 1〜5 の全順列
  const PERMS5 = (() => {
    const out = [];
    const rec = (cur, rest) => {
      if (!rest.length) { out.push(cur); return; }
      rest.forEach((x, i) => rec(cur.concat(x), rest.slice(0, i).concat(rest.slice(i + 1))));
    };
    rec([], [1, 2, 3, 4, 5]);
    return out;
  })();

  const t = TEMPLATES.find(x => x.id === "suiron_cond_01");
  let checked = 0, unparsed = 0, zero = 0, mismatch = 0;
  if (t) {
    for (let i = 0; i < 600; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.choices) continue;
      const lines = q.text.split("\n");
      const sc = SCENE_PARSERS.find(s => s.setup.test(lines[0]));
      if (!sc) { unparsed++; continue; }

      const names = lines[0].match(sc.setup)[1].split(sc.split);
      const condLines = lines.filter(l => l.startsWith("・"));
      const askLine = lines[lines.length - 1];

      const conds = [];
      let broken = false;
      for (const l of condLines) {
        const g = l.match(sc.gt), e = l.match(sc.eq);
        if (g) conds.push({ kind: "gt", a: names.indexOf(g[1]), b: names.indexOf(g[2]) });
        else if (e) conds.push({ kind: "eq", a: names.indexOf(e[1]), k: parseInt(e[2], 10) });
        else broken = true;
      }
      const am = askLine.match(sc.ask);
      if (broken || !conds.length || !am || names.length !== 5) { unparsed++; continue; }
      const ask = names.indexOf(am[1]);
      if (ask < 0 || conds.some(c => c.a < 0 || (c.kind === "gt" && c.b < 0))) { unparsed++; continue; }

      const sols = PERMS5.filter(p => conds.every(c =>
        c.kind === "gt" ? p[c.a] > p[c.b] : p[c.a] === c.k));
      checked++;
      if (!sols.length) { zero++; continue; }
      const vals = new Set(sols.map(p => p[ask]));
      // 選択肢は「1つ」〜「4つ」。正解indexの+1が候補の個数と一致するはず
      const declared = parseInt(String(q.choices[q.correctAnswer]).replace("通り", ""), 10);
      if (vals.size !== declared) mismatch++;
    }
  }
  cov.covered("条件からの絞り込みで検証した問題", checked, 100);
  console.log(`\n条件からの絞り込みの検証: ${checked}問を全順列で数え直し`);
  if (checked && zero + mismatch + unparsed === 0) {
    console.log("   ✅ すべて候補の個数が選択肢の正解と一致");
  } else {
    console.log(`   ❌ 解なし ${zero} / 個数不一致 ${mismatch} / パース不能 ${unparsed} / 検証数 ${checked}`);
    process.exitCode = 1;
  }
}


// --- 真偽判定: 「確実に正しい」選択肢がちょうど1つか ---
//
// ここは数え上げではなく含意の問題なので、小さなモデルを総当たりして判定する。
// 前提「S に属する者は全員 A」「p は A」を満たす世界をすべて作り、
// 各選択肢がそのすべてで成り立つか（＝確実に言えるか）を調べる。
// 生成器が「対偶が正解」と思っていること自体を疑うために、
// どの形が正解かはハードコードせずモデル検査で決める。
{
  const TF_SCENES = vm.runInContext("TF_SCENES", ctx);

  // 個体3人（うち1人が問題文の p）について S/A の真偽をすべて割り当てる
  const MODELS = [];
  for (let m = 0; m < 64; m++) {
    const ind = [0, 1, 2].map(i => ({ S: !!(m >> (i * 2) & 1), A: !!(m >> (i * 2 + 1) & 1) }));
    if (!ind.every(x => !x.S || x.A)) continue;   // 前提1: S ⊆ A
    if (!ind[0].A) continue;                       // 前提2: p は A
    MODELS.push(ind);
  }
  const FORMS = {
    // 対偶: ¬A ならば ¬S
    CONTRA:      (ind) => ind.every(x => x.A || !x.S),
    // 逆(全称): A ならば S
    CONV_ALL:    (ind) => ind.every(x => !x.A || x.S),
    // 裏: ¬S ならば ¬A
    INVERSE:     (ind) => ind.every(x => x.S || !x.A),
    // 逆を個別に当てはめたもの
    P_IN_S:      (ind) => ind[0].S,
    P_NOT_IN_S:  (ind) => !ind[0].S
  };
  const entailed = {};
  for (const k of Object.keys(FORMS)) entailed[k] = MODELS.every(FORMS[k]);

  const t = TEMPLATES.find(x => x.id === "suiron_tf_01");
  let checked = 0, unknown = 0, notOne = 0, mismatch = 0, noScene = 0;
  if (t) {
    for (let i = 0; i < 600; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.choices) continue;
      const lines = q.text.split("\n").filter(l => l.startsWith("・"));
      const pm = lines[0] && lines[0].match(/^・(.+?)は全員、(.+)$/);
      const fm = lines[1] && lines[1].match(/^・(.+?)は(.+)$/);
      if (!pm || !fm) { noScene++; continue; }
      const sc = TF_SCENES.find(s => s.subNoun === pm[1] && s.attrAff === pm[2]);
      if (!sc || fm[2] !== sc.attrAff) { noScene++; continue; }
      const person = fm[1];

      const kinds = q.choices.map(ch => {
        if (ch === sc.attrNegPred + sc.member + "は" + sc.subNegPred) return "CONTRA";
        if (ch === sc.attrAff + sc.member + "は全員" + sc.subAff) return "CONV_ALL";
        if (ch === sc.notSubNoun + "は" + sc.attrNegPred) return "INVERSE";
        if (ch === person + "は" + sc.subAff) return "P_IN_S";
        if (ch === person + "は" + sc.subNegPred) return "P_NOT_IN_S";
        return null;
      });
      checked++;
      if (kinds.some(k => k === null)) { unknown++; continue; }
      const ok = kinds.map((k, idx) => entailed[k] ? idx : -1).filter(idx => idx >= 0);
      if (ok.length !== 1) notOne++;
      else if (ok[0] !== q.correctAnswer) mismatch++;
    }
  }
  cov.covered("真偽判定で検証した問題", checked, 100);
  console.log(`\n真偽判定の含意検証: ${checked}問をモデル総当たり(${MODELS.length}世界)で判定`);
  if (checked && unknown + notOne + mismatch + noScene === 0) {
    console.log("   ✅ 確実に言える選択肢が常にちょうど1つで、正解と一致");
  } else {
    console.log(`   ❌ 形が不明な選択肢 ${unknown} / 正解が1つでない ${notOne} / 正解不一致 ${mismatch} / 素材不明 ${noScene} / 検証数 ${checked}`);
    process.exitCode = 1;
  }
}


// --- 数列: 示した数列から読める規則が1つに定まるか ---
//
// この分野の事故は「答えが2通りに読める」こと。生成器も同じ検査を持っているが、
// そこにバグがあれば素通りするので、ここでは規則の当てはめを独立に書き直し、
// 問題文に印字された数列だけから予測値を求める。
{
  const nextCandidates = (s) => {
    const n = s.length, out = [];
    const add = v => { if (Number.isInteger(v) && !out.includes(v)) out.push(v); };
    const d = s.map((x, i) => i ? x - s[i - 1] : null).slice(1);

    if (d.every(x => x === d[0])) add(s[n - 1] + d[0]);                        // 等差
    const r = s[0] !== 0 ? s[1] / s[0] : NaN;
    if (r !== 1 && s.every((x, i) => i === 0 || (s[i - 1] !== 0 && x / s[i - 1] === r)))
      add(s[n - 1] * r);                                                        // 等比
    const dd = d[1] - d[0];
    if (d.every((x, i) => i === 0 || x - d[i - 1] === dd))
      add(s[n - 1] + d[d.length - 1] + dd);                                     // 差が等差
    if (s.every((x, i) => i < 2 || x === s[i - 1] + s[i - 2]))
      add(s[n - 1] + s[n - 2]);                                                 // フィボナッチ型
    if (d[0] !== 0) {                                                           // m倍して c を足す
      const m = (s[2] - s[1]) / (s[1] - s[0]);
      if (Number.isInteger(m) && Math.abs(m) >= 2 && Math.abs(m) <= 5) {
        const c = s[1] - s[0] * m;
        if (s.every((x, i) => i === 0 || x === s[i - 1] * m + c)) add(s[n - 1] * m + c);
      }
    }
    return out;
  };

  const t = TEMPLATES.find(x => x.id === "suiron_code_01");
  let checked = 0, unparsed = 0, ambiguous = 0, none = 0, mismatch = 0, badChoice = 0;
  if (t) {
    for (let i = 0; i < 600; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.choices) continue;
      const line = q.text.split("\n").find(l => /^[\d,\s]+, \?$/.test(l));
      if (!line) { unparsed++; continue; }
      const s = line.replace(/,\s*\?$/, "").split(",").map(x => parseInt(x.trim(), 10));
      if (s.length < 5 || s.some(isNaN)) { unparsed++; continue; }
      checked++;

      const nums = q.choices.map(Number);
      if (nums.some(v => !Number.isInteger(v) || v <= 0)) badChoice++;

      const cands = nextCandidates(s);
      if (cands.length === 0) none++;
      else if (cands.length > 1) ambiguous++;
      else if (cands[0] !== nums[q.correctAnswer]) mismatch++;
    }
  }
  cov.covered("数列の規則で検証した問題", checked, 100);
  console.log(`\n数列の規則の一意性: ${checked}問を規則の当てはめで再判定`);
  if (checked && unparsed + ambiguous + none + mismatch + badChoice === 0) {
    console.log("   ✅ すべて読める規則が1つ、予測値も正解と一致（選択肢はすべて正の整数）");
  } else {
    console.log(`   ❌ パース不能 ${unparsed} / 規則が複数 ${ambiguous} / 規則なし ${none} / 予測不一致 ${mismatch} / 不正な選択肢 ${badChoice} / 検証数 ${checked}`);
    process.exitCode = 1;
  }
}


// --- 語ペア辞書の不変条件: 1ペアは1関係にしか属さない ---
//
// 言語分野で「正解がちょうど1つ」を機械的に保証しているのは、この一点だけ。
// 非言語は答えが数学的に一意だったが、言語は誤答が偶然正解になりうる。
// 「はさみ:切る」を用途として出したとき、誤答に「ペン:書く」を置けば
// それも用途なので正解が2つになる。生成側の工夫では防げないので、
// 辞書の作り方で防ぐ。ここが崩れた瞬間に全ての言語問題が信用できなくなる。
//
// 語順を入れ替えただけのペア（A:B と B:A）も同一とみなす。
// 「需要:供給」と「供給:需要」が別の関係に入っていたら、やはり破綻する。
{
  const WORD_PAIRS = vm.runInContext("WORD_PAIRS", ctx);
  const WORD_RELATIONS = vm.runInContext("WORD_RELATIONS", ctx);
  const rels = Object.keys(WORD_PAIRS);

  const problems = [];
  const owner = new Map();      // 正規化キー → 最初に見つけた関係

  for (const rel of rels) {
    const pairs = WORD_PAIRS[rel];
    if (!Array.isArray(pairs) || pairs.length < 4) {
      problems.push(`関係「${rel}」のペアが少なすぎる: ${pairs && pairs.length}`);
      continue;
    }
    for (const p of pairs) {
      if (!Array.isArray(p) || p.length !== 2 || p.some(w => typeof w !== "string" || !w.trim())) {
        problems.push(`関係「${rel}」に不正なペア: ${JSON.stringify(p)}`);
        continue;
      }
      if (p[0] === p[1]) problems.push(`関係「${rel}」に同語のペア: ${JSON.stringify(p)}`);
      for (const key of [p.join(" "), p.slice().sort().join(" ")]) {
        if (owner.has(key) && owner.get(key) !== rel) {
          problems.push(`「${p.join(" : ")}」が「${owner.get(key)}」と「${rel}」の両方に属している`);
        }
        owner.set(key, rel);
      }
    }
  }

  // 関係の説明（WORD_RELATIONS）と辞書のキーが食い違うと、
  // 解説だけ別の関係を語る問題ができる。
  const declared = WORD_RELATIONS.map(r => r.key).sort().join(",");
  if (declared !== rels.slice().sort().join(",")) {
    problems.push(`WORD_RELATIONS と WORD_PAIRS のキーが不一致: ${declared} / ${rels.join(",")}`);
  }

  const total = rels.reduce((a, r) => a + WORD_PAIRS[r].length, 0);
  console.log(`\n語ペア辞書の不変条件: ${rels.length}関係 / ${total}ペア`);
  // 語単位の重複も落とす。
  //
  // ペアが違えば関係も違うので正解の一意性は壊れないが、「職業:教師」と
  // 「教師:生徒」が同じ問題に並ぶと読み手が混乱する。
  // 以前はここを警告にとどめ、生成物を600問サンプリングして同居を探していたが、
  // 衝突語が1つしか無い状態では当たらない回のほうが多く（実測で5回中3回が素通り）、
  // 見逃しが常態化していた。辞書は静的なので確率に頼る必要がない。
  // 全ペアを走査して1語でも重複したら落とす＝検出率100%。
  {
    const relOfWord = new Map();
    for (const rel of rels) {
      for (const p of WORD_PAIRS[rel] || []) {
        for (const w of (Array.isArray(p) ? p : [])) {
          if (relOfWord.has(w) && relOfWord.get(w) !== rel) {
            problems.push(`語「${w}」が「${relOfWord.get(w)}」と「${rel}」の両方に登場している`);
          } else {
            relOfWord.set(w, rel);
          }
        }
      }
    }
    console.log(`   異なり語 ${relOfWord.size}語（${total * 2}スロット）`);
  }

  if (!problems.length) {
    console.log("   ✅ 同じペア・同じ語が2つ以上の関係に現れていない（語順違いも含む）");
  } else {
    console.log(`   ❌ ${problems.length}件`);
    for (const p of problems.slice(0, 10)) console.log("   - " + p);
    process.exitCode = 1;
  }
}


// --- 語句の関係: 例示と同じ関係の選択肢がちょうど1つか ---
//
// 生成器が何を正解のつもりで作ったかは見ない。問題文と選択肢に出ている
// 語ペアを辞書から引き直し、関係が一致する選択肢を数える。
// 1問の中で同じ語が二度出ていないかも同時に見る（「職業:教師」と
// 「教師:生徒」が並ぶと、正解は壊れないが読み手が混乱する）。
{
  const WORD_PAIRS = vm.runInContext("WORD_PAIRS", ctx);
  const relOfPair = new Map();
  for (const rel of Object.keys(WORD_PAIRS)) {
    for (const p of WORD_PAIRS[rel]) relOfPair.set(p.join(" : "), rel);
  }
  const relOf = (text) => relOfPair.get(String(text).trim());

  let checked = 0, unknown = 0, notOne = 0, mismatch = 0, dupWord = 0;

  const t1 = TEMPLATES.find(x => x.id === "gengo_relation_01");
  if (t1) {
    for (let i = 0; i < 600; i++) {
      const q = GEN.generateQuestion(t1);
      if (!q || !q.choices) continue;
      const exLine = q.text.split("\n").filter(Boolean).pop();
      const exRel = relOf(exLine);
      const chRels = q.choices.map(relOf);
      checked++;
      if (!exRel || chRels.some(r => !r)) { unknown++; continue; }

      const hits = chRels.map((r, idx) => r === exRel ? idx : -1).filter(idx => idx >= 0);
      if (hits.length !== 1) notOne++;
      else if (hits[0] !== q.correctAnswer) mismatch++;
    }
  }

  let checked2 = 0, unknown2 = 0, notOne2 = 0, mismatch2 = 0, dupWord2 = 0;
  const t2 = TEMPLATES.find(x => x.id === "gengo_relation_02");
  if (t2) {
    for (let i = 0; i < 600; i++) {
      const q = GEN.generateQuestion(t2);
      if (!q || !q.choices) continue;
      const chRels = q.choices.map(relOf);
      checked2++;
      if (chRels.some(r => !r)) { unknown2++; continue; }

      // 「他と異なるもの」は、その関係が1つしか無い選択肢
      const count = {};
      for (const r of chRels) count[r] = (count[r] || 0) + 1;
      const odd = chRels.map((r, idx) => count[r] === 1 ? idx : -1).filter(idx => idx >= 0);
      if (odd.length !== 1) notOne2++;
      else if (odd[0] !== q.correctAnswer) mismatch2++;
    }
  }

  console.log(`\n語句の関係の一意性: 同じ関係を選ぶ ${checked}問 / 仲間はずれ ${checked2}問を辞書から引き直して検証`);
  const bad = unknown + notOne + mismatch + unknown2 + notOne2 + mismatch2;
  if (checked && checked2 && bad === 0) {
    console.log("   ✅ 該当する選択肢が常にちょうど1つで、正解と一致");
  } else {
    console.log(`   ❌ [同じ関係] 辞書に無いペア ${unknown} / 該当が1つでない ${notOne} / 正解不一致 ${mismatch}`);
    console.log(`      [仲間はずれ] 辞書に無いペア ${unknown2} / 外れが1つでない ${notOne2} / 正解不一致 ${mismatch2}`);
    process.exitCode = 1;
  }
}


// --- 同居ガードの単体テスト ---
//
// 「同じ語を含むペアを1問に並べない」ガードは、辞書が綺麗なうちは
// 出番が無く、生成物をいくらサンプリングしても働いている証拠が得られない。
// 辞書の中身に依存しない形で、人工的に衝突するペアを渡して確かめる。
{
  const guard = vm.runInContext("wordPairsAllDistinct", ctx);
  const cases = [
    { want: true,  name: "全て異なる語",           in: [["果物", "りんご"], ["自動車", "タイヤ"]] },
    { want: false, name: "前の語どうしが衝突",     in: [["教師", "生徒"], ["教師", "教壇"]] },
    { want: false, name: "後の語どうしが衝突",     in: [["職業", "教師"], ["学校", "教師"]] },
    { want: false, name: "前の語と後の語が衝突",   in: [["職業", "教師"], ["教師", "生徒"]] },
    { want: false, name: "3ペア目で衝突",           in: [["果物", "りんご"], ["自動車", "タイヤ"], ["樹木", "りんご"]] },
    { want: false, name: "1ペア内で同語",           in: [["教師", "教師"]] },
    { want: true,  name: "ペアが1つだけ",           in: [["果物", "りんご"]] },
    { want: true,  name: "空",                      in: [] }
  ];
  const ng = cases.filter(c => guard(c.in) !== c.want);
  console.log(`\n同居ガードの単体テスト: ${cases.length}ケース`);
  if (!ng.length) {
    console.log("   ✅ 同じ語を含むペアの同居をすべて弾き、正常な組は通す");
  } else {
    console.log(`   ❌ ${ng.length}件`);
    for (const c of ng) console.log(`   - ${c.name}: 期待 ${c.want} / 実際 ${guard(c.in)}`);
    process.exitCode = 1;
  }
}


// --- 解説と正解が食い違っていないか ---
//
// 既存の検査はすべて「問題文と正解」を見るもので、解説は誰も見ていなかった。
// 解説は generator.js の computeDerivedVars とテンプレート側の resolve が
// 別々に値を作って合流するので、片方だけ古い式が残ると
// 「問題と正解は正しいのに解説の数値だけ違う」状態になる。
// 利用者から見れば、解けなかった問題の答え合わせができないという実害が出る。
//
// 検査は単純に、正解として画面に出る文字列が解説の本文にも現れること。
// サンプリングの当たり外れに左右されないよう、全テンプレートを回す。
//
// 除外リストは今のところ空。解説が答えを書き下さない設計にするくらいなら、
// 解説のほうを直すべきなので、安易に足さないこと。
{
  const SKIP = new Set([]);
  const N = 120;
  const norm = (s) => String(s).replace(/\s+/g, "");

  /** 画面に出る「正解」の文字列。選択式は選択肢そのもの、分数は num/den。 */
  const shownAnswer = (q) => {
    if (Array.isArray(q.choices)) return String(q.choices[q.correctAnswer]);
    const a = q.correctAnswer;
    if (a && typeof a === "object" && "numerator" in a) return a.numerator + "/" + a.denominator;
    return String(a);
  };

  const bad = [];
  for (const t of TEMPLATES) {
    if (SKIP.has(t.id)) continue;
    let miss = 0, sample = null;
    for (let i = 0; i < N; i++) {
      const q = GEN.generateQuestion(t);
      if (!q) continue;
      const exp = norm(q.explanation || "");
      const want = norm(shownAnswer(q));
      let ok = exp.includes(want);
      // 数値入力の問題だけは桁区切り表記の可能性がある（図表の解説など）。
      // 選択式では correctAnswer が選択肢の番号なので、この救済を使ってはいけない
      // （どの数字にも当たってしまい、検査が素通りする）。
      if (!ok && !Array.isArray(q.choices) && typeof q.correctAnswer === "number") {
        ok = exp.includes(norm(q.correctAnswer.toLocaleString("en-US")));
      }
      if (!ok) { miss++; if (!sample) sample = { want: shownAnswer(q), exp: q.explanation }; }
    }
    if (miss) bad.push({ id: t.id, miss, sample });
  }

  console.log(`\n解説と正解の整合: ${TEMPLATES.length - SKIP.size}テンプレ x ${N}回（除外 ${SKIP.size}件）`);
  if (!bad.length) {
    console.log("   ✅ すべてのテンプレートで、正解の表示文字列が解説本文に現れる");
  } else {
    console.log(`   ❌ ${bad.length}件のテンプレートで解説に正解が現れない`);
    for (const b of bad.slice(0, 10)) {
      console.log(`   - ${b.id}: ${b.miss}/${N}回  正解「${String(b.sample.want).slice(0, 40)}」`);
    }
    process.exitCode = 1;
  }
}


// --- 解説の中の計算式が合っているか ---
//
// 上の「正解が解説に現れるか」は、解説の最後の行しか実質見ていない。
// 実際に起きるのは「答えは正しいのに途中式だけ古い」という壊れ方で、
// それはすり抜ける。実測でも、意図的に古い派生変数を戻したとき
// 上の検査は素通りした。
//
// そこで解説から数式のチェーン（a = b = c）を取り出して構文解析し、
// すべての辺が同じ値になることを確かめる。数値の対を正規表現で拾う方式は
// 「C(6, 2) = 6 × 5 / 2 = 15」から「C(6,2) = 6」を切り出すなど誤検知が
// 大量に出て使い物にならなかった（実測13,200問中4,012問が誤検知）。
// 式全体を評価する方式にしたら誤検知は0になった。
//
// 解析できない断片（√ や ^ で切れたもの、文字を含むもの）は黙って飛ばす。
// 検査できないことより、誤検知でテストが信用されなくなるほうが害が大きい。
{
  const N = 100;
  const COMB = (n, r) => { if (r > n || r < 0) return 0; if (r === 0 || r === n) return 1; if (r > n - r) r = n - r; let x = 1; for (let i = 0; i < r; i++) x = x * (n - i) / (i + 1); return Math.round(x); };
  const PERM = (n, r) => { let x = 1; for (let i = 0; i < r; i++) x *= (n - i); return x; };
  const FACT = (n) => { if (n < 0 || n > 170 || n !== Math.round(n)) throw 0; let x = 1; for (let i = 2; i <= n; i++) x *= i; return x; };

  /** 数式を評価する。解析できなければ例外。 */
  function evalExpr(s) {
    let i = 0;
    const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
    const peek = () => { ws(); return s[i]; };
    function primary() {
      ws();
      const ch = s[i];
      if (ch === "(") { i++; const v = expr(); ws(); if (s[i] !== ")") throw 0; i++; return v; }
      if (ch === "-") { i++; return -primary(); }
      if (ch === "C" || ch === "P") {
        const fn = ch; i++; ws();
        if (s[i] !== "(") throw 0; i++;
        const a = expr(); ws();
        if (s[i] !== ",") throw 0; i++;
        const b = expr(); ws();
        if (s[i] !== ")") throw 0; i++;
        return fn === "C" ? COMB(a, b) : PERM(a, b);
      }
      // カンマは桁区切りにも C(11, 4) の区切りにも使われる。
      // [\d,]+ にすると "11," まで飲み込んで引数の区切りを失い、
      // C()/P() の式が1本も検算されなくなる（実際にそうなっていた）。
      // 桁区切りは「3桁ずつ」の形のときだけ数値の一部とみなす。
      const m = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/.exec(s.slice(i));
      if (!m) throw 0;
      i += m[0].length;
      const v = parseFloat(m[0].replace(/,/g, ""));
      if (!isFinite(v)) throw 0;
      return v;
    }
    function postfix() { let v = primary(); while (peek() === "!") { i++; v = FACT(v); } return v; }
    function term() {
      let v = postfix();
      for (;;) {
        const c = peek();
        if (c === "×" || c === "*") { i++; v *= postfix(); }
        else if (c === "÷" || c === "/") { i++; const d = postfix(); if (d === 0) throw 0; v /= d; }
        else return v;
      }
    }
    function expr() {
      let v = term();
      for (;;) {
        const c = peek();
        if (c === "+") { i++; v += term(); }
        else if (c === "-") { i++; v -= term(); }
        else return v;
      }
    }
    const v = expr();
    ws();
    if (i !== s.length) throw 0;
    return v;
  }

  // 解説は途中経過を丸めて書くことがある（8.33 など）。
  // 小数d桁で書かれていれば ±0.5*10^-d まで許す。式そのものは厳密に見る。
  const tolOf = (t) => {
    const x = t.trim();
    if (/^-?[\d,]+\.(\d+)$/.test(x)) return 0.5 * Math.pow(10, -(/\.(\d+)$/.exec(x)[1].length));
    if (/^-?[\d,]+$/.test(x)) return 0.5;
    return 1e-6;
  };

  // √ や ^ に接している式は、扱えない記号で切り取られた断片なので見ない
  const BLOCK = "√^²³%";
  const CHAIN = /[0-9CP().,!+\-×÷/*=\s]+/g;

  const checked = new Map();     // テンプレートID → 検算できたチェーン数
  const bad = [];

  for (const t of TEMPLATES) {
    checked.set(t.id, 0);
    for (let i = 0; i < N; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.explanation) continue;

      // 「= 700 × 1.25」のように行頭の = で続く解説があるので、前の行に繋ぐ
      const lines = [];
      for (const raw of String(q.explanation).split("\n")) {
        if (/^\s*=/.test(raw) && lines.length) lines[lines.length - 1] += " " + raw.trim();
        else lines.push(raw);
      }

      for (const line of lines) {
        CHAIN.lastIndex = 0;
        let m;
        while ((m = CHAIN.exec(line))) {
          const run = m[0];
          if (!run.includes("=")) continue;
          const before = line[m.index - 1], after = line[m.index + run.length];
          if ((before && BLOCK.includes(before)) || (after && BLOCK.includes(after))) continue;
          const parts = run.split("=").map(x => x.trim()).filter(x => x.length);
          if (parts.length < 2) continue;

          // 解析できない辺は捨てて、残った辺だけを突き合わせる。
          // 「定価 = 原価 × (1+利益率/100) = 700 × 1.25 = 875」のように
          // 日本語混じりの辺が先頭に来る解説があり、そこで諦めると
          // 損益算がまるごと検査対象外になってしまう。
          // 等号でつながれている以上、解析できた辺どうしは必ず一致するはず。
          const vals = [];
          for (const p of parts) {
            try { vals.push({ v: evalExpr(p), t: p }); } catch (e) { /* この辺は見ない */ }
          }
          if (vals.length < 2) continue;
          checked.set(t.id, checked.get(t.id) + 1);

          for (let k = 1; k < vals.length; k++) {
            const tol = Math.max(tolOf(vals[0].t), tolOf(vals[k].t));
            if (Math.abs(vals[k].v - vals[0].v) > tol + 1e-9) {
              if (bad.length < 20) bad.push({ id: t.id, run: run.trim(), a: vals[0].v, b: vals[k].v });
              break;
            }
          }
        }
      }
    }
  }

  const totalChains = [...checked.values()].reduce((a, b) => a + b, 0);
  const uncovered = [...checked.entries()].filter(([, n]) => n === 0).map(([id]) => id);
  console.log(`\n解説の計算式の検算: ${TEMPLATES.length}テンプレ x ${N}回 / 式チェーン ${totalChains.toLocaleString()}本`);
  cov.covered("解説から取り出した式チェーン", totalChains, 1000);
  cov.skipped("式が取り出せなかったテンプレート", uncovered.length, "解説に数式が無いか、記号が扱えない形");
  if (uncovered.length) {
    console.log(`   ℹ️ 式が1本も取り出せなかったテンプレート ${uncovered.length}件: ${uncovered.join(", ")}`);
    console.log("      （解説に数式が無いか、記号が扱えない形。この検査の対象外）");
  }
  if (!bad.length) {
    console.log("   ✅ 取り出せた式はすべて左辺と右辺が一致");
  } else {
    console.log(`   ❌ 計算の合わない式 ${bad.length}件`);
    for (const b of bad.slice(0, 10)) console.log(`   - ${b.id}: ${b.run.slice(0, 70)}  [${b.a} ≠ ${b.b}]`);
    process.exitCode = 1;
  }
}


// --- リーグ戦: 問われたチームの成績が1通りに定まるか ---
//
// 総当たり・引き分けなしなら、起こりうる結果は各試合の勝者の組み合わせだけ。
// 4チームで 2^6 = 64通り、5チームでも 2^10 = 1,024通りしかないので全探索できる。
//
// 円卓と同じく、一意性は勝敗表全体ではなく答えに課している。
// 開示条件を満たす結果は普通は複数残る（残らないと「表が決まらなくても
// 答えは出る」という型にならない）。そのすべてで成績が一致するかを見る。
//
// ここでも生成器の内部は見ず、問題文から条件を読み直す。
{
  const t = TEMPLATES.find(x => x.id === "suiron_league_01");
  let checked = 0, unparsed = 0, zero = 0, notOne = 0, mismatch = 0, single = 0;

  if (t) {
    for (let i = 0; i < 500; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.choices) continue;
      const lines = q.text.split("\n");
      const head = lines[0].match(/^(.+?) の(\d)チームが/);
      const ask = lines[lines.length - 1].match(/^(.+?)の成績は何勝何敗か。$/);
      if (!head || !ask) { unparsed++; continue; }
      const names = head[1].split(", ");
      const n = parseInt(head[2], 10);
      if (names.length !== n) { unparsed++; continue; }

      // 試合の並びと、チーム対チームの索引
      const pairs = [], pidx = names.map(() => names.map(() => -1));
      for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) { pidx[a][b] = pidx[b][a] = pairs.length; pairs.push([a, b]); }
      }

      const conds = [];
      let broken = false;
      for (const l of lines.filter(x => x.startsWith("・"))) {
        const mRec = l.match(/^・(.+?)は(\d+)勝(\d+)敗だった$/);
        const mWin = l.match(/^・(.+?)は(.+?)に勝った$/);
        if (mRec) {
          const team = names.indexOf(mRec[1]);
          if (team < 0 || parseInt(mRec[2], 10) + parseInt(mRec[3], 10) !== n - 1) { broken = true; break; }
          conds.push({ t: "rec", team, w: parseInt(mRec[2], 10) });
        } else if (mWin) {
          const a = names.indexOf(mWin[1]), b = names.indexOf(mWin[2]);
          if (a < 0 || b < 0 || a === b) { broken = true; break; }
          conds.push({ t: "beat", a, b });
        } else { broken = true; break; }
      }
      const who = names.indexOf(ask[1]);
      if (broken || !conds.length || who < 0) { unparsed++; continue; }

      // 全結果を総当たり
      const sols = [];
      for (let mask = 0; mask < (1 << pairs.length); mask++) {
        const w = names.map(() => 0);
        for (let b = 0; b < pairs.length; b++) w[((mask >> b) & 1) ? pairs[b][0] : pairs[b][1]]++;
        const ok = conds.every(c => c.t === "rec"
          ? w[c.team] === c.w
          : (((mask >> pidx[c.a][c.b]) & 1) ? pairs[pidx[c.a][c.b]][0] : pairs[pidx[c.a][c.b]][1]) === c.a);
        if (ok) sols.push(w);
      }

      checked++;
      if (!sols.length) { zero++; continue; }
      // 表が1通りに決まってしまうと、この型の狙い（表が決まらなくても答えは出る）から外れる
      if (sols.length === 1) single++;

      const set = new Set(sols.map(w => w[who]));
      if (set.size !== 1) { notOne++; continue; }
      const wins = [...set][0];
      if (q.choices[q.correctAnswer] !== wins + "勝" + (n - 1 - wins) + "敗") mismatch++;
    }
  }

  cov.covered("リーグ戦の一意性で検証した問題", checked, 100);
  console.log(`\nリーグ戦の答えの一意性: ${checked}問を全対戦結果の総当たりで検証`);
  if (checked && zero + notOne + mismatch + unparsed + single === 0) {
    console.log("   ✅ すべて成績が1通りに定まり、正解と一致（勝敗表は複数残る形になっている）");
  } else {
    console.log(`   ❌ 解なし ${zero} / 成績が複数 ${notOne} / 正解不一致 ${mismatch} / パース不能 ${unparsed} / 表が1通りに確定 ${single} / 検証数 ${checked}`);
    process.exitCode = 1;
  }
}


// --- 円卓: 「向かいは誰か」の答えが1人に定まるか ---
//
// 円卓には2種類の対称性がある。
//   回転 … 全員を1つずつずらした並びは同じ並び。1人を席0に固定して数える。
//   鏡像 … 「隣り合う」「向かい合う」「間に1人」はどれも左右反転で成り立つ。
//           したがって条件を満たす座り方は必ず鏡像とペアで現れ、
//           **座り方そのものは原理的に1通りに定まらない。**
//
// なので順序推論のように「解がちょうど1通り」を検査してはいけない。
// 検査すべきは「向かいが誰か」が全解で一致すること（向かいの席は鏡像でも
// 変わらないので、座り方が複数でも答えは定まる）。
//
// ここでも生成器の内部は見ず、問題文から名前と条件を読み直して
// 6人ぶんの全席順120通りを総当たりする。
{
  const t = TEMPLATES.find(x => x.id === "suiron_position_01");
  const N = 6, HALF = 3;

  // 名前0を席0に固定した全席順（残り5人の順列＝120通り）
  const SEATINGS = (() => {
    const out = [];
    const rec = (cur, rest) => {
      if (!rest.length) { out.push([0].concat(cur)); return; }
      rest.forEach((x, i) => rec(cur.concat(x), rest.slice(0, i).concat(rest.slice(i + 1))));
    };
    rec([], [1, 2, 3, 4, 5]);
    return out;
  })();

  const PARSERS = [
    { re: /^・(.+?)と(.+?)は隣り合っている$/,         t: "adj" },
    { re: /^・(.+?)は(.+?)の隣ではない$/,             t: "notadj" },
    { re: /^・(.+?)と(.+?)は向かい合っている$/,       t: "opp" },
    { re: /^・(.+?)と(.+?)の間には1人が座っている$/,  t: "gap1" }
  ];

  let checked = 0, unparsed = 0, zero = 0, notOne = 0, mismatch = 0, mirrorless = 0;
  if (t) {
    for (let i = 0; i < 500; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.choices) continue;
      const lines = q.text.split("\n");
      const nm = lines[0].match(/^(.+?) の6人が/);
      const askM = lines[lines.length - 1].match(/^(.+?)の向かいに座っているのは誰か。$/);
      if (!nm || !askM) { unparsed++; continue; }
      const names = nm[1].split(", ");
      if (names.length !== N) { unparsed++; continue; }

      const conds = [];
      let broken = false;
      for (const l of lines.filter(x => x.startsWith("・"))) {
        const hit = PARSERS.map(p => ({ p, m: l.match(p.re) })).find(x => x.m);
        if (!hit) { broken = true; break; }
        const a = names.indexOf(hit.m[1]), b = names.indexOf(hit.m[2]);
        if (a < 0 || b < 0) { broken = true; break; }
        conds.push({ t: hit.p.t, a, b });
      }
      const who = names.indexOf(askM[1]);
      if (broken || !conds.length || who < 0) { unparsed++; continue; }

      const sols = SEATINGS.filter(seat => {
        const pos = [];
        seat.forEach((p, idx) => { pos[p] = idx; });
        return conds.every(c => {
          let d = Math.abs(pos[c.a] - pos[c.b]);
          d = Math.min(d, N - d);
          if (c.t === "adj") return d === 1;
          if (c.t === "notadj") return d !== 1;
          if (c.t === "opp") return d === HALF;
          return d === 2;
        });
      });

      checked++;
      if (!sols.length) { zero++; continue; }

      const facing = new Set(sols.map(seat => {
        const pos = [];
        seat.forEach((p, idx) => { pos[p] = idx; });
        return seat[(pos[who] + HALF) % N];
      }));
      if (facing.size !== 1) { notOne++; continue; }
      if (names[[...facing][0]] !== q.choices[q.correctAnswer]) mismatch++;

      // 鏡像も必ず解になっているはず。なっていなければ、左右非対称な条件が
      // 紛れ込んだか、列挙の作り方が間違っている。
      const mirror = (seat) => [seat[0]].concat(seat.slice(1).reverse());
      const key = (s) => s.join(",");
      const set = new Set(sols.map(key));
      if (!sols.every(s => set.has(key(mirror(s))))) mirrorless++;
    }
  }

  cov.covered("円卓の一意性で検証した問題", checked, 100);
  console.log(`\n円卓の答えの一意性: ${checked}問を全席順120通りで検証`);
  if (checked && zero + notOne + mismatch + unparsed + mirrorless === 0) {
    console.log("   ✅ すべて向かいが1人に定まり、正解と一致（鏡像も必ず解になっている）");
  } else {
    console.log(`   ❌ 解なし ${zero} / 向かいが複数 ${notOne} / 正解不一致 ${mismatch} / パース不能 ${unparsed} / 鏡像が解でない ${mirrorless} / 検証数 ${checked}`);
    process.exitCode = 1;
  }
}


// --- 検査対象の内訳。合否より先に「何件見たか」を出す ---
console.log("\n検査した対象の内訳");
cov.print();
if (cov.failures.length) {
  console.log(`   ❌ 検査対象が足りません ${cov.failures.length}件`);
  for (const p of cov.failures) console.log(`   - ${p}`);
  process.exitCode = 1;
} else {
  console.log("   ✅ どの検査も対象を取れている（0件で緑になっていない）");
}

process.exit(process.exitCode ? 1 : 0);
