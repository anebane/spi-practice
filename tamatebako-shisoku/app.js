/**
 * 四則逆算（玉手箱形式）の模擬試験。
 *
 * 通常のSPI模試と流れが違う:
 *   - 全体で9分、50問。1問ごとの制限時間はない
 *   - 1問ずつ表示し、選んだら即座に次へ（速度を測るテストなので迷わせない）
 *   - 前の問題には戻れない
 */
(function () {
  var TOTAL = 50;
  var LIMIT_SEC = 9 * 60;

  var state = { questions: [], index: 0, correct: 0, startedAt: 0, timer: null, log: [] };

  var $ = function (id) { return document.getElementById(id); };
  function show(name) {
    ["intro", "exam", "result"].forEach(function (s) {
      $("screen-" + s).classList.toggle("active", s === name);
    });
  }
  function track(name, params) { if (typeof gtag === "function") gtag("event", name, params || {}); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function mmss(sec) { return pad2(Math.floor(sec / 60)) + ":" + pad2(sec % 60); }

  function build() {
    var out = [];
    var templates = QUESTION_TEMPLATES.filter(function (t) { return t.categoryId === 11; });
    var seen = {};                     // 1セット内で同じ式が出ると雑に見えるので除く
    var guard = 0;
    while (out.length < TOTAL && guard++ < TOTAL * 30) {
      var t = templates[Math.floor(Math.random() * templates.length)];
      var q = QuestionGenerator.generateQuestion(t);
      if (!q || !q.choices) continue;
      if (seen[q.text]) continue;
      seen[q.text] = true;
      out.push(q);
    }
    return out;
  }

  function start() {
    state.questions = build();
    if (state.questions.length < TOTAL) { alert("問題の準備に失敗しました。再読み込みしてください。"); return; }
    state.index = 0; state.correct = 0; state.log = [];
    state.startedAt = Date.now();
    show("exam");
    track("shisoku_start", { total: TOTAL });
    tick();
    state.timer = setInterval(tick, 1000);
    render();
  }

  function tick() {
    var left = LIMIT_SEC - Math.floor((Date.now() - state.startedAt) / 1000);
    if (left <= 0) { finish(true); return; }
    $("timer").textContent = mmss(left);
    $("timer").classList.toggle("warn", left <= 60);
  }

  function render() {
    var q = state.questions[state.index];
    $("progress").textContent = (state.index + 1) + " / " + TOTAL;
    $("bar").style.width = (state.index / TOTAL * 100) + "%";
    $("question").textContent = q.text;
    var box = $("choices");
    box.innerHTML = "";
    q.choices.forEach(function (c, i) {
      var b = document.createElement("button");
      b.className = "shisoku-choice";
      b.textContent = c;
      b.addEventListener("click", function () { answer(i); });
      box.appendChild(b);
    });
  }

  function answer(i) {
    var q = state.questions[state.index];
    var ok = i === q.correctAnswer;
    if (ok) state.correct++;
    state.log.push({ q: q, chosen: i, ok: ok });
    state.index++;
    if (state.index >= TOTAL) { finish(false); return; }
    render();
  }

  function finish(timeout) {
    clearInterval(state.timer);
    var sec = Math.min(LIMIT_SEC, Math.floor((Date.now() - state.startedAt) / 1000));
    var answered = state.log.length;
    $("r-correct").textContent = state.correct;
    $("r-answered").textContent = answered;
    $("r-time").textContent = mmss(sec);
    $("r-pace").textContent = answered ? (sec / answered).toFixed(1) : "-";
    $("r-timeout").style.display = timeout ? "block" : "none";

    // 目安。本番は9分50問なので、1問あたり10.8秒が完答ペース
    var msg;
    if (answered >= 50 && state.correct >= 45) msg = "本番でも十分に戦えるペースと正確さです。";
    else if (answered >= 40 && state.correct / answered >= 0.9) msg = "正確さは十分。あとは速度を上げれば完答が見えます。";
    else if (state.correct / Math.max(answered, 1) >= 0.9) msg = "正確に解けています。時間内に解ける問題数を増やしましょう。";
    else msg = "まず正確さを固めましょう。速く解いても誤答が多いと得点になりません。";
    $("r-comment").textContent = msg;

    renderReview();
    show("result");
    track("shisoku_finish", {
      correct_count: state.correct, answered_count: answered,
      total_time_sec: sec, timed_out: timeout,
      pace_sec: answered ? Math.round(sec / answered * 10) / 10 : 0
    });
  }

  function renderReview() {
    var wrong = state.log.filter(function (x) { return !x.ok; });
    var el = $("review");
    if (!wrong.length) { el.innerHTML = "<p>全問正解です。誤答はありません。</p>"; return; }
    el.innerHTML = "";
    wrong.slice(0, 20).forEach(function (x) {
      var d = document.createElement("details");
      d.className = "faq-item";
      var s = document.createElement("summary");
      s.textContent = x.q.text + "  （あなたの解答: " + x.q.choices[x.chosen] + " / 正解: " + x.q.choices[x.q.correctAnswer] + "）";
      var p = document.createElement("p");
      p.style.whiteSpace = "pre-wrap";
      p.textContent = x.q.explanation;
      d.appendChild(s); d.appendChild(p);
      el.appendChild(d);
    });
    if (wrong.length > 20) {
      var more = document.createElement("p");
      more.className = "legal-note";
      more.textContent = "誤答が多いため、先頭20問のみ表示しています。";
      el.appendChild(more);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("btn-start").addEventListener("click", start);
    $("btn-retry").addEventListener("click", function () { track("shisoku_retry"); start(); });
    $("btn-back").addEventListener("click", function () { clearInterval(state.timer); show("intro"); });
    $("btn-quit").addEventListener("click", function () {
      if (state.log.length && !confirm("試験を中断しますか？")) return;
      track("shisoku_abandon", { answered_count: state.log.length });
      clearInterval(state.timer); show("intro");
    });
  });
})();
