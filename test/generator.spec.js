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

process.exit(process.exitCode ? 1 : 0);
