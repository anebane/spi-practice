#!/usr/bin/env node
/**
 * 記事ページの計測（analytics.js）の不変条件。
 *
 * 【なぜ必要か】
 * article_scroll は「読了率」を測るつもりで入れたが、本文が画面に収まる
 * 短い記事ではスクロールが起きず、25% すら送られていなかった。
 * 送られないので GA4 では「読まれていない」ように見える。
 * 実際は「測れていない」で、この2つは意味がまったく違う。
 *
 * ⚠️ 指標を足したときは「条件が満たされうるか」まで確かめること。
 *    定義を読むだけでは、永久に発火しない指標を緑にできる。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const { Coverage } = require("./helpers/coverage");
const cov = new Coverage();

const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

/**
 * analytics.js を最小DOMで動かす。
 * bodyHeight と innerHeight を渡して、長い記事と短い記事の両方を作る。
 */
function run(opts) {
  const events = [];
  const listeners = {};
  const el = (over) => Object.assign({
    textContent: "", offsetHeight: opts.bodyHeight,
    getBoundingClientRect: () => opts.rect,
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); }
  }, over || {});

  const body = el();
  const doc = {
    readyState: "complete",
    head: { appendChild() {} },
    createElement: () => ({ set src(v) {}, get src() { return ""; } }),
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    querySelector: (sel) => (sel === ".article-body" ? (opts.hasBody ? body : null) : null),
    querySelectorAll: () => []
  };
  const sandbox = {
    document: doc,
    location: { pathname: opts.pathname || "/articles/x.html" },
    Math, Date, JSON,
    dataLayer: [],
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    innerWidth: 375,
    innerHeight: opts.innerHeight
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  // gtag の呼び方は gtag("event", 名前, パラメータ)。
  // dataLayer に積まれた引数から取り出す。
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "analytics.js"), "utf8"), sandbox, { filename: "analytics.js" });
  (listeners.DOMContentLoaded || []).forEach(f => f());
  for (const args of sandbox.dataLayer) {
    if (args[0] === "event") events.push({ name: args[1], params: args[2] || {} });
  }
  return { events, scroll: () => (listeners.scroll || []).forEach(f => f()) };
}

// --- 1. 画面に収まる短い記事でも読了が送られる ---
{
  // 本文600px、画面800px → スクロールしない
  const r = run({ hasBody: true, bodyHeight: 600, innerHeight: 800, rect: { top: 100, bottom: 700 } });
  const ev = r.events.filter(e => e.name === "article_scroll");
  if (!ev.length) {
    fail("短い記事で読了が送られない",
      "本文が画面に収まるとスクロールが起きず、25%すら出ない。「読まれていない」と「測れていない」が区別できなくなる");
  } else {
    if (ev.length !== 1) fail("短い記事で読了が複数回", `${ev.length}件`);
    if (ev[0].params.percent !== 100) fail("短い記事の読了が100%でない", String(ev[0].params.percent));
    if (ev[0].params.scrolled !== false) {
      fail("スクロールの有無が区別できない",
        "scrolled が付いていないと、スクロールして到達した読了と混ざる");
    }
  }
  cov.covered("短い記事の読了", ev.length, 1);
}

// --- 2. 長い記事はスクロールして初めて送られる（先に全部送らない）---
{
  const r = run({ hasBody: true, bodyHeight: 3000, innerHeight: 800, rect: { top: 0, bottom: 3000 } });
  const first = r.events.filter(e => e.name === "article_scroll");
  if (first.length > 1) {
    fail("長い記事で最初から複数の節目が送られる", `${first.length}件。読んでいないのに読了になる`);
  }
  if (first.some(e => e.params.scrolled === false)) {
    fail("長い記事なのに scrolled:false", "短い記事用の経路が誤って通っている");
  }
  cov.covered("長い記事の読了", 1, 1);
}

// --- 3. 本文が無いページでは送らない ---
{
  const r = run({ hasBody: false, bodyHeight: 0, innerHeight: 800, rect: { top: 0, bottom: 0 } });
  if (r.events.some(e => e.name === "article_scroll")) {
    fail("本文が無いのに読了が送られる", "記事ではないページで読了率が水増しされる");
  }
}

// --- 4. 送っている指標が、実HTMLに存在する要素に依存しているか ---
//     依存する要素がどのページにも無い指標は、永久に発火しない。
{
  const src = fs.readFileSync(path.join(ROOT, "analytics.js"), "utf8");
  const pages = [];
  (function walk(dir, base) {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      if (e.name.startsWith(".") || ["node_modules", "src", "test", "tools", "data", "reports"].includes(e.name)) continue;
      const rel = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), rel);
      else if (e.name.endsWith(".html")) pages.push(rel);
    }
  })(".", "");
  const html = pages.map(p => fs.readFileSync(path.join(ROOT, p), "utf8")).join("\n");

  // querySelectorAll(".x") / querySelector(".x") で参照しているセレクタ
  const sels = [...src.matchAll(/querySelectorAll?\("\.([a-z-]+)[^"]*"\)/g)].map(m => m[1]);
  const uniq = [...new Set(sels)];
  cov.covered("依存する要素を調べた指標", uniq.length, 2);
  for (const s of uniq) {
    if (!html.includes(`"${s}`) && !html.includes(`${s} `) && !html.includes(`${s}"`)) {
      fail("依存する要素がどのページにも無い", `.${s} … この指標は永久に発火しない`);
    }
  }
  console.log(`analytics.js が依存する要素: ${uniq.map(s => "." + s).join(" / ")}（全${pages.length}ページで照合）`);
}

// --- 出力 ---
cov.print();
for (const p of cov.failures) failures.push({ rule: "検査対象", detail: p });
if (!failures.length) {
  console.log("✅ 短い記事でも読了が測れる。永久に発火しない指標も無い");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const f of failures) console.log(`  ${f.rule}: ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
