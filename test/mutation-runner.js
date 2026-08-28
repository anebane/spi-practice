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
 * 【途中で死んでも壊さないための3点】
 * このランナーは作業ファイルを書き換えて戻す。途中で止まると変異が残り、
 * 次の実行が汚染された状態から始まって原因不明の失敗を出す。実際に
 * 2026-08-28、外部からタイムアウトで殺されて4ファイルが汚染され、
 * 別セッションで「修正済みの退行が再現しない」という調査に時間を取られた。
 *   1. ロックファイル … 同時に2つ走らせない
 *   2. 例外での復元 … finally と exit ハンドラで必ず戻す
 *   3. 開始時に対象ファイルが汚れていたら拒否 … 復元の基準が作れないため
 *
 * ⚠️ シグナルについて、実測で分かったこと。
 *    このランナーは最初から最後まで同期処理（spawnSync）なので、
 *    **イベントループが回らず、シグナルハンドラは途中では走らない。**
 *    SIGTERM/SIGINT を受けてもその場では止まらず、最後まで走りきってから
 *    通常どおり復元して終わる（自己検査で確認済み。結果は「汚染なし」）。
 *    「シグナルで即座に復元して止まる」とは書けない。
 *
 * ⚠️ SIGKILL(-9) は捕まえられない。実際に外から強制終了させたところ、
 *    変異が1件残り questions.js もソースと不一致になった。
 *    このときは 1 と 3 が効く。ロックが残るので次回起動が
 *    「前回が異常終了した形跡がある」と言って止まり、対象ファイルが
 *    汚れているのでどちらにせよ起動しない。実測で確認した。
 */
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.join(__dirname, "..");
const MUTATIONS = path.join(__dirname, "mutations.json");
const LOCK = path.join(__dirname, ".mutation-runner.lock");
const BUILT = path.join(ROOT, "questions.js");

const SPECS = {
  affiliate: "test/affiliate.spec.js",
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
// 再ビルドを意図的に失敗させる自己検査の口。
// 「復元の失敗が原因として名指しされるか」を、実際に失敗させて確かめるために要る。
// 例: MUTATION_RUNNER_BREAKBUILD=2 → 復元中の再ビルドを2回失敗したことにする
//     （ファイルには触らないので、ツリーは汚れない）
// 変異を当てるときのビルドは壊さない。壊すとそこで continue して復元の検査に届かない。
let breakBuild = parseInt(process.env.MUTATION_RUNNER_BREAKBUILD || "0", 10) || 0;
let restoringNow = false;

function rebuildIfNeeded(file) {
  if (file.indexOf("src/questions/") !== 0) return { ok: true };
  if (restoringNow && breakBuild > 0) {
    breakBuild--;
    return { ok: false, status: 99, detail: "自己検査: 再ビルドを失敗したことにした" };
  }
  const r = cp.spawnSync("node", ["tools/build-questions.js"], { cwd: ROOT, encoding: "utf8" });
  if (r.status === 0) return { ok: true };
  // 失敗の理由を捨てない。捨てると「食い違っている」という症状しか残らない。
  const detail = ((r.stderr || "") + (r.stdout || "")).trim().split("\n").slice(-3).join(" / ")
              || (r.error ? r.error.message : "出力なし");
  return { ok: false, status: r.status, detail };
}

// ============================================================
// 1. ロック（同時実行の防止）
// ============================================================
function processAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

function acquireLock() {
  try {
    fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" });
    return { ok: true };
  } catch (e) {
    if (e.code !== "EEXIST") return { ok: false, why: `ロックを作成できません: ${e.message}` };
    const pid = parseInt(fs.readFileSync(LOCK, "utf8").trim(), 10);
    if (pid && processAlive(pid)) {
      return { ok: false, why: `別のランナー（PID ${pid}）が実行中です。同時に走らせると互いの復元を上書きします` };
    }
    return {
      ok: false,
      why: `前回の実行（PID ${pid || "不明"}）が異常終了した形跡があります。`
         + `作業ツリーに変異が残っていないか確認し、${path.relative(ROOT, LOCK)} を削除してから再実行してください`
    };
  }
}

let lockHeld = false;
function releaseLock() {
  if (!lockHeld) return;
  try { fs.unlinkSync(LOCK); } catch (e) {}
  lockHeld = false;
}

// ============================================================
// 2. 復元（シグナル・例外でも必ず戻す）
// ============================================================
let active = null;      // いま変異を当てているファイル { abs, file, original }

// 復元は「戻した」だけでは終わっていない。ソースを書き戻しても再ビルドが失敗すると
// questions.js に変異が残る。そのとき見えるのは「開始時の中身と食い違っている」という
// 症状だけで、原因（再ビルドの失敗）は消える。ここで戻り値を見て、原因を名指しする。
// 戻り値: null = 成功 / 文字列 = 失敗の理由
function restoreActive() {
  if (!active) return null;
  const a = active;
  active = null;
  try {
    fs.writeFileSync(a.abs, a.original);
  } catch (e) {
    return `ソースの書き戻しに失敗した（${a.file}）: ${e.message}`;
  }
  // 書き戻しても中身が違うなら、他プロセスが同じファイルを触っている。
  let back;
  try { back = fs.readFileSync(a.abs, "utf8"); }
  catch (e) { return `書き戻したソースを読み直せない（${a.file}）: ${e.message}`; }
  if (back !== a.original) {
    return `ソースを書き戻したのに中身が違う（${a.file}）。他のプロセスが同じファイルを触っている`;
  }
  // 再ビルドは失敗しうる。一度だけやり直し、それでも駄目なら理由を返す。
  restoringNow = true;
  try {
    for (let i = 0; i < 2; i++) {
      const r = rebuildIfNeeded(a.file);
      if (r.ok) return null;
      if (i === 1) {
        return `${a.file} は戻したが questions.js の再生成に2回とも失敗した`
             + `（EXIT=${r.status}）: ${r.detail}`;
      }
    }
  } finally { restoringNow = false; }
  return null;
}

let bailing = false;
function bail(reason, code) {
  if (bailing) return;
  bailing = true;
  restoreActive();
  releaseLock();
  console.error(`\n⚠️ ${reason} 変異を復元してから終了しました。`);
  process.exit(code);
}
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => bail(`${sig} を受け取りました。`, 130));
}
process.on("uncaughtException", (e) => {
  restoreActive(); releaseLock();
  console.error(e);
  process.exit(1);
});
process.on("exit", () => { restoreActive(); releaseLock(); });

// ============================================================
// 3. 開始前の点検
// ============================================================
const watchedFiles = [...new Set(mutations.map(m => path.join(ROOT, m.file)))].concat([BUILT]);
const watchedRel = watchedFiles.map(f => path.relative(ROOT, f));

function preflight() {
  const g = cp.spawnSync("git", ["status", "--porcelain", "--"].concat(watchedRel),
    { cwd: ROOT, encoding: "utf8" });
  if (g.status !== 0) {
    console.log("   ℹ️ git が使えないため、開始前の作業ツリー点検はスキップしました");
    return { ok: true };
  }
  const dirty = (g.stdout || "").split("\n").map(l => l.replace(/^..\s+/, "").trim()).filter(Boolean);
  if (dirty.length) {
    // 止めるだけでは「なぜ動かないのか」で終わる。何が汚れていて、
    // どう戻すのかまで出す。前回の異常終了で変異が残っている場合、
    // 汚染そのものは誰かが戻すまで残り続けるため。
    const lines = [
      "変異の対象ファイルに未コミットの変更があります。復元の基準が作れないので実行しません。",
      "",
      "     汚れているファイル:"
    ];
    for (const f of dirty) lines.push(`       - ${f}`);
    lines.push("");
    lines.push("     前回の実行が強制終了された場合、変異が残ったままの可能性があります。");
    lines.push("     意図した変更が無いなら、次で元に戻せます:");
    lines.push(`       git checkout -- ${dirty.join(" ")}`);
    if (dirty.some(f => f.indexOf("src/questions/") === 0)) {
      lines.push("       node tools/build-questions.js   # questions.js を作り直す");
    }
    lines.push("");
    lines.push("     意図した変更なら、コミットしてから再実行してください。");
    return { ok: false, why: lines.join("\n") };
  }
  return { ok: true };
}

const lock = acquireLock();
if (!lock.ok) {
  console.log("破壊テスト: 起動しませんでした");
  console.log(`   ❌ ${lock.why}`);
  process.exit(1);
}
lockHeld = true;

const pre = preflight();
if (!pre.ok) {
  console.log("破壊テスト: 起動しませんでした");
  console.log(`   ❌ ${pre.why}`);
  process.exit(1);
}

// 開始時点の中身を控える。git ではなく中身で照合する。
// git の差分で確かめると、開始時に既に変更されていたファイルは
// 「もともと汚れている」扱いになり、その後どう壊れても気づけない。
const snapshot = new Map();
for (const f of watchedFiles) {
  if (fs.existsSync(f)) snapshot.set(f, fs.readFileSync(f, "utf8"));
}
function changedFromSnapshot() {
  const out = [];
  for (const [f, content] of snapshot) {
    const rel = path.relative(ROOT, f);
    if (!fs.existsSync(f)) { out.push(`${rel}（消えている）`); continue; }
    const now = fs.readFileSync(f, "utf8");
    if (now === content) continue;
    // 「食い違っている」だけでは何が起きたのか分からない。
    // 最初に違う位置とその周辺を出して、変異が残ったのか別物なのかを見分ける。
    let i = 0;
    while (i < now.length && i < content.length && now[i] === content[i]) i++;
    const near = JSON.stringify(now.slice(Math.max(0, i - 30), i + 40));
    out.push(`${rel}（${content.length}→${now.length}バイト / 相違位置 ${i} 付近: ${near}）`);
  }
  return out;
}

// ============================================================
// 4. 実行
// ============================================================
let ran = 0, skipped = 0;
const results = [];

for (const m of mutations) {
  if (only && m.name.indexOf(only) === -1) { skipped++; continue; }

  const abs = path.join(ROOT, m.file);
  if (!fs.existsSync(abs)) { fail(m.name, `対象ファイルが無い: ${m.file}`); continue; }

  const specRel = SPECS[m.expect];
  if (!specRel) { fail(m.name, `expect が不正: ${m.expect}（${Object.keys(SPECS).join("/")}）`); continue; }

  // --- 変異を当てる前に、外から書き換えられていないかを見る ---
  //
  // 自分で戻したはずのファイルが、次の変異までの間に別の中身になっていることが
  // 実際に起きた（エディタが古いバッファを保存した等、リポジトリ外の要因）。
  // そのまま続けると、以降の変異すべてが「食い違っている」と報告されて
  // 本当の原因が埋もれ、汚染も残ったままになる。
  // 気づいた時点で止めて、何が起きたかと戻し方を出す。
  {
    const drift = changedFromSnapshot();
    if (drift.length) {
      const files = [...snapshot.keys()].map(f => path.relative(ROOT, f));
      console.log(`破壊テスト: ${m.name} の直前で中断しました`);
      console.log("   ❌ このランナー以外が対象ファイルを書き換えています。");
      for (const d of drift) console.log(`      - ${d}`);
      console.log("");
      console.log("   実行中にエディタや別のプロセスが同じファイルを保存していないか確認してください。");
      console.log("   戻すには:");
      console.log(`     git checkout -- ${files.join(" ")}`);
      console.log("     node tools/build-questions.js");
      releaseLock();
      process.exit(1);
    }
  }

  const original = fs.readFileSync(abs, "utf8");

  // --- find がちょうど1箇所に一致するか ---
  const hits = original.split(m.find).length - 1;
  if (hits !== 1) {
    fail(m.name, `find の一致が ${hits}箇所（1箇所でなければ変異が適用されず、緑が意味を持たない）: ${m.file}`);
    continue;
  }

  try {
    active = { abs, file: m.file, original };
    fs.writeFileSync(abs, original.replace(m.find, m.replace));
    const built = rebuildIfNeeded(m.file);
    if (!built.ok) { fail(m.name, `変異後のビルドに失敗した（EXIT=${built.status}）: ${built.detail}`); continue; }

    const r = cp.spawnSync("node", [specRel], { cwd: ROOT, encoding: "utf8" });
    ran++;

    // --- 自己検査用の中断フック ---
    // 「途中で死んでも復元される」を確かめるための口。
    // 他プロセスを殺す手段に頼らず、変異を当てたまま落ちられるようにしておく。
    // 例: MUTATION_RUNNER_ABORT=1  → 1件目のあとに例外で落ちる
    if (process.env.MUTATION_RUNNER_ABORT
        && ran === parseInt(process.env.MUTATION_RUNNER_ABORT, 10)) {
      throw new Error("自己検査: 変異を当てたまま例外で落ちる");
    }

    // 外部からの書き換えを検出できるかを確かめる口。
    // 例: MUTATION_RUNNER_TAMPER=1 → 1件目のあとに別のファイルを勝手に書き換える
    if (process.env.MUTATION_RUNNER_TAMPER
        && ran === parseInt(process.env.MUTATION_RUNNER_TAMPER, 10)) {
      const victim = [...snapshot.keys()].find(f => f !== abs);
      if (victim) fs.writeFileSync(victim, fs.readFileSync(victim, "utf8") + "\n// 外部からの書き換え\n");
    }
    if (r.status === 0) {
      const head = (r.stdout || "").trim().split("\n").slice(0, 3).join(" / ");
      fail(m.name, `壊したのに ${specRel} が緑のまま（EXIT=0）。${head}`);
      results.push({ name: m.name, spec: m.expect, ok: false });
    } else {
      results.push({ name: m.name, spec: m.expect, ok: true });
    }
  } finally {
    // 復元の失敗は、それ自体を名指しする。これを飛ばすと下の drift が
    // 「食い違っている」という症状だけを見せ、原因が分からなくなる。
    const why = restoreActive();
    if (why) fail(m.name, `復元に失敗した: ${why}`);
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
releaseLock();
process.exit(failures.length ? 1 : 0);
