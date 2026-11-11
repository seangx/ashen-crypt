#!/usr/bin/env python3
"""按当前实现生成 design/gear-v3.md（七套数值从 game/data/sets.json 读）。用法：python3 game/tools/docs/gen_gear_doc.py .（在仓库根目录）；改文档改 gear-v3.tpl.md，套装那节和掉落数字从数据填"""
import json, sys, os
R = sys.argv[1]
d = json.load(open(os.path.join(R, 'game/data/sets.json')))
EL = {'kin': '物理', 'exp': '火焰', 'ele': '闪电', 'cold': '寒霜', 'pla': '圣光', 'nuc': '瘟疫'}
F3 = {'melee': '近战', 'proj': '投射物', 'area': '范围'}
ME = {'delay': '延迟', 'pierce': '穿透', 'chain': '弹射', 'split': '分裂', 'dot': '持续', 'spawn': '派生'}
g = [x for x in json.load(open(os.path.join(R, 'game/data/gems.json')))['list'] if not x.get('util')]
def fits(t, x):
    return (t.get('el') and x.get('el') == t['el']) or (t.get('f3') and x['f3'] == t['f3']) or (t.get('mech') and t['mech'] in (x.get('mech') or []))
sets = []
for st in d['list']:
    t = st['tag']; tn = EL.get(t.get('el')) or F3.get(t.get('f3')) or ME.get(t.get('mech'))
    sk = '、'.join(x['n'] for x in g if fits(t, x))
    sets.append(f"**{st['n']}（{tn}：{sk}）**\n" + "\n".join(f"- {k} 件：{st['bonus'][k]['t']}" for k in ('2', '4', '6')))
D = d['drop']
SETS_MD = "\n\n".join(sets)
doc = open(os.path.join(os.path.dirname(__file__), 'gear-v3.tpl.md')).read()
doc = doc.replace('{SETS}', SETS_MD).replace('{minIlvl}', str(D['minIlvl'])).replace('{normal}', f"{D['normal']*100:g}").replace('{boss}', f"{D['boss']*100:g}").replace('{chest}', f"{D['chest']*100:g}").replace('{main}', str(int(D['main']*100))).replace('{pity}', str(D['pity'])).replace('{giftDepth}', str(D['giftDepth'])).replace('{giftN}', str(D['giftN']))
open(os.path.join(R, 'design/gear-v3.md'), 'w').write(doc)
print('written', len(doc))
