/* ---------------- 属性计算 ----------------
   原作规则：固定附加 → 提高（同类相加）→ 总增（彼此相乘）。
   武器的 flat / baseInc / baseAspd 词条是局部的，只作用于那把武器。 */
const THERMAL_E = ['exp', 'pla', 'ele'];
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
    for (const s of ['armor', 'deflect', 'dodge', 'mass', 'energy', 'time']) if (b[s]) base[s] = (base[s] || 0) + qv(b[s], it.q);
    if (b.res) base['res:' + b.el] = (base['res:' + b.el] || 0) + qv(b.res, it.q);
  }
  // 主属性
  P.mass = Math.round(((base.mass || 0) + (A.mass || 0) + (TA.mass || 0)) * Math.max(0, 1 + ((F.massInc || 0) + (TA.massInc || 0)) / 100));
  P.energy = Math.round(((base.energy || 0) + (A.energy || 0) + (TA.energy || 0)) * Math.max(0, 1 + ((F.energyInc || 0) + (TA.energyInc || 0)) / 100));
  P.time = Math.round(((base.time || 0) + (A.time || 0) + (TA.time || 0)) * Math.max(0, 1 + ((F.timeInc || 0) + (TA.timeInc || 0)) / 100));
  // 防御：护甲就是生命
  P.armor = Math.max(1, Math.round((PLAYER.armor + (base.armor || 0) + (A.armor || 0) + (TA.armor || 0)) * (1 + ((A.armorInc || 0) + (TA.armorInc || 0) + P.mass * MECH.massArmor * 100) / 100) * (TM.armor ?? 1)));
  P.deflect = Math.round(((base.deflect || 0) + (A.deflect || 0) + (F.deflect || 0) + (TA.deflect || 0)) * (1 + ((A.deflectInc || 0) + (TA.deflectInc || 0) + P.energy * MECH.energyDeflect * 100) / 100) * (TM.deflect ?? 1));
  P.deflRate = PLAYER.deflectRate * (TM.deflRate ?? 1);
  P.dodgeCap = MECH.dodgeCap + (TS.flag.dodgeCap || 0);
  P.dodge = Math.min(P.dodgeCap, Math.round((base.dodge || 0) + (A.dodge || 0) + (TA.dodge || 0)));
  P.armorRegen = (F.armorRegen || 0) / 100;
  P.maxRes = PLAYER.maxRes; P.maxResE = {}; P.res = {};
  for (const e of ELEM) {
    P.maxResE[e] = PLAYER.maxRes + (A['maxRes:' + e] || 0);
    const r = PLAYER.res + (base['res:' + e] || 0) + (A['res:' + e] || 0) + (THERMAL[e] ? A['res:thermal'] || 0 : 0) + (F.resAll || 0) + (F['res:' + e] || 0) + (TA['res:all'] || 0) + (TA['res:' + e] || 0) + (THERMAL[e] ? TA['res:thermal'] || 0 : 0);
    P.res[e] = Math.min(P.maxResE[e], Math.round(r));
  }
  // 移动：所有遁靴共享按品质的推力表
  const eng = eq.engine; const thrust = ENGINE_THRUST[eng ? eng.q : 0];
  const eb = eng ? baseOf(eng) : null;
  P.speed = (PLAYER.baseSpeed + thrust * PLAYER.thrustToSpeed) * (TM.speed ?? 1) * (1 + ((A.velocity || 0) + (TA.velocity || 0) + (eb && eb.thrustInc ? qv(eb.thrustInc, eng.q) : 0)) / 100) * (1 + P.time * MECH.timeFlow);
  P.accel = P.speed * PLAYER.accelMul * Math.max(MECH.massAccelMin, 1 + P.mass * MECH.massAccel);
  P.timeMul = 1 + P.time * MECH.timeFlow;
  // 冲刺槽
  let dashMax = PLAYER.dashMax + (A.dashMax || 0) + (TA.dashMax || 0);
  if (eng) for (const { fx } of activeRunes(eng, P)) dashMax += fx.dashMax || 0;
  P.dashMax = Math.max(1, dashMax + (TM.dashMax || 0));
  // 魂火
  P.soulMax = SOUL.base + P.energy * SOUL.perEnergy;
  P.soulRegen = (SOUL.regen + P.energy * SOUL.regenPerEnergy) * (1 + ((A.soulRegen || 0) + (TA.soulRegen || 0)) / 100);
  P.soulGainMul = 1 + ((A.soulRegen || 0) + (TA.soulRegen || 0)) / 100; // 推关里提高击杀回的灯火
  P.soulLess = Math.min(SOUL.costCap, (A.soulLess || 0) + (TA.soulLess || 0)) / 100;
  P.dashRegen = MECH.dashRegen * (1 + ((A.dashRegen || 0) + (TA.dashRegen || 0) + P.energy * MECH.energyDash * 100) / 100) + (F.dashPerSec || 0);
  P.pickup = PLAYER.pickup;
  // 全局伤害修正
  P.aspdInc = (A.aspd || 0) + (TA.aspd || 0);
  P.thermalInc = A.thermalInc || 0;
  P.dashDmg = A.dashDmg || 0;
  P.engine = eng && eb.min ? weaponStats(eng, P, true) : null;
  P.engineKind = eb ? eb.dash : null;
  P.weapons = ['wl', 'wr'].map(s => eq[s] ? weaponStats(eq[s], P) : null);
  P.twin = ['wl', 'wr'].filter(s => eq[s] && eq[s].u === 'TheTwin').length;
  if (P.twin === 2) P.weapons = ['wl', 'wr'].map(s => weaponStats(eq[s], P));
  P.dps = P.weapons.reduce((s, w) => s + (w ? w.dps : 0), 0);
  return P;
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
  for (const e of ELEM) W.ail[e] = (b['ail_' + e] || 0) + (TA['ail:' + e] || 0) + U('ail:' + e) / 100;
  // 独特装备的局部规则
  if (U('knock')) W.knock = 1;
  W.more *= 1 + U('knockMore') / 100; W.dotMore *= 1 + U('dotMore') / 100;
  W.pierce += U('pierce'); W.chain += U('chain'); W.cull += U('cull'); W.doubleChance += U('double') / 100 + (TA.double || 0) / 100;
  W.afterPct = P.flag.afterFull ? 1 : U('afterPct') ? U('afterPct') / 100 : MECH.afterPct;
  W.bossMore *= 1 + (TA.bossInc || 0) / 100;
  if (has('ProjectileCanChain') || W.chain) W.chain += TA.chain || 0;
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
  let inc = (TA['inc:all'] || 0) + (b.cont || b.aura ? (TA.dotInc || 0) + U('dotInc') : 0) + (has('AoE') ? TA.areaInc || 0 : 0) + (has('Projectile') ? TA['inc:proj'] || 0 : 0) + (has('Melee') ? TA['inc:melee'] || 0 : 0) + (isEngine ? TA['inc:engine'] || 0 : 0), aspdMore = (TM.aspd ?? 1) * (1 - U('aspdLess') / 100), rangeInc = (TA.rangeInc || 0), aoeInc = TA.aoeInc || 0, critInc = TA.critInc || 0, critDmg = TA.critDmg || 0, projSpd = TA.projSpd || 0, pure = false;
  W.blindMore *= TM.blind ?? 1; W.radMore *= TM.rad ?? 1; W.dotMore *= TM.dot ?? 1;
  if (!b.cont && !b.aura) W.more *= TM['dmg:hit'] ?? 1;
  if (!has('AoE')) W.more *= TM['dmg:nonAoe'] ?? 1;
  if (P.flag.whirlHeart) { if (b.form === 'orbit') W.more *= WH.heartMore; else if (!isEngine && !has('Melee')) W.more *= WH.offhandMul; } // 旋风之心
  const gain = {}, rflat = {};
  for (const { m, fx } of activeRunes(it, P)) {
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
    if (fx.whirl && b.form === 'orbit') { W.whirl = 1; W.morePer = fx.spinMore || WH.morePer; } // 每层倍率随符文等级成长
    rangeInc += fx.rangeInc || 0; aoeInc += fx.aoeInc || 0; critInc += fx.critInc || 0; critDmg += fx.critDmg || 0; projSpd += fx.projSpd || 0;
    if (fx.ail) for (const e in fx.ail) W.ail[e] += fx.ail[e];
    if (fx.gain) for (const e in fx.gain) gain[e] = (gain[e] || 0) + fx.gain[e];
    if (fx.flat) for (const e in fx.flat) { const f = rflat[e] || [0, 0]; rflat[e] = [f[0] + fx.flat[e][0], f[1] + fx.flat[e][1]]; }
  }
  // 底材 + 附加 → 基础提高
  const [bmin, bmax] = b.min ? weaponBase(b, q) : [0, 0];
  const ok = e => !pure || e === b.el;
  for (const e of ELEM) {
    let mn = e === b.el ? bmin : 0, mx = e === b.el ? bmax : 0;
    for (const f of [flat[e], rflat[e]]) if (f && ok(e)) { mn += f[0]; mx += f[1]; }
    const k = 1 + (baseInc[e] || 0) / 100;
    W.min[e] = mn * k; W.max[e] = mx * k;
  }
  // 独特装备的伤害转换
  const conv = (from, to, pct) => { if (!pct) return; const mn = W.min[from] * pct, mx = W.max[from] * pct; W.min[from] -= mn; W.max[from] -= mx; for (const e of to) { W.min[e] += mn / to.length; W.max[e] += mx / to.length; } };
  conv('kin', THERMAL_E, U('convKinThermal') / 100); conv('exp', ['nuc'], U('convExpNuc') / 100); conv('pla', ['nuc'], U('convPlaNuc') / 100);
  // 额外获得：按加成前总伤害的比例
  const tmin = ELEM.reduce((s, e) => s + W.min[e], 0), tmax = ELEM.reduce((s, e) => s + W.max[e], 0);
  for (const e in gain) if (ok(e)) { W.min[e] += tmin * gain[e]; W.max[e] += tmax * gain[e]; }
  // 提高（同类相加）与总增（相乘）
  if (isEngine) inc += P.dashDmg;
  const implThermal = b.thermalInc || 0;
  for (const e of ELEM) {
    const i = 1 + (inc + (TA['inc:' + e] || 0) + (e === 'nuc' && P.twin === 2 ? U('twinNuc') : 0) + (THERMAL[e] ? P.thermalInc + implThermal : 0)) / 100;
    const more = W.more * (TM['dmg:' + e] ?? 1) * (e === 'kin' ? 1 + P.mass * MECH.massKinMore : THERMAL[e] ? (1 + P.energy * MECH.energyThermalMore) * (TM['dmg:thermal'] ?? 1) : 1) * (e !== 'ele' ? TM['dmg:nonEle'] ?? 1 : 1) * (e !== 'kin' ? TM['dmg:nonKin'] ?? 1 : 1) * (e !== 'pla' ? TM['dmg:nonPla'] ?? 1 : 1) * (W.cont ? W.dotMore : 1);
    W.min[e] *= i * more; W.max[e] *= i * more;
  }
  // 速度、范围、暴击
  const CT = MECH.contTicks, aps0 = b.cont ? CT : qv(b.aps || 0, q); // 持续伤害武器：数值是每秒伤害，按每秒 CT 跳结算
  W.aps = aps0 * (1 + baseAspd / 100) * (1 + (P.aspdInc + (b.aspdInc || 0)) / 100) * aspdMore * P.timeMul;
  if (b.cont) { const k = (b.dpsMul || 1) / CT; for (const e of ELEM) { W.min[e] *= k; W.max[e] *= k; } W.aps = CT; W.contMul = (1 + baseAspd / 100) * (1 + P.aspdInc / 100) * aspdMore; for (const e of ELEM) { W.min[e] *= W.contMul; W.max[e] *= W.contMul; } }
  W.rng = qv(b.range || 0, q) * UNIT * (1 + rangeInc / 100);
  W.aoeR = qv(b.aoe || 0, q) * UNIT * (1 + aoeInc / 100);
  W.auraDps = b.aura ? qv(b.aura, q) * (1 + inc / 100) * W.more * W.dotMore : 0;
  W.spd = (b.fast ? MECH.projSpeedFast : MECH.projSpeed) * (1 + projSpd / 100);
  W.crit = qv(b.crit || 0, q) / 100 * (1 + critInc / 100) * (TM.crit ?? 1);
  W.critMult = PLAYER.critMult + critDmg / 100;
  // 旋身：层数上限 = maxStacks + 词条
  W.stackMax = WH.maxStacks + spinCap + (P.raw.spinCap || 0);
  W.avg = ELEM.reduce((s, e) => s + (W.min[e] + W.max[e]) / 2, 0);
  const critE = 1 + Math.min(1, W.crit) * (W.critMult - 1);
  const n = 1 + W.extra + W.extraChance;
  W.dps = b.aura ? W.auraDps : W.avg * critE * W.aps * (b.form === 'stab' ? 1 : n) * (b.pellets || 1);
  if (b.form === 'reflect') W.dps = 0;
  W.spinMax = W.whirl ? Math.pow(W.morePer, W.stackMax) : 1; // 旋转满层时的伤害倍数（dps 不含）
  return W;
}
let STATS = null;
// 任务中换装 / 点天赋立即生效：当前护甲、灵障、冲刺槽不超过新的上限
function refreshStats() {
  STATS = computeStats();
  if (typeof RUN !== 'undefined' && RUN) { player.armor = Math.min(player.armor, STATS.armor); player.deflect = Math.min(player.deflect, STATS.deflect); player.dash = Math.min(player.dash, STATS.dashMax); player.soul = Math.min(player.soul, STATS.soulMax); }
}
// 换装比较用：秒伤 + 有效生命的粗略估值
function itemValue(it) {
  const slot = slotsFor(it)[0];
  if (!slot) return 0;
  const n = computeStats({ ...S.equip, [slot]: it });
  const V = DATA.mechanics.itemValue;
  return n.dps + (n.armor + n.deflect) * V.defense + (n.engine ? n.engine.avg * V.engine : 0);
}
