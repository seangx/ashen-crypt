"""Generate data/astro.json from the extracted Astroloot tables (references/astroloot-data/*.json).
Only numbers and structure are taken; names shown in game come from data/items.json.
WARNING: rerunning overwrites any hand edits to data/astro.json."""
import json, os, re
SRC = '/mnt/project-files/references/astroloot-data/'
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'astro.json')
Q = ['Scrap', 'Rusty', 'Augmented', 'Enhanced', 'Exceptional', 'Heavy', 'Elite', 'Relic', 'Elder', 'Ancient', 'Eternal']

def qsq(a, b, q): return a + (q / 11) ** 2 * (b - a)
def ev(x):
    """per-quality array (11 numbers) or a constant"""
    if isinstance(x, dict):
        if 'per_quality' in x: return [round(x['per_quality'][k], 3) for k in Q]
        return None
    if isinstance(x, str):
        m = re.match(r'\(qsq\(([\d.]+), ([\d.]+)\)/([\d.]+)\)', x)
        if m: a, b, d = map(float, m.groups()); return [round(qsq(a, b, q) / d, 3) for q in range(11)]
        return None
    return x
EL = {'kinetic': 'kin', 'explosive': 'exp', 'plasma': 'pla', 'electric': 'ele', 'nuclear': 'nuc'}
def weapon(w):
    o = {'req': w.get('required_level', 1), 'w': w.get('drop_weight', 1000), 'tags': w['tags'], 'I': 1.0}
    for s in w.get('base_stats', []):
        if 'stat' not in s: continue
        st, a = s['stat'], s['args'][1:]
        if st == 'I': o['I'] = a[0]
        elif st == 'ay' or st == 'aO':
            el = next((EL[x.split('.')[1]] for x in a if isinstance(x, str) and x.startswith('ELEM.')), None)
            nums = [ev(x) for x in a[1:] if not (isinstance(x, str) and x.startswith('ELEM.'))]
            nums = [n for n in nums if n is not None]
            if st == 'aO': o['aura'] = nums[0]; o['el'] = el; continue
            if len(nums) >= 2 and isinstance(nums[0], list) and isinstance(nums[1], list): o['min'], o['max'] = nums[0], nums[1]
            elif len(nums) >= 2: o['min'], o['max'] = [1] * 11, nums[1] if isinstance(nums[1], list) else [nums[1]] * 11  # 电能：最小值恒为 1
            o['el'] = el; o['cont'] = 1 if (len(a) and a[-1] == 1) else 0
        elif st.startswith('D:'): o['aps'] = ev(a[0])
        elif st.startswith('E:'): o['crit'] = a[1] if len(a) > 1 else a[0]
        elif st.startswith('F:'): o['range'] = ev(a[0])
        elif st.startswith('cz:'): o['pierce'] = ev(a[-1])
        elif st.startswith('U:'): o['chain'] = ev(a[-1])
        elif st.startswith('cU:'): o['split'] = ev(a[-1])
        elif st.startswith('b:'): o['extra'] = ev(a[-1])
        elif st.startswith('O:'): o['ret'] = 1
        elif st.startswith('an:'): o['ail_kin'] = a[-1]
        elif st.startswith('K:'): o['ail_pla'] = a[-1]
        elif st.startswith('cM:'): o['ail_ele'] = a[-1]
        elif st.startswith('cD:'): o['ail_nuc'] = a[-1] / 100 if a[-1] > 1 else a[-1]
        elif st.startswith('ct:'): o['aoe'] = ev(a[-1])
        elif st.startswith('o:'): o['aoe'] = ev(a[2]) if len(a) > 2 else None
        elif st.startswith('p:'): o['arc'] = a[-1]
        elif st.startswith('aK:'): o['aspdInc'] = a[-1]
        elif st.startswith('bR:'): o['bossMore'] = ev(a[-1])
        elif st.startswith('bl:'): o['thermalInc'] = a[-1]
        elif st.startswith('bo:'): o['thrustInc'] = ev(a[-1])
        elif st.startswith('bu:'): o['knock'] = 1
    return o
def armor(b):
    o = {'req': b.get('required_level', 1), 'w': b.get('drop_weight', 1000)}
    for s in b.get('base_stats', []):
        if 'stat' not in s: continue
        st, a = s['stat'], s['args'][1:]
        if not a: continue
        f = a[-2] if st == 'cG' else a[-1]
        if isinstance(f, dict) and 'formula' in f:
            m = re.match(r'([\d.]+) \+ \(q/11\)\^2\*\(([\d.]+)-([\d.]+)\)', f['formula'])
            if m: lo, hi, _ = map(float, m.groups()); f = [round(qsq(lo, hi, q), 2) for q in range(11)]
            else: f = ev(f)
        if st.startswith('ax:'): o['armor'] = f
        elif st.startswith('aB:'): o['deflect'] = f
        elif st.startswith('aC:'): o['dodge'] = f
        elif st == 'cG': o['res'] = f; o['el'] = EL[a[-1].split('.')[1]]
        elif st.startswith('aF:'): o['time'] = f
        elif st.startswith('aD:'): o['energy'] = f
        elif st.startswith('aE:'): o['mass'] = f
    for k in ('armor', 'deflect', 'dodge'):
        if o.get(k) == 0: del o[k]
    return o
W = json.load(open(SRC + 'weapons.json'))['weapons']
B = json.load(open(SRC + 'bases.json'))
A = json.load(open(SRC + 'affixes.json'))['families']
M = json.load(open(SRC + 'mods.json'))
out = {'weapons': {w['name']: weapon(w) for w in W if not w['unique']},
       'engines': {b['name']: weapon(b) for b in B['Engine'] if not b.get('unique')},
       'shield': {b['name']: armor(b) for b in B['Shield'] if not b.get('unique')},
       'core': {b['name']: armor(b) for b in B['Core'] if not b.get('unique')},
       'nexus': {b['name']: armor(b) for b in B['Nexus'] if not b.get('unique')}}
# 引擎共享：推力 / 最高速度（按品质）
sh = next((b['engine_shared_stats'] for b in B['Engine'] if b.get('engine_shared_stats')), [])
for s in sh:
    if s['stat'].startswith('G:'): out['thrust'] = ev(s['args'][-1])
# 词条：普通物品上能出现的前缀 / 后缀
KIND = {'Weapon': 'weapon', 'Shield': 'shield', 'Core': 'core', 'Engine': 'engine', 'Nexus': 'hub'}
aff = {}
for f in A:
    if f.get('affix_type') not in ('Prefix', 'Suffix'): continue
    tags = f.get('rolls_on_tags_any')
    sp = f.get('rolls_on_special') or []
    if not tags and any('Weapon and not Engine' in s for s in sp): tags = ['WeaponOnly']
    chip = ['chip'] if any('Chip/EmpoweredChip' in s for s in sp) else ['chipE'] if any('EmpoweredChip only' in s for s in sp) else None
    if f['family'].startswith(('Octron', 'SpiritAnimal')) or (f['family'].startswith('Chip') and not chip): continue
    if not tags and not chip: continue
    tiers = [t for t in f['tiers'] if t.get('values') is not None]
    if not tiers: continue
    aff[f['family']] = {'type': f['affix_type'][0], 'el': EL.get(f.get('element')), 'on': chip or [KIND[t] if t in KIND else 'weapon' for t in tags if t in KIND or t == 'WeaponOnly'],
                        'grp': f.get('exclusive_group', [f['family']])[0],
                        'tiers': [[t['values'], t.get('spawn_weight', 25), t.get('item_level_min', 1), t.get('item_level_max_exclusive', 999)] for t in tiers]}
out['affixes'] = aff
out['modXp'] = M['xp_thresholds']
out['mods'] = {m['name']: {'req': m.get('required_level', 1), 'w': m.get('drop_weight', 450), 'fit': m.get('fits_items_with')} for m in M['mods']}
def dump(o):
    # one entry per line so edits and diffs stay readable
    rows = []
    for k, v in o.items():
        if isinstance(v, dict): rows.append(f' {json.dumps(k)}: {{\n' + ',\n'.join(f'  {json.dumps(kk, ensure_ascii=False)}: {json.dumps(vv, ensure_ascii=False, separators=(",", ":"))}' for kk, vv in v.items()) + '\n }')
        else: rows.append(f' {json.dumps(k)}: {json.dumps(v, ensure_ascii=False, separators=(",", ":"))}')
    return '{\n' + ',\n'.join(rows) + '\n}\n'
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cold_patch import patch as cold_patch
cold_patch(out)  # 寒霜元素：原作没有，照抄同类档位补上（spec-bd-gear §1）
txt = dump(out)
open(OUT, 'w', encoding='utf8').write(txt)
print('weapons', len(out['weapons']), 'engines', len(out['engines']), 'affixes', len(aff), 'mods', len(out['mods']), 'bytes', len(txt))
