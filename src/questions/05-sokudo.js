// カテゴリ5: 速度算
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "sokudo_basic_01",
    formats: ["webtesting"],
    category: "速度算",
    categoryId: 5,
    difficulty: 1,
    templateText: "{{distance}}kmの道のりを時速{{speed}}kmで進むと、何時間何分かかるか。（分単位で答えよ）",
    variables: {
      distance: { type: "int", min: 10, max: 100, step: 5 },
      speed: { type: "choice", options: [4, 5, 6, 10, 12, 15, 20] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.distance / v.speed * 60);
    },
    unit: "分",
    explanationTemplate: "【考え方】\n速度の基本公式「距離 = 速さ × 時間」を変形して時間を求めます。\n\n【解法】\n① 時間 = 距離 / 速さ\n       = {{distance}} / {{speed}}\n       = {{hours}}時間\n\n② 分に変換: {{hours}} × 60 = {{answer}}分\n\n【ポイント】\n・速さの3公式: 距離=速さ×時間、速さ=距離/時間、時間=距離/速さ\n・単位を揃える（km/hならkm、分に変換するなら×60）",
    timeLimitSec: 60,
    validate: function(v) {
      return v.distance % v.speed === 0 || (v.distance * 60 % v.speed === 0);
    }
  });

  QUESTION_TEMPLATES.push({
    id: "sokudo_encounter_01",
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
    formats: ["webtesting"],
    category: "速度算",
    categoryId: 5,
    difficulty: 2,
    templateText: "Aが出発してから{{headStart}}分後にBが同じ方向に出発した。Aの速さは分速{{speedA}}m、Bの速さは分速{{speedB}}mである。BがAに追いつくのはBが出発してから何分後か。",
    variables: {
      headStart: { type: "choice", options: [5, 10, 15, 20] },
      speedA: { type: "choice", options: [60, 70, 80, 100] },
      speedB: { type: "choice", options: [100, 120, 150, 200] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var gap = v.speedA * v.headStart;
      return gap / (v.speedB - v.speedA);
    },
    unit: "分後",
    explanationTemplate: "【考え方】\n追いかけ問題は「先行者との距離差」を「速度の差」で割ります。\n同じ方向に進むので、速い方が速度差の分だけ毎分距離を詰めます。\n\n【解法】\n① Bが出発する時点でのAとBの距離（先行距離）:\n  {{speedA}} × {{headStart}} = {{gap}}m\n\n② 速度の差（毎分縮まる距離）:\n  {{speedB}} - {{speedA}} = {{diff}}m/分\n\n③ 追いつくまでの時間:\n  {{gap}} / {{diff}} = {{answer}}分後\n\n【ポイント】\n・追いかけ → 速さの差で距離を詰める\n・まず「差の距離」を求めてから「差の速度」で割る",
    timeLimitSec: 90,
    validate: function(v) {
      return v.speedB > v.speedA && (v.speedA * v.headStart) % (v.speedB - v.speedA) === 0;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "sokudo_round_01",
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
    explanationTemplate: "【考え方】\n往復の平均速度は「総距離÷総時間」で求めます。\n速度の単純平均（(行き+帰り)÷2）ではないので注意！\n\n【解法】\n① 往復の総距離:\n  {{distance}} × 2 = {{totalDist}}m\n\n② 各区間の時間:\n  行き: {{distance}} / {{speedGo}} = {{timeGo}}分\n  帰り: {{distance}} / {{speedBack}} = {{timeBack}}分\n  合計: {{timeGo}} + {{timeBack}} = {{totalTime}}分\n\n③ 平均の速さ = 総距離 / 総時間:\n  {{totalDist}} / {{totalTime}} = {{answer}}m/分\n\n【ポイント】\n・平均速度 = 総距離÷総時間（速度の平均ではない！）\n・例: 行き60m/分、帰り40m/分 → 平均は50ではなく48m/分\n・公式: 2×v1×v2/(v1+v2) で一発計算も可能",
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
    templateText: "時速{{speedKmh}}kmは秒速何mか。（小数点以下を四捨五入）",
    variables: {
      speedKmh: { type: "choice", options: [36, 54, 72, 90, 108, 144] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.speedKmh * 1000 / 3600);
    },
    unit: "m/秒",
    explanationTemplate: "【考え方】\n単位変換は「距離の単位」と「時間の単位」をそれぞれ変換します。\nkm→m（×1000）、時→秒（÷3600）を同時に行います。\n\n【解法】\n① 時速 → 秒速の変換:\n  時速{{speedKmh}}km = {{speedKmh}} × 1000 / 3600 m/秒\n  = {{speedKmh}} / 3.6\n  = {{answer}} m/秒\n\n【ポイント】\n・時速(km/h) → 秒速(m/s): ÷3.6\n・秒速(m/s) → 時速(km/h): ×3.6\n・3.6 = 3600÷1000（秒÷メートル換算）\n・よく出る値: 時速36km=秒速10m、時速72km=秒速20m",
    timeLimitSec: 60
  });

  // 速度算: 電車のすれ違い
  QUESTION_TEMPLATES.push({
    id: "sokudo_train_01",
    formats: ["webtesting"],
    category: "速度算",
    categoryId: 5,
    difficulty: 3,
    templateText: "長さ{{lenA}}mの電車Aが時速{{speedA}}kmで走っている。長さ{{lenB}}mの電車Bが反対方向から時速{{speedB}}kmで走ってきた。2つの電車がすれ違い始めてからすれ違い終わるまで何秒かかるか。",
    variables: {
      lenA: { type: "int", min: 100, max: 250, step: 50 },
      lenB: { type: "int", min: 100, max: 250, step: 50 },
      speedA: { type: "choice", options: [54, 72, 90] },
      speedB: { type: "choice", options: [54, 72, 90] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var totalLen = v.lenA + v.lenB;
      var totalSpeed = (v.speedA + v.speedB) * 1000 / 3600; // m/秒
      return Math.round(totalLen / totalSpeed);
    },
    unit: "秒",
    explanationTemplate: "【考え方】\n電車のすれ違い問題は「進む距離」と「相対速度」がポイント。\n反対方向 → 速度の和、同じ方向 → 速度の差。\nすれ違う距離 = 2つの電車の長さの合計です。\n\n【解法】\n① すれ違う距離（先頭が出会ってから最後尾が離れるまで）:\n  電車A + 電車B = {{lenA}} + {{lenB}} = {{totalLen}}m\n\n② 相対速度（反対方向なので速さの和）:\n  {{speedA}} + {{speedB}} = {{totalSpeedKmh}}km/h\n  秒速に変換: {{totalSpeedKmh}} / 3.6 = {{totalSpeedMs}}m/秒\n\n③ すれ違い時間 = 距離 / 速度:\n  {{totalLen}} / {{totalSpeedMs}} = {{answer}}秒\n\n【ポイント】\n・すれ違い → 進む距離 = 両方の長さの合計、速度 = 和\n・追い越し → 進む距離 = 両方の長さの合計、速度 = 差\n・単位変換（km/h → m/s）を忘れずに",
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
