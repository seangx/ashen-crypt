/* ---------------- 存档 ---------------- */
const SAVE_KEY = 'ashen-crypt-v4';
let S;
function freshState() {
  return {
    v: 4, level: 1, xp: 0, depth: 1, maxDepth: 1, nextId: 1,
    equip: { gem: null, wl: null, wr: null, shield: null, core: null, engine: null, hub: null },
    stash: [], mods: [], tree: [], bossKills: {},
    shards: {}, coins: 0, mst: { picks: [], bar: {}, pas: {}, key: {} }, glyphs: Object.fromEntries(GLYPHS.map(g => [g.id, 0])),
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
  if (raw) try { const o = JSON.parse(raw); if (o.v === 4 && (o.gemV || 0) >= 3) S = Object.assign(S, o); else if (o.v === 4) { S.wiped = 1; const tell = () => G.ui ? toast('地窖已重塑，旧的旅程已封存', COL.emberHi) : setTimeout(tell, 500); setTimeout(tell, 1200); } } catch (e) { } // 魂龛改版不兼容老存档（system-v2 §11）：直接清档
  S.shards ??= {}; S.glyphs = { ...freshState().glyphs, ...(S.glyphs || {}) };
  if (!S.equip.wl && !S.stash.length && !S.uqV) { S.uqV = 3; S.skV = 3; } // 新档：不用跑装备改版 / 技能重做的迁移
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
  S.tree ??= []; S.chips ??= {}; S.bossKills ??= {};
  if (!S.ladMerged) { S.ladMerged = 1; const b = (S.ladder && S.ladder.best) || 0; if (b + 1 > (S.maxDepth || 1)) S.maxDepth = Math.min(PROG.run.maxDepth, b + 1); } // 天梯并进推层：天梯最高层算进推层最深层
  S.mst ??= mstFresh(); if (S.tree.length) { const n = S.tree.length; S.tree = []; const tell = () => G.ui ? toast(`天赋改版：星盘换成专精，${n} 点已退回`, COL.emberHi) : setTimeout(tell, 500); setTimeout(tell, 1500); } // 专精改版（mastery-v1 §6）：星盘点数全退
  // 天赋树改版后旧存档的节点对不上：全部退回，印记回到背包
  // 通用防御整理（spec-tree-defense §3）：节点 id 不变，但换掉大天赋的 5 个小团整团退掉（点数自动返还），别的节点直接变成新效果
  if ((S.treeV || 0) < 7) { const gone = ['meleec0_', 'projc1_', 'guardc2_', 'guardc3_', 'lampc0_']; S.treeGone = gone; } S.treeV = 7;
  // 天赋树改版：只退掉没了的节点和因此断开的节点（点数自动返还），被退掉的印记槽里的印记放回背包
  { const old = S.tree.length, keep = new Set(S.tree.filter(id => TREE.nodes[id] && !(S.treeGone || []).some(g => id.startsWith(g)))), seen = new Set(), q = ['start'];
    while (q.length) { const c = q.pop(); for (const n of TREE.nodes[c].nb) if (keep.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } }
    if (seen.size < old) { S.tree = S.tree.filter(id => seen.has(id)); 
      const n = old - seen.size, tell = () => G.ui ? toast(`天赋树改版了：返还 ${n} 个天赋点`, COL.emberHi) : setTimeout(tell, 500); setTimeout(tell, 1200); } delete S.treeGone; }
  if (!S.equip.wl) starterKit();
  if (!S.seenUnlocks) migrateUnlocks(); S.events ??= {};
  // 副手改版：右手不再拿武器。旧存档右手的武器放回背包（符文还在上面），按主手标签送一件普通副手
  if (!S.offV) { const o = S.equip.wr; if (o && o.kind === 'weapon') { S.equip.wr = null; S.stash.unshift(o); const OH = DATA.mechanics.offhand, tg = S.equip.wl ? itemTags(S.equip.wl) : [];
      const b = (OH.starterByTag.find(([t]) => tg.includes(t)) || [0, OH.fallback])[1], w = S.equip.wl, it = newItem('off', b, w ? w.ilvl : 1, w ? w.q : 0, 0); S.equip.wr = it;
      const tell = () => G.ui ? toast(`副手改版：右手的${itemName(o)}已放回背包，送你一件${itemName(it)}`, COL.emberHi) : setTimeout(tell, 500); setTimeout(tell, 1500); }
    S.offV = 1; }
  S.equip.gem ??= null;
  if (!S.gemV) { migrateGems(); S.gemV = 1; }
  if ((S.gemV || 0) < 3) starterTrigs(); S.trigs ??= [null, null, null, null]; S.trigBag ??= []; castStarterFix();
  if (!S.legacyV) migrateLegacy(); delete S.chips;
  if ((S.uqV || 0) < 2) migrateUniqueCosts();
  if ((S.uqV || 0) < 3) migrateRarityV2();
  if ((S.skV || 0) < 3) migrateSkillV3();
  if ((S.clsV || 0) < 1) { const had = S.mst && ((S.mst.picks || []).length || Object.keys(S.mst.bar || {}).length); S.mst = mstFresh(); S.clsV = 1; // 职业改版：专精换成职业，点数全部退回
    if (had) { S.notice = { t: '职业改版', lines: [...((S.notice && S.notice.lines) || []), '专精换成了职业：骸骨武士、猎手、唤雷者、焚化者、守墓人、瘟医，选两个。每个职业有两种元素和自己的保命方式，原来的大天赋分到了各个职业里。', '两个职业的专精条都到 10 点，解锁它们合成的高级职业（一共 15 个）。', '你的天赋点已经全部退回，去“职业”页重新分配。'] }; const tell = () => G.ui ? G.ui.openWin('notice') : setTimeout(tell, 600); setTimeout(tell, 2500); } }
}
// 技能 v3：输出技能只留在出手类 / 常驻魂龛里，响应类魂龛里的退回背包（现在给功能技能用）
function migrateSkillV3() {
  const moved = [];
  for (const T of [...(S.trigs || []), ...(S.trigBag || [])]) { if (!T || !T.socks) continue; const C = TCOND[T.c]; if (!C || C.kind === 'cast' || T.c === 'always') continue;
    T.socks.forEach((g, k) => { if (g && g.kind === 'gem' && GEM_BY[g.b] && !GEM_BY[g.b].util) { T.socks[k] = null; S.stash.unshift(g); moved.push(GEM_BY[g.b].n); } }); }
  const had = (S.skV == null) && (S.stash.length || (S.trigs || []).some(Boolean)); S.skV = 3;
  if (had) { const lines = ['技能重做：每个技能现在只有一种元素，标签改成“元素 · 形态 · 机制”。', '六个元素各有一个主效果：物理破甲、火焰灼烧、闪电感电、瘟疫疫病、寒霜冰缓（叠满碎冰）、圣光审判（斩杀）。原来的附加元素、附加特效、共鸣取消了。', '新技能：霜刺、雷斩、圣裁、腐爪、落雷；功能技能：骨盾、回春、石肤、战吼、疾步、聚火。', '输出技能只能插在出手类魂龛（出手、命中、暴击、残灯）和常驻；击杀、受击、冲刺、定时这些响应类魂龛现在插功能技能。'];
    if (moved.length) lines.push(`${moved.length} 颗输出技能从响应类魂龛退回了背包：${[...new Set(moved)].join('、')}。`);
    S.notice = { t: '技能重做', lines }; const tell = () => G.ui ? G.ui.openWin('notice') : setTimeout(tell, 600); setTimeout(tell, 2500); }
}
// 11-10 稀有度改版：底材按物品等级换成三代（不再有 11 档品质）；拆成传奇词条的独特 → 同底材的传奇（规则数值、词条保留）
function migrateRarityV2() {
  let nLeg = 0; const names = [];
  for (const it of [...Object.values(S.equip), ...S.stash].filter(Boolean)) {
    if (['gem', 'mod', 'stone', 'trig', 'chip', 'map'].includes(it.kind)) continue;
    it.gen = genOf(it.ilvl); it.q = genQ(it.ilvl);
    const u = UNIQUE_BY[it.u]; if (!u || !u.leg) continue;
    it.la = it.u; delete it.u; delete it.lp; delete it.leg; delete it.stoneN; it.rar = 2; it.rn = pick(RARE_A) + pick(RARE_B[it.kind]); it.fp = rollFp(2);
    const n = stoneSockN(it); S.stones = S.stones || []; for (const st of (it.stones || []).slice(n)) if (st) S.stones.unshift(st); it.stones = (it.stones || []).slice(0, n); while (it.stones.length < n) it.stones.push(null);
    nLeg++; names.push(u.n);
  }
  for (const p of S.reelsPending || []) p.opts = null; // 轮盘里还没选的重新掷（选项可能是已经拆掉的独特）
  S.uqV = 3;
  const lines = ['原来的 11 档品质（朽坏…永恒）去掉了：装备的基础数值只看物品等级，同一种装备在 30 级、60 级以后掉落的会换一个名字，数值和隐性更强。已有装备按物品等级换算，数值和以前差不多。', '稀有度：普通 → 罕见 → 稀有 → 传奇（稀有 + 一条传奇词条），独特装备改叫神话。'];
  if (nLeg) lines.push(`${nLeg} 件独特装备（${[...new Set(names)].join('、')}）的效果改成了传奇词条，这些装备变成了同底材的传奇：效果和词条都保留。`);
  if (S.stash.length || Object.values(S.equip).some(Boolean)) { S.notice = { t: '装备改版', lines }; const tell = () => G.ui ? G.ui.openWin('notice') : setTimeout(tell, 600); setTimeout(tell, 2500); }
}
// 11-10 独特去代价：删掉的规则让 uv 错位，按规则名重新对齐；风暴之眼从头冠挪到法阵，身上的放回背包
const UQ_OLD_RULES = { StormCrown: ['chainCrown', 'shockMul', 'armorLess'], StormEye: ['areaEye', 'rangeInc', 'projLess'], RockCat: ['aspdLess', 'afterPct', 'afterRep'], BigBertha: ['flatPerArmor', 'debrisPerEnergy', 'aspdLess', 'ail:kin'], Goroboro: ['kinBaseInc', 'aspdLess'], GlassShield: ['rangeInc', 'resAll', 'blindAura'], StoneOfBalu: ['energyAdd', 'energyInc', 'aspdLessAll'], CritRipper: ['critLess', 'multicrit'], DoomCrown: ['delayCrown', 'delayAdd', 'aoeInc', 'earlyWarn'], ScorchedCircle: ['groundStack', 'durLess'], MartyrShield: ['martyrThrow', 'martyrArmor'], EchoCrown: ['echoCrown', 'chainLess'], WinterHeart: ['winterHeart', 'winterCost'], ShardCrown: ['shardCrown', 'frozenTaken', 'projSlowU'], EverwinterCircle: ['autoNova', 'iceGround', 'moveLess'], CoffinShield: ['coffin', 'freezeDur', 'fireResLess'], EchoAegis: ['aegisBurst', 'otherLess'] };
function migrateUniqueCosts() {
  for (const it of [...Object.values(S.equip), ...S.stash].filter(Boolean)) {
    const old = UQ_OLD_RULES[it.u], u = UNIQUE_BY[it.u]; if (!old || !u) continue;
    if (Array.isArray(it.uv) && it.uv.length === old.length) it.uv = u.rules.map(([k, lo, hi]) => { const i = old.indexOf(k); return i >= 0 ? it.uv[i] : lo === hi ? lo : rollRange(lo, hi); });
    if (it.u === 'StormEye' && it.kind !== u.kind) { for (const k in S.equip) if (S.equip[k] === it) S.equip[k] = null; S.stash = S.stash.filter(x => x !== it); const n = newUnique('StormEye', it.ilvl || 1); n.uv = it.uv; n.lp = it.lp ?? n.lp; n.q = it.q; n.isNew = 1; S.stash.unshift(n); S.stones = S.stones || []; for (const st of it.stones || []) if (st) S.stones.unshift(st); } // 词条按法阵重掷，镶的属性石退回
  }
  S.uqV = 2;
}
// 遗留系统清理（spec-legacy-cleanup §4）：墓图、命盘、印记、体魄 / 时砂、铁骨 / 流沙力场。东西不凭空消失：退成碎片或换部位
const RETUNED_U = ['GruvaksHorn', 'Arestum', 'StoneOfBalu']; // 规则条数 / 含义变了的独特：按新规则重掷数值
const CHIP_U = ['CritRipper', 'EscapeCircuit', 'GrandFinale', 'Wrath'];
function migrateLegacy() {
  const L = Math.max(1, S.maxDepth || 1), out = { maps: 0, marble: 0, chips: 0, shards: 0, moved: [], fields: 0 };
  const give = n => { for (let i = 0; i < n; i++) { const k = rollShard(L); S.shards[k] = (S.shards[k] || 0) + 1; } out.shards += n; };
  for (const m of S.maps || []) { give(3 + (m.affs || []).length * 2); out.maps++; }
  if ((S.marble || []).length) { out.marble = S.marble.length; give(10 * S.marble.length); } // 命盘不花资源：每个已点节点 10 个碎片
  const chips = [...Object.values(S.chips || {}).filter(Boolean), ...S.stash.filter(it => it.kind === 'chip')];
  S.stash = S.stash.filter(it => it.kind !== 'chip');
  for (const it of chips) {
    if (it.u && CHIP_U.includes(it.u)) { const n = newUnique(it.u, it.ilvl || 1); n.uv = it.uv || n.uv; n.lp = it.lp ?? n.lp; S.stash.unshift(n); out.moved.push(n.rn); continue; }
    give(3 * Math.max(1, (it.affs || []).length)); // 印记词条多半已下线：按条数退随机碎片
    if (it.u) give(10); out.chips++;
  }
  for (const it of [...Object.values(S.equip), ...S.stash].filter(Boolean)) if (it.u && RETUNED_U.includes(it.u)) it.uv = UNIQUE_BY[it.u].rules.map(([, lo, hi]) => lo === hi ? lo : rollRange(lo, hi));
  const allMods = [...S.mods, ...[...Object.values(S.equip), ...S.stash].filter(Boolean).flatMap(it => it.mods || [])].filter(Boolean);
  for (const m of allMods) if (m.mid === 'Mass' || m.mid === 'Time') { m.mid = 'Energy'; out.fields++; }
  delete S.maps; delete S.mapArmed; delete S.marble; delete S.chips;
  S.legacyV = 1;
  if (out.maps || out.marble || out.chips || out.moved.length || out.fields) {
    const lines = [];
    if (out.maps) lines.push(`墓图下线：${out.maps} 张墓图换成了词条碎片。难度和奖励交给天梯层词缀（15 层起每 15 层 1 条，每条宝箱多 1 件、碎片多 20%）。`);
    if (out.marble) lines.push(`命盘下线：${out.marble} 个已点节点退成了碎片。`);
    if (out.chips) lines.push(`印记下线：${out.chips} 件印记拆成了碎片。天赋树上的印记槽变成了小节点（不用重点）。暴击伤害改到副手和头冠的新词条上。`);
    if (out.moved.length) lines.push(`独特印记换了部位，放进了背包：${out.moved.join('、')}。`);
    if (out.fields) lines.push(`铁骨 / 流沙力场改成了魂涌力场（${out.fields} 个，等级不变）。`);
    lines.push(`一共退了 ${out.shards} 个词条碎片。体魄和时砂两个属性已移除，Boss 祝福已移除，强度交给天梯词缀和宝箱。`);
    S.notice = { t: '旧系统整理', lines };
    const tell = () => G.ui ? G.ui.openWin('notice') : setTimeout(tell, 600); setTimeout(tell, 2500);
  }
}
// 技能石迁移（spec-skill-gems §5）：武器拆成 武器 + 技能石，形态符文并进技能石，辅助符文搬进技能石的槽
function gemFromWeapon(w, pool) {
  const id = GEM_OF_BASE[w.b] || 'GemBolt', G = GEM_BY[id], ms = (w.mods || []).filter(Boolean);
  const fr = ms.find(m => FORM_GEM[m.mid] === id), sup = ms.filter(m => !FORM_GEM[m.mid]);
  for (const m of ms) if (m !== fr && FORM_GEM[m.mid]) pool.push(m); // 对不上的形态符文：之后单独转成技能石
  const g = newGem(id, { var: w.b === 'Thorns' ? 'Spikes' : G.src.includes(w.b) ? w.b : undefined, q: Math.floor((w.q || 0) / 2), sock: clamp(w.sock || 1, 1, GEMC.maxSock) });
  if (fr) { g.xp = fr.xp; g.lvl = fr.lvl; }
  sup.forEach((m, i) => { if (i < g.sock) g.mods[i] = m; else S.mods.push(m); });
  w.sock = 0; w.mods = [];
  return g;
}
function migrateGems() {
  const pool = [], st = [];
  const w = S.equip.wl, sh = S.equip.shield;
  const thr = sh && (sh.mods || []).find(m => m && m.mid === 'ShieldThrow');
  if (w && w.kind === 'weapon') { const g = gemFromWeapon(w, pool); if (thr) st.push(g); else S.equip.gem = g; }
  if (sh && sh.mods && sh.mods.some(Boolean)) { // 圣徽盾上的圣盾掷 + 辅助：变成圣盾掷技能石
    const sup = sh.mods.filter(m => m && m !== thr);
    if (thr) { const g = newGem('GemShield', { q: Math.floor((sh.q || 0) / 2), sock: clamp(Math.max(1, sup.length), 1, GEMC.maxSock) }); g.xp = thr.xp; g.lvl = thr.lvl; sup.forEach((m, i) => { if (i < g.sock) g.mods[i] = m; else S.mods.push(m); }); S.equip.gem = g; }
    else for (const m of sup) S.mods.push(m);
    sh.sock = 0; sh.mods = [];
  }
  for (const it of [...S.stash]) if (it.kind === 'weapon') st.push(gemFromWeapon(it, pool));
  for (const it of [...S.stash]) if (it.kind === 'shield' && it.mods && it.mods.some(Boolean)) { for (const m of it.mods) if (m) (FORM_GEM[m.mid] ? pool : S.mods).push(m); it.sock = 0; it.mods = []; }
  for (const k of ['core', 'engine', 'hub']) { const it = S.equip[k]; if (it && it.mods) it.mods.forEach((m, i) => { if (m && FORM_GEM[m.mid]) { pool.push(m); it.mods[i] = null; } }); }
  S.mods = S.mods.filter(m => { if (FORM_GEM[m.mid]) { pool.push(m); return false; } return true; });
  for (const m of pool) { const g = newGem(FORM_GEM[m.mid], { sock: 1 }); g.xp = m.xp; g.lvl = m.lvl; st.push(g); }
  S.stash.unshift(...st);
  if (st.length || S.equip.gem) { const tell = () => G.ui ? toast(`技能石上线：武器的技能和符文搬进了技能石（背包多了 ${st.length} 颗）`, COL.emberHi) : setTimeout(tell, 500); setTimeout(tell, 1800); }
}
// 新角色的装备：data/progression.json 的 starter
function starterKit() {
  const K = PROG.starter;
  const w = newItem('weapon', K.weapon, 1, 0, 0); S.equip.wl = w;
  const g = newGem(K.gem || 'GemBolt', { var: K.weapon, sock: K.gemSockets || 1 }); K.gemRunes.forEach((id, i) => { g.mods[i] = newMod(id); }); S.equip.gem = g; S.gemV = 1; S.legacyV = 1; S.seenUnlocks = {}; S.events = {}; S.treeSeen = []; // 技能石：骨矢 1 级
  if (K.engine) S.equip.engine = newItem('engine', K.engine, 1, 0, 0);
  if (K.shield) S.equip.shield = newItem('shield', K.shield, 1, 0, 0);
  if (PROG.unlocks.wr && PROG.unlocks.wr.event && !UNLOCK_ALL) { /* 渐进式披露：副手由第一只 Boss 宝箱保底给 */ } else { const OH = DATA.mechanics.offhand, tg = itemTags(g), b = (OH.starterByTag.find(([t]) => tg.includes(t)) || [0, OH.fallback])[1]; S.equip.wr = newItem('off', b, 1, 0, 0); } // 新档：按主手标签送一件普通副手
  if (K.hub) { const h = newItem('hub', K.hub, 1, 0, 0); h.sock = Math.max(1, h.sock); h.mods = Array(h.sock).fill(null); S.equip.hub = h; }
  starterTrigs(); // 魂龛：一个普通“命中时”2 孔 + 一颗按主手类别的技能石
}
