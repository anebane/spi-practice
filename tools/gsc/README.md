# GSC 検索データの自動分析

`fetch.py` で Search Console からデータを取得し、`analyze.py` で「次に打つ手」を Markdown で出す。

```bash
export GSC_CREDENTIALS=~/.config/gsc/service-account.json
python3 tools/gsc/fetch.py --days 28
python3 tools/gsc/analyze.py data/gsc/2026-08-26.json -o reports/2026-08-26.md
```

CSV でも動く（認証なしで分析ロジックだけ試したいとき）。
GSC は希少クエリを匿名化して省くため、CSV 利用時は `--total-clicks` で実際の総数を渡すと依存度が正しく出る。

```bash
python3 tools/gsc/analyze.py クエリ.csv --total-clicks 1160
```

## セットアップ（初回のみ）

1. Google Cloud でプロジェクトを作る
2. **Google Search Console API** を有効化
3. サービスアカウントを作成し、JSON 鍵をダウンロード（**鍵はリポジトリに置かない**）
4. Search Console → 設定 → ユーザーと権限 → サービスアカウントのメールアドレスを「制限付き」で追加
5. 鍵の場所を `GSC_CREDENTIALS` に設定

サービスアカウントを使うのは、対話的 OAuth だとトークン更新とブラウザ操作が必要になり、
cron や GitHub Actions から無人実行できないため。

## 分析の中身

| 節 | 何を見るか | 打ち手 |
|---|---|---|
| 1 | 表示あり・クリック0 | そのテーマのページが無い → 作れば取れる |
| 2 | 順位8〜20位 | 1ページ目に入れば CTR が跳ねる。既存強化が最も効率的 |
| 3 | 順位に対し CTR が低い | 順位ではなくタイトル・説明文の問題 |
| 4 | 未対応テーマの需要 | 表示が多くクリックが無い＝商品が無い |
| 5 | 上位クエリへの依存度 | 集中しすぎは順位変動の直撃リスク |
| 6 | 推奨アクション | 上記を機会クリック数で優先度付け |

「機会クリック数」＝ `表示回数 × (3位相当の期待CTR − 現在のCTR)`。
今の露出のまま順位が 3 位まで上がったら何クリック増えるかの概算。
