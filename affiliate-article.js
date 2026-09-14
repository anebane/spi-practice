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
   * 忍者AdMax の広告枠ID（PC用・スマホ用）。**URLではなくIDだけを持つ。**
   *
   * ⚠️ 旧来の https://adm.shinobi.jp/s/<ID> というタグURLを使ってはいけない。
   *    中身が document.write で書かれており、**動的に差し込んだ <script> からの
   *    document.write はブラウザが無視する**。結果、広告が出ないどころか
   *    広告のリクエストすら飛ばない。例外も警告も出ない。
   *    2026-09-14、本番でこれを踏んだ（表示0・リクエスト0・エラー0で3日気づけず）。
   *    公式のSPA向け実装 github.com/ninjatools/admax-spa-examples に従い、
   *    admaxads キューへ積んで st/t.js に描かせる。
   */
  var NETWORK_SLOTS = {
    pc: "701e1f0351b6f71b0986f62aae5e1949",
    sp: "3699c5a4a3decd176accb15405a99283"
  };
  var ADMAX_SDK = "https://adm.shinobi.jp/st/t.js";

  /** スマホ幅かどうか。忍者AdMax が PC/SP で枠を分けているので判定が要る。 */
  function isMobile() {
    if (typeof window === "undefined") return false;
    return window.matchMedia
      ? window.matchMedia("(max-width: 767px)").matches
      : (window.innerWidth || 0) <= 767;
  }

  /**
   * ネットワーク広告を描く。
   *
   * ⚠️ ABテストの ads 群にだけ出す。control 群と、群を割り当てられない利用者
   *    （localStorage が使えない環境）には出さない。対照群が汚れると
   *    「広告を出したら完走率がどう動いたか」を後から言えなくなる。
   */
  function renderNetworkAd(placement) {
    if (typeof abShowAds !== "function" || !abShowAds()) return false;
    var slot = document.getElementById("network-ad-article");
    if (!slot) return false;

    var mobile = isMobile();
    var id = mobile ? NETWORK_SLOTS.sp : NETWORK_SLOTS.pc;

    // 枠の器を置く。SDKは data-admax-id を持つ要素を探して中身を入れる。
    // ⚠️ class は "admax-ads" 固定。管理画面が出す公式タグと同じでないと拾われない。
    //    2026-09-14、"admax-banner" と書いて拾われなかった。**推測で書かない。**
    //    タグの実物は 管理画面 → 広告枠一覧 → タグ確認 → 「非同期タグを表示」。
    var box = document.createElement("div");
    box.className = "admax-ads";
    box.setAttribute("data-admax-id", id);
    box.style.display = "inline-block";
    // PC枠は 300x250 を明示する（公式タグがそう出す）。SP枠は指定しない。
    if (!mobile) { box.style.width = "300px"; box.style.height = "250px"; }
    slot.appendChild(box);

    // ⚠️ 器を置いてからキューに積み、最後にSDKを読む。この順は公式サンプルと同じ。
    window.admaxads = window.admaxads || [];
    window.admaxads.push({ admax_id: id, type: "banner" });

    // SDKは1ページに1回だけ。二重に読むと描画側が多重起動する。
    if (!document.getElementById("admax-sdk")) {
      var script = document.createElement("script");
      script.id = "admax-sdk";
      script.src = ADMAX_SDK;
      script.async = true;
      document.head.appendChild(script);
    }
    slot.style.display = "";

    if (typeof gtag === "function") {
      // ⚠️ 群は abtest.js から取る。個別に書くと trackEvent 側とずれる。
      gtag("event", "network_ad_view", {
        network: "admax",
        device: mobile ? "sp" : "pc",
        placement: placement,
        ab_group: typeof abGroup === "function" ? abGroup() : "unknown"
      });
    }
    return true;
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
    module.exports = { placementOf: placementOf, NETWORK_SLOTS: NETWORK_SLOTS, isMobile: isMobile };
  }
})();
