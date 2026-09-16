/**
 * ネットワーク広告の宣言と描画。
 *
 * ⚠️ なぜ独立したファイルなのか（2026-09-16）
 * 記事ページは affiliate-article.js、試験・結果画面は app.js が描く。
 * 宣言を2箇所に置くと、枠IDを片方だけ直す事故が必ず起きる。
 * **どのネットワークの、どの枠か**という事実は、ここ1箇所にしか書かない。
 *
 * ⚠️ 面ごとに枠（asid）を分けてある。同じ枠を使い回すと、どの面が稼いだかを
 *    後から分けられない。「試験画面に広告を出したら完走率がどう動いたか」を
 *    金額と突き合わせられなくなる。
 *
 * ⚠️ どのタグも**非同期方式**であること。
 *    旧来の document.write 方式のタグを動的に差し込むと、ブラウザが
 *    document.write を無視するため広告のリクエストすら飛ばない。
 *    2026-09-14に忍者でこれを踏み、本番で3日気づけなかった。
 *    タグは必ず管理画面が出す実物から取る。推測で書かない。
 */
(function (global) {
  "use strict";

  var NETWORKS = {
    // i-mobile（2026-09-16 サイト審査 承認済み）
    imobile: {
      sdk: "https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104",
      sdkId: "imobile-sdk",
      pid: 85441,
      // 面 → デバイス → 枠
      // ⚠️ size は管理画面で登録した広告サイズ。**飾りではない。**
      //    CSSの器がこれより狭いと広告がはみ出す。test/html.spec.js が
      //    サイド枠について「器の幅 = size[0]」を検査している。
      //    管理画面でサイズを変えたら、ここも直さないと検査が落ちる。
      slots: {
        article: { pc: { mid: 596360, asid: 1944918, size: [300, 250] },
                   sp: { mid: 596361, asid: 1944919, size: [300, 250] } },
        result:  { pc: { mid: 596360, asid: 1944920, size: [300, 250] },
                   sp: { mid: 596361, asid: 1944922, size: [300, 250] } },
        // ⚠️ サイドはPCのみ。モバイルには横幅が無い（390px幅では本文だけで一杯）。
        //
        // ⚠️ 300x250 であって 160x600 ではない。
        //    2026-09-16、160x600（ワイドスカイスクレイパー）で枠を作ったが
        //    **広告が1件も返ってこなかった**。枠設定の誤りではないことは、
        //    同じページ・同じ位置に 300x250 の枠を当てたら描画されたことで確かめた
        //    （応答は status:200 で demander も返るのに、中身が空のまま）。
        //    サイズを縦長に戻すなら、まず在庫が来るかを1枠で試してからにする。
        examside: { pc: { mid: 596360, asid: 1944926, size: [300, 250] }, sp: null },
        // 記事・解説ページのサイド。PCのみ。300x250（理由は examside の注記）。
        // ⚠️ 記事ページは長い（実測5,588px）ので、試験画面と違って追従させる。
        //    絶対配置だと最初の1画面を過ぎたら見えなくなり、
        //    「表示は数えられるのに読まれない」状態になる。
        articleside: { pc: { mid: 596360, asid: 1944925, size: [300, 250] }, sp: null }
      },
      render: function (host, slot) {
        var elementid = "im-slot-" + slot.asid;
        if (document.getElementById(elementid)) return false;   // 二重描画を防ぐ
        var box = document.createElement("div");
        box.id = elementid;
        host.appendChild(box);
        global.adsbyimobile = global.adsbyimobile || [];
        global.adsbyimobile.push({
          pid: this.pid, mid: slot.mid, asid: slot.asid,
          type: "banner", display: "inline", elementid: elementid
        });
        return true;
      }
    },

    // 忍者AdMax（2026-09-16時点で枠が審査中。通ったら比較する）
    // ⚠️ 使っていなくても消さない。消すと戻すときに管理画面からIDを取り直す
    //    ことになり、取り違えが起きる。
    admax: {
      sdk: "https://adm.shinobi.jp/st/t.js",
      sdkId: "admax-sdk",
      slots: {
        article: { pc: "701e1f0351b6f71b0986f62aae5e1949", sp: "3699c5a4a3decd176accb15405a99283" },
        result:  { pc: null, sp: null },      // 未申請
        examside: { pc: null, sp: null }      // 未申請
      },
      render: function (host, slot) {
        var elementid = "admax-slot-" + slot;
        if (document.getElementById(elementid)) return false;
        // ⚠️ class は "admax-ads" 固定。管理画面が出す公式タグと同じでないと拾われない。
        //    2026-09-14、"admax-banner" と書いて拾われなかった。
        var box = document.createElement("div");
        box.id = elementid;
        box.className = "admax-ads";
        box.setAttribute("data-admax-id", slot);
        box.style.display = "inline-block";
        host.appendChild(box);
        global.admaxads = global.admaxads || [];
        global.admaxads.push({ admax_id: slot, type: "banner" });
        return true;
      }
    }
  };

  // ⚠️ 同じ枠に2社は出せない。どちらか一方だけが表示される。
  var ACTIVE_NETWORK = "imobile";

  /** スマホ幅かどうか。枠をデバイスで分けているので判定が要る。 */
  function isMobile() {
    if (typeof global.matchMedia === "function") return global.matchMedia("(max-width: 767px)").matches;
    return (global.innerWidth || 0) <= 767;
  }

  /**
   * 指定の面に広告を描く。
   *
   * ⚠️ ABテストの ads 群にだけ出す。control 群と、群を割り当てられない利用者
   *    （localStorage が使えない環境）には出さない。対照群が汚れると
   *    「広告を出したら完走率がどう動いたか」を後から言えなくなる。
   *
   * @param {string} placeId  枠を入れる要素のid
   * @param {string} place    "article" | "result" | "examside"
   * @param {string} where    計測用の面の名前
   */
  function render(placeId, place, where) {
    if (typeof global.abShowAds !== "function" || !global.abShowAds()) return false;
    var host = document.getElementById(placeId);
    if (!host) return false;

    var net = NETWORKS[ACTIVE_NETWORK];
    if (!net) return false;            // 宣言に無い名前。出さないほうが安全

    var mobile = isMobile();
    var byDevice = (net.slots || {})[place];
    if (!byDevice) return false;
    var slot = mobile ? byDevice.sp : byDevice.pc;
    if (!slot) return false;           // その面・そのデバイスには枠が無い（申請していない）

    if (!net.render(host, slot)) return false;

    // SDKは1ページに1回だけ。二重に読むと描画側が多重起動する。
    if (!document.getElementById(net.sdkId)) {
      var script = document.createElement("script");
      script.id = net.sdkId;
      script.src = net.sdk;
      script.async = true;
      document.head.appendChild(script);
    }
    host.style.display = "";

    if (typeof global.gtag === "function") {
      // ⚠️ 群は abtest.js から取る。個別に書くと trackEvent 側とずれる。
      global.gtag("event", "network_ad_view", {
        network: ACTIVE_NETWORK,
        device: mobile ? "sp" : "pc",
        place: place,
        placement: where || place,
        ab_group: typeof global.abGroup === "function" ? global.abGroup() : "unknown"
      });
    }
    return true;
  }

  global.NetAd = { render: render, isMobile: isMobile,
                   NETWORKS: NETWORKS, ACTIVE_NETWORK: ACTIVE_NETWORK };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.NetAd;
  }
})(typeof window !== "undefined" ? window : this);
