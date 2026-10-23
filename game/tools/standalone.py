"""打一个能离线直接打开的单文件包：ashen-crypt.html + 内嵌 Phaser + 打开就载入示范存档（saves/<名字>.json）。
用法：python3 tools/build.py && python3 tools/standalone.py spark ../../ashen-crypt-spark-endgame.html
第一次打开时载入存档（原来同一来源下的进度先备份，手册“存档”页可以恢复）；之后再打开就是接着玩。网址加 ?fresh 可以重新载入。"""
import os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name, out = sys.argv[1], sys.argv[2]
if not os.path.exists(os.path.join(root, 'saves', name + '.json')): sys.exit(f'没有 saves/{name}.json')
html = open(os.path.join(root, 'ashen-crypt.html'), encoding='utf8').read()
phaser = open(os.path.join(root, 'tools', 'vendor', 'phaser.min.js'), encoding='utf8').read().replace('</script', '<\\/script')
tag = '<script src="https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js"></script>'
if tag not in html: sys.exit('ashen-crypt.html 里没找到 Phaser 的 script 标签')
html = html.replace(tag, f'<script>window.ASH_BOOT_DEMO = {name!r};</script>\n<script>{phaser}</script>', 1)
open(out, 'w', encoding='utf8').write(f'<!doctype html><html><head><meta charset="utf-8"><title>灰烬地窖 · {name} 毕业存档</title></head><body>{html}</body></html>')
print(f'{out}  {os.path.getsize(out) // 1024} KB')
