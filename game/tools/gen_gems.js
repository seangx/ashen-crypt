// 生成 data/gems.json（spec-skill-gems §3）：技能石的形态参数、标签、攻速、范围从旧武器条目（astro.json + items.json）搬过来
// 用法：node tools/gen_gems.js
const fs = require('fs'), path = require('path');
const D = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf8'));
const A = D('astro.json'), I = D('items.json'), R = D('runes.json');
const RUNE = Object.fromEntries(R.list.map(r => [r.id, r]));
const defs = [
  ['GemWhirl', '旋风斩', ['TurbineBlades'], 'Whirl', 'melee'],
  ['GemStab', '突刺', ['Spikes', 'Thorns'], null, 'melee'],
  ['GemRam', '冲撞', ['Hullbreaker'], null, 'melee'],
  ['GemBolt', '骨矢', ['Cannon', 'Railgun'], null, 'ranged'],
  ['GemTaser', '雷符', ['Taser'], null, 'ranged'],
  ['GemSpark', '游雷', ['Zapper'], 'Spark', 'ranged'],
  ['GemSickle', '飞镰', ['Shuriken', 'PlasmaCutter'], null, 'ranged'],
  ['GemFirepot', '火油罐', ['Rocket', 'FlameSlinger'], null, 'ranged'],
  ['GemScatter', '散射', ['Blastgun', 'PlasmaBlaster'], null, 'ranged'],
  ['GemPlague', '疫星', ['Orbitron', 'SporeBlaster'], null, 'ranged'],
  ['GemBeam', '圣光束', ['Laser'], null, 'ranged'],
  ['GemFlame', '喷火', ['FlameThrower'], null, 'melee'],
  ['GemMiasma', '瘟疫光环', ['PlutoniumBar'], null, 'melee'],
  ['GemNova', '新星', ['PlasmaNova'], null, 'melee'],
  ['GemFrostNova', '霜环', ['FrostBell'], 'FrostNova', 'melee'],
  ['GemMeteor', '陨火', ['StarfallRod'], 'Meteor', 'ranged'],
  ['GemFrostOrb', '寒魄球', ['FrostOrb'], 'FrostOrbRune', 'ranged'],
  ['GemTrap', '陷阱', ['BlastMine', 'StormMine', 'WasteMine', 'PlasmaMine', 'ShrapnelMine'], null, 'ranged'],
  ['GemShield', '圣盾掷', [], 'ShieldThrow', 'ranged'],
];
const list = defs.map(([id, n, src, fr, ai]) => {
  const w = src[0] && A.weapons[src[0]], s = src[0] && I.weapons[src[0]];
  const g = { id, n, ic: s ? s.ic : I.shield.SigilShield[1], form: s ? s.form : 'shieldThrow', src, tags: w ? w.tags.filter(t => t !== 'Weapon') : ['Shield', 'Projectile', 'ProjectileCanChain', 'ProjectileCanPierce', 'Attack', 'AttackSpeed', 'Hit'],
    mul: fr ? [1, 1] : [1, 1.25], spd: 1, req: fr ? 6 : 1, w: 600, ai };
  if (id === 'GemTrap') g.dropVars = ['BlastMine', 'StormMine', 'WasteMine'];
  if (id === 'GemStab') g.dropVars = ['Spikes'];
  if (fr) { g.fr = fr; g.fx = RUNE[fr].fx; }
  return g;
});
const out = { _说明: '技能石（spec-skill-gems）。src：来源旧武器底子（形态参数、标签、攻速、射程、范围、伤害曲线都读它；第一个是默认变体，dropVars 是掉落时随机的变体）。伤害 = 来源底子按主手品质的伤害 × mul(等级，1→20 线性) × (1 + 品质%) × 对口；出手频率 = 来源底子攻速 × spd。fr：并进来的形态符文（fx 按技能石等级）。mul 第一版：形态技能石 [1,1]（形态 fx 本身随等级成长），普通技能石 [1,1.25]。由 tools/gen_gems.js 生成。', list };
fs.writeFileSync(path.join(__dirname, '..', 'data', 'gems.json'), JSON.stringify(out, null, 1) + '\n');
console.log('gems', list.length);
