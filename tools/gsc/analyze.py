#!/usr/bin/env python3
"""GSC データを分析し、次に打つ手を Markdown レポートで出す。

APIから取得したJSON、または Search Console の CSV エクスポートのどちらでも動く。
CSV で動くようにしてあるのは、認証が無い状態でも分析ロジックを検証できるようにするため。
"""
import argparse, csv, json, os, sys
from collections import defaultdict
from datetime import date

# 掲載順位ごとの平均CTR。業界で広く使われる水準を丸めたもの。
# 「この順位なら本来これくらいクリックされるはず」の基準に使う。
CTR_CURVE = {1: .28, 2: .15, 3: .11, 4: .08, 5: .06, 6: .05,
             7: .04, 8: .035, 9: .03, 10: .025}

def expected_ctr(pos):
    if pos < 1: return CTR_CURVE[1]
    if pos <= 10: return CTR_CURVE[round(pos)]
    if pos <= 20: return .015
    return .005

# 未対応/手薄な領域を検出するためのテーマ辞書
THEMES = {
    "言語分野":        ["言語", "語句", "長文", "熟語", "二語"],
    "性格検査":        ["性格"],
    "テストセンター":  ["テストセンター", "テスセン"],
    "他形式(玉手箱等)": ["玉手箱", "gab", "tg-web", "tgweb", "cab"],
    "webテスト全般":   ["webテスト", "web テスト"],
    "PDF/DL要求":      ["pdf", "ダウンロード", "印刷"],
    "アプリ要求":      ["アプリ"],
}

def load_csv(path):
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            k = list(r.keys())
            rows.append({
                "query": r[k[0]].strip(),
                "clicks": int(r["クリック数"]),
                "impressions": int(r["表示回数"]),
                "position": float(r["掲載順位"]),
            })
    return rows

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)["rows"]

def opportunity(r):
    """機会クリック数 = 表示回数 x (順位3位相当の期待CTR - 現在のCTR)。
    「今の露出のまま順位が3位まで上がったら何クリック増えるか」の概算。"""
    cur = r["clicks"] / r["impressions"] if r["impressions"] else 0
    gain = CTR_CURVE[3] - cur
    return r["impressions"] * gain if gain > 0 else 0

def section(title, rows, cols, note=""):
    out = [f"\n## {title}\n"]
    if note: out.append(note + "\n")
    if not rows:
        out.append("_該当なし_\n"); return "".join(out)
    out.append("| " + " | ".join(c[0] for c in cols) + " |")
    out.append("\n|" + "|".join("---" for _ in cols) + "|\n")
    for r in rows:
        out.append("| " + " | ".join(str(c[1](r)) for c in cols) + " |\n")
    return "".join(out)

def analyze(rows, label, totals=None):
    tot_c = sum(r["clicks"] for r in rows)
    tot_i = sum(r["impressions"] for r in rows)
    # GSCはプライバシー保護のため希少クエリを結果から省く。
    # クエリ別の合計は常に実際の総数より小さくなるので、真の総数が分かる場合はそちらを基準にする。
    true_c = (totals or {}).get("clicks", tot_c)
    cover = tot_c / true_c * 100 if true_c else 100
    ctr = tot_c / tot_i * 100 if tot_i else 0
    wpos = sum(r["position"] * r["impressions"] for r in rows) / tot_i if tot_i else 0

    md = [f"# 検索データ分析レポート\n\n",
          f"対象: {label}  /  生成: {date.today().isoformat()}\n\n",
          f"- クリック **{tot_c:,}** / 表示 **{tot_i:,}** / CTR **{ctr:.2f}%** / 加重平均掲載順位 **{wpos:.2f}**\n",
          f"- 収集クエリ数 **{len(rows):,}**\n"]
    if cover < 99:
        md.append(f"- ⚠️ 実際の総クリックは **{true_c:,}**。クエリ別に判明しているのは **{cover:.0f}%** のみ"
                  f"（GSCが希少クエリを匿名化して省くため）。以下の比率はこの判明分に対するもの。\n")

    # 1. コンテンツの穴: 表示されているのに1クリックも取れていない
    holes = sorted([r for r in rows if r["clicks"] == 0 and r["impressions"] >= 5],
                   key=lambda r: -r["impressions"])[:15]
    md.append(section(
        "1. コンテンツの穴（表示あり・クリック0）", holes,
        [("クエリ", lambda r: r["query"]), ("表示", lambda r: r["impressions"]),
         ("順位", lambda r: f'{r["position"]:.1f}')],
        "露出はしているのに1クリックも取れていない。多くは**そのテーマのページが存在しない**ことが原因で、"
        "作れば取れる可能性が高い。"))

    # 2. あと一押し: 2ページ目前後。1ページ目に入ると急激にクリックが伸びる
    push = sorted([r for r in rows if 8 <= r["position"] <= 20 and r["impressions"] >= 10],
                  key=lambda r: -r["impressions"])[:15]
    md.append(section(
        "2. あと一押しで1ページ目（順位8〜20位）", push,
        [("クエリ", lambda r: r["query"]), ("表示", lambda r: r["impressions"]),
         ("クリック", lambda r: r["clicks"]), ("順位", lambda r: f'{r["position"]:.1f}'),
         ("機会クリック", lambda r: f"{opportunity(r):.0f}")],
        "順位が10位を切ると CTR が跳ね上がる。既存ページの強化で最も費用対効果が高い層。"))

    # 3. CTR不足: 順位のわりにクリックされていない = タイトル/説明文の問題
    weak = []
    for r in rows:
        if r["impressions"] < 20 or r["position"] > 10: continue
        cur = r["clicks"] / r["impressions"]
        exp = expected_ctr(r["position"])
        if cur < exp * 0.7:
            weak.append({**r, "cur": cur, "exp": exp, "loss": (exp - cur) * r["impressions"]})
    weak.sort(key=lambda r: -r["loss"])
    md.append(section(
        "3. CTR が順位に見合っていない（タイトル改善候補）", weak[:10],
        [("クエリ", lambda r: r["query"]), ("表示", lambda r: r["impressions"]),
         ("実CTR", lambda r: f'{r["cur"]*100:.1f}%'), ("期待CTR", lambda r: f'{r["exp"]*100:.1f}%'),
         ("順位", lambda r: f'{r["position"]:.1f}'), ("損失クリック", lambda r: f'{r["loss"]:.0f}')],
        "順位は取れているのにクリックされていない。**順位ではなくタイトル・説明文の問題**。"))

    # 4. テーマ別: 未対応領域の需要が見えるか
    th = defaultdict(lambda: {"c": 0, "i": 0, "n": 0})
    for r in rows:
        q = r["query"].lower()
        for name, kws in THEMES.items():
            if any(k in q for k in kws):
                th[name]["c"] += r["clicks"]; th[name]["i"] += r["impressions"]; th[name]["n"] += 1
    tl = sorted([{"name": k, **v} for k, v in th.items()], key=lambda x: -x["i"])
    md.append(section(
        "4. 未対応テーマの需要", tl,
        [("テーマ", lambda r: r["name"]), ("表示", lambda r: r["i"]),
         ("クリック", lambda r: r["c"]), ("クエリ数", lambda r: r["n"]),
         ("CTR", lambda r: f'{r["c"]/r["i"]*100:.1f}%' if r["i"] else "-")],
        "**表示が多いのにクリックが極端に少ないテーマ＝商品が無い**。新規コンテンツの最有力候補。"))

    # 5. 依存度: 上位クエリへの集中はリスク
    top = sorted(rows, key=lambda r: -r["clicks"])[:5]
    share = sum(r["clicks"] for r in top) / tot_c * 100 if tot_c else 0
    true_share = sum(r["clicks"] for r in top) / true_c * 100 if true_c else 0
    md.append(section(
        "5. 主力クエリと依存度", top,
        [("クエリ", lambda r: r["query"]), ("クリック", lambda r: r["clicks"]),
         ("表示", lambda r: r["impressions"]), ("順位", lambda r: f'{r["position"]:.1f}')],
        f"上位5クエリでクリックの **{share:.1f}%**（判明分ベース）を占める。"
        + (f" 匿名化分を含めた全体では **{true_share:.1f}%**。" if cover < 99 else "")
        + ("**集中しすぎ＝順位変動の影響を直撃する。分散が必要。**" if true_share > 50 else " 分散はできている。")))

    # 6. 次アクション
    md.append("\n## 6. 推奨アクション\n\n")
    acts = []
    for r in tl:
        if r["i"] >= 20 and (r["c"] / r["i"] if r["i"] else 0) < 0.02:
            acts.append(f"**「{r['name']}」のコンテンツを新規作成** — {r['i']}表示に対しクリック{r['c']}。需要はあるが受け皿が無い。")
    for r in push[:3]:
        acts.append(f"「{r['query']}」向けに既存ページを強化 — 現在{r['position']:.1f}位、3位まで上げれば+{opportunity(r):.0f}クリック相当。")
    for r in weak[:2]:
        acts.append(f"「{r['query']}」のタイトル/説明文を見直し — 順位{r['position']:.1f}位でCTR{r['cur']*100:.1f}%（期待{r['exp']*100:.1f}%）、{r['loss']:.0f}クリック損失中。")
    if true_share > 50:
        acts.append(f"**依存度の是正** — 上位5クエリで全体の{true_share:.1f}%。テーマを広げてリスクを下げる。")
    md.extend(f"{i}. {a}\n" for i, a in enumerate(acts[:8], 1))
    return "".join(md)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("source", help="GSCのCSV(クエリ.csv) または fetch.py が出力したJSON")
    p.add_argument("-o", "--out", help="出力先(.md)。省略時は標準出力")
    p.add_argument("--total-clicks", type=int, help="実際の総クリック数(CSV利用時。匿名化分を補正する)")
    a = p.parse_args()
    totals = None
    if a.source.endswith(".json"):
        with open(a.source, encoding="utf-8") as f: d = json.load(f)
        rows, totals = d["rows"], d.get("totals")
    else:
        rows = load_csv(a.source)
        if a.total_clicks: totals = {"clicks": a.total_clicks}
    md = analyze(rows, os.path.basename(a.source), totals)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f: f.write(md)
        print(f"書き出し: {a.out} ({len(md):,} bytes)")
    else:
        print(md)

if __name__ == "__main__":
    main()
