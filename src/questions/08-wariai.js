// カテゴリ8: 割合・比
// ============================================================

// 連続増減の向き。増→減 だけでなく 減→増・増→増・減→減 も出す。
// s は倍率の符号（+1 なら 1+r/100、-1 なら 1-r/100）。
var CONSEC_DIRECTIONS = [
  { s1:  1, s2: -1 },
  { s1: -1, s2:  1 },
  { s1:  1, s2:  1 },
  { s1: -1, s2: -1 }
];

// 何が増減するか。word() は向きに応じた動詞を返す。
// 「値上がり／値下がり」は価格にしか使えないので、対象ごとに語を分けている。
var CONSEC_SCENES = [
  { subject: "ある商品の価格", noun: "価格",   word: function (s) { return s > 0 ? "値上がり" : "値下がり"; } },
  { subject: "ある町の人口",   noun: "人口",   word: function (s) { return s > 0 ? "増加" : "減少"; } },
  { subject: "ある店の売上",   noun: "売上",   word: function (s) { return s > 0 ? "増加" : "減少"; } },
  { subject: "ある会の会員数", noun: "会員数", word: function (s) { return s > 0 ? "増加" : "減少"; } }
];

(function() {
  QUESTION_TEMPLATES.push({
    id: "wariai_basic_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 1,
    templateText: "ある学校の生徒数は{{total}}人で、そのうち{{percent}}%が女子である。女子の人数は何人か。",
    variables: {
      total: { type: "int", min: 100, max: 800, step: 50 },
      percent: { type: "choice", options: [20, 25, 30, 35, 40, 45, 50, 55, 60] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total * v.percent / 100;
    },
    unit: "人",
    explanationTemplate: "【考え方】\n割合の基本: 全体 × 割合(%) / 100 = 該当する部分の量\n\n【解法】\n① 女子の人数 = 全体 × 割合:\n  {{total}} × {{percent}}/100 = {{answer}}人\n\n【ポイント】\n・割合の3公式: 量=全体×割合、割合=量/全体、全体=量/割合\n・%は÷100、割(わり)は÷10で計算",
    timeLimitSec: 60,
    validate: function(v) {
      return Number.isInteger(v.total * v.percent / 100);
    }
  });

  QUESTION_TEMPLATES.push({
    id: "wariai_change_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 2,
    templateText: "ある商品の価格が{{original}}円から{{changed}}円に変わった。値上がり率は何%か。（小数点以下を四捨五入して答えよ）",
    variables: {
      original: { type: "int", min: 500, max: 5000, step: 100 },
      changed: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round((v.changed - v.original) / v.original * 100);
    },
    unit: "%",
    explanationTemplate: "【考え方】\n変化率(増加率) = 変化量 / もとの量 × 100\n基準は必ず「もとの量（変化前）」です。\n\n【解法】\n① 変化量（値上がり額）:\n  {{changed}} - {{original}} = {{diff}}円\n\n② 値上がり率:\n  {{diff}} / {{original}} × 100 = {{answer}}%\n\n【ポイント】\n・変化率の基準は「変化前の値」（変化後ではない！）\n・値下がりの場合: (元-後)/元 × 100 で求める\n・「○円が△円に」→ 基準は○円",
    timeLimitSec: 90
  });

  QUESTION_TEMPLATES.push({
    id: "wariai_ratio_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 2,
    templateText: "AとBの比が{{ratioA}}:{{ratioB}}で、合計が{{total}}のとき、Aはいくらか。",
    variables: {
      ratioA: { type: "int", min: 1, max: 7, step: 1 },
      ratioB: { type: "int", min: 1, max: 7, step: 1 },
      total: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total * v.ratioA / (v.ratioA + v.ratioB);
    },
    unit: "",
    explanationTemplate: "【考え方】\n比で分ける問題は「比の合計」で割って「各部分の比」をかけます。\n\n【解法】\n① 比の合計:\n  A:B = {{ratioA}}:{{ratioB}}\n  合計 = {{ratioA}} + {{ratioB}} = {{ratioSum}}\n\n② Aの値:\n  A = {{total}} × {{ratioA}} / {{ratioSum}} = {{answer}}\n\n【ポイント】\n・比で分ける = 全体 × (自分の比 / 比の合計)\n・A:B = 2:3 なら Aは全体の 2/5\n・比の各要素は「全体に対する割合」と考えてもよい",
    timeLimitSec: 90,
    validate: function(v) {
      // 比は約分した形でしか書かない（「3:6」は「1:2」と書くのが正しい）。
      var gcd = function(x, y) { while (y) { var t = x % y; x = y; y = t; } return x; };
      if (gcd(v.ratioA, v.ratioB) !== 1) return false;
      return v.ratioA !== v.ratioB && Number.isInteger(v.total * v.ratioA / (v.ratioA + v.ratioB));
    }
  });

  QUESTION_TEMPLATES.push({
    id: "wariai_increase_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 1,
    templateText: "ある工場の先月の生産量は{{original}}個だった。今月は先月より{{percent}}%増加した。今月の生産量は何個か。",
    variables: {
      original: { type: "int", min: 200, max: 2000, step: 100 },
      percent: { type: "choice", options: [5, 10, 15, 20, 25, 30] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.original * (1 + v.percent / 100);
    },
    unit: "個",
    explanationTemplate: "【考え方】\n「○%増加」= もとの値 × (1 + ○/100)。\n(1 + 増加率)が倍率になります。\n\n【解法】\n① 倍率を計算:\n  1 + {{percent}}/100 = {{multiplier}}\n\n② 今月の生産量:\n  {{original}} × {{multiplier}} = {{answer}}個\n\n【ポイント】\n・○%増加 → ×(1+○/100)、○%減少 → ×(1-○/100)\n・20%増 = 1.2倍、30%減 = 0.7倍\n・「○%の」と「○%増」は違う（30%の=×0.3、30%増=×1.3）",
    timeLimitSec: 60,
    validate: function(v) {
      return Number.isInteger(v.original * (1 + v.percent / 100));
    }
  });

  // 割合: 連続増減
  QUESTION_TEMPLATES.push({
    id: "wariai_consecutive_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 3,
    templateText: "{{q}}",
    variables: {
      percent1: { type: "choice", options: [5, 10, 15, 20, 25, 30, 40, 50, 60] },
      percent2: { type: "choice", options: [5, 10, 15, 20, 25, 30, 40, 50, 60] },
      dir:      { type: "int", min: 0, max: 3, step: 1 },
      scene:    { type: "int", min: 0, max: 3, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      var d = CONSEC_DIRECTIONS[v.dir % CONSEC_DIRECTIONS.length];
      var sc = CONSEC_SCENES[v.scene % CONSEC_SCENES.length];
      v._s1 = d.s1; v._s2 = d.s2;
      v.subject = sc.subject;
      v.noun = sc.noun;
      v.word1 = sc.word(d.s1);
      v.word2 = sc.word(d.s2);
      v.sign1 = d.s1 > 0 ? "+" : "-";
      v.sign2 = d.s2 > 0 ? "+" : "-";
      v.after1 = Math.round((1 + d.s1 * v.percent1 / 100) * 100 * 100) / 100;
      v.q = sc.subject + "が最初に" + v.percent1 + "%" + sc.word(d.s1) + "し、その後" + v.percent2
        + "%" + sc.word(d.s2) + "した。最終的な" + sc.noun + "は元の" + sc.noun + "の何%か。";
    },
    answerFormula: function(v) {
      return Math.round((1 + v._s1 * v.percent1/100) * (1 + v._s2 * v.percent2/100) * 100);
    },
    unit: "%",
    explanationTemplate: "【考え方】\n連続増減の問題。増減率を「倍率」に変換して順にかけます。\n同じ率で上がって下がっても元に戻らないことに注意！\n\n【解法】\n① 元の{{noun}}を100とする\n\n② {{percent1}}%{{word1}}した後:\n  100 × (1 {{sign1}} {{percent1}}/100) = {{after1}}\n\n③ さらに{{percent2}}%{{word2}}した後:\n  {{after1}} × (1 {{sign2}} {{percent2}}/100) = {{answer}}%\n\n【ポイント】\n・連続変化 = 倍率のかけ算。足し引きではない\n・20%増 → 20%減 = 100 × 1.2 × 0.8 = 96（元に戻らない!）\n・「同率の増減は必ず元より小さくなる」のがSPI定番のひっかけ",
    timeLimitSec: 90,
    validate: function(v) {
      var result = (1 + v._s1 * v.percent1/100) * (1 + v._s2 * v.percent2/100) * 100;
      // 100%ちょうどに戻る組は「元に戻らない」という論点が消えるので出さない
      return Math.abs(result - Math.round(result)) < 0.01 && Math.round(result) !== 100;
    }
  });

  // 割合: 3つの比
  QUESTION_TEMPLATES.push({
    id: "wariai_ratio3_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 2,
    templateText: "A, B, C の3人でお金を分ける。A:B = {{ab1}}:{{ab2}}、B:C = {{bc1}}:{{bc2}} のとき、合計{{total}}円をこの比で分けると、Bの取り分はいくらか。",
    variables: {
      ab1: { type: "int", min: 1, max: 5, step: 1 },
      ab2: { type: "int", min: 1, max: 5, step: 1 },
      bc1: { type: "int", min: 1, max: 5, step: 1 },
      bc2: { type: "int", min: 1, max: 5, step: 1 },
      total: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      // A:B = ab1:ab2, B:C = bc1:bc2
      // Bを揃える: A:B:C = ab1*bc1 : ab2*bc1 : ab2*bc2
      var a = v.ab1 * v.bc1;
      var b = v.ab2 * v.bc1;
      var c = v.ab2 * v.bc2;
      return Math.round(v.total * b / (a + b + c));
    },
    unit: "円",
    explanationTemplate: "【考え方】\n2つの比を「連比」にまとめる問題。\n共通の項（ここではB）の値を揃えます。\n\n【解法】\n① 2つの比を確認:\n  A:B = {{ab1}}:{{ab2}}\n  B:C = {{bc1}}:{{bc2}}\n\n② Bの値を揃える（最小公倍数に）:\n  A:B:C = {{a}}:{{b}}:{{c}}\n\n③ Bの取り分:\n  {{total}} × {{b}} / ({{a}}+{{b}}+{{c}}) = {{answer}}円\n\n【ポイント】\n・連比のコツ: 共通の文字（B）を最小公倍数に揃える\n・A:B=2:3、B:C=3:4 → B=3で揃う → A:B:C=2:3:4\n・A:B=2:3、B:C=2:5 → B=6に揃える → A:B:C=4:6:15",
    timeLimitSec: 120,
    validate: function(v) {
      // 比は約分した形でしか書かない。「A:B = 2:2」「3:3」「2:4」は
      // 比として書き方が誤っている（実測41.6%が未約分だった）。
      var gcd = function(x, y) { while (y) { var t = x % y; x = y; y = t; } return x; };
      if (gcd(v.ab1, v.ab2) !== 1) return false;
      if (gcd(v.bc1, v.bc2) !== 1) return false;
      var a = v.ab1 * v.bc1;
      var b = v.ab2 * v.bc1;
      var c = v.ab2 * v.bc2;
      return Number.isInteger(v.total * b / (a + b + c));
    }
  });

  // 割合: 人口増減
  QUESTION_TEMPLATES.push({
    id: "wariai_population_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 3,
    templateText: "ある市の人口は去年{{population}}人だった。今年は男性が{{maleChange}}%増加し、女性が{{femaleChange}}%減少した。去年の男女比が{{maleRatio}}:{{femaleRatio}}のとき、今年の人口は何人か。",
    variables: {
      population: { type: "int", min: 10000, max: 50000, step: 5000 },
      maleChange: { type: "choice", options: [5, 8, 10] },
      femaleChange: { type: "choice", options: [3, 5, 8] },
      maleRatio: { type: "int", min: 1, max: 3, step: 1 },
      femaleRatio: { type: "int", min: 1, max: 3, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var totalRatio = v.maleRatio + v.femaleRatio;
      var male = v.population * v.maleRatio / totalRatio;
      var female = v.population - male;
      var newMale = Math.round(male * (1 + v.maleChange/100));
      var newFemale = Math.round(female * (1 - v.femaleChange/100));
      return newMale + newFemale;
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「比で分けてから増減率をかける」複合問題。\n①比から人数を求める → ②各群に増減率を適用 → ③合計\n\n【解法】\n① 去年の男女の人数（比で分ける）:\n  男性: {{population}} × {{maleRatio}}/{{totalRatio}} = {{male}}人\n  女性: {{population}} × {{femaleRatio}}/{{totalRatio}} = {{female}}人\n\n② 今年の人数（増減率を適用）:\n  男性: {{male}} × (1+{{maleChange}}/100) = {{newMale}}人\n  女性: {{female}} × (1-{{femaleChange}}/100) = {{newFemale}}人\n\n③ 今年の人口:\n  {{newMale}} + {{newFemale}} = {{answer}}人\n\n【ポイント】\n・比 → 実数に変換してから増減を計算する\n・男女で増減率が違う → 全体の増減率は単純平均にならない\n・人口問題はSPIで頻出（比+割合の複合問題）",
    timeLimitSec: 150,
    validate: function(v) {
      // 男女比も約分した形でしか書かない（「3:3」は「1:1」）。
      var gcd = function(x, y) { while (y) { var t = x % y; x = y; y = t; } return x; };
      if (gcd(v.maleRatio, v.femaleRatio) !== 1) return false;
      var totalRatio = v.maleRatio + v.femaleRatio;
      var male = v.population * v.maleRatio / totalRatio;
      var female = v.population - male;
      return Number.isInteger(male) && Number.isInteger(male * (1 + v.maleChange/100)) && Number.isInteger(female * (1 - v.femaleChange/100));
    }
  });
})();
