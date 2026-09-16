#!/bin/bash
# 広告ネットワークの審査・配信状況を、管理画面にログインせずに確認する。
#
# 【なぜ必要か】
# 管理画面はログインセッションが切れると読めなくなる。「審査が通ったか」を
# 人に聞かないと分からない状態だと、通った日から実際に気づく日までの間、
# 収益がゼロのまま放置される。
#
# ⚠️ 見ているのは**管理画面の「審査中」という文字ではなく、配信側が枠を
#    認識しているか**。管理画面の表示と実際の配信は別物で、後者が本番の挙動。
#    2026-09-15、忍者の管理画面は「審査中」なのに配信側は枠定義を返していた。
#    **管理画面の表示を正とすること。**このスクリプトは補助。
#
# ⚠️ このスクリプトは広告のリクエストを1枠につき1回だけ送る。
#    規約（i-mobile 第14条1項15号ほか）は「作為的にインプレッションを
#    増加させる行為」を禁じている。**1日1回程度の確認を超えて回さないこと。**
#    cron などで高頻度に回すのは規約違反になりうる。
#
# 使い方:  bash tools/ads/check-status.sh

set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
REF="https://tekisei-drill.com/articles/spi3-toha.html"
PID=85441

echo "広告ネットワークの状況  $(date '+%Y-%m-%d %H:%M')"
echo

# --- 忍者AdMax ---
# 枠が有効なら枠定義の配列が返る。審査中・無効なら空配列 [] が返る。
echo "=== 忍者AdMax ==="
for pair in "記事下PC:701e1f0351b6f71b0986f62aae5e1949" "記事下SP:3699c5a4a3decd176accb15405a99283"; do
  name="${pair%%:*}"; tid="${pair##*:}"
  body=$(curl -s --max-time 15 -A "$UA" -e "$REF" \
    "https://adm.shinobi.jp/t?tid=${tid}&t=b&callback=cb&sc=1&rand=$RANDOM")
  if echo "$body" | grep -q '"tag_id"'; then
    printf '  %-10s ✅ 枠が有効（配信側が認識している）\n' "$name"
  elif echo "$body" | grep -q 'cb(\[\])'; then
    printf '  %-10s ⏳ 審査中か無効（空の応答）\n' "$name"
  else
    printf '  %-10s ⚠️ 判定できない応答: %.60s\n' "$name" "$body"
  fi
done

# --- i-mobile ---
# 枠が有効なら status:200 かつ demander が返る。無効なら error になる。
echo
echo "=== i-mobile ==="
# ⚠️ サイドは 300x250。160x600 の枠（1944921 / 1944924）は**在庫が来ない**ことを
#    2026-09-16に実測したので使っていない。ここに戻すときは、まず在庫が来るか試す。
for pair in "記事下PC:596360:1944918" "記事下SP:596361:1944919" \
            "結果画面PC:596360:1944920" "結果画面SP:596361:1944922" \
            "試験サイドPC:596360:1944926" "記事サイドPC:596360:1944925"; do
  name="${pair%%:*}"; rest="${pair#*:}"; mid="${rest%%:*}"; asid="${rest##*:}"
  url="https://imp-bidapi.i-mobile.co.jp/api/v1/spot.ashx?ver=1.2.52&type=banner&url=${REF}&direct=1&fif=0&sf=0&cof=0&dfp=0&amp=0&sp=0&ios=0&pid=${PID}&mid=${mid}&asid=${asid}&spec=0&nemu=0"
  body=$(curl -s --max-time 15 -A "$UA" -e "$REF" "$url")
  if echo "$body" | grep -q '"status":200'; then
    if echo "$body" | grep -q '"demander":\[\]'; then
      printf '  %-12s ⏳ 枠は有効だが配信なし（在庫切れか準備中）\n' "$name"
    else
      printf '  %-12s ✅ 枠が有効で配信もある\n' "$name"
    fi
  elif echo "$body" | grep -q '"code":400'; then
    printf '  %-12s ❌ 枠が認識されない（IDの誤りか未承認）\n' "$name"
  else
    printf '  %-12s ⚠️ 判定できない応答: %.60s\n' "$name" "$body"
  fi
done

# --- AdSense ---
# ⚠️ AdSense は配信側の判定をログインなしで引く手段が無い。
#    2026-09-15に「有用性の低いコンテンツ」で不合格。再審査は管理画面から。
echo
echo "=== AdSense ==="
echo "  ⚠️ ログインなしでは確認できない。2026-09-15時点で不合格（有用性の低いコンテンツ）"
echo "     管理画面: https://adsense.google.com/adsense/u/0/pub-5409685648363967/sites/list"
echo
echo "⚠️ 管理画面の表示と配信側の応答は食い違うことがある。最終的な正は管理画面。"
