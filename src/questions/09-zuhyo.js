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
    expenseCats: ["食費", "住居費", "交通費", "教育費", "その他"],
    comp1Header: function (total) { return "【月間支出の内訳】 総額: " + total.toLocaleString() + "円\n\n"; },
    amountAsk: function (cat) { return cat + "の金額はいくらか。"; },
    comp1Share: function (cat, pct) { return cat + "の割合: " + pct + "%"; },
    comp1Calc: function (total, pct, amount) { return "金額 = " + total.toLocaleString() + " × " + pct + "/100 = " + amount.toLocaleString() + "円"; },
    // table_max_01（最大値）
    cities: ["東京", "大阪", "名古屋", "福岡", "札幌"],
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
    pieCmpExp: function (p) {
      return "【考え方】\n各円グラフの割合からそれぞれの金額を算出し、差を求めます。\n\n【解法】\n① " + p.n0 + "の" + p.cat + ": " + p.t0.toLocaleString() + " × " + p.p0 + "% = " + p.a0 + "万円\n② " + p.n1 + "の" + p.cat + ": " + p.t1.toLocaleString() + " × " + p.p1 + "% = " + p.a1 + "万円\n③ 差額 = |" + p.a0 + " - " + p.a1 + "| = " + p.diff + "万円\n  （" + p.larger + "の方が大きい）\n\n【ポイント】\n・2つの円グラフの比較は割合ではなく金額で比較\n・総額が異なるため、同じ割合でも金額は異なる";
    }
  },
  en: {
    departments: ["Sales", "Development", "Administration", "Planning"],
    quarters: ["Q1", "Q2", "Q3", "Q4"],
    salesIntro: "The table below shows quarterly revenue by department (in units of 10,000 yen).",
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
    expenseCats: ["Food", "Housing", "Transportation", "Education", "Other"],
    comp1Header: function (total) { return "[Monthly Expenses] Total: " + total.toLocaleString() + " yen\n\n"; },
    amountAsk: function (cat) { return "What is the amount for " + cat + "?"; },
    comp1Share: function (cat, pct) { return "Share of " + cat + ": " + pct + "%"; },
    comp1Calc: function (total, pct, amount) { return "Amount = " + total.toLocaleString() + " × " + pct + "/100 = " + amount.toLocaleString() + " yen"; },
    // table_max_01
    cities: ["Tokyo", "Osaka", "Nagoya", "Fukuoka", "Sapporo"],
    tempMonths: ["January", "April", "July", "October"],
    max1Intro: "The table below shows the average monthly temperature in each city.",
    max1Ask: function (m) { return "Which city has the highest average temperature in " + m + "?"; },
    max1ExpLead: function (m) { return "Temperatures in " + m + ":"; },
    temp: function (n) { return n + "°C"; },
    max1ExpEnd: function (city, val) { return "The highest is " + city + " at " + val + "°C."; },
    // table_diff_01
    stores: ["Store A", "Store B", "Store C", "Store D"],
    storeMonths: ["April", "May", "June", "July", "August"],
    diff1Intro: "The table below shows monthly revenue for each store (in units of 10,000 yen).",
    diff1Ask: function (s) { return "For " + s + ", what is the amount of the largest month-over-month revenue change (by absolute value)? (Use a plus sign for an increase and a minus sign for a decrease.)"; },
    diff1ExpLead: function (s) { return "Month-over-month revenue changes for " + s + ":"; },
    signedMoney: function (d) { return (d >= 0 ? "+" : "") + d; },
    diff1ExpEnd: function (m) { return "Largest change: " + m + " at "; },
    // chart_bar_01
    barDeptSets: [
      { names: ["Sales", "Development", "Administration", "Planning", "HR"], word: "department" },
      { names: ["Tokyo Branch", "Osaka Branch", "Nagoya Branch", "Fukuoka Branch", "Sapporo Branch"], word: "branch" },
      { names: ["Division A", "Division B", "Division C", "Division D"], word: "division" }
    ],
    bar1Title: function (w) { return "Revenue by " + w.charAt(0).toUpperCase() + w.slice(1) + " (FY2024)"; },
    revenueLabel: "Revenue",
    revenueAxis: "Revenue (×10,000 yen)",
    bar1Text: function (w) { return "The chart below shows the annual revenue of each " + w + " (in units of 10,000 yen).\n\nWhat is the difference between the highest and the lowest revenue?"; },
    bar1Exp: function (maxLabel, maxVal, minLabel, minVal, diff) {
      return "**How to approach it**\nRead the highest and lowest values from the bar chart and find the difference.\n\n**Working**\n1. Highest: " + maxLabel + " = " + maxVal + "\n2. Lowest: " + minLabel + " = " + minVal + "\n3. Difference = " + maxVal + " - " + minVal + " = " + diff + "\n\n**Tip**\n- Compare the bars by height\n- Difference = highest − lowest";
    },
    // chart_bar_compare_01
    barCmpTitle: "Revenue by Product",
    prevYear: "Last Year",
    thisYear: "This Year",
    barCmpText: "The chart below shows last year's and this year's revenue for each product (in units of 10,000 yen).\n\nWhat is the largest increase in revenue from last year among the products?",
    barCmpDetail: function (label, prev, curr, d) { return label + ": " + prev + " → " + curr + " (" + (d >= 0 ? "+" : "") + d + ")"; },
    barCmpExp: function (details, maxLabel, maxIncrease) {
      return "**How to approach it**\nFor each product, compute this year minus last year and find the largest increase.\n\n**Working**\nIncrease for each product:\n" + details + "\n\nLargest increase: " + maxLabel + " at +" + maxIncrease + "\n\n**Tip**\n- Compare the paired bars for each product\n- Increase = this year's value − last year's value";
    },
    // chart_line_01
    lineMonths: ["April", "May", "June", "July", "August", "September"],
    lineTitle: "Monthly Revenue",
    lineText: "The chart below shows the monthly revenue of a store (in units of 10,000 yen).\n\nWhat is the amount of the largest month-over-month change (by absolute value)? (Use a plus sign for an increase and a minus sign for a decrease.)",
    lineExp: function (details, maxMonth, signed) {
      return "**How to approach it**\nCompute the change for each month-to-month interval and find the one with the largest absolute value.\n\n**Working**\nChanges between months:\n" + details + "\n\nLargest absolute change: " + maxMonth + " at " + signed + "\n\n**Tip**\n- A steeper line segment means a larger change\n- Mind the direction of the change (plus/minus)";
    },
    // chart_pie_01
    pie1Title: function (total) { return "Monthly Expenses (Total: " + total.toLocaleString() + " yen)"; },
    pie1Label: "Expenses",
    pie1Intro: function (total) { return "The pie chart below shows the breakdown of monthly expenses (total " + total.toLocaleString() + " yen)."; },
    pie1Exp: function (cat, pct, total, amount) {
      return "**How to approach it**\nRead the share from the pie chart and multiply it by the total.\n\n**Working**\n1. Share of " + cat + ": " + pct + "%\n2. Amount = " + total.toLocaleString() + " × " + pct + " / 100\n  = " + amount.toLocaleString() + " yen\n\n**Tip**\n- Each slice represents a share of the whole\n- Amount = total × share(%) / 100";
    },
    // chart_pie_compare_01
    costCats: ["Labor", "Materials", "Advertising", "Other"],
    pieCmpNameSets: [["Division A", "Division B"], ["East Japan", "West Japan"], ["First Half", "Second Half"]],
    pieCmpTitle: "Expense Breakdown by Division (×10,000 yen)",
    // en は円グラフ上のサブタイトルも語彙で持つ（Canvas に描かれるため）。
    // _base.js の drawMultiPieChart が ds.subtitle を優先して描く。
    pieSubtitle: function (name, total) { return name + " (total " + total.toLocaleString() + ")"; },
    pieCmpIntro: function (n0, t0, n1, t1) { return "The two pie charts below show the expense breakdown of " + n0 + " (total " + t0.toLocaleString() + ") and " + n1 + " (total " + t1.toLocaleString() + "), in units of 10,000 yen."; },
    pieCmpAsk: function (cat) { return "What is the difference in the amount for " + cat + "?"; },
    pieCmpExp: function (p) {
      return "**How to approach it**\nCompute each amount from its share and total, then find the difference.\n\n**Working**\n1. " + p.cat + " for " + p.n0 + ": " + p.t0.toLocaleString() + " × " + p.p0 + "% = " + p.a0 + "\n2. " + p.cat + " for " + p.n1 + ": " + p.t1.toLocaleString() + " × " + p.p1 + "% = " + p.a1 + "\n3. Difference = |" + p.a0 + " - " + p.a1 + "| = " + p.diff + "\n  (" + p.larger + " is larger)\n\n**Tip**\n- Compare amounts, not shares\n- The totals differ, so the same share means a different amount";
    }
  }
};

// カテゴリ9: 図表の読み取り・資料解釈
// ============================================================
(function() {
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
      var totalAmount = (Math.floor(Math.random() * 20) + 20) * 10000;
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
      var cities = L.cities;
      var months = L.tempMonths;
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
      var totalAmount = (Math.floor(Math.random() * 15) + 25) * 10000;
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
        text: L.pieCmpIntro(ds0.label, ds0.total, ds1.label, ds1.total) + "\n\n" + L.pieCmpAsk(cat),
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
