"""寒霜元素（spec-bd-gear.md §1）：从同类词条照抄档位，生成寒霜的抗性 / 伤害词条和寒霜法阵底子。
gen_data.py 生成 astro.json 时调用 patch(out)；单独运行时就地补到现有 data/astro.json（幂等）。"""
import copy, json, os

COPY = [  # 新 id, 照抄的 id
    ('ColdResistance', 'KineticResistance'), ('MaxColdResistance', 'MaxKineticResistance'),
    ('FlatColdDamage', 'FlatPlasmaDamage'), ('IncreasedColdBaseDamage', 'IncreasedPlasmaBaseDamage'),
    ('IncreasedColdDamage', 'IncreasedPlasmaDamage'), ('ChipIncreasedColdDamage', 'ChipIncreasedPlasmaDamage'),
    ('ChipColdResistance', 'ChipPlasmaResistance'), ('ChipMoreColdDamage', 'ChipMorePlasmaDamage'),
]

def patch(out):
    aff = out['affixes']
    for k, src in COPY:
        a = copy.deepcopy(aff[src]); a['el'] = 'cold'
        a['grp'] = a['grp'].replace('Kinetic', 'Cold').replace('Plasma', 'Cold')
        aff[k] = a
    n = copy.deepcopy(out['nexus']['BaryteNexus']); n.update({'req': 12, 'w': 250, 'el': 'cold'})
    out['nexus']['FrostNexus'] = n
    # 霜环（spec-bd-gear §4.4）：霜钟 = 圣钟的数值，el cold，ail_cold 0.5，tags 加 Nova，req 6，w 800
    sec = next(v for v in out.values() if isinstance(v, dict) and 'PlasmaNova' in v)
    b = copy.deepcopy(sec['PlasmaNova']); b.pop('ail_pla', None)
    b.update({'req': 6, 'w': 800, 'el': 'cold', 'ail_cold': 0.5, 'tags': b['tags'] + ['Nova']})
    sec['FrostBell'] = b
    return gear(out)

# 词条改版（spec-bd-gear.md §3.1、§3.4）：六元素抗性 / 抗性上限只出在法阵和盾牌；空词条权重归零（老存档按 mechanics.gear.migrate 映射）
RES_EL = ['Kinetic', 'Explosive', 'Plasma', 'Electric', 'Nuclear', 'Cold']
DEAD = ['FlatMass', 'FlatTime', 'DashDamage', 'DashRecharge', 'ChipIncreasedMinionArmor', 'ChipMoreMinionArmor', 'ChipMoreMinionDamage']

def gear(out):
    aff = out['affixes']
    for e in RES_EL:
        for k in (e + 'Resistance', 'Max' + e + 'Resistance'): aff[k]['on'] = ['hub', 'shield']
    for k in DEAD:
        for t in aff[k]['tiers']: t[1] = 0
    return out

def dump(o):  # 同 gen_data.py
    rows = []
    for k, v in o.items():
        if isinstance(v, dict): rows.append(f' {json.dumps(k)}: {{\n' + ',\n'.join(f'  {json.dumps(kk, ensure_ascii=False)}: {json.dumps(vv, ensure_ascii=False, separators=(",", ":"))}' for kk, vv in v.items()) + '\n }')
        else: rows.append(f' {json.dumps(k)}: {json.dumps(v, ensure_ascii=False, separators=(",", ":"))}')
    return '{\n' + ',\n'.join(rows) + '\n}\n'

if __name__ == '__main__':
    P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'astro.json')
    t = open(P, encoding='utf8').read()
    assert dump(json.loads(t)) == t, 'astro.json 格式和 dump 不一致'
    open(P, 'w', encoding='utf8').write(dump(patch(json.loads(t))))
    print('ok')
