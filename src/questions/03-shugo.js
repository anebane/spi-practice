// カテゴリ3: 集合（ベン図）
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "shugo_2set_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.union = v.a + v.b - v.ab;
      return d;
    },
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 1,
    templateText: "{{total}}人のクラスで、英語が好きな人が{{a}}人、数学が好きな人が{{b}}人、両方好きな人が{{ab}}人いる。英語も数学も好きではない人は何人か。",
    variables: {
      total: { type: "int", min: 30, max: 50, step: 5 },
      a: { type: "int", min: 15, max: 30, step: 1 },
      b: { type: "int", min: 12, max: 25, step: 1 },
      ab: { type: "int", min: 3, max: 10, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total - (v.a + v.b - v.ab);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n2つの集合の問題は「ベン図」を描いてイメージするのが基本。\n重複（両方好き）を引かないと二重カウントしてしまう点に注意。\n\n【解法】\n① ベン図の公式: A∪B = A + B - A∩B\n\n② 英語または数学が好きな人（和集合）:\n  {{a}} + {{b}} - {{ab}} = {{union}}人\n  ※ 両方好きな{{ab}}人を引かないと重複カウントしてしまう\n\n③ どちらも好きではない人:\n  全体 - 和集合 = {{total}} - {{union}} = {{answer}}人\n\n【ポイント】\n・A∪B = A + B - A∩B は集合問題の最重要公式\n・ベン図の外側 = 全体 - ベン図の内側",
    timeLimitSec: 90,
    validate: function(v) {
      var union = v.a + v.b - v.ab;
      return v.a <= v.total && v.b <= v.total && v.ab <= Math.min(v.a, v.b) && union <= v.total && (v.total - union) >= 0;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shugo_2set_02",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.union = v.total - v.neither;
      return d;
    },
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 2,
    templateText: "{{total}}人にアンケートを取ったところ、商品Aを買ったことがある人が{{a}}人、商品Bを買ったことがある人が{{b}}人、どちらも買ったことがない人が{{neither}}人だった。両方買ったことがある人は何人か。",
    variables: {
      total: { type: "int", min: 50, max: 100, step: 10 },
      a: { type: "int", min: 20, max: 60, step: 5 },
      b: { type: "int", min: 15, max: 50, step: 5 },
      neither: { type: "int", min: 5, max: 20, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.a + v.b - (v.total - v.neither);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「どちらも買っていない」人数から「どちらか買った（和集合）」を求め、\nそこからベン図の公式を変形して重複（両方買った）を逆算します。\n\n【解法】\n① どちらか一方以上を買った人（和集合）:\n  {{total}} - {{neither}} = {{union}}人\n\n② ベン図の公式: A∪B = A + B - A∩B を変形すると:\n  A∩B = A + B - A∪B\n\n③ 両方買った人:\n  {{a}} + {{b}} - {{union}} = {{answer}}人\n\n【ポイント】\n・和集合の公式は A∩B = の形に変形できる（逆算問題で頻出）\n・「どちらもない」が与えられたら、まず和集合を求める",
    timeLimitSec: 90,
    validate: function(v) {
      var union = v.total - v.neither;
      var both = v.a + v.b - union;
      return both > 0 && both <= Math.min(v.a, v.b);
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shugo_3set_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.union = v.a + v.b + v.c - v.ab - v.bc - v.ac + v.abc;
      return d;
    },
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 3,
    templateText: "{{total}}人のクラスで、国語が好きな人が{{a}}人、数学が好きな人が{{b}}人、英語が好きな人が{{c}}人いる。国語と数学の両方が好きな人が{{ab}}人、数学と英語の両方が好きな人が{{bc}}人、国語と英語の両方が好きな人が{{ac}}人、3教科すべてが好きな人が{{abc}}人いる。3教科のどれも好きではない人は何人か。",
    variables: {
      total: { type: "int", min: 40, max: 60, step: 5 },
      a: { type: "int", min: 15, max: 30, step: 1 },
      b: { type: "int", min: 12, max: 25, step: 1 },
      c: { type: "int", min: 10, max: 20, step: 1 },
      ab: { type: "int", min: 3, max: 8, step: 1 },
      bc: { type: "int", min: 2, max: 6, step: 1 },
      ac: { type: "int", min: 2, max: 6, step: 1 },
      abc: { type: "int", min: 1, max: 3, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total - (v.a + v.b + v.c - v.ab - v.bc - v.ac + v.abc);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n3つの集合の問題では「包除原理（ほうじょげんり）」を使います。\n2つずつの重複を引き、3つ全部の重複は引きすぎたので足し戻します。\n\n【解法】\n① 3集合のベン図の公式（包除原理）:\n  A∪B∪C = A + B + C - A∩B - B∩C - A∩C + A∩B∩C\n\n② 代入:\n  = {{a}} + {{b}} + {{c}} - {{ab}} - {{bc}} - {{ac}} + {{abc}}\n  = {{union}}人\n\n③ どれも好きではない人:\n  {{total}} - {{union}} = {{answer}}人\n\n【ポイント】\n・3集合の公式は「足す→2重複を引く→3重複を戻す」の手順\n・3重複を足し戻す理由: 2重複を引く段階で3回引いてしまうため、1回分戻す",
    timeLimitSec: 120,
    validate: function(v) {
      var union = v.a + v.b + v.c - v.ab - v.bc - v.ac + v.abc;
      return v.abc <= Math.min(v.ab, v.bc, v.ac) &&
             v.ab <= Math.min(v.a, v.b) &&
             v.bc <= Math.min(v.b, v.c) &&
             v.ac <= Math.min(v.a, v.c) &&
             union <= v.total && union > 0 && (v.total - union) >= 0;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shugo_2set_03",
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 1,
    templateText: "ある会社の社員{{total}}人のうち、電車通勤の人が{{a}}人、バス通勤の人が{{b}}人いる。電車とバスの両方を使う人が最も多い場合、その人数は何人か。",
    variables: {
      total: { type: "int", min: 40, max: 80, step: 10 },
      a: { type: "int", min: 20, max: 45, step: 5 },
      b: { type: "int", min: 15, max: 40, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.min(v.a, v.b);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「両方の最大」は、小さい方の集合が大きい方に完全に含まれる場合。\n全員が重複するのが最大のケースです。\n\n【解法】\n① 電車通勤: {{a}}人、バス通勤: {{b}}人\n\n② 両方使う人の最大値 = min({{a}}, {{b}}) = {{answer}}人\n\n③ 理由: 少ない方の全員が多い方にも含まれる場合が最大\n  （バス通勤者全員が電車通勤者でもある、というケース）\n\n【ポイント】\n・最大 = min(A, B)…小さい方を超えることはできない\n・最小 = max(0, A+B-全体)…鳩の巣原理で最低限の重複",
    timeLimitSec: 90,
    validate: function(v) {
      // 重なりの取りうる範囲は [a+b-total, min(a, b)]。
      // 片方が全員（max(a,b) === total）だと、この幅がゼロに潰れて
      // 重なりが1つに固定される。「最も多い場合」「少なくとも」と問うているのに
      // 選ぶ余地が無く、問いとして成立しない（実測13.5%がこれだった）。
      if (Math.max(v.a, v.b) >= v.total) return false;
      return v.a <= v.total && v.b <= v.total && v.a + v.b > v.total;
    }
  });

  // 集合: 最小値
  QUESTION_TEMPLATES.push({
    id: "shugo_min_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.sumAB = v.a + v.b;
      return d;
    },
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 2,
    templateText: "{{total}}人の社員のうち、英語ができる人が{{a}}人、中国語ができる人が{{b}}人いる。英語と中国語の両方ができる人は少なくとも何人いるか。",
    variables: {
      total: { type: "int", min: 40, max: 60, step: 5 },
      a: { type: "int", min: 15, max: 35, step: 5 },
      b: { type: "int", min: 15, max: 35, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.max(0, v.a + v.b - v.total);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「少なくとも何人」= 重複の最小値。AとBの合計が全体を超える分は、\nどうしても重複せざるを得ません（鳩の巣原理）。\n\n【解法】\n① A∩Bの最小値の公式:\n  max(0, A + B - 全体)\n\n② 代入:\n  max(0, {{a}} + {{b}} - {{total}}) = {{answer}}人\n\n③ 理由: {{a}}+{{b}} = {{sumAB}} ですが、全体は{{total}}人しかいない\n  → {{a}}+{{b}}-{{total}}人分は必ずどちらにも属する\n\n【ポイント】\n・鳩の巣原理: n個の箱にn+1個入れると、必ずどこかに2つ入る\n・「少なくとも」→ 最小値の公式 max(0, A+B-全体)\n・「最大」→ min(A, B) とセットで覚える",
    timeLimitSec: 90,
    validate: function(v) {
      // 重なりの取りうる範囲は [a+b-total, min(a, b)]。
      // 片方が全員（max(a,b) === total）だと、この幅がゼロに潰れて
      // 重なりが1つに固定される。「最も多い場合」「少なくとも」と問うているのに
      // 選ぶ余地が無く、問いとして成立しない（実測13.5%がこれだった）。
      if (Math.max(v.a, v.b) >= v.total) return false;
      return v.a <= v.total && v.b <= v.total && v.a + v.b > v.total;
    }
  });

  // 集合: 割合から人数
  QUESTION_TEMPLATES.push({
    id: "shugo_percent_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.unionPct = v.pctA + v.pctB - v.pctAB;
      d.neitherPct = 100 - d.unionPct;
      return d;
    },
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 2,
    templateText: "{{total}}人にアンケートを取ったところ、スポーツが好きな人は全体の{{pctA}}%、音楽が好きな人は全体の{{pctB}}%、両方好きな人は全体の{{pctAB}}%だった。どちらも好きではない人は何人か。",
    variables: {
      total: { type: "int", min: 100, max: 500, step: 50 },
      pctA: { type: "int", min: 30, max: 70, step: 5 },
      pctB: { type: "int", min: 25, max: 60, step: 5 },
      pctAB: { type: "int", min: 5, max: 20, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var unionPct = v.pctA + v.pctB - v.pctAB;
      return v.total * (100 - unionPct) / 100;
    },
    unit: "人",
    explanationTemplate: "【考え方】\n割合(%)で与えられた集合問題。まず%のまま和集合の公式で計算し、\n最後に人数に変換します。\n\n【解法】\n① どちらか好きな人の割合（和集合）:\n  {{pctA}} + {{pctB}} - {{pctAB}} = {{unionPct}}%\n\n② どちらも好きではない割合:\n  100 - {{unionPct}} = {{neitherPct}}%\n\n③ 人数に変換:\n  {{total}} × {{neitherPct}}/100 = {{answer}}人\n\n【ポイント】\n・割合(%やm分率)の問題でもベン図の公式はそのまま使える\n・先に%で計算してから最後に人数に変換するとスムーズ",
    timeLimitSec: 90,
    validate: function(v) {
      var unionPct = v.pctA + v.pctB - v.pctAB;
      return v.pctAB <= Math.min(v.pctA, v.pctB) && unionPct <= 100 && unionPct > 0 &&
             Number.isInteger(v.total * (100 - unionPct) / 100);
    }
  });
})();
