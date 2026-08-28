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
    // 二語の関係が出題されるのはテストセンターとペーパーテスト。
    // WEBテスティングには出題されない（/language/ の説明もそう書いてある）。
    // ペーパーテストに相当する format 値は用意しない。今の2値で表せない区分を
    // 増やしても、参照側が無いうちは複雑さが増えるだけなので。
    formats: ["testcenter"],
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
    formats: ["testcenter"],
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
