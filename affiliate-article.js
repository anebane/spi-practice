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

  function init() {
    var host = document.getElementById("affiliate-article");
    if (!host) return;
    if (typeof Affiliate === "undefined") return;   // 読み込み順が崩れても落とさない
    // 記事には試験の点数が無いので percent は渡さない。
    // undefined は「点数の無い面」、NaN や null は「取り損ね」として
    // affiliate.js 側が区別する。
    Affiliate.renderAll(host, { placement: placementOf(location.pathname) });
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
  if (typeof module !== "undefined" && module.exports) module.exports = { placementOf: placementOf };
})();
