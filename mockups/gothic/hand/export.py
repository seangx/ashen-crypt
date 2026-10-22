import json, sys
sys.path.insert(0, '.')
from pal import PAL
import hero, skel
EM = set('kj4')
def conv(rows):
    px = []
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c in '. ': continue
            h = PAL[c]; px.append([x, y, [round(int(h[i:i+2], 16) / 255, 4) for i in (1, 3, 5)]] + ([True] if c in EM else []))
    return {'w': max(len(r) for r in rows), 'h': len(rows), 'px': px}
out = {'player': [conv(f) for f in hero.FRAMES], 'skel': [conv(f) for f in skel.FRAMES]}
open('../hand-sprites.js', 'w').write('window.HAND_SPRITES=' + json.dumps(out, separators=(',', ':')) + ';\n')
