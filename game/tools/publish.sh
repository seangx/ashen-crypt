#!/bin/bash
# 发布到自己的服务器（tools/pages，https://176.122.144.145:8443）：游戏 → /，图鉴 → /p/codex/
# 用法：tools/publish.sh            两个都发
#       tools/publish.sh game       只发游戏
#       tools/publish.sh doc <页面名> <md>  发一份设计文档（逐节批注页，tools/docs/index.html）
#       tools/publish.sh codex      只发图鉴（先重新导出数据；技能石的基准数字读 tools/codex/bench.json，用 bench.js --json 更新）
set -e
cd "$(dirname "$0")/.."
HOST=root@176.122.144.145; URL=https://176.122.144.145:8443
WHAT="${*:-game codex}"
if [ "$1" = doc ]; then DOC_NAME=$2; DOC_MD=$(cd .. && realpath "$3" 2>/dev/null || realpath "$3"); WHAT=doc; fi
python3 tools/build.py >/dev/null
for w in $WHAT; do
  case $w in
    game) ssh -q $HOST 'mkdir -p /opt/pages/sites/game/vendor'; scp -q vendor/phaser.min.js vendor/rexuiplugin.min.js $HOST:/opt/pages/sites/game/vendor/; scp -q ashen-crypt-mobile.html $HOST:/opt/pages/sites/game/index.html; L=ashen-crypt-mobile.html; R=/; SHOW=/ ;;
    codex) T=$(mktemp -d); nice -n 15 node tools/codex/extract.js "$PWD" "$T/data.json" >/dev/null; scp -q tools/codex/index.html "$T/data.json" $HOST:/opt/pages/sites/codex/; L="$T/data.json"; R=/p/codex/data.json; SHOW=/p/codex/ ;;
    doc) N=$DOC_NAME; ssh -q $HOST "mkdir -p /opt/pages/sites/$N"; scp -q tools/docs/index.html $HOST:/opt/pages/sites/$N/index.html; scp -q "$DOC_MD" $HOST:/opt/pages/sites/$N/doc.md; L="$DOC_MD"; R=/p/$N/doc.md; SHOW=/p/$N/ ;;
    *) echo "不认识：${w}（game / codex / doc）"; exit 2 ;;
  esac
  [ "$(curl -s $URL$R | shasum | cut -c1-40)" = "$(shasum "$L" | cut -c1-40)" ] && echo "已发布 ${w}：$URL$SHOW" || { echo "${w} 线上内容和本地不一致"; exit 1; }
done
