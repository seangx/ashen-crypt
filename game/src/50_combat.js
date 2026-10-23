/* =========================================================
   战斗逻辑（与渲染分离；G.fx = false 时可无头模拟）
   ========================================================= */
let RUN = null;
let mobs = [], projs = [], drops = [], fxq = [], zones = [];
const mouse = { x: 240, y: 150, on: false, touch: false };
const F = { x0: 10, x1: 470, y0: 62, y1: 226 };
const player = { x: 240, y: 150, vx: 0, vy: 0, life: 1, shield: 0, dash: 1, dashT: 0, dvx: 0, dvy: 0, hurtT: 0, face: 1, wcd: [0, 0], orbitA: 0, guardT: 0, spin: [{ n: 0, g: 0, idle: 9 }, { n: 0, g: 0, idle: 9 }], swing: [0, 0], devilT: 0, soul: 100, soulEmpty: 0, walk: 0, lx: 240, ly: 150 };
const fx = o => { if (G.fx) fxq.push(o); };
const MINE_MAX = MECH.mineMax;
const RL = DATA.rules, PAT = PROG.bossPatterns, ELITE = PROG.elite;

function resetPlayer() {
  player.life = STATS.life; player.shield = STATS.shield; player.dash = STATS.dashMax; player.hurtT = 0; player.dashT = 0;
}
// 灯火下行的出发层：没锁层时从最深层往回退 startBack 层出发，最深层是一趟的高潮
const descentStart = () => S.auto.lock ? S.depth : Math.max(1, Math.min(S.depth, S.maxDepth) - SOUL.startBack);
function startRun(L) {
  if (LAD.pending) { const N = LAD.pending; LAD.pending = 0; return startLadder(N); }
  if (L == null) L = descentStart();
  refreshStats();
  const map = S.mapArmed && S.maps.find(m => m.id === S.mapArmed);
  if (map) { S.maps = S.maps.filter(m => m !== map); S.mapArmed = null; }
  LX = lootFx(map); const mob = LX.mob;
  RUN = { dmg: { whirl: 0, devil: 0, spark: 0, fork: 0 }, mode: 'push', L: L + LX.lvl, base: L, map, mob, bossD: bossFor(L + LX.lvl), kills: 0, prog: 0, dens: 1, eliteMul: 1, need: Math.round(killNeed(L) * (1 + (mob.need || 0) / 100)), boss: null, t: 0, spawnT: PROG.run.spawnFirst, ending: 0, next: 0, result: null, descent: { from: L, floors: 0, prevMax: S.maxDepth, minHp: 1 }, gain: { items: [], shards: 0, shardK: {}, glyphs: {}, mods: [], maps: [], xp: 0, lv: 0, boon: null } };
  arenaReset();
}
/* 灯火下行：守关 Boss 倒下后直接进入下一层（护甲、灯火、旋转层数都带着走） */
function nextFloor() {
  RUN.base++; RUN.L++; RUN.bossD = bossFor(RUN.L); RUN.descent.minHp = 1; RUN.prog = 0; RUN.boss = null; RUN.next = 0;
  RUN.need = Math.round(killNeed(RUN.base) * (1 + (RUN.mob.need || 0) / 100)); RUN.spawnT = PROG.run.spawnFirst;
  mobs = []; projs = []; zones = []; drops = [];
  if (G.ui) G.ui.banner(`第 ${RUN.base} 层`, COL.emberHi);
}
// 阵亡：这一趟拾取的装备、符文、碎片每件按 soul.deathKeep 的几率保留
function deathLoss(r) {
  const keep = () => rnd() * 100 < SOUL.deathKeep, lost = { items: 0, mods: 0, shards: 0 }, g = r.gain;
  for (const it of g.items) if (S.stash.includes(it) && !keep()) { removeItem(it); lost.items++; }
  for (const m of g.mods) if (S.mods.includes(m) && !keep()) { S.mods = S.mods.filter(x => x !== m); lost.mods++; }
  for (const k in g.shardK) for (let i = 0; i < g.shardK[k]; i++) if (!keep() && (S.shards[k] || 0) > 0) { S.shards[k]--; lost.shards++; }
  r.lost = lost;
}
function arenaReset() {
  mobs = []; projs = []; drops = []; zones = [];
  player.x = 240; player.y = 150; player.vx = player.vy = 0; player.wcd = [0, 0];
  player.spin.forEach(s => { s.n = 0; s.g = 0; s.idle = 9; }); player.swing = [0, 0]; player.devilT = 0; player.soul = STATS.soulMax; player.soulEmpty = 0; player.walk = 0; player.lx = player.x; player.ly = player.y;
  resetPlayer();
  sfx('start');
}
const fieldActive = () => RUN && (mouse.on || mouse.touch) && !(G.ui && G.ui.winId) && mouse.y > TOP_H && mouse.y < BOT_Y;

/* ---------- 敌人 ---------- */
function pickMob(L) { const pool = Object.entries(MOBS).filter(([, m]) => L >= (m.minL || 1)); return wpick(pool, ([, m]) => m.w)[0]; }
function spawnMob(type, o = {}) {
  const d = o.d || MOBS[type] || BOSS; const L = RUN.L; const mx = RUN.mob || {};
  const side = ri(0, 2);
  const x = o.x ?? (side === 0 ? rf(F.x0, F.x1) : side === 1 ? F.x0 : F.x1), y = o.y ?? (side === 0 ? F.y0 : rf(F.y0, F.y1));
  const elite = !o.boss && rnd() < ELITE.chance * (RUN.eliteMul || 1) * (1 + (mx.elite || 0) / 100);
  const HD = o.boss ? null : PROG.run.horde; // 怪海：普通怪更多更脆
  const hp = d.hp * monHp(L) * (elite ? ELITE.hp : 1) * (1 + (mx.mobHp || 0) / 100) * (HD ? HD.hp : 1);
  const m = { type, d, x, y, hp, max: hp, dmg: d.dmg * monDmg(L) * (elite ? ELITE.dmg : 1) * (1 + (mx.mobDmg || 0) / 100) * (HD ? HD.dmg : 1), spd: d.spd * (elite ? ELITE.spd : 1) * (1 + (mx.mobSpd || 0) / 100), size: d.size + (elite ? ELITE.size : 0), res: Object.fromEntries(ELEM.map(e => [e, ((d.res || {})[e] || 0) + (mx.mobRes || 0)])), el: d.el,
    elite, boss: !!o.boss, rise: o.boss ? 0.8 : 0.4, atkCd: 1, cd: rf(0.5, d.cd || 2), fl: 0, shock: 0, shockT: 0, blindT: 0, blindK: 0, burn: 0, burnT: 0, rad: [], after: [], t: 0, face: 1, vx: 0, vy: 0, kx: 0, ky: 0, ramT: 0, fat: 0 };
  mobs.push(m); return m;
}
function spawnBoss() {
  const B = RUN.bossD;
  const m = spawnMob('boss_' + B.id, { boss: true, d: B, x: 240, y: F.y0 + 10 });
  m.hp = m.max = B.hp * monHp(RUN.L) * (1 + ((RUN.mob.mobHp || 0) + (RUN.mob.bossHp || 0)) / 100); m.dmg = B.dmg * monDmg(RUN.L) * (1 + (RUN.mob.mobDmg || 0) / 100);
  RUN.boss = m; sfx('boss');
  if (G.ui) G.ui.banner(`${B.n} 现身`);
}

/* ---------- 天赋规则 ---------- */
// 规则参数在 data/rules.json（百分比按百分数写）
const isStill = () => Math.hypot(player.vx, player.vy) < RL.still.speed && player.dashT <= 0;
function ruleMul(m) {
  const FL = STATS.flag; let k = 1;
  if (FL.exec) k *= m.hp < m.max * RL.exec.lowHp / 100 ? 1 + RL.exec.lowMore / 100 : m.hp >= m.max ? 1 - RL.exec.fullLess / 100 : 1;
  if (FL.still && isStill()) k *= 1 + RL.still.dmgMore / 100;
  if (FL.kite) k *= isStill() ? 1 - RL.kite.stillLess / 100 : 1 + RL.kite.moveMore / 100;
  if (FL.martyr && STATS.shield > 0 && player.shield >= STATS.shield * 0.99) k *= 1 + RL.martyr.dmgMore / 100;
  if (FL.judge && m.blindT > 0) k *= 1 + RL.judge.more / 100;
  if (FL.afterDash && player.adT > 0) k *= 1 + RL.afterDash.more / 100;
  return k;
}
function deathRules(m) {
  const FL = STATS.flag; const near = (r, n) => mobs.filter(x => x !== m && !x.dead && dist2(x, m) < r * r).sort((a, b) => dist2(a, m) - dist2(b, m)).slice(0, n);
  if (FL.shockSpread && m.shock > 0) for (const x of near(RL.shockSpread.r, RL.shockSpread.n)) { x.shock = Math.max(x.shock, m.shock); x.shockT = MECH.shockDur; fx({ t: 'bolt', x1: m.x, y1: m.y - 5, x2: x.x, y2: x.y - 5, el: 'ele' }); }
  if (FL.contagion && m.rad.length) for (const x of near(RL.contagion.r, RL.contagion.n)) x.rad.push(...m.rad.map(r => ({ ...r })));
  if (FL.deathBoom && !m.boss) { const R = RL.deathBoom; fx({ t: 'boom', x: m.x, y: m.y - 4, r: R.r, el: 'exp' }); for (const x of near(R.r, 99)) damage(x, mitigate(x, 'exp', m.max * R.pct / 100), 'exp', false, true); }
}

/* ---------- 命中与伤害 ---------- */
// 感电：每层全部抗性 -1%，闪电抗性再 -2%
const shockRes = (m, e) => m.shock * (MECH.shockAll + (e === 'ele' ? MECH.shockEle : 0)) * (STATS.shockMul || 1);
// Boss 疲惫：开打 5 秒后每秒一层，每层承受伤害 ×1.04，最多 60 层
const fatigue = m => m.boss ? Math.pow(MECH.fatigueStep, m.fat) : 1;
function mitigate(m, e, d) { return d * (1 - ((m.res[e] || 0) - shockRes(m, e) - (m.shredT > 0 ? m.shred[e] || 0 : 0) - (STATS.flag.corrode && m.rad.length ? RL.corrode.res : 0)) / 100) * fatigue(m); }
// 暴击率超过 100% 时可以多重暴击，每多一重几率 ×0.8
function rollCrit(W) {
  let c = W.crit, mult = 1;
  const decay = STATS.flag.multicrit ? 1 : MECH.multicritDecay;
  let first = true; // 幸运一击：第一次判定掷两次取好的
  const roll = () => { const r = first && STATS.flag.luckyCrit ? Math.min(rnd(), rnd()) : rnd(); first = false; return r; };
  while (c > 0 && roll() < c && mult < 1e6) { mult *= W.critMult; c = (c - 1) * decay; }
  return mult;
}
// o: { mul, noDebris, after }
function hitMob(m, W, o = {}) {
  if (m.dead) return 0;
  const cm = W.cont ? 1 : rollCrit(W); const crit = cm > 1;
  let mul = (o.mul || 1) * cm;
  if (m.boss) mul *= W.bossMore;
  if (W.perDashInc) mul *= 1 + W.perDashInc * Math.floor(player.dash);
  if (W.doubleChance && rnd() < W.doubleChance) mul *= 2;
  if (W.killInc && RUN) mul *= 1 + Math.min(RL.killInc.max, W.killInc * RUN.kills) / 100;
  mul *= ruleMul(m);
  if (W.shred) { m.shred = W.shred; m.shredT = MECH.shredTime; }
  const by = {}; let total = 0, top = W.el, topv = 0;
  for (const e of ELEM) {
    if (W.max[e] <= 0) continue;
    let d = rf(W.min[e], W.max[e]) * mul; if (e === 'ele') d = Math.max(1, d);
    d = mitigate(m, e, d); by[e] = d; total += d; if (d > topv) { topv = d; top = e; }
  }
  damage(m, total, top, crit, W.cont);
  if (W.cull && !m.dead && !m.boss && m.hp / m.max * 100 < W.cull) kill(m);
  if (STATS.flag.arc && !o.arc && rnd() < RL.arc.chance / 100 * (W.cont ? 1 / W.aps : 1)) { const hit = new Set([m]); for (let k = 0; k < RL.arc.n; k++) { const n = nearest(m.x, m.y - 4, RL.arc.r, hit); if (!n) break; hit.add(n); fx({ t: 'bolt', x1: m.x, y1: m.y - 5, x2: n.x, y2: n.y - 5, el: 'ele' }); hitMob(n, W, { mul: RL.arc.dmg / 100, arc: 1, noDebris: o.noDebris }); } }
  const aoh = W.armorOnHit + (STATS.raw.armorOnHit || 0); // 吸髓符文 + 装备词条 + 旋身符文：命中回生命（吸血）
  if (aoh) player.life = Math.min(STATS.life, player.life + leech(W, aoh));
  if (W.dashOnHit) player.dash = Math.min(STATS.dashMax, player.dash + W.dashOnHit);
  if (W.meleeGuard) player.guardT = MECH.meleeGuardTime;
  if (W.pull && !m.boss) { const dx = player.x - m.x, dy = player.y - m.y, d = Math.hypot(dx, dy) || 1; m.kx += dx / d * MECH.pull; m.ky += dy / d * MECH.pull; }
  else if (W.knock && !m.boss) { const dx = m.x - player.x, dy = m.y - player.y, d = Math.hypot(dx, dy) || 1; m.kx += dx / d * MECH.knockback; m.ky += dy / d * MECH.knockback; }
  const tick = W.cont ? 1 / W.aps : 1;
  for (const e in by) if (W.ail[e] && rnd() < W.ail[e] * tick) ailment(m, e, by[e], W, o);
  if (W.kinShock && by.kin && rnd() < W.kinShock * tick) ailment(m, 'ele', by.kin, W, o);
  if (by.exp) { m.burn += by.exp * MECH.burnFromFire; if (W.burnSlow) m.burnSlow = W.burnSlow; } // 火焰伤害都会累积灼烧
  if (W.meleeRe && !o.re && !m.dead && rnd() < W.meleeRe) total += hitMob(m, W, { ...o, re: 1 }); // 碎颅冠：近战命中再结算一次
  return total;
}
// 雷冠：弹射打中的敌人感电（至少 1 层）
function shockOn(m) { m.shock = Math.max(m.shock, 1); m.shockT = MECH.shockDur; }
// 风暴之眼：单次的范围命中把命中点 pullR 倍半径内的普通怪往命中点拉一下
function aoePull(x, y, r) {
  if (!STATS.flag.areaEye) return; const E = RL.areaEye, pr = r * E.pullR, k = E.pull * 0.3;
  for (const m of mobs) if (!m.dead && !m.boss && m.rise <= 0.2) { const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy); if (d > 4 && d < pr) { const s = Math.min(k, d - 4); m.x += dx / d * s; m.y += dy / d * s; } }
}
function ailment(m, e, d, W, o) {
  switch (e) {
    case 'kin': { if (o.noDebris) break; // 碎骨：周围一圈，命中伤害的 20%
      const r = W.debrisR || MECH.debrisR * UNIT; if (mobs.length <= 15 || rnd() < 0.15) fx({ t: 'ring', x: m.x, y: m.y - 4, r, el: 'kin' }); // 怪海里碎骨圈只偶尔画
      for (const n of mobs) if (n !== m && !n.dead && dist2(n, m) < r * r) { damage(n, mitigate(n, 'kin', d * MECH.debrisPct * W.debrisMore), 'kin', false, true); if (n.dead && STATS.flag.debrisChain && (o.depth || 0) < RL.debrisChain.depth) ailment(n, 'kin', d, W, { ...o, depth: (o.depth || 0) + 1 }); }
      break; }
    case 'exp': { const k = W.afterPct || MECH.afterPct; m.after.push({ n: MECH.afterRepeats + (STATS.afterRep || 0) + (W.afterRep || 0), t: MECH.afterTick, d: d * k, k }); break; } // 余震
    case 'ele': m.shock = Math.min(MECH.shockMax, m.shock + (o.spark && STATS.flag.sparkHeart ? SP.shockGain : 1)); // 织雷之心：游雷一次叠两层
      m.shockT = MECH.shockDur; break;
    case 'pla': m.blindT = MECH.blindDur; m.blindK = Math.min(MECH.blindMax, MECH.blindLess * W.blindMore); break;
    case 'nuc': m.rad.push({ dps: d * MECH.radPct * W.radMore * W.dotMore / MECH.radDur, t: MECH.radDur }); break;
  }
}
function damage(m, amt, el, crit, small) {
  if (m.dead || amt <= 0) return;
  const crowd = mobs.length > 15 && !m.boss && !m.elite; // 怪海里的普通怪：不白闪、不飘数字，只留刀痕和击退
  m.hp -= amt; if (!small && !crowd && !(m.flCd > 0)) { m.fl = 0.06; m.flCd = 0.45; } // 受击白闪限频：连续挨打不会一直发白
  if ((!small || amt > m.max * 0.04) && !crowd) fx({ t: 'num', x: m.x, y: m.y - m.size * 2, v: amt, el, crit, small }); 
  if (G.fx && !small) { m.kbT = 0.12; m.kbA = Math.atan2(m.y - player.y, m.x - player.x); if ((crit && !crowd) || m.boss || m.elite) fx({ t: 'impact', x: m.x, y: m.y - m.size, el, crit, big: m.boss || m.elite }); } // 只影响画面：击退偏移、火花
  if (m.hp <= 0) kill(m);
}
function kill(m) {
  if (m.dead) return;
  m.dead = true; S.stats.kills++;
  fx({ t: 'die', x: m.x, y: m.y, boss: m.boss, elite: m.elite, type: m.type });
  sfx(m.boss ? 'bossdie' : 'kill');
  if (!RUN) return;
  RUN.kills++;
  const hk = m.boss ? 1 : 1 / PROG.run.horde.count; // 怪海：每只的推进、经验、灯火、掉落按数量摊薄
  if (!m.boss) RUN.prog += (RUN.mode === 'ladder' ? (m.elite ? LD.run.eliteP : LD.run.normalP) : 1) * hk;
  if (RUN.mode !== 'ladder') player.soul = Math.min(STATS.soulMax, player.soul + SOUL.onKill[m.boss ? 'boss' : m.elite ? 'elite' : 'normal'] * hk * STATS.soulGainMul * (RUN.base < RUN.descent.prevMax ? SOUL.revisitKillMul : 1)); // 灯火：击杀回
  deathRules(m);
  const mm = manualMul();
  const xp = m.d.xp * (m.elite ? ELITE.xp : 1) * monXp(RUN.L) * (1 + LX.xp / 100) * mm * hk;
  const lad = RUN.mode === 'ladder';
  if (!lad || LD.run.xp) { gainXp(xp); modXp(xp); }
  const L = RUN.L;
  const mult = (m.boss || (lad && !LD.run.mobDrops) ? 0 : m.elite ? DROP.eliteMul : 1) * mm * hk; // 天梯：怪物不掉落，只有通关宝箱
  const shardDrop = () => { const k = rollShard(L); dropThing(m, { kind: 'shard', k }); if (rnd() * 100 < LX.twin) dropThing(m, { kind: 'shard', k }); };
  if (rnd() < DROP.item * mult * (1 + LX.iiq / 100)) dropThing(m, { kind: 'item', item: rollItem(L, LX.iir) });
  if (rnd() < DROP.shard * mult * (1 + LX.dice / 100)) shardDrop();
  if (rnd() < DROP.mod * mult * (1 + LX.runes / 100)) dropThing(m, { kind: 'mod', mod: rollModDrop(L) });
  if (rnd() < DROP.map * mult * (1 + LX.mapDrop / 100)) dropThing(m, { kind: 'map', map: rollMapDrop(L) });
  if (m.boss) player.life = Math.min(STATS.life, player.life + STATS.life * MECH.bossKillLife / 100); // 打掉守关 Boss 回一截生命
  if (m.boss && RUN.mode === 'ladder') ladderWin(m);
  else if (m.boss) {
    const BL = PROG.bossLoot;
    const n = Math.round(BL.items * (1 + LX.iiq / 100)) + (rnd() * 100 < LX.chest ? ATLAS.marble.chestItems : 0);
    for (let i = 0; i < n; i++) dropThing(m, { kind: 'item', item: rollItem(L + BL.ilvlBonus, BL.rarityBonus + LX.iir, true) });
    for (let i = 0; i < BL.shards; i++) shardDrop();
    for (let i = 0; i < BL.runes; i++) dropThing(m, { kind: 'mod', mod: rollModDrop(L + BL.runeIlvlBonus) });
    if (rnd() < DROP.mapBoss * (1 + LX.mapDrop / 100)) dropThing(m, { kind: 'map', map: rollMapDrop(L) });
    S.stats.bosses++; RUN.descent.floors++; (RUN.descent.mins = RUN.descent.mins || []).push([RUN.base, Math.round(RUN.descent.minHp * 100), RUN.base >= RUN.descent.prevMax - 1]); // 每层最低血量（模拟用）
    if (RUN.base >= S.maxDepth && RUN.base < PROG.run.maxDepth) S.maxDepth = RUN.base + 1;
    if (RUN.base >= PROG.run.maxDepth) { RUN.result = 'win'; RUN.ending = 1.6; }
    else if (RUN.base >= RUN.descent.prevMax - 1 && RUN.descent.minHp * 100 < (meleeW() && SOUL.returnHpMelee != null ? SOUL.returnHpMelee : SOUL.returnHp)) { RUN.result = 'retreat'; RUN.ending = 1.6; } // 最深层附近打得太险：见好就收
    else RUN.next = SOUL.nextFloorDelay; // 没到底就接着往下走
    const bid = RUN.bossD.id; const k = S.bossKills[bid] = (S.bossKills[bid] || 0) + 1; const bi = BOON_AT.indexOf(k);
    if (bi >= 0) RUN.gain.boon = { b: bid, i: bi };
    if (bi >= 0) refreshStats();
    if (G.ui) G.ui.banner(bi >= 0 ? `获得祝福：${BOONS[bid][bi].n}` : RUN.result === 'retreat' ? '险胜 · 撤回' : `第 ${RUN.base} 层通过`);
  }
}
function dropThing(m, o) { drops.push({ ...o, x: m.x + rf(-6, 6), y: m.y + rf(-4, 4), z: 6, vz: rf(50, 80), vx: rf(-30, 30), vy: rf(-14, 14), age: 0 }); if ((o.kind === 'item' && o.item.rar >= 2) || o.kind === 'glyph') sfx('rare'); }
function collect(dp) {
  const g = RUN && RUN.gain;
  if (dp.kind === 'item') { addItem(dp.item); g && g.items.push(dp.item); if (G.ui) G.ui.feedItem(dp.item); }
  else if (dp.kind === 'shard') { S.shards[dp.k] = (S.shards[dp.k] || 0) + 1; if (g) { g.shards++; const K = g.shardK || (g.shardK = {}); K[dp.k] = (K[dp.k] || 0) + 1; } }
  else if (dp.kind === 'glyph') { S.glyphs[dp.id]++; if (g) g.glyphs[dp.id] = (g.glyphs[dp.id] || 0) + 1; if (G.ui) G.ui.feed(GLYPH_BY[dp.id].n, GLYPH_BY[dp.id].c, 'glyph_' + dp.id); }
  else if (dp.kind === 'map') { S.maps.push(dp.map); g && g.maps.push(dp.map); if (G.ui) G.ui.feed(mapName(dp.map), RCOL[dp.map.rar], 'i_a_map'); }
  else if (dp.kind === 'mod') { S.mods.push(dp.mod); g && g.mods.push(dp.mod); if (G.ui) G.ui.feed(MOD_BY[dp.mod.mid].n, COL.cyan, 'mod_' + dp.mod.mid); }
  fx({ t: 'pick', x: dp.x, y: dp.y, kind: dp.kind });
  sfx(dp.kind === 'shard' || dp.kind === 'glyph' ? 'die' : 'pick');
}
function gainXp(x) {
  S.xp += x; if (RUN) RUN.gain.xp += x;
  while (S.xp >= xpNeed(S.level)) { S.xp -= xpNeed(S.level); S.level++; if (RUN) RUN.gain.lv++; const before = STATS.life; refreshStats(); player.life += STATS.life - before; // 升级：生命上限变高，多出来的直接补上
  fx({ t: 'text', x: player.x, y: player.y - 18, s: '升级 · 天赋点 +1', c: COL.xp }); sfx('level'); }
}
// 法阵的升级槽：插在里面的符文吃击杀经验（累计门槛）
function modXp(x) {
  const hub = S.equip.hub; if (!hub) return;
  let up = false;
  for (const m of hub.mods) {
    if (!m || m.lvl >= MOD_MAX) continue;
    m.xp += x; const L = modLevelOf(m.xp);
    if (L > m.lvl) { m.lvl = L; up = true; if (G.ui) G.ui.feed(`${MOD_BY[m.mid].n} ${m.lvl} 级`, COL.cyan, 'mod_' + m.mid); }
  }
  if (up) refreshStats();
}

/* ---------- 玩家受伤：闪避 → 抗性 → 护甲减伤 → 流派减伤 → 护盾 → 生命 ---------- */
function hurtPlayer(d, el) {
  if (!RUN || RUN.ending || player.dashT > 0 || player.hurtT > 0) return;
  if (rnd() * 100 < STATS.dodge) {
    fx({ t: 'text', x: player.x, y: player.y - 16, s: '闪避', c: COL.dim });
    if (STATS.flag.dodgeSpikes) for (const m of mobs) if (!m.dead && dist2(m, player) < RL.dodgeSpikes.r ** 2) { damage(m, mitigate(m, 'kin', STATS.shield * (RL.dodgeSpikes.shieldPct ?? RL.dodgeSpikes.armorPct) / 100), 'kin', false); fx({ t: 'spike', x: m.x, y: m.y, el: 'kin' }); }
    return;
  }
  const FL = STATS.flag;
  if (FL.still && isStill()) d *= 1 - RL.still.takenLess / 100;
  if (FL.rotFlesh) { const R = RL.rotFlesh; let n = 0; for (const x of mobs) if (!x.dead && x.rad.length && dist2(x, player) < R.r * R.r) n++; d *= 1 - Math.min(R.max, n * R.per) / 100; }
  const tk = FL.takenKin || 0;
  d = d * (1 - tk) * (1 - STATS.res[el] / 100) + d * tk * (1 - STATS.res.kin / 100);
  d *= 1 - armorDr(STATS.armor, d); // 护甲：对碎伤减得多，对重击减得少
  if (player.guardT > 0) d *= 1 - MECH.meleeGuardLess;
  d *= 1 - Math.max(0, ...STATS.weapons.map((W, i) => W && W.whirl ? Math.min(WH.drCap, WH.drPerStack * player.spin[i].n) : 0)) / 100; // 旋身：每层当前旋转减伤，有上限
  if (player.shield > 0) { const a = Math.min(player.shield, d); player.shield -= a; d -= a; fx({ t: 'shield', x: player.x, y: player.y }); }
  if (d > 0 && FL.absorb) player.shield = Math.min(STATS.shield, player.shield + d * RL.absorb.pct / 100); // 圣盾：扣到生命的一部分转成护盾
  if (FL.thorns) for (const m of mobs) if (!m.dead && dist2(m, player) < RL.thorns.r ** 2) { damage(m, mitigate(m, 'kin', STATS.armor * RL.thorns.armorPct / 100), 'kin', false); fx({ t: 'spike', x: m.x, y: m.y, el: 'kin' }); }
  if (d > 0) { player.life -= d; player.hurtT = MECH.hurtInvuln; fx({ t: 'num', x: player.x, y: player.y - 18, v: d, el, hurt: true }); sfx('hurt'); if (G.world && d > STATS.life * 0.08) G.world.shake(70, 0.003); }
  // 荆棘甲：受击时伤害周围
  for (const W of STATS.weapons) if (W && W.form === 'reflect') { fx({ t: 'ring', x: player.x, y: player.y - 4, r: W.aoeR, el: W.el }); for (const m of mobs) if (!m.dead && dist2(m, player) < (W.aoeR + m.size) ** 2) hitMob(m, W); }
  if (player.life <= 0) { player.life = 0; RUN.result = 'dead'; RUN.ending = 1.6; S.stats.deaths++; sfx('out'); if (G.ui) G.ui.banner('灯火熄灭'); }
}

/* ---------- 冲刺（遁靴：冲刺即技能） ---------- */
// to：冲向哪里（默认鼠标）；byAuto：自动战斗发起的，打开窗口时也能冲
function tryDash(to = mouse, byAuto = false) {
  if (player.dash < 1 || player.dashT > 0 || (!byAuto && G.ui && G.ui.winId)) return;
  if (!byAuto && RUN) autoTouch(-1);
  let dx = to.x - player.x, dy = to.y - player.y; let dl = Math.hypot(dx, dy);
  if (dl < 4) { dx = player.vx; dy = player.vy; dl = Math.hypot(dx, dy) || 1; }
  if (dl < 1) { dx = player.face; dy = 0; dl = 1; }
  const kind = STATS.engineKind, E = STATS.engine;
  player.dash -= 1; sfx('dash');
  if (STATS.flag.afterDash) player.adT = RL.afterDash.dur;
  if (STATS.flag.timeStop && RUN) { const R = RL.timeStop; for (const m of mobs) if (!m.dead && dist2(m, player) < R.r * R.r) m.slowT = R.dur; fx({ t: 'ring', x: player.x, y: player.y - 4, r: R.r, el: 'ele' }); }
  if (kind === 'warp' && E) { // 魂跃：瞬移到落点并炸开
    const d = Math.min(dl, E.rng || 64);
    player.x = clamp(player.x + dx / dl * d, F.x0, F.x1); player.y = clamp(player.y + dy / dl * d, F.y0, F.y1);
    if (RUN) engineBlast(E, player.x, player.y, Math.min(E.aoeR || 48, 70));
    return;
  }
  const T = PLAYER.dashTime; player.dashT = T; const DD = PLAYER.dashDist * (STATS.flag.whirlHeart ? WH.dashMul : 1); player.dvx = dx / dl * DD / T; player.dvy = dy / dl * DD / T; // 旋风之心：短距离突进
  if (!RUN || !E) return;
  if (kind === 'trail') player.trail = 1;
  if (kind === 'nova') engineBlast(E, player.x, player.y, E.aoeR || 80);
  player.dashEnd = kind;
}
function engineBlast(E, x, y, r) {
  fx({ t: 'boom', x, y, r, el: E.el }); sfx('boom');
  for (const m of mobs) if (!m.dead && m.rise <= 0.2 && (m.x - x) ** 2 + (m.y - y) ** 2 < (r + m.size) ** 2) hitMob(m, E);
}
function dashEnd(kind) {
  const E = STATS.engine; player.trail = 0;
  if (!E || !RUN) return;
  if (kind === 'storm') { // 雷鸣：向附近敌人放出连锁雷
    const n = 1 + E.extra;
    const near = mobs.filter(m => !m.dead && m.rise <= 0.2 && dist2(m, player) < E.rng * E.rng).sort(() => rnd() - .5).slice(0, n);
    for (const m of near) chainHit(E, m, player, E.chain);
  }
  if (kind === 'burst') { // 疫爆：向四周炸开若干团
    const n = 1 + E.extra, r = Math.min(E.rng, 60);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; engineBlast(E, player.x + Math.cos(a) * r * 0.6, player.y + Math.sin(a) * r * 0.45, E.aoeR || 32); }
  }
  if (kind === 'vortex') zones.push({ W: E, x: player.x, y: player.y, r: 40, t: 3, pull: 40, el: E.el, vortex: 1 });
}

/* ---------- 开火 ---------- */
function nearest(x, y, r, skip) { let best = null, bd = r * r; for (const m of mobs) { if (m.dead || m.rise > 0.2 || (skip && skip.has(m))) continue; const d = (m.x - x) ** 2 + (m.y - 4 - y) ** 2; if (d < bd) { bd = d; best = m; } } return best; }
function attacks(W) { return 1 + W.extra + (W.extraChance && rnd() < W.extraChance ? 1 : 0); }
function chainHit(W, first, from, chains) {
  const hit = new Set(); let cur = first, f = { x: from.x, y: from.y - 6 };
  for (let c = 0; c <= chains && cur; c++) {
    hitMob(cur, W, { mul: 1 + W.chainInc * (chains - c) }); hit.add(cur);
    fx({ t: W.el === 'ele' ? 'bolt' : 'beam', x1: f.x, y1: f.y, x2: cur.x, y2: cur.y - 5, el: W.el });
    f = { x: cur.x, y: cur.y - 5 }; cur = nearest(cur.x, cur.y - 4, 60, hit);
  }
}
// 旋风的判定半径：武器范围，每层旋势 +rngPer%，再乘范围提高（符文、词条、天赋、独特）
const whirlR = (W, n) => W.rng * (1 + n * WH.rngPer / 100) * Math.max(0.2, 1 + W.aoeInc / 100);
const spinning = () => STATS.weapons.some((W, i) => W && W.whirl && player.spin[i].n > 0);
const inRange = (W, r) => mobs.some(m => !m.dead && m.rise <= 0.2 && dist2(m, player) < (r + m.size) ** 2);
function fire(W, i) {
  const px = player.x, py = player.y - 6;
  switch (W.form) {
    case 'orbit': { // 回旋骨刃：砍身边一圈；旋身符文叠旋势（伤害、半径），转的时候每砍中一个敌人回灯火
      const st = player.spin[i], n = W.whirl ? st.n : 0, mul = W.whirl ? Math.pow(W.morePer, n) : 1, r = whirlR(W, n);
      let hits = 0;
      for (const m of mobs) if (!m.dead && m.rise <= 0.2 && dist2(m, player) < (r + m.size) ** 2) { const d = hitMob(m, W, { mul }); hits++; if (n > 0 && hits <= 5) fx({ t: 'wcut', x: m.x, y: m.y - m.size, a: Math.atan2(m.y - player.y, m.x - player.x) }); if (RUN && RUN.dmg) RUN.dmg.whirl += d; }
      if (hits) { sfx('slash'); st.idle = 0; player.swing[i] = 0.18; if (W.whirl && n > 0) player.soul = Math.min(STATS.soulMax, player.soul + Math.min(hits, WH.soulHitCap) * WH.soulPerHit); }
      return true;
    }
    case 'nova': { // 圣钟：以自身为中心
      if (!inRange(W, W.rng)) return false;
      const n = attacks(W);
      for (let k = 0; k < n; k++) { fx({ t: 'boom', x: px, y: py + 6, r: W.aoeR, el: W.el }); for (const m of mobs) if (!m.dead && m.rise <= 0.2 && dist2(m, player) < (W.aoeR + m.size) ** 2) hitMob(m, W); aoePull(px, py + 6, W.aoeR); }
      sfx('boom'); return true;
    }
    case 'mine': { // 陷阱：放在脚下，敌人靠近就触发
      if (!mobs.length) return false;
      const mines = projs.filter(p => p.mine && p.W === W);
      if (mines.length >= MINE_MAX) mines[0].dead = true;
      projs.push({ W, mine: 1, x: px + rf(-4, 4), y: player.y + rf(-2, 2), arm: MECH.mineArm, life: MECH.mineLife, el: W.el, hit: new Set() });
      return true;
    }
    case 'stab': { // 骨刺：从地下刺向射程内若干最近的敌人
      const n = 1 + W.extra;
      const t = mobs.filter(m => !m.dead && m.rise <= 0.2 && dist2(m, player) < (W.rng + m.size) ** 2).sort((a, b) => dist2(a, player) - dist2(b, player)).slice(0, n);
      if (!t.length) return false;
      for (const m of t) { hitMob(m, W); fx({ t: 'spike', x: m.x, y: m.y, el: W.el }); }
      sfx('slash'); return true;
    }
  }
  const tg = nearest(px, py, W.rng || 160); if (!tg) return false;
  const a = Math.atan2(tg.y - 4 - py, tg.x - px);
  player.face = Math.cos(a) >= 0 ? 1 : -1;
  if (W.form === 'cone') {
    const half = 0.5;
    for (const m of mobs) { if (m.dead || m.rise > 0.2) continue; const dx = m.x - px, dy = m.y - 4 - py; const d = Math.hypot(dx, dy); if (d > W.rng + m.size) continue; let da = Math.abs(Math.atan2(dy, dx) - a); if (da > Math.PI) da = Math.PI * 2 - da; if (da < half) hitMob(m, W); }
    fx({ t: 'cone', x: px, y: py, a, r: W.rng, el: W.el });
    return true;
  }
  if (W.form === 'beam') {
    const n = attacks(W);
    for (let k = 0; k < n; k++) chainHit(W, k === 0 ? tg : nearest(px, py, W.rng, new Set([tg])) || tg, player, W.chain);
    if (rnd() < 0.3) sfx('beam'); return true;
  }
  if (W.spark && player.soul >= SP.soulPerCast * (1 - STATS.soulLess)) { // 游雷：扇形放出一串，贴地乱窜（灯火不够时退回普通的一发）
    const n = W.sparkN * attacks(W), vol = { last: new Map() }, life = SP.life * STATS.durMul; // 颗数 = 符文 × (1 + 投射物)，寿命吃持续时间
    const old = projs.filter(p => p.spark && !p.dead), over = old.length + n - SP.maxAlive; for (let k = 0; k < over && k < old.length; k++) old[k].dead = true; // 同屏上限：最老的先消失
    for (let k = 0; k < n; k++) shoot(W, px, py, a + (n > 1 ? (k / (n - 1) - 0.5) * SP.fan : 0), { pierce: W.pierce, chain: 0, sch: W.chain, split: 0, ret: 0, hit: new Set(), mul: W.sparkMul, life, first: true, spark: 1, vol, ph: k % 2 ? Math.PI : 0 });
    if (RUN) player.soul = Math.max(0, player.soul - SP.soulPerCast * (1 - STATS.soulLess));
    sfx('shoot'); return true;
  }
  const n = attacks(W), pel = W.b.pellets || 1;
  for (let k = 0; k < n; k++) for (let j = 0; j < pel; j++) {
    const aa = a + (k - (n - 1) / 2) * 0.16 + (pel > 1 ? (j - (pel - 1) / 2) * 0.12 + rf(-0.04, 0.04) : 0);
    shoot(W, px, py, aa, { pierce: W.pierce, chain: W.chain, split: W.split, ret: W.ret, hit: new Set(), mul: 1, life: (W.rng || 160) / W.spd, first: true });
  }
  sfx('shoot');
  return true;
}
function shoot(W, x, y, a, o) {
  const p = { W, x, y, vx: Math.cos(a) * W.spd, vy: Math.sin(a) * W.spd, a, el: W.el, r: W.b.wide ? 7 : 3, ...o };
  if (W.b.spiral) { p.cx = x; p.cy = y; p.sa = a; p.sr = 0; p.life = 2.5; }
  if (W.b.wander && !o.spark) p.life = Math.max(p.life, 2.5);
  projs.push(p); return p;
}
function projHit(p, m) {
  p.hit.add(m);
  let mul = p.mul * (p.pierced ? p.W.pierceMore : 1) * (1 + p.W.chainInc * (p.spark ? p.sch || 0 : p.chain));
  if (p.first && p.split > 0) mul *= 1 + p.W.splitInc * p.split;
  if (p.W.aoeR && p.W.form === 'proj') { // 火油罐：命中后范围爆炸
    fx({ t: 'boom', x: m.x, y: m.y - 3, r: p.W.aoeR, el: p.el }); sfx('boom'); aoePull(m.x, m.y, p.W.aoeR);
    for (const n of mobs) if (!n.dead && dist2(n, m) < (p.W.aoeR + n.size) ** 2) hitMob(n, p.W, { mul });
    return true;
  }
  if (p.spark) { // 游雷：记下这一串打中这个敌人的时间；雷冠：第一次打中感电的敌人时分叉
    const shocked = m.shock > 0, d = hitMob(m, p.W, { mul: mul * (1 + p.W.chainStep * (p.bn || 0)), spark: 1 }); if (p.bn && STATS.flag.chainCrown) shockOn(m); p.vol.last.set(m, RUN ? RUN.t : 0);
    if (RUN && RUN.dmg) RUN.dmg[p.forked ? 'fork' : 'spark'] = (RUN.dmg[p.forked ? 'fork' : 'spark'] || 0) + d;
    if (STATS.flag.chainCrown && shocked && !p.forked && !p.didFork) { p.didFork = 1; for (let i = 0; i < SP.forkN; i++) shoot(p.W, m.x, m.y - 5, p.a + (i - (SP.forkN - 1) / 2) * 1.2, { pierce: 0, chain: 0, sch: 0, split: 0, ret: 0, hit: new Set([m]), mul: p.mul * SP.forkMul, life: 0.8, spark: 1, forked: 1, vol: p.vol, ph: i ? Math.PI : 0 }); }
    fx({ t: 'sflash', x: m.x, y: m.y - 5 });
    if (p.pierce > 0) { p.pierce--; p.pierced = true; return false; }
    return true;
  }
  const bn = p.bn || 0; // 已经在场边弹了几次
  hitMob(m, p.W, { mul: mul * (1 + p.W.chainStep * bn) }); if (bn && STATS.flag.chainCrown) shockOn(m);
  fx({ t: 'hit', x: m.x, y: m.y - 5, el: p.el });
  if (p.first && p.split > 0) { // 分裂：向前方散开
    const s = p.split;
    for (let i = 0; i < s; i++) shoot(p.W, m.x, m.y - 5, p.a + (i - (s - 1) / 2) * 0.5, { pierce: p.pierce, chain: p.chain, split: 0, ret: 0, hit: new Set([m]), mul: p.mul, life: 0.6 });
    return true;
  }
  p.first = false;
  if (p.pierce > 0) { p.pierce--; p.pierced = true; return false; }
  return true;
}

/* ---------- 主循环 ---------- */
// 命中回护甲的两道上限（mechanics.defense，null = 不限）：同一次挥砍/同一帧同一把武器最多 leechHitCap 个敌人算数；
// 任意 1 秒内最多回护甲上限的 leechCapPct%（记最近 1 秒回了多少）
let leechFrame = 0, leechClock = 0; const leechLog = [];
function leech(W, a) {
  if (MECH.leechHitCap != null) { const k = W.key + '|' + leechFrame; if (player.leechK !== k) { player.leechK = k; player.leechN = 0; } if (++player.leechN > MECH.leechHitCap) { player.leechCapped = 0.5; return 0; } }
  if (MECH.leechCapPct != null) { const L = leechLog, used = L.reduce((x, e) => x + e[1], 0), g = Math.max(0, Math.min(a, STATS.life * MECH.leechCapPct / 100 - used)); if (g < a) player.leechCapped = 0.5; if (g > 0) L.push([leechClock, g]); return g; }
  return a;
}
function logic(dt) {
  const P = STATS;
  leechFrame++;
  leechClock += dt; while (leechLog.length && leechClock - leechLog[0][0] >= 1) leechLog.shift();
  if (player.leechCapped > 0) player.leechCapped -= dt;
  const at = autoStep(dt); // 自动战斗的目标点；手动时为 null
  // 移动：朝鼠标加速（体魄越高越慢）
  if (player.dashT > 0) {
    player.x += player.dvx * dt; player.y += player.dvy * dt; player.dashT -= dt;
    if (P.flag.fireTrail && RUN) { const W0 = P.weapons.find(w => w && w.form !== 'reflect'); if (W0) zones.push({ W: W0, mul: RL.fireTrail.pct / 100, x: player.x, y: player.y, r: RL.fireTrail.r, t: RL.fireTrail.dur * P.durMul, el: 'exp', trail: 1 }); }
    if (player.trail && RUN && P.engine) zones.push({ W: P.engine, x: player.x, y: player.y, r: 10, t: 2 * P.durMul, el: P.engine.el, trail: 1 });
    if (player.dashT <= 0 && player.dashEnd) { const k = player.dashEnd; player.dashEnd = null; dashEnd(k); }
  } else {
    let tvx = 0, tvy = 0;
    const tg = at || (fieldActive() ? { x: mouse.x, y: mouse.y + 4 } : null);
    if (tg) { const dx = tg.x - player.x, dy = tg.y - player.y, d = Math.hypot(dx, dy); if (d > 2) { const s = P.speed * Math.min(1, d / 24) * (spinning() ? WH.spinMoveMul : 1); tvx = dx / d * s; tvy = dy / d * s; } }
    const ax = tvx - player.vx, ay = tvy - player.vy, al = Math.hypot(ax, ay), step = P.accel * dt;
    if (al <= step) { player.vx = tvx; player.vy = tvy; } else { player.vx += ax / al * step; player.vy += ay / al * step; }
    player.x += player.vx * dt; player.y += player.vy * dt;
    if (Math.abs(player.vx) > 4) player.face = player.vx > 0 ? 1 : -1;
  }
  player.x = clamp(player.x, F.x0, F.x1); player.y = clamp(player.y, F.y0, F.y1);
  player.dash = Math.min(P.dashMax, player.dash + P.dashRegen * dt);
  if (player.adT > 0) player.adT -= dt;
  if (player.hurtT > 0) player.hurtT -= dt;
  if (player.guardT > 0) player.guardT -= dt;
  player.shield = Math.min(P.shield, player.shield + P.shieldRegen * (1 - ((RUN && RUN.mob.noRegen) || 0) / 100) * dt); // 护盾每秒回复，挨打也照回；生命不自然回复
  player.swing = player.swing.map(v => Math.max(0, v - dt));
  player.orbitA += dt * 5 * (1 + 0.12 * Math.max(player.spin[0].n, player.spin[1].n)); // 旋转层数越高转得越快
  if (!RUN) { player.life = P.life; player.shield = P.shield; player.soul = P.soulMax; return; }
  // 魂火：天梯里每秒自然回复；推关里是灯火，每秒燃烧，越深越快，只靠击杀回。转旋风的时候每秒另外消耗 whirl.soulPerSec
  const spin = spinning(), lad = RUN.mode === 'ladder';
  if (!RUN.ending && !RUN.next) {
    const rv = !lad && RUN.base < RUN.descent.prevMax; // 重温已经打过的层
    const net = (lad ? P.soulRegen : -(SOUL.burn + RUN.base * SOUL.burnPerFloor) * (rv ? SOUL.revisitBurnMul : 1)) - (spin ? WH.soulPerSec * (1 - P.soulLess) : 0);
    player.soul = clamp(player.soul + net * dt, 0, P.soulMax);
    if (player.soul <= 0) player.soulEmpty += dt;
    if (!lad && player.soul <= 0) { RUN.result = 'lampout'; RUN.ending = 1.6; sfx('out'); if (G.ui) G.ui.banner('灯火燃尽 · 平安返回', COL.emberHi); }
  }
  RUN.t += dt;
  if (!RUN.ending && !RUN.next && RUN.descent) RUN.descent.minHp = Math.min(RUN.descent.minHp, player.life / P.life);
  // 紧急撤回：最深层附近护甲一旦低于 returnHpNow%，立刻平安返回，不等打完 Boss
  if (!lad && !RUN.ending && !RUN.next && RUN.base >= RUN.descent.prevMax - 1 && player.life > 0 && player.life / P.life * 100 < SOUL.returnHpNow) { RUN.result = 'emergency'; RUN.ending = 1.6; sfx('out'); if (G.ui) G.ui.banner('紧急撤回', COL.emberHi); }
  // 光环类独特规则：每秒一次
  if ((P.flag.blindAura || P.flag.shockAura) && (RUN.auraT = (RUN.auraT || 0) - dt) <= 0) {
    RUN.auraT = RL.aura.every;
    for (const m of mobs) if (!m.dead && dist2(m, player) < RL.aura.r ** 2) { if (P.flag.blindAura) { m.blindT = MECH.blindDur; m.blindK = MECH.blindLess; } if (P.flag.shockAura) { m.shock = Math.min(MECH.shockMax, m.shock + 1); m.shockT = MECH.shockDur; } }
    fx({ t: 'ring', x: player.x, y: player.y - 4, r: RL.aura.r, el: P.flag.shockAura ? 'ele' : 'pla' });
  }
  if (RUN.ending) {
    RUN.ending -= dt;
    const keepAll = ['win', 'lampout', 'retreat', 'emergency'].includes(RUN.result);
    for (const dp of drops) if (keepAll) collect(dp);
    if (keepAll) drops = [];
    if (RUN.ending <= 0) finishRun();
    stepProjs(dt); return;
  }
  if (RUN.next) { // 下一层之前：捡起地上的东西
    for (const dp of drops) collect(dp); drops = [];
    RUN.next = Math.max(0, RUN.next - dt); if (!RUN.next) nextFloor();
    stepProjs(dt); return;
  }
  // 转旋风的时候：风暴之眼把身边的怪卷过来；旋风之心不断甩出小旋风
  if (spinning()) {
    const wi = P.weapons.findIndex((W, i) => W && W.whirl && player.spin[i].n > 0), OW = P.weapons[wi], n = player.spin[wi].n;
    if (P.flag.areaEye) { const pr = whirlR(OW, n) * RL.areaEye.pullR; for (const m of mobs) if (!m.dead && !m.boss && m.rise <= 0.2) { const dx = player.x - m.x, dy = player.y - m.y, d = Math.hypot(dx, dy); if (d > 6 && d < pr) { m.x += dx / d * RL.areaEye.pull * dt; m.y += dy / d * RL.areaEye.pull * dt; } } }
    if (P.flag.whirlHeart && (player.devilT -= dt) <= 0) {
      player.devilT = WH.devilEvery * (n >= OW.stackMax ? WH.devilFullMul : 1);
      // 小旋风算投射物：每次甩出 1 + 投射物 个，上限同比放大；速度吃投射物速度，存在时间吃持续时间；伤害不吃投射物伤害总增/总降（那是给射击流派的）
      const ex = Math.max(0, OW.extra + P.projAdd), max = Math.round(WH.devilMax * (1 + ex)), ds = zones.filter(z => z.devil), cnt = 1 + Math.floor(ex);
      for (let k = 0; k < ds.length + cnt - max && k < ds.length; k++) ds[k].t = 0;
      for (let k = 0; k < cnt; k++) zones.push({ W: OW, mul: WH.devilMul * Math.pow(OW.morePer, n), x: player.x, y: player.y, r: WH.devilR, t: WH.devilLife * P.durMul, tickT: WH.devilTick, el: OW.el, devil: 1, spd: WH.devilSpeed * (1 + OW.projSpdInc / 100), ang: rnd() * Math.PI * 2, seed: rnd() * 9 });
    }
  } else player.devilT = 0;
  player.lx = player.x; player.ly = player.y;
  // 天梯限时
  if (RUN.limit && RUN.t >= RUN.limit) { RUN.result = 'timeout'; RUN.ending = 1.6; sfx('out'); if (G.ui) G.ui.banner('时间到'); return; }
  // 刷怪（天梯：上限 ×密度，间隔 ÷密度）
  if (!RUN.boss) {
    RUN.spawnT -= dt;
    const R = PROG.run, HD = R.horde, cap = Math.round((R.spawnCapBase + Math.min(R.spawnCapMaxExtra, RUN.L)) * RUN.dens * HD.count);
    if (RUN.spawnT <= 0 && mobs.length < cap) { // 一次刷一群，挤在场边同一处
      let o = {};
      if (RUN.lastPack && rnd() < (HD.surround || 0)) { // 包围：刷到上一群的对面（以角色为中心对称，再贴到最近的场边）
        let x = clamp(2 * player.x - RUN.lastPack.x, F.x0, F.x1), y = clamp(2 * player.y - RUN.lastPack.y, F.y0, F.y1);
        const ed = [[x - F.x0, () => x = F.x0], [F.x1 - x, () => x = F.x1], [y - F.y0, () => y = F.y0], [F.y1 - y, () => y = F.y1]].sort((a, b) => a[0] - b[0]); ed[0][1](); o = { x, y };
      }
      const n = Math.min(cap - mobs.length, ri(HD.pack[0], HD.pack[1])), first = spawnMob(pickMob(RUN.L), o); RUN.lastPack = { x: first.x, y: first.y };
      for (let i = 1; i < n; i++) spawnMob(pickMob(RUN.L), { x: clamp(first.x + rf(-14, 14), F.x0, F.x1), y: clamp(first.y + rf(-10, 10), F.y0, F.y1) });
      RUN.spawnT = Math.max(R.spawnIntervalMin, R.spawnInterval - RUN.L * R.spawnIntervalPerLevel) / RUN.dens / HD.count * n;
    }
    if (RUN.prog >= RUN.need - 1e-6) spawnBoss();
  }
  // 武器
  P.weapons.forEach((W, i) => {
    if (!W || W.form === 'reflect') return;
    if (W.form === 'aura') { // 瘟疫香炉：每 auraTick 秒结算一次
      const AT = MECH.auraTick; player.wcd[i] -= dt; if (player.wcd[i] > 0) return; player.wcd[i] = AT;
      if (!W.tick) { W.tick = { ...W, cont: true, aps: 1 / AT, min: { ...W.min }, max: { ...W.max } }; W.tick.min[W.el] = W.tick.max[W.el] = W.auraDps * AT; }
      for (const m of mobs) if (!m.dead && m.rise <= 0.2 && dist2(m, player) < (W.rng + m.size) ** 2) hitMob(m, W.tick);
      return;
    }
    if (W.form === 'ram') { // 撞城骨锤：撞上敌人造成伤害，越快越痛
      const sp = player.dashT > 0 ? MECH.ramDashMul : clamp(Math.hypot(player.vx, player.vy) / P.speed, MECH.ramMinMul, 1);
      for (const m of mobs) if (!m.dead && m.rise <= 0.2 && m.ramT <= 0 && dist2(m, player) < (m.size + 7) ** 2) { hitMob(m, W, { mul: sp }); m.ramT = MECH.ramCd; fx({ t: 'hit', x: m.x, y: m.y - 4, el: 'kin' }); sfx('slash'); }
      return;
    }
    if (W.whirl) { // 旋转层数：连续命中时每秒涨，decay 秒没命中清零
      const st = player.spin[i]; st.idle += dt;
      if (st.idle >= WH.decay * (STATS.flag.spinDecay || 1)) { st.n = 0; st.g = 0; }
      else if (st.n < W.stackMax && player.soul > 0 && (st.g += dt * WH.gainPerSec) >= 1) { st.g -= 1; st.n++; } // 魂火空了不再涨层
    }
    player.wcd[i] -= dt;
    if (player.wcd[i] <= 0) { if (fire(W, i)) player.wcd[i] = W.aps ? 1 / W.aps : 0.5; else player.wcd[i] = 0.05; }
  });
  stepProjs(dt);
  stepZones(dt);
  // 敌人
  for (const m of mobs) {
    if (m.dead) continue;
    m.t += dt; if (m.fl > 0) m.fl -= dt; if (m.flCd > 0) m.flCd -= dt; if (m.ramT > 0) m.ramT -= dt; if (m.slowT > 0) m.slowT -= dt;
    if (m.rise > 0) { m.rise -= dt; continue; }
    if (m.boss && m.t > MECH.fatigueStart) m.fat = Math.min(MECH.fatigueMax, Math.floor(m.t - MECH.fatigueStart));
    // 异常
    if (m.shockT > 0) { m.shockT -= dt; if (m.shockT <= 0) m.shock = 0; }
    if (m.shredT > 0) m.shredT -= dt;
    if (m.blindT > 0) m.blindT -= dt;
    if (m.burn > 0.5) { m.burnT -= dt; if (m.burnT <= 0) { m.burnT = MECH.burnTick; const tk = m.burn * MECH.burnTickPct, keep = STATS.flag.burnKeep; m.burn -= tk * (1 - (m.burnSlow || 0)) * (keep ? RL.burnKeep.drainMul : 1) + (keep ? 0 : m.burn * MECH.burnDecay); damage(m, mitigate(m, 'exp', tk * (keep ? RL.burnKeep.dmgMul : 1)), 'exp', false, true); if (rnd() < 0.3) fx({ t: 'burn', x: m.x, y: m.y }); } }
    else m.burn = 0;
    if (m.rad.length) { let d = 0; for (const r of m.rad) { d += r.dps * Math.min(dt, r.t); r.t -= dt; } m.rad = m.rad.filter(r => r.t > 0); m.radAcc = (m.radAcc || 0) + d; m.radT = (m.radT || 0) + dt; if (m.radT > 0.25) { damage(m, mitigate(m, 'nuc', m.radAcc), 'nuc', false, true); m.radAcc = 0; m.radT = 0; } }
    for (const a of m.after) { a.t -= dt; if (a.t <= 0 && a.n > 0) { a.n--; a.t = MECH.afterTick; damage(m, mitigate(m, 'exp', a.d), 'exp', false, true); a.d *= a.k || MECH.afterPct; fx({ t: 'ring', x: m.x, y: m.y - 4, r: 10, el: 'exp' }); } }
    m.after = m.after.filter(a => a.n > 0);
    if (m.dead) continue;
    // 行动
    const bl = m.blindT > 0 ? 1 - m.blindK : 1;
    const dx = player.x - m.x, dy = player.y - m.y, d = Math.hypot(dx, dy) || 1;
    m.face = dx >= 0 ? 1 : -1;
    let want = m.d.ai === 'ranged' ? (d > m.d.rng * 0.8 ? 1 : d < m.d.rng * 0.5 ? -1 : 0) : 1;
    if (m.boss && m.d.pat === 'ring' && m.t % PAT.ring.chargeEvery > PAT.ring.chargeFrom) want = PAT.ring.chargeSpeed; // 骸骨领主冲锋
    if (m.boss && m.d.pat === 'blink') want = d < PAT.blink.keepAway ? PAT.blink.awaySpeed : PAT.blink.nearSpeed;
    const sl = m.slowT > 0 ? 1 - RL.timeStop.slow / 100 : 1; m.vx = dx / d * m.spd * want * sl; m.vy = dy / d * m.spd * want * sl;
    m.x += (m.vx + m.kx) * dt; m.y += (m.vy + m.ky) * dt;
    const kd = Math.pow(0.02, dt); m.kx *= kd; m.ky *= kd;
    m.atkCd -= dt; m.cd -= dt;
    const MA = PROG.monsterAttack;
    if (d < m.size + MA.touch && m.atkCd <= 0) { hurtPlayer(m.dmg * bl, m.el); m.atkCd = MA.meleeCd; }
    slamStep(m, dt, bl);
    if (m.boss && m.cd <= 0) bossAct(m, Math.atan2(dy, dx), bl);
    else if (m.d.ai === 'ranged' && m.cd <= 0) {
      m.cd = m.d.cd; const lt = m.d.lead ? d / MA.shotSpd * m.d.lead : 0, a = Math.atan2(player.y + player.vy * lt - m.y, player.x + player.vx * lt - m.x); // lead：按角色速度预判落点
      projs.push({ enemy: true, x: m.x, y: m.y - 6, vx: Math.cos(a) * MA.shotSpd, vy: Math.sin(a) * MA.shotSpd, life: m.d.pool ? Math.min(MA.shotLife, d / MA.shotSpd) : MA.shotLife, dmg: m.dmg * bl, el: m.el, pool: m.d.pool ? { ...m.d.pool, dmg: m.dmg * m.d.pool.dmg * bl } : null }); // 骨法师：弹飞到角色当时的位置落地留火圈
    }
  }
  // 互相推开
  for (let i = 0; i < mobs.length; i++) for (let j = i + 1; j < mobs.length; j++) {
    const a = mobs[i], b = mobs[j]; if (a.dead || b.dead) continue;
    const dx = b.x - a.x, dy = b.y - a.y, r = a.size + b.size, dd = dx * dx + dy * dy;
    if (dd < r * r && dd > 0.01) { const d = Math.sqrt(dd), push = (r - d) / 2; const ux = dx / d * push, uy = dy / d * push; if (!a.boss) { a.x -= ux; a.y -= uy; } if (!b.boss) { b.x += ux; b.y += uy; } }
  }
  for (const m of mobs) { m.x = clamp(m.x, F.x0, F.x1); m.y = clamp(m.y, F.y0, F.y1); }
  mobs = mobs.filter(m => !m.dead);
  // 掉落：拾取范围内飞向玩家
  for (const dp of drops) {
    dp.age += dt;
    if (dp.z > 0 || dp.vz > 0) { dp.vz -= 260 * dt; dp.z += dp.vz * dt; dp.x += dp.vx * dt; dp.y += dp.vy * dt; if (dp.z <= 0) { dp.z = 0; dp.vz = Math.abs(dp.vz) > 30 ? -dp.vz * 0.35 : 0; dp.vx *= .5; dp.vy *= .5; } }
    const dx = player.x - dp.x, dy = player.y - dp.y, dl = Math.hypot(dx, dy);
    if (dp.age > 0.5 && (dl < P.pickup || dp.mag)) { dp.mag = true; const sp = 200 * dt; if (dl < 5) { collect(dp); dp.done = true; } else { dp.x += dx / dl * Math.min(sp, dl); dp.y += dy / dl * Math.min(sp, dl); } }
  }
  drops = drops.filter(d => !d.done);
}
// 地面持续区域：腐尸陷阱的毒池、余烬靴的火痕、虚渊靴的漩涡
// 红圈重击（progression.slam）：精英、Boss 每隔一段时间在角色脚下亮红圈，读条后砸下；怪死了就取消
function slamStep(m, dt, bl) {
  const C = m.boss ? PROG.slam.boss : m.elite ? PROG.slam.elite : null; if (!C) return;
  if (m.slam) {
    m.slam.t -= dt; if (m.slam.t > 0) return;
    const s = m.slam; m.slam = null;
    fx({ t: 'slam', x: s.x, y: s.y, r: s.r });
    if (dist2(player, s) < s.r * s.r && RUN && !RUN.ending) { if (player.dashT <= 0) RUN.slamHits = (RUN.slamHits || 0) + 1; hurtPlayer(m.dmg * C.mul * bl, m.el); }
    return;
  }
  m.slamCd = (m.slamCd ?? C.every * rf(0.5, 1)) - dt;
  if (m.slamCd <= 0 && m.rise <= 0) { m.slamCd = C.every; m.slam = { x: player.x, y: player.y, r: C.r, t: C.windup, T: C.windup }; }
}
// Boss 招式：每个 Boss 一套
function bossAct(m, aim, bl) {
  const shot = (a, v, k) => projs.push({ enemy: true, x: m.x, y: m.y - 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: PROG.monsterAttack.shotLife, dmg: m.dmg * k * bl, el: m.el });
  const B = PAT[m.d.pat];
  switch (m.d.pat) {
    case 'ring': m.cd = B.cd; for (let k = 0; k < B.shots; k++) shot(k / B.shots * Math.PI * 2 + m.t, B.shotSpd, B.shotDmg); break;
    case 'blink': {
      m.cd = B.cd; const a = rf(0, Math.PI * 2);
      fx({ t: 'ring', x: m.x, y: m.y - 8, r: 16, el: 'pla' });
      m.x = clamp(player.x + Math.cos(a) * B.distX, F.x0 + 10, F.x1 - 10); m.y = clamp(player.y + Math.sin(a) * B.distY, F.y0 + 10, F.y1);
      fx({ t: 'ring', x: m.x, y: m.y - 8, r: 16, el: 'pla' });
      for (let w = 0; w < B.waves; w++) for (let k = 0; k < B.shots; k++) shot(k / B.shots * Math.PI * 2 + w * 0.35, B.shotSpd + w * B.shotSpdStep, B.shotDmg);
      break;
    }
    case 'pool':
      m.cd = B.cd; zones.push({ enemy: true, x: player.x, y: player.y, r: B.r, t: B.dur, tickT: B.poolTick, dmg: m.dmg * B.poolDmg * bl, el: 'nuc' });
      for (let k = 0; k < B.shots; k++) shot(aim + (k - (B.shots - 1) / 2) * B.spread, B.shotSpd, B.shotDmg);
      break;
    case 'bolt':
      m.cd = B.cd; for (let k = 0; k < B.shots; k++) shot(aim + (k - (B.shots - 1) / 2) * B.spread, B.shotSpd, B.shotDmg);
      m.summon = (m.summon || 0) + 1;
      if (m.summon % B.summonEvery === 0) for (let k = 0; k < B.summonN; k++) spawnMob(B.summon, { x: m.x + rf(-30, 30), y: clamp(m.y + rf(-20, 20), F.y0, F.y1) });
      break;
  }
}
function stepZones(dt) {
  for (const z of zones) {
    z.t -= dt; z.tick = (z.tick || 0) - dt;
    if (z.devil) { // 小旋风：带随机偏转的直线，碰到场地边缘就弹回来
      z.ang += rf(-WH.devilTurn, WH.devilTurn) * dt; z.x += Math.cos(z.ang) * z.spd * dt; z.y += Math.sin(z.ang) * z.spd * 0.7 * dt;
      if (z.x < 8 || z.x > W - 8) { z.ang = Math.PI - z.ang; z.x = clamp(z.x, 8, W - 8); }
      if (z.y < FLOOR_Y + 6 || z.y > FIELD_B - 4) { z.ang = -z.ang; z.y = clamp(z.y, FLOOR_Y + 6, FIELD_B - 4); }
    }
    if (z.enemy) { if (z.tick <= 0) { z.tick = z.tickT || 0.5; if (dist2(player, z) < (z.r + 3) ** 2) hurtPlayer(z.dmg, z.el); } continue; }
    if (z.pull) for (const m of mobs) if (!m.dead && !m.boss && dist2(m, z) < (z.pullR || z.r * 1.6) ** 2) { const dx = z.x - m.x, dy = z.y - m.y, d = Math.hypot(dx, dy) || 1; m.x += dx / d * z.pull * dt; m.y += dy / d * z.pull * dt; }
    if (z.tick <= 0) { z.tick = z.tickT || 0.2; let zh = false; for (const m of mobs) if (!m.dead && m.rise <= 0.2 && dist2(m, z) < (z.r + m.size) ** 2 && !(z.trail && m.trailT > RUN.t)) { const d = hitMob(m, z.W, { mul: z.mul || 1 }); if (z.devil && RUN.dmg) RUN.dmg.devil += d; zh = true; if (z.trail) m.trailT = RUN.t + 0.19; } } // 小旋风打中不回灯火
  }
  zones = zones.filter(z => z.t > 0);
}
function stepProjs(dt) {
  for (const p of projs) {
    if (p.enemy) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if ((p.x - player.x) ** 2 + (p.y - player.y + 6) ** 2 < 36) { hurtPlayer(p.dmg, p.el); p.dead = true; }
      if (p.pool && (p.dead || p.life <= 0)) { zones.push({ enemy: true, x: p.x, y: p.y + 6, r: p.pool.r, t: p.pool.dur, tickT: p.pool.tick, dmg: p.pool.dmg, el: p.el }); p.pool = null; p.dead = true; }
    } else if (p.mine) {
      p.arm -= dt; p.life -= dt; if (p.life <= 0) p.dead = true;
      if (p.arm > 0 || p.dead) continue;
      const W = p.W, tg = nearest(p.x, p.y + 4, W.rng || 14); if (!tg) continue;
      p.dead = true;
      if (W.b.pool) { zones.push({ W, x: p.x, y: p.y, r: W.aoeR, t: 4 * STATS.durMul, el: W.el, pool: 1 }); fx({ t: 'ring', x: p.x, y: p.y, r: W.aoeR, el: W.el }); }
      else if (W.b.shoot) { // 雷暴 / 碎骨陷阱：向敌人射出
        if (W.chain) chainHit(W, tg, { x: p.x, y: p.y + 6 }, W.chain);
        else shoot(W, p.x, p.y - 2, Math.atan2(tg.y - p.y, tg.x - p.x), { pierce: W.pierce, chain: 0, split: W.split, ret: 0, hit: new Set(), mul: 1, life: W.rng / W.spd, first: true });
      } else { fx({ t: 'boom', x: p.x, y: p.y, r: W.aoeR, el: W.el }); sfx('boom'); for (const m of mobs) if (!m.dead && dist2(m, p) < (W.aoeR + m.size) ** 2) hitMob(m, W); aoePull(p.x, p.y, W.aoeR); }
    } else {
      if (p.cx != null) { // 疫星仪：螺旋向外
        p.sa += dt * 5; p.sr += dt * 55; p.x = p.cx + Math.cos(p.sa) * p.sr; p.y = p.cy + Math.sin(p.sa) * p.sr * 0.75; p.vx = -Math.sin(p.sa); p.vy = Math.cos(p.sa);
      } else {
        if (p.spark) { // 游雷：沿中心线直线前进，横向按固定正弦波摆动（不追踪、不随机）；中心线碰到场边镜面反射
          if (p.wd == null) { p.wd = 0; p.wx = p.x; p.wy = p.y; }
          const s = p.W.spd * SP.speedMul, ux = Math.cos(p.a), uy = Math.sin(p.a);
          p.wx += ux * s * dt; p.wy += uy * s * dt; p.wd += s * dt;
          { const hx = p.wx < F.x0 || p.wx > F.x1, hy = p.wy < F.y0 - 6 || p.wy > F.y1; // 弹射：中心线碰到场边时，有弹射次数就镜面反射（每次消耗一次），没有就飞出去
            if ((hx || hy) && !p.out) { if (p.sch > 0) { p.sch--; p.bn = (p.bn || 0) + 1; p.mul *= SP.chainMul; if (hx) p.a = Math.PI - p.a; if (hy) p.a = -p.a; p.wx = clamp(p.wx, F.x0, F.x1); p.wy = clamp(p.wy, F.y0 - 6, F.y1); p.hit.clear(); p.life = Math.max(p.life, SP.chainLife); fx({ t: 'bounce', x: p.wx, y: p.wy }); } else p.out = 1; } }
          const k = Math.PI * 2 / SP.waveL, ph = k * p.wd + p.ph, amp = SP.waveA * Math.min(1, p.wd / 12), nx = -Math.sin(p.a), ny = Math.cos(p.a), off = amp * Math.sin(ph), slope = amp * k * Math.cos(ph);
          p.x = p.wx + nx * off; p.y = p.wy + ny * off;
          p.vx = (Math.cos(p.a) + nx * slope) * s; p.vy = (Math.sin(p.a) + ny * slope) * s; // 只给画面定朝向
        } else if (p.W.b.wander && !p.back) { const n = nearest(p.x, p.y, 70, p.hit); const ta = n ? Math.atan2(n.y - 5 - p.y, n.x - p.x) : p.a + rf(-1, 1); let da = ta - p.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; p.a += clamp(da, -6 * dt, 6 * dt); const s = p.W.spd * 0.6; p.vx = Math.cos(p.a) * s; p.vy = Math.sin(p.a) * s; }
        if (!p.spark) { p.x += p.vx * dt; p.y += p.vy * dt; }
        if (!p.spark && !p.back && !p.out) { const hx = p.x < F.x0 || p.x > F.x1, hy = p.y < F.y0 - 6 || p.y > F.y1; // 弹射：碰到场边镜面反射，每次消耗一次弹射
          if (hx || hy) { if (p.chain > 0) { p.chain--; p.bn = (p.bn || 0) + 1; p.first = false; if (hx) p.vx = -p.vx; if (hy) p.vy = -p.vy; p.a = Math.atan2(p.vy, p.vx); p.x = clamp(p.x, F.x0, F.x1); p.y = clamp(p.y, F.y0 - 6, F.y1); p.hit.clear(); p.life = Math.max(p.life, 0.9); fx({ t: 'bounce', x: p.x, y: p.y }); } else p.out = 1; } }
      }
      p.life -= dt;
      if (p.spark) { const now = RUN ? RUN.t : 0; for (const m of p.hit) if (now - (p.vol.last.get(m) ?? -9) >= SP.rehit) p.hit.delete(m); } // 游雷：同一串对同一个敌人每 rehit 秒最多打一次
      for (const m of mobs) { if (m.dead || m.rise > 0.2 || p.hit.has(m) || (p.spark && (RUN ? RUN.t : 0) - (p.vol.last.get(m) ?? -9) < SP.rehit)) continue; if ((m.x - p.x) ** 2 + (m.y - 5 - p.y) ** 2 < (m.size + p.r) ** 2) { if (projHit(p, m)) { p.dead = true; break; } } }
      if (p.life <= 0 && !p.dead && !p.back) { // 终幕 / 狂裂印记
        if (STATS.flag.finale && p.W.aoeR && p.W.form === 'proj') { fx({ t: 'boom', x: p.x, y: p.y, r: p.W.aoeR, el: p.el }); for (const n of mobs) if (!n.dead && dist2(n, p) < (p.W.aoeR + n.size) ** 2) hitMob(n, p.W); }
        if (STATS.flag.splitEnd && p.first && p.split > 0) for (let i = 0; i < p.split; i++) shoot(p.W, p.x, p.y, p.a + (i - (p.split - 1) / 2) * 0.5, { pierce: p.pierce, chain: p.chain, split: 0, ret: 0, hit: new Set(p.hit), mul: p.mul, life: 0.6 });
      }
      if (p.life <= 0 && !p.dead) {
        if (p.ret && !p.back) { p.back = true; p.hit = new Set(); p.life = 3; p.cx = null; }
        else p.dead = true;
      }
      if (p.back && !p.dead) { const dx = player.x - p.x, dy = player.y - 6 - p.y, d = Math.hypot(dx, dy); if (d < 6) p.dead = true; else { p.vx = dx / d * p.W.spd; p.vy = dy / d * p.W.spd; } }
    }
    if (p.x < -20 || p.x > W + 20 || p.y < 0 || p.y > H + 10) p.dead = true;
  }
  projs = projs.filter(p => !p.dead);
}
// 换存档：示范存档（先把当前进度备份）或恢复备份；正在打的一趟直接作废
const BACKUP_KEY = SAVE_KEY + '-backup';
const hasBackup = () => { try { return !!localStorage.getItem(BACKUP_KEY); } catch (e) { return false; } };
function swapSave(raw) {
  RUN = null; mobs = []; projs = []; drops = []; zones = []; LAD.pending = 0; AUTO.last = null; AUTO.camp = null;
  load({ save: raw }); LX = lootFx(null); refreshStats(); resetPlayer(); save();
  if (G.ui) { G.ui.closeWin(); G.ui.feeds = []; G.ui.renderFeed(); const gt = FAC_BY.gate; player.x = gt.x; player.y = gt.y + 8; }
}
function loadDemo(name) { try { if (!hasBackup()) localStorage.setItem(BACKUP_KEY, JSON.stringify(S)); } catch (e) { } swapSave(DEMO_SAVES[name]); }
function restoreBackup() { let raw = null; try { raw = localStorage.getItem(BACKUP_KEY); } catch (e) { } if (!raw) return; swapSave(raw); try { localStorage.removeItem(BACKUP_KEY); } catch (e) { } }
function finishRun() {
  const r = RUN; RUN = null; mobs = []; projs = []; drops = []; zones = [];
  S.stats.missions++;
  const baseL = r.base;
  if (r.result === 'win' && r.map) S.stats.maps++;
  if (r.mode !== 'ladder' && r.descent.floors && !S.auto.lock) S.depth = S.maxDepth; // 最深层在每层通过时已经更新
  if (r.mode !== 'ladder' && r.result === 'dead') deathLoss(r);
  if (salvRules().on && unlocked('craft')) r.salv = autoSalvage(r.gain.items); // 分解祭坛：带回的装备按规则拆成碎片
  LX = lootFx(null);
  autoAfterRun(r);
  refreshStats(); resetPlayer(); save();
  if (G.ui) G.ui.backToCamp(r);
}

