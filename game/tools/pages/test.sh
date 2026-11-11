#!/bin/bash
P=$1; T=$(mktemp -d); mkdir -p $T/sites/game $T/sites/codex $T/acme/.well-known/acme-challenge $T/letsencrypt/live/127.0.0.1
echo '<h1>game</h1>' > $T/sites/game/index.html; echo '<h1>codex</h1>' > $T/sites/codex/index.html; echo tok123 > $T/token; echo chal > $T/acme/.well-known/acme-challenge/abc
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -keyout $T/letsencrypt/live/127.0.0.1/privkey.pem -out $T/letsencrypt/live/127.0.0.1/fullchain.pem -days 1 -subj /CN=127.0.0.1 2>/dev/null
PAGES_ROOT=$T PAGES_HOST=127.0.0.1 PAGES_HTTPS_PORT=18443 PAGES_HTTP_PORT=18080 python3 $P/server.py > $T/log 2>&1 & SP=$!; sleep 1
U=https://127.0.0.1:18443; A='Authorization: Bearer tok123'; c() { curl -sk "$@"; }
echo "root: $(c $U/)"; echo "codex: $(c $U/p/codex/)"; echo "redir: $(c -o /dev/null -w '%{http_code} %{redirect_url}' $U/p/codex)"
echo "traversal: $(c -o /dev/null -w '%{http_code}' --path-as-is "$U/p/codex/../../token")"
echo "noauth: $(c -w ' %{http_code}' $U/api/codex/notes)"; echo "badtoken: $(c -w ' %{http_code}' -H 'Authorization: Bearer x' $U/api/codex/notes)"
echo "post: $(c -H "$A" -d '{"k":"weapons:Cannon","t":"太快"}' $U/api/codex/notes)"
ID=$(c -H "$A" $U/api/codex/notes | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")
echo "put: $(c -X PUT -H "$A" -d '{"t":"改"}' $U/api/codex/notes/$ID)"; echo "list: $(c -H "$A" $U/api/codex/notes)"
echo "del: $(c -X DELETE -H "$A" $U/api/codex/notes/$ID) -> $(c -H "$A" $U/api/codex/notes)"
echo "acme: $(curl -s http://127.0.0.1:18080/.well-known/acme-challenge/abc) http-redir: $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' http://127.0.0.1:18080/p/codex/)"
(exec 3<>/dev/tcp/127.0.0.1/18443; sleep 3) & echo "slow-client-test: $(c -m 2 $U/)"
kill $SP; grep -v "HTTP/1" $T/log | head -5
