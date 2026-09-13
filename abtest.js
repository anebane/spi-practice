/**
 * ABテストの群わけ。
 *
 * ⚠️ なぜ独立したファイルなのか（2026-09-11）
 * 最初 app.js の中に書いたが、**記事ページには app.js が無い**。
 * 記事ページにも広告を出すので、両方から使える形にする必要がある。
 * 同じ判定を2箇所に書くと、片方だけ直す事故が必ず起きる。
 *
 * ⚠️ なぜ群わけが要るのか
 * 広告を「収益が増えたか」だけで判断すると必ず間違える。
 * 試験画面に広告を出せば**完走率が下がりうる**（2026-09時点で62%）。
 * 月2,000円増えて完走率が10pt下がるなら、それは損。完走率はこのサイトの
 * 価値そのものだから。**同じ期間に両方を測れる形にする。**
 */
(function (global) {
  "use strict";

  var AB_KEY = "ab_group_v1";
  var AB_GROUPS = ["control", "ads"];
  var cache = null;

  /**
   * この利用者の群を返す。利用者ごとに固定される。
   *
   * ⚠️ 毎回振り直すと、同じ人が広告あり・なしを行き来して、
   *    完走率の差が薄まり**効果があっても無いように見える。**
   *
   * ⚠️ localStorage が使えない環境（プライベートウィンドウ、サイトデータを
   *    拒否する設定）では "unassigned" を返す。そこで例外を投げると
   *    その利用者の計測が全部消え、集計では「少し減った」としか見えない。
   *    固定できない以上、群に入れない（集計から外せるようにする）。
   */
  function abGroup() {
    if (cache !== null) return cache;
    try {
      var v = global.localStorage.getItem(AB_KEY);
      if (AB_GROUPS.indexOf(v) < 0) {
        v = AB_GROUPS[Math.floor(Math.random() * AB_GROUPS.length)];
        global.localStorage.setItem(AB_KEY, v);
      }
      cache = v;
    } catch (e) {
      cache = "unassigned";
    }
    return cache;
  }

  /**
   * 広告をこの利用者に出してよいか。
   *
   * ⚠️ 群の判定を各所に散らさない。「どこに出すか」は呼び出し側が決め、
   *    「出してよいか」はここだけが決める。散らすと、片方だけ直す事故が起きる。
   * ⚠️ unassigned には出さない。出すと対照群が汚れる。
   */
  function abShowAds() {
    return abGroup() === "ads";
  }

  global.abGroup = abGroup;
  global.abShowAds = abShowAds;

  // 検査から直接読めるようにしておく（Node で読み込んだときだけ）
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { abGroup: abGroup, abShowAds: abShowAds, AB_GROUPS: AB_GROUPS, AB_KEY: AB_KEY };
  }
})(typeof window !== "undefined" ? window : this);
