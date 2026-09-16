/**
 * 記事ページの広告枠。
 *
 * 結果画面（index.html）は app.js が Affiliate.renderAll を呼ぶ。
 * 記事ページには app.js が無いので、この小さなスクリプトが同じことをする。
 *
 * ⚠️ placement は現在のURLから導く。面ごとに手で書くと、
 *    ページを増やすたびに書き間違えても誰も気づかない（同じ事実を2箇所に書かない）。
 *    面ごとに区別できないと「記事枠が効いたのか結果画面が効いたのか」を
 *    後から言えなくなる。
 *
 * ⚠️ リンクは必ず Affiliate.render() 経由。HTMLに直接書くと
 *    PR表記と対象の注記が漏れる（test/html.spec.js が直書きを禁じている）。
 */
(function () {
  /** URL から計測用の面の名前を作る。 */
  function placementOf(pathname) {
    var p = String(pathname || "/").replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");
    if (!p) return "top";
    var seg = p.split("/");
    // 複数形のディレクトリ名は単数にそろえる（article-… / category-…）
    var head = { articles: "article", categories: "category" };
    seg[0] = head[seg[0]] || seg[0];
    return seg.join("-");
  }

  // ネットワーク広告（忍者AdMax）のタグ。
  // ⚠️ PC と SP で別の枠。片方だけ貼ると、もう片方のデバイスには出ない。
  //    このサイトは PC 58% / スマホ 40%（2026-08-31〜09-10の実測）なので、
  //    どちらを落としても半分近くを失う。
  // ⚠️ アドネットワークのディスプレイ広告にはPR表記を付けない。
  //    判断の主体と根拠は test/affiliate.spec.js の冒頭に記録してある
  //    （矢野さんの判断・業界慣習。Claude 側では一次情報を確認できていない）。
  /**
   * ネットワーク広告を描く。
   *
   * ⚠️ 宣言（どのネットワークの、どの枠か）は netad.js に1箇所だけ置く。
   *    記事ページと試験・結果画面で別々に持つと、枠IDを片方だけ直す事故が起きる。
   */
  function renderNetworkAd(placement) {
    if (typeof NetAd === "undefined") return false;   // 読み込み順が崩れても落とさない
    var a = NetAd.render("network-ad-article", "article", placement);
    // 記事・解説ページのサイド。枠が無い面・狭い画面では render が false を返す。
    var b = NetAd.render("network-ad-articleside", "articleside", placement);
    return a || b;
  }

  function init() {
    var placement = placementOf(location.pathname);

    // ネットワーク広告。アフィリエイトとは独立に出す
    // （片方が無くても、もう片方は出す）。
    renderNetworkAd(placement);

    var host = document.getElementById("affiliate-article");
    if (!host) return;
    if (typeof Affiliate === "undefined") return;   // 読み込み順が崩れても落とさない
    // 記事には試験の点数が無いので percent は渡さない。
    // undefined は「点数の無い面」、NaN や null は「取り損ね」として
    // affiliate.js 側が区別する。
    Affiliate.renderAll(host, { placement: placement });
  }

  // ブラウザのときだけ動かす。検査は placementOf だけを読みたいので、
  // document が無い環境で落ちないようにしておく。
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  // 検査から placement の導き方だけを確かめられるようにしておく
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { placementOf: placementOf };
  }
})();
