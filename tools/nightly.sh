#!/usr/bin/env bash
# ============================================================
# 夜間自律開発ランチャー（spi-practice）
# 自動（launchd）+ 手動 の両対応。
# 使い方:
#   ./tools/nightly.sh            # 即座に夜間セッション開始（手動）
#   ./tools/nightly.sh --check    # 週次上限を確認して動けるかのみ判定
# ============================================================
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

ACTION="${1:-run}"
DATE="$(date +%Y-%m-%d)"
LOG_DIR="$ROOT/docs/nightly"
LOG_FILE="$LOG_DIR/$DATE.log"

mkdir -p "$LOG_DIR"

# ClaudeCode が週次上限中でないか確認（非対話で軽い問いを投げる）
is_limit_hit() {
  local out
  out="$(claude -p "only respond OK" --output-format json 2>&1)"
  echo "$out" | grep -qi "weekly limit\|rate limit\|429\|You've hit" && return 0 || return 1
}

# デバッグ用: 現在のステータスを表示
debug_status() {
  if is_limit_hit; then
    echo "WEEKLY_LIMIT_HIT"
  else
    echo "AVAILABLE"
  fi
}

# 手動 run の場合
if [ "$ACTION" = run ]; then
  if is_limit_hit; then
    echo "[nightly] ClaudeCode は週次上限中です。リセットを待ってから実行してください。" | tee -a "$LOG_FILE"
    exit 1
  fi

  echo "[nightly] 夜間自律セッションを開始: $DATE ($(date '+%H:%M %Z'))" | tee -a "$LOG_FILE"
  echo "[nightly] 対象ブランチ: $(git branch --show-current 2>/dev/null || echo '?')" >> "$LOG_FILE"

  # claude を非対話で実行する。権限は CLAUDE.md / .claude/settings.json の安全設定に従う。
  # 専用エージェント devel-secure を指定し、破壊的許可（--dangerously-skip-permissions）は使わない。
  # 出力は表示しつつログにも残す。
  claude -p \
    "$(cat "$ROOT/.opencode/commands/nightly-session.md" 2>/dev/null || echo "夜間自律セッションを開始して。PROJECT_STATE.mdとCLAUDE.mdを読んで、承認不要の作業を進めて。完了したらdocs/nightly/$(date +%Y-%m-%d).mdに夜間レポートを書いて。")" \
    --agent devel-secure \
    --output-format text \
    2>&1 | tee -a "$LOG_FILE"

  echo "[nightly] セッション終了: $DATE ($(date '+%H:%M %Z'))" | tee -a "$LOG_FILE"
  exit 0
fi

# --check の場合
if [ "$ACTION" = --check ]; then
  if is_limit_hit; then
    echo "WEEKLY_LIMIT_HIT"
  else
    echo "AVAILABLE"
  fi
  exit 0
fi

echo "usage: $0 [run|--check]"
exit 1