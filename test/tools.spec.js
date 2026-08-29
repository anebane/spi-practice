#!/usr/bin/env node
/**
 * 取得系スクリプト（tools/）が、空・部分・スキーマ変更のときに黙って書かないか。
 *
 * 【なぜ必要か】
 * tools/gsc/fetch.py と tools/ga4/fetch.py は、応答が空でも
 * それらしいJSONを EXIT=0 で書いていた。その上の analyze.py は
 * 「クリック 0 / 該当なし」という正常な見た目のレポートを作る。
 * 受け取った側は事実として扱うが、実際は
 *   ・本当に0件      なのか
 *   ・権限が外れた    のか
 *   ・プロパティ指定違い なのか
 *   ・APIの形が変わった のか
 * をレポートから区別できない。「アクセスが消えた」という嘘を、
 * 事実の顔で運ぶことになる。
 *
 * ⚠️ tools/ は Python なので、これまで変異ランナーの分母に入っていなかった。
 *    「発火91%」はこの領域を数えていない。ここで網に入れる。
 *
 * 本物のAPIは叩かない。test/helpers/probe-fetch.py が svc/client を
 * 差し替えてから main() を呼ぶので、ネットワークにも認証にも触れない。
 */
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const os = require("os");

const ROOT = path.join(__dirname, "..");
const { Coverage } = require("./helpers/coverage");
const cov = new Coverage();

const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

const PROBE = path.join(__dirname, "helpers", "probe-fetch.py");

function probe(which, kase, extra) {
  const out = path.join(os.tmpdir(), `probe-${which}-${kase}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const r = cp.spawnSync("python3", [PROBE, which, kase, out].concat(extra || []), { cwd: ROOT, encoding: "utf8" });
  const wrote = fs.existsSync(out);
  if (wrote) { try { fs.unlinkSync(out); } catch (e) {} }
  return { code: r.status, wrote, stdout: r.stdout || "", stderr: r.stderr || "" };
}

// python3 と google ライブラリが無い環境では、この検査は何も見ていない。
// 黙って緑にすると「取得系は守られている」と誤読されるので、はっきり落とす。
{
  const r = cp.spawnSync("python3", ["-c", "import google.analytics.data_v1beta, googleapiclient"], { encoding: "utf8" });
  if (r.status !== 0) {
    fail("実験台が動かない", "python3 と google のクライアントライブラリが要る。無いと取得系を1本も見ていないことになる");
  }
}

// --- 1. 正常な応答では書く（対照。ここが落ちると以下の判定に意味が無い）---
{
  let n = 0;
  for (const which of ["gsc", "ga4"]) {
    const r = probe(which, "normal");
    n++;
    if (r.code !== 0 || !r.wrote) {
      fail("正常な応答で書けない", `${which}: EXIT=${r.code} 書いた=${r.wrote} … 対照が成立しないので、以下の判定は意味を持たない`);
    }
  }
  cov.covered("対照（正常な応答）", n, 2);
}

// --- 2. 空・部分・スキーマ変更では、書かずに落ちる ---
{
  // ⚠️ 「落ちたこと」だけを見ると、空ガードとスキーマ変更ガードが互いを隠す。
  //    実際、スキーマ変更ガードを壊しても空ガードが代わりに止めるので、
  //    変異が検出されなかった（性質A3）。どちらのガードが働いたかを
  //    メッセージで区別する。
  const cases = [
    ["gsc", "empty",         "空応答",                   /取得結果が空です/],
    ["gsc", "empty-rows",    "rows が空配列",            /取得結果が空です/],
    ["gsc", "schema-change", "rows が別のキーに変わった", /応答に rows がありません/],
    ["ga4", "empty",         "行が0件",                  /取得結果が空です/],
    ["ga4", "partial",       "件数だけ大きく行が無い",   /取得結果が空です/],
    ["ga4", "schema-change", "応答に rows が無い",       /応答に rows がありません/]
  ];
  let n = 0;
  for (const [which, kase, label, wantMsg] of cases) {
    const r = probe(which, kase);
    n++;
    if (r.wrote) {
      fail("空・異常な応答でファイルを書いた", `${which}/${label} … 空を書くと、その上の分析が嘘を事実として運ぶ`);
    }
    if (r.code === 0) {
      fail("空・異常な応答で正常終了した", `${which}/${label} … EXIT=0 だと呼び出し側（run.sh の set -e）が止まらない`);
    }
    // 何が起きたのか読めるメッセージが要る。黙って落ちるだけだと原因を追えない。
    const msg = r.stdout + r.stderr;
    if (!/エラー|Traceback/.test(msg)) {
      fail("落ちたが理由が出ていない", `${which}/${label} … 出力: ${msg.trim().slice(0, 60)}`);
    } else if (!wantMsg.test(msg)) {
      fail("止めたガードが違う", `${which}/${label} … 期待 ${wantMsg} / 実際: ${msg.trim().split("\n")[0].slice(0, 70)}`);
    }
  }
  cov.covered("空・異常な応答", n, 6);
}

// --- 3. 明示すれば書ける口があること ---
//     禁止するだけだと、本当に0件のとき回避手段が無くなり、
//     いずれ検査ごと外される。安全な口を用意しておく（A8）。
{
  // ⚠️ 文字列の有無で見てはいけない。--allow-empty-x に変えても
  //    「--allow-empty を含む」ので通ってしまい、変異が検出されなかった（性質B1）。
  //    実際に付けて動くかで測る。
  let n = 0;
  for (const which of ["gsc", "ga4"]) {
    const r = probe(which, "empty", ["--allow-empty"]);
    n++;
    if (r.code !== 0 || !r.wrote) {
      fail("空を許す明示の口が働かない",
        `${which}: --allow-empty を付けても EXIT=${r.code} 書いた=${r.wrote} … `
        + "本当に0件のときに回避できないと、検査ごと外される");
    }
  }
  {
    const tmp = path.join(os.tmpdir(), `ae-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify({ site: "x", start: "a", end: "b", totals: {}, rows: [] }));
    const md = tmp.replace(/\.json$/, ".md");
    const r = cp.spawnSync("python3", ["tools/gsc/analyze.py", tmp, "-o", md, "--allow-empty"],
      { cwd: ROOT, encoding: "utf8" });
    n++;
    if (r.status !== 0 || !fs.existsSync(md)) {
      fail("分析に明示の口が働かない", `analyze.py: EXIT=${r.status} 書いた=${fs.existsSync(md)}`);
    }
    try { fs.unlinkSync(tmp); } catch (e) {}
    try { fs.unlinkSync(md); } catch (e) {}
  }
  cov.covered("明示の口", n, 3);
}

// --- 4. 下流（analyze.py）も空を事実にしない ---
{
  const tmp = path.join(os.tmpdir(), `an-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({
    site: "sc-domain:x", start: "2026-08-01", end: "2026-08-28",
    totals: {}, rows: [], by_date: [], by_page: []
  }));
  const md = tmp.replace(/\.json$/, ".md");
  const r = cp.spawnSync("python3", ["tools/gsc/analyze.py", tmp, "-o", md], { cwd: ROOT, encoding: "utf8" });
  if (r.status === 0) fail("空の入力からレポートを作った", "「クリック0 / 該当なし」は正常な分析結果に見える");
  if (fs.existsSync(md)) fail("空の入力でレポートを書き出した", md);
  try { fs.unlinkSync(tmp); } catch (e) {}
  try { fs.unlinkSync(md); } catch (e) {}
  cov.covered("下流の分析", 1, 1);
}

// --- 出力 ---
console.log("取得系の空・異常応答: gsc/ga4 の6ケース＋下流1件を検査");
cov.print();
for (const p of cov.failures) failures.push({ rule: "検査対象", detail: p });
if (!failures.length) {
  console.log("✅ 空・部分・スキーマ変更のいずれでも、書かずに理由付きで落ちる");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const f of failures) console.log(`  ${f.rule}: ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
