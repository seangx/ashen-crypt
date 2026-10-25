/* =========================================================
   战斗逻辑（与渲染分离；G.fx = false 时可无头模拟）
   ========================================================= */
let RUN = null;
let mobs = [], projs = [], drops = [], fxq = [], zones = [], meteors = []; // meteors：还没落地的陨石
const mouse = { x: 240, y: 150, on: false, touch: false };
const FIX = { x0: 10, x1: 470, y0: 62, y1: 226 }; // 营地（固定房间）的边界
// 无限场地：相机跟着角色走。CAM = 视野左上角的世界坐标；F = 当前视野里的“场边”（左右各留 10，上面让开顶栏，下面让开底栏），弹射就在这里反弹
const CAM = { x: 0, y: 0 };
const F = { x0: 10, x1: 470, y0: 62, y1: 226 };
const VIEW_CY = (TOP_H + BOT_Y) / 2; // 视野里战斗区的竖直中心（屏幕坐标）
function updView() { F.x0 = CAM.x + 10; F.x1 = CAM.x + W - 10; F.y0 = CAM.y + TOP_H + 8; F.y1 = CAM.y + BOT_Y - 8; }
function camSnap() { if (RUN) { CAM.x = player.x - W / 2; CAM.y = player.y - VIEW_CY; } else { CAM.x = 0; CAM.y = 0; } updView(); }
function camStep(dt) { if (!RUN) return camSnap(); const k = 1 - Math.exp(-dt * 8); CAM.x += (player.x - W / 2 - CAM.x) * k; CAM.y += (player.y - VIEW_CY - CAM.y) * k; updView(); }
// 视野外一圈上的随机点（刷怪用）：视野往外扩 m 像素的矩形边上；给了方向 a 就取那个方向上的点
function ringPoint(m = 18, a) {
  const cx = CAM.x + W / 2, cy = CAM.y + VIEW_CY, hw = W / 2 + m, hh = (BOT_Y - TOP_H) / 2 + m;
  if (a == null) a = rnd() * Math.PI * 2;
  const c = Math.cos(a), s = Math.sin(a), k = Math.min(hw / Math.max(1e-6, Math.abs(c)), hh / Math.max(1e-6, Math.abs(s)));
  return { x: cx + c * k, y: cy + s * k };
}
const offView = (o, m) => o.x < CAM.x - m || o.x > CAM.x + W + m || o.y < CAM.y + TOP_H - m || o.y > CAM.y + BOT_Y + m;
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
  mobs = []; projs = []; zones = []; drops = []; meteors = [];
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
  mobs = []; projs = []; drops = []; zones = []; meteors = [];
  player.x = 240; player.y = 150; player.vx = player.vy = 0; player.chill = 0; player.chillT = 0; player.wcd = [0, 0]; camSnap(); if (typeof AUTO !== 'undefined') AUTO.anchor = null;
  player.spin.forEach(s => { s.n = 0; s.g = 0; s.idle = 9; }); player.swing = [0, 0]; player.devilT = 0; player.soul = STATS.soulMax; player.soulEmpty = 0; player.walk = 0; player.lx = player.x; player.ly = player.y;
  resetPlayer();
  sfx('start');
}
const fieldActive = () => RUN && (mouse.on || mouse.touch) && !(G.ui && G.ui.winId) && mouse.y > TOP_H && mouse.y < BOT_Y;

/* ---------- 敌人 ---------- */
function pickMob(L) { const pool = Object.entries(MOBS).filter(([, m]) => L >= (m.minL || 1)); return wpick(pool, ([, m]) => m.w)[0]; }
// 怪海有效数量：基础 count × 视野面积比（手机竖屏视野更大，按面积补怪，密度不比桌面低）
function hordeN() { const HD = PROG.run.horde, a = (F.x1 - F.x0) * (F.y1 - F.y0); return HD.count * clamp(a / (HD.refArea || a), 1, HD.areaMax || 1); }
function spawnMob(type, o = {}) {
  const d = o.d || MOBS[type] || BOSS; const L = RUN.L; const mx = RUN.mob || {};
  const rp = o.x == null ? ringPoint() : null; // 默认刷在视野外一圈
  const x = o.x ?? rp.x, y = o.y ?? rp.y;
  const elite = !o.boss && rnd() < ELITE.chance * (RUN.eliteMul || 1) * (1 + (mx.elite || 0) / 100);
  const HD = o.boss ? null : PROG.run.horde; // 怪海：普通怪更多更脆
  const hp = d.hp * monHp(L) * (elite ? ELITE.hp : 1) * (1 + (mx.mobHp || 0) / 100) * (HD ? HD.hp : 1);
  const m = { type, d, x, y, hp, max: hp, dmg: d.dmg * monDmg(L) * (elite ? ELITE.dmg : 1) * (1 + (mx.mobDmg || 0) / 100) * (HD ? HD.dmg : 1), spd: d.spd * (elite ? ELITE.spd : 1) * (1 + (mx.mobSpd || 0) / 100), size: d.size + (elite ? ELITE.size : 0), res: Object.fromEntries(ELEM.map(e => [e, ((d.res || {})[e] || 0) + (mx.mobRes || 0)])), el: d.el,
    elite, boss: !!o.boss, rise: o.boss ? 0.8 : 0.4, atkCd: 1, cd: rf(0.5, d.cd || 2), fl: 0, shock: 0, shockT: 0, chill: 0, chillT: 0, frzT: 0, frzImm: 0, blindT: 0, blindK: 0, burn: 0, burnT: 0, rad: [], after: [], t: 0, face: 1, vx: 0, vy: 0, kx: 0, ky: 0, ramT: 0, fat: 0 };
  mobs.push(m); return m;
}
function spawnBoss() {
  const B = RUN.bossD;
  const m = spawnMob('boss_' + B.id, { boss: true, d: B, x: player.x, y: F.y0 + 10 });
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
const shockRes = (m, e) => m.shock * (MECH.shockAll + (e === 'ele' ? MECH.shockEle : 0)) * (STATS.shockMul || 1) * ailEff('ele');
// 异常效果提高%（AilEffect 词条，spec-bd-gear §3.2）：碎骨 kin、余震 exp、灼烧 burn、感电 ele、致盲 pla、疫病 nuc、冰缓 cold
const ailEff = e => (1 + ((STATS.raw && STATS.raw['ailEff:' + e]) || 0) / 100) * (e === 'cold' && STATS.flag && STATS.flag.chillMul || 1); // 誓约：冰缓效果 −30%
// Boss 疲惫：开打 5 秒后每秒一层，每层承受伤害 ×1.04，最多 60 层
const fatigue = m => m.boss ? Math.pow(MECH.fatigueStep, m.fat) : 1;
function mitigate(m, e, d) { return d * (1 - ((m.res[e] || 0) - shockRes(m, e) - (m.shredT > 0 ? m.shred[e] || 0 : 0) - (STATS.flag.corrode && m.rad.length ? RL.corrode.res : 0) - ((STATS.raw && STATS.raw['pen:' + e]) || 0)) / 100) * fatigue(m); }
// 暴击率超过 100% 时可以多重暴击，每多一重几率 ×0.8
function rollCrit(W) {
  let c = W.crit, mult = 1;
  const decay = STATS.flag.multicrit ? 1 : MECH.multicritDecay;
  const roll = () => rnd();
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
  if (STATS.flag.ctrlPrison && !isCtrl(m)) mul *= 1 - RL.ctrlPrison.less / 100; /* 寒狱：对未受控的敌人总降 */
  if (m.frzT > 0 && STATS.frozenTaken) mul *= 1 + STATS.frozenTaken; // 冻结的敌人受到的伤害提高
  if (m.frzT > 0 && STATS.flag.frozenMore) mul *= 1 + STATS.flag.frozenMore / 100; // 誓约：对冻结的敌人总增
  if (STATS.flag.fullShieldMore && player.shield >= STATS.shield - 0.5) mul *= 1 + STATS.flag.fullShieldMore / 100; // 誓约：护盾全满时总增
  if (W.shred) { m.shred = W.shred; m.shredT = MECH.shredTime; }
  const by = {}; let total = 0, top = W.el, topv = 0;
  for (const e of ELEM) {
    if (W.max[e] <= 0) continue;
    let d = rf(W.min[e], W.max[e]) * mul; if (e === 'ele') d = Math.max(1, d);
    d = mitigate(m, e, d); by[e] = d; total += d; if (d > topv) { topv = d; top = e; }
  }
  damage(m, total, top, crit, W.cont);
  if (!W.cont && !o.ground && !o.arc && !o.re) shieldOnHit(); /* 续航：持续伤害、地面效果不算命中 */
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
  if (by.exp) { m.burn += by.exp * MECH.burnFromFire * ailEff('burn'); if (W.burnSlow) m.burnSlow = W.burnSlow; } // 火焰伤害都会累积灼烧
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
// 寒霜：冰缓叠层（每层移速、攻速 -chillPer%），叠满冻结；冻结后 freezeImmune 秒免疫、层数清零（spec-bd-gear §1）
const chillEff = () => ailEff('cold'); // 冰缓效果提高%
const chillK = m => m.frzT > 0 ? 0 : 1 - Math.min(0.9, m.chill * MECH.chillPer / 100 * chillEff()); // 速度倍率：冻结时 0
function chillOn(m, n, W) {
  if (m.dead || m.frzT > 0) return;
  if (m.frzImm > 0) { m.chill = Math.min(MECH.chillMax - 1, m.chill + n); m.chillT = MECH.chillDur; return; } // 免疫期：照常冰缓，但叠不到冻结
  m.chill = Math.min(MECH.chillMax, m.chill + n); m.chillT = MECH.chillDur;
  if (m.chill >= MECH.chillMax) { m.frzT = MECH.freezeDur * chillEff() * (STATS.freezeMul || 1) * (m.boss || m.elite ? MECH.freezeBossMul : 1); if (STATS.flag.coffin) player.shield = Math.min(STATS.shield, player.shield + STATS.shield * UQX.coffinShield / 100); m.slam = null; m.chill = 0; m.chillT = 0; if (RUN) { RUN.freezes = (RUN.freezes || 0) + 1; if (RUN.dmg) RUN.dmg.fz = (RUN.dmg.fz || 0) + 1; } fx({ t: 'freeze', x: m.x, y: m.y - m.size }); }
}
// 角色被寒霜怪打中：叠冰缓（移速、攻速降低），不会被冻结
function chillPlayer(n) { player.chill = Math.min(MECH.playerChillMax, (player.chill || 0) + n); player.chillT = MECH.chillDur; }
const pChillK = () => 1 - (player.chill || 0) * MECH.chillPer / 100;
function ailment(m, e, d, W, o) {
  switch (e) {
    case 'kin': { if (o.noDebris) break; // 碎骨：周围一圈，命中伤害的 20%
      const r = W.debrisR || MECH.debrisR * UNIT; if (mobs.length <= 15 || rnd() < 0.15) fx({ t: 'ring', x: m.x, y: m.y - 4, r, el: 'kin' }); // 怪海里碎骨圈只偶尔画
      for (const n of mobs) if (n !== m && !n.dead && dist2(n, m) < r * r) { damage(n, mitigate(n, 'kin', d * MECH.debrisPct * W.debrisMore * ailEff('kin')), 'kin', false, true); if (n.dead && STATS.flag.debrisChain && (o.depth || 0) < RL.debrisChain.depth) ailment(n, 'kin', d, W, { ...o, depth: (o.depth || 0) + 1 }); }
      break; }
    case 'exp': { const k = W.afterPct || MECH.afterPct; m.after.push({ n: MECH.afterRepeats + (STATS.afterRep || 0) + (W.afterRep || 0), t: MECH.afterTick, d: d * k * ailEff('exp'), k }); break; } // 余震
    case 'ele': m.shock = Math.min(MECH.shockMax, m.shock + (o.spark && STATS.flag.sparkHeart ? SP.shockGain : 1)); // 织雷之心：游雷一次叠两层
      m.shockT = MECH.shockDur; break;
    case 'pla': m.blindT = MECH.blindDur; m.blindK = Math.min(MECH.blindMax, MECH.blindLess * W.blindMore * ailEff('pla')); break;
    case 'cold': chillOn(m, o.chill || 1, W); break;
    case 'nuc': m.rad.push({ dps: d * MECH.radPct * W.radMore * W.dotMore * ailEff('nuc') / MECH.radDur, t: MECH.radDur }); break;
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
// 碎冰（大天赋 shatter）：尸体向四周放 shardN (+ 派生 +N) 片冰片，每片 = 新星武器单次 × shardMul；冰片算派生和投射物，不穿透
function shatter(m) {
  const W = STATS.weapons.find(w => w && (w.frostNova || w.tags.includes('Nova'))); if (!W) return;
  const n = NV.shardN + (STATS.spawnAdd || 0), a0 = rf(0, Math.PI * 2);
  const old = projs.filter(p => p.shard && !p.dead), over = old.length + n - NV.maxShards; for (let k = 0; k < over && k < old.length; k++) old[k].dead = true;
  for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2 + rf(-1, 1) * (OB.jitter || 0) * Math.PI / 180, p = shoot(W, m.x, m.y - 5, a, { pierce: 0, chain: 0, split: 0, ret: 0, hit: new Set([m]), mul: NV.shardMul * (1 + ((STATS.raw['inc:proj'] || 0) + (STATS.tree.add['inc:proj'] || 0)) / 100), life: NV.shardLife, shard: 1 }); p.vx = Math.cos(a) * NV.shardSpeed; p.vy = Math.sin(a) * NV.shardSpeed; p.r = 2; }
  if (RUN && RUN.dmg) RUN.dmg.shards = (RUN.dmg.shards || 0) + n;
}
function kill(m) {
  if (m.dead) return;
  m.dead = true; S.stats.kills++;
  fx({ t: 'die', x: m.x, y: m.y, boss: m.boss, elite: m.elite, type: m.type });
  sfx(m.boss ? 'bossdie' : 'kill');
  if (!RUN) return;
  RUN.kills++;
  const hk = m.boss ? 1 : 1 / hordeN(); // 怪海：每只的推进、经验、灯火、掉落按数量摊薄
  if (!m.boss) RUN.prog += (RUN.mode === 'ladder' ? (m.elite ? LD.run.eliteP : LD.run.normalP) : 1) * hk;
  if (RUN.mode !== 'ladder') player.soul = Math.min(STATS.soulMax, player.soul + SOUL.onKill[m.boss ? 'boss' : m.elite ? 'elite' : 'normal'] * hk * STATS.soulGainMul * (RUN.base < RUN.descent.prevMax ? SOUL.revisitKillMul : 1)); // 灯火：击杀回
  deathRules(m);
  if (STATS.flag.shatter && m.frzT > 0) shatter(m); // 碎冰：冻结的敌人死了碎成冰片（冰片打死的冻结敌人也照样碎）
  const mm = manualMul();
  const xp = m.d.xp * (m.elite ? ELITE.xp : 1) * monXp(RUN.L) * (1 + LX.xp / 100) * mm * hk;
  const lad = RUN.mode === 'ladder';
  if (!lad || LD.run.xp) { gainXp(xp); modXp(xp); }
  const L = RUN.L;
  const mult = (m.boss || (lad && !LD.run.mobDrops) ? 0 : m.elite ? DROP.eliteMul : 1) * mm * hk; // 天梯：怪物不掉落，只有通关宝箱
  const shardDrop = () => { const k = rollShard(L); dropThing(m, { kind: 'shard', k }); if (rnd() * 100 < LX.twin) dropThing(m, { kind: 'shard', k }); };
  if (rnd() < DROP.item * mult * (1 + LX.iiq / 100)) RUN.cache = (RUN.cache || 0) + 1; // 战斗中不掉装备：记进这一层的 Boss 宝箱，打掉 Boss 一次掉出来
  if (rnd() < DROP.shard * mult * (1 + LX.dice / 100)) shardDrop();
  if (rnd() < DROP.mod * mult * (1 + LX.runes / 100)) dropThing(m, { kind: 'mod', mod: rollModDrop(L) });
  if (rnd() < DROP.map * mult * (1 + LX.mapDrop / 100)) dropThing(m, { kind: 'map', map: rollMapDrop(L) });
  if (m.boss) player.life = Math.min(STATS.life, player.life + STATS.life * MECH.bossKillLife / 100); // 打掉守关 Boss 回一截生命
  if (m.boss && RUN.mode === 'ladder') ladderWin(m);
  else if (m.boss) {
    const BL = PROG.bossLoot; RUN.prepFrom = RUN.gain ? RUN.gain.items.length : 0; // 整备面板列出的宝箱装备从这里开始
    const n = Math.round(BL.items * (1 + LX.iiq / 100)) + (rnd() * 100 < LX.chest ? ATLAS.marble.chestItems : 0);
    for (let i = 0; i < n; i++) dropThing(m, { kind: 'item', item: rollItem(L + BL.ilvlBonus, BL.rarityBonus + LX.iir, true) }, 1);
    const c = Math.round((RUN.cache || 0) * BL.cacheMul); RUN.cache = 0; // 这一层攒下的装备（倍数补偿撤回 / 灯灭时没打到 Boss 的那部分）
    for (let i = 0; i < c; i++) dropThing(m, { kind: 'item', item: rollItem(L, LX.iir) }, 1);
    fx({ t: 'chest', x: m.x, y: m.y, n: n + c });
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
    if (G.ui) G.ui.banner(bi >= 0 ? `获得祝福：${BOONS[bid][bi].n}` : RUN.result === 'retreat' ? `险胜 · 撤回 · 宝箱 ${n + c} 件` : `第 ${RUN.base} 层通过 · 宝箱 ${n + c} 件`);
  }
}
function dropThing(m, o, burst) { const a = burst ? rf(0, Math.PI * 2) : 0, sp = burst ? rf(40, 90) : 0; drops.push({ ...o, x: m.x + rf(-6, 6), y: m.y + rf(-4, 4), z: 6, vz: burst ? rf(90, 130) : rf(50, 80), vx: burst ? Math.cos(a) * sp : rf(-30, 30), vy: burst ? Math.sin(a) * sp * .6 : rf(-14, 14), age: 0 }); if ((o.kind === 'item' && o.item.rar >= 2) || o.kind === 'glyph') sfx('rare'); }
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
// 旋涡之履：1 = 叠满（或永冬自动脉冲中），0 = 没有层数，0.5 = 中间，-1 = 没穿
function vortexState() {
  if (!STATS.flag.vortexTreads) return -1; if (STATS.weapons.some(W => W && W.autoNova)) return 1;
  let full = false, any = false; STATS.weapons.forEach((W, i) => { if (W && W.whirl) { const n = player.spin[i].n; if (n >= W.stackMax) full = true; if (n > 0) any = true; } });
  return full ? 1 : any ? 0.5 : 0;
}
const vortexMove = () => { const v = vortexState(); return v === 1 ? 1 + UQX.vortex.moveFull / 100 : v === 0 ? 1 - UQX.vortex.moveNone / 100 : 1; };
// 受击反馈：最多每 0.4 秒一次，强度按这一下占最大生命的比例（以前每一下都把生命球刷白、角色闪白，怪多时一直闪）
function hurtFeedback(d) {
  if (G.time - (player.fbT0 || -9) < 0.4) return;
  player.fbT0 = G.time; player.fb = Math.min(1, 0.3 + d / STATS.life * 5); player.fbT = 0.2; sfx('hurt');
  if (G.world && d > STATS.life * 0.08) G.world.shake(60, 0.002 + 0.002 * player.fb);
}
/* 通用防御（spec-tree-defense §1）
   控场：出手那一刻怪身上有你的控制 → 这一下 ×(1 − 控场%)；投射物、火圈在发射/放置时记下 ck
   贴身 / 远离：每帧数一遍身边的怪（closeStep），受伤时按当时的计数结算 */
const GD = MECH.generic;
const isCtrl = m => !!m && (m.chill > 0 || m.frzT > 0 || m.stunT > 0 || m.blindT > 0 || m.slowT > 0 || Math.hypot(m.kx || 0, m.ky || 0) > GD.knockMin);
const ctrlK = m => isCtrl(m) ? 1 - STATS.ctrlWeaken / 100 : 1;
function closeStep() {
  let n = 0, far = true; const r1 = GD.closeR ** 2, r2 = GD.farR ** 2;
  for (const m of mobs) { if (m.dead || m.rise > 0.2) continue; const d2 = dist2(m, player); if (d2 < r2) far = false; if (d2 < r1) n += m.boss ? 3 : m.elite ? 2 : 1; }
  player.closeN = n; player.farOK = far;
  const T = RUN.gd ??= { t: 0, closeT: 0, hitC: 0, hitF: 0 }; T.t += 1 / 60; if (n > 0) T.closeT += 1 / 60;
}
function genericTaken() {
  const FL = STATS.flag, n = player.closeN || 0; let k = 1;
  if (n > 0) k *= 1 - Math.min(STATS.closeCap, n * STATS.closePer) / 100;
  if (player.farOK && STATS.farDR > 0) k *= 1 - STATS.farDR / 100;
  if (FL.ironWall && n === 0) k *= 1 + RL.ironWall.alone / 100;
  if (FL.loneWolf && n > 0) k *= 1 + RL.loneWolf.crowd / 100;
  return k;
}
/* 续航：命中回护盾上限的 ‰，每秒最多 sohCap%（1 秒的桶） */
function shieldOnHit() {
  if (!STATS.shieldOnHit || !RUN || player.shield >= STATS.shield) return;
  if (!(player.sohT > RUN.t)) { player.sohT = RUN.t + 1; player.sohGot = 0; }
  const cap = STATS.shield * STATS.sohCap / 100, g = Math.min(STATS.shield * STATS.shieldOnHit / 1000, cap - player.sohGot); if (g <= 0) return;
  player.sohGot += g; player.shield = Math.min(STATS.shield, player.shield + g); if (RUN.soh !== undefined) RUN.soh += g;
}
function hurtPlayer(d, el, ck = 1) {
  if (!RUN || RUN.ending || player.dashT > 0 || player.hurtT > 0) return;
  if (rnd() * 100 < STATS.dodge) {
    fx({ t: 'text', x: player.x, y: player.y - 16, s: '闪避', c: COL.dim });
    if (STATS.flag.dodgeSpikes) for (const m of mobs) if (!m.dead && dist2(m, player) < RL.dodgeSpikes.r ** 2) { damage(m, mitigate(m, 'kin', STATS.shield * (RL.dodgeSpikes.shieldPct ?? RL.dodgeSpikes.armorPct) / 100), 'kin', false); fx({ t: 'spike', x: m.x, y: m.y, el: 'kin' }); }
    return;
  }
  const FL = STATS.flag;
  d *= ck * genericTaken(); /* 控场、贴身、远离：流派减伤这一格，各自相乘 */
  if (FL.still && isStill()) d *= 1 - RL.still.takenLess / 100;
  if (FL.rotFlesh) { const R = RL.rotFlesh; let n = 0; for (const x of mobs) if (!x.dead && x.rad.length && dist2(x, player) < R.r * R.r) n++; d *= 1 - Math.min(R.max, n * R.per) / 100; }
  const tk = FL.takenKin || 0;
  d = d * (1 - tk) * (1 - STATS.res[el] / 100) + d * tk * (1 - STATS.res.kin / 100);
  d *= 1 - armorDr(STATS.armor, d); // 护甲：对碎伤减得多，对重击减得少
  if (STATS.flag.vortexTreads && vortexState() === 1) d *= 1 - UQX.vortex.takenFull / 100; // 旋涡之履
  if (player.guardT > 0) d *= 1 - MECH.meleeGuardLess;
  d *= 1 - Math.max(0, ...STATS.weapons.map((W, i) => W && W.whirl ? Math.min(WH.drCap, WH.drPerStack * player.spin[i].n) : 0)) / 100; // 旋身：每层当前旋转减伤，有上限
  if (RUN.gd) RUN.gd[player.closeN > 0 ? 'hitC' : 'hitF'] += d / STATS.life; /* 模拟统计：贴身 / 不贴身时的承伤（按生命上限的比例） */
  if (player.shield > 0) { const a = Math.min(player.shield, d); player.shield -= a; d -= a; fx({ t: 'shield', x: player.x, y: player.y }); }
  if (d > 0 && FL.absorb) player.shield = Math.min(STATS.shield, player.shield + d * RL.absorb.pct / 100); // 圣盾：扣到生命的一部分转成护盾
  if (d > 0) { player.life -= d; player.hurtT = MECH.hurtInvuln; fx({ t: 'num', x: player.x, y: player.y - 18, v: d, el, hurt: true }); hurtFeedback(d); }
  // 荆棘甲：受击时伤害周围
  for (const W of STATS.weapons) if (W && W.form === 'reflect') { fx({ t: 'ring', x: player.x, y: player.y - 4, r: W.aoeR, el: W.el }); for (const m of mobs) if (!m.dead && dist2(m, player) < (W.aoeR + m.size) ** 2) hitMob(m, W); }
  if (player.life <= 0) { player.life = 0; RUN.result = 'dead'; RUN.ending = 1.6; S.stats.deaths++; sfx('out'); if (G.ui) G.ui.banner('灯火熄灭'); }
  return true;
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
    player.x += dx / dl * d; player.y += dy / dl * d; if (!RUN) { player.x = clamp(player.x, FIX.x0, FIX.x1); player.y = clamp(player.y, FIX.y0, FIX.y1); }
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
    case 'nova': { // 圣钟 / 霜钟：以自身为中心
      if (!inRange(W, W.rng)) return false;
      const n = attacks(W), cost = NV.soulPerCast * (1 - STATS.soulLess), frost = W.frostNova && (!RUN || player.soul >= cost); // 霜环：灯火不够时放普通的新星；先叠冰缓再结算伤害，这一下冻住的怪当场吃“冻结受伤提高”，打死就碎
      const f0 = RUN ? RUN.freezes || 0 : 0, kb = NV.knockPx * Math.log(50); // 击退 knockPx 像素（kx 每秒衰减到 2%，位移 ≈ kx ÷ ln50）
      for (let k = 0; k < n; k++) { fx({ t: 'boom', x: px, y: py + 6, r: W.aoeR, el: W.el }); for (const m of mobs) if (!m.dead && m.rise <= 0.2 && dist2(m, player) < (W.aoeR + m.size) ** 2) { if (frost) chillOn(m, W.chillStacks, W); hitMob(m, W, frost ? { mul: W.novaMul } : {}); if (frost && !m.dead) { if (!m.boss) { const dx = m.x - player.x, dy = m.y - player.y, d = Math.hypot(dx, dy) || 1; m.kx += dx / d * kb; m.ky += dy / d * kb; } } } aoePull(px, py + 6, W.aoeR); }
      if (W.autoNova && STATS.flag.iceGround) pushGround({ ice: 1, gk: 'ice', x: px, y: py + 6, r: W.aoeR * UQX.iceGround.rMul, t: UQX.iceGround.dur, tickT: 0.5, tick: 0 });
      if (frost && RUN) player.soul = Math.min(STATS.soulMax, Math.max(0, player.soul - cost) + Math.min(NV.refundCap, ((RUN.freezes || 0) - f0) * NV.refund)); // 每冻结一只返还
      sfx('boom'); return true;
    }
    case 'orb': { // 寒魄宝珠：朝怪最密的方向放慢速冰球（无限穿透），插符文的沿途放冰片
      const live = mobs.filter(m => !m.dead && m.rise <= 0.2 && dist2(m, player) < (W.rng + m.size) ** 2); if (!live.length) return false;
      const cost = OB.soulPerCast * (W.orbCost || 1) * (1 - STATS.soulLess), rune = W.frostOrb && (!RUN || player.soul >= cost); if (rune && RUN) player.soul -= cost;
      const dR = AU.orb.denseR ** 2; let best = live[0], bn = -1; for (const a of live) { let c = 0; for (const b2 of live) if (dist2(a, b2) < dR) c++; if (c > bn) { bn = c; best = a; } }
      const a0 = Math.atan2(best.y - 5 - py, best.x - px), n = attacks(W), fan = OB.fan * Math.PI / 180, cast = { ref: 0, rune };
      for (let k = 0; k < n; k++) { const a = a0 + (k - (n - 1) / 2) * fan; projs.push({ W, orb: 1, x: px, y: py, a, vx: Math.cos(a) * W.orbSpd, vy: Math.sin(a) * W.orbSpd, life: W.orbLife, age: 0, el: W.el, r: 5, sch: W.chain, rune, cast, emitT: OB.emit, rot: rf(0, Math.PI * 2), touch: new Map(), hit: new Set(), mul: 1 }); }
      sfx('shoot'); return true;
    }
    case 'meteor': { // 坠星杖：选射程内敌人最多的点（按速度 × 延迟预判），预警后落地
      const live = mobs.filter(m => !m.dead && m.rise <= 0.2 && dist2(m, player) < (W.rng + m.size) ** 2); if (!live.length) return false;
      const cost = MT.soulPerCast * (1 - STATS.soulLess), rune = W.meteor && (!RUN || player.soul >= cost); if (rune && RUN) player.soul -= cost; // 灯火不够时放不带符文的陨石
      const delay = W.delayTot || (W.delay || MT.delay), R2 = W.aoeR * W.aoeR; let best = live[0], bn = -1;
      for (const a of live) { let c = 0; for (const b2 of live) if (dist2(a, b2) < R2) c++; if (c > bn) { bn = c; best = a; } }
      let cx = 0, cy = 0, vx = 0, vy = 0, k0 = 0; for (const b2 of live) if (dist2(best, b2) < R2) { cx += b2.x; cy += b2.y; vx += b2.vx || 0; vy += b2.vy || 0; k0++; }
      cx = cx / k0 + vx / k0 * delay; cy = cy / k0 + vy / k0 * delay; // 预判：那群怪的平均速度 × 延迟
      const sf = STATS.flag.starfall, n = attacks(W) * (sf ? MT.sfN : 1);
      let off = 0; // 多颗陨石错落落下：每多一颗随机晚 0.1–0.35 秒，位置再抖几像素
      for (let k = 0; k < n; k++) {
        if (k) off += rf(0.1, 0.35);
        const a = rf(0, Math.PI * 2), rr = sf || k ? Math.sqrt(Math.random()) * W.aoeR * (sf ? MT.sfSpread : 0.5) : 0, T = delay * (sf ? MT.sfDelay : 1) + off, jx = k ? rf(-4, 4) : 0, jy = k ? rf(-3, 3) : 0;
        meteors.push({ W, x: cx + Math.cos(a) * rr + jx, y: cy + Math.sin(a) * rr + jy, r: W.aoeR * (sf ? MT.sfAoe : 1), t: T, T, mul: (rune ? W.meteorMul : 1) * (sf ? MT.sfMul : 1), ground: rune ? W.ground : null });
      }
      return true;
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
    const n = W.sparkN + attacks(W) - 1, vol = { last: new Map() }, life = SP.life * W.sparkLifeMul; // 颗数 = 符文的 sparkN + 投射物 +N（相加，照流放之路），寿命吃持续时间和投射物持续时间
    const old = projs.filter(p => p.spark && !p.dead), over = old.length + n - SP.maxAlive; for (let k = 0; k < over && k < old.length; k++) old[k].dead = true; // 同屏上限：最老的先消失
    for (let k = 0; k < n; k++) shoot(W, px, py, a + (n > 1 ? (k / (n - 1) - 0.5) * SP.fan : 0), { pierce: W.pierce, chain: 0, sch: W.chain, split: 0, ret: 0, hit: new Set(), mul: W.sparkMul, life, first: true, spark: 1, vol, ph: k % 2 ? Math.PI : 0 });
    if (RUN && RUN.dmg) RUN.dmg.sN = (RUN.dmg.sN || 0) + n; // 模拟统计：放出的游雷颗数
    if (RUN) player.soul = Math.max(0, player.soul - SP.soulPerCast * (1 - STATS.soulLess));
    sfx('shoot'); return true;
  }
  const n = attacks(W), pel = W.b.pellets || 1;
  for (let k = 0; k < n; k++) for (let j = 0; j < pel; j++) {
    const aa = a + (k - (n - 1) / 2) * 0.16 + (pel > 1 ? (j - (pel - 1) / 2) * 0.12 + rf(-0.04, 0.04) : 0);
    shoot(W, px, py, aa, { pierce: W.pierce, chain: W.chain, split: W.split, ret: W.ret, hit: new Set(), mul: 1, life: (W.rng || 160) / W.spd * W.projLifeMul, first: true });
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
// 回音冠：弹射过的投射物命中时小爆（算范围）
function echoBurst(m, W) { const r = UQX.echoR; fx({ t: 'boom', x: m.x, y: m.y - 3, r, el: W.el }); for (const n of mobs) if (!n.dead && n.rise <= 0.2 && dist2(n, m) < (r + n.size) ** 2) hitMob(n, W, { mul: STATS.flag.echoCrown }); }
// 地面效果（火地、冰地、毒池）：同一位置默认只留 1 层（新的顶掉旧的），焦土法阵可叠 groundStack 层
function pushGround(z) { const N = STATS.flag.groundStack || 1, same = zones.filter(o => !o.enemy && o.gk === z.gk && dist2(o, z) < (z.r * 0.5) ** 2).sort((a, b) => a.t - b.t); for (let k = 0; k <= same.length - N; k++) same[k].t = 0; zones.push(z); }
function projHit(p, m) {
  if (p.oshard) orbShardHit(p, m);
  if (STATS.flag.echoCrown && (p.bn || 0) > 0 && !p.shard) echoBurst(m, p.W);
  if (p.shard && !p.oshard && STATS.flag.shardCrown && !p.gen) { const n = UQX.crownN, a0 = rf(0, Math.PI * 2); for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2, q = shoot(p.W, m.x, m.y - 5, a, { pierce: 0, chain: 0, split: 0, ret: 0, hit: new Set([m]), mul: p.mul * UQX.crownMul, life: NV.shardLife, shard: 1, gen: 1 }); q.vx = Math.cos(a) * NV.shardSpeed; q.vy = Math.sin(a) * NV.shardSpeed; } } // 碎晶冠：碎冰冰片再派生一层
  if (p.W.impSpawn && !p.child && !p.spawned && !p.shard) { p.spawned = 1; shoot(p.W, m.x, m.y - 5, rf(0, Math.PI * 2), { pierce: 0, chain: 0, split: 0, ret: 0, hit: new Set([m]), mul: p.mul * 0.5, life: 0.8, child: 1 }); } // 疫星仪隐性：派生 +1
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
    if (RUN && RUN.dmg) { RUN.dmg[p.forked ? 'fork' : 'spark'] = (RUN.dmg[p.forked ? 'fork' : 'spark'] || 0) + d; if (!p.forked) RUN.dmg.sH = (RUN.dmg.sH || 0) + 1; }
    if (STATS.flag.chainCrown && shocked && !p.forked && !p.didFork) { p.didFork = 1; for (let i = 0; i < SP.forkN; i++) shoot(p.W, m.x, m.y - 5, p.a + (i - (SP.forkN - 1) / 2) * 1.2, { pierce: 0, chain: 0, sch: 0, split: 0, ret: 0, hit: new Set([m]), mul: p.mul * SP.forkMul, life: 0.8, spark: 1, forked: 1, vol: p.vol, ph: i ? Math.PI : 0 }); }
    fx({ t: 'sflash', x: m.x, y: m.y - 5 });
    if (p.pierce > 0) { p.pierced = true; return false; } // 无限穿透：有穿透就穿过所有敌人（同一串对同一个敌人每 rehit 秒最多打一次）
    return true;
  }
  const bn = p.bn || 0; // 已经弹射了几次
  hitMob(m, p.W, { mul: mul * (1 + p.W.chainStep * bn) }); if (bn && STATS.flag.chainCrown) shockOn(m);
  fx({ t: 'hit', x: m.x, y: m.y - 5, el: p.el });
  if (p.first && p.split > 0) { // 分裂：向前方散开
    const s = p.split;
    for (let i = 0; i < s; i++) shoot(p.W, m.x, m.y - 5, p.a + (i - (s - 1) / 2) * 0.5, { pierce: p.pierce, chain: p.chain, split: 0, ret: 0, hit: new Set([m]), mul: p.mul, life: 0.6 });
    return true;
  }
  p.first = false;
  if (p.pierce > 0) { p.pierced = true; (p.last || (p.last = new Map())).set(m, RUN ? RUN.t : 0); return false; } // 无限穿透：穿过所有敌人，同一个敌人每 proj.rehit 秒最多打一次；弹射只管碰屏幕边反弹
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
  if (RUN && RUN.prep && !RUN.ending) return prepStep(dt); // 整备：世界暂停
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
    const tg = at || (fieldActive() ? { x: mouse.x + CAM.x, y: mouse.y + 4 + CAM.y } : null); // 鼠标是屏幕坐标，换成世界坐标
    if (tg) { const dx = tg.x - player.x, dy = tg.y - player.y, d = Math.hypot(dx, dy); if (d > 2) { const s = P.speed * vortexMove() * Math.min(1, d / 24) * (spinning() ? WH.spinMoveMul : 1) * pChillK(); tvx = dx / d * s; tvy = dy / d * s; } }
    const ax = tvx - player.vx, ay = tvy - player.vy, al = Math.hypot(ax, ay), step = P.accel * dt;
    if (al <= step) { player.vx = tvx; player.vy = tvy; } else { player.vx += ax / al * step; player.vy += ay / al * step; }
    player.x += player.vx * dt; player.y += player.vy * dt;
    if (Math.abs(player.vx) > 4) player.face = player.vx > 0 ? 1 : -1;
  }
  if (!RUN) { player.x = clamp(player.x, FIX.x0, FIX.x1); player.y = clamp(player.y, FIX.y0, FIX.y1); }
  camStep(dt);
  player.dash = Math.min(P.dashMax, player.dash + P.dashRegen * dt);
  if (player.adT > 0) player.adT -= dt;
  if (player.hurtT > 0) player.hurtT -= dt;
  if (player.fbT > 0) player.fbT -= dt;
  if (RUN) { closeStep(); if (RUN.gd) { RUN.gd.t += dt - 1 / 60; if (player.closeN > 0) RUN.gd.closeT += dt - 1 / 60; } }
  if (player.guardT > 0) player.guardT -= dt;
  player.shield = Math.min(P.shield, player.shield + P.shieldRegen * (1 - ((RUN && RUN.mob.noRegen) || 0) / 100) * dt); // 护盾每秒回复，挨打也照回；生命不自然回复
  player.swing = player.swing.map(v => Math.max(0, v - dt));
  player.orbitA += dt * 5 * (1 + 0.12 * Math.max(player.spin[0].n, player.spin[1].n)); // 旋转层数越高转得越快
  if (!RUN) { player.life = P.life; player.shield = P.shield; player.soul = P.soulMax; return; }
  // 魂火：天梯里每秒自然回复；推关里是灯火，每秒燃烧，越深越快，只靠击杀回。转旋风的时候每秒另外消耗 whirl.soulPerSec
  const spin = spinning(), lad = RUN.mode === 'ladder';
  if (!RUN.ending && !RUN.next) {
    const rv = !lad && RUN.base < RUN.descent.prevMax; // 重温已经打过的层
    const net = (lad ? P.soulRegen : -(SOUL.burn + RUN.base * SOUL.burnPerFloor) * P.burnMul * (rv ? SOUL.revisitBurnMul : 1)) - (spin ? WH.soulPerSec * (1 - P.soulLess) : 0);
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
    const keepAll = ['win', 'lampout', 'retreat', 'emergency', 'abandon'].includes(RUN.result);
    for (const dp of drops) if (keepAll) collect(dp);
    if (keepAll) drops = [];
    if (RUN.ending <= 0) finishRun();
    stepProjs(dt); return;
  }
  if (RUN.next) { // 下一层之前：捡起地上的东西
    for (const dp of drops) { dp.age += dt; if (dp.z > 0 || dp.vz > 0) { dp.vz -= 260 * dt; dp.z = Math.max(0, dp.z + dp.vz * dt); dp.x += dp.vx * dt; dp.y += dp.vy * dt; if (!dp.z) dp.vz = 0; } else if (dp.age > 0.6) { const dx = player.x - dp.x, dy = player.y - dp.y, dl = Math.hypot(dx, dy); if (dl < 6) { collect(dp); dp.done = true; } else { dp.x += dx / dl * Math.min(260 * dt, dl); dp.y += dy / dl * Math.min(260 * dt, dl); } } } // 宝箱先炸开落地，再飞向玩家
    drops = drops.filter(d => !d.done);
    RUN.next = Math.max(0, RUN.next - dt); if (!RUN.next) { for (const dp of drops) collect(dp); drops = []; openPrep(); }
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
    const R = PROG.run, HD = R.horde, HN = hordeN(), cap = Math.min(HD.hardCap || 999, Math.round((R.spawnCapBase + Math.min(R.spawnCapMaxExtra, RUN.L)) * RUN.dens * HN));
    if (RUN.spawnT <= 0 && mobs.length < cap) { // 一次刷一群，挤在场边同一处
      let o = {};
      if (RUN.lastPack && rnd() < (HD.surround || 0)) { // 包围：刷到上一群的对面（以角色为中心对称，再贴到最近的场边）
        o = ringPoint(18, Math.atan2(player.y - RUN.lastPack.y, player.x - RUN.lastPack.x) + rf(-0.3, 0.3));
      }
      const n = Math.min(cap - mobs.length, ri(HD.pack[0], HD.pack[1])), first = spawnMob(pickMob(RUN.L), o); RUN.lastPack = { x: first.x, y: first.y };
      for (let i = 1; i < n; i++) spawnMob(pickMob(RUN.L), { x: first.x + rf(-14, 14), y: first.y + rf(-10, 10) });
      RUN.spawnT = Math.max(R.spawnIntervalMin, R.spawnInterval - RUN.L * R.spawnIntervalPerLevel) / RUN.dens / HN * n;
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
    player.wcd[i] -= dt * pChillK();
    if (player.wcd[i] <= 0) { if (fire(W, i)) player.wcd[i] = W.aps ? 1 / W.aps : 0.5; else player.wcd[i] = 0.05; }
  });
  stepProjs(dt);
  if (STATS.shieldW) stepShieldThrow(STATS.shieldW, dt); else if (STATS.armorHeld != null) STATS.armor = STATS.armorHeld;
  stepZones(dt); stepMeteors(dt);
  if (player.chillT > 0) { player.chillT -= dt; if (player.chillT <= 0) player.chill = 0; }
  // 敌人
  for (const m of mobs) {
    if (m.dead) continue;
    m.t += dt; if (m.fl > 0) m.fl -= dt; if (m.flCd > 0) m.flCd -= dt; if (m.ramT > 0) m.ramT -= dt; if (m.slowT > 0) m.slowT -= dt;
    if (m.rise > 0) { m.rise -= dt; continue; }
    if (m.boss && m.t > MECH.fatigueStart) m.fat = Math.min(MECH.fatigueMax, Math.floor(m.t - MECH.fatigueStart));
    // 异常
    if (m.shockT > 0) { m.shockT -= dt; if (m.shockT <= 0) m.shock = 0; }
    if (m.chillT > 0) { m.chillT -= dt; if (m.chillT <= 0) m.chill = 0; }
    if (m.frzImm > 0) m.frzImm -= dt;
    if (m.shredT > 0) m.shredT -= dt;
    if (m.blindT > 0) m.blindT -= dt;
    if (m.burn > 0.5) { m.burnT -= dt; if (m.burnT <= 0) { m.burnT = MECH.burnTick; const tk = m.burn * MECH.burnTickPct, keep = STATS.flag.burnKeep; m.burn -= tk * (1 - (m.burnSlow || 0)) * (keep ? RL.burnKeep.drainMul : 1) + (keep ? 0 : m.burn * MECH.burnDecay); damage(m, mitigate(m, 'exp', tk * (keep ? RL.burnKeep.dmgMul : 1)), 'exp', false, true); if (rnd() < 0.3) fx({ t: 'burn', x: m.x, y: m.y }); } }
    else m.burn = 0;
    if (m.rad.length) { let d = 0; for (const r of m.rad) { d += r.dps * Math.min(dt, r.t); r.t -= dt; } m.rad = m.rad.filter(r => r.t > 0); m.radAcc = (m.radAcc || 0) + d; m.radT = (m.radT || 0) + dt; if (m.radT > 0.25) { damage(m, mitigate(m, 'nuc', m.radAcc), 'nuc', false, true); m.radAcc = 0; m.radT = 0; } }
    for (const a of m.after) { a.t -= dt; if (a.t <= 0 && a.n > 0) { a.n--; a.t = MECH.afterTick; damage(m, mitigate(m, 'exp', a.d), 'exp', false, true); a.d *= a.k || MECH.afterPct; fx({ t: 'ring', x: m.x, y: m.y - 4, r: 10, el: 'exp' }); } }
    m.after = m.after.filter(a => a.n > 0);
    if (m.dead) continue;
    if (m.stunT > 0) { m.stunT -= dt; m.vx = m.vy = 0; m.x += m.kx * dt; m.y += m.ky * dt; const kd = Math.pow(0.02, dt); m.kx *= kd; m.ky *= kd; continue; } // 陨石眩晕：同冻结，不能移动、攻击
    if (m.frzT > 0) { m.frzT -= dt; if (m.frzT <= 0) { m.frzT = 0; m.frzImm = MECH.freezeImmune; m.chill = 0; } m.vx = m.vy = 0; m.x += m.kx * dt; m.y += m.ky * dt; const kd = Math.pow(0.02, dt); m.kx *= kd; m.ky *= kd; continue; } // 冻结：不能移动、攻击、重击
    // 行动
    const bl = (m.blindT > 0 ? 1 - m.blindK : 1) * (m.groundT > RUN.t ? 1 - MT.groundWeaken : 1); // 站在陨火火地里伤害总降
    const dx = player.x - m.x, dy = player.y - m.y, d = Math.hypot(dx, dy) || 1;
    m.face = dx >= 0 ? 1 : -1;
    let want = m.d.ai === 'ranged' ? (d > m.d.rng * 0.8 ? 1 : d < m.d.rng * 0.5 ? -1 : 0) : 1;
    if (m.boss && m.d.pat === 'ring' && m.t % PAT.ring.chargeEvery > PAT.ring.chargeFrom) want = PAT.ring.chargeSpeed; // 骸骨领主冲锋
    if (m.boss && m.d.pat === 'blink') want = d < PAT.blink.keepAway ? PAT.blink.awaySpeed : PAT.blink.nearSpeed;
    const ck = chillK(m), sl = (m.slowT > 0 ? 1 - RL.timeStop.slow / 100 : 1) * ck; m.vx = dx / d * m.spd * want * sl; m.vy = dy / d * m.spd * want * sl;
    m.x += (m.vx + m.kx) * dt; m.y += (m.vy + m.ky) * dt;
    const kd = Math.pow(0.02, dt); m.kx *= kd; m.ky *= kd;
    m.atkCd -= dt * ck; m.cd -= dt * ck; // 冰缓也降攻速
    const MA = PROG.monsterAttack;
    if (d < m.size + MA.touch && m.atkCd <= 0) { hurtPlayer(m.dmg * bl, m.el, ctrlK(m)); m.atkCd = MA.meleeCd; }
    slamStep(m, dt * ck, bl);
    if (m.boss && m.cd <= 0) bossAct(m, Math.atan2(dy, dx), bl);
    else if (m.d.ai === 'ranged' && m.cd <= 0) {
      m.cd = m.d.cd; const lt = m.d.lead ? d / MA.shotSpd * m.d.lead : 0, a = Math.atan2(player.y + player.vy * lt - m.y, player.x + player.vx * lt - m.x); // lead：按角色速度预判落点
      projs.push({ enemy: true, x: m.x, y: m.y - 6, vx: Math.cos(a) * MA.shotSpd, vy: Math.sin(a) * MA.shotSpd, life: m.d.pool ? Math.min(MA.shotLife, d / MA.shotSpd) : MA.shotLife, dmg: m.dmg * bl, ck: ctrlK(m), el: m.el, chill: m.d.chill, pool: m.d.pool ? { ...m.d.pool, dmg: m.dmg * m.d.pool.dmg * bl } : null }); // 骨法师：弹飞到角色当时的位置落地留火圈
    }
  }
  // 互相推开
  for (let i = 0; i < mobs.length; i++) for (let j = i + 1; j < mobs.length; j++) {
    const a = mobs[i], b = mobs[j]; if (a.dead || b.dead) continue;
    const dx = b.x - a.x, dy = b.y - a.y, r = a.size + b.size, dd = dx * dx + dy * dy;
    if (dd < r * r && dd > 0.01) { const d = Math.sqrt(dd), push = (r - d) / 2; const ux = dx / d * push, uy = dy / d * push; if (!a.boss) { a.x -= ux; a.y -= uy; } if (!b.boss) { b.x += ux; b.y += uy; } }
  }
  // 离得太远的怪（被甩在身后）挪回视野外一圈，保持怪的密度；Boss 不挪，屏幕边有箭头指着
  for (const m of mobs) if (!m.dead && !m.boss && offView(m, 170)) { const q = ringPoint(18, Math.atan2(player.vy || rf(-1, 1), player.vx || rf(-1, 1)) + rf(-0.9, 0.9)); m.x = q.x; m.y = q.y; m.slam = null; }
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
    if (dist2(player, s) < s.r * s.r && RUN && !RUN.ending) { if (player.dashT <= 0) RUN.slamHits = (RUN.slamHits || 0) + 1; hurtPlayer(m.dmg * C.mul * bl, m.el, ctrlK(m)); }
    return;
  }
  m.slamCd = (m.slamCd ?? C.every * rf(0.5, 1)) - dt;
  if (m.slamCd <= 0 && m.rise <= 0) { m.slamCd = C.every; m.slam = { x: player.x, y: player.y, r: C.r, t: C.windup, T: C.windup }; }
}
// Boss 招式：每个 Boss 一套
function bossAct(m, aim, bl) {
  const shot = (a, v, k) => projs.push({ enemy: true, x: m.x, y: m.y - 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: PROG.monsterAttack.shotLife, dmg: m.dmg * k * bl, ck: ctrlK(m), el: m.el });
  const B = PAT[m.d.pat];
  switch (m.d.pat) {
    case 'ring': m.cd = B.cd; for (let k = 0; k < B.shots; k++) shot(k / B.shots * Math.PI * 2 + m.t, B.shotSpd, B.shotDmg); break;
    case 'blink': {
      m.cd = B.cd; const a = rf(0, Math.PI * 2);
      fx({ t: 'ring', x: m.x, y: m.y - 8, r: 16, el: 'pla' });
      m.x = clamp(player.x + Math.cos(a) * B.distX, F.x0 + 10, F.x1 - 10); m.y = clamp(player.y + Math.sin(a) * B.distY, F.y0 + 10, F.y1); // 视野内
      fx({ t: 'ring', x: m.x, y: m.y - 8, r: 16, el: 'pla' });
      for (let w = 0; w < B.waves; w++) for (let k = 0; k < B.shots; k++) shot(k / B.shots * Math.PI * 2 + w * 0.35, B.shotSpd + w * B.shotSpdStep, B.shotDmg);
      break;
    }
    case 'pool':
      m.cd = B.cd; zones.push({ enemy: true, x: player.x, y: player.y, r: B.r, t: B.dur, tickT: B.poolTick, dmg: m.dmg * B.poolDmg * bl, ck: ctrlK(m), el: 'nuc' });
      for (let k = 0; k < B.shots; k++) shot(aim + (k - (B.shots - 1) / 2) * B.spread, B.shotSpd, B.shotDmg);
      break;
    case 'bolt':
      m.cd = B.cd; for (let k = 0; k < B.shots; k++) shot(aim + (k - (B.shots - 1) / 2) * B.spread, B.shotSpd, B.shotDmg);
      m.summon = (m.summon || 0) + 1;
      if (m.summon % B.summonEvery === 0) for (let k = 0; k < B.summonN; k++) spawnMob(B.summon, { x: m.x + rf(-30, 30), y: clamp(m.y + rf(-20, 20), F.y0, F.y1) });
      break;
  }
}
function orbShards(W, x, y, n, a0, mul, cast, gen, skip) { // 寒魄球的冰片：不穿透，算投射物（寒魄宝珠本身有投射物标签），同屏最多 maxShards
  const old = projs.filter(p => p.shard && !p.dead), over = old.length + n - OB.maxShards; for (let k = 0; k < over && k < old.length; k++) old[k].dead = true;
  for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2 + rf(-1, 1) * (OB.jitter || 0) * Math.PI / 180, p = shoot(W, x, y, a, { pierce: 0, chain: 0, split: 0, ret: 0, hit: new Set(skip ? [skip] : []), mul, life: OB.shardLife, shard: 1, oshard: 1, cast, gen }); p.vx = Math.cos(a) * OB.shardSpeed; p.vy = Math.sin(a) * OB.shardSpeed; p.r = 2; }
  if (RUN && RUN.dmg) RUN.dmg.oshards = (RUN.dmg.oshards || 0) + n;
}
function orbShardHit(p, m) { // 冰片命中：打中冻结的敌人返还灯火；碎冰连锁再派生一层
  const c = p.cast; if (RUN && c && c.rune && m.frzT > 0 && c.ref < OB.refundCap) { const r = Math.min(OB.refund, OB.refundCap - c.ref); c.ref += r; player.soul = Math.min(STATS.soulMax, player.soul + r); }
  const lim = (STATS.flag.shardChain ? 1 : 0) + (STATS.flag.shardCrown ? 1 : 0), g = p.gen || 0; // 碎冰连锁一层，碎晶冠再加一层（每层 ×0.5）
  if (g < lim) orbShards(p.W, m.x, m.y - 5, STATS.flag.shardChain && !g ? OB.scN : UQX.crownN, rf(0, Math.PI * 2), p.mul * OB.scMul, c, g + 1, m);
}
function stepOrb(p, dt) { // 冰球：直线慢飞，碰屏幕边反弹（弹射次数），碰到的敌人每 contactTick 秒命中一次，寿命到了炸冰环
  p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.age += dt;
  const hx = p.x < F.x0 || p.x > F.x1, hy = p.y < F.y0 - 6 || p.y > F.y1;
  if ((hx || hy) && p.sch > 0) { if (hx) p.vx = -p.vx; if (hy) p.vy = -p.vy; p.x = clamp(p.x, F.x0, F.x1); p.y = clamp(p.y, F.y0 - 6, F.y1); p.sch--; p.bn = (p.bn || 0) + 1; fx({ t: 'bounce', x: p.x, y: p.y }); }
  for (const m of mobs) if (!m.dead && m.rise <= 0.2 && dist2(m, p) < (p.r + m.size) ** 2) { const t = p.touch.get(m); if (t == null || p.age - t >= OB.contactTick) { p.touch.set(m, p.age); hitMob(m, p.W, { mul: OB.contactMul }); if (STATS.flag.echoCrown && p.bn) echoBurst(m, p.W); } }
  if (p.rune) { p.emitT -= dt; while (p.emitT <= 0) { p.emitT += p.W.orbEmit || OB.emit; p.rot += OB.rot * Math.PI / 180; orbShards(p.W, p.x, p.y, OB.shardDirs + (STATS.spawnAdd || 0), p.rot, p.W.shardMul, p.cast, 0, null); } }
  if (p.life <= 0) { p.dead = true; fx({ t: 'frostburst', x: p.x, y: p.y, r: OB.endR }); if (p.rune) orbShards(p.W, p.x, p.y, (OB.endShards || 12) + (STATS.spawnAdd || 0), p.rot, p.W.shardMul, p.cast, 0, null); /* 暗黑 2：寿命到了再爆一圈冰片新星 */ for (const m of mobs) if (!m.dead && m.rise <= 0.2 && dist2(m, p) < (OB.endR + m.size) ** 2) hitMob(m, p.W, { mul: OB.endMul }); }
}
function stepShieldThrow(W, dt) { // 圣盾掷：盾在手上才扔；飞出去时没有格挡
  const out = projs.some(p => p.sthrow && !p.dead); STATS.armor = out ? STATS.armorOut : STATS.armorHeld;
  player.thCd = (player.thCd || 0) - dt; if (out || player.thCd > 0) return;
  const t = nearest(player.x, player.y - 5, W.rng); if (!t) return;
  const cost = SHT.soulPerThrow * (1 - STATS.soulLess); if (RUN) { if (player.soul < cost) return; player.soul -= cost; }
  player.thCd = 1 / W.aps; const a = Math.atan2(t.y - 5 - (player.y - 6), t.x - player.x);
  projs.push({ W, sthrow: 1, x: player.x, y: player.y - 6, a, vx: Math.cos(a) * W.thSpd, vy: Math.sin(a) * W.thSpd, life: W.thLife, age: 0, el: 'pla', r: 6, sch: W.chain, bn: 0, touch: new Map(), hit: new Set(), mul: 1 }); sfx('shoot');
}
function stepThrow(p, dt) { // 飞盾：直线飞，无限穿透（同一敌人每 rehit 秒一次），碰屏幕边反弹；弹完或寿命到了飞回手上（回程不打）
  const W = p.W; p.age += dt;
  if (p.back) { const dx = player.x - p.x, dy = player.y - 6 - p.y, d = Math.hypot(dx, dy) || 1; if (d < 8) { p.dead = true; return; } p.vx = dx / d * SHT.returnSpeed; p.vy = dy / d * SHT.returnSpeed; p.x += p.vx * dt; p.y += p.vy * dt; return; }
  p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
  const hx = p.x < F.x0 || p.x > F.x1, hy = p.y < F.y0 - 6 || p.y > F.y1;
  if (hx || hy) { if (p.sch > 0) { if (hx) p.vx = -p.vx; if (hy) p.vy = -p.vy; p.x = clamp(p.x, F.x0, F.x1); p.y = clamp(p.y, F.y0 - 6, F.y1); p.sch--; p.bn++; fx({ t: 'bounce', x: p.x, y: p.y }); } else p.back = 1; }
  if (p.life <= 0) p.back = 1;
  for (const m of mobs) if (!m.dead && m.rise <= 0.2 && dist2(m, p) < (p.r + m.size) ** 2) {
    const t = p.touch.get(m); if (t != null && p.age - t < SHT.rehit) continue; p.touch.set(m, p.age);
    const mul = 1 + W.chainStep * p.bn; hitMob(m, W, { mul }); if (STATS.flag.echoCrown && p.bn) echoBurst(m, W);
    if (STATS.flag.echoShield) { fx({ t: 'boom', x: m.x, y: m.y - 3, r: SHT.echoR, el: 'pla' }); for (const n of mobs) if (!n.dead && n.rise <= 0.2 && dist2(n, m) < (SHT.echoR + n.size) ** 2) hitMob(n, W, { mul: mul * SHT.echoMul }); }
    player.shield = Math.min(STATS.shield, player.shield + STATS.shield * (SHT.shieldOnHit + (STATS.flag.martyrThrow || 0)) / 100); // 殉道者之盾再加
    if (RUN && p.bn > 0) player.soul = Math.min(STATS.soulMax, player.soul + SHT.soulPerChain);
  }
}
function stepMeteors(dt) { // 陨石落地：圈内一次命中，击退 + 眩晕；插符文的留火地
  for (const M of meteors) {
    M.t -= dt; if (M.t > 0) { if (STATS.flag.earlyWarn) for (const m of mobs) if (!m.dead && !m.boss && m.frzT <= 0 && !(m.stunT > 0) && dist2(m, M) < (M.r + m.size) ** 2) { const dx = m.x - M.x, dy = m.y - M.y, l = Math.hypot(dx, dy) || 1; m.x += dx / l * UQX.doomDodge * dt; m.y += dy / l * UQX.doomDodge * dt; } continue; } // 末日冠代价：圈里的怪往外躲
    fx({ t: 'meteorHit', x: M.x, y: M.y, r: M.r }); sfx('boom');
    const kb = MT.knockPx * Math.log(50); let kills = 0, hd = 0, hn = 0;
    for (const m of mobs) if (!m.dead && m.rise <= 0.2 && dist2(m, M) < (M.r + m.size) ** 2) {
      const d = hitMob(m, M.W, { mul: M.mul }); hd += d; hn++;
      if (m.dead) { kills++; continue; }
      const big = m.boss || m.elite; m.stunT = Math.max(m.stunT || 0, MT.stun * (big ? MT.stunBossMul : 1));
      if (!m.boss) { const dx = m.x - M.x, dy = m.y - M.y, l = Math.hypot(dx, dy) || 1; m.kx += dx / l * kb; m.ky += dy / l * kb; }
    }
    if (RUN && kills >= MT.refundKills && M.ground) player.soul = Math.min(STATS.soulMax, player.soul + MT.soulRefund); // 一下杀 ≥3 只返还灯火
    if (M.ground) pushGround({ W: M.W, x: M.x, y: M.y, r: M.r, t: M.ground.dur * (STATS.durMul || 1), tickT: M.ground.tick, tick: M.ground.tick, mul: M.mul * M.ground.pct, el: M.W.el, fire: 1, gk: 'fire' }); // 火地：每 tick = 这次命中的 pct
  }
  meteors = meteors.filter(M => M.t > 0);
}
function stepZones(dt) {
  for (const z of zones) {
    z.t -= dt; z.tick = (z.tick || 0) - dt;
    if (z.devil) { // 小旋风：带随机偏转的直线，碰到场地边缘就弹回来
      z.ang += rf(-WH.devilTurn, WH.devilTurn) * dt; z.x += Math.cos(z.ang) * z.spd * dt; z.y += Math.sin(z.ang) * z.spd * 0.7 * dt;
      if (z.x < F.x0 - 2 || z.x > F.x1 + 2) { z.ang = Math.PI - z.ang; z.x = clamp(z.x, F.x0 - 2, F.x1 + 2); } // 视野边缘弹回
      if (z.y < F.y0 || z.y > F.y1) { z.ang = -z.ang; z.y = clamp(z.y, F.y0, F.y1); }
    }
    if (z.ice) { if (z.tick <= 0) { z.tick = z.tickT; for (const m of mobs) if (!m.dead && m.rise <= 0.2 && dist2(m, z) < (z.r + m.size) ** 2) chillOn(m, UQX.iceGround.chillPerSec * z.tickT); } continue; } // 永冬冰地：只叠冰缓
    if (z.enemy) { if (z.tick <= 0) { z.tick = z.tickT || 0.5; if (dist2(player, z) < (z.r + 3) ** 2) hurtPlayer(z.dmg, z.el, z.ck || 1); } continue; }
    if (z.pull) for (const m of mobs) if (!m.dead && !m.boss && dist2(m, z) < (z.pullR || z.r * 1.6) ** 2) { const dx = z.x - m.x, dy = z.y - m.y, d = Math.hypot(dx, dy) || 1; m.x += dx / d * z.pull * dt; m.y += dy / d * z.pull * dt; }
    if (z.tick <= 0) { z.tick = z.tickT || 0.2; let zh = false; for (const m of mobs) if (!m.dead && m.rise <= 0.2 && dist2(m, z) < (z.r + m.size) ** 2 && !(z.trail && m.trailT > RUN.t)) { if (z.fire) m.groundT = RUN.t + z.tickT + 0.1; const d = hitMob(m, z.W, { mul: z.mul || 1, ground: !z.devil }); if (z.devil && RUN.dmg) RUN.dmg.devil += d; zh = true; if (z.trail) m.trailT = RUN.t + 0.19; } } // 小旋风打中不回灯火
  }
  zones = zones.filter(z => z.t > 0);
}
function stepProjs(dt) {
  for (const p of projs) {
    if (p.enemy) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if ((p.x - player.x) ** 2 + (p.y - player.y + 6) ** 2 < 36) { if (hurtPlayer(p.dmg, p.el, p.ck || 1) && p.chill) chillPlayer(p.chill); p.dead = true; }
      if (p.pool && (p.dead || p.life <= 0)) { zones.push({ enemy: true, x: p.x, y: p.y + 6, r: p.pool.r, t: p.pool.dur, tickT: p.pool.tick, dmg: p.pool.dmg, ck: p.ck, el: p.el }); p.pool = null; p.dead = true; }
    } else if (p.orb) { stepOrb(p, dt);
    } else if (p.sthrow) { stepThrow(p, dt);
    } else if (p.mine) {
      p.arm -= dt; p.life -= dt; if (p.life <= 0) p.dead = true;
      if (p.arm > 0 || p.dead) continue;
      const W = p.W, tg = nearest(p.x, p.y + 4, W.rng || 14); if (!tg) continue;
      p.dead = true;
      if (W.b.pool) { pushGround({ W, x: p.x, y: p.y, r: W.aoeR, t: 4 * STATS.durMul, el: W.el, pool: 1, gk: 'pool' }); fx({ t: 'ring', x: p.x, y: p.y, r: W.aoeR, el: W.el }); }
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
          { const hx = p.wx < F.x0 || p.wx > F.x1, hy = p.wy < F.y0 - 6 || p.wy > F.y1; // 弹射 = 中心线碰到当前屏幕边（F 跟着相机，去掉顶部状态栏）镜面反射，每次耗 1 次弹射；用完就飞出屏幕消失
            if ((hx || hy) && p.sch > 0 && !p.out) { if (hx) p.a = Math.PI - p.a; if (hy) p.a = -p.a; p.wx = clamp(p.wx, F.x0, F.x1); p.wy = clamp(p.wy, F.y0 - 6, F.y1); p.sch--; p.bn = (p.bn || 0) + 1; p.mul *= SP.chainMul; if (RUN && RUN.dmg && !p.forked) RUN.dmg.sB = (RUN.dmg.sB || 0) + 1; fx({ t: 'bounce', x: p.wx, y: p.wy }); }
            else if (hx || hy) p.out = 1; }
          const k = Math.PI * 2 / SP.waveL, ph = k * p.wd + p.ph, amp = SP.waveA * Math.min(1, p.wd / 12), nx = -Math.sin(p.a), ny = Math.cos(p.a), off = amp * Math.sin(ph), slope = amp * k * Math.cos(ph);
          p.x = p.wx + nx * off; p.y = p.wy + ny * off;
          p.vx = (Math.cos(p.a) + nx * slope) * s; p.vy = (Math.sin(p.a) + ny * slope) * s; // 只给画面定朝向
        } else if (p.W.b.wander && !p.back) { const n = nearest(p.x, p.y, 70, p.hit); const ta = n ? Math.atan2(n.y - 5 - p.y, n.x - p.x) : p.a + rf(-1, 1); let da = ta - p.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; p.a += clamp(da, -6 * dt, 6 * dt); const s = p.W.spd * 0.6; p.vx = Math.cos(p.a) * s; p.vy = Math.sin(p.a) * s; }
        if (!p.spark) { p.x += p.vx * dt; p.y += p.vy * dt;
          if (!p.back && !p.out) { const hx = p.x < F.x0 || p.x > F.x1, hy = p.y < F.y0 - 6 || p.y > F.y1; // 弹射：碰屏幕边反弹，每次耗 1 次
            if ((hx || hy) && p.chain > 0) { if (hx) { p.vx = -p.vx; p.x = clamp(p.x, F.x0, F.x1); } if (hy) { p.vy = -p.vy; p.y = clamp(p.y, F.y0 - 6, F.y1); } p.a = Math.atan2(p.vy, p.vx); p.chain--; p.bn = (p.bn || 0) + 1; fx({ t: 'bounce', x: p.x, y: p.y }); }
            else if (hx || hy) p.out = 1; } }
      }
      p.life -= dt;
      if (p.spark) { const now = RUN ? RUN.t : 0; for (const m of p.hit) if (now - (p.vol.last.get(m) ?? -9) >= SP.rehit) p.hit.delete(m); }
      else if (p.last) { const now = RUN ? RUN.t : 0; for (const m of p.hit) if (now - (p.last.get(m) ?? -9) >= MECH.projRehit) p.hit.delete(m); } // 穿透的投射物：同一个敌人每 projRehit 秒最多打一次 // 游雷：同一串对同一个敌人每 rehit 秒最多打一次
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
    if (p.x < CAM.x - 20 || p.x > CAM.x + W + 20 || p.y < CAM.y - 10 || p.y > CAM.y + H + 10) p.dead = true; // 飞出屏幕就消失
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
/* 提前返回：玩家手动结束这一趟。语义同紧急撤回（平安返回、捡到的和地上的都带走、不算阵亡、当前层不算通过），并停掉自动循环 */
// 整备（层间）：宝箱捡完后世界暂停，换装 / 插符文 / 点天赋，再继续下一层或回营地。
// 自动循环开着时倒计时 prepAuto 秒自动继续（点任意处取消）；模拟（PREP_OFF）和没有界面时直接下一层。
var PREP_OFF = false;
function openPrep() {
  if (PREP_OFF || !G.ui || !G.ui.openPrep) return nextFloor();
  RUN.prep = { items: (RUN.gain ? RUN.gain.items.slice(RUN.prepFrom || 0) : []), t: S.auto.loop ? PROG.run.prepAuto : 0, cd: !!S.auto.loop };
  G.ui.openPrep();
}
function prepStep(dt) { const R = RUN.prep; if (R.cd && !(G.ui && G.ui.winId && G.ui.winId !== 'prep')) { R.t -= dt; if (R.t <= 0) prepContinue(); } }
function prepCancelCd() { if (RUN && RUN.prep) RUN.prep.cd = false; }
function prepContinue() { if (!RUN || !RUN.prep) return; RUN.prep = null; if (G.ui && G.ui.closePrep) G.ui.closePrep(); refreshStats(); nextFloor(); }
function prepReturn() { if (!RUN || !RUN.prep) return; RUN.prep = null; if (G.ui && G.ui.closePrep) G.ui.closePrep(); refreshStats(); abandonRun(true); }
function abandonRun(cleared) {
  if (!RUN || RUN.ending) return false;
  if (RUN.prep) { RUN.prep = null; if (G.ui && G.ui.closePrep) G.ui.closePrep(); }
  RUN.result = 'abandon'; RUN.ending = 0.8; RUN.next = 0; S.auto.loop = false; sfx('out');
  if (G.ui) G.ui.banner('提前返回', COL.emberHi); return true;
}
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

