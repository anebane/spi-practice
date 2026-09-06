// ============================================================
// 出題プロファイル
// ============================================================
// 「どの分野を・どういう形式で出すか」の宣言。ここが唯一の出所。
//
// ⚠️ なぜ作ったか（2026-09-06）
// 出題範囲を増やす方針が決まった（国内の公務員試験、英国のSHL型、以後も追加）。
// そのとき「新しい展開先を足すのに generator.js と app.js を1行も触らずに済むか」
// を判定基準に置いた。生成側は derive/resolve の移設で達成したが、
// **分野の一覧が index.html（チェックボックス11個）と app.js（CATEGORY_PAGES 13件）に
// 二重に書かれていた。** 片方だけ直すと静かにずれる。実際、index.html には
// 四則逆算と語句の関係が無く、app.js には有るという食い違いが既にあった
// （前者は玉手箱モード・後者は言語モードで別ページのため意図的だが、
//   コードからはその意図が読めなかった）。
//
// ⚠️ 英語版はまだ考慮していない。日本語の展開先（SPI・公務員）を先に通す方針。
//    言語・単位・通貨をプロファイルが持つ形にするのは、英語に着手する時点で行う。
//    その際ここの構造は変わる可能性がある。
var QUESTION_PROFILES = {

  // 現行のSPI対策。いまの挙動をそのまま宣言に写したもの。
  // ⚠️ 挙動を変えないことが最優先。test/profile.spec.js が
  //    index.html・categories/ の実体と突き合わせる。
  spi: {
    id: "spi",
    name: "SPI非言語 模擬試験",

    // このプロファイルを出している画面。null は「まだ画面を作っていない」。
    // test/profile.spec.js は page が "/" のものだけ index.html と突き合わせる。
    page: "/",

    // 出す難易度帯。SPIは全帯（画面のチェックボックスで利用者が選ぶ）。
    difficulties: [1, 2, 3],

    // 模擬試験に出す分野。index.html のチェックボックスと一致していること。
    // slug は categories/<slug>/ の解説ページ。null は「ページを作っていない」。
    examCategories: [
      { id: 1,  name: "推論",           slug: "suiron" },
      { id: 2,  name: "場合の数・確率",   slug: "kakuritsu" },
      { id: 3,  name: "集合",           slug: "shugo" },
      { id: 4,  name: "損益算",         slug: "soneki" },
      { id: 5,  name: "速度算",         slug: "sokudo" },
      { id: 6,  name: "仕事算",         slug: "shigoto" },
      { id: 7,  name: "濃度算",         slug: "noudo" },
      { id: 8,  name: "割合・比",       slug: "wariai" },
      { id: 9,  name: "図表の読み取り",  slug: "zuhyo" },
      { id: 10, name: "順列・組み合わせ", slug: "junretsu" },
      { id: 13, name: "規則性・方角",    slug: "kisokusei" }
    ],

    // 模擬試験には出さないが、解説ページと専用モードを持つ分野。
    // 四則逆算は玉手箱形式（tamatebako-shisoku/）、語句の関係は言語分野（language/）。
    // ⚠️ ここを examCategories に混ぜると、模擬試験の出題に入ってしまう。
    extraCategories: [
      { id: 11, name: "四則逆算",     slug: "shisoku" },
      { id: 12, name: "語句の関係",   slug: "goku" }
    ],

    // 設定画面で選べる問題数。index.html の data-value と一致していること。
    questionCounts: [10, 20, 30],
    defaultQuestionCount: 20,

    // 「10問だけもう一度」で使う問題数。
    shortRetryCount: 10,

    // 結果のシェア文言。試験ごとに変える。
    // ⚠️ 就活のタグは公務員には付けない。実態と違う相手に届く。
    shareLabel: "SPI非言語 模擬試験",
    shareTags: "#SPI #就活 #WEBテスティング"
  },

  // 公務員試験の数的処理・判断推理。
  //
  // ⚠️ まだ画面が無い（page: null）。プロファイルの器が2つ目を受けられるかを
  //    確かめるために先に宣言だけ置いた。画面を作る前でも
  //    test/profile.spec.js が「宣言と実体が合っているか」を見る。
  //
  // なぜこの分野構成か:
  //   数的推理（損益・速度・仕事・濃度・割合比・場合の数・順列組合せ）と
  //   判断推理（推論・集合）と資料解釈（図表）が、公務員試験の教養択一で
  //   32〜50%を占める。既存テンプレの大半がそのまま対応する。
  //   四則逆算(11)は玉手箱形式なので入れない。語句の関係(12)は言語分野なので入れない。
  //
  // ⚠️ 難易度は2〜3に絞る。公務員はSPIより難しく、難易度1では練習にならない。
  //    ただし現状の難易度3は18本しかないので、2も含めないと問題数が足りない。
  //    新規テンプレ（整数の性質・操作手順・暗号など20〜22本）を足すのは次段階。
  koumuin: {
    id: "koumuin",
    name: "公務員試験 数的処理・判断推理",
    page: "/koumuin/",
    difficulties: [2, 3],

    examCategories: [
      { id: 1,  name: "推論",           slug: "suiron" },
      { id: 2,  name: "場合の数・確率",   slug: "kakuritsu" },
      { id: 3,  name: "集合",           slug: "shugo" },
      { id: 4,  name: "損益算",         slug: "soneki" },
      { id: 5,  name: "速度算",         slug: "sokudo" },
      { id: 6,  name: "仕事算",         slug: "shigoto" },
      { id: 7,  name: "濃度算",         slug: "noudo" },
      { id: 8,  name: "割合・比",       slug: "wariai" },
      { id: 9,  name: "図表の読み取り",  slug: "zuhyo" },
      { id: 10, name: "順列・組み合わせ", slug: "junretsu" },
      // 公務員だけの分野。SPIには出ないので spi プロファイルには入れない。
      // ⚠️ slug が null なのは解説ページをまだ作っていないから。
      //    test/profile.spec.js は slug が無い分野の導線を出さない。
      { id: 14, name: "整数の性質",     slug: null },
      { id: 15, name: "操作と手順",     slug: null }
    ],
    extraCategories: [],

    // 公務員の教養択一は1問3〜5分。SPIより1問が重いので少なめの選択肢にする。
    questionCounts: [10, 20, 30],
    defaultQuestionCount: 20,
    shortRetryCount: 10,

    shareLabel: "公務員試験 数的処理の練習",
    shareTags: "#公務員試験 #数的処理 #判断推理"
  }
};

// プロファイルから試験セットの設定を作る。
// ⚠️ ここを通さずに generateExamSet を直接呼ぶと、プロファイルの難易度帯が効かない。
function profileExamConfig(profileId, opt) {
  opt = opt || {};
  var p = QUESTION_PROFILES[profileId];
  if (!p) return null;
  return {
    totalQuestions: opt.totalQuestions || p.defaultQuestionCount,
    // 利用者が画面で分野を選んだらそれを優先し、無ければプロファイルの全分野。
    selectedCategories: opt.selectedCategories && opt.selectedCategories.length
      ? opt.selectedCategories
      : p.examCategories.map(function (c) { return c.id; }),
    selectedDifficulties: opt.selectedDifficulties && opt.selectedDifficulties.length
      ? opt.selectedDifficulties
      : p.difficulties
  };
}

// 分野名 → 解説ページの slug。app.js の CATEGORY_PAGES はこれを使う。
function profileCategoryPages(profileId) {
  var p = QUESTION_PROFILES[profileId];
  if (!p) return {};
  var map = {};
  p.examCategories.concat(p.extraCategories || []).forEach(function (c) {
    if (c.slug) map[c.name] = c.slug;
  });
  return map;
}
