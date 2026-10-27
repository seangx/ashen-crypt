/* =========================================================
   魂龛（触发器）核心：design/system-v2 §4–5、spec-trigger-slots、lamp-v2 §4–5、uniques-audit §8。桌面和手机共用。
   魂龛 = 独立掉落物 { id, kind:'trig', c:底子, rar, ilvl, q, sock, socks:[技能石|辅助石|null], affs:{k:v}, u?:独特 }
   S.trigs：魂龛位（最多 4）；S.trigBag：魂龛背包。
   每次出手：① 充满的【出手】充能魂龛（左→右，一次一个）② 最左的“出手时” ③ 底技能（主手类别，×0.84）。
   【响应】魂龛满了立刻额外放，不占出手。技能石每次施放耗灯火（辅助石加倍率），灯火 < 10% 时只放底技能。
   ========================================================= */
const TRG = DATA.triggers, TCOND = TRG.conds, TSK = TRG.skill, TAF = TRG.affs;
const TRIG_BASE = 2, TRIG_PER = 3; // 被触发技能在 player.wcd / spin / swing 里的下标：2 + 栏位 × 3 + 第几颗
const isSkill = x => x && x.kind === 'gem';
const isSupport = x => x && x.kind === 'mod';
const TRIG_U = Object.fromEntries((TRG.uniques || []).map(u => [u.k, u]));
const trigU = T => (T && T.u && TRIG_U[T.u]) || null;
const trigFx = T => (trigU(T) || {}).fx || {};
const trigName = T => trigU(T) ? trigU(T).n : TCOND[T.c].n;
const trigKindN = c => TCOND[c].kind === 'cast' ? '出手' : '响应';
const trigMaxSkills = T => trigFx(T).maxSkills || (trigFx(T).rotate ? 2 : TRG.maxSkills);
const trigSplit = T => trigFx(T).split || TRG.split;
const trigTier = ilvl => TRG.tierIlvl.filter(l => ilvl >= l).length; // 1–5
const TRIG_RAR_N = ['普通', '魔法', '稀有', '独特'];
const trigAffText = (k, v) => { const A = TAF[k]; if (!A) return ''; return A.n.replace('{v}', v).replace('{w}', Math.round(A.w ? A.w[0] + (A.w[1] - A.w[0]) * (v - A.r[0]) / Math.max(1e-9, A.r[1] - A.r[0]) : 0)); };
const trigAffList = T => Object.entries(T.affs || {}).filter(([k]) => TAF[k]).map(([k, v]) => trigAffText(k, v));
function newUniqueTrig(k, ilvl) { const u = TRIG_U[k]; const T = newTrig(u.c, { rar: 3, sock: u.sock, ilvl, affs: {}, isNew: true }); T.u = k; return T; }
/* 开孔符：+1 孔，上限 = 稀有度上限 +1（普通 3 / 魔法 4 / 稀有 5）；独特不能开 */
const trigSockCap = T => TRG.sockCap[Math.min(T.rar, 2)];
function trigCanAddSock(T) { return T && !T.u && T.rar < 3 && T.sock < trigSockCap(T); }
function trigAddSock(T) { if (!trigCanAddSock(T)) return '这个魂龛不能再开孔'; if (!(S.glyphs && S.glyphs.socket > 0)) return '没有开孔符（天梯宝箱掉）'; S.glyphs.socket--; T.sock++; T.socks.push(null); refreshStats(); save(); return `开孔成功：${T.sock} 孔`; }
function newTrig(c, o = {}) {
  const rar = o.rar ?? 0, sw = TRG.sockW[Math.min(rar, TRG.sockW.length - 1)];
  const sock = o.sock || sw[0] + wpick(sw.slice(1).map((w, i) => i), i => sw[i + 1]);
  return { id: S.nextId++, kind: 'trig', c, rar, ilvl: o.ilvl || 1, q: o.q || 0, sock, socks: Array(sock).fill(null), affs: o.affs || {}, isNew: !!o.isNew };
}
function rollTrigAffs(c, rar, ilvl) {
  const affs = {}, t = (trigTier(ilvl) - 1) / 4, nA = rar === 0 ? 0 : rar === 1 ? ri(1, 2) : ri(3, 4), M = TCOND[c].mode;
  const pool = Object.keys(TAF).filter(k => (!TAF[k].rare || rar >= 2) && !(k === 'cap' && M !== 'charge') && !(k === 'gap' && M !== 'timer') && !(k === 'gain' && M !== 'charge') && !(k === 'lowThr' && c !== 'low'));
  for (let i = 0; i < nA && pool.length; i++) { const k = pool.splice(ri(0, pool.length - 1), 1)[0], A = TAF[k], v = A.r[0] + (A.r[1] - A.r[0]) * t * rf(0.8, 1); affs[k] = A.dec ? Math.round(v * 10) / 10 : Math.round(v); }
  return affs;
}
function rollTrigDrop(ilvl) {
  if (ilvl >= TRG.uniqueIlvl && rnd() < TRG.uniqueChance) return newUniqueTrig(pick(Object.keys(TRIG_U)), ilvl);
  const c = wpick(Object.keys(TRG.condW), k => TRG.condW[k]), rar = wpick([0, 1, 2], i => TRG.rarW[i]);
  return newTrig(c, { rar, ilvl, affs: rollTrigAffs(c, rar, ilvl), isNew: true });
}
// 栏位：开局 1，Lv15 / Lv35 各 +1；装备最多再 +1（主手 / 法阵的 trigSlot 词条，或独特自带）
const gearTrigSlot = () => Object.values(S.equip).some(it => it && (it.trigSlot || (it.affs || []).some(a => a && a.k === 'trigSlot'))) ? 1 : 0;
const lvTrigSlots = () => 1 + TRG.slotLv.filter(l => S.level >= l).length;
const trigSlots = () => Math.min(TRG.maxSlots, lvTrigSlots() + gearTrigSlot());
const trigSlotLock = i => i < lvTrigSlots() ? null : i === lvTrigSlots() && gearTrigSlot() ? null : i < 3 ? `Lv${TRG.slotLv[i - 1]}` : 'Lv35+装';
// 插孔规则：常驻只能插常驻类；圣盾掷要盾；技能石数上限
function trigCanSock(T, k, x) {
  if (!T || k >= T.sock) return false; if (!x) return true;
  if (isSkill(x)) {
    if (T.c === 'always' && !TRG.alwaysOnly.includes(x.b)) return false;
    if (GEM_BY[x.b].form === 'shieldThrow') return false;
    const n = T.socks.filter((s, i) => i !== k && isSkill(s)).length; return n < trigMaxSkills(T);
  }
  return isSupport(x) && !MOD_BY[x.mid].field;
}
const supportFits = (m, g) => { try { return !!MOD_BY[m.mid] && modActive(m, g); } catch (e) { return false; } };
function socketInto(T, k, x) {
  if (!trigCanSock(T, k, x)) return false;
  const old = T.socks[k]; if (old) unsocketAt(T, k, true);
  if (isSkill(x)) S.stash = S.stash.filter(y => y !== x); else S.mods = S.mods.filter(y => y !== x);
  x.isNew = false; T.socks[k] = x; refreshStats(); save(); return true;
}
function unsocketAt(T, k, quiet) { const x = T.socks[k]; if (!x) return; T.socks[k] = null; if (isSkill(x)) S.stash.unshift(x); else S.mods.unshift(x); if (!quiet) { refreshStats(); save(); } }
function autoInsert(T, x) { for (let k = 0; k < T.sock; k++) if (!T.socks[k] && trigCanSock(T, k, x)) return socketInto(T, k, x) ? k : -1; return -1; }
function equipTrig(slot, T) {
  const old = S.trigs[slot]; S.trigBag = S.trigBag.filter(x => x !== T);
  if (old) { const gems = old.socks.filter(Boolean); old.socks = old.socks.map(() => null); S.trigBag.unshift(old); for (const g of gems) { if (isSkill(g)) S.stash.unshift(g); else S.mods.unshift(g); autoInsert(T, g); } }
  T.isNew = false; S.trigs[slot] = T; refreshStats(); save();
}
function unequipTrig(slot) { const T = S.trigs[slot]; if (!T) return; S.trigs[slot] = null; S.trigBag.unshift(T); refreshStats(); save(); }
function swapTrigs(a, b) { const t = S.trigs[a]; S.trigs[a] = S.trigs[b]; S.trigs[b] = t; trigReset(); refreshStats(); save(); } // 拖动调顺序（出手优先级按位置）
const trigYield = T => 1 + T.rar * 2 + Math.floor(T.ilvl / 20);
function salvageTrig(T) { if (!S.trigBag.includes(T)) return 0; for (const g of T.socks) if (g) { if (isSkill(g)) S.stash.unshift(g); else S.mods.unshift(g); } S.trigBag = S.trigBag.filter(x => x !== T); const n = trigYield(T); for (let i = 0; i < n; i++) { const k = rollShard(Math.max(1, S.maxDepth || 1)); S.shards[k] = (S.shards[k] || 0) + 1; } save(); return n; }

/* 底技能：主手类别 → 虚拟技能石（等级随角色等级），倍率 0.7 × 对口 1.2；触发系数 = 24 ÷ 主手基础攻速 */
function basicGem(eq) {
  const wl = eq.wl && eq.wl.kind === 'weapon' ? eq.wl : null, cat = wl ? WEAPONS[wl.b].cat : 'bow', B = TRG.basic[cat] || TRG.basic.bow;
  return { kind: 'gem', b: B[0], var: B[1], lvl: clamp(1 + Math.floor((S.level || 1) / 4), 1, MOD_MAX), q: 0, mods: [], sock: 0, affs: [], fake: 1, basic: 1 };
}
function basicProc(eq) { const it = eq.wl && eq.wl.kind === 'weapon' ? eq.wl : null, g = it && G2W[it.b]; // gear-v2 §1b：每把武器自带触发系数，“触发系数提高”是本地词条
  const pi = it ? it.affs.reduce((s, x) => s + (AFF_BY[x.k] && AFF_BY[x.k].stat === 'procInc' ? x.v : 0), 0) + uval(it, 'procInc') : 0;
  if (g) return Math.round(g.pc * (1 + pi / 100));
  const wl = it ? WEAPONS[it.b] : null; return Math.round(TRG.basicProcK / Math.max(0.3, (wl && wl.aps) || 1.2)); }
const gemCost = g => { const C = TSK[g.b] || { cost: [1, 1] }, t = clamp((g.lvl - 1) / Math.max(1, MOD_MAX - 1), 0, 1); return C.cost[0] + (C.cost[1] - C.cost[0]) * t; };

/* 属性计算：每个生效栏位 → 被触发技能的武器数值 + 充能参数 */
function trigStats(P, eq) {
  P.trigs = []; const n = trigSlots(), W0 = P.weapons[0];
  if (W0) { for (const o of [W0.min, W0.max]) if (o) for (const e in o) o[e] *= TRG.basicMul; W0.dps *= TRG.basicMul; W0.proc = basicProc(eq); W0.atk = 1; }
  let castDps = W0 ? W0.dps : 0, respDps = 0;
  (S.trigs || []).forEach((T, i) => {
    if (!T) return; const C = TCOND[T.c], fx = trigFx(T), A = T.affs || {}, on = i < n, cast = C.kind === 'cast';
    const skills = T.socks.filter(isSkill), sups = T.socks.filter(isSupport), FT = P.flag || {}, costMul = (FT.rapid ? 1.25 : 1) * (FT.chainCharge && !cast ? 1.3 : 1) * (FT.auraPower && T.c === 'always' ? 1.5 : 1) * sups.reduce((m, s) => m * (TRG.supCost[s.mid] || TRG.defCost), 1) * (1 - ((A.costLess || 0) + (P.raw.costLess || 0) + ((IMPL[eq.wl && eq.wl.b] && implFx(eq.wl).costLess) || 0)) / 100);
    const ws = []; if (on) skills.forEach((g, j) => {
      const sl = A.supLv ? sups.map(m => ({ ...m, lvl: Math.min(MOD_MAX, (m.lvl || 1) + 1) })) : sups;
      const g2 = { ...g, mods: sl.filter(m => supportFits(m, g)), sock: sups.length }, sk = skillItem({ ...eq, gem: g2 }); if (!sk) return;
      const W = weaponStats(sk, P), blT = A.burnLamp || (FT.burnSoul ? 1 : 0), bl = blT ? TAF.burnLamp.w[0] + (TAF.burnLamp.w[1] - TAF.burnLamp.w[0]) * (blT - 1) / 2 : 0; // tree-v3 燃魂：所有魂龛带 T1 燃灯
      const mul = (1 + ((A.dmg || 0) + (fx.dmg || 0) + bl + (P.trigDmg || 0)) / 100) * (1 + (T.q || 0) / 100) * (skills.length > 1 && !fx.rotate ? trigSplit(T) : 1) * (TRG.fitCond[g.b] === T.c ? TRG.fit : 1) * (FT.heavyHit && cast ? 1.4 : 1) * (FT.focus ? (cast ? 1.5 : 0.7) : 1) * (FT.auraPower && T.c === 'always' ? 1.4 : 1); // tree-v3：重击、专精、常驻之力
      for (const o of [W.min, W.max]) if (o) for (const e in o) o[e] *= mul;
      if (W.auraDps) W.auraDps *= mul; W.dps *= mul;
      const aoe = (A.aoe || 0) + (fx.aoe || 0); if (aoe) { W.aoeInc = (W.aoeInc || 0) + aoe; if (W.aoeR) W.aoeR *= 1 + aoe / 100; if (T.c === 'always' && W.rng) W.rng *= 1 + aoe / 100; }
      if (A.crit) W.crit += A.crit / 100; if (fx.alwaysCrit) W.crit = Math.max(W.crit, 1);
      const Sk = TSK[g.b] || {}; W.proc = Sk.proc ?? 5; W.atk = cast ? 1 : 0;
      W.cost = (T.c === 'always' ? gemCost(g) : cast && Sk.castCost ? Sk.castCost : C.mode !== 'always' && Sk.trigCost ? Sk.trigCost : gemCost(g)) * costMul + blT;
      W.trigSlot = i + 1; W.trigMul = mul; W.ailEffT = A.ailEff || 0; W.wi = TRIG_BASE + i * TRIG_PER + j; ws.push(W);
    });
    const tier = trigTier(T.ilvl), cap = Math.max(C.cap * (1 - (TRG.affCap.cap ? Math.min(100 - TRG.affCap.cap, A.cap || 0) : 0) / 100), (C.cap || 100) * TRG.affCap.cap / 100) * (fx.capMul || 1) * (P.flag && P.flag.overflow ? 1.25 : 1); // tree-v3 蓄满：容量 +25%
    const N = C.mode === 'timer' ? Math.max(TRG.affCap.timerMin, (fx.N || C.N[tier - 1]) - (A.gap || 0)) : 0;
    const per = trigRate(T, C, P, cap, N, fx, A);
    const dps = ws.reduce((s, W) => s + (C.mode === 'always' ? W.dps : W.cont || W.form === 'orbit' ? W.dps * (cast ? 0.4 : TRG.sustain || 2) * per : W.dps / Math.max(0.2, W.aps || 1) * per), 0) * (1 + Math.min(TRG.affCap.extra, A.extra || 0) / 100);
    P.trigs[i] = { T, ws, on, cast, mode: C.mode, cap: cap || 100, N, gain: 1 + (A.gain || 0) / 100, per, dps, cost: ws.reduce((s, W) => s + W.cost, 0), thr: (fx.thr || C.thr || 0) + (A.lowThr || 0) / 100 };
    if (on) { if (cast) castDps += dps; else respDps += dps; }
  });
  // 【出手】魂龛占掉的出手不放底技能：按占比扣掉底技能
  const aps = W0 ? W0.aps || 1 : 1, castShare = Math.min(1, P.trigs.reduce((s, t) => s + (t && t.on && t.cast && t.ws.length ? t.per / aps : 0), 0));
  if (W0) castDps -= W0.dps * castShare;
  { const all = [W0, ...P.trigs.flatMap(t => t && t.on ? t.ws : [])], RS = elemReso(P, all); // 元素共鸣
    if (RS > 1) { for (const W of all) if (W) { for (const o of [W.min, W.max]) if (o) for (const e in o) o[e] *= RS; W.dps *= RS; if (W.auraDps) W.auraDps *= RS; } for (const t of P.trigs) if (t) t.dps *= RS; castDps *= RS; respDps *= RS; } }
  P.castShare = castShare; P.castDps = castDps; P.respDps = respDps; P.trigCost = P.trigs.reduce((s, t) => s + (t && t.on ? t.cost * (t.mode === 'always' ? 1 : t.per) : 0), 0);
  P.dps = P.dps - (W0 ? W0.dps * castShare : 0) + P.trigs.reduce((s, t) => s + (t && t.on ? t.dps : 0), 0);
  // 格挡（defense-v3 §3.6 简化版）：只在盾上；基础 10% + 盾“格挡”词条 ÷ 4
  const blk = P.blk || 0; P.blockCh = eq.shield ? blk / 100 : 0; // defense-v3：P.blk 已含盾牌基础格挡
}
// 面板用的每秒期望放出次数
function trigRate(T, C, P, cap, N, fx, A) {
  const W0 = P.weapons[0], aps = W0 ? W0.aps || 1 : 1, g = 1 + (A.gain || 0) / 100, pr = W0 ? W0.proc || 20 : 20;
  switch (T.c) {
    case 'cast': return aps;
    case 'hit': return fx.fixed ? aps * fx.fixed / cap : Math.min(aps, aps * Math.min(TRG.perCastCap, pr * 1.3) * g / cap);
    case 'ember': return 0.3 * Math.min(aps, aps * Math.min(TRG.perCastCap, pr * 2.6) * g / cap);
    case 'crit': return Math.min(aps, aps * Math.min(1, (W0 ? W0.crit : 0.05)) * C.per * g / cap);
    case 'kill': return 1.2 * 12 * g / cap;
    case 'struck': return 0.4 * 3 * 3 * g / cap * (fx.stillMul ? 1.5 : 1);
    case 'block': return P.blockCh ? Math.min(1 / C.gap, 0.5 * P.blockCh * 2) : 0.15;
    case 'dash': return 0.3;
    case 'timer': return 1 / N;
    case 'bright': return 0.4 * C.per * g / cap;
    case 'low': return 0.15 / C.every;
    case 'elite': return 0.5 / C.every;
  } return 0;
}

/* ---------- 战斗 ---------- */
const TRIGS_RT = { ch: [0, 0, 0, 0], st: [0, 0, 0, 0], cg: [0, 0, 0, 0], gap: [0, 0, 0, 0], tm: [0, 0, 0, 0], flash: [0, 0, 0, 0], stack: [0, 0, 0, 0], stackT: [0, 0, 0, 0], rot: [0, 0, 0, 0], fired: [], later: [], stillT: 0, lampState: 'dim', n: [0, 0, 0, 0] };
function trigReset() { Object.assign(TRIGS_RT, { ch: [0, 0, 0, 0], st: [0, 0, 0, 0], cg: [0, 0, 0, 0], gap: [0, 0, 0, 0], tm: [0, 0, 0, 0], flash: [0, 0, 0, 0], stack: [0, 0, 0, 0], stackT: [0, 0, 0, 0], rot: [0, 0, 0, 0], fired: [], later: [], stillT: 0, n: [0, 0, 0, 0] }); }
// 灯态（lamp-v2 §4）：明灯 ≥ 70%、残灯 < 30%；只在下行时生效
const LST = TRG.lampStates;
function lampState() { if (typeof RUN === 'undefined' || !RUN || !STATS.soulMax || (STATS.flag && STATS.flag.lampChain)) return 'dim'; /* 灯链：始终「暗」 */ const f = player.soul / STATS.soulMax, F = STATS.flag || {}; // tree-v3：将熄之焰、长明改阈值
  const bMin = F.dimFlame ? 9 : F.longLight ? 0.5 : LST.bright.min, eMax = F.dimFlame ? 0.5 : LST.ember.max; return f >= bMin ? 'bright' : f < eMax ? 'ember' : 'dim'; }
const emberK = () => STATS.flag && STATS.flag.dimFlame ? 1.5 : 1;
const lampMore = () => TRIGS_RT.lampState === 'ember' ? (1 + LST.ember.more * emberK() / 100) * (STATS.flag && STATS.flag.longLight ? 0.8 : 1) * (1 + ((STATS.tree && STATS.tree.add.emberStep) || 0) / 100) : 1;
const lampCritAdd = () => TRIGS_RT.lampState === 'ember' ? LST.ember.crit * emberK() / 100 : 0;
const lampTaken = () => TRIGS_RT.lampState === 'ember' ? 1 + LST.ember.taken * emberK() / 100 : 1;
const lampShieldRegen = () => TRIGS_RT.lampState === 'bright' ? 1 + LST.bright.shieldRegen / 100 : 1;
const lampLightR = () => { if (typeof RUN === 'undefined' || !RUN || !STATS.soulMax) return 110; if (STATS.flag && STATS.flag.lightEater) return LST.ember.lightMin; const f = clamp(player.soul / STATS.soulMax, 0, 1); return LST.ember.lightMin + (LST.ember.lightMax - LST.ember.lightMin) * f; };
const lampOk = () => typeof RUN === 'undefined' || !RUN || player.soul >= STATS.soulMax * TRG.lampFloor;
// 放一个魂龛的技能（旧主技能石的每次施放灯火 soulPerCast 不再重复扣：W.trigSlot 时为 0）。付灯火（血誓付生命），按全局每秒上限防循环
function trigFire(i, o = {}) {
  const t = STATS.trigs && STATS.trigs[i]; if (!t || !t.on || !t.ws.length) return false;
  const fx = trigFx(t.T), now = G.time || 0; TRIGS_RT.fired = TRIGS_RT.fired.filter(x => now - x < 1);
  if (!t.cast && TRIGS_RT.fired.length >= TRG.capPerSec) return false;
  if (!fx.lifeCost && !lampOk()) return false;
  let list = t.ws; if (fx.rotate && list.length > 1) { list = [list[TRIGS_RT.rot[i] % list.length]]; }
  const mulSt = fx.stack ? 1 + TRIGS_RT.stack[i] * fx.stack / 100 : 1, A = t.T.affs || {};
  let any = false;
  for (const W0 of list) {
    const W = mulSt !== 1 ? { ...W0, min: scaleDmg(W0.min, mulSt), max: scaleDmg(W0.max, mulSt) } : W0;
    TRIGS_RT.castSlot = i; const ok = fire(W, W0.wi); any = ok || any;
    if (ok && (W0.cont || W0.form === 'orbit') && t.T.c !== 'always' && !o.sus) { const SU = TRIGS_RT.sus || (TRIGS_RT.sus = []), d = t.cast ? 0.4 : (TRG.sustain || 2); const ex = SU.find(x => x.wi === W0.wi); if (ex) ex.t = d; else SU.push({ i, W, wi: W0.wi, t: d, cd: 1 / (W0.aps || 1) }); } // 持续型：响应放一次持续 2 秒（出手 0.4 秒）
    if (ok && A.extra && rnd() * 100 < Math.min(TRG.affCap.extra, A.extra)) fire(W, W0.wi);
    if (ok && RUN) { if (fx.lifeCost) player.life = Math.max(1, player.life - player.life * fx.lifeCost); else player.soul = Math.max(0, player.soul - W0.cost * (RUN.mode === 'ladder' ? 1 : (SOUL.pushCostMul ?? 1))); }
  }
  TRIGS_RT.castSlot = -1;
  if (!any) return false;
  if (fx.rotate) TRIGS_RT.rot[i]++;
  if (fx.stack) { TRIGS_RT.stack[i] = Math.min(fx.stackMax, TRIGS_RT.stack[i] + 1); TRIGS_RT.stackT[i] = fx.stackT; }
  if (A.lampOn && RUN) player.soul = Math.min(STATS.soulMax, player.soul + A.lampOn);
  if (!t.cast) TRIGS_RT.fired.push(now); TRIGS_RT.flash[i] = 0.25; TRIGS_RT.n[i] = (TRIGS_RT.n[i] || 0) + 1;
  if (fx.echo && !o.echo) { for (let j = i + 1; j < 4; j++) if (STATS.trigs[j] && STATS.trigs[j].on && STATS.trigs[j].ws.length) { trigFire(j, { echo: 1 }); break; } }
  if (fx.again && !o.again) TRIGS_RT.later.push({ i, t: 1 });
  return true;
}
const scaleDmg = (o, k) => { if (!o) return o; const r = {}; for (const e in o) r[e] = o[e] * k; return r; };
// 加充能：充能型满了 → 出手型等下一次出手，响应型立刻放；溢出保留（最多再存 store 次）
function trigCharge(i, v) {
  const t = STATS.trigs[i], R = TRIGS_RT, fx = trigFx(t.T), store = Math.max(fx.store || TRG.store, STATS.flag && STATS.flag.overflow ? 3 : 0); R.ch[i] += v * t.gain;
  while (R.ch[i] >= t.cap) {
    if (!t.cast) { if (lampOk() || fx.lifeCost) { R.ch[i] -= t.cap; if (!trigFire(i)) { R.ch[i] = t.cap; break; } } else { R.ch[i] = t.cap; break; } }
    else { if (R.st[i] >= store) { R.ch[i] = t.cap; break; } R.st[i]++; R.ch[i] -= t.cap; }
  }
}
const liveTrigs = f => (STATS.trigs || []).forEach((t, i) => { if (t && t.on && t.ws.length) f(t, i); });
// 一次出手（主手攻速驱动）：返回是否放出了东西
function castAttack(W, wi) {
  const R = TRIGS_RT; R.cg = [0, 0, 0, 0];
  liveTrigs((t, i) => { const fx = trigFx(t.T); if (fx.fixed) trigCharge(i, fx.fixed / t.gain); }); // 回旋之刃：每次出手固定充能
  let done = false;
  if (lampOk()) {
    for (let i = 0; i < 4 && !done; i++) { const t = STATS.trigs && STATS.trigs[i]; if (!t || !t.on || !t.cast || t.mode !== 'charge' || !t.ws.length || R.st[i] < 1) continue; if (trigFire(i)) { R.st[i]--; done = true; } }
    if (!done) for (let i = 0; i < 4; i++) { const t = STATS.trigs && STATS.trigs[i]; if (!t || !t.on || t.T.c !== 'cast' || !t.ws.length) continue; done = trigFire(i); break; }
  }
  if (!done) { R.castSlot = -1; done = fire(W, wi); }
  return done;
}
// 出手技能命中：给命中时 / 残灯时 / 暴击时充能（每次施放每个魂龛最多 40 分）；响应技能不给
function trigHit(W, crit) {
  const cc = !W.atk && W.trigSlot && STATS.flag && STATS.flag.chainCharge; // tree-v3 连环：响应技能也给【命中时】充能 ×0.5
  if (!RUN || !STATS.trigs || (!W.atk && !cc) || W.cont) return;
  const own = W.trigSlot ? W.trigSlot - 1 : -1, R = TRIGS_RT, cap = TRG.perCastCap;
  liveTrigs((t, i) => {
    if (i === own || !t.cast || t.mode !== 'charge' || trigFx(t.T).fixed) return; const c = t.T.c;
    if (cc && c !== 'hit') return; let v = c === 'hit' ? W.proc * (cc ? 0.5 : 1) : c === 'ember' ? (R.lampState === 'ember' ? W.proc * 2 : 0) : c === 'crit' && crit ? TCOND.crit.per : 0;
    v = Math.min(v, cap - R.cg[i]); if (v <= 0) return; R.cg[i] += v; trigCharge(i, v);
  });
}
function trigKill(m) {
  if (!RUN || !STATS.trigs) return; const P = TCOND.kill.per, v = m.boss ? P[2] : m.elite ? P[1] : P[0];
  liveTrigs((t, i) => { if (t.T.c === 'kill') trigCharge(i, v); if (m.elite && trigFx(t.T).eliteKill) trigFire(i); });
}
function trigStruck(lost) {
  if (!RUN || !STATS.trigs || lost <= 0) return; const pct = lost / STATS.life * 100;
  liveTrigs((t, i) => { if (t.T.c !== 'struck') return; const fx = trigFx(t.T); trigCharge(i, pct * TCOND.struck.per * (fx.stillMul && TRIGS_RT.stillT >= 1 ? fx.stillMul : 1)); });
}
function trigEach(c) { // 每次型：格挡、冲刺
  if (!RUN || !STATS.trigs) return;
  liveTrigs((t, i) => { if (t.T.c !== c || TRIGS_RT.gap[i] > 0) return; if (trigFire(i)) TRIGS_RT.gap[i] = TCOND[c].gap; });
}
const trigEvent = (ev, x) => ev === 'kill' ? trigKill(x || {}) : ev === 'dash' || ev === 'block' ? trigEach(ev) : null; // 旧接口
function trigStep(dt) {
  if (!RUN || !STATS.trigs) return; const R = TRIGS_RT;
  const ls = lampState(); if (ls !== R.lampState) { if (R.lampState && ls !== 'dim' && G.ui) fx({ t: 'text', x: player.x, y: player.y - 22, s: LST[ls].n, c: ls === 'ember' ? COL.emberHi : '#ffe9a0' }); R.lampState = ls; }
  R.stillT = isStill() ? R.stillT + dt : 0;
  R.later = R.later.filter(x => { x.t -= dt; if (x.t <= 0) { trigFire(x.i, { again: 1 }); return false; } return true; });
  if (R.sus && R.sus.length) R.sus = R.sus.filter(x => { x.t -= dt; x.cd -= dt; if (x.cd <= 0 && x.t > 0) { R.castSlot = x.i; fire(x.W, x.wi); R.castSlot = -1; x.cd = 1 / (x.W.aps || 1); } return x.t > 0; });
  liveTrigs((t, i) => {
    R.gap[i] = Math.max(0, R.gap[i] - dt); R.flash[i] = Math.max(0, R.flash[i] - dt);
    if (R.stackT[i] > 0 && (R.stackT[i] -= dt) <= 0) R.stack[i] = 0;
    const c = t.T.c;
    if (c === 'always') {
      if (RUN && player.soul > 0) player.soul = Math.max(0, player.soul - t.cost * dt);
      if (!lampOk()) return;
      for (const W of t.ws) { player.wcd[W.wi] -= dt; if (player.wcd[W.wi] <= 0) player.wcd[W.wi] = fire(W, W.wi) ? (W.aps ? 1 / W.aps : 0.5) : 0.05; }
      return;
    }
    if (c === 'timer') { R.tm[i] += dt; if (R.tm[i] >= t.N && lampOk()) { if (trigFire(i)) R.tm[i] = 0; else R.tm[i] = t.N - 0.2; } }
    else if (c === 'bright') { if (ls === 'bright') trigCharge(i, TCOND.bright.per * dt); }
    else if (c === 'low' || c === 'elite') {
      R.tm[i] = Math.max(0, R.tm[i] - dt); if (R.tm[i] > 0) return;
      const yes = c === 'low' ? player.life / STATS.life < t.thr : mobs.some(m => !m.dead && (m.elite || m.boss) && dist2(m, player) < TCOND.elite.r ** 2);
      if (yes && trigFire(i)) R.tm[i] = TCOND[c].every;
    }
  });
}
// 充能进度 0–1（界面画充能环）；出手型存着的次数
function trigProgress(i) {
  const t = STATS.trigs && STATS.trigs[i]; if (!t || !t.on) return 0; const R = TRIGS_RT;
  if (t.mode === 'charge') return R.st[i] > 0 ? 1 : clamp(R.ch[i] / t.cap, 0, 1);
  if (t.mode === 'timer') return clamp(R.tm[i] / t.N, 0, 1);
  if (t.mode === 'state') return R.tm[i] > 0 ? 1 - R.tm[i] / TCOND[t.T.c].every : 0;
  if (t.mode === 'each') return R.gap[i] > 0 ? 1 - R.gap[i] / (TCOND[t.T.c].gap || 1) : 1;
  return 1;
}
function trigGemXp(x) {
  let up = false;
  for (const T of S.trigs || []) if (T) for (const g of T.socks) if (isSkill(g) && g.lvl < MOD_MAX) { g.xp += x; const L = modLevelOf(g.xp); if (L > g.lvl) { g.lvl = L; up = true; if (G.ui) G.ui.feed(`${GEM_BY[g.b].n} ${g.lvl} 级`, COL.cyan, 'i_' + iconOf(g)); } }
  return up;
}
/* 新存档（system-v2 §9 #0）：送一个普通【出手】“命中时”魂龛 2 孔 + 一颗按主手类别的技能石 */
const STARTER_GEM = { melee: 'GemWhirl', bow: 'GemTaser', gun: 'GemFirepot', caster: 'GemMeteor' };
function starterTrigs() {
  S.trigs = [null, null, null, null]; S.trigBag = [];
  const wl = S.equip.wl, cat = wl ? WEAPONS[wl.b].cat : 'bow', T = newTrig('cast', { sock: 2 });
  let gid = STARTER_CAST[cat] || 'GemBolt'; if (!GEM_BY[gid]) gid = 'GemBolt';
  if (GEM_BY[gid]) T.socks[0] = newGem(gid, { sock: 0 });
  S.trigs[0] = T; S.equip.gem = null; S.gemV = 4;
}
const STARTER_CAST = { melee: 'GemStab', bow: 'GemBolt', gun: 'GemBolt', caster: 'GemBolt' }; // 初始魂龛：【出手时】+ 便宜的出手技能石
/* gemV 3 → 4：老存档没有【出手时】魂龛就补一个（有空位放空位，否则进魂龛背包），宝石不动 */
function castStarterFix() {
  if ((S.gemV || 0) >= 4) return; S.gemV = 4;
  if ([...S.trigs, ...S.trigBag].some(t => t && t.c === 'cast')) return;
  const wl = S.equip.wl, cat = wl ? WEAPONS[wl.b].cat : 'bow', T = newTrig('cast', { sock: 2 }), gid = STARTER_CAST[cat] || 'GemBolt';
  if (GEM_BY[gid]) T.socks[0] = newGem(gid, { sock: 0 });
  const i = S.trigs.findIndex((t, k) => !t && k < trigSlots()); if (i >= 0) S.trigs[i] = T; else { S.trigs.unshift(T); const old = S.trigs.splice(4); S.trigBag.unshift(...old.filter(Boolean)); }
}
const migrateTrigs = () => starterTrigs();
