// カテゴリ6: 仕事算
// ============================================================
// 仕事算は「1日あたりの仕事量を足す」だけの単純な型なので、数値を変えても
// 同じ問題に見えてしまう。場面（誰が何をするか）を差し替えて、
// 利用者が別の問題と認識できるようにしている。
//
// 日数の組は validate で弾くのではなく、条件を満たすものをあらかじめ
// 列挙しておく。弾く方式は生成の試行を無駄にするうえ、
// 「結局何種類作れるのか」が読めない（実測で basic は7種類しかなかった）。
// ============================================================

// 1/a + 1/b の逆数が整数になる組（2人が同時に働くと整数日で終わる組）
var WORK_PAIRS_2 = (function () {
  var out = [];
  for (var a = 3; a <= 60; a++) {
    for (var b = a + 1; b <= 60; b++) {
      var h = a * b / (a + b);
      if (h === Math.round(h) && h >= 2 && h <= 20) out.push([a, b]);
    }
  }
  return out;
})();

// 3人版。1/a + 1/b + 1/c の逆数が整数になる組
var WORK_TRIPLES = (function () {
  var out = [];
  for (var a = 3; a <= 24; a++) {
    for (var b = a + 1; b <= 40; b++) {
      for (var c = b + 1; c <= 60; c++) {
        var d = 1 / (1 / a + 1 / b + 1 / c);
        if (Math.abs(d - Math.round(d)) < 1e-9 && Math.round(d) >= 2 && Math.round(d) <= 12) {
          out.push([a, b, c]);
        }
      }
    }
  }
  return out;
})();

// 途中合流。Aが alone 日働いた後、2人で tog 日で仕上げたとき、
// Bの単独日数がちょうど整数になる組み合わせ
var WORK_JOIN_CASES = (function () {
  var out = [];
  var As = [8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 27, 30];
  var Bs = [5, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 30, 36];
  for (var i = 0; i < As.length; i++) {
    for (var k = 1; k < As[i]; k++) {
      var rem = 1 - k / As[i];
      if (rem <= 0) continue;
      for (var j = 0; j < Bs.length; j++) {
        var tog = rem / (1 / As[i] + 1 / Bs[j]);
        if (Math.abs(tog - Math.round(tog)) < 1e-9 && Math.round(tog) >= 1 && Math.round(tog) <= 15) {
          out.push([As[i], k, Math.round(tog)]);
        }
      }
    }
  }
  return out;
})();

// 2人で1つの仕事をする場面。job は解説で「この○○」と受けるための名詞。
var WORK_SCENES_2 = [
  {
    a: "A", b: "B", job: "仕事",
    text: function (x, y) {
      return "ある仕事をAだけですると" + x + "日かかり、Bだけですると" + y
        + "日かかる。AとBが一緒にこの仕事をすると何日かかるか。";
    }
  },
  {
    a: "兄", b: "弟", job: "掃除",
    text: function (x, y) {
      return "ある倉庫の掃除を、兄1人ですると" + x + "日、弟1人ですると" + y
        + "日かかる。2人で一緒に掃除をすると何日かかるか。";
    }
  },
  {
    a: "Pさん", b: "Qさん", job: "入力作業",
    text: function (x, y) {
      return "ある原稿の入力作業を、Pさん1人では" + x + "日、Qさん1人では" + y
        + "日で終える。2人で同時に進めると何日かかるか。";
    }
  },
  {
    a: "機械A", b: "機械B", job: "作業",
    text: function (x, y) {
      return "ある畑を耕すのに、機械Aだけでは" + x + "日、機械Bだけでは" + y
        + "日かかる。2台を同時に使うと何日かかるか。";
    }
  },
  {
    a: "Xチーム", b: "Yチーム", job: "工事",
    text: function (x, y) {
      return "ある工事を、Xチームだけでは" + x + "日、Yチームだけでは" + y
        + "日かかる。2つのチームが合同で行うと何日かかるか。";
    }
  },
  {
    a: "職人", b: "見習い", job: "組み立て",
    text: function (x, y) {
      return "ある製品の組み立てを、職人1人では" + x + "日、見習い1人では" + y
        + "日かかる。2人で分担すると何日かかるか。";
    }
  }
];

// 水槽・タンクを満たす場面（単位が時間になる）
var WORK_SCENES_TANK = [
  {
    a: "ポンプA", b: "ポンプB", job: "水槽",
    text: function (x, y) {
      return "ある水槽を満水にするのにポンプAだけでは" + x + "時間、ポンプBだけでは" + y
        + "時間かかる。両方のポンプを同時に使うと何時間で満水になるか。";
    }
  },
  {
    a: "蛇口A", b: "蛇口B", job: "浴槽",
    text: function (x, y) {
      return "浴槽に湯をためるのに、蛇口Aだけでは" + x + "時間、蛇口Bだけでは" + y
        + "時間かかる。両方の蛇口を同時に開くと何時間でいっぱいになるか。";
    }
  },
  {
    a: "給水管P", b: "給水管Q", job: "貯水タンク",
    text: function (x, y) {
      return "貯水タンクを満たすのに、給水管Pだけでは" + x + "時間、給水管Qだけでは" + y
        + "時間かかる。2本の給水管を同時に使うと何時間かかるか。";
    }
  },
  {
    a: "ホースA", b: "ホースB", job: "プール",
    text: function (x, y) {
      return "プールに水を入れるのに、ホースAだけでは" + x + "時間、ホースBだけでは" + y
        + "時間かかる。2本のホースを同時に使うと何時間かかるか。";
    }
  },
  {
    a: "装置A", b: "装置B", job: "タンク",
    text: function (x, y) {
      return "薬液タンクを満たすのに、装置Aだけでは" + x + "時間、装置Bだけでは" + y
        + "時間かかる。2台を同時に稼働させると何時間かかるか。";
    }
  }
];

// 3人で1つの仕事をする場面
var WORK_SCENES_3 = [
  {
    job: "仕事",
    text: function (x, y, z) {
      return "ある仕事をAだけですると" + x + "日、Bだけですると" + y + "日、Cだけですると" + z
        + "日かかる。3人で一緒に仕事をすると何日かかるか。";
    }
  },
  {
    job: "袋詰め",
    text: function (x, y, z) {
      return "ある商品の袋詰めを、Pさん1人では" + x + "日、Qさん1人では" + y + "日、Rさん1人では" + z
        + "日で終える。3人で同時に進めると何日かかるか。";
    }
  },
  {
    job: "塗装",
    text: function (x, y, z) {
      return "ある建物の塗装を、甲組だけでは" + x + "日、乙組だけでは" + y + "日、丙組だけでは" + z
        + "日かかる。3組が合同で行うと何日かかるか。";
    }
  },
  {
    job: "点検",
    text: function (x, y, z) {
      return "工場の設備点検を、班Aだけでは" + x + "日、班Bだけでは" + y + "日、班Cだけでは" + z
        + "日かかる。3班で手分けすると何日かかるか。";
    }
  },
  {
    job: "写経",
    text: function (x, y, z) {
      return "ある資料の書き写しを、Xさんは" + x + "日、Yさんは" + y + "日、Zさんは" + z
        + "日で終える。3人で同時に取りかかると何日かかるか。";
    }
  }
];

(function() {
  QUESTION_TEMPLATES.push({
    id: "shigoto_basic_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.combined = "(" + v.daysA + " + " + v.daysB + ") / (" + v.daysA + " × " + v.daysB + ")";
      return d;
    },
    formats: ["webtesting"],
    category: "仕事算",
    categoryId: 6,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      pair:  { type: "int", min: 0, max: 200, step: 1 },
      swap:  { type: "choice", options: [0, 1] },
      scene: { type: "int", min: 0, max: 5, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      var p = WORK_PAIRS_2[v.pair % WORK_PAIRS_2.length];
      v.daysA = v.swap ? p[1] : p[0];
      v.daysB = v.swap ? p[0] : p[1];
      var sc = WORK_SCENES_2[v.scene % WORK_SCENES_2.length];
      v.a = sc.a; v.b = sc.b; v.job = sc.job;
      v.q = sc.text(v.daysA, v.daysB);
    },
    answerFormula: function(v) {
      return v.daysA * v.daysB / (v.daysA + v.daysB);
    },
    unit: "日",
    explanationTemplate: "【考え方】\n仕事算の基本: {{job}}全体を「1」として、1日あたりの仕事量を分数で表します。\n2人で同時にやれば仕事量が足し算になります。\n\n【解法】\n① {{job}}全体を1とする\n\n② 1日あたりの仕事量:\n  {{a}}: 1/{{daysA}}\n  {{b}}: 1/{{daysB}}\n\n③ 2人の1日の合計仕事量:\n  1/{{daysA}} + 1/{{daysB}} = {{combined}}\n\n④ かかる日数 = 全体÷1日の仕事量:\n  1 ÷ ({{combined}}) = {{answer}}日\n\n【ポイント】\n・全体を1とおく → 「○日で完了」= 1日に1/○ずつ進む\n・公式: A×B/(A+B) 日で一発計算も可能\n・仕事算は「速さ」の問題と同じ構造（仕事量=速さ×時間）",
    timeLimitSec: 90
  });

  QUESTION_TEMPLATES.push({
    id: "shigoto_switch_01",
    // 変数生成の制約。以前は generator.js の resolveCustomVariables に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    resolve: function(v) {
      // Aが何日か働いた後の残りをBが整数日で終えられるようにする
      for (var attempt = 0; attempt < 50; attempt++) {
        var dAlone = 1 + Math.floor(Math.random() * (v.daysA - 1)); // 1〜daysA-1
        var remaining = 1 - dAlone / v.daysA;
        var bDays = remaining * v.daysB;
        if (remaining > 0 && Math.abs(bDays - Math.round(bDays)) < 0.01) {
          v.daysAlone = dAlone;
          return;
        }
      }
      // フォールバック
      v.daysAlone = Math.floor(v.daysA / 2);
    },
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.aDone = fracStr(v.daysAlone, v.daysA);
      d.aDoneStep = stepStr(v.daysAlone, v.daysA);
      d.remaining = fracStr(v.daysA - v.daysAlone, v.daysA);
      return d;
    },
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
    explanationTemplate: "【考え方】\n途中で作業者が交代する問題。\nまずAが進めた分を計算し、残りをBが仕上げる日数を求めます。\n\n【解法】\n① 仕事全体を1とする\n\n② Aが{{daysAlone}}日間で進めた仕事量:\n  1日の仕事量: 1/{{daysA}}\n  {{daysAlone}}日分: {{aDoneStep}}\n\n③ 残りの仕事量:\n  1 - {{aDone}} = {{remaining}}\n\n④ Bが残りを仕上げる日数:\n  Bの1日の仕事量: 1/{{daysB}}\n  日数 = ({{remaining}}) ÷ (1/{{daysB}}) = ({{remaining}}) × {{daysB}} = {{answer}}日\n\n【ポイント】\n・「途中交代」→ まず先の人の進捗を計算 → 残りを後の人で\n・残り = 1 - (先の人の日数/全体日数)",
    timeLimitSec: 120,
    validate: function(v) {
      var remaining = 1 - v.daysAlone / v.daysA;
      var result = remaining * v.daysB;
      return v.daysA !== v.daysB && v.daysAlone < v.daysA && remaining > 0 && Math.abs(result - Math.round(result)) < 0.01;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shigoto_3people_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      var p3 = v.daysB * v.daysC + v.daysA * v.daysC + v.daysA * v.daysB;
      d.combined = fracStr(p3, v.daysA * v.daysB * v.daysC);
      return d;
    },
    formats: ["webtesting"],
    category: "仕事算",
    categoryId: 6,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      triple: { type: "int", min: 0, max: 200, step: 1 },
      order:  { type: "choice", options: [0, 1, 2] },
      scene:  { type: "int", min: 0, max: 4, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      var t = WORK_TRIPLES[v.triple % WORK_TRIPLES.length].slice();
      // 大きい順・小さい順が固定だと「一番左が一番速い」と覚えられてしまう
      if (v.order === 1) t.reverse();
      else if (v.order === 2) t = [t[1], t[2], t[0]];
      v.daysA = t[0]; v.daysB = t[1]; v.daysC = t[2];
      var sc = WORK_SCENES_3[v.scene % WORK_SCENES_3.length];
      v.job = sc.job;
      v.q = sc.text(v.daysA, v.daysB, v.daysC);
    },
    answerFormula: function(v) {
      var rate = 1/v.daysA + 1/v.daysB + 1/v.daysC;
      return Math.round(1 / rate);
    },
    unit: "日",
    explanationTemplate: "【考え方】\n2人の仕事算と同じ考え方を3人に拡張します。\n3人の1日の仕事量をすべて足し算します。\n\n【解法】\n① {{job}}全体を1とする\n\n② 1日あたりの仕事量:\n  1人目: 1/{{daysA}}\n  2人目: 1/{{daysB}}\n  3人目: 1/{{daysC}}\n\n③ 3人合計の1日の仕事量:\n  1/{{daysA}} + 1/{{daysB}} + 1/{{daysC}} = {{combined}}\n\n④ かかる日数:\n  1 ÷ ({{combined}}) = {{answer}}日\n\n【ポイント】\n・何人でも同じ方法: 全員の1日の仕事量を合計 → 逆数が日数\n・通分して計算する → 最小公倍数を使うと楽",
    timeLimitSec: 120
  });

  // 仕事算: 水槽
  QUESTION_TEMPLATES.push({
    id: "shigoto_tank_01",
    formats: ["webtesting"],
    category: "仕事算",
    categoryId: 6,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      pair:  { type: "int", min: 0, max: 200, step: 1 },
      swap:  { type: "choice", options: [0, 1] },
      scene: { type: "int", min: 0, max: 4, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      // 水槽は「何時間で満水になるまでの時間」なので、日数の組より小さめの値を使う
      var pool = WORK_PAIRS_2.filter(function (p) { return p[1] <= 40; });
      var p = pool[v.pair % pool.length];
      v.hoursA = v.swap ? p[1] : p[0];
      v.hoursB = v.swap ? p[0] : p[1];
      var sc = WORK_SCENES_TANK[v.scene % WORK_SCENES_TANK.length];
      v.a = sc.a; v.b = sc.b; v.job = sc.job;
      v.q = sc.text(v.hoursA, v.hoursB);
    },
    answerFormula: function(v) {
      return v.hoursA * v.hoursB / (v.hoursA + v.hoursB);
    },
    unit: "時間",
    explanationTemplate: "【考え方】\n{{job}}の問題は仕事算の応用。満たす仕事を「1」として、\n1時間あたりの仕事量を足し合わせます。\n\n【解法】\n① {{job}}の容量を1とする\n\n② 1時間あたりの仕事量:\n  {{a}}: 1/{{hoursA}}\n  {{b}}: 1/{{hoursB}}\n\n③ 2つ同時の1時間の仕事量:\n  1/{{hoursA}} + 1/{{hoursB}} = ({{hoursA}}+{{hoursB}}) / ({{hoursA}}×{{hoursB}})\n\n④ 満たすまでの時間:\n  1 ÷ 合計仕事量 = {{answer}}時間\n\n【ポイント】\n・水槽問題 = 仕事算と完全に同じ解法\n・「注水」と「排水」が両方ある場合は引き算になる\n・公式: A×B/(A+B) で一発計算可能",
    timeLimitSec: 90
  });

  // 仕事算: 効率の違い
  QUESTION_TEMPLATES.push({
    id: "shigoto_efficiency_01",
    formats: ["webtesting"],
    category: "仕事算",
    categoryId: 6,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      daysA: { type: "choice", options: [6, 8, 10, 12, 15, 16, 18, 20, 21, 24, 28, 30, 32, 36, 40, 42, 45, 48, 54, 56, 60, 63, 72] },
      ratio: { type: "choice", options: [2, 3, 4, 5, 6, 7, 8, 9] },
      scene: { type: "int", min: 0, max: 4, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      var sc = WORK_EFFICIENCY_SCENES[v.scene % WORK_EFFICIENCY_SCENES.length];
      v.a = sc.a; v.b = sc.b;
      v.q = sc.text(v.daysA, v.ratio);
    },
    answerFormula: function(v) {
      return v.daysA / v.ratio;
    },
    unit: "日",
    explanationTemplate: "【考え方】\n「速さが○倍」= 「かかる時間は1/○倍」です。\n速さと時間は反比例の関係にあります。\n\n【解法】\n① {{b}}は{{a}}の{{ratio}}倍の速さで進められる\n  → 同じ量を 1/{{ratio}} の時間で終えられる\n\n② {{b}}の日数 = {{a}}の日数 / {{ratio}}\n  = {{daysA}} / {{ratio}} = {{answer}}日\n\n【ポイント】\n・速さ(効率)が○倍 → 時間は1/○倍（反比例）\n・例: 2倍速ければ半分の時間で終わる\n・逆に「○倍の時間がかかる」= 速さは1/○倍",
    timeLimitSec: 60,
    validate: function(v) {
      return Number.isInteger(v.daysA / v.ratio) && v.daysA / v.ratio >= 2;
    }
  });

  // 仕事算: 途中から合流
  QUESTION_TEMPLATES.push({
    id: "shigoto_join_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      var jA = v.daysA, jAl = v.daysAlone, jTg = v.daysTogether;
      d.aDone     = fracStr(jAl, jA);              // ② Aが進めた量
      d.remaining = fracStr(jA - jAl, jA);         // ③ 残り
      d.remPerDay = fracStr(jA - jAl, jA * jTg);   // ⑤ 残り ÷ 共同日数
      d.bRate     = fracStr(jA - jAl - jTg, jA * jTg); // ⑤ 1/B
      return d;
    },
    formats: ["webtesting"],
    category: "仕事算",
    categoryId: 6,
    difficulty: 3,
    templateText: "{{q}}",
    variables: {
      idx:   { type: "int", min: 0, max: 400, step: 1 },
      scene: { type: "int", min: 0, max: 4, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      var c = WORK_JOIN_CASES[v.idx % WORK_JOIN_CASES.length];
      v.daysA = c[0]; v.daysAlone = c[1]; v.daysTogether = c[2];
      var sc = WORK_JOIN_SCENES[v.scene % WORK_JOIN_SCENES.length];
      v.a = sc.a; v.b = sc.b;
      v.q = sc.text(v.daysA, v.daysAlone, v.daysTogether);
    },
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
    explanationTemplate: "【考え方】\n{{b}}の作業速度が未知の逆算問題。\n{{a}}の単独作業→2人の共同作業の情報から{{b}}の速度を求めます。\n\n【解法】\n① 全体を1とする（分数のまま計算します）\n\n② {{a}}が{{daysAlone}}日間で進めた量:\n  1/{{daysA}} × {{daysAlone}} = {{aDone}}\n\n③ 残りの量:\n  1 - {{aDone}} = {{remaining}}\n\n④ 2人で{{daysTogether}}日かけて残りを完了:\n  (1/{{daysA}} + 1/B) × {{daysTogether}} = {{remaining}}\n\n⑤ {{b}}の1日の仕事量を求める:\n  1/B = {{remaining}} ÷ {{daysTogether}} - 1/{{daysA}}\n  = {{remPerDay}} - 1/{{daysA}}\n  = {{bRate}}\n\n⑥ {{b}}だけでかかる日数:\n  B = 1 ÷ ({{bRate}}) = {{answer}}日\n\n【ポイント】\n・「途中から合流」→ 残りの量を方程式で立てる\n・1/B = (残り÷日数) - 1/A → B = その逆数",
    timeLimitSec: 150,
    validate: function(v) {
      var remaining = 1 - v.daysAlone / v.daysA;
      var bRate = remaining / v.daysTogether - 1 / v.daysA;
      return bRate > 0 && Math.abs(1/bRate - Math.round(1/bRate)) < 0.01 && Math.round(1/bRate) >= 2;
    }
  });
})();

// 効率比較の場面。a が基準、b が「a の○倍の速さ」で働くほう。
var WORK_EFFICIENCY_SCENES = [
  {
    a: "A", b: "B",
    text: function (d, r) {
      return "ある仕事を仕上げるのにAは" + d + "日かかる。BはAの" + r
        + "倍の速さで仕事ができる。Bだけでこの仕事をすると何日かかるか。";
    }
  },
  {
    a: "旧型の機械", b: "新型の機械",
    text: function (d, r) {
      return "ある部品の加工に、旧型の機械では" + d + "日かかる。新型の機械は旧型の" + r
        + "倍の速さで加工できる。新型の機械だけで加工すると何日かかるか。";
    }
  },
  {
    a: "見習い", b: "職人",
    text: function (d, r) {
      return "ある家具を作るのに見習いは" + d + "日かかる。職人は見習いの" + r
        + "倍の速さで作ることができる。職人だけで作ると何日かかるか。";
    }
  },
  {
    a: "手作業", b: "自動装置",
    text: function (d, r) {
      return "ある検品作業を手作業で行うと" + d + "日かかる。自動装置は手作業の" + r
        + "倍の速さで処理できる。自動装置だけで行うと何日かかるか。";
    }
  },
  {
    a: "Pチーム", b: "Qチーム",
    text: function (d, r) {
      return "ある調査をPチームだけで行うと" + d + "日かかる。QチームはPチームの" + r
        + "倍の速さで調査を進められる。Qチームだけで行うと何日かかるか。";
    }
  }
];

// 途中合流の場面
var WORK_JOIN_SCENES = [
  {
    a: "A", b: "B",
    text: function (dA, alone, tog) {
      return "ある仕事をAだけですると" + dA + "日かかる。Aが" + alone
        + "日間1人で仕事をした後、Bが加わって2人で残りを仕上げたところ、さらに" + tog
        + "日かかった。Bだけでこの仕事をすると何日かかるか。";
    }
  },
  {
    a: "兄", b: "弟",
    text: function (dA, alone, tog) {
      return "ある部屋の片付けを兄1人ですると" + dA + "日かかる。兄が" + alone
        + "日間1人で片付けた後、弟が手伝いに加わり、2人でさらに" + tog
        + "日かけて終えた。弟1人で片付けると何日かかるか。";
    }
  },
  {
    a: "Pさん", b: "Qさん",
    text: function (dA, alone, tog) {
      return "ある資料の作成をPさん1人ですると" + dA + "日かかる。Pさんが" + alone
        + "日間作業した後、Qさんが加わって2人で進め、さらに" + tog
        + "日で完成した。Qさん1人で作成すると何日かかるか。";
    }
  },
  {
    a: "機械A", b: "機械B",
    text: function (dA, alone, tog) {
      return "ある量の製品を作るのに機械Aだけでは" + dA + "日かかる。機械Aを" + alone
        + "日間動かした後、機械Bも動かして2台でさらに" + tog
        + "日かけて作り終えた。機械Bだけで作ると何日かかるか。";
    }
  },
  {
    a: "甲組", b: "乙組",
    text: function (dA, alone, tog) {
      return "ある工事を甲組だけで行うと" + dA + "日かかる。甲組が" + alone
        + "日間工事を進めた後、乙組が加わって2組でさらに" + tog
        + "日かけて完了した。乙組だけで行うと何日かかるか。";
    }
  }
];
