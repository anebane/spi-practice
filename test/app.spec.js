#!/usr/bin/env node
/**
 * app.js（画面ロジック）の計測が壊れていないかのテスト。
 *
 * 【なぜ必要か】
 * GA4を初めて引いたら exam_finish (3,666) が exam_start (2,667) を上回っていた。
 * 起こりえない数字で、これが直るまで完走率も離脱率も出せない。
 * ブラウザで再現したところ、最終問題で「回答して次へ」を連打したり
 * Enter を押しっぱなしにすると、結果画面に切り替わったあとも
 * （非表示の試験画面にある）ボタンと入力欄が生きていて、
 * finishExam() が何度でも走っていた。
 *
 * この手の壊れ方は「動いているように見える」のが厄介で、
 * 気づけるのは数か月後に集計を見たときになる。だから機械で止める。
 *
 * 【なぜDOMをスタブするのか】
 * app.js はブラウザ前提の1枚岩で、外に何も公開していない（IIFE）。
 * jsdom も入っていない（node_modules 自体が無い）。
 * そこで app.js が実際に使っている範囲だけの DOM を用意して、
 * **本物の app.js をそのまま読み込み、ボタンのクリックで駆動する。**
 * 内部関数を直接叩かないので、利用者の操作と同じ経路を通る。
 */
const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

// DOMスタブは deeplink.spec.js と共有している
const { createHarness } = require("./helpers/app-harness");
const { Coverage } = require("./helpers/coverage");
const cov = new Coverage();

// ============================================================
// 検査
// ============================================================
let ranCases = 0;
function run(name, fn) {
  ranCases++;
  try { fn(); } catch (e) { fail(name, "例外: " + e.message); }
}

// --- 1. 通常の1試験で exam_start / exam_finish がそれぞれ1回 ---
run("通常の試験", () => {
  const h = createHarness({ questionCount: 10 });
  h.start();
  for (let i = 0; i < 30 && !h.onResult(); i++) h.answerOne();

  if (h.count("exam_start") !== 1) fail("通常の試験", `exam_start が ${h.count("exam_start")}回`);
  if (h.count("exam_finish") !== 1) fail("通常の試験", `exam_finish が ${h.count("exam_finish")}回`);
  if (h.count("question_answer") !== 10) fail("通常の試験", `question_answer が ${h.count("question_answer")}回（10問なので10のはず）`);
});

// --- 2. 最終問題で回答ボタンを連打しても終了は1回だけ ---
//     ここが本番で壊れていた挙動。結果画面に切り替わったあとも
//     非表示の試験画面のボタンは生きているので、連打が通ってしまう。
run("最終問題での連打", () => {
  const h = createHarness({ questionCount: 10 });
  h.start();
  for (let i = 0; i < 30 && !h.onResult(); i++) {
    if (h.isLast()) { h.answerOne(); h.byId("btn-answer").click(); h.byId("btn-answer").click(); }
    else h.answerOne();
  }
  const f = h.count("exam_finish"), a = h.count("question_answer");
  if (f !== 1) fail("最終問題での連打", `exam_finish が ${f}回（1回であるべき）`);
  if (a !== 10) fail("最終問題での連打", `question_answer が ${a}回（10回であるべき。終了後の回答が記録されている）`);
});

// --- 3. 終了後にスキップボタンを押しても何も起きない ---
run("終了後のスキップ", () => {
  const h = createHarness({ questionCount: 10 });
  h.start();
  for (let i = 0; i < 30 && !h.onResult(); i++) h.answerOne();
  h.reset();
  h.byId("btn-skip").click();
  h.byId("btn-answer").click();
  if (h.events.length !== 0) {
    fail("終了後のスキップ", "終了後の操作でイベントが出た: " + h.events.map(e => e.name).join(", "));
  }
});

// --- 4. 終了後に「解説を閉じて次へ」が押されても終了処理は走らない ---
//
//     この経路が要る理由: closePeekAndNext は recordAnswer を通らず、
//     moveToNext() を直接呼ぶ。つまり recordAnswer 側のガードでは止まらず、
//     **finishExam 自身が冪等でないと exam_finish が二重に出る。**
//     recordAnswer のガードだけでこのテストを通してしまうと、
//     finishExam のガードを外しても気づけない（実際に一度そうなった）。
run("終了後の解説クローズ", () => {
  const h = createHarness({ questionCount: 10 });
  h.start();
  for (let i = 0; i < 30 && !h.onResult(); i++) h.answerOne();
  h.reset();
  h.byId("btn-peek-close").click();
  h.byId("peek-backdrop").click();
  const f = h.count("exam_finish");
  if (f !== 0) fail("終了後の解説クローズ", `終了後に exam_finish が ${f}回 追加で出た（finishExam が冪等でない）`);
});

// --- 5. exam_id が start と finish で一致し、試験ごとに変わる ---
run("exam_id", () => {
  const h = createHarness({ questionCount: 10 });
  const ids = [];
  for (let t = 0; t < 3; t++) {
    h.reset();
    if (t === 0) h.start(); else h.byId("btn-retry").click();
    for (let i = 0; i < 30 && !h.onResult(); i++) h.answerOne();

    const s = h.find("exam_start"), f = h.find("exam_finish");
    if (!s || !f) { fail("exam_id", `${t + 1}回目で start/finish が揃わない`); return; }
    if (!s.params.exam_id) { fail("exam_id", "exam_start に exam_id が無い"); return; }
    if (s.params.exam_id !== f.params.exam_id) {
      fail("exam_id", `start と finish で不一致: ${s.params.exam_id} ≠ ${f.params.exam_id}`);
    }
    if (h.count("exam_finish") !== 1) fail("exam_id", `${t + 1}回目の exam_finish が ${h.count("exam_finish")}回`);
    ids.push(s.params.exam_id);
  }
  if (new Set(ids).size !== ids.length) fail("exam_id", "試験をまたいで同じIDが使われている: " + ids.join(", "));
});

// --- 6. 再挑戦しても終了フラグが残らない（2試験目が終われなくなっていないか） ---
run("再挑戦", () => {
  const h = createHarness({ questionCount: 10 });
  h.start();
  for (let i = 0; i < 30 && !h.onResult(); i++) h.answerOne();
  h.reset();
  h.byId("btn-retry").click();
  for (let i = 0; i < 30 && !h.onResult(); i++) h.answerOne();
  if (h.count("exam_start") !== 1) fail("再挑戦", `2試験目の exam_start が ${h.count("exam_start")}回`);
  if (h.count("exam_finish") !== 1) fail("再挑戦", `2試験目の exam_finish が ${h.count("exam_finish")}回`);
  if (h.count("retry_exam") !== 1) fail("再挑戦", `retry_exam が ${h.count("retry_exam")}回`);
});

// --- 7. 再挑戦2種類が variant で区別でき、短縮版は10問になる ---
//
//     どちらが押されたか分からないまま両方を足すと、再挑戦率が動いたときに
//     「文言が効いたのか、軽い口が効いたのか」を後から言えなくなる。
run("再挑戦の2種類", () => {
  const h = createHarness({ questionCount: 20 });
  h.start();
  for (let i = 0; i < 60 && !h.onResult(); i++) h.answerOne();
  if (h.count("question_answer") !== 20) fail("再挑戦の2種類", `1試験目が20問になっていない: ${h.count("question_answer")}`);

  // 同じ設定での再挑戦 → variant=same, 20問
  h.reset();
  h.byId("btn-retry").click();
  for (let i = 0; i < 60 && !h.onResult(); i++) h.answerOne();
  let r = h.find("retry_exam");
  if (!r) fail("再挑戦の2種類", "retry_exam が出ていない（same）");
  else {
    if (r.params.variant !== "same") fail("再挑戦の2種類", `variant が same でない: ${r.params.variant}`);
    if (r.params.question_count !== 20) fail("再挑戦の2種類", `question_count が 20 でない: ${r.params.question_count}`);
  }
  if (h.count("question_answer") !== 20) fail("再挑戦の2種類", `same の再挑戦が20問でない: ${h.count("question_answer")}`);

  // 10問だけもう一度 → variant=short, 画面の設定(20問)を上書きして10問
  h.reset();
  h.byId("btn-retry-short").click();
  for (let i = 0; i < 60 && !h.onResult(); i++) h.answerOne();
  r = h.find("retry_exam");
  if (!r) fail("再挑戦の2種類", "retry_exam が出ていない（short）");
  else {
    if (r.params.variant !== "short") fail("再挑戦の2種類", `variant が short でない: ${r.params.variant}`);
    if (r.params.question_count !== 10) fail("再挑戦の2種類", `question_count が 10 でない: ${r.params.question_count}`);
  }
  if (h.count("question_answer") !== 10) fail("再挑戦の2種類", `short の再挑戦が10問でない: ${h.count("question_answer")}`);
  if (h.count("exam_finish") !== 1) fail("再挑戦の2種類", `short の exam_finish が ${h.count("exam_finish")}回`);

  // 短縮版でも exam_start と exam_finish は対応する
  const s = h.find("exam_start"), f = h.find("exam_finish");
  if (!s || !f || s.params.exam_id !== f.params.exam_id) fail("再挑戦の2種類", "短縮版で exam_id が対応していない");
  if (s.params.question_count !== 10) fail("再挑戦の2種類", `exam_start の question_count が 10 でない: ${s.params.question_count}`);
});

// --- 8. 「10問だけもう一度」は10問の試験の直後には出さない ---
run("短縮版の出し分け", () => {
  const long = createHarness({ questionCount: 20 });
  long.start();
  for (let i = 0; i < 60 && !long.onResult(); i++) long.answerOne();
  if (long.byId("btn-retry-short").style.display === "none") {
    fail("短縮版の出し分け", "20問の直後なのに短縮版が隠れている");
  }

  const short = createHarness({ questionCount: 10 });
  short.start();
  for (let i = 0; i < 30 && !short.onResult(); i++) short.answerOne();
  if (short.byId("btn-retry-short").style.display !== "none") {
    fail("短縮版の出し分け", "10問の直後なのに短縮版が出ている（同じ働きのボタンが2つ並ぶ）");
  }
});

// --- 9. ?cat= で、トップの選択欄に無い分野を指定できる ---
//
//     語句の関係(12)は独立ページ /language/ から来るので、
//     トップの出題分野チェックボックスには載せていない（言語を非言語の
//     模擬試験に混ぜないため）。
//
//     applyCategoryParam は元々「value が一致する箱」を探す実装だったので、
//     箱が無いと全分野を選び直して終わっていた。つまり
//     「語句の関係の練習を始める」を押した人が非言語の模試を受けていた。
//     画面はエラーも出さず正常に見えるので、誰も気づけない壊れ方。
run("選択欄に無い分野を ?cat= で指定", () => {
  const h = createHarness({ questionCount: 10, visibleCategories: [1, 2, 3], search: "?cat=12" });
  h.start();
  for (let i = 0; i < 30 && !h.onResult(); i++) h.answerOne();

  const cats = [...new Set(h.events.filter(e => e.name === "question_answer").map(e => e.params.category))];
  if (cats.length !== 1 || cats[0] !== "語句の関係") {
    fail("選択欄に無い分野を ?cat= で指定", `出題された分野が「語句の関係」だけになっていない: ${cats.join(", ") || "(出題なし)"}`);
  }
  const note = h.byId("category-param-note");
  if (String(note.textContent).indexOf("語句の関係") === -1) {
    fail("選択欄に無い分野を ?cat= で指定", `案内文に分野名が出ていない: ${note.textContent}`);
  }
  const ev = h.find("category_practice_start");
  if (!ev || ev.params.category_id !== "12") {
    fail("選択欄に無い分野を ?cat= で指定", `category_practice_start が出ていない/IDが違う: ${ev && ev.params.category_id}`);
  }
});

// --- 10. 選択欄にある分野の ?cat= は今までどおり動く ---
run("選択欄にある分野の ?cat=", () => {
  const h = createHarness({ questionCount: 10, visibleCategories: [1, 2, 3], search: "?cat=2" });
  h.start();
  for (let i = 0; i < 30 && !h.onResult(); i++) h.answerOne();
  const cats = [...new Set(h.events.filter(e => e.name === "question_answer").map(e => e.params.category))];
  if (cats.length !== 1 || cats[0] !== "場合の数・確率") {
    fail("選択欄にある分野の ?cat=", `「場合の数・確率」だけになっていない: ${cats.join(", ") || "(出題なし)"}`);
  }
});

// --- 11. 実在しない分野IDは無視して全分野に戻る ---
run("実在しない ?cat=", () => {
  const h = createHarness({ questionCount: 10, visibleCategories: [1, 2, 3], search: "?cat=999" });
  h.start();
  for (let i = 0; i < 30 && !h.onResult(); i++) h.answerOne();
  const cats = [...new Set(h.events.filter(e => e.name === "question_answer").map(e => e.params.category))];
  if (cats.length < 2) {
    fail("実在しない ?cat=", `全分野に戻っていない（出題分野 ${cats.length}種）: ${cats.join(", ")}`);
  }
  const note = h.byId("category-param-note");
  if (note.style.display === "") {
    fail("実在しない ?cat=", "実在しないIDなのに案内文を出している");
  }
});

// --- 12. 利用者が分野の選択を触ったら ?cat= の指定は解除される ---
//
//     指定が居座ると、選択欄を操作しても出題が変わらないという
//     「触っても効かない」状態になる。画面上は選択が変わって見えるので厄介。
run("?cat= の解除", () => {
  const h = createHarness({ questionCount: 10, visibleCategories: [1, 2, 3], search: "?cat=12" });
  h.touchCategory();                       // 利用者が出題分野を触った
  h.start();
  for (let i = 0; i < 30 && !h.onResult(); i++) h.answerOne();
  const cats = [...new Set(h.events.filter(e => e.name === "question_answer").map(e => e.params.category))];
  if (cats.length === 1 && cats[0] === "語句の関係") {
    fail("?cat= の解除", "選択を触ったのに語句の関係に固定されたまま");
  }
  if (!cats.length) fail("?cat= の解除", "出題されていない");
});

// --- 13. シェアの点数が結果画面と一致する ---
//
//     以前は state.questions の q.correct を数えていたが、生成される問題に
//     correct というプロパティは無く、**常に0%** になっていた。
//     90%取った人が「0% (0/20問正解)」と投稿する状態で、シェアの動機を潰す。
//     例外も落ちも起きないので、投稿されたものを見るまで気づけない。
//
//     2つの独立した経路で同じ点数を言わせて突き合わせる:
//       経路A … exam_finish（結果画面の集計）
//       経路B … share_x（シェア文面の集計）
run("シェアの点数", () => {
  let maxCorrect = 0, compared = 0;
  // 問題は毎回生成されるので、どの選び方で何問正解になるかは決まらない。
  // 選択肢の振り方を何通りか試して、正解が出るケースを含める。
  for (const step of [1, 2, 3, 4, 5, 6]) {
    const h = createHarness({ questionCount: 10 });
    h.start();
    for (let i = 0; i < 30 && !h.onResult(); i++) {
      h.user.selectedChoice = (i * step) % 4;
      h.byId("btn-answer").click();
    }
    h.byId("btn-share-x").click();

    const fin = h.find("exam_finish"), sh = h.find("share_x");
    if (!fin || !sh) { fail("シェアの点数", `イベントが出ていない（step=${step}）`); continue; }
    compared++;
    maxCorrect = Math.max(maxCorrect, fin.params.correct_count);
    if (fin.params.score_percent !== sh.params.score_percent) {
      fail("シェアの点数",
        `結果画面 ${fin.params.score_percent}% に対しシェアが ${sh.params.score_percent}%（step=${step}）`);
    }
  }
  // 全部0点だと「0%同士で一致」してしまい、常に0%を返すバグを見逃す。
  // どこかで1問以上正解している必要がある（特定のstepに縛ると生成の揺れで落ちる）。
  if (!compared) fail("シェアの点数", "1件も比較できていない");
  else if (maxCorrect === 0) fail("シェアの点数", "どの組み合わせでも正解0問で、検査が空回りしている");
});

// ============================================================
// 離脱の計測
//
// exam_abandon は「設定に戻る」ボタンでしか飛んでおらず、タブを閉じて
// 離れた人は何も残らなかった（完走率72%に対し離脱イベント0件）。
// ハンドラを「登録した」だけでは何も保証されないので、実際に撃って確かめる。
// ============================================================

// --- 10. 途中でページを離れると exam_abandon が飛ぶ ---
run("離脱: ページを離れる", () => {
  const h = createHarness({ questionCount: 10 });
  h.start();
  h.answerOne();
  h.answerOne();
  if (h.count("exam_abandon") !== 0) fail("離脱", "離れる前から飛んでいる");
  h.leave();
  const n = h.count("exam_abandon");
  if (n !== 1) { fail("離脱", `pagehide で ${n}回（1回であるべき）`); return; }
  const e = h.find("exam_abandon");
  if (e.params.questions_answered !== 2) {
    fail("離脱", `questions_answered=${e.params.questions_answered}（2であるべき）`);
  }
  if (e.params.trigger !== "pagehide") fail("離脱", `trigger=${e.params.trigger}`);
  // 離脱時は通常送信が間に合わない。beacon に載せていないと届かない。
  if (e.params.transport_type !== "beacon") {
    fail("離脱", "transport_type が beacon でない。離脱時の送信は破棄される");
  }
  if (!e.params.exam_id) fail("離脱", "exam_id が無い。完走と突き合わせられない");
});

// --- 11. タブ切り替えでも記録するが、exam_id ごとに1回だけ ---
run("離脱: 何度切り替えても1回", () => {
  const h = createHarness({ questionCount: 10 });
  h.start();
  h.answerOne();
  h.hide(); h.show(); h.hide(); h.show();
  h.leave();
  const n = h.count("exam_abandon");
  if (n !== 1) fail("離脱", `切り替え2回＋離脱で ${n}回（1回であるべき）`);
  const e = h.find("exam_abandon");
  if (e && e.params.trigger !== "hidden") fail("離脱", `最初の経路は hidden のはず: ${e.params.trigger}`);
});

// --- 12. 完走したあとは離脱として数えない ---
run("離脱: 完走後は飛ばない", () => {
  const h = createHarness({ questionCount: 10 });
  h.start();
  for (let i = 0; i < 30 && !h.onResult(); i++) h.answerOne();
  if (!h.onResult()) { fail("離脱", "結果画面に到達しない"); return; }
  h.reset();
  h.hide(); h.leave();
  if (h.count("exam_abandon") !== 0) {
    fail("離脱", "完走したのに離脱として記録された。完走率が壊れる");
  }
});

// --- 13. 「設定に戻る」で離れたあと、閉じても二重に飛ばない ---
run("離脱: 戻るボタンの後は二重に飛ばない", () => {
  const h = createHarness({ questionCount: 10 });
  h.start();
  h.answerOne();
  h.byId("btn-back").click();
  const afterBack = h.count("exam_abandon");
  if (afterBack !== 1) { fail("離脱", `戻るボタンで ${afterBack}回`); return; }
  if (h.find("exam_abandon").params.trigger !== "button") fail("離脱", "trigger が button でない");
  h.leave();
  if (h.count("exam_abandon") !== 1) fail("離脱", "戻ったあとの離脱で二重に飛んだ");
});

// --- 14. 試験を始めていなければ飛ばない ---
run("離脱: 試験外では飛ばない", () => {
  const h = createHarness({ questionCount: 10 });
  h.leave(); h.hide();
  if (h.count("exam_abandon") !== 0) fail("離脱", "試験を始めていないのに飛んだ");
  // ハンドラが1つも登録されていないと、上は「飛ばないから緑」になる。
  const ls = h.listeners();
  if (!ls.win.includes("pagehide")) fail("離脱", "pagehide のハンドラが登録されていない");
  if (!ls.doc.includes("visibilitychange")) fail("離脱", "visibilitychange のハンドラが登録されていない");
});

// ============================================================
// 連打・二度押し
//
// 押しても対象が変わらない操作は、2回押しても記録が1つでなければならない。
// 実測で retry_exam / review_start / share_x / report_error が2倍になり、
// 開始は exam_start が2つ出て1つ目の試験が完走しないまま消えていた。
//
// ⚠️ 「回答して次へ」「次の問題」は2回目が別の対象に効くので守らない。
//    守ると速く解く人の2問目が消える。ここで一緒に禁じないことが大事。
// ============================================================

// --- 15. 対象が変わらない操作は2回押しても記録が増えない ---
run("連打: 対象が変わらない操作", () => {
  const atStart  = () => createHarness({ questionCount: 10 });
  const atExam   = () => { const h = atStart(); h.start(); return h; };
  const atResult = () => { const h = atExam(); for (let i = 0; i < 40 && !h.onResult(); i++) h.answerOne(); return h; };
  const atReview = () => { const h = atResult(); h.byId("btn-review").click(); return h; };

  const guarded = [
    ["btn-start",        atStart,  "exam_start"],
    ["btn-review",       atResult, "review_start"],
    ["btn-retry",        atResult, "retry_exam"],
    ["btn-retry-short",  atResult, "retry_exam"],
    ["btn-share-x",      atResult, "share_x"],
    ["btn-report-error", atReview, "report_error"]
  ];
  let checked = 0;
  for (const [id, setup, ev] of guarded) {
    const h = setup();
    h.reset();
    h.byId(id).click();
    const once = h.count(ev);
    h.byId(id).click();
    const twice = h.count(ev);
    checked++;
    if (once !== 1) { fail("連打", `${id}: 1回押して ${ev} が ${once}件（1件であるべき）`); continue; }
    if (twice !== 1) fail("連打", `${id}: 2回押すと ${ev} が ${twice}件になる。同じ対象が二重に記録される`);
  }
  cov.covered("連打を確かめた操作", checked, 6);
});

// --- 16. 別の対象に効く操作は、2回目も記録される ---
//     連打ガードを広げすぎると、速く解く人の2問目が消える。
//     「守らないこと」も検査しないと、あとから雑に広げられる。
run("連打: 別の対象に効く操作は止めない", () => {
  const h = createHarness({ questionCount: 10 });
  h.start();
  h.reset();
  h.answerOne();
  const once = h.count("question_answer");
  h.answerOne();
  const twice = h.count("question_answer");
  if (once !== 1) fail("連打", `1問答えて question_answer が ${once}件`);
  if (twice !== 2) {
    fail("連打", `2問答えたのに question_answer が ${twice}件。連打ガードが別の問題まで飲み込んでいる`);
  }
});

// ============================================================
// 出力
// ============================================================
cov.covered("実行した検査項目", ranCases, 10);
console.log(`app.js の計測: ${ranCases}項目を検査（DOMをスタブして本物の app.js を駆動）`);
cov.print();
for (const p of cov.failures) fail("検査対象", p);
if (!failures.length) {
  console.log("   ✅ exam_start と exam_finish は必ず1対1。連打しても増えない。exam_id も対応する");
} else {
  console.log(`   ❌ ${failures.length}件`);
  for (const f of failures) console.log(`   - [${f.rule}] ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
