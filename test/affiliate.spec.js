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
const { loadAffiliate, flatten, walk } = require("./helpers/dom-stub");
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
    for (const k of ["program", "anchor", "href", "pixel", "lead", "audience", "note"]) {
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
// 1. すべてのリンクの直前にPR表記がある
//
//    「枠ごとに1つ」ではなく「リンクごと」で見る。枠の数え方は構成が変われば
//    変わる（1枠2リンクにも、2枠にもなる）が、要件は「リンクの直上」であって
//    枠の数とは関係が無い。枠で数えると、1枠に2本置いた瞬間に
//    「1つある＝合格」と言いながら2本目が裸になる。
//
//    直前 = そのリンクより前にある最後のPR表記との間に、別のリンクが無いこと。
// ============================================================
function checkPrBeforeEveryLink(host, where) {
  const flat = flatten(host);
  const links = flat.map((n, i) => ({ n, i })).filter(x => x.n.tag === "A");
  if (!links.length) { fail("リンクが無い", where); return 0; }

  for (const { i } of links) {
    let ok = false;
    for (let j = i - 1; j >= 0; j--) {
      if (flat[j].tag === "A") break;                       // 間に別のリンクがある
      if (PR_RE.test(flat[j].text) && AD_RE.test(flat[j].text)) { ok = true; break; }
    }
    if (!ok) fail("リンクの直前にPR表記が無い", `${where}: ${flat[i].text || "(無題)"} 番目=${i}`);
  }
  return links.length;
}

/**
 * すべてのリンクの直後に、そのリンク自身の注記があるか。
 *
 * 枠に1つでは足りない。同じ「既卒」の枠でも成果条件は案件ごとに違い
 * （ウズウズIT=20代のIT志望 / UZUZ=第二新卒全般）、まとめた瞬間に
 * どちらかが嘘になる。表記と同じ理由で、リンクごとに見る。
 * 直後 = そのリンクより後にある最初の注記までに、別のリンクが無いこと。
 */
function checkNoteAfterEveryLink(host, where) {
  const flat = flatten(host);
  const links = flat.map((n, i) => ({ n, i })).filter(x => x.n.tag === "A");
  for (const { i } of links) {
    let note = null;
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[j].tag === "A") break;                       // 次のリンクに入った
      if (flat[j].cls === "af-note") { note = flat[j]; break; }
    }
    if (!note) fail("リンクの直後に対象の注記が無い", `${where}: ${flat[i].text || "(無題)"}`);
    else if (!note.text.trim()) fail("対象の注記が空", `${where}: ${flat[i].text}`);
  }
  return links.length;
}

{
  const h = loadAffiliate();
  const ids = Object.keys(h.Affiliate._programs);
  let checked = 0;

  // 1本ずつ
  for (const id of ids) {
    h.reset();
    const host = h.makeHost();
    const ok = h.Affiliate.render(host, {
      programs: [id], band: "high", placement: "test"
    });
    if (!ok) { fail("描画されない", `${id}: render が false を返した`); continue; }
    checked += checkPrBeforeEveryLink(host, id);
    checkNoteAfterEveryLink(host, id);
    // 注記が「その案件のもの」か。別案件の文言が出ていると、
    // 表示はされているのに成果条件と食い違い、否認される。
    const shownNote = flatten(host).filter(x => x.cls === "af-note").map(x => x.text);
    const want = h.Affiliate._programs[id].note;
    if (shownNote.length !== 1 || shownNote[0] !== want) {
      fail("注記が案件のものと違う", `${id}: 画面「${shownNote.join(" / ")}」 ≠ 素材「${want}」`);
    }
  }
  cov.covered("PR表記を確かめたリンク（1本ずつ）", checked, 1);
}

// ============================================================
// 2. 1枠に2本置いても、両方の直前に表記が出る
//    枠先頭に1つ置く作りだと、ここで2本目が裸になる。
// ============================================================
{
  const h = loadAffiliate();
  const all = Object.keys(h.Affiliate._programs);
  const sameAud = {};
  for (const id of all) {
    const a = h.Affiliate._programs[id].audience || "none";
    (sameAud[a] = sameAud[a] || []).push(id);
  }
  const pair = Object.values(sameAud).find(v => v.length >= 2);
  if (!pair) {
    cov.skipped("1枠に2本", 0, "同じ属性の素材が2件そろっていない");
  } else {
    const host = h.makeHost();
    const ok = h.Affiliate.render(host, {
      programs: [pair[0], pair[1]], band: "high", placement: "test"
    });
    if (!ok) fail("2本の枠が描けない", pair.join(", "));
    else {
      const n = checkPrBeforeEveryLink(host, `${pair[0]}+${pair[1]}`);
      if (n !== 2) fail("2本置いたのにリンクが2本でない", `${n}本`);
      const prs = flatten(host).filter(x => PR_RE.test(x.text) && AD_RE.test(x.text)).length;
      if (prs !== 2) fail("2本の枠でPR表記が2つでない", `${prs}個`);
      checkNoteAfterEveryLink(host, `${pair[0]}+${pair[1]}`);
      // 同じ枠に成果条件の違う案件が並ぶ。注記が同じ文言なら、まとめた跡である。
      const notes = flatten(host).filter(x => x.cls === "af-note").map(x => x.text);
      if (notes.length !== 2) fail("2本の枠で注記が2つでない", `${notes.length}個`);
      const P = h.Affiliate._programs;
      if (P[pair[0]].note !== P[pair[1]].note && notes[0] === notes[1]) {
        fail("案件ごとに注記が分かれていない", `どちらも「${notes[0]}」`);
      }
      cov.covered("1枠に2本", 2, 2);
    }
  }
}

// ============================================================
// 2b. 属性ごとの枠（renderAll）でも、すべてのリンクの直前に表記が出る
//     注記と見出しも枠の数だけ出る（1つにまとめない）。
// ============================================================
{
  const h = loadAffiliate();
  const host = h.makeHost();
  const drawn = h.Affiliate.renderAll(host, { percent: 80, placement: "test" });
  if (!drawn) {
    cov.skipped("属性ごとの枠", 0, "描かれた枠が0（素材が未投入）");
  } else {
    const n = checkPrBeforeEveryLink(host, "renderAll");
    const flat = flatten(host);
    const prs = flat.filter(x => PR_RE.test(x.text) && AD_RE.test(x.text)).length;
    const notes = flat.filter(x => x.cls === "af-note").length;
    const heads = flat.filter(x => x.cls === "af-head").length;
    if (prs !== n) fail("renderAll のPR表記がリンク数と合わない", `表記 ${prs} / リンク ${n}`);
    checkNoteAfterEveryLink(host, "renderAll");
    if (notes !== n) fail("リンクの数だけ注記が出ていない", `注記 ${notes} / リンク ${n}`);
    if (heads !== drawn) fail("枠の数だけ見出しが出ていない", `見出し ${heads} / 枠 ${drawn}`);

    // 枠ごとに属性が違うなら、計測もその数だけ別々に飛ぶ
    const views = h.events.filter(e => e.name === "affiliate_view");
    if (views.length !== drawn) fail("affiliate_view が枠の数と合わない", `${views.length} / ${drawn}`);
    const auds = new Set(views.map(v => v.params.audience));
    if (auds.size !== drawn) fail("枠ごとに audience が分かれていない", [...auds].join(", "));
    cov.covered("属性ごとの枠", drawn, 1);
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
    const victim = h.Affiliate._programs[ids[0]];
    const kept = victim.note;
    delete victim.note;
    const ok = h.Affiliate.render(host, { programs: [ids[0]], band: "high", placement: "test" });
    victim.note = kept;
    if (ok) {
      fail("注記なしで描けてしまう",
        `${ids[0]} は audience=${victim.audience} なのに note 無しで render が true を返した`);
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
    h.Affiliate.render(host, { programs: [ids[0]], band: "high", placement: "test" });

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
    if (!h.Affiliate.render(host, { programs: [id], band: "high", placement: "test" })) continue;
    const flat = flatten(host);
    const a = flat.find(x => x.tag === "A");
    const img = flat.find(x => x.tag === "IMG");
    if (!a) { fail("リンクが無い", id); continue; }
    if (!img) fail("計測imgが無い", `${id}: 落とすとASP側の計測が壊れる`);
    // 配布物に含まれる属性は、そのまま出ていないと計測が壊れる。
    // rel と referrerpolicy は「見た目に出ない」ので、消えても誰も気づかない。
    const anchor = walk(host).find(x => x.tagName === "A");
    const P = h.Affiliate._programs[id];
    if (anchor && anchor.rel !== "nofollow") fail("rel が配布物と違う", `${id}: ${anchor.rel}`);
    if (P.referrerpolicy) {
      const got = anchor && anchor.getAttribute("referrerpolicy");
      if (got !== P.referrerpolicy) {
        fail("referrerpolicy が配布物と違う", `${id}: ${got} ≠ ${P.referrerpolicy}`);
      }
    }
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
