/* ---------------- 物品 ---------------- */
const RARE_A = ['怨毒', '幽寂', '灰烬', '骸鸣', '血月', '寒鸦', '腐朽', '雷殛', '余晖', '深渊', '残烛', '碎骨', '暮色', '嚎风', '冥火', '铁锈', '哀歌', '霜咬'];
const RARE_B = { weapon: ['之牙', '之刃', '裁决', '断罪', '悲鸣'], shield: ['壁垒', '之墙', '庇护', '骨盾'], core: ['之冠', '遗容', '之眼', '面甲'], engine: ['之步', '疾影', '残迹', '飞踪'], off: ['之器', '遗物', '之握', '低语', '残响'], hub: ['之环', '法阵', '誓约', '回响'], chip: ['之印', '刻痕', '烙印', '铭文'] };
const AFF_LIMIT = [LOOT.affixCount.limit.normal, LOOT.affixCount.limit.magic, LOOT.affixCount.limit.rare]; // [前缀, 后缀] 上限：普通 / 罕见 / 稀有

const baseOf = it => it.fb ? it.fb : it.kind === 'weapon' ? WEAPONS[it.b] : ARMORS[it.kind][it.b];
const iconOf = it => it.kind === 'map' ? 'a_map' : baseOf(it).ic;
const slotsFor = it => it.kind === 'gem' ? ['gem'] : it.kind === 'weapon' ? ['wl'] : it.kind === 'off' ? ['wr'] : it.kind === 'chip' ? [] : [it.kind];
const itemTags = it => it.fb ? it.fb.tags : it.kind === 'gem' ? gemTags(it) : it.kind === 'weapon' ? WEAPONS[it.b].tags : it.kind === 'engine' ? (ARMORS.engine[it.b].tags || ['Engine']) : (ARMORS[it.kind] && ARMORS[it.kind][it.b] && ARMORS[it.kind][it.b].tags) || [KIND_TAG[it.kind]]; // 圣徽盾带自己的标签
const canRollOn = (a, it) => !a.off && !a.noRoll && a.on.includes(it.kind) && (!a.tag || (it.kind === 'off' ? offTagOk(it, a.tag) : it.kind !== 'weapon' || WEAPONS[it.b].tags.includes(a.tag)));
const offTagOk = (it, tag) => { const t = (ARMORS.off[it.b] || {}).tags || []; return t.includes('any') || t.includes(tag); }; // 副手：箭袋只出投射物类，法源 / 图腾 / 提灯什么都能出 // tag 只限制武器
const KIND_TAG = { shield: 'Shield', core: 'Core', engine: 'Engine', hub: 'Nexus', chip: 'Chip' };
const baseName = it => { const g = it.kind !== 'gem' && it.gen, N = g && (DATA.items.genNames || {})[it.b]; return (N && N[g - 1]) || baseOf(it).n; }; // 高等级掉的同一种底材换个名字（内部是“代”，不给玩家看）
function itemName(it) { return it.rar >= 2 && it.rn ? it.rn : baseName(it); }
const qv = (v, q) => { if (!Array.isArray(v)) return v; const x = clamp(q || 0, 0, v.length - 1), i = Math.floor(x), f = x - i; return f && i + 1 < v.length ? v[i] + (v[i + 1] - v[i]) * f : v[i]; }; // 按底材档位取值（档位可以是小数：三代底材按物品等级插值）

// 底材档位：只看物品等级（第几代 + 代内进度），不再随机抽品质
const rollQuality = ilvl => genQ(ilvl);
// 武器底材伤害 = 原作按品质的数值 × 伤害效率 I
function weaponBase(b, q) { return [Math.round(qv(b.min, q) * b.I), Math.round(qv(b.max, q) * b.I)]; }
const engineBase = weaponBase;
function rollSockets(kind, b) {
    if (kind === 'hub') return wpick(USOCKET_W.map((w, i) => i + 1), n => USOCKET_W[n - 1]);
  if (SOCKET_KINDS[kind]) return wpick(SOCKET_W.map((w, i) => i + 1), n => SOCKET_W[n - 1]);
  return 0;
}
function newItem(kind, b, ilvl, q, rar) {
  const it = { id: S.nextId++, kind, b, ilvl, q: genQ(ilvl), gen: genOf(ilvl), rar: 0, affs: [], sock: rollSockets(kind, b), mods: [] }; // q 参数已不用：底材档位由物品等级决定
  it.mods = Array(it.sock).fill(null);
  setRarity(it, rar);
  it.fp = rollFp(it.rar);
  it.stones = Array(stoneSockN(it)).fill(null); // 属性石孔（gear-v2 §7）
  return it;
}
// 锻造潜力（data/loot.json 的 fp）
const rollFp = rar => { const r = LOOT.fp[['normal', 'magic', 'rare'][rar]]; return r ? ri(r[0], r[1]) : 0; };
// 溢彩档：档数够多的词条族，最高几档只能掉落（data/loot.json 的 exalted）
const EXA = LOOT.exalted;
const hasEx = a => a.tiers.length >= EXA.minTiers;
const exTier = (a, t) => hasEx(a) && t >= a.tiers.length - EXA.topTiers;
const craftTop = a => hasEx(a) ? a.tiers.length - EXA.topTiers - 1 : a.tiers.length - 1; // 铁砧能做到的最高档
function setRarity(it, rar) {
  it.rar = rar; it.affs = []; it.rn = null;
  if (rar === 1) { const c = LOOT.affixCount.magic, n = ri(c[0], c[1]); for (let i = 0; i < n; i++) rollAffix(it); }
  if (rar === 2) { const c = LOOT.affixCount.rare, n = ri(c[0], c[1]); for (let i = 0; i < n; i++) rollAffix(it); it.rn = pick(RARE_A) + pick(RARE_B[it.kind]); }
}
// 可以出现的（词条族, 档位）组合：部位对得上、同组没有、前后缀没满、物品等级落在档位窗口里
function affOptions(it) {
  const lim = AFF_LIMIT[it.rar] || [0, 0];
  const nP = it.affs.filter(x => AFF_BY[x.k].type === 'P').length, nS = it.affs.length - nP;
  const out = [];
  for (const a of AFF) {
    if (!canRollOn(a, it) || it.affs.some(x => AFF_BY[x.k].grp === a.grp)) continue;
    if ((a.type === 'P' ? nP >= lim[0] : nS >= lim[1])) continue;
    const wm = it.kind === 'hub' && (a.stat === 'res' || a.stat === 'maxRes') && a.el !== 'thermal' ? GEAR.hubResW : 1; // 抗性收拢后法阵的抗性权重提高（§3.1）
    a.tiers.forEach((t, i) => { if (it.ilvl >= t[2] && it.ilvl < t[3] && !exTier(a, i)) out.push({ a, t: i, w: t[1] * wm }); });
  }
  return out;
}
function rollVal(a, t) {
  const v = a.tiers[t][0];
  if (a.pair) return [rollRange(v[0], v[1]), rollRange(v[2], v[3])];
  if (v.length === 1) return v[0];
  return rollRange(v[0], v[1]);
}
function rollAffix(it) {
  const opts = affOptions(it); if (!opts.length) return null;
  const o = wpick(opts, x => x.w);
  const x = { k: o.a.k, t: o.t, v: rollVal(o.a, o.t) };
  it.affs.push(x); return x;
}
const tierLabel = x => 'T' + (x.t + 1); // 档位从最低档数 1 起（《最后纪元》的写法）
function affText(x) { return AFF_BY[x.k].f(x.v); }
// 下一个物品等级允许的档位
const nextTier = (x, ilvl) => { const a = AFF_BY[x.k]; const n = x.t + 1; return n < a.tiers.length && ilvl >= a.tiers[n][2] ? n : -1; };

/* 符文物品（原作：模组） */
function newMod(mid, xp = 0) { return { id: S.nextId++, kind: 'mod', mid, xp, lvl: modLevelOf(xp) }; }
// 符文能不能在这件装备上生效
function modActive(mod, it) {
  const d = MOD_BY[mod.mid];
  if (it.kind === 'hub') return !!d.field;
  if (d.field && uval(it, 'fieldHere')) return true;
  return !d.field && d.fit(it);
}
const RUNE_FIT = Object.fromEntries(DATA.runes.list.map(r => [r.id, r.fit || []]));
const modWhere = m => { if (MOD_BY[m.mid].field) return '法阵'; const t = (RUNE_FIT[m.mid] || []).filter(c => c.startsWith('tag:')).map(c => TAG_N[c.slice(4)] || c.slice(4)); return '魂龛，给同一个魂龛里的技能石' + (t.length ? `（技能要带：${t.join('、')}）` : ''); }; // 魂龛改版后辅助石只对技能石生效

/* 掉落：底材按原作掉落权重在全部部位里抽（要求物品等级达到底材需求） */
function allBases() {
  const out = [];
  for (const k in WEAPONS) out.push(['weapon', k, WEAPONS[k]]);
  for (const kind in ARMORS) if (kind !== 'gem' && kind !== 'chip') for (const k in ARMORS[kind]) out.push([kind, k, ARMORS[kind][k]]);
  return out;
}
// 独特装备：保底词条取指定档位（第 N 高档；loot.json 的 uniqueFixedTier 决定从词条族最高档还是从物品等级允许的最高档往下数），专属规则在范围里掷
const uniqueTop = (a, ilvl) => { if (LOOT.uniqueFixedTier.mode !== 'ilvl') return a.tiers.length - 1; let top = 0; a.tiers.forEach((t, i) => { if (ilvl >= t[2]) top = i; }); return top; };
function newUnique(id, ilvl, rand2) {
  const u = UNIQUE_BY[id];
  if (u.leg) return makeLegendary(newItem(u.kind, u.b, Math.max(ilvl, u.req), 0, 2), id); // 传奇词条模板不再作为独特掉：给同底材的传奇
  const it = newItem(u.kind, u.b, Math.max(ilvl, u.req), 0, 0);
  it.rar = 3; it.u = id; it.rn = u.n; it.fp = 0; it.lp = ri(...LOOT.legendary.potential);
  it.uv = u.rules.map(([, lo, hi]) => lo === hi ? lo : rollRange(lo, hi));
  for (const [fam, N] of u.fixed) { const a = AFF_BY[fam]; if (!a) continue; const t = clamp(uniqueTop(a, it.ilvl) - (N - 1), 0, a.tiers.length - 1); it.affs.push({ k: fam, t, v: rollVal(a, t) }); }
  if (u.sock) { it.sock = u.sock; it.mods = Array(u.sock).fill(null); }
  { const n = rand2 || G2.uniques.randN; it.rar = 2; for (let i = 0; i < n; i++) rollAffix(it); it.rar = 3; } // gear-v2 §6：独特 = 规则 + 固定词条 + 2–3 条随机词条
  it.stoneN = u.stoneN ?? 2; it.stones = Array(it.stoneN).fill(null);
  return it;
}
function rollUnique(ilvl, boss, ladder) {
  const pool = UNIQUES.filter(u => u.req <= ilvl && (u.w > 0 || boss) && (!u.ladderOnly || ladder || deepest() >= u.ladderOnly));
  if (!pool.length) return null;
  return newUnique(wpick(pool, u => u.w || LOOT.uniqueBossOnlyWeight.w).id, ilvl, boss ? G2.uniques.randChest : 0);
}
function rollItem(ilvl, rarBonus = 0, boss = false, rarity = null, ladder = false, only = null) { // rarity：指定稀有度（不出独特）；ladder：天梯宝箱；only：只出这个部位（骨坊）
  if (rarity === null && !only && rnd() < (boss ? DROP.uniqueBoss : DROP.unique) * (1 + (LX.unique || 0) / 100)) { const u = rollUnique(ilvl, boss, ladder); if (u) return u; }
  const [kind, b] = wpick(allBases().filter(x => (x[2].req || 1) <= ilvl && (!only || x[0] === only)), x => (x[2].w || 1000) * (1 + ((LX.call || {})[x[0]] || 0) / 100));
  const rar = rarity ?? wpick([0, 1, 2], r => RARITY_W[r] * (r === 2 ? 1 + rarBonus / 100 : 1));
  const it = newItem(kind, b, ilvl, 0, rar);
  if (rar === 2) { const L = LOOT.legendaryRare; if (rnd() < (ladder ? L.ladder : boss ? L.boss : L.normal)) makeLegendary(it); }
  return it;
}
// 传奇：稀有装备带一条传奇词条（同部位的模板），数值随物品等级：等级越高越靠近上限
function legPool(it) { return LEGA.filter(u => u.kind === it.kind && u.req <= Math.max(it.ilvl, 1)); }
function rollLegVal(lo, hi, ilvl) { if (lo === hi) return lo; const f = clamp(rf(0, 0.5) + (ilvl || 1) / 200, 0, 1); return Math.round(lo + (hi - lo) * f); }
function makeLegendary(it, id) {
  if (it.rar !== 2) return it; const pool = legPool(it); const u = id ? UNIQUE_BY[id] : pool.length ? wpick(pool, x => x.w || 40) : null; if (!u) return it;
  it.la = u.id; it.uv = u.rules.map(([, lo, hi]) => rollLegVal(lo, hi, it.ilvl)); return it;
}
// 词条碎片：在这个物品等级能出的词条里按权重抽一个词条族
function rollShard(ilvl) {
  const opts = [];
  for (const a of AFF) if (!a.off && !a.noRoll) a.tiers.forEach((t, i) => { if (ilvl >= t[2] && ilvl < t[3] && !exTier(a, i)) opts.push({ k: a.k, w: t[1] }); }); // 停掉的词条族不掉碎片
  return opts.length ? wpick(opts, o => o.w).k : AFF[0].k;
}
// 掉落的宝石按层数定等级：1 + floor(物品等级 / lvlPer) ± lvlSpread，经验取该等级的门槛（data/loot.json 的 runeDrop）
const lvlXp = L => L > 1 ? MOD_XP[L - 2] : 0;
function dropXp(ilvl) { const R = LOOT.runeDrop; return lvlXp(clamp(1 + Math.floor(ilvl / R.lvlPer) + ri(-R.lvlSpread, R.lvlSpread), 1, MOD_MAX)); }
function rollModDrop(ilvl) {
  const d = wpick(MODS.filter(m => m.req <= ilvl), m => m.w);
  return newMod(d.id, dropXp(ilvl));
}

/* 技能石（spec-skill-gems）：{ kind:'gem', b:技能石 id, lvl, xp, q, sock, mods }（老存档上的 var 变体已不用） */
const gemTags = g => GEM_BY[g.b].tags;
const utilVal = g => { const G = GEM_BY[g.b], U = G.util; return Math.round((U.v[0] + (U.v[1] - U.v[0]) * (clamp(g.lvl || 1, 1, MOD_MAX) - 1) / Math.max(1, MOD_MAX - 1)) * (1 + (g.q || 0) / 100) * 10) / 10; }; // 功能技能的数值：按等级、品质
const gemTag3 = g => { const G = GEM_BY[g.b] || g; return [G.kind3, ELEM_N[G.el], F3_N[G.f3], ...(G.mech || []).map(k => MECH_N[k])].filter(Boolean); }; // 显示用的三层标签
const gemMul = (G, L) => G.mul[0] + (G.mul[1] - G.mul[0]) * (clamp(L, 1, MOD_MAX) - 1) / 19;
function newGem(id, o = {}) {
  const G = GEM_BY[id], xp = o.xp || 0;
  const g = { id: S.nextId++, kind: 'gem', b: id, ilvl: 1, q: o.q ?? 0, rar: 0, affs: [], xp, lvl: o.lvl || modLevelOf(xp), sock: o.sock || 1, mods: [] };
  if (o.lvl && !o.xp) g.xp = g.lvl > 1 ? MOD_XP[g.lvl - 2] : 0;
  g.mods = Array(g.sock).fill(null); return g;
}
function rollGemDrop(ilvl) {
  const G = wpick(GEMS.filter(g => g.req <= ilvl && g.w > 0), g => g.w);
  const xp = dropXp(ilvl);
  const sw = GEMC.sockW, sock = wpick(sw.map((w, i) => i + 1), n => sw[n - 1]);
  return newGem(G.id, { xp, q: ri(GEMC.dropQ[0], GEMC.dropQ[1]), sock });
}
// 技能石当前的形态符文（虚拟，等级 = 技能石等级）
const gemFormRune = g => { const G = GEM_BY[g.b]; return G.fr ? { id: -1, kind: 'mod', mid: G.fr, lvl: g.lvl, xp: g.xp, virt: 1 } : null; };
// 技能的虚拟武器：参数全来自技能石（gems.json 的 base）。每次出手的伤害 = 主手这一下（mechanics.gems.hit 按主手品质 × 主手 pow）× 技能石 eff × 等级、品质、对口；
// 出手频率 = 主手攻速（gear2.weapons 的 aps）。持续型 / 光环的 eff 是每秒伤害
function gemBase(g, wl) {
  const G = GEM_BY[g.b], B = G.base, wb = WEAPONS[wl.b], H = GEMC.hit, tags = gemTags(g), cat = GEMC.cats[wb.cat];
  const aff = cat && cat.tags.some(t => tags.includes(t)) ? GEMC.affinity : 1;
  const f = gemMul(G, g.lvl) * (1 + (g.q || 0) / 100) * aff / GEMC.affinity * wPow(wl.b); // 对口时 ×1，不对口 ÷1.2
  const timed = !B.cont && !B.aura && B.form !== 'ram'; // 持续、光环、冲撞不按攻速出手
  return { ...B, key: G.id, n: G.n, tags: [...tags, 'Weapon'], min: H.min, max: H.max, I: B.eff * f, gI: f, aura: B.aura ? H.min.map((v, i) => (v + H.max[i]) / 2 * B.eff) : 0,
    aps: timed ? wAps(wl.b) : undefined, rngMul: g.basic ? 1 : G.rngMul || 1, /* 骨刺、霜刺：技能射程 ×3.5（普攻不变） */ crit: wb.crit, aff: aff > 1, gem: G.id, el: G.el || B.el, ...(g.basic && wb.bel ? { el: wb.bel } : {}) }; // v3：技能石固定一种元素 // gear-v2：普攻用武器自带元素
}
// 技能格“需要盾牌”：装着圣盾掷但没有盾（此时技能改成骨矢 1 级）
const needShield = (eq = S.equip) => !!(eq.gem && eq.gem.kind === 'gem' && GEM_BY[eq.gem.b].form === 'shieldThrow' && !eq.shield);
function skillItem(eq) { // 技能格里的技能石 → 虚拟武器；圣盾掷返回 null（走 shieldWeapon）
  let g = eq.gem && eq.gem.kind === 'gem' ? eq.gem : null;
  if (g && GEM_BY[g.b].form === 'shieldThrow' && eq.shield) return null;
  if (!g || GEM_BY[g.b].form === 'shieldThrow') g = { kind: 'gem', b: 'GemBolt', lvl: 1, q: 0, mods: [], sock: 0, affs: [], fake: 1 }; // 没装技能石 / 圣盾掷没盾：骨矢 1 级，无辅助
  const wl = eq.wl && eq.wl.kind === 'weapon' ? eq.wl : { kind: 'weapon', b: GEMC.unarmed, q: 0, ilvl: 1, affs: [], rar: 0, id: -1 };
  return { ...wl, fb: gemBase(g, wl), src: g, gem: g };
}

function removeItem(it) {
  S.stash = S.stash.filter(x => x !== it);
  for (const k in S.equip) if (S.equip[k] === it) S.equip[k] = null;
  if (it.mods) for (const m of it.mods) if (m) S.mods.push(m);
  if (it.stones) for (const x of it.stones) if (x) (S.stones = S.stones || []).push(x);
  refreshStats();
}
const STASH_CAP = LOOT.stashCap;
// 捡到装备：分解祭坛的规则在拾取时就生效（自动推层可以很久不回营地，原来背包会涨到一百多件、超出 60 格的看不到）；装备超过上限时拆掉最不值钱的
function addItem(it) {
  S.stash.push(it); it.isNew = true; if (it.kind === 'gem') return;
  if (typeof salvWhy === 'function' && salvRules().on && unlocked('salvage') && salvWhy(it)) return pickSalvage(it);
  stashTrim();
}
function pickSalvage(it) { const g = salvage(it), P = RUN ? (RUN.psalv ??= { n: 0, shards: 0, coins: 0 }) : null; if (P) { P.n++; P.shards += Object.values(g).reduce((a, b) => a + b, 0); P.coins += g.coins || 0; } }
const gearCount = () => S.stash.reduce((n, x) => n + (x.kind !== 'gem'), 0);
const VAL_CACHE = new WeakMap();
function stashTrim() {
  let over = gearCount() - STASH_CAP; if (over <= 0) return;
  const fav = typeof salvFav === 'function' ? salvFav() : [], st = typeof STATS !== 'undefined' ? STATS : null;
  const val = x => { if (!st) return (x.rar | 0) * 1000 + (x.ilvl || 0); let c = VAL_CACHE.get(x); if (!c || c.st !== st) VAL_CACHE.set(x, c = { st, v: itemValue(x) }); return c.v; }; // 换上后的估值（秒伤 + 有效生命），装备不变就用缓存（WeakMap，不进存档）
  const cands = S.stash.filter(x => x.kind !== 'gem' && x.kind !== 'chip' && !(x.u || x.la || x.ex) && !(x.affs || []).some(a => fav.includes(a.k))).sort((a, b) => val(a) - val(b));
  for (const x of cands) { if (over <= 0) break; pickSalvage(x); over--; if (RUN && !RUN.trimTold) { RUN.trimTold = 1; toast(`储物箱满了（${STASH_CAP} 件）：自动拆掉最不值钱的装备`, '#d9cfb8'); } } // 独特、传奇、溢彩、带收藏词条的不拆；更好的估值高，排在最后
}
function equipItem(it, slot) {
  if (it.kind === 'gem') { const b = bestGemSpot(it); if (b) socketInto(b.T, b.k, it); return; } // 技能石插进魂龛（旧技能格已经不生效）
  slot = it.kind === 'weapon' ? 'wl' : it.kind === 'off' ? 'wr' : it.kind; // 武器只进主手，副手只进副手槽
  const cur = S.equip[slot];
  S.stash = S.stash.filter(x => x !== it);
  for (const k in S.equip) if (S.equip[k] === it) S.equip[k] = null;
  S.equip[slot] = it; it.isNew = false;
  if (cur) S.stash.unshift(cur);
  refreshStats();
}
function unequip(slot) { const it = S.equip[slot]; if (!it) return; S.equip[slot] = null; S.stash.unshift(it); refreshStats(); }
// 拆解：每条词条给对应碎片，档位高的多给（data/craft.json 的 shatter）
function salvage(it) {
  const SH = CRAFT.shatter, got = {};
  for (const x of it.affs || []) { const n = SH.perAffix + (x.t + 1 >= SH.bonusTier ? SH.bonus : 0); S.shards[x.k] = (S.shards[x.k] || 0) + n; got[x.k] = (got[x.k] || 0) + n; }
  removeItem(it); const c = gainCoins(it.kind === 'gem' ? coinOfGem(it) : coinOfItem(it)); Object.defineProperty(got, 'coins', { value: c }); // 骨币不算进碎片合计
  return got;
}

// 老存档词条映射（mechanics.json gear.migrate）：档位按在族里的比例换算，数值按在档位里的位置换算
function migrateAffs(it) {
  if (!it.affs) return; let refund = 0;
  const ok = (a, x) => a && !a.off && a.on.includes(it.kind) && (!a.tag || it.kind !== 'weapon' || (WEAPONS[it.b] && WEAPONS[it.b].tags.includes(a.tag))) && !it.affs.some(y => y !== x && AFF_BY[y.k] && AFF_BY[y.k].grp === a.grp);
  it.affs = it.affs.filter(x => {
    const a0 = AFF_BY[x.k]; let to = GEAR.migrate[x.k];
    if (!to) { if (a0) return true; refund++; return false; }
    if (it.kind !== 'weapon' && /Minion/.test(x.k)) to = ['AreaDamage2'];
    const a = to.map(k => AFF_BY[k]).find(a => ok(a, x));
    if (!a) { refund++; return false; }
    const n0 = a0 ? a0.tiers.length : 1, t0 = clamp(x.t || 0, 0, n0 - 1), t = Math.round((n0 > 1 ? t0 / (n0 - 1) : 0) * (a.tiers.length - 1));
    let fr = 0.5;
    if (a0) { const v0 = a0.tiers[t0][0], v = Array.isArray(x.v) ? x.v[0] : x.v; if (v0.length > 1 && v0[1] > v0[0]) fr = clamp((v - v0[0]) / (v0[1] - v0[0]), 0, 1); }
    const nv = a.tiers[t][0];
    x.k = a.k; x.t = t; x.v = nv.length === 1 ? nv[0] : Math.round(nv[0] + fr * (nv[1] - nv[0]));
    return true;
  });
  if (refund && it.fp != null) it.fp += refund;
}
