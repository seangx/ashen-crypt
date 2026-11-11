#!/bin/bash
# 读服务器上某个页面的批注（默认 codex）。口令在本机钥匙串 claude-secrets / pages-bandwagon-token（服务器上是 /opt/pages/token）
PAGE=${1:-codex}
TOK=$(~/.claude/venv/bin/python3 -c "import keyring;print(keyring.get_password('claude-secrets','pages-bandwagon-token') or '',end='')")
curl -s -H "Authorization: Bearer $TOK" "https://176.122.144.145:8443/api/$PAGE/notes" | python3 -c '
import json, sys, time
rows = json.load(sys.stdin)
N = {"strong": "偏强", "weak": "偏弱", "change": "要改", "del": "删掉", "ask": "有疑问", "good": "很好"}
print(len(rows), "条批注")
for r in rows:
    d = r["data"]
    when = time.strftime("%m-%d %H:%M", time.localtime(d.get("ts", 0) / 1000))
    tag = N.get(d.get("tag"), d.get("tag"))
    print(when, "[" + str(tag) + "]", d.get("label", ""), "(" + d.get("k", "") + ")", d.get("text", ""))
'
