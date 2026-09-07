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
// ⚠️ 2種類ある。
//   ① テンプレート自身が lang: "en" を宣言しているもの（英語専用の型）
//   ② 日本語のテンプレートを lang: "en" で生成したもの（語彙を言語で引く型）
//      図表（table/chart）はこちら。テンプレートは1つで、生成時に言語を渡す。
//      **②を見ないと、英語の面に日本語が混ざっても気づけない。**
const EN = TEMPLATES.filter(t => t.lang === "en");
// ⚠️ 「lang を受け取れる」と「英語化が済んでいる」は別。
//    引数を足しただけで中身が日本語のままのものが必ず出る（1本ずつ進めるため）。
//    **済んだものだけが i18n: true を宣言する。**宣言していないものは
//    「未着手」として扱い、この検査の対象にしない。
//    ⚠️ 黙って除外しない。何本が未着手かを必ず表示する（宿題を見えなくしない）。
const BILINGUAL = TEMPLATES.filter(t => t.lang !== "en" && t.i18n === true);
const NOT_YET = TEMPLATES.filter(t =>
  t.lang !== "en" && t.i18n !== true && (
    (typeof t.tableGenerator === "function" && t.tableGenerator.length > 0) ||
    (typeof t.chartGenerator === "function" && t.chartGenerator.length > 0) ||
    (typeof t.questionGenerator === "function" && t.questionGenerator.length > 1)));

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
// ⚠️ 「from 2022 to 2024」の「2022 to」を「数 + 名詞」と誤検知した（2026-09-07、
//    図表の英語化で実測）。前置詞・接続詞は数えられる名詞になりえないので飛ばす。
//    単位記号の教訓と同じで、除外は「名詞でありえない語」だけに絞る。
const NON_NOUNS = new Set(["to", "of", "and", "or", "in", "on", "at", "per", "by",
  "for", "from", "with", "as", "is", "are", "was", "were", "the"]);
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

// --- ルールの自己検査 ---
// わざと壊した文を、各ルールが本当に検出できるかを確かめる。
//
// ⚠️ これは以前「英語テンプレートが0件のとき」だけ実行していた。
//    つまり**検査対象がある本番の状況では一度も走っていなかった。**
//    誤検知を消すつもりでルールを緩めても、緩めすぎたことに誰も気づけない。
//    実際、DOUBLE_SPACE を 2 個以上 → 8 個以上に緩める変異が素通りした
//    （2026-09-07の全件実行）。ルールが機能していることは常に確かめる。
{
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
}

// --- 検査 ---
if (EN.length === 0 && BILINGUAL.length === 0) {
  // ⚠️ 0件は「問題なし」ではない。英語テンプレートがまだ無いというだけ。
  //    緑にするが、何も見ていないことを必ず表示する。
  console.log("英語の問題文を検査");
  console.log("   ℹ️ lang: \"en\" のテンプレートがまだ無いので、1件も見ていない");
  console.log("   ✅ 検査自体は動作している（テンプレートを足すと効き始める）");
} else {
  let checked = 0;
  const seen = new Set();
  const targets = EN.map(t => ({ t, lang: undefined }))
    .concat(BILINGUAL.map(t => ({ t, lang: "en" })));
  for (const { t, lang } of targets) {
    for (let i = 0; i < ITER; i++) {
      const q = lang ? GEN.generateQuestion(t, lang) : GEN.generateQuestion(t);
      if (!q) continue;
      checked++;
      const texts = [q.text, String(q.explanation || "")].concat(q.choices || []).filter(Boolean);
      // ⚠️ グラフは Canvas に描く。タイトル・軸ラベル・凡例（datasets[].label）・
      //    円グラフのサブタイトル（datasets[].subtitle）は chartConfig に入っていて
      //    text には出てこないが、画面には出る。ここを見ないと
      //    「問題文は英語なのにグラフだけ日本語」を誰も検出できない（2026-09-07 追加）。
      if (q.chartConfig) {
        const cc = q.chartConfig;
        // ⚠️ **キーを列挙しない。**title / yAxisLabel / labels / datasets[].label /
        //    datasets[].subtitle と個別に足していたら、**unit を入れ忘れて
        //    グラフ4本に「万円」が残ったまま緑になった**（2026-09-07に実測で発覚）。
        //    列挙は必ず漏れる。chartConfig の中の**すべての文字列**を見る。
        const ccTexts = [];
        (function walk(o) {
          if (typeof o === "string") { ccTexts.push(o); return; }
          if (Array.isArray(o)) { o.forEach(walk); return; }
          if (o && typeof o === "object") { Object.keys(o).forEach(k => walk(o[k])); }
        })(cc);
        // ⚠️ chartConfig は **日本語混入だけ**を見る。文として扱わない。
        //    「文字列を全部拾う」形にしたら type の値（bar / line / pie）まで
        //    拾ってしまい、「文頭が小文字」で5件の誤検知が出た。
        //    グラフの中身は文でも文章でもなく、ラベルと識別子が混ざっている。
        const JP_CC = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;
        for (const cs of ccTexts) {
          if (typeof cs !== "string" || !JP_CC.test(cs)) continue;
          if (seen.has("cc" + t.id + cs)) continue;
          seen.add("cc" + t.id + cs);
          fail("グラフに日本語が残っている", `${t.id}: 「${cs}」`);
        }
      }
      // ⚠️ 単位は「文」ではないので、文頭の大文字チェックにかけない
      //    （km を「文頭が小文字」と誤検知した）。
      //    ただし日本語混入だけは必ず見る。unitLabelFor は未翻訳のとき
      //    キー（日本語）をそのまま返すので、ここが最後の砦になる。
      const unitText = String(q.unit || "");
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
          if (NON_NOUNS.has(word)) continue;
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
          // ⚠️ 「Product A at +70」「Division A is larger」の A を冠詞と誤検知した
          //    （2026-09-07、図表の英語化で実測）。大文字始まりの語の直後に来る
          //    大文字の A / An は名前の一部とみなして飛ばす。文頭の A は前が
          //    改行や句読点なのでこの条件に当たらず、従来どおり検査される。
          if ((m[1] === "A" || m[1] === "An") && /[A-Z][A-Za-z]*\s$/.test(text.slice(0, m.index))) continue;
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

        // G2. CJKの記号が混ざっていないか
        // ⚠️ ①②③（CJK用の丸数字）と【】は、日本語の文字ではないので
        //    ひらがな・カタカナ・漢字の判定に引っかからない。だが**欧文フォント
        //    スタックでは豆腐（□）に化ける**うえ、日本の参考書の作法がそのまま
        //    出ているのが一目で分かる。英語圏のレビューで指摘された（2026-09-07）。
        const CJK_SYM = /[\u2460-\u2473\u3010\u3011\u3000\uff1a\uff08\uff09]/;
        if (CJK_SYM.test(text) && !seen.has("cs" + key)) {
          seen.add("cs" + key);
          fail("英語の面にCJKの記号が混ざっている",
            `${t.id}: 「${text.match(CJK_SYM)[0]}」… ${text.slice(0, 60)}`);
        }

        // G. 日本語が混ざっていないか
        // ⚠️ unitLabelFor は未翻訳のときキー（日本語）をそのまま返す。
        //    英語ページに日本語が混ざっても、画面上は「単位が出ている」ので
        //    誰も気づけない。**英語の面に日本語が1文字でもあれば落とす。**
        //    実際 table_sales_01 を英語化したとき、単位だけ「万円」で出た。
        const JP = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;
        if (JP.test(text) && !seen.has("jp" + key)) {
          seen.add("jp" + key);
          fail("英語の面に日本語が混ざっている",
            `${t.id}: 「${text.match(JP)[0]}」… ${text.slice(0, 60)}`);
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

      const JP_UNIT = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;
      if (JP_UNIT.test(unitText) && !seen.has("ju" + t.id + unitText)) {
        seen.add("ju" + t.id + unitText);
        fail("単位が日本語のまま", `${t.id}: 「${unitText}」（UNIT_LABELS に en の表記が無い）`);
      }
    }
  }
  cov.covered("英語のテンプレート", EN.length, 1);
  cov.covered("英語化が済んだテンプレート", BILINGUAL.length, 1);
  if (NOT_YET.length) {
    console.log(`   ℹ️ 英語化が未着手のテンプレート ${NOT_YET.length}本: `
      + NOT_YET.slice(0, 6).map(t => t.id).join(", ")
      + (NOT_YET.length > 6 ? ` ほか${NOT_YET.length - 6}本` : ""));
  }
  cov.covered("検査した生成結果", checked, 100);
}

// 英語の表に、日本の気候や日本の暮らしの数字がそのまま出ていないか。
//
// ⚠️ 言葉を英語にしただけでは、**中身が日本のまま**になる。
//    実際に起きた: 都市名を London / Manchester に変えても、気温は
//    東京の平年値（7月26℃）のままだった。英国の7月に26℃は無く、
//    読み手には「日本の教材を機械翻訳したもの」と分かる。
//    ネイティブ視点のレビューで指摘された類の破綻で、
//    語法の検査では絶対に捕まらない（英文としては正しいため）。
//
// 判定はゆるく、明らかにおかしいものだけを落とす。
// 英国の月平均気温は、いちばん暑い月でも20℃前後。ここでは23℃を上限にする。
// （ばらつき±2℃を足しても現実の範囲に収まり、日本の26℃基準なら必ず超える）
{
  const MAX_C = 23, MIN_C = -6;
  let cells = 0;
  const bad = [];

  // ⚠️ 表のセルは「21」で、単位は表の下に1度しか出ない。
  //    /(\d+)°C/ で拾おうとすると1件も見ずに緑になる（実際に空振りさせた）。
  //    単位が℃だと分かったら、そのあとに続く表の数値を全部読む。
  const cellsOf = (text) => {
    if (text.indexOf("°C") < 0) return [];
    const out = [];
    for (const line of text.split("\n")) {
      if (line.indexOf("|") < 0) continue;
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue;   // 区切り行
      for (const cell of line.split("|")) {
        const v = cell.trim();
        if (/^-?\d+$/.test(v)) out.push(Number(v));
      }
    }
    // 解説側は「21°C」の形で出る
    const re = /(-?\d+)\s*°C/g;
    let m;
    while ((m = re.exec(text)) !== null) out.push(Number(m[1]));
    return out;
  };

  for (const t of EN.concat(BILINGUAL)) {
    for (let i = 0; i < ITER; i++) {
      const q = t.lang === "en" ? GEN.generateQuestion(t) : GEN.generateQuestion(t, "en");
      if (!q) continue;
      const vals = cellsOf(String(q.text || "") + "\n" + String(q.explanation || ""));
      for (const c of vals) {
        cells++;
        if (c > MAX_C || c < MIN_C) bad.push(`${t.id}: ${c}°C`);
      }
    }
  }
  if (cells) {
    cov.covered("検査した気温の数値", cells, 100);
    if (bad.length) {
      const uniq = [...new Set(bad)];
      fail("英語の気温が現実離れ",
        `${bad.length}件（${MIN_C}〜${MAX_C}℃の外）: ` + uniq.slice(0, 4).join(", ")
        + (uniq.length > 4 ? ` ほか${uniq.length - 4}種` : ""));
    }
  }
}

// --- 出力 ---
if (EN.length || BILINGUAL.length) console.log(`英語の問題文を検査（専用${EN.length}本 + 言語対応${BILINGUAL.length}本 × ${ITER}回）`);
cov.print();
for (const p of cov.failures) failures.push({ rule: "検査対象", detail: p });
if (!failures.length) {
  if (EN.length) console.log("✅ 未展開・数と名詞の一致・冠詞・数値の見た目・空白・文頭のいずれも問題なし");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const f of failures) console.log(`  ${f.rule}: ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
