// カテゴリ5: 速度算
// ============================================================

// 速さの単位変換。答えが必ず整数になる値だけを列挙してある。
// 「小数点以下を四捨五入」と書いて誤魔化すと、四捨五入の有無で答えが
// 割れる問題が混ざるので、割り切れる値しか出さない方針にした。
var SPEED_CONVERT_CASES = (function () {
  var out = [];
  var a, b;
  // 時速km → 秒速m（÷3.6）。3.6で割り切れるのは18の倍数
  for (a = 18; a <= 180; a += 18) {
    out.push({
      q: "時速" + a + "kmは秒速何mか。", ans: a / 3.6, unit: "m/秒",
      calc: "時速" + a + "km\n  = " + a + " × 1000 ÷ 3600 m/秒\n  = " + a + " ÷ 3.6\n  = " + (a / 3.6) + " m/秒",
      tip: "時速から秒速へは 3.6 で割る"
    });
  }
  // 秒速m → 時速km（×3.6）。整数になるのは5の倍数
  for (b = 5; b <= 50; b += 5) {
    out.push({
      q: "秒速" + b + "mは時速何kmか。", ans: b * 3.6, unit: "km/時",
      calc: "秒速" + b + "m\n  = " + b + " × 3600 ÷ 1000 km/時\n  = " + b + " × 3.6\n  = " + (b * 3.6) + " km/時",
      tip: "秒速から時速へは 3.6 を掛ける"
    });
  }
  // 時速km → 分速m（×1000÷60）。整数になるのは3の倍数
  for (a = 3; a <= 60; a += 3) {
    out.push({
      q: "時速" + a + "kmは分速何mか。", ans: a * 1000 / 60, unit: "m/分",
      calc: "時速" + a + "km\n  = " + a + " × 1000 ÷ 60 m/分\n  = " + (a * 1000 / 60) + " m/分",
      tip: "時速から分速へは 1000 を掛けて 60 で割る"
    });
  }
  // 分速m → 時速km（×60÷1000）。整数になるのは50の倍数
  for (b = 50; b <= 600; b += 50) {
    out.push({
      q: "分速" + b + "mは時速何kmか。", ans: b * 60 / 1000, unit: "km/時",
      calc: "分速" + b + "m\n  = " + b + " × 60 ÷ 1000 km/時\n  = " + (b * 60 / 1000) + " km/時",
      tip: "分速から時速へは 60 を掛けて 1000 で割る"
    });
  }
  // 秒速m → 分速m（×60）
  for (b = 4; b <= 30; b += 2) {
    out.push({
      q: "秒速" + b + "mは分速何mか。", ans: b * 60, unit: "m/分",
      calc: "秒速" + b + "m\n  = " + b + " × 60 m/分\n  = " + (b * 60) + " m/分",
      tip: "秒速から分速へは 60 を掛ける（距離の単位は変わらない）"
    });
  }
  return out;
})();

// 追いかけっこの場面。a が先に出るほう、b が追いかけるほう。
// 解説でも同じ呼び名を使うので、名前を場面と一緒に持たせる。
var CHASE_SCENES = [
  {
    a: "A", b: "B",
    text: function (h, sa, sb) {
      return "Aが出発してから" + h + "分後にBが同じ方向に出発した。Aの速さは分速" + sa
        + "m、Bの速さは分速" + sb + "mである。BがAに追いつくのはBが出発してから何分後か。";
    }
  },
  {
    a: "兄", b: "弟",
    text: function (h, sa, sb) {
      return "兄が家を出てから" + h + "分後に、弟が同じ道を追いかけた。兄の速さは分速" + sa
        + "m、弟の速さは分速" + sb + "mである。弟が兄に追いつくのは弟が出発してから何分後か。";
    }
  },
  {
    a: "先頭のランナー", b: "後続のランナー",
    text: function (h, sa, sb) {
      return "先頭のランナーが通過してから" + h + "分後に、後続のランナーが同じ地点を通過した。先頭は分速" + sa
        + "m、後続は分速" + sb + "mで走り続ける。後続が先頭に追いつくのは通過から何分後か。";
    }
  },
  {
    a: "貨物列車", b: "回送列車",
    text: function (h, sa, sb) {
      return "貨物列車が駅を出発してから" + h + "分後に、同じ方向へ回送列車が出発した。貨物列車は分速" + sa
        + "m、回送列車は分速" + sb + "mで進む。回送列車が追いつくのは出発から何分後か。";
    }
  }
];

// すれ違い・追い越しの場面
var TRAIN_SCENES = [
  { a: "電車A", b: "電車B" },
  { a: "列車P", b: "列車Q" },
  { a: "特急列車", b: "普通列車" }
];

(function() {
  QUESTION_TEMPLATES.push({
    id: "sokudo_basic_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.hours = fracStr(v.distance, v.speed);
      d.hoursStep = stepStr(v.distance, v.speed);
      return d;
    },
    formats: ["webtesting"],
    category: "速度算",
    categoryId: 5,
    difficulty: 1,
    templateText: "{{distance}}kmの道のりを時速{{speed}}kmで進むと、何分かかるか。",
    variables: {
      distance: { type: "int", min: 10, max: 100, step: 5 },
      speed: { type: "choice", options: [4, 5, 6, 10, 12, 15, 20] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.distance / v.speed * 60);
    },
    unit: "分",
    explanationTemplate: "【考え方】\n速度の基本公式「距離 = 速さ × 時間」を変形して時間を求めます。\n\n【解法】\n① 時間 = 距離 / 速さ\n       = {{hoursStep}}時間\n\n② 分に変換: {{hours}} × 60 = {{answer}}分\n\n【ポイント】\n・速さの3公式: 距離=速さ×時間、速さ=距離/時間、時間=距離/速さ\n・単位を揃える（km/hならkm、分に変換するなら×60）",
    timeLimitSec: 60,
    validate: function(v) {
      return v.distance % v.speed === 0 || (v.distance * 60 % v.speed === 0);
    }
  });

  QUESTION_TEMPLATES.push({
    id: "sokudo_encounter_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.totalSpeed = v.speedA + v.speedB;
      d.hours = fracStr(v.distance, d.totalSpeed);
      return d;
    },
    formats: ["webtesting"],
    category: "速度算",
    categoryId: 5,
    difficulty: 2,
    templateText: "AとBが{{distance}}km離れた2地点から同時に向かい合って出発した。Aの速さは時速{{speedA}}km、Bの速さは時速{{speedB}}kmである。2人が出会うのは出発してから何分後か。",
    variables: {
      distance: { type: "int", min: 10, max: 60, step: 5 },
      speedA: { type: "choice", options: [3, 4, 5, 6] },
      speedB: { type: "choice", options: [3, 4, 5, 6] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.distance / (v.speedA + v.speedB) * 60);
    },
    unit: "分後",
    explanationTemplate: "【考え方】\n向かい合って進む（出会い）問題では、2人の速さの「和」を使います。\n2人の距離は毎時(速さA+速さB)ずつ縮まるからです。\n\n【解法】\n① 合計速度（距離が縮まる速さ）:\n  {{speedA}} + {{speedB}} = {{totalSpeed}} km/h\n\n② 出会うまでの時間 = 距離 / 合計速度:\n  {{distance}} / {{totalSpeed}} = {{hours}}時間 = {{answer}}分後\n\n【ポイント】\n・向かい合う → 速さの和（距離が縮まる）\n・同じ方向 → 速さの差（距離が縮まる / 広がる）\n・この2パターンを区別するのが速度算のコツ",
    timeLimitSec: 90,
    validate: function(v) {
      return v.speedA !== v.speedB && (v.distance * 60) % (v.speedA + v.speedB) === 0;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "sokudo_chase_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.gap = v.speedA * v.headStart;
      d.diff = v.speedB - v.speedA;
      return d;
    },
    formats: ["webtesting"],
    category: "速度算",
    categoryId: 5,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      headStart: { type: "choice", options: [3, 4, 5, 6, 8, 10, 12, 15, 20] },
      speedA: { type: "choice", options: [50, 60, 70, 75, 80, 90, 100] },
      speedB: { type: "choice", options: [90, 100, 110, 120, 125, 140, 150, 160, 180, 200] },
      scene: { type: "int", min: 0, max: 3, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      var sc = CHASE_SCENES[v.scene % CHASE_SCENES.length];
      v.nameA = sc.a; v.nameB = sc.b;
      v.q = sc.text(v.headStart, v.speedA, v.speedB);
    },
    answerFormula: function(v) {
      var gap = v.speedA * v.headStart;
      return gap / (v.speedB - v.speedA);
    },
    unit: "分後",
    explanationTemplate: "【考え方】\n追いかけ問題は「先行者との距離差」を「速度の差」で割ります。\n同じ方向に進むので、速い方が速度差の分だけ毎分距離を詰めます。\n\n【解法】\n① {{nameB}}が動き出す時点で開いている距離（先行距離）:\n  {{speedA}} × {{headStart}} = {{gap}}m\n\n② 速度の差（毎分縮まる距離）:\n  {{speedB}} - {{speedA}} = {{diff}}m/分\n\n③ 追いつくまでの時間:\n  {{gap}} / {{diff}} = {{answer}}分後\n\n【ポイント】\n・追いかけ → 速さの差で距離を詰める\n・まず「差の距離」を求めてから「差の速度」で割る\n・先行距離は「先に出たほうの速さ × 先に出た時間」",
    timeLimitSec: 90,
    validate: function(v) {
      return v.speedB > v.speedA && (v.speedA * v.headStart) % (v.speedB - v.speedA) === 0;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "sokudo_round_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.totalDist = v.distance * 2;
      d.timeGo = fracStr(v.distance, v.speedGo);
      d.timeBack = fracStr(v.distance, v.speedBack);
      // 合計時間は、丸めた表示どうしを足すのではなく通分して1つの分数にする。
      // 丸めた値を足すと、そこから先の計算が全部ずれる。
      d.totalTime = fracStr(v.distance * (v.speedGo + v.speedBack),
                            v.speedGo * v.speedBack);
      // 分数のときだけ括弧を付ける。整数に (75) と書くと読みにくい。
      // 括弧が要るのは、÷ のあとに分数が来ると左から評価されて別の値になるため。
      d.totalTimeParen = d.totalTime.indexOf("/") >= 0 ? "(" + d.totalTime + ")" : d.totalTime;
      return d;
    },
    formats: ["webtesting"],
    category: "速度算",
    categoryId: 5,
    difficulty: 2,
    templateText: "家から駅まで{{distance}}mある。行きは分速{{speedGo}}mで歩き、帰りは分速{{speedBack}}mで歩いた。往復の平均の速さは分速何mか。",
    variables: {
      distance: { type: "int", min: 500, max: 3000, step: 100 },
      speedGo: { type: "choice", options: [60, 70, 80, 100] },
      speedBack: { type: "choice", options: [40, 50, 60, 80] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var totalDist = v.distance * 2;
      var totalTime = v.distance / v.speedGo + v.distance / v.speedBack;
      return Math.round(totalDist / totalTime);
    },
    unit: "m/分",
    explanationTemplate: "【考え方】\n往復の平均速度は「総距離÷総時間」で求めます。\n速度の単純平均（(行き+帰り)÷2）ではないので注意！\n\n【解法】\n① 往復の総距離:\n  {{distance}} × 2 = {{totalDist}}m\n\n② 各区間の時間:\n  行き: {{distance}} / {{speedGo}} = {{timeGo}}分\n  帰り: {{distance}} / {{speedBack}} = {{timeBack}}分\n  合計: {{timeGo}} + {{timeBack}} = {{totalTime}}分\n\n③ 平均の速さ = 総距離 / 総時間:\n  {{totalDist}} ÷ {{totalTimeParen}} = {{answer}}m/分\n\n【ポイント】\n・平均速度 = 総距離÷総時間（速度の平均ではない！）\n・例: 行き60m/分、帰り40m/分 → 平均は50ではなく48m/分\n・公式: 2×v1×v2/(v1+v2) で一発計算も可能",
    timeLimitSec: 120,
    validate: function(v) {
      var totalDist = v.distance * 2;
      var totalTime = v.distance / v.speedGo + v.distance / v.speedBack;
      var result = totalDist / totalTime;
      return v.speedGo > v.speedBack && Math.abs(result - Math.round(result)) < 0.01;
    }
  });

  // 速度算: 時速・分速・秒速の変換
  QUESTION_TEMPLATES.push({
    id: "sokudo_convert_01",
    formats: ["webtesting"],
    category: "速度算",
    categoryId: 5,
    difficulty: 1,
    // 変換の向きを4通りに増やした。時速→秒速だけだと6種類しか作れず、
    // 実際の試験では逆向き（秒速→時速）や分速がらみも同じ頻度で出る。
    templateText: "{{q}}",
    variables: {
      idx: { type: "int", min: 0, max: 120, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      var c = SPEED_CONVERT_CASES[v.idx % SPEED_CONVERT_CASES.length];
      v._case = c;
      v.q = c.q;
      v.calc = c.calc;
      v.tip = c.tip;
    },
    answerFormula: function(v) {
      return v._case.ans;
    },
    unit: function(v) {
      return v._case.unit;
    },
    explanationTemplate: "【考え方】\n単位変換は「距離の単位」と「時間の単位」をそれぞれ変換します。\nどちらを何倍・何分の1にするかを分けて考えると間違えません。\n\n【解法】\n{{calc}}\n\n【ポイント】\n・{{tip}}\n・時速(km/h) → 秒速(m/s): ÷3.6、その逆は ×3.6\n・3.6 = 3600 ÷ 1000（時→秒 と km→m をまとめた値）\n・よく出る値: 時速36km=秒速10m、時速72km=秒速20m",
    timeLimitSec: 60
  });

  // 速度算: 電車のすれ違い
  QUESTION_TEMPLATES.push({
    id: "sokudo_train_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.totalLen = v.lenA + v.lenB;
      d.totalSpeedKmh = v.speedA + v.speedB;
      d.totalSpeedMs = Math.round(d.totalSpeedKmh * 1000 / 3600 * 10) / 10;
      return d;
    },
    formats: ["webtesting"],
    category: "速度算",
    categoryId: 5,
    difficulty: 3,
    templateText: "{{q}}",
    variables: {
      lenA: { type: "int", min: 80, max: 300, step: 20 },
      lenB: { type: "int", min: 80, max: 300, step: 20 },
      speedA: { type: "choice", options: [36, 54, 72, 90, 108, 126] },
      speedB: { type: "choice", options: [36, 54, 72, 90, 108, 126] },
      scene: { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      var sc = TRAIN_SCENES[v.scene % TRAIN_SCENES.length];
      v.nameA = sc.a; v.nameB = sc.b;
      v.q = "長さ" + v.lenA + "mの" + sc.a + "が時速" + v.speedA + "kmで走っている。長さ"
        + v.lenB + "mの" + sc.b + "が反対方向から時速" + v.speedB
        + "kmで走ってきた。2つがすれ違い始めてからすれ違い終わるまで何秒かかるか。";
    },
    answerFormula: function(v) {
      var totalLen = v.lenA + v.lenB;
      var totalSpeed = (v.speedA + v.speedB) * 1000 / 3600; // m/秒
      return Math.round(totalLen / totalSpeed);
    },
    unit: "秒",
    explanationTemplate: "【考え方】\n電車のすれ違い問題は「進む距離」と「相対速度」がポイント。\n反対方向 → 速度の和、同じ方向 → 速度の差。\nすれ違う距離 = 2つの電車の長さの合計です。\n\n【解法】\n① すれ違う距離（先頭が出会ってから最後尾が離れるまで）:\n  {{nameA}} + {{nameB}} = {{lenA}} + {{lenB}} = {{totalLen}}m\n\n② 相対速度（反対方向なので速さの和）:\n  {{speedA}} + {{speedB}} = {{totalSpeedKmh}}km/h\n  秒速に変換: {{totalSpeedKmh}} / 3.6 = {{totalSpeedMs}}m/秒\n\n③ すれ違い時間 = 距離 / 速度:\n  {{totalLen}} / {{totalSpeedMs}} = {{answer}}秒\n\n【ポイント】\n・すれ違い → 進む距離 = 両方の長さの合計、速度 = 和\n・追い越し → 進む距離 = 両方の長さの合計、速度 = 差\n・単位変換（km/h → m/s）を忘れずに",
    timeLimitSec: 120,
    validate: function(v) {
      var totalLen = v.lenA + v.lenB;
      var totalSpeed = (v.speedA + v.speedB) * 1000 / 3600;
      var result = totalLen / totalSpeed;
      return Math.abs(result - Math.round(result)) < 0.01;
    }
  });

  // 速度算: 遅刻・早着
  QUESTION_TEMPLATES.push({
    id: "sokudo_late_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.timeDiff = v.late + v.early;
      return d;
    },
    formats: ["webtesting"],
    category: "速度算",
    categoryId: 5,
    difficulty: 2,
    templateText: "家から学校まで分速{{speedSlow}}mで歩くと始業に{{late}}分遅刻するが、分速{{speedFast}}mで歩くと始業{{early}}分前に着く。家から学校までの距離は何mか。",
    variables: {
      speedSlow: { type: "choice", options: [60, 70, 80] },
      speedFast: { type: "choice", options: [100, 120, 150] },
      late: { type: "choice", options: [3, 5, 8, 10] },
      early: { type: "choice", options: [5, 8, 10, 15] }
    },
    answerType: "number",
    answerFormula: function(v) {
      // 遅い速度: t分かかる → t = d/speedSlow
      // 速い速度: (t - late - early)分 = d/speedFast
      // d/speedSlow - d/speedFast = late + early
      var timeDiff = v.late + v.early;
      var d = timeDiff / (1/v.speedSlow - 1/v.speedFast);
      return Math.round(d);
    },
    unit: "m",
    explanationTemplate: "【考え方】\n同じ距離を2つの速度で歩いた時の「時間の差」から距離を逆算します。\n遅い方が到着遅れ分+早い方の余裕分 = 所要時間の差です。\n\n【解法】\n① 2つの速度での所要時間の差:\n  遅い方が{{late}}分遅く、速い方が{{early}}分早い\n  → 時間差 = {{late}} + {{early}} = {{timeDiff}}分\n\n② 距離をdとして方程式を立てる:\n  d/{{speedSlow}} - d/{{speedFast}} = {{timeDiff}}\n  d × (1/{{speedSlow}} - 1/{{speedFast}}) = {{timeDiff}}\n\n③ 距離を求める:\n  d = {{timeDiff}} / (1/{{speedSlow}} - 1/{{speedFast}})\n  d = {{answer}}m\n\n【ポイント】\n・「遅刻○分」と「早着△分」→ 時間差 = ○+△\n・同じ距離を異なる速度で移動 → 距離=(時間差)÷(1/遅-1/速)\n・SPI頻出パターン。公式として覚えてもOK",
    timeLimitSec: 120,
    validate: function(v) {
      var timeDiff = v.late + v.early;
      var d = timeDiff / (1/v.speedSlow - 1/v.speedFast);
      return v.speedFast > v.speedSlow && d > 0 && Math.abs(d - Math.round(d)) < 0.01;
    }
  });
})();
