#!/bin/bash
# GSC データを取得して分析レポートを出す。定期実行用。
set -euo pipefail
cd "$(dirname "$0")/../.."
export GSC_CREDENTIALS="${GSC_CREDENTIALS:-$HOME/.config/gsc/service-account.json}"

DATE=$(date +%F)
SITE="${1:-sc-domain:tekisei-drill.com}"
DAYS="${2:-28}"

python3 tools/gsc/fetch.py --site "$SITE" --days "$DAYS" -o "data/gsc/${DATE}.json"
python3 tools/gsc/analyze.py "data/gsc/${DATE}.json" -o "reports/${DATE}.md"
echo "レポート: $(pwd)/reports/${DATE}.md"
