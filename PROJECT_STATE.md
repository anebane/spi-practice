# PROJECT STATE（プロジェクト状態）

> このファイルは、ClaudeCode / OpenCode / LMStudio のどのツールでも同じ文脈から開発を再開するための「正本」です。
> 開発の区切りごとに必ず更新する。終わったら「次にやること」と「設計意図」を必ず残す。
> 参照: `DIVISION_OF_LABOR.md`（役割分担）

## 概要
SPI非言語を無料で練習できる模擬試験サービス（適性検査無限ドリル）。問題はパラメータランダム生成で無限出題。WebApp（PWA・静的なHTML/CSS/JS）。

- 公開URL: https://tekisei-drill.com/（GitHub Pages）
- GA4: G-SPDZ1K30TB / AdSense: ca-pub-5409685648363967
- 収益: 広告 + アフィリエイト（a8.net、記事ページ中心）

## 技術スタック
- 素のHTML/CSS/JS（フレームワークなし）・PWA（Service Worker・manifest）
- 問題: `src/questions/*.js`（13分野）→ `tools/build-questions.js` で `questions.js` に結合
- テスト: Node製の自前spec群 + CI（GitHub Actions）
- 計測: `analytics.js`（記事ページ / 読了・CTA送客）、GA4スクリプト

## デプロイ・CI
- GitHub Actions `test.yml`: main push / PR で以下を実行
  1. `questions.js` が `src/questions/` と一致するか（build-questions.js 再生成チェック）
  2. 問題ジェネレータ検証（79テンプレ x 1000回）
  3. HTML健全性（未展開変数・内部リンク）
  4. 広告枠の不変条件（PR表記・案件注記・属性の枠）＝ affiliate.spec.js
  5. 記事ページ計測（reader達成）＝ analytics.spec.js
  6. 検査の登録漏れ（CIと破壊テスト両方）＝ wiring.spec.js
  7. PWA構成（manifest・アイコン・プリキャッシュ）＝ pwa.spec.js
  8. 導線のE2E（?cat= リンク）＝ deeplink.spec.js
  9. 破壊テスト（検査が本当に落ちるか）＝ mutation-runner.js
  10. 計測整合（exam_start と exam_finish の対応）＝ app.spec.js
- 破壊テスト: `test/mutations.json`（壊し方）を適用し、指定specが落ちることを検証。「検査を足したら変異も足す」義務を機械化。カバーできない失敗経路は `test/mutations-uncovered.json` に理由つきで登録（台帳は縮める方向にのみ動かす）

## 現在のブランチ状態（重要）
main から分離した未マージブランチが複数存在。ClaudeCodeが進行中だった作業。

| ブランチ | コミット数 | テーマ | 状態・判断 |
|----------|-----------|--------|-----------|
| `independent-recalc` | 28 | 問題文から独立に解き直す検査の拡充 | 保留 |
| `merge-recalc` | 28 | ↑と同系統の検査拡充 | 保留 |
| `sweep-props` | 25 | 破壊テスト分割・集約・広告枠追加 | 保留 |
| `weak-probe` | 16 | 弱変異強化・カタログ追加 | 保留 |
| `ledger-triage` | 7 | 変異台帳の返済（整理して完了させる候補） | 精算候補 |

→ 判断保留中。優先順位は未決定。評価では「品質道具偏重で本筋から逸れている」指摘あり。

## 直近の評価（2026-09-01 時点）
- 強み: 品質文化（変異テスト）は個人開発として突出。ドメイン設計（ランダム生成・分割管理）は優れている。収益化・SEO考慮も入っている
- 懸念: 5ブランチ放置。開発重心が「機能・稼働」より「テストのテスト」に偏り気味。稼働実績・指標の確認が不明

## 次にやること（未決定）
- [ ] 未マージ5ブランチの扱い（精算・マージ・捨てる）を判断
- [ ] 稼働データの確認（GSC/GA4、どの記事が流入・送客しているか）
- [ ] 機能・問題数の拡充（品質道具偏重からの回帰）
- [ ] 自律エージェントの常駐環境構築（本ファイルがその状態源になる）

## 設計意図（変更容易な本質）
- 「同じ問題が再び出ない」= パラメータランダム生成が最大の差別化。必ず守る
- 非エンジニア単独開発を前提に、壊れにくさ・巻き戻しやすさを最優先
- 検査は「書いただけ」では信用しない。必ず破壊テスト（変異）で実効性を保証する
