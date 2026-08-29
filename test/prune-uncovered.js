#!/usr/bin/env node
/**
 * 台帳（mutations-uncovered.json）の掃除コマンド。
 *
 * 【何をするか】
 * 直近の全件実行が残した発火記録（.mutation-coverage.log）と台帳を突き合わせ、
 * 「登録されているのに、変異で落ちるようになった」項目を列挙する。
 * --write を付けたときだけ台帳から削除する（既定はdry-run）。
 *
 * 【なぜ自動削除にしないか】
 * ランナーが自分で台帳を書き換えると、台帳が縮んだことに誰も気づけない。
 * 台帳の削除は「人がこのコマンドを打ち、git の差分として残す」行為に固定する。
 * このコマンドはその作業を1回のコピペにするためのもので、判断を代行しない。
 *
 * 【前提】
 * 発火記録は「直前に完走した全件実行」のものであること。
 *   ・絞り込み実行（node test/mutation-runner.js <名前>）は記録を書かない
 *   ・途中で殺された実行の記録は不完全（消してよい件数が少なく出るだけで、
 *     誤って消しすぎる方向には倒れない）
 *   ・spec を編集したあとは行番号がずれるので、必ず全件実行し直してから使う
 *
 * ⚠️ 発火は生成の乱数でわずかに揺れる（実測: 全件実行2回で1件差）。
 *    ここで消した項目が次の実行で発火しないと「未カバー」として EXIT=1 になる。
 *    それは退行ではなく「たまたま発火しただけの不安定なカバー」が表面化した状態
 *    なので、消して戻すのではなく、決定的に落とす変異を書くこと。
 */
const fs = require("fs");
const path = require("path");
const { processSource, withKeys, siteKey } = require("./helpers/fail-sites.js");

const ROOT = path.join(__dirname, "..");
const COVLOG = path.join(__dirname, ".mutation-coverage.log");
const REGISTER = path.join(__dirname, "mutations-uncovered.json");

// SPECS はランナーの定義を唯一の出所として読む（二重管理にしない。
// wiring.spec.js が使っているのと同じ形で取り出す）。
const runnerSrc = fs.readFileSync(path.join(__dirname, "mutation-runner.js"), "utf8");
const block = runnerSrc.match(/const SPECS = \{([\s\S]*?)\};/);
if (!block) {
  console.error("❌ mutation-runner.js の SPECS が読めません。照合できないので中止します");
  process.exit(1);
}
const specFiles = [...block[1].matchAll(/"(test\/[a-z0-9-]+\.spec\.js)"/g)].map((m) => m[1]);

let covRaw;
try { covRaw = fs.readFileSync(COVLOG, "utf8"); }
catch (e) {
  console.error("❌ 発火記録（test/.mutation-coverage.log）がありません。");
  console.error("   先に全件実行してください: node test/mutation-runner.js");
  process.exit(1);
}
const fired = new Set(covRaw.split("\n").filter(Boolean));
if (!fired.size) {
  console.error("❌ 発火記録が空です。全件実行が完走していません");
  process.exit(1);
}

// 全 spec の失敗経路を列挙（ランナーの checkCoverage と同じ関数・同じ鍵）
const all = [];
for (const rel of specFiles) {
  const name = path.basename(rel);
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  all.push(...withKeys(name, processSource(src, name).sites));
}
const firedKeys = new Set(all.filter((s) => fired.has(s.file + ":" + s.line)).map((s) => s.key));

const register = JSON.parse(fs.readFileSync(REGISTER, "utf8"));
const keep = [], drop = [];
for (const r of register.sites || []) {
  (firedKeys.has(siteKey(r.file, r.text, r.nth || 0)) ? drop : keep).push(r);
}

if (!drop.length) {
  console.log("消してよい項目はありません（登録済みで発火したものが0件）");
  process.exit(0);
}
console.log(`変異で落ちるようになった登録項目 ${drop.length}件:`);
for (const r of drop) console.log(`   - ${r.file}:${r.line} 「${r.text}」`);

if (process.argv.indexOf("--write") === -1) {
  console.log("\ndry-run です。台帳から削除するには --write を付けて実行してください。");
  console.log("削除は git の差分として残し、コミットメッセージに件数を書くこと。");
  process.exit(0);
}

register.sites = keep;
require("./helpers/runner-lock").assertNotLocked("台帳（mutations-uncovered.json）");
fs.writeFileSync(REGISTER, JSON.stringify(register, null, 2) + "\n", "utf8");
console.log(`\n台帳を更新しました: ${keep.length + drop.length} → ${keep.length}件`);
