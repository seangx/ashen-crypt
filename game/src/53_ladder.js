/* ---------------- 天梯（个人） ----------------
   参数在 data/ladder.json。天梯局是 RUN.mode = 'ladder'：怪物等级 = 层数，进度点数攒满后出守关 Boss，限时；墓图和命盘不生效。 */
const LD = DATA.ladder;
const LAD = { pending: 0 }; // 排队的天梯层：当前这局打完后开始（0 = 没有）
const LADDER_TIERS = LD.tiers.list;
const ladderNeed = N => LD.run.pointsBase + LD.run.pointsPerLevel * N;
const ladderTier = lvl => { let t = -1; LADDER_TIERS.forEach((x, i) => { if (lvl >= x.at) t = i; }); return t; };
const ladderJump = left => { for (const [s, j] of LD.jumps.list) if (left >= s) return j; return 1; };
const ladderBusy = () => RUN && RUN.mode === 'ladder';
function startLadder(N) {
  refreshStats();
  LX = lootFx(null, true);
  RUN = { dmg: { whirl: 0, devil: 0, spark: 0, fork: 0 }, mode: 'ladder', L: N, base: N, map: null, mob: { ...(LD.run.mob || {}) }, bossD: bossFor(N), kills: 0, prog: 0, need: ladderNeed(N), limit: LD.run.timeLimit, dens: LD.run.density, eliteMul: LD.run.eliteMul,
    boss: null, t: 0, spawnT: PROG.run.spawnFirst, ending: 0, result: null, gain: { items: [], shards: 0, glyphs: {}, mods: [], maps: [], xp: 0, lv: 0, boon: null } };
  arenaReset();
  if (G.ui) G.ui.banner(`天梯第 ${N} 层`, COL.emberHi);
}
// 天梯按钮：现在没在打就马上开始，否则排在这局后面
function ladderChallenge(N) {
  if (ladderBusy()) { toast('天梯正在进行'); return; }
  LAD.pending = N;
  if (!RUN) { AUTO.nextT = 0; if (G.ui) G.ui.closeWin(); startRun(); }
  else toast(`这局打完后开始天梯第 ${N} 层`, COL.emberHi);
}
// 主伤害元素：秒伤最高那把武器里占比最大的元素
function mainElem() {
  const W = STATS.weapons.filter(Boolean).sort((a, b) => b.dps - a.dps)[0];
  if (!W) return 'kin';
  let best = W.el || 'kin', bv = -1;
  for (const e of ELEM) { const v = (W.min[e] || 0) + (W.max[e] || 0); if (v > bv) { bv = v; best = e; } }
  return best;
}
// 记录格式固定（以后上传排行只加 season 和 name）
function ladderRecord(N, jump) {
  const equip = ['wl', 'wr', 'shield', 'core', 'engine', 'hub'].filter(s => S.equip[s]).map(s => { const it = S.equip[s]; return { slot: s, b: it.b, q: it.q, rar: it.rar, u: it.u || null, affs: it.affs.map(x => [x.k, x.t]) }; });
  const keys = S.tree.filter(id => TREE.nodes[id] && TREE.nodes[id].kind === 'k');
  const rec = { v: 1, data: DATA_HASH, lvl: N, time: Math.round(RUN.t * 10) / 10, date: new Date().toISOString(), jump,
    build: { equip, keys, dps: Math.round(STATS.dps), armor: Math.round(STATS.armor), life: Math.round(STATS.life), shield: Math.round(STATS.shield), elem: mainElem() } };
  S.ladder.records.unshift(rec);
  if (S.ladder.records.length > LD.records.max) S.ladder.records.length = LD.records.max;
  return rec;
}
// 守关 Boss 死了：开宝箱、跳层、记录
function ladderWin(m) {
  const N = RUN.L, L = S.ladder, left = Math.max(0, RUN.limit - RUN.t), jump = ladderJump(left), R = LD.reward;
  S.stats.bosses++; RUN.result = 'win'; RUN.ending = 1.6;
  const exP = N >= R.exaltedFrom ? Math.min(R.exaltedMax, (N - R.exaltedFrom) * R.exaltedPerN) : 0;
  for (let i = 0; i < R.items; i++) {
    let it;
    if (rnd() * 100 < exP) it = makeExalted(rollItem(N + R.ilvlBonus, 0, false, 2));
    else { it = rollItem(N + R.ilvlBonus, 0, true, null, true); if (it.u) it.lp = ri(...LOOT.legendary.ladder); }
    if (!it.u && rnd() * 100 < OATH.chestChance) addOath(it); // 天梯宝箱的装备 15% 带誓约
    dropThing(m, { kind: 'item', item: it });
  }
  const ns = R.shardsBase + Math.floor(N / R.shardsPerN);
  for (let i = 0; i < ns; i++) dropThing(m, { kind: 'shard', k: rollShard(N) });
  for (const g of GLYPHS_DROP) if (rnd() * 100 < R.glyphBase + N * R.glyphPerN) dropThing(m, { kind: 'glyph', id: g.id });
  if (N >= OATH.glyphLadder && rnd() * 100 < OATH.glyphDrop) dropThing(m, { kind: 'glyph', id: 'oath' }); // 立誓符
  L.unlocked = Math.max(L.unlocked, N + jump);
  if (N > L.best || (N === L.best && RUN.t < L.bestTime)) { L.best = N; L.bestTime = Math.round(RUN.t * 10) / 10; }
  const tierUp = [];
  for (let i = 0; i <= ladderTier(L.best); i++) if (!L.tiersHit.includes(i)) {
    L.tiersHit.push(i); tierUp.push(i);
    for (const g of GLYPHS_DROP) for (let j = 0; j < LD.tiers.firstGlyphs; j++) dropThing(m, { kind: 'glyph', id: g.id });
  }
  RUN.lad = { jump, left, tierUp, rec: ladderRecord(N, jump) };
  if (G.ui) G.ui.banner(tierUp.length ? `晋升${LADDER_TIERS[tierUp[tierUp.length - 1]].n}` : `通过 · 跳 ${jump} 层`, COL.emberHi);
}
// 天梯局结束：连打开着并且赢了，就接着打新的最高层；否则回到推层
function ladderAfterRun(r) {
  LAD.pending = r.result === 'win' && S.ladder.chain ? S.ladder.unlocked : 0;
}
// 每个主伤害元素的最好成绩
function ladderBestByElem() {
  const out = {};
  for (const r of S.ladder.records) { const e = r.build.elem, o = out[e]; if (!o || r.lvl > o.lvl || (r.lvl === o.lvl && r.time < o.time)) out[e] = r; }
  return out;
}
const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
