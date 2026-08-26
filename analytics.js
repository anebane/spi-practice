/**
 * 計測の共通スクリプト（トップページ以外の全ページで読み込む）。
 *
 * トップページ(index.html)はGA4スニペットを直接持っているので対象外。
 * 記事ページ・規約ページには計測が入っていなかったため、
 * 記事の効果（読了・模擬試験への送客）が測れない状態だった。
 */
(function () {
  var GA_ID = "G-SPDZ1K30TB";

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_ID);

  function track(name, params) { gtag("event", name, params || {}); }

  document.addEventListener("DOMContentLoaded", function () {
    var slug = location.pathname.replace(/^\/|\.html$/g, "") || "index";

    // 記事から模擬試験への送客。記事の価値を測る中心指標。
    document.querySelectorAll(".cta-btn").forEach(function (el) {
      el.addEventListener("click", function () {
        track("cta_click", { page: slug, cta_text: (el.textContent || "").trim().slice(0, 40) });
      });
    });

    // 目次のどの節に関心があるか＝記事のどこを厚くすべきかの手がかり
    document.querySelectorAll(".article-toc a").forEach(function (el) {
      el.addEventListener("click", function () {
        track("toc_click", { page: slug, section: (el.textContent || "").trim().slice(0, 40) });
      });
    });

    // 読了率。記事の長さと内容が合っているかの判断材料。
    var body = document.querySelector(".article-body");
    if (body) {
      var marks = [25, 50, 75, 100], fired = {};
      var onScroll = function () {
        var rect = body.getBoundingClientRect();
        var total = body.offsetHeight - window.innerHeight;
        if (total <= 0) return;
        var pct = Math.min(100, Math.max(0, Math.round((-rect.top) / total * 100)));
        marks.forEach(function (m) {
          if (pct >= m && !fired[m]) { fired[m] = true; track("article_scroll", { page: slug, percent: m }); }
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  });
})();
