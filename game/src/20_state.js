/* ---------------- 存档 ---------------- */
const SAVE_KEY = 'ashen-crypt-v4';
let S;
function freshState() {
  return {
    v: 4, level: 1, xp: 0, depth: 1, maxDepth: 1, nextId: 1,
    equip: { wl: null, wr: null, shield: null, core: null, engine: null, hub: null },
    stash: [], mods: [], tree: [], chips: {}, maps: [], mapArmed: null, marble: [], bossKills: {},
    shards: {}, glyphs: Object.fromEntries(GLYPHS.map(g => [g.id, 0])),
    stats: { kills: 0, missions: 0, deaths: 0, bosses: 0 },
    settings: { sound: true },
    auto: { ai: true, loop: false, lock: false, fails: 0, back: false, backWins: 0 },
    ladder: { unlocked: 1, best: 0, bestTime: 0, tiersHit: [], records: [], chain: false },
  };
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { }
  window.claude?.hot?.snapshot?.(() => ({ save: JSON.stringify(S) }));
}
function load(data) {
  let raw = data && data.save;
  if (!raw) try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { }
  S = freshState();
  if (raw) try { const o = JSON.parse(raw); if (o.v === 4) S = Object.assign(S, o); } catch (e) { }
  S.shards ??= {}; S.glyphs = { ...freshState().glyphs, ...(S.glyphs || {}) };
  // 新做装系统之前的存档：丢掉骰子和魂萃词条，装备补上锻造潜力，独特装备补上传奇潜力
  if (!S.craftV) {
    delete S.dice; delete S.astral;
    for (const it of [...Object.values(S.equip), ...S.stash, ...Object.values(S.chips || {})]) {
      if (!it) continue;
      if (it.u) it.lp ??= ri(...LOOT.legendary.potential); else it.fp ??= rollFp(it.rar);
    }
    S.craftV = 1;
  }
  // 词条改版（spec-bd-gear §3.4）：空词条按 id 映射成新词条，对不上的删掉并返还锻造潜力；以后每次读档也清掉不认识的词条
  { const all = [...Object.values(S.equip), ...S.stash, ...Object.values(S.chips || {})].filter(Boolean); for (const it of all) migrateAffs(it); S.affixV = 2; }
  S.auto = { ...freshState().auto, ...(S.auto || {}) };
  S.ladder = { ...freshState().ladder, ...(S.ladder || {}) };
  S.tree ??= []; S.chips ??= {}; S.maps ??= []; S.marble ??= []; S.bossKills ??= {}; S.stats.maps ??= 0;
  // 天赋树改版后旧存档的节点对不上：全部退回，印记回到背包
  // 通用防御整理（spec-tree-defense §3）：节点 id 不变，但换掉大天赋的 5 个小团整团退掉（点数自动返还），别的节点直接变成新效果
  if ((S.treeV || 0) < 7) { const gone = ['meleec0_', 'projc1_', 'guardc2_', 'guardc3_', 'lampc0_']; S.treeGone = gone; } S.treeV = 7;
  // 天赋树改版：只退掉没了的节点和因此断开的节点（点数自动返还），被退掉的印记槽里的印记放回背包
  { const old = S.tree.length, keep = new Set(S.tree.filter(id => TREE.nodes[id] && !(S.treeGone || []).some(g => id.startsWith(g)))), seen = new Set(), q = ['start'];
    while (q.length) { const c = q.pop(); for (const n of TREE.nodes[c].nb) if (keep.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } }
    if (seen.size < old) { S.tree = S.tree.filter(id => seen.has(id)); for (const k in S.chips) if (!seen.has(k)) { S.stash.unshift(S.chips[k]); delete S.chips[k]; }
      const n = old - seen.size, tell = () => G.ui ? toast(`天赋树改版了：返还 ${n} 个天赋点`, COL.emberHi) : setTimeout(tell, 500); setTimeout(tell, 1200); } delete S.treeGone; }
  if (!S.equip.wl) starterKit();
  // 副手改版：右手不再拿武器。旧存档右手的武器放回背包（符文还在上面），按主手标签送一件普通副手
  if (!S.offV) { const o = S.equip.wr; if (o && o.kind === 'weapon') { S.equip.wr = null; S.stash.unshift(o); const OH = DATA.mechanics.offhand, tg = S.equip.wl ? itemTags(S.equip.wl) : [];
      const b = (OH.starterByTag.find(([t]) => tg.includes(t)) || [0, OH.fallback])[1], w = S.equip.wl, it = newItem('off', b, w ? w.ilvl : 1, w ? w.q : 0, 0); S.equip.wr = it;
      const tell = () => G.ui ? toast(`副手改版：右手的${itemName(o)}已放回背包，送你一件${itemName(it)}`, COL.emberHi) : setTimeout(tell, 500); setTimeout(tell, 1500); }
    S.offV = 1; }
}
// 新角色的装备：data/progression.json 的 starter
function starterKit() {
  const K = PROG.starter;
  const w = newItem('weapon', K.weapon, 1, 0, 0); w.sock = K.weaponSockets; w.mods = Array(w.sock).fill(null); K.weaponRunes.forEach((id, i) => { w.mods[i] = newMod(id); });
  S.equip.wl = w;
  if (K.engine) S.equip.engine = newItem('engine', K.engine, 1, 0, 0);
  if (K.shield) S.equip.shield = newItem('shield', K.shield, 1, 0, 0);
  if (K.hub) { const h = newItem('hub', K.hub, 1, 0, 0); h.sock = Math.max(1, h.sock); h.mods = Array(h.sock).fill(null); S.equip.hub = h; }
}
