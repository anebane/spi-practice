#!/usr/bin/env node
/**
 * ads.txt が壊れていないか。
 *
 * 【なぜ必要か】
 * ads.txt は「このサイトの広告枠を売ってよい事業者」の宣言。**壊れても例外は出ない。**
 * 起きるのは収益が静かに止まることだけで、気づくのは月末の明細を見たときになる。
 *
 * 壊れ方は決まっている:
 *   ・片方のネットワークの管理画面が出す内容を**そのまま貼る**
 *     → もう片方（いまは AdSense）の行が消え、その収益計上が止まる
 *   ・配信側が出した行を「重複」と判断して削る
 *     → 同じドメイン・IDでも4項目目の認証ID(TAG-ID)が違う行があり、
 *       消すと検証に使われる情報が落ちる（2026-09-11に実際にやりかけた）
 *   ・ファイルごと消える／空になる
 *
 * ⚠️ この検査は「行が減っていないか」を見る。増えるぶんには止めない
 *    （ネットワークを足すのは正当な変更）。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const { Coverage } = require("./helpers/coverage");
const cov = new Coverage();

const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

const file = path.join(ROOT, "ads.txt");

// 必ず載っていなければならない宣言。
// ⚠️ ここを増やすときは、そのネットワークの管理画面で発行者IDを確認してから足す。
//    推測で書くと「宣言はあるが実在しない」状態になり、検証で弾かれる。
const REQUIRED = [
  { name: "Google AdSense", pattern: /^google\.com,\s*pub-5409685648363967,\s*DIRECT/im },
  { name: "忍者AdMax",      pattern: /^adm\.shinobi\.jp,\s*231519,\s*DIRECT/im },
];

// 実データから引いた下限。2026-09-11時点で AdSense 1 + 忍者 684 = 685行。
// ⚠️ 減ったら止める。増えるのは正当な変更なので止めない。
const MIN_RECORDS = 600;

if (!fs.existsSync(file)) {
  fail("ads.txt が無い", `${file}。広告の収益計上が止まる`);
} else {
  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split("\n").map(s => s.trim());
  const records = lines.filter(l => l && !l.startsWith("#"));

  cov.covered("宣言レコード", records.length, MIN_RECORDS);

  // --- 0. いま配信しているネットワークの DIRECT 行があるか ---
  // ⚠️ ネットワークを切り替えたのに ads.txt を直し忘れる、が最も起きやすい事故。
  //    2026-09-16、忍者から i-mobile へ切り替えたとき実際に抜けていた。
  //    ⚠️ 同じドメインの RESELLER 行があっても代わりにならない。あれは
  //    別の事業者が再販している宣言で、自分のアカウントの認可ではない。
  {
    const NetAd = require("../netad.js");
    const net = NetAd.NETWORKS[NetAd.ACTIVE_NETWORK];
    if (!net || !net.adstxt || !net.adstxt.domain || !net.adstxt.id) {
      fail("配信中のネットワークの ads.txt 記載が宣言されていない",
        `${NetAd.ACTIVE_NETWORK}。何を書けばよいか分からず、抜けても検査できない`);
    } else {
      const esc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const direct = new RegExp("^" + esc(net.adstxt.domain) + ",\\s*" + esc(net.adstxt.id) + ",\\s*DIRECT", "im");
      if (!direct.test(raw)) {
        fail("配信中のネットワークの DIRECT 行が無い",
          `${net.adstxt.domain},${net.adstxt.id},DIRECT が要る。`
          + "無いと入札側が未認可の在庫と見なし、収益が静かに落ちる");
      }
      cov.covered("配信中のネットワークの認可", 1, 1);
    }
  }

  // --- 1. 必須の宣言が消えていないか ---
  for (const r of REQUIRED) {
    if (!r.pattern.test(raw)) {
      fail("必須の宣言が消えている",
        `${r.name}。片方の管理画面の内容をそのまま貼ると、もう片方が消える`);
    }
  }

  // --- 2. レコードが減っていないか ---
  if (records.length < MIN_RECORDS) {
    fail("宣言レコードが少なすぎる",
      `${records.length}行（下限${MIN_RECORDS}行）。上書きで失われた可能性がある`);
  }

  // --- 3. 書式が壊れていないか ---
  // ⚠️ 1行でも壊れていると、その行以降が無視される実装がある。
  //    ドメイン,ID,関係 の3項目が最低限。関係は DIRECT か RESELLER。
  let bad = 0;
  const samples = [];
  for (const l of records) {
    const parts = l.split(",").map(s => s.trim());
    const ok = parts.length >= 3
      && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(parts[0])
      && parts[1].length > 0
      && /^(DIRECT|RESELLER)$/i.test(parts[2]);
    if (!ok) {
      bad++;
      if (samples.length < 3) samples.push(l.slice(0, 60));
    }
  }
  if (bad) {
    fail("書式が壊れている行がある",
      `${bad}件: ${samples.join(" / ")}。1行の破損で以降が無視されることがある`);
  }

  // --- 4. 認証ID付きの行を落としていないか ---
  // ⚠️ 同じ「ドメイン,ID,関係」で認証ID(TAG-ID)の有無が違う行が実在する。
  //    3項目で重複除外すると、情報量の多いほうを捨てうる。実際にやりかけた。
  const byKey = new Map();
  for (const l of records) {
    const p = l.split(",").map(s => s.trim());
    const key = `${p[0].toLowerCase()},${p[1]},${(p[2] || "").toUpperCase()}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(p.length >= 4);
  }
  let lostAuth = 0;
  for (const [, hasAuthList] of byKey) {
    // 同じキーが1本だけになっていて、それが認証IDなしなら、落とした疑いがある。
    // ⚠️ 元から1本のものも多いので、これは「疑い」を数えるだけにして落とさない。
    if (hasAuthList.length === 1 && !hasAuthList[0]) lostAuth++;
  }
  cov.covered("重複キーを調べたレコード", byKey.size, 400);
}

// --- 出力 ---
console.log("ads.txt: 必須の宣言・レコード数・書式を検査");
cov.print();
for (const p of cov.failures) failures.push({ rule: "検査対象", detail: p });
if (!failures.length) {
  console.log("   ✅ AdSense と 忍者AdMax の宣言が両方あり、書式も壊れていない");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const f of failures) console.log(`  ${f.rule}: ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
