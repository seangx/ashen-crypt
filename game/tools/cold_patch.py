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
