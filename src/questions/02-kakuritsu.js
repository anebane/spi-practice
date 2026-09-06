// カテゴリ2: 場合の数・確率
// ============================================================
// この分野は答えが約分された分数なので、数値を振っても同じ分数に落ちやすく、
// 見た目の種類が増えにくい。変数の幅を広げるだけでは足りないので、
// ①場面（容器と中身）を差し替える ②問われ方（合計/差、奇数/偶数/3の倍数、
// 隣り合う人数）を増やす、の2つで種類を作っている。
//
// 分母は 200 以下でないとエンジンが問題を捨てる（generateTemplateQuestion）。
// 上限を広げるときは C(総数, 2) が 200 を超えないかを必ず確かめること。
// ============================================================

// 2色の玉を取り出す場面。色名は「赤玉」「赤いボール」のように
// 語形が変わるので、機械的に連結せず完成した名詞で持つ。
var BALL2_SCENES = [
  { box: "袋",   thing: "玉",       a: "赤玉",         b: "白玉" },
  { box: "箱",   thing: "ボール",   a: "赤いボール",   b: "青いボール" },
  { box: "かご", thing: "ボール",   a: "黄色いボール", b: "緑のボール" },
  { box: "缶",   thing: "ビー玉",   a: "青いビー玉",   b: "白いビー玉" }
];

// 3色の玉
var BALL3_SCENES = [
  { box: "袋",   thing: "玉",     a: "赤玉",       b: "白玉",       c: "青玉" },
  { box: "箱",   thing: "ボール", a: "赤いボール", b: "白いボール", c: "青いボール" },
  { box: "かご", thing: "ビー玉", a: "緑のビー玉", b: "黄色いビー玉", c: "紫のビー玉" }
];

// サイコロの振り方（問われ方は DICE_CASES 側で持つ）
var DICE_SCENES = [
  "2個のサイコロを同時に投げるとき、",
  "大小2つのサイコロを同時に投げるとき、",
  "1個のサイコロを2回続けて投げるとき、"
];

// サイコロで問える条件。全36通りを数え上げて作る。
// 「合計がちょうど」だけだと5種類しか作れなかったので、以上・以下・差を足した。
var DICE_CASES = (function () {
  var out = [];
  var add = function (kind, target, phrase) {
    var pairs = [];
    for (var i = 1; i <= 6; i++) {
      for (var j = 1; j <= 6; j++) {
        var hit = kind === 0 ? (i + j === target)
                : kind === 1 ? (i + j >= target)
                : kind === 2 ? (i + j <= target)
                :              (Math.abs(i - j) === target);
        if (hit) pairs.push("(" + i + ", " + j + ")");
      }
    }
    // 全部当たり・全部はずれの条件は問題にならない
    if (pairs.length === 0 || pairs.length === 36) return;
    out.push({ kind: kind, target: target, phrase: phrase, pairs: pairs });
  };
  for (var t = 3; t <= 11; t++) add(0, t, "出た目の合計が" + t + "になる");
  for (var u = 8; u <= 11; u++) add(1, u, "出た目の合計が" + u + "以上になる");
  for (var w = 4; w <= 6; w++)  add(2, w, "出た目の合計が" + w + "以下になる");
  for (var d = 0; d <= 5; d++)  add(3, d, "出た目の差が" + d + "になる");
  return out;
})();

// コイン投げの場面
var COIN_SCENES = [
  { text: function (n, k) { return "コインを" + n + "回投げるとき、表がちょうど" + k + "回出る確率を求めよ。"; } },
  { text: function (n, k) { return "1枚の硬貨を" + n + "回続けて投げるとき、表がちょうど" + k + "回出る確率を求めよ。"; } },
  { text: function (n, k) { return "コインを" + n + "回投げるとき、裏がちょうど" + k + "回出る確率を求めよ。"; } }
];

// カードから2枚引く場面。cond は「どんなカードか」の呼び名と判定。
var CARD_CONDS = [
  { name: "奇数",     test: function (x) { return x % 2 === 1; },  how: "1, 3, 5, ... と数える" },
  { name: "偶数",     test: function (x) { return x % 2 === 0; },  how: "2, 4, 6, ... と数える" },
  { name: "3の倍数",  test: function (x) { return x % 3 === 0; },  how: "3, 6, 9, ... と数える" }
];
var CARD_SCENES = [
  function (n, cond) {
    return "1から" + n + "までの数字が書かれたカードが1枚ずつある。この中から同時に2枚引くとき、2枚とも"
      + cond + "である確率を求めよ。";
  },
  function (n, cond) {
    return "1から" + n + "までの番号がついた札が1枚ずつ箱に入っている。同時に2枚取り出すとき、2枚とも"
      + cond + "である確率を求めよ。";
  }
];

// くじ引きの場面
var LOTTERY_SCENES = [
  function (t, w) { return t + "本のくじの中に当たりが" + w + "本入っている。このくじを2本引くとき、少なくとも1本当たる確率を求めよ。"; },
  function (t, w) { return t + "枚の抽選券のうち" + w + "枚が当選券である。2枚を同時に引くとき、少なくとも1枚が当選券である確率を求めよ。"; },
  function (t, w) { return "福引の箱に" + t + "個の玉があり、そのうち" + w + "個が当たり玉である。2個を同時に取り出すとき、少なくとも1個が当たり玉である確率を求めよ。"; }
];

// 「特定のいくつかが隣り合う」確率の場面
var ARRANGE_SCENES = [
  { items: "文字", pick: "特定の{k}文字", text: function (n, k, list) { return list + " の" + n + "文字を無作為に一列に並べるとき、特定の" + k + "文字が隣り合う確率を求めよ。"; } },
  { items: "人",   pick: "特定の{k}人",   text: function (n, k, list) { return n + "人が無作為に一列に並ぶとき、特定の" + k + "人が隣り合う確率を求めよ。"; } },
  { items: "本",   pick: "特定の{k}冊",   text: function (n, k, list) { return n + "冊の本を無作為に本棚に並べるとき、特定の" + k + "冊が隣り合う確率を求めよ。"; } },
  { items: "箱",   pick: "特定の{k}個",   text: function (n, k, list) { return n + "個の箱を無作為に一列に置くとき、特定の" + k + "個が隣り合う確率を求めよ。"; } }
];

// 条件付き確率（戻さずに2回取り出す）の場面
var COND_SCENES_P = [
  { box: "袋", a: "赤玉",       b: "白玉",       thing: "玉" },
  { box: "箱", a: "赤いボール", b: "青いボール", thing: "ボール" },
  { box: "かご", a: "白い碁石", b: "黒い碁石",   thing: "碁石" }
];

(function() {
  // 玉の取り出し
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_ball_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      var total = v.red + v.white;
      d.total = total;
      d.totalM1 = total - 1;
      d.redM1 = v.red - 1;
      d.den = total * (total - 1) / 2;
      d.num = v.red * (v.red - 1) / 2;
      return d;
    },
    // 解説の途中式「n / d = 約分」を作るための分子・分母。
    // 以前は generator.js の PROB_PAIRS というID表で持っていたが、
    // 出題範囲を足すたびに表が伸びるので、テンプレ側の宣言に移した。
    probPair: ["num", "den"],
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      red:   { type: "int", min: 3, max: 8, step: 1 },
      white: { type: "int", min: 2, max: 7, step: 1 },
      scene: { type: "int", min: 0, max: 3, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var sc = BALL2_SCENES[v.scene % BALL2_SCENES.length];
      v.box = sc.box; v.thing = sc.thing; v.itemA = sc.a; v.itemB = sc.b;
      v.q = sc.box + "の中に" + sc.a + "が" + v.red + "個、" + sc.b + "が" + v.white
        + "個入っている。この" + sc.box + "から同時に2個の" + sc.thing + "を取り出すとき、2個とも"
        + sc.a + "である確率を求めよ。";
    },
    answerFormula: function(v) {
      var total = v.red + v.white;
      var num = v.red * (v.red - 1) / 2;
      var den = total * (total - 1) / 2;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「同時に取り出す」問題は組み合わせ(C)を使います。\n確率 = 該当する場合の数 / 全体の場合の数\n\n【解法】\n全体の{{thing}}の数: {{red}} + {{white}} = {{total}}個\n\n① 全体から2個選ぶ場合の数（分母）:\n  C({{total}}, 2) = {{total}} × {{totalM1}} / 2 = {{den}}通り\n\n② {{itemA}}2個を選ぶ場合の数（分子）:\n  C({{red}}, 2) = {{red}} × {{redM1}} / 2 = {{num}}通り\n\n③ 確率 = ②÷① = {{probStep}}\n\n【ポイント】\n・C(n, r) = n! / (r! × (n-r)!) は「n個からr個選ぶ組み合わせ」\n・「同時に取り出す」= 順序を考えない = 組み合わせ",
    timeLimitSec: 120
  });

  // サイコロ
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_dice_01",
    // 解説の途中式「n / d = 約分」を作るための分子・分母。
    // 以前は generator.js の PROB_PAIRS というID表で持っていたが、
    // 出題範囲を足すたびに表が伸びるので、テンプレ側の宣言に移した。
    probPair: ["count", 36],
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      idx:   { type: "int", min: 0, max: 40, step: 1 },
      scene: { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var c = DICE_CASES[v.idx % DICE_CASES.length];
      v._count = c.pairs.length;
      v.count = c.pairs.length;
      v.phrase = c.phrase;
      v.q = DICE_SCENES[v.scene % DICE_SCENES.length] + c.phrase + "確率を求めよ。";
      // 該当する組が多いときに全部並べると解説が読めなくなる
      v.combinations = c.pairs.length <= 8
        ? c.pairs.join(", ")
        : c.pairs.slice(0, 8).join(", ") + " …（全" + c.pairs.length + "通り）";
    },
    answerFormula: function(v) {
      var g = gcd(v._count, 36);
      return { numerator: v._count / g, denominator: 36 / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nサイコロ2個の問題は「全パターンを数えて条件に合うものを探す」が基本。\n全パターンは 6×6 = 36通り（順序を区別する）。\n\n【解法】\n① 全パターン: 6 × 6 = 36通り\n\n② {{phrase}}組み合わせを列挙:\n{{combinations}}\n→ 該当: {{count}}通り\n\n③ 確率 = {{probStep}}\n\n【ポイント】\n・2つのサイコロは区別して考える（(1,2)と(2,1)は別パターン）\n・合計7が最も出やすい（6通り）、合計2と12が最も出にくい（各1通り）\n・「以上」「以下」は境界を含む。数え落としに注意",
    timeLimitSec: 90
  });

  // コイン
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_coin_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.den = Math.pow(2, v.n);
      d.num = combination(v.n, v.k);
      return d;
    },
    // 解説の途中式「n / d = 約分」を作るための分子・分母。
    // 以前は generator.js の PROB_PAIRS というID表で持っていたが、
    // 出題範囲を足すたびに表が伸びるので、テンプレ側の宣言に移した。
    probPair: ["num", "den"],
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 3, max: 8, step: 1 },
      kSeed: { type: "int", min: 0, max: 6, step: 1 },
      scene: { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      // k は n に依存する（1 〜 n-1）。generator.js 側の custom 分岐ではなく
      // ここで決める。resolve があると custom 分岐は呼ばれない。
      v.k = 1 + (v.kSeed % (v.n - 1));
      var sc = COIN_SCENES[v.scene % COIN_SCENES.length];
      v.q = sc.text(v.n, v.k);
      // 「裏がちょうどk回」も C(n,k)/2^n で同じ形になる
      v.face = v.scene % COIN_SCENES.length === 2 ? "裏" : "表";
    },
    answerFormula: function(v) {
      var num = combination(v.n, v.k);
      var den = Math.pow(2, v.n);
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nコインの問題は「反復試行の確率」。\n全パターン = 2^(回数)、該当パターン = C(回数, {{face}}の回数)。\n\n【解法】\n① 全パターン: 2^{{n}} = {{den}}通り\n  （各回で表or裏の2通り × {{n}}回）\n\n② {{n}}回中{{k}}回だけ{{face}}が出る場合の数:\n  「{{n}}回のうちどの{{k}}回が{{face}}か」を選ぶ → C({{n}}, {{k}}) = {{num}}通り\n\n③ 確率 = {{probStep}}\n\n【ポイント】\n・反復試行: 各回が独立で同じ確率の試行を繰り返す場合\n・C(n,k) × p^k × (1-p)^(n-k) の公式（コインはp=1/2なので分母が2^n）\n・表と裏は対称なので、どちらを数えても同じ形になる",
    timeLimitSec: 120
  });

  // カードの問題
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_card_01",
    // 解説の途中式「n / d = 約分」を作るための分子・分母。
    // 以前は generator.js の PROB_PAIRS というID表で持っていたが、
    // 出題範囲を足すたびに表が伸びるので、テンプレ側の宣言に移した。
    probPair: ["num", "den"],
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 5, max: 16, step: 1 },
      cond:  { type: "int", min: 0, max: 2, step: 1 },
      scene: { type: "int", min: 0, max: 1, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var cd = CARD_CONDS[v.cond % CARD_CONDS.length];
      var hit = 0;
      for (var i = 1; i <= v.n; i++) if (cd.test(i)) hit++;
      v._hit = hit;
      v.condName = cd.name;
      v.how = cd.how;
      v.hitCount = hit;
      v.den = v.n * (v.n - 1) / 2;
      v.num = hit * (hit - 1) / 2;
      v.q = CARD_SCENES[v.scene % CARD_SCENES.length](v.n, cd.name);
    },
    validate: function(v) {
      // 該当が2枚未満だと確率0、全部該当だと確率1で問題にならない
      return v._hit >= 2 && v._hit <= v.n - 1;
    },
    answerFormula: function(v) {
      var num = v._hit * (v._hit - 1) / 2;
      var den = v.n * (v.n - 1) / 2;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nまず条件に合うもの（{{condName}}）の個数を数え、そこから2枚選ぶ組み合わせを求めます。\n\n【解法】\n① 1から{{n}}までの{{condName}}の個数: {{hitCount}}個\n  （{{how}}）\n\n② 全体から2枚選ぶ場合の数（分母）:\n  C({{n}}, 2) = {{den}}通り\n\n③ {{condName}}から2枚選ぶ場合の数（分子）:\n  C({{hitCount}}, 2) = {{num}}通り\n\n④ 確率 = {{probStep}}\n\n【ポイント】\n・「2枚とも○○」の確率 = C(○○の個数, 2) / C(全体, 2)\n・まず該当する個数を正確に数えるのが最優先",
    timeLimitSec: 120
  });

  // 当たりくじ
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_lottery_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.lose = v.total - v.win;
      d.allPairs = v.total * (v.total - 1) / 2;
      d.losePairs = d.lose * (d.lose - 1) / 2;
      return d;
    },
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      total: { type: "int", min: 6, max: 20, step: 1 },
      win:   { type: "int", min: 2, max: 5, step: 1 },
      scene: { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      v.q = LOTTERY_SCENES[v.scene % LOTTERY_SCENES.length](v.total, v.win);
    },
    validate: function(v) {
      // はずれが2本以上ないと「全部はずれ」が作れず、余事象で解く意味がなくなる
      return v.total - v.win >= 2;
    },
    answerFormula: function(v) {
      var lose = v.total - v.win;
      var allPairs = v.total * (v.total - 1) / 2;
      var losePairs = lose * (lose - 1) / 2;
      var num = allPairs - losePairs;
      var g = gcd(num, allPairs);
      return { numerator: num / g, denominator: allPairs / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「少なくとも1つ」の問題は余事象（=逆の場合）を使うのが定石。\n少なくとも1本当たる確率 = 1 - 全部はずれる確率\n\n【解法】\n① はずれの本数: {{total}} - {{win}} = {{lose}}本\n\n② 全体から2本選ぶ場合の数:\n  C({{total}}, 2) = {{allPairs}}通り\n\n③ はずれ2本を選ぶ場合の数:\n  C({{lose}}, 2) = {{losePairs}}通り\n\n④ 全部はずれる確率 = {{losePairs}} / {{allPairs}}\n\n⑤ 少なくとも1本当たる確率\n  = 1 - {{losePairs}}/{{allPairs}} = {{ansNum}}/{{ansDen}}\n\n【ポイント】\n・「少なくとも1つ」→ 余事象を使う（直接数えると場合分けが複雑になる）\n・余事象: P(A) = 1 - P(Aの逆) は確率の超重要テクニック",
    timeLimitSec: 120
  });

  // 色違いの玉（3色）
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_ball3_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.total = v.red + v.white + v.blue;
      d.allPairs = d.total * (d.total - 1) / 2;
      d.samePairs = v.red*(v.red-1)/2 + v.white*(v.white-1)/2 + v.blue*(v.blue-1)/2;
      d.diffPairs = d.allPairs - d.samePairs;
      return d;
    },
    // 解説の途中式「n / d = 約分」を作るための分子・分母。
    // 以前は generator.js の PROB_PAIRS というID表で持っていたが、
    // 出題範囲を足すたびに表が伸びるので、テンプレ側の宣言に移した。
    probPair: ["diffPairs", "allPairs"],
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      red:   { type: "int", min: 2, max: 6, step: 1 },
      white: { type: "int", min: 2, max: 6, step: 1 },
      blue:  { type: "int", min: 2, max: 5, step: 1 },
      scene: { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var sc = BALL3_SCENES[v.scene % BALL3_SCENES.length];
      v.thing = sc.thing; v.itemA = sc.a; v.itemB = sc.b; v.itemC = sc.c;
      v.q = sc.box + "の中に" + sc.a + v.red + "個、" + sc.b + v.white + "個、" + sc.c + v.blue
        + "個が入っている。この中から2個を同時に取り出すとき、異なる色の" + sc.thing + "が出る確率を求めよ。";
    },
    answerFormula: function(v) {
      var total = v.red + v.white + v.blue;
      var allPairs = total * (total - 1) / 2;
      var samePairs = v.red*(v.red-1)/2 + v.white*(v.white-1)/2 + v.blue*(v.blue-1)/2;
      var diffPairs = allPairs - samePairs;
      var g = gcd(diffPairs, allPairs);
      return { numerator: diffPairs / g, denominator: allPairs / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「異なる色」を直接数えると場合分けが多いので、\n余事象「同じ色」を使います。異なる色 = 全体 - 同じ色\n\n【解法】\n① 全体: {{red}}+{{white}}+{{blue}} = {{total}}個\n  全ペア数: C({{total}},2) = {{allPairs}}通り\n\n② 同色ペアを数える:\n  C({{red}},2) + C({{white}},2) + C({{blue}},2)\n  = {{samePairs}}通り\n\n③ 異なる色のペア:\n  {{allPairs}} - {{samePairs}} = {{diffPairs}}通り\n\n④ 確率 = {{probStep}}\n\n【ポイント】\n・3色以上ある場合は余事象（同色）から求める方が楽\n・同色の場合の数 = 各色のC(個数, 2)の合計",
    timeLimitSec: 120
  });

  // 並べ替え確率
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_arrange_01",
    // 解説の途中式「n / d = 約分」を作るための分子・分母。
    // 以前は generator.js の PROB_PAIRS というID表で持っていたが、
    // 出題範囲を足すたびに表が伸びるので、テンプレ側の宣言に移した。
    probPair: ["adjacent", "allPerm"],
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 3,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 4, max: 10, step: 1 },
      k:     { type: "int", min: 2, max: 3, step: 1 },
      scene: { type: "int", min: 0, max: 3, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var alpha = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
      var list = alpha.slice(0, v.n).join(", ");
      v.letters = list;
      var sc = ARRANGE_SCENES[v.scene % ARRANGE_SCENES.length];
      v.q = sc.text(v.n, v.k, list);
      // 解説で使う値。k を可変にしたので generator.js 側の固定式では合わない
      v.allPerm = factorial(v.n);
      v.blocks = v.n - v.k + 1;
      v.blockPerm = factorial(v.n - v.k + 1);
      v.innerPerm = factorial(v.k);
      v.adjacent = factorial(v.n - v.k + 1) * factorial(v.k);
    },
    validate: function(v) {
      return v.k <= v.n - 1;
    },
    answerFormula: function(v) {
      // k個をまとめて1ブロック: (n-k+1)! × k! 通り / 全体 n! 通り
      var num = factorial(v.n - v.k + 1) * factorial(v.k);
      var den = factorial(v.n);
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「隣り合う確率」は、隣り合うものをまとめて1ブロックと見なすテクニックを使います。\n\n【解法】\n① 全体の並べ方: {{n}}! = {{allPerm}}通り\n\n② 特定の{{k}}つが隣り合う場合:\n  {{k}}つをひとまとめ（1ブロック）にする\n  → ブロック + 残り = {{blocks}}組の並び: {{blocks}}! = {{blockPerm}}通り\n  → ブロック内の並び順: {{k}}! = {{innerPerm}}通り\n  → 隣り合う場合: {{blockPerm}} × {{innerPerm}} = {{adjacent}}通り\n\n③ 確率 = {{probStep}}\n\n【ポイント】\n・「隣り合う」→ まとめて1つとして数え、内部の並びをかける\n・「隣り合わない」→ 1 - 隣り合う確率 で求めるのが楽\n・ブロック内の並び順を掛け忘れるのが最も多い間違い",
    timeLimitSec: 120
  });

  // 条件付き確率
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_cond_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.redM1 = v.red - 1;
      d.denTotal = v.red + v.white - 1;
      return d;
    },
    // 解説の途中式「n / d = 約分」を作るための分子・分母。
    // 以前は generator.js の PROB_PAIRS というID表で持っていたが、
    // 出題範囲を足すたびに表が伸びるので、テンプレ側の宣言に移した。
    probPair: ["redM1", "denTotal"],
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      red:   { type: "int", min: 3, max: 8, step: 1 },
      white: { type: "int", min: 2, max: 7, step: 1 },
      scene: { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var sc = COND_SCENES_P[v.scene % COND_SCENES_P.length];
      v.itemA = sc.a; v.itemB = sc.b; v.thing = sc.thing;
      v.q = sc.box + "に" + sc.a + "が" + v.red + "個と" + sc.b + "が" + v.white
        + "個入っている。1個取り出して色を確認し、戻さずにもう1個取り出す。1個目が"
        + sc.a + "だったとき、2個目も" + sc.a + "である確率を求めよ。";
    },
    answerFormula: function(v) {
      var num = v.red - 1;
      var den = v.red + v.white - 1;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「戻さずに取り出す」= 条件付き確率。1個目の結果で残りの状態が変わります。\n1個目が{{itemA}}と「わかっている」ので、その後の状態で考えます。\n\n【解法】\n① 1個目に{{itemA}}を取り出した後の残り:\n  {{itemA}}: {{red}}-1 = {{redM1}}個、{{itemB}}: {{white}}個 → 合計{{denTotal}}個\n\n② 2個目が{{itemA}}である確率 = {{probStep}}\n\n【ポイント】\n・条件付き確率: P(B|A) = 「Aが起きた後にBが起きる確率」\n・「戻さない」→ 毎回残りの状態が変わる → 全体の数も1個減る",
    timeLimitSec: 90
  });
})();
