#!/usr/bin/env node
/**
 * 広告枠の不変条件。
 *
 * ここが守るのは主に景表法（ステマ規制・2023-10〜）の表示義務と、
 * 広告主が提携維持の条件として明記した「広告表示」である。
 * これまでこの領域を見る検査は1つも無く、affiliate.js の表記行を
 * 消してもすべての検査が緑のままだった（監査で判明）。
 *
 * 表記は innerHTML の文字列一致では見ない。問われるのは
 * 「どの枠に」「リンクより前に」出ているかという位置なので、木で見る。
 */
const { loadAffiliate, flatten } = require("./helpers/dom-stub");
const { Coverage } = require("./helpers/coverage");

const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });
const cov = new Coverage();

const PR_RE = /PR/;
const AD_RE = /広告/;

// ============================================================
// 0. 素材そのものの静的検査
// ============================================================
{
  const { Affiliate } = loadAffiliate();
  const P = Affiliate._programs;
  const ids = Object.keys(P);

  // 0件だと以下の検査がすべて素通りする。
  cov.covered("広告素材", ids.length, 1);

  for (const id of ids) {
    const p = P[id];
    for (const k of ["program", "anchor", "href", "pixel", "lead", "audience"]) {
      if (!p[k]) fail("素材の欠落", `${id}: ${k} がない`);
    }
    // 属性を持たない素材は、どの枠に出してよいか決められない。
    // 「全員に出す」に倒れると、成果条件を外した層に出て全件否認される。
    if (p.audience && !["student", "career"].includes(p.audience)) {
      fail("audience が不正", `${id}: ${p.audience}（student / career のみ）`);
    }
    // 配布物の改変検出。1x1の計測imgとリンクは同じ案件を指していないと計測が壊れる。
    if (p.href && p.pixel) {
      const key = (s) => (String(s).match(/a8mat=([^&"]+)/) || String(s).match(/rk=([^&"]+)/) || [])[1];
      const a = key(p.href), b = key(p.pixel);
      if (a && b && a !== b) fail("リンクと計測imgが別の案件", `${id}: ${a} / ${b}`);
    }
  }
}

// ============================================================
// 1. すべての枠にPR表記が出る（リンクより前に、枠ごとに1つ）
// ============================================================
{
  const h = loadAffiliate();
  const ids = Object.keys(h.Affiliate._programs);
  let checked = 0;

  for (const id of ids) {
    h.reset();
    const host = h.makeHost();
    const ok = h.Affiliate.render(host, {
      programs: [id], band: "high", placement: "test",
      note: "対象は…（テスト）"
    });
    if (!ok) { fail("描画されない", `${id}: render が false を返した`); continue; }
    checked++;

    const flat = flatten(host);
    const prs = flat.filter(n => PR_RE.test(n.text) && AD_RE.test(n.text));
    if (prs.length === 0) {
      fail("PR表記が無い", `${id}: 「PR」と「広告」を含む要素が枠に1つも無い`);
      continue;
    }
    if (prs.length > 1) fail("PR表記が枠に複数", `${id}: ${prs.length}個`);

    // 位置。リンクより後ろに出る表記は要件を満たさない。
    const iPr = flat.findIndex(n => PR_RE.test(n.text) && AD_RE.test(n.text));
    const iLink = flat.findIndex(n => n.tag === "A");
    if (iLink === -1) fail("リンクが無い", id);
    else if (iPr > iLink) fail("PR表記がリンクより後ろ", `${id}: 表記 ${iPr} / リンク ${iLink}`);
  }
  cov.covered("PR表記を確かめた素材", checked, 1);
}

// ============================================================
// 2. 枠が2つなら PR表記も2つ（1つにまとめない）
// ============================================================
{
  const h = loadAffiliate();
  const ids = Object.keys(h.Affiliate._programs);
  if (ids.length < 1) {
    cov.skipped("2枠のPR表記", 0, "素材が無い");
  } else {
    const hostA = h.makeHost(), hostB = h.makeHost();
    h.Affiliate.render(hostA, { programs: [ids[0]], band: "high", placement: "test", note: "注記A" });
    h.Affiliate.render(hostB, { programs: [ids[0]], band: "high", placement: "test", note: "注記B" });
    const count = (host) => flatten(host).filter(n => PR_RE.test(n.text) && AD_RE.test(n.text)).length;
    if (count(hostA) !== 1 || count(hostB) !== 1) {
      fail("2枠のPR表記", `枠ごとに1つでない: ${count(hostA)} / ${count(hostB)}`);
    }
    cov.covered("2枠のPR表記", 2, 2);
  }
}

// ============================================================
// 3. audience を持つ案件は注記が必須
//    note は呼び出し側依存で、渡し忘れると「注記の無い枠」ができる。
//    キミスカに既卒が申し込むと全件否認されるので、これは表示の問題ではなく
//    収益の問題。渡し忘れたら描かない（開いたまま出すより安全）。
// ============================================================
{
  const h = loadAffiliate();
  const ids = Object.keys(h.Affiliate._programs).filter(id => h.Affiliate._programs[id].audience);
  if (!ids.length) {
    cov.skipped("注記の必須化", 0, "audience を持つ素材が無い");
  } else {
    const host = h.makeHost();
    const ok = h.Affiliate.render(host, { programs: [ids[0]], band: "high", placement: "test" });
    if (ok) {
      fail("注記なしで描けてしまう",
        `${ids[0]} は audience=${h.Affiliate._programs[ids[0]].audience} なのに note 無しで render が true を返した`);
    }
    if (flatten(host).some(n => n.tag === "A")) {
      fail("注記なしでリンクが出た", ids[0]);
    }
    cov.covered("注記の必須化", 1, 1);
  }
}

// ============================================================
// 4. 計測に audience が乗る
//    どちらの層が反応したかを後から言えないと、出し分けの効果を測れない。
// ============================================================
{
  const h = loadAffiliate();
  const ids = Object.keys(h.Affiliate._programs);
  if (!ids.length) {
    cov.skipped("計測の audience", 0, "素材が無い");
  } else {
    const host = h.makeHost();
    h.Affiliate.render(host, { programs: [ids[0]], band: "high", placement: "test", note: "注記" });

    const view = h.events.filter(e => e.name === "affiliate_view");
    if (view.length !== 1) fail("affiliate_view の回数", `${view.length}回（1回であるべき）`);
    else if (!view[0].params.audience) fail("affiliate_view に audience が無い", JSON.stringify(view[0].params));

    // クリックを実際に起こして確かめる。定義を読むだけでは発火経路を確かめられない。
    const link = (function find(el) {
      for (const c of el.children || []) {
        if (c.tagName === "A") return c;
        const r = find(c); if (r) return r;
      }
      return null;
    })(host);
    if (!link) fail("リンクが無い", ids[0]);
    else {
      link.click();
      const click = h.events.filter(e => e.name === "affiliate_click");
      if (click.length !== 1) fail("affiliate_click の回数", `${click.length}回`);
      else if (!click[0].params.audience) fail("affiliate_click に audience が無い", JSON.stringify(click[0].params));
    }
    cov.covered("計測の audience", 1, 1);
  }
}

// ============================================================
// 5. 素材が空なら枠ごと出さない
// ============================================================
{
  const h = loadAffiliate();
  const host = h.makeHost();
  const ok = h.Affiliate.render(host, { programs: [], band: "high", placement: "test" });
  if (ok) fail("空でも描いてしまう", "programs: [] で render が true");
  if (host.style.display !== "none") fail("空の枠が隠れていない", `display=${host.style.display}`);
  if (h.events.some(e => e.name === "affiliate_view")) {
    fail("出していないのに affiliate_view", "表示回数が水増しされる");
  }
}

// ============================================================
// 6. 配布物を改変していない（rel と 1x1 の計測img はセット）
// ============================================================
{
  const h = loadAffiliate();
  const ids = Object.keys(h.Affiliate._programs);
  let n = 0;
  for (const id of ids) {
    h.reset();
    const host = h.makeHost();
    if (!h.Affiliate.render(host, { programs: [id], band: "high", placement: "test", note: "注記" })) continue;
    const flat = flatten(host);
    const a = flat.find(x => x.tag === "A");
    const img = flat.find(x => x.tag === "IMG");
    if (!a) { fail("リンクが無い", id); continue; }
    if (!img) fail("計測imgが無い", `${id}: 落とすとASP側の計測が壊れる`);
    n++;
  }
  cov.covered("配布物の検査", n, 1);
}

// --- 出力 ---
console.log("広告枠の不変条件を検査");
cov.print();
for (const p of cov.failures) failures.push({ rule: "検査対象", detail: p });
if (!failures.length) {
  console.log("✅ 問題なし");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const x of failures) console.log(`  ${x.rule}: ${x.detail}`);
}
process.exit(failures.length ? 1 : 0);
