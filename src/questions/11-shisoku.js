// ============================================================
// カテゴリ11: 四則逆算（玉手箱形式）
// ============================================================
// 玉手箱の計数「四則逆算」は □ に入る数を求める形式。
// 9分50問＝1問あたり約10秒で、正確さより処理速度を問う。
//
// 誤答は必ず「よくある計算間違いの結果」にする。
// 近い値をランダムに散らすだけだと消去法で当たってしまい、
// 速度を測るテストとして成立しないため。
(function() {

  // □ × a = b × c
  QUESTION_TEMPLATES.push({
    id: "shisoku_mul_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 1,
    templateText: "□ × {{a}} = {{b}} × {{c}}",
    variables: {
      a: { type: "choice", options: [2, 3, 4, 5, 6, 8] },
      b: { type: "int", min: 4, max: 24, step: 2 },
      c: { type: "choice", options: [3, 4, 5, 6, 8, 9, 12] }
    },
    answerType: "choice",
    validate: function(v) { return (v.b * v.c) % v.a === 0 && (v.b * v.c) / v.a !== v.a; },
    answerFormula: function(v) { return v.b * v.c / v.a; },
    distractors: function(v, ans) {
      return [v.b * v.c, ans * 2, ans + v.a * 2, Math.round(ans / 2), Math.round(ans / v.a), Math.abs(ans - v.a * 2)];
    },
    unit: "",
    explanationTemplate: "右辺を先に計算してから、左辺の係数で割ります。\n\n右辺 = {{b}} × {{c}} = {{rhs}}\n□ = {{rhs}} ÷ {{a}} = {{answer}}",
    timeLimitSec: 20
  });

  // □ ÷ a = b
  QUESTION_TEMPLATES.push({
    id: "shisoku_div_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 1,
    templateText: "□ ÷ {{a}} = {{b}}",
    variables: {
      a: { type: "int", min: 3, max: 15, step: 1 },
      b: { type: "int", min: 4, max: 40, step: 2 }
    },
    answerType: "choice",
    validate: function(v) { return v.a !== v.b; },
    answerFormula: function(v) { return v.a * v.b; },
    distractors: function(v, ans) {
      return [Math.round(v.b / v.a), v.b, Math.round(ans / 2), ans * v.a, ans + v.b, ans * 2];
    },
    unit: "",
    explanationTemplate: "割り算の逆は掛け算です。\n\n□ = {{b}} × {{a}} = {{answer}}",
    timeLimitSec: 15
  });

  // a × □ = b + c
  QUESTION_TEMPLATES.push({
    id: "shisoku_add_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 1,
    templateText: "{{a}} × □ = {{b}} + {{c}}",
    variables: {
      a: { type: "choice", options: [3, 4, 5, 6, 7, 8, 9] },
      b: { type: "int", min: 10, max: 90, step: 2 },
      c: { type: "int", min: 10, max: 90, step: 2 }
    },
    answerType: "choice",
    validate: function(v) { return (v.b + v.c) % v.a === 0; },
    answerFormula: function(v) { return (v.b + v.c) / v.a; },
    distractors: function(v, ans) {
      return [v.b + v.c, (v.b + v.c) * v.a, ans + v.a, Math.abs(Math.round((v.b - v.c) / v.a)), Math.round(ans / 2), ans * 2];
    },
    unit: "",
    explanationTemplate: "右辺の和を求めてから割ります。\n\n右辺 = {{b}} + {{c}} = {{rhs}}\n□ = {{rhs}} ÷ {{a}} = {{answer}}",
    timeLimitSec: 20
  });

  // □ - a = b × c
  QUESTION_TEMPLATES.push({
    id: "shisoku_sub_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 2,
    templateText: "□ − {{a}} = {{b}} × {{c}}",
    variables: {
      a: { type: "int", min: 10, max: 80, step: 5 },
      b: { type: "choice", options: [3, 4, 6, 7, 8, 9] },
      c: { type: "choice", options: [4, 5, 6, 7, 8, 12] }
    },
    answerType: "choice",
    validate: function(v) { return v.b !== v.c; },
    answerFormula: function(v) { return v.b * v.c + v.a; },
    distractors: function(v, ans) {
      return [v.b * v.c - v.a, v.b * v.c, Math.abs(v.b * v.c - v.a * 2), ans + v.a, ans * 2, ans + v.b * v.c];
    },
    unit: "",
    explanationTemplate: "右辺を計算し、引かれていた数を足し戻します。\n\n右辺 = {{b}} × {{c}} = {{rhs}}\n□ = {{rhs}} + {{a}} = {{answer}}",
    timeLimitSec: 20
  });

  // □ ÷ a = b ÷ c
  QUESTION_TEMPLATES.push({
    id: "shisoku_ratio_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 2,
    templateText: "□ ÷ {{a}} = {{b}} ÷ {{c}}",
    variables: {
      a: { type: "choice", options: [4, 6, 8, 9, 12, 15] },
      b: { type: "int", min: 12, max: 96, step: 4 },
      c: { type: "choice", options: [3, 4, 6, 8, 12] }
    },
    answerType: "choice",
    validate: function(v) { return v.b % v.c === 0 && (v.b / v.c) * v.a !== v.b; },
    answerFormula: function(v) { return v.b / v.c * v.a; },
    distractors: function(v, ans) {
      return [Math.round(v.b / v.c), Math.round(ans / v.a), Math.round(ans / 2), ans * 2, v.b * v.c, ans + v.a];
    },
    unit: "",
    explanationTemplate: "右辺の商を求め、左辺の除数を掛け戻します。\n\n右辺 = {{b}} ÷ {{c}} = {{rhs}}\n□ = {{rhs}} × {{a}} = {{answer}}",
    timeLimitSec: 25
  });

  // a% × □ = b
  QUESTION_TEMPLATES.push({
    id: "shisoku_percent_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 2,
    templateText: "□ の {{a}}% = {{b}}",
    variables: {
      a: { type: "choice", options: [5, 10, 20, 25, 40, 50, 75] },
      b: { type: "int", min: 6, max: 90, step: 3 }
    },
    answerType: "choice",
    // {{a}}% を小数で書くと 5% は 0.05。"0." + a と機械的に繋ぐと
    // 1桁のパーセントで 0.5 になり、解説だけ10倍ずれる（実際に出ていた）。
    resolve: function(v) { v.aDecimal = v.a / 100; },
    validate: function(v) { return (v.b * 100) % v.a === 0; },
    answerFormula: function(v) { return v.b * 100 / v.a; },
    distractors: function(v, ans) {
      return [Math.round(v.b * v.a / 100), v.b, Math.round(ans / 2), v.b * v.a, ans * 2, ans + v.b];
    },
    unit: "",
    explanationTemplate: "「□の{{a}}%が{{b}}」なので、{{b}} を {{a}}% で割ります。\n\n□ = {{b}} ÷ {{aDecimal}} = {{b}} × 100 ÷ {{a}} = {{answer}}",
    timeLimitSec: 25
  });

  // □ × a/b = c
  QUESTION_TEMPLATES.push({
    id: "shisoku_frac_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    // 逆数を掛け戻す1手だけで、割合・比の逆算（difficulty 2）と手数が同じ。
    // 3にすると、複数の条件を組み合わせる問題と同じ重みで表示される。
    difficulty: 2,
    templateText: "□ × {{num}}/{{den}} = {{c}}",
    variables: {
      num: { type: "choice", options: [2, 3, 4, 5] },
      den: { type: "choice", options: [3, 4, 5, 6, 7, 8, 9] },
      c: { type: "int", min: 8, max: 80, step: 4 }
    },
    answerType: "choice",
    validate: function(v) {
      // 分数は約分した形でしか出さない。「4/6」「3/9」は
      // 四則逆算で問う形として誤っている（実測41.6%が未約分だった）。
      var gcd = function(x, y) { while (y) { var t = x % y; x = y; y = t; } return x; };
      if (gcd(v.num, v.den) !== 1) return false;
      return v.num < v.den && (v.c * v.den) % v.num === 0;
    },
    answerFormula: function(v) { return v.c * v.den / v.num; },
    distractors: function(v, ans) {
      return [Math.round(v.c * v.num / v.den), v.c, Math.round(ans / 2), ans * 2, v.c * v.num, ans + v.c];
    },
    unit: "",
    explanationTemplate: "分数を掛けた結果なので、逆数を掛け戻します。\n\n□ = {{c}} × {{den}}/{{num}} = {{answer}}",
    timeLimitSec: 30
  });

})();
