#!/usr/bin/env python3
"""技能专属特效打包：读 build/fxraw/ 里 bake.mjs 渲染的原始图集，按 data/skillfx.json 截取时间段、隔帧（加速）、
缩小、裁掉四周透明边，打成一个 vendor/fxsheets.js（window.FX_SHEETS = {名字: {img: dataURI, fw, fh, n, cols, fps, ox, oy, fit, loop}}）。
特效来自 pixelfx（MIT，Copyright (c) 2026 Patch、Hugo Duprez）。"""
import base64, io, json, os, sys
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
cfg = json.load(open(os.path.join(GAME, 'data', 'skillfx.json'), encoding='utf8'))
raw = os.path.join(GAME, 'build', 'fxraw')
OUT_FPS = 15  # 游戏里按 15 帧 / 秒播放（再乘 speed），文件小一半
res, total = {}, 0
for key, s in cfg['sheets'].items():
    for el in [s['el'], *s.get('els', [])]:
        name = f'{key}_{el}'; jp = os.path.join(raw, name + '.json')
        if not os.path.exists(jp): print('缺少', name, '（先跑 node tools/fx/bake.mjs）'); sys.exit(1)
        j = json.load(open(jp)); px = j['meta']['pixelfx']; fps = px['fps']; fw, fh = px['frameSize']; pvx, pvy = px['pivot']
        sheet = Image.open(os.path.join(raw, name + '.png')).convert('RGBA')
        t0, t1 = s.get('t', [0, px['frames'] / fps]); sp = s.get('speed', 1)
        step = fps * sp / OUT_FPS  # 原始帧里每隔多少帧取一帧
        idx, f = [], t0 * fps
        while f <= min(t1 * fps, px['frames'] - 1): idx.append(int(round(f))); f += step
        frames = [sheet.crop((fr['frame']['x'], fr['frame']['y'], fr['frame']['x'] + fw, fr['frame']['y'] + fh)) for fr in (j['frames'][i] for i in idx)]
        # 所有帧共用一个包围盒，裁掉四周透明边
        box = None
        for im in frames:
            b = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
            if b: box = b if not box else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
        if not box: print('全透明', name); continue
        k = s.get('scale', 0.5)
        cw, ch = box[2] - box[0], box[3] - box[1]; ow, oh = max(1, round(cw * k)), max(1, round(ch * k))
        frames = [im.crop(box).resize((ow, oh), Image.LANCZOS) for im in frames]
        cols = max(1, min(len(frames), int((2048 // ow))))
        rows = (len(frames) + cols - 1) // cols
        out = Image.new('RGBA', (cols * ow, rows * oh), (0, 0, 0, 0))
        for i, im in enumerate(frames): out.paste(im, ((i % cols) * ow, (i // cols) * oh))
        buf = io.BytesIO(); out.quantize(colors=255, method=Image.FASTOCTREE, dither=Image.NONE).save(buf, 'PNG', optimize=True); b = buf.getvalue(); total += len(b)  # 量化成带透明的 256 色：体积小很多，特效看不出差别
        res[name] = {'img': 'data:image/png;base64,' + base64.b64encode(b).decode(), 'fw': ow, 'fh': oh, 'n': len(frames), 'cols': cols, 'fps': OUT_FPS,
                     'ox': round((pvx - box[0]) * k, 1), 'oy': round((pvy - box[1]) * k, 1), 'fit': round(s.get('fit', 32), 1), 'loop': bool(s.get('loop'))}
        print(f'{name:18s} {len(frames):3d} 帧  {ow}×{oh}  {len(b) // 1024} KB')
js = '/* 技能专属特效图集：由 tools/fx/pack.py 从 data/skillfx.json 生成。特效来自 pixelfx（MIT License，Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez，https://github.com/patch-gg/pixelfx） */\nwindow.FX_SHEETS = ' + json.dumps(res, separators=(',', ':')) + ';\n'
open(os.path.join(GAME, 'vendor', 'fxsheets.js'), 'w').write(js)
print(f'vendor/fxsheets.js {len(js) // 1024} KB（图 {total // 1024} KB）')
