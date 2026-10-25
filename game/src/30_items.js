/* ---------------- 物品 ---------------- */
const RARE_A = ['怨毒', '幽寂', '灰烬', '骸鸣', '血月', '寒鸦', '腐朽', '雷殛', '余晖', '深渊', '残烛', '碎骨', '暮色', '嚎风', '冥火', '铁锈', '哀歌', '霜咬'];
const RARE_B = { weapon: ['之牙', '之刃', '裁决', '断罪', '悲鸣'], shield: ['壁垒', '之墙', '庇护', '骨盾'], core: ['之冠', '遗容', '之眼', '面甲'], engine: ['之步', '疾影', '残迹', '飞踪'], off: ['之器', '遗物', '之握', '低语', '残响'], hub: ['之环', '法阵', '誓约', '回响'], chip: ['之印', '刻痕', '烙印', '铭文'] };
const AFF_LIMIT = [LOOT.affixCount.limit.normal, LOOT.affixCount.limit.magic, LOOT.affixCount.limit.rare]; // [前缀, 后缀] 上限：普通 / 罕见 / 稀有

const baseOf = it => it.fb ? it.fb : it.kind === 'weapon' ? WEAPONS[it.b] : ARMORS[it.kind][it.b];
const iconOf = it => it.kind === 'map' ? 'a_map' : baseOf(it).ic;
const slotsFor = it => it.kind === 'weapon' ? ['wl'] : it.kind === 'off' ? ['wr'] : it.kind === 'chip' ? [] : [it.kind];
const itemTags = it => it.fb ? it.fb.tags : it.kind === 'weapon' ? WEAPONS[it.b].tags : it.kind === 'engine' ? (ARMORS.engine[it.b].tags || ['Engine']) : (ARMORS[it.kind] && ARMORS[it.kind][it.b] && ARMORS[it.kind][it.b].tags) || [KIND_TAG[it.kind]]; // 圣徽盾带自己的标签
const canRollOn = (a, it) => !a.off && (a.on.includes(it.kind) || (it.b === 'EmpoweredChip' && a.on.includes('chipE'))) && (!a.tag || (it.kind === 'off' ? offTagOk(it, a.tag) : it.kind !== 'weapon' || WEAPONS[it.b].tags.includes(a.tag)));
const offTagOk = (it, tag) => { const t = (ARMORS.off[it.b] || {}).tags || []; return t.includes('any') || t.includes(tag); }; // 副手：箭袋只出投射物类，法源 / 图腾 / 提灯什么都能出 // tag 只限制武器
const KIND_TAG = { shield: 'Shield', core: 'Core', engine: 'Engine', hub: 'Nexus', chip: 'Chip' };
function itemName(it) { return it.rar >= 2 && it.rn ? it.rn : baseOf(it).n; }
const qv = (v, q) => Array.isArray(v) ? v[q] : v; // 按品质取值

// 品质：在物品等级覆盖的档位里按权重抽
function rollQuality(ilvl) {
  const ok = QUAL.map((q, i) => i).filter(i => ilvl >= QUAL[i][1] && ilvl <= QUAL[i][2]);
  if (!ok.length) return ilvl < 1 ? 0 : QUAL.length - 1;
  return wpick(ok, i => QUAL[i][3]);
}
// 武器底材伤害 = 原作按品质的数值 × 伤害效率 I
function weaponBase(b, q) { return [Math.round(qv(b.min, q) * b.I), Math.round(qv(b.max, q) * b.I)]; }
const engineBase = weaponBase;
function rollSockets(kind, b) {
  const sw = ARMORS[kind] && ARMORS[kind][b] && ARMORS[kind][b].sockW; if (sw) return wpick(sw.map((w, i) => i + 1), n => sw[n - 1]); // 圣徽盾：1–2 槽
  if (kind === 'hub') return wpick(USOCKET_W.map((w, i) => i + 1), n => USOCKET_W[n - 1]);
  if (SOCKET_KINDS[kind]) return wpick(SOCKET_W.map((w, i) => i + 1), n => SOCKET_W[n - 1]);
  return 0;
}
function newItem(kind, b, ilvl, q, rar) {
  const it = { id: S.nextId++, kind, b, ilvl, q, rar: 0, affs: [], sock: rollSockets(kind, b), mods: [] };
  it.mods = Array(it.sock).fill(null);
  setRarity(it, rar);
  it.fp = rollFp(it.rar);
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
const modWhere = m => MOD_BY[m.mid].field ? '法阵' : '武器、头冠或遁靴';

/* 掉落：底材按原作掉落权重在全部部位里抽（要求物品等级达到底材需求） */
function allBases() {
  const out = [];
  for (const k in WEAPONS) out.push(['weapon', k, WEAPONS[k]]);
  for (const kind in ARMORS) for (const k in ARMORS[kind]) out.push([kind, k, ARMORS[kind][k]]);
  return out;
}
// 独特装备：保底词条取指定档位（第 N 高档；loot.json 的 uniqueFixedTier 决定从词条族最高档还是从物品等级允许的最高档往下数），专属规则在范围里掷
const uniqueTop = (a, ilvl) => { if (LOOT.uniqueFixedTier.mode !== 'ilvl') return a.tiers.length - 1; let top = 0; a.tiers.forEach((t, i) => { if (ilvl >= t[2]) top = i; }); return top; };
function newUnique(id, ilvl) {
  const u = UNIQUE_BY[id];
  const it = newItem(u.kind, u.b, Math.max(ilvl, u.req), rollQuality(Math.max(ilvl, u.req)), 0);
  it.rar = 3; it.u = id; it.rn = u.n; it.fp = 0; it.lp = ri(...LOOT.legendary.potential);
  it.uv = u.rules.map(([, lo, hi]) => lo === hi ? lo : rollRange(lo, hi));
  for (const [fam, N] of u.fixed) { const a = AFF_BY[fam]; if (!a) continue; const t = clamp(uniqueTop(a, it.ilvl) - (N - 1), 0, a.tiers.length - 1); it.affs.push({ k: fam, t, v: rollVal(a, t) }); }
  if (u.sock) { it.sock = u.sock; it.mods = Array(u.sock).fill(null); }
  return it;
}
function rollUnique(ilvl, boss, ladder) {
  const pool = UNIQUES.filter(u => u.req <= ilvl && (u.w > 0 || boss) && (!u.ladderOnly || ladder || (S.ladder && S.ladder.best >= u.ladderOnly)));
  if (!pool.length) return null;
  return newUnique(wpick(pool, u => u.w || LOOT.uniqueBossOnlyWeight.w).id, ilvl);
}
function rollItem(ilvl, rarBonus = 0, boss = false, rarity = null, ladder = false) { // rarity：指定稀有度（不出独特）；ladder：天梯宝箱
  if (rarity === null && rnd() < (boss ? DROP.uniqueBoss : DROP.unique) * (1 + (LX.unique || 0) / 100)) { const u = rollUnique(ilvl, boss, ladder); if (u) return u; }
  const [kind, b] = wpick(allBases().filter(x => (x[2].req || 1) <= ilvl), x => (x[2].w || 1000) * (1 + ((LX.call || {})[x[0]] || 0) / 100));
  const rar = rarity ?? wpick([0, 1, 2], r => RARITY_W[r] * (r === 2 ? 1 + rarBonus / 100 : 1));
  return newItem(kind, b, ilvl, rollQuality(ilvl), rar);
}
// 词条碎片：在这个物品等级能出的词条里按权重抽一个词条族
function rollShard(ilvl) {
  const opts = [];
  for (const a of AFF) a.tiers.forEach((t, i) => { if (ilvl >= t[2] && ilvl < t[3] && !exTier(a, i)) opts.push({ k: a.k, w: t[1] }); });
  return opts.length ? wpick(opts, o => o.w).k : AFF[0].k;
}
// 掉落的符文带随机初始经验：rand^(expBase + expPerIlvl·物品等级) × cap × capGrowth^物品等级（data/loot.json 的 runeDrop）
function rollModDrop(ilvl) {
  const d = wpick(MODS.filter(m => m.req <= ilvl), m => m.w);
  const R = LOOT.runeDrop, cap = R.cap * Math.pow(R.capGrowth, ilvl);
  const xp = clamp(Math.round(Math.pow(rnd(), R.expBase + R.expPerIlvl * ilvl) * cap), 0, MOD_XP[MOD_XP.length - 1]);
  return newMod(d.id, xp);
}

function removeItem(it) {
  S.stash = S.stash.filter(x => x !== it);
  for (const k in S.equip) if (S.equip[k] === it) S.equip[k] = null;
  for (const k in S.chips) if (S.chips[k] === it) delete S.chips[k];
  if (it.mods) for (const m of it.mods) if (m) S.mods.push(m);
  refreshStats();
}
const STASH_CAP = LOOT.stashCap;
function addItem(it) { S.stash.push(it); it.isNew = true; }
function equipItem(it, slot) {
  if (it.kind === 'chip') return equipChip(it);
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
  removeItem(it);
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
