/**
 * 「検査できなかった」を沈黙させないための共通ヘルパ。
 *
 * 【なぜ必要か】
 * 2026-08-28 の1日で、同じ形の欠陥を5回踏んだ。
 *   ・順序推論と嘘つき問題で 0件ガードが抜けていた（0問検証して合格）
 *   ・破壊テストの find が0箇所で、変異が当たらないまま緑
 *   ・正解位置の偏り検査が5択で NaN になり、そのテンプレートだけ無検査
 *   ・導線の検査で対象0件でも緑になりうる形
 *   ・企画側の check_env.py でも同じ形
 * どれも「検査したつもり」で、**エラーも出ないので気づけない。**
 *
 * 検査の合否より先に「何件を対象にしたか」を必ず出す。0件なら失敗させる。
 * スキップしたものも件数と理由を必ず出す。沈黙は許さない。
 */
class Coverage {
  constructor(label) {
    this.label = label;
    this.rows = [];
    this.problems = [];
  }

  /**
   * この検査が何件を対象にしたかを記録する。
   * @param {string} what 何を数えたか（例: "?cat= のリンク"）
   * @param {number} n 件数
   * @param {number} [min] 最低これだけ無いとおかしい件数（既定1）
   */
  covered(what, n, min = 1) {
    this.rows.push({ kind: "covered", what, n, min });
    if (!Number.isFinite(n)) {
      this.problems.push(`${what}: 件数が数値でない（${n}）`);
    } else if (n < min) {
      this.problems.push(
        `${what}: ${n}件しか検査していない（最低${min}件必要）。`
        + "対象が取れていないので、この検査は合格の意味を持ちません");
    }
    return n;
  }

  /**
   * 判定しなかったものを記録する。件数と理由を必ず出す。
   * スキップを黙って飛ばすと「0件で緑」と見分けがつかなくなる。
   */
  skipped(what, n, why) {
    this.rows.push({ kind: "skipped", what, n, why });
  }

  /** 対象の内訳を出力する。合否に関わらず必ず呼ぶ。 */
  print() {
    for (const r of this.rows) {
      if (r.kind === "covered") {
        console.log(`   ・検査対象 ${r.what}: ${r.n.toLocaleString()}件`);
      } else if (r.n) {
        console.log(`   ・判定せず ${r.what}: ${r.n.toLocaleString()}件（${r.why}）`);
      }
    }
  }

  /** 対象が足りなかったものがあるか。 */
  get failures() { return this.problems; }
}

module.exports = { Coverage };
