/* ---------- 渐进式披露（spec-unlocks）：系统按进度一个个出现，每次一条横幅 ---------- */
let UNLOCK_ALL = false, UNLOCK_EV = false; // UNLOCK_ALL：?unlockall=1 全部开放；UNLOCK_EV：模拟默认（--unlocks off）只跳过事件条件，层数门槛照旧，结果和改版前可比
try { if (new URLSearchParams(location.search).has('unlockall')) UNLOCK_ALL = true; } catch (e) { }
const UNL_IDS = () => Object.keys(PROG.unlocks).filter(k => k[0] !== '_' && k !== 'gear');
const unlockQ = []; // 待播的横幅：战斗中只排队，整备界面或营地里再播
// 事件在发生处记一笔（bossChest / pickRune / gainShard / gainGlyph），然后看有没有新开的
function unlockEvent(e) { S.events ??= {}; if (S.events[e]) return; S.events[e] = true; checkUnlocks(); }
function checkUnlocks(silent) {
  silent = silent || UNLOCK_ALL || UNLOCK_EV; // 全开（调试、模拟）：不播横幅、不给保底
  S.seenUnlocks ??= {}; let any = false;
  for (const id of UNL_IDS()) {
    if (S.seenUnlocks[id] || !unlocked(id)) continue;
    S.seenUnlocks[id] = 1; any = true; if (silent) continue;
    const u = PROG.unlocks[id]; (S.unlockLog ??= []).push([id, Date.now()]);
    if (u.hint) unlockQ.push(u.hint);
    if (u.guarantee) (S.guarantee ??= []).push(u.guarantee);
    if (id === 'tree') treeFogInit();
  }
  if (any && !silent) save();
  return any;
}
// 保底：解锁那一刻的（或下一只）Boss 宝箱里多一件
function takeGuarantees(L) {
  const out = []; for (const g of S.guarantee || []) { const it = g === 'off' ? guaranteeOff(L) : g === 'gem' ? guaranteeGem(L) : null; if (it) out.push(it); }
  S.guarantee = []; return out;
}
function guaranteeOff(L) { const OH = DATA.mechanics.offhand, tg = S.equip.gem ? itemTags(S.equip.gem) : [], b = (OH.starterByTag.find(([t]) => tg.includes(t)) || [0, OH.fallback])[1]; return newItem('off', b, Math.max(1, L), rollQuality(Math.max(1, L)), 1); }
function guaranteeGem(L) { // 从没拥有过的技能石里抽，偏向新流派（和身上技能不同大类）
  const own = new Set([...Object.values(S.equip), ...S.stash].filter(it => it && it.kind === 'gem').map(it => it.b));
  const fam = g => g.tags.includes('Melee') ? 'melee' : g.tags.includes('Projectile') ? 'proj' : 'area', cur = S.equip.gem ? fam(GEM_BY[S.equip.gem.b]) : 'proj';
  let pool = GEMS.filter(g => g.w > 0 && !own.has(g.id)); const nf = pool.filter(g => fam(g) !== cur); if (nf.length) pool = nf; if (!pool.length) return null;
  return newGem(pick(pool).id, { sock: 1 });
}
// 老存档：按进度补事件，已满足的直接算看过（不播横幅、不给保底），天赋树不加雾（spec-unlocks §4）
function migrateUnlocks() {
  const E = S.events = S.events || {}, all = [...Object.values(S.equip), ...S.stash].filter(Boolean);
  if (S.maxDepth > 1) E.bossChest = true;
  if (Object.values(S.shards || {}).some(n => n > 0) || all.some(it => (it.fp || 0) > 0) || S.maxDepth > 4) E.gainShard = true;
  if (S.mods.length || all.some(it => (it.mods || []).some(Boolean))) E.pickRune = true;
  if (Object.values(S.glyphs || {}).some(n => n > 0) || (S.ladder && S.ladder.best > 0)) E.gainGlyph = true;
  checkUnlocks(true); S.treeSeen = 'all';
}
// 天赋树雾：开放时只看得见从中心到每个区第一个大节点的主干；点亮节点时相邻节点和所在小团散开
function treeFogInit() {
  if (S.treeSeen === 'all') return; const s = new Set(S.treeSeen || []);
  for (const id in TREE.nodes) if (id === 'start' || /^\D+[0-3]$/.test(id)) s.add(id);
  for (const id of S.tree || []) treeFogAdd(s, id);
  S.treeSeen = [...s];
}
const treeGrp = id => { const m = /^(.+c\d+)_\d+$/.exec(id); return m ? m[1] : null; };
function treeFogAdd(s, id) { const N = TREE.nodes[id]; if (!N) return; s.add(id); for (const nb of [id, ...N.nb]) { s.add(nb); const g = treeGrp(nb); if (g) for (const k in TREE.nodes) if (k.startsWith(g + '_')) s.add(k); } }
function treeFogReveal(id) { if (!Array.isArray(S.treeSeen)) return; const s = new Set(S.treeSeen); treeFogAdd(s, id); S.treeSeen = [...s]; }
const treeFogged = id => !UNLOCK_ALL && Array.isArray(S.treeSeen) && !S.treeSeen.includes(id);

/* system-v2 §8 成长四段：营地“当前目标”横幅。按阶段给 3 个具体目标，横幅显示第一个没完成的；只做提示，不给奖励 */
function stageGoals() {
  const D = Math.max(0, (S.maxDepth || 1) - 1), Lb = (S.ladder && S.ladder.best) || 0, trigs = (S.trigs || []).filter(Boolean);
  const twoGems = trigs.some(T => T.socks.filter(isSkill).length >= 2), maxTier = Math.max(0, ...[...trigs, ...(S.trigBag || [])].map(T => trigTier(T.ilvl)));
  const st3 = (S.stones || []).some(x => x.t >= 3) || Object.values(S.equip).some(it => it && (it.stones || []).some(x => x && x.t >= 3));
  const uTrig = trigs.some(T => T.u), slot4 = trigSlots() >= 4;
  const S4 = [
    { n: '开荒', goals: [[`推到第 10 层（现在 ${D}）`, D >= 10], [`角色 15 级，开第 2 个魂龛位（现在 ${S.level}）`, S.level >= 15], ['一个魂龛里放 2 颗技能石', twoGems]] },
    { n: '成型', goals: [[`推到第 30 层（现在 ${D}）`, D >= 30], [`天梯打到第 20 层（现在 ${Lb}）`, Lb >= 20], [`角色 35 级，开第 3 个魂龛位（现在 ${S.level}）`, S.level >= 35]] },
    { n: '精修', goals: [[`天梯打到第 40 层（现在 ${Lb}）`, Lb >= 40], [`魂龛升到 T4（现在 T${maxTier}）`, maxTier >= 4], ['属性石合成到 3 阶', st3]] },
    { n: '毕业', goals: [['戴上独特魂龛', uTrig], ['开第 4 个魂龛位（稀有主手或法阵的“魂龛位 +1”）', slot4], [`冲天梯新纪录（现在 ${Lb}）`, false]] },
  ];
  const i = D < 10 ? 0 : D < 30 || Lb < 20 ? 1 : Lb < 40 ? 2 : 3, cur = S4[i], next = cur.goals.find(g => !g[1]) || cur.goals[cur.goals.length - 1];
  const need = typeof elemNeed === 'function' && typeof STATS !== 'undefined' && STATS.dps ? elemNeed(STATS) : '';
  return { stage: cur.n, line: `${cur.n} · ${next[0]}`, goals: cur.goals, need };
}
