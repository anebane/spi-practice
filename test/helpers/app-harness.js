/**
 * app.js を Node で動かすための最小DOMスタブ。
 *
 * app.js はブラウザ前提の1枚岩で外に何も公開しておらず、jsdom も入っていない。
 * そこで app.js が実際に使う範囲だけの DOM を用意し、**本物の app.js を
 * そのまま読み込んでボタンのクリックで駆動する**。内部関数を直接叩かないので、
 * 利用者と同じ経路を通る。
 *
 * app.spec.js（計測の不変条件）と deeplink.spec.js（導線のE2E）で共有する。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");

/**
 * 本物の affiliate.js から公開APIの名前だけを取り、中身を無効化した控えを作る。
 * 名前を手で並べると、実体に関数が増えたときスタブだけが古くなり、
 * app.js の呼び出しが「〜 is not a function」で落ちる（実際に落ちた）。
 */
function stubAffiliate() {
  const { loadAffiliate } = require("./dom-stub");
  const real = loadAffiliate().Affiliate;
  const stub = {};
  for (const k of Object.keys(real)) {
    stub[k] = typeof real[k] === "function" ? () => undefined : real[k];
  }
  // app.js が戻り値を使うものだけ、形を保った空を返す
  stub.selectByScore = () => ({ programs: [], band: "test" });
  stub.selectByAudience = () => ({ band: "test", blocks: [] });
  stub.renderAll = () => 0;
  return stub;
}

function createHarness(opts) {
  opts = opts || {};
  const questionCount = String(opts.questionCount || 10);
  // 画面の出題分野チェックボックスに載っている分野。既定は推論だけ。
  // 語句の関係(12)のように「載せていない分野」を作れるようにしてある。
  // 数値の配列でも、{ value, label } の配列でも受ける。
  // label を渡すと、実画面と同じように「箱の親要素のテキスト＝分野名」になる。
  // app.js は案内文の分野名をここから取るので、label が無いと空欄になり
  // 「案内文が出ない」という誤検知を生む（実際に一度出した）。
  const visibleCategories = (opts.visibleCategories || [1]).map(
    c => (typeof c === "object" ? c : { value: c, label: "" })
  );
  const search = opts.search || "";
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
      dispatchEvent(ev) { (this._handlers[ev && ev.type] || []).forEach(f => f.call(this, ev)); return true; },
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
  // チェックボックスは毎回作り直すと checked の変更が消えてしまい、
  // applyCategoryParam が箱を絞る動きを再現できない。1組だけ作って使い回す。
  const categoryBoxes = visibleCategories.map(c => {
    const e = makeEl(""); e.value = String(c.value); e.checked = true;
    e.parentElement = { textContent: c.label || "" };
    return e;
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
      // 値で1つ引く形。空の要素を返すと parentElement が無くなり、
      // app.js が案内文の分野名を取れずに空欄になる（誤検知の元）。
      // 実際の箱を返す。
      if (sel.indexOf("#category-select input[value=") !== -1) {
        const mv = sel.match(/value='(\d+)'/);
        return mv ? (categoryBoxes.find(cb => cb.value === mv[1]) || null) : null;
      }
      const r = this.querySelectorAll(sel, scope);
      return r.length ? r[0] : null;
    },
    querySelectorAll(sel, scope) {
      if (sel === ".config-options") return [makeEl(""), makeEl("")];
      if (sel === ".config-btn") return [makeEl(""), makeEl(""), makeEl("")];
      if (sel === "#difficulty-select input:checked") return mkInputs([1, 2, 3]);
      // 図表・グラフを避けて選択式のみにし、判定を単純に保つ
      if (sel === "#category-select input:checked") return categoryBoxes.filter(cb => cb.checked);
      if (sel.indexOf("#category-select input") === 0) return categoryBoxes;
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
    // 広告枠は app.spec の計測の対象外なので中身は動かさない。
    // ただし「何を持っているか」は本物から取る。手で並べていたら
    // renderAll を足したときにずれて、app.js の呼び出しが例外で落ちた。
    // 1つの事実（Affiliate の公開API）を2箇所に書かない。
    Affiliate: stubAffiliate()
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.location = { search: search, pathname: "/", href: "http://localhost/" + search };
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
    // 利用者が出題分野のチェックを触ったことにする
    touchCategory() { categoryBoxes[0].dispatchEvent({ type: "change" }); },
    start() { byId("btn-start").click(); }
  };
}

module.exports = { createHarness };
