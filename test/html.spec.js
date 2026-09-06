#!/usr/bin/env node
/**
 * 公開HTMLの健全性チェック。
 * 記事をAIが自動追加していく前提なので、リンク切れ・メタ情報の欠落・
 * 旧ドメインの混入を機械的に落とせるようにしておく。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://tekisei-drill.com";
/** ルートと articles/ 以下の HTML を再帰的に集める（node_modules等は除外） */
function collectPages(dir, base = "") {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "src"
        || e.name === "test" || e.name === "tools" || e.name === "data" || e.name === "reports") continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...collectPages(path.join(dir, e.name), rel));
    else if (e.name.endsWith(".html")) out.push(rel);
  }
  return out;
}
const { Coverage } = require("./helpers/coverage");
const cov = new Coverage();

const pages = collectPages(".");
// 検査対象が0件だと「壊れているものが無い」ではなく「何も見ていない」。
// collectPages の除外条件を1つ書き間違えるだけで起こる。
cov.covered("HTMLページ", pages.length, 5);
const failures = [];
const fail = (f, rule, detail) => failures.push({ f, rule, detail });

for (const p of pages) {
  const html = fs.readFileSync(path.join(ROOT, p), "utf8");

  // 1. 旧ドメインの残骸（移行後に混入すると301が二重になり評価が分散する）
  if (/anebane\.github\.io/.test(html)) fail(p, "旧ドメインが残っている", "anebane.github.io");

  // 2. 必須メタ
  if (!/<title>[^<]{5,}<\/title>/.test(html)) fail(p, "titleが無い/短い", "");
  if (!/name="description" content="[^"]{20,}"/.test(html)) fail(p, "descriptionが無い/短い", "");
  if (!/rel="canonical" href="https:\/\//.test(html)) fail(p, "canonicalが無い", "");

  // 2b. og:image（無いと note・X・Slack・LINE で画像なしのカードになる）
  //     ⚠️ 2026-09-02 の実測: 17ページ中0ページに og:image が無く、
  //        noteの埋め込みが真っ白なカードで出ていた。共有導線すべてに効くので全ページで検査する。
  const ogImg = html.match(/property="og:image" content="([^"]+)"/);
  if (!ogImg) fail(p, "og:imageが無い（共有時に画像なしのカードになる）", "");
  else if (!/^https:\/\//.test(ogImg[1])) fail(p, "og:imageが絶対URLでない（相対URLは多くのSNSで解決されない）", ogImg[1]);

  // 3. canonical が自分自身を指しているか（コピペ時の典型的な事故）
  const c = html.match(/rel="canonical" href="([^"]+)"/);
  if (c) {
    // index.html はディレクトリURLで正規化する（/ と /articles/）
    const expect = SITE + "/" + p.replace(/(^|\/)index\.html$/, "$1");
    if (c[1] !== expect) fail(p, "canonicalが自分を指していない", `${c[1]} ≠ ${expect}`);
  }

  // 4. 内部リンクの参照先が存在するか（絶対パスと相対パスの両方）
  const dir = path.dirname(p);
  for (const m of html.matchAll(/href="(?!https?:|#|mailto:)([^"]+)"/g)) {
    // クエリ文字列(?cat=1)は同じページへのパラメータ付きリンクなので取り除く
    let t = m[1].split("#")[0].split("?")[0];
    if (!t) continue;
    const abs = t.startsWith("/")
      ? path.join(ROOT, t.slice(1))
      : path.join(ROOT, dir === "." ? "" : dir, t);
    const ok = fs.existsSync(abs) ||
               (t.endsWith("/") && fs.existsSync(path.join(abs, "index.html"))) ||
               (t === "/" );
    if (!ok) fail(p, "リンク先が存在しない", m[1]);
  }

  // 5. 広告リンクがHTMLに直書きされていないか
  //    直書きすると PR表記が漏れる。景表法（ステマ規制）の要件であると同時に、
  //    広告主が「広告表示がない場合、提携を解除する可能性」と明記した
  //    提携維持の条件でもある。リンクは affiliate.js の PROGRAMS だけに置き、
  //    PR表記を必ず伴う render() 経由でしか出せないようにする。
  //    ASPごとにドメインが違う。A8だけを見ていると、他のASPの素材を
  //    直書きする経路が開いたままになる（アクセストレードで実際に空いていた）。
  //    ASPを増やしたらここに足す。
  for (const m of html.matchAll(/(px\.a8\.net|www\d*\.a8\.net|a8mat=|h\.accesstrade\.net|accesstrade\.net\/sp\/(?:cc|rr))/g)) {
    fail(p, "広告リンクの直書き", `${m[1]} … affiliate.js の render() 経由で出してください`);
  }

  // 5. 未展開のテンプレート変数
  if (/\{\{[^}]+\}\}/.test(html)) fail(p, "未展開の変数", html.match(/\{\{[^}]+\}\}/)[0]);
}

// 6. sitemap に載せた URL が実在するか
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  let rel = m[1].replace(SITE, "").replace(/^\//, "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  if (!fs.existsSync(path.join(ROOT, rel))) fail("sitemap.xml", "存在しないURLを登録", m[1]);
}

// 6b. 実在する公開ページが sitemap に載っているか（逆方向）
// ⚠️ 6 は「sitemapのURLが実在するか」しか見ておらず、
//    ページを作って sitemap に入れ忘れる方向を素通りさせていた。
//    2026-09-04 に categories/shugo/ を作った際、実際に入れ忘れた。
//    載っていないページはクローラに見つけてもらえず、作った意味が薄れる。
{
  const smUrls = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(m => m[1].replace(SITE, "").replace(/^\//, "").replace(/index\.html$/, "")));
  // 検索に出す必要のないページは除く
  const EXCLUDE = new Set(["offline.html", "privacy.html", "contact.html", "about.html"]);
  let checked = 0;
  const missing = [];
  for (const p of pages) {
    if (EXCLUDE.has(p)) continue;
    checked++;
    const key = p.replace(/index\.html$/, "");
    if (!smUrls.has(key)) missing.push(p);
  }
  if (!checked) fail("sitemap.xml", "検査対象が0件", "pages が空。空回りしている");
  for (const p of missing) fail("sitemap.xml", "実在するページが未登録", p);
  console.log(`sitemap の網羅: ${checked}ページを検査`);
}

// 7. 出題分野のチェックボックスが、実在するカテゴリと一致しているか
//
// 分野の追加・付け替えのときに揃える箇所が複数ある（テンプレート定義と
// index.html のチェックボックス）。片方だけ直すと、選んでも1問も出ない
// 分野ができたり、分野別成績の名前だけ古いまま残ったりする。
// どちらも例外にならず、画面上も一見それらしく見えるので気づけない。
//
// チェックボックスは「出題される分野の一部」でよい（四則逆算と語句の関係は
// 別ページ扱いで意図的に載せていない）ので、検査は一方向にする＝
// 載っているものが実在し、名前が一致していること。
{
  const vm = require("vm");
  const ctx = vm.createContext({ console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite });
  vm.runInContext(fs.readFileSync(path.join(ROOT, "questions.js"), "utf8"), ctx, { filename: "questions.js" });
  const templates = vm.runInContext("QUESTION_TEMPLATES", ctx);

  const nameById = new Map();
  for (const t of templates) nameById.set(String(t.categoryId), t.category);

  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const block = html.match(/<div class="category-grid" id="category-select">([\s\S]*?)<\/div>/);
  if (!block) {
    fail("index.html", "出題分野の選択欄が見つからない", "category-select");
  } else {
    const boxes = [...block[1].matchAll(/<input type="checkbox" value="(\d+)"[^>]*><span>([^<]+)<\/span>/g)];
    if (!boxes.length) fail("index.html", "出題分野のチェックボックスが0件", "");
    for (const [, id, label] of boxes) {
      if (!nameById.has(id)) {
        fail("index.html", "存在しない分野が選択欄にある", `value=${id} (${label}) … その categoryId の問題が1問も無い`);
      } else if (nameById.get(id) !== label) {
        fail("index.html", "分野名がテンプレートと不一致", `value=${id}: 画面「${label}」 ≠ 問題側「${nameById.get(id)}」`);
      }
    }

    // 「対応分野」の静的な控えが、チェックボックスとずれていないか。
    // ここは JS が埋め直すが、JS が動かない利用者にはこの静的な中身が見える。
    // 「10分野」と書きながら11分野を出題していたのは、同じ事実を2箇所に
    // 手で書いていたため。控えを置くなら、一致していることを機械的に確かめる。
    const listed = html.match(/<div class="categories-list" id="categories-list">([^<]*)<\/div>/);
    if (!listed) {
      fail("index.html", "対応分野の一覧が見つからない", "categories-list");
    } else {
      const shown = listed[1].split("/").map(s => s.trim()).filter(Boolean);
      const want = boxes.map(b => b[2]);
      if (shown.join("|") !== want.join("|")) {
        fail("index.html", "対応分野の一覧がチェックボックスと不一致",
          `一覧「${shown.join(" / ")}」 ≠ 選択欄「${want.join(" / ")}」`);
      }
    }

  }
}


// --- 分野の数を手で書いていないか（全ページ・head も JSON-LD も含む）---
//
// ⚠️ ここは以前「画面の本文だけ」を見ていて、head の title / meta と
//    構造化データを意図的に対象外にしていた。その除外が再発を許した。
//    「10分野と書きながら11分野を出題」を本文だけ直したあと、分野が増えて
//    13になり、meta と JSON-LD は嘘のまま残った。JSON-LD はリッチリザルトと
//    して検索結果に出るので、本文より影響が大きい。
//
// 分野の数は増減する。書いた瞬間から嘘になりうるので、原則として書かない。
// 画面のラベルは app.js の fillCategorySummary がチェックボックスから算出する。
//
// 例外は「当サイトの分野数を指していない一般論」だけ。回数まで固定して
// 明示する。増えたときに必ず気づくようにするため。
{
  const ALLOWED = new Map([
    // SPIの頻出分野の列挙。直前に10個並べており、当サイトの対応数ではない
    ["articles/spi-kakomon-pdf.html", { "10分野": 1 }],
    // SPIが言語・非言語の2分野で構成される、という一般論
    ["language/index.html", { "2分野": 1 }]
  ]);
  let checked = 0, seen = 0;
  for (const p of pages) {
    const html = fs.readFileSync(path.join(ROOT, p), "utf8");
    checked++;
    const allowed = ALLOWED.get(p) || {};
    const count = {};
    for (const m of html.matchAll(/\d+\s*分野/g)) {
      const token = m[0].replace(/\s+/g, "");
      count[token] = (count[token] || 0) + 1;
      seen++;
      if ((allowed[token] || 0) >= count[token]) continue;
      const around = html.slice(Math.max(0, m.index - 45), m.index + 45).replace(/\s+/g, " ");
      fail(p, "分野の数が手で書かれている",
        `「${token}」… 分野は増減するので書かない（…${around}…）`);
    }
    // 例外に挙げたのに実物から消えている場合も知らせる。
    // 消えた例外を残すと、次に同じ記述が復活したとき素通りする。
    for (const token of Object.keys(allowed)) {
      if ((count[token] || 0) < allowed[token]) {
        fail(p, "例外の指定が実物と合わない",
          `「${token}」を ${allowed[token]}回 許可しているが実物は ${count[token] || 0}回。消えたなら例外も消す`);
      }
    }
  }
  // 0件だと「手書きが無い」ではなく「1ページも見ていない」。
  cov.covered("分野数の手書きを調べたページ", checked, 10);
  console.log(`分野数の手書き: ${checked}ページ / 「N分野」の出現 ${seen}件`);
}


// --- 解き方の一覧が、実在しない分野を宣伝していないか ---
//
// title と description は検索結果に出る。「10分野それぞれの解き方」と
// 書いておいて実在が3本だと、来た人は期待したものを見つけられない。
// 数の食い違いより重い。数を消しても「速度算の解き方も」と分野名で
// 書けば同じことが起きるので、分野名そのものを突き合わせる。
{
  const dirs = fs.readdirSync(path.join(ROOT, "categories"), { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => e.name).sort();

  // app.js の CATEGORY_PAGES が「分野名 → ページ」の唯一の出所。
  // 一覧の宣伝文はこの表に載っている分野しか名乗ってはいけない。
  const appSrc = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  // 2026-09-06: 分野名→ページの表は app.js の直書きから
  // 出題プロファイル（src/questions/_profile.js）由来に変わった。
  // ここはテキストで読むのをやめ、実際に引き当てた結果を見る。
  // ⚠️ app.js が本当にプロファイルを使っているかは test/profile.spec.js が見る。
  //    ここで引き当てだけ見ていると、app.js が自前の表に戻っても気づけない。
  const vmPages = require("vm");
  const ctxPages = vmPages.createContext({ QUESTION_TEMPLATES: [], console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite });
  vmPages.runInContext(fs.readFileSync(path.join(ROOT, "questions.js"), "utf8"), ctxPages, { filename: "questions.js" });
  const pageMap = typeof ctxPages.profileCategoryPages === "function"
    ? ctxPages.profileCategoryPages("spi") : {};
  const pairs = Object.keys(pageMap).map(k => [k, pageMap[k]]);

  if (!pairs.length) {
    fail("_profile.js", "分野→ページの一覧を引けない", "profileCategoryPages(\"spi\") が空。突き合わせられないので、この検査は意味を持たない");
  } else {
    // 表と実物がずれていたら、どちらが正しいか決められない
    const slugs = pairs.map(([, v]) => v).sort();
    if (slugs.join(",") !== dirs.join(",")) {
      fail("categories/", "CATEGORY_PAGES と実在ページが食い違う", `表 ${slugs.join(" / ")} ≠ 実物 ${dirs.join(" / ")}`);
    }

    const listed = pairs.map(([k]) => k);
    const vm2 = require("vm");
    const ctx2 = vm2.createContext({ console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite });
    vm2.runInContext(fs.readFileSync(path.join(ROOT, "questions.js"), "utf8"), ctx2, { filename: "questions.js" });
    const allCats = [...new Set(vm2.runInContext("QUESTION_TEMPLATES", ctx2).map(t => t.category))];
    const notListed = allCats.filter(c => listed.indexOf(c) === -1);

    const idx = fs.readFileSync(path.join(ROOT, "categories/index.html"), "utf8");
    const head = (idx.match(/<title>([\s\S]*?)<\/title>/) || ["", ""])[1]
      + " " + (idx.match(/<meta name="description" content="([^"]*)"/) || ["", ""])[1];

    // ⚠️ 2026-09-04: 全13分野に解き方ページを作ったため notListed が0件になり、
    //    「解き方が無い分野を宣伝していないか」は対象が消滅して空回りした。
    //    検査を消すのではなく、全分野を対象にする形に作り替える。
    //    ・宣伝しているのに実在しない → 従来どおり落とす（notListed が復活したとき効く）
    //    ・実在するのに1つもリンクが無い → 作ったのに導線が無い状態を落とす
    // ⚠️ 旧版は notListed（テンプレに無い分野）だけを走査していた。
    //    全分野にページができて notListed が0件になると、何も照合しなくなる。
    //    「宣伝に出てくる分野名が、すべて実在するか」の向きに変える。
    //    こちらなら対象が消えない（宣伝文は必ず何かを名乗っているため）。
    let checked = 0;
    // 宣伝文のうち「A・B・C の解法を確認して」の、中黒で並んだ部分だけを対象にする。
    // ⚠️ 文全体から名詞らしきものを拾うと「解き方と練習問題」まで分野名として数えてしまう。
    const listPart = (head.match(/。([^。]*?)の解法を/) || ["", ""])[1];
    const advertised = listPart ? listPart.split("・").filter(Boolean) : [];
    for (const name of advertised) {
      checked++;
      const hit = allCats.some(c => c === name || c.replace(/・/g, "と") === name);
      if (!hit) {
        fail("categories/index.html", "実在しない解き方を宣伝している",
          `「${name}」は出題テンプレに無いのに title/description に書かれている`);
      }
    }

    let linked = 0;
    const idxLinks = new Set([...idx.matchAll(/href="(?:\/categories\/|\.\/)?([a-z]+)\/"/g)].map(m => m[1]));
    for (const [cat, slug] of pairs) {
      linked++;
      if (!idxLinks.has(slug)) {
        fail("categories/index.html", "解き方ページへの導線が無い",
          `「${cat}」(${slug}) のページは実在するが、一覧からリンクされていない`);
      }
    }
    // 0件だと「不足が無い」ではなく「1分野も照合していない」。
    cov.covered("解き方ページと一覧の照合", linked, 5);
    cov.covered("宣伝文の分野名の実在確認", checked, 3);
    console.log(`解き方の一覧: 実在 ${dirs.length}本 / 一覧からの導線 ${linked}件 / 宣伝文の分野名 ${checked}件を照合`);
  }
}

// --- 記事面に広告枠が入っているか ---
//
// 結果画面だけに枠があり、記事10ページはゼロだった。検索から来た人が
// 最初に触れる面に何も無いと、表示が増えず、CTRの判定に必要な標本が集まらない。
//
// ⚠️ 枠の div だけ入れて script を入れ忘れると、枠は永久に空のまま。
//    画面上は何も起きないので、誰も気づかない。両方そろっていることを見る。
{
  // 枠を置く面。トップ(index.html)は app.js が結果画面に描くので別扱い。
  // 法務系（privacy/about/contact）と offline は対象外。
  const EXCLUDE = new Set(["index.html", "privacy.html", "about.html", "contact.html", "offline.html"]);
  const targets = pages.filter((p) => !EXCLUDE.has(p));
  // 0件だと「不足が無い」ではなく「1ページも見ていない」。
  cov.covered("広告枠を置く面", targets.length, 10);

  for (const p of targets) {
    const html = fs.readFileSync(path.join(ROOT, p), "utf8");
    const hasSlot = html.includes('id="affiliate-article"');
    const hasScript = html.includes("/affiliate-article.js") && html.includes("/affiliate.js");
    if (!hasSlot) {
      fail(p, "広告枠が無い", 'id="affiliate-article" の div が無い。この面は表示0のまま');
    } else if (!hasScript) {
      fail(p, "広告枠を描くスクリプトが無い",
        "枠の div はあるが affiliate.js / affiliate-article.js を読み込んでいない。枠は永久に空のまま");
    }
  }
  console.log(`広告枠: ${targets.length}面を検査`);
}

// --- AdSense の審査用スニペットが全ページの <head> に入っているか ---
// 審査はサイト単位なので、1ページでも欠けると「コードが見つかりません」で
// 弾かれる。手で貼ると必ず漏れるので機械的に守る。新しいページを足したとき
// これが落ちれば、貼り忘れたまま公開することはない。
{
  const PUB = "ca-pub-5409685648363967";
  for (const p of pages) {
    const html = fs.readFileSync(path.join(ROOT, p), "utf8");
    const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/);
    if (!head) { fail(p, "head が見つからない", ""); continue; }
    if (!head[1].includes(PUB)) {
      fail(p, "AdSenseスニペットが head に無い", `${PUB} を含む <script> が必要`);
    }
  }
}

console.log(`HTML ${pages.length}ページを検査`);
cov.print();
for (const p of cov.failures) failures.push({ f: "検査対象", rule: p, detail: "" });
if (!failures.length) {
  console.log("✅ 問題なし");
} else {
  console.log(`❌ ${failures.length}件\n`);
  for (const x of failures) console.log(`  [${x.f}] ${x.rule}: ${x.detail}`);
}
process.exit(failures.length ? 1 : 0);
