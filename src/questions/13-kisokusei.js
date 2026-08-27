// カテゴリ13: 規則性・方角
// ============================================================
// ⚠️ この2本は「SPIの推論」には出ない形式です。
//
// SPI推論の頻出パターンは 順序 / 位置 / 対戦 / 正誤（命題）/ 割合 /
// 平均 / 整数 / 内訳・集合 で、数列の規則性と方角・距離は含まれません。
// 2026-08-27の棚卸しで判明し、推論（categoryId 1）から切り出しました。
//
// ただし削除はしません。どちらも適性検査の問題としては妥当で、
// 玉手箱・TG-WEB・SCOA の系統で実際に出題されます。
// このサイトはSPI専用ではなく「適性検査」無限ドリルなので、
// 分類を正しくしたうえで残すのが正解です。
//
// 利用者が対策の優先順位を判断できるよう、出題分野の選択欄
// （index.html）にも「SPIの推論には出ない」旨を明記してあります。
// ============================================================

// ------------------------------------------------------------
// 数列の規則性の言い回し
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

// ------------------------------------------------------------
// 方角と直線距離の素材
// ------------------------------------------------------------
// 2辺が直角をなす向きの組だけを置く。斜めの向きを混ぜると三平方が使えない。
var DIRECTION_PAIRS = [
  ["東", "北"], ["北", "西"], ["西", "南"], ["南", "東"],
  ["北", "東"], ["東", "南"], ["南", "西"], ["西", "北"]
];
// ピタゴラス数。答えが必ず整数になるので電卓なしでも解ける。
var DIRECTION_TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];

(function() {

  // 規則性: 数列
  // 「答えが2通りに読める数列」が最大の事故要因なので、示した6項に当てはまる
  // 規則の族を総当たりし、予測がちょうど1つのときだけ採用する（resolveSequencePuzzle）。
  QUESTION_TEMPLATES.push({
    id: "suiron_code_01",
    formats: ["webtesting", "testcenter"],
    category: "規則性・方角",
    categoryId: 13,
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

  // 方角: 直角に2辺進んだときの直線距離（三平方の定理）
  QUESTION_TEMPLATES.push({
    id: "suiron_direction_01",
    formats: ["webtesting", "testcenter"],
    category: "規則性・方角",
    categoryId: 13,
    difficulty: 1,
    templateText: "{{person}}は自宅から{{dir1}}へ{{a}}m歩き、次に{{dir2}}へ{{b}}m歩いた。自宅からの直線距離は何mか。",
    variables: {
      person: { type: "choice", options: ["太郎", "花子", "Aさん", "Bさん", "健太", "美咲"] },
      pair:   { type: "choice", options: [0, 1, 2, 3, 4, 5, 6, 7] },
      triple: { type: "choice", options: [0, 1, 2, 3, 4] },
      scale:  { type: "choice", options: [10, 20, 50, 100] }
    },
    answerType: "choice",
    unit: "m",
    // 向きと辺の長さはここで確定させる。問題文の展開より前に決まっている必要がある
    // （以前は generator.js の resolveCustomVariables が持っていた）。
    resolve: function(v) {
      var d = DIRECTION_PAIRS[v.pair % DIRECTION_PAIRS.length];
      var t = DIRECTION_TRIPLES[v.triple % DIRECTION_TRIPLES.length];
      v.dir1 = d[0];
      v.dir2 = d[1];
      v.a = t[0] * v.scale;
      v.b = t[1] * v.scale;
    },
    answerFormula: function(v) {
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
