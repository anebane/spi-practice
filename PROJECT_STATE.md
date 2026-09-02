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

## 自律環境の状況（2026-09-01 構築・push済み）
夜間自律開発の環境一式を **main にコミットし、`origin/main` へpush済み**（`anebane/spi-practice`）。

- `CLAUDE.md` — 開発文化・検証手順・自律ルール・**ClaudeCodeトークン復活時の段取り**
- `PROJECT_STATE.md` — このファイル（状態の正本）
- `DIVISION_OF_LABOR.md` — ClaudeCode / OpenCode / LMStudio の役割分担
- `.claude/settings.json` — 安全コマンドの許可/確認/拒否
- `.claude/agents/devel-secure.md` — 夜間自律用の安全エージェント
- `tools/nightly.sh` — 起動ランチャー（`run` / `--check`）。`--check`が `AVAILABLE` を返せばClaudeCode復活済み
- `docs/nightly/` — 夜間作業レポート格納先（git管理）
- launchd `com.demae.spi.nightly` — 毎晩0時に自動実行（有効化済み `enabled`）。ClaudeCode上限中はスキップしてログに残す

## 現在のブランチ状態

⚠️ **ここに一覧を手で書かない。**2026-09-02に「未マージ5ブランチ・28コミット」と書かれていたが、
実測すると**5本とも `origin/main` の祖先**で、未マージは0本だった。
書いた瞬間から古くなる情報を正本に置くと、読んだ全員が同じ誤りから始める。

**測り方**（これを実行して判断する）:

```sh
git fetch origin
for b in $(git branch --format='%(refname:short)' | grep -v '^main$'); do
  if git merge-base --is-ancestor "$b" origin/main; then
    echo "$b  ✅ main に取り込み済み（削除してよい）"
  else
    echo "$b  ⚠️ main に無いコミットが $(git log --oneline origin/main..$b | wc -l) 本"
  fi
done
```

**2026-09-02 の実測**: `independent-recalc` / `merge-recalc` / `sweep-props` / `weak-probe` /
`ledger-triage` の5本とも main の祖先。中身は全部 main に入って本番に出ている。
ブランチ名だけが古い位置に残っている状態。**削除しても情報は失われない**（判断は矢野さん）。

## 直近の評価（2026-09-01 時点）
- 強み: 品質文化（変異テスト）は個人開発として突出。ドメイン設計（ランダム生成・分割管理）は優れている。収益化・SEO考慮も入っている
- 懸念: 開発重心が「機能・稼働」より「テストのテスト」に偏り気味。稼働実績・指標の確認が不明
- ⚠️ **「5ブランチ放置」は事実誤認**（2026-09-02に実測・上記参照）。放置は0本で、作業は全部 main に入り本番に出ている。
  実際に出たもの: 間違えた入力への「正解」表示の修正（濃度算6件・6ヶ月間生存）／分野数の嘘17件／
  存在しない解き方の宣伝5件／広告枠 1面→13面／案件 3件→4件（¥22,500追加）

## 今夜のタスク（夜間セッションはこれ「だけ」を実行する）

> ⚠️ 夜間セッションは**1件だけ**実行して止まる。終わって時間が余っても次を探さない。
> 2026-08-29〜30に2日で週次上限へ到達し、その後3日間ほぼ何もできなかった。
> 次のタスクは朝に指定する。**夜間セッションはこの欄を書き換えない。**

### 損益算7テンプレに「問題文から独立に解き直す検査」を書く

**背景**: `generator.spec.js` の検算は「解説の式どうしが整合しているか」しか見ておらず、
**答えが問題文の題意と合っているかは誰も見ていなかった**（2026-08-30に実測）。
`answerFormula` に `+1` を入れても全specが緑のままだった。

**済んでいる家族**（同じやり方を踏襲する）: 濃度算7 / 四則逆算7 / 表5 / 仕事算6 / 集合6 = 31件
**今回の対象**: 損益算7件（`src/questions/04-soneki.js`）

**絶対条件**:
- ⚠️ **`answerFormula` を読んでから検査を書かない。**同じ式が2箇所になるだけで、
  式が間違っていたら両方とも同じように間違う。**検査は「利用者が読む問題文」から答えを導く**
- 作業順序で担保する: 検査を書く → 素の緑を確認 → **その後に初めて** `answerFormula` を
  プローブの照準としてだけ見る

**受け入れ条件（これが合格の全て）**:
```
7テンプレそれぞれの answerFormula に +1 を入れると、
「独立再計算と答えが不一致」のメッセージが出て EXIT=1 になること
```
⚠️ `EXIT=1` だけでは不足。**狙ったメッセージが出るところまで**確認する。

**書けない形が出たら**: 無理に通さず「この形は問題文から解き直せない」と
レポートに個別の理由を書く。推論系と同じ手が使えない領域があるはず。

**触ってよいファイル**: `src/questions/04-soneki.js` / `test/generator.spec.js` /
`test/mutations.json`（検査を足したら変異も足す）
**触らないファイル**: `test.yml` / `test/mutation-runner.js` / `affiliate.js` / HTML

## 次にやること（未決定・ClaudeCodeの意見を聞きたい）
- [ ] **ClaudeCode復活時: `CLAUDE.md` の「ClaudeCode トークン復活時の段取り」に意見・修正を加える**（矢野さんが確認待ち。CLAUDE.mdに追記済みだが未コミット・判断保留中）
- [ ] **自律環境の初回実走査**（復活後、`./tools/nightly.sh run` で手動テスト→正常確認後にlaunchd常駐に任せる）
- [ ] 未マージ5ブランチの扱い（精算・マージ・捨てる）を判断
- [ ] 稼働データの確認（GSC/GA4、どの記事が流入・送客しているか）
- [ ] 機能・問題数の拡充（品質道具偏重からの回帰）

> ⚠️ 現在の `main` には、自律環境push時に解決していない未コミット変更がある可能性がある。作業前に `git status` を確認すること。

## 設計意図（変更容易な本質）
- 「同じ問題が再び出ない」= パラメータランダム生成が最大の差別化。必ず守る
- 非エンジニア単独開発を前提に、壊れにくさ・巻き戻しやすさを最優先
- 検査は「書いただけ」では信用しない。必ず破壊テスト（変異）で実効性を保証する
