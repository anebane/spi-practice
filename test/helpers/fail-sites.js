/**
 * spec の「失敗経路」の呼び出し箇所を列挙し、発火を記録できる形に計装する。
 *
 * 【なぜ必要か】
 * 2026-08-28、「検査を足したのに、それを落とす変異を足す義務がどこにも無い」せいで
 * 死んだ状態の検査が2本、足した瞬間から無効のまま入った。
 * 変異ランナーはこのモジュールで
 *   1. 各 spec の失敗経路（fail() / failures.push() / process.exitCode = 1 / process.exit(1)）を列挙し
 *   2. 変異を当てた実行で「どの失敗経路が実際に発火したか」を記録し
 *   3. どの変異でも発火しない失敗経路を EXIT=1 で報告する
 * ために使う。
 *
 * 【設計上の要】
 * 列挙と計装は**同じ1つの走査**から出す。別々に実装すると、片方だけが
 * 実装とずれたとき「列挙には載るが発火は記録されない」形で嘘のカバレッジ漏れ
 * （またはその逆）が生まれる。同じ走査なら、ずれは構造的に起きない。
 *
 * 【粒度は行】
 * 発火の記録は「ファイル名:行番号」。同じ行に失敗経路が2つあると区別できない。
 * 現状の spec には無い形だが、書くときは1行1経路にすること。
 */
"use strict";

// 失敗経路として数えるパターン。
//  - fail(...)            … 各 spec のローカル fail。プロパティアクセス(x.fail)や
//                           識別子の一部(markFail)は前方の [.\w$] 除外で弾く
//  - failures.push(...)   … fail を通らない直接記録
//  - process.exitCode = 1 … generator.spec の即時失敗
//  - process.exit(1)      … 早期の即死（末尾の sink `process.exit(x ? 1 : 0)` は
//                           リテラル 1 のみの呼び出しではないので一致しない）
const PATTERNS = [
  {
    kind: "fail()",
    re: /(?<![.\w$])fail\s*\(/g,
    wrap: (mark) => `(${mark}, fail)(`
  },
  {
    kind: "failures.push()",
    re: /(?<![.\w$])failures\.push\s*\(/g,
    wrap: (mark) => `(${mark}, failures).push(`
  },
  {
    kind: "process.exitCode=1",
    re: /process\.exitCode\s*=\s*1\b/g,
    wrap: (mark) => `process.exitCode = (${mark}, 1)`
  },
  {
    kind: "process.exit(1)",
    re: /(?<![.\w$])process\.exit\s*\(\s*1\s*\)/g,
    wrap: (mark) => `(${mark}, process).exit(1)`
  }
];

// 列挙・計装の対象外にする行:
//  - コメント行（fail() への言及が多い。文の途中の行内コメントまでは見ない）
//  - fail の定義行（`const fail = ...` は本体に failures.push を含むため行ごと除外。
//    generator.spec の `function fail(` の行も同様。定義の**中身**の行
//    （failures.push 等）は除外しない。fail() 経由で必ず発火する＝常にカバー済みに
//    なるだけで、未カバー誤検知は構造的に出ない）
function isExcludedLine(line) {
  const t = line.trim();
  if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return true;
  if (/const fail\s*=|function fail\s*\(/.test(line)) return true;
  return false;
}

/**
 * 1つの spec ソースを走査する。
 * @param {string} src spec のソース
 * @param {string} specName 記録に使う名前（例: "app.spec.js"）
 * @returns {{ sites: Array<{line:number, kind:string, text:string}>, instrumented: string }}
 *   sites … 失敗経路の一覧（line は1始まり、text は行の trim）
 *   instrumented … 発火すると MUTATION_COVERAGE_LOG に "specName:行" を追記するソース
 */
function processSource(src, specName) {
  const lines = src.split("\n");
  const sites = [];

  // 計装の入口。1行に収めて行番号を一切ずらさない。
  // 環境変数が無ければ何もしない（spec 単体実行の挙動を変えない）。
  const prologue =
    "const __covMark = (n) => { const p = process.env.MUTATION_COVERAGE_LOG; " +
    "if (p) { try { require(\"fs\").appendFileSync(p, " + JSON.stringify(specName) + " + \":\" + n + \"\\n\"); } catch (e) {} } };";

  const out = lines.map((line, i) => {
    const n = i + 1;
    if (isExcludedLine(line)) return line;
    let cur = line;
    for (const p of PATTERNS) {
      cur = cur.replace(p.re, () => {
        sites.push({ line: n, kind: p.kind, text: line.trim() });
        return p.wrap(`__covMark(${n})`);
      });
    }
    return cur;
  });

  // 先頭行に計装の入口を差し込む。shebang は node 実行では不要なので置き換える。
  // どちらの場合も行数は変えない（行番号の対応が命綱）。
  if (out[0].startsWith("#!")) out[0] = prologue;
  else out[0] = prologue + " " + out[0];

  return { sites, instrumented: out.join("\n") };
}

/**
 * 台帳・照合に使うサイトの鍵。行番号ではなく行の中身で作る。
 * 行番号は無関係な編集でずれるが、中身は「その検査自身を書き換えたとき」しか
 * 変わらない。書き換えたら鍵が変わり、台帳との不一致として**うるさく**表面化する。
 * nth は同一の中身が同じファイルに複数あるときの出現順。
 */
function siteKey(file, text, nth) {
  return file + "\u0000" + text + "\u0000" + nth;
}

/** sites 配列に nth（同一 text 内の出現順）と key を付けて返す。 */
function withKeys(file, sites) {
  const seen = new Map();
  return sites.map((s) => {
    const c = seen.get(s.text) || 0;
    seen.set(s.text, c + 1);
    return { ...s, file, nth: c, key: siteKey(file, s.text, c) };
  });
}

module.exports = { processSource, withKeys, siteKey };
