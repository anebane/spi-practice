// カテゴリ15: 操作と手順（年齢算・時計算・油分け算・ニセ金貨）
// ============================================================
// 公務員試験（判断推理）の頻出分野。SPIには出ないので koumuin プロファイルだけで使う。
//
// ⚠️ なぜこの4型か（2026-09-06）
// 候補は 油分け算・川渡り・天秤・年齢算・時計算 の5型だった。
// 川渡りは入れていない。古典（オオカミ・ヤギ・キャベツ等）は答えが固定で
// 「パラメータランダム生成」にならず、制約を乱数で振ると
// 「全員を渡せない」「最小回数の定義が曖昧」な盤面が簡単にできるため。
// 時計算も「重なる時刻」は答えが分数（60h/11分）になり数値入力と相性が
// 悪いので、答えが必ず整数になる「角度」だけにした。
//
// ⚠️ 生成上の注意
// ・年齢算は「答えの年数・年齢から逆算して問題文の数値を作る」。
//   先に答えを整数で決めるので、割り切れない組は原理的に出ない。
// ・油分け算の最少回数は BFS（幅優先探索）で全手順を調べて出す。
//   公式が存在しない型なので、探索以外の実装はどれも当て推量になる。
//   validate で最少回数 4〜10 回に絞る（3回以下は見た瞬間に解ける）。
(function() {

  // --- 年齢算: 何年後 ---
  QUESTION_TEMPLATES.push({
    id: "sousa_nenrei_01",
    formats: ["webtesting"],
    category: "操作と手順",
    categoryId: 15,
    difficulty: 2,
    templateText: "現在、父は{{f}}歳、子どもは{{c}}歳である。父の年齢が子どもの年齢のちょうど{{k}}倍になるのは何年後か。",
    variables: {
      c: { type: "int", min: 4, max: 15, step: 1 },
      k: { type: "int", min: 3, max: 4, step: 1 },
      x: { type: "int", min: 2, max: 18, step: 1 }
    },
    answerType: "number",
    resolve: function (v) {
      // 答え x を先に決めて父の年齢を逆算する。割り切れない組は出ない。
      v.f = v.k * (v.c + v.x) - v.x;
    },
    answerFormula: function (v) {
      return (v.f - v.k * v.c) / (v.k - 1);
    },
    derive: function (v, answer) {
      var d = {};
      d.kc = v.k * v.c;
      d.km1 = v.k - 1;
      d.diff = v.f - d.kc;
      d.fx = v.f + answer;
      d.cx = v.c + answer;
      d.gap = v.f - v.c;
      return d;
    },
    unit: "年後",
    explanationTemplate: "【考え方】\n求める年数をx年とおき、x年後の2人の年齢で等式を作ります。\n2人とも同じだけ年をとるので、**年齢の差は何年たっても変わらない**のが年齢算の軸です。\n\n【解法】\n① x年後、父は({{f}} + x)歳、子どもは({{c}} + x)歳\n\n② 「父が子どもの{{k}}倍」を式にして解く\n  {{f}} + x = {{k}} × ({{c}} + x)\n  {{f}} + x = {{k}}x + {{kc}}\n  {{km1}}x = {{f}} - {{kc}} = {{diff}}\n  x = {{diff}} ÷ {{km1}} = {{answer}}\n\n③ 検算: {{answer}}年後は父 {{f}} + {{answer}} = {{fx}}歳、子ども {{c}} + {{answer}} = {{cx}}歳\n  {{k}} × {{cx}} = {{fx}} となり、確かに{{k}}倍。\n\n【ポイント】\n・2人の年齢の差 {{gap}}歳は何年たっても不変\n・「{{k}}倍になる」とき、差は（そのときの子どもの年齢）の{{km1}}倍\n・倍率は年がたつほど小さくなる（差が一定のまま2人とも増えるため）",
    timeLimitSec: 120,
    validate: function (v) {
      var gap = v.f - v.c;
      // 親子の年齢差が不自然な組は出さない
      if (gap < 20 || gap > 45) return false;
      if (v.f > 60) return false;
      return true;
    }
  });

  // --- 年齢算: 何年前 ---
  QUESTION_TEMPLATES.push({
    id: "sousa_nenrei_02",
    formats: ["webtesting"],
    category: "操作と手順",
    categoryId: 15,
    difficulty: 2,
    templateText: "現在、母は{{f}}歳、子どもは{{c}}歳である。母の年齢が子どもの年齢のちょうど{{k}}倍だったのは何年前か。",
    variables: {
      c: { type: "int", min: 8, max: 20, step: 1 },
      k: { type: "int", min: 3, max: 4, step: 1 },
      x: { type: "int", min: 1, max: 12, step: 1 }
    },
    answerType: "number",
    resolve: function (v) {
      v.f = v.k * (v.c - v.x) + v.x;
    },
    answerFormula: function (v) {
      return (v.k * v.c - v.f) / (v.k - 1);
    },
    derive: function (v, answer) {
      var d = {};
      d.kc = v.k * v.c;
      d.km1 = v.k - 1;
      d.diff = d.kc - v.f;
      d.fmx = v.f - answer;
      d.cmx = v.c - answer;
      d.gap = v.f - v.c;
      return d;
    },
    unit: "年前",
    explanationTemplate: "【考え方】\n求める年数をx年とおき、x年前の2人の年齢で等式を作ります。\n「何年前」でも軸は同じ、**年齢の差は変わらない**こと。\n\n【解法】\n① x年前、母は({{f}} - x)歳、子どもは({{c}} - x)歳\n\n② 「母が子どもの{{k}}倍だった」を式にして解く\n  {{f}} - x = {{k}} × ({{c}} - x)\n  {{f}} - x = {{kc}} - {{k}}x\n  {{km1}}x = {{kc}} - {{f}} = {{diff}}\n  x = {{diff}} ÷ {{km1}} = {{answer}}\n\n③ 検算: {{answer}}年前は母 {{f}} - {{answer}} = {{fmx}}歳、子ども {{c}} - {{answer}} = {{cmx}}歳\n  {{k}} × {{cmx}} = {{fmx}} となり、確かに{{k}}倍。\n\n【ポイント】\n・2人の年齢の差 {{gap}}歳は何年前でも不変\n・過去にさかのぼるほど倍率は大きくなる（子どもの年齢が小さくなるため）\n・「◯年前に子どもが生まれていたか」（年齢が正か）は確かめる癖をつける",
    timeLimitSec: 120,
    validate: function (v) {
      if (v.c - v.x < 2) return false;   // x年前に子どもが2歳以上いること
      var gap = v.f - v.c;
      if (gap < 20 || gap > 45) return false;
      if (v.f > 58) return false;
      return true;
    }
  });

  // --- 年齢算: 和と倍率（2条件） ---
  QUESTION_TEMPLATES.push({
    id: "sousa_nenrei_03",
    formats: ["webtesting"],
    category: "操作と手順",
    categoryId: 15,
    difficulty: 3,
    templateText: "現在、父と子どもの年齢の和は{{s}}歳である。{{y}}年後には、父の年齢が子どもの年齢のちょうど{{k}}倍になるという。現在の子どもの年齢は何歳か。",
    variables: {
      c: { type: "int", min: 5, max: 15, step: 1 },
      k: { type: "int", min: 2, max: 4, step: 1 },
      y: { type: "int", min: 3, max: 10, step: 1 }
    },
    answerType: "number",
    resolve: function (v) {
      v.f = v.k * (v.c + v.y) - v.y;
      v.s = v.f + v.c;
    },
    answerFormula: function (v) {
      // f + c = s と f + y = k(c + y) から c を解いた式
      return (v.s + v.y - v.k * v.y) / (v.k + 1);
    },
    derive: function (v, answer) {
      var d = {};
      d.sy = v.s + 2 * v.y;
      d.kp1 = v.k + 1;
      d.cy = d.sy / d.kp1;
      d.fnow = v.s - answer;
      d.fy = d.fnow + v.y;
      return d;
    },
    unit: "歳",
    explanationTemplate: "【考え方】\n2人とも1年に1歳ずつ年をとるので、{{y}}年後の年齢の和は 2 × {{y}} だけ増えます。\nそのとき父:子ども = {{k}}:1 だから、**和を ({{k}} + 1) 等分**すればそのときの子どもの年齢が出ます。\n\n【解法】\n① {{y}}年後の2人の年齢の和: {{s}} + 2 × {{y}} = {{sy}}\n\n② そのとき父:子ども = {{k}}:1 なので、子どもの年齢は\n  {{sy}} ÷ {{kp1}} = {{cy}}\n\n③ 現在の子どもの年齢: {{cy}} - {{y}} = {{answer}}\n\n④ 検算: 父は現在 {{s}} - {{answer}} = {{fnow}}歳。{{y}}年後は父{{fy}}歳・子ども{{cy}}歳で、\n  {{k}} × {{cy}} = {{fy}} となり、確かに{{k}}倍。\n\n【ポイント】\n・「和」は毎年 2 ずつ増える（2人分）。ここを 1 と数えるのが定番の誤り\n・「◯倍になる」→ 比に直して和を等分するのが速い\n・連立方程式（f + c = {{s}}, f + {{y}} = {{k}}(c + {{y}})）でも同じ答えになる",
    timeLimitSec: 180,
    validate: function (v) {
      var gap = v.f - v.c;
      if (gap < 20 || gap > 45) return false;
      if (v.f > 60) return false;
      return true;
    }
  });

  // --- 時計算: 長針と短針のつくる角 ---
  // ⚠️ 「重なる時刻」は答えが 60h/11 分の分数になるので出さない。
  //    分を偶数に限れば短針の角度（0.5度/分）も必ず整数になり、答えは整数。
  QUESTION_TEMPLATES.push({
    id: "sousa_tokei_01",
    formats: ["webtesting"],
    category: "操作と手順",
    categoryId: 15,
    difficulty: 2,
    templateText: "時計の針が{{h}}時{{m}}分を指している。長針と短針がつくる角のうち、小さいほうの角の大きさは何度か。",
    variables: {
      h: { type: "int", min: 1, max: 11, step: 1 },
      m: { type: "int", min: 2, max: 58, step: 2 }
    },
    answerType: "number",
    answerFormula: function (v) {
      var hourAngle = 30 * v.h + v.m / 2;
      var minAngle = 6 * v.m;
      var diff = Math.abs(hourAngle - minAngle);
      return Math.min(diff, 360 - diff);
    },
    derive: function (v) {
      var d = {};
      d.hourAngle = 30 * v.h + v.m / 2;
      d.minAngle = 6 * v.m;
      d.bigA = Math.max(d.hourAngle, d.minAngle);
      d.smallA = Math.min(d.hourAngle, d.minAngle);
      d.diff = d.bigA - d.smallA;
      d.rest = 360 - d.diff;
      d.h30 = 30 * v.h;
      return d;
    },
    unit: "度",
    explanationTemplate: "【考え方】\n短針は1時間に30度（1分に0.5度）、長針は1分に6度進みます。\nそれぞれの針の「12時の位置からの角度」を出して、差をとります。\n\n【解法】\n① 短針: {{h}}時{{m}}分の位置は 30 × {{h}} + 0.5 × {{m}} = {{hourAngle}}度\n\n② 長針: 6 × {{m}} = {{minAngle}}度\n\n③ 差をとる: {{bigA}} - {{smallA}} = {{diff}}度\n  2つの針がつくる角は{{diff}}度と、その反対側の 360 - {{diff}} = {{rest}}度\n  小さいほうの角は {{answer}}度\n\n【ポイント】\n・短針も動く（1分で0.5度）。{{h}}時ちょうどの位置 30 × {{h}} = {{h30}}度のまま計算するのが定番の誤り\n・差が180度を超えたら、360度から引いた側が「小さいほうの角」\n・「重なる・直角になる時刻」も同じ道具で解ける（差が1分あたり 5.5度 縮まる/開く）",
    timeLimitSec: 150,
    validate: function (v) {
      var hourAngle = 30 * v.h + v.m / 2;
      var diff = Math.abs(hourAngle - 6 * v.m);
      var small = Math.min(diff, 360 - diff);
      // 0度（重なる）や180度（一直線）ちょうど付近は問題として単調なので外す
      return small >= 8 && small <= 172;
    }
  });

  // --- 油分け算: 最少の移し替え回数 ---
  QUESTION_TEMPLATES.push({
    id: "sousa_abura_01",
    formats: ["webtesting"],
    category: "操作と手順",
    categoryId: 15,
    difficulty: 3,
    templateText: "容量{{a}}Lの容器Aにちょうど{{a}}Lの油が入っており、ほかに空の容器B（容量{{b}}L）と容器C（容量{{c}}L）がある。どの容器にも目盛りは無く、できるのは「容器から容器へ、移す側が空になるか受ける側が満杯になるまで注ぐ」操作だけである。いずれかの容器にちょうど{{t}}Lの油を量り取るには、最少で何回の操作が必要か。",
    variables: {
      a: { type: "int", min: 8, max: 16, step: 1 },
      b: { type: "int", min: 5, max: 9, step: 1 },
      c: { type: "int", min: 3, max: 5, step: 1 },
      t: { type: "int", min: 2, max: 8, step: 1 }
    },
    answerType: "number",
    answerFormula: function (v) {
      return sousaAburaMin(v.a, v.b, v.c, v.t);
    },
    derive: function (v, answer) {
      var d = {};
      var path = sousaAburaPath(v.a, v.b, v.c, v.t);
      var lines = [];
      for (var i = 0; i < path.length; i++) {
        lines.push("  " + (i + 1) + "回目: " + path[i].move + " → (" + path[i].state.join(", ") + ")");
      }
      d.steps = lines.join("\n");
      return d;
    },
    unit: "回",
    explanationTemplate: "【考え方】\n3つの容器の油の量を（A, B, C）の組で表し、1回の操作でどの状態に移れるかを順にたどります。\nできるのは「移す側が空になる」か「受ける側が満杯になる」まで注ぐことだけ。中途半端な量では止められません。\n\n【解法】\n最初の状態は ({{a}}, 0, 0)。最短手順の一例:\n{{steps}}\n{{answer}}回目の操作で、ちょうど{{t}}Lの油が現れます。\nすべての手順をしらみつぶしに調べても、{{answer}}回より少ない操作では{{t}}Lは作れません。\n\n【ポイント】\n・「A→B→C→A…」のように一方向の循環で注ぐのが基本の型\n・直前の状態に戻る操作（注いだ相手にすぐ注ぎ返す）は回数の無駄\n・一度出た状態をメモしておくと、堂々めぐりに気づける",
    timeLimitSec: 240,
    validate: function (v) {
      if (!(v.c < v.b && v.b < v.a)) return false;
      if (v.t >= v.a) return false;
      // 1回で作れる量（B・Cの容量そのまま）は問題にならない
      if (v.t === v.b || v.t === v.c) return false;
      var r = sousaAburaMin(v.a, v.b, v.c, v.t);
      // 3回以下は見た瞬間に解ける。11回以上は制限時間内の作業にならない。
      return r >= 4 && r <= 10;
    }
  });

  // --- ニセ金貨: 天秤の最少回数 ---
  // ⚠️ 「偽物が軽いと分かっている」場合に限る。軽重不明の型は最少回数の
  //    公式が変わる（情報量の勘定に「偽物の軽重」も入る）ので混ぜない。
  QUESTION_TEMPLATES.push({
    id: "sousa_tenbin_01",
    formats: ["webtesting"],
    category: "操作と手順",
    categoryId: 15,
    difficulty: 3,
    templateText: "{{n}}枚の{{item}}の中に、見た目は同じで本物より少しだけ軽い偽物が1枚だけまざっている。上皿天秤を1回使うと、左右の皿にのせたものの重さを比べられる。偽物を確実に見つけ出すには、最少で何回天秤を使えばよいか。",
    variables: {
      n: { type: "int", min: 5, max: 45, step: 1 },
      item: { type: "choice", options: ["金貨", "メダル", "硬貨", "おもり"] }
    },
    answerType: "number",
    answerFormula: function (v) {
      var k = 0, p = 1;
      while (p < v.n) { p *= 3; k++; }
      return k;
    },
    derive: function (v, answer) {
      var d = {};
      // 候補の枚数が 1/3（端数切り上げ）ずつ減っていく列
      var seq = [v.n], m = v.n;
      while (m > 1) { m = Math.ceil(m / 3); seq.push(m); }
      d.shrink = seq.join("枚 → ") + "枚";
      d.ansm1 = answer - 1;
      d.lowChain = sousaPow3Chain(answer - 1);
      d.highChain = sousaPow3Chain(answer);
      return d;
    },
    unit: "回",
    explanationTemplate: "【考え方】\n天秤に同じ枚数ずつのせると、結果は「左が軽い・右が軽い・つり合う」の**3通り**。\nつり合ったら「のせなかった残り」に偽物がいるので、1回で候補を約3分の1に絞れます。\n\n【解法】\n① {{n}}枚をできるだけ均等に3つの山に分け、同じ枚数の2つの山を天秤にのせる\n  ・傾いたら軽いほうの山、つり合ったら残りの山に偽物がいる\n\n② これを繰り返すと候補は {{shrink}} と減り、{{answer}}回で1枚に決まる\n\n③ {{ansm1}}回では足りない理由: {{ansm1}}回の計量で起こりうる結果の並びは {{lowChain}}通り。\n  候補が{{n}}通りあると、結果と偽物の対応をつけきれない。\n  {{answer}}回なら {{highChain}}通りあり、{{n}}通りをすべて区別できる。\n\n【ポイント】\n・「半分に分けて比べる」より3等分が速い。**つり合い＝第3の結果**を捨てない\n・3を掛けていって候補の枚数以上になる最小の回数が答え（3, 9, 27, 81, …）\n・偽物が「重いか軽いか分からない」場合は、この回数では足りないことがある",
    timeLimitSec: 150,
    validate: function (v) {
      return v.n >= 5;
    }
  });

})();

// --- 操作と手順で使う道具 ---
// ⚠️ _base.js ではなくここに置く。この分野でしか使わないので、
//    共有の場所に置くと「どこで使われているか」が追えなくなる。

/**
 * 油分け算の最少操作回数を幅優先探索で求める。作れなければ -1。
 * 状態は (Aの油, Bの油, Cの油)。合計は常に a で不変。
 */
function sousaAburaMin(a, b, c, t) {
  return sousaAburaSearch(a, b, c, t).count;
}

/** 最短手順を [{move, state}, ...] で返す（解説用）。 */
function sousaAburaPath(a, b, c, t) {
  return sousaAburaSearch(a, b, c, t).path;
}

function sousaAburaSearch(a, b, c, t) {
  var caps = [a, b, c];
  var names = ["A", "B", "C"];
  var start = a * 10000;              // (a, 0, 0) を a*10000 + y*100 + z で符号化
  var dist = {}, prev = {};
  dist[start] = 0;
  var queue = [start], head = 0;
  var goal = -1;
  while (head < queue.length) {
    var s = queue[head++];
    var st = [Math.floor(s / 10000), Math.floor(s / 100) % 100, s % 100];
    if (st[0] === t || st[1] === t || st[2] === t) { goal = s; break; }
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        if (i === j) continue;
        var amt = Math.min(st[i], caps[j] - st[j]);
        if (amt <= 0) continue;
        var ns = st.slice();
        ns[i] -= amt;
        ns[j] += amt;
        var key = ns[0] * 10000 + ns[1] * 100 + ns[2];
        if (dist[key] === undefined) {
          dist[key] = dist[s] + 1;
          prev[key] = { from: s, move: names[i] + "から" + names[j] + "へ" };
          queue.push(key);
        }
      }
    }
  }
  if (goal < 0) return { count: -1, path: [] };
  var path = [];
  var cur = goal;
  while (cur !== start) {
    var p = prev[cur];
    path.unshift({
      move: p.move,
      state: [Math.floor(cur / 10000), Math.floor(cur / 100) % 100, cur % 100]
    });
    cur = p.from;
  }
  return { count: dist[goal], path: path };
}

/** 3の累乗を「3 × 3 = 9」の形の式の文字列にする。k=1 は「3」だけ（同語反復を書かない）。 */
function sousaPow3Chain(k) {
  if (k <= 0) return "1";
  if (k === 1) return "3";
  var parts = [];
  for (var i = 0; i < k; i++) parts.push("3");
  return parts.join(" × ") + " = " + Math.pow(3, k);
}
