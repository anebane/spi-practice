/**
 * affiliate.js を Node で動かすための最小DOMスタブ。
 *
 * app-harness.js は app.js 一枚を丸ごと動かすための大きな装置で、
 * 広告枠だけを見たいときには重すぎる（試験の開始まで通す必要がある）。
 * ここは affiliate.js が実際に使う API だけを持つ。
 *
 * 描いた結果を「木」として取り出せるようにしてあるのが要点。
 * innerHTML の文字列検索で済ませると、PR表記が「どの枠に」「リンクより前に」
 * 出ているかを言えない。景表法で問われるのは位置なので、木で見る。
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");

function makeEl(tag) {
  return {
    tagName: String(tag || "div").toUpperCase(),
    className: "", textContent: "", innerHTML: "",
    href: "", rel: "", target: "", src: "", alt: "",
    width: 0, height: 0,
    style: {},
    children: [],
    attrs: {},
    _handlers: {},
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(t, f) { (this._handlers[t] = this._handlers[t] || []).push(f); },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    click() { (this._handlers.click || []).forEach(f => f.call(this, { preventDefault() {} })); }
  };
}

/**
 * affiliate.js を読み込み、Affiliate と計測イベントの記録を返す。
 * PROGRAMS を差し替えたいときは patch(programs) を使う（テスト専用の口ではなく、
 * 公開されている _programs をテスト側から触るだけ）。
 */
function loadAffiliate() {
  const events = [];
  const errors = [];
  const context = {
    document: { createElement: makeEl },
    // GA4 の呼び方は gtag("event", 名前, パラメータ)。
    // ここを2引数で受けると、実際には送っていない呼び出しでも記録されてしまう。
    gtag: function (kind, name, params) {
      if (kind !== "event") throw new Error(`gtag の第1引数が "event" でない: ${kind}`);
      events.push({ name, params: params || {} });
    },
    console: {
      log() {}, warn() {},
      error: (...a) => { errors.push(a.join(" ")); }
    }
  };
  vm.createContext(context);
  const src = fs.readFileSync(path.join(ROOT, "affiliate.js"), "utf8");
  vm.runInContext(src, context, { filename: "affiliate.js" });
  if (!context.Affiliate) throw new Error("affiliate.js が Affiliate を作らなかった");
  return {
    Affiliate: context.Affiliate,
    events,
    errors,
    makeHost: () => makeEl("div"),
    reset() { events.length = 0; errors.length = 0; }
  };
}

/** 木を平らにして [{cls, tag, text, href}] にする。順序を保つ。 */
function flatten(el, out) {
  out = out || [];
  (el.children || []).forEach(c => {
    out.push({ tag: c.tagName, cls: c.className || "", text: c.textContent || "", href: c.href || "", src: c.src || "" });
    flatten(c, out);
  });
  return out;
}

/** 木を平らにして、要素そのものを順序どおり返す（属性を見たいとき用）。 */
function walk(el, out) {
  out = out || [];
  (el.children || []).forEach(c => { out.push(c); walk(c, out); });
  return out;
}

module.exports = { loadAffiliate, flatten, walk, makeEl };
