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
 * さらに、各 spec の失敗経路（fail() / failures.push() / process.exitCode = 1 /
 * process.exit(1)）を列挙し、全変異の実行で一度も発火しなかったものを
 * 「どの変異でも落ちない検査」として EXIT=1 にする。
 * 「検査を足したら、それを落とす変異も足す」という義務はこれまで口約束で、
 * 実際 2026-08-28 に、変異の無い検査2本が足した瞬間から死んだ状態で入った。
 * 義務はここで機械的に課す。どうしても変異を書けない失敗経路だけ、
 * 理由を添えて test/mutations-uncovered.json に登録する（台帳は縮む方向にのみ動かす）。
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
const { processSource, withKeys, siteKey } = require("./helpers/fail-sites.js");
const COVLOG = path.join(__dirname, ".mutation-coverage.log");     // 失敗経路の発火記録
const REGISTER = path.join(__dirname, "mutations-uncovered.json"); // 未カバーの台帳

const SPECS = {
  affiliate: "test/affiliate.spec.js",
  analytics: "test/analytics.spec.js",
  app: "test/app.spec.js",
  deeplink: "test/deeplink.spec.js",
  generator: "test/generator.spec.js",
  html: "test/html.spec.js",
  pwa: "test/pwa.spec.js",
  tools: "test/tools.spec.js",
  wiring: "test/wiring.spec.js"
};

// 台帳の構造だけを検査して終わる口。変異を1件も回さないので速い。
// ⚠️ 台帳の _readme に書いてあるルールのうち、これまで機械で効いていたのは
//    「理由(why)が要る」と「重複禁止」の2つだけだった。
//    「接頭辞 A/B/C を付ける」「新規にAを足さない」「縮む方向にのみ動かす」は
//    文章だけで、破っても何も落ちなかった（2026-08-29に実測）。
//    口約束のままにせず、ここで機械の義務にする。
if (process.argv.includes("--check-ledger")) {
  const problems = [];
  let reg = { sites: [] };
  try { reg = JSON.parse(fs.readFileSync(REGISTER, "utf8")); }
  catch (e) { problems.push(`台帳が読めない: ${e.message}`); }
  const sites = reg.sites || [];

  const seen = new Set();
  // 実際の書式: "2026-08-29 A(借金/変異は書ける): ..." のように日付が先に来る。
  // 分類の記号だけを探す（日付の有無は問わない）。
  const prefix = /(^|\s)([ABC])\(/;
  for (const r of sites) {
    const key = `${r.file}##${r.text}##${r.nth || 0}`;
    if (seen.has(key)) problems.push(`重複した項目: ${r.file} 「${r.text}」`);
    seen.add(key);
    if (!r.why) { problems.push(`理由(why)が無い: ${r.file} 「${r.text}」`); continue; }
    const m = prefix.exec(r.why);
    if (!m) {
      problems.push(`分類の接頭辞が無い: ${r.file} 「${r.text}」… why は A( B( C( のいずれかで始める`);
    }
  }

  // 縮む方向にのみ動かす。HEAD と比べて件数が増えていたら止める。
  // 「新規にAを足すのは違反」も、Aの件数が増えないことで見る。
  const cp2 = require("child_process");
  const head = cp2.spawnSync("git", ["show", `HEAD:${path.relative(ROOT, REGISTER)}`],
    { cwd: ROOT, encoding: "utf8" });
  if (head.status === 0) {
    let before = { sites: [] };
    try { before = JSON.parse(head.stdout); } catch (e) {}
    const countA = (x) => (x.sites || []).filter(r => /(^|\s)A\(/.test(r.why || "")).length;
    const nowAll = sites.length, wasAll = (before.sites || []).length;
    const nowA = countA(reg), wasA = countA(before);
    if (nowAll > wasAll) {
      problems.push(`台帳が増えている: ${wasAll} → ${nowAll}件。台帳は縮む方向にのみ動かす`);
    }
    if (nowA > wasA) {
      problems.push(`A（借金）が増えている: ${wasA} → ${nowA}件。`
        + "Aは「変異を書けるのにまだ書いていない」項目なので、新規に足してはいけない");
    }
  } else {
    problems.push("HEAD の台帳を取り出せないので、増減を判定できない（浅いクローン？）");
  }

  console.log(`台帳の検査: ${sites.length}件`);
  if (!problems.length) { console.log("   ✅ 理由・接頭辞・重複・増減のいずれも違反なし"); process.exit(0); }
  console.log(`   ❌ ${problems.length}件`);
  for (const p of problems) console.log(`   - ${p}`);
  process.exit(1);
}

const only = process.argv[2] || null;   // 変異名の一部で絞り込める（開発用）

// 未カバーの失敗経路の検出は、全変異を実行したときだけ意味を持つ
// （絞り込み実行では「発火しなかった」が「変異を走らせていない」と区別できない）。
const coverageOn = !only;

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

function sleepMs(ms) {
  // ランナーは最初から最後まで同期処理なので、待ちも同期で行う
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** ロックファイルの中身がいまも自分の PID か。 */
function lockStillMine() {
  try { return fs.readFileSync(LOCK, "utf8").trim() === String(process.pid); }
  catch (e) { return false; }
}

// ⚠️ 2026-08-28 に、排他ロックがあるのに二重起動が起きた。
//    旧実装は「死んだ PID のロックが残っていたら、人がロックを消して再実行」させる
//    作りで、その削除の手順に何の排他も無かった。並行するエージェントが同じ案内を
//    見て同じ削除をやると、2回目の削除は**生きたランナーのロック**を消す。
//    消えた後の wx 作成は成功するので、二重起動になる。
//    対策は3枚:
//      1. 死んだ PID のロックは人手を挟まず自分で引き取る（下）
//      2. 取得直後に中身を読み直し、自分の PID でなければ負けを認める（下）
//      3. 変異1件ごとにロックの所有を確かめ、失っていたら復元して退く（実行ループ）
//    2プロセスがほぼ同時に引き取ると unlink と作成が交錯しうるが、2 で片方が退き、
//    それでもすり抜けた場合は 3 が1変異以内に捕まえる。
function acquireLock() {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" });
    } catch (e) {
      if (e.code !== "EEXIST") return { ok: false, why: `ロックを作成できません: ${e.message}` };
      let raw = null;
      try { raw = fs.readFileSync(LOCK, "utf8"); }
      catch (e2) { continue; }   // 見た直後に消えた。作成からやり直す
      const pid = parseInt(raw.trim(), 10);
      if (pid && processAlive(pid)) {
        return { ok: false, why: `別のランナー（PID ${pid}）が実行中です。同時に走らせると互いの復元を上書きします` };
      }
      console.log(`   ℹ️ 前回の実行（PID ${pid || "不明"}）は異常終了しています。残ったロックを引き取ります`);
      console.log("      （変異が残っていないかは、この後の開始前点検で確かめます）");
      try { fs.unlinkSync(LOCK); } catch (e3) {}
      continue;
    }
    // 取れた「つもり」の直後の確認。同時に引き取った相手がいれば中身が違う。
    sleepMs(120);
    if (lockStillMine()) return { ok: true };
    return { ok: false, why: "ロックの取得が別のランナーと競合しました（相手が実行中です）" };
  }
  return { ok: false, why: "ロックの取得を繰り返し試みましたが、競合が解消しませんでした" };
}

let lockHeld = false;
function releaseLock() {
  if (!lockHeld) return;
  lockHeld = false;
  // 自分のロックであることを確かめてから消す。無条件に消すと、
  // 外部でロックが差し替わっていた場合に**他人の**ロックを消して、
  // さらに次のランナーの起動を許してしまう。
  try {
    if (fs.readFileSync(LOCK, "utf8").trim() === String(process.pid)) fs.unlinkSync(LOCK);
    else console.error("   ⚠️ ロックの中身が自分の PID ではありません。外部で消される・奪われた形跡があります。残っているロックには触りません");
  } catch (e) {}
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
  const reasons = [];

  // 書き戻す**前に**、変異を当ててから今までの間の外部の書き換えを見る。
  // これを見ずに書き戻すと、外部の編集を黙って上書きして消してしまい、
  // 直後の drift 照合はスナップショットと一致するため何も報告しない。
  // 「実行中に加えた編集が drift として報告されない」（2026-08-28）の原因は
  // この盲点。変異中のファイルだけは、外部の編集が復元で消えるのに無報告だった。
  let current = null;
  try { current = fs.readFileSync(a.abs, "utf8"); }
  catch (e) { /* 読めなくても復元は試みる。差異は下の read-back で出る */ }
  if (current !== null && a.mutated !== undefined && current !== a.mutated) {
    reasons.push(`変異の実行中に ${a.file} が外部から書き換えられていた。`
      + "復元で上書きしたため、その編集は失われている。"
      + "実行中のエディタ保存や並行エージェントの作業が無いか確認すること");
  }

  try {
    fs.writeFileSync(a.abs, a.original);
  } catch (e) {
    reasons.push(`ソースの書き戻しに失敗した（${a.file}）: ${e.message}`);
    return reasons.join(" / ");
  }
  // 書き戻しても中身が違うなら、他プロセスが同じファイルを触っている。
  let back;
  try { back = fs.readFileSync(a.abs, "utf8"); }
  catch (e) {
    reasons.push(`書き戻したソースを読み直せない（${a.file}）: ${e.message}`);
    return reasons.join(" / ");
  }
  if (back !== a.original) {
    reasons.push(`ソースを書き戻したのに中身が違う（${a.file}）。他のプロセスが同じファイルを触っている`);
  }
  // 再ビルドは失敗しうる。一度だけやり直し、それでも駄目なら理由を返す。
  restoringNow = true;
  try {
    for (let i = 0; i < 2; i++) {
      const r = rebuildIfNeeded(a.file);
      if (r.ok) break;
      if (i === 1) {
        reasons.push(`${a.file} は戻したが questions.js の再生成に2回とも失敗した`
             + `（EXIT=${r.status}）: ${r.detail}`);
      }
    }
  } finally { restoringNow = false; }
  return reasons.length ? reasons.join(" / ") : null;
}

let bailing = false;
function bail(reason, code) {
  if (bailing) return;
  bailing = true;
  const why = restoreActive();          // 復元時の異常も握り潰さず出す
  if (why) console.error(`⚠️ ${why}`);
  releaseLock();
  console.error(`\n⚠️ ${reason} 変異を復元してから終了しました。`);
  process.exit(code);
}
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => bail(`${sig} を受け取りました。`, 130));
}
process.on("uncaughtException", (e) => {
  const why = restoreActive();
  if (why) console.error(`⚠️ ${why}`);
  releaseLock();
  console.error(e);
  process.exit(1);
});
process.on("exit", () => {
  const why = restoreActive();
  if (why) console.error(`⚠️ ${why}`);
  cleanupInstrumented();
  releaseLock();
});

/** 計装した spec の一時コピー（test/.cov-run-*）を消す。 */
function cleanupInstrumented() {
  let names = [];
  try { names = fs.readdirSync(__dirname); } catch (e) { return; }
  for (const f of names) {
    if (f.indexOf(".cov-run-") === 0) {
      try { fs.unlinkSync(path.join(__dirname, f)); } catch (e) {}
    }
  }
}

// ============================================================
// 3. 開始前の点検
// ============================================================
const watchedFiles = [...new Set(mutations.map(m => path.join(ROOT, m.file)))].concat([BUILT]);
const watchedRel = watchedFiles.map(f => path.relative(ROOT, f));

function preflight() {
  // ⚠️ ここで git status --porcelain を使ってはいけない。
  //    git は (mtime, サイズ, inode) の stat キャッシュが揃うと中身を読まずに
  //    「クリーン」を返す。書いて即戻すこのランナーは、まさにその条件を作る。
  //    2026-08-28 実測: status はクリーン、update-index --really-refresh で M。
  //    git には HEAD の中身だけを出させ（git show は index に触れない）、
  //    比較は自前でバイト単位に行う。
  const head = cp.spawnSync("git", ["rev-parse", "--verify", "HEAD"], { cwd: ROOT, encoding: "utf8" });
  if (head.status !== 0) {
    console.log("   ℹ️ git が使えないため、開始前の作業ツリー点検はスキップしました");
    return { ok: true };
  }
  const dirty = [];
  for (const rel of watchedRel) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;   // 実在しない対象は変異の適用時に個別に報告される
    const posix = rel.split(path.sep).join("/");
    const g = cp.spawnSync("git", ["show", "HEAD:" + posix], { cwd: ROOT });
    if (g.status !== 0) { dirty.push(rel + "（HEAD に存在しない＝未コミット）"); continue; }
    if (!g.stdout.equals(fs.readFileSync(abs))) dirty.push(rel);
  }
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
    lines.push(`       git checkout -- ${dirty.map(f => f.split("（")[0]).join(" ")}`);
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

// 計装コピー(.cov-run-*)は preflight より前に消す。SIGKILL で死んだ実行は
// 「コピー残留」と「ツリー汚染」を同時に残し、汚染が preflight を止める限り
// コピーも永久に残り続けた（wiring.spec.js の誤検知として表面化。2026-08-29）。
// ロック取得後なので、生きている別ランナーの作業中コピーを消すことはない。
cleanupInstrumented();

const pre = preflight();
if (!pre.ok) {
  console.log("破壊テスト: 起動しませんでした");
  console.log(`   ❌ ${pre.why}`);
  process.exit(1);
}

// 前回のカバレッジ記録を消す（残っていると前回の発火が混ざる）。
// こちらは preflight の後に残す。起動を拒否された場合でも、直前に完走した
// 全件実行の発火記録は prune-uncovered.js の入力として意味を持ち続けるため。
if (coverageOn) { try { fs.unlinkSync(COVLOG); } catch (e) {} }

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
let lockLost = false;   // 実行中にロックを失ったら立てる。以降の変異と最終確認を中止する

for (const m of mutations) {
  if (only && m.name.indexOf(only) === -1) { skipped++; continue; }

  // ロックの所有を1件ごとに確かめる。外部でロックが消される・奪われると
  // 二重起動が起き、互いの復元を上書きする（2026-08-28に実際に起きた）。
  // 失った側は、これ以上ファイルに触らず退く（この時点で変異は当たっていない）。
  if (!lockStillMine()) {
    console.log(`破壊テスト: ${m.name} の直前で中断しました`);
    console.log("   ❌ ロックファイルが外部で削除または書き換えられています。");
    console.log("      別のランナーが起動している可能性があるため、ここで終了します。");
    lockHeld = false;   // もう自分のロックではない。exit ハンドラで消させない
    process.exit(1);
  }

  const abs = path.join(ROOT, m.file);
  if (!fs.existsSync(abs)) { fail(m.name, `対象ファイルが無い: ${m.file}`); continue; }

  const specRel = SPECS[m.expect];
  if (!specRel) { fail(m.name, `expect が不正: ${m.expect}（${Object.keys(SPECS).join("/")}）`); continue; }

  // spec への変異は行数を変えてはいけない。発火の記録は「ファイル:行」なので、
  // 行がずれると、その行より下の発火がすべて別の失敗経路に紐付いてしまう。
  if (coverageOn && Object.values(SPECS).indexOf(m.file) !== -1
      && m.find.split("\n").length !== m.replace.split("\n").length) {
    fail(m.name, "spec ファイルへの変異が行数を変えている。カバレッジの行対応が壊れるため、同じ行数で書くこと");
    continue;
  }

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
    const mutated = original.replace(m.find, m.replace);
    active = { abs, file: m.file, original, mutated };
    fs.writeFileSync(abs, mutated);
    const built = rebuildIfNeeded(m.file);
    if (!built.ok) { fail(m.name, `変異後のビルドに失敗した（EXIT=${built.status}）: ${built.detail}`); continue; }

    // カバレッジ計測時は、いまディスクにある spec（変異が spec 自身なら変異込み）を
    // 計装したコピーを test/ 直下に置いて実行する。同じディレクトリなので
    // 相対 require も __dirname も元の spec と同じに解決される。
    let runRel = specRel;
    if (coverageOn) {
      const instAbs = path.join(__dirname, ".cov-run-" + path.basename(specRel));
      const inst = processSource(fs.readFileSync(path.join(ROOT, specRel), "utf8"),
                                 path.basename(specRel));
      fs.writeFileSync(instAbs, inst.instrumented);
      // 計装が構文を壊したら、その場で名指しして落とす（黙って未計装で走らせない）
      const chk = cp.spawnSync("node", ["--check", instAbs], { cwd: ROOT, encoding: "utf8" });
      if (chk.status !== 0) {
        fail(m.name, `計装した spec が構文エラー。計装（helpers/fail-sites.js）が spec の書き方とずれている: ${(chk.stderr || "").trim().split("\n")[0]}`);
        continue;
      }
      runRel = path.relative(ROOT, instAbs);
    }

    const r = cp.spawnSync("node", [runRel], {
      cwd: ROOT, encoding: "utf8",
      env: coverageOn ? Object.assign({}, process.env, { MUTATION_COVERAGE_LOG: COVLOG })
                      : process.env
    });
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

    // 「変異中のファイルそのもの」を外部が書き換えた場合を確かめる口。
    // 旧実装はこれを黙って復元で上書きし、何も報告しなかった（2026-08-28 の盲点）。
    // 例: MUTATION_RUNNER_TAMPER_SELF=1 → 1件目の spec 実行後に、変異中のファイルを書き換える
    if (process.env.MUTATION_RUNNER_TAMPER_SELF
        && ran === parseInt(process.env.MUTATION_RUNNER_TAMPER_SELF, 10)) {
      fs.writeFileSync(abs, fs.readFileSync(abs, "utf8") + "\n// 変異中の外部編集\n");
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
    if (why) fail(m.name, `復元時の異常: ${why}`);
    const drift = changedFromSnapshot();
    if (drift.length) fail(m.name, `この変異のあと、開始時の中身と食い違っている: ${drift.join(", ")}`);
    // 変異1件を閉じるたびに、ロックがまだ自分のものかを確かめる。
    // ループ先頭の確認だけだと、最後の変異の実行中に失った場合に
    // 誰も気づかないまま完走してしまう（自己検査で実測した穴）。
    if (!lockLost && !lockStillMine()) {
      fail(m.name, "この変異の実行中に、ロックが外部で削除または奪取された。"
        + "別のランナーが並走している可能性があるため、以降の変異と最終確認を中止する");
      lockLost = true;
    }
  }
  if (lockLost) break;
}

// --- 復元の最終確認（ソースだけでなくビルド成果物も中身で照合する） ---
// ロックを失ったときはやらない。並走する別のランナーの変異を「戻っていない」と
// 誤認するし、再ビルドが相手の変異を questions.js に焼き込みかねない。
if (!lockLost) {
  const r = cp.spawnSync("node", ["tools/build-questions.js"], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) fail("復元の最終確認", "questions.js の再生成に失敗した");

  const drift = changedFromSnapshot();
  if (drift.length) fail("復元の最終確認", `開始時の中身に戻っていないファイル: ${drift.join(", ")}`);
}

// ============================================================
// 5. どの変異でも落ちない検査（失敗経路）の検出
// ============================================================
//
// 「検査を足したら、それを落とす変異も足す」義務をここで機械的に課す。
// 各 spec の失敗経路を列挙し、上の全変異の実行で一度も発火しなかったものを
// 失敗として報告する。0件・計装切れ・台帳の腐りも、すべて沈黙させずに落とす。
// 呼び出しは下の「出力」節（結果一覧の直後）。failures に載るので終了コードにも乗る。
function checkCoverage() {
  // 1. 復元済みの spec から失敗経路を列挙する（列挙と計装は同じ関数を使う。
  //    別実装にすると、片方だけがずれたとき嘘のカバレッジが生まれる）
  const all = [];
  for (const specRel of Object.values(SPECS)) {
    const name = path.basename(specRel);
    let src;
    try { src = fs.readFileSync(path.join(ROOT, specRel), "utf8"); }
    catch (e) { fail("カバレッジ", `${specRel} が読めない: ${e.message}`); continue; }
    const sites = withKeys(name, processSource(src, name).sites);
    if (!sites.length) {
      fail("カバレッジ", `${name} に失敗経路が1つも見つからない。`
        + "0件は「壊れているものが無い」ではなく「何も見ていない」。"
        + "抽出パターン（helpers/fail-sites.js）が spec の書き方とずれている");
      continue;
    }
    all.push(...sites);
  }
  if (!all.length) { fail("カバレッジ", "失敗経路が全 spec で0件。列挙が空回りしている"); return; }

  // 2. 発火の記録を読む
  const fired = new Set();
  try {
    for (const ln of fs.readFileSync(COVLOG, "utf8").split("\n")) if (ln) fired.add(ln);
  } catch (e) {}
  if (!fired.size) {
    fail("カバレッジ", "どの失敗経路の発火も記録されていない。"
      + "変異が検出されているのに発火ゼロはありえないので、計装が空回りしている");
    return;
  }
  // 発火したのに列挙に無い行があれば、列挙と計装（または行対応）がずれている
  const byPos = new Map(all.map(s => [s.file + ":" + s.line, s]));
  for (const f of fired) {
    if (!byPos.has(f)) fail("カバレッジ", `発火が記録された ${f} が列挙に無い。列挙と計装の行対応がずれている`);
  }

  // 3. 台帳（どうしても変異を書けない失敗経路の、理由つきの登録）
  let register = { sites: [] };
  try { register = JSON.parse(fs.readFileSync(REGISTER, "utf8")); }
  catch (e) { /* 台帳が無い＝登録ゼロとして扱う */ }
  const regByKey = new Map();
  for (const r of register.sites || []) {
    const key = siteKey(r.file, r.text, r.nth || 0);
    if (regByKey.has(key)) { fail("カバレッジ", `台帳に重複した項目: ${r.file} 「${r.text}」`); continue; }
    if (!r.why) fail("カバレッジ", `台帳の項目に理由（why）が無い: ${r.file} 「${r.text}」。理由の無い登録は許可しない`);
    regByKey.set(key, { entry: r, seen: false });
  }

  // 4. 照合
  let covered = 0, registered = 0, uncovered = 0;
  const nowCovered = [];
  for (const s of all) {
    const isFired = fired.has(s.file + ":" + s.line);
    const reg = regByKey.get(s.key);
    if (reg) reg.seen = true;
    if (isFired) { covered++; if (reg) nowCovered.push(s); continue; }
    if (reg) { registered++; continue; }
    uncovered++;
    fail("カバレッジ", `どの変異でも落ちない失敗経路: ${s.file}:${s.line} 「${s.text}」`
      + " → これを落とす変異を test/mutations.json に足す。"
      + "どうしても書けないなら、理由を添えて test/mutations-uncovered.json に登録する");
  }

  // 5. 台帳の腐りの検出
  for (const [, r] of regByKey) {
    if (!r.seen) {
      fail("カバレッジ", `台帳の項目が実体と対応しない（検査が消えたか、行が書き換わった）: `
        + `${r.entry.file} 「${r.entry.text}」→ 台帳から消すか、書き直すこと`);
    }
  }
  if (nowCovered.length) {
    // 発火は生成の乱数で揺れうるので、ここは失敗にしない。ただし必ず表に出す。
    console.log(`   ℹ️ 台帳に登録済みだが、変異で落ちるようになった失敗経路が ${nowCovered.length}件。台帳から消してよい:`);
    for (const s of nowCovered) console.log(`      - ${s.file}:${s.line} 「${s.text}」`);
  }
  console.log(`   ・失敗経路 ${all.length}件 / 変異で発火 ${covered}件 / 台帳登録 ${registered}件 / 未カバー ${uncovered}件`);
}

// --- 出力 ---
console.log(`破壊テスト: ${mutations.length}件の変異${only ? `（"${only}" で絞り込み / 実行 ${ran}件）` : ""}`);
for (const r of results) {
  console.log(`   ${r.ok ? "✅" : "❌"} [${r.spec}] ${r.name}`);
}
if (skipped) console.log(`   （${skipped}件は絞り込みで除外）`);
if (coverageOn && !lockLost) checkCoverage();
if (!coverageOn) console.log("   ℹ️ 絞り込み実行のため、未カバーの失敗経路の検出は行っていません（全件実行のときだけ行います）");

if (!failures.length) {
  console.log(`   ✅ ${ran}件すべて、壊すと検査が落ちた（検査が本当に効いている）`);
} else {
  console.log(`\n   ❌ ${failures.length}件`);
  for (const f of failures) console.log(`   - ${f.name}: ${f.detail}`);
}
releaseLock();
process.exit(failures.length ? 1 : 0);
