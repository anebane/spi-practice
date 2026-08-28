/**
 * アフィリエイト導線。
 *
 * 設計方針: 広告リンクのURLはこのファイルの PROGRAMS 以外に書かない。
 * HTML に直接 <a href="https://px.a8.net/..."> を書くと PR表記が漏れる。
 * test/html.spec.js が HTML 内の a8.net URL を検出して落とすので、
 * 「手で貼る」経路は機械的に塞がれている。
 *
 * PR表記は景表法（ステマ規制・2023-10〜）の要件であると同時に、
 * 広告主が「広告表示がない場合、提携を解除する可能性」と明記した
 * 提携維持の条件でもある。だから render() は必ず表記を出す。
 */
var Affiliate = (function () {

  // ASPから配布されたリンクは改変しない（rel と 1x1 の計測imgはセットで必須）
  var PROGRAMS = {
    kimisuka_spi: {
      program: "kimisuka",
      audience: "student",          // 成果条件が「学生からのお申し込み」限定
      anchor: "キミスカのSPI対策",
      href: "https://px.a8.net/svt/ejp?a8mat=4BAEXK+6FLN3M+24ZO+HZ2R6",
      pixel: "https://www14.a8.net/0.gif?a8mat=4BAEXK+6FLN3M+24ZO+HZ2R6",
      lead: "適性検査の対策コンテンツが使えるスカウト型の就活サービスです。"
    },
    kimisuka_general: {
      program: "kimisuka",
      audience: "student",
      anchor: "就活",
      href: "https://px.a8.net/svt/ejp?a8mat=4BAEXK+6FLN3M+24ZO+HV7V6",
      pixel: "https://www12.a8.net/0.gif?a8mat=4BAEXK+6FLN3M+24ZO+HV7V6",
      lead: "企業からスカウトが届く就活サービスです。"
    }
  };

  // スコア帯。GA4に送って「どの層に何が効いたか」を後から分析する。
  // A8の管理画面ではクリック数と成果数しか見えず、この分解ができない。
  function scoreBand(percent) {
    if (typeof percent !== "number" || isNaN(percent)) return "unknown";
    if (percent >= 70) return "high";
    if (percent >= 40) return "mid";
    return "low";
  }

  function track(name, params) {
    if (typeof gtag === "function") gtag("event", name, params || {});
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  /**
   * 広告枠を描画する。PR表記は引数で消せない（意図的に）。
   * @param {Element} host   差し込み先
   * @param {Object} opt     { programs: [id...], band: "high"|"mid"|"low", placement: "result" 等,
   *                           heading: 見出し, note: 補足 }
   */
  function render(host, opt) {
    if (!host) return false;
    opt = opt || {};
    var ids = (opt.programs || []).filter(function (id) { return PROGRAMS[id]; });
    if (!ids.length) { host.style.display = "none"; return false; }

    // 対象属性の注記は呼び出し側が渡す作りなので、渡し忘れると
    // 「注記の無い枠」ができる。これは見た目の問題ではなく収益の問題で、
    // キミスカ（学生限定）に既卒が申し込むと全件否認される。
    // 渡し忘れたら描かない。開いたまま出すより、出さないほうが損が小さい。
    var needsNote = ids.some(function (id) { return !!PROGRAMS[id].audience; });
    if (needsNote && !opt.note) {
      if (typeof console !== "undefined" && console.error) {
        console.error("Affiliate.render: audience を持つ案件には note が要ります: " + ids.join(", "));
      }
      host.style.display = "none";
      return false;
    }

    host.innerHTML = "";
    host.className = "af-block";
    host.style.display = "";

    // 1) 枠の見出し。属性は推定せず、利用者に選ばせる。
    //    キミスカの成果条件は学生限定で、既卒・転職者に出すと全件否認される。
    var aud = PROGRAMS[ids[0]].audience;
    var head = el("p", "af-head", opt.heading || (aud === "student" ? "学生の方へ" : "ご案内"));
    host.appendChild(head);

    // 2) PR表記（枠の直上・本文と同等の大きさ）。ここは分岐なしで必ず出す。
    host.appendChild(el("p", "af-pr", "PR：以下はアフィリエイト広告です。"));

    ids.forEach(function (id) {
      var p = PROGRAMS[id];
      var item = el("div", "af-item");

      // 3) 便益の説明はリンクより先に置く。読んでから押す順序にするため。
      if (p.lead) item.appendChild(el("p", "af-lead", p.lead));

      var a = document.createElement("a");
      a.href = p.href;
      a.rel = "nofollow";                 // 配布されたまま。改変しない
      a.target = "_blank";
      a.className = "af-link";
      a.textContent = p.anchor;
      a.addEventListener("click", function () {
        track("affiliate_click", {
          program: p.program,
          creative: id,
          score_band: opt.band || "unknown",
          placement: opt.placement || "unknown",
          audience: p.audience
        });
      });
      item.appendChild(a);

      // 計測用の1x1。落とすとASP側の計測が壊れるので必ずセットで入れる。
      var img = document.createElement("img");
      img.src = p.pixel;
      img.width = 1; img.height = 1; img.alt = "";
      img.setAttribute("border", "0");
      item.appendChild(img);

      host.appendChild(item);
    });

    // 4) 対象属性の注記はリンクの「下」。上に置くと、対象である学生にまで
    //    「自分は対象外かも」と先に読ませてしまい、クリックを潰す。
    //    ただし否認条件の回避に必要なので、消さない・リンクに隣接させる。
    if (opt.note) host.appendChild(el("p", "af-note", opt.note));

    // audience を乗せないと「どちらの層が反応したか」を後から言えない。
    // 出し分けの効果測定はこの1個のパラメータに乗っている。
    track("affiliate_view", {
      score_band: opt.band || "unknown",
      placement: opt.placement || "unknown",
      creative_count: ids.length,
      audience: aud || "unknown"
    });
    return true;
  }

  /**
   * スコアに応じた出し分け。案件が未承認の帯は空配列を返し、枠ごと出さない。
   * 承認され次第ここに creative id を足すだけで反映される。
   */
  function selectByScore(percent) {
    var band = scoreBand(percent);
    // 高スコア → 登録完了型 / 低スコア → 面談型 の想定。
    // 面談型（新卒就職エージェントneo 等）は未承認のため現状は空。
    var map = {
      high: ["kimisuka_spi"],
      mid:  ["kimisuka_spi"],
      low:  ["kimisuka_spi"],
      unknown: []
    };
    return { band: band, programs: map[band] || [] };
  }

  return {
    render: render,
    selectByScore: selectByScore,
    scoreBand: scoreBand,
    _programs: PROGRAMS      // テスト用
  };
})();
