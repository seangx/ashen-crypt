/* ---------------- 属性计算 ----------------
   原作规则：固定附加 → 提高（同类相加）→ 总增（彼此相乘）。
   武器的 flat / baseInc / baseAspd 词条是局部的，只作用于那把武器。 */
const THERMAL_E = ['exp', 'pla', 'ele', 'cold'];
const ARMOR_KINDS = ['shield', 'core', 'hub'];

// 全局词条按 stat + 元素汇总：G['res:kin']、G.armor ...
function sumGlobal(items) {
  const g = {};
  const add = (k, v) => g[k] = (g[k] || 0) + v;
  for (const it of items) for (const x of it.affs) {
    const a = AFF_BY[x.k]; if (a.local) continue;
    const v = Array.isArray(x.v) ? x.v[0] : x.v;
    add(a.el ? a.stat + ':' + a.el : a.stat, v);
  }
  return g;
}
// 符文效果：等级 = 自身等级 + 「所有符文等级」
const runeLvl = (m, P, extra = 0) => clamp(m.lvl + (P.modLvl || 0) + extra, 1, LOOT.runeDrop.levelCap);
function activeRunes(it, P) { const ex = uval(it, 'runeLvl'); return (it.mods || []).filter(m => m && modActive(m, it)).map(m => ({ m, fx: MOD_BY[m.mid].fx(runeLvl(m, P, ex)) })); }

function computeStats(eq = S.equip) {
  const items = Object.values(eq).filter(Boolean);
  const A = sumGlobal(items);
  const TS = treeStats(S.tree, eq), TA = TS.add, TM = TS.more, FL = TS.flag;
  const P = { raw: A, modLvl: (A.modLvl || 0) + (TA.modLvl || 0), tree: TS, flag: FL, shockMul: TS.flag.shockMul || 1, afterRep: TS.flag.afterRep || 0 };
  // 法阵里的力场
  const F = {};
  if (eq.hub) for (const { fx } of activeRunes(eq.hub, P)) for (const k in fx) {
    if (k === 'res') for (const e in fx.res) F['res:' + e] = (F['res:' + e] || 0) + fx.res[e];
    else F[k] = (F[k] || 0) + fx[k];
  }
  // 护甲类底材的固有数值（按品质）
  const base = {};
  for (const k of ARMOR_KINDS) {
    const it = eq[k]; if (!it) continue; const b = baseOf(it);
    for (const s of ['shieldDmg', 'armor', 'deflect', 'dodge', 'mass', 'energy', 'time']) if (b[s]) base[s] = (base[s] || 0) + qv(b[s], it.q);
    if (b.res) base['res:' + b.el] = (base['res:' + b.el] || 0) + qv(b.res, it.q);
  }
  A.shieldDmg = (A.shieldDmg || 0) + (base.shieldDmg || 0) + (TA.shieldDmg || 0); A.delayInc = (A.delayInc || 0) + (TA.delayInc || 0); /* 天赋里的盾牌伤害、延迟伤害和装备相加 */ // 圣徽盾的隐性盾牌伤害
  // 主属性
  P.mass = Math.round(((base.mass || 0) + (A.mass || 0) + (TA.mass || 0)) * Math.max(0, 1 + ((F.massInc || 0) + (TA.massInc || 0)) / 100));
  P.energy = Math.round(((base.energy || 0) + (A.energy || 0) + (TA.energy || 0)) * Math.max(0, 1 + ((F.energyInc || 0) + (TA.energyInc || 0)) / 100));
  P.time = Math.round(((base.time || 0) + (A.time || 0) + (TA.time || 0)) * Math.max(0, 1 + ((F.timeInc || 0) + (TA.timeInc || 0)) / 100));
  // 防御三条（规格 design/spec-defense-v2.md）：护甲只管减伤；护盾是第一道血条，每秒回复；生命是第二道，归零阵亡，只靠吸血回
  P.armor = Math.max(0, Math.round((PLAYER.armor + (base.armor || 0) + (A.armor || 0) + (TA.armor || 0)) * (1 + ((A.armorInc || 0) + (TA.armorInc || 0) + P.mass * MECH.massArmor * 100) / 100)));
  // 原来的灵障并进护盾；天赋/独特里“护甲总降”的代价改成护盾总降
  P.armorOut = P.armor; // 盾扔出去时没有格挡
  if (FL.martyrArmor && eq.shield) P.armorOut = Math.max(0, Math.round((PLAYER.armor + (base.armor || 0) - qv(baseOf(eq.shield).armor || 0, eq.shield.q) + (A.armor || 0) + (TA.armor || 0)) * (1 + ((A.armorInc || 0) + (TA.armorInc || 0) + P.mass * MECH.massArmor * 100) / 100))); // 殉道者之盾：盾在飞时不算盾的护甲
  const blk = (A.block || 0) + (TA.block || 0); if (eq.shield && blk) P.armor = Math.round(P.armor * (1 + blk / 100)); // 格挡：盾在手上时护甲提高
  P.shield = Math.round((PLAYER.shield + (base.deflect || 0) + (A.deflect || 0) + (F.deflect || 0) + (TA.deflect || 0)) * (1 + ((A.deflectInc || 0) + (TA.deflectInc || 0) + P.energy * MECH.energyDeflect * 100) / 100) * (TM.deflect ?? 1) * (TM.armor ?? 1));
  P.shieldRegen = P.shield * (PLAYER.shieldRegenPct + (F.armorRegen || 0)) / 100 * (TM.deflRate ?? 1) + (A.shieldRegen || 0) + (TA.shieldRegen || 0); // 每秒回复：上限的 % + 复骨力场 + 词条的固定值
  P.life = Math.max(1, Math.round((PLAYER.life + PLAYER.lifePerLevel * ((S.level || 1) - 1) + (A.life || 0) + (TA.life || 0)) * (1 + ((A.lifeInc || 0) + (TA.lifeInc || 0)) / 100) * (TM.life ?? 1))); // 天赋代价可以是生命总降
  P.dodgeCap = MECH.dodgeCap + (TS.flag.dodgeCap || 0);
  P.dodge = Math.min(P.dodgeCap, Math.round((base.dodge || 0) + (A.dodge || 0) + (TA.dodge || 0)));
  P.maxRes = PLAYER.maxRes; P.maxResE = {}; P.res = {};
  for (const e of ELEM) {
    P.maxResE[e] = PLAYER.maxRes + (A['maxRes:' + e] || 0);
    const r = PLAYER.res + (base['res:' + e] || 0) + (A['res:' + e] || 0) + (THERMAL[e] ? A['res:thermal'] || 0 : 0) + (F.resAll || 0) + (F['res:' + e] || 0) + (TA['res:all'] || 0) + (TA['res:' + e] || 0) + (THERMAL[e] ? TA['res:thermal'] || 0 : 0);
    P.res[e] = Math.min(P.maxResE[e], Math.round(r));
  }
  // 移动：所有遁靴共享按品质的推力表
  const eng = eq.engine; const thrust = ENGINE_THRUST[eng ? eng.q : 0];
  const eb = eng ? baseOf(eng) : null;
  P.speed = (PLAYER.baseSpeed + thrust * PLAYER.thrustToSpeed) * (TM.speed ?? 1) * (1 + ((A.velocity || 0) + (A.moveInc || 0) + (TA.velocity || 0) + (TA.moveInc || 0) + (eb && eb.thrustInc ? qv(eb.thrustInc, eng.q) : 0)) / 100) * (1 + P.time * MECH.timeFlow);
  P.accel = P.speed * PLAYER.accelMul * Math.max(MECH.massAccelMin, 1 + P.mass * MECH.massAccel);
  P.timeMul = 1 + P.time * MECH.timeFlow;
  // 冲刺槽
  let dashMax = PLAYER.dashMax + (A.dashMax || 0) + (TA.dashMax || 0);
  if (eng) for (const { fx } of activeRunes(eng, P)) dashMax += fx.dashMax || 0;
  P.dashMax = Math.max(1, dashMax + (TM.dashMax || 0));
  // 魂火
  P.soulMax = SOUL.base + P.energy * SOUL.perEnergy;
  P.soulRegen = (SOUL.regen + P.energy * SOUL.regenPerEnergy) * (1 + ((A.soulRegen || 0) + (TA.soulRegen || 0)) / 100);
  P.soulGainMul = 1 + ((A.soulRegen || 0) + (TA.soulRegen || 0) + (A.soulKillInc || 0) + (TA.soulKillInc || 0)) / 100; // 推关里提高击杀回的灯火（魂火回复 + 击杀回灯火）
  P.burnMul = (1 - Math.min(GEAR.burnLessCap, (A.burnLess || 0) + (TA.burnLess || 0)) / 100) * (1 + (FL.burnMore || 0) / 100); // 灯火燃烧降低；誓约“灯火燃烧 +%”
  P.delayAdd = (A.delayAdd || 0) + (TA.delayAdd || 0); P.spawnAdd = (A.spawnAdd || 0) + (TA.spawnAdd || 0); P.frozenTaken = ((A.frozenTaken || 0) + (TA.frozenTaken || 0)) / 100; P.freezeMul = 1 + (TA.freezeDur || 0) / 100; // 新流派用（第 4 步）
  P.soulLess = Math.min(SOUL.costCap, (A.soulLess || 0) + (TA.soulLess || 0)) / 100;
  P.dashRegen = MECH.dashRegen * (1 + ((A.dashRegen || 0) + (TA.dashRegen || 0) + P.energy * MECH.energyDash * 100) / 100) + (F.dashPerSec || 0);
  // 通用防御（spec-tree-defense §1）：装备 + 天赋 + 法阵力场相加；四个大天赋改上限和倍数
  { const GD = MECH.generic, sum = k => (A[k] || 0) + (TA[k] || 0) + (F[k] || 0);
    P.ctrlCap = FL.ctrlPrison ? DATA.rules.ctrlPrison.cap : GD.ctrlCap; P.ctrlWeaken = Math.min(P.ctrlCap, (FL.ctrlPrison ? DATA.rules.ctrlPrison.base : GD.ctrlBase) + sum('ctrlWeaken'));
    P.closePer = (GD.closeBase + sum('closePer')) * (FL.ironWall ? DATA.rules.ironWall.mul : 1); P.closeCap = Math.min(FL.ironWall ? DATA.rules.ironWall.hard : GD.closeHard, GD.closeCapBase + sum('closeCap'));
    P.farCap = FL.loneWolf ? DATA.rules.loneWolf.cap : GD.farCap; P.farDR = Math.min(P.farCap, sum('farDR') * (FL.loneWolf ? DATA.rules.loneWolf.mul : 1));
    P.shieldOnHit = sum('shieldOnHit') * (FL.drinkShield ? DATA.rules.drinkShield.mul : 1); P.sohCap = FL.drinkShield ? DATA.rules.drinkShield.cap : GD.sohCapPct; }
  P.pickup = PLAYER.pickup;
  // 全局伤害修正
  P.aspdInc = (A.aspd || 0) + (TA.aspd || 0);
  P.thermalInc = A.thermalInc || 0;
  P.dashDmg = A.dashDmg || 0;
  // 通用标签属性（规格 design/spec-tags.md）：投射物 +N、范围提高、持续时间提高来自词条、天赋、独特
  P.projAdd = (A.extra || 0) + (TA.projAdd || 0);
  P.durInc = (A.durInc || 0) + (TA.durInc || 0);
  P.durMul = Math.max(0.1, 1 + P.durInc / 100);
  P.engine = eng && eb.min ? weaponStats(eng, P, true) : null;
  P.engineKind = eb ? eb.dash : null;
  P.off = offSupport(eq.wr); // 副手没有技能：只把支援效果交给主手
  P.twin = eq.wl && eq.wl.u === 'TheTwin' && eq.wr ? 2 : 0; // 双生圣焰铳：拿着副手时生效
  P.weapons = [eq.wl && eq.wl.kind === 'weapon' ? weaponStats(eq.wl, P) : null, null];
  P.armorHeld = P.armor; P.shieldW = shieldWeapon(eq.shield, P); // 圣盾掷：盾变成一把虚拟武器
  P.dps = P.weapons.reduce((s, w) => s + (w ? w.dps : 0), 0) + (P.shieldW ? P.shieldW.dps : 0);
  return P;
}

const THROW_B = { key: 'ShieldThrow', form: 'shieldThrow', el: 'pla', aps: SHT.aps, crit: SHT.crit, range: SHT.range, tags: ['Shield', 'Projectile', 'ProjectileCanChain', 'ProjectileCanPierce', 'Attack', 'AttackSpeed', 'Hit'] };
function shieldWeapon(sh, P) { // 圣徽盾插圣盾掷符文：单次伤害 = 盾的护甲（底子 × (1 + 护甲提高%)）× throwK
  if (!sh || !sh.sock) return null;
  const r = activeRunes(sh, P).find(x => x.fx.shieldThrow); if (!r) return null;
  const ab = qv(baseOf(sh).armor || 0, sh.q) * (1 + ((P.raw.armorInc || 0) + (P.tree.add.armorInc || 0)) / 100);
  return weaponStats({ ...sh, kind: 'weapon', fb: THROW_B, src: sh, u: null, affs: [], throwDmg: ab * r.fx.throwK }, P);
}
/* 副手的隐性支援效果：sup 每项 [品质 0, 品质 10]，按品质线性 */
const OFF_SUP = ['extra', 'inc', 'projInc', 'aoeInc', 'areaInc', 'aspdMore', 'critInc', 'critDmg', 'ail', 'gain', 'more'];
const supVal = (r, q) => Array.isArray(r) ? r[0] + (r[1] - r[0]) * clamp(q, 0, 10) / 10 : r || 0;
function offSupport(it) {
  if (!it || it.kind !== 'off') return null; const sup = (ARMORS.off[it.b] || {}).sup || {}, o = {};
  for (const k of OFF_SUP) o[k] = k === 'extra' ? Math.round(supVal(sup[k], it.q)) : supVal(sup[k], it.q);
  return o;
}
/* 武器（或带伤害的遁靴）的最终数值 */
function weaponStats(it, P, isEngine) {
  const b = baseOf(it), q = it.q;
  const tags = itemTags(it), has = t => tags.includes(t);
  const W = { it, b, key: b.key, form: isEngine ? 'engine' : b.form, el: b.el, tags, cont: !!b.cont, min: {}, max: {}, ail: {}, runes: [],
    pierce: qv(b.pierce || 0, q), chain: qv(b.chain || 0, q), split: qv(b.split || 0, q), ret: b.ret || 0, extra: qv(b.extra || 0, q), extraChance: 0,
    pierceMore: 1, chainInc: 0, splitInc: 0, knock: b.knock || 0, more: 1, dotMore: 1, debrisMore: 1, blindMore: 1, radMore: 1, doubleChance: 0,
    armorOnHit: 0, dashOnHit: 0, cull: 0, perDashInc: 0, bossMore: b.bossMore ? 1 + qv(b.bossMore, q) / 10 : 1 };
  const TA = P.tree.add, TM = P.tree.more, U = k => uval(it, k);
  const IM = it.kind === 'weapon' && !it.fb && IMPL[it.b] ? IMPL[it.b].fx : {}; // 底子的隐性倾向
  W.chain += IM.chain || 0; W.pierce += IM.pierce || 0; if (IM.knock) W.knock = 1; W.pierceMore *= IM.pierceMore || 1; W.bossMore *= 1 + (IM.bossInc || 0) / 100; W.impSpawn = IM.spawn || 0;
  for (const e of ELEM) W.ail[e] = (b['ail_' + e] || 0) + (TA['ail:' + e] || 0) + U('ail:' + e) / 100 + ((IM.ail || {})[e] || 0);
  // 独特装备的局部规则
  if (U('knock')) W.knock = 1;
  W.more *= 1 + U('knockMore') / 100; W.dotMore *= 1 + U('dotMore') / 100;
  W.pierce += U('pierce'); W.chain += U('chain'); W.cull += U('cull'); W.doubleChance += U('double') / 100 + (TA.double || 0) / 100;
  W.afterPct = U('afterPct') ? U('afterPct') / 100 : MECH.afterPct;
  W.bossMore *= 1 + (TA.bossInc || 0) / 100;
  if (has('Projectile')) W.extra += P.projAdd; // 投射物 +N
  if (has('ProjectileCanChain') || W.chain) W.chain += (TA.chain || 0) + (P.raw.chain || 0); // 弹射 +N
  W.projDurInc = has('Projectile') ? (TA.projDur || 0) + (P.raw.projDur || 0) : 0; W.projDurMore = 1; // 投射物持续时间提高%（词条、天赋、疾星冠）和符文的总增
  W.chainStep = ((TA.chainStep || 0) + (P.raw.chainStep || 0) + (P.flag.sparkHeart && has('ProjectileCanChain') ? SP.chainStepInc : 0)) / 100; // 每弹一次这一下伤害 +%
  W.meleeRe = has('Melee') ? P.flag.meleeCrown || 0 : 0; // 碎颅冠：近战命中再结算一次的几率
  if (has('ProjectileCanPierce') || W.pierce) W.pierce += TA.pierce || 0; W.afterRep = U('afterRep');
  W.kinShock = U('kinShock') / 100; W.pull = !!U('pull'); W.killInc = U('killInc'); W.burnSlow = U('burnSlow') / 100;
  if (U('shred:nuc')) W.shred = { nuc: U('shred:nuc') };
  W.debrisR = MECH.debrisR * UNIT * (1 + U('debrisPerEnergy') * P.energy / 100);
  // 局部词条
  const flat = {}, baseInc = {}; let baseAspd = 0, spinCap = 0;
  for (const x of it.affs) {
    const a = AFF_BY[x.k]; if (!a.local) continue;
    if (a.stat === 'flat') { const f = flat[a.el] || [0, 0]; flat[a.el] = [f[0] + x.v[0], f[1] + x.v[1]]; }
    else if (a.stat === 'baseInc') { for (const e of a.el === 'thermal' ? THERMAL_E : [a.el]) baseInc[e] = (baseInc[e] || 0) + x.v; }
    else if (a.stat === 'baseAspd') baseAspd += x.v;
    else if (a.stat === 'spinCap') spinCap += x.v;
  }
  if (U('kinBaseInc')) baseInc.kin = (baseInc.kin || 0) + U('kinBaseInc');
  if (U('flatPerMass')) { const f = flat.kin || [0, 0], v = U('flatPerMass') * P.mass; flat.kin = [f[0] + v, f[1] + v * 2]; }
  // 符文
  let inc = (TA['inc:all'] || 0) + (b.cont || b.aura ? (TA.dotInc || 0) + U('dotInc') : 0) + (has('AoE') ? TA.areaInc || 0 : 0) + (has('Projectile') ? TA['inc:proj'] || 0 : 0) + (has('Melee') ? TA['inc:melee'] || 0 : 0) + (isEngine ? TA['inc:engine'] || 0 : 0), aspdMore = (TM.aspd ?? 1) * (1 - U('aspdLess') / 100), rangeInc = (TA.rangeInc || 0), aoeInc = (TA.aoeInc || 0) + (P.raw.aoeInc || 0), critInc = TA.critInc || 0, critDmg = TA.critDmg || 0, projSpd = (TA.projSpd || 0) + (has('Projectile') ? P.raw.projSpd || 0 : 0), pure = false;
  const R = P.raw; inc += (has('Projectile') ? R['inc:proj'] || 0 : 0) + (has('AoE') ? R['inc:aoe'] || 0 : 0) + (has('Melee') ? R['inc:melee'] || 0 : 0) + (has('Delayed') ? R.delayInc || 0 : 0) + (has('Shield') ? R.shieldDmg || 0 : 0) + (IM.inc || 0) + (b.cont || b.aura ? IM.dotInc || 0 : 0); critInc += (R.critChance || 0) + (IM.critInc || 0); critDmg += IM.critDmg || 0; aoeInc += IM.aoeInc || 0; rangeInc += IM.rangeInc || 0; projSpd += IM.projSpd || 0; W.projDurInc += has('Projectile') ? IM.projDur || 0 : 0; aspdMore *= 1 + (IM.aspd || 0) / 100; // 标签伤害词条、头冠暴击率（§3.2）
  if (P.off && !isEngine && !it.fb) { const O = P.off; if (has('Projectile')) { W.extra += O.extra; inc += O.projInc; } inc += O.inc; aoeInc += O.aoeInc; if (has('AoE')) inc += O.areaInc; critInc += O.critInc; critDmg += O.critDmg; aspdMore *= 1 + O.aspdMore / 100; for (const e of ELEM) W.ail[e] += O.ail / 100; W.offGain = O.gain / 100; W.more *= 1 + O.more / 100; } // 副手：强化主手技能（隐性 sup）
  if (!isEngine && !it.fb) { aspdMore *= 1 + (R.offAspd || 0) / 100; W.more *= 1 + (R.offMore || 0) / 100; } // 副手词条：主手技能总增
  W.blindMore *= TM.blind ?? 1; W.radMore *= TM.rad ?? 1; W.dotMore *= TM.dot ?? 1;
  if (!b.cont && !b.aura) W.more *= TM['dmg:hit'] ?? 1;
  if (!has('AoE')) W.more *= TM['dmg:nonAoe'] ?? 1;
  if (has('Projectile')) W.more *= TM['dmg:proj'] ?? 1;
  if (P.flag.whirlHeart) { if (has('Melee') && has('AoE')) W.more *= WH.heartMore; else if (!isEngine && !has('Melee')) W.more *= WH.offhandMul; } // 旋风之心：【近战·范围】
  if (P.flag.sparkHeart) { if (has('ProjectileCanChain')) W.more *= SP.heartMore; else if (!isEngine) W.more *= SP.offhandMul; } // 织雷之心：【投射物·弹射】
  const gain = {}, rflat = {}; if (W.offGain) gain[b.el] = W.offGain; // 幽魂法源：额外获得主手元素伤害
  for (const { m, fx } of activeRunes(it.src || it, P)) {
    W.runes.push(m.mid);
    if (fx.pure) pure = true;
    if (fx.more) W.more *= fx.more;
    if (fx.aspdMore) aspdMore *= 1 + fx.aspdMore / 100;
    if (fx.dotMore && W.cont) W.dotMore *= 1 + fx.dotMore / 100;
    for (const k of ['pierce', 'chain', 'split', 'extra', 'extraChance', 'chainInc', 'splitInc', 'armorOnHit', 'dashOnHit', 'cull', 'perDashInc', 'doubleChance']) if (fx[k]) W[k] += fx[k];
    if (fx.ret) W.ret = 1;
    if (fx.knock) W.knock = 1;
    for (const k of ['pierceMore', 'debrisMore', 'blindMore', 'radMore']) if (fx[k]) W[k] *= fx[k];
    if (fx.knockMore) W.more *= fx.knockMore;
    if (fx.meleeMore) W.more *= fx.meleeMore;
    if (fx.engineMore && isEngine) W.more *= 1 + fx.engineMore / 100;
    if (fx.projInc && has('Projectile')) inc += fx.projInc;
    if (fx.areaInc && has('AoE')) inc += fx.areaInc;
    if (fx.meleeInc) inc += fx.meleeInc;
    if (fx.meleeGuard) W.meleeGuard = 1;
    if (fx.spark && b.wander) { W.spark = 1; W.sparkN = fx.sparkN; W.sparkMul = fx.sparkMul; } // 游雷符文：只对会乱窜的投射物（雷灵）生效
    if (fx.shieldThrow && b.form === 'shieldThrow') { W.shieldThrow = 1; W.chainStep += (fx.chainStepInc || 0) / 100; } // 圣盾掷符文
    if (fx.frostOrb && b.form === 'orb') { W.frostOrb = 1; W.shardMul = fx.shardMul; } // 寒魄符文：寒魄宝珠
    if (fx.meteor && b.form === 'meteor') { W.meteor = 1; W.meteorMul = fx.meteorMul; W.delay = fx.delay; W.ground = fx.ground; } // 陨火符文：坠星杖
    if (fx.frostNova && b.form === 'nova') { W.frostNova = 1; W.novaMul = fx.novaMul; W.chillStacks = fx.chillStacks; } // 霜环符文：霜钟 / 圣钟
    if (fx.whirl && b.form === 'orbit') { W.whirl = 1; W.morePer = fx.spinMore || WH.morePer; } // 每层倍率随符文等级成长
    rangeInc += fx.rangeInc || 0; aoeInc += fx.aoeInc || 0; critInc += fx.critInc || 0; critDmg += fx.critDmg || 0; projSpd += fx.projSpd || 0; W.projDurInc += fx.projDur || 0; if (fx.projDurMore) W.projDurMore *= 1 + fx.projDurMore / 100; if (fx.projMore && has('Projectile')) W.more *= fx.projMore;
    if (fx.ail) for (const e in fx.ail) W.ail[e] += fx.ail[e];
    if (fx.gain) for (const e in fx.gain) gain[e] = (gain[e] || 0) + fx.gain[e];
    if (fx.flat) for (const e in fx.flat) { const f = rflat[e] || [0, 0]; rflat[e] = [f[0] + fx.flat[e][0], f[1] + fx.flat[e][1]]; }
  }
  // 底材 + 附加 → 基础提高
  const [bmin, bmax] = it.throwDmg ? [it.throwDmg, it.throwDmg] : b.min ? weaponBase(b, q) : [0, 0];
  const ok = e => !pure || e === b.el;
  for (const e of ELEM) {
    let mn = e === b.el ? bmin : 0, mx = e === b.el ? bmax : 0;
    for (const f of [flat[e], rflat[e]]) if (f && ok(e)) { mn += f[0]; mx += f[1]; }
    const k = 1 + (baseInc[e] || 0) / 100;
    W.min[e] = mn * k; W.max[e] = mx * k;
  }
  // 独特装备的伤害转换
  const conv = (from, to, pct) => { if (!pct) return; const mn = W.min[from] * pct, mx = W.max[from] * pct; W.min[from] -= mn; W.max[from] -= mx; for (const e of to) { W.min[e] += mn / to.length; W.max[e] += mx / to.length; } };
  if (W.frostNova && b.el !== 'cold') { conv(b.el, ['cold'], 1); W.ail.cold += W.ail[b.el]; W.ail[b.el] = 0; W.el = 'cold'; } // 圣钟插霜环符文：元素改成寒霜
  if (P.flag.dmgMore) W.more *= 1 + P.flag.dmgMore / 100; // 誓约：伤害总增
  if (has('Delayed') && P.flag.delayMore) W.more *= 1 + P.flag.delayMore / 100; // 誓约：延迟类伤害总增
  if (b.form === 'meteor') { W.delayTot = (W.delay || MT.delay) + P.delayAdd; if (P.flag.delayCrown) W.more *= 1 + P.flag.delayCrown / 100 * W.delayTot / UQX.delayStep; } // 末日冠：每 0.1 秒延迟总增
  if (b.form === 'nova' && P.flag.autoNova) { W.autoNova = 1; W.more *= P.flag.autoNova; } // 永冬法阵：自动脉冲 ×(0.5–0.65)
  if (P.flag.echoShield) { if (has('Shield')) W.more *= SHT.heartMore; else if (!isEngine) W.more *= SHT.offhandMul; } // 回响圣盾：【盾】
  if (P.flag.shardChain) { if (has('Spawn')) W.more *= OB.heartMore; else if (!isEngine) W.more *= OB.offhandMul; } // 碎冰连锁：【派生】
  if (P.flag.starfall) { if (has('Delayed')) W.more *= MT.heartMore; else if (!isEngine) W.more *= MT.offhandMul; } // 星坠雨：【延迟】
  if (P.flag.shatter) { if (has('Nova') || W.frostNova) W.more *= NV.heartMore; else if (!isEngine) W.more *= NV.offhandMul; } // 碎冰：【新星】
  conv('kin', THERMAL_E, U('convKinThermal') / 100); conv('exp', ['nuc'], U('convExpNuc') / 100); conv('pla', ['nuc'], U('convPlaNuc') / 100);
  // 额外获得：按加成前总伤害的比例
  const tmin = ELEM.reduce((s, e) => s + W.min[e], 0), tmax = ELEM.reduce((s, e) => s + W.max[e], 0);
  for (const e in gain) if (ok(e)) { W.min[e] += tmin * gain[e]; W.max[e] += tmax * gain[e]; }
  // 提高（同类相加）与总增（相乘）
  if (isEngine) inc += P.dashDmg;
  const implThermal = b.thermalInc || 0;
  for (const e of ELEM) {
    const i = 1 + (inc + (TA['inc:' + e] || 0) + (e === 'nuc' && P.twin === 2 ? U('twinNuc') : 0) + (THERMAL[e] ? P.thermalInc + implThermal : 0)) / 100;
    const more = W.more * (TM['dmg:' + e] ?? 1) * (e === 'kin' ? 1 + P.mass * MECH.massKinMore : THERMAL[e] ? (1 + P.energy * MECH.energyThermalMore) * (TM['dmg:thermal'] ?? 1) : 1) * (e !== 'ele' ? TM['dmg:nonEle'] ?? 1 : 1) * (e !== 'kin' ? TM['dmg:nonKin'] ?? 1 : 1) * (e !== 'pla' ? TM['dmg:nonPla'] ?? 1 : 1) * (e !== 'cold' ? TM['dmg:nonCold'] ?? 1 : 1) * (W.cont ? W.dotMore : 1);
    W.min[e] *= i * more; W.max[e] *= i * more;
  }
  // 速度、范围、暴击
  const CT = MECH.contTicks, aps0 = b.cont ? CT : qv(b.aps || 0, q); // 持续伤害武器：数值是每秒伤害，按每秒 CT 跳结算
  W.aps = aps0 * (1 + baseAspd / 100) * (1 + (P.aspdInc + (b.aspdInc || 0)) / 100) * aspdMore * P.timeMul;
  if (W.autoNova) W.aps = 1 / UQX.autoNovaEvery; // 永冬：不再按攻速出手
  W.extra = Math.max(0, W.extra); // 誓约“投射物 −1”：最少 1 颗
  if (b.cont) { const k = (b.dpsMul || 1) / CT; for (const e of ELEM) { W.min[e] *= k; W.max[e] *= k; } W.aps = CT; W.contMul = (1 + baseAspd / 100) * (1 + P.aspdInc / 100) * aspdMore; for (const e of ELEM) { W.min[e] *= W.contMul; W.max[e] *= W.contMul; } }
  W.rng = qv(b.range || 0, q) * UNIT * (1 + rangeInc / 100) * (b.rngMul || 1); // rngMul：items.json 里按武器调的范围倍率
  W.aoeInc = aoeInc; W.projSpdInc = projSpd;
  W.projLifeMul = Math.max(0.1, 1 + W.projDurInc / 100) * W.projDurMore; // 普通投射物：只吃投射物持续时间
  W.sparkLifeMul = Math.max(0.1, 1 + (P.durInc + W.projDurInc) / 100) * W.projDurMore; // 游雷：持续时间提高 + 投射物持续时间提高（相加），再乘符文总增
  W.aoeR = qv(b.aoe || 0, q) * UNIT * (1 + aoeInc / 100);
  W.auraDps = b.aura ? qv(b.aura, q) * (1 + inc / 100) * W.more * W.dotMore : 0;
  W.spd = (b.fast ? MECH.projSpeedFast : MECH.projSpeed) * (1 + projSpd / 100) * (has('Projectile') ? TM.projSpd ?? 1 : 1) * (has('Projectile') ? Math.max(GEAR.projSlowMin, 1 - ((P.raw.projSlow || 0) + (TA.projSlow || 0) + (IM.projSlow || 0)) / 100) : 1); // 投射物速度降低（寒魄球的收益）
  if (b.form === 'shieldThrow' && P.flag.martyrThrow) W.chain *= UQX.martyrChainMul; // 殉道者之盾：弹射 ×2
  if (b.form === 'shieldThrow') { W.pierce = 1; W.thSpd = SHT.speed * W.spd / (b.fast ? MECH.projSpeedFast : MECH.projSpeed); W.thLife = SHT.life * W.sparkLifeMul; } // 圣盾掷：无限穿透
  if (b.form === 'orb') { const sk = W.spd / (b.fast ? MECH.projSpeedFast : MECH.projSpeed); W.orbSpd = OB.orbSpeed * Math.max(GEAR.projSlowMin, sk); W.orbLife = OB.orbLife * W.sparkLifeMul; W.orbEmit = OB.emit; W.orbCost = 1;
    if (U('winterHeart')) { W.winter = 1; W.orbSpd *= UQX.winterSpeed; W.orbLife *= 1 + U('winterHeart') / 100; W.orbEmit = OB.emit / UQX.winterEmit; W.orbCost = 1 + U('winterCost') / 100; } // 冬之心 // 寒魄球：速度跟投射物速度（含 projSlow），寿命同游雷
    const sh = W.frostOrb ? W.orbLife / W.orbEmit * (OB.shardDirs + P.spawnAdd) * W.shardMul * OB.estHit * (P.flag.shardChain ? 1 + OB.scN * OB.scMul * OB.estHit : 1) : 0; W.orbEst = OB.contactMul * (1 + W.orbLife / OB.contactTick * 0.3) + OB.endMul + sh; }
  W.crit = qv(b.crit || 0, q) / 100 * (1 + critInc / 100) * (TM.crit ?? 1);
  W.critMult = PLAYER.critMult + critDmg / 100;
  // 旋身：层数上限 = maxStacks + 词条
  W.stackMax = WH.maxStacks + spinCap + (P.raw.spinCap || 0);
  W.avg = ELEM.reduce((s, e) => s + (W.min[e] + W.max[e]) / 2, 0);
  const critE = 1 + Math.min(1, W.crit) * (W.critMult - 1);
  const n = W.spark ? W.sparkN + W.extra + W.extraChance : 1 + W.extra + W.extraChance; // 游雷：颗数 = sparkN + 投射物（相加）
  W.dps = b.aura ? W.auraDps : W.avg * critE * W.aps * (b.form === 'stab' ? 1 : n) * (b.pellets || 1);
  W.dps *= 1 + W.meleeRe;
  if (b.form === 'reflect') W.dps = 0;
  W.spinMax = W.whirl ? Math.pow(W.morePer, W.stackMax) : b.form === 'shieldThrow' ? SHT.estHits * (1 + W.chain * 0.5) * (1 + W.chainStep * W.chain / 2) * (P.flag.echoShield ? 1 + SHT.echoMul * 2 : 1) : b.form === 'orb' ? W.orbEst : b.form === 'meteor' ? (W.meteor ? W.meteorMul * (1 + MT.estGround) : 1) * (P.flag.starfall ? MT.sfN * MT.sfMul : 1) : W.frostNova ? W.novaMul * (P.flag.shatter ? 1 + NV.estShatter : 1) : 1; // 霜环：符文倍数 × 碎冰估算 // 旋转满层时的伤害倍数（dps 不含）
  if (W.spark) { // 游雷：每颗的倍数（颗数 sparkN + 投射物 已在 dps 里）。穿透是无限的（有就穿过所有敌人），弹射 = 碰屏幕边反弹的次数
    W.pierce += SP.basePierce; const L = SP.life * W.sparkLifeMul, v = W.spd * SP.speedMul, pr = W.pierce > 0;
    const legs = Math.min(W.chain, Math.floor(L * v / SP.estLeg)); // 寿命内飞得到几次屏幕边（约 estLeg 像素一趟），再受弹射次数限制
    let ch = 1; for (let i = 1; i <= legs; i++) ch += SP.chainMul ** i * (1 + W.chainStep * i) * (pr ? SP.estLegHit : SP.estLegHit * 0.5); // 每反弹一趟再扫一遍敌人；不穿透时打中一个就没了，回头趟只补打漏的
    const reh = pr ? 1 + SP.estRehit * Math.max(0, Math.min(L, (1 + legs) * SP.estLeg / v) - 1) : 1; // 穿透：飞在屏幕里的时间越长，隔 rehit 秒重复打中越多
    W.spinMax = W.sparkMul * ch * reh * (pr ? Math.sqrt(W.pierceMore) : 1); W.sparkLegs = legs; }
  return W;
}
let STATS = null;
// 任务中换装 / 点天赋立即生效：当前护甲、灵障、冲刺槽不超过新的上限
function refreshStats() {
  STATS = computeStats();
  if (typeof RUN !== 'undefined' && RUN) { player.life = Math.min(player.life, STATS.life); player.shield = Math.min(player.shield, STATS.shield); player.dash = Math.min(player.dash, STATS.dashMax); player.soul = Math.min(player.soul, STATS.soulMax); }
}
// 换装比较用：秒伤 + 有效生命的粗略估值
function itemValue(it) {
  const slot = slotsFor(it)[0];
  if (!slot) return 0;
  const n = computeStats({ ...S.equip, [slot]: it });
  const V = DATA.mechanics.itemValue;
  return n.dps + defEhp(n, S.depth) * V.defense + (n.engine ? n.engine.avg * V.engine : 0);
}
// 护甲减伤：护甲 ÷ (护甲 + armorK × 这一下的伤害)，有上限
const armorDr = (A, hit) => A > 0 ? Math.min(MECH.armorCap / 100, A / (A + MECH.armorK * Math.max(1e-9, hit))) : 0;
// 这一层普通怪一下的平均伤害（怪海按 horde.dmg 缩）
function typicalHit(L) { const ms = Object.values(MOBS); return ms.reduce((x, m) => x + m.dmg, 0) / ms.length * monDmg(L) * PROG.run.horde.dmg; }
// 有效生命（换装估值、模拟共用）：(生命 + 护盾 + 护盾每秒回复 × 5) ÷ (1 − 护甲减伤 − 额外减伤)
function defEhp(n, L, extraDr = 0) {
  const keep = (1 - armorDr(n.armor, typicalHit(L))) * (1 - extraDr);
  return (n.life + n.shield + n.shieldRegen * 5) / Math.max(0.05, keep);
}
