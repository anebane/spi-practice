#!/usr/bin/env node
/**
 * 破壊テストのランナー（"テストのテスト"）。
 *
 * 【なぜ必要か】
 * 「意図的に壊して落ちることを実測してから報告する」は口頭の約束でしかなかった。
 * 実際にはそれで3回、検査そのものの欠陥が出ている。
 *   ・正解位置の順位配列が長さ4固定で、5択だと NaN になって検査が丸ごと無効化
 *   ・ガードを2枚入れたら互いに隠し合い、片方を外しても緑のまま
 *   ・ハーネスがチェックボックスを毎回作り直していて、箱を絞る動きを再現できず
 * どれも「テストは緑だが、緑の理由が間違っている」形。
 * 一度きりの手作業ではなく、毎回走る形にする。
 *
 * 【やること】
 * test/mutations.json の「壊し方」を1つずつ適用し、
 * 指定された spec が EXIT=1 になることを確かめて、元に戻す。
 * 1つでも「壊したのに緑」があれば全体を EXIT=1 にする。
 *
 * 【一番危ないところ】
 * find が0箇所しか一致しないと、変異が適用されないまま spec が緑になり、
 * 「壊しても落ちない」ではなく「壊せていない」のに合格扱いになる。
 * **それ自体が見逃し**なので、一致数がちょうど1でなければ即失敗にする。
 *
 * 【復元】
 * ソースを戻すだけでは足りない。src/questions/ を触る変異は questions.js を
 * 作り直す必要があり、戻し忘れると次のテストが古い成果物で走る（昨日踏んだ）。
 * 復元後にビルド成果物まで照合する。
 *
 * 【⚠️ 同時に走らせないこと】
 * このランナーは作業ファイルを書き換えて戻す。同じリポジトリを書き換える
 * 別のプロセス（別のランナー、手作業の破壊スクリプト、ビルド）が並行して
 * いると、互いの復元を上書きし合って汚染が残る。実際にそれで
 * src/questions/12-gengo.js に変異が残り、原因究明に時間を取られた。
 * 症状が実行ごとに変わるのが特徴で、単独で走らせると再現しない。
 */
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.join(__dirname, "..");
const MUTATIONS = path.join(__dirname, "mutations.json");

const SPECS = {
  app: "test/app.spec.js",
  deeplink: "test/deeplink.spec.js",
  generator: "test/generator.spec.js",
  html: "test/html.spec.js",
  pwa: "test/pwa.spec.js"
};

const only = process.argv[2] || null;   // 変異名の一部で絞り込める（開発用）

const mutations = JSON.parse(fs.readFileSync(MUTATIONS, "utf8"));
const failures = [];
const fail = (name, detail) => failures.push({ name, detail });

/** src/questions/ を触ったら questions.js を作り直す。 */
function rebuildIfNeeded(file) {
  if (file.indexOf("src/questions/") !== 0) return true;
  const r = cp.spawnSync("node", ["tools/build-questions.js"], { cwd: ROOT, encoding: "utf8" });
  return r.status === 0;
}

/**
 * 開始時点の中身を丸ごと控えておく。
 *
 * git の差分で復元を確かめると、**開始時に既に変更されていたファイルは
 * 「もともと汚れている」扱いになり、その後どう壊れても気づけない。**
 * 実際 questions.js を未コミットのまま走らせたところ、ビルド成果物に変異が
 * 残ったまま「復元できた」と報告した（ソースは正しいのに成果物だけ汚染）。
 * git ではなく中身そのもので照合する。
 */
const BUILT = path.join(ROOT, "questions.js");
const watchedFiles = [...new Set(mutations.map(m => path.join(ROOT, m.file)))].concat([BUILT]);
const snapshot = new Map();
for (const f of watchedFiles) {
  if (fs.existsSync(f)) snapshot.set(f, fs.readFileSync(f, "utf8"));
}

/** 開始時点の中身と食い違っているファイル。 */
function changedFromSnapshot() {
  const out = [];
  for (const [f, content] of snapshot) {
    if (!fs.existsSync(f) || fs.readFileSync(f, "utf8") !== content) {
      out.push(path.relative(ROOT, f));
    }
  }
  return out;
}

let ran = 0, skipped = 0;
const results = [];

for (const m of mutations) {
  if (only && m.name.indexOf(only) === -1) { skipped++; continue; }

  const abs = path.join(ROOT, m.file);
  if (!fs.existsSync(abs)) { fail(m.name, `対象ファイルが無い: ${m.file}`); continue; }

  const specRel = SPECS[m.expect];
  if (!specRel) { fail(m.name, `expect が不正: ${m.expect}（${Object.keys(SPECS).join("/")}）`); continue; }

  const original = fs.readFileSync(abs, "utf8");

  // --- find がちょうど1箇所に一致するか ---
  const hits = original.split(m.find).length - 1;
  if (hits !== 1) {
    fail(m.name, `find の一致が ${hits}箇所（1箇所でなければ変異が適用されず、緑が意味を持たない）: ${m.file}`);
    continue;
  }

  let restored = false;
  try {
    fs.writeFileSync(abs, original.replace(m.find, m.replace));
    if (!rebuildIfNeeded(m.file)) { fail(m.name, "変異後のビルドに失敗した"); continue; }

    const r = cp.spawnSync("node", [specRel], { cwd: ROOT, encoding: "utf8" });
    ran++;
    if (r.status === 0) {
      const head = (r.stdout || "").trim().split("\n").slice(0, 3).join(" / ");
      fail(m.name, `壊したのに ${specRel} が緑のまま（EXIT=0）。${head}`);
      results.push({ name: m.name, spec: m.expect, ok: false });
    } else {
      results.push({ name: m.name, spec: m.expect, ok: true });
    }
  } finally {
    // --- 必ず戻す ---
    // ソースを戻すだけでは足りない。作業ツリー全体で確認しないと、
    // 「戻したつもり」のまま次の変異に進み、汚染が積み上がる。
    // どの変異で崩れたかを言えるよう、毎回ここで見る。
    fs.writeFileSync(abs, original);
    rebuildIfNeeded(m.file);
    restored = fs.readFileSync(abs, "utf8") === original;
    if (!restored) fail(m.name, `復元できていない: ${m.file}`);

    const drift = changedFromSnapshot();
    if (drift.length) fail(m.name, `この変異のあと、開始時の中身と食い違っている: ${drift.join(", ")}`);
  }
}

// --- 復元の最終確認（ソースだけでなくビルド成果物も中身で照合する） ---
{
  const r = cp.spawnSync("node", ["tools/build-questions.js"], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) fail("復元の最終確認", "questions.js の再生成に失敗した");

  const drift = changedFromSnapshot();
  if (drift.length) fail("復元の最終確認", `開始時の中身に戻っていないファイル: ${drift.join(", ")}`);
}

// --- 出力 ---
console.log(`破壊テスト: ${mutations.length}件の変異${only ? `（"${only}" で絞り込み / 実行 ${ran}件）` : ""}`);
for (const r of results) {
  console.log(`   ${r.ok ? "✅" : "❌"} [${r.spec}] ${r.name}`);
}
if (skipped) console.log(`   （${skipped}件は絞り込みで除外）`);

if (!failures.length) {
  console.log(`   ✅ ${ran}件すべて、壊すと検査が落ちた（検査が本当に効いている）`);
} else {
  console.log(`\n   ❌ ${failures.length}件`);
  for (const f of failures) console.log(`   - ${f.name}: ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
