#!/usr/bin/env python3
"""明亮改版像素美术打包：按 data/artpack.json 把 art-src/ 的绿底源图切开、缩小、限色，打成 vendor/artpack.js
（window.ART_PACK = {名字: {img: dataURI, w, h, anchor}}），并输出 build/art_preview.png（放大 4 倍的全部切图，方便检查）。
用法：python3 tools/art/pack.py [--only 表名]"""
import base64, io, json, os, sys
from PIL import Image, ImageDraw

GAME = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
cfg = json.load(open(os.path.join(GAME, 'data', 'artpack.json'), encoding='utf8'))
only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None

def key_green(im):
    """抠绿：绿色明显压过红蓝的像素算背景；边上发绿的半透明像素也去掉绿色溢色"""
    im = im.convert('RGBA'); px = im.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if g > 100 and g > r * 1.3 and g > b * 1.3: px[x, y] = (0, 0, 0, 0)
            elif g > max(r, b): px[x, y] = (r, max(r, b), b, a)  # 去绿边
    return im

def components(mask, w, h, step=4, join=3):
    """在缩小 step 倍的网格上找连通块（膨胀 join 格，把同一个物体分开的小块连起来）。返回原图坐标的包围盒"""
    gw, gh = (w + step - 1) // step, (h + step - 1) // step
    occ = [[False] * gw for _ in range(gh)]
    for y in range(0, h, step):
        for x in range(0, w, step):
            if mask[x, y]: occ[y // step][x // step] = True
    dil = [[False] * gw for _ in range(gh)]
    for y in range(gh):
        for x in range(gw):
            if occ[y][x]:
                for yy in range(max(0, y - join), min(gh, y + join + 1)):
                    for xx in range(max(0, x - join), min(gw, x + join + 1)): dil[yy][xx] = True
    seen = [[False] * gw for _ in range(gh)]; out = []
    for y in range(gh):
        for x in range(gw):
            if dil[y][x] and not seen[y][x]:
                st = [(x, y)]; seen[y][x] = True; x0 = x1 = x; y0 = y1 = y; n = 0
                while st:
                    cx, cy = st.pop(); n += occ[cy][cx]
                    x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < gw and 0 <= ny < gh and dil[ny][nx] and not seen[ny][nx]: seen[ny][nx] = True; st.append((nx, ny))
                if n >= 6: out.append((x0 * step, y0 * step, min(w, (x1 + 1) * step), min(h, (y1 + 1) * step)))
    return out

def pixelize(fig, tw, th, colors=24):
    small = fig.resize((tw, th), Image.BOX)
    al = small.getchannel('A').point(lambda v: 255 if v > 115 else 0)
    rgb = Image.new('RGB', small.size, (0, 0, 0)); rgb.paste(small.convert('RGB'), mask=al)
    q = rgb.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    o = Image.new('RGBA', small.size, (0, 0, 0, 0)); o.paste(q, (0, 0), al)
    return o

pack_path = os.path.join(GAME, 'vendor', 'artpack.js')
res = {}
if only and os.path.exists(pack_path):  # 只重做一张表时保留其它表
    s = open(pack_path).read(); res = json.loads(s[s.index('{'):s.rindex('}') + 1])
prev = []
for sname, S in cfg['sheets'].items():
    if only and sname != only: continue
    im = key_green(Image.open(os.path.join(GAME, S['src']))); w, h = im.size
    comps = components(im.getchannel('A').load(), w, h)
    need = sum(S['rows'])
    if len(comps) != need: print(f'{sname}: 找到 {len(comps)} 块，应为 {need}'); comps = sorted(comps, key=lambda b: -(b[2] - b[0]) * (b[3] - b[1]))[:need]
    comps.sort(key=lambda b: (b[1] + b[3]) / 2); ordered = []; i = 0
    for n in S['rows']: ordered += sorted(comps[i:i + n], key=lambda b: b[0]); i += n
    for name, box in zip(S['names'], ordered):
        fig = im.crop(box); bb = fig.getchannel('A').getbbox(); fig = fig.crop(bb)
        sz = {**{k: S[k] for k in ('h', 'w') if k in S}, **S.get('size', {}).get(name, {})}
        if 'h' in sz and ('w' not in sz or 'h' in S.get('size', {}).get(name, {})): th = sz['h']; tw = max(1, round(fig.width * th / fig.height))
        else: tw = sz['w']; th = max(1, round(fig.height * tw / fig.width))
        spr = pixelize(fig, tw, th)
        buf = io.BytesIO(); spr.save(buf, 'PNG', optimize=True)
        res[name] = {'img': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode(), 'w': tw, 'h': th, 'anchor': cfg.get('anchor', {}).get(name)}
        prev.append((name, spr))
js = '/* 明亮改版像素美术：由 tools/art/pack.py 从 data/artpack.json + art-src/ 生成（源图用 Codex 生成后像素化） */\nwindow.ART_PACK = ' + json.dumps(res, separators=(',', ':')) + ';\n'
open(pack_path, 'w').write(js)
# 预览：每张 ×4，带名字和像素网格坐标
K = 4; cols = 10; cw = max(s.width for _, s in prev) * K + 12; ch = max(s.height for _, s in prev) * K + 22
pv = Image.new('RGB', (cw * cols, ch * ((len(prev) + cols - 1) // cols)), (60, 58, 70)); d = ImageDraw.Draw(pv)
for i, (n, s) in enumerate(prev):
    x, y = (i % cols) * cw, (i // cols) * ch; d.text((x + 2, y + 2), f'{n} {s.width}x{s.height}', fill=(255, 220, 120))
    big = s.resize((s.width * K, s.height * K), Image.NEAREST); pv.paste(big, (x + 6, y + 16), big)
os.makedirs(os.path.join(GAME, 'build'), exist_ok=True); pv.save(os.path.join(GAME, 'build', 'art_preview.png'))
print(f'vendor/artpack.js {len(js) // 1024} KB，{len(res)} 张')
