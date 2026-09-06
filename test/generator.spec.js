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
const BaselineMeta = require("./helpers/baseline-meta");
const cov = new Coverage();

const TEMPLATES = vm.runInContext("QUESTION_TEMPLATES", ctx);
// テンプレートが取れていなければ、以降の検査はすべて空回りする。
// 「壊れているものが無い」と「何も見ていない」を取り違えないための最初の一線。
cov.covered("問題テンプレート", TEMPLATES.length, 50);

const GEN = vm.runInContext("QuestionGenerator", ctx);

const VALID_FORMATS = ["webtesting", "testcenter"];

const failures = [];
let reportedUpTo = 0;      // ここまでは下の「出力」節で印字済み

/**
 * 違反を記録する。
 *
 * ⚠️ failures は下の「出力」節で1度だけ読まれる。そこから後で fail() を
 *    呼んでも、印字もされず終了コードにも乗らない（実際、あとから足した
 *    2つの検査が「❌ 31問で答えが固定」と出力しながら EXIT=0 だった）。
 *    呼んだら必ず効くように、ここで終了コードを立てる。
 *    印字漏れは reportLateFailures() が最後に拾う。
 */
function fail(tid, rule, detail) {
  failures.push({ tid, rule, detail });
  process.exitCode = 1;
}

/** 「出力」節より後に積まれた違反を、最後にまとめて出す。 */
function reportLateFailures() {
  const late = failures.slice(reportedUpTo);
  if (!late.length) return;
  console.log(`\n❌ 追加の違反 ${late.length}件`);
  for (const f of late.slice(0, 20)) {
    console.log(`   - [${f.rule}] ${f.tid}: ${String(f.detail).slice(0, 120)}`);
  }
}

// --- テンプレートIDが一意か ---
//
// ⚠️ IDの重複を見る検査が無かった。テンプレートを1件まるごと複製しても
//    すべての検査が緑のまま通る。同じIDが出題プールに2重登録されると
//    ・その分野だけ出題率が倍になる（利用者から見える偏り）
//    ・GA4の template_id 別集計で2つの実体が1つに混ざる
//    ・誤り報告が来ても、どちらのテンプレートか特定できない
//    ビルドは連結するだけなので、コピペで簡単に起こる。
{
  const seen = new Map();
  const dups = [];
  for (const t of TEMPLATES) {
    if (!t.id) { fail("(id なし)", "テンプレートIDが無い", `category=${t.category}`); continue; }
    if (seen.has(t.id)) dups.push(t.id);
    else seen.set(t.id, t);
  }
  if (dups.length) {
    for (const id of [...new Set(dups)]) {
      fail(id, "テンプレートIDが重複している",
        `${TEMPLATES.filter(t => t.id === id).length}件ある。`
        + "出題率が倍になり、template_id 別の集計も混ざる");
    }
  }
  // 0件だと「重複が無い」ではなく「1件も見ていない」。
  cov.covered("IDを調べたテンプレート", seen.size, 50);
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
reportedUpTo = failures.length;   // ここまでを印字済みとして記録する

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
  // （更新は UPDATE_BASELINE=<テンプレートID> の名指しで行う。下記参照）。
  const DIVERSITY_TARGET = 50;
  const TOLERANCE = 0.8;   // 実測の振れ幅は最大1.3%。20%見ておけば誤検知しない
  const SAMPLES = 400;
  // 書き先を差し替えられるようにしておく。検査が UPDATE_BASELINE の経路を
  // 試すとき、本物のベースラインを書き換えてしまうのを防ぐため。
  // 実際、門番の検査が本物の reason を「検査」に書き換えた（2026-08-29）。
  const BASELINE_PATH = process.env.DIVERSITY_BASELINE_PATH
    || path.join(__dirname, "diversity-baseline.json");

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
    // ランナーが動いている最中にベースラインを書き換えない。
    require("./helpers/runner-lock").assertNotLocked("diversity-baseline.json");
    // ⚠️ かつては UPDATE_BASELINE=1 で全件が一括更新できた。意図した1件と
    //    無関係な揺らぎ、さらに（もし実在すれば）本物の退行まで、区別なく
    //    まとめて承認される。実際に踏んで巻き戻す事故が起きた（2026-08-29）。
    //    更新はテンプレートIDの名指しに限る。禁止ではなく安全な口を残す:
    //    正当な全件更新（生成器の意図的な全面改修）は all + 理由で通す。
    //    使い方の誤りは検査の失敗ではないので EXIT=2 で区別する。
    const req = process.env.UPDATE_BASELINE.trim();
    const reason = (process.env.BASELINE_REASON || "").trim();
    let old = {};
    try { old = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")); } catch (e) {}
    const byId = new Map(rows.map(r => [r.id, r.n]));

    if (req === "1" || req === "true") {
      console.error("❌ UPDATE_BASELINE=1（一括更新）は廃止しました。");
      console.error("   一括更新は、意図した1件と無関係な揺らぎと本物の退行を区別なく承認します。");
      console.error("   更新するテンプレートIDを名指ししてください:");
      console.error('     UPDATE_BASELINE=soneki_discount_01,shugo_min_01 node test/generator.spec.js');
      console.error("   全件を意図して更新する場合（生成器の全面改修など）:");
      console.error('     UPDATE_BASELINE=all BASELINE_REASON="理由" node test/generator.spec.js');
      process.exit(2);
    }
    // sign: 値は変えず、由来（_meta）だけを付け直す。
    // 既存ファイルに由来が無い状態から始めるための口。
    const targets = req === "sign" ? []
                  : req === "all" ? rows.map(r => r.id)
                  : [...new Set(req.split(",").map(s => s.trim()).filter(Boolean))];
    if (req === "sign" && !reason) {
      console.error('❌ sign にも理由が要ります。BASELINE_REASON="..." を付けてください。');
      process.exit(2);
    }
    const unknown = targets.filter(id => !byId.has(id));
    if (unknown.length) {
      console.error(`❌ 実在しないテンプレートID: ${unknown.join(", ")}（タイポの可能性。何も更新していません）`);
      process.exit(2);
    }
    const changes = targets.map(id => {
      const o = old[id], n = byId.get(id);
      const big = o !== undefined && o > 0 && Math.abs(n - o) > o * 0.2;
      return { id, o, n, big };
    });
    if ((req === "all" || changes.some(c => c.big)) && !reason) {
      console.error('❌ この更新には理由が要ります。BASELINE_REASON="..." を付けて再実行してください。');
      for (const c of changes.filter(c => c.big)) {
        console.error(`   - ${c.id}: ${c.o} → ${c.n}（${(100 * (c.n - c.o) / c.o).toFixed(0)}% の変化。20%を超えている）`);
      }
      if (req === "all") console.error("   （all 指定は変化量にかかわらず常に理由が必要です）");
      console.error("   何も更新していません。");
      process.exit(2);
    }
    // 名指しした分だけ書き換え、他は旧値のまま残す。
    // 実在しなくなったテンプレートの記録だけは落とす（名指しでは永遠に消せないため）。
    const merged = {};
    const oldEntries = BaselineMeta.entriesOf(old);
    for (const id of Object.keys(oldEntries)) if (byId.has(id)) merged[id] = oldEntries[id];
    const dropped = Object.keys(oldEntries).filter(id => !byId.has(id));
    for (const c of changes) merged[c.id] = c.n;
    // 由来（更新日・理由・変更したID・署名）を一緒に書く。
    // 署名は、ゲートを通さない手編集を次の実行で見えるようにするためのもの。
    const doc = BaselineMeta.withMeta(merged, reason, changes.map(c => c.id));
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(doc, null, 2) + "\n", "utf8");
    console.log(`\nベースラインを更新: ${changes.length}件${reason ? `（理由: ${reason}）` : ""}`);
    for (const c of changes) {
      console.log(`   - ${c.id}: ${c.o === undefined ? `新規 ${c.n}` : `${c.o} → ${c.n}${c.big ? " ⚠️ 20%超" : ""}`}`);
    }
    if (dropped.length) console.log(`   実在しないテンプレートの記録を削除: ${dropped.join(", ")}`);
  }

  let baselineDoc = {};
  try { baselineDoc = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")); }
  catch (e) { console.log("\n⚠️ ベースラインが読めません。UPDATE_BASELINE=all BASELINE_REASON=\"初回作成\" で作成してください。"); }

  // ⚠️ UPDATE_BASELINE のゲート（名指し・理由・タイポ検出）は、
  //    ファイルをエディタで直接書き換えれば全部素通りする。
  //    実測: soneki_discount_01 を 305 → 10 に手で下げても9本すべて緑だった。
  //    ベースラインを下げるのは退行を隠す方向なので、ここで見えるようにする。
  if (!process.env.UPDATE_BASELINE) {
    const v = BaselineMeta.verify(baselineDoc);
    if (!v.ok) fail("diversity-baseline.json", "ベースラインの由来が確認できない", `${v.why} … ${v.how}`);
  }
  const baseline = BaselineMeta.entriesOf(baselineDoc);

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
    console.log(`   📈 改善したテンプレート ${improved.length}件（UPDATE_BASELINE=<id> で記録を更新してください）`);
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


// --- 濃度算: 問題文から独立に解き直す ---
//
// 【なぜ必要か】
// 2026-08-29、noudo_target_01 の answerFormula に +1 を入れても全検査が
// 緑のままだった（実測）。解説は答えをそのまま {{answer}} で埋めるので、
// 解説の検算（式チェーンの内部整合）は答えの正しさを1ミリも保証しない。
// 「答えが題意と合っているか」は、誰も見ていなかった。
//
// 【独立性の作り方】
// ⚠️ answerFormula を読んで書いてはいけない（A1: 同じ式を2箇所に書けば、
//    式が間違ったとき両方が同じように間違う。noudo_target_01 の validate()
//    が answerFormula と同じ式を手で二重に持っていたのが実例）。
// この検査の入力は「利用者が読む問題文」だけ。数値・操作・丸め指示を
// 文面から取り出し、濃度の定義（濃度% = 食塩 / 食塩水 × 100）だけで解き直す。
// 生成器と共有するのは日本語の読みと算数の定石のみ。
// 残るリスクも明記する: 定石そのものの誤解は両側で一致しうる。それは
// 推論系の独立再計算と同じ限界で、この検査が守るのは「実装の壊れ」まで。
{
  const N = 100;
  const NUM = "(\\d+(?:\\.\\d+)?)";
  // 「何を聞かれているか」1形につき1パターン。文面が変わればマッチしなく
  // なるが、それは沈黙ではなく「解き直せない」という失敗として表に出す。
  const FORMS = [
    { re: new RegExp(`^${NUM}gの水に${NUM}gの食塩を溶かした。この食塩水の濃度は何%か`),
      solve: (m) => { const w = +m[1], s = +m[2]; return s / (w + s) * 100; } },
    { re: new RegExp(`^濃度${NUM}%の食塩水${NUM}gと、濃度${NUM}%の食塩水${NUM}gを混ぜると、濃度は何%になるか`),
      solve: (m) => { const cA = +m[1], wA = +m[2], cB = +m[3], wB = +m[4];
        return (wA * cA / 100 + wB * cB / 100) / (wA + wB) * 100; } },
    { re: new RegExp(`^濃度${NUM}%の食塩水が${NUM}gある。水を${NUM}g蒸発させると、濃度は何%になるか`),
      solve: (m) => { const c = +m[1], w = +m[2], e = +m[3]; return (w * c / 100) / (w - e) * 100; } },
    { re: new RegExp(`^濃度${NUM}%の食塩水${NUM}gに水を${NUM}g加えると、濃度は何%になるか`),
      solve: (m) => { const c = +m[1], w = +m[2], a = +m[3]; return (w * c / 100) / (w + a) * 100; } },
    { re: new RegExp(`^濃度${NUM}%の食塩水${NUM}gに食塩を${NUM}g加えると、濃度は何%になるか`),
      solve: (m) => { const c = +m[1], w = +m[2], s = +m[3]; return (w * c / 100 + s) / (w + s) * 100; } },
    { // 「何g混ぜるか」: 食塩の量の等式 cA·wA + cB·x = cT·(wA+x) を x について解く
      re: new RegExp(`^濃度${NUM}%の食塩水${NUM}gに、濃度${NUM}%の食塩水を何g混ぜると濃度${NUM}%になるか`),
      solve: (m) => { const cA = +m[1], wA = +m[2], cB = +m[3], cT = +m[4];
        return wA * (cT - cA) / (cB - cT); } },
    { re: new RegExp(`^濃度${NUM}%の食塩水${NUM}gから${NUM}gを取り出し、代わりに同量の水を加えた。新しい濃度は何%か`),
      solve: (m) => { const c = +m[1], w = +m[2], r = +m[3]; return ((w - r) * c / 100) / w * 100; } }
  ];

  const noudo = TEMPLATES.filter(t => t.category === "濃度算");
  let checked = 0, mismatch = 0, unparsed = 0;
  const bad = [];
  for (const t of noudo) {
    for (let i = 0; i < N; i++) {
      const q = GEN.generateQuestion(t);
      if (!q) continue;
      const form = FORMS.find(f => f.re.test(q.text));
      if (!form) {
        unparsed++;
        if (bad.length < 3) bad.push(`${t.id}: どの型にも一致しない「${String(q.text).slice(0, 50)}」`);
        continue;
      }
      let x = form.solve(q.text.match(form.re));
      // 丸めは文面の指示に従う。指示が無い問題（gを問う）は表示粒度＝整数。
      // ⚠️ +1e-9 は浮動小数対策。入力が整数なので真値は分母が小さい有理数で、
      //    .5境界に乗るか、境界から 1e-4 以上離れるかのどちらか。float の表現誤差で
      //    72.5 が 72.4999… になり半下げに転ぶ偽陽性が実際に出た（7.25% → 7.2 と誤算）。
      const rounded = /小数第2位を四捨五入/.test(q.text);
      // ⚠️ 真値がちょうど .5 境界のときは、上下どちらの丸めも正解として許容する。
      //    生成側の Math.round は浮動小数の表現誤差で境界がどちらにも転ぶ
      //    （実測: 7.25% がシステム 7.3 / 検査 7.2 になった回と、102.5% が
      //    システム 102 / 検査 103 になった回の両方が出た）。入力は整数なので
      //    真値は分母の小さい有理数で、「境界から1e-6以内」は「ちょうど境界」と
      //    同値。境界以外は従来どおり1択で照合するので、+1のずれは必ず落ちる。
      const scale = rounded ? 10 : 1;
      const xs = Math.abs(x * scale - Math.floor(x * scale) - 0.5) < 1e-6
        ? [Math.floor(x * scale) / scale, (Math.floor(x * scale) + 1) / scale]
        : [Math.round(x * scale + 1e-9) / scale];
      x = xs.length === 1 ? xs[0] : xs.join("か");
      const tol = rounded ? 0.05 : 0.5;
      checked++;
      if (!xs.some(v => Math.abs(v - q.correctAnswer) <= tol + 1e-9)) {
        mismatch++;
        if (bad.length < 5) bad.push(`${t.id}: 文面から=${x} / システム=${q.correctAnswer} 「${String(q.text).slice(0, 50)}」`);
      }
    }
  }

  cov.covered("問題文からの独立再計算（濃度算）", checked, 500);
  console.log(`\n濃度算の独立再計算: ${checked.toLocaleString()}問を文面から解き直して照合`);
  if (checked && mismatch === 0 && unparsed === 0) {
    console.log("   ✅ 文面から解いた答えと、システムの答えがすべて一致");
  } else {
    console.log(`   ❌ 不一致 ${mismatch} / 解き直せない ${unparsed}`);
    if (mismatch) fail("濃度算", "独立再計算と答えが不一致", bad.join(" / "));
    if (unparsed) fail("濃度算", "問題文から解き直せない", `文面の書式が変わったなら、この検査の型も更新すること: ${bad.join(" / ")}`);
  }
}

// --- 四則逆算: 問題文から独立に解き直す ---
//
// 式が文面そのもの（例: 「□ × 8 = 12 × 4」「□ の 25% = 90」）なので、
// 文面の式を解けば答えが出る。answerFormula は読まずに書いた（濃度算と同じ
// 作業順序: 検査を書いて素の緑を確認してから、プローブの照準としてだけ実装を見る）。
// 答えは選択式なので、正解indexが指す選択肢の値と突き合わせる。
{
  const N = 100;
  // 数値・分数のトークンを値にする。分数は a/b。
  const tokVal = (tok) => {
    const m = String(tok).trim().match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) return +m[1] / +m[2];
    const n = Number(String(tok).trim());
    return Number.isFinite(n) ? n : null;
  };
  // 空白区切りの式（×÷が+−より先）を評価する。評価できなければ null。
  const evalSide = (sraw) => {
    const toks = sraw.trim().replace(/−/g, "-").replace(/＋/g, "+").split(/\s+/);
    if (!toks.length) return null;
    const vals = [], ops = [];
    for (let i = 0; i < toks.length; i++) {
      if (i % 2 === 0) { const v = tokVal(toks[i]); if (v === null) return null; vals.push(v); }
      else { if (!["×", "÷", "+", "-"].includes(toks[i])) return null; ops.push(toks[i]); }
    }
    if (vals.length !== ops.length + 1) return null;
    // ×÷ を先に潰す
    for (let i = 0; i < ops.length; ) {
      if (ops[i] === "×" || ops[i] === "÷") {
        vals.splice(i, 2, ops[i] === "×" ? vals[i] * vals[i + 1] : vals[i] / vals[i + 1]);
        ops.splice(i, 1);
      } else i++;
    }
    let acc = vals[0];
    for (let i = 0; i < ops.length; i++) acc = ops[i] === "+" ? acc + vals[i + 1] : acc - vals[i + 1];
    return acc;
  };
  // □ を含む辺（2項）を逆算する。V は反対側の値。
  const solveBoxSide = (sraw, V) => {
    const side = sraw.trim().replace(/−/g, "-").replace(/＋/g, "+");
    let m = side.match(/^□ の (\d+(?:\.\d+)?)%$/);
    if (m) return V * 100 / +m[1];
    m = side.match(/^□ ([×÷+-]) (\S+)$/);
    if (m) {
      const k = tokVal(m[2]); if (k === null) return null;
      return { "×": V / k, "÷": V * k, "+": V - k, "-": V + k }[m[1]];
    }
    m = side.match(/^(\S+) ([×÷+-]) □$/);
    if (m) {
      const k = tokVal(m[1]); if (k === null) return null;
      return { "×": V / k, "÷": k / V, "+": V - k, "-": k - V }[m[2]];
    }
    return null;
  };

  const fams = TEMPLATES.filter(t => t.category === "四則逆算");
  let checked = 0, mismatch = 0, unparsed = 0;
  const bad = [];
  for (const t of fams) {
    for (let i = 0; i < N; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !Array.isArray(q.choices)) continue;
      const eq = String(q.text).split("=");
      let x = null;
      if (eq.length === 2) {
        const boxLeft = eq[0].includes("□");
        const boxSide = boxLeft ? eq[0] : eq[1];
        const valSide = boxLeft ? eq[1] : eq[0];
        if (!boxSide.includes("□") || valSide.includes("□")) x = null;
        else {
          const V = evalSide(valSide);
          x = V === null ? null : solveBoxSide(boxSide, V);
        }
      }
      if (x === null || x === undefined) {
        unparsed++;
        if (bad.length < 3) bad.push(`${t.id}: 式を読めない「${String(q.text).slice(0, 40)}」`);
        continue;
      }
      const ans = tokVal(q.choices[q.correctAnswer]);
      checked++;
      if (ans === null || Math.abs(x - ans) > 0.01) {
        mismatch++;
        if (bad.length < 5) bad.push(`${t.id}: 文面から=${x} / システム=${q.choices[q.correctAnswer]} 「${String(q.text).slice(0, 40)}」`);
      }
    }
  }
  cov.covered("問題文からの独立再計算（四則逆算）", checked, 500);
  console.log(`\n四則逆算の独立再計算: ${checked.toLocaleString()}問を文面の式から解き直して照合`);
  if (checked && mismatch === 0 && unparsed === 0) {
    console.log("   ✅ 文面の式を解いた答えと、正解の選択肢がすべて一致");
  } else {
    console.log(`   ❌ 不一致 ${mismatch} / 解き直せない ${unparsed}`);
    if (mismatch) fail("四則逆算", "独立再計算と答えが不一致", bad.join(" / "));
    if (unparsed) fail("四則逆算", "問題文から解き直せない", `文面の書式が変わったなら、この検査の型も更新すること: ${bad.join(" / ")}`);
  }
}

// --- 図表（表形式）: 問題文から独立に解き直す ---
//
// 表は Markdown として問題文に入っている（利用者が見るものそのもの）。
// 表をパースし、設問（合計・増減率・構成比・最大変動）を読み、表から計算する。
// answerFormula は読まずに書いた（作業順序は濃度算・四則逆算と同じ）。
// チャート系（chart_*）は文面にデータが無いので、この検査の対象外
// （chartConfig からの再計算は方式が別なので、混ぜずに別の判断とする）。
{
  const N = 100;
  const parseTable = (text) => {
    const rows = String(text).split("\n").filter(l => l.startsWith("|") && !/^\|---/.test(l));
    if (rows.length < 2) return null;
    const cells = rows.map(r => r.split("|").slice(1, -1).map(c => c.trim()));
    const header = cells[0].slice(1);
    const body = {};
    for (const row of cells.slice(1)) body[row[0]] = row.slice(1).map(Number);
    return { header, body };
  };
  const FORMS = [
    (q) => { // 行の合計（table_sales_01）
      const m = String(q.text).match(/([^\s、。]+)の年間売上の合計はいくらか/);
      if (!m) return null;
      const tb = parseTable(q.text); if (!tb || !tb.body[m[1]]) return null;
      return { x: tb.body[m[1]].reduce((a, b) => a + b, 0), tol: 0.5 };
    },
    (q) => { // 増減率（table_sales_02）
      const m = String(q.text).match(/([^\s、。]+)の(\d{4})年から(\d{4})年への増減率は何%か/);
      if (!m) return null;
      const tb = parseTable(q.text); if (!tb || !tb.body[m[1]]) return null;
      const i1 = tb.header.indexOf(m[2] + "年"), i2 = tb.header.indexOf(m[3] + "年");
      if (i1 < 0 || i2 < 0) return null;
      const a = tb.body[m[1]][i1], b = tb.body[m[1]][i2];
      // .5境界は上下どちらの丸めも許容（濃度算と同じ理由。102.5% で実測）
      const r = (b - a) / a * 100;
      const cands = Math.abs(r - Math.floor(r) - 0.5) < 1e-6
        ? [Math.floor(r), Math.floor(r) + 1] : [Math.round(r + 1e-9)];
      return { cands, tol: 0.5 };
    },
    (q) => { // 構成比から金額（table_composition_01）
      const t1 = String(q.text).match(/総額: ([\d,]+)円/);
      const t2 = String(q.text).match(/([^\s、。]+)の金額はいくらか/);
      if (!t1 || !t2) return null;
      const total = Number(t1[1].replace(/,/g, ""));
      const pm = String(q.text).match(new RegExp(t2[1] + ": (\\d+(?:\\.\\d+)?)%"));
      if (!pm) return null;
      return { x: total * (+pm[1]) / 100, tol: 0.5 };
    },
    (q) => { // 最大変動（table_diff_01）。絶対値最大が複数ある場合は、その候補の
             // どれかに一致していれば正解とする（候補が割れる問いの一意性は別問題）。
      const m = String(q.text).match(/([^\s、。]+)で前月比の売上変動額（絶対値）が最も大きかった/);
      if (!m) return null;
      const tb = parseTable(q.text); if (!tb || !tb.body[m[1]]) return null;
      const row = tb.body[m[1]];
      const diffs = [];
      for (let i = 1; i < row.length; i++) diffs.push(row[i] - row[i - 1]);
      const maxAbs = Math.max(...diffs.map(Math.abs));
      const cands = diffs.filter(d => Math.abs(d) === maxAbs);
      return { cands, tol: 0.5 };
    }
  ];

  const fams = TEMPLATES.filter(t => /^table_/.test(t.id));
  let checked = 0, mismatch = 0, unparsed = 0;
  const bad = [];
  for (const t of fams) {
    for (let i = 0; i < N; i++) {
      const q = GEN.generateQuestion(t);
      if (!q) continue;
      let res = null;
      for (const f of FORMS) { res = f(q); if (res) break; }
      // 「最も高い/低い」型（table_max_01）: 答えが選択肢の文字列（都市名）。
      if (!res) {
        const m = String(q.text).match(/(\S+)の(\S+)が最も(高|低)い(\S+)はどこか/);
        const tb = m && parseTable(q.text);
        if (m && tb) {
          const col = tb.header.indexOf(m[1]);
          if (col >= 0 && Array.isArray(q.choices)) {
            const vals = Object.keys(tb.body).map(name => ({ name, v: tb.body[name][col] }));
            const best = m[3] === "高" ? Math.max(...vals.map(x => x.v)) : Math.min(...vals.map(x => x.v));
            res = { names: vals.filter(x => x.v === best).map(x => x.name), pick: String(q.choices[q.correctAnswer]) };
          }
        }
      }
      if (!res) {
        unparsed++;
        if (bad.length < 3) bad.push(`${t.id}: 表か設問を読めない「${String(q.text).split("\n").pop().slice(0, 40)}」`);
        continue;
      }
      checked++;
      const ans = Number(q.correctAnswer);
      const ok = res.names ? res.names.indexOf(res.pick) !== -1
               : res.cands ? res.cands.some(c => Math.abs(c - ans) <= res.tol)
                           : Math.abs(res.x - ans) <= res.tol;
      if (!ok) {
        mismatch++;
        if (bad.length < 5) bad.push(`${t.id}: 文面から=${res.names ? res.names.join("か") : res.cands ? res.cands.join("か") : res.x} / システム=${res.names ? res.pick : ans}`);
      }
    }
  }
  cov.covered("問題文からの独立再計算（表の読み取り）", checked, 400);
  console.log(`\n表の読み取りの独立再計算: ${checked.toLocaleString()}問を表と設問から解き直して照合`);
  if (checked && mismatch === 0 && unparsed === 0) {
    console.log("   ✅ 表から解いた答えと、システムの答えがすべて一致");
  } else {
    console.log(`   ❌ 不一致 ${mismatch} / 解き直せない ${unparsed}`);
    if (mismatch) fail("表の読み取り", "独立再計算と答えが不一致", bad.join(" / "));
    if (unparsed) fail("表の読み取り", "問題文から解き直せない", `文面の書式が変わったなら、この検査の型も更新すること: ${bad.join(" / ")}`);
  }
}

// --- 仕事算・集合: 問題文から独立に解き直す ---
//
// 濃度算・四則逆算・表と同じ方針・同じ作業順序（answerFormula は読まずに、
// 文面と定石だけで書き、素の緑を確認してから実装をプローブの照準に使う）。
// 仕事算は言い回しが揺れる（職人/機械/ポンプ…）が、工期の数値は
// 「N日 / N時間」の単位つきでしか現れないので、単位で拾って定石
// （仕事率の和）で解く。集合は骨格が固定なので数値をそのまま取る。
// テンプレIDはソルバの振り分けにだけ使う（答えの導出には使わない）。
{
  const N = 100;
  const nums = (text, unit) => {
    const out = []; const re = new RegExp("(\\d+(?:\\.\\d+)?)" + unit, "g");
    let m; while ((m = re.exec(text))) out.push(+m[1]);
    return out;
  };
  const harmonic = (ds) => 1 / ds.reduce((a, d) => a + 1 / d, 0);
  const SOLVERS = {
    shigoto_basic_01: (t) => { const d = nums(t, "日"); return d.length === 2 ? harmonic(d) : null; },
    shigoto_3people_01: (t) => { const d = nums(t, "日"); return d.length === 3 ? harmonic(d) : null; },
    shigoto_tank_01: (t) => { const d = nums(t, "時間"); return d.length === 2 ? harmonic(d) : null; },
    shigoto_efficiency_01: (t) => {
      const d = nums(t, "日"); const k = t.match(/(\d+(?:\.\d+)?)倍の速さ/);
      return d.length === 1 && k ? d[0] / +k[1] : null;
    },
    shigoto_switch_01: (t) => {  // a日・b日・最初にd日間 → Bの日数 = (1 - d/a) × b
      const d = nums(t, "日"); return d.length === 3 ? (1 - d[2] / d[0]) * d[1] : null;
    },
    shigoto_join_01: (t) => {   // p日・先行d1日間・合流後さらにd2日 → q = d2 / (1 - (d1+d2)/p)
      const d = nums(t, "日"); return d.length === 3 ? d[2] / (1 - (d[1] + d[2]) / d[0]) : null;
    },
    shugo_2set_01: (t) => {
      const m = t.match(/^(\d+)人のクラスで、英語が好きな人が(\d+)人、数学が好きな人が(\d+)人、両方好きな人が(\d+)人いる/);
      return m ? +m[1] - (+m[2] + +m[3] - +m[4]) : null;
    },
    shugo_2set_02: (t) => {
      const m = t.match(/^(\d+)人にアンケートを取ったところ、商品Aを買ったことがある人が(\d+)人、商品Bを買ったことがある人が(\d+)人、どちらも買ったことがない人が(\d+)人/);
      return m ? +m[2] + +m[3] - (+m[1] - +m[4]) : null;
    },
    shugo_3set_01: (t) => {
      const m = t.match(/^(\d+)人のクラスで、国語が好きな人が(\d+)人、数学が好きな人が(\d+)人、英語が好きな人が(\d+)人いる。国語と数学の両方が好きな人が(\d+)人、数学と英語の両方が好きな人が(\d+)人、国語と英語の両方が好きな人が(\d+)人、3教科すべてが好きな人が(\d+)人/);
      if (!m) return null;
      const [T, a, b, c, ab, bc, ac, abc] = m.slice(1).map(Number);
      return T - (a + b + c - ab - bc - ac + abc);
    },
    shugo_2set_03: (t) => {
      const m = t.match(/社員(\d+)人のうち、電車通勤の人が(\d+)人、バス通勤の人が(\d+)人いる。電車とバスの両方を使う人が最も多い場合/);
      return m ? Math.min(+m[2], +m[3]) : null;
    },
    shugo_min_01: (t) => {
      const m = t.match(/^(\d+)人の社員のうち、英語ができる人が(\d+)人、中国語ができる人が(\d+)人いる。英語と中国語の両方ができる人は少なくとも/);
      return m ? Math.max(0, +m[2] + +m[3] - +m[1]) : null;
    },
    shugo_percent_01: (t) => {
      const m = t.match(/^(\d+)人にアンケートを取ったところ、スポーツが好きな人は全体の(\d+)%、音楽が好きな人は全体の(\d+)%、両方好きな人は全体の(\d+)%/);
      return m ? +m[1] * (100 - (+m[2] + +m[3] - +m[4])) / 100 : null;
    }
  };

  for (const [famLabel, cat] of [["仕事算", "仕事算"], ["集合", "集合"]]) {
    const fams = TEMPLATES.filter(t => t.category === cat && SOLVERS[t.id]);
    let checked = 0, mismatch = 0, unparsed = 0;
    const bad = [];
    for (const t of fams) {
      for (let i = 0; i < N; i++) {
        const q = GEN.generateQuestion(t);
        if (!q) continue;
        const x = SOLVERS[t.id](String(q.text));
        if (x === null || x === undefined || !isFinite(x)) {
          unparsed++;
          if (bad.length < 3) bad.push(`${t.id}: 文面を読めない「${String(q.text).slice(0, 50)}」`);
          continue;
        }
        checked++;
        if (Math.abs(x - q.correctAnswer) > 0.01) {
          mismatch++;
          if (bad.length < 5) bad.push(`${t.id}: 文面から=${x} / システム=${q.correctAnswer} 「${String(q.text).slice(0, 50)}」`);
        }
      }
    }
    cov.covered(`問題文からの独立再計算（${famLabel}）`, checked, 400);
    console.log(`\n${famLabel}の独立再計算: ${checked.toLocaleString()}問を文面から解き直して照合`);
    if (checked && mismatch === 0 && unparsed === 0) {
      console.log("   ✅ 文面から解いた答えと、システムの答えがすべて一致");
    } else {
      console.log(`   ❌ 不一致 ${mismatch} / 解き直せない ${unparsed}`);
      if (mismatch) fail(famLabel, "独立再計算と答えが不一致", bad.join(" / "));
      if (unparsed) fail(famLabel, "問題文から解き直せない", `文面の書式が変わったなら、この検査の型も更新すること: ${bad.join(" / ")}`);
    }
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
  // 許容幅は置かない。浮動小数の誤差ぶんだけ。
  //
  // ⚠️ ここは以前「小数d桁で書かれていれば ±0.5*10^-d まで許す」としていた。
  //    それは丸めを許容する作りで、丸めの誤りを構造的に検出できない。
  //    実際に「1 - 5/18 = 0.72」（真値 13/18）も「4.17 × 60 = 250」（真値 250.2）も
  //    許容幅の内側に収まって通っていた。整数の許容幅0.5に至っては、
  //    1円未満・0.2分のずれを丸ごと飲み込んでいた。
  //
  //    直し方は「許容幅を狭める」ではなく「丸めを出さない」。
  //    割り切れない値は分数で書くか、割り切れる値だけを出題する。
  //    そのうえでここを厳密にすると、丸めが混ざった瞬間に落ちる。
  const tolOf = () => 1e-9;

  // √ や ^ に接している式は、扱えない記号で切り取られた断片なので見ない
  const BLOCK = "√^²³%";
  const CHAIN = /[0-9CP().,!+\-×÷/*=\s]+/g;

  /**
   * 解説の1行を検査する。見つかった問題は bad に積む。
   *
   * 本物の解説と、下の自己検査で同じ関数を通す。別々に書くと
   * 「検査の検査」が本番と違うものを見ることになる。
   */
  function checkLine(line, id, bad, checked) {
    CHAIN.lastIndex = 0;
    let m;
    while ((m = CHAIN.exec(line))) {
      const run = m[0];
      if (!run.includes("=")) continue;
      const before = line[m.index - 1], after = line[m.index + run.length];
      if ((before && BLOCK.includes(before)) || (after && BLOCK.includes(after))) continue;
      const parts = run.split("=").map(x => x.trim()).filter(x => x.length);
      if (parts.length < 2) continue;

      // 同語反復（「5/18 = 5/18」）。
      // ⚠️ 値の比較では原理的に捕まらない。両辺が同じ式なのだから必ず一致する。
      //    解説の変数に「値」ではなく「式の文字列」を入れていたときに起きる。
      for (let k = 1; k < parts.length; k++) {
        const norm = (x) => x.replace(/\s+/g, "");
        if (norm(parts[k]) === norm(parts[k - 1])) {
          if (bad.length < 5000) bad.push({ id, run: run.trim(), a: "同語反復", b: parts[k] });
          break;
        }
      }

      // 解析できない辺は捨てて、残った辺だけを突き合わせる。
      // 日本語混じりの辺が先頭に来る解説があり、そこで諦めると
      // 損益算がまるごと検査対象外になってしまう。
      const vals = [];
      for (const p of parts) {
        try { vals.push({ v: evalExpr(p), t: p }); } catch (e) { /* この辺は見ない */ }
      }
      if (vals.length < 2) continue;
      if (checked) checked.set(id, (checked.get(id) || 0) + 1);

      for (let k = 1; k < vals.length; k++) {
        const tol = Math.max(tolOf(vals[0].t), tolOf(vals[k].t));
        if (Math.abs(vals[k].v - vals[0].v) > tol + 1e-9) {
          if (bad.length < 5000) bad.push({ id, run: run.trim(), a: vals[0].v, b: vals[k].v });
          break;
        }
      }
    }
  }

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

      for (const line of lines) checkLine(line, t.id, bad, checked);
    }
  }

  // --- 検査自身の検査 ---
  //
  // ⚠️ テンプレートから丸めを一掃した結果、この検査は「落とすべきものが
  //    1つも無い」状態になった。そのため許容幅を緩めても何も起きず、
  //    番人が外れたことに誰も気づけない（実際、許容幅を戻す変異が
  //    検出されなかった）。
  //    そこで、わざと壊した解説を食わせて、落ちることを毎回確かめる。
  //    本番と同じ checkLine を通すので、本番と違うものを見ることはない。
  const selfCases = [
    { line: "  1 - 5/18 = 0.72",        why: "丸めた小数（真値 13/18 = 0.7222…）" },
    { line: "  4.17 × 60 = 250",        why: "整数への丸め（真値 250.2）" },
    { line: "  2600 / 60 = 43.33",      why: "小数第2位への丸め（真値 43.333…）" },
    { line: "  1250 × (1 - 25/100) = 938", why: "1円未満の丸め（真値 937.5）" },
    { line: "  5/18 = 5/18",            why: "同語反復" },
    { line: "  C(7, 3) = C(7, 3)",      why: "同語反復（組み合わせ）" }
  ];
  const mustPass = [
    "  1/10 × 8 = 4/5",
    "  1 - 4/5 = 1/5",
    "  3600 ÷ (75) = 48",
    "  C(6, 2) = 6 × 5 / 2 = 15"
  ];
  let selfOk = 0;
  for (const c of selfCases) {
    const caught = [];
    checkLine(c.line, "自己検査", caught, null);
    if (!caught.length) {
      fail(c.line.trim(), "解説の検算（自己検査）", `壊した式を見逃した … ${c.why}`);
    } else selfOk++;
  }
  for (const line of mustPass) {
    const caught = [];
    checkLine(line, "自己検査", caught, null);
    if (caught.length) {
      fail(line.trim(), "解説の検算（自己検査）", "正しい式を誤検知した");
    } else selfOk++;
  }
  cov.covered("解説の検算の自己検査", selfOk, selfCases.length + mustPass.length);

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
    // テンプレート別に出す。先頭10件だけ並べると、件数の多い1つに
    // 埋もれて他のテンプレートが見えない（実際に soneki だけが見えていた）。
    const byId = new Map();
    for (const b of bad) {
      if (!byId.has(b.id)) byId.set(b.id, []);
      byId.get(b.id).push(b);
    }
    console.log(`   ❌ 計算の合わない式 ${bad.length}件 / ${byId.size}テンプレート`);
    for (const [id, list] of [...byId.entries()].sort((a, b) => b[1].length - a[1].length)) {
      const e = list[0];
      console.log(`   - ${id} (${list.length}件): ${e.run.slice(0, 60)}  [${e.a} ≠ ${e.b}]`);
    }
    process.exitCode = 1;
  }
}


// --- 集合: 「最も多い場合」「少なくとも」が問いとして成立しているか ---
//
// 2つの集合の重なりが取りうる範囲は [a+b-全体, min(a,b)]。
// 片方が全員（max(a,b) === 全体）だと、この幅がゼロに潰れて重なりが
// 1つに固定される。そのとき「最も多い場合」と問うても選ぶ余地が無く、
// 最大値を考える問題として成立していない（実測13.5%がこれだった）。
//
// ⚠️ 答えは正しいので、答えを見る検査では捕まらない。
//    壊れているのは答えではなく「問い」のほう。
{
  const IDS = ["shugo_2set_03", "shugo_min_01"];   // 「最も多い場合」と「少なくとも」
  const N = 300;
  let checked = 0, degenerate = 0;
  const samples = [];

  for (const t of TEMPLATES.filter(x => IDS.indexOf(x.id) >= 0)) {
    for (let i = 0; i < N; i++) {
      const q = GEN.generateQuestion(t);
      if (!q) continue;
      // 問題文から読む。利用者が見る文面そのものを見たいので、内部の値は使わない。
      const m = String(q.text).match(/(\d+)人[^0-9]*?(\d+)人[^0-9]*?(\d+)人/);
      if (!m) continue;
      const total = +m[1], a = +m[2], b = +m[3];
      if (!(a <= total && b <= total)) continue;
      checked++;
      const hi = Math.min(a, b), lo = Math.max(0, a + b - total);
      if (hi === lo) {
        degenerate++;
        if (samples.length < 3) samples.push(`${t.id}: 全体${total} A${a} B${b} → 重なりは${hi}で固定`);
      }
    }
  }

  // 0件だと「退化が無い」ではなく「1問も見ていない」。文面の読み取りが
  // 壊れただけでも起こるので、ここで止める。
  cov.covered("集合の最大・最小で成立を確かめた問題", checked, 100);
  console.log(`\n集合「最も多い場合／少なくとも」の成立: ${checked}問を検証`);
  if (degenerate) {
    fail("集合", "問いが成立していない",
      `${degenerate}問で重なりが1つに固定されている（${(degenerate / checked * 100).toFixed(1)}%）: ${samples.join(" / ")}`);
    console.log(`   ❌ ${degenerate}問で答えが固定`);
  } else {
    console.log("   ✅ すべて重なりに幅があり、最大・最小を選ぶ意味がある");
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


// --- 答えの判定の細かさが、答えの刻みより細かいか ---
//
// app.js は以前 Math.abs(userAnswer - correctAnswer) < 0.15 で判定していた。
// 絶対値の許容幅は「答えが小さいほど甘くなる」。濃度算は答えが0.1刻みで
// 並ぶので、正解が 8 のときに 7.9 と入力しても正解になっていた。
// 間違えた人に「正解」と表示するのは、学習教材として最悪の壊れ方。
//
// ⚠️ 判定の細かさ（app.js）と答えの刻み（テンプレート）は別々の場所にある。
//    どちらかだけを動かすと静かに壊れるので、app.js から実際の値を読んで
//    突き合わせる。ここに数字を手で書き写すと、2箇所に同じ事実を持つことになる。
{
  const appRaw = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  // コメント行を落としてから見る。旧コードを引用した注釈まで拾ってしまい、
  // 直したのに落ち続ける（実際に自分の説明文を検出した）。
  // 誤検知を出す検査は、そのうち無視されるようになる。
  const appSrc = appRaw.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");

  const decM = appSrc.match(/var\s+ANSWER_DECIMALS\s*=\s*(\d+)\s*;/);
  if (!decM) {
    fail("app.js", "判定の桁が読めない",
      "ANSWER_DECIMALS が見つからない。判定の細かさを検査できないので、この検査は意味を持たない");
  }

  // 絶対値の許容幅に戻っていないか。戻ると答えが小さいほど甘くなる。
  if (/Math\.abs\(\s*userAnswer\s*-\s*correctAnswer\s*\)\s*<\s*[\d.]+/.test(appSrc)) {
    fail("app.js", "判定が絶対値の許容幅に戻っている",
      "答えが小さいほど甘くなる。濃度算では隣の値まで正解になる");
  }

  if (decM) {
    const decimals = +decM[1];
    // 丸めて一致を要求するので、実質の許容幅は半目盛り。
    const halfUnit = 0.5 * Math.pow(10, -decimals);
    const N = 300;
    let checked = 0, tooClose = 0;
    const samples = [];

    for (const t of TEMPLATES) {
      if (t.answerType === "choice" || t.answerType === "fraction") continue;
      const vals = new Set();
      for (let i = 0; i < N; i++) {
        const q = GEN.generateQuestion(t);
        if (!q) continue;
        const a = q.correctAnswer;
        if (typeof a === "number" && Number.isFinite(a)) vals.add(a);
      }
      if (vals.size < 2) continue;
      checked++;
      const arr = [...vals].sort((x, y) => x - y);
      let minGap = Infinity, pair = null;
      for (let i = 1; i < arr.length; i++) {
        const g = arr[i] - arr[i - 1];
        if (g > 1e-9 && g < minGap) { minGap = g; pair = [arr[i - 1], arr[i]]; }
      }
      // 隣り合う正解の間隔が許容幅の2倍以下だと、片方を入力しても
      // もう片方の正解として通ってしまう。
      if (minGap <= halfUnit * 2) {
        tooClose++;
        if (samples.length < 4) {
          samples.push(`${t.id}: 最小間隔 ${minGap.toFixed(4)}（${pair[0]} と ${pair[1]}）`);
        }
      }
    }

    // 0件だと「甘い判定が無い」ではなく「1つも見ていない」。
    cov.covered("答えの刻みを調べたテンプレート", checked, 30);
    console.log(`\n答えの判定の細かさ: ${checked}テンプレートを検査（判定は小数第${decimals}位・実質±${halfUnit}）`);
    if (!tooClose) {
      console.log("   ✅ どのテンプレートも、隣り合う正解が判定の幅より離れている");
    } else {
      fail("答えの判定", "判定が答えの刻みより粗い",
        `${tooClose}テンプレートで、誤答が正解と判定されうる: ${samples.join(" / ")}`);
      console.log(`   ❌ ${tooClose}テンプレートで誤答が正解になる`);
    }
  }
}

// --- 設問に書かれた比・分数が約分されているか ---
//
// 「A:B = 2:2」「□ × 4/6 = 16」は、比や分数の書き方として誤っている。
// 答えは正しく出るので、答えを見る検査では捕まらない。実測41.6%が未約分だった。
//
// 問題文そのものを読む。利用者が見る文面で判断したいのと、
// 内部の変数名がテンプレートごとに違うため。
{
  const gcd = (a, b) => { while (b) { const t = a % b; a = b; b = t; } return a; };
  const N = 200;
  let checked = 0, bad = 0;
  const samples = [];

  for (const t of TEMPLATES) {
    for (let i = 0; i < N; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !q.text) continue;
      const text = String(q.text);
      let sawAny = false, sawBad = false;

      // 比（a:b）。時刻（9:30）と紛れないよう、比の記述がある文だけを見る。
      if (/[:：]\s*\d/.test(text) && /比/.test(text + String(t.category || ""))) {
        for (const m of text.matchAll(/(\d+)\s*[:：]\s*(\d+)/g)) {
          const a = +m[1], b = +m[2];
          if (a < 1 || b < 1) continue;
          sawAny = true;
          if (gcd(a, b) > 1) { sawBad = true; samples.push(`${t.id}: ${a}:${b}`); }
        }
      }
      // 分数（a/b）。単位の「km/h」等と紛れないよう、両側が数字のものだけ。
      for (const m of text.matchAll(/(?<![\d.])(\d+)\s*\/\s*(\d+)(?![\d.])/g)) {
        const a = +m[1], b = +m[2];
        if (a < 1 || b < 1) continue;
        sawAny = true;
        if (gcd(a, b) > 1) { sawBad = true; samples.push(`${t.id}: ${a}/${b}`); }
      }
      if (sawAny) checked++;
      if (sawBad) bad++;
    }
  }

  // 0件だと「未約分が無い」ではなく「1つも見ていない」。
  cov.covered("比・分数を含む設問", checked, 100);
  console.log(`\n設問の比・分数が約分されているか: ${checked}問を検査`);
  if (!bad) {
    console.log("   ✅ すべて約分された形で書かれている");
  } else {
    fail("設問の比・分数", "約分されていない",
      `${bad}問（${(bad / checked * 100).toFixed(1)}%）: ${[...new Set(samples)].slice(0, 6).join(" / ")}`);
    console.log(`   ❌ 未約分 ${bad}問`);
  }
}

// --- 設問が2つの単位を同時に問っていないか ---
//
// 「何時間何分かかるか。（分単位で答えよ）」は、前半が「3時間20分」形式を求め、
// 後半が「200」を求めていて、読んだ人が二通りに解釈できる。
// 答えが1つの単位の数値なら、問いも同じ単位に揃っていなければならない。
//
// 選択式は「2勝1敗」のように選択肢そのものが複合なので対象外。
{
  const UNITS = ["時間", "分", "秒", "日", "円", "人", "個", "km", "m", "%",
                 "通り", "本", "枚", "冊", "g", "kg", "L"];
  let checked = 0;
  for (const t of TEMPLATES) {
    if (t.answerType === "choice") continue;      // 選択肢が複合の形は正常
    const txt = String(t.templateText || "");
    if (!txt) continue;
    checked++;
    const asked = UNITS.filter(u => txt.indexOf("何" + u) >= 0);
    if (asked.length > 1) {
      fail(t.id, "設問が2つの単位を問っている",
        `${asked.join(" / ")} … 答えは ${JSON.stringify(t.unit)} の1つ。読んだ人が二通りに解釈できる`);
    }
  }
  // 0件だと「食い違いが無い」ではなく「1つも見ていない」。
  cov.covered("設問の単位を調べたテンプレート", checked, 40);
  console.log(`\n設問が問う単位: ${checked}テンプレートを検査`);
}

// --- リーグ戦: 推論が要る問題になっているか ---
//
// 答えが正しくても、条件を読むだけで答えが出るなら推論問題ではない。
// 実測で61.0%がそうだった（型A 40.2% / 型B 20.8%）。難易度3の表示とも乖離する。
//
//   型A: 問い先が関わる対戦の勝敗がすべて書かれている → 数えるだけ
//   型B: 問い先以外の全チームの成績が書かれている → 合計から引くだけ
//
// ⚠️ 壊れているのは答えではなく「問い」のほうなので、
//    答えを見る検査（一意性・正解一致）では原理的に捕まらない。
//    問題文そのものを読む。
{
  const t = TEMPLATES.find(x => x.id === "suiron_league_01");
  const N = 400;
  let checked = 0, typeA = 0, typeB = 0, unparsed = 0;
  const samples = [];

  for (let i = 0; t && i < N; i++) {
    const q = GEN.generateQuestion(t);
    if (!q) continue;
    const head = String(q.text).match(/^(.+?) の(\d)チームが/);
    const whoM = String(q.text).match(/\n\n(.+?)の成績は何勝何敗か。/);
    if (!head || !whoM) { unparsed++; continue; }
    const nTeams = +head[2];
    const who = whoM[1].trim();
    const conds = String(q.text).split("\n").filter(l => l.startsWith("・"));
    checked++;

    // 問い先が関わる対戦のうち、勝敗が直接書かれているもの
    const own = new Set();
    let otherRecs = 0;
    for (const l of conds) {
      const b = l.match(/^・(.+?)は(.+?)に勝った$/);
      if (b) { if (b[1] === who) own.add(b[2]); else if (b[2] === who) own.add(b[1]); continue; }
      const r = l.match(/^・(.+?)は\d勝\d敗だった$/);
      if (r && r[1] !== who) otherRecs++;
    }
    if (own.size >= nTeams - 1) {
      typeA++;
      if (samples.length < 2) samples.push(`型A（全対戦が直書き）: ${who} / ${conds.join(" ")}`);
    } else if (otherRecs >= nTeams - 1) {
      typeB++;
      if (samples.length < 2) samples.push(`型B（他全チームの成績が直書き）: ${who} / ${conds.join(" ")}`);
    }
  }

  // 0件だと「推論不要が無い」ではなく「1問も見ていない」。
  // 問題文の読み取りが壊れただけでも起こるので、ここで止める。
  cov.covered("リーグ戦で推論の要否を調べた問題", checked, 100);
  if (unparsed) fail("suiron_league_01", "問題文を読めない", `${unparsed}問で見出しか問い先を取り出せない`);

  console.log(`\nリーグ戦の推論の要否: ${checked}問を検証`);
  if (typeA + typeB === 0) {
    console.log("   ✅ すべて条件を組み合わせないと答えが出ない");
  } else {
    fail("suiron_league_01", "推論が要らない",
      `${typeA + typeB}問（型A ${typeA} / 型B ${typeB} = ${((typeA + typeB) / checked * 100).toFixed(1)}%）: ${samples.join(" / ")}`);
    console.log(`   ❌ 推論不要 ${typeA + typeB}問（型A ${typeA} / 型B ${typeB}）`);
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


//
// 既存の検査（順位）とは見ているものが違う。両方要る。
//   既存 … 「常に最大を選ぶ」で当たらないか。順序が定義できるものだけが対象
//   これ … 「常に3番目」「最後は選ばない」で当たらないか。選択式すべてが対象
//
// 生の位置の偏りは順序を必要としない。人名でも語句でも
// 「3番目が正解になりやすい」は成立する。だから既存の除外理由
// （順序が定義できない）は、この検査には当てはまらない。
//
// ⚠️ 選択肢の数ごとにバケツを分ける。
//    suiron_order_01 は4択と5択が混在し、5番目は4択の問題には存在しない。
//    混ぜて数えると5番目だけ必ず低く出て、実在しない偏りを報告してしまう。
//
// ⚠️ 判定しなかったバケツ数を必ず出す。黙って飛ばすと「0件で緑」になる。
{
  const SAMPLES = 1200;      // 1テンプレートあたり
  const MIN_BUCKET = 200;    // これ未満のバケツは判定しない（標本が足りない）
  const LO = 0.5, HI = 1.5;  // 一様値の何倍まで許すか
  const SIGMA = 5;           // 標本誤差の何倍まで許すか

  // 標本誤差より十分ゆるいこと。4択・1200回なら一様値300、標準誤差は約15。
  // 0.5〜1.5倍（150〜450）は約10標準誤差ぶんの余裕があるので、
  // ノイズで落ちることはない。きつくすると誤検知になり、
  // 誤検知を出す検査は無視されるようになる。

  const biased = [];
  let templatesChecked = 0, bucketsChecked = 0, bucketsSkipped = 0;

  for (const t of TEMPLATES) {
    const buckets = new Map();          // 選択肢の数 → 位置ごとの回数
    for (let i = 0; i < SAMPLES; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !Array.isArray(q.choices)) continue;
      const n = q.choices.length;
      if (!buckets.has(n)) buckets.set(n, new Array(n).fill(0));
      const b = buckets.get(n);
      if (q.correctAnswer >= 0 && q.correctAnswer < n) b[q.correctAnswer]++;
    }
    if (!buckets.size) continue;        // 選択式でないテンプレートは対象外
    templatesChecked++;

    for (const [n, counts] of [...buckets.entries()].sort((a, b2) => a[0] - b2[0])) {
      const total = counts.reduce((a, b2) => a + b2, 0);
      if (total < MIN_BUCKET) { bucketsSkipped++; continue; }
      bucketsChecked++;
      const uniform = total / n;
      const pct = counts.map(c => (c / total * 100).toFixed(0) + "%");

      // 判定は2本立て。
      //
      // ① 一様値の LO〜HI 倍を外れたら失敗。分かりやすい歯止め。
      // ② 標本誤差の SIGMA 倍を超えて外れたら失敗。
      //
      // ②が要る理由: ①だけだと、標本が多いバケツの本物の偏りを取り逃す。
      // 実際 table_max_01 は [27,23,19,16,15]% と単調に減る偏りがあり
      //（同点のとき表の先頭が勝つ実装だった）、「最後は選ばない」で当たる。
      // それでも最大ずれは36%で、①の50%には届かなかった。
      // 標本3000回での標準誤差は約22なので、②で見れば9.6σの明確な偏りになる。
      //
      // ①を捨てて②だけにしないのは、標本の少ないバケツで σ が大きくなり
      // 際限なく緩くなるため。逆に①を厳しくすると、標本の少ないバケツが
      // ノイズで落ちる（suiron_order_01 の5択は266回しか集まらない）。
      const se = Math.sqrt(total * (1 / n) * (1 - 1 / n));
      const worstAbs = Math.max(...counts.map(c => Math.abs(c - uniform)));
      const outsideWindow = counts.some(c => c < uniform * LO || c > uniform * HI);
      const outsideSigma = worstAbs > SIGMA * se;
      if (outsideWindow || outsideSigma) {
        biased.push(
          `${t.id}（${n}択・${total}回）: [${pct.join(", ")}] 一様なら各${(100 / n).toFixed(0)}%`
          + `／最大ずれ ${(worstAbs / uniform * 100).toFixed(0)}%・${(worstAbs / se).toFixed(1)}σ`);
      }
    }
  }

  cov.covered("正解位置を調べたテンプレート", templatesChecked, 10);
  cov.covered("判定したバケツ", bucketsChecked, 10);
  cov.skipped("標本が足りず判定しなかったバケツ", bucketsSkipped, `${MIN_BUCKET}回未満`);

  console.log(`\n正解の位置の偏り: ${templatesChecked}テンプレ / ${bucketsChecked}バケツ（選択肢の数ごと）`);
  if (!biased.length) {
    console.log(`   ✅ どの位置も一様値の${LO}〜${HI}倍に収まっている`);
  } else {
    console.log(`   ❌ 位置に偏りのあるバケツ ${biased.length}件`);
    for (const b of biased) console.log(`   - ${b}`);
    process.exitCode = 1;
  }
}


// --- 「最も〜なものはどれか」の答えが1つに定まるか ---
//
// 【なぜ必要か】
// table_max_01 は同点のとき表の先頭を拾っており、**正解が2つ以上ある問題が
// 28.2%** あった。「1月の平均気温が最も高い都市はどこか」に答えが複数ある状態で、
// 別の都市を選んだ人が不正解にされていた。
//
// これは正解位置の偏りとして間接的に現れた（先頭が有利になる）が、
// 偏りの検査で捕まえるのは筋が悪い。実測で 5.5〜7.9σ と閾値5.0のすぐ上にしか
// 出ず、下振れした回は取り逃す（実際に1回すり抜けた）。
// **症状ではなく、一意性そのものを直接見る。**
//
// 【2つの独立した経路】
//   経路A … 生成器が正解として返したラベル
//   経路B … 解説に並んでいる数値から導き直した最大／最小
// 経路Bで最大が複数あれば、問いに答えが複数あることになる。
{
  const SAMPLES = 400;
  const MAXWORD = /最も(高|大き|多)/;
  const MINWORD = /最も(低|小さ|少な)/;

  let checked = 0, tied = 0, mismatched = 0, unparsed = 0;
  const examples = [];

  for (const t of TEMPLATES) {
    for (let i = 0; i < SAMPLES; i++) {
      const q = GEN.generateQuestion(t);
      if (!q || !Array.isArray(q.choices)) continue;
      // ラベルを選ばせる問題だけが対象。数値を答える問題は同点でも答えは1つ
      if (q.choices.every(c => !isNaN(Number(c)))) continue;
      const wantMax = MAXWORD.test(q.text), wantMin = MINWORD.test(q.text);
      if (!wantMax && !wantMin) continue;

      // 解説に並ぶ「ラベル: 数値」を拾う。選択肢にあるラベルだけを見る
      const vals = new Map();
      for (const line of String(q.explanation || "").split("\n")) {
        const m = line.match(/^\s*(.+?)\s*[:：]\s*(-?[\d,]+)/);
        if (!m) continue;
        const label = m[1].trim();
        if (q.choices.indexOf(label) === -1) continue;
        if (!vals.has(label)) vals.set(label, parseFloat(m[2].replace(/,/g, "")));
      }
      if (vals.size < 2) { unparsed++; continue; }

      checked++;
      const nums = [...vals.values()];
      const best = wantMax ? Math.max(...nums) : Math.min(...nums);
      const winners = [...vals.entries()].filter(([, v]) => v === best).map(([k]) => k);

      if (winners.length > 1) {
        tied++;
        if (examples.length < 3) examples.push(`${t.id}: ${winners.join(" と ")} が同値(${best}) で並んでいる`);
      } else if (winners[0] !== q.choices[q.correctAnswer]) {
        mismatched++;
        if (examples.length < 3) examples.push(`${t.id}: 正解は「${q.choices[q.correctAnswer]}」だが解説の値では「${winners[0]}」`);
      }
    }
  }

  cov.covered("「最も〜」を問う問題", checked, 100);
  cov.skipped("解説から値を読み取れなかった問題", unparsed, "ラベルと数値の並びが無い");

  console.log(`\n「最も〜」の答えの一意性: ${checked.toLocaleString()}問を解説の数値から導き直して検証`);
  if (checked && tied + mismatched === 0) {
    console.log("   ✅ すべて該当が1つに定まり、生成器の正解と一致");
  } else {
    console.log(`   ❌ 同値で並んでいる（正解が複数） ${tied} / 正解不一致 ${mismatched} / 検証数 ${checked}`);
    for (const e of examples) console.log(`   - ${e}`);
    process.exitCode = 1;
  }
}


// --- 正解が負になりうる設問に、符号の指示があるか ---
// ⚠️ 2026-08-26 に利用者から報告があった。「増減率は何%か」に符号の指示が無く、
//    減少のとき絶対値で答えると不正解になる。実測で正解が負なのは 33.7%。
//    設問文だけの修正なので、検査が無いと次の編集で簡単に戻る。
{
  let checked = 0, missing = 0;
  const examples = [];
  for (const t of TEMPLATES) {
    for (let i = 0; i < ITERATIONS; i++) {
      let q;
      try { q = GEN.generateQuestion(t); } catch (e) { continue; }
      if (!q || q.answerType !== "number") continue;
      const a = Number(q.correctAnswer);
      if (!Number.isFinite(a) || a >= 0) continue;   // 正解が負のものだけが対象
      checked++;
      if (!/マイナス|負の数|符号/.test(q.text || "")) {
        missing++;
        if (examples.length < 3) examples.push(`${t.id}: 正解 ${a} なのに設問に符号の指示が無い`);
      }
    }
  }
  cov.covered("正解が負になる問題", checked, 50);
  console.log(`\n負の正解に対する符号の指示: ${checked.toLocaleString()}問を検査`);
  if (checked && missing === 0) {
    console.log("   ✅ すべてに符号の指示がある");
  } else if (missing) {
    console.log(`   ❌ 符号の指示が無い ${missing}件`);
    for (const e of examples) console.log(`   - ${e}`);
    process.exitCode = 1;
  }
}


// --- 試験セットに、全テンプレートが出る機会があるか ---
// ⚠️ 2026-09-06に発覚: 分野内のテンプレートを catTemplates[i % length] で
//    ファイル順の先頭から固定で採っていた。20問の試験は1分野あたり1〜2問なので、
//    **96本中76本（79%）が一度も出題されない**状態だった。
//    数値はランダムなので問題は毎回変わり、例外も出ないので気づけない。
//    難易度の偏り（宣言した帯のうち難易度3が5%）もこれが原因だった。
{
  const set = new Set();
  const N = 300;
  for (let i = 0; i < N; i++) {
    for (const q of GEN.generateExamSet({
      totalQuestions: 20, selectedCategories: [], selectedDifficulties: [1, 2, 3]
    })) set.add(q.templateId);
  }
  const total = TEMPLATES.length;
  // 300回×20問=6,000問あれば、全テンプレートに十分な機会がある。
  // 1本でも出ないなら、選び方が偏っている。
  if (set.size < total) {
    const missing = TEMPLATES.filter(t => !set.has(t.id)).map(t => t.id);
    fail("試験に一度も出ないテンプレートがある",
      `${N}回の試験で ${set.size}/${total}本。出ない: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? " ほか" + (missing.length - 6) + "本" : ""}`);
  }
  cov.covered("試験セットで機会を調べたテンプレ", total, 80);
}

// --- テンプレート定義にキーの重複が無いか ---
// ⚠️ JSのオブジェクトリテラルは同じキーを2回書いてもエラーにならず、
//    あとの定義が黙って勝つ。2026-09-06に derive を手とスクリプトの
//    両方から入れてしまい、3本が二重定義になった。生成結果は正しいので
//    どの検査も緑のまま通った。「動くが意図と違う」を機械で捕まえる。
{
  const dupKeys = ["derive", "resolve", "answerFormula", "validate", "explanationTemplate",
                   "templateText", "variables", "id", "unit", "timeLimitSec", "probPair"];
  let checked = 0;
  // ソースを読んで、テンプレ1本ぶんの範囲でキーの出現回数を数える。
  // 実行後のオブジェクトでは重複が消えているので、テキストで見るしかない。
  const srcDir = path.join(__dirname, "..", "src", "questions");
  for (const f of fs.readdirSync(srcDir).filter(x => x.endsWith(".js") && x !== "_base.js")) {
    const text = fs.readFileSync(path.join(srcDir, f), "utf8");
    // 「id: "..."」から次の「id: "..."」までを1本ぶんとみなす
    const marks = [...text.matchAll(/^    id: "([a-z0-9_]+)",$/gm)];
    for (let i = 0; i < marks.length; i++) {
      const from = marks[i].index;
      const to = i + 1 < marks.length ? marks[i + 1].index : text.length;
      const body = text.slice(from, to);
      checked++;
      for (const k of dupKeys) {
        const n = (body.match(new RegExp("^    " + k + ":", "gm")) || []).length;
        if (n > 1) {
          fail("テンプレートのキーが重複している",
            `${marks[i][1]}: ${k} が${n}回。あとの定義が黙って勝つので、意図しない側が動く`);
        }
      }
    }
  }
  cov.covered("キーの重複を調べたテンプレ", checked, 80);
}

// --- 検査対象の内訳。合否より先に「何件見たか」を出す ---
console.log("\n検査した対象の内訳");
cov.print();
reportLateFailures();

if (cov.failures.length) {
  console.log(`   ❌ 検査対象が足りません ${cov.failures.length}件`);
  for (const p of cov.failures) console.log(`   - ${p}`);
  process.exitCode = 1;
} else {
  console.log("   ✅ どの検査も対象を取れている（0件で緑になっていない）");
}

process.exit(process.exitCode ? 1 : 0);
