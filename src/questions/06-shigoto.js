// カテゴリ6: 仕事算
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "shigoto_basic_01",
    formats: ["webtesting"],
    category: "仕事算",
    categoryId: 6,
    difficulty: 1,
    templateText: "ある仕事をAだけですると{{daysA}}日かかり、Bだけですると{{daysB}}日かかる。AとBが一緒にこの仕事をすると何日かかるか。",
    variables: {
      daysA: { type: "choice", options: [6, 8, 10, 12, 15, 20] },
      daysB: { type: "choice", options: [6, 8, 10, 12, 15, 20, 30] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.daysA * v.daysB / (v.daysA + v.daysB);
    },
    unit: "日",
    explanationTemplate: "【考え方】\n仕事算の基本: 仕事全体を「1」として、1日あたりの仕事量を分数で表します。\n2人で同時にやれば仕事量が足し算になります。\n\n【解法】\n① 仕事全体を1とする\n\n② 1日あたりの仕事量:\n  A: 1/{{daysA}}\n  B: 1/{{daysB}}\n\n③ 2人の1日の合計仕事量:\n  1/{{daysA}} + 1/{{daysB}} = {{combined}}\n\n④ かかる日数 = 全体÷1日の仕事量:\n  1 / {{combined}} = {{answer}}日\n\n【ポイント】\n・仕事全体を1とおく → 「○日で完了」= 1日に1/○ずつ進む\n・公式: A×B/(A+B) 日で一発計算も可能\n・仕事算は「速さ」の問題と同じ構造（仕事量=速さ×時間）",
    timeLimitSec: 90,
    validate: function(v) {
      return v.daysA !== v.daysB && Number.isInteger(v.daysA * v.daysB / (v.daysA + v.daysB));
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shigoto_switch_01",
    formats: ["webtesting"],
    category: "仕事算",
    categoryId: 6,
    difficulty: 2,
    templateText: "ある仕事をAだけですると{{daysA}}日、Bだけですると{{daysB}}日かかる。最初にAが{{daysAlone}}日間1人で仕事をし、残りをBが1人で仕上げた。Bが仕事をした日数は何日か。",
    variables: {
      daysA: { type: "choice", options: [6, 10, 12, 15, 20] },
      daysB: { type: "choice", options: [6, 10, 12, 15, 20] },
      daysAlone: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      var remaining = 1 - v.daysAlone / v.daysA;
      return Math.round(remaining * v.daysB);
    },
    unit: "日",
    explanationTemplate: "【考え方】\n途中で作業者が交代する問題。\nまずAが進めた分を計算し、残りをBが仕上げる日数を求めます。\n\n【解法】\n① 仕事全体を1とする\n\n② Aが{{daysAlone}}日間で進めた仕事量:\n  1日の仕事量: 1/{{daysA}}\n  {{daysAlone}}日分: {{daysAlone}}/{{daysA}} = {{aDone}}\n\n③ 残りの仕事量:\n  1 - {{aDone}} = {{remaining}}\n\n④ Bが残りを仕上げる日数:\n  Bの1日の仕事量: 1/{{daysB}}\n  日数 = {{remaining}} ÷ (1/{{daysB}}) = {{remaining}} × {{daysB}} = {{answer}}日\n\n【ポイント】\n・「途中交代」→ まず先の人の進捗を計算 → 残りを後の人で\n・残り = 1 - (先の人の日数/全体日数)",
    timeLimitSec: 120,
    validate: function(v) {
      var remaining = 1 - v.daysAlone / v.daysA;
      var result = remaining * v.daysB;
      return v.daysA !== v.daysB && v.daysAlone < v.daysA && remaining > 0 && Math.abs(result - Math.round(result)) < 0.01;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shigoto_3people_01",
    formats: ["webtesting"],
    category: "仕事算",
    categoryId: 6,
    difficulty: 2,
    templateText: "ある仕事をAだけですると{{daysA}}日、Bだけですると{{daysB}}日、Cだけですると{{daysC}}日かかる。3人で一緒に仕事をすると何日かかるか。",
    variables: {
      daysA: { type: "choice", options: [4, 6, 8, 10, 12] },
      daysB: { type: "choice", options: [6, 8, 10, 12, 15] },
      daysC: { type: "choice", options: [8, 10, 12, 15, 20, 24] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var rate = 1/v.daysA + 1/v.daysB + 1/v.daysC;
      return Math.round(1 / rate);
    },
    unit: "日",
    explanationTemplate: "【考え方】\n2人の仕事算と同じ考え方を3人に拡張します。\n3人の1日の仕事量をすべて足し算します。\n\n【解法】\n① 仕事全体を1とする\n\n② 1日あたりの仕事量:\n  A: 1/{{daysA}}\n  B: 1/{{daysB}}\n  C: 1/{{daysC}}\n\n③ 3人合計の1日の仕事量:\n  1/{{daysA}} + 1/{{daysB}} + 1/{{daysC}} = {{combined}}\n\n④ かかる日数:\n  1 / {{combined}} = {{answer}}日\n\n【ポイント】\n・何人でも同じ方法: 全員の1日の仕事量を合計 → 逆数が日数\n・通分して計算する → 最小公倍数を使うと楽",
    timeLimitSec: 120,
    validate: function(v) {
      var rate = 1/v.daysA + 1/v.daysB + 1/v.daysC;
      return v.daysA !== v.daysB && v.daysB !== v.daysC && v.daysA !== v.daysC && Math.abs(1/rate - Math.round(1/rate)) < 0.01;
    }
  });

  // 仕事算: 水槽
  QUESTION_TEMPLATES.push({
    id: "shigoto_tank_01",
    formats: ["webtesting"],
    category: "仕事算",
    categoryId: 6,
    difficulty: 1,
    templateText: "ある水槽を満水にするのにポンプAだけでは{{hoursA}}時間、ポンプBだけでは{{hoursB}}時間かかる。両方のポンプを同時に使うと何時間で満水になるか。",
    variables: {
      hoursA: { type: "choice", options: [3, 4, 5, 6, 8, 10] },
      hoursB: { type: "choice", options: [4, 5, 6, 8, 10, 12] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.hoursA * v.hoursB / (v.hoursA + v.hoursB);
    },
    unit: "時間",
    explanationTemplate: "【考え方】\n水槽問題は仕事算の応用。水槽を満たす仕事を「1」として、\n各ポンプの1時間あたりの仕事量を足し合わせます。\n\n【解法】\n① 水槽の容量を1とする\n\n② 1時間あたりの仕事量:\n  ポンプA: 1/{{hoursA}}\n  ポンプB: 1/{{hoursB}}\n\n③ 2台同時の1時間の仕事量:\n  1/{{hoursA}} + 1/{{hoursB}} = ({{hoursA}}+{{hoursB}}) / ({{hoursA}}×{{hoursB}})\n\n④ 満水までの時間:\n  1 ÷ 合計仕事量 = {{answer}}時間\n\n【ポイント】\n・水槽問題 = 仕事算と完全に同じ解法\n・「注水」と「排水」が両方ある場合は引き算になる\n・公式: A×B/(A+B) で一発計算可能",
    timeLimitSec: 90,
    validate: function(v) {
      return v.hoursA !== v.hoursB && Number.isInteger(v.hoursA * v.hoursB / (v.hoursA + v.hoursB));
    }
  });

  // 仕事算: 効率の違い
  QUESTION_TEMPLATES.push({
    id: "shigoto_efficiency_01",
    formats: ["webtesting"],
    category: "仕事算",
    categoryId: 6,
    difficulty: 1,
    templateText: "ある仕事を仕上げるのにAは{{daysA}}日かかる。BはAの{{ratio}}倍の速さで仕事ができる。Bだけでこの仕事をすると何日かかるか。",
    variables: {
      daysA: { type: "choice", options: [6, 8, 10, 12, 15, 20, 24, 30] },
      ratio: { type: "choice", options: [2, 3, 4, 5, 6] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.daysA / v.ratio;
    },
    unit: "日",
    explanationTemplate: "【考え方】\n「速さが○倍」= 「かかる時間は1/○倍」です。\n速さと時間は反比例の関係にあります。\n\n【解法】\n① BはAの{{ratio}}倍の速さで仕事ができる\n  → 同じ仕事を 1/{{ratio}} の時間で完了できる\n\n② Bの日数 = Aの日数 / {{ratio}}\n  = {{daysA}} / {{ratio}} = {{answer}}日\n\n【ポイント】\n・速さ(効率)が○倍 → 時間は1/○倍（反比例）\n・例: 2倍速ければ半分の時間で終わる\n・逆に「○倍の時間がかかる」= 速さは1/○倍",
    timeLimitSec: 60,
    validate: function(v) {
      return Number.isInteger(v.daysA / v.ratio);
    }
  });

  // 仕事算: 途中から合流
  QUESTION_TEMPLATES.push({
    id: "shigoto_join_01",
    formats: ["webtesting"],
    category: "仕事算",
    categoryId: 6,
    difficulty: 3,
    templateText: "ある仕事をAだけですると{{daysA}}日かかる。Aが{{daysAlone}}日間1人で仕事をした後、Bが加わって2人で残りを仕上げたところ、さらに{{daysTogether}}日かかった。Bだけでこの仕事をすると何日かかるか。",
    variables: {
      daysA: { type: "choice", options: [10, 12, 15, 18, 20] },
      daysAlone: { type: "custom" },
      daysTogether: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      // A単独でdaysAlone日: daysAlone/daysA 完了
      // 残り: 1 - daysAlone/daysA
      // 2人でdaysTogether日: daysTogether*(1/daysA + 1/daysB) = 残り
      // 1/daysB = (残り/daysTogether) - 1/daysA
      var remaining = 1 - v.daysAlone / v.daysA;
      var bRate = remaining / v.daysTogether - 1 / v.daysA;
      return Math.round(1 / bRate);
    },
    unit: "日",
    explanationTemplate: "【考え方】\nBの仕事速度が未知の逆算問題。\nAの単独作業→A+Bの共同作業の情報からBの速度を求めます。\n\n【解法】\n① 仕事全体を1とする\n\n② Aが{{daysAlone}}日間で進めた仕事量:\n  {{daysAlone}}/{{daysA}} = {{aDone}}\n\n③ 残りの仕事量:\n  1 - {{aDone}} = {{remaining}}\n\n④ 2人で{{daysTogether}}日かけて残りを完了:\n  (1/{{daysA}} + 1/B) × {{daysTogether}} = {{remaining}}\n\n⑤ Bの1日の仕事量を求める:\n  1/B = {{remaining}}/{{daysTogether}} - 1/{{daysA}}\n\n⑥ Bだけでかかる日数:\n  B = {{answer}}日\n\n【ポイント】\n・「途中から合流」→ 残りの仕事量を方程式で立てる\n・1/B = (残り÷日数) - 1/A → B = その逆数",
    timeLimitSec: 150,
    validate: function(v) {
      var remaining = 1 - v.daysAlone / v.daysA;
      var bRate = remaining / v.daysTogether - 1 / v.daysA;
      return bRate > 0 && Number.isInteger(Math.round(1/bRate)) && Math.abs(1/bRate - Math.round(1/bRate)) < 0.01;
    }
  });
})();
