/**
 * 多様性ベースラインの由来と署名。
 *
 * 【なぜ必要か】
 * UPDATE_BASELINE は名指し・理由・タイポ検出のゲートを持っているが、
 * diversity-baseline.json を**エディタで直接書き換えれば全部素通り**する。
 * 実測: soneki_discount_01 を 305 → 10 に手で下げても、9本の検査すべてが緑。
 * ベースラインを下げるのは「退行を隠す」方向なので、これは効く抜け道。
 *
 * ⚠️ これは改竄防止ではない。署名を計算し直せば通る。
 *    狙いは「ゲートを通さずに書き換えたことが、次の実行で必ず見えること」。
 *    うっかりと、記録の無い変更を止める。
 *
 * 書く側（UPDATE_BASELINE）と検査側で同じ関数を使う。
 * 別実装にすると、片方だけがずれたとき嘘の一致が生まれる（性質A1）。
 */
const crypto = require("crypto");

const META_KEY = "_meta";

/** メタを除いた実データを、キー順で正規化して返す。 */
function entriesOf(obj) {
  const out = {};
  for (const k of Object.keys(obj || {}).sort()) {
    if (k === META_KEY) continue;
    out[k] = obj[k];
  }
  return out;
}

/** 実データだけから署名を作る。整形の違いでは変わらない。 */
function signature(obj) {
  return crypto.createHash("sha256")
    .update(JSON.stringify(entriesOf(obj)))
    .digest("hex")
    .slice(0, 16);
}

/**
 * 署名が中身と合っているか。
 * 戻り値: { ok: true } / { ok: false, why: "...", how: "..." }
 */
function verify(obj) {
  const meta = obj && obj[META_KEY];
  if (!meta || typeof meta !== "object") {
    return {
      ok: false,
      why: "ベースラインに由来（_meta）がありません",
      how: 'UPDATE_BASELINE=sign BASELINE_REASON="既存の値に由来を付ける" node test/generator.spec.js'
    };
  }
  const want = signature(obj);
  if (meta.signature !== want) {
    return {
      ok: false,
      why: `署名が中身と一致しません（記録 ${meta.signature} / 実際 ${want}）`
         + `。最後の更新: ${meta.updated || "不明"} / 理由: ${meta.reason || "不明"}`,
      how: "エディタで直接書き換えると、名指し・理由・タイポ検出のゲートを素通りします。"
         + ' UPDATE_BASELINE=<テンプレートID> BASELINE_REASON="..." で更新してください。'
    };
  }
  return { ok: true };
}

/** 書き出す形（実データ＋メタ）を組み立てる。 */
function withMeta(entries, reason, changedIds) {
  const sorted = entriesOf(entries);
  const out = { [META_KEY]: {
    signature: signature(sorted),
    updated: new Date().toISOString().slice(0, 10),
    reason: reason || "",
    changed: changedIds || []
  } };
  for (const k of Object.keys(sorted)) out[k] = sorted[k];
  return out;
}

module.exports = { META_KEY, entriesOf, signature, verify, withMeta };
