// ============================================================
// 熟語の成り立ち — 二字熟語の構成辞書
// ============================================================
// 設計上の絶対条件（12-gengo.js の語ペア辞書と同じ）:
//   1つの熟語は1つの構成にしか属さない。曖昧な熟語は採用しない。
//   これが「正解がちょうど1つ」を機械的に保証する唯一の担保。
//
//   例: 「増加」は"似た意味"（増す・加わる、どちらも増える）。
//       「増減」は"反対の意味"（増す ⇄ 減る）。
//       1字違いで構成が変わるので、採用時に必ず読み下してから入れる。
//
// 出題の作り方:
//   熟語を1つ選び、5つの構成から選ばせる。誤答は残り4つの構成そのもの。
//   → 正解は構造的に1つだけになる。
//
// 多様性: 構成5種 × n語。選択肢の並びも毎回変わる。
//   ⚠️ 語彙そのものが問われる分野なので、数値問題のように
//      「値を変えて無限に作る」ことはできない。辞書を育てることが
//      そのまま出題の幅になる（語ペア辞書と同じ性質）。
//
// 意図的に採用しなかった熟語:
//   「家出」… 「家を出る」（動詞＋目的語）とも「家が出る」とも読めてしまう。
//   「心配」… 構成の説明が辞書によって割れる。
//   「着手」「着目」… 「手を着ける」の比喩で、字面の構成と意味がずれる。
//
// ⚠️ 語を足すときは test/generator.spec.js の「熟語辞書の不変条件」を必ず通すこと。
//    同じ熟語が2つの構成に現れた時点でテストが落ちる。
// ============================================================

var JUKUGO_KINDS = [
  {
    name: "似た意味の漢字を重ねる",
    tell: "2字が同じような意味を持つ",
    words: [
      ["温暖", "温かい・暖かい"], ["豊富", "豊か・富む"], ["岩石", "岩・石"],
      ["河川", "河・川"], ["道路", "道・路"], ["永久", "永い・久しい"],
      ["思考", "思う・考える"], ["絵画", "絵・画"], ["森林", "森・林"],
      ["救助", "救う・助ける"], ["寒冷", "寒い・冷たい"], ["堅固", "堅い・固い"],
      ["巨大", "巨きい・大きい"], ["清潔", "清い・潔い"], ["増加", "増す・加わる"],
      ["削減", "削る・減らす"], ["身体", "身・体"], ["金銭", "金・銭"],
      ["樹木", "樹・木"], ["衣服", "衣・服"], ["階段", "階・段"],
      ["皮膚", "皮・膚"]
    ]
  },
  {
    name: "反対の意味の漢字を重ねる",
    tell: "2字の意味が逆になっている",
    words: [
      ["増減", "増える ⇄ 減る"], ["明暗", "明るい ⇄ 暗い"], ["往復", "行く ⇄ 帰る"],
      ["売買", "売る ⇄ 買う"], ["多少", "多い ⇄ 少ない"], ["大小", "大きい ⇄ 小さい"],
      ["高低", "高い ⇄ 低い"], ["長短", "長い ⇄ 短い"], ["公私", "公 ⇄ 私"],
      ["天地", "天 ⇄ 地"], ["南北", "南 ⇄ 北"], ["東西", "東 ⇄ 西"],
      ["開閉", "開ける ⇄ 閉める"], ["需給", "需要 ⇄ 供給"], ["攻防", "攻める ⇄ 防ぐ"],
      ["進退", "進む ⇄ 退く"], ["賞罰", "賞 ⇄ 罰"], ["有無", "有る ⇄ 無い"],
      ["送迎", "送る ⇄ 迎える"], ["貸借", "貸す ⇄ 借りる"], ["出欠", "出席 ⇄ 欠席"],
      ["寒暖", "寒い ⇄ 暖かい"], ["集散", "集まる ⇄ 散る"], ["硬軟", "硬い ⇄ 軟らかい"]
    ]
  },
  {
    name: "主語と述語の関係",
    tell: "前が主語、後ろが述語になっている",
    words: [
      ["日没", "日が没する"], ["地震", "地が震える"], ["雷鳴", "雷が鳴る"],
      ["頭痛", "頭が痛む"], ["腹痛", "腹が痛む"], ["国立", "国が立てる"],
      ["市営", "市が営む"], ["県立", "県が立てる"], ["人造", "人が造る"],
      ["日照", "日が照る"], ["骨折", "骨が折れる"], ["私製", "私が製する"],
      ["官製", "官が製する"], ["民営", "民が営む"], ["年少", "年が少ない"],
      ["気絶", "気が絶える"], ["市立", "市が立てる"], ["国営", "国が営む"]
    ]
  },
  {
    name: "動詞の後に目的語をおく",
    tell: "後ろから前へ「〜を（に）〜する」と読める",
    words: [
      ["読書", "書を読む"], ["登山", "山に登る"], ["着席", "席に着く"],
      ["投票", "票を投じる"], ["消火", "火を消す"], ["帰国", "国へ帰る"],
      ["握手", "手を握る"], ["乗車", "車に乗る"], ["開会", "会を開く"],
      ["就職", "職に就く"], ["避難", "難を避ける"], ["作文", "文を作る"],
      ["退場", "場を退く"], ["求人", "人を求める"], ["洗顔", "顔を洗う"],
      ["断水", "水を断つ"], ["失業", "業を失う"], ["点火", "火を点ける"],
      ["着陸", "陸に着く"], ["殺菌", "菌を殺す"], ["募金", "金を募る"],
      ["貯金", "金を貯める"], ["採血", "血を採る"], ["加熱", "熱を加える"]
    ]
  },
  {
    name: "前の漢字が後ろの漢字を修飾する",
    tell: "前から後ろへ「〜な〜」「〜の〜」と読める",
    words: [
      ["急流", "急な流れ"], ["猛暑", "猛烈な暑さ"], ["美人", "美しい人"],
      ["青空", "青い空"], ["黒板", "黒い板"], ["新品", "新しい品"],
      ["高層", "高い層"], ["白紙", "白い紙"], ["幼児", "幼い児"],
      ["鉄橋", "鉄の橋"], ["温泉", "温かい泉"], ["大木", "大きい木"],
      ["細道", "細い道"], ["深海", "深い海"], ["老人", "老いた人"],
      ["洋服", "西洋の服"], ["和室", "和風の室"], ["濃霧", "濃い霧"],
      ["微風", "微かな風"], ["巨木", "巨大な木"], ["名作", "名高い作"],
      ["熱湯", "熱い湯"], ["冷水", "冷たい水"]
    ]
  }
];

// 構成の名前だけを並べた配列（選択肢に使う）。
var JUKUGO_KIND_NAMES = JUKUGO_KINDS.map(function (k) { return k.name; });

/** 熟語を1つ選び、その構成を答えさせる。選択肢は5つの構成そのもの。 */
function resolveJukugoKind(v) {
  var kind = JUKUGO_KINDS[v.kind % JUKUGO_KINDS.length];
  var entry = kind.words[v.word % kind.words.length];

  // 選択肢は構成5つ。並びだけ毎回変える。
  // ⚠️ 誤答を「他の構成の名前」にできるのは、1熟語が1構成にしか属さないから。
  //    辞書に曖昧な語を入れた瞬間、正解が2つになる。
  var opts = JUKUGO_KINDS.map(function (k) {
    return { name: k.name, ok: k.name === kind.name };
  });
  shuffleArray(opts);

  v._ok = true;
  v._choices = opts.map(function (o) { return o.name; });
  v._correctIndex = opts.findIndex(function (o) { return o.ok; });
  v.word = entry[0];
  v.tell = entry[1];
  v.kindName = kind.name;
  v.kindTell = kind.tell;
  // 他の構成も一覧で見せる。名前だけだと違いが分からないため。
  v.kindList = JUKUGO_KINDS.map(function (k) {
    return (k.name === kind.name ? "・【" + k.name + "】" : "・" + k.name)
      + "… " + k.tell + "（例: " + k.words[0][0] + " = " + k.words[0][1] + "）";
  }).join("\n");
}

/** 構成を示し、当てはまる熟語を選ばせる。resolveJukugoKind の逆向き。 */
function resolveJukugoWord(v) {
  var kind = JUKUGO_KINDS[v.kind % JUKUGO_KINDS.length];
  var answer = kind.words[v.ans % kind.words.length];
  var others = JUKUGO_KINDS.filter(function (k) { return k.name !== kind.name; });

  var pool = others.slice();
  shuffleArray(pool);
  var wrongs = [];
  for (var i = 0; i < 3; i++) {
    var k = pool[i];
    wrongs.push({ kind: k, entry: k.words[Math.floor(Math.random() * k.words.length)] });
  }

  var opts = [{ kind: kind, entry: answer, ok: true }].concat(
    wrongs.map(function (w) { return { kind: w.kind, entry: w.entry, ok: false }; }));
  shuffleArray(opts);

  var texts = opts.map(function (o) { return o.entry[0]; });
  // 同じ熟語が2つ並ぶことは辞書の作りから起きないが、起きたら問題にしない。
  if (new Set(texts).size !== texts.length) { v._ok = false; return; }

  v._ok = true;
  v._choices = texts;
  v._correctIndex = opts.findIndex(function (o) { return o.ok; });
  v.kindName = kind.name;
  v.kindTell = kind.tell;
  v.answerWord = answer[0];
  v.analysis = opts.map(function (o) {
    return "・" + o.entry[0] + " = " + o.entry[1] + " → " + o.kind.name;
  }).join("\n");
}

// ============================================================
// カテゴリ16: 熟語の成り立ち（言語）
// ============================================================
(function () {

  QUESTION_TEMPLATES.push({
    id: "jukugo_kind_01",
    // 熟語の成り立ちはテストセンターとペーパーテストで出る。
    // WEBテスティングには出題されない（二語の関係と同じ扱い）。
    formats: ["testcenter"],
    category: "熟語の成り立ち",
    categoryId: 16,
    difficulty: 1,
    templateText: "次の熟語の成り立ち方として当てはまるものを選べ。\n\n{{word}}",
    variables: {
      kind: { type: "int", min: 0, max: 4,  step: 1 },
      word: { type: "int", min: 0, max: 23, step: 1 }
    },
    answerType: "choice",
    resolve: function (v) { resolveJukugoKind(v); },
    validate: function (v) { return v._ok === true; },
    answerFormula: function (v) { return v._correctIndex; },
    buildChoices: function (v) {
      return { choices: v._choices.slice(), correctIndex: v._correctIndex };
    },
    unit: "",
    explanationTemplate: "「{{word}}」は「{{tell}}」と読み下せます。\nつまり{{kindTell}}ので、答えは【{{kindName}}】です。\n\n5つの構成を並べると次のようになります。\n{{kindList}}\n\n【ポイント】\n・まず2字を1字ずつ訓読みして、意味を声に出してみる\n・後ろから前へ「〜を〜する」と読めたら目的語型\n・前から後ろへ「〜な〜」と読めたら修飾型\n・「増加（似た意味）」と「増減（反対）」のように1字違いで変わるので、字面で覚えない",
    timeLimitSec: 45
  });

  QUESTION_TEMPLATES.push({
    id: "jukugo_kind_02",
    formats: ["testcenter"],
    category: "熟語の成り立ち",
    categoryId: 16,
    difficulty: 2,
    templateText: "次の成り立ち方をしている熟語を選べ。\n\n{{kindName}}",
    variables: {
      kind: { type: "int", min: 0, max: 4,  step: 1 },
      ans:  { type: "int", min: 0, max: 23, step: 1 }
    },
    answerType: "choice",
    resolve: function (v) { resolveJukugoWord(v); },
    validate: function (v) { return v._ok === true; },
    answerFormula: function (v) { return v._correctIndex; },
    buildChoices: function (v) {
      return { choices: v._choices.slice(), correctIndex: v._correctIndex };
    },
    unit: "",
    explanationTemplate: "求めるのは【{{kindName}}】、つまり{{kindTell}}ものです。\n\n選択肢を1つずつ読み下します。\n{{analysis}}\n\n当てはまるのは「{{answerWord}}」です。\n\n【ポイント】\n・選択肢は必ず全部読み下す。1つ目が合っていそうでも最後まで確かめる\n・読み下せない熟語は、2字それぞれの訓読みを思い出すところから始める",
    timeLimitSec: 45
  });

})();
