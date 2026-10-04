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
      // 読み込み後に積んだ予約は、SDKを差し込み直さないと処理されない（render の注記）
      rescanByReinject: true,
      pid: 85441,
      // ⚠️ ads.txt にこの行が無いと、入札側が未認可の在庫と見なして値が付かない。
      //    **切り替えても例外は出ない。**収益が静かに落ちるだけなので、
      //    test/adstxt.spec.js が「有効なネットワークのDIRECT行があるか」を見る。
      //    ⚠️ ads.txt には i-mobile.co.jp の RESELLER 行が9行あるが、あれは
      //    忍者経由の再販分で自分のアカウントではない。DIRECT でなければ意味がない。
      adstxt: { domain: "i-mobile.co.jp", id: "85441" },
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
        // 試験画面の本文内。「回答して次へ」の下。PC・SPとも出す。
        // ⚠️ **問題文と選択肢の間には絶対に入れない。**解く動作を邪魔するし、
        //    選択肢のすぐ隣は誤クリックを誘発する（無効トラフィック扱いになりうる）。
        // ⚠️ 四則逆算(tamatebako-shisoku)には置いていない。あれは選択肢を押した
        //    瞬間に次の問題へ進むので、近くに広告があると誤クリックが起きる。
        examinline: { pc: { mid: 596360, asid: 1945331, size: [300, 250] },
                      sp: { mid: 596361, asid: 1945332, size: [300, 250] } },
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

    // 忍者AdMax。2026-10-04 から PC の記事下で使う（PC_NETWORK の注記）。
    // ⚠️ 使っていなくても消さない。消すと戻すときに管理画面からIDを取り直す
    //    ことになり、取り違えが起きる。
    admax: {
      sdk: "https://adm.shinobi.jp/st/t.js",
      sdkId: "admax-sdk",
      adstxt: { domain: "adm.shinobi.jp", id: "231519" },
      slots: {
        article: { pc: "701e1f0351b6f71b0986f62aae5e1949", sp: "3699c5a4a3decd176accb15405a99283" },
        result:  { pc: null, sp: null },      // 未申請
        examside: { pc: null, sp: null },     // 未申請
        examinline: { pc: null, sp: null },   // 未申請
        articleside: { pc: null, sp: null }   // 未申請
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

  // PCは、その面に忍者の枠があれば忍者で出す（2026-10-04〜、矢野さんの判断）。
  // ⚠️ i-mobile の PC（mid 596360）は 9/25 から広告がほぼ返らなくなった
  //    （埋まる割合 約25% → 約1%。スマホは約100%のまま）。サイト側は 9/17 から
  //    変わっておらず、管理画面の設定もスマホと同じだったので、PC在庫の問題と判断した。
  // ⚠️ 忍者に枠が無い面は ACTIVE_NETWORK で出す。忍者の管理画面で枠を作り、
  //    admax.slots の pc に ID を書けば、その面だけ自動で忍者に切り替わる。
  var PC_NETWORK = "admax";

  /**
   * SDKの script を差し込む。id を渡したものが「最初の1本」で、
   * 読み込みが済んだら data-loaded="1" を付ける（差し込み直してよいかの目印）。
   */
  function injectSdk(net, id) {
    var script = document.createElement("script");
    if (id) {
      script.id = id;
      script.onload = function () { script.setAttribute("data-loaded", "1"); };
    }
    script.src = net.sdk;
    script.async = true;
    document.head.appendChild(script);
  }

  /**
   * この面・このデバイスで使うネットワークと枠を選ぶ。
   * PCは PC_NETWORK → ACTIVE_NETWORK の順に、枠があるほうを使う。
   */
  function pick(place, mobile) {
    var names = mobile ? [ACTIVE_NETWORK] : [PC_NETWORK, ACTIVE_NETWORK];
    for (var i = 0; i < names.length; i++) {
      var net = NETWORKS[names[i]];
      if (!net) continue;              // 宣言に無い名前。次の候補へ
      var byDevice = (net.slots || {})[place];
      var slot = byDevice ? (mobile ? byDevice.sp : byDevice.pc) : null;
      if (slot) return { name: names[i], net: net, slot: slot };
    }
    return null;                       // その面・そのデバイスには枠が無い（申請していない）
  }

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
   * @param {object} [opts]   { fresh: true } なら、前に描いた枠を消して描き直す
   *
   * ⚠️ fresh は**利用者の操作で新しい画面になったとき**だけ使う（新しい試験の開始、
   *    試験の終了）。時間で描き直すのは i-mobile の禁じる自動リフレッシュになる。
   *    このサイトは1ページの中で試験を何本も受けられるので、描き直さないと
   *    2本目以降の試験と結果画面には広告が出ない（二重描画の防止で弾かれる）。
   */
  function render(placeId, place, where, opts) {
    if (typeof global.abShowAds !== "function" || !global.abShowAds()) return false;
    var host = document.getElementById(placeId);
    if (!host) return false;

    var mobile = isMobile();
    var chosen = pick(place, mobile);
    if (!chosen) return false;
    var net = chosen.net, slot = chosen.slot;

    if (opts && opts.fresh) {
      while (host.firstChild) host.removeChild(host.firstChild);
    }
    if (!net.render(host, slot)) return false;

    // SDKの読み込み。
    //
    // ⚠️ 読み込み中に2回目を差し込まない。読み込み中なら、この枠の予約は
    //    読み込み完了時にまとめて処理される。重ねて差し込むと同じ予約を
    //    2つのSDKが取り合い、二重描画になりうる。
    //
    // ⚠️ i-mobile の SDK は**読み込まれた瞬間に予約(adsbyimobile)を1回だけ**
    //    処理し、あとから積まれた予約は見ない（2026-09-30、SDKのコードで確認）。
    //    このサイトは1ページの中で画面を切り替えるので、試験の終わりに作る
    //    結果画面の枠は、SDKの読み込み後に積まれて**一度も処理されていなかった**。
    //    9/16〜9/30 の実績: 結果画面の表示 SP 3回 / PC 0回（ads 群の完走は約830回）。
    //    読み込み済みなら、SDKを差し込み直して予約を処理させる。
    //    予約は処理のたびに空になるので、既に描いた枠が二重に出ることはない。
    var loaded = document.getElementById(net.sdkId);
    if (!loaded) {
      injectSdk(net, net.sdkId);
    } else if (net.rescanByReinject && loaded.getAttribute("data-loaded") === "1") {
      injectSdk(net, null);
    }
    host.style.display = "";

    if (typeof global.gtag === "function") {
      // ⚠️ 群は abtest.js から取る。個別に書くと trackEvent 側とずれる。
      global.gtag("event", "network_ad_view", {
        network: chosen.name,
        device: mobile ? "sp" : "pc",
        place: place,
        placement: where || place,
        ab_group: typeof global.abGroup === "function" ? global.abGroup() : "unknown"
      });
    }
    return true;
  }

  var api = { render: render, isMobile: isMobile,
              NETWORKS: NETWORKS, ACTIVE_NETWORK: ACTIVE_NETWORK, PC_NETWORK: PC_NETWORK };

  // ⚠️ ブラウザ側は **この名前** を見る（affiliate-article.js と app.js の
  //    `typeof NetAd === "undefined"`）。名前が変わると広告が1枚も出ない。
  global.NetAd = api;

  // ⚠️ 検査から読むための口。global.NetAd とは別に api を渡すこと。
  //    module.exports = global.NetAd と書くと、上の行を壊しても require() は
  //    通ってしまい、「ブラウザでだけ出ない」状態を検査が見逃す。
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : this);
