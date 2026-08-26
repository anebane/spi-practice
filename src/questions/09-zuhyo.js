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
