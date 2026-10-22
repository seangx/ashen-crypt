/* ---------------- 独特装备 ----------------
   名单、底材、需求等级、掉落权重、保底词条（族 + 档位）来自原作配置（bases.json 的 unique_affixes）；
   专属规则的具体数值原作表里没有，这里按原作描述自定。名字和文字为原创。
   fixed: [词条族, 档位 N（T1 最高）]；rules: [规则键, 下限, 上限]。表在 data/uniques.json。 */
const UNIQUES = DATA.uniques.list; // data/uniques.json
const UNIQUE_BY = Object.fromEntries(UNIQUES.map(u => [u.id, u]));
const RULE_TEXT = {
  knock: () => '命中击退敌人', knockMore: v => `伤害总增 ${v}%`, aspdLess: v => `攻击速度总降 ${v}%`,
  afterPct: v => `余震每次保留 ${v}% 伤害`, afterRep: v => `余震多重复 ${v} 次`, convKinThermal: v => `${v}% 的物理伤害平均转换为火焰、圣光、闪电`,
  pierce: v => `额外穿透 ${v}`, convExpNuc: v => `${v}% 的火焰伤害转换为瘟疫伤害`, pull: () => '命中把敌人拉近',
  dotMore: v => `持续伤害总增 ${v}%`, 'shred:nuc': v => `命中使敌人瘟疫抗性 -${v}%（3 秒）`, chain: v => `额外连锁 ${v}`,
  flatPerMass: v => `每点${ATTR_N.mass}附加 ${v}–${v * 2} 物理伤害`, debrisPerEnergy: v => `每点${ATTR_N.energy}使碎骨范围提高 ${v}%`,
  killInc: v => `本次任务每击杀一个敌人，伤害提高 ${v}%（最多 ${RULES.killInc.max}%）`, cull: v => `敌人生命低于 ${v}% 时直接击杀`,
  twinNuc: v => `两只手都拿着双生圣焰铳时，瘟疫伤害提高 ${v}%`, convPlaNuc: v => `${v}% 的圣光伤害转换为瘟疫伤害`, massAdd: v => `${ATTR_N.mass} +${v}`,
  dotInc: v => `持续伤害提高 ${v}%`, burnSlow: v => `灼烧衰减降低 ${v}%`, kinBaseInc: v => `物理基础伤害提高 ${v}%`,
  kinShock: v => `物理伤害有 ${v}% 几率造成感电`, double: v => `${v}% 几率造成双倍伤害`, shockMul: v => `感电效果提高 ${v}%`, runeLvl: v => `这件装备上的符文等级 +${v}`,
  massInc: v => `${ATTR_N.mass}${v >= 0 ? '提高' : '降低'} ${Math.abs(v)}%`, energyInc: v => `${ATTR_N.energy}${v >= 0 ? '提高' : '降低'} ${Math.abs(v)}%`, timeInc: v => `${ATTR_N.time}${v >= 0 ? '提高' : '降低'} ${Math.abs(v)}%`,
  rangeInc: v => `射程提高 ${v}%`, spinDecay: v => `代价：旋转层数掉得更快，不命中 ${Math.round(WH.decay * (1 - v / 100) * 10) / 10} 秒就清零（原来 ${WH.decay} 秒）`, resAll: v => `全部抗性 ${v >= 0 ? '+' : ''}${v}%`, blindAura: () => ruleText('blindAura'), shockAura: () => ruleText('shockAura'),
  fieldHere: () => '力场符文插在这里也生效', takenKin: v => `受到的伤害有 ${v}% 按物理抗性结算`, dodge: v => `闪避 +${v}`, dodgeCap: v => ruleText('dodgeCap', v),
  dodgeSpikes: () => ruleText('dodgeSpikes'), velocity: v => `移动速度提高 ${v}%`, critLess: v => `暴击率总降 ${v}%`,
  stormEye: () => `转旋风时判定半径 +${WH.eyeRng}%，并把 ${WH.pullR} 倍半径内的怪以每秒 ${WH.pull} 像素卷向自己（Boss 不受影响）；旋风之心甩出的小旋风多飘 ${WH.eyeLifeAdd} 秒，同时最多多 ${WH.eyeMaxAdd} 个`, armorLess: v => `护甲总降 ${v}%`,
  multicrit: () => ruleText('multicrit'), dashMax: v => `冲刺槽 +${v}`, finale: () => ruleText('finale'), splitEnd: () => ruleText('splitEnd'),
};
for (const k of ['kin', 'exp', 'pla', 'ele', 'nuc']) RULE_TEXT['ail:' + k] = v => `${AIL[k].n}几率 +${v}%`;
const ruleLines = it => { const u = UNIQUE_BY[it.u]; return u ? u.rules.map(([k], i) => RULE_TEXT[k](it.uv[i])) : []; };
const uval = (it, k) => { const u = it && UNIQUE_BY[it.u]; if (!u) return 0; let s = 0; u.rules.forEach(([kk], i) => { if (kk === k) s += it.uv[i]; }); return s; };
