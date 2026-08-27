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

  // 推論: 位置関係
  QUESTION_TEMPLATES.push({
    id: "suiron_position_01",
    formats: ["webtesting", "testcenter"],
    category: "推論",
    categoryId: 1,
    difficulty: 3,
    type: "pattern",
    patterns: [
      {
        text: "A, B, C, D, E, F の6人が円形のテーブルに等間隔に座っている。\n以下のことがわかっている。\n・AとBは隣り合っている\n・CとDは向かい合っている（真向かい）\n・EはAの隣ではない\n・FはCの隣に座っている\n・BはDの隣に座っている\n\nAの向かいに座っているのは誰か。",
        choices: ["C", "D", "E", "F"],
        correctIndex: 2,
        explanation: "6人の円卓では「向かい合い」= 3つ離れた位置（真向かい）。\n\n位置を1〜6として、CとDが向かい合う配置を決める:\nC=1, D=4 と固定。\n\nFはCの隣 → F=2 or F=6。\nBはDの隣 → B=3 or B=5。\nAとBは隣り合う。EはAの隣ではない。\n\nF=6, B=5の場合:\n残り位置2,3にA,Eを配置。\nA=2: Aの隣は1(C)と3 → AとB(5)は隣り合わない ✗\nA=3: Aの隣は2と4(D) → AとB(5)は隣り合わない ✗\n\nF=6, B=3の場合:\n残り位置2,5にA,Eを配置。\nA=2: Aの隣は1(C)と3(B) → AとBが隣り合う ○\n  E=5 → Eの隣は4(D)と6(F) → EはAの隣ではない ○\n  Aの向かい = 位置5 = E ✓\n\nよってAの向かいに座っているのはEです。"
      }
    ],
    answerType: "choice",
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
