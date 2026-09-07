// 図表で使う語彙。⚠️ この型は templateText を持たないので、
// 「テンプレート文字列を訳す」方式が使えない。語彙をここに出して lang で引く。
// ⚠️ 日本語の側は既存の出力と1文字も変えないこと（test/generator.spec.js が検算する）。
var ZUHYO_WORDS = {
  ja: {
    departments: ["営業部", "開発部", "総務部", "企画部"],
    quarters: ["第1四半期", "第2四半期", "第3四半期", "第4四半期"],
    salesIntro: "次の表は各部門の四半期ごとの売上を示している。",
    salesAsk: function (d) { return d + "の年間売上の合計はいくらか。"; },
    salesExpLead: function (d) { return d + "の各四半期の売上:"; },
    money: function (n) { return n + "万円"; },
    total: "合計",
    // table_sales_02（増減率）
    products: ["商品A", "商品B", "商品C", "商品D"],
    years: ["2022年", "2023年", "2024年"],
    sales2Intro: "次の表は各商品の年間販売数を示している。",
    sales2Ask: function (p, y1, y2) { return p + "の" + y1 + "から" + y2 + "への増減率は何%か。（小数点以下を四捨五入。減少の場合はマイナスを付ける）"; },
    sales2ExpLead: function (p) { return p + "の販売数:"; },
    count: function (n) { return n + "個"; },
    sales2Rate: function (v2, v1, r) { return "増減率 = (" + v2 + " - " + v1 + ") / " + v1 + " × 100 = " + r + "%"; },
    // table_composition_01（構成比）
    // ⚠️ 支出の総額の刻み。日本の月間家計は20万〜39万円なので10000刻み。
    //    英語版（英国）は £2,000〜£3,900 なので100刻みにする。
    //    ここを言語ごとに持たないと、英語版が「月間支出 £390,000」になる。
    expenseScale: 10000,
    // ⚠️ 単価の桁も言語で違う。日本は300〜1500円、英国は £3〜£15。
    //    ここを共通にすると「£1,500 の日用品」になる。
    priceScale: 100,
    expenseCats: ["食費", "住居費", "交通費", "教育費", "その他"],
    comp1Header: function (total) { return "【月間支出の内訳】 総額: " + total.toLocaleString() + "円\n\n"; },
    amountAsk: function (cat) { return cat + "の金額はいくらか。"; },
    comp1Share: function (cat, pct) { return cat + "の割合: " + pct + "%"; },
    comp1Calc: function (total, pct, amount) { return "金額 = " + total.toLocaleString() + " × " + pct + "/100 = " + amount.toLocaleString() + "円"; },
    // table_max_01（最大値）
    // ⚠️ 都市ごとの気候差（平年値からの目安）を持つ。以前は全都市を同じ乱数で
    //    作っていたため「札幌の7月が34℃で東京より暑い」「札幌の1月が8℃」など、
    //    日本の利用者には明らかに変な表が出ていた（2026-09-07に英語圏レビューで
    //    「データが実在しない」と指摘され、気象庁の平年値と照らして確認）。
    //    offset は [1月, 4月, 7月, 10月] の基準値からの差。
    // 気温の基準値（この言語圏の代表都市の平年値）と、都市ごとのずれ。
    // ⚠️ 5都市固定にすると「最も高い都市」の答えが福岡41%に偏り、
    //    表を読まずに当てられた（2,000回の実測）。10都市から毎回5つ選ぶ。
    // ⚠️ 那覇は入れない。他都市と10℃以上離れていて、出るたびに答えが確定するため。
    tempBase: [5, 14, 26, 19],
    cities: [
      { name: "東京",   offset: [0, 0, 0, 0] },
      { name: "大阪",   offset: [1, 1, 2, 1] },
      { name: "名古屋", offset: [0, 0, 1, 0] },
      { name: "福岡",   offset: [2, 1, 1, 2] },
      { name: "広島",   offset: [1, 0, 1, 1] },
      { name: "高松",   offset: [1, 1, 2, 1] },
      { name: "新潟",   offset: [-2, -3, -1, -2] },
      { name: "仙台",   offset: [-3, -3, -3, -3] },
      { name: "金沢",   offset: [-1, -1, 0, -1] },
      { name: "札幌",   offset: [-9, -7, -5, -7] }
    ],
    tempMonths: ["1月", "4月", "7月", "10月"],
    max1Intro: "次の表は各都市の月別平均気温を示している。",
    max1Ask: function (m) { return m + "の平均気温が最も高い都市はどこか。"; },
    max1ExpLead: function (m) { return m + "の各都市の気温:"; },
    temp: function (n) { return n + "℃"; },
    max1ExpEnd: function (city, val) { return "最も高いのは" + city + "の" + val + "℃です。"; },
    // table_diff_01（最大変動）
    stores: ["A店", "B店", "C店", "D店"],
    storeMonths: ["4月", "5月", "6月", "7月", "8月"],
    diff1Intro: "次の表は各店舗の月別売上を示している。",
    diff1Ask: function (s) { return s + "で前月比の売上変動額（絶対値）が最も大きかった変動の変動額はいくらか。（増加はプラス、減少はマイナスで答えよ）"; },
    diff1ExpLead: function (s) { return s + "の月別売上変動:"; },
    signedMoney: function (d) { return (d >= 0 ? "+" : "") + d + "万円"; },
    diff1ExpEnd: function (m) { return "最大変動: " + m + " で "; },
    // chart_bar_01（棒グラフ）
    // ⚠️ 呼び名（unit名）をセットごとに持つ。以前はラベルが「東京支店」でも
    //    設問文が「各部門」で固定だった（2026-09-07に英語版のレビューで発覚。
    //    日本語版にも同じ不整合があった）。
    barDeptSets: [
      { names: ["営業部", "開発部", "総務部", "企画部", "人事部"], word: "部門" },
      { names: ["東京支店", "大阪支店", "名古屋支店", "福岡支店", "札幌支店"], word: "支店" },
      { names: ["A事業部", "B事業部", "C事業部", "D事業部"], word: "事業部" }
    ],
    bar1Title: function (w) { return w + "別売上高（2024年度）"; },
    revenueLabel: "売上高",
    revenueAxis: "売上高（万円）",
    bar1Text: function (w) { return "次のグラフは各" + w + "の年間売上高を示している。\n\n売上が最も高い" + w + "と最も低い" + w + "の差額はいくらか。"; },
    bar1Exp: function (maxLabel, maxVal, minLabel, minVal, diff) {
      return "【考え方】\n棒グラフから最大値と最小値を読み取り、差を求めます。\n\n【解法】\n① 最大: " + maxLabel + " = " + maxVal + "万円\n② 最小: " + minLabel + " = " + minVal + "万円\n③ 差額 = " + maxVal + " - " + minVal + " = " + diff + "万円\n\n【ポイント】\n・棒グラフでは棒の高さで数値を比較\n・差額 = 最大値 − 最小値";
    },
    // chart_bar_compare_01（2系列棒グラフ）
    barCmpTitle: "商品別売上高の推移",
    prevYear: "前年",
    thisYear: "今年",
    barCmpText: "次のグラフは各商品の前年と今年の売上高を示している。\n\n前年からの売上増加額が最も大きい商品の増加額はいくらか。",
    barCmpDetail: function (label, prev, curr, d) { return label + ": " + prev + " → " + curr + "（" + (d >= 0 ? "+" : "") + d + "万円）"; },
    barCmpExp: function (details, maxLabel, maxIncrease) {
      return "【考え方】\n各商品の「今年 − 前年」を計算し、最大の増加額を求めます。\n\n【解法】\n各商品の増加額:\n" + details + "\n\n最大の増加額: " + maxLabel + " の +" + maxIncrease + "万円\n\n【ポイント】\n・2系列の棒グラフでは同じカテゴリの棒を比較\n・増加額 = 今年の値 − 前年の値";
    },
    // chart_line_01（折れ線グラフ）
    lineMonths: ["4月", "5月", "6月", "7月", "8月", "9月"],
    lineTitle: "月別売上高の推移",
    lineText: "次のグラフはある店舗の月別売上高の推移を示している。\n\n前月比の売上変動額（絶対値）が最も大きい期間の変動額はいくらか。（増加はプラス、減少はマイナスで答えよ）",
    lineExp: function (details, maxMonth, signed) {
      return "【考え方】\n折れ線グラフの各月間の変動額を計算し、絶対値が最大のものを求めます。\n\n【解法】\n各月間の変動額:\n" + details + "\n\n絶対値が最大: " + maxMonth + " の " + signed + "\n\n【ポイント】\n・折れ線の傾きが急なほど変動が大きい\n・増減の方向（プラス/マイナス）に注意";
    },
    // chart_pie_01（円グラフ）
    pie1Title: function (total) { return "月間支出の内訳（総額: " + total.toLocaleString() + "円）"; },
    pie1Label: "支出",
    pie1Intro: function (total) { return "次の円グラフは月間支出（総額 " + total.toLocaleString() + "円）の内訳を示している。"; },
    pie1Exp: function (cat, pct, total, amount) {
      return "【考え方】\n円グラフから割合を読み取り、総額に掛けて金額を求めます。\n\n【解法】\n① " + cat + "の割合: " + pct + "%\n② 金額 = " + total.toLocaleString() + " × " + pct + " / 100\n  = " + amount.toLocaleString() + "円\n\n【ポイント】\n・円グラフの各部分は全体に対する割合を表す\n・金額 = 総額 × 割合(%) / 100";
    },
    // chart_pie_compare_01（2つの円グラフ）
    costCats: ["人件費", "材料費", "広告費", "その他"],
    pieCmpNameSets: [["A部門", "B部門"], ["東日本", "西日本"], ["上半期", "下半期"]],
    pieCmpTitle: "部門別経費の内訳",
    // ⚠️ ja は pieSubtitle を持たない。円グラフ上のサブタイトル
    //    「A部門（計 3,200万円）」は _base.js の drawMultiPieChart が
    //    従来どおり組み立てる（ja の chartConfig を1バイトも変えないため）。
    pieCmpIntro: function (n0, t0, n1, t1) { return "次の2つの円グラフは" + n0 + "（計 " + t0.toLocaleString() + "万円）と" + n1 + "（計 " + t1.toLocaleString() + "万円）の経費内訳を示している。"; },
    pieCmpAsk: function (cat) { return cat + "の金額の差はいくらか。"; },
    // --- table_share_01（金額 → 全体に占める割合）---
    // ⚠️ 既存の table_composition_01 は「割合 → 金額」。向きが逆で、
    //    実際の資料解釈では両方向が出る。
    shareRows: ["国内事業", "海外事業", "法人向け", "個人向け"],
    shareCol: "年間売上",
    shareIntro: "次の表は各事業の年間売上を示している。",
    shareAsk: function (r) { return r + "の売上は、全体の何%を占めるか。"; },
    shareExp: function (r, v, total, pct) {
      return "【考え方】\nその事業の売上を全体の合計で割ります。\n\n【解法】\n① " + r + "の売上: " + v.toLocaleString() + "万円\n② 全体の合計: " + total.toLocaleString() + "万円\n③ 割合 = " + v.toLocaleString() + " ÷ " + total.toLocaleString() + " × 100 = " + pct + "%\n\n【ポイント】\n・分母は「全体の合計」。1つの行ではない\n・合計は表の全行を足して求める";
    },
    // --- table_ratio_01（何倍か）---
    ratioIntro: "次の表は各店舗の年間売上を示している。",
    ratioAsk: function (a, b) { return a + "の売上は、" + b + "の売上の何倍か。"; },
    ratioExp: function (a, va, b, vb, k) {
      return "【考え方】\n比べられる側（" + b + "）で割ります。\n\n【解法】\n① " + a + ": " + va.toLocaleString() + "万円\n② " + b + ": " + vb.toLocaleString() + "万円\n③ " + va.toLocaleString() + " ÷ " + vb.toLocaleString() + " = " + k + "倍\n\n【ポイント】\n・「AはBの何倍か」は A ÷ B。割る順番を逆にしない\n・差ではなく比を聞かれていることに注意";
    },
    // --- table_per_unit_01（1個あたりの単価）---
    unitPriceCols: ["販売数（個）", "売上高（円）"],
    unitPriceIntro: "次の表は各商品の販売数と売上高を示している。",
    unitPriceAsk: function (p) { return p + "の1個あたりの平均販売価格はいくらか。"; },
    unitPriceExp: function (p, units, rev, price) {
      return "【考え方】\n売上高を販売数で割ります。\n\n【解法】\n① " + p + "の売上高: " + rev.toLocaleString() + "円\n② " + p + "の販売数: " + units.toLocaleString() + "個\n③ 単価 = " + rev.toLocaleString() + " ÷ " + units.toLocaleString() + " = " + price.toLocaleString() + "円\n\n【ポイント】\n・「1つあたり」は必ず割り算。何で割るかを取り違えない\n・売上高が大きくても、販売数が多ければ単価は低い";
    },
    // --- table_index_01（基準年を100とした指数）---
    indexIntro: "次の表は各商品の売上の推移を示している。",
    indexAsk: function (p, y0, y1) { return p + "について、" + y0 + "を100としたときの" + y1 + "の指数はいくつか。"; },
    indexExp: function (p, y0, v0, y1, v1, idx) {
      return "【考え方】\n指数は「基準年を100としたときの比」です。基準年で割って100を掛けます。\n\n【解法】\n① " + p + "の" + y0 + ": " + v0.toLocaleString() + "（これが100）\n② " + p + "の" + y1 + ": " + v1.toLocaleString() + "\n③ 指数 = " + v1.toLocaleString() + " ÷ " + v0.toLocaleString() + " × 100 = " + idx + "\n\n【ポイント】\n・指数100は基準年と同じ。100を超えていれば増加、下回っていれば減少\n・指数から実額は分からない（基準年の値が分かって初めて計算できる）";
    },
    // --- table_forecast_01（同じ率で伸びたら）---
    forecastIntro: "次の表は各商品の売上を示している。",
    forecastAsk: function (p, y1, y2, y3) { return p + "が" + y1 + "から" + y2 + "と同じ増加率で" + y3 + "も伸びるとすると、" + y3 + "の売上はいくらになるか。"; },
    forecastExp: function (p, y1, v1, y2, v2, rate, y3, v3) {
      return "【考え方】\nまず増加率を出し、それを直近の値に掛けます。差を足すのではありません。\n\n【解法】\n① 増加率 = (" + v2.toLocaleString() + " - " + v1.toLocaleString() + ") ÷ " + v1.toLocaleString() + " × 100 = " + rate + "%\n② " + y3 + " = " + v2.toLocaleString() + " × (1 + " + rate + "/100) = " + v3.toLocaleString() + "万円\n\n【ポイント】\n・⚠️ 増加「額」を足すのではなく、増加「率」を掛ける\n  （額を足すと " + (v2 + (v2 - v1)).toLocaleString() + " になり、これは誤り）\n・もとの値が増えているので、同じ率でも増加額は大きくなる";
    },
    // --- table_growth_rate_01（伸び率が最も高いのはどれか）---
    growthIntro: "次の表は各商品の売上の推移を示している。",
    growthAsk: function (y1, y2) { return y1 + "から" + y2 + "にかけて、売上の伸び率が最も高い商品はどれか。"; },
    // ⚠️ **比べる量（伸び率）をラベルの直後に置く。**
    //    元の値を先に書くと、解説から答えを導き直す検査が
    //    「ラベル: 最初の数値」を拾って元の値の最大を答えだと判断する。
    //    検査に合わせて書式を変えたのではなく、比べている量を先に出すのが
    //    解説としても正しい（読み手も最初に見るべき数字がそれ）。
    growthLine: function (p, v1, v2, inc, pct) {
      return p + ": " + pct + "%（" + v1.toLocaleString() + " → " + v2.toLocaleString() + "・増加 " + inc.toLocaleString() + "）";
    },
    growthExp: function (lines, best, bestPct, absName, absInc) {
      return "【考え方】\n伸び率は「増加分 ÷ もとの値」です。増加額の大小とは一致しません。\n\n【解法】\n各商品の伸び率:\n" + lines + "\n\n伸び率が最も高いのは " + best + "（" + bestPct + "%）です。\n\n【ポイント】\n・⚠️ 増加額が最も大きいのは " + absName + "（" + absInc.toLocaleString() + "）で、伸び率の1位とは違う\n・もとの値が小さいほど、同じ増加額でも伸び率は高くなる";
    },
    pieCmpExp: function (p) {
      return "【考え方】\n各円グラフの割合からそれぞれの金額を算出し、差を求めます。\n\n【解法】\n① " + p.n0 + "の" + p.cat + ": " + p.t0.toLocaleString() + " × " + p.p0 + "% = " + p.a0 + "万円\n② " + p.n1 + "の" + p.cat + ": " + p.t1.toLocaleString() + " × " + p.p1 + "% = " + p.a1 + "万円\n③ 差額 = |" + p.a0 + " - " + p.a1 + "| = " + p.diff + "万円\n  （" + p.larger + "の方が大きい）\n\n【ポイント】\n・2つの円グラフの比較は割合ではなく金額で比較\n・総額が異なるため、同じ割合でも金額は異なる";
    }
  },
  en: {
    // ⚠️ ここも「Administration の売上」になっていた。売上を持ちうる単位にする。
    departments: ["Retail", "Wholesale", "Online", "Export"],
    quarters: ["Q1", "Q2", "Q3", "Q4"],
    salesIntro: "The table below shows quarterly revenue by department.",
    salesAsk: function (d) { return "What is the total annual revenue of the " + d + " department?"; },
    salesExpLead: function (d) { return "Quarterly revenue of the " + d + " department:"; },
    money: function (n) { return String(n); },
    total: "Total",
    // table_sales_02
    products: ["Product A", "Product B", "Product C", "Product D"],
    years: ["2022", "2023", "2024"],
    sales2Intro: "The table below shows the annual number of units sold for each product.",
    sales2Ask: function (p, y1, y2) { return "What is the percentage change in units sold for " + p + " from " + y1 + " to " + y2 + "? (Round to the nearest whole number. Use a minus sign for a decrease.)"; },
    sales2ExpLead: function (p) { return "Units sold for " + p + ":"; },
    count: function (n) { return n + " units"; },
    sales2Rate: function (v2, v1, r) { return "Percentage change = (" + v2 + " - " + v1 + ") / " + v1 + " × 100 = " + r + "%"; },
    // table_composition_01
    // ⚠️ 英国の家計に「教育費」の費目は普通は立たない（公立が原則無償）。
    //    Education を Utilities（光熱・通信費）に替える。
    expenseScale: 100,
    priceScale: 1,
    expenseCats: ["Food", "Housing", "Transport", "Utilities", "Other"],
    comp1Header: function (total) { return "[Monthly Expenses] Total: £" + total.toLocaleString() + "\n\n"; },
    amountAsk: function (cat) { return "How much is spent on " + cat.toLowerCase() + " each month?"; },
    comp1Share: function (cat, pct) { return "Share of " + cat + ": " + pct + "%"; },
    comp1Calc: function (total, pct, amount) { return "Amount = £" + total.toLocaleString() + " × " + pct + "/100 = £" + amount.toLocaleString(); },
    // table_max_01
    // ⚠️ 英語版は英国の都市・英国の気温にする。日本の都市名と26℃の7月は
    //    英国の読み手には現実感が無く、ネイティブレビューで指摘された箇所。
    tempBase: [6, 10, 19, 13],
    cities: [
      { name: "London",     offset: [0, 0, 0, 0] },
      { name: "Bristol",    offset: [0, 0, -1, 0] },
      { name: "Cardiff",    offset: [0, 0, -1, 0] },
      { name: "Plymouth",   offset: [1, 1, -1, 1] },
      { name: "Birmingham", offset: [-1, -1, -2, -1] },
      { name: "Manchester", offset: [-1, -1, -2, -1] },
      { name: "Leeds",      offset: [-1, -1, -2, -1] },
      { name: "Newcastle",  offset: [-2, -2, -3, -2] },
      { name: "Glasgow",    offset: [-2, -2, -3, -2] },
      { name: "Edinburgh",  offset: [-2, -3, -4, -2] }
    ],
    tempMonths: ["January", "April", "July", "October"],
    max1Intro: "The table below shows the average monthly temperature in each city.",
    max1Ask: function (m) { return "Which city has the highest average temperature in " + m + "?"; },
    max1ExpLead: function (m) { return "Temperatures in " + m + ":"; },
    temp: function (n) { return n + "°C"; },
    max1ExpEnd: function (city, val) { return "The highest is " + city + " at " + val + "°C."; },
    // table_diff_01
    stores: ["Store A", "Store B", "Store C", "Store D"],
    storeMonths: ["April", "May", "June", "July", "August"],
    diff1Intro: "The table below shows monthly revenue for each store.",
    diff1Ask: function (s) { return "What was the largest month-on-month change in revenue at " + s + "?\nUse a minus sign if the change was a fall."; },
    diff1ExpLead: function (s) { return "Month-over-month revenue changes for " + s + ":"; },
    signedMoney: function (d) { return (d >= 0 ? "+" : "") + d; },
    diff1ExpEnd: function (m) { return "Largest change: " + m + " at "; },
    // chart_bar_01
    // ⚠️ 「Administration に売上がある」は英語圏の読み手には意味が通らない
    //    （管理部門は費用側で、売上を持たない）。ネイティブレビューの指摘。
    //    売上を持ちうる単位＝支店・地域・事業部だけにする。
    //    支店名も日本の都市ではなく英国の都市にする。
    barDeptSets: [
      { names: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow"], word: "branch" },
      { names: ["North", "South", "East", "West", "Central"], word: "region" },
      { names: ["Division A", "Division B", "Division C", "Division D"], word: "division" }
    ],
    bar1Title: function (w) { return "Revenue by " + w.charAt(0).toUpperCase() + w.slice(1) + " (FY2024)"; },
    revenueLabel: "Revenue",
    revenueAxis: "Revenue (£000s)",
    bar1Text: function (w) { return "The chart below shows the annual revenue of each " + w + ".\n\nWhat is the difference between the highest and the lowest revenue?"; },
    bar1Exp: function (maxLabel, maxVal, minLabel, minVal, diff) {
      return "**How to approach it**\nRead the highest and lowest values from the bar chart and find the difference.\n\n**Working**\n1. Highest: " + maxLabel + " = " + maxVal + "\n2. Lowest: " + minLabel + " = " + minVal + "\n3. Difference = " + maxVal + " - " + minVal + " = " + diff + "\n\n**Tip**\n- Compare the bars by height\n- Difference = highest − lowest";
    },
    // chart_bar_compare_01
    barCmpTitle: "Revenue by Product",
    prevYear: "Last Year",
    thisYear: "This Year",
    barCmpText: "The chart below shows last year's and this year's revenue for each product.\n\nWhat is the largest increase in revenue from last year among the products?",
    barCmpDetail: function (label, prev, curr, d) { return label + ": " + prev + " → " + curr + " (" + (d >= 0 ? "+" : "") + d + ")"; },
    barCmpExp: function (details, maxLabel, maxIncrease) {
      return "**How to approach it**\nFor each product, compute this year minus last year and find the largest increase.\n\n**Working**\nIncrease for each product:\n" + details + "\n\nLargest increase: " + maxLabel + " at +" + maxIncrease + "\n\n**Tip**\n- Compare the paired bars for each product\n- Increase = this year's value − last year's value";
    },
    // chart_line_01
    lineMonths: ["April", "May", "June", "July", "August", "September"],
    lineTitle: "Monthly Revenue",
    lineText: "The chart below shows the monthly revenue of a store.\n\nWhat was the largest month-on-month change in revenue?\nUse a minus sign if the change was a fall.",
    lineExp: function (details, maxMonth, signed) {
      return "**How to approach it**\nCompute the change for each month-to-month interval and find the one with the largest absolute value.\n\n**Working**\nChanges between months:\n" + details + "\n\nLargest absolute change: " + maxMonth + " at " + signed + "\n\n**Tip**\n- A steeper line segment means a larger change\n- Mind the direction of the change (plus/minus)";
    },
    // chart_pie_01
    pie1Title: function (total) { return "Monthly Expenses (Total: £" + total.toLocaleString() + ")"; },
    pie1Label: "Expenses",
    pie1Intro: function (total) { return "The pie chart below shows the breakdown of monthly expenses (total £" + total.toLocaleString() + ")."; },
    pie1Exp: function (cat, pct, total, amount) {
      return "**How to approach it**\nRead the share from the pie chart and multiply it by the total.\n\n**Working**\n1. Share of " + cat + ": " + pct + "%\n2. Amount = £" + total.toLocaleString() + " × " + pct + " / 100\n  = £" + amount.toLocaleString() + "\n\n**Tip**\n- Each slice represents a share of the whole\n- Amount = total × share(%) / 100";
    },
    // chart_pie_compare_01
    // ⚠️ Labour は英国綴り。East/West Japan は英国向けに North/South にする。
    costCats: ["Labour", "Materials", "Advertising", "Other"],
    pieCmpNameSets: [["Division A", "Division B"], ["North Region", "South Region"], ["First Half", "Second Half"]],
    pieCmpTitle: "Expense Breakdown (£000s)",
    // en は円グラフ上のサブタイトルも語彙で持つ（Canvas に描かれるため）。
    // _base.js の drawMultiPieChart が ds.subtitle を優先して描く。
    pieSubtitle: function (name, total) { return name + " (total " + total.toLocaleString() + ")"; },
    // ⚠️ 数値だけ出すと単位が分からない。図の表題（£000s）を読まないと
    //    金額の桁が決まらないので、設問文の側にも1文で明示する。
    pieCmpIntro: function (n0, t0, n1, t1) { return "The two pie charts below show the expense breakdown of " + n0 + " (total " + t0.toLocaleString() + ") and " + n1 + " (total " + t1.toLocaleString() + "). All figures are in £000s."; },
    // ⚠️ 比較の相手は「上半期/下半期」とは限らず、Division A/B や North/South のこともある。
    //    "between the two halves" と固定すると、3組中2組で設問が図と食い違う。
    pieCmpAsk: function (cat, n0, n1) { return "What is the difference in spending on " + cat.toLowerCase() + " between " + n0 + " and " + n1 + "?"; },
    // --- table_share_01 ---
    shareRows: ["Domestic", "International", "Corporate", "Consumer"],
    shareCol: "Annual revenue",
    shareIntro: "The table below shows the annual revenue of each business area.",
    shareAsk: function (r) { return "What percentage of total revenue comes from " + r + "?"; },
    shareExp: function (r, v, total, pct) {
      return "**How to approach it**\nDivide the figure for that area by the total for all areas.\n\n**Working**\n1. Revenue from " + r + ": " + v.toLocaleString() + "\n2. Total revenue: " + total.toLocaleString() + "\n3. Share = " + v.toLocaleString() + " / " + total.toLocaleString() + " × 100 = " + pct + "%\n\n**Tip**\n- The denominator is the total of every row, not one of them\n- Add the column up before you divide";
    },
    // --- table_ratio_01 ---
    ratioIntro: "The table below shows the annual revenue of each store.",
    // ⚠️ 最初 "...is how many times the revenue of B?" と書いていたが、
    //    独立に解かせた検証で「日本語の直訳調で、英国の試験では見ない語順」と指摘された。
    //    2つ目の "the revenue of" を "that of" に受けるのが英語の普通の書き方。
    //    ⚠️ "how many times greater" は使わない。2倍を「2 times greater」と読むか
    //       「3倍」と読むかで割れる、英語圏でも有名な曖昧表現。
    ratioAsk: function (a, b) { return "The revenue of " + a + " is how many times that of " + b + "?"; },
    ratioExp: function (a, va, b, vb, k) {
      return "**How to approach it**\nDivide by the store you are comparing against (" + b + ").\n\n**Working**\n1. " + a + ": " + va.toLocaleString() + "\n2. " + b + ": " + vb.toLocaleString() + "\n3. " + va.toLocaleString() + " / " + vb.toLocaleString() + " = " + k + "\n\n**Tip**\n- Divide the figure named first in the question by the figure named second, in that order\n- The question asks for a ratio, not a difference";
    },
    // --- table_per_unit_01 ---
    unitPriceCols: ["Units sold", "Revenue (£)"],
    unitPriceIntro: "The table below shows the number of units sold and the revenue for each product.",
    unitPriceAsk: function (p) { return "What is the average price per unit for " + p + "?"; },
    unitPriceExp: function (p, units, rev, price) {
      return "**How to approach it**\nDivide the revenue by the number of units sold.\n\n**Working**\n1. Revenue for " + p + ": £" + rev.toLocaleString() + "\n2. Units sold for " + p + ": " + units.toLocaleString() + "\n3. Price per unit = " + rev.toLocaleString() + " / " + units.toLocaleString() + " = £" + price.toLocaleString() + "\n\n**Tip**\n- \u201cPer unit\u201d always means a division. Check which figure goes on top\n- A large revenue does not mean a high price if many units were sold";
    },
    // --- table_index_01 ---
    indexIntro: "The table below shows how revenue changed for each product.",
    indexAsk: function (p, y0, y1) { return "Taking " + y0 + " as 100, what is the index for " + p + " in " + y1 + "?"; },
    indexExp: function (p, y0, v0, y1, v1, idx) {
      return "**How to approach it**\nAn index sets the base year to 100. Divide by the base year and multiply by 100.\n\n**Working**\n1. " + p + " in " + y0 + ": " + v0.toLocaleString() + " (this is 100)\n2. " + p + " in " + y1 + ": " + v1.toLocaleString() + "\n3. Index = " + v1.toLocaleString() + " / " + v0.toLocaleString() + " × 100 = " + idx + "\n\n**Tip**\n- An index of 100 means no change from the base year\n- An index on its own tells you nothing about the actual amount";
    },
    // --- table_forecast_01 ---
    forecastIntro: "The table below shows the revenue of each product.",
    forecastAsk: function (p, y1, y2, y3) { return "If " + p + " grows from " + y2 + " to " + y3 + " at the same percentage rate as from " + y1 + " to " + y2 + ", what will its revenue be in " + y3 + "?"; },
    forecastExp: function (p, y1, v1, y2, v2, rate, y3, v3) {
      return "**How to approach it**\nFind the growth rate first, then apply it to the latest figure. Do not add the increase again.\n\n**Working**\n1. Growth rate = (" + v2.toLocaleString() + " - " + v1.toLocaleString() + ") / " + v1.toLocaleString() + " × 100 = " + rate + "%\n2. " + y3 + " = " + v2.toLocaleString() + " × (1 + " + rate + "/100) = " + v3.toLocaleString() + "\n\n**Tip**\n- Apply the rate, do not add the same increase again\n  (adding it would give " + (v2 + (v2 - v1)).toLocaleString() + ", which is wrong)\n- The starting figure is larger, so the same rate gives a larger increase";
    },
    // --- table_growth_rate_01 ---
    growthIntro: "The table below shows how revenue changed for each product.",
    growthAsk: function (y1, y2) { return "Which product had the highest percentage growth in revenue from " + y1 + " to " + y2 + "?"; },
    growthLine: function (p, v1, v2, inc, pct) {
      return p + ": " + pct + "% (" + v1.toLocaleString() + " to " + v2.toLocaleString() + ", an increase of " + inc.toLocaleString() + ")";
    },
    growthExp: function (lines, best, bestPct, absName, absInc) {
      return "**How to approach it**\nGrowth is the increase divided by the starting value. It is not the same as the size of the increase.\n\n**Working**\nGrowth for each product:\n" + lines + "\n\nThe highest growth is " + best + " at " + bestPct + "%.\n\n**Tip**\n- The largest increase in absolute terms is " + absName + " (" + absInc.toLocaleString() + "), which is a different product\n- The smaller the starting value, the higher the growth for the same increase";
    },
    pieCmpExp: function (p) {
      return "**How to approach it**\nCompute each amount from its share and total, then find the difference.\n\n**Working**\n1. " + p.cat + " for " + p.n0 + ": " + p.t0.toLocaleString() + " × " + p.p0 + "% = " + p.a0 + "\n2. " + p.cat + " for " + p.n1 + ": " + p.t1.toLocaleString() + " × " + p.p1 + "% = " + p.a1 + "\n3. Difference = |" + p.a0 + " - " + p.a1 + "| = " + p.diff + "\n  (" + p.larger + " is larger)\n\n**Tip**\n- Compare amounts, not shares\n- The totals differ, so the same share means a different amount";
    }
  }
};

// カテゴリ9: 図表の読み取り・資料解釈
// ============================================================
(function() {
  // 行の並びを毎回変える。
  //
  // ⚠️ これは**偏り対策ではない**（最初そう書いたが誤りだった）。
  //    この下の6本は値の割り当て自体が行ごとにランダムなので、
  //    並びを固定しても正解の位置は一様なまま。実際、並びを固定する変異を
  //    当ててもどの検査も落ちなかった（2026-09-07）。
  //    効いているのは見た目だけ——同じ順に並んだ表を繰り返し見せないこと。
  //    ⚠️ 偏りが問題になるのは、値が行（＝ラベル）に固定されている型。
  //       table_max_01 は都市ごとに気候差が固定されているのでそちら側で対処してある
  //       （都市プールから毎回5つ選ぶ）。並べ替えだけでは足りなかった。
  function shuffleRows(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // 合計100になる整数の割合を n 個作る（各要素は lo〜hi）。
  // ⚠️ 端数を出さないため、割合を先に決めて金額をあとから作る。
  function pickShares(n, lo, hi) {
    for (var t = 0; t < 200; t++) {
      var out = [], rest = 100, ok = true;
      for (var i = 0; i < n - 1; i++) {
        var cap = Math.min(hi, rest - lo * (n - 1 - i));
        if (cap < lo) { ok = false; break; }
        var v = lo + Math.floor(Math.random() * (cap - lo + 1));
        out.push(v); rest -= v;
      }
      if (!ok) continue;
      if (rest < lo || rest > hi) continue;
      out.push(rest);
      return out;
    }
    // 作れなかったときは均等割り（n が 100 を割り切らない場合は端数を先頭へ）
    var base = Math.floor(100 / n), even = [];
    for (var k = 0; k < n; k++) even.push(base);
    even[0] += 100 - base * n;
    return even;
  }

  QUESTION_TEMPLATES.push({
    id: "table_sales_01",
    // ⚠️ 英語化が済んだ印。test/english.spec.js はこの宣言があるものだけを
    //    英語で生成して検査する。引数に lang を足しただけでは宣言しない。
    i18n: true,
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "table",
    tableGenerator: function(lang) {
      // ⚠️ 表のラベルと設問文は言語で引く。この型は templateText を持たないので、
      //    他の分野と同じ「テンプレート文字列を訳す」方式が使えない。
      //    語彙を表に出し、lang で選ぶ形にした（2026-09-07）。
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var departments = L.departments;
      var quarters = L.quarters;
      var data = {};
      departments.forEach(function(dept) {
        data[dept] = {};
        quarters.forEach(function(q) {
          data[dept][q] = (Math.floor(Math.random() * 40) + 10) * 10;
        });
      });
      return { rows: departments, cols: quarters, data: data, unit: "万円" };
    },
    questionGenerator: function(tableData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var dept = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var total = 0;
      tableData.cols.forEach(function(q) {
        total += tableData.data[dept][q];
      });
      return {
        text: L.salesIntro + "\n\n" + formatTable(tableData, lang) + "\n\n" + L.salesAsk(dept),
        answer: total,
        unit: "万円",
        explanation: L.salesExpLead(dept) + "\n" + tableData.cols.map(function(q) {
          return q + ": " + L.money(tableData.data[dept][q]);
        }).join("\n") + "\n\n" + L.total + " = " + L.money(total)
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "table_sales_02",
    i18n: true,
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function(lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var products = L.products;
      var years = L.years;
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
    // ⚠️ 設問に「減少ならマイナス」を明記している。
    //    2026-08-26 に利用者から報告があった（他の増減系では符号の指示があるのに
    //    この問題には無い、という指摘）。実測すると正解が負になるのは 33.7%（3000回中1012件）。
    //    符号の指示が無いと、減少のとき利用者が絶対値で答えて不正解になる。
    questionGenerator: function(tableData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var product = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var cols = tableData.cols;
      var val1 = tableData.data[product][cols[0]];
      var val2 = tableData.data[product][cols[cols.length - 1]];
      var changeRate = Math.round((val2 - val1) / val1 * 100);
      return {
        text: L.sales2Intro + "\n\n" + formatTable(tableData, lang) + "\n\n" + L.sales2Ask(product, cols[0], cols[cols.length - 1]),
        answer: changeRate,
        unit: "%",
        explanation: L.sales2ExpLead(product) + "\n" + cols[0] + ": " + L.count(val1) + "\n" + cols[cols.length - 1] + ": " + L.count(val2) + "\n\n" + L.sales2Rate(val2, val1, changeRate)
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  QUESTION_TEMPLATES.push({
    id: "table_composition_01",
    i18n: true,
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function(lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var categories = L.expenseCats;
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
      var totalAmount = (Math.floor(Math.random() * 20) + 20) * L.expenseScale;
      return { categories: categories, percentages: data, totalAmount: totalAmount };
    },
    questionGenerator: function(tableData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var cat = tableData.categories[Math.floor(Math.random() * (tableData.categories.length - 1))];
      var pct = tableData.percentages[cat];
      var amount = Math.round(tableData.totalAmount * pct / 100);
      var tableStr = L.comp1Header(tableData.totalAmount);
      tableData.categories.forEach(function(c) {
        tableStr += c + ": " + tableData.percentages[c] + "%\n";
      });
      return {
        text: tableStr + "\n" + L.amountAsk(cat),
        answer: amount,
        unit: "円",
        explanation: L.comp1Share(cat, pct) + "\n\n" + L.comp1Calc(tableData.totalAmount, pct, amount)
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "table_max_01",
    i18n: true,
    formats: ["webtesting", "testcenter"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "table",
    tableGenerator: function(lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      // ⚠️ 並び順を混ぜるだけでは足りない。気候差は都市に固定されているので、
      //    5都市を毎回全部出すと「いちばん暖かい都市」が同じ答えに偏る
      //    （福岡41%・実測2,000回）。**どの5都市を出すかを毎回選び直す。**
      var pool = L.cities.slice();
      for (var sh = pool.length - 1; sh > 0; sh--) {
        var sw = Math.floor(Math.random() * (sh + 1));
        var tmp = pool[sh]; pool[sh] = pool[sw]; pool[sw] = tmp;
      }
      var citySpecs = pool.slice(0, 5);
      var cities = citySpecs.map(function (c) { return c.name; });
      var months = L.tempMonths;
      var data = {};
      // 基準はその言語圏の代表都市の平年値。offset を足して気候差を出す。
      var base = L.tempBase;
      citySpecs.forEach(function(spec) {
        data[spec.name] = {};
        months.forEach(function(m, i) {
          data[spec.name][m] = base[i] + spec.offset[i] + Math.floor(Math.random() * 5) - 2;
        });
      });
      return { rows: cities, cols: months, data: data, unit: "℃" };
    },
    questionGenerator: function(tableData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var month = tableData.cols[Math.floor(Math.random() * tableData.cols.length)];

      // ⚠️ 同点だと「最も高い都市」が2つ以上になり、正解が複数ある問題になる。
      //    気温は8通りしかないので同点は珍しくなく、実測で28.2%がそうだった。
      //    さらに元の実装は > で先頭優先に拾っていたため、同点のたびに
      //    表の上の都市が勝ち、正解の位置が [27,23,19,16,15]% と前に偏っていた
      //    （「最後の選択肢は選ばない」で当たりやすくなる）。
      //    同点のときは勝者を無作為に選び、その都市だけ1つ上げて一意にする。
      //    表はこのあと組み立てるので、表示と答えはずれない。
      var tiedMax = -Infinity;
      tableData.rows.forEach(function(city) {
        if (tableData.data[city][month] > tiedMax) tiedMax = tableData.data[city][month];
      });
      var tied = tableData.rows.filter(function(city) {
        return tableData.data[city][month] === tiedMax;
      });
      if (tied.length > 1) {
        var winner = tied[Math.floor(Math.random() * tied.length)];
        tableData.data[winner][month] = tiedMax + 1;
      }

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
        text: L.max1Intro + "\n\n" + formatTable(tableData, lang) + "\n\n" + L.max1Ask(month),
        answer: maxCity,
        choices: choices,
        explanation: L.max1ExpLead(month) + "\n" + tableData.rows.map(function(city) {
          return city + ": " + L.temp(tableData.data[city][month]);
        }).join("\n") + "\n\n" + L.max1ExpEnd(maxCity, maxVal)
      };
    },
    answerType: "choice",
    timeLimitSec: 90
  });

  QUESTION_TEMPLATES.push({
    id: "table_diff_01",
    i18n: true,
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function(lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var stores = L.stores;
      var months = L.storeMonths;
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
    questionGenerator: function(tableData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var store = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var cols = tableData.cols;
      // ⚠️ 絶対値が同じ差が2つあると、正解が2つになる（+70 と -70 の両方が
      //    「絶対値が最大の変化」を満たす）。以前は先に見つけたほうを正解にして
      //    いたため、**もう一方を答えた人が不当に不正解になっていた**。
      //    実測で2,000問中401件（20.1%）がこの状態だった（2026-09-07）。
      //    タイが起きたら、その差を1つずらして一意にする。
      // ⚠️ 絶対値が同じ変化が2つあると「絶対値が最大の変化」を両方が満たし、
      //    正解が2つになる。以前は先に見つけたほうだけを正解にしていたため、
      //    もう一方を答えた人が不当に不正解になっていた（実測20.1%）。
      //
      //    ⚠️ 「ずらして消えるまで繰り返す」も試したが、収束しないことがある
      //       （差が0のとき+10ずらすと、最大が10なら新しいタイを作る。
      //        8回で抜けるとタイのまま出る）。**確実な作り方に変える。**
      //    最大にする1つを先に決め、他の差はその絶対値より必ず小さくする。
      // ⚠️ 差の列を先に決め、そこから値を組み立てる。値を先に決めて差を見る形だと、
      //    下限（50未満にしない）の補正が差を変えてしまい、タイが復活する
      //    （20,000問中16件残った。2026-09-07に実測）。
      var pickIdx = Math.floor(Math.random() * (cols.length - 1));
      var peak = (Math.floor(Math.random() * 4) + 5) * 10;        // 50〜80
      if (Math.random() < 0.5) peak = -peak;
      var steps = [];
      for (var s1 = 0; s1 < cols.length - 1; s1++) {
        if (s1 === pickIdx) { steps.push(peak); continue; }
        var lim = Math.floor((Math.abs(peak) - 10) / 10);
        steps.push((Math.floor(Math.random() * (lim * 2 + 1)) - lim) * 10);
      }
      // 差を固定したまま、全体を持ち上げて最小値が下限を割らないようにする。
      var run = [0], acc = 0;
      for (var s2 = 0; s2 < steps.length; s2++) { acc += steps[s2]; run.push(acc); }
      var lowest = Math.min.apply(null, run);
      var base = 100 - lowest;                       // 最小が100になるよう底上げ
      var vals = run.map(function (v) { return v + base; });
      for (var s4 = 0; s4 < cols.length; s4++) {
        tableData.data[store][cols[s4]] = vals[s4];
      }
      var diffs = [];
      for (var s3 = 1; s3 < cols.length; s3++) {
        diffs.push(tableData.data[store][cols[s3]] - tableData.data[store][cols[s3-1]]);
      }

      var maxDiff = 0;
      var maxMonth = "";
      for (var i3 = 0; i3 < diffs.length; i3++) {
        if (Math.abs(diffs[i3]) > Math.abs(maxDiff)) {
          maxDiff = diffs[i3];
          maxMonth = cols[i3] + "→" + cols[i3 + 1];
        }
      }
      return {
        text: L.diff1Intro + "\n\n" + formatTable(tableData, lang) + "\n\n" + L.diff1Ask(store),
        answer: maxDiff,
        unit: "万円",
        explanation: L.diff1ExpLead(store) + "\n" + (function() {
          var lines = [];
          for (var i = 1; i < cols.length; i++) {
            var d = tableData.data[store][cols[i]] - tableData.data[store][cols[i-1]];
            lines.push(cols[i-1] + "→" + cols[i] + ": " + L.signedMoney(d));
          }
          return lines.join("\n");
        })() + "\n\n" + L.diff1ExpEnd(maxMonth) + L.signedMoney(maxDiff)
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  // --- グラフ問題 ---
  // ⚠️ グラフのタイトル・軸ラベル・凡例・サブタイトルは chartConfig に入り、
  //    _base.js の draw*Chart が Canvas に描く。問題文（text）には出てこないが
  //    画面には出るので、これらも語彙で引く。test/english.spec.js が
  //    chartConfig の文字列も検査する。

  // chart_bar_01: 棒グラフ（単一系列）- 合計/差額
  QUESTION_TEMPLATES.push({
    id: "chart_bar_01",
    i18n: true,
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "chart",
    chartGenerator: function(lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var sets = L.barDeptSets;
      var chosen = sets[Math.floor(Math.random() * sets.length)];
      var labels = chosen.names;
      var word = chosen.word;
      var data = labels.map(function() {
        return (Math.floor(Math.random() * 40) + 10) * 10;
      });
      return {
        chartType: "bar",
        title: L.bar1Title(word),
        // ⚠️ 設問文でも同じ呼び名を使う必要があるので、chartConfig に載せて渡す。
        //    ここが無いと「東京支店」のグラフに「各部門の」という設問が付く。
        labelWord: word,
        labels: labels,
        datasets: [{ label: L.revenueLabel, data: data, color: "#4285f4" }],
        unit: "万円",
        yAxisLabel: L.revenueAxis
      };
    },
    questionGenerator: function(chartData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var data = chartData.datasets[0].data;
      var labels = chartData.labels;
      var maxVal = Math.max.apply(null, data);
      var minVal = Math.min.apply(null, data);
      var diff = maxVal - minVal;
      var maxLabel = labels[data.indexOf(maxVal)];
      var minLabel = labels[data.indexOf(minVal)];

      return {
        text: L.bar1Text(chartData.labelWord),
        answer: diff,
        unit: "万円",
        explanation: L.bar1Exp(maxLabel, maxVal, minLabel, minVal, diff),
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  // chart_bar_compare_01: 棒グラフ（2系列比較）- 前年比増加額
  QUESTION_TEMPLATES.push({
    id: "chart_bar_compare_01",
    i18n: true,
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "chart",
    chartGenerator: function(lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var labels = L.products;
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
        title: L.barCmpTitle,
        labels: labels,
        datasets: [
          { label: L.prevYear, data: prevData, color: "#90caf9" },
          { label: L.thisYear, data: currData, color: "#1565c0" }
        ],
        unit: "万円",
        yAxisLabel: L.revenueAxis
      };
    },
    questionGenerator: function(chartData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
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
        return L.barCmpDetail(label, prevData[i], currData[i], diff);
      }).join("\n");

      return {
        text: L.barCmpText,
        answer: maxIncrease,
        unit: "万円",
        explanation: L.barCmpExp(details, labels[maxIdx], maxIncrease),
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  // chart_line_01: 折れ線グラフ - 最大変動期間
  QUESTION_TEMPLATES.push({
    id: "chart_line_01",
    i18n: true,
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "chart",
    chartGenerator: function(lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var labels = L.lineMonths;
      var base = (Math.floor(Math.random() * 20) + 20) * 10;
      var data = [base];
      for (var i = 1; i < labels.length; i++) {
        var change = (Math.floor(Math.random() * 10) - 4) * 10;
        data.push(Math.max(50, data[i - 1] + change));
      }
      return {
        chartType: "line",
        title: L.lineTitle,
        labels: labels,
        datasets: [{ label: L.revenueLabel, data: data, color: "#4285f4" }],
        unit: "万円",
        yAxisLabel: L.revenueAxis
      };
    },
    questionGenerator: function(chartData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var data = chartData.datasets[0].data;
      var labels = chartData.labels;

      // ⚠️ table_diff_01 と同じバグ。絶対値が同じ変化が2つあると正解が2つになり、
      //    もう一方を答えた人が不当に不正解になる（実測37.3%）。
      //    ずらして直す方式は収束しないので、**差の列を先に決めて値を組み立てる**。
      var pickIdx = Math.floor(Math.random() * (data.length - 1));
      var peak = (Math.floor(Math.random() * 4) + 5) * 10;
      if (Math.random() < 0.5) peak = -peak;
      var steps = [];
      for (var s1 = 0; s1 < data.length - 1; s1++) {
        if (s1 === pickIdx) { steps.push(peak); continue; }
        var lim = Math.floor((Math.abs(peak) - 10) / 10);
        steps.push((Math.floor(Math.random() * (lim * 2 + 1)) - lim) * 10);
      }
      var run = [0], acc = 0;
      for (var s2 = 0; s2 < steps.length; s2++) { acc += steps[s2]; run.push(acc); }
      var lowest = Math.min.apply(null, run);
      for (var s3 = 0; s3 < data.length; s3++) data[s3] = run[s3] - lowest + 150;

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
        details.push(labels[j - 1] + "→" + labels[j] + ": " + L.signedMoney(d));
      }

      return {
        text: L.lineText,
        answer: maxDiffVal,
        unit: "万円",
        explanation: L.lineExp(details.join("\n"), maxMonth, L.signedMoney(maxDiffVal)),
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  // chart_pie_01: 円グラフ - 構成比から実数算出
  QUESTION_TEMPLATES.push({
    id: "chart_pie_01",
    i18n: true,
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "chart",
    chartGenerator: function(lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var categories = L.expenseCats;
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
      var totalAmount = (Math.floor(Math.random() * 15) + 25) * L.expenseScale;
      return {
        chartType: "pie",
        title: L.pie1Title(totalAmount),
        labels: categories,
        datasets: [{ label: L.pie1Label, data: pcts }],
        unit: "%",
        totalAmount: totalAmount
      };
    },
    questionGenerator: function(chartData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var categories = chartData.labels;
      var pcts = chartData.datasets[0].data;
      var totalAmount = chartData.totalAmount;

      var idx = Math.floor(Math.random() * (categories.length - 1));
      var cat = categories[idx];
      var pct = pcts[idx];
      var amount = Math.round(totalAmount * pct / 100);

      return {
        text: L.pie1Intro(totalAmount) + "\n\n" + L.amountAsk(cat),
        answer: amount,
        unit: "円",
        explanation: L.pie1Exp(cat, pct, totalAmount, amount),
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  // chart_pie_compare_01: 2つの円グラフ比較
  // ============================================================
  // 追加の4本（2026-09-07）
  // ============================================================
  // ⚠️ なぜ足したか: 英語版 /en/ は図表10本だけで組んでいるので、
  //    15問の試験を作ると**100%のセットで同じテンプレートが2回出る**
  //    （実測2,000セット）。日本語は103本あるので20問でも0%。
  //    「同じ問題が再び出ない」がこのサービスの中核価値なので、
  //    英語側でそれが崩れているのは看過できない。
  //
  // ⚠️ 既存10本の「推論の型」は 合計 / 変化率 / 割合→金額 / 最大 /
  //    最大変化 / 差 の6種類しかない。見た目を変えただけの水増しはしない。
  //    実際の numerical reasoning で頻出なのに無かった4型を足す。

  // 金額 → 全体に占める割合。既存 table_composition_01 の逆向き。
  QUESTION_TEMPLATES.push({
    id: "table_share_01",
    i18n: true,
    // ⚠️ テストセンターは選択式なので、数値入力の型は webtesting だけに出す。
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function (lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var rows = shuffleRows(L.shareRows.slice());
      // ⚠️ 割合を先に決めてから金額を作る。金額から割合を出すと端数が出て、
      //    「四捨五入するとどちらとも取れる」答えになる。
      var pcts = pickShares(rows.length, 12, 40);
      var total = (Math.floor(Math.random() * 16) + 10) * 100;   // 1,000〜2,500（100の倍数）
      var data = {};
      rows.forEach(function (r, i) {
        data[r] = {};
        data[r][L.shareCol] = total * pcts[i] / 100;
      });
      return { rows: rows, cols: [L.shareCol], data: data, unit: "万円", _pcts: pcts, _total: total };
    },
    questionGenerator: function (tableData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var i = Math.floor(Math.random() * tableData.rows.length);
      var row = tableData.rows[i];
      var pct = tableData._pcts[i];
      var val = tableData.data[row][tableData.cols[0]];
      return {
        text: L.shareIntro + "\n\n" + formatTable(tableData, lang) + "\n\n" + L.shareAsk(row),
        answer: pct,
        unit: "%",
        explanation: L.shareExp(row, val, tableData._total, pct)
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  // 何倍か。差ではなく比を問う型は既存に無かった。
  QUESTION_TEMPLATES.push({
    id: "table_ratio_01",
    i18n: true,
    // ⚠️ テストセンターは選択式なので、数値入力の型は webtesting だけに出す。
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "table",
    tableGenerator: function (lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var rows = shuffleRows(L.stores.slice());
      // ⚠️ 倍率を先に決め、割り切れる値を作る。値から倍率を出すと
      //    2.3333... のような答えになり、四捨五入の指示が要る問題になる。
      var ks = [1.5, 2, 2.5, 3, 3.5, 4];
      var k = ks[Math.floor(Math.random() * ks.length)];
      var base = (Math.floor(Math.random() * 29) + 12) * 10;      // 120〜400（10の倍数）
      var ai = Math.floor(Math.random() * rows.length);
      var bi = (ai + 1 + Math.floor(Math.random() * (rows.length - 1))) % rows.length;
      // ⚠️ 埋め草の行は値が重複しうる（同じ売上の店が2つ並ぶことがある）。
      //    この設問は2店を名指しで比べるので答えは一意で、問題は起きない。
      //    **ただしこの表生成器に「最も大きいのはどこか」型を足すと同点問題になる。**
      //    独立検証で指摘された潜在的な危険なので、ここに残しておく
      //    （足すときは値の重複を禁止すること）。
      var data = {};
      rows.forEach(function (r) {
        data[r] = {};
        data[r][L.shareCol] = (Math.floor(Math.random() * 60) + 15) * 10;
      });
      data[rows[bi]][L.shareCol] = base;
      data[rows[ai]][L.shareCol] = base * k;
      return { rows: rows, cols: [L.shareCol], data: data, unit: "万円", _a: rows[ai], _b: rows[bi], _k: k };
    },
    questionGenerator: function (tableData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var col = tableData.cols[0];
      var va = tableData.data[tableData._a][col];
      var vb = tableData.data[tableData._b][col];
      return {
        text: L.ratioIntro + "\n\n" + formatTable(tableData, lang) + "\n\n" + L.ratioAsk(tableData._a, tableData._b),
        answer: tableData._k,
        unit: "倍",
        explanation: L.ratioExp(tableData._a, va, tableData._b, vb, tableData._k)
      };
    },
    answerType: "number",
    timeLimitSec: 90
  });

  // 1個あたりの単価。「〜あたり」の割り算は既存に無かった。
  QUESTION_TEMPLATES.push({
    id: "table_per_unit_01",
    i18n: true,
    // ⚠️ テストセンターは選択式なので、数値入力の型は webtesting だけに出す。
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function (lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var rows = shuffleRows(L.products.slice());
      var cols = L.unitPriceCols;
      var data = {};
      var priceOf = {};
      rows.forEach(function (r) {
        // ⚠️ 単価は言語ごとの桁で作る（日本は円、英国は£で100倍違う）
        var price = (Math.floor(Math.random() * 13) + 3) * L.priceScale;
        var units = (Math.floor(Math.random() * 27) + 4) * 50;    // 200〜1,500
        priceOf[r] = price;
        data[r] = {};
        data[r][cols[0]] = units;
        data[r][cols[1]] = price * units;
      });
      // ⚠️ 単位の注記は出さない。列ごとに単位が違うので、
      //    表の下に1つだけ出すと必ずどちらかが嘘になる（見出しに入れてある）。
      return { rows: rows, cols: cols, data: data, unit: "", _price: priceOf };
    },
    questionGenerator: function (tableData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var row = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var units = tableData.data[row][tableData.cols[0]];
      var rev = tableData.data[row][tableData.cols[1]];
      var price = tableData._price[row];
      return {
        text: L.unitPriceIntro + "\n\n" + formatTable(tableData, lang) + "\n\n" + L.unitPriceAsk(row),
        answer: price,
        unit: "円",
        explanation: L.unitPriceExp(row, units, rev, price)
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  // 基準年を100とした指数。実額と指数を混同させる型で、実際の試験に頻出。
  QUESTION_TEMPLATES.push({
    id: "table_index_01",
    i18n: true,
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function (lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var rows = shuffleRows(L.products.slice());
      var years = [L.years[0], L.years[L.years.length - 1]];
      var data = {}, idxOf = {};
      rows.forEach(function (r) {
        // ⚠️ 指数を先に決め、そこから後年の値を作る。値から指数を出すと
        //    端数が出て「四捨五入するとどちらとも取れる」答えになる。
        //    基準値を100の倍数にしてあるので、整数の指数なら必ず割り切れる。
        var base = (Math.floor(Math.random() * 18) + 3) * 100;      // 300〜2,000
        var idx = Math.floor(Math.random() * 121) + 60;             // 60〜180
        if (idx === 100) idx = 101;                                  // 変化なしは問いにならない
        idxOf[r] = idx;
        data[r] = {};
        data[r][years[0]] = base;
        data[r][years[1]] = base * idx / 100;
      });
      return { rows: rows, cols: years, data: data, unit: "万円", _idx: idxOf };
    },
    questionGenerator: function (tableData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var row = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var y0 = tableData.cols[0], y1 = tableData.cols[1];
      return {
        text: L.indexIntro + "\n\n" + formatTable(tableData, lang) + "\n\n" + L.indexAsk(row, y0, y1),
        answer: tableData._idx[row],
        unit: "",
        explanation: L.indexExp(row, y0, tableData.data[row][y0], y1, tableData.data[row][y1], tableData._idx[row])
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  // 同じ増加率で伸びたら。
  // ⚠️ この型の値打ちは「増加額を足す」誤りを誘うところにある。
  //    解説で誤答（額を足した値）を名指しで否定している。
  QUESTION_TEMPLATES.push({
    id: "table_forecast_01",
    i18n: true,
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 3,
    type: "table",
    tableGenerator: function (lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var rows = shuffleRows(L.products.slice());
      // ⚠️ 増加率は 10/20/30/40/50 に限る。基準値が100の倍数なら
      //    (1+r/100)^2 を掛けても必ず整数になる（1.21 / 1.44 / 1.69 / 1.96 / 2.25）。
      //    ここを広げると翌年の値に端数が出て、答えが割り切れない問題になる。
      var rates = [10, 20, 30, 40, 50];
      // ⚠️ 年の表記は言語で違う（ja は "2023年"）。数値に直して +1 すると NaN になる。
      //    実際 ja で「NaNも伸びるとすると」という問題文を出した。
      //    語彙が持っている3年目をそのまま使う。
      var years = [L.years[0], L.years[1], L.years[2]];
      var data = {}, rateOf = {};
      rows.forEach(function (r) {
        var base = (Math.floor(Math.random() * 16) + 5) * 100;       // 500〜2,000
        var rate = rates[Math.floor(Math.random() * rates.length)];
        rateOf[r] = rate;
        data[r] = {};
        data[r][years[0]] = base;
        data[r][years[1]] = base * (100 + rate) / 100;
      });
      return { rows: rows, cols: [years[0], years[1]], data: data, unit: "万円",
               _rate: rateOf, _next: years[2] };
    },
    questionGenerator: function (tableData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var row = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var y1 = tableData.cols[0], y2 = tableData.cols[1], y3 = tableData._next;
      var v1 = tableData.data[row][y1], v2 = tableData.data[row][y2];
      var rate = tableData._rate[row];
      var v3 = v2 * (100 + rate) / 100;
      return {
        text: L.forecastIntro + "\n\n" + formatTable(tableData, lang) + "\n\n" + L.forecastAsk(row, y1, y2, y3),
        answer: v3,
        unit: "万円",
        explanation: L.forecastExp(row, y1, v1, y2, v2, rate, y3, v3)
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  // 伸び率が最も高いのはどれか。
  // ⚠️ この型の値打ちは「増加額の1位と伸び率の1位が違う」ことにある。
  //    実際の試験でいちばん狙われる引っかけなので、**必ず違うように作る**。
  QUESTION_TEMPLATES.push({
    id: "table_growth_rate_01",
    i18n: true,
    formats: ["webtesting", "testcenter"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 3,
    type: "table",
    tableGenerator: function (lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var rows = shuffleRows(L.products.slice());
      var years = [L.years[0], L.years[L.years.length - 1]];
      var data = null, info = null;
      // ⚠️ 条件（伸び率1位 ≠ 増加額1位・どちらも同点なし）を満たすまで作り直す。
      //    「作ってからずらして直す」は table_diff_01 で失敗した手なので取らない。
      for (var t = 0; t < 200 && !info; t++) {
        var bases = [], pcts = [], used = {}, usedP = {};
        var okDraw = true;
        for (var i = 0; i < rows.length; i++) {
          var b = (Math.floor(Math.random() * 18) + 3) * 100;      // 300〜2,000（100の倍数）
          var pc = Math.floor(Math.random() * 56) + 5;              // 5〜60%
          if (used[b] || usedP[pc]) { okDraw = false; break; }
          used[b] = 1; usedP[pc] = 1;
          bases.push(b); pcts.push(pc);
        }
        if (!okDraw) continue;
        var incs = bases.map(function (b, i2) { return b * pcts[i2] / 100; });
        if (incs.some(function (v) { return v !== Math.round(v); })) continue;
        var uniqInc = {}, dupInc = false;
        incs.forEach(function (v) { if (uniqInc[v]) dupInc = true; uniqInc[v] = 1; });
        if (dupInc) continue;
        var bestPct = pcts.indexOf(Math.max.apply(null, pcts));
        var bestInc = incs.indexOf(Math.max.apply(null, incs));
        if (bestPct === bestInc) continue;
        data = {};
        rows.forEach(function (r, i3) {
          data[r] = {};
          data[r][years[0]] = bases[i3];
          data[r][years[1]] = bases[i3] + incs[i3];
        });
        info = { bases: bases, pcts: pcts, incs: incs, bestPct: bestPct, bestInc: bestInc };
      }
      if (!info) return null;
      return { rows: rows, cols: years, data: data, unit: "万円", _info: info };
    },
    questionGenerator: function (tableData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var f = tableData._info;
      var y1 = tableData.cols[0], y2 = tableData.cols[1];
      var lines = tableData.rows.map(function (r, i) {
        return L.growthLine(r, f.bases[i], f.bases[i] + f.incs[i], f.incs[i], f.pcts[i]);
      }).join("\n");
      return {
        text: L.growthIntro + "\n\n" + formatTable(tableData, lang) + "\n\n" + L.growthAsk(y1, y2),
        answer: tableData.rows[f.bestPct],
        choices: tableData.rows.slice(),
        explanation: L.growthExp(lines, tableData.rows[f.bestPct], f.pcts[f.bestPct],
                                 tableData.rows[f.bestInc], f.incs[f.bestInc])
      };
    },
    answerType: "choice",
    timeLimitSec: 180
  });

  QUESTION_TEMPLATES.push({
    id: "chart_pie_compare_01",
    i18n: true,
    formats: ["webtesting"],
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 3,
    type: "chart",
    chartGenerator: function(lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
      var categories = L.costCats;
      var totals = [
        (Math.floor(Math.random() * 10) + 30) * 100,
        (Math.floor(Math.random() * 10) + 25) * 100
      ];
      var deptNames = L.pieCmpNameSets;
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
        var ds = { label: name, data: pcts, total: totals[di] };
        // ⚠️ ja は subtitle を持たせない（drawMultiPieChart が従来どおり
        //    「A部門（計 3,200万円）」を組み立てるので、chartConfig を変えない）。
        //    en だけ語彙から与え、描画側は subtitle があれば優先する。
        if (L.pieSubtitle) ds.subtitle = L.pieSubtitle(name, totals[di]);
        return ds;
      });
      return {
        chartType: "pie",
        title: L.pieCmpTitle,
        labels: categories,
        datasets: datasets,
        unit: "万円"
      };
    },
    questionGenerator: function(chartData, lang) {
      var L = ZUHYO_WORDS[lang === "en" ? "en" : "ja"];
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
        text: L.pieCmpIntro(ds0.label, ds0.total, ds1.label, ds1.total) + "\n\n" + L.pieCmpAsk(cat, ds0.label, ds1.label),
        answer: diff,
        unit: "万円",
        explanation: L.pieCmpExp({
          cat: cat,
          n0: ds0.label, t0: ds0.total, p0: ds0.data[idx], a0: amount0,
          n1: ds1.label, t1: ds1.total, p1: ds1.data[idx], a1: amount1,
          diff: diff, larger: larger
        }),
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 180
  });

})();
