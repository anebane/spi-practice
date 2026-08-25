#!/usr/bin/env node
/**
 * src/questions/*.js を結合して questions.js を生成する。
 *
 * 分割している理由: 145KBの単一ファイルはAIエージェントが編集すると失敗しやすく、
 * 差分レビューも困難なため。「濃度算を10問追加」なら 07-noudo.js だけを触ればよい。
 *
 * 結合後のファイルをコミットするので、サイト側は無改造で動く。
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src", "questions");
const OUT = path.join(__dirname, "..", "questions.js");

const files = fs.readdirSync(SRC).filter(f => f.endsWith(".js")).sort();
const base = files.find(f => f.startsWith("_base"));
const cats = files.filter(f => f !== base);

const parts = [
  "// ⚠️ このファイルは tools/build-questions.js が生成しています。",
  "// 直接編集せず src/questions/ を編集して `node tools/build-questions.js` を実行してください。",
  "",
  fs.readFileSync(path.join(SRC, base), "utf8").trim(),
  "",
  ...cats.map(f => fs.readFileSync(path.join(SRC, f), "utf8").trim() + "\n"),
];

fs.writeFileSync(OUT, parts.join("\n") + "\n", "utf8");
const n = parts.join("").split("QUESTION_TEMPLATES.push(").length - 1;
console.log(`生成: questions.js (${cats.length}カテゴリ / ${n}問 / ${fs.statSync(OUT).size.toLocaleString()} bytes)`);
