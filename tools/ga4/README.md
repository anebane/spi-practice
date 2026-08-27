# GA4 データ取得ツール

見たいのは難易度調整ではなく **壊れた問題の検出**。
`test/generator.spec.js` は問題の数学的な正しさしか見られず、
「問題文が分かりにくい」「選択肢が紛らわしい」「解説が理解できない」は
正答率と所要時間にしか出ない。

## 使い方

```sh
export GSC_CREDENTIALS="$HOME/.config/gsc/service-account.json"
python3 tools/ga4/fetch.py --days 28
```

## セットアップ状況（2026-08-27）

| 項目 | 状態 |
|---|---|
| GA4プロパティ | `properties/526840766`（keita_yano / SPI模擬試験β） |
| Analytics Data API | ✅ 有効化済み（GCP `anebane-web-ops`） |
| Analytics Admin API | ✅ 有効化済み |
| カスタムディメンション | ✅ `template_id` `category` `difficulty` `is_correct` の4つを登録済み |
| サービスアカウントの閲覧権限 | ❌ **未完了。下記参照** |

## ⚠️ 残っている作業：サービスアカウントに閲覧権限を付ける

`analytics-reader@anebane-web-ops.iam.gserviceaccount.com` を
GA4の「プロパティのアクセス管理」に **閲覧者** で追加する必要がある。

**2026-08-27にブラウザから試したところ、GA4が
「このメールアドレスは Google アカウントと一致しません」で弾いた。**
サービスアカウントのメールは通常GA4に追加できるので、
時間をおいて再試行するか、UIの別経路を試す。

これが通るまで `fetch.py` は 403 を返す（通信自体は到達している）。

## 実装上の注意

- **`transport="rest"` は必須。** 既定の gRPC はこの環境で IPv6 に振られて
  `503 No route to host` になる（2026-08-27に実測）。
- **カスタムディメンションは遡及しない。** 登録前に送ったデータは
  そのディメンションで集計できない。だから先に登録した。
- `template_id` は 2026-08-27 から送っている。それ以前は `question_id`
  （毎問ユニーク）だったので集計できない。
