#!/usr/bin/env node
/**
 * 英語で生成した問題文の健全性。
 *
 * 【なぜ必要か】
 * 無限に出るということは、破綻も無限に出るということ。
 * 日本語では「Pはコーヒー選んでいない」「甲は福岡を住んでいるていない」が
 * 実際に生成され、あとから検査を書いた。英語は**壊れ方が違う**ので、
 * 日本語の検査（活用の二重化・助詞の欠落）はそのまま使えない。
 *
 * ⚠️ この検査が無いまま英語を出すことは、担保なしで無限に破綻を出すことと同じ。
 *    英語のテンプレートを1本でも足すなら、先にここが動いていること。
 *
 * 【方針】
 * 日本語版と同じく「**生成物に対して確実に言えること**」だけに絞る。
 * 英文法の一般的な正しさは判定しない。誤検知を出すルールは無視されるようになり、
 * 結果として本物を見逃す。見るのは次の6つだけ。
 *
 *   A. 未展開のプレースホルダ      {{x}} が残っている
 *   B. 数と名詞の一致             "1 hours" / "5 day"
 *   C. 冠詞の a / an              "a apple" / "an book"
 *   D. 数値の見た目               "0.30000000000000004" / "1200.0"
 *   E. 空白と句読点               二重空白 / " ?" / " ."
 *   F. 文頭の大文字               小文字で始まる文
 *
 * ⚠️ B と C は「変数が入る位置」でだけ判定する。地の文の文法は見ない。
 *    テンプレート作者が書いた固定文は、人が読んで直せばよい。
 *    機械で見る価値があるのは**生成のたびに変わる部分**だけ。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const ITER = Number(process.env.ITERATIONS || 200);
const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

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

// --- 読み込み ---
const ctx = { QUESTION_TEMPLATES: [], console, Math, Number, Array, Object, JSON, String,
  isNaN, parseInt, parseFloat, Date };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "questions.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "generator.js"), "utf8"), ctx);
const TEMPLATES = ctx.QUESTION_TEMPLATES;
const GEN = ctx.QuestionGenerator;

// lang: "en" を宣言しているテンプレートだけを見る。
// ⚠️ 宣言が無いものは日本語とみなす。英語を足すときは lang を必ず書く。
const EN = TEMPLATES.filter(t => t.lang === "en");

// --- 判定ルール ---

// A. 未展開のプレースホルダ
const UNRESOLVED = /\{\{\s*[A-Za-z_]\w*\s*\}\}/;

// B. 数と名詞の一致。
//    「1 + 単数形」「2以上 + 複数形」だけを確実な形として見る。
//    ⚠️ 不可算名詞（water, work, money）と、複数形が不規則なもの（people, feet）は
//       個別に持つ。ここに無い名詞は判定しない（誤検知を出さないため）。
const UNCOUNTABLE = new Set(["water", "work", "money", "salt", "juice", "milk", "time"]);

// ⚠️ 単位記号は複数形にならない（600 km であって 600 kms ではない）。
//    最初これを入れ忘れて、1テンプレートで**34件すべてが誤検知**になった。
//    日本語版のコメントにある「誤検知を出すルールは無視されるようになり、
//    結果として本物を見逃す」を、英語版でもそのまま踏んだ。
const UNIT_SYMBOLS = new Set(["km", "m", "cm", "mm", "kg", "g", "mg", "l", "ml",
  "h", "min", "s", "sec", "kmh", "mph", "yen", "usd", "eur", "gbp", "px", "kb", "mb"]);
const IRREGULAR = { person: "people", child: "children", foot: "feet", man: "men", woman: "women" };
function pluralOf(word) {
  if (IRREGULAR[word]) return IRREGULAR[word];
  if (/(s|x|z|ch|sh)$/.test(word)) return word + "es";
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + "ies";
  return word + "s";
}

// C. 冠詞。母音字で始まる語の前は an、それ以外は a。
//    ⚠️ 「an hour」「a university」のような発音由来の例外は、綴りでは判定できない。
//       例外語を持ち、そこは判定しない。
const ARTICLE_EXCEPTIONS = new Set(["hour", "hours", "honest", "honor", "university",
  "european", "one", "unit", "uniform", "user", "useful"]);

// D. 数値の見た目
const FLOAT_NOISE = /\d\.\d{9,}/;          // 浮動小数の誤差
const TRAILING_ZERO = /\b\d+\.0\b/;        // 整数なのに .0

// E. 空白と句読点
const DOUBLE_SPACE = /[^\n] {2,}[^\n]/;
const SPACE_BEFORE_PUNCT = / [.,?!;:]/;

// F. 文頭の大文字（英字で始まる文だけ見る。数式で始まる行は対象外）
function startsLowercase(line) {
  const m = line.trim().match(/^([A-Za-z])/);
  return m ? m[1] === m[1].toLowerCase() : false;
}

// --- 検査 ---
if (EN.length === 0) {
  // ⚠️ 0件は「問題なし」ではない。英語テンプレートがまだ無いというだけ。
  //    緑にするが、何も見ていないことを必ず表示する。
  console.log("英語の問題文を検査");
  console.log("   ℹ️ lang: \"en\" のテンプレートがまだ無いので、1件も見ていない");
  console.log("   ✅ 検査自体は動作している（テンプレートを足すと効き始める）");
  // 自己検査: ルールが壊れていないかを、わざと壊した文で確かめる。
  // テンプレートが0件でも、ルールが機能しているかは確かめられる。
  const probes = [
    ["未展開", "A train travels {{distance}} km.", UNRESOLVED],
    ["浮動小数の誤差", "The answer is 0.30000000000000004.", FLOAT_NOISE],
    ["余分な .0", "The price is 1200.0 dollars.", TRAILING_ZERO],
    ["二重空白", "The speed is  60 km per hour.", DOUBLE_SPACE],
    ["記号の前の空白", "How many ways are there ?", SPACE_BEFORE_PUNCT]
  ];
  let ok = 0;
  for (const [name, text, re] of probes) {
    if (re.test(text)) ok++;
    else fail("ルールの自己検査", `${name}: 壊れた文「${text}」を検出できない`);
  }
  cov.covered("ルールの自己検査", ok, 5);
} else {
  let checked = 0;
  const seen = new Set();
  for (const t of EN) {
    for (let i = 0; i < ITER; i++) {
      const q = GEN.generateQuestion(t);
      if (!q) continue;
      checked++;
      const texts = [q.text, String(q.explanation || "")].concat(q.choices || []).filter(Boolean);
      for (const text of texts) {
        const key = t.id + "|" + text.slice(0, 40);

        if (UNRESOLVED.test(text) && !seen.has("un" + key)) {
          seen.add("un" + key);
          fail("未展開のプレースホルダ", `${t.id}: ${text.match(UNRESOLVED)[0]} … ${text.slice(0, 60)}`);
        }
        if (FLOAT_NOISE.test(text) && !seen.has("fl" + key)) {
          seen.add("fl" + key);
          fail("浮動小数の誤差が出ている", `${t.id}: ${text.match(FLOAT_NOISE)[0]} … ${text.slice(0, 60)}`);
        }
        if (TRAILING_ZERO.test(text) && !seen.has("tz" + key)) {
          seen.add("tz" + key);
          fail("整数なのに .0 が付いている", `${t.id}: ${text.match(TRAILING_ZERO)[0]} … ${text.slice(0, 60)}`);
        }
        if (DOUBLE_SPACE.test(text) && !seen.has("ds" + key)) {
          seen.add("ds" + key);
          fail("空白が二重になっている", `${t.id}: ${text.slice(0, 60)}（変数が空のまま埋まった可能性）`);
        }
        if (SPACE_BEFORE_PUNCT.test(text) && !seen.has("sp" + key)) {
          seen.add("sp" + key);
          fail("記号の前に空白がある", `${t.id}: 「${text.match(SPACE_BEFORE_PUNCT)[0]}」… ${text.slice(0, 60)}`);
        }

        // B. 数と名詞の一致
        for (const m of text.matchAll(/\b(\d+)\s+([a-z]+)\b/g)) {
          const n = Number(m[1]);
          const word = m[2];
          if (UNCOUNTABLE.has(word)) continue;
          if (UNIT_SYMBOLS.has(word)) continue;
          const plural = pluralOf(word);
          const isPlural = Object.values(IRREGULAR).includes(word) || /s$/.test(word);
          if (n === 1 && isPlural && !seen.has("s1" + key + word)) {
            seen.add("s1" + key + word);
            fail("1なのに複数形", `${t.id}: 「${m[0]}」… ${text.slice(0, 60)}`);
          }
          if (n > 1 && !isPlural && plural !== word && !seen.has("s2" + key + word)) {
            seen.add("s2" + key + word);
            fail("2以上なのに単数形", `${t.id}: 「${m[0]}」（${plural} のはず）… ${text.slice(0, 60)}`);
          }
        }

        // C. 冠詞
        for (const m of text.matchAll(/\b(a|an|A|An)\s+([a-z]+)\b/g)) {
          const art = m[1].toLowerCase();
          const word = m[2];
          if (ARTICLE_EXCEPTIONS.has(word)) continue;
          const wantAn = /^[aeiou]/.test(word);
          if (wantAn && art === "a" && !seen.has("aa" + key + word)) {
            seen.add("aa" + key + word);
            fail("冠詞が a になっている", `${t.id}: 「${m[0]}」は an … ${text.slice(0, 60)}`);
          }
          if (!wantAn && art === "an" && !seen.has("an" + key + word)) {
            seen.add("an" + key + word);
            fail("冠詞が an になっている", `${t.id}: 「${m[0]}」は a … ${text.slice(0, 60)}`);
          }
        }

        // F. 文頭の大文字
        for (const line of text.split("\n")) {
          if (!line.trim()) continue;
          if (startsLowercase(line) && !seen.has("lc" + key)) {
            seen.add("lc" + key);
            fail("文頭が小文字", `${t.id}: ${line.slice(0, 60)}`);
          }
        }
      }
    }
  }
  cov.covered("英語のテンプレート", EN.length, 1);
  cov.covered("検査した生成結果", checked, 100);
}

// --- 出力 ---
if (EN.length) console.log(`英語の問題文を検査（${EN.length}テンプレ × ${ITER}回）`);
cov.print();
for (const p of cov.failures) failures.push({ rule: "検査対象", detail: p });
if (!failures.length) {
  if (EN.length) console.log("✅ 未展開・数と名詞の一致・冠詞・数値の見た目・空白・文頭のいずれも問題なし");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const f of failures) console.log(`  ${f.rule}: ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
