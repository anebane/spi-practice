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
