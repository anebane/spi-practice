// カテゴリ2: 場合の数・確率
// ============================================================
(function() {
  // 玉の取り出し
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_ball_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 1,
    templateText: "袋の中に赤玉が{{red}}個、白玉が{{white}}個入っている。この袋から同時に2個の玉を取り出すとき、2個とも赤玉である確率を求めよ。",
    variables: {
      red: { type: "int", min: 3, max: 7, step: 1 },
      white: { type: "int", min: 2, max: 5, step: 1 }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var total = v.red + v.white;
      var num = v.red * (v.red - 1) / 2;
      var den = total * (total - 1) / 2;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「同時に取り出す」問題は組み合わせ(C)を使います。\n確率 = 該当する場合の数 / 全体の場合の数\n\n【解法】\n全体の玉の数: {{red}} + {{white}} = {{total}}個\n\n① 全体から2個選ぶ場合の数（分母）:\n  C({{total}}, 2) = {{total}} × {{totalM1}} / 2 = {{den}}通り\n\n② 赤玉2個を選ぶ場合の数（分子）:\n  C({{red}}, 2) = {{red}} × {{redM1}} / 2 = {{num}}通り\n\n③ 確率 = ②÷① = {{num}} / {{den}} = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・C(n, r) = n! / (r! × (n-r)!) は「n個からr個選ぶ組み合わせ」\n・「同時に取り出す」= 順序を考えない = 組み合わせ",
    timeLimitSec: 120
  });

  // サイコロ
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_dice_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 1,
    templateText: "2個のサイコロを同時に投げるとき、出た目の合計が{{target}}になる確率を求めよ。",
    variables: {
      target: { type: "choice", options: [5, 6, 7, 8, 9] }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var count = 0;
      for (var i = 1; i <= 6; i++) {
        for (var j = 1; j <= 6; j++) {
          if (i + j === v.target) count++;
        }
      }
      var g = gcd(count, 36);
      return { numerator: count / g, denominator: 36 / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nサイコロ2個の問題は「全パターンを数えて条件に合うものを探す」が基本。\n全パターンは 6×6 = 36通り（順序を区別する）。\n\n【解法】\n① 全パターン: 6 × 6 = 36通り\n\n② 合計が{{target}}になる組み合わせを列挙:\n{{combinations}}\n→ 該当: {{count}}通り\n\n③ 確率 = {{count}} / 36 = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・2つのサイコロは区別して考える（(1,2)と(2,1)は別パターン）\n・合計7が最も出やすい（6通り）、合計2と12が最も出にくい（各1通り）",
    timeLimitSec: 90
  });

  // コイン
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_coin_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "コインを{{n}}回投げるとき、表がちょうど{{k}}回出る確率を求めよ。",
    variables: {
      n: { type: "choice", options: [3, 4, 5] },
      k: { type: "custom" }  // nに依存して設定
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var num = combination(v.n, v.k);
      var den = Math.pow(2, v.n);
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nコインの問題は「反復試行の確率」。\n全パターン = 2^(回数)、該当パターン = C(回数, 表の回数)。\n\n【解法】\n① 全パターン: 2^{{n}} = {{den}}通り\n  （各回で表or裏の2通り × {{n}}回）\n\n② {{n}}回中{{k}}回だけ表が出る場合の数:\n  「{{n}}回のうちどの{{k}}回が表か」を選ぶ → C({{n}}, {{k}}) = {{num}}通り\n\n③ 確率 = {{num}} / {{den}} = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・反復試行: 各回が独立で同じ確率の試行を繰り返す場合\n・C(n,k) × p^k × (1-p)^(n-k) の公式（コインはp=1/2なので分母が2^n）",
    timeLimitSec: 120
  });

  // カードの問題
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_card_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "1から{{n}}までの数字が書かれたカードが1枚ずつある。この中から同時に2枚引くとき、2枚とも奇数である確率を求めよ。",
    variables: {
      n: { type: "choice", options: [6, 7, 8, 9, 10] }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var oddCount = Math.ceil(v.n / 2);
      var num = oddCount * (oddCount - 1) / 2;
      var den = v.n * (v.n - 1) / 2;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nまず条件に合うもの（奇数）の個数を数え、そこから2枚選ぶ組み合わせを求めます。\n\n【解法】\n① 1から{{n}}までの奇数の個数: {{oddCount}}個\n  （1, 3, 5, ...を数える）\n\n② 全体から2枚選ぶ場合の数（分母）:\n  C({{n}}, 2) = {{den}}通り\n\n③ 奇数から2枚選ぶ場合の数（分子）:\n  C({{oddCount}}, 2) = {{num}}通り\n\n④ 確率 = {{num}} / {{den}} = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・「2枚とも○○」の確率 = C(○○の個数, 2) / C(全体, 2)\n・1〜nの奇数の個数は n÷2を切り上げた値",
    timeLimitSec: 120
  });

  // 当たりくじ
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_lottery_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{total}}本のくじの中に当たりが{{win}}本入っている。このくじを2本引くとき、少なくとも1本当たる確率を求めよ。",
    variables: {
      total: { type: "choice", options: [8, 10, 12] },
      win: { type: "choice", options: [2, 3] }
    },
    answerType: "fraction",
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
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "袋の中に赤玉{{red}}個、白玉{{white}}個、青玉{{blue}}個が入っている。この中から2個を同時に取り出すとき、異なる色の玉が出る確率を求めよ。",
    variables: {
      red: { type: "int", min: 2, max: 5, step: 1 },
      white: { type: "int", min: 2, max: 5, step: 1 },
      blue: { type: "int", min: 2, max: 4, step: 1 }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var total = v.red + v.white + v.blue;
      var allPairs = total * (total - 1) / 2;
      var samePairs = v.red*(v.red-1)/2 + v.white*(v.white-1)/2 + v.blue*(v.blue-1)/2;
      var diffPairs = allPairs - samePairs;
      var g = gcd(diffPairs, allPairs);
      return { numerator: diffPairs / g, denominator: allPairs / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「異なる色」を直接数えると場合分けが多い（赤白、赤青、白青…）ので、\n余事象「同じ色」を使います。異なる色 = 全体 - 同じ色\n\n【解法】\n① 全体: {{red}}+{{white}}+{{blue}} = {{total}}個\n  全ペア数: C({{total}},2) = {{allPairs}}通り\n\n② 同色ペアを数える:\n  赤赤: C({{red}},2) + 白白: C({{white}},2) + 青青: C({{blue}},2)\n  = {{samePairs}}通り\n\n③ 異なる色のペア:\n  {{allPairs}} - {{samePairs}} = {{diffPairs}}通り\n\n④ 確率 = {{diffPairs}}/{{allPairs}} = {{ansNum}}/{{ansDen}}\n\n【ポイント】\n・3色以上ある場合は余事象（同色）から求める方が楽\n・同色の場合の数 = 各色のC(個数, 2)の合計",
    timeLimitSec: 120
  });

  // 並べ替え確率
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_arrange_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 3,
    templateText: "{{letters}} の{{n}}文字を無作為に一列に並べるとき、AとBが隣り合う確率を求めよ。",
    variables: {
      n: { type: "int", min: 4, max: 7, step: 1 }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      // AとBを1ブロックとみなす: (n-1)! × 2 通り / 全体 n! 通り = 2/n
      var g = gcd(2, v.n);
      return { numerator: 2 / g, denominator: v.n / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「隣り合う確率」は、隣り合う2つをまとめて1ブロックと見なすテクニックを使います。\n\n【解法】\n① 全体の並べ方: {{n}}! = {{allPerm}}通り\n\n② AとBが隣り合う場合:\n  ABをひとまとめ（1ブロック）にする\n  → ブロック + 残り{{rest}}文字 = {{blocks}}組の並び: {{blocks}}! = {{blockPerm}}通り\n  → ブロック内のA,Bの順(AB or BA): 2通り\n  → 隣り合う場合: {{blockPerm}} × 2 = {{adjacent}}通り\n\n③ 確率 = {{adjacent}}/{{allPerm}} = {{ansNum}}/{{ansDen}}\n\n【ポイント】\n・「隣り合う」→ まとめて1つとして数え、内部の並びをかける\n・n文字のうち特定の2文字が隣り合う確率は、必ず 2/n になる\n・「隣り合わない」→ 1 - 隣り合う確率 で求めるのが楽",
    timeLimitSec: 120
  });

  // 条件付き確率
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_cond_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "袋に赤玉{{red}}個と白玉{{white}}個が入っている。1個取り出して色を確認し、戻さずにもう1個取り出す。1個目が赤玉だったとき、2個目も赤玉である確率を求めよ。",
    variables: {
      red: { type: "int", min: 3, max: 7, step: 1 },
      white: { type: "int", min: 2, max: 5, step: 1 }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var num = v.red - 1;
      var den = v.red + v.white - 1;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「戻さずに取り出す」= 条件付き確率。1個目の結果で残りの状態が変わります。\n1個目が赤玉と「わかっている」ので、その後の状態で考えます。\n\n【解法】\n① 1個目が赤玉を取り出した後の残り:\n  赤: {{red}}-1 = {{redM1}}個、白: {{white}}個 → 合計{{denTotal}}個\n\n② 2個目が赤玉の確率 = {{redM1}} / {{denTotal}} = {{ansNum}}/{{ansDen}}\n\n【ポイント】\n・条件付き確率: P(B|A) = 「Aが起きた後にBが起きる確率」\n・「戻さない」→ 毎回残りの状態が変わる → 全体の数も1個減る",
    timeLimitSec: 90
  });
})();
