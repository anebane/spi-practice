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

  // noteの記事へのリンク（フッター・運営者情報）。
  // ⚠️ transport_type: "beacon" が要る。別ドメインへ遷移するため、
  //    通常の送信だと遷移で中断されてクリックが記録されない。
  //    どのページから押されたかが分からないと、置き場所の良し悪しを判断できないので
  //    page_path を一緒に送る。
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a.js-note-link");
    if (!a) return;
    trackEvent("note_link_click", {
      page_path: location.pathname,
      transport_type: "beacon"
    });
  });

  // 解説ページが用意されている分野。ページが無い分野へリンクすると
  // 404になるので、ここに載っている分野だけ導線を出す。
  //
  // ⚠️ 一覧の実体は src/questions/_profile.js（出題プロファイル）が持つ。
  //    以前はここに13件を直書きしていたが、index.html のチェックボックスと
  //    二重に持つ形で、片方だけ直すと静かにずれた。出所を1つにした。
  var CATEGORY_PAGES = profileCategoryPages("spi");

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
    // 正誤は answers 側にある（{ userAnswer, isCorrect, timeSpent, skipped }）。
    // 以前は state.questions の q.correct を数えていたが、生成される問題に
    // correct というプロパティは存在しないので、**常に0%** になっていた。
    // 90%取った人がシェアしても「0% (0/20問正解)」と投稿される状態で、
    // シェアの動機を完全に潰していた。例外が出ないので気づけない類。
    state.answers.forEach(function(a) { if (a && a.isCorrect) totalCorrect++; });
    var percent = Math.round((totalCorrect / totalQuestions) * 100);
    var text = "SPI非言語 模擬試験で " + percent + "% (" + totalCorrect + "/" + totalQuestions + "問正解) でした！"
      + "\n無料・登録不要で何度でも練習できる"
      + "\n#SPI #就活 #WEBテスティング";
    var url = "https://tekisei-drill.com/";
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
    isPeeking: false,          // 解説プレビュー中（タイマー一時停止）
    finished: false,           // この試験はもう終了処理を走らせたか（多重実行の防止）
    abandonSent: false,        // この試験の離脱をもう報告したか（exam_id ごとに1回）
    examId: null               // exam_start と exam_finish を突き合わせるためのID
  };

  /**
   * 1回の試験を識別するID。
   *
   * ⚠️ GA4のカスタムディメンションに登録しないこと。
   * 値が毎回違う高カーディナリティの項目なので、登録しても「(other)」に
   * 丸められて集計に使えないうえ、カーディナリティの枠を食い潰す。
   * question_id で同じ失敗を一度している（recordAnswer のコメント参照）。
   * これは「開始と終了が1対1になっているか」を後から突き合わせるためだけの値。
   */
  /**
   * 試験の途中で画面を離れたことを記録する。
   *
   * それまで exam_abandon は「設定に戻る」ボタンでしか飛んでおらず、
   * タブを閉じて離れた人は何も残らなかった（完走率72%に対して離脱イベント0件）。
   * 「離脱したこと」は exam_start と exam_finish の差で分かるが、
   * 「どこで離脱したか」は分からない。この関数はそこだけを埋める。
   *
   * ⚠️ 分析するときの重複排除ルール（これを知らないと離脱率を過大に読む）
   *
   *   ・exam_id ごとに1回だけ送る。
   *   ・タブ切り替え（visibilitychange の hidden）は離脱とは限らない。
   *     戻ってきて完走すると、同じ exam_id に exam_abandon と exam_finish が
   *     両方残る。
   *   ・したがって離脱数は exam_abandon の件数ではない。
   *     exam_id を突き合わせ、exam_finish があるものは離脱として数えないこと。
   *   ・questions_answered は「そこまで進んだ」という意味に留める。
   *     離脱地点そのものではない（戻って続きを解いた場合がある）。
   *   ・trigger === "button" かつ questions_answered > 0 に絞ると、
   *     2026-08-28 以前の系列を再現できる。
   *
   * ⚠️ gtag の通常送信は離脱時に間に合わない（fetch/XHR が破棄される）。
   *    transport_type: "beacon" を付けて navigator.sendBeacon に載せる。
   */
  function reportAbandon(trigger) {
    if (!state.examId) return;              // 試験に入っていない、または既に離れた
    if (state.finished) return;             // 完走済み。exam_finish が出ている
    if (state.abandonSent) return;          // exam_id ごとに1回だけ
    if (!state.questions.length) return;
    state.abandonSent = true;
    trackEvent("exam_abandon", {
      exam_id: state.examId,
      questions_answered: state.answers.filter(function(a) { return a; }).length,
      total_questions: state.questions.length,
      mode: state.mode,
      trigger: trigger,
      transport_type: "beacon"
    });
  }

  function newExamId() {
    return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

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

    // 画面を離れたときの離脱記録。
    // pagehide はページから本当に離れるとき、visibilitychange の hidden は
    // タブを切り替えたときにも飛ぶ。iOS Safari では pagehide が飛ばないことが
    // あるので両方を張る。二重に飛ばないのは reportAbandon 側で保証している。
    window.addEventListener("pagehide", function() { reportAbandon("pagehide"); });
    document.addEventListener("visibilitychange", function() {
      if (document.visibilityState === "hidden") reportAbandon("hidden");
    });

    // 「対応分野」の見出しと一覧を、出題分野のチェックボックスから作る。
    // 数と分野名を手で書くと、分野を足したときにここだけ古くなる
    //（実際「10分野」と書きながら11分野を出題していた）。
    // 事実の出所はチェックボックス1箇所だけにする。
    (function fillCategorySummary() {
      var boxes = document.querySelectorAll("#category-select input");
      if (!boxes || !boxes.length) return;
      var names = [];
      Array.prototype.forEach.call(boxes, function(cb) {
        var t = cb.parentElement ? (cb.parentElement.textContent || "").trim() : "";
        if (t) names.push(t);
      });
      if (!names.length) return;
      var label = document.getElementById("categories-label");
      var list = document.getElementById("categories-list");
      if (label) label.textContent = "対応分野（" + names.length + "分野）";
      if (list) list.textContent = names.join(" / ");
    })();

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

    // 分野の選択が変わったら、?cat= の指定は利用者の意思で上書きされたとみなす
    document.querySelectorAll("#category-select input").forEach(function(cb) {
      cb.addEventListener("change", function() { paramCategoryId = null; });
    });

    // 開始ボタン
    // 分野別ページから「この分野だけ練習」で来たときに、
    // 対象分野だけを選択した状態で開始画面を出す。
    (function applyCategoryParam() {
      var m = location.search.match(/[?&]cat=(\d+)/);
      if (!m) return;
      var want = m[1];
      var boxes = document.querySelectorAll("#category-select input");
      var hit = false;
      boxes.forEach(function(cb) {
        var on = cb.value === want;
        cb.checked = on;
        if (on) hit = true;
      });
      // チェックボックスに無い分野が指定されることがある。
      // 語句の関係(12)は独立ページ /language/ から来るので、トップの選択欄には
      // 載せていない。ここで「全部チェックし直して終わり」にすると、
      // 利用者は「語句の関係の練習を始める」を押したのに非言語の模試を受ける
      // ことになる。画面上は正常に見えるので誰も気づけない（実際にそうなっていた）。
      //
      // 出題そのものはカテゴリIDで動くので、チェックボックスの有無とは関係なく
      // 指定を通せる。paramCategoryId に持って startExam で使う。
      var name;
      if (!hit) {
        boxes.forEach(function(cb) { cb.checked = true; });
        paramCategoryId = parseInt(want, 10);
        name = categoryNameById(paramCategoryId);
        if (!name) { paramCategoryId = null; return; }   // 実在しないIDは無視する
      } else {
        var box = document.querySelector("#category-select input[value='" + want + "']");
        name = box && box.parentElement ? box.parentElement.textContent.trim() : "";
      }

      var note = document.getElementById("category-param-note");
      if (note) {
        note.textContent = "「" + name + "」だけを出題する設定にしました。変更したい場合は下の出題分野から選び直せます。";
        note.style.display = "";
      }
      trackEvent("category_practice_start", { category_id: want });
    })();

    // startExam を直接渡すと click イベントが options として入ってくる。
    // いまは害が無いが、options を見るようになったので明示的に包む。
    // 試験画面に入っていれば、もう開始は済んでいる
    onPressOnce("btn-start", function () { return onScreen("exam"); }, function() { startExam(); });
  }

  // ?cat= で指定されたが、トップの出題分野チェックボックスには載せていない分野。
  // （語句の関係のように、独立ページから来るもの）
  // 利用者が分野の選択を触った時点で null に戻す。
  var paramCategoryId = null;

  /** カテゴリIDから分野名を引く。案内文の表示に使う。 */
  function categoryNameById(id) {
    for (var i = 0; i < QUESTION_TEMPLATES.length; i++) {
      if (QUESTION_TEMPLATES[i].categoryId === id) return QUESTION_TEMPLATES[i].category;
    }
    return "";
  }

  // --- 試験開始 ---
  // 「10問だけもう一度」で使う問題数。
  // 20問を解き終えた直後にもう20問は重い、という仮説に対する軽い口。
  var SHORT_RETRY_COUNT = 10;

  /**
   * @param {Object} [options] questionCount を渡すと画面の設定より優先する。
   *   「10問だけもう一度」用。設定そのものは変えないので、
   *   次に「もう一度挑戦する」を押せば元の問題数に戻る。
   */
  function startExam(options) {
    options = options || {};
    try {
    // 設定の読み取り
    var questionCount = options.questionCount
      || parseInt(document.querySelector("#question-count .config-btn.active").dataset.value);
    var mode = document.querySelector("#exam-mode .config-btn.active").dataset.value;

    var selectedDifficulties = [];
    document.querySelectorAll("#difficulty-select input:checked").forEach(function(cb) {
      selectedDifficulties.push(parseInt(cb.value));
    });

    var selectedCategories = [];
    if (paramCategoryId !== null) {
      // チェックボックスに無い分野を ?cat= で指定されている場合。
      // 画面の選択欄は全選択のまま（この分野の項目が無いので表現できない）だが、
      // 出題はこの分野だけにする。
      selectedCategories = [paramCategoryId];
    } else {
      document.querySelectorAll("#category-select input:checked").forEach(function(cb) {
        selectedCategories.push(parseInt(cb.value));
      });
    }

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
    state.finished = false;          // 前の試験の終了フラグを必ず落とす
    state.abandonSent = false;       // 離脱の報告も試験ごとに1回に戻す
    state.examId = newExamId();

    // 全体制限時間: 1問あたり60秒 × 問題数
    state.totalTimeSec = state.questions.length * 60;
    state.totalTimeRemaining = state.totalTimeSec;

    trackEvent("exam_start", {
      exam_id: state.examId,
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
        // 時間切れは「問題文が読みにくい」の最も強い信号なので、
        // テンプレート別に数えられる形で送る。
        trackEvent("question_timeout", { template_id: tq.templateId || "", category: tq.category, difficulty: tq.difficulty });
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

      // Enter キーで回答。
      //
      // 以前は setTimeout(100ms) の中で addEventListener していたが、
      // 2つの不具合があった。どちらも「速く解ける人ほど踏む」形で、
      // 速度を測る道具としては当たりどころが悪い。
      //   ① 100ms 以内に次の問題へ進むと、前の問題のタイマーが
      //      「次の問題の入力欄」にリスナを貼る。そこへ次の問題自身の
      //      タイマーも貼るのでリスナが積み上がり、Enter 1回で
      //      btn-answer.click() が何度も走った（実測で2回・3回・4回）。
      //   ② 逆に、問題が出てから 100ms の間は Enter がまったく効かない。
      //
      // 入力欄は毎問 innerHTML で作り直されるので、ここで直接
      // onkeydown に代入すれば積み上がらないし、待つ必要もない。
      var input = area.querySelector("#answer-value");
      if (input) {
        input.onkeydown = function(e) {
          if (e.key === "Enter") document.getElementById("btn-answer").click();
        };
        // フォーカスだけは描画後に当てる必要があるので遅延させる。
        // リスナは既に貼ってあるので、ここが遅れても Enter は効く。
        setTimeout(function() {
          var el = document.getElementById("answer-value");
          if (el) el.focus();
        }, 0);
      }
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

  // 連打・二度押しを吸収する。
  //
  // 「開始」「もう一度」「解説を見る」「シェア」「誤りを報告」は、押しても
  // 対象が変わらない。2回押すと同じ対象の記録が2つ残る（実測で
  // retry_exam / review_start / share_x / report_error が2倍になった）。
  // 開始は exam_id が別になるが、1つ目の試験は完走しないまま消えるので、
  // exam_start が水増しされ完走率が下がる。
  //
  // ⚠️ 時間で切ってはいけない。最初 700ms の窓で切ったところ、
  //    「開始→完走→再挑戦」を素早く繰り返す経路が窓に飲み込まれ、
  //    3回目の試験が始まらなくなった（検査が捕まえた）。
  //    利用者が速いのか二度押しなのかは、時間では区別できない。
  //
  // ⚠️ 「回答して次へ」「次の問題」は2回目が別の対象に効くので守らない。
  //    守ると、速く解く人の2問目が消える。
  //
  // 代わりに「その操作がもう済んでいるか」を対象の同一性で見る。
  //   画面が変わる操作 … もう目的の画面にいるなら二度押し
  //   画面が変わらない操作 … 同じ対象を既に記録済みなら二度押し
  function onPressOnce(id, alreadyDone, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", function (e) {
      if (alreadyDone()) return;
      fn(e);
    });
  }

  function onScreen(name) {
    return screens[name] && screens[name].classList.contains("active");
  }

  var sharedExamId = null;     // シェア済みの試験
  var reportedIndex = null;    // 誤り報告済みの問題

  // 数値の答えを突き合わせる桁。
  // test/generator.spec.js がこの値を読み、実際に出題される答えの刻みより
  // 十分細かいことを検査する（1つの事実を2箇所に手で書かないため）。
  var ANSWER_DECIMALS = 4;

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
    //
    // ⚠️ ここは以前 Math.abs(userAnswer - correctAnswer) < 0.15 だった。
    //    絶対値の許容幅は「答えが小さいほど甘くなる」。濃度算は答えが
    //    0.1刻みで並ぶので、正解が 8 のときに 7.9 と入力しても正解に
    //    なっていた（実測6テンプレート）。利用者が間違えたのに
    //    「正解」と表示されるので、学習教材として実害がある。
    //
    //    答えは整数か小数第1位までしか出ないので、桁を決めて丸め、
    //    値そのものの一致を要求する。残す幅は浮動小数の誤差ぶんだけ。
    var unit = Math.pow(10, ANSWER_DECIMALS);
    return Math.round(userAnswer * unit) === Math.round(correctAnswer * unit);
  }

  // --- 回答記録 ---
  function recordAnswer(userAnswer, skipped) {
    // 終了後に届いた回答は捨てる。
    // 最終問題で「回答して次へ」を連打したり Enter を押しっぱなしにすると、
    // 結果画面に切り替わったあとも（非表示の試験画面にある）ボタンと入力欄が
    // 生きていて、同じ回答がもう一度記録され question_answer が水増しされる。
    // finishExam 側のガードだけだと exam_finish は止まるが解答数はズレたままになる。
    if (state.finished) return;

    var q = state.questions[state.currentIndex];
    var timeSpent = Math.round((Date.now() - state.questionStartTime) / 1000);
    var isCorrect = skipped ? false : checkAnswer(userAnswer, q.correctAnswer, q.answerType);

    state.answers[state.currentIndex] = {
      userAnswer: userAnswer,
      isCorrect: isCorrect,
      timeSpent: timeSpent,
      skipped: !!skipped
    };

    // ⚠️ question_id（q.id）は送らない。generator が毎問
    //    `<templateId>_<timestamp>_<乱数>` で作るので全部が別の値になり、
    //    GA4 では「(other)」に丸められて集計できないうえ、カーディナリティの
    //    枠を食い潰す。テンプレート別に見たいので templateId を送る。
    //
    // この数字で見たいのは難易度調整ではなく「壊れた問題の検出」。
    // 検証テストは問題の数学的な正しさしか見られず、
    // 「問題文が分かりにくい」「選択肢が紛らわしい」「解説が理解できない」は
    // 正答率と所要時間にしか出ない。
    trackEvent("question_answer", {
      template_id: q.templateId || "",
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
    trackEvent("peek_explanation", { template_id: q.templateId || "", category: q.category, difficulty: q.difficulty });

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
  /**
   * 試験の終了処理。**必ず冪等**であること。
   *
   * 【なぜ必要か / 何が起きていたか】
   * GA4で exam_finish (3,666) が exam_start (2,667) を上回っていた。
   * 1試験あたりの解答数も 7.4問 と、最小の10問を下回っていた。
   * ブラウザで再現したところ、原因は finishExam が何度でも走れたこと。
   *
   * moveToNext() は最終問題では finishExam() を呼ぶだけで currentIndex を
   * 進めない。そのため「もう一度 moveToNext が呼ばれる」経路があると、
   * そのたびに showResults() が走って exam_finish が再送されていた。
   *
   * 実際に再現した経路は2つ（どちらも最終問題での二重送信）:
   *   ① 「回答して次へ」の二連打。1回目で結果画面に切り替わるが、
   *      ボタン自体は（非表示の試験画面に）残っているため2回目も通る。
   *   ② 数値入力での Enter 連打。結果画面へ移ったあとも
   *      フォーカスが #answer-value に残り、値も残っているため、
   *      Enter をもう一度押すと同じ回答がそのまま再送信される。
   *      さらに renderAnswerArea のリスナ二重貼り（別途修正）と重なると
   *      Enter 1回で4回まで発火することを実測した。
   *
   * 呼び出し元それぞれにガードを置くと、新しい経路が増えたときに漏れる。
   * 終了処理そのものを冪等にして、ここ1か所で止める。
   */
  function finishExam() {
    if (state.finished) return;
    state.finished = true;

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

    // 分野別の正答率。「どの分野の解説記事を書くべきか」を判断する材料になるので、
    // 全体スコアだけでなく分野ごとに送る。
    var weakest = null, weakestRate = 101;
    var catParams = {};
    Object.keys(byCategory).forEach(function(cat) {
      var c = byCategory[cat];
      if (!c.total) return;
      var rate = Math.round(c.correct / c.total * 100);
      if (rate < weakestRate) { weakestRate = rate; weakest = cat; }
      trackEvent("category_result", {
        category: cat,
        correct_count: c.correct,
        question_count: c.total,
        correct_rate: rate,
        avg_time_sec: Math.round(c.totalTime / c.total)
      });
    });

    // 何回目の受験か。リピート率はサイトの中核価値（無限に練習できる）の実証になる。
    var attemptNo = 1;
    try {
      attemptNo = (JSON.parse(localStorage.getItem("spi_history") || "[]").length || 0) + 1;
    } catch (e) {}

    trackEvent("exam_finish", {
      exam_id: state.examId,
      question_count: totalQuestions,
      correct_count: totalCorrect,
      score_percent: percent,
      mode: state.mode,
      total_time_sec: totalTime,
      attempt_no: attemptNo,
      weakest_category: weakest || "",
      weakest_rate: weakest ? weakestRate : -1
    });

    // 「10問だけもう一度」は、直前が10問だと「もう一度挑戦する」と同じ意味に
    // なってしまう。同じ働きのボタンを2つ並べると迷わせるだけなので隠す。
    // 計測上も、短縮版が選ばれた回数の意味が曖昧にならずに済む。
    var shortBtn = document.getElementById("btn-retry-short");
    if (shortBtn) shortBtn.style.display = totalQuestions > SHORT_RETRY_COUNT ? "" : "none";

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

    // アフィリエイト枠。スコア帯で出し分ける。
    // 置く位置は分野別成績と「解き方を見る」CTAの後ろ（2026-08-27に変更）。
    // 当初は「スコア表示の直後」に置いていたが、実物を見ると自社CTA（紺ブロック
    // ＋白ボタン）に視覚的に完敗しており、かつ利用者自身の成績より先に広告が
    // 出ていた。期待値で比較すると、この枠は月200〜300円（600セッション×結果
    // 到達4〜5割×CTR2%×CVR7%×700円）に対し、分野別成績からの回遊は「実質1PV
    // →3〜5PV」の設計そのもの＝AdSense審査とサイトの資産価値がここに乗る。
    // 数百円の枠をその上に置く理由がない。
    // 試験画面には置かない。AdSenseもこの画面には置かない（テキストが薄く
    // 「価値の低いコンテンツ」判定のリスクがあるため）。役割分担は
    // 結果画面=アフィリエイト / 記事ページ=AdSense。
    // 属性（新卒 / 既卒・転職）ごとに枠を並べ、利用者に選ばせる。
    // 属性を推定しないのは収益上の理由で、キミスカの成果条件は学生限定、
    // 既卒が申し込むと全件否認される。見出し・注記・PR表記は
    // affiliate.js が枠ごとに必ず出すので、ここからは渡さない
    //（渡す形にすると「渡し忘れた枠」を作れてしまう）。
    if (typeof Affiliate !== "undefined") {
      Affiliate.renderAll(document.getElementById("affiliate-result"), {
        percent: percent,
        placement: "result"
      });
    }

    // 解説ページがある分野のうち、最も正答率が低かったものへ誘導する。
    // 全分野の最下位に解説ページが無いことが多いため、ページがある分野に限る。
    // 「全体で最も苦手」とは書かず、その分野の実際の正答率だけを示す。
    var weakEl = document.getElementById("weak-category-cta");
    if (weakEl) {
      var target = null, targetRate = 101;
      Object.keys(byCategory).forEach(function(cat) {
        if (!CATEGORY_PAGES[cat]) return;
        var cd = byCategory[cat];
        if (!cd.total) return;
        var rate = Math.round(cd.correct / cd.total * 100);
        if (rate < targetRate) { targetRate = rate; target = cat; }
      });
      if (target && targetRate < 100) {
        weakEl.innerHTML =
          '<p class="cta-title">' + escapeHtml(target) + ' の正答率は ' + targetRate + '% でした</p>' +
          '<p>解き方を確認して、この分野だけをもう一度練習できます。</p>' +
          '<a class="cta-btn" href="categories/' + CATEGORY_PAGES[target] + '/">' +
          escapeHtml(target) + ' の解き方を見る</a>';
        weakEl.style.display = "";

        // ⚠️ このCTAのクリックは、これまで一度も計測されていなかった。
        //    .cta-btn のクリックは analytics.js が拾うが、index.html は
        //    それを読み込んでいない（GA4を自前で初期化しており、読ませると
        //    二重初期化になる）。結果 cta_click の実績20件はすべて記事ページの
        //    もので、結果画面のぶんは0件だった。2026-09-02 に app.js から送る。
        //    beacon は遷移で送信が中断されないため（離脱の記録で同じ問題を踏んだ）。
        var ctaEl = weakEl.querySelector(".cta-btn");
        if (ctaEl) {
          ctaEl.addEventListener("click", function () {
            trackEvent("weak_category_cta", {
              category: target,
              rate: targetRate,
              transport_type: "beacon"
            });
          });
        }
      } else {
        weakEl.style.display = "none";
      }
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
    onPressOnce("btn-review", function () { return onScreen("review"); }, showReview);

    // 再挑戦は2種類ある。どちらが押されたかを variant で区別する。
    // これを付けずに両方足すと、再挑戦率が動いたときに
    // 「文言が効いたのか、軽い口が効いたのか」を後から言えなくなる。
    onPressOnce("btn-retry", function () { return onScreen("exam"); }, function() {
      trackEvent("retry_exam", {
        variant: "same",
        question_count: state.questions.length
      });
      startExam();
    });

    onPressOnce("btn-retry-short", function () { return onScreen("exam"); }, function() {
      trackEvent("retry_exam", {
        variant: "short",
        question_count: SHORT_RETRY_COUNT
      });
      startExam({ questionCount: SHORT_RETRY_COUNT });
    });

    document.getElementById("btn-back").addEventListener("click", function() {
      reportAbandon("button");
      state.examId = null;          // この試験からは離れた。以降の離脱は報告しない
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
    onPressOnce("btn-share-x", function () { return sharedExamId === state.examId; }, function() {
      sharedExamId = state.examId;
      shareOnX();
    });

    // 誤り報告ボタン
    onPressOnce("btn-report-error", function () { return reportedIndex === reviewIndex; }, function() {
      reportedIndex = reviewIndex;
      openReportForm(reviewIndex);
      // 利用者からの誤り報告は最も強い信号。どのテンプレートかが分からないと
      // 直しようがないので、必ず templateId を送る。
      trackEvent("report_error", { template_id: (state.questions[reviewIndex] || {}).templateId || "" });
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
