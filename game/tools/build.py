"""Concatenate src/*.js into the HTML shell with the data tables from data/*.json, then embed the glyph list.
Usage: python3 tools/build.py  ->  ashen-crypt.html（桌面）+ ashen-crypt-mobile.html（手机竖屏）
两个包共用全部核心代码（src/*.js），只有界面层不同：文件名里带 _mobile 的只进手机包（手机界面继承桌面界面类，只改布局和操作）。
Every data/<name>.json becomes DATA.<name>; keys starting with "_" are comments and are dropped."""
import glob, hashlib, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from build_font import build
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def strip(o):
    if isinstance(o, dict): return {k: strip(v) for k, v in o.items() if not k.startswith('_')}
    if isinstance(o, list): return [strip(v) for v in o]
    return o

data = {}
for f in sorted(glob.glob(os.path.join(root, 'data', '*.json'))):
    name = os.path.splitext(os.path.basename(f))[0]
    try: data[name] = strip(json.load(open(f, encoding='utf8')))
    except json.JSONDecodeError as e: sys.exit(f'data/{name}.json: {e}')
head = open(os.path.join(root, 'shell_head.html'), encoding='utf8').read()
srcs = sorted(glob.glob(os.path.join(root, 'src', '*.js')))
blob = json.dumps(data, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
dhash = hashlib.sha1(blob.encode('utf8')).hexdigest()[:10]  # 天梯记录里记下数值版本
# saves/*.json：可以一键载入的示范存档（不算进数值版本）
saves = {os.path.splitext(os.path.basename(f))[0]: open(f, encoding='utf8').read() for f in sorted(glob.glob(os.path.join(root, 'saves', '*.json')))}
datajs = '/* 数据表：由 tools/build.py 从 data/*.json 生成 */\nconst DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\nconst DATA_HASH = ' + json.dumps(dhash) + ';\nconst DEMO_SAVES = ' + json.dumps(saves, ensure_ascii=False) + ';\n'
MOBILE_HEAD = '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
for plat, out in (('desktop', 'ashen-crypt.html'), ('mobile', 'ashen-crypt-mobile.html')):
    files = [f for f in srcs if plat == 'mobile' or '_mobile' not in os.path.basename(f)]
    js = '\n'.join(open(f, encoding='utf8').read() for f in files)
    h = head if plat == 'desktop' else head.replace('<title>', MOBILE_HEAD + '<title>', 1)
    pre = '' if plat == 'desktop' else "const ASH_PLATFORM = 'mobile';\n"
    tmp = os.path.join(root, 'build', f'concat-{plat}.html'); os.makedirs(os.path.dirname(tmp), exist_ok=True)
    open(tmp, 'w', encoding='utf8').write(h + "'use strict';\n" + pre + datajs + js + '\n</script>\n')
    build(tmp, os.path.join(root, out))
