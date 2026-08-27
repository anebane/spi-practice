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
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

// ============================================================
// 最小のDOMスタブ
// ============================================================
function createHarness(opts) {
  opts = opts || {};
  const questionCount = String(opts.questionCount || 10);
  const events = [];
  const timeouts = [];

  const noop = () => {};
  const ctx2d = new Proxy({}, { get: () => noop });

  function makeEl(id) {
    const el = {
      id: id || "",
      textContent: "", innerHTML: "", value: "", checked: false,
      disabled: false, className: "", width: 0, height: 0,
      style: {},
      dataset: {},
      children: [],
      _handlers: {},
      classList: {
        _s: new Set(),
        add(...c) { c.forEach(x => this._s.add(x)); },
        remove(...c) { c.forEach(x => this._s.delete(x)); },
        contains(c) { return this._s.has(c); },
        toggle() {}
      },
      addEventListener(t, f) { (this._handlers[t] = this._handlers[t] || []).push(f); },
      removeEventListener() {},
      dispatchEvent() { return true; },
      click() { (this._handlers.click || []).forEach(f => f.call(this, { preventDefault: noop })); },
      focus: noop, blur: noop, scrollIntoView: noop, remove: noop,
      appendChild(c) { this.children.push(c); return c; },
      getContext: () => ctx2d,
      getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
      setAttribute: noop, getAttribute: () => null,
      querySelector(sel) { return doc.querySelector(sel, this); },
      querySelectorAll(sel) { return doc.querySelectorAll(sel, this); }
    };
    return el;
  }

  const els = new Map();
  const byId = (id) => {
    if (!els.has(id)) els.set(id, makeEl(id));
    return els.get(id);
  };

  // 「利用者がいま何を選んでいるか」。テスト側から差し替える。
  const user = { selectedChoice: 0, answerValue: "" };

  const mkInputs = (values) => values.map(v => {
    const e = makeEl(""); e.value = String(v); e.checked = true; return e;
  });

  const doc = {
    readyState: "complete",
    addEventListener: noop,
    createElement: (tag) => makeEl(""),
    getElementById: byId,
    querySelector(sel, scope) {
      if (sel === "#question-count .config-btn.active") { const e = makeEl(""); e.dataset.value = questionCount; return e; }
      if (sel === "#exam-mode .config-btn.active") { const e = makeEl(""); e.dataset.value = opts.mode || "exam"; return e; }
      if (sel.indexOf('input[name="answer"]:checked') !== -1) {
        if (user.selectedChoice === null) return null;
        const e = makeEl(""); e.value = String(user.selectedChoice); e.checked = true; return e;
      }
      if (sel.indexOf("#category-select input[value=") !== -1) return makeEl("");
      const r = this.querySelectorAll(sel, scope);
      return r.length ? r[0] : null;
    },
    querySelectorAll(sel, scope) {
      if (sel === ".config-options") return [makeEl(""), makeEl("")];
      if (sel === ".config-btn") return [makeEl(""), makeEl(""), makeEl("")];
      if (sel === "#difficulty-select input:checked") return mkInputs([1, 2, 3]);
      // 推論だけに絞る。図表・グラフを避けて選択式のみにし、判定を単純に保つ
      if (sel.indexOf("#category-select input") === 0) return mkInputs([1]);
      if (sel === ".faq-item") return [];
      if (sel.indexOf("choice-item") !== -1) {
        const n = ((scope && scope.innerHTML) || "").split("choice-item").length - 1;
        return Array.from({ length: Math.max(n, 0) }, () => {
          const e = makeEl("");
          e.querySelector = () => makeEl("");
          return e;
        });
      }
      return [];
    }
  };

  const storage = new Map();
  const sandbox = {
    console: { log: noop, error: noop, warn: noop },
    Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite,
    Set, Map, Array, Object, String, Number, Boolean, RegExp, Error, isNarrow: undefined,
    document: doc,
    navigator: { userAgent: "node", serviceWorker: undefined },
    localStorage: {
      getItem: k => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k)
    },
    alert: noop,
    confirm: () => true,
    // タイマーは実際には走らせない。1秒間隔のカウントダウンはテストの対象外で、
    // 走らせると Node が終了しなくなる。
    setInterval: () => 1,
    clearInterval: noop,
    setTimeout: (fn, ms) => { timeouts.push(fn); return timeouts.length; },
    clearTimeout: noop,
    gtag: (kind, name, params) => { if (kind === "event") events.push({ name, params: params || {} }); },
    // 広告枠は計測の対象外。app.js が使う形だけ満たすものを置く
    Affiliate: { render: noop, init: noop, selectByScore: () => ({ programs: [], band: "test" }) }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.location = { search: "", pathname: "/", href: "http://localhost/" };
  sandbox.window.scrollTo = noop;
  sandbox.window.open = noop;
  sandbox.window.devicePixelRatio = 1;

  const context = vm.createContext(sandbox);
  for (const f of ["questions.js", "generator.js", "app.js"]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), context, { filename: f });
  }

  return {
    events, els, byId, user, timeouts,
    count: (n) => events.filter(e => e.name === n).length,
    find: (n) => events.find(e => e.name === n),
    reset: () => { events.length = 0; },
    onResult: () => byId("screen-result").classList.contains("active"),
    isLast: () => {
      const m = String(byId("question-number").textContent).match(/(\d+) \/ (\d+)/);
      return m && m[1] === m[2];
    },
    answerOne() { user.selectedChoice = 0; byId("btn-answer").click(); },
    start() { byId("btn-start").click(); }
  };
}

// ============================================================
// 検査
// ============================================================
function run(name, fn) {
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

// ============================================================
// 出力
// ============================================================
console.log("app.js の計測: 6項目を検査（DOMをスタブして本物の app.js を駆動）");
if (!failures.length) {
  console.log("   ✅ exam_start と exam_finish は必ず1対1。連打しても増えない。exam_id も対応する");
} else {
  console.log(`   ❌ ${failures.length}件`);
  for (const f of failures) console.log(`   - [${f.rule}] ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
