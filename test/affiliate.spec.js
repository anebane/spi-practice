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
    // audience（こちらで付ける属性）と note（広告主の成果条件の文言）の対応。
    // 出所が独立しているから突き合わせられる。学生限定の案件を career に
    // 付け替えると、既卒が申し込んで全件否認される。
    // 弱い壊し方の実測 (2026-08-29): audience の入れ替えは「その属性の素材が
    // 最後の1件だった」ときしか捕まらず、素材が2件あれば素通りだった。
    // 対応そのものを見る。判定は「student ⇔ 注記に『学生』がある」のXOR。
    if (p.audience && p.note && (p.audience === "student") !== /学生/.test(p.note)) {
      fail("audience と注記の対象が食い違う", `${id}: audience=${p.audience} / 注記「${p.note}」`);
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
function checkNoteAfterEveryLink(host, where, programs) {
  // アンカーの文言から案件を引く。どの案件のリンクなのかを画面側から特定できるので、
  // 「注記はあるが別案件のもの」を、素材の並べ方に依存せず言える。
  //
  // ⚠️ ここを「2件の注記が同じ文言かどうか」で見ていて取り逃した。
  //    比べた2件（キミスカ2件）はもともと注記が同一で、差がある前提の比較が
  //    丸ごと素通りしていた。比較相手ではなく、あるべき値と突き合わせる。
  const noteByAnchor = new Map();
  for (const id of Object.keys(programs)) noteByAnchor.set(programs[id].anchor, programs[id].note);

  const flat = flatten(host);
  const links = flat.map((n, i) => ({ n, i })).filter(x => x.n.tag === "A");
  for (const { n, i } of links) {
    let note = null;
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[j].tag === "A") break;                       // 次のリンクに入った
      if (flat[j].cls === "af-note") { note = flat[j]; break; }
    }
    if (!note) { fail("リンクの直後に対象の注記が無い", `${where}: ${n.text || "(無題)"}`); continue; }
    if (!note.text.trim()) { fail("対象の注記が空", `${where}: ${n.text}`); continue; }
    const want = noteByAnchor.get(n.text);
    if (want === undefined) { fail("アンカーが素材に無い", `${where}: ${n.text}`); continue; }
    if (note.text !== want) {
      fail("注記が別の案件のもの", `${where}: 「${n.text}」に「${note.text}」（正しくは「${want}」）`);
    }
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
    checkNoteAfterEveryLink(host, id, h.Affiliate._programs);
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
  const P0 = h.Affiliate._programs;
  const groups = Object.values(sameAud).filter(v => v.length >= 2);
  const pair = groups.find(v => P0[v[0]].note !== P0[v[1]].note) || groups[0];
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
      checkNoteAfterEveryLink(host, `${pair[0]}+${pair[1]}`, h.Affiliate._programs);
      // 同じ枠に成果条件の違う案件が並ぶ。注記が同じ文言なら、まとめた跡である。
      const notes = flatten(host).filter(x => x.cls === "af-note").map(x => x.text);
      if (notes.length !== 2) fail("2本の枠で注記が2つでない", `${notes.length}個`);
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

  // 素材が1件も無いうちは枠が0でも正常なので見送る。
  // ⚠️ ただし「素材があるのに枠が0」は異常。ここを一律に見送っていたため、
  //    属性の定義（AUDIENCES）を空にしても、どの検査も落ちなかった。
  //    素材の有無で分けずに見送ると、枠を作る仕組みごと消えても緑になる。
  const P = h.Affiliate._programs;
  const wantAuds = [...new Set(Object.keys(P).map(id => P[id].audience).filter(Boolean))];

  if (!drawn && !wantAuds.length) {
    cov.skipped("属性ごとの枠", 0, "audience を持つ素材がまだ無い");
  } else if (!drawn) {
    fail("属性ごとの枠が1つも出ない",
      `素材は ${wantAuds.join(" / ")} を持っているのに枠が0。属性ごとの出し分けが働いていない`);
  } else {
    // 素材が持つ属性は、すべて枠になっていなければならない。
    // 片方の属性の枠が消えると、その層には広告が出ないまま誰も気づかない。
    const sel = h.Affiliate.selectByAudience(80);
    const gotAuds = sel.blocks.map(b => b.audience);
    for (const a of wantAuds) {
      if (gotAuds.indexOf(a) === -1) {
        fail("属性の枠が欠けている", `${a} の素材があるのに、その属性の枠が作られない`);
      }
    }
    for (const b of sel.blocks) {
      if (!b.heading || !String(b.heading).trim()) {
        fail("枠の見出しが無い", `${b.audience} の枠に見出しが無い。どちらの層向けか読み手に分からない`);
      }
    }

    const n = checkPrBeforeEveryLink(host, "renderAll");
    const flat = flatten(host);
    const prs = flat.filter(x => PR_RE.test(x.text) && AD_RE.test(x.text)).length;
    const notes = flat.filter(x => x.cls === "af-note").length;
    const heads = flat.filter(x => x.cls === "af-head").length;
    if (prs !== n) fail("renderAll のPR表記がリンク数と合わない", `表記 ${prs} / リンク ${n}`);
    checkNoteAfterEveryLink(host, "renderAll", h.Affiliate._programs);
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
// 2c. 枠の見出しが audience と対応している
//     見出しの入れ替え（学生⇄既卒）は、枠の数も注記も正しいまま誘導だけが
//     逆になる。既卒が学生限定案件に申し込むと全件否認される。
//     文言は affiliate.js の AUD_HEADINGS の1箇所にしかないが、その中での
//     入れ替えはコードからは正誤を決められないので、語で突き合わせる。
//     判定は素材の検査と同じ形:「student ⇔ 見出しに『学生』がある」のXOR。
// ============================================================
{
  const h = loadAffiliate();
  const sel = h.Affiliate.selectByAudience(80);
  let checked = 0;
  for (const b of sel.blocks) {
    checked++;
    if ((b.audience === "student") !== /学生/.test(String(b.heading))) {
      fail("枠の見出しが audience と食い違う", `${b.audience} の枠に「${b.heading}」`);
    }
  }
  // 0件だと「対応が正しい」ではなく「1枠も見ていない」。
  cov.covered("見出しと audience の対応", checked, 2);
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

// --- W3: 配布されたURLが http に落ちていないか ---
//
// ⚠️ 計測imgを http:// にすると mixed content でブロックされ、
//    画面は何も変わらないまま計測だけ死ぬ。成果が計上されなくなる。
//    「1文字だけ変える」壊れ方なので、素材の存在確認では捕まらない。
//
// ⚠️ 「https に直す」検査にはしない。ASPから配布されたURLは改変してはいけない。
//    ここで見るのは「http で始まっていないこと」だけ。
{
  const h = loadAffiliate();
  const P = h.Affiliate._programs;
  // ⚠️ 変数名は既存の検査と重ねない。同じ行が2箇所になると、
  //    その行を狙った変異の find が一意でなくなり、変異が適用されなくなる。
  const urlIds = Object.keys(P);
  let checked = 0;
  for (const id of urlIds) {
    for (const key of ["href", "pixel"]) {
      const url = P[id][key];
      if (!url) continue;
      checked++;
      if (/^http:\/\//i.test(url)) {
        fail("配布URLが http になっている",
          `${id}.${key}: ${url} … mixed content でブロックされ、画面は変わらないまま計測だけ死ぬ`);
      } else if (!/^https:\/\//i.test(url)) {
        fail("配布URLの形が想定外", `${id}.${key}: ${url} … https で始まっていない`);
      }
    }
  }
  // 0件だと「http が無い」ではなく「1本も見ていない」。
  cov.covered("URLを調べた素材", checked, 4);
}

// --- W4: スコア帯の境界 ---
//
// ⚠️ >= を > に変えるだけで、70点ちょうど・40点ちょうどの層の帯が静かにずれる。
//    どの層に何が効いたかの集計が、境界の人数ぶんだけ狂う。
//    境界そのものを名指しで確かめる。
{
  const h = loadAffiliate();
  const band = h.Affiliate.scoreBand;
  const cases = [
    [100, "high"], [70.1, "high"], [70, "high"],   // 70ちょうどは high
    [69.9, "mid"], [40.1, "mid"], [40, "mid"],     // 40ちょうどは mid
    [39.9, "low"], [0, "low"],
    [NaN, "unknown"], [null, "unknown"], ["70", "unknown"]
  ];
  let checked = 0;
  for (const [input, want] of cases) {
    const got = band(input);
    checked++;
    if (got !== want) {
      fail("スコア帯の境界がずれている",
        `scoreBand(${JSON.stringify(input)}) = ${got}（期待 ${want}）`);
    }
  }
  cov.covered("スコア帯の境界", checked, 8);
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
