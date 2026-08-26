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

  window.addEventListener("appinstalled", function () {
    track("pwa_installed");
    slot.hidden = true;
  });
})();
