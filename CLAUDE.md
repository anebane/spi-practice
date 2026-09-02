# spi-practice（適性検査無限ドリル）

SPI非言語を無料で練習できる模擬試験サービス。問題はパラメータランダム生成で無限出題。
非エンジニアの単独開発（矢野さん）を前提に、**壊れにくさ・巻き戻しやすさを最優先**した開発をする。

- 公開: https://tekisei-drill.com/（GitHub Pages）
- 言語・Stack: 素のHTML/CSS/JS（フレームワークなし）・PWA
- 収益: 広告（AdSense）+ アフィリエイト（a8.net）

## 必読ドキュメント
- **PROJECT_STATE.md** — 現在の状態・次にやること・設計意図の正本。作業前後で必ず確認・更新する
- **DIVISION_OF_LABOR.md** — ClaudeCode / OpenCode / LMStudio の役割分担
- **test/README.md** — テストの実行方法

## ディレクトリ構造
- `src/questions/*.js` — 13分野の問題テンプレート（編集はここ。**questions.js を直接編集しない**）
  - 番号と分野: 01推論 / 02場合の数・確率 / 03集合 / 04損益算 / 05速度算 / 06仕事算 / 07濃度算 / 08割合・比 / 09図表 / 10順列・組合せ / 11四則逆算 / 12語句の関係 / 13規則性・方角
- `tools/build-questions.js` — src/questions/ を結合して questions.js を生成
- `test/` — Node製の自前spec群（変異テスト含む）

## 開発の鉄則（絶対に守る）
1. **questions.js を直接編集しない**。`src/questions/*.js` を編集し、`node tools/build-questions.js` で再生成する。生成後に `git diff questions.js` で差分を確認し、ソースと一致していることを保証する
2. **検証を必ずCIと同じ手順で実行する**。変更後は以下を実行して壊れていないことを確認する（必要に応じてITERATIONS=1000に増やす）:
   - `node tools/build-questions.js`
   - `ITERATIONS=1000 node test/generator.spec.js`
   - `node test/html.spec.js`
   - `node test/affiliate.spec.js`
   - `node test/wiring.spec.js`
   - `node test/pwa.spec.js`
   - `node test/deeplink.spec.js`
   - `node test/mutation-runner.js`
   - `node test/app.spec.js`
3. **検査を足したら変異も足す**。「書いただけの検査」は信用しない。新しい検査や失敗経路を足したら、必ず対応する変異（壊し方）を `test/mutations.json` に登録し、`test/mutation-runner.js` で実効性を確認する
4. **問題の数値を「答えが丸暗記できる形」にしない**。ランダム生成による無限出題が最大の差別化。固定の数値問題を量産してはならない
5. **コミットメッセージは何をなぜ変えたかを簡潔に**（日本語が主体）。一つの意味のある単位でコミットする
6. **法規・商標に配慮**。「SPI」「SPI3」はリクルートマネジメントソリューションズの登録商標。無許諾の公式性を匂わせる表現をしない。ステマ規制（PR表記）・広告の透明性はCIで自動検査される

## 自律運用手順（夜間・常駐時）
矢野さんがいない夜間に自律開発するためのルール。ClaudeCode（またはOpenCode）が従う。

### 承認不要でやってよいこと
- `src/questions/*.js` の既存パターンに沿った問題テンプレの追加・修正（非言語系の13分野）
- 既存specに見合う変異の追加・`mutations.json` のメンテナンス（台帳は縮める方向にのみ動かす）
- テスト対象のバグ修正、問題文の誤り訂正
- 記事ページ（`articles/`・`categories/`）の事実誤認修正、SEO微修正
- 上記の検証実行と合格後のコミット（`git commit`）

### やらないこと（判断を要する/リスクが高い）※必ず矢野さんの承認待ち
- **新規の大規模機能追加**（新しい出題形式・新モード・収益導線の大改修）
- **ブランチのマージ・delete・リモートのgit push**（ローカルのコミットまで。pushは矢野さんの承認を待つ。※`main`へのpushはCIが自動走るため慎重に）
- **収益化・グロース施策の決定**（アフィリエイト枠の増減・広告設定）
- **稼働データ（GSC/GA4）の解釈と、それに基づく方向転換**
- `--dangerously-skip-permissions` の使用
- プロジェクトを跨ぐ操作・機密情報を含むファイルの扱い

### 夜間セッションの締め
- 作業が一段落したら、**変更内容・検証結果・次の一手**を「夜間作業レポート」として `docs/nightly/YYYY-MM-DD.md` に書き出す（git管理される。`reports/`は戦略分析置き場なので混ぜない）
- 完了した作業と未完の作業を分けて記載し、途中の作業があれば次のセッションで再開できるように `PROJECT_STATE.md` の「次にやること」を更新する
- 検証に失敗したまま放置しない。失敗した場合は原因を調べ、直せなければ既存の状態に戻して報告する

## ClaudeCode トークン復活時の段取り
週次上限（約23時リセット）で自律開発が止まった場合、復活を確認して再開する手順。

### 復活確認（矢野さんの手動ステップ）
1. `cd ~/Documents/spi-practice && ./tools/nightly.sh --check`
   - 出力 `AVAILABLE` → 復活済み
   - 出力 `WEEKLY_LIMIT_HIT` → まだ復活していない（リセット日時を待つ）
2. 復活を確認したら、**一度手動で初回自律セッションをテスト**する: `./tools/nightly.sh run`
   - いきなりlaunchdの自動起動に任せず、手動で正常動作を確認してから常駐に戻す

### 初回セッションの確認項目
- `docs/nightly/YYYY-MM-DD.log` にセッションログが書かれたか
- `docs/nightly/YYYY-MM-DD.md` に夜間レポートが生成されたか
- コミットが成立しているか（`git log --oneline -1`）
- 検証手順（`build-questions.js` → `generator.spec.js` など）が実行され、失敗が無いか

### 問題が出たら
- `docs/nightly/YYYY-MM-DD.log` と `launchd.err.log`・`launchd.out.log` を確認する
- エラーを解決して再テストする。直せなければ一時的に `launchctl disable user/$(id -u)/com.demae.spi.nightly` で自動実行を止め、修正後に `launchctl enable ...` で戻す

### 常駐に戻す
- 手動テストで問題が無ければ、launchdの自動実行（毎晩0時）をそのまま継続させる。設定は既に有効化済み（`LaunchAgents/com.demae.spi.nightly.plist`）

## ブランチ運用
- 矢野さんが明示的に指示するまで、`main` への直接コミットは避け、作業ブランチで進める
- merge / push / PR 作成は矢野さんが判断する

## エージェントへの指示の出し方

指示は「**性質の一文＋今回だけの条件**」に絞る。制約は毎回書かない。

- 共通の作業ルール・報告の形・測り方は `.claude/agents/WORKING_RULES.md` にある
- エージェントは作業前にそれを読む。指示側は再送しない
- ⚠️ 同じ制約を毎回書き直すと、指示1通あたり1,000〜2,000トークンを再送することになる

**性質の一文の例**（これが成果を決める）:
- 「連打・二度押しできる操作のうち、冪等でないものは何件か」→ 14件中6件
- 「正解どうしの最小間隔は、判定の許容幅より広いか」→ 57件中6件
- 「利用者が不利益を被る経路のうち、検査が無いものは何件か」→ 14件中6件
