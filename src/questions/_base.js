// ============================================================
// 問題テンプレートの土台（レジストリ + 共通ヘルパー）
// ============================================================
// 各テンプレートは以下のフィールドを持つ:
//   id, category, categoryId, difficulty(1-3),
//   templateText ({{var}}形式), variables,
//   answerType ("number"|"fraction"|"choice"),
//   answerFormula(vars), unit, explanationTemplate,
//   timeLimitSec,
//   formats  … 対応する受検形式の配列
//
// formats について:
//   "webtesting" = WEBテスティング（自宅受検・電卓可・非言語は数値入力）
//   "testcenter" = テストセンター（会場受検・電卓不可・選択式・1問ずつで戻れない）
//   両者は回答形式が違うため問題をそのまま流用できない。数値入力前提の問題は
//   webtesting のみ。選択式(answerType:"choice" / type:"pattern")は両対応。
//   ※ テストセンターは電卓が使えないため、両対応でも計算量が過大な問題は
//     別途見直しが必要（自動判定はできないので人間/AIのレビュー対象）
// ============================================================

var QUESTION_TEMPLATES = [];


// ============================================================
// ヘルパー関数（グローバル）
// ============================================================
/**
 * 順序推論のパズルを作る。
 *
 * 変数化で最も危険なのは「条件から順序が一意に定まらない」問題が生まれること。
 * 固定パターンでは人間が一意性を保証していたが、生成にすると条件の組み合わせ次第で
 * 複数通りありうる状態が必ず出る。そのまま出題すると「正解が2つある問題」になる。
 *
 * そこで全順列を総当たりして、条件を満たす並びがちょうど1通りのときだけ採用する。
 * n<=5 なら最大120通りなので総当たりで十分速い。
 *
 * @returns {Object|null} 一意な問題が作れたら {names, order, conds, condTexts}、無理ならnull
 */
function buildOrderPuzzle(names, rel) {
  var n = names.length;

  // 1) 正解となる並びを決める（前から順）
  var order = names.slice();
  for (var i = order.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = order[i]; order[i] = order[j]; order[j] = t;
  }
  var pos = {};
  order.forEach(function (nm, idx) { pos[nm] = idx; });

  // 2) 正しい並びと矛盾しない条件の候補をすべて作る
  var cands = [];
  for (var a = 0; a < n; a++) {
    for (var b = 0; b < n; b++) {
      if (a === b) continue;
      if (pos[names[a]] < pos[names[b]]) cands.push([names[a], names[b]]);
    }
  }

  // 3) 条件を選び、一意に定まるまで試す
  for (var attempt = 0; attempt < 60; attempt++) {
    var shuffled = cands.slice();
    for (var k = shuffled.length - 1; k > 0; k--) {
      var m = Math.floor(Math.random() * (k + 1));
      var tmp = shuffled[k]; shuffled[k] = shuffled[m]; shuffled[m] = tmp;
    }
    // 条件が少なすぎると一意にならず、多すぎると考える余地が無くなる
    var count = n - 1 + Math.floor(Math.random() * 2);
    var conds = shuffled.slice(0, count);
    if (countSolutions(names, conds, 2) === 1) {
      return {
        names: names,
        order: order,
        conds: conds,
        condTexts: conds.map(function (c) { return "・" + c[0] + "は" + c[1] + "より" + rel; })
      };
    }
  }
  return null;
}

/**
 * 対応関係のパズルを作る（誰が何を持つか）。
 *
 * 順序推論と同じく、否定条件の選び方によっては割り当てが一意に定まらない。
 * 全割り当てを総当たりして1通りのときだけ採用する。n<=4 なら24通り。
 */
function buildMatchPuzzle(names, items, itemsVerb) {
  var n = names.length;
  var assign = items.slice();
  for (var i = assign.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = assign[i]; assign[i] = assign[j]; assign[j] = t;
  }
  // assign[k] を names[k] が持つ、が正解

  // 正解と矛盾しない否定条件の候補（「XはYを持っていない」）
  var cands = [];
  for (var a = 0; a < n; a++) {
    for (var b = 0; b < n; b++) {
      if (assign[a] !== items[b]) cands.push([names[a], items[b]]);
    }
  }

  for (var attempt = 0; attempt < 60; attempt++) {
    var sh = cands.slice();
    for (var k = sh.length - 1; k > 0; k--) {
      var m = Math.floor(Math.random() * (k + 1));
      var tmp = sh[k]; sh[k] = sh[m]; sh[m] = tmp;
    }
    var count = n - 1 + Math.floor(Math.random() * 3);
    var conds = sh.slice(0, count);
    if (countMatchSolutions(names, items, conds, 2) === 1) {
      // 同じ人への否定条件はまとめて読みやすくする
      var byName = {};
      conds.forEach(function (c) { (byName[c[0]] = byName[c[0]] || []).push(c[1]); });
      // 「Aは犬を選んでいない」「Aは犬も猫も選んでいない」と自然な日本語にする。
      // 助詞を機械的に連結すると「Pはコーヒー選んでいない」のように壊れる。
      var neg = negativeVerb(itemsVerb);
      var texts = names.filter(function (nm) { return byName[nm]; }).map(function (nm) {
        var list = byName[nm];
        var obj = list.length === 1 ? list[0] + "を" : list.join("も") + "も";
        return "・" + nm + "は" + obj + neg;
      });
      return { names: names, items: items, assign: assign, conds: conds, condTexts: texts };
    }
  }
  return null;
}

/**
 * 動詞を否定形にする。機械的に「ない」を足すと壊れるので語尾ごとに分ける。
 * 飼っている→飼っていない / 注文した→注文していない / する→しない
 */
function negativeVerb(verb) {
  if (/でいる$/.test(verb)) return verb.replace(/でいる$/, "でいない");  // 住んでいる→住んでいない
  if (/ている$/.test(verb)) return verb.replace(/ている$/, "ていない");
  if (/した$/.test(verb))   return verb.replace(/した$/, "していない");
  if (/する$/.test(verb))   return verb.replace(/する$/, "しない");
  return verb + "ていない";
}

/** 否定条件を満たす割り当てが何通りあるか数える。 */
function countMatchSolutions(names, items, conds, limit) {
  var found = 0, cur = [], used = {};
  function rec() {
    if (found >= limit) return;
    if (cur.length === names.length) {
      var map = {};
      cur.forEach(function (it, i) { map[names[i]] = it; });
      for (var c = 0; c < conds.length; c++) {
        if (map[conds[c][0]] === conds[c][1]) return;
      }
      found++;
      return;
    }
    for (var i = 0; i < items.length; i++) {
      if (used[items[i]]) continue;
      used[items[i]] = true; cur.push(items[i]);
      rec();
      cur.pop(); used[items[i]] = false;
      if (found >= limit) return;
    }
  }
  rec();
  return found;
}

/**
 * 嘘つき問題を作る。n人のうち1人だけが嘘をつく。
 *
 * 発言の組み合わせ次第で「嘘つきが特定できない」「矛盾して解が無い」ケースが
 * 必ず出る。全パターン（誰が嘘つきか n 通り）を試して、整合するのが
 * ちょうど1通りのときだけ採用する。
 */
function buildLiarPuzzle(names) {
  var n = names.length;
  var liar = Math.floor(Math.random() * n);

  for (var attempt = 0; attempt < 80; attempt++) {
    // 各人が「誰かについて 嘘つきだ / 嘘つきではない」と発言する
    var stmts = names.map(function (spk, i) {
      var others = names.filter(function (_, j) { return j !== i; });
      var about = others[Math.floor(Math.random() * others.length)];
      var claimsLiar = Math.random() < 0.5;   // 「about は嘘つきだ」と言うか
      return { by: names[i], about: about, claimsLiar: claimsLiar };
    });

    // 「嘘つきが k 番目」と仮定したとき、全発言が整合するかを判定
    var consistent = [];
    for (var k = 0; k < n; k++) {
      var ok = true;
      for (var m = 0; m < stmts.length; m++) {
        var st = stmts[m];
        var speakerIsLiar = (st.by === names[k]);
        var aboutIsLiar = (st.about === names[k]);
        // 正直者の発言は真、嘘つきの発言は偽
        var truthful = (st.claimsLiar === aboutIsLiar);
        if (speakerIsLiar ? truthful : !truthful) { ok = false; break; }
      }
      if (ok) consistent.push(k);
    }

    if (consistent.length === 1) {
      return {
        names: names,
        liar: names[consistent[0]],
        stmtTexts: stmts.map(function (st) {
          return "・" + st.by + "の発言:「" + st.about + "は嘘つき" + (st.claimsLiar ? "だ" : "ではない") + "」";
        })
      };
    }
  }
  return null;
}

/** 嘘つき問題テンプレートの共通 resolve。 */
function resolveLiarPuzzle(v) {
  var SETS = [
    ["A", "B", "C", "D"], ["P", "Q", "R", "S"], ["W", "X", "Y", "Z"],
    ["甲", "乙", "丙", "丁"], ["赤木", "青木", "黒田", "白石"]
  ];
  var names = SETS[v.nameSet].slice(0, v.n);
  var puz = buildLiarPuzzle(names);
  if (!puz) { v._ok = false; return; }
  v._ok = true;
  v._names = names;
  v._liar = puz.liar;
  v.names = names.join(", ");
  v.stmts = puz.stmtTexts.join("\n");
}

/**
 * 命題テンプレートの共通 resolve。
 * 「PならばQ」から対偶・逆・裏を機械生成し、対偶を正解、逆と裏を誤答にする。
 * 正解が1つであることは、辞書側で「逆が成り立たない組」に限ることで担保する。
 */
function resolvePropPuzzle(v) {
  var pr = PROP_PAIRS[v.pair % PROP_PAIRS.length];

  var contrapositive = pr.nq + "ならば" + pr.np;   // 対偶（必ず正しい）
  var converse       = pr.q  + "ならば" + pr.p;    // 逆（必ずしも正しくない）
  var inverse        = pr.np + "ならば" + pr.nq;   // 裏（逆と同値なので同様）
  // 4つ目の誤答。「Qならば¬Q」のような自己矛盾を作ると、内容を考えなくても
  // 明らかに誤りと分かってしまい選択肢として機能しない。
  // 別の素材から命題を借りて、前提と無関係だが文としては成立する形にする。
  var other = PROP_PAIRS[(v.pair + 1 + Math.floor(Math.random() * (PROP_PAIRS.length - 1))) % PROP_PAIRS.length];
  var unrelated = pr.np + "ならば" + other.q;

  var opts = [
    { t: contrapositive, ok: true },
    { t: converse, ok: false },
    { t: inverse, ok: false },
    { t: unrelated, ok: false }
  ];
  for (var i = opts.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
  }
  var texts = opts.map(function (o) { return o.t; });
  if (new Set(texts).size !== texts.length) { v._ok = false; return; }

  v._ok = true;
  v._choices = texts;
  v._correctIndex = opts.findIndex(function (o) { return o.ok; });
  v.premise = pr.p + "ならば" + pr.q;
  v.p = pr.p; v.q = pr.q; v.np = pr.np; v.nq = pr.nq;
}

/** 対応関係テンプレートの共通 resolve。 */
function resolveMatchPuzzle(v) {
  var SETS = [
    ["A", "B", "C", "D"], ["P", "Q", "R", "S"], ["W", "X", "Y", "Z"],
    ["甲", "乙", "丙", "丁"], ["赤木", "青木", "黒田", "白石"]
  ];
  var names = SETS[v.nameSet].slice(0, v.n);
  var th = MATCH_THEMES[v.theme % MATCH_THEMES.length];
  var items = th.items.slice(0, v.n);
  var puz = buildMatchPuzzle(names, items, th.verb);
  if (!puz) { v._ok = false; return; }

  var who = names[v.askWho % names.length];
  v._ok = true;
  v._items = items;
  v._answerItem = puz.assign[names.indexOf(who)];
  v._assign = names.map(function (nm, i) { return nm + " … " + puz.assign[i]; }).join("\n");
  v.names = names.join(", ");
  v.noun = th.noun;
  v.verb = th.verb;
  // 「Qが注文したのはどれか」のように、設問では過去/現在をそのまま使う
  v.verb2 = th.verb;
  v.who = who;
  v.conds = puz.condTexts.join("\n");
}

/**
 * 順序推論テンプレートの共通 resolve。
 * 3本のテンプレートが場面(attrs)だけ変えて同じ仕組みを使う。
 */
function resolveOrderPuzzle(v, attrs) {
  var SETS = [
    ["A", "B", "C", "D", "E"],
    ["P", "Q", "R", "S", "T"],
    ["W", "X", "Y", "Z", "V"],
    ["甲", "乙", "丙", "丁", "戊"],
    ["赤木", "青木", "黒田", "白石", "緑川"]
  ];
  var names = SETS[v.nameSet].slice(0, v.n);
  var attr = attrs[v.attr % attrs.length];
  var puz = buildOrderPuzzle(names, attr.rel);
  if (!puz) { v._ok = false; return; }

  var idx = v.askPos % v.n;
  var askText;
  if (idx === 0) askText = attr.ask[0];
  else if (idx === v.n - 1) askText = attr.ask[2];
  else askText = attr.ask[1].replace("{k}", String(idx + 1));

  v._ok = true;
  v._order = puz.order;
  v._names = names;
  v._answerName = puz.order[idx];
  v.names = names.join(", ");
  v.scene = attr.scene;
  v.conds = puz.condTexts.join("\n");
  v.question = askText + "のは誰か。";
}

/** 条件を満たす並びが何通りあるか数える。limitに達したら打ち切る。 */
function countSolutions(names, conds, limit) {
  var found = 0;
  var perm = [];
  var used = {};
  function rec() {
    if (found >= limit) return;
    if (perm.length === names.length) {
      var p = {};
      perm.forEach(function (nm, i) { p[nm] = i; });
      for (var c = 0; c < conds.length; c++) {
        if (p[conds[c][0]] >= p[conds[c][1]]) return;
      }
      found++;
      return;
    }
    for (var i = 0; i < names.length; i++) {
      if (used[names[i]]) continue;
      used[names[i]] = true;
      perm.push(names[i]);
      rec();
      perm.pop();
      used[names[i]] = false;
      if (found >= limit) return;
    }
  }
  rec();
  return found;
}

/** 配列をその場でシャッフルする（既存の個別実装をまとめたもの）。 */
function shuffleArray(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

// 1..n の順列をすべて作る。生成のたびに作り直すと重いのでキャッシュする。
var _PERMS_CACHE = {};
function permsOfN(n) {
  if (_PERMS_CACHE[n]) return _PERMS_CACHE[n];
  var base = [];
  for (var i = 1; i <= n; i++) base.push(i);
  var out = [];
  (function rec(cur, rest) {
    if (rest.length === 0) { out.push(cur.slice()); return; }
    for (var k = 0; k < rest.length; k++) {
      rec(cur.concat([rest[k]]), rest.slice(0, k).concat(rest.slice(k + 1)));
    }
  })([], base);
  _PERMS_CACHE[n] = out;
  return out;
}

/**
 * 「条件からの絞り込み」推論を作る。
 *
 * 1〜n の値を n 個の対象に1つずつ割り当てる。比較条件（XはYより大きい）と
 * 確定条件（Xはk である）を与え、「ある対象の値として考えられるものは何通りか」を問う。
 *
 * ここでの一意性は「答えが1つ」ではなく「通り数が1つに定まる」こと。
 * 全順列を総当たりして解集合を出し、その中で問い先が取りうる値の個数を数える。
 *
 * target を外から与えるのは、選択肢（1つ〜4つ）の中での正解の位置を一様にするため。
 * ここを成り行きに任せると正解が特定の位置に偏り、選ぶだけで当たるようになる。
 *
 * @returns {Object|null} {conds, sols, ask, values}
 */
function buildCondPuzzle(n, target) {
  var perms = permsOfN(n);

  for (var attempt = 0; attempt < 200; attempt++) {
    // 1) 少なくとも1つは解があることを保証するため、正解を1つ先に決める
    var perm = [];
    for (var i = 1; i <= n; i++) perm.push(i);
    shuffleArray(perm);

    // 2) その割り当てと矛盾しない条件の候補
    var gtCands = [], eqCands = [];
    for (var a = 0; a < n; a++) {
      for (var b = 0; b < n; b++) {
        if (a !== b && perm[a] > perm[b]) gtCands.push({ kind: "gt", a: a, b: b });
      }
      eqCands.push({ kind: "eq", a: a, k: perm[a] });
    }
    shuffleArray(gtCands); shuffleArray(eqCands);

    var nGt = 1 + Math.floor(Math.random() * 3);          // 1〜3個
    var nEq = Math.random() < 0.5 ? 1 : 0;
    var conds = gtCands.slice(0, nGt).concat(eqCands.slice(0, nEq));
    if (conds.length < 2) continue;
    shuffleArray(conds);

    // 3) 条件を満たす割り当てを全列挙
    var sols = perms.filter(function (p) {
      for (var c = 0; c < conds.length; c++) {
        var cd = conds[c];
        if (cd.kind === "gt") { if (!(p[cd.a] > p[cd.b])) return false; }
        else if (p[cd.a] !== cd.k) return false;
      }
      return true;
    });
    // 解が1通りしかないと「何通りか」を問う意味が無い。
    // 多すぎると解説で全部書き出せない（書き出せない解説は解説になっていない）。
    if (sols.length < 2 || sols.length > 8) continue;

    // 4) 「考えられる値がちょうど target 通り」になる問い先を探す
    var order = [];
    for (var w = 0; w < n; w++) order.push(w);
    shuffleArray(order);
    for (var oi = 0; oi < order.length; oi++) {
      var idx = order[oi];
      var vals = [];
      for (var s = 0; s < sols.length; s++) {
        if (vals.indexOf(sols[s][idx]) === -1) vals.push(sols[s][idx]);
      }
      if (vals.length !== target) continue;
      vals.sort(function (x, y) { return x - y; });
      return { conds: conds, sols: sols, ask: idx, values: vals };
    }
  }
  return null;
}

/** 条件からの絞り込みテンプレートの共通 resolve。 */
function resolveCondPuzzle(v) {
  var sc = COND_SCENES[v.scene % COND_SCENES.length];
  var pool = sc.pool === "letter" ? COND_LETTER_SETS : COND_PERSON_SETS;
  var names = pool[v.nameSet % pool.length].slice(0, COND_N);

  var puz = buildCondPuzzle(COND_N, v.target);
  if (!puz) { v._ok = false; return; }

  v._ok = true;
  v._count = puz.values.length;
  v.setup = sc.setup(names);
  v.conds = puz.conds.map(function (c) {
    return c.kind === "gt" ? sc.gt(names[c.a], names[c.b]) : sc.eq(names[c.a], c.k);
  }).join("\n");
  v.question = sc.ask(names[puz.ask]);
  v.solCount = puz.sols.length;
  v.solText = puz.sols.map(function (s) {
    return "・" + names.map(function (nm, i) { return sc.sol(nm, s[i]); }).join("、");
  }).join("\n");
  v.askLabel = sc.askLabel(names[puz.ask]);
  v.valueList = puz.values.map(function (k) { return sc.value(k); }).join("、");
  v.count = puz.values.length;
}

/** 真偽判定（対偶）テンプレートの共通 resolve。 */
function resolveTfPuzzle(v) {
  var sc = TF_SCENES[v.scene % TF_SCENES.length];
  var person = TF_PERSONS[v.person % TF_PERSONS.length];

  // 「運転免許を持っている社員」「運転免許を持っていない社員」を辞書から組み立てる。
  // 連体形＋名詞なので機械的に連結しても日本語が壊れない形だけを辞書に置いてある。
  var attrNoun = sc.attrAff + sc.member;
  var attrNegNoun = sc.attrNegPred + sc.member;

  // 対偶だけが確実に言える。逆・裏・個別の断定はいずれも言えない。
  var correct = attrNegNoun + "は" + sc.subNegPred;
  var wrongs = [
    person + "は" + sc.subAff,                 // 逆を個別に当てはめたもの
    sc.notSubNoun + "は" + sc.attrNegPred,     // 裏
    attrNoun + "は全員" + sc.subAff,           // 逆（全称）
    person + "は" + sc.subNegPred              // 逆の否定を個別に当てはめたもの
  ];
  shuffleArray(wrongs);

  var opts = [{ t: correct, ok: true }];
  for (var i = 0; i < 3; i++) opts.push({ t: wrongs[i], ok: false });
  shuffleArray(opts);

  var texts = opts.map(function (o) { return o.t; });
  if (new Set(texts).size !== texts.length) { v._ok = false; return; }

  v._ok = true;
  v._choices = texts;
  v._correctIndex = opts.findIndex(function (o) { return o.ok; });
  v.group = sc.group;
  v.subNoun = sc.subNoun;
  v.subNegPred = sc.subNegPred;
  v.attrAff = sc.attrAff;
  v.attrNegPred = sc.attrNegPred;
  v.person = person;
}

/**
 * 数列の規則性の問題を作る。
 *
 * 「答えが2通りに読める」のがこの分野の事故。たとえば 2,4,8,… は等比とも
 * 「差が倍々」とも読めて、たまたま両者の予測が食い違えば正解が2つになる。
 * そこで、SPIで実際に問われる規則の族を列挙し、示した数列に当てはまる族の
 * 予測がちょうど1通りのときだけ採用する（fitSequenceRules）。
 */
function buildSequencePuzzle(kind) {
  var terms = [], rule = null, i, x;

  if (kind === 0) {                                   // 等差
    var a0 = 1 + Math.floor(Math.random() * 12);
    var d = 2 + Math.floor(Math.random() * 9);
    for (i = 0; i < 7; i++) terms.push(a0 + d * i);
    rule = { type: "arith", d: d };

  } else if (kind === 1) {                            // 等比
    var a1 = 1 + Math.floor(Math.random() * 6);
    var r = 2 + Math.floor(Math.random() * 2);
    x = a1;
    for (i = 0; i < 7; i++) { terms.push(x); x *= r; }
    rule = { type: "geom", r: r };

  } else if (kind === 2) {                            // 差が等差
    var a2 = 1 + Math.floor(Math.random() * 8);
    var d0 = 1 + Math.floor(Math.random() * 6);
    var dd = 1 + Math.floor(Math.random() * 4);
    terms.push(a2);
    x = a2;
    var dcur = d0;
    for (i = 0; i < 6; i++) { x += dcur; terms.push(x); dcur += dd; }
    rule = { type: "arith2", d0: d0, dd: dd };

  } else if (kind === 3) {                            // フィボナッチ型
    var f1 = 1 + Math.floor(Math.random() * 5);
    var f2 = f1 + Math.floor(Math.random() * 5);
    terms.push(f1); terms.push(f2);
    for (i = 2; i < 7; i++) terms.push(terms[i - 1] + terms[i - 2]);
    rule = { type: "fib" };

  } else {                                            // 前の数を m 倍して c を足す
    var m = 2 + Math.floor(Math.random() * 2);
    var c = 1 + Math.floor(Math.random() * 5);
    var a4 = 1 + Math.floor(Math.random() * 5);
    terms.push(a4);
    for (i = 1; i < 7; i++) terms.push(terms[i - 1] * m + c);
    rule = { type: "mulAdd", m: m, c: c };
  }

  // 桁が大きすぎると電卓なしのテストセンターで解けない
  for (i = 0; i < terms.length; i++) {
    if (!isFinite(terms[i]) || terms[i] <= 0 || terms[i] > 3000) return null;
  }
  return { terms: terms, rule: rule };
}

/**
 * 数列に当てはまる規則を総当たりし、次の項の予測値を重複なしで返す。
 * 予測が2つ以上出るものは「答えが定まらない問題」なので出題しない。
 */
function fitSequenceRules(s) {
  var n = s.length, i;
  var preds = [];
  var push = function (v) {
    if (isFinite(v) && v === Math.round(v) && preds.indexOf(v) === -1) preds.push(v);
  };

  // 等差
  var d = s[1] - s[0], okA = true;
  for (i = 1; i < n; i++) if (s[i] - s[i - 1] !== d) { okA = false; break; }
  if (okA) push(s[n - 1] + d);

  // 等比
  if (s[0] !== 0) {
    var r = s[1] / s[0], okG = (r !== 1);
    for (i = 1; i < n && okG; i++) {
      if (s[i - 1] === 0 || s[i] / s[i - 1] !== r) okG = false;
    }
    if (okG) push(s[n - 1] * r);
  }

  // 差が等差
  var diffs = [];
  for (i = 1; i < n; i++) diffs.push(s[i] - s[i - 1]);
  if (diffs.length >= 3) {
    var dd = diffs[1] - diffs[0], okA2 = true;
    for (i = 1; i < diffs.length; i++) if (diffs[i] - diffs[i - 1] !== dd) { okA2 = false; break; }
    if (okA2) push(s[n - 1] + diffs[diffs.length - 1] + dd);
  }

  // フィボナッチ型
  if (n >= 4) {
    var okF = true;
    for (i = 2; i < n; i++) if (s[i] !== s[i - 1] + s[i - 2]) { okF = false; break; }
    if (okF) push(s[n - 1] + s[n - 2]);
  }

  // 前の数を m 倍して c を足す
  if (n >= 3 && (s[1] - s[0]) !== 0) {
    var m = (s[2] - s[1]) / (s[1] - s[0]);
    if (m === Math.round(m) && Math.abs(m) >= 2 && Math.abs(m) <= 5) {
      var c = s[1] - s[0] * m;
      var okM = true;
      for (i = 1; i < n; i++) if (s[i] !== s[i - 1] * m + c) { okM = false; break; }
      if (okM) push(s[n - 1] * m + c);
    }
  }

  return preds;
}

/** 数列テンプレートの共通 resolve。 */
function resolveSequencePuzzle(v) {
  var puz = buildSequencePuzzle(v.kind);
  if (!puz) { v._ok = false; return; }

  var shown = puz.terms.slice(0, 6);
  var ans = puz.terms[6];

  // 生成器の意図と、示した数列から読み取れる規則が一致しているかを確かめる
  var preds = fitSequenceRules(shown);
  if (preds.length !== 1 || preds[0] !== ans) { v._ok = false; return; }

  var last = shown[5], prev = shown[4];
  var lastDiff = last - prev;
  var prevDiff = prev - shown[3];
  var firstDiff = shown[1] - shown[0];
  var base = Math.max(1, Math.abs(lastDiff));

  // 誤答は「よくある計算間違いの結果」。
  // ±base×1〜3 は必ず正の整数になる（等差・等比・差が等差・フィボナッチ・m倍+c の
  // どれでも ans-3*base > 0 が成り立つことを確認済み）ので、
  // エンジン側の補完（答えの半分など小数が出る）を発動させずに済む。
  var wrongs = [
    last,                     // 1つ手前で止めてしまった
    last + lastDiff,          // 差が変わることを見落とした
    last + prevDiff,          // 1つ前の差を使ってしまった
    last + firstDiff,         // 最初の差をずっと使ってしまった
    2 * ans - last,           // 進めすぎた
    ans + lastDiff,
    ans - base, ans - 2 * base, ans - 3 * base,
    ans + base, ans + 2 * base, ans + 3 * base
  ];

  v._ok = true;
  v._answer = ans;
  v._wrongs = wrongs;
  v.seq = shown.join(", ");
  v.intro = SEQ_INTROS[v.intro_i % SEQ_INTROS.length];
  v.ask = SEQ_ASKS[v.ask_i % SEQ_ASKS.length];
  v.explainBody = explainSequence(puz.rule, shown, ans);
}

/** 規則ごとの解説本文。規則が違えば解き方の説明も変わるので分けて書く。 */
function explainSequence(rule, s, ans) {
  var last = s[5], prev = s[4];
  var diffs = [];
  for (var i = 1; i < s.length; i++) diffs.push(s[i] - s[i - 1]);

  if (rule.type === "arith") {
    return "隣り合う数の差を取ると、すべて " + rule.d + " で一定です。\n\n"
      + "等差数列なので、次の数は " + last + " + " + rule.d + " = " + ans + " です。";
  }
  if (rule.type === "geom") {
    return "隣り合う数の比を取ると、すべて " + rule.r + " 倍で一定です。\n\n"
      + "等比数列なので、次の数は " + last + " × " + rule.r + " = " + ans + " です。";
  }
  if (rule.type === "arith2") {
    var lastDiff = diffs[diffs.length - 1];
    return "差を取ると " + diffs.join(", ") + " となり、差そのものが " + rule.dd + " ずつ増えています。\n\n"
      + "次の差は " + lastDiff + " + " + rule.dd + " = " + (lastDiff + rule.dd) + " なので、\n"
      + "? = " + last + " + " + (lastDiff + rule.dd) + " = " + ans + " です。";
  }
  if (rule.type === "fib") {
    return "前の2つの数を足すと次の数になります。\n"
      + s[0] + " + " + s[1] + " = " + s[2] + "、" + s[1] + " + " + s[2] + " = " + s[3] + " …\n\n"
      + "? = " + prev + " + " + last + " = " + ans + " です。";
  }
  return "各項は「前の数を " + rule.m + " 倍して " + rule.c + " を足す」形になっています。\n"
    + s[0] + " × " + rule.m + " + " + rule.c + " = " + s[1] + "、"
    + s[1] + " × " + rule.m + " + " + rule.c + " = " + s[2] + " …\n\n"
    + "? = " + last + " × " + rule.m + " + " + rule.c + " = " + ans + " です。";
}

function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) { var t = b; b = a % b; a = t; }
  return a;
}

function factorial(n) {
  if (n <= 1) return 1;
  var result = 1;
  for (var i = 2; i <= n; i++) result *= i;
  return result;
}

function permutation(n, r) {
  var result = 1;
  for (var i = 0; i < r; i++) result *= (n - i);
  return result;
}

function combination(n, r) {
  if (r > n) return 0;
  if (r === 0 || r === n) return 1;
  if (r > n - r) r = n - r;
  var result = 1;
  for (var i = 0; i < r; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

function formatTable(tableData) {
  var cols = tableData.cols;
  var rows = tableData.rows;
  var data = tableData.data;
  var unit = tableData.unit || "";

  // ヘッダー行
  var header = "| |" + cols.map(function(c) { return " " + c + " |"; }).join("");
  var separator = "|---|" + cols.map(function() { return "---:|"; }).join("");

  // データ行
  var dataRows = rows.map(function(row) {
    return "| " + row + " |" + cols.map(function(col) {
      return " " + data[row][col] + " |";
    }).join("");
  });

  return header + "\n" + separator + "\n" + dataRows.join("\n") + "\n（単位: " + unit + "）";
}

// ============================================================
// グラフ描画関数（Canvas API）
// ============================================================

var CHART_COLORS = ["#4285f4", "#ea4335", "#fbbc04", "#34a853", "#ff6d01", "#46bdc6", "#9c27b0", "#795548"];

/**
 * メインルーター: chartTypeに応じて描画関数を分岐
 * @param {HTMLCanvasElement} canvas
 * @param {Object} config - chartType, title, labels, datasets, unit, yAxisLabel等
 */
function drawQuestionChart(canvas, config) {
  var dpr = window.devicePixelRatio || 1;
  var cssW = 560;
  var cssH = 340;

  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";

  var ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  if (config.chartType === "bar") {
    drawBarChart(ctx, cssW, cssH, config);
  } else if (config.chartType === "line") {
    drawLineChart(ctx, cssW, cssH, config);
  } else if (config.chartType === "pie") {
    drawPieChart(ctx, cssW, cssH, config);
  }
}

/**
 * 棒グラフ描画
 */
function drawBarChart(ctx, w, h, config) {
  var labels = config.labels;
  var datasets = config.datasets;
  var title = config.title || "";
  var yAxisLabel = config.yAxisLabel || "";

  // 描画エリア
  var padLeft = 70, padRight = 20, padTop = 40, padBottom = 50;
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  // Y軸の最大値を算出
  var maxVal = 0;
  datasets.forEach(function(ds) {
    ds.data.forEach(function(v) { if (v > maxVal) maxVal = v; });
  });
  var yMax = Math.ceil(maxVal / 100) * 100;
  if (yMax === 0) yMax = 100;
  // 5段階のグリッド
  var yStep = yMax / 5;

  // タイトル
  ctx.font = "bold 14px system-ui";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(title, w / 2, 20);

  // Y軸ラベル
  ctx.font = "11px system-ui";
  ctx.fillStyle = "#666";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (var i = 0; i <= 5; i++) {
    var yVal = yStep * i;
    var yPos = padTop + chartH - (chartH * yVal / yMax);
    ctx.fillText(String(Math.round(yVal)), padLeft - 8, yPos);

    // グリッド線
    ctx.beginPath();
    ctx.moveTo(padLeft, yPos);
    ctx.lineTo(padLeft + chartW, yPos);
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Y軸タイトル
  if (yAxisLabel) {
    ctx.save();
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.translate(14, padTop + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();
  }

  // 棒グラフ描画
  var numGroups = labels.length;
  var numSeries = datasets.length;
  var groupW = chartW / numGroups;
  var barW = Math.min(groupW * 0.7 / numSeries, 50);
  var totalBarW = barW * numSeries;

  labels.forEach(function(label, gi) {
    var groupX = padLeft + groupW * gi + groupW / 2;

    datasets.forEach(function(ds, si) {
      var barX = groupX - totalBarW / 2 + barW * si;
      var barH = (ds.data[gi] / yMax) * chartH;
      var barY = padTop + chartH - barH;

      ctx.fillStyle = ds.color || CHART_COLORS[si % CHART_COLORS.length];
      ctx.fillRect(barX, barY, barW - 2, barH);

      // 数値ラベル
      ctx.font = "10px system-ui";
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(String(ds.data[gi]), barX + (barW - 2) / 2, barY - 3);
    });

    // X軸ラベル
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, groupX, padTop + chartH + 8);
  });

  // 凡例（複数系列の場合のみ）
  if (numSeries > 1) {
    var legendX = padLeft + 10;
    var legendY = padTop + chartH + 30;
    ctx.font = "11px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    datasets.forEach(function(ds, si) {
      var x = legendX + si * 100;
      ctx.fillStyle = ds.color || CHART_COLORS[si % CHART_COLORS.length];
      ctx.fillRect(x, legendY - 5, 12, 10);
      ctx.fillStyle = "#333";
      ctx.fillText(ds.label || "", x + 16, legendY);
    });
  }
}

/**
 * 折れ線グラフ描画
 */
function drawLineChart(ctx, w, h, config) {
  var labels = config.labels;
  var datasets = config.datasets;
  var title = config.title || "";
  var yAxisLabel = config.yAxisLabel || "";

  var padLeft = 70, padRight = 20, padTop = 40, padBottom = 50;
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  // Y軸の最大値・最小値
  var maxVal = 0, minVal = Infinity;
  datasets.forEach(function(ds) {
    ds.data.forEach(function(v) {
      if (v > maxVal) maxVal = v;
      if (v < minVal) minVal = v;
    });
  });
  var yMin = Math.floor(minVal / 100) * 100;
  if (yMin > 0) yMin = 0;
  var yMax = Math.ceil(maxVal / 100) * 100;
  if (yMax === yMin) yMax = yMin + 100;
  var yRange = yMax - yMin;
  var yStep = yRange / 5;

  // タイトル
  ctx.font = "bold 14px system-ui";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(title, w / 2, 20);

  // Y軸ラベル・グリッド
  ctx.font = "11px system-ui";
  ctx.fillStyle = "#666";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (var i = 0; i <= 5; i++) {
    var yVal = yMin + yStep * i;
    var yPos = padTop + chartH - (chartH * (yVal - yMin) / yRange);
    ctx.fillText(String(Math.round(yVal)), padLeft - 8, yPos);
    ctx.beginPath();
    ctx.moveTo(padLeft, yPos);
    ctx.lineTo(padLeft + chartW, yPos);
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Y軸タイトル
  if (yAxisLabel) {
    ctx.save();
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.translate(14, padTop + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();
  }

  // X軸ラベル
  var numPoints = labels.length;
  labels.forEach(function(label, i) {
    var x = padLeft + (chartW / (numPoints - 1)) * i;
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, x, padTop + chartH + 8);
  });

  // 折れ線描画
  datasets.forEach(function(ds, si) {
    var color = ds.color || CHART_COLORS[si % CHART_COLORS.length];

    // 線
    ctx.beginPath();
    ds.data.forEach(function(v, i) {
      var x = padLeft + (chartW / (numPoints - 1)) * i;
      var y = padTop + chartH - (chartH * (v - yMin) / yRange);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // マーカー + 数値ラベル
    ds.data.forEach(function(v, i) {
      var x = padLeft + (chartW / (numPoints - 1)) * i;
      var y = padTop + chartH - (chartH * (v - yMin) / yRange);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "10px system-ui";
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(String(v), x, y - 7);
    });
  });

  // 凡例
  if (datasets.length > 1) {
    var legendX = padLeft + 10;
    var legendY = padTop + chartH + 30;
    ctx.font = "11px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    datasets.forEach(function(ds, si) {
      var x = legendX + si * 100;
      ctx.fillStyle = ds.color || CHART_COLORS[si % CHART_COLORS.length];
      ctx.fillRect(x, legendY - 5, 12, 10);
      ctx.fillStyle = "#333";
      ctx.fillText(ds.label || "", x + 16, legendY);
    });
  }
}

/**
 * 円グラフ描画
 */
function drawPieChart(ctx, w, h, config) {
  var title = config.title || "";
  var labels = config.labels;
  var dataset = config.datasets[0];
  var data = dataset.data;

  // 複数円グラフ対応（左右に並べる）
  var numPies = config.datasets.length;
  if (numPies > 1) {
    drawMultiPieChart(ctx, w, h, config);
    return;
  }

  var total = 0;
  data.forEach(function(v) { total += v; });

  // タイトル
  ctx.font = "bold 14px system-ui";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(title, w / 2, 20);

  var cx = w / 2 - 60;
  var cy = h / 2 + 10;
  var radius = Math.min(w, h) * 0.32;

  // 扇形描画
  var startAngle = -Math.PI / 2;
  data.forEach(function(val, i) {
    var sliceAngle = (val / total) * Math.PI * 2;
    var endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // パーセンテージラベル（扇の中央）
    var midAngle = startAngle + sliceAngle / 2;
    var pct = Math.round(val / total * 100);
    if (pct >= 5) {
      var labelR = radius * 0.65;
      var lx = cx + labelR * Math.cos(midAngle);
      var ly = cy + labelR * Math.sin(midAngle);
      ctx.font = "bold 11px system-ui";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pct + "%", lx, ly);
    }

    startAngle = endAngle;
  });

  // 凡例（右側に縦並び）
  var legendX = cx + radius + 40;
  var legendStartY = cy - (labels.length * 22) / 2;
  ctx.font = "11px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  labels.forEach(function(label, i) {
    var ly = legendStartY + i * 22;
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(legendX, ly - 5, 12, 10);
    ctx.fillStyle = "#333";
    var pct = Math.round(data[i] / total * 100);
    ctx.fillText(label + " (" + pct + "%)", legendX + 16, ly);
  });
}

/**
 * 複数円グラフ（左右並べて比較）
 */
function drawMultiPieChart(ctx, w, h, config) {
  var title = config.title || "";
  var labels = config.labels;

  // タイトル
  ctx.font = "bold 14px system-ui";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(title, w / 2, 20);

  var numPies = config.datasets.length;
  var pieW = w / numPies;
  var radius = Math.min(pieW * 0.3, h * 0.28);

  config.datasets.forEach(function(ds, pi) {
    var data = ds.data;
    var total = 0;
    data.forEach(function(v) { total += v; });

    var cx = pieW * pi + pieW / 2;
    var cy = h / 2;

    // サブタイトル（ds.totalがあればそちらを表示、なければdata合計）
    var displayTotal = ds.total != null ? ds.total : total;
    ctx.font = "bold 12px system-ui";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText(ds.label + "（計 " + displayTotal.toLocaleString() + (config.unit || "") + "）", cx, 40);

    // 扇形
    var startAngle = -Math.PI / 2;
    data.forEach(function(val, i) {
      var sliceAngle = (val / total) * Math.PI * 2;
      var endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      var midAngle = startAngle + sliceAngle / 2;
      var pct = Math.round(val / total * 100);
      if (pct >= 5) {
        var labelR = radius * 0.65;
        var lx = cx + labelR * Math.cos(midAngle);
        var ly = cy + labelR * Math.sin(midAngle);
        ctx.font = "bold 10px system-ui";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pct + "%", lx, ly);
      }
      startAngle = endAngle;
    });
  });

  // 共通凡例（下部）
  var legendY = h - 25;
  var totalLegendW = labels.length * 90;
  var legendStartX = (w - totalLegendW) / 2;
  ctx.font = "11px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  labels.forEach(function(label, i) {
    var x = legendStartX + i * 90;
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(x, legendY - 5, 10, 10);
    ctx.fillStyle = "#333";
    ctx.fillText(label, x + 14, legendY);
  });
}
