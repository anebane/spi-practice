// ⚠️ このファイルは tools/build-questions.js が生成しています。
// 直接編集せず src/questions/ を編集して `node tools/build-questions.js` を実行してください。

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
  // 解説が正解の選択肢をそのまま書き下すようにする。
  // 「答えは対偶です」だけだと、どれを選べばよいかが解説から読み取れない。
  v.contra = contrapositive;
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
  v.anchor = names[0];
  v.answerName = names[puz.answer];
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
  // 解説が正解の選択肢をそのまま書き下すようにする
  v.correctText = correct;
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

// ============================================================
// 円卓の席順（suiron_position_01）
// ============================================================
// この問題が他の推論と違うのは、対称性が2種類あること。
//
// ① 回転対称 … 円卓には決まった「1番の席」が無いので、全員を1つずつ
//    ずらした並びは同じ並びとみなす。そこで1人を席0に固定して数える。
//    こうすると数えるべき並びは n! ではなく (n-1)! になる。
//
// ② 鏡像対称 … 「隣り合う」「向かい合う」「間に1人いる」はどれも
//    左右を入れ替えても成り立つ関係なので、ある並びが条件を満たすなら
//    その鏡像も必ず満たす。**つまり座り方は原理的に1通りに定まらない。**
//    順序推論と同じ「解がちょうど1通り」を要求すると、ほぼ全ての問題が
//    捨てられてしまう。
//
//    ただし「Xの向かいは誰か」の答えは鏡像で変わらない（向かいの席は
//    鏡像でも同じ人）。so 一意性は「座り方」ではなく「答え」に課す。
//    ここを取り違えると、正解が2つある問題を出すか、1問も作れないかの
//    どちらかになる。
// ============================================================

// 1人を席0に固定した全席順。n=6 なら 120通り。
// 生成のたびに作り直すと重いので n ごとにキャッシュする。
var _SEATINGS_CACHE = {};
function circleSeatings(n) {
  if (_SEATINGS_CACHE[n]) return _SEATINGS_CACHE[n];
  var rest = [];
  for (var i = 1; i < n; i++) rest.push(i);
  var seats = [];
  (function rec(cur, remain) {
    if (remain.length === 0) { seats.push([0].concat(cur)); return; }
    for (var k = 0; k < remain.length; k++) {
      rec(cur.concat([remain[k]]), remain.slice(0, k).concat(remain.slice(k + 1)));
    }
  })([], rest);
  // pos[人] = その人が座っている席番号
  var poss = seats.map(function (s) {
    var p = [];
    for (var j = 0; j < s.length; j++) p[s[j]] = j;
    return p;
  });
  _SEATINGS_CACHE[n] = { seats: seats, poss: poss };
  return _SEATINGS_CACHE[n];
}

/** 円卓上の2人の距離（時計回り・反時計回りの短いほう）。 */
function circleDist(pos, a, b, n) {
  var d = Math.abs(pos[a] - pos[b]);
  return Math.min(d, n - d);
}

/** 席順が条件をすべて満たすか。 */
function circleSatisfies(pos, conds, n) {
  var half = n / 2;
  for (var i = 0; i < conds.length; i++) {
    var c = conds[i];
    var d = circleDist(pos, c.a, c.b, n);
    if (c.t === "adj"    && d !== 1)    return false;
    if (c.t === "notadj" && d === 1)    return false;
    if (c.t === "opp"    && d !== half) return false;
    if (c.t === "gap1"   && d !== 2)    return false;
  }
  return true;
}

/**
 * 円卓の席順パズルを作る。
 *
 * @returns {Object|null} {conds, sols, who, answer}
 *   sols は条件を満たす席順すべて（鏡像を含むので普通は2通り以上ある）。
 *   who の向かいが sols 全体で1人に定まるときだけ採用する。
 */
function buildCirclePuzzle(n) {
  var cache = circleSeatings(n);
  var seats = cache.seats, poss = cache.poss;
  var half = n / 2;

  for (var attempt = 0; attempt < 80; attempt++) {
    // 1) 正解に含まれる席順を1つ決める（解が必ず1つ以上あることの保証）
    var ti = Math.floor(Math.random() * seats.length);
    var tpos = poss[ti];

    // 2) その席順と矛盾しない条件候補を、ペアごとに1つだけ作る。
    //    同じペアに2つ条件を付けると冗長で読みにくい。
    var pairs = [];
    for (var a = 0; a < n; a++) {
      for (var b = a + 1; b < n; b++) {
        var d = circleDist(tpos, a, b, n);
        var opts = [];
        if (d === 1) opts.push("adj"); else opts.push("notadj");
        if (d === half) opts.push("opp");
        if (d === 2) opts.push("gap1");
        pairs.push({ a: a, b: b, opts: opts });
      }
    }
    shuffleArray(pairs);

    var count = 3 + Math.floor(Math.random() * 3);   // 3〜5個
    var conds = pairs.slice(0, count).map(function (p) {
      return { t: p.opts[Math.floor(Math.random() * p.opts.length)], a: p.a, b: p.b };
    });

    // 3) 条件を満たす席順を全列挙
    var sols = [];
    for (var s = 0; s < seats.length; s++) {
      if (circleSatisfies(poss[s], conds, n)) sols.push(s);
    }
    // 解説で全部書き出せる範囲に収める（書き出せない解説は解説にならない）
    if (sols.length < 1 || sols.length > 6) continue;

    // 4) 「向かいが1人に定まる」人を探す
    var order = [];
    for (var w = 0; w < n; w++) order.push(w);
    shuffleArray(order);

    for (var oi = 0; oi < order.length; oi++) {
      var who = order[oi];
      // 向かいが条件でそのまま与えられていたら問題として成立しない
      var given = conds.some(function (c) {
        return c.t === "opp" && (c.a === who || c.b === who);
      });
      if (given) continue;

      var opps = [];
      for (var k = 0; k < sols.length; k++) {
        var si = sols[k];
        var facing = seats[si][(poss[si][who] + half) % n];
        if (opps.indexOf(facing) === -1) opps.push(facing);
      }
      if (opps.length !== 1) continue;

      return { conds: conds, sols: sols, who: who, answer: opps[0] };
    }
  }
  return null;
}

/** 円卓テンプレートの共通 resolve。 */
function resolveCirclePuzzle(v) {
  var n = 6;                                  // 「向かい」を使うので偶数。6人が定番
  var names = CIRCLE_NAME_SETS[v.nameSet % CIRCLE_NAME_SETS.length].slice(0, n);
  var sc = CIRCLE_SCENES[v.scene % CIRCLE_SCENES.length];

  var puz = buildCirclePuzzle(n);
  if (!puz) { v._ok = false; return; }

  var cache = circleSeatings(n);
  var nm = function (i) { return names[i]; };

  v._ok = true;
  v._names = names;
  v._answerName = names[puz.answer];
  v._whoName = names[puz.who];

  v.names = names.join(", ");
  v.n = n;
  v.scene = sc.scene;
  v.who = names[puz.who];
  v.conds = puz.conds.map(function (c) {
    if (c.t === "adj")    return "・" + nm(c.a) + "と" + nm(c.b) + "は隣り合っている";
    // 「隣り合っていない」は他動詞の否定形と同じ語尾なので、
    // 日本語の健全性検査（目的語の助詞）に引っかかる。既存の固定問題と
    // 同じ「XはYの隣ではない」の形にする。
    if (c.t === "notadj") return "・" + nm(c.a) + "は" + nm(c.b) + "の隣ではない";
    if (c.t === "opp")    return "・" + nm(c.a) + "と" + nm(c.b) + "は向かい合っている";
    return "・" + nm(c.a) + "と" + nm(c.b) + "の間には1人が座っている";
  }).join("\n");

  v.anchor = names[0];
  v.answerName = names[puz.answer];
  v.solCount = puz.sols.length;
  v.solText = puz.sols.map(function (si) {
    return "・" + cache.seats[si].map(nm).join(" → ") + " →（" + names[0] + "に戻る）";
  }).join("\n");
  v.half = n / 2;
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

// 順序推論で使う「場面 / 条件の言い回し / 設問の言い回し」。
// 3本のテンプレートで別々の場面を担当させ、内容が重ならないようにする。
// 命題の素材。「Pならば Q」の形で、P/Q それぞれに肯定形と否定形を持たせる。
// 否定形を機械生成すると日本語が壊れるので、辞書に書いておく。
// 【重要】P と Q は「PならばQ」が成り立ち、かつ「QならばP」が成り立たない組にすること。
//         逆が成り立つ組を入れると、誤答（逆）も正しくなってしまい正解が2つになる。
var PROP_PAIRS = [
  { p: "雨が降る",         np: "雨が降らない",         q: "地面が濡れる",       nq: "地面が濡れない" },
  { p: "犬を飼っている",   np: "犬を飼っていない",     q: "動物が好きだ",       nq: "動物が好きではない" },
  { p: "この店に行く",     np: "この店に行かない",     q: "駅前を通る",         nq: "駅前を通らない" },
  { p: "合格する",         np: "合格しない",           q: "試験を受けている",   nq: "試験を受けていない" },
  { p: "マラソンを完走した", np: "マラソンを完走していない", q: "体力がある",     nq: "体力がない" },
  { p: "この本を読んだ",   np: "この本を読んでいない", q: "内容を知っている",   nq: "内容を知らない" },
  { p: "免許を持っている", np: "免許を持っていない",   q: "試験に合格した",     nq: "試験に合格していない" },
  { p: "海外に住んでいた", np: "海外に住んでいなかった", q: "パスポートを取得した", nq: "パスポートを取得していない" }
];

// 対応関係の題材。人数と項目数は必ず一致させる。
// 「〜を選んでいない」の形に載る題材だけを置く。
// 「住まい」は助詞が「に」なので同じ型に載らず、混ぜると日本語が壊れる。
var MATCH_THEMES = [
  { noun: "ペット",   verb: "飼っている", items: ["犬", "猫", "鳥", "うさぎ"] },
  { noun: "スポーツ", verb: "している",   items: ["野球", "サッカー", "テニス", "水泳"] },
  { noun: "科目",     verb: "選択している", items: ["数学", "国語", "英語", "理科"] },
  { noun: "楽器",     verb: "演奏する",   items: ["ピアノ", "ギター", "バイオリン", "フルート"] },
  { noun: "飲み物",   verb: "注文した",   items: ["コーヒー", "紅茶", "ジュース", "水"] }
];

var ORDER_ATTRS = {
  line: [
    { scene: "一列に並んでいる",   rel: "前にいる",       ask: ["先頭にいる", "前から{k}番目にいる", "最後尾にいる"] },
    { scene: "順番待ちをしている", rel: "前に並んでいる", ask: ["先頭にいる", "前から{k}番目にいる", "最後尾にいる"] }
  ],
  score: [
    { scene: "テストを受けた",   rel: "点数が高い", ask: ["最も点数が高い", "点数が{k}番目に高い", "最も点数が低い"] },
    { scene: "身長を比べた",     rel: "背が高い",   ask: ["最も背が高い", "{k}番目に背が高い", "最も背が低い"] },
    { scene: "年齢を比べた",     rel: "年上である", ask: ["最も年上である", "{k}番目に年上である", "最も年下である"] }
  ],
  race: [
    { scene: "徒競走でゴールした", rel: "先にゴールした", ask: ["1位だった", "{k}位だった", "最下位だった"] },
    { scene: "100m走をした",     rel: "速かった",       ask: ["1位だった", "{k}位だった", "最下位だった"] },
    { scene: "駅に到着した",     rel: "先に到着した",   ask: ["最初に到着した", "{k}番目に到着した", "最後に到着した"] }
  ]
};

// ------------------------------------------------------------
// 条件からの絞り込み（suiron_cond_01）の素材
// ------------------------------------------------------------
// 場面ごとに「値」の意味づけが違う（番号・順位・得点）。
// 内部では常に 1〜5 の数値を割り当て、表示のときだけ場面の言い回しに直す。
// 順位だけは数が大きいほど「下位」なので、gt の文言をそこで反転させている。
var COND_N = 5;
var COND_LETTER_SETS = [
  ["A", "B", "C", "D", "E"],
  ["P", "Q", "R", "S", "T"],
  ["W", "X", "Y", "Z", "V"]
];
var COND_PERSON_SETS = [
  ["A", "B", "C", "D", "E"],
  ["P", "Q", "R", "S", "T"],
  ["甲", "乙", "丙", "丁", "戊"],
  ["赤木", "青木", "黒田", "白石", "緑川"]
];

var COND_SCENES = [
  {
    pool: "letter",
    setup: function (nm) {
      return "箱" + nm.join("、箱") + " の" + COND_N + "つの箱に、1から" + COND_N
        + "までの番号を1つずつ書いたカードが1枚ずつ入っている。";
    },
    gt: function (a, b) { return "・箱" + a + "のカードの番号は箱" + b + "より大きい"; },
    eq: function (a, k) { return "・箱" + a + "のカードの番号は" + k + "である"; },
    ask: function (w) { return "箱" + w + "のカードの番号として考えられるものは何通りあるか。"; },
    askLabel: function (w) { return "箱" + w + "のカードの番号"; },
    sol: function (nm, k) { return "箱" + nm + "=" + k; },
    value: function (k) { return String(k); }
  },
  {
    pool: "person",
    setup: function (nm) {
      return nm.join("、") + " の" + COND_N + "人が徒競走をし、1位から" + COND_N
        + "位までの順位がついた。同じ順位の人はいない。";
    },
    // 順位は数が大きいほど下位。内部の「値が大きい」をそのまま「順位が下」と読み替える
    gt: function (a, b) { return "・" + a + "は" + b + "より順位が下だった"; },
    eq: function (a, k) { return "・" + a + "は" + k + "位だった"; },
    ask: function (w) { return w + "の順位として考えられるものは何通りあるか。"; },
    askLabel: function (w) { return w + "の順位"; },
    sol: function (nm, k) { return nm + "=" + k + "位"; },
    value: function (k) { return k + "位"; }
  },
  {
    pool: "person",
    setup: function (nm) {
      return nm.join("、") + " の" + COND_N + "人が、1から" + COND_N
        + "までの番号が書かれた札を1枚ずつ持っている。";
    },
    gt: function (a, b) { return "・" + a + "の札の番号は" + b + "より大きい"; },
    eq: function (a, k) { return "・" + a + "の札の番号は" + k + "である"; },
    ask: function (w) { return w + "の札の番号として考えられるものは何通りあるか。"; },
    askLabel: function (w) { return w + "の札の番号"; },
    sol: function (nm, k) { return nm + "=" + k; },
    value: function (k) { return String(k); }
  },
  {
    pool: "person",
    setup: function (nm) {
      return nm.join("、") + " の" + COND_N + "人がゲームをし、1点から" + COND_N
        + "点までの点数を全員異なる点数で獲得した。";
    },
    gt: function (a, b) { return "・" + a + "の得点は" + b + "より高い"; },
    eq: function (a, k) { return "・" + a + "の得点は" + k + "点である"; },
    ask: function (w) { return w + "の得点として考えられるものは何通りあるか。"; },
    askLabel: function (w) { return w + "の得点"; },
    sol: function (nm, k) { return nm + "=" + k + "点"; },
    value: function (k) { return k + "点"; }
  }
];

// ------------------------------------------------------------
// 真偽判定（suiron_tf_01）の素材
// ------------------------------------------------------------
// 【重要】subNoun ⊆ attrAff が成り立ち、その逆が成り立たない組にすること。
//         逆も成り立つ題材を入れると、誤答（逆）まで正しくなって正解が2つになる。
// 文字列は連結して選択肢を作るので、名詞句・述語の区別を崩さないこと。
//   attrAff/attrNegPred は連体形（+ member で名詞句になる）
//   subAff/subNegPred は述語（「〜は」の後ろに置く）
var TF_PERSONS = ["田中さん", "佐藤さん", "鈴木さん", "高橋さん",
                  "伊藤さん", "渡辺さん", "山本さん", "中村さん"];

var TF_SCENES = [
  {
    group: "ある会社の社員", member: "社員",
    subNoun: "営業部の社員", notSubNoun: "営業部でない社員",
    subAff: "営業部の社員である", subNegPred: "営業部の社員ではない",
    attrAff: "運転免許を持っている", attrNegPred: "運転免許を持っていない"
  },
  {
    group: "あるクラスの生徒", member: "生徒",
    subNoun: "サッカー部の生徒", notSubNoun: "サッカー部でない生徒",
    subAff: "サッカー部の生徒である", subNegPred: "サッカー部の生徒ではない",
    attrAff: "体力テストでA判定を取った", attrNegPred: "体力テストでA判定を取っていない"
  },
  {
    group: "ある大学の学生", member: "学生",
    subNoun: "経済学部の学生", notSubNoun: "経済学部でない学生",
    subAff: "経済学部の学生である", subNegPred: "経済学部の学生ではない",
    attrAff: "統計学を履修している", attrNegPred: "統計学を履修していない"
  },
  {
    group: "ある町の住民", member: "住民",
    subNoun: "自治会に加入している住民", notSubNoun: "自治会に加入していない住民",
    subAff: "自治会に加入している", subNegPred: "自治会に加入していない",
    attrAff: "回覧板を受け取っている", attrNegPred: "回覧板を受け取っていない"
  },
  {
    group: "ある図書館の利用者", member: "利用者",
    subNoun: "貸出カードを持つ利用者", notSubNoun: "貸出カードを持たない利用者",
    subAff: "貸出カードを持っている", subNegPred: "貸出カードを持っていない",
    attrAff: "利用者登録を済ませている", attrNegPred: "利用者登録を済ませていない"
  },
  {
    group: "ある会社の新入社員", member: "新入社員",
    subNoun: "技術職の新入社員", notSubNoun: "技術職でない新入社員",
    subAff: "技術職の新入社員である", subNegPred: "技術職の新入社員ではない",
    attrAff: "研修を修了している", attrNegPred: "研修を修了していない"
  },
  {
    group: "あるサークルの部員", member: "部員",
    subNoun: "1年生の部員", notSubNoun: "1年生でない部員",
    subAff: "1年生である", subNegPred: "1年生ではない",
    attrAff: "合宿に参加した", attrNegPred: "合宿に参加していない"
  },
  {
    group: "ある病院の職員", member: "職員",
    subNoun: "看護師の資格を持つ職員", notSubNoun: "看護師の資格を持たない職員",
    subAff: "看護師の資格を持っている", subNegPred: "看護師の資格を持っていない",
    attrAff: "夜勤に入ったことがある", attrNegPred: "夜勤に入ったことがない"
  }
];

// ------------------------------------------------------------
// 円卓の席順（suiron_position_01）の素材
// ------------------------------------------------------------
var CIRCLE_NAME_SETS = [
  ["A", "B", "C", "D", "E", "F"],
  ["P", "Q", "R", "S", "T", "U"],
  ["甲", "乙", "丙", "丁", "戊", "己"],
  ["赤木", "青木", "黒田", "白石", "緑川", "紫原"],
  ["佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺"]
];

var CIRCLE_SCENES = [
  { scene: "円形のテーブルに等間隔で座っている" },
  { scene: "丸いテーブルを囲んで等間隔に着席している" },
  { scene: "円卓に等間隔で座っている" },
  { scene: "円形に並べた6つの椅子に1人ずつ座っている" }
];

// ------------------------------------------------------------
// 数列の規則性（suiron_code_01）の言い回し
// ------------------------------------------------------------
var SEQ_INTROS = [
  "ある規則にしたがって数が並んでいる。",
  "次の数の並びは、ある規則にしたがっている。",
  "ある法則で数字が並んでいる。",
  "以下の数列は、一定の規則で作られている。"
];
var SEQ_ASKS = [
  "?に入る数はどれか。",
  "?に当てはまる数はどれか。",
  "?の位置に入る数として正しいものはどれか。"
];

// カテゴリ1: 推論（論理・命題）
// ============================================================
(function() {
  // 推論問題はパターンプール方式
  // 順序推論
  QUESTION_TEMPLATES.push({
    id: "suiron_order_01",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 1,
    templateText: "{{names}} の{{n}}人が{{scene}}。以下のことがわかっている。\n{{conds}}\n\n{{question}}",
    variables: {
      nameSet: { type: "choice", options: [0, 1, 2, 3, 4] },
      n:       { type: "choice", options: [4, 4, 5] },
      attr:    { type: "int", min: 0, max: 1, step: 1 },
      askPos:  { type: "int", min: 0, max: 4, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolveOrderPuzzle(v, ORDER_ATTRS.line); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._names.indexOf(v._answerName); },
    buildChoices: function(v) {
      return { choices: v._names.slice(), correctIndex: v._names.indexOf(v._answerName) };
    },
    unit: "",
    explanationTemplate: "条件を順につなぐと、並びは次のように1通りに決まります。\n\n{{orderText}}\n\nしたがって答えは {{answerName}} です。\n\n【ポイント】\n・相対的な条件は不等号でつないで1本にまとめる\n・つながった時点で全体の順序が確定する\n・条件を満たす並びが複数ある場合、その問いには答えられない",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "suiron_order_02",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 2,
    templateText: "{{names}} の{{n}}人が{{scene}}。以下のことがわかっている。\n{{conds}}\n\n{{question}}",
    variables: {
      nameSet: { type: "choice", options: [0, 1, 2, 3, 4] },
      n:       { type: "choice", options: [4, 5, 5] },
      attr:    { type: "int", min: 0, max: 2, step: 1 },
      askPos:  { type: "int", min: 0, max: 4, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolveOrderPuzzle(v, ORDER_ATTRS.score); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._names.indexOf(v._answerName); },
    buildChoices: function(v) {
      return { choices: v._names.slice(), correctIndex: v._names.indexOf(v._answerName) };
    },
    unit: "",
    explanationTemplate: "条件を順につなぐと、並びは次のように1通りに決まります。\n\n{{orderText}}\n\nしたがって答えは {{answerName}} です。\n\n【ポイント】\n・相対的な条件は不等号でつないで1本にまとめる\n・つながった時点で全体の順序が確定する\n・条件を満たす並びが複数ある場合、その問いには答えられない",
    timeLimitSec: 120
  });

  // 推論: 対応問題
  QUESTION_TEMPLATES.push({
    id: "suiron_match_01",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 2,
    templateText: "{{names}} の{{n}}人が、それぞれ異なる{{noun}}を1つずつ{{verb}}。\n以下のことがわかっている。\n{{conds}}\n\n{{who}}が{{verb2}}のはどれか。",
    variables: {
      nameSet: { type: "choice", options: [0, 1, 2, 3, 4] },
      n:       { type: "choice", options: [3, 3, 4] },
      theme:   { type: "int", min: 0, max: 4, step: 1 },
      askWho:  { type: "int", min: 0, max: 3, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolveMatchPuzzle(v); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._items.indexOf(v._answerItem); },
    buildChoices: function(v) {
      return { choices: v._items.slice(), correctIndex: v._items.indexOf(v._answerItem) };
    },
    unit: "",
    explanationTemplate: "表を作り、否定条件に×を入れていきます。\n各行・各列に○がちょうど1つ入るので、×が埋まった行は残りが自動的に○になります。\n\n確定する組み合わせ:\n{{assignText}}\n\nしたがって答えは {{answerItem}} です。\n\n【ポイント】\n・頭で保持せず必ず表に落とす\n・「AもBも選んでいない」は2つ分の×",
    timeLimitSec: 120
  });

  // 推論: 命題
  QUESTION_TEMPLATES.push({
    id: "suiron_prop_01",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 1,
    templateText: "「{{premise}}」が正しいとき、必ず正しいと言えるものはどれか。",
    variables: {
      pair: { type: "int", min: 0, max: 7, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolvePropPuzzle(v); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._correctIndex; },
    buildChoices: function(v) {
      return { choices: v._choices.slice(), correctIndex: v._correctIndex };
    },
    unit: "",
    explanationTemplate: "「A ならば B」から必ず言えるのは**対偶**「B でない ならば A でない」だけです。\n\n前提: {{p}} → {{q}}\n対偶: {{nq}} → {{np}}\n\n【必ずしも成り立たないもの】\n・逆「B ならば A」… {{q}}からといって{{p}}とは限らない\n・裏「A でない ならば B でない」… 逆と同じ内容なので同様\n\nしたがって答えは対偶「{{contra}}」です。",
    timeLimitSec: 90
  });

  // 推論: 真偽判定
  // 全称命題「S は全員 A」＋個別事実「p は A」から確実に言えるのは対偶だけ。
  // 逆・裏・個別への当てはめはいずれも言えないので、そこから誤答を作る。
  QUESTION_TEMPLATES.push({
    id: "suiron_tf_01",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 2,
    templateText: "{{group}}について、以下のことがわかっている。\n・{{subNoun}}は全員、{{attrAff}}\n・{{person}}は{{attrAff}}\n\n次のうち、確実に正しいと言えるものはどれか。",
    variables: {
      scene:  { type: "int", min: 0, max: 7, step: 1 },
      person: { type: "int", min: 0, max: 7, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolveTfPuzzle(v); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._correctIndex; },
    buildChoices: function(v) {
      return { choices: v._choices.slice(), correctIndex: v._correctIndex };
    },
    unit: "",
    explanationTemplate: "与えられているのは「{{subNoun}} ならば {{attrAff}}」という一方向の関係だけです。\n\nここから確実に言えるのは対偶だけです。\n対偶: 「{{attrNegPred}} ならば {{subNegPred}}」\nしたがって答えは「{{correctText}}」です。\n\n{{person}}が{{attrAff}}ことは分かっていますが、\n{{subNoun}}以外にも{{attrAff}}者はいるかもしれないので、\n{{person}}が{{subNoun}}かどうかは判断できません。\n\n【ポイント】\n・「AならばB」から確実に言えるのは対偶「BでないならばAでない」だけ\n・逆「BならばA」と裏「AでないならばBでない」は必ずしも成り立たない\n・「全員〜である」は片方向。反対向きに読み替えた瞬間に誤り",
    timeLimitSec: 120
  });

  // 推論: 条件からの絞り込み（WEBテスティング特有）
  // 「1つに決まらないが、候補の個数は決まる」タイプ。
  // 選択肢は常に 1つ〜4つ なので、target を変数にして正解の位置を一様にしている。
  QUESTION_TEMPLATES.push({
    id: "suiron_cond_01",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 3,
    templateText: "{{setup}}\n以下のことがわかっている。\n{{conds}}\n\n{{question}}",
    variables: {
      scene:   { type: "int", min: 0, max: 3, step: 1 },
      nameSet: { type: "int", min: 0, max: 3, step: 1 },
      target:  { type: "choice", options: [1, 2, 3, 4] }
    },
    answerType: "choice",
    resolve: function(v) { resolveCondPuzzle(v); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._count; },
    buildChoices: function(v) {
      return { choices: ["1通り", "2通り", "3通り", "4通り"], correctIndex: v._count - 1 };
    },
    unit: "",
    explanationTemplate: "条件をすべて満たす組み合わせを書き出すと、次の{{solCount}}通りです。\n\n{{solText}}\n\nこのうち{{askLabel}}は {{valueList}} のいずれかなので、考えられるものは{{count}}通りです。\n\n【ポイント】\n・「〜である」と言い切っている条件から先に埋める\n・大小関係だけでは並びが確定しないことがある\n・全体の並びが決まらなくても、問われている値の候補は数え上げられる",
    timeLimitSec: 150
  });

  // 推論: 発言の真偽
  QUESTION_TEMPLATES.push({
    id: "suiron_statement_01",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 3,
    templateText: "{{names}} の{{n}}人のうち、1人だけが嘘をついている。\n{{stmts}}\n\n嘘をついているのは誰か。",
    variables: {
      nameSet: { type: "choice", options: [0, 1, 2, 3, 4] },
      n:       { type: "choice", options: [3, 3, 4] }
    },
    answerType: "choice",
    resolve: function(v) { resolveLiarPuzzle(v); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._names.indexOf(v._liar); },
    buildChoices: function(v) {
      return { choices: v._names.slice(), correctIndex: v._names.indexOf(v._liar) };
    },
    unit: "",
    explanationTemplate: "「誰が嘘つきか」を1人ずつ仮定して、全員の発言と矛盾しないかを調べます。\n\n嘘つきが {{liar}} だと仮定すると、すべての発言が整合します。\n他の人を嘘つきと仮定すると、必ずどこかで矛盾が生じます。\n\n【ポイント】\n・正直者の発言は真、嘘つきの発言は偽\n・「Xは嘘つきだ」という発言は、Xが実際に嘘つきなら真\n・整合する仮定がちょうど1つになるまで全パターンを試す",
    timeLimitSec: 150
  });

  // 推論: 位置関係（円卓）
  // 一意性は「座り方」ではなく「向かいが誰か」に課している。
  // 理由は _base.js の buildCirclePuzzle の説明を参照（鏡像が必ず解になるため、
  // 座り方の一意性を要求すると1問も作れない）。
  QUESTION_TEMPLATES.push({
    id: "suiron_position_01",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 3,
    templateText: "{{names}} の{{n}}人が{{scene}}。\n以下のことがわかっている。\n{{conds}}\n\n{{who}}の向かいに座っているのは誰か。",
    variables: {
      nameSet: { type: "int", min: 0, max: 4, step: 1 },
      scene:   { type: "int", min: 0, max: 3, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolveCirclePuzzle(v); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._names.indexOf(v._answerName); },
    buildChoices: function(v) {
      // 選択肢は本人以外から4人。正解を必ず含める。
      var others = v._names.filter(function (nm) { return nm !== v._whoName; });
      var pool = others.filter(function (nm) { return nm !== v._answerName; });
      shuffleArray(pool);
      var picks = [v._answerName].concat(pool.slice(0, 3));
      shuffleArray(picks);
      return { choices: picks, correctIndex: picks.indexOf(v._answerName) };
    },
    unit: "",
    explanationTemplate: "円卓は回転させても同じ並びなので、まず{{anchor}}の位置を固定して考えます。\n{{n}}人の円卓では「向かい合う」= {{half}}つ離れた席です。\n\n条件をすべて満たす座り方は、次の{{solCount}}通りです。\n{{solText}}\n\nどの場合でも{{who}}の向かいは{{answerName}}です。\n\n【ポイント】\n・円卓は誰か1人を固定してから考える（回転した並びを別と数えない）\n・「隣り合う」「向かい合う」は左右を入れ替えても成り立つので、\n  座り方そのものは1通りに決まらないことが多い\n・それでも「向かいは誰か」は左右を入れ替えても変わらないので答えは定まる",
    timeLimitSec: 150
  });

  // 推論: 順序推論（追加パターン）
  QUESTION_TEMPLATES.push({
    id: "suiron_order_03",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 2,
    templateText: "{{names}} の{{n}}人が{{scene}}。以下のことがわかっている。\n{{conds}}\n\n{{question}}",
    variables: {
      nameSet: { type: "choice", options: [0, 1, 2, 3, 4] },
      n:       { type: "choice", options: [4, 5, 5] },
      attr:    { type: "int", min: 0, max: 2, step: 1 },
      askPos:  { type: "int", min: 0, max: 4, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolveOrderPuzzle(v, ORDER_ATTRS.race); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._names.indexOf(v._answerName); },
    buildChoices: function(v) {
      return { choices: v._names.slice(), correctIndex: v._names.indexOf(v._answerName) };
    },
    unit: "",
    explanationTemplate: "条件を順につなぐと、並びは次のように1通りに決まります。\n\n{{orderText}}\n\nしたがって答えは {{answerName}} です。\n\n【ポイント】\n・相対的な条件は不等号でつないで1本にまとめる\n・つながった時点で全体の順序が確定する\n・条件を満たす並びが複数ある場合、その問いには答えられない",
    timeLimitSec: 120
  });

  // 推論: 対応問題（追加パターン）
  QUESTION_TEMPLATES.push({
    id: "suiron_match_02",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 2,
    templateText: "{{names}} の{{n}}人が、それぞれ異なる{{noun}}を1つずつ{{verb}}。\n以下のことがわかっている。\n{{conds}}\n\n{{who}}が{{verb2}}のはどれか。",
    variables: {
      nameSet: { type: "choice", options: [0, 1, 2, 3, 4] },
      n:       { type: "choice", options: [3, 3, 4] },
      theme:   { type: "int", min: 0, max: 4, step: 1 },
      askWho:  { type: "int", min: 0, max: 3, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolveMatchPuzzle(v); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._items.indexOf(v._answerItem); },
    buildChoices: function(v) {
      return { choices: v._items.slice(), correctIndex: v._items.indexOf(v._answerItem) };
    },
    unit: "",
    explanationTemplate: "表を作り、否定条件に×を入れていきます。\n各行・各列に○がちょうど1つ入るので、×が埋まった行は残りが自動的に○になります。\n\n確定する組み合わせ:\n{{assignText}}\n\nしたがって答えは {{answerItem}} です。\n\n【ポイント】\n・頭で保持せず必ず表に落とす\n・「AもBも選んでいない」は2つ分の×",
    timeLimitSec: 150
  });

  // 推論: 命題（追加パターン）
  QUESTION_TEMPLATES.push({
    id: "suiron_prop_02",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 2,
    templateText: "「{{premise}}」が正しいとき、必ず正しいと言えるものはどれか。",
    variables: {
      pair: { type: "int", min: 0, max: 7, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolvePropPuzzle(v); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._correctIndex; },
    buildChoices: function(v) {
      return { choices: v._choices.slice(), correctIndex: v._correctIndex };
    },
    unit: "",
    explanationTemplate: "「A ならば B」から必ず言えるのは**対偶**「B でない ならば A でない」だけです。\n\n前提: {{p}} → {{q}}\n対偶: {{nq}} → {{np}}\n\n【必ずしも成り立たないもの】\n・逆「B ならば A」… {{q}}からといって{{p}}とは限らない\n・裏「A でない ならば B でない」… 逆と同じ内容なので同様\n\nしたがって答えは対偶「{{contra}}」です。",
    timeLimitSec: 120
  });

  // 推論: 数列の規則性
  // 「答えが2通りに読める数列」が最大の事故要因なので、示した6項に当てはまる
  // 規則の族を総当たりし、予測がちょうど1つのときだけ採用する（resolveSequencePuzzle）。
  QUESTION_TEMPLATES.push({
    id: "suiron_code_01",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 3,
    templateText: "{{intro}}\n\n{{seq}}, ?\n\n{{ask}}",
    variables: {
      kind:    { type: "choice", options: [0, 1, 2, 3, 4] },
      intro_i: { type: "int", min: 0, max: 3, step: 1 },
      ask_i:   { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolveSequencePuzzle(v); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._answer; },
    distractors: function(v) { return v._wrongs.slice(); },
    unit: "",
    explanationTemplate: "{{explainBody}}\n\n【ポイント】\n・まず隣り合う数の差を取る\n・差が一定なら等差、差そのものが等差なら二段構えの規則\n・差ではなく比が一定なら等比\n・前の2つの数の和になっていないかも確かめる",
    timeLimitSec: 120
  });

  // 推論: 方角・距離
  QUESTION_TEMPLATES.push({
    id: "suiron_direction_01",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 1,
    // 純粋な数値問題なので、固定パターンではなく他分野と同じ変数型にする。
    // 直角三角形の辺はピタゴラス数から選ぶ。答えが必ず整数になるので、
    // テストセンター（電卓不可）でも計算量が過大にならない。
    templateText: "{{person}}は自宅から{{dir1}}へ{{a}}m歩き、次に{{dir2}}へ{{b}}m歩いた。自宅からの直線距離は何mか。",
    variables: {
      person: { type: "choice", options: ["太郎", "花子", "Aさん", "Bさん", "健太", "美咲"] },
      pair:   { type: "choice", options: [0, 1, 2, 3, 4, 5, 6, 7] },
      triple: { type: "choice", options: [0, 1, 2, 3, 4] },
      scale:  { type: "choice", options: [10, 20, 50, 100] }
    },
    answerType: "choice",
    unit: "m",
    answerFormula: function(v) {
      // v.a, v.b は resolveCustomVariables が確定させている
      return Math.sqrt(v.a * v.a + v.b * v.b);
    },
    distractors: function(v, ans) {
      // 「足しただけ」「引いただけ」が最も多い誤り。斜辺より必ず大きい/小さいので
      // 大小の両側がそろう。
      return [v.a + v.b, Math.abs(v.b - v.a), v.a, v.b, ans * 2, Math.round(ans / 2)];
    },
    explanationTemplate: "{{dir1}}へ{{a}}m、{{dir2}}へ{{b}}m進むと、進んだ2辺が直角をなします。\n\n三平方の定理:\n距離 = √({{a}}² + {{b}}²) = √({{sqA}} + {{sqB}}) = √{{sqC}} = {{answer}}m\n\n【ポイント】\n・2辺を足すのは誤り（{{a}} + {{b}} = {{wrongSum}}m にはならない）\n・直角三角形の3辺は 3:4:5 や 5:12:13 の比になることが多い",
    timeLimitSec: 90
  });
})();

// カテゴリ2: 場合の数・確率
// ============================================================
// この分野は答えが約分された分数なので、数値を振っても同じ分数に落ちやすく、
// 見た目の種類が増えにくい。変数の幅を広げるだけでは足りないので、
// ①場面（容器と中身）を差し替える ②問われ方（合計/差、奇数/偶数/3の倍数、
// 隣り合う人数）を増やす、の2つで種類を作っている。
//
// 分母は 200 以下でないとエンジンが問題を捨てる（generateTemplateQuestion）。
// 上限を広げるときは C(総数, 2) が 200 を超えないかを必ず確かめること。
// ============================================================

// 2色の玉を取り出す場面。色名は「赤玉」「赤いボール」のように
// 語形が変わるので、機械的に連結せず完成した名詞で持つ。
var BALL2_SCENES = [
  { box: "袋",   thing: "玉",       a: "赤玉",         b: "白玉" },
  { box: "箱",   thing: "ボール",   a: "赤いボール",   b: "青いボール" },
  { box: "かご", thing: "ボール",   a: "黄色いボール", b: "緑のボール" },
  { box: "缶",   thing: "ビー玉",   a: "青いビー玉",   b: "白いビー玉" }
];

// 3色の玉
var BALL3_SCENES = [
  { box: "袋",   thing: "玉",     a: "赤玉",       b: "白玉",       c: "青玉" },
  { box: "箱",   thing: "ボール", a: "赤いボール", b: "白いボール", c: "青いボール" },
  { box: "かご", thing: "ビー玉", a: "緑のビー玉", b: "黄色いビー玉", c: "紫のビー玉" }
];

// サイコロの振り方（問われ方は DICE_CASES 側で持つ）
var DICE_SCENES = [
  "2個のサイコロを同時に投げるとき、",
  "大小2つのサイコロを同時に投げるとき、",
  "1個のサイコロを2回続けて投げるとき、"
];

// サイコロで問える条件。全36通りを数え上げて作る。
// 「合計がちょうど」だけだと5種類しか作れなかったので、以上・以下・差を足した。
var DICE_CASES = (function () {
  var out = [];
  var add = function (kind, target, phrase) {
    var pairs = [];
    for (var i = 1; i <= 6; i++) {
      for (var j = 1; j <= 6; j++) {
        var hit = kind === 0 ? (i + j === target)
                : kind === 1 ? (i + j >= target)
                : kind === 2 ? (i + j <= target)
                :              (Math.abs(i - j) === target);
        if (hit) pairs.push("(" + i + ", " + j + ")");
      }
    }
    // 全部当たり・全部はずれの条件は問題にならない
    if (pairs.length === 0 || pairs.length === 36) return;
    out.push({ kind: kind, target: target, phrase: phrase, pairs: pairs });
  };
  for (var t = 3; t <= 11; t++) add(0, t, "出た目の合計が" + t + "になる");
  for (var u = 8; u <= 11; u++) add(1, u, "出た目の合計が" + u + "以上になる");
  for (var w = 4; w <= 6; w++)  add(2, w, "出た目の合計が" + w + "以下になる");
  for (var d = 0; d <= 5; d++)  add(3, d, "出た目の差が" + d + "になる");
  return out;
})();

// コイン投げの場面
var COIN_SCENES = [
  { text: function (n, k) { return "コインを" + n + "回投げるとき、表がちょうど" + k + "回出る確率を求めよ。"; } },
  { text: function (n, k) { return "1枚の硬貨を" + n + "回続けて投げるとき、表がちょうど" + k + "回出る確率を求めよ。"; } },
  { text: function (n, k) { return "コインを" + n + "回投げるとき、裏がちょうど" + k + "回出る確率を求めよ。"; } }
];

// カードから2枚引く場面。cond は「どんなカードか」の呼び名と判定。
var CARD_CONDS = [
  { name: "奇数",     test: function (x) { return x % 2 === 1; },  how: "1, 3, 5, ... と数える" },
  { name: "偶数",     test: function (x) { return x % 2 === 0; },  how: "2, 4, 6, ... と数える" },
  { name: "3の倍数",  test: function (x) { return x % 3 === 0; },  how: "3, 6, 9, ... と数える" }
];
var CARD_SCENES = [
  function (n, cond) {
    return "1から" + n + "までの数字が書かれたカードが1枚ずつある。この中から同時に2枚引くとき、2枚とも"
      + cond + "である確率を求めよ。";
  },
  function (n, cond) {
    return "1から" + n + "までの番号がついた札が1枚ずつ箱に入っている。同時に2枚取り出すとき、2枚とも"
      + cond + "である確率を求めよ。";
  }
];

// くじ引きの場面
var LOTTERY_SCENES = [
  function (t, w) { return t + "本のくじの中に当たりが" + w + "本入っている。このくじを2本引くとき、少なくとも1本当たる確率を求めよ。"; },
  function (t, w) { return t + "枚の抽選券のうち" + w + "枚が当選券である。2枚を同時に引くとき、少なくとも1枚が当選券である確率を求めよ。"; },
  function (t, w) { return "福引の箱に" + t + "個の玉があり、そのうち" + w + "個が当たり玉である。2個を同時に取り出すとき、少なくとも1個が当たり玉である確率を求めよ。"; }
];

// 「特定のいくつかが隣り合う」確率の場面
var ARRANGE_SCENES = [
  { items: "文字", pick: "特定の{k}文字", text: function (n, k, list) { return list + " の" + n + "文字を無作為に一列に並べるとき、特定の" + k + "文字が隣り合う確率を求めよ。"; } },
  { items: "人",   pick: "特定の{k}人",   text: function (n, k, list) { return n + "人が無作為に一列に並ぶとき、特定の" + k + "人が隣り合う確率を求めよ。"; } },
  { items: "本",   pick: "特定の{k}冊",   text: function (n, k, list) { return n + "冊の本を無作為に本棚に並べるとき、特定の" + k + "冊が隣り合う確率を求めよ。"; } },
  { items: "箱",   pick: "特定の{k}個",   text: function (n, k, list) { return n + "個の箱を無作為に一列に置くとき、特定の" + k + "個が隣り合う確率を求めよ。"; } }
];

// 条件付き確率（戻さずに2回取り出す）の場面
var COND_SCENES_P = [
  { box: "袋", a: "赤玉",       b: "白玉",       thing: "玉" },
  { box: "箱", a: "赤いボール", b: "青いボール", thing: "ボール" },
  { box: "かご", a: "白い碁石", b: "黒い碁石",   thing: "碁石" }
];

(function() {
  // 玉の取り出し
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_ball_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      red:   { type: "int", min: 3, max: 8, step: 1 },
      white: { type: "int", min: 2, max: 7, step: 1 },
      scene: { type: "int", min: 0, max: 3, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var sc = BALL2_SCENES[v.scene % BALL2_SCENES.length];
      v.box = sc.box; v.thing = sc.thing; v.itemA = sc.a; v.itemB = sc.b;
      v.q = sc.box + "の中に" + sc.a + "が" + v.red + "個、" + sc.b + "が" + v.white
        + "個入っている。この" + sc.box + "から同時に2個の" + sc.thing + "を取り出すとき、2個とも"
        + sc.a + "である確率を求めよ。";
    },
    answerFormula: function(v) {
      var total = v.red + v.white;
      var num = v.red * (v.red - 1) / 2;
      var den = total * (total - 1) / 2;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「同時に取り出す」問題は組み合わせ(C)を使います。\n確率 = 該当する場合の数 / 全体の場合の数\n\n【解法】\n全体の{{thing}}の数: {{red}} + {{white}} = {{total}}個\n\n① 全体から2個選ぶ場合の数（分母）:\n  C({{total}}, 2) = {{total}} × {{totalM1}} / 2 = {{den}}通り\n\n② {{itemA}}2個を選ぶ場合の数（分子）:\n  C({{red}}, 2) = {{red}} × {{redM1}} / 2 = {{num}}通り\n\n③ 確率 = ②÷① = {{num}} / {{den}} = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・C(n, r) = n! / (r! × (n-r)!) は「n個からr個選ぶ組み合わせ」\n・「同時に取り出す」= 順序を考えない = 組み合わせ",
    timeLimitSec: 120
  });

  // サイコロ
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_dice_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      idx:   { type: "int", min: 0, max: 40, step: 1 },
      scene: { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var c = DICE_CASES[v.idx % DICE_CASES.length];
      v._count = c.pairs.length;
      v.count = c.pairs.length;
      v.phrase = c.phrase;
      v.q = DICE_SCENES[v.scene % DICE_SCENES.length] + c.phrase + "確率を求めよ。";
      // 該当する組が多いときに全部並べると解説が読めなくなる
      v.combinations = c.pairs.length <= 8
        ? c.pairs.join(", ")
        : c.pairs.slice(0, 8).join(", ") + " …（全" + c.pairs.length + "通り）";
    },
    answerFormula: function(v) {
      var g = gcd(v._count, 36);
      return { numerator: v._count / g, denominator: 36 / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nサイコロ2個の問題は「全パターンを数えて条件に合うものを探す」が基本。\n全パターンは 6×6 = 36通り（順序を区別する）。\n\n【解法】\n① 全パターン: 6 × 6 = 36通り\n\n② {{phrase}}組み合わせを列挙:\n{{combinations}}\n→ 該当: {{count}}通り\n\n③ 確率 = {{count}} / 36 = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・2つのサイコロは区別して考える（(1,2)と(2,1)は別パターン）\n・合計7が最も出やすい（6通り）、合計2と12が最も出にくい（各1通り）\n・「以上」「以下」は境界を含む。数え落としに注意",
    timeLimitSec: 90
  });

  // コイン
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_coin_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 3, max: 8, step: 1 },
      kSeed: { type: "int", min: 0, max: 6, step: 1 },
      scene: { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      // k は n に依存する（1 〜 n-1）。generator.js 側の custom 分岐ではなく
      // ここで決める。resolve があると custom 分岐は呼ばれない。
      v.k = 1 + (v.kSeed % (v.n - 1));
      var sc = COIN_SCENES[v.scene % COIN_SCENES.length];
      v.q = sc.text(v.n, v.k);
      // 「裏がちょうどk回」も C(n,k)/2^n で同じ形になる
      v.face = v.scene % COIN_SCENES.length === 2 ? "裏" : "表";
    },
    answerFormula: function(v) {
      var num = combination(v.n, v.k);
      var den = Math.pow(2, v.n);
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nコインの問題は「反復試行の確率」。\n全パターン = 2^(回数)、該当パターン = C(回数, {{face}}の回数)。\n\n【解法】\n① 全パターン: 2^{{n}} = {{den}}通り\n  （各回で表or裏の2通り × {{n}}回）\n\n② {{n}}回中{{k}}回だけ{{face}}が出る場合の数:\n  「{{n}}回のうちどの{{k}}回が{{face}}か」を選ぶ → C({{n}}, {{k}}) = {{num}}通り\n\n③ 確率 = {{num}} / {{den}} = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・反復試行: 各回が独立で同じ確率の試行を繰り返す場合\n・C(n,k) × p^k × (1-p)^(n-k) の公式（コインはp=1/2なので分母が2^n）\n・表と裏は対称なので、どちらを数えても同じ形になる",
    timeLimitSec: 120
  });

  // カードの問題
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_card_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 5, max: 16, step: 1 },
      cond:  { type: "int", min: 0, max: 2, step: 1 },
      scene: { type: "int", min: 0, max: 1, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var cd = CARD_CONDS[v.cond % CARD_CONDS.length];
      var hit = 0;
      for (var i = 1; i <= v.n; i++) if (cd.test(i)) hit++;
      v._hit = hit;
      v.condName = cd.name;
      v.how = cd.how;
      v.hitCount = hit;
      v.den = v.n * (v.n - 1) / 2;
      v.num = hit * (hit - 1) / 2;
      v.q = CARD_SCENES[v.scene % CARD_SCENES.length](v.n, cd.name);
    },
    validate: function(v) {
      // 該当が2枚未満だと確率0、全部該当だと確率1で問題にならない
      return v._hit >= 2 && v._hit <= v.n - 1;
    },
    answerFormula: function(v) {
      var num = v._hit * (v._hit - 1) / 2;
      var den = v.n * (v.n - 1) / 2;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nまず条件に合うもの（{{condName}}）の個数を数え、そこから2枚選ぶ組み合わせを求めます。\n\n【解法】\n① 1から{{n}}までの{{condName}}の個数: {{hitCount}}個\n  （{{how}}）\n\n② 全体から2枚選ぶ場合の数（分母）:\n  C({{n}}, 2) = {{den}}通り\n\n③ {{condName}}から2枚選ぶ場合の数（分子）:\n  C({{hitCount}}, 2) = {{num}}通り\n\n④ 確率 = {{num}} / {{den}} = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・「2枚とも○○」の確率 = C(○○の個数, 2) / C(全体, 2)\n・まず該当する個数を正確に数えるのが最優先",
    timeLimitSec: 120
  });

  // 当たりくじ
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_lottery_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      total: { type: "int", min: 6, max: 20, step: 1 },
      win:   { type: "int", min: 2, max: 5, step: 1 },
      scene: { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      v.q = LOTTERY_SCENES[v.scene % LOTTERY_SCENES.length](v.total, v.win);
    },
    validate: function(v) {
      // はずれが2本以上ないと「全部はずれ」が作れず、余事象で解く意味がなくなる
      return v.total - v.win >= 2;
    },
    answerFormula: function(v) {
      var lose = v.total - v.win;
      var allPairs = v.total * (v.total - 1) / 2;
      var losePairs = lose * (lose - 1) / 2;
      var num = allPairs - losePairs;
      var g = gcd(num, allPairs);
      return { numerator: num / g, denominator: allPairs / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「少なくとも1つ」の問題は余事象（=逆の場合）を使うのが定石。\n少なくとも1本当たる確率 = 1 - 全部はずれる確率\n\n【解法】\n① はずれの本数: {{total}} - {{win}} = {{lose}}本\n\n② 全体から2本選ぶ場合の数:\n  C({{total}}, 2) = {{allPairs}}通り\n\n③ はずれ2本を選ぶ場合の数:\n  C({{lose}}, 2) = {{losePairs}}通り\n\n④ 全部はずれる確率 = {{losePairs}} / {{allPairs}}\n\n⑤ 少なくとも1本当たる確率\n  = 1 - {{losePairs}}/{{allPairs}} = {{ansNum}}/{{ansDen}}\n\n【ポイント】\n・「少なくとも1つ」→ 余事象を使う（直接数えると場合分けが複雑になる）\n・余事象: P(A) = 1 - P(Aの逆) は確率の超重要テクニック",
    timeLimitSec: 120
  });

  // 色違いの玉（3色）
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_ball3_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      red:   { type: "int", min: 2, max: 6, step: 1 },
      white: { type: "int", min: 2, max: 6, step: 1 },
      blue:  { type: "int", min: 2, max: 5, step: 1 },
      scene: { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var sc = BALL3_SCENES[v.scene % BALL3_SCENES.length];
      v.thing = sc.thing; v.itemA = sc.a; v.itemB = sc.b; v.itemC = sc.c;
      v.q = sc.box + "の中に" + sc.a + v.red + "個、" + sc.b + v.white + "個、" + sc.c + v.blue
        + "個が入っている。この中から2個を同時に取り出すとき、異なる色の" + sc.thing + "が出る確率を求めよ。";
    },
    answerFormula: function(v) {
      var total = v.red + v.white + v.blue;
      var allPairs = total * (total - 1) / 2;
      var samePairs = v.red*(v.red-1)/2 + v.white*(v.white-1)/2 + v.blue*(v.blue-1)/2;
      var diffPairs = allPairs - samePairs;
      var g = gcd(diffPairs, allPairs);
      return { numerator: diffPairs / g, denominator: allPairs / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「異なる色」を直接数えると場合分けが多いので、\n余事象「同じ色」を使います。異なる色 = 全体 - 同じ色\n\n【解法】\n① 全体: {{red}}+{{white}}+{{blue}} = {{total}}個\n  全ペア数: C({{total}},2) = {{allPairs}}通り\n\n② 同色ペアを数える:\n  C({{red}},2) + C({{white}},2) + C({{blue}},2)\n  = {{samePairs}}通り\n\n③ 異なる色のペア:\n  {{allPairs}} - {{samePairs}} = {{diffPairs}}通り\n\n④ 確率 = {{diffPairs}}/{{allPairs}} = {{ansNum}}/{{ansDen}}\n\n【ポイント】\n・3色以上ある場合は余事象（同色）から求める方が楽\n・同色の場合の数 = 各色のC(個数, 2)の合計",
    timeLimitSec: 120
  });

  // 並べ替え確率
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_arrange_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 3,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 4, max: 10, step: 1 },
      k:     { type: "int", min: 2, max: 3, step: 1 },
      scene: { type: "int", min: 0, max: 3, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var alpha = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
      var list = alpha.slice(0, v.n).join(", ");
      v.letters = list;
      var sc = ARRANGE_SCENES[v.scene % ARRANGE_SCENES.length];
      v.q = sc.text(v.n, v.k, list);
      // 解説で使う値。k を可変にしたので generator.js 側の固定式では合わない
      v.allPerm = factorial(v.n);
      v.blocks = v.n - v.k + 1;
      v.blockPerm = factorial(v.n - v.k + 1);
      v.innerPerm = factorial(v.k);
      v.adjacent = factorial(v.n - v.k + 1) * factorial(v.k);
    },
    validate: function(v) {
      return v.k <= v.n - 1;
    },
    answerFormula: function(v) {
      // k個をまとめて1ブロック: (n-k+1)! × k! 通り / 全体 n! 通り
      var num = factorial(v.n - v.k + 1) * factorial(v.k);
      var den = factorial(v.n);
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「隣り合う確率」は、隣り合うものをまとめて1ブロックと見なすテクニックを使います。\n\n【解法】\n① 全体の並べ方: {{n}}! = {{allPerm}}通り\n\n② 特定の{{k}}つが隣り合う場合:\n  {{k}}つをひとまとめ（1ブロック）にする\n  → ブロック + 残り = {{blocks}}組の並び: {{blocks}}! = {{blockPerm}}通り\n  → ブロック内の並び順: {{k}}! = {{innerPerm}}通り\n  → 隣り合う場合: {{blockPerm}} × {{innerPerm}} = {{adjacent}}通り\n\n③ 確率 = {{adjacent}}/{{allPerm}} = {{ansNum}}/{{ansDen}}\n\n【ポイント】\n・「隣り合う」→ まとめて1つとして数え、内部の並びをかける\n・「隣り合わない」→ 1 - 隣り合う確率 で求めるのが楽\n・ブロック内の並び順を掛け忘れるのが最も多い間違い",
    timeLimitSec: 120
  });

  // 条件付き確率
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_cond_01",
    formats: ["webtesting"],
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      red:   { type: "int", min: 3, max: 8, step: 1 },
      white: { type: "int", min: 2, max: 7, step: 1 },
      scene: { type: "int", min: 0, max: 2, step: 1 }
    },
    answerType: "fraction",
    resolve: function(v) {
      var sc = COND_SCENES_P[v.scene % COND_SCENES_P.length];
      v.itemA = sc.a; v.itemB = sc.b; v.thing = sc.thing;
      v.q = sc.box + "に" + sc.a + "が" + v.red + "個と" + sc.b + "が" + v.white
        + "個入っている。1個取り出して色を確認し、戻さずにもう1個取り出す。1個目が"
        + sc.a + "だったとき、2個目も" + sc.a + "である確率を求めよ。";
    },
    answerFormula: function(v) {
      var num = v.red - 1;
      var den = v.red + v.white - 1;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「戻さずに取り出す」= 条件付き確率。1個目の結果で残りの状態が変わります。\n1個目が{{itemA}}と「わかっている」ので、その後の状態で考えます。\n\n【解法】\n① 1個目に{{itemA}}を取り出した後の残り:\n  {{itemA}}: {{red}}-1 = {{redM1}}個、{{itemB}}: {{white}}個 → 合計{{denTotal}}個\n\n② 2個目が{{itemA}}である確率 = {{redM1}} / {{denTotal}} = {{ansNum}}/{{ansDen}}\n\n【ポイント】\n・条件付き確率: P(B|A) = 「Aが起きた後にBが起きる確率」\n・「戻さない」→ 毎回残りの状態が変わる → 全体の数も1個減る",
    timeLimitSec: 90
  });
})();

// カテゴリ3: 集合（ベン図）
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "shugo_2set_01",
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 1,
    templateText: "{{total}}人のクラスで、英語が好きな人が{{a}}人、数学が好きな人が{{b}}人、両方好きな人が{{ab}}人いる。英語も数学も好きではない人は何人か。",
    variables: {
      total: { type: "int", min: 30, max: 50, step: 5 },
      a: { type: "int", min: 15, max: 30, step: 1 },
      b: { type: "int", min: 12, max: 25, step: 1 },
      ab: { type: "int", min: 3, max: 10, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total - (v.a + v.b - v.ab);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n2つの集合の問題は「ベン図」を描いてイメージするのが基本。\n重複（両方好き）を引かないと二重カウントしてしまう点に注意。\n\n【解法】\n① ベン図の公式: A∪B = A + B - A∩B\n\n② 英語または数学が好きな人（和集合）:\n  {{a}} + {{b}} - {{ab}} = {{union}}人\n  ※ 両方好きな{{ab}}人を引かないと重複カウントしてしまう\n\n③ どちらも好きではない人:\n  全体 - 和集合 = {{total}} - {{union}} = {{answer}}人\n\n【ポイント】\n・A∪B = A + B - A∩B は集合問題の最重要公式\n・ベン図の外側 = 全体 - ベン図の内側",
    timeLimitSec: 90,
    validate: function(v) {
      var union = v.a + v.b - v.ab;
      return v.a <= v.total && v.b <= v.total && v.ab <= Math.min(v.a, v.b) && union <= v.total && (v.total - union) >= 0;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shugo_2set_02",
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 2,
    templateText: "{{total}}人にアンケートを取ったところ、商品Aを買ったことがある人が{{a}}人、商品Bを買ったことがある人が{{b}}人、どちらも買ったことがない人が{{neither}}人だった。両方買ったことがある人は何人か。",
    variables: {
      total: { type: "int", min: 50, max: 100, step: 10 },
      a: { type: "int", min: 20, max: 60, step: 5 },
      b: { type: "int", min: 15, max: 50, step: 5 },
      neither: { type: "int", min: 5, max: 20, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.a + v.b - (v.total - v.neither);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「どちらも買っていない」人数から「どちらか買った（和集合）」を求め、\nそこからベン図の公式を変形して重複（両方買った）を逆算します。\n\n【解法】\n① どちらか一方以上を買った人（和集合）:\n  {{total}} - {{neither}} = {{union}}人\n\n② ベン図の公式: A∪B = A + B - A∩B を変形すると:\n  A∩B = A + B - A∪B\n\n③ 両方買った人:\n  {{a}} + {{b}} - {{union}} = {{answer}}人\n\n【ポイント】\n・和集合の公式は A∩B = の形に変形できる（逆算問題で頻出）\n・「どちらもない」が与えられたら、まず和集合を求める",
    timeLimitSec: 90,
    validate: function(v) {
      var union = v.total - v.neither;
      var both = v.a + v.b - union;
      return both > 0 && both <= Math.min(v.a, v.b);
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shugo_3set_01",
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 3,
    templateText: "{{total}}人のクラスで、国語が好きな人が{{a}}人、数学が好きな人が{{b}}人、英語が好きな人が{{c}}人いる。国語と数学の両方が好きな人が{{ab}}人、数学と英語の両方が好きな人が{{bc}}人、国語と英語の両方が好きな人が{{ac}}人、3教科すべてが好きな人が{{abc}}人いる。3教科のどれも好きではない人は何人か。",
    variables: {
      total: { type: "int", min: 40, max: 60, step: 5 },
      a: { type: "int", min: 15, max: 30, step: 1 },
      b: { type: "int", min: 12, max: 25, step: 1 },
      c: { type: "int", min: 10, max: 20, step: 1 },
      ab: { type: "int", min: 3, max: 8, step: 1 },
      bc: { type: "int", min: 2, max: 6, step: 1 },
      ac: { type: "int", min: 2, max: 6, step: 1 },
      abc: { type: "int", min: 1, max: 3, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total - (v.a + v.b + v.c - v.ab - v.bc - v.ac + v.abc);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n3つの集合の問題では「包除原理（ほうじょげんり）」を使います。\n2つずつの重複を引き、3つ全部の重複は引きすぎたので足し戻します。\n\n【解法】\n① 3集合のベン図の公式（包除原理）:\n  A∪B∪C = A + B + C - A∩B - B∩C - A∩C + A∩B∩C\n\n② 代入:\n  = {{a}} + {{b}} + {{c}} - {{ab}} - {{bc}} - {{ac}} + {{abc}}\n  = {{union}}人\n\n③ どれも好きではない人:\n  {{total}} - {{union}} = {{answer}}人\n\n【ポイント】\n・3集合の公式は「足す→2重複を引く→3重複を戻す」の手順\n・3重複を足し戻す理由: 2重複を引く段階で3回引いてしまうため、1回分戻す",
    timeLimitSec: 120,
    validate: function(v) {
      var union = v.a + v.b + v.c - v.ab - v.bc - v.ac + v.abc;
      return v.abc <= Math.min(v.ab, v.bc, v.ac) &&
             v.ab <= Math.min(v.a, v.b) &&
             v.bc <= Math.min(v.b, v.c) &&
             v.ac <= Math.min(v.a, v.c) &&
             union <= v.total && union > 0 && (v.total - union) >= 0;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shugo_2set_03",
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 1,
    templateText: "ある会社の社員{{total}}人のうち、電車通勤の人が{{a}}人、バス通勤の人が{{b}}人いる。電車とバスの両方を使う人が最も多い場合、その人数は何人か。",
    variables: {
      total: { type: "int", min: 40, max: 80, step: 10 },
      a: { type: "int", min: 20, max: 45, step: 5 },
      b: { type: "int", min: 15, max: 40, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.min(v.a, v.b);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「両方の最大」は、小さい方の集合が大きい方に完全に含まれる場合。\n全員が重複するのが最大のケースです。\n\n【解法】\n① 電車通勤: {{a}}人、バス通勤: {{b}}人\n\n② 両方使う人の最大値 = min({{a}}, {{b}}) = {{answer}}人\n\n③ 理由: 少ない方の全員が多い方にも含まれる場合が最大\n  （バス通勤者全員が電車通勤者でもある、というケース）\n\n【ポイント】\n・最大 = min(A, B)…小さい方を超えることはできない\n・最小 = max(0, A+B-全体)…鳩の巣原理で最低限の重複",
    timeLimitSec: 90,
    validate: function(v) {
      return v.a <= v.total && v.b <= v.total && v.a + v.b > v.total;
    }
  });

  // 集合: 最小値
  QUESTION_TEMPLATES.push({
    id: "shugo_min_01",
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 2,
    templateText: "{{total}}人の社員のうち、英語ができる人が{{a}}人、中国語ができる人が{{b}}人いる。英語と中国語の両方ができる人は少なくとも何人いるか。",
    variables: {
      total: { type: "int", min: 40, max: 60, step: 5 },
      a: { type: "int", min: 15, max: 35, step: 5 },
      b: { type: "int", min: 15, max: 35, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.max(0, v.a + v.b - v.total);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「少なくとも何人」= 重複の最小値。AとBの合計が全体を超える分は、\nどうしても重複せざるを得ません（鳩の巣原理）。\n\n【解法】\n① A∩Bの最小値の公式:\n  max(0, A + B - 全体)\n\n② 代入:\n  max(0, {{a}} + {{b}} - {{total}}) = {{answer}}人\n\n③ 理由: {{a}}+{{b}} = {{a}}+{{b}} ですが、全体は{{total}}人しかいない\n  → {{a}}+{{b}}-{{total}}人分は必ずどちらにも属する\n\n【ポイント】\n・鳩の巣原理: n個の箱にn+1個入れると、必ずどこかに2つ入る\n・「少なくとも」→ 最小値の公式 max(0, A+B-全体)\n・「最大」→ min(A, B) とセットで覚える",
    timeLimitSec: 90,
    validate: function(v) {
      return v.a <= v.total && v.b <= v.total && v.a + v.b > v.total;
    }
  });

  // 集合: 割合から人数
  QUESTION_TEMPLATES.push({
    id: "shugo_percent_01",
    formats: ["webtesting"],
    category: "集合",
    categoryId: 3,
    difficulty: 2,
    templateText: "{{total}}人にアンケートを取ったところ、スポーツが好きな人は全体の{{pctA}}%、音楽が好きな人は全体の{{pctB}}%、両方好きな人は全体の{{pctAB}}%だった。どちらも好きではない人は何人か。",
    variables: {
      total: { type: "int", min: 100, max: 500, step: 50 },
      pctA: { type: "int", min: 30, max: 70, step: 5 },
      pctB: { type: "int", min: 25, max: 60, step: 5 },
      pctAB: { type: "int", min: 5, max: 20, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var unionPct = v.pctA + v.pctB - v.pctAB;
      return v.total * (100 - unionPct) / 100;
    },
    unit: "人",
    explanationTemplate: "【考え方】\n割合(%)で与えられた集合問題。まず%のまま和集合の公式で計算し、\n最後に人数に変換します。\n\n【解法】\n① どちらか好きな人の割合（和集合）:\n  {{pctA}} + {{pctB}} - {{pctAB}} = {{unionPct}}%\n\n② どちらも好きではない割合:\n  100 - {{unionPct}} = {{neitherPct}}%\n\n③ 人数に変換:\n  {{total}} × {{neitherPct}}/100 = {{answer}}人\n\n【ポイント】\n・割合(%やm分率)の問題でもベン図の公式はそのまま使える\n・先に%で計算してから最後に人数に変換するとスムーズ",
    timeLimitSec: 90,
    validate: function(v) {
      var unionPct = v.pctA + v.pctB - v.pctAB;
      return v.pctAB <= Math.min(v.pctA, v.pctB) && unionPct <= 100 && unionPct > 0 &&
             Number.isInteger(v.total * (100 - unionPct) / 100);
    }
  });
})();

// カテゴリ4: 損益算
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "soneki_basic_01",
    formats: ["webtesting"],
    category: "損益算",
    categoryId: 4,
    difficulty: 1,
    templateText: "ある商品を原価{{cost}}円で仕入れ、原価の{{markupRate}}%の利益を見込んで定価をつけた。この商品の定価はいくらか。",
    variables: {
      cost: { type: "int", min: 500, max: 5000, step: 100 },
      markupRate: { type: "choice", options: [10, 20, 25, 30, 40, 50] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.cost * (1 + v.markupRate / 100);
    },
    unit: "円",
    explanationTemplate: "【考え方】\n損益算の基本公式: 定価 = 原価 × (1 + 利益率)\n利益率は「原価の何%」なので、原価に掛けます。\n\n【解法】\n① 定価 = 原価 × (1 + 利益率/100)\n     = {{cost}} × (1 + {{markupRate}}/100)\n     = {{cost}} × {{multiplier}}\n     = {{answer}}円\n\n【ポイント】\n・「原価の○%の利益」= 原価 × (1 + ○/100)\n・定価・原価・利益の関係: 定価 = 原価 + 利益",
    timeLimitSec: 60
  });

  QUESTION_TEMPLATES.push({
    id: "soneki_discount_01",
    formats: ["webtesting"],
    category: "損益算",
    categoryId: 4,
    difficulty: 2,
    templateText: "ある商品を原価{{cost}}円で仕入れ、原価の{{markupRate}}%の利益を見込んで定価をつけた。しかし売れなかったので、定価の{{discountRate}}%引きで販売した。このとき、利益はいくらか。",
    variables: {
      cost: { type: "int", min: 1000, max: 5000, step: 500 },
      markupRate: { type: "choice", options: [20, 25, 30, 40, 50] },
      discountRate: { type: "choice", options: [10, 15, 20, 25] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var listPrice = v.cost * (1 + v.markupRate / 100);
      var salePrice = listPrice * (1 - v.discountRate / 100);
      return Math.round(salePrice - v.cost);
    },
    unit: "円",
    explanationTemplate: "【考え方】\n「定価で売れず値引き」は損益算の定番。順番に①定価→②売価→③利益を求めます。\n利益がマイナスなら赤字（損失）です。\n\n【解法】\n① 定価を求める:\n  定価 = {{cost}} × (1 + {{markupRate}}/100) = {{listPrice}}円\n\n② 売価を求める（定価から割引）:\n  売価 = {{listPrice}} × (1 - {{discountRate}}/100) = {{salePrice}}円\n\n③ 利益 = 売価 - 原価:\n  {{salePrice}} - {{cost}} = {{answer}}円\n\n【ポイント】\n・割引は「定価」に対する率、利益率は「原価」に対する率（基準が違う！）\n・利益 = 売価 - 原価（売価は値引き後の実際の販売価格）",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "soneki_loss_01",
    formats: ["webtesting"],
    category: "損益算",
    categoryId: 4,
    difficulty: 2,
    templateText: "ある商品に原価の{{markupRate}}%の利益を見込んで{{listPrice}}円の定価をつけた。この商品の原価はいくらか。",
    variables: {
      markupRate: { type: "choice", options: [10, 20, 25, 30, 40, 50] },
      listPrice: { type: "custom" }  // markupRateに合わせて計算
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.listPrice / (1 + v.markupRate / 100));
    },
    unit: "円",
    explanationTemplate: "【考え方】\n定価から原価を逆算する問題。「定価 = 原価 × 倍率」の式を変形して原価を求めます。\n\n【解法】\n① 定価と原価の関係:\n  定価 = 原価 × (1 + {{markupRate}}/100)\n\n② 原価を求める（両辺を倍率で割る）:\n  原価 = 定価 / (1 + {{markupRate}}/100)\n       = {{listPrice}} / {{multiplier}}\n       = {{answer}}円\n\n【ポイント】\n・逆算の基本: 掛け算の逆は割り算\n・「○%増し」の倍率は (1+○/100)。例: 20%増し → 1.2倍",
    timeLimitSec: 90
  });

  QUESTION_TEMPLATES.push({
    id: "soneki_multiple_01",
    formats: ["webtesting"],
    category: "損益算",
    categoryId: 4,
    difficulty: 3,
    templateText: "ある商品を{{quantity}}個仕入れ、1個あたりの原価は{{cost}}円だった。そのうち{{sold1}}個を定価（原価の{{markupRate}}%増し）で売り、残りは定価の{{discountRate}}%引きで売った。全体の利益はいくらか。",
    variables: {
      quantity: { type: "choice", options: [10, 20, 50, 100] },
      cost: { type: "int", min: 200, max: 2000, step: 100 },
      sold1: { type: "custom" },
      markupRate: { type: "choice", options: [20, 25, 30, 40, 50] },
      discountRate: { type: "choice", options: [10, 20, 25] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var listPrice = Math.round(v.cost * (1 + v.markupRate / 100));
      var discountPrice = Math.round(listPrice * (1 - v.discountRate / 100));
      var sold2 = v.quantity - v.sold1;
      var revenue = listPrice * v.sold1 + discountPrice * sold2;
      var totalCost = v.cost * v.quantity;
      return revenue - totalCost;
    },
    unit: "円",
    explanationTemplate: "【考え方】\n複数個の商品で一部を定価、残りを割引で売る問題。\n全体の利益 = 総売上 - 総仕入れ原価 で求めます。\n\n【解法】\n① 単価を計算:\n  定価 = {{cost}} × (1 + {{markupRate}}/100) = {{listPrice}}円\n  割引価格 = {{listPrice}} × (1 - {{discountRate}}/100) = {{discountPrice}}円\n\n② 総売上を計算:\n  定価販売: {{listPrice}} × {{sold1}}個\n  割引販売: {{discountPrice}} × {{sold2}}個\n  売上合計 = {{revenue}}円\n\n③ 総仕入れ原価:\n  {{cost}} × {{quantity}} = {{totalCost}}円\n\n④ 全体の利益 = {{revenue}} - {{totalCost}} = {{answer}}円\n\n【ポイント】\n・複数パターンの販売は、それぞれの売上を合計してから原価を引く\n・残り個数 = 仕入れ数 - 定価で売れた数 を忘れずに",
    timeLimitSec: 150
  });

  // 損益算: 売価から原価逆算
  QUESTION_TEMPLATES.push({
    id: "soneki_reverse_01",
    formats: ["webtesting"],
    category: "損益算",
    categoryId: 4,
    difficulty: 2,
    templateText: "ある商品を{{salePrice}}円で売ったところ、原価の{{profitRate}}%の利益があった。この商品の原価はいくらか。",
    variables: {
      profitRate: { type: "choice", options: [10, 15, 20, 25, 30] },
      salePrice: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.salePrice / (1 + v.profitRate / 100));
    },
    unit: "円",
    explanationTemplate: "【考え方】\n売価と利益率から原価を逆算する問題。\n売価 = 原価 × (1+利益率) の関係式を変形します。\n\n【解法】\n① 売価と原価の関係:\n  売価 = 原価 × (1 + {{profitRate}}/100)\n\n② 原価を逆算:\n  原価 = 売価 / (1 + {{profitRate}}/100)\n       = {{salePrice}} / {{multiplier}}\n       = {{answer}}円\n\n【ポイント】\n・「○%の利益」= 売価が原価の(1+○/100)倍\n・検算: {{answer}} × {{multiplier}} = {{salePrice}} になればOK",
    timeLimitSec: 90
  });

  // 損益算: 割引後の利益率
  QUESTION_TEMPLATES.push({
    id: "soneki_profitrate_01",
    formats: ["webtesting"],
    category: "損益算",
    categoryId: 4,
    difficulty: 3,
    templateText: "原価{{cost}}円の商品に{{markupRate}}%の利益を見込んで定価をつけ、定価の{{discountRate}}%引きで売った。原価に対する利益率は何%か。",
    variables: {
      cost: { type: "int", min: 1000, max: 5000, step: 500 },
      markupRate: { type: "choice", options: [20, 25, 30, 40, 50] },
      discountRate: { type: "choice", options: [10, 15, 20] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var listPrice = Math.round(v.cost * (1 + v.markupRate / 100));
      var salePrice = Math.round(listPrice * (1 - v.discountRate / 100));
      var profit = salePrice - v.cost;
      return Math.round(profit / v.cost * 100);
    },
    unit: "%",
    explanationTemplate: "【考え方】\n値引き後の「原価に対する利益率」を求める問題。\n定価→売価→利益の順に求め、最後に利益率を計算します。\n\n【解法】\n① 定価 = {{cost}} × (1+{{markupRate}}/100) = {{listPrice}}円\n② 売価 = {{listPrice}} × (1-{{discountRate}}/100) = {{salePrice}}円\n③ 利益 = 売価 - 原価 = {{salePrice}} - {{cost}} = {{profit}}円\n④ 利益率 = 利益/原価 × 100 = {{profit}}/{{cost}} × 100 = {{answer}}%\n\n【ポイント】\n・利益率の基準は「原価」（定価ではない！）\n・値上げ率{{markupRate}}%で値引き{{discountRate}}%しても、利益率≠({{markupRate}}-{{discountRate}})%",
    timeLimitSec: 120,
    validate: function(v) {
      var listPrice = Math.round(v.cost * (1 + v.markupRate / 100));
      var salePrice = Math.round(listPrice * (1 - v.discountRate / 100));
      var profit = salePrice - v.cost;
      var rate = profit / v.cost * 100;
      return Math.abs(rate - Math.round(rate)) < 0.01;
    }
  });

  // 損益算: 2つの商品比較
  QUESTION_TEMPLATES.push({
    id: "soneki_compare_01",
    formats: ["webtesting"],
    category: "損益算",
    categoryId: 4,
    difficulty: 3,
    templateText: "商品Aは原価{{costA}}円、定価は原価の{{markupA}}%増しで、定価の{{discountA}}%引きで売った。商品Bは原価{{costB}}円、定価は原価の{{markupB}}%増しで、定価の{{discountB}}%引きで売った。2つの商品の利益の差額はいくらか。",
    variables: {
      costA: { type: "int", min: 1000, max: 3000, step: 500 },
      markupA: { type: "choice", options: [20, 30, 40] },
      discountA: { type: "choice", options: [10, 15, 20] },
      costB: { type: "int", min: 1000, max: 3000, step: 500 },
      markupB: { type: "choice", options: [20, 30, 40] },
      discountB: { type: "choice", options: [10, 15, 20] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var profitA = v.costA * (1 + v.markupA/100) * (1 - v.discountA/100) - v.costA;
      var profitB = v.costB * (1 + v.markupB/100) * (1 - v.discountB/100) - v.costB;
      return Math.abs(Math.round(profitA) - Math.round(profitB));
    },
    unit: "円",
    explanationTemplate: "【考え方】\n2つの商品をそれぞれ独立に「定価→売価→利益」で計算し、比較します。\n\n【解法】\n＜商品A＞\n  定価 = {{costA}} × {{mA}} = {{listA}}円\n  売価 = {{listA}} × {{dA}} = {{saleA}}円\n  利益 = {{saleA}} - {{costA}} = {{profitA}}円\n\n＜商品B＞\n  定価 = {{costB}} × {{mB}} = {{listB}}円\n  売価 = {{listB}} × {{dB}} = {{saleB}}円\n  利益 = {{saleB}} - {{costB}} = {{profitB}}円\n\n差額 = |{{profitA}} - {{profitB}}| = {{answer}}円\n\n【ポイント】\n・比較問題は各商品を同じ手順で計算してから差を求める\n・原価、値上げ率、割引率すべてが異なるので慎重に",
    timeLimitSec: 150,
    validate: function(v) {
      var profitA = v.costA * (1+v.markupA/100) * (1-v.discountA/100) - v.costA;
      var profitB = v.costB * (1+v.markupB/100) * (1-v.discountB/100) - v.costB;
      return Math.round(profitA) !== Math.round(profitB);
    }
  });
})();

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
    explanationTemplate: "【考え方】\n途中で作業者が交代する問題。\nまずAが進めた分を計算し、残りをBが仕上げる日数を求めます。\n\n【解法】\n① 仕事全体を1とする\n\n② Aが{{daysAlone}}日間で進めた仕事量:\n  1日の仕事量: 1/{{daysA}}\n  {{daysAlone}}日分: {{daysAlone}}/{{daysA}} = {{aDone}}\n\n③ 残りの仕事量:\n  1 - {{aDone}} = {{remaining}}\n\n④ Bが残りを仕上げる日数:\n  Bの1日の仕事量: 1/{{daysB}}\n  日数 = ({{remaining}}) ÷ (1/{{daysB}}) = ({{remaining}}) × {{daysB}} = {{answer}}日\n\n【ポイント】\n・「途中交代」→ まず先の人の進捗を計算 → 残りを後の人で\n・残り = 1 - (先の人の日数/全体日数)",
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
    explanationTemplate: "【考え方】\n{{b}}の作業速度が未知の逆算問題。\n{{a}}の単独作業→2人の共同作業の情報から{{b}}の速度を求めます。\n\n【解法】\n① 全体を1とする\n\n② {{a}}が{{daysAlone}}日間で進めた量:\n  {{daysAlone}}/{{daysA}} = {{aDone}}\n\n③ 残りの量:\n  1 - {{aDone}} = {{remaining}}\n\n④ 2人で{{daysTogether}}日かけて残りを完了:\n  (1/{{daysA}} + 1/B) × {{daysTogether}} = {{remaining}}\n\n⑤ {{b}}の1日の仕事量を求める:\n  1/B = {{remaining}}/{{daysTogether}} - 1/{{daysA}}\n\n⑥ {{b}}だけでかかる日数:\n  B = {{answer}}日\n\n【ポイント】\n・「途中から合流」→ 残りの量を方程式で立てる\n・1/B = (残り÷日数) - 1/A → B = その逆数",
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

// カテゴリ7: 濃度算
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "noudo_basic_01",
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
    timeLimitSec: 60
  });

  QUESTION_TEMPLATES.push({
    id: "noudo_mix_01",
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
    timeLimitSec: 90,
    validate: function(v) {
      return v.evap < v.weight;
    }
  });

  // 濃度算: 水を追加
  QUESTION_TEMPLATES.push({
    id: "noudo_addwater_01",
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
    timeLimitSec: 90
  });

  // 濃度算: 目標濃度にするための混合量
  QUESTION_TEMPLATES.push({
    id: "noudo_target_01",
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

// カテゴリ8: 割合・比
// ============================================================

// 連続増減の向き。増→減 だけでなく 減→増・増→増・減→減 も出す。
// s は倍率の符号（+1 なら 1+r/100、-1 なら 1-r/100）。
var CONSEC_DIRECTIONS = [
  { s1:  1, s2: -1 },
  { s1: -1, s2:  1 },
  { s1:  1, s2:  1 },
  { s1: -1, s2: -1 }
];

// 何が増減するか。word() は向きに応じた動詞を返す。
// 「値上がり／値下がり」は価格にしか使えないので、対象ごとに語を分けている。
var CONSEC_SCENES = [
  { subject: "ある商品の価格", noun: "価格",   word: function (s) { return s > 0 ? "値上がり" : "値下がり"; } },
  { subject: "ある町の人口",   noun: "人口",   word: function (s) { return s > 0 ? "増加" : "減少"; } },
  { subject: "ある店の売上",   noun: "売上",   word: function (s) { return s > 0 ? "増加" : "減少"; } },
  { subject: "ある会の会員数", noun: "会員数", word: function (s) { return s > 0 ? "増加" : "減少"; } }
];

(function() {
  QUESTION_TEMPLATES.push({
    id: "wariai_basic_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 1,
    templateText: "ある学校の生徒数は{{total}}人で、そのうち{{percent}}%が女子である。女子の人数は何人か。",
    variables: {
      total: { type: "int", min: 100, max: 800, step: 50 },
      percent: { type: "choice", options: [20, 25, 30, 35, 40, 45, 50, 55, 60] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total * v.percent / 100;
    },
    unit: "人",
    explanationTemplate: "【考え方】\n割合の基本: 全体 × 割合(%) / 100 = 該当する部分の量\n\n【解法】\n① 女子の人数 = 全体 × 割合:\n  {{total}} × {{percent}}/100 = {{answer}}人\n\n【ポイント】\n・割合の3公式: 量=全体×割合、割合=量/全体、全体=量/割合\n・%は÷100、割(わり)は÷10で計算",
    timeLimitSec: 60,
    validate: function(v) {
      return Number.isInteger(v.total * v.percent / 100);
    }
  });

  QUESTION_TEMPLATES.push({
    id: "wariai_change_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 2,
    templateText: "ある商品の価格が{{original}}円から{{changed}}円に変わった。値上がり率は何%か。（小数点以下を四捨五入して答えよ）",
    variables: {
      original: { type: "int", min: 500, max: 5000, step: 100 },
      changed: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round((v.changed - v.original) / v.original * 100);
    },
    unit: "%",
    explanationTemplate: "【考え方】\n変化率(増加率) = 変化量 / もとの量 × 100\n基準は必ず「もとの量（変化前）」です。\n\n【解法】\n① 変化量（値上がり額）:\n  {{changed}} - {{original}} = {{diff}}円\n\n② 値上がり率:\n  {{diff}} / {{original}} × 100 = {{answer}}%\n\n【ポイント】\n・変化率の基準は「変化前の値」（変化後ではない！）\n・値下がりの場合: (元-後)/元 × 100 で求める\n・「○円が△円に」→ 基準は○円",
    timeLimitSec: 90
  });

  QUESTION_TEMPLATES.push({
    id: "wariai_ratio_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 2,
    templateText: "AとBの比が{{ratioA}}:{{ratioB}}で、合計が{{total}}のとき、Aはいくらか。",
    variables: {
      ratioA: { type: "int", min: 1, max: 7, step: 1 },
      ratioB: { type: "int", min: 1, max: 7, step: 1 },
      total: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total * v.ratioA / (v.ratioA + v.ratioB);
    },
    unit: "",
    explanationTemplate: "【考え方】\n比で分ける問題は「比の合計」で割って「各部分の比」をかけます。\n\n【解法】\n① 比の合計:\n  A:B = {{ratioA}}:{{ratioB}}\n  合計 = {{ratioA}} + {{ratioB}} = {{ratioSum}}\n\n② Aの値:\n  A = {{total}} × {{ratioA}} / {{ratioSum}} = {{answer}}\n\n【ポイント】\n・比で分ける = 全体 × (自分の比 / 比の合計)\n・A:B = 2:3 なら Aは全体の 2/5\n・比の各要素は「全体に対する割合」と考えてもよい",
    timeLimitSec: 90,
    validate: function(v) {
      return v.ratioA !== v.ratioB && Number.isInteger(v.total * v.ratioA / (v.ratioA + v.ratioB));
    }
  });

  QUESTION_TEMPLATES.push({
    id: "wariai_increase_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 1,
    templateText: "ある工場の先月の生産量は{{original}}個だった。今月は先月より{{percent}}%増加した。今月の生産量は何個か。",
    variables: {
      original: { type: "int", min: 200, max: 2000, step: 100 },
      percent: { type: "choice", options: [5, 10, 15, 20, 25, 30] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.original * (1 + v.percent / 100);
    },
    unit: "個",
    explanationTemplate: "【考え方】\n「○%増加」= もとの値 × (1 + ○/100)。\n(1 + 増加率)が倍率になります。\n\n【解法】\n① 倍率を計算:\n  1 + {{percent}}/100 = {{multiplier}}\n\n② 今月の生産量:\n  {{original}} × {{multiplier}} = {{answer}}個\n\n【ポイント】\n・○%増加 → ×(1+○/100)、○%減少 → ×(1-○/100)\n・20%増 = 1.2倍、30%減 = 0.7倍\n・「○%の」と「○%増」は違う（30%の=×0.3、30%増=×1.3）",
    timeLimitSec: 60,
    validate: function(v) {
      return Number.isInteger(v.original * (1 + v.percent / 100));
    }
  });

  // 割合: 連続増減
  QUESTION_TEMPLATES.push({
    id: "wariai_consecutive_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 3,
    templateText: "{{q}}",
    variables: {
      percent1: { type: "choice", options: [5, 10, 15, 20, 25, 30, 40, 50, 60] },
      percent2: { type: "choice", options: [5, 10, 15, 20, 25, 30, 40, 50, 60] },
      dir:      { type: "int", min: 0, max: 3, step: 1 },
      scene:    { type: "int", min: 0, max: 3, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      var d = CONSEC_DIRECTIONS[v.dir % CONSEC_DIRECTIONS.length];
      var sc = CONSEC_SCENES[v.scene % CONSEC_SCENES.length];
      v._s1 = d.s1; v._s2 = d.s2;
      v.subject = sc.subject;
      v.noun = sc.noun;
      v.word1 = sc.word(d.s1);
      v.word2 = sc.word(d.s2);
      v.sign1 = d.s1 > 0 ? "+" : "-";
      v.sign2 = d.s2 > 0 ? "+" : "-";
      v.after1 = Math.round((1 + d.s1 * v.percent1 / 100) * 100 * 100) / 100;
      v.q = sc.subject + "が最初に" + v.percent1 + "%" + sc.word(d.s1) + "し、その後" + v.percent2
        + "%" + sc.word(d.s2) + "した。最終的な" + sc.noun + "は元の" + sc.noun + "の何%か。";
    },
    answerFormula: function(v) {
      return Math.round((1 + v._s1 * v.percent1/100) * (1 + v._s2 * v.percent2/100) * 100);
    },
    unit: "%",
    explanationTemplate: "【考え方】\n連続増減の問題。増減率を「倍率」に変換して順にかけます。\n同じ率で上がって下がっても元に戻らないことに注意！\n\n【解法】\n① 元の{{noun}}を100とする\n\n② {{percent1}}%{{word1}}した後:\n  100 × (1 {{sign1}} {{percent1}}/100) = {{after1}}\n\n③ さらに{{percent2}}%{{word2}}した後:\n  {{after1}} × (1 {{sign2}} {{percent2}}/100) = {{answer}}%\n\n【ポイント】\n・連続変化 = 倍率のかけ算。足し引きではない\n・20%増 → 20%減 = 100 × 1.2 × 0.8 = 96（元に戻らない!）\n・「同率の増減は必ず元より小さくなる」のがSPI定番のひっかけ",
    timeLimitSec: 90,
    validate: function(v) {
      var result = (1 + v._s1 * v.percent1/100) * (1 + v._s2 * v.percent2/100) * 100;
      // 100%ちょうどに戻る組は「元に戻らない」という論点が消えるので出さない
      return Math.abs(result - Math.round(result)) < 0.01 && Math.round(result) !== 100;
    }
  });

  // 割合: 3つの比
  QUESTION_TEMPLATES.push({
    id: "wariai_ratio3_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 2,
    templateText: "A, B, C の3人でお金を分ける。A:B = {{ab1}}:{{ab2}}、B:C = {{bc1}}:{{bc2}} のとき、合計{{total}}円をこの比で分けると、Bの取り分はいくらか。",
    variables: {
      ab1: { type: "int", min: 1, max: 5, step: 1 },
      ab2: { type: "int", min: 1, max: 5, step: 1 },
      bc1: { type: "int", min: 1, max: 5, step: 1 },
      bc2: { type: "int", min: 1, max: 5, step: 1 },
      total: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      // A:B = ab1:ab2, B:C = bc1:bc2
      // Bを揃える: A:B:C = ab1*bc1 : ab2*bc1 : ab2*bc2
      var a = v.ab1 * v.bc1;
      var b = v.ab2 * v.bc1;
      var c = v.ab2 * v.bc2;
      return Math.round(v.total * b / (a + b + c));
    },
    unit: "円",
    explanationTemplate: "【考え方】\n2つの比を「連比」にまとめる問題。\n共通の項（ここではB）の値を揃えます。\n\n【解法】\n① 2つの比を確認:\n  A:B = {{ab1}}:{{ab2}}\n  B:C = {{bc1}}:{{bc2}}\n\n② Bの値を揃える（最小公倍数に）:\n  A:B:C = {{a}}:{{b}}:{{c}}\n\n③ Bの取り分:\n  {{total}} × {{b}} / ({{a}}+{{b}}+{{c}}) = {{answer}}円\n\n【ポイント】\n・連比のコツ: 共通の文字（B）を最小公倍数に揃える\n・A:B=2:3、B:C=3:4 → B=3で揃う → A:B:C=2:3:4\n・A:B=2:3、B:C=2:5 → B=6に揃える → A:B:C=4:6:15",
    timeLimitSec: 120,
    validate: function(v) {
      var a = v.ab1 * v.bc1;
      var b = v.ab2 * v.bc1;
      var c = v.ab2 * v.bc2;
      return Number.isInteger(v.total * b / (a + b + c));
    }
  });

  // 割合: 人口増減
  QUESTION_TEMPLATES.push({
    id: "wariai_population_01",
    formats: ["webtesting"],
    category: "割合・比",
    categoryId: 8,
    difficulty: 3,
    templateText: "ある市の人口は去年{{population}}人だった。今年は男性が{{maleChange}}%増加し、女性が{{femaleChange}}%減少した。去年の男女比が{{maleRatio}}:{{femaleRatio}}のとき、今年の人口は何人か。",
    variables: {
      population: { type: "int", min: 10000, max: 50000, step: 5000 },
      maleChange: { type: "choice", options: [5, 8, 10] },
      femaleChange: { type: "choice", options: [3, 5, 8] },
      maleRatio: { type: "int", min: 1, max: 3, step: 1 },
      femaleRatio: { type: "int", min: 1, max: 3, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var totalRatio = v.maleRatio + v.femaleRatio;
      var male = v.population * v.maleRatio / totalRatio;
      var female = v.population - male;
      var newMale = Math.round(male * (1 + v.maleChange/100));
      var newFemale = Math.round(female * (1 - v.femaleChange/100));
      return newMale + newFemale;
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「比で分けてから増減率をかける」複合問題。\n①比から人数を求める → ②各群に増減率を適用 → ③合計\n\n【解法】\n① 去年の男女の人数（比で分ける）:\n  男性: {{population}} × {{maleRatio}}/{{totalRatio}} = {{male}}人\n  女性: {{population}} × {{femaleRatio}}/{{totalRatio}} = {{female}}人\n\n② 今年の人数（増減率を適用）:\n  男性: {{male}} × (1+{{maleChange}}/100) = {{newMale}}人\n  女性: {{female}} × (1-{{femaleChange}}/100) = {{newFemale}}人\n\n③ 今年の人口:\n  {{newMale}} + {{newFemale}} = {{answer}}人\n\n【ポイント】\n・比 → 実数に変換してから増減を計算する\n・男女で増減率が違う → 全体の増減率は単純平均にならない\n・人口問題はSPIで頻出（比+割合の複合問題）",
    timeLimitSec: 150,
    validate: function(v) {
      var totalRatio = v.maleRatio + v.femaleRatio;
      var male = v.population * v.maleRatio / totalRatio;
      var female = v.population - male;
      return Number.isInteger(male) && Number.isInteger(male * (1 + v.maleChange/100)) && Number.isInteger(female * (1 - v.femaleChange/100));
    }
  });
})();

// カテゴリ9: 図表の読み取り・資料解釈
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "table_sales_01",
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "table",
    tableGenerator: function() {
      var departments = ["営業部", "開発部", "総務部", "企画部"];
      var quarters = ["第1四半期", "第2四半期", "第3四半期", "第4四半期"];
      var data = {};
      departments.forEach(function(dept) {
        data[dept] = {};
        quarters.forEach(function(q) {
          data[dept][q] = (Math.floor(Math.random() * 40) + 10) * 10;
        });
      });
      return { rows: departments, cols: quarters, data: data, unit: "万円" };
    },
    questionGenerator: function(tableData) {
      var dept = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var total = 0;
      tableData.cols.forEach(function(q) {
        total += tableData.data[dept][q];
      });
      return {
        text: "次の表は各部門の四半期ごとの売上を示している。\n\n" + formatTable(tableData) + "\n\n" + dept + "の年間売上の合計はいくらか。",
        answer: total,
        unit: "万円",
        explanation: dept + "の各四半期の売上:\n" + tableData.cols.map(function(q) {
          return q + ": " + tableData.data[dept][q] + "万円";
        }).join("\n") + "\n\n合計 = " + total + "万円"
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "table_sales_02",
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function() {
      var products = ["商品A", "商品B", "商品C", "商品D"];
      var years = ["2022年", "2023年", "2024年"];
      var data = {};
      products.forEach(function(p) {
        data[p] = {};
        var base = (Math.floor(Math.random() * 30) + 10) * 100;
        years.forEach(function(y, i) {
          data[p][y] = base + (Math.floor(Math.random() * 20) - 5) * 100 * (i + 1);
          if (data[p][y] < 500) data[p][y] = 500;
        });
      });
      return { rows: products, cols: years, data: data, unit: "個" };
    },
    questionGenerator: function(tableData) {
      var product = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var cols = tableData.cols;
      var val1 = tableData.data[product][cols[0]];
      var val2 = tableData.data[product][cols[cols.length - 1]];
      var changeRate = Math.round((val2 - val1) / val1 * 100);
      return {
        text: "次の表は各商品の年間販売数を示している。\n\n" + formatTable(tableData) + "\n\n" + product + "の" + cols[0] + "から" + cols[cols.length-1] + "への増減率は何%か。（小数点以下を四捨五入）",
        answer: changeRate,
        unit: "%",
        explanation: product + "の販売数:\n" + cols[0] + ": " + val1 + "個\n" + cols[cols.length-1] + ": " + val2 + "個\n\n増減率 = (" + val2 + " - " + val1 + ") / " + val1 + " × 100 = " + changeRate + "%"
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  QUESTION_TEMPLATES.push({
    id: "table_composition_01",
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function() {
      var categories = ["食費", "住居費", "交通費", "教育費", "その他"];
      var data = {};
      var remaining = 100;
      categories.forEach(function(cat, i) {
        if (i === categories.length - 1) {
          data[cat] = remaining;
        } else {
          var val = Math.floor(Math.random() * 15) + 10;
          if (val > remaining - (categories.length - 1 - i) * 5) {
            val = Math.max(5, remaining - (categories.length - 1 - i) * 10);
          }
          data[cat] = val;
          remaining -= val;
        }
      });
      var totalAmount = (Math.floor(Math.random() * 20) + 20) * 10000;
      return { categories: categories, percentages: data, totalAmount: totalAmount };
    },
    questionGenerator: function(tableData) {
      var cat = tableData.categories[Math.floor(Math.random() * (tableData.categories.length - 1))];
      var pct = tableData.percentages[cat];
      var amount = Math.round(tableData.totalAmount * pct / 100);
      var tableStr = "【月間支出の内訳】 総額: " + tableData.totalAmount.toLocaleString() + "円\n\n";
      tableData.categories.forEach(function(c) {
        tableStr += c + ": " + tableData.percentages[c] + "%\n";
      });
      return {
        text: tableStr + "\n" + cat + "の金額はいくらか。",
        answer: amount,
        unit: "円",
        explanation: cat + "の割合: " + pct + "%\n\n金額 = " + tableData.totalAmount.toLocaleString() + " × " + pct + "/100 = " + amount.toLocaleString() + "円"
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "table_max_01",
    formats: ["webtesting", "testcenter"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "table",
    tableGenerator: function() {
      var cities = ["東京", "大阪", "名古屋", "福岡", "札幌"];
      var months = ["1月", "4月", "7月", "10月"];
      var data = {};
      cities.forEach(function(city) {
        data[city] = {};
        months.forEach(function(m, i) {
          var base = [5, 15, 30, 18][i];
          data[city][m] = base + Math.floor(Math.random() * 8) - 3;
        });
      });
      return { rows: cities, cols: months, data: data, unit: "℃" };
    },
    questionGenerator: function(tableData) {
      var month = tableData.cols[Math.floor(Math.random() * tableData.cols.length)];
      var maxCity = "";
      var maxVal = -100;
      tableData.rows.forEach(function(city) {
        if (tableData.data[city][month] > maxVal) {
          maxVal = tableData.data[city][month];
          maxCity = city;
        }
      });
      var choices = tableData.rows.slice();
      return {
        text: "次の表は各都市の月別平均気温を示している。\n\n" + formatTable(tableData) + "\n\n" + month + "の平均気温が最も高い都市はどこか。",
        answer: maxCity,
        choices: choices,
        explanation: month + "の各都市の気温:\n" + tableData.rows.map(function(city) {
          return city + ": " + tableData.data[city][month] + "℃";
        }).join("\n") + "\n\n最も高いのは" + maxCity + "の" + maxVal + "℃です。"
      };
    },
    answerType: "choice",
    timeLimitSec: 90
  });

  QUESTION_TEMPLATES.push({
    id: "table_diff_01",
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function() {
      var stores = ["A店", "B店", "C店", "D店"];
      var months = ["4月", "5月", "6月", "7月", "8月"];
      var data = {};
      stores.forEach(function(store) {
        data[store] = {};
        var base = (Math.floor(Math.random() * 30) + 20) * 10;
        months.forEach(function(m, i) {
          data[store][m] = base + (Math.floor(Math.random() * 10) - 3) * 10;
          if (data[store][m] < 100) data[store][m] = 100;
        });
      });
      return { rows: stores, cols: months, data: data, unit: "万円" };
    },
    questionGenerator: function(tableData) {
      var store = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var cols = tableData.cols;
      var maxDiff = 0;
      var maxMonth = "";
      for (var i = 1; i < cols.length; i++) {
        var diff = tableData.data[store][cols[i]] - tableData.data[store][cols[i-1]];
        if (Math.abs(diff) > Math.abs(maxDiff)) {
          maxDiff = diff;
          maxMonth = cols[i-1] + "→" + cols[i];
        }
      }
      return {
        text: "次の表は各店舗の月別売上を示している。\n\n" + formatTable(tableData) + "\n\n" + store + "で前月比の売上変動額（絶対値）が最も大きかった変動の変動額はいくらか。（増加はプラス、減少はマイナスで答えよ）",
        answer: maxDiff,
        unit: "万円",
        explanation: store + "の月別売上変動:\n" + (function() {
          var lines = [];
          for (var i = 1; i < cols.length; i++) {
            var d = tableData.data[store][cols[i]] - tableData.data[store][cols[i-1]];
            lines.push(cols[i-1] + "→" + cols[i] + ": " + (d >= 0 ? "+" : "") + d + "万円");
          }
          return lines.join("\n");
        })() + "\n\n最大変動: " + maxMonth + " で " + (maxDiff >= 0 ? "+" : "") + maxDiff + "万円"
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  // --- グラフ問題 ---

  // chart_bar_01: 棒グラフ（単一系列）- 合計/差額
  QUESTION_TEMPLATES.push({
    id: "chart_bar_01",
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "chart",
    chartGenerator: function() {
      var deptNames = [
        ["営業部", "開発部", "総務部", "企画部", "人事部"],
        ["東京支店", "大阪支店", "名古屋支店", "福岡支店", "札幌支店"],
        ["A事業部", "B事業部", "C事業部", "D事業部"]
      ];
      var labels = deptNames[Math.floor(Math.random() * deptNames.length)];
      var data = labels.map(function() {
        return (Math.floor(Math.random() * 40) + 10) * 10;
      });
      return {
        chartType: "bar",
        title: "部門別売上高（2024年度）",
        labels: labels,
        datasets: [{ label: "売上高", data: data, color: "#4285f4" }],
        unit: "万円",
        yAxisLabel: "売上高（万円）"
      };
    },
    questionGenerator: function(chartData) {
      var data = chartData.datasets[0].data;
      var labels = chartData.labels;
      var maxVal = Math.max.apply(null, data);
      var minVal = Math.min.apply(null, data);
      var diff = maxVal - minVal;
      var maxLabel = labels[data.indexOf(maxVal)];
      var minLabel = labels[data.indexOf(minVal)];

      return {
        text: "次のグラフは各部門の年間売上高を示している。\n\n売上が最も高い部門と最も低い部門の差額はいくらか。",
        answer: diff,
        unit: "万円",
        explanation: "【考え方】\n棒グラフから最大値と最小値を読み取り、差を求めます。\n\n【解法】\n① 最大: " + maxLabel + " = " + maxVal + "万円\n② 最小: " + minLabel + " = " + minVal + "万円\n③ 差額 = " + maxVal + " - " + minVal + " = " + diff + "万円\n\n【ポイント】\n・棒グラフでは棒の高さで数値を比較\n・差額 = 最大値 − 最小値",
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  // chart_bar_compare_01: 棒グラフ（2系列比較）- 前年比増加額
  QUESTION_TEMPLATES.push({
    id: "chart_bar_compare_01",
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "chart",
    chartGenerator: function() {
      var labels = ["商品A", "商品B", "商品C", "商品D"];
      var prevData = labels.map(function() {
        return (Math.floor(Math.random() * 30) + 15) * 10;
      });
      var currData = prevData.map(function(v) {
        var change = Math.floor(Math.random() * 15) - 3;
        return Math.max(50, v + change * 10);
      });
      // 少なくとも1つは増加を保証
      var hasIncrease = currData.some(function(v, i) { return v > prevData[i]; });
      if (!hasIncrease) {
        var ri = Math.floor(Math.random() * currData.length);
        currData[ri] = prevData[ri] + (Math.floor(Math.random() * 5) + 1) * 10;
      }
      return {
        chartType: "bar",
        title: "商品別売上高の推移",
        labels: labels,
        datasets: [
          { label: "前年", data: prevData, color: "#90caf9" },
          { label: "今年", data: currData, color: "#1565c0" }
        ],
        unit: "万円",
        yAxisLabel: "売上高（万円）"
      };
    },
    questionGenerator: function(chartData) {
      var labels = chartData.labels;
      var prevData = chartData.datasets[0].data;
      var currData = chartData.datasets[1].data;

      // 増加額が最大の商品を特定
      var maxIncrease = -Infinity;
      var maxIdx = 0;
      labels.forEach(function(_, i) {
        var inc = currData[i] - prevData[i];
        if (inc > maxIncrease) {
          maxIncrease = inc;
          maxIdx = i;
        }
      });

      var details = labels.map(function(label, i) {
        var diff = currData[i] - prevData[i];
        return label + ": " + prevData[i] + " → " + currData[i] + "（" + (diff >= 0 ? "+" : "") + diff + "万円）";
      }).join("\n");

      return {
        text: "次のグラフは各商品の前年と今年の売上高を示している。\n\n前年からの売上増加額が最も大きい商品の増加額はいくらか。",
        answer: maxIncrease,
        unit: "万円",
        explanation: "【考え方】\n各商品の「今年 − 前年」を計算し、最大の増加額を求めます。\n\n【解法】\n各商品の増加額:\n" + details + "\n\n最大の増加額: " + labels[maxIdx] + " の +" + maxIncrease + "万円\n\n【ポイント】\n・2系列の棒グラフでは同じカテゴリの棒を比較\n・増加額 = 今年の値 − 前年の値",
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  // chart_line_01: 折れ線グラフ - 最大変動期間
  QUESTION_TEMPLATES.push({
    id: "chart_line_01",
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "chart",
    chartGenerator: function() {
      var labels = ["4月", "5月", "6月", "7月", "8月", "9月"];
      var base = (Math.floor(Math.random() * 20) + 20) * 10;
      var data = [base];
      for (var i = 1; i < labels.length; i++) {
        var change = (Math.floor(Math.random() * 10) - 4) * 10;
        data.push(Math.max(50, data[i - 1] + change));
      }
      return {
        chartType: "line",
        title: "月別売上高の推移",
        labels: labels,
        datasets: [{ label: "売上高", data: data, color: "#4285f4" }],
        unit: "万円",
        yAxisLabel: "売上高（万円）"
      };
    },
    questionGenerator: function(chartData) {
      var data = chartData.datasets[0].data;
      var labels = chartData.labels;

      var maxDiff = 0;
      var maxMonth = "";
      var maxDiffVal = 0;
      for (var i = 1; i < data.length; i++) {
        var diff = data[i] - data[i - 1];
        if (Math.abs(diff) > Math.abs(maxDiff)) {
          maxDiff = diff;
          maxMonth = labels[i - 1] + "→" + labels[i];
          maxDiffVal = diff;
        }
      }

      var details = [];
      for (var j = 1; j < data.length; j++) {
        var d = data[j] - data[j - 1];
        details.push(labels[j - 1] + "→" + labels[j] + ": " + (d >= 0 ? "+" : "") + d + "万円");
      }

      return {
        text: "次のグラフはある店舗の月別売上高の推移を示している。\n\n前月比の売上変動額（絶対値）が最も大きい期間の変動額はいくらか。（増加はプラス、減少はマイナスで答えよ）",
        answer: maxDiffVal,
        unit: "万円",
        explanation: "【考え方】\n折れ線グラフの各月間の変動額を計算し、絶対値が最大のものを求めます。\n\n【解法】\n各月間の変動額:\n" + details.join("\n") + "\n\n絶対値が最大: " + maxMonth + " の " + (maxDiffVal >= 0 ? "+" : "") + maxDiffVal + "万円\n\n【ポイント】\n・折れ線の傾きが急なほど変動が大きい\n・増減の方向（プラス/マイナス）に注意",
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  // chart_pie_01: 円グラフ - 構成比から実数算出
  QUESTION_TEMPLATES.push({
    id: "chart_pie_01",
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "chart",
    chartGenerator: function() {
      var categories = ["食費", "住居費", "交通費", "教育費", "その他"];
      var pcts = [];
      var remaining = 100;
      for (var i = 0; i < categories.length; i++) {
        if (i === categories.length - 1) {
          pcts.push(remaining);
        } else {
          var val = Math.floor(Math.random() * 12) + 12;
          if (val > remaining - (categories.length - 1 - i) * 8) {
            val = Math.max(8, remaining - (categories.length - 1 - i) * 12);
          }
          pcts.push(val);
          remaining -= val;
        }
      }
      var totalAmount = (Math.floor(Math.random() * 15) + 25) * 10000;
      return {
        chartType: "pie",
        title: "月間支出の内訳（総額: " + totalAmount.toLocaleString() + "円）",
        labels: categories,
        datasets: [{ label: "支出", data: pcts }],
        unit: "%",
        totalAmount: totalAmount
      };
    },
    questionGenerator: function(chartData) {
      var categories = chartData.labels;
      var pcts = chartData.datasets[0].data;
      var totalAmount = chartData.totalAmount;

      var idx = Math.floor(Math.random() * (categories.length - 1));
      var cat = categories[idx];
      var pct = pcts[idx];
      var amount = Math.round(totalAmount * pct / 100);

      return {
        text: "次の円グラフは月間支出（総額 " + totalAmount.toLocaleString() + "円）の内訳を示している。\n\n" + cat + "の金額はいくらか。",
        answer: amount,
        unit: "円",
        explanation: "【考え方】\n円グラフから割合を読み取り、総額に掛けて金額を求めます。\n\n【解法】\n① " + cat + "の割合: " + pct + "%\n② 金額 = " + totalAmount.toLocaleString() + " × " + pct + " / 100\n  = " + amount.toLocaleString() + "円\n\n【ポイント】\n・円グラフの各部分は全体に対する割合を表す\n・金額 = 総額 × 割合(%) / 100",
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  // chart_pie_compare_01: 2つの円グラフ比較
  QUESTION_TEMPLATES.push({
    id: "chart_pie_compare_01",
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 3,
    type: "chart",
    chartGenerator: function() {
      var categories = ["人件費", "材料費", "広告費", "その他"];
      var totals = [
        (Math.floor(Math.random() * 10) + 30) * 100,
        (Math.floor(Math.random() * 10) + 25) * 100
      ];
      var deptNames = [["A部門", "B部門"], ["東日本", "西日本"], ["上半期", "下半期"]];
      var names = deptNames[Math.floor(Math.random() * deptNames.length)];
      var datasets = names.map(function(name, di) {
        var pcts = [];
        var remaining = 100;
        for (var i = 0; i < categories.length; i++) {
          if (i === categories.length - 1) {
            pcts.push(remaining);
          } else {
            var val = Math.floor(Math.random() * 15) + 15;
            if (val > remaining - (categories.length - 1 - i) * 10) {
              val = Math.max(10, remaining - (categories.length - 1 - i) * 15);
            }
            pcts.push(val);
            remaining -= val;
          }
        }
        return { label: name, data: pcts, total: totals[di] };
      });
      return {
        chartType: "pie",
        title: "部門別経費の内訳",
        labels: categories,
        datasets: datasets,
        unit: "万円"
      };
    },
    questionGenerator: function(chartData) {
      var categories = chartData.labels;
      var ds0 = chartData.datasets[0];
      var ds1 = chartData.datasets[1];

      var idx = Math.floor(Math.random() * (categories.length - 1));
      var cat = categories[idx];

      var amount0 = Math.round(ds0.total * ds0.data[idx] / 100);
      var amount1 = Math.round(ds1.total * ds1.data[idx] / 100);
      var diff = Math.abs(amount0 - amount1);

      var larger = amount0 > amount1 ? ds0.label : ds1.label;

      return {
        text: "次の2つの円グラフは" + ds0.label + "（計 " + ds0.total.toLocaleString() + "万円）と" + ds1.label + "（計 " + ds1.total.toLocaleString() + "万円）の経費内訳を示している。\n\n" + cat + "の金額の差はいくらか。",
        answer: diff,
        unit: "万円",
        explanation: "【考え方】\n各円グラフの割合からそれぞれの金額を算出し、差を求めます。\n\n【解法】\n① " + ds0.label + "の" + cat + ": " + ds0.total.toLocaleString() + " × " + ds0.data[idx] + "% = " + amount0 + "万円\n② " + ds1.label + "の" + cat + ": " + ds1.total.toLocaleString() + " × " + ds1.data[idx] + "% = " + amount1 + "万円\n③ 差額 = |" + amount0 + " - " + amount1 + "| = " + diff + "万円\n  （" + larger + "の方が大きい）\n\n【ポイント】\n・2つの円グラフの比較は割合ではなく金額で比較\n・総額が異なるため、同じ割合でも金額は異なる",
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 180
  });

})();

// カテゴリ10: 順列・組み合わせ
// ============================================================
// 公式が1本しかない型なので、数値だけを振っても「n人からr人」の
// 同じ文面が延々と出る。場面を差し替えて、同じ公式でも別の問題として
// 読めるようにしている。式そのものは変えていないので難易度は変わらない。
// ============================================================

// 選んで並べる（順列）場面
var PERM_PICK_SCENES = [
  function (n, r) { return n + "人の中から" + r + "人を選んで一列に並べる方法は何通りあるか。"; },
  function (n, r) { return n + "冊の本の中から" + r + "冊を選び、本棚に左から順に並べる方法は何通りあるか。"; },
  function (n, r) { return n + "人の部員の中から" + r + "人を選んで、リレーの走順を決める方法は何通りあるか。"; },
  function (n, r) { return n + "色の絵の具から" + r + "色を選び、旗を上から順に塗り分ける方法は何通りあるか。"; },
  function (n, r) { return n + "枚のカードから" + r + "枚を取り出して、左から並べる方法は何通りあるか。"; },
  function (n, r) { return n + "種類の料理から" + r + "品を選び、コースの提供順を決める方法は何通りあるか。"; },
  function (n, r) { return n + "曲の候補から" + r + "曲を選び、発表会の演奏順を決める方法は何通りあるか。"; }
];

// 選ぶだけ（組み合わせ）場面
var COMB_PICK_SCENES = [
  function (n, r) { return n + "人の中から" + r + "人を選ぶ方法は何通りあるか。"; },
  function (n, r) { return n + "種類のケーキから" + r + "種類を選ぶ方法は何通りあるか。"; },
  function (n, r) { return n + "人の候補者から" + r + "人の委員を選ぶ方法は何通りあるか。"; },
  function (n, r) { return n + "冊の本から" + r + "冊を借りる方法は何通りあるか。"; },
  function (n, r) { return n + "個の商品から" + r + "個をまとめて買う方法は何通りあるか。"; },
  function (n, r) { return n + "枚のカードから" + r + "枚を同時に引く方法は何通りあるか。"; },
  function (n, r) { return n + "か所の観光地から" + r + "か所を選んで訪れる方法は何通りあるか。（回る順は考えない）"; }
];

// 隣り合う条件つき順列の場面
var PERM_ADJACENT_SCENES = [
  function (n, k) { return n + "人を一列に並べるとき、特定の" + k + "人が隣り合う並べ方は何通りあるか。"; },
  function (n, k) { return n + "冊の本を本棚に並べるとき、特定の" + k + "冊が隣り合う並べ方は何通りあるか。"; },
  function (n, k) { return n + "人が横一列に並んで写真を撮るとき、特定の" + k + "人が隣り合う並び方は何通りあるか。"; },
  function (n, k) { return n + "個の箱を一列に置くとき、特定の" + k + "個が隣り合う置き方は何通りあるか。"; },
  function (n, k) { return n + "枚のカードを左から並べるとき、特定の" + k + "枚が隣り合う並べ方は何通りあるか。"; },
  function (n, k) { return n + "種類の料理を一列に配膳するとき、特定の" + k + "品が隣り合う並べ方は何通りあるか。"; },
  function (n, k) { return n + "両の車両を連結するとき、特定の" + k + "両が隣り合うつなぎ方は何通りあるか。"; }
];

// 円順列の場面
var PERM_CIRCLE_SCENES = [
  function (n) { return n + "人が円形のテーブルに座る方法は何通りあるか。"; },
  function (n) { return n + "人が丸いテーブルを囲んで座る座り方は何通りあるか。"; },
  function (n) { return n + "個の飾りを円形のリースに等間隔で取り付ける方法は何通りあるか。"; },
  function (n) { return n + "人が輪になって手をつなぐとき、並び方は何通りあるか。"; },
  function (n) { return n + "種類の料理を回転テーブルに等間隔で並べる方法は何通りあるか。"; },
  function (n) { return n + "人が円卓に着席する方法は何通りあるか。"; },
  function (n) { return n + "本の旗を円形の広場に等間隔で立てる方法は何通りあるか。"; },
  function (n) { return n + "色のランプを円形に等間隔で配置する方法は何通りあるか。"; },
  function (n) { return n + "個のケーキを円形の皿に等間隔で並べる方法は何通りあるか。"; },
  function (n) { return n + "枚の写真を円形のボードに等間隔で貼る方法は何通りあるか。"; }
];

// 役職を割り当てる（順列）場面
var PERM_ROLE_SCENES = [
  function (n) { return n + "人の中から委員長1人、副委員長1人、書記1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "人の部員から部長1人、副部長1人、会計1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "人の社員からリーダー1人、サブリーダー1人、記録係1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "人の候補から会長1人、副会長1人、書記1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "チームの中から優勝、準優勝、第3位を決める方法は何通りあるか。"; },
  function (n) { return n + "人の応募者から金賞1人、銀賞1人、銅賞1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "人の中から主将1人、副主将1人、マネージャー1人を選ぶ方法は何通りあるか。"; },
  function (n) { return n + "点の作品から最優秀賞1点、優秀賞1点、佳作1点を選ぶ方法は何通りあるか。"; }
];

// 最短経路の場面
var PATH_SCENES = [
  function (r, u) { return "右に" + r + "回、上に" + u + "回進んで目的地に着く最短経路は何通りあるか。"; },
  function (r, u) { return "碁盤の目状の道を、東に" + r + "区画、北に" + u + "区画進んで目的地へ向かう最短経路は何通りあるか。"; },
  function (r, u) { return "格子状の通路を、右へ" + r + "マス、上へ" + u + "マス移動する最短の道順は何通りあるか。"; },
  function (r, u) { return "駅から図書館まで、東に" + r + "ブロック、北に" + u + "ブロック進む。遠回りをしない行き方は何通りあるか。"; },
  function (r, u) { return "マス目の左上から、右に" + r + "マス・下に" + u + "マス進んでゴールに着く最短経路は何通りあるか。"; }
];

// 「特定の1つが端に来ない」場面。pos は解説でそのまま使う位置の呼び名。
var PERM_EXCLUDE_SCENES = [
  { pos: "先頭",     thing: "人",   text: function (n) { return n + "人を一列に並べるとき、特定の1人が先頭にならない並べ方は何通りあるか。"; } },
  { pos: "左端",     thing: "本",   text: function (n) { return n + "冊の本を本棚に並べるとき、特定の1冊が左端にならない並べ方は何通りあるか。"; } },
  { pos: "第1走者",  thing: "人",   text: function (n) { return n + "人でリレーの走順を決めるとき、特定の1人が第1走者にならない決め方は何通りあるか。"; } },
  { pos: "一番左",   thing: "カード", text: function (n) { return n + "枚のカードを左から並べるとき、特定の1枚が一番左にならない並べ方は何通りあるか。"; } },
  { pos: "最後尾",   thing: "人",   text: function (n) { return n + "人が縦一列に並ぶとき、特定の1人が最後尾にならない並び方は何通りあるか。"; } },
  { pos: "右端",     thing: "箱",   text: function (n) { return n + "個の箱を一列に置くとき、特定の1個が右端にならない置き方は何通りあるか。"; } },
  { pos: "1曲目",    thing: "曲",   text: function (n) { return n + "曲の演奏順を決めるとき、特定の1曲が1曲目にならない決め方は何通りあるか。"; } },
  { pos: "最初",     thing: "議題", text: function (n) { return n + "件の議題を扱う順番を決めるとき、特定の1件が最初にならない決め方は何通りあるか。"; } },
  { pos: "1番目",    thing: "商品", text: function (n) { return n + "個の商品を陳列する順番を決めるとき、特定の1個が1番目にならない決め方は何通りあるか。"; } },
  { pos: "先発",     thing: "選手", text: function (n) { return n + "人の選手の登板順を決めるとき、特定の1人が先発にならない決め方は何通りあるか。"; } }
];

(function() {
  QUESTION_TEMPLATES.push({
    id: "junretsu_basic_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 4, max: 10, step: 1 },
      r:     { type: "int", min: 2, max: 5, step: 1 },
      scene: { type: "int", min: 0, max: 6, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = PERM_PICK_SCENES[v.scene % PERM_PICK_SCENES.length](v.n, v.r);
    },
    answerFormula: function(v) {
      return permutation(v.n, v.r);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「選んで並べる」→ 順列(P)を使います。\n順番が区別される（1番目と2番目が違う）場合は順列。\n\n【解法】\n① 順列の公式: P(n, r) = n! / (n-r)!\n  = n × (n-1) × ... × (n-r+1)\n\n② P({{n}}, {{r}}) = {{calculation}} = {{answer}}通り\n\n【ポイント】\n・順列(P): 順番を区別する → 並べ方の数\n・組み合わせ(C): 順番を区別しない → 選び方の数\n・P(n,r) = C(n,r) × r!（並べ方 = 選び方 × 並べる順番）",
    timeLimitSec: 90,
    validate: function(v) {
      return v.r <= v.n - 1;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "kumiawase_basic_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 1,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 5, max: 12, step: 1 },
      r:     { type: "int", min: 2, max: 5, step: 1 },
      scene: { type: "int", min: 0, max: 6, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = COMB_PICK_SCENES[v.scene % COMB_PICK_SCENES.length](v.n, v.r);
    },
    answerFormula: function(v) {
      return combination(v.n, v.r);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「選ぶだけ（順番なし）」→ 組み合わせ(C)を使います。\n「委員を選ぶ」「チームを作る」などは組み合わせ。\n\n【解法】\n① 組み合わせの公式: C(n, r) = n! / (r! × (n-r)!)\n\n② C({{n}}, {{r}}) = {{calculation}} = {{answer}}通り\n\n【ポイント】\n・C(n,r) = P(n,r) / r!（順列を「順番の重複」で割る）\n・C(n,r) = C(n, n-r) の性質あり（例: C(7,5) = C(7,2)）\n・計算のコツ: 小さい方のrを使うと計算が楽",
    timeLimitSec: 90,
    validate: function(v) {
      return v.r <= v.n - 1;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "junretsu_cond_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 4, max: 9, step: 1 },
      k:     { type: "int", min: 2, max: 3, step: 1 },
      scene: { type: "int", min: 0, max: 6, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = PERM_ADJACENT_SCENES[v.scene % PERM_ADJACENT_SCENES.length](v.n, v.k);
      // 解説で使う値。generator.js の computeDerivedVars ではなくここで作る
      // （k を可変にしたので、2人固定を前提にした式では合わなくなる）
      v.blocks = v.n - v.k + 1;
      v.blockPerm = factorial(v.n - v.k + 1);
      v.innerPerm = factorial(v.k);
    },
    answerFormula: function(v) {
      return factorial(v.n - v.k + 1) * factorial(v.k);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「隣り合う」条件付き順列。隣り合うものを1つのブロックとみなして\nまとめて並べ、ブロック内の並び順を掛けます。\n\n【解法】\n① 特定の{{k}}つを1つのブロック（かたまり）として扱う\n  → 全体は「ブロック + 残り」= {{blocks}}組になる\n\n② {{blocks}}組の並べ方:\n  {{blocks}}! = {{blockPerm}}通り\n\n③ ブロック内の{{k}}つの並び順:\n  {{k}}! = {{innerPerm}}通り\n\n④ 合計: {{blockPerm}} × {{innerPerm}} = {{answer}}通り\n\n【ポイント】\n・「隣り合う」→ まとめて1ブロック → (n-k+1)! × k!\n・「隣り合わない」→ 全体 - 隣り合う で求めるのが楽\n・ブロック内の並び順を掛け忘れるのが最も多い間違い",
    timeLimitSec: 120,
    validate: function(v) {
      return v.k <= v.n - 1;
    }
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
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 4, max: 10, step: 1 },
      scene: { type: "int", min: 0, max: 9, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = PERM_CIRCLE_SCENES[v.scene % PERM_CIRCLE_SCENES.length](v.n);
      v.nMinus1 = v.n - 1;
    },
    answerFormula: function(v) {
      return factorial(v.n - 1);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n円形に並べる「円順列」は、回転を同一視するため1つを固定します。\n直線の順列(n!)から回転分(n通り)を割ります。\n\n【解法】\n① 円順列の公式: (n-1)!\n  1つを固定し、残り(n-1)個の並べ方を数える\n\n② ({{n}}-1)! = {{nMinus1}}! = {{answer}}通り\n\n【ポイント】\n・直線の順列: n!、円順列: (n-1)!\n・なぜ(n-1)!か: 回転して同じ並びはn通りあるので n!/n = (n-1)!\n・さらに裏返しも同じとする場合: (n-1)!/2（じゅず順列）",
    timeLimitSec: 90
  });

  // 組合せ: 役職の割り当て
  QUESTION_TEMPLATES.push({
    id: "kumiawase_committee_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 5, max: 14, step: 1 },
      scene: { type: "int", min: 0, max: 7, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = PERM_ROLE_SCENES[v.scene % PERM_ROLE_SCENES.length](v.n);
    },
    answerFormula: function(v) {
      return v.n * (v.n - 1) * (v.n - 2);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n3つの役割が互いに異なるので、誰がどれになるかが区別されます。\nこれは「順列」の問題です（選んで割り当てる）。\n\n【解法】\n① 1つ目の選び方: {{n}}通り\n② 2つ目の選び方: {{nM1}}通り（1つ目以外）\n③ 3つ目の選び方: {{nM2}}通り（1つ目・2つ目以外）\n\n④ 合計: {{n}} × {{nM1}} × {{nM2}} = {{answer}}通り\n  = P({{n}}, 3)\n\n【ポイント】\n・役割が区別される → 順列（誰がどれかで区別）\n・区別しない（3人選ぶだけ）→ 組み合わせ C(n,3)\n・P(n,3) = C(n,3) × 3!（3つの役の並べ方6通り分の差）",
    timeLimitSec: 90
  });

  // 組合せ: 最短経路
  QUESTION_TEMPLATES.push({
    id: "kumiawase_path_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 3,
    templateText: "{{q}}",
    variables: {
      right: { type: "int", min: 2, max: 7, step: 1 },
      up:    { type: "int", min: 2, max: 6, step: 1 },
      scene: { type: "int", min: 0, max: 4, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      v.q = PATH_SCENES[v.scene % PATH_SCENES.length](v.right, v.up);
    },
    answerFormula: function(v) {
      return combination(v.right + v.up, v.up);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n最短経路問題は「2方向の移動をどの順に行うか」の組み合わせ。\n全移動回数の中から「片方の方向に進む回」を選ぶ問題に帰着します。\n\n【解法】\n① 全移動回数:\n  {{right}}回 + {{up}}回 = {{total}}回\n\n② この{{total}}回の中から、片方の方向に進む{{up}}回を選ぶ:\n  C({{total}}, {{up}}) = {{answer}}通り\n\n【ポイント】\n・最短経路 = 同じものを含む順列 = 組み合わせ\n・C(合計, 一方) = C(合計, もう一方) どちらで計算してもOK\n・途中に通過点がある場合: 「出発→通過点」×「通過点→目的地」\n・通れない交差点がある場合: 全体 - 通れない経路 で求める",
    timeLimitSec: 120
  });

  // 順列: 特定の1つを端から除外
  QUESTION_TEMPLATES.push({
    id: "junretsu_exclude_01",
    formats: ["webtesting"],
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{q}}",
    variables: {
      n:     { type: "int", min: 4, max: 10, step: 1 },
      scene: { type: "int", min: 0, max: 9, step: 1 }
    },
    answerType: "number",
    resolve: function(v) {
      var sc = PERM_EXCLUDE_SCENES[v.scene % PERM_EXCLUDE_SCENES.length];
      v.q = sc.text(v.n);
      v.pos = sc.pos;
      v.thing = sc.thing;
    },
    answerFormula: function(v) {
      return factorial(v.n) - factorial(v.n - 1);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「○○にならない場合の数」= 全体 - ○○になる場合の数。\n余事象の考え方を使います。\n\n【解法】\n① 全体の並べ方（制約なし）:\n  {{n}}! = {{allPerm}}通り\n\n② 特定の{{thing}}が{{pos}}になる場合:\n  {{pos}}を固定 → 残り({{n}}-1)個の並べ方: ({{n}}-1)! = {{headPerm}}通り\n\n③ {{pos}}にならない場合（余事象）:\n  {{allPerm}} - {{headPerm}} = {{answer}}通り\n\n【ポイント】\n・「○○でない」→ 全体 - ○○ の余事象が楽\n・別解: {{pos}}は(n-1)通り × 残りは(n-1)! でも同じ\n・余事象は確率・場合の数どちらでも超重要テクニック",
    timeLimitSec: 90
  });
})();

// ============================================================
// カテゴリ11: 四則逆算（玉手箱形式）
// ============================================================
// 玉手箱の計数「四則逆算」は □ に入る数を求める形式。
// 9分50問＝1問あたり約10秒で、正確さより処理速度を問う。
//
// 誤答は必ず「よくある計算間違いの結果」にする。
// 近い値をランダムに散らすだけだと消去法で当たってしまい、
// 速度を測るテストとして成立しないため。
(function() {

  // □ × a = b × c
  QUESTION_TEMPLATES.push({
    id: "shisoku_mul_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 1,
    templateText: "□ × {{a}} = {{b}} × {{c}}",
    variables: {
      a: { type: "choice", options: [2, 3, 4, 5, 6, 8] },
      b: { type: "int", min: 4, max: 24, step: 2 },
      c: { type: "choice", options: [3, 4, 5, 6, 8, 9, 12] }
    },
    answerType: "choice",
    validate: function(v) { return (v.b * v.c) % v.a === 0 && (v.b * v.c) / v.a !== v.a; },
    answerFormula: function(v) { return v.b * v.c / v.a; },
    distractors: function(v, ans) {
      return [v.b * v.c, ans * 2, ans + v.a * 2, Math.round(ans / 2), Math.round(ans / v.a), Math.abs(ans - v.a * 2)];
    },
    unit: "",
    explanationTemplate: "右辺を先に計算してから、左辺の係数で割ります。\n\n右辺 = {{b}} × {{c}} = {{rhs}}\n□ = {{rhs}} ÷ {{a}} = {{answer}}",
    timeLimitSec: 20
  });

  // □ ÷ a = b
  QUESTION_TEMPLATES.push({
    id: "shisoku_div_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 1,
    templateText: "□ ÷ {{a}} = {{b}}",
    variables: {
      a: { type: "int", min: 3, max: 15, step: 1 },
      b: { type: "int", min: 4, max: 40, step: 2 }
    },
    answerType: "choice",
    validate: function(v) { return v.a !== v.b; },
    answerFormula: function(v) { return v.a * v.b; },
    distractors: function(v, ans) {
      return [Math.round(v.b / v.a), v.b, Math.round(ans / 2), ans * v.a, ans + v.b, ans * 2];
    },
    unit: "",
    explanationTemplate: "割り算の逆は掛け算です。\n\n□ = {{b}} × {{a}} = {{answer}}",
    timeLimitSec: 15
  });

  // a × □ = b + c
  QUESTION_TEMPLATES.push({
    id: "shisoku_add_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 1,
    templateText: "{{a}} × □ = {{b}} + {{c}}",
    variables: {
      a: { type: "choice", options: [3, 4, 5, 6, 7, 8, 9] },
      b: { type: "int", min: 10, max: 90, step: 2 },
      c: { type: "int", min: 10, max: 90, step: 2 }
    },
    answerType: "choice",
    validate: function(v) { return (v.b + v.c) % v.a === 0; },
    answerFormula: function(v) { return (v.b + v.c) / v.a; },
    distractors: function(v, ans) {
      return [v.b + v.c, (v.b + v.c) * v.a, ans + v.a, Math.abs(Math.round((v.b - v.c) / v.a)), Math.round(ans / 2), ans * 2];
    },
    unit: "",
    explanationTemplate: "右辺の和を求めてから割ります。\n\n右辺 = {{b}} + {{c}} = {{rhs}}\n□ = {{rhs}} ÷ {{a}} = {{answer}}",
    timeLimitSec: 20
  });

  // □ - a = b × c
  QUESTION_TEMPLATES.push({
    id: "shisoku_sub_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 2,
    templateText: "□ − {{a}} = {{b}} × {{c}}",
    variables: {
      a: { type: "int", min: 10, max: 80, step: 5 },
      b: { type: "choice", options: [3, 4, 6, 7, 8, 9] },
      c: { type: "choice", options: [4, 5, 6, 7, 8, 12] }
    },
    answerType: "choice",
    validate: function(v) { return v.b !== v.c; },
    answerFormula: function(v) { return v.b * v.c + v.a; },
    distractors: function(v, ans) {
      return [v.b * v.c - v.a, v.b * v.c, Math.abs(v.b * v.c - v.a * 2), ans + v.a, ans * 2, ans + v.b * v.c];
    },
    unit: "",
    explanationTemplate: "右辺を計算し、引かれていた数を足し戻します。\n\n右辺 = {{b}} × {{c}} = {{rhs}}\n□ = {{rhs}} + {{a}} = {{answer}}",
    timeLimitSec: 20
  });

  // □ ÷ a = b ÷ c
  QUESTION_TEMPLATES.push({
    id: "shisoku_ratio_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 2,
    templateText: "□ ÷ {{a}} = {{b}} ÷ {{c}}",
    variables: {
      a: { type: "choice", options: [4, 6, 8, 9, 12, 15] },
      b: { type: "int", min: 12, max: 96, step: 4 },
      c: { type: "choice", options: [3, 4, 6, 8, 12] }
    },
    answerType: "choice",
    validate: function(v) { return v.b % v.c === 0 && (v.b / v.c) * v.a !== v.b; },
    answerFormula: function(v) { return v.b / v.c * v.a; },
    distractors: function(v, ans) {
      return [Math.round(v.b / v.c), Math.round(ans / v.a), Math.round(ans / 2), ans * 2, v.b * v.c, ans + v.a];
    },
    unit: "",
    explanationTemplate: "右辺の商を求め、左辺の除数を掛け戻します。\n\n右辺 = {{b}} ÷ {{c}} = {{rhs}}\n□ = {{rhs}} × {{a}} = {{answer}}",
    timeLimitSec: 25
  });

  // a% × □ = b
  QUESTION_TEMPLATES.push({
    id: "shisoku_percent_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 2,
    templateText: "□ の {{a}}% = {{b}}",
    variables: {
      a: { type: "choice", options: [5, 10, 20, 25, 40, 50, 75] },
      b: { type: "int", min: 6, max: 90, step: 3 }
    },
    answerType: "choice",
    // {{a}}% を小数で書くと 5% は 0.05。"0." + a と機械的に繋ぐと
    // 1桁のパーセントで 0.5 になり、解説だけ10倍ずれる（実際に出ていた）。
    resolve: function(v) { v.aDecimal = v.a / 100; },
    validate: function(v) { return (v.b * 100) % v.a === 0; },
    answerFormula: function(v) { return v.b * 100 / v.a; },
    distractors: function(v, ans) {
      return [Math.round(v.b * v.a / 100), v.b, Math.round(ans / 2), v.b * v.a, ans * 2, ans + v.b];
    },
    unit: "",
    explanationTemplate: "「□の{{a}}%が{{b}}」なので、{{b}} を {{a}}% で割ります。\n\n□ = {{b}} ÷ {{aDecimal}} = {{b}} × 100 ÷ {{a}} = {{answer}}",
    timeLimitSec: 25
  });

  // □ × a/b = c
  QUESTION_TEMPLATES.push({
    id: "shisoku_frac_01",
    formats: ["webtesting", "testcenter"],
    category: "四則逆算",
    categoryId: 11,
    difficulty: 3,
    templateText: "□ × {{num}}/{{den}} = {{c}}",
    variables: {
      num: { type: "choice", options: [2, 3, 4, 5] },
      den: { type: "choice", options: [3, 4, 5, 6, 7, 8, 9] },
      c: { type: "int", min: 8, max: 80, step: 4 }
    },
    answerType: "choice",
    validate: function(v) { return v.num < v.den && (v.c * v.den) % v.num === 0; },
    answerFormula: function(v) { return v.c * v.den / v.num; },
    distractors: function(v, ans) {
      return [Math.round(v.c * v.num / v.den), v.c, Math.round(ans / 2), ans * 2, v.c * v.num, ans + v.c];
    },
    unit: "",
    explanationTemplate: "分数を掛けた結果なので、逆数を掛け戻します。\n\n□ = {{c}} × {{den}}/{{num}} = {{answer}}",
    timeLimitSec: 30
  });

})();

// ============================================================
// 二語の関係 — 語ペア辞書
// ============================================================
// 設計上の絶対条件:
//   1ペアは1関係にしか属さない。曖昧なペアは採用しない。
//   これが「正解がちょうど1つ」を機械的に保証する唯一の担保。
//
//   例: 「自動車 : タイヤ」は "部分"（タイヤは自動車の構成要素）。
//       「果物 : りんご」は "包含"（りんごは果物の一種）。
//       この2つを取り違えると、誤答が正解になって問題が壊れる。
//
// 出題の作り方:
//   ある関係Rから例示ペアを1つ、正解ペアをもう1つ選ぶ。
//   誤答は R 以外の関係から選ぶ。→ 正解は構造的に1つだけになる。
//
// 多様性: 各関係 n ペアなら n×(n-1) 通り。6関係×22ペアで 2,772 通り。
//   ペアを足すと二乗で増えるので、辞書を育てることがそのまま商品価値になる。
//
// 意図的に採用しなかった関係:
//   同義 … 「手段:方法」のような近義語は境界が主観的で、
//          誤答に別の近義語を置くと正解が2つになりうる。
//
// ⚠️ 語を足すときは test/generator.spec.js の「語ペア辞書の不変条件」を必ず通すこと。
//    同じペアが2つの関係に現れた時点でテストが落ちる。
// ============================================================

var WORD_PAIRS = {

  // AはBの一種（is-a）。上位語 : 下位語
  // ⚠️「部分」と混同しないこと。りんごは果物の"一種"であって"部品"ではない。
  "包含": [
    ["果物", "りんご"], ["楽器", "トランペット"], ["昆虫", "トンボ"],
    ["鳥類", "ペンギン"], ["家具", "たんす"], ["文具", "消しゴム"],
    ["調味料", "醤油"], ["乗り物", "電車"], ["花", "ひまわり"],
    ["魚", "マグロ"], ["球技", "バレーボール"], ["天体", "惑星"],
    ["飲料", "緑茶"], ["穀物", "大麦"], ["哺乳類", "クジラ"],
    ["建物", "図書館"], ["衣類", "セーター"], ["工具", "ドライバー"],
    ["野菜", "キャベツ"], ["書物", "辞書"], ["犬", "柴犬"],
    ["爬虫類", "ヤモリ"]
  ],

  // AはBを構成要素として持つ（part-of）。全体 : 部分
  // ⚠️「包含」と混同しないこと。タイヤは自動車の"部品"であって"一種"ではない。
  "部分": [
    ["自動車", "タイヤ"], ["時計", "文字盤"], ["本", "表紙"],
    ["樹木", "幹"], ["靴", "靴底"], ["眼鏡", "レンズ"],
    ["階段", "踏み板"], ["ギター", "弦"], ["椅子", "脚"],
    ["手", "指"], ["飛行機", "主翼"], ["家", "屋根"],
    ["自転車", "ペダル"], ["カメラ", "シャッター"], ["船", "甲板"],
    ["ドア", "蝶番"], ["山", "山頂"], ["パソコン", "画面"],
    ["顔", "眉"], ["鉛筆", "芯"], ["扇子", "要"],
    ["城", "天守"]
  ],

  // 道具 : その道具で行うこと
  // ⚠️ 第一語が道具・器具に限られる。行為者は「行為の対象」側に置く。
  "用途": [
    ["はさみ", "切る"], ["定規", "測る"], ["石けん", "洗う"],
    ["ほうき", "掃く"], ["望遠鏡", "観察する"], ["包丁", "刻む"],
    ["のこぎり", "挽く"], ["釣り竿", "釣る"], ["ストーブ", "暖める"],
    ["電卓", "計算する"], ["冷蔵庫", "冷やす"], ["アイロン", "伸ばす"],
    ["顕微鏡", "拡大する"], ["筆", "描く"], ["鏡", "映す"],
    ["ろうそく", "照らす"], ["針", "縫う"], ["のり", "貼る"],
    ["やすり", "削る"], ["天秤", "量る"], ["じょうろ", "撒く"],
    ["斧", "割る"]
  ],

  // 意味が正反対の対
  // ⚠️ 因果（原因:結果）や時系列（出発:到着）は対義ではないので入れない。
  "対義": [
    ["需要", "供給"], ["収入", "支出"], ["拡大", "縮小"],
    ["楽観", "悲観"], ["義務", "権利"], ["単純", "複雑"],
    ["保守", "革新"], ["客観", "主観"], ["具体", "抽象"],
    ["積極", "消極"], ["上昇", "下降"], ["増加", "減少"],
    ["温暖", "寒冷"], ["豊作", "凶作"], ["集中", "分散"],
    ["建設", "破壊"], ["開放", "閉鎖"], ["生産", "消費"],
    ["前進", "後退"], ["歓喜", "悲哀"], ["軽視", "重視"],
    ["理想", "現実"]
  ],

  // 製品 : その原料
  // ⚠️ 同じ原料を持つ製品を複数入れない（選択肢に並ぶと紛らわしい）。
  //    大豆→豆腐のみ採用（味噌・醤油は不採用）。牛乳→チーズのみ（バターは不採用）。
  "材料": [
    ["パン", "小麦"], ["豆腐", "大豆"], ["ワイン", "ぶどう"],
    ["チーズ", "牛乳"], ["紙", "パルプ"], ["ガラス", "ケイ砂"],
    ["日本酒", "米"], ["砂糖", "サトウキビ"], ["陶器", "粘土"],
    ["鉄", "鉄鉱石"], ["蜂蜜", "花の蜜"], ["綿布", "綿花"],
    ["絹", "繭"], ["ビール", "麦芽"], ["木炭", "木材"],
    ["セメント", "石灰石"], ["アルミニウム", "ボーキサイト"], ["畳", "い草"],
    ["和紙", "こうぞ"], ["こんにゃく", "こんにゃく芋"], ["ゴム", "樹液"],
    ["漆器", "漆"]
  ],

  // 行為者 : その行為が向かう対象
  // ⚠️「客」のように複数の職業に共通する語は使わない（関係が特定できなくなる）。
  "行為の対象": [
    ["医師", "患者"], ["教師", "生徒"], ["弁護士", "依頼人"],
    ["農家", "作物"], ["漁師", "魚群"], ["指揮者", "楽団"],
    ["審判", "試合"], ["大工", "家屋"], ["調律師", "ピアノ"],
    ["翻訳者", "原文"], ["獣医", "動物"], ["保育士", "幼児"],
    ["運転手", "乗客"], ["警察官", "容疑者"], ["消防士", "火災"],
    ["編集者", "原稿"], ["板前", "食材"], ["庭師", "庭木"],
    ["会計士", "帳簿"], ["靴職人", "革"], ["登山家", "岩壁"],
    ["写真家", "被写体"]
  ]
};

// 関係ごとの説明。解説で「なぜその関係と言えるのか」を短い文にして示す。
// tell() は語順に依存するので、辞書の [前の語, 後の語] の向きを崩さないこと。
var WORD_RELATIONS = [
  {
    key: "包含", desc: "後の語が前の語の一種である",
    tell: function (a, b) { return b + "は" + a + "の一種"; }
  },
  {
    key: "部分", desc: "後の語が前の語の一部分である",
    tell: function (a, b) { return b + "は" + a + "の一部"; }
  },
  {
    key: "用途", desc: "前の語が、後の語のために使う道具である",
    tell: function (a, b) { return a + "は" + b + "ための道具"; }
  },
  {
    key: "対義", desc: "二つの語が反対の意味である",
    tell: function (a, b) { return a + "と" + b + "は反対の意味"; }
  },
  {
    key: "材料", desc: "後の語が前の語の原料である",
    tell: function (a, b) { return b + "は" + a + "の原料"; }
  },
  {
    key: "行為の対象", desc: "前の語が働きかける対象が後の語である",
    tell: function (a, b) { return a + "が働きかける対象が" + b; }
  }
];

/** ペアを「果物 : りんご」の表示形にする。 */
function wordPairText(p) { return p[0] + " : " + p[1]; }

/** 解説用の1行。「・城 : 天守 … 部分（天守は城の一部）」 */
function wordPairAnalysis(rel, p) {
  return "・" + wordPairText(p) + " … " + rel.key + "（" + rel.tell(p[0], p[1]) + "）";
}

/**
 * 1問に登場する語がすべて異なるかを確かめる。
 *
 * 辞書は「1ペアは1関係だけ」を守っているので正解の一意性は壊れないが、
 * 「職業 : 教師」と「教師 : 生徒」が同じ問題に並ぶと読み手が混乱する。
 * 同じ語を含むペアを同居させないことで、辞書に手を入れずに防ぐ。
 */
function wordPairsAllDistinct(pairs) {
  var seen = {};
  for (var i = 0; i < pairs.length; i++) {
    for (var j = 0; j < pairs[i].length; j++) {
      var w = pairs[i][j];
      if (seen[w]) return false;
      seen[w] = true;
    }
  }
  return true;
}

/** 関係 key から WORD_RELATIONS の要素を引く。 */
function wordRelationOf(key) {
  for (var i = 0; i < WORD_RELATIONS.length; i++) {
    if (WORD_RELATIONS[i].key === key) return WORD_RELATIONS[i];
  }
  return null;
}

/**
 * 「同じ関係の組み合わせを選べ」の resolve。
 *
 * 正解は例示と同じ関係、誤答は3つとも別々の関係から取る。
 * 辞書の不変条件（1ペア=1関係）があるので、誤答が例示の関係を満たすことはない。
 * ＝正解は構造的にちょうど1つになる。
 */
function resolveWordRelation(v) {
  var rel = WORD_RELATIONS[v.rel % WORD_RELATIONS.length];
  var pairs = WORD_PAIRS[rel.key];
  var others = WORD_RELATIONS.filter(function (r) { return r.key !== rel.key; });

  for (var attempt = 0; attempt < 40; attempt++) {
    var exIdx = v.ex % pairs.length;
    // 正解は例示と必ず別のペアにする
    var ansIdx = (exIdx + 1 + (v.ans % (pairs.length - 1))) % pairs.length;
    var example = pairs[exIdx];
    var answer = pairs[ansIdx];

    var pool = others.slice();
    shuffleArray(pool);
    var wrongs = [];
    for (var i = 0; i < 3; i++) {
      var wr = pool[i];
      var wp = WORD_PAIRS[wr.key][Math.floor(Math.random() * WORD_PAIRS[wr.key].length)];
      wrongs.push({ rel: wr, pair: wp });
    }

    var all = [example, answer].concat(wrongs.map(function (w) { return w.pair; }));
    if (!wordPairsAllDistinct(all)) continue;

    var opts = [{ rel: rel, pair: answer, ok: true }].concat(
      wrongs.map(function (w) { return { rel: w.rel, pair: w.pair, ok: false }; }));
    shuffleArray(opts);

    var texts = opts.map(function (o) { return wordPairText(o.pair); });
    if (new Set(texts).size !== texts.length) continue;

    v._ok = true;
    v._choices = texts;
    v._correctIndex = opts.findIndex(function (o) { return o.ok; });
    v.example = wordPairText(example);
    v.relDesc = rel.desc;
    v.exTell = rel.tell(example[0], example[1]);
    v.answerPair = wordPairText(answer);
    v.analysis = opts.map(function (o) { return wordPairAnalysis(o.rel, o.pair); }).join("\n");
    return;
  }
  v._ok = false;
}

/**
 * 「関係が他と異なるものを選べ」の resolve。
 * 同じ関係から3ペア、別の関係から1ペア。異なるものは構造的に1つだけ。
 */
function resolveWordOddOne(v) {
  var rel = WORD_RELATIONS[v.rel % WORD_RELATIONS.length];
  var others = WORD_RELATIONS.filter(function (r) { return r.key !== rel.key; });
  var odd = others[v.odd % others.length];

  for (var attempt = 0; attempt < 40; attempt++) {
    var same = WORD_PAIRS[rel.key].slice();
    shuffleArray(same);
    same = same.slice(0, 3);
    var oddPool = WORD_PAIRS[odd.key];
    var oddPair = oddPool[Math.floor(Math.random() * oddPool.length)];

    if (!wordPairsAllDistinct(same.concat([oddPair]))) continue;

    var opts = same.map(function (p) { return { rel: rel, pair: p, ok: false }; });
    opts.push({ rel: odd, pair: oddPair, ok: true });
    shuffleArray(opts);

    var texts = opts.map(function (o) { return wordPairText(o.pair); });
    if (new Set(texts).size !== texts.length) continue;

    v._ok = true;
    v._choices = texts;
    v._correctIndex = opts.findIndex(function (o) { return o.ok; });
    v.relKey = rel.key;
    v.relDesc = rel.desc;
    v.oddKey = odd.key;
    v.oddDesc = odd.desc;
    v.oddPair = wordPairText(oddPair);
    v.analysis = opts.map(function (o) { return wordPairAnalysis(o.rel, o.pair); }).join("\n");
    return;
  }
  v._ok = false;
}

// ============================================================
// カテゴリ12: 語句の関係（言語）
// ============================================================
(function() {

  QUESTION_TEMPLATES.push({
    id: "gengo_relation_01",
    formats: ["webtesting", "testcenter"],
    category: "語句の関係",
    categoryId: 12,
    difficulty: 1,
    templateText: "最初に示した二語の関係を考え、同じ関係になっている組み合わせを選べ。\n\n{{example}}",
    variables: {
      rel: { type: "int", min: 0, max: 5, step: 1 },
      ex:  { type: "int", min: 0, max: 21, step: 1 },
      ans: { type: "int", min: 0, max: 20, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolveWordRelation(v); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._correctIndex; },
    buildChoices: function(v) {
      return { choices: v._choices.slice(), correctIndex: v._correctIndex };
    },
    unit: "",
    explanationTemplate: "示された「{{example}}」は、{{relDesc}}という関係です。\n（{{exTell}}）\n\n選択肢の関係を1つずつ言葉にして確かめます。\n{{analysis}}\n\n同じ関係になっているのは「{{answerPair}}」です。\n\n【ポイント】\n・二語を「BはAの一種」のような短い文にしてから比べる\n・「一種」と「一部」は取り違えやすい。りんごは果物の一種、タイヤは自動車の一部\n・語の意味が近いかどうかではなく、二語のつながり方をそろえる",
    timeLimitSec: 60
  });

  QUESTION_TEMPLATES.push({
    id: "gengo_relation_02",
    formats: ["webtesting", "testcenter"],
    category: "語句の関係",
    categoryId: 12,
    difficulty: 2,
    templateText: "次の4つのうち、二語の関係が他の3つと異なるものはどれか。",
    variables: {
      rel: { type: "int", min: 0, max: 5, step: 1 },
      odd: { type: "int", min: 0, max: 4, step: 1 }
    },
    answerType: "choice",
    resolve: function(v) { resolveWordOddOne(v); },
    validate: function(v) { return v._ok === true; },
    answerFormula: function(v) { return v._correctIndex; },
    buildChoices: function(v) {
      return { choices: v._choices.slice(), correctIndex: v._correctIndex };
    },
    unit: "",
    explanationTemplate: "それぞれの二語の関係を言葉にして確かめます。\n{{analysis}}\n\n3つは「{{relKey}}」（{{relDesc}}）の関係ですが、\n「{{oddPair}}」だけは「{{oddKey}}」（{{oddDesc}}）の関係です。\n\n【ポイント】\n・4つすべてを短い文にしてから比べる。1つだけ文の形が変わる\n・多数派がどの関係かを先に決めると、外れが浮かび上がる",
    timeLimitSec: 60
  });

})();

