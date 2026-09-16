#!/usr/bin/env node
/**
 * ABテストの群わけが壊れていないか。
 *
 * 【なぜ必要か】
 * 広告を「収益が増えたか」だけで判断すると必ず間違える。試験画面に広告を出せば
 * **完走率が下がりうる**（2026-09時点で62%）。同じ期間に両方を測るための土台が
 * この群わけで、**壊れても例外が出ない**。壊れ方は3つとも静かに進む。
 *
 *   ・群が偏る          … 比較の前提が崩れるが、数字はそれらしく出続ける
 *   ・群が固定されない   … 同じ人が広告あり/なしを行き来し、差が薄まって何も出ない
 *   ・保存できない環境で例外 … 計測ごと死ぬ。しかも一部の利用者だけ
 *
 * どれも「動いているように見える」ので、機械で止める。
 *
 * 【どこを見るか】
 * 群わけの実体は abtest.js（独立ファイル）。記事ページには app.js が無く、
 * そちらにも広告を出すので両方から使える形にしてある。
 * localStorage を模した環境で**本物のファイルを実行する**（写すと本体と乖離する）。
 *
 * ⚠️ 一括付与（trackEvent で ab_group を乗せる）は app.js 側にあるので、
 *    そちらはソースを読んで確かめる。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const { Coverage } = require("./helpers/coverage");
const cov = new Coverage();

const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

const src = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const abFile = path.join(ROOT, "abtest.js");

let load = null;
if (!fs.existsSync(abFile)) {
  fail("abtest.js が無い", `${abFile}。群わけの実体が消えている`);
} else {
  const abSrc = fs.readFileSync(abFile, "utf8");
  load = (store) => {
    // ⚠️ 本物のファイルをそのまま実行する。window を模した器に載せる。
    const win = { localStorage: store };
    const ctx = { Math, console, window: win, module: undefined };
    vm.createContext(ctx);
    vm.runInContext(abSrc + "\nthis.abGroup = window.abGroup; this.abShowAds = window.abShowAds;", ctx);
    return ctx;
  };
}

const newStore = () => {
  const mem = {};
  return { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
};

if (load) {
  // --- 1. 群が偏っていないか ---
  // ⚠️ 比較の前提。偏ったまま測ると、広告の効果と群の偏りを区別できない。
  //    2万人で ±2pt は十分ゆるい（標準誤差は約0.35pt なので約6σ）。
  {
    const N = 20000, TOL = 2.0;
    const count = {};
    for (let i = 0; i < N; i++) {
      const g = load(newStore()).abGroup();
      count[g] = (count[g] || 0) + 1;
    }
    const names = Object.keys(count).sort();
    cov.covered("群わけを試した回数", N, 1000);
    if (names.length < 2) {
      fail("群が1つしかない", `${names.join(", ")}。ABの比較にならない`);
    } else {
      const expect = 100 / names.length;
      for (const n of names) {
        const pct = count[n] / N * 100;
        if (Math.abs(pct - expect) > TOL) {
          fail("群が偏っている",
            `${n}: ${pct.toFixed(1)}%（各${expect.toFixed(0)}%のはず・許容±${TOL}pt）`);
        }
      }
    }
  }

  // --- 2. 同じ利用者で群が固定されるか ---
  // ⚠️ 振り直されると、同じ人が広告あり/なしを行き来する。
  //    完走率の差が薄まり、**効果があっても無いように見える。**
  {
    const store = newStore();
    const first = load(store).abGroup();
    let same = 0;
    const TRIES = 500;
    for (let i = 0; i < TRIES; i++) if (load(store).abGroup() === first) same++;
    cov.covered("固定を確かめた回数", TRIES, 100);
    if (same !== TRIES) {
      fail("群が固定されない", `${TRIES}回中${TRIES - same}回、初回と違う群になった`);
    }
  }

  // --- 3. 保存できない環境で計測ごと死なないか ---
  // ⚠️ プライベートウィンドウやサイトデータを拒否する設定では localStorage が
  //    例外を投げる。そこで落ちると、その利用者のイベントが全部消える。
  //    しかも一部の利用者だけなので、集計を見ても「少し減った」としか見えない。
  {
    const denied = {
      getItem() { throw new Error("denied"); },
      setItem() { throw new Error("denied"); },
    };
    let g = null, threw = null;
    try { g = load(denied).abGroup(); } catch (e) { threw = e.message; }
    cov.covered("保存できない環境の検査", 1, 1);
    if (threw) {
      fail("保存できない環境で例外が出る", `${threw}。この利用者の計測が全部消える`);
    } else if (g !== "unassigned") {
      // ⚠️ ここで control や ads を返すと、毎回振り直しになって群が混ざる。
      fail("保存できない環境で群を割り当てている",
        `群=${g}。固定できないので "unassigned" にして集計から外せるようにすること`);
    } else {
      // 割り当てられない利用者に広告を出すと、対照群が汚れる。
      let shows = null;
      try { shows = load(denied).abShowAds(); } catch (e) { shows = "例外: " + e.message; }
      if (shows !== false) {
        fail("割り当てられない利用者に広告を出している", `abShowAds()=${shows}`);
      }
    }
  }

  // --- 4. 群が全イベントに乗るか（個別に書き足す形になっていないか）---
  // ⚠️ trackEvent で一括して乗せていないと、書き忘れた面が必ず出る。
  //    profile で同じ事故を起こしている（2026-09-06、/koumuin/ を作ったとき）。
  {
    const hits = (src.match(/p\.ab_group\s*=\s*abGroup\(\)/g) || []).length;
    cov.covered("一括付与の実装", hits, 1);
    if (hits < 1) {
      fail("群を一括で乗せていない",
        "trackEvent の中で ab_group を付けること。個別に書き足すと必ず漏れる");
    }
    // 個別のイベントで ab_group を手書きしていたら、二重管理になっている。
    const manual = (src.match(/ab_group\s*:/g) || []).length;
    if (manual > 0) {
      fail("群を個別に書いている",
        `${manual}箇所。trackEvent の一括付与だけにすること（片方だけ直す事故が起きる）`);
    }
  }
}

// --- 5. 群わけを使う面すべてで、abtest.js が「先に」読み込まれているか ---
//
// ⚠️ 読み込み順が逆でも例外は出ない。`typeof abGroup === "function"` の
//    フォールバックがあるので、**その面だけ群が付かないまま静かに進む。**
//    集計では「一部のイベントに ab_group が無い」としか見えず、
//    どの面が抜けているかは分からない。
//
// 2026-09-11に実際に踏んだ: 28面のうち tamatebako-shisoku/index.html だけ
// abtest.js が app.js より後ろにあった。手で25ページに入れたときの取りこぼし。
{
  const glob = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) glob(full, out);
      else if (e.name.endsWith(".html")) out.push(full);
    }
    return out;
  };

  const pages = glob(ROOT);
  const wrong = [];
  let checked = 0;

  for (const f of pages) {
    const html = fs.readFileSync(f, "utf8");
    // 群わけを必要とする面＝app.js（計測）か affiliate-article.js（広告）を使う面
    const usesApp = html.includes('app.js"></script>');
    const usesArticle = html.includes("/affiliate-article.js");
    if (!usesApp && !usesArticle) continue;
    checked++;

    const ab = html.indexOf("abtest.js");
    const consumers = [];
    if (usesApp) consumers.push(html.indexOf('app.js"></script>'));
    if (usesArticle) consumers.push(html.indexOf("/affiliate-article.js"));
    const first = Math.min(...consumers.filter(x => x >= 0));

    const rel = path.relative(ROOT, f);
    if (ab < 0) wrong.push(`${rel}: abtest.js を読み込んでいない`);
    else if (ab > first) wrong.push(`${rel}: abtest.js が利用側より後ろ`);
  }

  cov.covered("読み込み順を調べた面", checked, 20);

  if (wrong.length) {
    fail("abtest.js の読み込み順",
      `${wrong.length}件: ${wrong.slice(0, 3).join(" / ")}`
      + (wrong.length > 3 ? ` ほか${wrong.length - 3}件` : ""));
  }
}

// --- 6. 広告が ads 群にだけ出るか ---
//
// ⚠️ 判定を外しても**広告は表示される**ので、画面上は正常に見える。
//    壊れるのは対照群のほうで、control 群にも広告が出ると
//    「広告を出したら完走率がどう動いたか」を後から言えなくなる。
//    ABテストそのものが無意味になるが、エラーは1つも出ない。
{
  const file = path.join(ROOT, "affiliate-article.js");
  if (!fs.existsSync(file)) {
    fail("affiliate-article.js が無い", file);
  } else {
    const art = fs.readFileSync(file, "utf8")
      + "\n" + fs.readFileSync(path.join(ROOT, "netad.js"), "utf8");

    // 描画関数の中で abShowAds() を見て、偽なら描かずに返っているか。
    // ⚠️ 「abShowAds が出てくる」だけでは足りない。**それで打ち切っているか**を見る。
    //    `if (false) return` のように条件を殺しても文字列は残る。
    const guard = /if\s*\(\s*typeof\s+global\.abShowAds\s*!==\s*["']function["']\s*\|\|\s*!\s*global\.abShowAds\(\)\s*\)\s*return/;
    cov.covered("広告の出し分けを調べたファイル", 1, 1);
    if (!guard.test(art)) {
      fail("広告が群で出し分けられていない",
        "netad.js の render で `!abShowAds()` なら描かずに返ること。"
        + "control 群にも出ると対照群が汚れ、ABの比較が成立しない");
    }


    // --- 旧タグ（document.write 方式）を使っていないか ---
    //
    // ⚠️ これが今回いちばん高くついた壊れ方。
    //    https://adm.shinobi.jp/s/<ID> が返すタグの中身は document.write で書かれている。
    //    それを動的に差し込んだ <script> から実行すると、**ブラウザが document.write を
    //    無視する**ので、広告が出ないどころか広告のリクエストすら飛ばない。
    //    例外も警告も出ず、枠は高さ0のまま。「審査が通っていないから出ない」と
    //    区別がつかないので、本番で3日気づけなかった（2026-09-14に実測で判明）。
    //    正しくは admaxads キューへ積んで st/t.js に描かせる（管理画面の「非同期タグ」）。
    if (/adm\.shinobi\.jp\/s\/[0-9a-f]{32}/.test(art)) {
      fail("旧方式の広告タグを使っている",
        "adm.shinobi.jp/s/<ID> は document.write 方式。動的に差し込むと"
        + "広告のリクエストすら飛ばない。admaxads キュー＋st/t.js に置き換えること");
    }

    // --- いま有効なネットワークのタグがそろっているか ---
    //
    // ⚠️ **「有効なほう」を見ること。**2026-09-16に i-mobile へ切り替えたとき、
    //    この検査は使っていない admax の宣言を見ていたので全部緑のままだった。
    //    比較のために両方の宣言を残す設計なので、片方しか見ないと
    //    「宣言は残っているが有効なほうが壊れている」を永久に見逃す。
    //
    // ⚠️ 1つでも欠けると広告は出ない。そして**どれが欠けても画面は正常に見える。**
    // ⚠️ 宣言は netad.js に1箇所だけ置いてある（2026-09-16に移した）。
    //    記事ページと試験・結果画面で別々に持つと、枠IDを片方だけ直す事故が起きる。
    const mod = require("../netad.js");
    const NETWORKS = mod.NETWORKS || {};
    const active = mod.ACTIVE_NETWORK;

    if (!active || !NETWORKS[active]) {
      fail("有効なネットワークが宣言に無い",
        `ACTIVE_NETWORK = ${JSON.stringify(active)} / 宣言: ${Object.keys(NETWORKS).join(", ") || "なし"}`);
    }
    // 比較のため、使っていない側の宣言も残っていること。
    // ⚠️ 消すと戻すときに管理画面からIDを取り直すことになり、取り違えが起きる。
    for (const want of ["imobile", "admax"]) {
      if (!NETWORKS[want]) {
        fail("ネットワークの宣言が消えている",
          `${want}。2社の実測値を比べるために、使っていない側も残すこと`);
      }
    }
    cov.covered("宣言されたネットワーク", Object.keys(NETWORKS).length, 2);

    // それぞれの宣言が、管理画面が出すタグに必要なものを持っているか
    const shapes = {
      imobile: (n) => {
        const bad = [];
        if (!n.pid) bad.push("pid が無い");
        if (!/imp-adedge\.i-mobile\.co\.jp\/script\/v1\/spot\.js/.test(n.sdk || "")) bad.push("SDKのURLが違う");
        // ⚠️ 面ごとに枠を持つ構造（2026-09-16〜）。記事下だけでなく
        //    結果画面・試験画面サイドの枠もここで見る。
        for (const place of ["article", "result"]) {
          for (const dev of ["pc", "sp"]) {
            const sl = ((n.slots || {})[place] || {})[dev];
            if (!sl) { bad.push(`${place}/${dev} の枠が無い`); continue; }
            if (!sl.mid) bad.push(`${place}/${dev} の mid が無い`);
            if (!sl.asid) bad.push(`${place}/${dev} の asid が無い`);
          }
        }
        // サイドはPCのみ（モバイルには横幅が無い）
        // ⚠️ サイズも見る。CSSの器と突き合わせるのに使っていて、
        //    落ちると「器が枠より狭い」事故を誰も検出できなくなる。
        for (const place of ["examside", "articleside"]) {
          const side = ((n.slots || {})[place] || {}).pc;
          if (!side || !side.asid) { bad.push(`${place}/pc の枠が無い`); continue; }
          if (!Array.isArray(side.size) || side.size.length !== 2) {
            bad.push(`${place}/pc の size が無い。CSSの器と突き合わせられない`);
          }
        }
        // ⚠️ PCとSPで asid が同じだと、どちらの成果か分からなくなる。
        //    しかも広告は出るので、レポートを見るまで気づけない。
        // ⚠️ 変数名の出現だけを見ない。adsbyimobileUnused のような改名でも
        //    文字列としては一致してしまい、変異が素通りする（実際に踏んだ）。
        // ⚠️ 条件を OR でつながないこと。片方が残っていれば通ってしまい、
        //    やはり素通りする（これも踏んだ）。**初期化と push の両方**を要る。
        const r = String(n.render);
        // ⚠️ netad.js は IIFE の引数 global 経由で window を参照している。
        //    "window." 決め打ちで書くと実物に一致せず、常に赤になる。
        const G = "(?:window|global)";
        if (!new RegExp(G + "\\.adsbyimobile\\s*=\\s*" + G + "\\.adsbyimobile\\s*\\|\\|").test(r)) {
          bad.push("adsbyimobile キューを初期化していない。未定義に push して例外になる");
        }
        if (!new RegExp(G + "\\.adsbyimobile\\.push\\(").test(r)) {
          bad.push("adsbyimobile キューに push していない。SDKは描く対象を知らされない");
        }
        return bad;
      },
      admax: (n) => {
        const bad = [];
        if (!/adm\.shinobi\.jp\/st\/t\.js/.test(n.sdk || "")) bad.push("SDKのURLが違う");
        // ⚠️ admax は記事下しか申請していない。未申請の面は null で宣言してある。
        //    「まだ無い」と「宣言し忘れ」を区別するため、article だけを必須にする。
        const art2 = (n.slots || {}).article || {};
        if (!art2.pc || !art2.sp) bad.push("article の枠IDが両デバイス分そろっていない");
        if (art2.pc && art2.pc === art2.sp) bad.push("article の PCとSPの枠IDが同じ");
        const r = String(n.render);
        if (!/admax-ads/.test(r)) bad.push('class が "admax-ads" でない。SDKが枠を見つけられない');
        if (!/data-admax-id/.test(r)) bad.push("data-admax-id を付けていない");
        if (!/admaxads\.push/.test(r)) bad.push("admaxads キューに積んでいない");
        return bad;
      },
    };
    let checkedNets = 0;
    for (const [name, check] of Object.entries(shapes)) {
      const n = NETWORKS[name];
      if (!n) continue;
      checkedNets++;
      const bad = check(n);
      if (bad.length) {
        fail("広告タグの宣言が壊れている",
          `${name}${name === active ? "（いま有効）" : ""}: ${bad.join(" / ")}`);
      }
    }
    cov.covered("宣言を検査したネットワーク", checkedNets, 2);

    // 枠が面ごと・デバイスごとにそろっているか。
    //
    // ⚠️ **面ごとに別の枠（asid）**であること。同じ枠を使い回すと、
    //    「試験画面に出したら完走率がどう動いたか」を金額と突き合わせられない。
    //    広告は出るので、レポートを見るまで気づけない。
    {
      const net = (mod.NETWORKS || {})[mod.ACTIVE_NETWORK] || {};
      const seen = new Map();
      let slots = 0;
      for (const [place, byDev] of Object.entries(net.slots || {})) {
        for (const dev of ["pc", "sp"]) {
          const sl = (byDev || {})[dev];
          if (!sl) continue;                       // 申請していない面。ここでは咎めない
          slots++;
          const key = typeof sl === "object" ? String(sl.asid) : String(sl);
          if (seen.has(key)) {
            fail("枠を使い回している",
              `${place}/${dev} と ${seen.get(key)} が同じ枠(${key})。どの面が稼いだか分けられない`);
          }
          seen.set(key, place + "/" + dev);
        }
      }
      cov.covered("宣言された広告枠", slots, 3);
    }

    // 有効なネットワークのSDKを、実際に読み込んでいるか。
    // ⚠️ 宣言だけ正しくても、描画側が別のURLを読んでいたら広告は出ない。
    const activeSdk = (NETWORKS[active] || {}).sdk || "";
    if (activeSdk && art.indexOf("net.sdk") === -1 && art.indexOf(activeSdk) === -1) {
      fail("有効なネットワークのSDKを読んでいない", activeSdk);
    }
  }
}

// --- 出力 ---
console.log("ABテストの群わけ: 分布・固定・保存不可・一括付与を検査");
cov.print();
for (const p of cov.failures) failures.push({ rule: "検査対象", detail: p });
if (!failures.length) {
  console.log("   ✅ 群は半々に割れ、利用者ごとに固定され、保存できない環境でも壊れない");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const f of failures) console.log(`  ${f.rule}: ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
