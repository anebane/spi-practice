/**
 * 変異ランナーが動いている最中に、作業ツリーへ書き込まないための門番。
 *
 * 【なぜ必要か】
 * 変異ランナーは「元の中身を控える → 変異を当てる → 検査 → 復元」を
 * 高速に繰り返す。その最中に別のコマンドが同じツリーへ書くと、
 *   ・ランナーの復元検査が誤検知する
 *   ・最悪、変異が当たった状態の questions.js が焼き込まれる
 * 2026-08-29 の朝、ランナー同士の並走で実際にツリーが壊れた。
 * 相手はランナーでなくてもよい。build-questions.js でも同じことが起きる。
 *
 * 実測（2026-08-29）: ツリーに書き込む7本のうち、ロックを見ていたのは0本。
 *
 * ⚠️ 禁止するだけにはしない。正当に動かしたい場面（ランナーが異常終了して
 *    ロックが残った等）で回避できないと、いずれ門番ごと外される（性質A8）。
 *    IGNORE_RUNNER_LOCK=1 で明示的に越えられる。
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_LOCK = path.join(__dirname, "..", ".mutation-runner.lock");

/** 検査から差し替えられるようにしておく（本物のロックを触らずに試せる）。 */
function lockPath() {
  return process.env.RUNNER_LOCK_PATH || DEFAULT_LOCK;
}

function processAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

/**
 * ロックが有効なら、書き込まずに異常終了する。
 * @param {string} what このコマンドが何を書くか（メッセージに出す）
 */
function assertNotLocked(what) {
  const p = lockPath();
  if (!fs.existsSync(p)) return;
  if (process.env.IGNORE_RUNNER_LOCK) {
    console.error(`⚠️ 変異ランナーのロックがありますが IGNORE_RUNNER_LOCK により続行します（${what}）`);
    return;
  }
  let pid = 0;
  try { pid = parseInt(fs.readFileSync(p, "utf8").trim(), 10) || 0; } catch (e) {}
  const alive = pid && processAlive(pid);
  console.error(`❌ 変異ランナーが動いている間は ${what} を書き換えられません。`);
  console.error(alive
    ? `   実行中のランナー: PID ${pid}。終わるまで待ってください。`
    : `   ロック（${path.relative(process.cwd(), p)}）が残っていますが、PID ${pid || "不明"} は動いていません。`
      + "\n   前回のランナーが異常終了した形跡です。ツリーに変異が残っていないか確かめてから、ロックを削除してください。");
  console.error("   どうしても続行する場合は IGNORE_RUNNER_LOCK=1 を付けてください。");
  process.exit(3);
}

module.exports = { assertNotLocked, lockPath };
