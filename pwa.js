/**
 * PWA まわり（Service Worker 登録 / インストール導線 / 起動元の計測）
 * 全ページで読み込む。インストールボタンは #pwa-install がある場合だけ出す。
 */
(function () {
  "use strict";

  var secure = location.protocol === "https:" ||
    location.hostname === "localhost" || location.hostname === "127.0.0.1";

  if ("serviceWorker" in navigator && secure) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }

  function track(name, params) {
    if (typeof window.gtag === "function") window.gtag("event", name, params || {});
  }

  // インストール済みアプリからの起動。start_url にクエリを足すと
  // GA のセッションが割れるので、表示モードで判別する。
  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  if (standalone) track("pwa_launch", { page_path: location.pathname });

  var slot = document.getElementById("pwa-install");
  if (!slot || standalone) return;

  var deferred = null;

  // Android/Chrome のみ発火する。iOS Safari は「共有→ホーム画面に追加」しか無く
  // ボタンを出す手段が無いので、ここでは何も表示しない。
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    slot.innerHTML = '<button type="button" class="link-btn" id="pwa-install-btn">' +
      'アプリとしてインストール（オフラインでも解けます）</button>';
    slot.hidden = false;
    track("pwa_install_shown");
    document.getElementById("pwa-install-btn").addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function (choice) {
        track("pwa_install_choice", { outcome: choice.outcome });
        deferred = null;
        slot.hidden = true;
      });
    });
  });

  // --- iOS 向けの案内 ---
  // beforeinstallprompt は Android/Chrome でしか発火しない。就活生の主力端末は
  // iPhone なので、ここを埋めないと導線が実質 Android 専用になる。
  // ただし iOS には API が無く「共有→ホーム画面に追加」しか手段がないため、
  // ボタンではなく1行の案内文にする。
  //
  // 表示条件を絞る理由: このサイトの資産は「登録不要でスッと使える」体験で、
  // しつこい案内はそれを直接壊す。バナーやオーバーレイにもしない
  // （モバイル侵入型インタースティシャルとして検索評価にも触る）。
  var DISMISS_KEY = "pwa_ios_hint_dismissed";

  function isIosSafari() {
    var ua = navigator.userAgent;
    var ios = /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS はデスクトップ表示だと Macintosh を名乗るのでタッチ有無で判別する
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!ios) return false;
    // Chrome/Firefox/Edge の iOS 版は「ホーム画面に追加」が無いか挙動が違うので除く
    return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  }

  function showIosHint() {
    if (!isIosSafari()) return;
    try { if (localStorage.getItem(DISMISS_KEY)) return; } catch (e) { /* 使えなくても続行 */ }

    slot.innerHTML =
      '<span class="pwa-ios-text">ホーム画面に追加すると、オフラインでも解けます（共有ボタン → ホーム画面に追加）</span>' +
      '<button type="button" class="pwa-ios-close" id="pwa-ios-close" aria-label="この案内を閉じる">×</button>';
    slot.hidden = false;
    slot.classList.add("pwa-ios-hint");
    track("pwa_ios_hint_shown");

    document.getElementById("pwa-ios-close").addEventListener("click", function () {
      slot.hidden = true;
      try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) { /* 保存できなくても閉じる */ }
      track("pwa_ios_hint_dismissed");
    });
  }
  showIosHint();

  window.addEventListener("appinstalled", function () {
    track("pwa_installed");
    slot.hidden = true;
  });
})();
