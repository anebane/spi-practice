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

  // ASPから配布されたリンクは改変しない（rel・referrerpolicy・1x1の計測imgはセットで必須）。
  //
  // ⚠️ note（対象の注記）は案件ごとに持つ。枠で1つにしてはいけない。
  //    同じ「既卒」の枠でも、ウズウズITは20代のIT志望、UZUZは第二新卒全般と
  //    成果条件が違う。枠共通の注記にすると、ウズウズITに非IT志望が申し込む
  //    経路が残り、否認される。表記をリンクごとに出す構成にした理由と同じで、
  //    「1つにまとめると、まとめた分だけ嘘になる」。
  var PROGRAMS = {
    kimisuka_spi: {
      program: "kimisuka",
      audience: "student",          // 成果条件が「学生からのお申し込み」限定
      anchor: "キミスカのSPI対策",
      href: "https://px.a8.net/svt/ejp?a8mat=4BAEXK+6FLN3M+24ZO+HZ2R6",
      pixel: "https://www14.a8.net/0.gif?a8mat=4BAEXK+6FLN3M+24ZO+HZ2R6",
      lead: "適性検査の対策コンテンツが使えるスカウト型の就活サービスです。",
      note: "対象は2027年卒・2028年卒の学生の方です。既卒・転職活動中の方はお申し込みいただけません。"
    },
    kimisuka_general: {
      program: "kimisuka",
      audience: "student",
      anchor: "就活",
      href: "https://px.a8.net/svt/ejp?a8mat=4BAEXK+6FLN3M+24ZO+HV7V6",
      pixel: "https://www12.a8.net/0.gif?a8mat=4BAEXK+6FLN3M+24ZO+HV7V6",
      lead: "企業からスカウトが届く就活サービスです。",
      note: "対象は2027年卒・2028年卒の学生の方です。既卒・転職活動中の方はお申し込みいただけません。"
    },
    // アクセストレード。配布物に referrerpolicy が含まれる（A8には無い）。
    uzuz_it: {
      program: "uzuz_it",
      audience: "career",
      anchor: "ITエンジニアの就職ならIT特化型就職支援サービス【ウズウズIT】",
      href: "https://h.accesstrade.net/sp/cc?rk=0100omb800oxvd",
      pixel: "https://h.accesstrade.net/sp/rr?rk=0100omb800oxvd",
      referrerpolicy: "no-referrer-when-downgrade",
      lead: "未経験からITエンジニアを目指す方向けの就職支援サービスです。会員登録は無料です。",
      note: "対象は20代でITエンジニアを目指す方です。"
    },
    uzuz_second: {
      program: "uzuz",
      audience: "career",
      anchor: "第二新卒・既卒・フリーター・ニートの就職サポート【UZUZ】",
      href: "https://h.accesstrade.net/sp/cc?rk=0100pw7e00oxvd",
      pixel: "https://h.accesstrade.net/sp/rr?rk=0100pw7e00oxvd",
      referrerpolicy: "no-referrer-when-downgrade",
      lead: "第二新卒・既卒の方向けの就職サポートです。会員登録は無料です。",
      note: "対象は第二新卒・既卒・フリーターの方です。"
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
   *                           heading: 見出し }
   *   対象の注記は PROGRAMS[].note が唯一の出所。引数では渡さない
   *   （渡す形にすると「渡し忘れた枠」を作れてしまう）。
   */
  function render(host, opt) {
    if (!host) return false;
    opt = opt || {};
    var ids = (opt.programs || []).filter(function (id) { return PROGRAMS[id]; });
    if (!ids.length) { host.style.display = "none"; return false; }

    // 対象の注記が無い案件は出さない。これは見た目の問題ではなく収益の問題で、
    // キミスカ（学生限定）に既卒が申し込むと全件否認される。
    // 1件でも欠けていたら枠ごと描かない。開いたまま出すより、出さないほうが損が小さい。
    var missing = ids.filter(function (id) {
      return PROGRAMS[id].audience && !PROGRAMS[id].note;
    });
    if (missing.length) {
      if (typeof console !== "undefined" && console.error) {
        console.error("Affiliate.render: audience を持つ案件には note が要ります: " + missing.join(", "));
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

    ids.forEach(function (id) {
      var p = PROGRAMS[id];
      var item = el("div", "af-item");

      // 2) PR表記。枠の先頭に1つではなく、リンクごとに出す。
      //    枠に2本置いたとき、先頭の1つは2本目のリンクに隣接しない。
      //    要件は「リンクの直上」なので、リンクと同じ数だけ出すのが正しい。
      //    ここは分岐なしで必ず出す（消せる引数を作らない）。
      item.appendChild(el("p", "af-pr", "PR：以下はアフィリエイト広告です。"));

      // 3) 便益の説明はリンクより先に置く。読んでから押す順序にするため。
      if (p.lead) item.appendChild(el("p", "af-lead", p.lead));

      var a = document.createElement("a");
      a.href = p.href;
      a.rel = "nofollow";                 // 配布されたまま。改変しない
      // referrerpolicy はアクセストレードの配布物に含まれる（A8には無い）。
      // 素材ごとに持たせる。落とすと計測が壊れる側の属性。
      if (p.referrerpolicy) a.setAttribute("referrerpolicy", p.referrerpolicy);
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

      // 4) 対象の注記はリンクの「下」。上に置くと、対象である人にまで
      //    「自分は対象外かも」と先に読ませてしまい、クリックを潰す。
      //    ただし否認条件の回避に必要なので、消さない・リンクに隣接させる。
      //    案件ごとに置くのは、同じ枠でも成果条件が違うため
      //    （ウズウズIT=20代のIT志望 / UZUZ=第二新卒全般）。
      if (p.note) item.appendChild(el("p", "af-note", p.note));

      host.appendChild(item);
    });

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
    // 高スコア → 登録完了型 / 低スコア → 面談型 の想定だが、
    // 承認済みの3件はいずれも登録型なので現状は帯で差を付けていない。
    // 面談型（新卒就職エージェントneo / UZUZ 28新卒）は保留。
    // 既卒枠はウズウズITを先に置く（登録型で単価が最も高い）。
    var all = ["kimisuka_spi", "uzuz_it", "uzuz_second"];
    var map = {
      high: all,
      mid:  all,
      low:  all,
      unknown: []
    };
    return { band: band, programs: map[band] || [] };
  }

  // ============================================================
  // 属性ごとの出し分け
  // ============================================================
  // 出し分けの主軸は「属性」で、スコア帯は二次。
  // 属性は推定しない。推定してはいけない理由は収益上のもので、
  // キミスカ（成果条件が学生限定）に既卒を送ると全件否認され、
  // それまでの成果まで失いかねない。だから枠を並べて利用者に選ばせる。
  //
  // 注記はここに持たない。案件ごとに成果条件が違うので、枠共通にすると
  // まとめた分だけ嘘になる（PROGRAMS[].note が唯一の出所）。
  var AUDIENCES = [
    { audience: "student", heading: "学生の方（2027年卒・2028年卒）" },
    { audience: "career",  heading: "既卒・第二新卒・転職をお考えの方" }
  ];

  /**
   * スコア帯を決め、属性ごとの枠を組み立てる。
   * 素材が1件も無い属性の枠は返さない（空の見出しだけが残るのを防ぐ）。
   */
  function selectByAudience(percent) {
    var band = scoreBand(percent);
    var sel = selectByScore(percent);
    var blocks = [];
    AUDIENCES.forEach(function (a) {
      var ids = sel.programs.filter(function (id) {
        return PROGRAMS[id] && PROGRAMS[id].audience === a.audience;
      });
      if (!ids.length) return;
      blocks.push({ audience: a.audience, heading: a.heading, programs: ids });
    });
    return { band: band, blocks: blocks };
  }

  /**
   * 属性ごとの枠をまとめて描く。枠ごとに子要素を作って render() に渡すので、
   * PR表記も注記も枠の数だけ出る（1つにまとめない）。
   */
  function renderAll(host, opt) {
    if (!host) return 0;
    opt = opt || {};
    var sel = selectByAudience(opt.percent);
    host.innerHTML = "";
    if (!sel.blocks.length) { host.style.display = "none"; return 0; }
    host.style.display = "";

    var drawn = 0;
    sel.blocks.forEach(function (b) {
      var slot = document.createElement("div");
      host.appendChild(slot);
      var ok = render(slot, {
        programs: b.programs,
        band: sel.band,
        placement: opt.placement,
        heading: b.heading
      });
      if (ok) drawn++;
    });
    if (!drawn) host.style.display = "none";
    return drawn;
  }

  return {
    render: render,
    renderAll: renderAll,
    selectByAudience: selectByAudience,
    selectByScore: selectByScore,
    scoreBand: scoreBand,
    _programs: PROGRAMS      // テスト用
  };
})();
