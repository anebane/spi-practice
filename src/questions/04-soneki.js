// カテゴリ4: 損益算
// ⚠️ 「利益はいくらか」「利益率は何%か」には（赤字の場合はマイナスを付ける）を明記している。
//    値引き次第で利益は負になる。実測で soneki_discount_01 は 17.9%、
//    soneki_profitrate_01 は 9.6% が負の正解。符号の指示が無いと、
//    利用者が絶対値で答えて不正解になる。
//    2026-08-26 の利用者報告（図表の増減率で同じ指摘）から横展開して発見した。
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "soneki_basic_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.multiplier = 1 + v.markupRate / 100;
      return d;
    },
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
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.listPrice = Math.round(v.cost * (1 + v.markupRate / 100));
      d.salePrice = Math.round(d.listPrice * (1 - v.discountRate / 100));
      return d;
    },
    formats: ["webtesting"],
    category: "損益算",
    categoryId: 4,
    difficulty: 2,
    templateText: "ある商品を原価{{cost}}円で仕入れ、原価の{{markupRate}}%の利益を見込んで定価をつけた。しかし売れなかったので、定価の{{discountRate}}%引きで販売した。このとき、利益はいくらか。（赤字の場合はマイナスを付ける）",
    variables: {
      // 1円未満が出る組を出さない制約を足したぶん、組み合わせが減った
      // （180組→146組、実測の種類数が163→140でベースラインの下限すれすれ）。
      // 刻みを細かくして取り戻す。同ファイルの他のテンプレートと同じ100円刻み。
      cost: { type: "int", min: 1000, max: 5000, step: 100 },
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
    validate: function(v) {
      // 1円未満が出る組は出さない。解説に丸めて書くと、利用者が電卓で
      // 追ったときに合わなくなる（1250 × (1 - 25/100) = 938、真値は937.5）。
      // 丸めを許容するのではなく、割り切れる値だけを出す。
      return (v.cost * (100 + v.markupRate) * (100 - v.discountRate)) % 10000 === 0;
    },
    explanationTemplate: "【考え方】\n「定価で売れず値引き」は損益算の定番。順番に①定価→②売価→③利益を求めます。\n利益がマイナスなら赤字（損失）です。\n\n【解法】\n① 定価を求める:\n  定価 = {{cost}} × (1 + {{markupRate}}/100) = {{listPrice}}円\n\n② 売価を求める（定価から割引）:\n  売価 = {{listPrice}} × (1 - {{discountRate}}/100) = {{salePrice}}円\n\n③ 利益 = 売価 - 原価:\n  {{salePrice}} - {{cost}} = {{answer}}円\n\n【ポイント】\n・割引は「定価」に対する率、利益率は「原価」に対する率（基準が違う！）\n・利益 = 売価 - 原価（売価は値引き後の実際の販売価格）",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "soneki_loss_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.multiplier = 1 + v.markupRate / 100;
      return d;
    },
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
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.listPrice = Math.round(v.cost * (1 + v.markupRate / 100));
      d.discountPrice = Math.round(d.listPrice * (1 - v.discountRate / 100));
      d.sold2 = v.quantity - v.sold1;
      d.revenue = Math.round(d.listPrice * v.sold1 + d.discountPrice * d.sold2);
      d.totalCost = v.cost * v.quantity;
      return d;
    },
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
    validate: function(v) {
      // 1円未満が出る組は出さない。解説に丸めて書くと、利用者が電卓で
      // 追ったときに合わなくなる（1250 × (1 - 25/100) = 938、真値は937.5）。
      // 丸めを許容するのではなく、割り切れる値だけを出す。
      return (v.cost * (100 + v.markupRate) * (100 - v.discountRate)) % 10000 === 0;
    },
    explanationTemplate: "【考え方】\n複数個の商品で一部を定価、残りを割引で売る問題。\n全体の利益 = 総売上 - 総仕入れ原価 で求めます。\n\n【解法】\n① 単価を計算:\n  定価 = {{cost}} × (1 + {{markupRate}}/100) = {{listPrice}}円\n  割引価格 = {{listPrice}} × (1 - {{discountRate}}/100) = {{discountPrice}}円\n\n② 総売上を計算:\n  定価販売: {{listPrice}} × {{sold1}}個\n  割引販売: {{discountPrice}} × {{sold2}}個\n  売上合計 = {{revenue}}円\n\n③ 総仕入れ原価:\n  {{cost}} × {{quantity}} = {{totalCost}}円\n\n④ 全体の利益 = {{revenue}} - {{totalCost}} = {{answer}}円\n\n【ポイント】\n・複数パターンの販売は、それぞれの売上を合計してから原価を引く\n・残り個数 = 仕入れ数 - 定価で売れた数 を忘れずに",
    timeLimitSec: 150
  });

  // 損益算: 売価から原価逆算
  QUESTION_TEMPLATES.push({
    id: "soneki_reverse_01",
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.multiplier = 1 + v.profitRate / 100;
      return d;
    },
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
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.listPrice = Math.round(v.cost * (1 + v.markupRate / 100));
      d.salePrice = Math.round(d.listPrice * (1 - v.discountRate / 100));
      d.profit = d.salePrice - v.cost;
      return d;
    },
    formats: ["webtesting"],
    category: "損益算",
    categoryId: 4,
    difficulty: 3,
    templateText: "原価{{cost}}円の商品に{{markupRate}}%の利益を見込んで定価をつけ、定価の{{discountRate}}%引きで売った。原価に対する利益率は何%か。（赤字の場合はマイナスを付ける）",
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
    // 解説で使う派生変数。以前は generator.js の computeDerivedVars に
    // template.id で分岐して書かれていた（2026-09-06に移設）。
    derive: function(v, answer) {
      var d = {};
      d.mA = 1 + v.markupA / 100;
      d.dA = 1 - v.discountA / 100;
      d.listA = Math.round(v.costA * d.mA);
      d.saleA = Math.round(d.listA * d.dA);
      d.profitA = d.saleA - v.costA;
      d.mB = 1 + v.markupB / 100;
      d.dB = 1 - v.discountB / 100;
      d.listB = Math.round(v.costB * d.mB);
      d.saleB = Math.round(d.listB * d.dB);
      d.profitB = d.saleB - v.costB;
      return d;
    },
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
      // 1円未満が出る組は出さない。解説に「1950 × 0.85 = 1658」と丸めて書くと、
      // 利用者が電卓で追うと合わない（真値は1657.5）。
      // 丸めを許容するのではなく、割り切れる値だけを出す。
      var priceA = v.costA * (100 + v.markupA) * (100 - v.discountA);
      var priceB = v.costB * (100 + v.markupB) * (100 - v.discountB);
      if (priceA % 10000 !== 0 || priceB % 10000 !== 0) return false;
      return Math.round(profitA) !== Math.round(profitB);
    }
  });
})();
