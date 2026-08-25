#!/usr/bin/env python3
"""Search Console API から検索データを取得して JSON に保存する。

サービスアカウント認証を使う。対話的OAuthではないので cron / GitHub Actions から
無人で実行できる（これが自動運用における最大の要件）。

事前準備:
  1. GCPでサービスアカウントを作り、JSON鍵をダウンロード
  2. Search Console の「ユーザーと権限」にそのサービスアカウントのメールを追加
  3. 環境変数 GSC_CREDENTIALS に鍵ファイルのパスを設定
"""
import argparse, json, os, sys
from datetime import date, timedelta

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]

def service():
    path = os.environ.get("GSC_CREDENTIALS")
    if not path or not os.path.exists(path):
        sys.exit("エラー: 環境変数 GSC_CREDENTIALS にサービスアカウントJSONのパスを設定してください。")
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(path, scopes=SCOPES)
    return build("searchconsole", "v1", credentials=creds, cache_discovery=False)

def query(svc, site, start, end, dims, limit=25000):
    """ページングしながら全行取得する。GSCは1回あたり最大25000行しか返さない。"""
    rows, start_row = [], 0
    while True:
        body = {"startDate": start, "endDate": end, "dimensions": dims,
                "rowLimit": limit, "startRow": start_row}
        resp = svc.searchanalytics().query(siteUrl=site, body=body).execute()
        got = resp.get("rows", [])
        rows.extend(got)
        if len(got) < limit: break
        start_row += limit
    return rows

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--site", default="sc-domain:tekisei-drill.com",
                   help="ドメインプロパティは sc-domain:example.com 形式")
    p.add_argument("--days", type=int, default=28, help="遡る日数")
    p.add_argument("--lag", type=int, default=3, help="末尾の未確定日を除外する日数")
    p.add_argument("-o", "--out", help="出力先JSON。省略時は data/gsc/<end>.json")
    a = p.parse_args()

    end = date.today() - timedelta(days=a.lag)     # 直近数日はデータ未確定なので除く
    start = end - timedelta(days=a.days - 1)
    s, e = start.isoformat(), end.isoformat()
    svc = service()

    # クエリ別。これが分析の主データ
    qrows = [{"query": r["keys"][0], "clicks": int(r["clicks"]),
              "impressions": int(r["impressions"]), "position": r["position"]}
             for r in query(svc, a.site, s, e, ["query"])]

    # ディメンション無しの合計。匿名化で省かれた分を把握するために必要
    tot = query(svc, a.site, s, e, [])
    totals = ({"clicks": int(tot[0]["clicks"]), "impressions": int(tot[0]["impressions"]),
               "ctr": tot[0]["ctr"], "position": tot[0]["position"]} if tot else {})

    # 日別。移行後の推移を追う
    drows = [{"date": r["keys"][0], "clicks": int(r["clicks"]),
              "impressions": int(r["impressions"]), "position": r["position"]}
             for r in query(svc, a.site, s, e, ["date"])]

    # ページ別
    prows = [{"page": r["keys"][0], "clicks": int(r["clicks"]),
              "impressions": int(r["impressions"]), "position": r["position"]}
             for r in query(svc, a.site, s, e, ["page"])]

    out = a.out or os.path.join("data", "gsc", f"{e}.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"site": a.site, "start": s, "end": e, "totals": totals,
                   "rows": qrows, "by_date": drows, "by_page": prows},
                  f, ensure_ascii=False, indent=1)
    print(f"取得完了: {out}")
    print(f"  期間 {s} 〜 {e} / クエリ {len(qrows):,}件 / 合計クリック {totals.get('clicks', 0):,}")

if __name__ == "__main__":
    main()
