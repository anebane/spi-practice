#!/usr/bin/env python3
"""GA4 Data API から出題の実績を取得して JSON に保存する。

見たいのは難易度調整ではなく「壊れた問題の検出」。
検証テスト（test/generator.spec.js）は問題の数学的な正しさしか見られず、
「問題文が分かりにくい」「選択肢が紛らわしい」「解説が理解できない」は
正答率と所要時間にしか出ない。89テンプレートを自分で解いて確かめるのは
無理だが、利用者が毎日やってくれている。

GSC の tools/gsc/fetch.py と同じ形にしてある（サービスアカウント認証・
JSON に落として analyze が読む）。認証情報も共用。

事前準備:
  1. GCPで Analytics Data API / Analytics Admin API を有効化
  2. GA4のプロパティのアクセス管理に、サービスアカウントを「閲覧者」で追加
  3. 環境変数 GSC_CREDENTIALS に鍵ファイルのパスを設定
"""
import argparse, json, os, sys
from datetime import date, timedelta

SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]
DEFAULT_PROPERTY = "properties/526840766"   # keita_yano / SPI模擬試験β


TOKEN = os.path.expanduser("~/.config/ga4/token.json")


def creds():
    """OAuth（矢野さん本人）で認証する。サービスアカウントは使わない。

    理由: GA4のユーザー追加UIがサービスアカウントのメールを
    「Google アカウントと一致しません」で弾く（2026-08-27に4通り試して全滅）。
    一方 cesuac.acjl201@gmail.com は既にGA4の管理者なので、
    この人としてOAuthすれば権限付与そのものが不要になる。
    GSC は引き続きサービスアカウント（tools/gsc/）。認証方式が分かれるが、
    GA4側の制約なので仕方ない。

    同意画面は「本番環境」に公開済み。テスト状態のままだと
    リフレッシュトークンが7日で失効し、週次実行が予告なく止まる。
    """
    if not os.path.exists(TOKEN):
        sys.exit(f"エラー: {TOKEN} がありません。先に tools/ga4/authorize.py を実行してください。")
    from google.oauth2.credentials import Credentials
    return Credentials.from_authorized_user_file(TOKEN, SCOPES)


def run(client, prop, start, end, dims, mets):
    """ページングしながら全行取得する。GA4は1回あたり最大10万行。"""
    from google.analytics.data_v1beta.types import (
        RunReportRequest, DateRange, Dimension, Metric)
    rows, offset = [], 0
    while True:
        resp = client.run_report(RunReportRequest(
            property=prop,
            date_ranges=[DateRange(start_date=start, end_date=end)],
            dimensions=[Dimension(name=d) for d in dims],
            metrics=[Metric(name=m) for m in mets],
            limit=100000, offset=offset,
        ))
        rows.extend(resp.rows)
        offset += len(resp.rows)
        if len(resp.rows) < 100000 or offset >= resp.row_count:
            break
    return rows


def to_dicts(rows, dims, mets):
    out = []
    for r in rows:
        d = {dims[i]: r.dimension_values[i].value for i in range(len(dims))}
        for i, m in enumerate(mets):
            v = r.metric_values[i].value
            d[m] = float(v) if "." in v else int(v)
        out.append(d)
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--property", default=DEFAULT_PROPERTY,
                   help="properties/<数字> 形式。測定ID(G-XXXX)ではない")
    p.add_argument("--days", type=int, default=28, help="遡る日数")
    p.add_argument("--lag", type=int, default=1,
                   help="末尾の未確定日を除外する日数。GA4はGSCほど遅れないので既定1")
    p.add_argument("-o", "--out", help="出力先JSON")
    a = p.parse_args()

    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    # transport="rest" は必須。既定の gRPC はこの環境で IPv6 に振られて
    # 「503 No route to host」になる（2026-08-27に実測）。RESTなら通る。
    client = BetaAnalyticsDataClient(credentials=creds(), transport="rest")

    end = date.today() - timedelta(days=a.lag)
    start = end - timedelta(days=a.days - 1)
    s, e = start.isoformat(), end.isoformat()

    # イベント名 x カスタムパラメータ。template_id は 2026-08-27 から送っている。
    # それ以前は question_id（毎問ユニーク）だったので集計できない。
    D = ["eventName", "customEvent:template_id", "customEvent:category",
         "customEvent:difficulty", "customEvent:is_correct"]
    M = ["eventCount"]
    detail = to_dicts(run(client, a.property, s, e, D, M), D, M)

    # 分野別。テンプレート別より分母が2桁大きいので、こちらは早くから使える。
    D2 = ["eventName", "customEvent:category"]
    by_category = to_dicts(run(client, a.property, s, e, D2, M), D2, M)

    # 全体の利用状況。分母を把握しないと正答率の信頼区間が出せない。
    D3 = ["eventName"]
    by_event = to_dicts(run(client, a.property, s, e, D3, M), D3, M)

    out = a.out or os.path.join("data", "ga4", f"{e}.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"property": a.property, "start": s, "end": e,
                   "detail": detail, "by_category": by_category,
                   "by_event": by_event}, f, ensure_ascii=False, indent=1)
    print(f"取得完了: {out}")
    print(f"  期間 {s} 〜 {e} / 明細 {len(detail):,}行 / 分野別 {len(by_category):,}行")
    total = sum(r["eventCount"] for r in by_event)
    print(f"  イベント総数 {total:,}")


if __name__ == "__main__":
    main()
