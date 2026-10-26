/* ---------------- 独特装备 ----------------
   名单、底材、需求等级、掉落权重、保底词条（族 + 档位）来自原作配置（bases.json 的 unique_affixes）；
   专属规则的具体数值原作表里没有，这里按原作描述自定。名字和文字为原创。
   fixed: [词条族, 档位 N（T1 最高）]；rules: [规则键, 下限, 上限]。表在 data/uniques.json。 */
const UNIQUES = DATA.uniques.list; // data/uniques.json
const UNIQUE_BY = Object.fromEntries(UNIQUES.map(u => [u.id, u]));
const RULE_TEXT = {
  knock: () => '命中击退敌人', knockMore: v => `伤害总增 ${v}%`, aspdLess: v => `攻击速度总降 ${v}%`,
  afterPct: v => `余震每次保留 ${v}% 伤害`, afterRep: v => `余震多重复 ${v} 次`, convKinThermal: v => `${v}% 的物理伤害平均转换为火焰、圣光、闪电、寒霜`,
  pierce: () => '投射物无限穿透', convExpNuc: v => `${v}% 的火焰伤害转换为瘟疫伤害`, pull: () => '命中把敌人拉近',
  dotMore: v => `持续伤害总增 ${v}%`, 'shred:nuc': v => `命中使敌人瘟疫抗性 -${v}%（3 秒）`, chain: v => `弹射 +${v}（投射物碰到屏幕边反弹的次数，用完就飞出屏幕；闪电链类的瞬发电弧则是在敌人之间连锁）`,
  flatPerArmor: v => `每 100 护甲附加 ${v}–${v * 2} 物理伤害`, armorInc: v => `护甲提高 ${v}%`, shieldRegenPct: v => `护盾每秒回复 +${v}%`, energyAdd: v => `${ATTR_N.energy} +${v}`, aspdLessAll: v => `代价：攻击速度总降 ${v}%`, debrisPerEnergy: v => `每点${ATTR_N.energy}使碎骨范围提高 ${v}%`,
  killInc: v => `本次任务每击杀一个敌人，伤害提高 ${v}%（最多 ${RULES.killInc.max}%）`, cull: v => `敌人生命低于 ${v}% 时直接击杀`,
  twinNuc: v => `装着副手时，瘟疫伤害提高 ${v}%`, convPlaNuc: v => `${v}% 的圣光伤害转换为瘟疫伤害`, massAdd: v => `${ATTR_N.mass} +${v}`,
  dotInc: v => `持续伤害提高 ${v}%`, burnSlow: v => `灼烧衰减降低 ${v}%`, kinBaseInc: v => `物理基础伤害提高 ${v}%`,
  kinShock: v => `物理伤害有 ${v}% 几率造成感电`, double: v => `${v}% 几率造成双倍伤害`, shockMul: v => `感电效果提高 ${v}%`, runeLvl: v => `这件装备上的符文等级 +${v}`,
  massInc: v => `${ATTR_N.mass}${v >= 0 ? '提高' : '降低'} ${Math.abs(v)}%`, energyInc: v => `${ATTR_N.energy}${v >= 0 ? '提高' : '降低'} ${Math.abs(v)}%`, timeInc: v => `${ATTR_N.time}${v >= 0 ? '提高' : '降低'} ${Math.abs(v)}%`,
  rangeInc: v => `射程提高 ${v}%`, spinDecay: v => `代价：旋转层数掉得更快，不命中 ${Math.round(WH.decay * (1 - v / 100) * 10) / 10} 秒就清零（原来 ${WH.decay} 秒）`, resAll: v => `全部抗性 ${v >= 0 ? '+' : ''}${v}%`, blindAura: () => ruleText('blindAura'), shockAura: () => ruleText('shockAura'),
  fieldHere: () => '力场符文插在这里也生效', takenKin: v => `受到的伤害有 ${v}% 按物理抗性结算`, dodge: v => `闪避 +${v}`, dodgeCap: v => ruleText('dodgeCap', v),
  dodgeSpikes: () => ruleText('dodgeSpikes'), velocity: v => `移动速度提高 ${v}%`, critLess: v => `暴击率总降 ${v}%`,
  areaEye: () => ruleText('areaEye'), projLess: v => `代价：投射物伤害总降 ${v}%`, armorLess: v => `代价：护盾总降 ${v}%`,
  delayCrown: v => `每多 0.1 秒延迟，延迟伤害总增 ${v}%`, delayAdd: v => `延迟 +${v} 秒`, aoeInc: v => `范围提高 ${v}%`, earlyWarn: () => '代价：预警圈更早出现（圈里的怪会往外躲）',
  groundStack: v => `你的地面效果在同一位置可以叠 ${v} 层（各自计时）`, durLess: v => `代价：持续时间降低 ${v}%`,
  martyrThrow: v => `圣盾掷的弹射（碰屏幕边反弹）次数 ×2；每次命中回 ${v / 10}% 护盾`, martyrArmor: () => '代价：盾在飞时不算盾的护甲',
  echoCrown: v => `弹射（碰屏幕边反弹）过的投射物，命中时在命中点小爆（半径 ${UQX.echoR} 像素，×${v}%，算范围）`, chainLess: v => `代价：弹射 −${v}`,
  winterHeart: v => `冰球速度 −70%；持续时间 +${v}%；冰片频率 ×1.5`, winterCost: v => `代价：每次施放的灯火消耗 +${v}%`,
  shardCrown: () => '派生物再派生一层（每层 ×0.5）', frozenTaken: v => `冻结的敌人受到的伤害提高 ${v}%`, projSlowU: v => `代价：投射物速度降低 ${v}%（寒魄球用起来是好处）`,
  autoNova: v => `新星每 ${UQX.autoNovaEvery} 秒自动脉冲一次（×${v}%），不再按攻速出手`, iceGround: () => `脚下留 ${UQX.iceGround.dur} 秒冰地，每秒叠 ${UQX.iceGround.chillPerSec} 层冰缓`, moveLess: v => `代价：移速 −${v}%`,
  coffin: () => `每冻结一个敌人回 ${UQX.coffinShield}% 护盾`, freezeDur: v => `冻结时间 +${v}%`, fireResLess: v => `代价：火焰抗性 −${v}%`,
  vortexTreads: () => `旋转叠满层时移速 +${UQX.vortex.moveFull}%、受到的伤害 −${UQX.vortex.takenFull}%（永冬自动脉冲期间算满层）；代价：没有层数时移速 −${UQX.vortex.moveNone}%`,
  chainCrown: () => ruleText('chainCrown'), projCrown: () => ruleText('projCrown'), durCrown: () => ruleText('durCrown'), velCrown: () => ruleText('velCrown'), meleeCrown: () => ruleText('meleeCrown'), multicrit: () => ruleText('multicrit'), dashMax: v => `冲刺槽 +${v}`, finale: () => ruleText('finale'), splitEnd: () => ruleText('splitEnd'),
};
for (const k of ELEM) RULE_TEXT['ail:' + k] = v => `${AIL[k].n}几率 +${v}%`;
const ruleLines = it => { const u = UNIQUE_BY[it.u]; return u ? [...u.rules.map(([k], i) => RULE_TEXT[k](it.uv[i])), ...(u.when ? [`以上规则只在【${TAG_N[u.when] || u.when}】技能上生效`] : [])] : []; };
const uval = (it, k) => { const u = it && UNIQUE_BY[it.u]; if (!u) return 0; let s = 0; u.rules.forEach(([kk], i) => { if (kk === k) s += it.uv[i]; }); return s; };
