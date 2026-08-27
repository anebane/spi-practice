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

## セットアップ状況（2026-08-27 完了）

| 項目 | 状態 |
|---|---|
| GA4プロパティ | `properties/526840766`（keita_yano / SPI模擬試験β） |
| Analytics Data API / Admin API | ✅ 有効化済み（GCP `anebane-web-ops`） |
| カスタムディメンション | ✅ `template_id` `category` `difficulty` `is_correct` |
| 認証 | ✅ **OAuth（本人）**。`~/.config/ga4/token.json` |

## ⚠️ なぜサービスアカウントを使わないか

**GA4のユーザー追加UIがサービスアカウントのメールを
「このメールアドレスは Google アカウントと一致しません」で弾く。**
2026-08-27に4通り試して全滅（プロパティレベル×2通りの入力／アカウントレベル／
警告を無視する選択肢の有無）。

SA側の問題ではないことは確認済み:
- GCPコンソールで状態「有効」、メールも完全一致
- **同じSAでGSCは稼働している**（`tools/gsc/`）

→ `cesuac.acjl201@gmail.com` は**既にGA4の管理者**なので、
この人としてOAuthすれば**権限付与の手順そのものが要らない**。

### トークンを取り直すとき

```sh
python3 tools/ga4/authorize.py     # ブラウザで許可 → token.json を更新
```

🔑 **同意画面は「本番環境」に公開してある。テストに戻さないこと。**
テスト状態だとリフレッシュトークンが**7日で失効**し、週次実行が予告なく止まる。

## 実装上の注意

- **`transport="rest"` は必須。** 既定の gRPC はこの環境で IPv6 に振られて
  `503 No route to host` になる（2026-08-27に実測）。
- **カスタムディメンションは遡及しない。** 登録前に送ったデータは
  そのディメンションで集計できない。だから先に登録した。
- `template_id` は 2026-08-27 から送っている。それ以前は `question_id`
  （毎問ユニーク）だったので集計できない。
