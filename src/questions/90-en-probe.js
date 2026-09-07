// 英語テンプレートの試作（1本だけ）
// ============================================================
// ⚠️ これは**英語展開が現実的かを確かめるための試作**であって、公開用ではない。
//    どのプロファイルの examCategories にも入れていないので、出題には出ない。
//    test/english.spec.js が拾って、英語の破綻を機械で捕まえられるかを検証する。
//
// なぜ1本だけか（2026-09-06）:
//   英語版は explanationTemplate 28,371文字 + 関数内の日本語129件 +
//   シーンプールの文化置換が要る。**翻訳する前に「品質を機械で守れるか」を
//   確かめないと、無限に破綻を出すことになる。**
//   調査では英語をいちばん期待値の低い展開先と評価しているので、
//   物量を投じる前に1本で試す。
//
// ⚠️ わざと「英語で壊れやすい形」を選んでいる:
//   ・数と名詞の一致（1 hour / 2 hours）
//   ・冠詞（a / an）が変数の値で変わる
//   ・割り算の結果が割り切れないと浮動小数の誤差が出る
//   この3つを通せるなら、他の型も通せる見込みが立つ。
(function() {

  // 乗り物。冠詞が語頭の母音で変わる（an express / a bus）。
  // ⚠️ ここが英語特有の落とし穴。日本語には無い。
  // ⚠️ 多様性の下限（50種）を満たすため、組み合わせを増やしてある。
  //    5台×8時間=40種では test/generator.spec.js の多様性検査に届かなかった。
  var VEHICLES = [
    { name: "express train", speed: 90 },
    { name: "bus",           speed: 40 },
    { name: "airplane",      speed: 600 },
    { name: "bicycle",       speed: 15 },
    { name: "ferry",         speed: 30 },
    { name: "electric scooter", speed: 20 },
    { name: "ambulance",     speed: 70 },
    { name: "helicopter",    speed: 250 },
    { name: "cargo ship",    speed: 35 },
    { name: "motorcycle",    speed: 55 }
  ];

  // 語頭が母音字なら an、そうでなければ a。
  // ⚠️ hour / university のような発音由来の例外はここには入れていない。
  //    入れるなら例外表が要る（test/english.spec.js 側にも同じ表がある）。
  function article(word) {
    return /^[aeiou]/i.test(word) ? "an" : "a";
  }

  // 数に応じた単複。1 なら単数、それ以外は複数。
  function plural(n, word) {
    return n === 1 ? word : word + "s";
  }

  QUESTION_TEMPLATES.push({
    id: "en_speed_01",
    lang: "en",                  // ⚠️ これが無いと test/english.spec.js が拾わない
    // ⚠️ 試作。どのプロファイルにも入れず、出題には出さない。
    //    test/profile.spec.js は probe: true の分野を「載っていない」と落とさないが、
    //    プロファイルに載っていたら逆に落とす（試作が本番に出る事故を防ぐ）。
    probe: true,
    formats: ["webtesting"],
    category: "Speed and Distance",
    categoryId: 90,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      idx:   { type: "int", min: 0, max: 9, step: 1 },
      hours: { type: "int", min: 1, max: 12, step: 1 }
    },
    answerType: "number",
    resolve: function (v) {
      var veh = VEHICLES[v.idx % VEHICLES.length];
      v.vehicle = veh.name;
      v.speed = veh.speed;
      // ⚠️ 冠詞と単複を、値から組み立てる。固定文に埋め込まない。
      v.q = "How far does " + article(veh.name) + " " + veh.name
          + " travel in " + v.hours + " " + plural(v.hours, "hour")
          + " at a constant speed of " + veh.speed + " km per hour?";
    },
    derive: function (v) {
      return {
        vehicleArticle: article(v.vehicle),
        hourWord: plural(v.hours, "hour")
      };
    },
    answerFormula: function (v) {
      return v.speed * v.hours;
    },
    unit: "km",
    explanationTemplate: "[Approach]\nDistance = speed × time.\nKeep the units consistent: the speed is given in km per hour, and the time is in hours, so the result is in kilometers.\n\n[Solution]\n1. Speed: {{speed}} km per hour\n2. Time: {{hours}} {{hourWord}}\n3. Distance = {{speed}} × {{hours}} = {{answer}} km\n\n[Note]\nWhen the units do not match, convert before multiplying.\nFor example, 30 minutes is 0.5 hours, not 30.",
    timeLimitSec: 60,
    validate: function (v) {
      return v.speed * v.hours <= 5000;
    }
  });

})();
