/* =========================================================
   触发器（design/spec-trigger-slots.md）：核心逻辑，桌面和手机共用
   触发器 = 独立掉落物 { id, kind:'trig', c:条件, rar, ilvl, q, sock, socks:[技能石|辅助石(符文)|null], affs:{rate,cd,dmg}, legacy }
   S.trigs：角色身上的触发器栏（最多 4 个）；S.trigBag：触发器背包。没有主攻石：普攻按主手类别。
   ========================================================= */
const TRG = DATA.triggers, TCOND = TRG.conds;
const TRIG_BASE = 2, TRIG_PER = 3; // 被触发技能在 player.wcd / spin / swing 里的下标：2 + 栏位 × 3 + 第几颗
const isSkill = x => x && x.kind === 'gem';
const isSupport = x => x && x.kind === 'mod';
const TRIG_U = Object.fromEntries((TRG.uniques || []).map(u => [u.k, u]));
const trigName = T => T.u && TRIG_U[T.u] ? TRIG_U[T.u].n : (T.legacy ? '遗留·' : '') + TCOND[T.c].n;
const trigMaxSkills = T => (T.u && TRIG_U[T.u] && TRIG_U[T.u].fx.maxSkills) || TRG.maxSkills;
const trigSplit = T => (T.u && TRIG_U[T.u] && TRIG_U[T.u].fx.split) || TRG.split;
function newUniqueTrig(k, ilvl) { const u = TRIG_U[k]; const T = newTrig(u.c, { rar: 3, sock: u.sock, ilvl, affs: { ...u.affs }, isNew: true }); T.u = k; return T; }
/* 开孔符：+1 孔，上限 = 稀有度上限 +1（普通 3 / 魔法 4 / 稀有 5）；独特、遗留不能开 */
const trigSockCap = T => TRG.sockCap[Math.min(T.rar, 2)];
function trigCanAddSock(T) { return T && !T.u && !T.legacy && T.rar < 3 && T.sock < trigSockCap(T); }
function trigAddSock(T) { if (!trigCanAddSock(T)) return '这个触发器不能再开孔'; if (!(S.glyphs && S.glyphs.socket > 0)) return '没有开孔符（天梯宝箱掉）'; S.glyphs.socket--; T.sock++; T.socks.push(null); refreshStats(); save(); return `开孔成功：${T.sock} 孔`; }
const TRIG_RAR_N = ['普通', '魔法', '稀有', '独特'];
function newTrig(c, o = {}) {
  const rar = o.rar ?? 0, sw = TRG.sockW[Math.min(rar, TRG.sockW.length - 1)];
  const sock = o.sock || sw[0] + wpick(sw.slice(1).map((w, i) => i), i => sw[i + 1]);
  const T = { id: S.nextId++, kind: 'trig', c, rar, ilvl: o.ilvl || 1, q: o.q || 0, sock, socks: Array(sock).fill(null), affs: o.affs || {}, legacy: o.legacy ? 1 : 0, isNew: !!o.isNew };
  return T;
}
function rollTrigDrop(ilvl) {
  if (ilvl >= TRG.uniqueIlvl && rnd() < TRG.uniqueChance) return newUniqueTrig(pick(Object.keys(TRIG_U)), ilvl);
  const c = wpick(Object.keys(TRG.condW), k => TRG.condW[k]), rar = wpick([0, 1, 2], i => TRG.rarW[i]);
  const affs = {}, tf = clamp(ilvl / 80, 0, 1), roll = a => Math.round(a[0] + (a[1] - a[0]) * tf * rf(TRG.affRoll[0], TRG.affRoll[1]));
  const pool = ['rate', 'cd', 'dmg'].filter(k => !(k === 'rate' && TCOND[c].rate >= 1)); const nA = rar === 0 ? 0 : rar === 1 ? ri(1, 2) : 3;
  for (let i = 0; i < nA && pool.length; i++) { const k = pool.splice(ri(0, pool.length - 1), 1)[0]; affs[k] = roll(TRG[k + 'Aff']); }
  return newTrig(c, { rar, ilvl, affs, isNew: true });
}
// 栏位：开局 1，Lv15 / Lv35 各 +1；装备最多再 +1（词条 trigSlot 或物品上 trigSlot 标记）
const gearTrigSlot = () => Object.values(S.equip).some(it => it && (it.trigSlot || (it.affs || []).some(a => a && a.k === 'trigSlot'))) ? 1 : 0;
const lvTrigSlots = () => 1 + TRG.slotLv.filter(l => S.level >= l).length;
const trigSlots = () => Math.min(TRG.maxSlots, lvTrigSlots() + gearTrigSlot());
const trigSlotLock = i => i < lvTrigSlots() ? null : i === lvTrigSlots() && gearTrigSlot() ? null : i < 3 ? `Lv${TRG.slotLv[i - 1]}` : 'Lv35+装';
// 插孔规则
function trigCanSock(T, k, x) {
  if (!T || k >= T.sock) return false; if (!x) return true;
  if (isSkill(x)) {
    if (T.c === 'always' && !TRG.alwaysOnly.includes(x.b)) return false;
    if (GEM_BY[x.b].form === 'shieldThrow') return false;
    const n = T.socks.filter((s, i) => i !== k && isSkill(s)).length; return n < trigMaxSkills(T);
  }
  return isSupport(x) && !MOD_BY[x.mid].field;
}
// 辅助石对技能石是否生效（沿用符文的 fit）
const supportFits = (m, g) => { try { return !!MOD_BY[m.mid] && modActive(m, g); } catch (e) { return false; } };
function socketInto(T, k, x) { // x 来自背包（技能石在 S.stash，辅助石在 S.mods）；原来的退回背包
  if (!trigCanSock(T, k, x)) return false;
  const old = T.socks[k]; if (old) unsocketAt(T, k, true);
  if (isSkill(x)) S.stash = S.stash.filter(y => y !== x); else S.mods = S.mods.filter(y => y !== x);
  x.isNew = false; T.socks[k] = x; refreshStats(); save(); return true;
}
function unsocketAt(T, k, quiet) { const x = T.socks[k]; if (!x) return; T.socks[k] = null; if (isSkill(x)) S.stash.unshift(x); else S.mods.unshift(x); if (!quiet) { refreshStats(); save(); } }
function autoInsert(T, x) { for (let k = 0; k < T.sock; k++) if (!T.socks[k] && trigCanSock(T, k, x)) return socketInto(T, k, x) ? k : -1; return -1; }
// 换触发器：宝石自动搬过去，放不下的回背包
function equipTrig(slot, T) {
  const old = S.trigs[slot]; S.trigBag = S.trigBag.filter(x => x !== T);
  if (old) { const gems = old.socks.filter(Boolean); old.socks = old.socks.map(() => null); S.trigBag.unshift(old); for (const g of gems) { if (isSkill(g)) S.stash.unshift(g); else S.mods.unshift(g); if (autoInsert(T, g) < 0) { } } }
  T.isNew = false; S.trigs[slot] = T; refreshStats(); save();
}
function unequipTrig(slot) { const T = S.trigs[slot]; if (!T) return; S.trigs[slot] = null; S.trigBag.unshift(T); refreshStats(); save(); }
const trigYield = T => 1 + T.rar * 2 + Math.floor(T.ilvl / 20);
function salvageTrig(T) { if (!S.trigBag.includes(T)) return 0; for (const g of T.socks) if (g) { if (isSkill(g)) S.stash.unshift(g); else S.mods.unshift(g); } S.trigBag = S.trigBag.filter(x => x !== T); const n = trigYield(T); for (let i = 0; i < n; i++) { const k = rollShard(Math.max(1, S.maxDepth || 1)); S.shards[k] = (S.shards[k] || 0) + 1; } save(); return n; }

/* 普攻：主手类别 → 一颗虚拟技能石（等级随角色等级），没有辅助 */
function basicGem(eq) {
  const wl = eq.wl && eq.wl.kind === 'weapon' ? eq.wl : null, cat = wl ? WEAPONS[wl.b].cat : 'bow', B = TRG.basic[cat] || TRG.basic.bow;
  return { kind: 'gem', b: B[0], var: B[1], lvl: clamp(1 + Math.floor((S.level || 1) / 4), 1, MOD_MAX), q: 0, mods: [], sock: 0, affs: [], fake: 1, basic: 1 };
}
/* 属性计算：每个生效栏位 → 被触发技能的武器数值 */
function trigStats(P, eq) {
  P.trigs = []; const n = trigSlots();
  (S.trigs || []).forEach((T, i) => {
    if (!T) return; const on = i < n, skills = T.socks.filter(isSkill), sups = T.socks.filter(isSupport);
    const ws = []; if (on) skills.slice(0, T.c === 'always' ? 9 : 9).forEach((g, j) => {
      const g2 = { ...g, mods: sups.filter(m => supportFits(m, g)), sock: sups.length }, sk = skillItem({ ...eq, gem: g2 }); if (!sk) return;
      const W = weaponStats(sk, P); let mul = (1 + (T.affs.dmg || 0) / 100) * (1 + (T.q || 0) / 100) * (skills.length > 1 ? trigSplit(T) : 1) * (TRG.fitCond[g.b] === T.c ? TRG.fit : 1);
      for (const o of [W.min, W.max]) if (o) for (const e in o) o[e] *= mul;
      if (W.auraDps) W.auraDps *= mul; W.dps *= mul; W.trigSlot = i + 1; W.trigMul = mul; W.wi = TRIG_BASE + i * TRIG_PER + j; ws.push(W);
    });
    const C = TCOND[T.c], cd = C.cd * (1 - (T.affs.cd || 0) / 100), rate = Math.min(T.c === 'struck' ? 0.7 : 0.6, C.rate + (T.affs.rate || 0) / 100) || 1;
    const r0 = C.rate >= 1 ? 1 : rate, ev = T.c === 'attack' && P.weapons[0] ? (P.weapons[0].aps || 1) : C.est, per = T.c === 'always' ? 0 : Math.min(cd > 0 ? 1 / cd : 9, ev * r0);
    const dps = ws.reduce((s, W) => s + (T.c === 'always' ? W.dps : W.dps / Math.max(0.2, W.aps || 1) * per), 0);
    P.trigs[i] = { T, ws, on, cd, rate: C.rate >= 1 ? 1 : rate, dps };
  });
  P.dps += P.trigs.reduce((s, t) => s + (t ? t.dps : 0), 0);
}

/* 战斗：事件 → 触发 */
const TRIGS_RT = { cd: [0, 0, 0, 0], fired: [], timer: [0, 0, 0, 0], low: [0, 0, 0, 0], flash: [0, 0, 0, 0] };
function trigReset() { TRIGS_RT.cd = [0, 0, 0, 0]; TRIGS_RT.fired = []; TRIGS_RT.timer = [0, 0, 0, 0]; TRIGS_RT.flash = [0, 0, 0, 0]; }
function trigFire(i) {
  const t = STATS.trigs && STATS.trigs[i]; if (!t || !t.on || !t.ws.length) return false;
  const now = G.time || 0; TRIGS_RT.fired = TRIGS_RT.fired.filter(x => now - x < 1); if (TRIGS_RT.fired.length >= TRG.capPerSec) return false; // 全局上限
  let any = false; for (const W of t.ws) any = fire(W, W.wi) || any;
  if (any) { TRIGS_RT.fired.push(now); TRIGS_RT.cd[i] = t.cd; TRIGS_RT.flash[i] = 0.25; }
  return any;
}
function trigEvent(ev, W) {
  if (!RUN || !STATS.trigs) return;
  STATS.trigs.forEach((t, i) => {
    if (!t || !t.on || t.T.c !== ev || TRIGS_RT.cd[i] > 0) return;
    if (W && W.trigSlot === i + 1) return; // 自己触发不了自己
    if (ev === 'attack' && W && W.trigSlot) return; // 被触发的技能不算普攻
    if (rnd() < t.rate) trigFire(i);
  });
}
function trigStep(dt) {
  if (!RUN || !STATS.trigs) return;
  STATS.trigs.forEach((t, i) => {
    if (!t || !t.on) return; TRIGS_RT.cd[i] = Math.max(0, TRIGS_RT.cd[i] - dt); TRIGS_RT.flash[i] = Math.max(0, TRIGS_RT.flash[i] - dt);
    const c = t.T.c;
    if (c === 'always') { for (const W of t.ws) { player.wcd[W.wi] -= dt; if (player.wcd[W.wi] <= 0) player.wcd[W.wi] = fire(W, W.wi) ? (W.aps ? 1 / W.aps : 0.5) : 0.05; } return; }
    if (TRIGS_RT.cd[i] > 0) return;
    if (c === 'timer') trigFire(i);
    else if (c === 'low' && player.life / STATS.life < TCOND.low.thr) trigFire(i);
    else if (c === 'elite' && mobs.some(m => !m.dead && (m.elite || m.boss) && dist2(m, player) < TCOND.elite.r ** 2)) trigFire(i);
  });
}
// 被插着的技能石吃击杀经验
function trigGemXp(x) {
  let up = false;
  for (const T of S.trigs || []) if (T) for (const g of T.socks) if (isSkill(g) && g.lvl < MOD_MAX) { g.xp += x; const L = modLevelOf(g.xp); if (L > g.lvl) { g.lvl = L; up = true; if (G.ui) G.ui.feed(`${GEM_BY[g.b].n} ${g.lvl} 级`, COL.cyan, 'i_' + iconOf(g)); } }
  return up;
}

/* 存档迁移（S.gemV = 2）：旧技能石 + 它的符文 → 一个普通“攻击时”遗留触发器（1 + 符文数孔，最多 6） */
function migrateTrigs(fresh) {
  S.trigs = S.trigs || [null, null, null, null]; S.trigBag = S.trigBag || [];
  const g = S.equip.gem && S.equip.gem.kind === 'gem' ? S.equip.gem : null;
  if (g) {
    const sups = (g.mods || []).filter(Boolean); g.mods = []; g.sock = 0;
    const T = newTrig('attack', { rar: fresh ? 0 : 1, sock: fresh ? 2 : Math.min(TRG.legacyMax, 1 + sups.length), legacy: !fresh });
    if (T.sock < 2) { T.sock = 2; T.socks = [null, null]; }
    T.socks[0] = g; sups.forEach((m, i) => { if (i + 1 < T.sock) T.socks[i + 1] = m; else S.mods.push(m); });
    S.trigs[0] = T;
  } else if (!S.trigs[0]) S.trigs[0] = newTrig('attack', { sock: 2 });
  S.equip.gem = null;
  for (const it of S.stash) if (it.kind === 'gem' && it.mods) { for (const m of it.mods) if (m) S.mods.push(m); it.mods = []; it.sock = 0; }
  // 已过 Lv15 / Lv35：开栏位并送一个 2 孔触发器
  const gift = ['kill', 'crit']; TRG.slotLv.forEach((l, i) => { if (S.level >= l && !S.trigs[i + 1]) S.trigs[i + 1] = newTrig(gift[i], { sock: 2 }); });
  S.gemV = 2;
}
