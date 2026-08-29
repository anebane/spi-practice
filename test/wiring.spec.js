#!/usr/bin/env node
/**
 * 「書いたのに走らない」を機械的に止める。
 *
 * 【なぜ必要か】
 * test/affiliate.spec.js は作られてから一度もCIで実行されていなかった。
 * 景表法の表示義務と提携維持の条件を守る検査で、しかも直前に
 * 「AUDIENCES が消えても気づけない」を直した先だった。
 * 直した検査が、直っても走らない。
 *
 * 原因は「spec を1つ作るたびに、3か所へ手で登録する」構造。
 *   test/*.spec.js            実体
 *   .github/workflows/test.yml   CIが実行する一覧
 *   test/mutation-runner.js SPECS  破壊テストと未カバー検出の対象一覧
 *
 * 同じ事実が3か所にあり、うち2か所は書き忘れても何も起きない。
 * ここで突き合わせて、書き忘れたら落ちるようにする。
 *
 * ⚠️ この検査自身も対象に含まれる。除外すると、この検査を登録し忘れた
 *    ときに誰も気づけない。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const { Coverage } = require("./helpers/coverage");
const cov = new Coverage();

const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

// --- 実体 ---
// ドットで始まるファイルは除外する。変異ランナーは計装コピー
// (.cov-run-*.spec.js) を test/ 直下に置き、SIGKILL で死ぬとそれが残る。
// 残骸をここが「登録されていない検査」と名指しする誤検知が実際に起きた
// (2026-08-29)。誤検知を出す検査は無視されるようになるので、機械的に塞ぐ。
const specs = fs.readdirSync(__dirname)
  .filter(f => f.endsWith(".spec.js") && !f.startsWith("."))
  .map(f => "test/" + f)
  .sort();

// 0件だと「登録漏れが無い」ではなく「1本も見ていない」。
cov.covered("検査ファイル", specs.length, 5);

// --- CI が実行しているもの ---
const ciPath = path.join(ROOT, ".github/workflows/test.yml");
let ci = [];
if (!fs.existsSync(ciPath)) {
  fail("CI設定が無い", ".github/workflows/test.yml が見つからない。突き合わせられない");
} else {
  const yml = fs.readFileSync(ciPath, "utf8");
  ci = [...new Set([...yml.matchAll(/node\s+(test\/[a-z0-9-]+\.spec\.js)/g)].map(m => m[1]))].sort();
  // CIが変異ランナーを回しているかも見る。回していなければ SPECS 側の
  // 登録が正しくても、破壊テストは一度も動かない。
  if (!/node\s+test\/mutation-runner\.js/.test(yml)) {
    fail("CIが破壊テストを回していない", "SPECS に登録しても実行されない");
  }
}
cov.covered("CIが実行する検査", ci.length, 5);

// --- 変異ランナーの対象 ---
const runner = fs.readFileSync(path.join(ROOT, "test/mutation-runner.js"), "utf8");
const block = runner.match(/const SPECS = \{([\s\S]*?)\};/);
let specsMap = [];
if (!block) {
  fail("SPECS を読めない", "test/mutation-runner.js の SPECS が見つからない。突き合わせられない");
} else {
  specsMap = [...block[1].matchAll(/"(test\/[a-z0-9-]+\.spec\.js)"/g)].map(m => m[1]).sort();
}
cov.covered("破壊テストの対象", specsMap.length, 5);

// --- 突き合わせ ---
for (const s of specs) {
  if (ci.length && ci.indexOf(s) === -1) {
    fail("CIが実行していない検査", `${s} … 書いてあるのに一度も走らない`);
  }
  if (specsMap.length && specsMap.indexOf(s) === -1) {
    fail("破壊テストの対象になっていない検査", `${s} … 壊しても落ちるか確かめられず、未カバー検出の対象外にもなる`);
  }
}
// 逆向き。消した spec が一覧に残っていると、CIがそこで落ちる。
for (const s of ci) {
  if (specs.indexOf(s) === -1) fail("CIが実在しない検査を指している", s);
}
for (const s of specsMap) {
  if (specs.indexOf(s) === -1) fail("SPECS が実在しない検査を指している", s);
}

// --- 出力 ---
console.log(`検査の登録: 実体 ${specs.length}本 / CI ${ci.length}本 / 破壊テスト ${specsMap.length}本`);
cov.print();
for (const p of cov.failures) failures.push({ rule: "検査対象", detail: p });
if (!failures.length) {
  console.log("✅ すべての検査がCIと破壊テストの両方に登録されている");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const f of failures) console.log(`  ${f.rule}: ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
