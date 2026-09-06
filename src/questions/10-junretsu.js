// カテゴリ10: 順列・組み合わせ
// ============================================================
// 公式が1本しかない型なので、数値だけを振っても「n人からr人」の
// 同じ文面が延々と出る。場面を差し替えて、同じ公式でも別の問題として
// 読めるようにしている。式そのものは変えていないので難易度は変わらない。
// ============================================================

// 選んで並べる（順列）場面
var PERM_PICK_SCENES = [
  function (n, r) { return n + "人の中から" + r + "人を選んで一列に並べる方法は何通りあるか。"; },
  function (n, r) { return n + "冊の本の中から" + r + "冊を選び、本棚に左から順に並べる方法は何通りあるか。"; },
  function (n, r) { return n + "人の部員の中から" + r + "人を選んで、リレーの走順を決める方法は何通りあるか。"; },
  function (n, r) { return n + "色の絵の具から" + r + "色を選び、旗を上から順に塗り分ける方法は何通りあるか。"; },
  function (n, r) { return n + "枚のカードから" + r + "枚を取り出して、左から並べる方法は何通りあるか。"; },
  function (n, r) { return n + "種類の料理から" + r + "品を選び、コースの提供順を決める方法は何通りあるか。"; },
  function (n, r) { return n + "曲の候補から" + r + "曲を選び、発表会の演奏順を決める方法は何通りあるか。"; }
];

// 選ぶだけ（組み合わせ）場面
var COMB_PICK_SCENES = [
  function (n, r) { return n + "人の中から" + r + "人を選ぶ方法は何通りあるか。"; },
  function (n, r) { return n + "種類のケーキから" + r + "種類を選ぶ方法は何通りあるか。"; },
  function (n, r) { return n + "人の候補者から" + r + "人の委員を選ぶ方法は何通りあるか。"; },
  function (n, r) { return n + "冊の本から" + r + "冊を借りる方法は何通りあるか。"; },
  function (n, r) { return n + "個の商品から" + r + "個をまとめて買う方法は何通りあるか。"; },
  function (n, r) { return n + "枚のカードから" + r + "枚を同時に引く方法は何通りあるか。"; },
  function (n, r) { return n + "か所の観光地から" + r + "か所を選んで訪れる方法は何通りあるか。（回る順は考えない）"; }
];

// 隣り合う条件つき順列の場面
var PERM_ADJACENT_SCENES = [
  function (n, k) { return n + "人を一列に並べるとき、特定の" + k + "人が隣り合う並べ方は何通りあるか。"; },
  function (n, k) { return n + "冊の本を本棚に並べるとき、特定の" + k + "冊が隣り合う並べ方は何通りあるか。"; },
  function (n, k) { return n + "人が横一列に並んで写真を撮るとき、特定の" + k + "人が隣り合う並び方は何通りあるか。"; },
  function (n, k) { return n + "個の箱を一列に置くとき、特定の" + k + "個が隣り合う置き方は何通りあるか。"; },
  function (n, k) { return n + "枚のカードを左から並べるとき、特定の" + k + "枚が隣り合う並べ方は何通りあるか。"; },
  function (n, k) { return n + "種類の料理を一列に配膳するとき、特定の" + k + "品が隣り合う並べ方は何通りあるか。"; },
  function (n, k) { return n + "両の車両を連結するとき、特定の" + k + "両が隣り合うつなぎ方は何通りあるか。"; }
];

// 円順列の場面
var PERM_CIRCLE_SCENES = [
  function (n) { return n + "人が円形のテーブルに座る方法は何通りあるか。"; },
  function (n) { return n + "人が丸いテーブルを囲んで座る座り方は何通りあるか。"; },
  function (n) { return n + "個の飾りを円形のリースに等間隔で取り付ける方法は何通りあるか。"; },
  function (n) { return n + "人が輪になって手をつなぐとき、並び方は何通りあるか。"; },
  function (n) { return n + "種類の料理を回転テーブルに等間隔で並べる方法は何通りあるか。"; },
  function (n) { return n + "人が円卓に着席する方法は何通りあるか。"; },
  function (n) { return n + "本の旗を円形の広場に等間隔で立てる方法は何通りあるか。"; },
  function (n) { return n + "色のランプを円形に等間隔で配置する方法は何通りあるか。"; },
  function (n) { return n + "個のケーキを円形の皿に等間隔で並べる方法は何通りあるか。"; },
  function (n) { return n + "枚の写真を円形のボードに等間隔で貼る方法は何通りあるか。"; }
];

// 役職を割り当てる（順列）場面
var PERM_ROLE_SCENES = [
  function (n) { return n + "人の中から委員長1人、副委員長1人、書記1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "人の部員から部長1人、副部長1人、会計1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "人の社員からリーダー1人、サブリーダー1人、記録係1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "人の候補から会長1人、副会長1人、書記1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "チームの中から優勝、準優勝、第3位を決める方法は何通りあるか。"; },
  function (n) { return n + "人の応募者から金賞1人、銀賞1人、銅賞1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "人の中から主将1人、副主将1人、マネージャー1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "点の作品から最優秀賞1点、優秀賞1点、佳作1点を選ぶ方法は何通りあるか。"; }
];

// 最短経路の場面
var PATH_SCENES = [
  function (r, u) { return "右に" + r + "回、上に" + u + "回進んで目的地に着く最短経路は何通りあるか。"; },
  function (r, u) { return "碁盤の目状の道を、東に" + r + "区画、北に" + u + "区画進んで目的地へ向かう最短経路は何通りあるか。"; },
  function (r, u) { return "格子状の通路を、右へ" + r + "マス、上へ" + u + "マス移動する最短の道順は何通りあるか。"; },
  function (r, u) { return "駅から図書館まで、東に" + r + "ブロック、北に" + u + "ブロック進む。遠回りをしない行き方は何通りあるか。"; },
  function (r, u) { return "マス目の左上から、右に" + r + "マス・下に" + u + "マス進んでゴールに着く最短経路は何通りあるか。"; }
];

// 「特定の1つが端に来ない」場面。pos は解説でそのまま使う位置の呼び名。
var PERM_EXCLUDE_SCENES = [
  { pos: "先頭",     thing: "人",   text: function (n) { return n + "人を一列に並べるとき、特定の1人が先頭にならない並べ方は何通りあるか。"; } },
  { pos: "左端",     thing: "本",   text: function (n) { return n + "冊の本を本棚に並べるとき、特定の1冊が左端にならない並べ方は何通りあるか。"; } },
  { pos: "第1走者",  thing: "人",   text: function (n) { return n + "人でリレーの走順を決めるとき、特定の1人が第1走者にならない決め方は何通りあるか。"; } },
  { pos: "一番左",   thing: "カード", text: function (n) { return n + "枚のカードを左から並べるとき、特定の1枚が一番左にならない並べ方は何通りあるか。"; } },
  { pos: "最後尾",   thing: "人",   text: function (n) { return n + "人が縦一列に並ぶとき、特定の1人が最後尾にならない並び方は何通りあるか。"; } },
  { pos: "右端",     thing: "箱",   text: function (n) { return n + "個の箱を一列に置くとき、特定の1個が右端にならない置き方は何通りあるか。"; } },
  { pos: "1曲目",    thing: "曲",   text: function (n) { return n + "曲の演奏順を決めるとき、特定の1曲が1曲目にならない決め方は何通りあるか。"; } },
  { pos: "最初",     thing: "議題", text: function (n) { return n + "件の議題を扱う順番を決めるとき、特定の1件が最初にならない決め方は何通りあるか。"; } },
  { pos: "1番目",    thing: "商品", text: function (n) { return n + "個の商品を陳列する順番を決めるとき、特定の1個が1番目にならない決め方は何通りあるか。"; } },
  { pos: "先発",     thing: "選手", text: function (n) { return n + "人の選手の登板順を決めるとき、特定の1人が先発にならない決め方は何通りあるか。"; } }
];

(function() {
  QUESTION_TEMPLATES.push({
    id: "junretsu_basic_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      var calc = [];
      for (var pi = 0; pi < v.r; pi++) calc.push(v.n - pi);
      d.calculation = calc.join(" × ");
      return d;
    },
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 4, max: 10, step: 1 },
      r:     { type: "int", min: 2, max: 5, step: 1 },
      scene: { type: "int", min: 0, max: 6, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = PERM_PICK_SCENES[v.scene % PERM_PICK_SCENES.length](v.n, v.r);
    },
    answerFormula: function(v) {
      return permutation(v.n, v.r);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「選んで並べる」→ 順列(P)を使います。\n順番が区別される（1番目と2番目が違う）場合は順列。\n\n【解法】\n① 順列の公式: P(n, r) = n! / (n-r)!\n  = n × (n-1) × ... × (n-r+1)\n\n② P({{n}}, {{r}}) = {{calculation}} = {{answer}}通り\n\n【ポイント】\n・順列(P): 順番を区別する → 並べ方の数\n・組み合わせ(C): 順番を区別しない → 選び方の数\n・P(n,r) = C(n,r) × r!（並べ方 = 選び方 × 並べる順番）",
    timeLimitSec: 90,
    validate: function(v) {
      return v.r <= v.n - 1;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "kumiawase_basic_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      var kn = v.n, kr = v.r, topTerms = [];
      for (var ki = 0; ki < kr; ki++) topTerms.push(kn - ki);
      var kfact = 1;
      for (var kj = 2; kj <= kr; kj++) kfact *= kj;
      d.calculation = topTerms.join(" × ") + (kfact > 1 ? " / " + kfact : "");
      return d;
    },
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 5, max: 12, step: 1 },
      r:     { type: "int", min: 2, max: 5, step: 1 },
      scene: { type: "int", min: 0, max: 6, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = COMB_PICK_SCENES[v.scene % COMB_PICK_SCENES.length](v.n, v.r);
    },
    answerFormula: function(v) {
      return combination(v.n, v.r);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「選ぶだけ（順番なし）」→ 組み合わせ(C)を使います。\n「委員を選ぶ」「チームを作る」などは組み合わせ。\n\n【解法】\n① 組み合わせの公式: C(n, r) = n! / (r! × (n-r)!)\n\n② C({{n}}, {{r}}) = {{calculation}} = {{answer}}通り\n\n【ポイント】\n・C(n,r) = P(n,r) / r!（順列を「順番の重複」で割る）\n・C(n,r) = C(n, n-r) の性質あり（例: C(7,5) = C(7,2)）\n・計算のコツ: 小さい方のrを使うと計算が楽",
    timeLimitSec: 90,
    validate: function(v) {
      return v.r <= v.n - 1;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "junretsu_cond_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 4, max: 9, step: 1 },
      k:     { type: "int", min: 2, max: 3, step: 1 },
      scene: { type: "int", min: 0, max: 6, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = PERM_ADJACENT_SCENES[v.scene % PERM_ADJACENT_SCENES.length](v.n, v.k);
      // 解説で使う値。generator.js の computeDerivedVars ではなくここで作る
      // （k を可変にしたので、2人固定を前提にした式では合わなくなる）
      v.blocks = v.n - v.k + 1;
      v.blockPerm = factorial(v.n - v.k + 1);
      v.innerPerm = factorial(v.k);
    },
    answerFormula: function(v) {
      return factorial(v.n - v.k + 1) * factorial(v.k);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「隣り合う」条件付き順列。隣り合うものを1つのブロックとみなして\nまとめて並べ、ブロック内の並び順を掛けます。\n\n【解法】\n① 特定の{{k}}つを1つのブロック（かたまり）として扱う\n  → 全体は「ブロック + 残り」= {{blocks}}組になる\n\n② {{blocks}}組の並べ方:\n  {{blocks}}! = {{blockPerm}}通り\n\n③ ブロック内の{{k}}つの並び順:\n  {{k}}! = {{innerPerm}}通り\n\n④ 合計: {{blockPerm}} × {{innerPerm}} = {{answer}}通り\n\n【ポイント】\n・「隣り合う」→ まとめて1ブロック → (n-k+1)! × k!\n・「隣り合わない」→ 全体 - 隣り合う で求めるのが楽\n・ブロック内の並び順を掛け忘れるのが最も多い間違い",
    timeLimitSec: 120,
    validate: function(v) {
      return v.k <= v.n - 1;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "kumiawase_cond_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.boysComb = combination(v.boys, v.selectBoys);
      d.girlsComb = combination(v.girls, v.selectGirls);
      return d;
    },
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "男子{{boys}}人と女子{{girls}}人の中から、男子{{selectBoys}}人と女子{{selectGirls}}人を選ぶ方法は何通りあるか。",
    variables: {
      boys: { type: "int", min: 3, max: 6, step: 1 },
      girls: { type: "int", min: 3, max: 6, step: 1 },
      selectBoys: { type: "int", min: 1, max: 3, step: 1 },
      selectGirls: { type: "int", min: 1, max: 3, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return combination(v.boys, v.selectBoys) * combination(v.girls, v.selectGirls);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n条件ごとに独立して選ぶ場合は「積の法則」を使います。\n男子の選び方 × 女子の選び方 = 全体の選び方。\n\n【解法】\n① 男子の選び方:\n  C({{boys}}, {{selectBoys}}) = {{boysComb}}通り\n\n② 女子の選び方:\n  C({{girls}}, {{selectGirls}}) = {{girlsComb}}通り\n\n③ 積の法則（独立なので掛け算）:\n  {{boysComb}} × {{girlsComb}} = {{answer}}通り\n\n【ポイント】\n・独立した選択 → かけ算（積の法則）\n・同時に起こる選択 → かけ算、どちらか → 足し算（和の法則）\n・「男子○人と女子△人」→ 別々に選んでかけ算",
    timeLimitSec: 120,
    validate: function(v) {
      return v.selectBoys <= v.boys && v.selectGirls <= v.girls;
    }
  });

  // 順列: 円順列
  QUESTION_TEMPLATES.push({
    id: "junretsu_circle_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.nMinus1 = v.n - 1;
      return d;
    },
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 4, max: 10, step: 1 },
      scene: { type: "int", min: 0, max: 9, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = PERM_CIRCLE_SCENES[v.scene % PERM_CIRCLE_SCENES.length](v.n);
    },
    answerFormula: function(v) {
      return factorial(v.n - 1);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n円形に並べる「円順列」は、回転を同一視するため1つを固定します。\n直線の順列(n!)から回転分(n通り)を割ります。\n\n【解法】\n① 円順列の公式: (n-1)!\n  1つを固定し、残り(n-1)個の並べ方を数える\n\n② ({{n}}-1)! = {{nMinus1}}! = {{answer}}通り\n\n【ポイント】\n・直線の順列: n!、円順列: (n-1)!\n・なぜ(n-1)!か: 回転して同じ並びはn通りあるので n!/n = (n-1)!\n・さらに裏返しも同じとする場合: (n-1)!/2（じゅず順列）",
    timeLimitSec: 90
  });

  // 組合せ: 役職の割り当て
  QUESTION_TEMPLATES.push({
    id: "kumiawase_committee_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.nM1 = v.n - 1;
      d.nM2 = v.n - 2;
      return d;
    },
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 5, max: 14, step: 1 },
      scene: { type: "int", min: 0, max: 7, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = PERM_ROLE_SCENES[v.scene % PERM_ROLE_SCENES.length](v.n);
    },
    answerFormula: function(v) {
      return v.n * (v.n - 1) * (v.n - 2);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n3つの役割が互いに異なるので、誰がどれになるかが区別されます。\nこれは「順列」の問題です（選んで割り当てる）。\n\n【解法】\n① 1つ目の選び方: {{n}}通り\n② 2つ目の選び方: {{nM1}}通り（1つ目以外）\n③ 3つ目の選び方: {{nM2}}通り（1つ目・2つ目以外）\n\n④ 合計: {{n}} × {{nM1}} × {{nM2}} = {{answer}}通り\n  = P({{n}}, 3)\n\n【ポイント】\n・役割が区別される → 順列（誰がどれかで区別）\n・区別しない（3人選ぶだけ）→ 組み合わせ C(n,3)\n・P(n,3) = C(n,3) × 3!（3つの役の並べ方6通り分の差）",
    timeLimitSec: 90
  });

  // 組合せ: 最短経路
  QUESTION_TEMPLATES.push({
    id: "kumiawase_path_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.total = v.right + v.up;
      return d;
    },
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 3,
    templateText: "{{q}}",
    variables: {
      right: { type: "int", min: 2, max: 7, step: 1 },
      up:    { type: "int", min: 2, max: 6, step: 1 },
      scene: { type: "int", min: 0, max: 4, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = PATH_SCENES[v.scene % PATH_SCENES.length](v.right, v.up);
    },
    answerFormula: function(v) {
      return combination(v.right + v.up, v.up);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n最短経路問題は「2方向の移動をどの順に行うか」の組み合わせ。\n全移動回数の中から「片方の方向に進む回」を選ぶ問題に帰着します。\n\n【解法】\n① 全移動回数:\n  {{right}}回 + {{up}}回 = {{total}}回\n\n② この{{total}}回の中から、片方の方向に進む{{up}}回を選ぶ:\n  C({{total}}, {{up}}) = {{answer}}通り\n\n【ポイント】\n・最短経路 = 同じものを含む順列 = 組み合わせ\n・C(合計, 一方) = C(合計, もう一方) どちらで計算してもOK\n・途中に通過点がある場合: 「出発→通過点」×「通過点→目的地」\n・通れない交差点がある場合: 全体 - 通れない経路 で求める",
    timeLimitSec: 120
  });

  // 順列: 特定の1つを端から除外
  QUESTION_TEMPLATES.push({
    id: "junretsu_exclude_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.allPerm = factorial(v.n);
      d.headPerm = factorial(v.n - 1);
      return d;
    },
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 4, max: 10, step: 1 },
      scene: { type: "int", min: 0, max: 9, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      var sc = PERM_EXCLUDE_SCENES[v.scene % PERM_EXCLUDE_SCENES.length];
      v.q = sc.text(v.n);
      v.pos = sc.pos;
      v.thing = sc.thing;
    },
    answerFormula: function(v) {
      return factorial(v.n) - factorial(v.n - 1);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「○○にならない場合の数」= 全体 - ○○になる場合の数。\n余事象の考え方を使います。\n\n【解法】\n① 全体の並べ方（制約なし）:\n  {{n}}! = {{allPerm}}通り\n\n② 特定の{{thing}}が{{pos}}になる場合:\n  {{pos}}を固定 → 残り({{n}}-1)個の並べ方: ({{n}}-1)! = {{headPerm}}通り\n\n③ {{pos}}にならない場合（余事象）:\n  {{allPerm}} - {{headPerm}} = {{answer}}通り\n\n【ポイント】\n・「○○でない」→ 全体 - ○○ の余事象が楽\n・別解: {{pos}}は(n-1)通り × 残りは(n-1)! でも同じ\n・余事象は確率・場合の数どちらでも超重要テクニック",
    timeLimitSec: 90
  });
})();
