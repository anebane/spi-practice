#!/usr/bin/env node
/**
 * 画面の文言（app.js の UI_TEXT）が、言語をまたいで壊れていないか。
 *
 * 【なぜ必要か】
 * 2026-09-07に、画面の日本語45件を UI_TEXT という言語表に移した。
 * 出題を英語にできても画面が日本語のままなら英語版は出せないので、
 * 器としては必要な移設だが、**この移設は静かに壊れる形をしている**。
 *
 *   ・日本語の文言を1文字変えても、例外は出ない。既存の利用者の画面が変わるだけ
 *   ・英語の列にキーを足し忘れても、例外は出ない。undefined が画面に出るだけ
 *   ・英語の列に日本語が残っても、例外は出ない。英語の画面に日本語が出るだけ
 *   ・移設し忘れた文言が本体に残っても、例外は出ない。そこだけ日本語のまま出る
 *
 * どれも「動いているように見える」ので、気づけるのは公開後になる。
 * だから機械で止める。
 *
 * ⚠️ 日本語はベースライン（test/ui-text-baseline.json）と突き合わせる。
 *    src/questions/_base.js の単位表を移設したときと同じやり方で、
 *    「器を入れ替えただけのはずが表示が変わっていた」を捕まえるためのもの。
 *    文言を意図的に変えるときは、ベースラインも一緒に更新する。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const { Coverage } = require("./helpers/coverage");
const cov = new Coverage();

const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

const JP = /[぀-ゟ゠-ヿ㐀-䶿一-鿿＀-｠]/;

// --- UI_TEXT を app.js から取り出す ---
// app.js は IIFE で何も公開していないので、宣言のブロックだけを切り出して評価する。
const srcLines = fs.readFileSync(path.join(ROOT, "app.js"), "utf8").split("\n");
const startIdx = srcLines.findIndex(l => l.indexOf("var UI_TEXT = {") !== -1);
const endIdx = srcLines.findIndex((l, i) => i > startIdx && l === "  };");

let UI = null;
if (startIdx < 0 || endIdx < 0) {
  fail("UI_TEXT が見つからない", "app.js の 'var UI_TEXT = {' 〜 '  };' を切り出せなかった");
} else {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(srcLines.slice(startIdx, endIdx + 1).join("\n") + "\nthis.UI = UI_TEXT;", ctx);
  UI = ctx.UI;
}

// 可変部を持つ文言は関数なので、代表の引数を与えて文字列にする。
// ⚠️ 引数の見た目（数字か語か）で結果が変わるものがあるので、実際に出る形に近づける。
const ARGS = {
  shareText: ["MOCK_LABEL", 85, 17, 20, "MOCK_TAGS"],
  categoriesLabel: [11],
  categoryNote: ["MOCK_CAT"],
  alertError: ["MOCK_MSG"],
  timeRemaining: ["03", "07"],
  questionCategory: ["MOCK_CAT"],
  questionDifficulty: ["MOCK_DIFF"],
  questionNumber: [3, 20],
  feedbackSkipped: ["12"],
  feedbackIncorrect: ["9", "12"],
  peekAnswer: ["12"],
  resultDetail: [17, 20],
  categoryScore: [3, 4, 75, 42],
  ctaTitle: ["MOCK_CAT", 40],
  ctaButton: ["MOCK_CAT"],
  reviewProgress: [3, 20],
  reviewMeta: ["MOCK_CAT", "MOCK_DIFF"],
  yourAnswerLabel: ["9"],
  correctAnswerLabel: ["12"],
  // ⚠️ 単位の付け方は言語ごとに違う（ja「215 %」/ en「215%」）。
  //    引数は「記号の単位」を渡す。ここを "km" にすると両言語で同じ結果になり、
  //    差が出る場合を1つも見ないまま緑になる。
  formatWithUnit: [215, "%"]
};

function render(lang, key) {
  const v = UI[lang][key];
  if (typeof v !== "function") return String(v);
  const a = ARGS[key];
  if (!a) { fail("引数の見本が無い", `${key}: 関数だが ARGS に見本が登録されていない`); return null; }
  return String(v.apply(null, a));
}

if (UI) {
  const jaKeys = Object.keys(UI.ja || {});
  const enKeys = Object.keys(UI.en || {});

  // --- 1. 言語ごとにキーが揃っているか ---
  // ⚠️ 足りないキーは undefined として画面に出る。例外は出ない。
  const missingEn = jaKeys.filter(k => enKeys.indexOf(k) < 0);
  const extraEn = enKeys.filter(k => jaKeys.indexOf(k) < 0);
  if (missingEn.length) fail("en に無いキー", missingEn.join(", "));
  if (extraEn.length) fail("ja に無いキー", extraEn.join(", "));
  cov.covered("突き合わせたキー", jaKeys.length, 10);

  // --- 2. 関数の引数の数が言語間で同じか ---
  // ⚠️ 片方だけ引数を減らすと、その言語でだけ値が抜けた文になる。
  for (const k of jaKeys) {
    if (enKeys.indexOf(k) < 0) continue;
    const a = UI.ja[k], b = UI.en[k];
    if (typeof a !== typeof b) { fail("型が違う", `${k}: ja=${typeof a} / en=${typeof b}`); continue; }
    if (typeof a === "function" && a.length !== b.length) {
      fail("引数の数が違う", `${k}: ja=${a.length} / en=${b.length}`);
    }
  }

  // --- 3. 英語の列に日本語が混じっていないか ---
  let enChecked = 0;
  for (const k of enKeys) {
    const s = render("en", k);
    if (s === null) continue;
    enChecked++;
    if (JP.test(s)) fail("英語の文言に日本語", `${k}: 「${s}」`);
  }
  cov.covered("検査した英語の文言", enChecked, 10);

  // --- 4. 日本語の文言がベースラインと一致するか ---
  const basePath = path.join(__dirname, "ui-text-baseline.json");
  const current = {};
  for (const k of jaKeys) {
    const s = render("ja", k);
    if (s !== null) current[k] = s;
  }
  // ⚠️ 「ファイルが無い」だけを見ていると、**壊れて読めない**場合を取り逃す。
  //    さらに existsSync は変異で再現できない（ファイルを消す変異は書けない）ので、
  //    検査自体が「壊しても落ちるか」を確かめられない状態になる。
  //    読めなかった理由をまとめて1つの失敗にして、JSONを壊す変異で到達できるようにする。
  let base = null, baseErr = null;
  try {
    base = JSON.parse(fs.readFileSync(basePath, "utf8"));
    if (!base || typeof base !== "object" || Array.isArray(base)) {
      baseErr = "中身がオブジェクトではない";
    }
  } catch (e) {
    baseErr = e.message;
  }
  if (baseErr || !base) {
    fail("ベースラインが読めない",
      `${basePath}: ${baseErr || "読み込めなかった"}（意図せぬ表示変更を捕まえられない）`);
  } else {
    const diff = [];
    for (const k of Object.keys(base)) {
      if (!(k in current)) { diff.push(`${k}: 消えた`); continue; }
      if (current[k] !== base[k]) diff.push(`${k}: 「${base[k]}」→「${current[k]}」`);
    }
    for (const k of Object.keys(current)) {
      if (!(k in base)) diff.push(`${k}: ベースラインに未登録（新設なら追加すること）`);
    }
    if (diff.length) fail("日本語の表示が変わった", diff.slice(0, 6).join(" / ")
      + (diff.length > 6 ? ` ほか${diff.length - 6}件` : ""));
    cov.covered("ベースラインと照合した文言", Object.keys(base).length, 10);
  }
}

// --- 4b. 英語の単位の付け方が英語の書き方になっているか ---
// ⚠️ 日本語は「値＋半角空白＋単位」で全部いける（215 % / 530 円 / 600 km）。
//    英語はそうではなく、実際に「215 %」「530 £」と出ていた。
//    どちらも文字化けも例外も起こさず、画面には出ているので目視でも見落とす。
//    ベースライン照合（ja）にも日本語混入検査（en）にも引っかからない型なので、
//    出力の形そのものを見る。
if (UI && UI.en && typeof UI.en.formatWithUnit === "function") {
  const f = UI.en.formatWithUnit;
  const cases = [
    [[215, "%"], "215%", "百分率は空白を空けない"],
    [[530, "£"], "£530", "通貨は数の前に置く"],
    [[600, "km"], "600 km", "語の単位は空白を空けて後ろ"],
    [[23, "°C"], "23°C", "度数記号は空白を空けない"],
    [[5, ""], "5", "単位が無いときは値だけ"]
  ];
  let n = 0;
  for (const [args, want, why] of cases) {
    n++;
    const got = String(f.apply(null, args));
    if (got !== want) {
      fail("英語の単位の付け方", `${JSON.stringify(args)} → 「${got}」（「${want}」であるべき: ${why}）`);
    }
  }
  cov.covered("単位の付け方を調べた形", n, 5);
}

// --- 5. 移設漏れ: UI_TEXT の外に日本語の文字列が残っていないか ---
// ⚠️ コメントは対象外。文字列リテラルだけを見る。
{
  let leftover = 0;
  const samples = [];
  srcLines.forEach((line, i) => {
    if (i >= startIdx && i <= endIdx) return;
    const code = line.replace(/\/\/.*$/, "");
    const strs = code.match(/"[^"]*"|'[^']*'/g) || [];
    for (const s of strs) {
      if (JP.test(s)) {
        leftover++;
        if (samples.length < 4) samples.push(`app.js:${i + 1} ${s.slice(0, 40)}`);
      }
    }
  });
  if (leftover) fail("UI_TEXT の外に日本語の文字列", `${leftover}件: ${samples.join(" / ")}`);
  cov.covered("走査した行", srcLines.length, 100);
}

// --- 出力 ---
console.log("画面の文言: app.js の UI_TEXT を ja/en で突き合わせ");
cov.print();
for (const p of cov.failures) failures.push({ rule: "検査対象", detail: p });
if (!failures.length) {
  console.log("✅ キー・引数・英語の純度・日本語のベースライン・移設漏れのいずれも問題なし");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const f of failures) console.log(`  ${f.rule}: ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
