// カテゴリ14: 整数の性質（約数・倍数・剰余・N進法）
// ============================================================
// 公務員試験（数的推理）の頻出分野。SPIには出ないので koumuin プロファイルだけで使う。
//
// ⚠️ なぜ足したか（2026-09-06）
// 公務員プロファイルは難易度[2,3]を宣言しているのに、難易度3のテンプレが
// 全89本中18本しかなく、実測で**難易度3が全体の5%**しか出ていなかった。
// 「SPIより難しい」と宣言しただけで、中身は難易度2のままだった。
// test/profile.spec.js がこれを実データから指摘し続けていた。
//
// ⚠️ 生成上の注意
// 整数問題は「答えが整数になる」だけでなく「答えが一意に定まる」ことが要る。
// 剰余（中国剰余定理型）は解が周期的に無限にあるので、範囲を必ず区切る。
(function() {

  // 覆面算・魔方陣は図が要るので入れない（描画基盤が無い）。
  // ここは数値だけで完結する型に絞る。

  // --- 最大公約数・最小公倍数 ---
  // 場面。gcd/lcm を「何の話か」に落とす。数字だけだと公務員の出題文と離れる。
  var GCDLCM_SCENES = [
    { text: function (a, b) { return "縦" + a + "cm、横" + b + "cmの長方形の紙を、余りが出ないように同じ大きさの正方形に切り分ける。正方形の1辺を最大何cmにできるか。"; }, kind: "gcd", unit: "cm" },
    { text: function (a, b) { return "赤いランプは" + a + "秒ごと、青いランプは" + b + "秒ごとに点灯する。同時に点灯した後、次に同時に点灯するのは何秒後か。"; }, kind: "lcm", unit: "秒後" },
    { text: function (a, b) { return "鉛筆" + a + "本とノート" + b + "冊を、余りが出ないように何人かに同じ数ずつ配る。最大何人に配れるか。"; }, kind: "gcd", unit: "人" },
    { text: function (a, b) { return "A駅からは" + a + "分ごと、B駅からは" + b + "分ごとにバスが出る。同時に出発した後、次に同時に出発するのは何分後か。"; }, kind: "lcm", unit: "分後" }
  ];

  GCDLCM_SCENES.forEach(function (sc, i) {
    QUESTION_TEMPLATES.push({
      id: "seisu_gcdlcm_0" + (i + 1),
      formats: ["webtesting"],
      category: "整数の性質",
      categoryId: 14,
      difficulty: 2,
      templateText: "{{q}}",
      variables: {
        a: { type: "int", min: 12, max: 96, step: 2 },
        b: { type: "int", min: 15, max: 90, step: 3 }
      },
      answerType: "number",
      resolve: function (v) {
        v.q = sc.text(v.a, v.b);
      },
      derive: function (v) {
        var d = {};
        d.g = gcd(v.a, v.b);
        d.l = v.a / d.g * v.b;
        // 素因数分解を解説に出す。公務員はここを問われる。
        d.factA = factorize(v.a);
        d.factB = factorize(v.b);
        d.kindLabel = sc.kind === "gcd" ? "最大公約数" : "最小公倍数";
        // ⚠️ {{unit}} はエンジンが展開しない（unit はテンプレの属性で変数ではない）。
        //    解説で単位を出したいので派生変数として渡す。
        d.unitLabel = sc.unit;
        // 「{{g}} × {{l}} = {{a}} × {{b}}」と書くと左右が同じ式になり、
        // 解説の検算が「同語反復」として弾く。実際の積を出す。
        d.product = v.a * v.b;
        return d;
      },
      answerFormula: function (v) {
        var g = gcd(v.a, v.b);
        return sc.kind === "gcd" ? g : (v.a / g * v.b);
      },
      unit: sc.unit,
      explanationTemplate: "【考え方】\n「余りが出ないように分ける」→ 最大公約数。\n「次に同時になる」→ 最小公倍数。\nどちらを聞かれているかを、問題文の言葉で見分けます。\n\n【解法】\n① 素因数分解する\n  {{a}} = {{factA}}\n  {{b}} = {{factB}}\n\n② 最大公約数（共通する素因数の積）: {{g}}\n  最小公倍数（{{a}} ÷ 最大公約数 × {{b}}）: {{l}}\n\n③ この問題が聞いているのは{{kindLabel}}なので {{answer}}{{unitLabel}}\n\n【ポイント】\n・最大公約数 × 最小公倍数 = 2数の積（{{g}} × {{l}} = {{product}}）\n・「分ける・配る・切る」→ 最大公約数\n・「同時になる・そろう」→ 最小公倍数",
      timeLimitSec: 120,
      validate: function (v) {
        var g = gcd(v.a, v.b);
        // 公約数が1だと「最大1cm」のような、考える余地のない問題になる。
        if (g === 1) return false;
        // 最小公倍数が大きすぎると計算が作業になる。
        if (v.a / g * v.b > 3000) return false;
        return v.a !== v.b;
      }
    });
  });

  // --- 剰余（余りが同じになる数） ---
  // ⚠️ 解が周期的に無限にあるので、必ず範囲で区切って一意にする。
  QUESTION_TEMPLATES.push({
    id: "seisu_remainder_01",
    formats: ["webtesting"],
    category: "整数の性質",
    categoryId: 14,
    difficulty: 3,
    templateText: "{{d1}}で割ると{{r1}}余り、{{d2}}で割ると{{r2}}余る整数のうち、{{lo}}以上{{hi}}以下のものはいくつあるか。",
    variables: {
      d1: { type: "int", min: 4, max: 9, step: 1 },
      d2: { type: "int", min: 5, max: 11, step: 1 },
      r1: { type: "int", min: 1, max: 3, step: 1 },
      r2: { type: "int", min: 1, max: 4, step: 1 },
      lo: { type: "int", min: 100, max: 300, step: 100 }
    },
    answerType: "number",
    resolve: function (v) {
      v.hi = v.lo + 599;
      v.lcm = v.d1 / gcd(v.d1, v.d2) * v.d2;
    },
    derive: function (v) {
      var d = {};
      // 条件を満たす最小の非負整数を総当たりで探す。
      // ⚠️ 総当たりにするのは、中国剰余定理の実装を間違えても
      //    答えだけは正しくなる形にしたいから。周期は lcm。
      var first = -1;
      for (var n = 0; n < v.lcm; n++) {
        if (n % v.d1 === v.r1 && n % v.d2 === v.r2) { first = n; break; }
      }
      d.base = first;
      d.lcmv = v.lcm;
      var list = [];
      for (var m = first; m <= v.hi && list.length < 8; m += v.lcm) {
        if (m >= v.lo) list.push(m);
      }
      d.examples = list.slice(0, 4).join("、") + (list.length > 4 ? "、…" : "");
      return d;
    },
    answerFormula: function (v) {
      var first = -1;
      for (var n = 0; n < v.lcm; n++) {
        if (n % v.d1 === v.r1 && n % v.d2 === v.r2) { first = n; break; }
      }
      if (first < 0) return null;
      var count = 0;
      for (var m = first; m <= v.hi; m += v.lcm) {
        if (m >= v.lo) count++;
      }
      return count;
    },
    unit: "個",
    explanationTemplate: "【考え方】\n2つの「割った余り」の条件を同時に満たす数は、\n**最小公倍数ごとに繰り返し現れます**。\n最初の1つを見つけ、そこから最小公倍数ずつ足していきます。\n\n【解法】\n① 条件を満たす最小の数を探す: {{base}}\n  （{{base}} ÷ {{d1}} = 余り{{r1}} / {{base}} ÷ {{d2}} = 余り{{r2}}）\n\n② 次に現れるのは {{d1}}と{{d2}}の最小公倍数 {{lcmv}} を足した数\n  条件を満たす数: {{examples}}\n\n③ {{lo}}以上{{hi}}以下に入るものを数えて {{answer}}個\n\n【ポイント】\n・余りの条件が2つ → 周期は2数の最小公倍数\n・「最小の1つ」さえ見つかれば、あとは等差数列\n・範囲の指定が無いと答えは無限にある。必ず範囲を確認する",
    timeLimitSec: 180,
    validate: function (v) {
      if (v.r1 >= v.d1 || v.r2 >= v.d2) return false;
      if (v.d1 === v.d2) return false;
      // ⚠️ 余りが同じだと「割り切れる数-差」で即答できてしまい、難易度3にならない。
      //    実測で29.7%がこの形だった（2026-09-06）。
      if (v.r1 === v.r2) return false;
      // 割る数の一方が他方の倍数だと、条件が実質1つに潰れる。
      if (v.d1 % v.d2 === 0 || v.d2 % v.d1 === 0) return false;
      var lcm = v.d1 / gcd(v.d1, v.d2) * v.d2;
      // 条件を満たす数が存在しない組み合わせを弾く（互いに素でないと解無しがある）
      var found = -1;
      for (var n = 0; n < lcm; n++) {
        if (n % v.d1 === v.r1 && n % v.d2 === v.r2) { found = n; break; }
      }
      if (found < 0) return false;
      // 答えが0個や1個だと「数える」問題にならない
      var hi = v.lo + 599, count = 0;
      for (var m = found; m <= hi; m += lcm) { if (m >= v.lo) count++; }
      return count >= 2;
    }
  });

  // --- N進法 ---
  QUESTION_TEMPLATES.push({
    id: "seisu_base_01",
    formats: ["webtesting"],
    category: "整数の性質",
    categoryId: 14,
    difficulty: 3,
    templateText: "{{base}}進法で表された数 {{repr}} を10進法で表すといくつか。",
    variables: {
      base: { type: "int", min: 3, max: 8, step: 1 },
      n: { type: "int", min: 40, max: 500, step: 1 }
    },
    answerType: "number",
    resolve: function (v) {
      v.repr = toBase(v.n, v.base);
    },
    derive: function (v) {
      var d = {};
      var digits = String(v.repr).split("");
      var terms = [];
      for (var i = 0; i < digits.length; i++) {
        var p = digits.length - 1 - i;
        terms.push(digits[i] + "×" + v.base + "^" + p);
      }
      d.expansion = terms.join(" + ");
      var vals = [];
      for (var j = 0; j < digits.length; j++) {
        var pw = Math.pow(v.base, digits.length - 1 - j);
        vals.push(String(Number(digits[j]) * pw));
      }
      d.values = vals.join(" + ");
      d.digitCount = digits.length;
      return d;
    },
    answerFormula: function (v) {
      return v.n;
    },
    unit: "",
    explanationTemplate: "【考え方】\nN進法は「各桁がNの累乗を表す」という約束です。\n10進法で1234が 1×10³ + 2×10² + 3×10¹ + 4×10⁰ なのと同じ理屈。\n\n【解法】\n① {{base}}進法の {{repr}} は{{digitCount}}桁。右から{{base}}⁰, {{base}}¹, {{base}}² … の位\n\n② 展開する:\n  {{expansion}}\n\n③ 計算する:\n  {{values}} = {{answer}}\n\n【ポイント】\n・N進法で使える数字は 0 〜 (N-1) まで。{{base}}進法に{{base}}は出てこない\n・逆（10進法→N進法）は、Nで割った余りを下から並べる\n・公務員試験では「何進法か」を推理させる問題も出る",
    timeLimitSec: 150,
    validate: function (v) {
      // 2桁だと簡単すぎ、5桁以上だと作業になる
      var len = String(toBase(v.n, v.base)).length;
      return len >= 3 && len <= 4;
    }
  });

  // --- 約数の個数 ---
  QUESTION_TEMPLATES.push({
    id: "seisu_divisors_01",
    formats: ["webtesting"],
    category: "整数の性質",
    categoryId: 14,
    difficulty: 3,
    templateText: "{{n}}の正の約数は全部でいくつあるか。",
    variables: {
      n: { type: "int", min: 60, max: 900, step: 2 }
    },
    answerType: "number",
    derive: function (v) {
      var d = {};
      d.fact = factorize(v.n);
      // 「(指数+1)の積」を式として見せる
      var f = primeFactors(v.n), parts = [];
      for (var i = 0; i < f.length; i++) parts.push("(" + f[i].exp + "+1)");
      d.formula = parts.join(" × ");
      var nums = [];
      for (var j = 0; j < f.length; j++) nums.push(String(f[j].exp + 1));
      d.numbers = nums.join(" × ");
      return d;
    },
    answerFormula: function (v) {
      var f = primeFactors(v.n), c = 1;
      for (var i = 0; i < f.length; i++) c *= (f[i].exp + 1);
      return c;
    },
    unit: "個",
    explanationTemplate: "【考え方】\n約数を1つずつ数えると時間が足りません。\n**素因数分解して「指数+1」を掛ける**のが定石です。\n\n【解法】\n① 素因数分解する:\n  {{n}} = {{fact}}\n\n② 約数の個数 = (各指数 + 1) の積\n  {{formula}} = {{numbers}} = {{answer}}個\n\n【ポイント】\n・なぜこの式か: 各素因数を「0個使う〜exp個使う」の(exp+1)通りから選ぶため\n・約数の総和も素因数分解から出せる\n・平方数は約数の個数が奇数になる（唯一の見分け方）",
    timeLimitSec: 150,
    validate: function (v) {
      var f = primeFactors(v.n);
      // 素数だと約数2個で問題にならない。素因数が多すぎても作業になる。
      if (f.length < 2) return false;
      var c = 1;
      for (var i = 0; i < f.length; i++) c *= (f[i].exp + 1);
      return c >= 6 && c <= 30;
    }
  });

})();

// --- 整数の性質で使う道具 ---
// ⚠️ _base.js ではなくここに置く。この分野でしか使わないので、
//    共有の場所に置くと「どこで使われているか」が追えなくなる。

/** 素因数分解を [{p, exp}, ...] で返す */
function primeFactors(n) {
  var out = [], m = n;
  for (var p = 2; p * p <= m; p++) {
    var e = 0;
    while (m % p === 0) { m /= p; e++; }
    if (e > 0) out.push({ p: p, exp: e });
  }
  if (m > 1) out.push({ p: m, exp: 1 });
  return out;
}

/** 素因数分解を "2^2 × 3 × 5" の形の文字列にする */
function factorize(n) {
  var f = primeFactors(n), parts = [];
  for (var i = 0; i < f.length; i++) {
    parts.push(f[i].exp === 1 ? String(f[i].p) : f[i].p + "^" + f[i].exp);
  }
  return parts.join(" × ");
}

/** 10進の n を base 進法の文字列にする。base は 2〜9 のみ（A以降を使わない） */
function toBase(n, base) {
  if (n === 0) return "0";
  var s = "";
  var m = n;
  while (m > 0) { s = String(m % base) + s; m = Math.floor(m / base); }
  return s;
}
