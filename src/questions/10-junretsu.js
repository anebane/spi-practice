// カテゴリ10: 順列・組み合わせ
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "junretsu_basic_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 1,
    templateText: "{{n}}人の中から{{r}}人を選んで一列に並べる方法は何通りあるか。",
    variables: {
      n: { type: "int", min: 4, max: 8, step: 1 },
      r: { type: "int", min: 2, max: 4, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return permutation(v.n, v.r);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「選んで並べる」→ 順列(P)を使います。\n順番が区別される（1番目と2番目が違う）場合は順列。\n\n【解法】\n① 順列の公式: P(n, r) = n! / (n-r)!\n  = n × (n-1) × ... × (n-r+1)\n\n② P({{n}}, {{r}}) = {{calculation}} = {{answer}}通り\n\n【ポイント】\n・順列(P): 順番を区別する → 並べ方の数\n・組み合わせ(C): 順番を区別しない → 選び方の数\n・P(n,r) = C(n,r) × r!（並べ方 = 選び方 × 並べる順番）",
    timeLimitSec: 90,
    validate: function(v) {
      return v.r <= v.n;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "kumiawase_basic_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 1,
    templateText: "{{n}}人の中から{{r}}人を選ぶ方法は何通りあるか。",
    variables: {
      n: { type: "int", min: 5, max: 10, step: 1 },
      r: { type: "int", min: 2, max: 4, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return combination(v.n, v.r);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「選ぶだけ（順番なし）」→ 組み合わせ(C)を使います。\n「委員を選ぶ」「チームを作る」などは組み合わせ。\n\n【解法】\n① 組み合わせの公式: C(n, r) = n! / (r! × (n-r)!)\n\n② C({{n}}, {{r}}) = {{calculation}} = {{answer}}通り\n\n【ポイント】\n・C(n,r) = P(n,r) / r!（順列を「順番の重複」で割る）\n・C(n,r) = C(n, n-r) の性質あり（例: C(7,5) = C(7,2)）\n・計算のコツ: 小さい方のrを使うと計算が楽",
    timeLimitSec: 90,
    validate: function(v) {
      return v.r <= v.n;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "junretsu_cond_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{n}}人を一列に並べるとき、特定の2人が隣り合う並べ方は何通りあるか。",
    variables: {
      n: { type: "int", min: 4, max: 7, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return factorial(v.n - 1) * 2;
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「隣り合う」条件付き順列。隣り合う人たちを1つのブロックとみなして\nまとめて並べ、ブロック内の並び順を掛けます。\n\n【解法】\n① 特定の2人を1つのブロック（かたまり）として扱う\n  → {{n}}人 → ブロック+残り = {{nMinus1}}組\n\n② {{nMinus1}}組の並べ方:\n  {{nMinus1}}! = {{blockPerm}}通り\n\n③ ブロック内の2人の並び順:\n  AB or BA = 2通り\n\n④ 合計: {{blockPerm}} × 2 = {{answer}}通り\n\n【ポイント】\n・「隣り合う」→ まとめて1ブロック → (n-1)! × (ブロック内の並び)\n・「隣り合わない」→ 全体 - 隣り合う で求めるのが楽\n・3人が隣り合う場合は (n-2)! × 3! になる",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "kumiawase_cond_01",
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
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{n}}人が円形のテーブルに座る方法は何通りあるか。",
    variables: {
      n: { type: "int", min: 4, max: 7, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return factorial(v.n - 1);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n円形に並べる「円順列」は、回転を同一視するため1人を固定します。\n直線の順列(n!)から回転分(n通り)を割ります。\n\n【解法】\n① 円順列の公式: (n-1)!\n  1人を固定し、残り(n-1)人の並べ方を数える\n\n② ({{n}}-1)! = {{nMinus1}}! = {{answer}}通り\n\n【ポイント】\n・直線の順列: n!、円順列: (n-1)!\n・なぜ(n-1)!か: 回転して同じ並びはn通りあるので n!/n = (n-1)!\n・さらに裏返しも同じとする場合: (n-1)!/2（じゅず順列）",
    timeLimitSec: 90
  });

  // 組合せ: 委員の選び方
  QUESTION_TEMPLATES.push({
    id: "kumiawase_committee_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{n}}人の中から委員長1人、副委員長1人、書記1人を選ぶ方法は何通りあるか。",
    variables: {
      n: { type: "int", min: 5, max: 10, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.n * (v.n - 1) * (v.n - 2);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n役職（委員長・副委員長・書記）が異なるので、誰がどの役かが重要。\nこれは「順列」の問題です（選んで割り当てる）。\n\n【解法】\n① 委員長の選び方: {{n}}通り\n② 副委員長の選び方: {{nM1}}通り（委員長以外）\n③ 書記の選び方: {{nM2}}通り（委員長・副委員長以外）\n\n④ 合計: {{n}} × {{nM1}} × {{nM2}} = {{answer}}通り\n  = P({{n}}, 3)\n\n【ポイント】\n・役職あり → 順列（誰がどの役かで区別）\n・役職なし（3人選ぶだけ）→ 組み合わせ C(n,3)\n・P(n,3) = C(n,3) × 3!（3つの役の並べ方6通り分の差）",
    timeLimitSec: 90
  });

  // 組合せ: 最短経路
  QUESTION_TEMPLATES.push({
    id: "kumiawase_path_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 3,
    templateText: "右に{{right}}回、上に{{up}}回進んで目的地に着く最短経路は何通りあるか。",
    variables: {
      right: { type: "int", min: 2, max: 5, step: 1 },
      up: { type: "int", min: 2, max: 4, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return combination(v.right + v.up, v.up);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n最短経路問題は「右(→)と上(↑)の移動順序」の組み合わせ。\n全移動回数の中から「上に進む回」を選ぶ問題に帰着します。\n\n【解法】\n① 全移動回数:\n  右{{right}}回 + 上{{up}}回 = {{total}}回\n\n② この{{total}}回の中から「上に進む{{up}}回」を選ぶ:\n  C({{total}}, {{up}}) = {{answer}}通り\n\n【ポイント】\n・最短経路 = 同じものを含む順列 = 組み合わせ\n・C(右+上, 上) = C(右+上, 右) どちらで計算してもOK\n・途中に通過点がある場合: 「出発→通過点」×「通過点→目的地」\n・通れない交差点がある場合: 全体 - 通れない経路 で求める",
    timeLimitSec: 120
  });

  // 順列: 特定の人を除外
  QUESTION_TEMPLATES.push({
    id: "junretsu_exclude_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{n}}人を一列に並べるとき、特定の1人が先頭にならない並べ方は何通りあるか。",
    variables: {
      n: { type: "int", min: 4, max: 7, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return factorial(v.n) - factorial(v.n - 1);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「○○にならない場合の数」= 全体 - ○○になる場合の数。\n余事象の考え方を使います。\n\n【解法】\n① 全体の並べ方（制約なし）:\n  {{n}}! = {{allPerm}}通り\n\n② 特定の人が先頭になる場合:\n  先頭を固定 → 残り({{n}}-1)人の並べ方: ({{n}}-1)! = {{headPerm}}通り\n\n③ 先頭にならない場合（余事象）:\n  {{allPerm}} - {{headPerm}} = {{answer}}通り\n\n【ポイント】\n・「○○でない」→ 全体 - ○○ の余事象が楽\n・別解: 先頭は(n-1)通り × 残りは(n-1)! = (n-1)×(n-1)! でも同じ\n・余事象は確率・場合の数どちらでも超重要テクニック",
    timeLimitSec: 90
  });
})();
