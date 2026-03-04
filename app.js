// ============================================================
// SPI模擬試験 アプリケーション本体
// ============================================================

(function() {
  "use strict";

  // --- アナリティクス ---
  function trackEvent(eventName, params) {
    if (typeof gtag === "function") {
      gtag("event", eventName, params || {});
    }
  }

  // --- 誤り報告 ---
  var REPORT_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScTjYxpgdkzXOzY71vEcz4UieRPBsm3beXb1minuQcppyzvSA/viewform?usp=pp_url";

  function openReportForm(questionIndex) {
    var q = state.questions[questionIndex];
    if (!q) return;
    var textPreview = (q.text || "").substring(0, 80).replace(/\n/g, " ");
    var url = REPORT_FORM_URL
      + "&entry.240180991=" + encodeURIComponent(q.id || "")
      + "&entry.1915913824=" + encodeURIComponent(textPreview)
      + "&entry.1095101906=" + encodeURIComponent(q.category || "");
    window.open(url, "_blank");
  }

  // --- SNSシェア ---
  function shareOnX() {
    var totalCorrect = 0;
    var totalQuestions = state.questions.length;
    state.questions.forEach(function(q) { if (q.correct) totalCorrect++; });
    var percent = Math.round((totalCorrect / totalQuestions) * 100);
    var text = "SPI非言語 模擬試験で " + percent + "% (" + totalCorrect + "/" + totalQuestions + "問正解) でした！"
      + "\n無料・登録不要で何度でも練習できる"
      + "\n#SPI #就活 #WEBテスティング";
    var url = "https://anebane.github.io/spi-practice/";
    window.open(
      "https://x.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url),
      "_blank"
    );
    trackEvent("share_x", { score_percent: percent });
  }

  // --- 状態管理 ---
  var state = {
    questions: [],
    currentIndex: 0,
    answers: [],       // { userAnswer, isCorrect, timeSpent, skipped }
    mode: "exam",      // "exam" | "practice"
    totalTimeSec: 0,
    totalTimeRemaining: 0,
    questionTimeRemaining: 0,
    questionTimeLimit: 0,
    questionStartTime: 0,
    timerInterval: null,
    isPracticeWaiting: false,  // 練習モードで解説表示中
    isPeeking: false           // 解説プレビュー中（タイマー一時停止）
  };

  // --- DOM参照 ---
  var screens = {
    start: document.getElementById("screen-start"),
    exam: document.getElementById("screen-exam"),
    result: document.getElementById("screen-result"),
    review: document.getElementById("screen-review")
  };

  // --- 画面切り替え ---
  function showScreen(name) {
    for (var key in screens) {
      screens[key].classList.remove("active");
    }
    screens[name].classList.add("active");
    window.scrollTo(0, 0);
  }

  // --- スタート画面の設定 ---
  function setupStartScreen() {
    // config-btn のトグル
    document.querySelectorAll(".config-options").forEach(function(group) {
      group.querySelectorAll(".config-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
          group.querySelectorAll(".config-btn").forEach(function(b) {
            b.classList.remove("active");
          });
          btn.classList.add("active");
        });
      });
    });

    // すべて選択/解除
    document.getElementById("select-all").addEventListener("click", function() {
      document.querySelectorAll("#category-select input").forEach(function(cb) {
        cb.checked = true;
      });
    });
    document.getElementById("deselect-all").addEventListener("click", function() {
      document.querySelectorAll("#category-select input").forEach(function(cb) {
        cb.checked = false;
      });
    });

    // 開始ボタン
    document.getElementById("btn-start").addEventListener("click", startExam);
  }

  // --- 試験開始 ---
  function startExam() {
    try {
    // 設定の読み取り
    var questionCount = parseInt(document.querySelector("#question-count .config-btn.active").dataset.value);
    var mode = document.querySelector("#exam-mode .config-btn.active").dataset.value;

    var selectedDifficulties = [];
    document.querySelectorAll("#difficulty-select input:checked").forEach(function(cb) {
      selectedDifficulties.push(parseInt(cb.value));
    });

    var selectedCategories = [];
    document.querySelectorAll("#category-select input:checked").forEach(function(cb) {
      selectedCategories.push(parseInt(cb.value));
    });

    if (selectedCategories.length === 0) {
      alert("少なくとも1つの分野を選択してください。");
      return;
    }

    if (selectedDifficulties.length === 0) {
      alert("少なくとも1つの難易度を選択してください。");
      return;
    }

    // 問題生成
    state.questions = QuestionGenerator.generateExamSet({
      totalQuestions: questionCount,
      selectedCategories: selectedCategories,
      selectedDifficulties: selectedDifficulties
    });

    if (state.questions.length === 0) {
      alert("問題を生成できませんでした。設定を変更してください。");
      return;
    }

    state.currentIndex = 0;
    state.answers = [];
    state.mode = mode;
    state.isPracticeWaiting = false;

    // 全体制限時間: 1問あたり60秒 × 問題数
    state.totalTimeSec = state.questions.length * 60;
    state.totalTimeRemaining = state.totalTimeSec;

    trackEvent("exam_start", {
      question_count: state.questions.length,
      mode: state.mode,
      difficulties: selectedDifficulties.join(","),
      categories: selectedCategories.join(",")
    });
    showScreen("exam");
    showQuestion(0);
    startTimer();
    } catch(e) {
      alert("エラーが発生しました: " + e.message);
      console.error(e);
    }
  }

  // --- タイマー ---
  function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);

    state.timerInterval = setInterval(function() {
      if (state.isPracticeWaiting || state.isPeeking) return; // 解説表示中はカウントしない

      // 全体タイマー
      state.totalTimeRemaining--;
      updateTotalTimerDisplay();

      if (state.totalTimeRemaining <= 0) {
        clearInterval(state.timerInterval);
        finishExam();
        return;
      }

      // 問題別タイマー
      state.questionTimeRemaining--;
      updateQuestionTimerDisplay();

      if (state.questionTimeRemaining <= 0) {
        // 時間切れ → 自動スキップ
        var tq = state.questions[state.currentIndex];
        trackEvent("question_timeout", { question_id: tq.id, category: tq.category, difficulty: tq.difficulty });
        recordAnswer(null, true);
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function updateTotalTimerDisplay() {
    var el = document.getElementById("total-timer");
    var min = Math.floor(state.totalTimeRemaining / 60);
    var sec = state.totalTimeRemaining % 60;
    el.textContent = "残り時間 " + pad2(min) + ":" + pad2(sec);

    el.classList.remove("warning", "danger");
    if (state.totalTimeRemaining <= 60) {
      el.classList.add("danger");
    } else if (state.totalTimeRemaining <= 180) {
      el.classList.add("warning");
    }
  }

  function updateQuestionTimerDisplay() {
    var fill = document.getElementById("question-timer-fill");
    var ratio = Math.max(0, state.questionTimeRemaining / state.questionTimeLimit);
    fill.style.width = (ratio * 100) + "%";

    fill.classList.remove("warning", "danger");
    if (ratio <= 0.25) {
      fill.classList.add("danger");
    } else if (ratio <= 0.5) {
      fill.classList.add("warning");
    }
  }

  // --- 問題表示 ---
  function showQuestion(index) {
    var q = state.questions[index];
    if (!q) return;

    state.currentIndex = index;
    state.isPracticeWaiting = false;
    state.isPeeking = false;
    document.getElementById("peek-overlay").style.display = "none";

    // メタ情報
    document.getElementById("question-category").textContent = "分野: " + q.category;
    var diffEl = document.getElementById("question-difficulty");
    diffEl.textContent = "難易度: " + difficultyLabel(q.difficulty);
    diffEl.className = "question-difficulty diff-" + q.difficulty;
    document.getElementById("question-number").textContent = "問題 " + (index + 1) + " / " + state.questions.length;
    document.getElementById("progress-display").textContent = (index + 1) + " / " + state.questions.length;

    // 問題文
    var contentEl = document.getElementById("question-content");
    // チャート問題の場合はCanvas描画
    if (q.chartConfig) {
      contentEl.innerHTML = escapeHtml(q.text);
      var canvas = document.createElement("canvas");
      canvas.className = "question-chart-canvas";
      contentEl.appendChild(canvas);
      drawQuestionChart(canvas, q.chartConfig);
    } else {
      // Markdownテーブルの簡易HTML変換
      contentEl.innerHTML = renderQuestionText(q.text);
    }

    // 回答エリア
    renderAnswerArea(q);

    // 問題別タイマー
    state.questionTimeLimit = q.timeLimitSec;
    state.questionTimeRemaining = q.timeLimitSec;
    state.questionStartTime = Date.now();
    var fill = document.getElementById("question-timer-fill");
    fill.style.width = "100%";
    fill.classList.remove("warning", "danger");

    // 練習モード: フィードバック非表示
    document.getElementById("practice-feedback").style.display = "none";

    // ボタンテキスト更新
    var btnAnswer = document.getElementById("btn-answer");
    btnAnswer.textContent = "回答して次へ";
    btnAnswer.disabled = false;
    document.getElementById("btn-skip").style.display = "";
    document.getElementById("btn-peek").style.display = "";
  }

  function renderQuestionText(text) {
    // Markdownテーブルの検出と変換
    if (text.indexOf("|") !== -1 && text.indexOf("---|") !== -1) {
      var lines = text.split("\n");
      var tableLines = [];
      var beforeTable = [];
      var afterTable = [];
      var inTable = false;
      var tableEnded = false;

      lines.forEach(function(line) {
        if (!tableEnded && line.trim().indexOf("|") === 0) {
          inTable = true;
          tableLines.push(line);
        } else if (inTable && line.trim() === "") {
          tableEnded = true;
          afterTable.push(line);
        } else if (!inTable) {
          beforeTable.push(line);
        } else {
          if (line.indexOf("（単位") !== -1) {
            afterTable.push(line);
          } else {
            afterTable.push(line);
          }
        }
      });

      var html = escapeHtml(beforeTable.join("\n"));
      if (tableLines.length > 0) {
        html += markdownTableToHtml(tableLines);
      }
      html += escapeHtml(afterTable.join("\n"));
      return html;
    }

    return escapeHtml(text);
  }

  function markdownTableToHtml(lines) {
    // セパレータ行を除去
    var dataLines = lines.filter(function(l) {
      return !/^\|[\s\-:]+\|/.test(l.replace(/[^|\-:\s]/g, ""));
    });
    // もう少し正確に: ---を含む行を除外
    dataLines = lines.filter(function(l) {
      var cells = l.split("|").filter(function(c) { return c.trim() !== ""; });
      var allDashes = cells.every(function(c) { return /^[\s\-:]+$/.test(c); });
      return !allDashes;
    });

    if (dataLines.length === 0) return "";

    var html = '<table>';
    dataLines.forEach(function(line, rowIdx) {
      html += '<tr>';
      var cells = line.split("|").filter(function(c, i, arr) {
        // 最初と最後の空セルを除外
        return !(i === 0 && c.trim() === "") && !(i === arr.length - 1 && c.trim() === "");
      });
      cells.forEach(function(cell) {
        var tag = rowIdx === 0 ? 'th' : 'td';
        html += '<' + tag + '>' + escapeHtml(cell.trim()) + '</' + tag + '>';
      });
      html += '</tr>';
    });
    html += '</table>';
    return html;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }

  // --- 回答エリアの描画 ---
  function renderAnswerArea(q) {
    var area = document.getElementById("answer-area");

    if (q.answerType === "choice") {
      var html = '<div class="choice-list">';
      q.choices.forEach(function(choice, i) {
        html += '<label class="choice-item" data-index="' + i + '">';
        html += '<input type="radio" name="answer" value="' + i + '">';
        html += '<span>' + escapeHtml(choice) + '</span>';
        html += '</label>';
      });
      html += '</div>';
      area.innerHTML = html;

      // 選択肢のクリックイベント
      area.querySelectorAll(".choice-item").forEach(function(item) {
        item.addEventListener("click", function() {
          area.querySelectorAll(".choice-item").forEach(function(ci) {
            ci.classList.remove("selected");
          });
          item.classList.add("selected");
          item.querySelector("input").checked = true;
        });
      });

    } else if (q.answerType === "fraction") {
      area.innerHTML =
        '<label>回答</label>' +
        '<div class="fraction-input">' +
        '<input type="number" id="answer-numerator" placeholder="分子">' +
        '<span class="fraction-slash">/</span>' +
        '<input type="number" id="answer-denominator" placeholder="分母">' +
        '</div>';

    } else {
      // number
      area.innerHTML =
        '<label>回答</label>' +
        '<div class="answer-input">' +
        '<input type="number" id="answer-value" step="any" placeholder="数値を入力">' +
        '<span class="answer-unit">' + escapeHtml(q.unit) + '</span>' +
        '</div>';

      // Enter キーで回答
      setTimeout(function() {
        var input = document.getElementById("answer-value");
        if (input) {
          input.focus();
          input.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
              document.getElementById("btn-answer").click();
            }
          });
        }
      }, 100);
    }
  }

  // --- 回答の取得 ---
  function getUserAnswer() {
    var q = state.questions[state.currentIndex];

    if (q.answerType === "choice") {
      var selected = document.querySelector('#answer-area input[name="answer"]:checked');
      if (!selected) return null;
      return parseInt(selected.value);

    } else if (q.answerType === "fraction") {
      var num = document.getElementById("answer-numerator");
      var den = document.getElementById("answer-denominator");
      if (!num || !den || num.value === "" || den.value === "") return null;
      return { numerator: parseInt(num.value), denominator: parseInt(den.value) };

    } else {
      var input = document.getElementById("answer-value");
      if (!input || input.value === "") return null;
      return parseFloat(input.value);
    }
  }

  // --- 回答判定 ---
  function checkAnswer(userAnswer, correctAnswer, answerType) {
    if (userAnswer === null) return false;

    if (answerType === "choice") {
      return userAnswer === correctAnswer;
    }

    if (answerType === "fraction") {
      if (!userAnswer || !correctAnswer) return false;
      // 約分して比較
      var uGcd = gcd(Math.abs(userAnswer.numerator), Math.abs(userAnswer.denominator));
      var cGcd = gcd(Math.abs(correctAnswer.numerator), Math.abs(correctAnswer.denominator));
      return (userAnswer.numerator / uGcd === correctAnswer.numerator / cGcd) &&
             (userAnswer.denominator / uGcd === correctAnswer.denominator / cGcd);
    }

    // number
    return Math.abs(userAnswer - correctAnswer) < 0.15;
  }

  // --- 回答記録 ---
  function recordAnswer(userAnswer, skipped) {
    var q = state.questions[state.currentIndex];
    var timeSpent = Math.round((Date.now() - state.questionStartTime) / 1000);
    var isCorrect = skipped ? false : checkAnswer(userAnswer, q.correctAnswer, q.answerType);

    state.answers[state.currentIndex] = {
      userAnswer: userAnswer,
      isCorrect: isCorrect,
      timeSpent: timeSpent,
      skipped: !!skipped
    };

    trackEvent("question_answer", {
      question_id: q.id,
      category: q.category,
      difficulty: q.difficulty,
      is_correct: isCorrect,
      time_spent: timeSpent,
      skipped: !!skipped
    });

    // 練習モード: フィードバック表示
    if (state.mode === "practice") {
      showPracticeFeedback(q, userAnswer, isCorrect, skipped);
      return;
    }

    // 次の問題へ
    moveToNext();
  }

  function showPracticeFeedback(q, userAnswer, isCorrect, skipped) {
    state.isPracticeWaiting = true;

    var feedbackDiv = document.getElementById("practice-feedback");
    feedbackDiv.style.display = "block";

    var resultDiv = document.getElementById("feedback-result");
    if (skipped) {
      resultDiv.className = "feedback-result incorrect";
      resultDiv.textContent = "スキップしました。正解: " + formatAnswer(q.correctAnswer, q);
    } else if (isCorrect) {
      resultDiv.className = "feedback-result correct";
      resultDiv.textContent = "正解!";
    } else {
      resultDiv.className = "feedback-result incorrect";
      resultDiv.textContent = "不正解。あなたの回答: " + formatAnswer(userAnswer, q) + "  正解: " + formatAnswer(q.correctAnswer, q);
    }

    document.getElementById("feedback-explanation").textContent = q.explanation;

    // ボタンを「次へ」に変更
    var btnAnswer = document.getElementById("btn-answer");
    btnAnswer.textContent = "次の問題へ";
    document.getElementById("btn-skip").style.display = "none";

    // スクロール
    feedbackDiv.scrollIntoView({ behavior: "smooth" });
  }

  // --- 解説プレビュー（一時停止） ---
  function peekExplanation() {
    if (state.isPracticeWaiting || state.isPeeking) return;

    var q = state.questions[state.currentIndex];
    state.isPeeking = true;
    trackEvent("peek_explanation", { question_id: q.id, category: q.category, difficulty: q.difficulty });

    // 正解と解説を表示
    document.getElementById("peek-correct-answer").textContent = "正解: " + formatAnswer(q.correctAnswer, q);
    document.getElementById("peek-explanation").textContent = q.explanation;
    document.getElementById("peek-overlay").style.display = "";

    // 回答ボタン等を無効化
    document.getElementById("btn-answer").disabled = true;
    document.getElementById("btn-skip").style.display = "none";
    document.getElementById("btn-peek").style.display = "none";
  }

  function closePeekAndNext() {
    state.isPeeking = false;
    document.getElementById("peek-overlay").style.display = "none";

    // この問題は「解説を見た」として不正解扱いで記録
    var q = state.questions[state.currentIndex];
    var timeSpent = Math.round((Date.now() - state.questionStartTime) / 1000);
    state.answers[state.currentIndex] = {
      userAnswer: null,
      isCorrect: false,
      timeSpent: timeSpent,
      skipped: false,
      peeked: true  // 解説を見たフラグ
    };

    moveToNext();
  }

  function moveToNext() {
    if (state.currentIndex + 1 >= state.questions.length) {
      finishExam();
    } else {
      showQuestion(state.currentIndex + 1);
    }
  }

  // --- 回答のフォーマット ---
  function formatAnswer(answer, q) {
    if (answer === null || answer === undefined) return "未回答";

    if (q.answerType === "choice") {
      return q.choices[answer] || "不明";
    }
    if (q.answerType === "fraction") {
      return answer.numerator + "/" + answer.denominator;
    }
    return answer + (q.unit ? " " + q.unit : "");
  }

  // --- 試験終了 ---
  function finishExam() {
    stopTimer();

    // 未回答の問題を処理
    for (var i = 0; i < state.questions.length; i++) {
      if (!state.answers[i]) {
        state.answers[i] = {
          userAnswer: null,
          isCorrect: false,
          timeSpent: 0,
          skipped: true
        };
      }
    }

    showResults();
  }

  // --- 結果表示 ---
  function showResults() {
    showScreen("result");

    var totalCorrect = 0;
    var totalTime = 0;
    var byCategory = {};

    state.answers.forEach(function(a, i) {
      var q = state.questions[i];
      if (a.isCorrect) totalCorrect++;
      totalTime += a.timeSpent;

      if (!byCategory[q.category]) {
        byCategory[q.category] = { correct: 0, total: 0, totalTime: 0, categoryId: q.categoryId };
      }
      byCategory[q.category].total++;
      if (a.isCorrect) byCategory[q.category].correct++;
      byCategory[q.category].totalTime += a.timeSpent;
    });

    var totalQuestions = state.questions.length;
    var percent = Math.round(totalCorrect / totalQuestions * 100);
    trackEvent("exam_finish", {
      question_count: totalQuestions,
      correct_count: totalCorrect,
      score_percent: percent,
      mode: state.mode
    });

    // スコア表示
    document.getElementById("result-score").textContent = percent + "%";
    document.getElementById("result-detail").textContent = totalCorrect + " / " + totalQuestions + " 問正解";

    var min = Math.floor(totalTime / 60);
    var sec = totalTime % 60;
    document.getElementById("result-time").textContent = pad2(min) + ":" + pad2(sec);

    // スコアバー
    document.getElementById("score-bar").style.width = percent + "%";

    // 分野別成績
    var catResultsEl = document.getElementById("category-results");
    catResultsEl.innerHTML = "";
    var categoryScores = {};

    for (var cat in byCategory) {
      var data = byCategory[cat];
      var catPercent = Math.round(data.correct / data.total * 100);
      var avgTime = Math.round(data.totalTime / data.total);
      categoryScores[cat] = catPercent / 100;

      var row = document.createElement("div");
      row.className = "category-result-row";
      row.innerHTML =
        '<span class="cat-name">' + escapeHtml(cat) + '</span>' +
        '<div class="cat-bar-bg"><div class="cat-bar-fill" style="width:' + catPercent + '%"></div></div>' +
        '<span class="cat-score">' + data.correct + '/' + data.total + ' (' + catPercent + '%)  ' + avgTime + '秒/問</span>';
      catResultsEl.appendChild(row);
    }

    // レーダーチャート
    drawRadarChart(categoryScores);

    // ローカル保存
    saveResult({
      totalCorrect: totalCorrect,
      totalQuestions: totalQuestions,
      totalTime: totalTime,
      byCategory: byCategory
    });
  }

  // --- レーダーチャート ---
  function drawRadarChart(categoryScores) {
    var canvas = document.getElementById("radar-chart");
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;

    canvas.width = 400 * dpr;
    canvas.height = 400 * dpr;
    canvas.style.width = "400px";
    canvas.style.height = "400px";
    ctx.scale(dpr, dpr);

    var categories = Object.keys(categoryScores);
    var n = categories.length;

    if (n < 3) {
      // 3カテゴリ未満ならレーダーチャートは表示しない
      canvas.style.display = "none";
      return;
    }
    canvas.style.display = "";

    var centerX = 200;
    var centerY = 200;
    var radius = 140;

    ctx.clearRect(0, 0, 400, 400);

    // 背景グリッド
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach(function(r) {
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var angle = (2 * Math.PI / n) * i - Math.PI / 2;
        var x = centerX + radius * r * Math.cos(angle);
        var y = centerY + radius * r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 軸線
    for (var i = 0; i < n; i++) {
      var angle = (2 * Math.PI / n) * i - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // スコア多角形
    ctx.beginPath();
    categories.forEach(function(cat, i) {
      var score = categoryScores[cat];
      var angle = (2 * Math.PI / n) * i - Math.PI / 2;
      var x = centerX + radius * score * Math.cos(angle);
      var y = centerY + radius * score * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(26, 35, 126, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "rgba(26, 35, 126, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // ラベル
    ctx.fillStyle = "#333";
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    categories.forEach(function(cat, i) {
      var angle = (2 * Math.PI / n) * i - Math.PI / 2;
      var labelRadius = radius + 28;
      var x = centerX + labelRadius * Math.cos(angle);
      var y = centerY + labelRadius * Math.sin(angle);
      ctx.fillText(cat, x, y);
    });
  }

  // --- 解説画面 ---
  var reviewIndex = 0;

  function showReview() {
    trackEvent("review_start");
    showScreen("review");
    reviewIndex = 0;
    renderReviewList();
    showReviewQuestion(0);
  }

  function showReviewQuestion(index) {
    reviewIndex = index;
    var q = state.questions[index];
    var a = state.answers[index];

    document.getElementById("review-progress").textContent = "問題 " + (index + 1) + " / " + state.questions.length;

    // 正誤
    var resultEl = document.getElementById("review-result");
    var meta = "  分野: " + q.category + "  難易度: " + difficultyLabel(q.difficulty);
    if (a.peeked) {
      resultEl.className = "review-result skipped";
      resultEl.textContent = "解説を見た" + meta;
    } else if (a.skipped) {
      resultEl.className = "review-result skipped";
      resultEl.textContent = "未回答（スキップ）" + meta;
    } else if (a.isCorrect) {
      resultEl.className = "review-result correct";
      resultEl.textContent = "正解" + meta;
    } else {
      resultEl.className = "review-result incorrect";
      resultEl.textContent = "不正解" + meta;
    }

    // 問題文
    var reviewQuestionEl = document.getElementById("review-question");
    if (q.chartConfig) {
      reviewQuestionEl.innerHTML = escapeHtml(q.text);
      var reviewCanvas = document.createElement("canvas");
      reviewCanvas.className = "question-chart-canvas";
      reviewQuestionEl.appendChild(reviewCanvas);
      drawQuestionChart(reviewCanvas, q.chartConfig);
    } else {
      reviewQuestionEl.innerHTML = renderQuestionText(q.text);
    }

    // 回答
    var answerHtml =
      '<div class="your-answer">あなたの回答: ' + escapeHtml(formatAnswer(a.userAnswer, q)) + '</div>' +
      '<div class="correct-answer">正解: ' + escapeHtml(formatAnswer(q.correctAnswer, q)) + '</div>';
    document.getElementById("review-answer").innerHTML = answerHtml;

    // 解説
    document.getElementById("review-explanation").innerHTML = escapeHtml(q.explanation);

    // ナビゲーションのハイライト更新
    document.querySelectorAll("#review-list .review-list-item").forEach(function(item, i) {
      item.classList.toggle("current", i === index);
    });

    // ボタン状態
    document.getElementById("btn-review-prev").disabled = index === 0;
    document.getElementById("btn-review-next").disabled = index === state.questions.length - 1;
  }

  function renderReviewList() {
    var listEl = document.getElementById("review-list");
    listEl.innerHTML = "";

    state.questions.forEach(function(q, i) {
      var a = state.answers[i];
      var item = document.createElement("div");
      item.className = "review-list-item";
      if (a.peeked) item.classList.add("peeked");
      else if (a.skipped) item.classList.add("skipped");
      else if (a.isCorrect) item.classList.add("correct");
      else item.classList.add("incorrect");
      item.textContent = i + 1;
      item.addEventListener("click", function() {
        showReviewQuestion(i);
      });
      listEl.appendChild(item);
    });
  }

  // --- localStorage ---
  function saveResult(result) {
    try {
      var history = JSON.parse(localStorage.getItem("spi_history") || "[]");
      history.push({
        date: new Date().toISOString(),
        score: result.totalCorrect,
        total: result.totalQuestions,
        totalTime: result.totalTime
      });
      if (history.length > 50) history.shift();
      localStorage.setItem("spi_history", JSON.stringify(history));
    } catch (e) {
      // localStorage利用不可の場合は無視
    }
  }

  // --- ユーティリティ ---
  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function difficultyLabel(d) {
    if (d === 1) return "易";
    if (d === 3) return "難";
    return "中";
  }

  // --- イベントバインド ---
  function bindEvents() {
    // 回答ボタン
    document.getElementById("btn-answer").addEventListener("click", function() {
      if (state.isPracticeWaiting) {
        // 練習モード: 次の問題へ
        moveToNext();
        return;
      }

      var answer = getUserAnswer();
      if (answer === null) {
        // 未入力の場合確認
        if (!confirm("回答が入力されていません。スキップしますか？")) return;
        recordAnswer(null, true);
        return;
      }
      recordAnswer(answer, false);
    });

    // スキップボタン
    document.getElementById("btn-skip").addEventListener("click", function() {
      recordAnswer(null, true);
    });

    // 解説を見るボタン
    document.getElementById("btn-peek").addEventListener("click", peekExplanation);

    // 解説オーバーレイを閉じる
    document.getElementById("btn-peek-close").addEventListener("click", closePeekAndNext);
    document.getElementById("peek-backdrop").addEventListener("click", closePeekAndNext);

    // 結果画面ボタン
    document.getElementById("btn-review").addEventListener("click", showReview);

    document.getElementById("btn-retry").addEventListener("click", function() {
      trackEvent("retry_exam");
      startExam();
    });

    document.getElementById("btn-back").addEventListener("click", function() {
      var answered = state.answers.filter(function(a) { return a; }).length;
      if (answered > 0 && answered < state.questions.length) {
        trackEvent("exam_abandon", {
          questions_answered: answered,
          total_questions: state.questions.length,
          mode: state.mode
        });
      }
      stopTimer();
      showScreen("start");
    });

    // 解説画面ボタン
    document.getElementById("btn-review-back").addEventListener("click", function() {
      showScreen("result");
    });

    document.getElementById("btn-review-prev").addEventListener("click", function() {
      if (reviewIndex > 0) {
        trackEvent("review_navigate", { direction: "prev", question_index: reviewIndex - 1 });
        showReviewQuestion(reviewIndex - 1);
      }
    });

    document.getElementById("btn-review-next").addEventListener("click", function() {
      if (reviewIndex < state.questions.length - 1) {
        trackEvent("review_navigate", { direction: "next", question_index: reviewIndex + 1 });
        showReviewQuestion(reviewIndex + 1);
      }
    });

    // Xシェアボタン
    document.getElementById("btn-share-x").addEventListener("click", function() {
      shareOnX();
    });

    // 誤り報告ボタン
    document.getElementById("btn-report-error").addEventListener("click", function() {
      openReportForm(reviewIndex);
      trackEvent("report_error", { question_id: (state.questions[reviewIndex] || {}).id });
    });

    // FAQ開閉トラッキング
    document.querySelectorAll(".faq-item").forEach(function(item) {
      item.addEventListener("toggle", function() {
        if (item.open) {
          trackEvent("faq_open", { faq_question: item.querySelector("summary").textContent.trim().substring(0, 50) });
        }
      });
    });

    // キーボードショートカット（解説画面）
    document.addEventListener("keydown", function(e) {
      if (!screens.review.classList.contains("active")) return;
      if (e.key === "ArrowLeft" && reviewIndex > 0) {
        showReviewQuestion(reviewIndex - 1);
      } else if (e.key === "ArrowRight" && reviewIndex < state.questions.length - 1) {
        showReviewQuestion(reviewIndex + 1);
      }
    });
  }

  // --- 初期化 ---
  function init() {
    setupStartScreen();
    bindEvents();
    showScreen("start");
  }

  // DOM読み込み後に初期化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
