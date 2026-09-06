// カテゴリ7: 濃度算
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "noudo_basic_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.total = v.water + v.salt;
      return d;
    },
    formats: ["webtesting"],
    category: "濃度算",
    categoryId: 7,
    difficulty: 1,
    templateText: "{{water}}gの水に{{salt}}gの食塩を溶かした。この食塩水の濃度は何%か。（小数第2位を四捨五入）",
    variables: {
      water: { type: "int", min: 100, max: 500, step: 50 },
      salt: { type: "int", min: 10, max: 50, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.salt / (v.water + v.salt) * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n濃度の基本公式: 濃度(%) = 食塩の量 / 食塩水の量 × 100\n食塩水の量 = 水 + 食塩（食塩も含むことに注意！）\n\n【解法】\n① 食塩水の総量:\n  水 + 食塩 = {{water}} + {{salt}} = {{total}}g\n\n② 濃度を計算:\n  濃度 = 食塩 / 食塩水 × 100\n       = {{salt}} / {{total}} × 100\n       = {{answer}}%\n\n【ポイント】\n・食塩水の量 = 水 + 食塩（分母に食塩も含む！）\n・「水の量」と「食塩水の量」は違う → よくあるひっかけ\n・濃度は常に0〜100%の範囲",
    // ⚠️ 90秒。難易度1だが60秒では足りない。
    //    答えの94.2%が無限小数（450g+40g → 8.1633…% を四捨五入）で、
    //    さらに「水の量」と「食塩水の量」の取り違えを誘う設計のため。
    //    2026-09-02 実測: 時間切れ14.2%（同難易度の中央値3.5%）。
    //    引っかけは本番SPIにある論点なので消さない。多様性も削らない。
    //    難易度1で90秒のテンプレは他に7件あり、特別扱いではない。
    timeLimitSec: 90
  });

  QUESTION_TEMPLATES.push({
    id: "noudo_mix_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.saltA = v.weightA * v.concA / 100;
      d.saltB = v.weightB * v.concB / 100;
      d.totalSalt = d.saltA + d.saltB;
      d.totalWeight = v.weightA + v.weightB;
      return d;
    },
    formats: ["webtesting"],
    category: "濃度算",
    categoryId: 7,
    difficulty: 2,
    templateText: "濃度{{concA}}%の食塩水{{weightA}}gと、濃度{{concB}}%の食塩水{{weightB}}gを混ぜると、濃度は何%になるか。（小数第2位を四捨五入）",
    variables: {
      concA: { type: "choice", options: [3, 4, 5, 6, 8, 10] },
      weightA: { type: "int", min: 100, max: 500, step: 50 },
      concB: { type: "choice", options: [8, 10, 12, 15, 20] },
      weightB: { type: "int", min: 100, max: 500, step: 50 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var saltA = v.weightA * v.concA / 100;
      var saltB = v.weightB * v.concB / 100;
      var totalSalt = saltA + saltB;
      var totalWeight = v.weightA + v.weightB;
      return Math.round(totalSalt / totalWeight * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n混合問題は「食塩の量は足し算、食塩水の量も足し算」。\nそれぞれの食塩量を求めてから合計の濃度を計算します。\n\n【解法】\n① 各食塩水の食塩量を求める:\n  A: {{weightA}} × {{concA}}/100 = {{saltA}}g\n  B: {{weightB}} × {{concB}}/100 = {{saltB}}g\n\n② 合計:\n  食塩の合計: {{saltA}} + {{saltB}} = {{totalSalt}}g\n  食塩水の合計: {{weightA}} + {{weightB}} = {{totalWeight}}g\n\n③ 混合後の濃度:\n  {{totalSalt}} / {{totalWeight}} × 100 = {{answer}}%\n\n【ポイント】\n・混合後の濃度は必ず2つの濃度の間の値になる\n・「てんびん図」を使うと素早く解ける（重さの比で内分）\n・食塩の量 = 食塩水の量 × 濃度/100 は濃度算の超基本",
    timeLimitSec: 120,
    validate: function(v) {
      return v.concA < v.concB;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "noudo_evaporate_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.salt = v.weight * v.conc / 100;
      d.newWeight = v.weight - v.evap;
      return d;
    },
    formats: ["webtesting"],
    category: "濃度算",
    categoryId: 7,
    difficulty: 2,
    templateText: "濃度{{conc}}%の食塩水が{{weight}}gある。水を{{evap}}g蒸発させると、濃度は何%になるか。（小数第2位を四捨五入）",
    variables: {
      conc: { type: "choice", options: [5, 8, 10] },
      weight: { type: "int", min: 200, max: 500, step: 50 },
      evap: { type: "int", min: 50, max: 200, step: 50 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var salt = v.weight * v.conc / 100;
      var newWeight = v.weight - v.evap;
      return Math.round(salt / newWeight * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n水を蒸発させると「食塩の量は変わらず、食塩水の量だけ減る」。\nよって濃度は上がります。\n\n【解法】\n① 元の食塩の量（蒸発しても変わらない）:\n  {{weight}} × {{conc}}/100 = {{salt}}g\n\n② 蒸発後の食塩水の量:\n  {{weight}} - {{evap}} = {{newWeight}}g\n\n③ 新しい濃度:\n  {{salt}} / {{newWeight}} × 100 = {{answer}}%\n\n【ポイント】\n・蒸発 → 水だけ減る → 食塩はそのまま → 濃度UP\n・水を加える → 水だけ増える → 食塩はそのまま → 濃度DOWN\n・どちらも「食塩の量は不変」がカギ",
    // ⚠️ 120秒。四捨五入が要るのに、同難易度で最短の90秒だった。
    //    2026-09-02 実測: 時間切れ 12.7%（難易度2の中央値 5.2%）。
    //    引っかけと多様性は削らず、時間で吸収する判断。
    timeLimitSec: 120,
    validate: function(v) {
      return v.evap < v.weight;
    }
  });

  // 濃度算: 水を追加
  QUESTION_TEMPLATES.push({
    id: "noudo_addwater_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.salt = v.weight * v.conc / 100;
      d.newWeight = v.weight + v.addWater;
      return d;
    },
    formats: ["webtesting"],
    category: "濃度算",
    categoryId: 7,
    difficulty: 1,
    templateText: "濃度{{conc}}%の食塩水{{weight}}gに水を{{addWater}}g加えると、濃度は何%になるか。（小数第2位を四捨五入）",
    variables: {
      conc: { type: "choice", options: [5, 8, 10, 12, 15] },
      weight: { type: "int", min: 200, max: 500, step: 50 },
      addWater: { type: "int", min: 50, max: 300, step: 50 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var salt = v.weight * v.conc / 100;
      var newWeight = v.weight + v.addWater;
      return Math.round(salt / newWeight * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n水を加えると「食塩の量は変わらず、食塩水の量だけ増える」。\nよって濃度は下がります。\n\n【解法】\n① 食塩の量（水を加えても変わらない）:\n  {{weight}} × {{conc}}/100 = {{salt}}g\n\n② 水を加えた後の食塩水の量:\n  {{weight}} + {{addWater}} = {{newWeight}}g\n\n③ 新しい濃度:\n  {{salt}} / {{newWeight}} × 100 = {{answer}}%\n\n【ポイント】\n・水を加える → 食塩はそのまま、食塩水が増える → 濃度DOWN\n・食塩を加える場合は「食塩も食塩水も増える」ので別の計算になる",
    timeLimitSec: 90
  });

  // 濃度算: 食塩を追加
  QUESTION_TEMPLATES.push({
    id: "noudo_addsalt_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.origSalt = v.weight * v.conc / 100;
      d.totalSalt = d.origSalt + v.addSalt;
      d.newWeight = v.weight + v.addSalt;
      return d;
    },
    formats: ["webtesting"],
    category: "濃度算",
    categoryId: 7,
    difficulty: 2,
    templateText: "濃度{{conc}}%の食塩水{{weight}}gに食塩を{{addSalt}}g加えると、濃度は何%になるか。（小数第2位を四捨五入）",
    variables: {
      conc: { type: "choice", options: [3, 5, 8, 10] },
      weight: { type: "int", min: 200, max: 500, step: 50 },
      addSalt: { type: "int", min: 5, max: 30, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var salt = v.weight * v.conc / 100 + v.addSalt;
      var newWeight = v.weight + v.addSalt;
      return Math.round(salt / newWeight * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n食塩を加えると「食塩の量も食塩水の量も増える」。\n両方の変化を反映して新しい濃度を求めます。\n\n【解法】\n① 元の食塩の量:\n  {{weight}} × {{conc}}/100 = {{origSalt}}g\n\n② 食塩を加えた後:\n  新しい食塩の量: {{origSalt}} + {{addSalt}} = {{totalSalt}}g\n  新しい食塩水の量: {{weight}} + {{addSalt}} = {{newWeight}}g\n  ※食塩を加えると食塩水の量も増える！\n\n③ 新しい濃度:\n  {{totalSalt}} / {{newWeight}} × 100 = {{answer}}%\n\n【ポイント】\n・食塩を加える → 分子(食塩)も分母(食塩水)も増える → 濃度UP\n・水を加える場合は分母だけ増える → 濃度DOWN（区別する）",
    // ⚠️ 120秒。四捨五入が要るのに、同難易度で最短の90秒だった。
    //    2026-09-02 実測: 時間切れ 22.2%（母数18）（難易度2の中央値 5.2%）。
    //    引っかけと多様性は削らず、時間で吸収する判断。
    timeLimitSec: 120
  });

  // 濃度算: 目標濃度にするための混合量
  QUESTION_TEMPLATES.push({
    id: "noudo_target_01",
    // 変数生成の制約。以前は generator.js の resolveCustomVariables に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    resolve: function(v) {
      // concA < concTarget < concB になるように設定
      v.concTarget = v.concA + Math.floor((v.concB - v.concA) * (0.3 + Math.random() * 0.4));
      if (v.concTarget <= v.concA) v.concTarget = v.concA + 1;
      if (v.concTarget >= v.concB) v.concTarget = v.concB - 1;
    },
    formats: ["webtesting"],
    category: "濃度算",
    categoryId: 7,
    difficulty: 3,
    templateText: "濃度{{concA}}%の食塩水{{weightA}}gに、濃度{{concB}}%の食塩水を何g混ぜると濃度{{concTarget}}%になるか。",
    variables: {
      concA: { type: "choice", options: [3, 4, 5] },
      weightA: { type: "int", min: 100, max: 400, step: 50 },
      concB: { type: "choice", options: [10, 12, 15, 20] },
      concTarget: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      // concA * weightA + concB * x = concTarget * (weightA + x)
      // x = weightA * (concTarget - concA) / (concB - concTarget)
      return Math.round(v.weightA * (v.concTarget - v.concA) / (v.concB - v.concTarget));
    },
    unit: "g",
    explanationTemplate: "【考え方】\n目標の濃度にするために必要な量を求める逆算問題。\n食塩の量について方程式を立てて解きます。\n\n【解法】\n① 食塩水Bの量をxgとする\n\n② 食塩の量の等式（混合前=混合後）:\n  A由来 + B由来 = 混合後全体\n  {{weightA}}×{{concA}}/100 + x×{{concB}}/100 = ({{weightA}}+x)×{{concTarget}}/100\n\n③ 両辺を100倍して整理:\n  {{concA}}×{{weightA}} + {{concB}}×x = {{concTarget}}×({{weightA}}+x)\n  ({{concB}}-{{concTarget}})×x = {{concTarget}}×{{weightA}} - {{concA}}×{{weightA}}\n\n④ xを求める:\n  x = {{answer}}g\n\n【ポイント】\n・「食塩の量」で方程式を立てるのが濃度算の定石\n・混合前の食塩の合計 = 混合後の食塩の合計\n・「てんびん図」でも解ける: A×(目標-A濃度) = x×(B濃度-目標)",
    timeLimitSec: 150,
    validate: function(v) {
      var x = v.weightA * (v.concTarget - v.concA) / (v.concB - v.concTarget);
      return v.concTarget > v.concA && v.concTarget < v.concB && x > 0 && Math.abs(x - Math.round(x)) < 0.01;
    }
  });

  // 濃度算: 一部取り出して水を加える
  QUESTION_TEMPLATES.push({
    id: "noudo_replace_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.origSalt = v.weight * v.conc / 100;
      d.removedSalt = v.remove * v.conc / 100;
      d.newSalt = d.origSalt - d.removedSalt;
      return d;
    },
    formats: ["webtesting"],
    category: "濃度算",
    categoryId: 7,
    difficulty: 3,
    templateText: "濃度{{conc}}%の食塩水{{weight}}gから{{remove}}gを取り出し、代わりに同量の水を加えた。新しい濃度は何%か。（小数第2位を四捨五入）",
    variables: {
      conc: { type: "choice", options: [5, 8, 10, 12, 15] },
      weight: { type: "int", min: 200, max: 500, step: 50 },
      remove: { type: "int", min: 50, max: 200, step: 50 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var origSalt = v.weight * v.conc / 100;
      var removedSalt = v.remove * v.conc / 100;
      var newSalt = origSalt - removedSalt;
      return Math.round(newSalt / v.weight * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n「取り出して水で補充」の問題。取り出した食塩水にも食塩が含まれるので、\nその分だけ食塩が減ります。全体の量は変わりません。\n\n【解法】\n① 元の食塩の量:\n  {{weight}} × {{conc}}/100 = {{origSalt}}g\n\n② 取り出した食塩水に含まれる食塩:\n  {{remove}} × {{conc}}/100 = {{removedSalt}}g\n  ※取り出す食塩水も元と同じ濃度！\n\n③ 残った食塩の量:\n  {{origSalt}} - {{removedSalt}} = {{newSalt}}g\n\n④ 水を{{remove}}g加えるので全体量は{{weight}}gのまま\n\n⑤ 新しい濃度:\n  {{newSalt}} / {{weight}} × 100 = {{answer}}%\n\n【ポイント】\n・取り出す食塩水は元の濃度と同じ（よく混ざっている前提）\n・全体量が変わらないのがこの問題のミソ\n・公式: 新濃度 = 元の濃度 × (1 - 取り出す量/全体量)",
    timeLimitSec: 120,
    validate: function(v) {
      return v.remove < v.weight;
    }
  });
})();
