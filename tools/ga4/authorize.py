#!/usr/bin/env python3
"""GA4用のリフレッシュトークンを1回だけ取得する。

サービスアカウントを使わない理由:
  GA4のユーザー追加UIがサービスアカウントのメールを
  「Google アカウントと一致しません」で弾いた（2026-08-27・4通り試行）。
  一方 cesuac.acjl201@gmail.com は既にGA4の管理者なので、
  この人としてOAuthすれば権限付与の手順そのものが要らない。

⚠️ 同意画面は「本番環境」にしてある。テスト状態のままだと
   リフレッシュトークンが7日で失効し、週次の自動実行が突然止まる。
"""
import json, os, sys
from google_auth_oauthlib.flow import InstalledAppFlow

CLIENT = os.path.expanduser("~/.config/ga4/oauth-client.json")
TOKEN  = os.path.expanduser("~/.config/ga4/token.json")
SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]

flow = InstalledAppFlow.from_client_secrets_file(CLIENT, SCOPES)
creds = flow.run_local_server(port=8765, prompt="consent",
                              authorization_prompt_message="ブラウザで許可してください:\n{url}",
                              success_message="完了しました。このタブは閉じて構いません。",
                              open_browser=False)
with open(TOKEN, "w") as f:
    f.write(creds.to_json())
os.chmod(TOKEN, 0o600)
print("保存しました:", TOKEN)
print("refresh_token:", "あり" if creds.refresh_token else "⚠️ 無し（prompt=consent を確認）")
