/* ---------------- 铁砧（参考《最后纪元》） ----------------
   参数在 data/craft.json。加词条、升一档用词条碎片；洗数值、移除用铸符；每个动作扣锻造潜力，扣到 0 以后不能再改。
   稀有度跟着词条数变：0 条普通，1–2 条罕见，3–4 条稀有。 */
const AV = CRAFT.anvil;
const ANVIL_LIM = LOOT.affixCount.limit.rare; // [前缀, 后缀]
const AFF_MAX = ANVIL_LIM[0] + ANVIL_LIM[1];
const glyphN = id => S.glyphs[id] || 0;
const shardN = k => S.shards[k] || 0;
const craftable = it => !!it && !['mod', 'map'].includes(it.kind) && it.rar < 3 && !it.u;
const affCount = (it, type) => it.affs.filter(x => AFF_BY[x.k].type === type).length;
// 词条族的名字（数值用 # 代替）
const affName = a => a.f(a.pair ? ['#', '#'] : '#');
function syncRarity(it) {
  const n = it.affs.length, rar = n === 0 ? 0 : n <= RAR[1].max ? 1 : 2;
  if (rar === 2 && !it.rn) it.rn = pick(RARE_A) + pick(RARE_B[it.kind]);
  if (rar < 2) it.rn = null;
  it.rar = rar;
}
/* 能不能做：返回 null 表示可以，否则返回原因 */
function anvilWhy(it) {
  if (!it) return '先选一件装备';
  if (!craftable(it)) return '独特装备不能在铁砧上改';
  if (!(it.fp > 0)) return '锻造潜力已经用完';
  return null;
}
// 词条族能不能加到这件装备上（不看碎片）
function canAdd(it, a) {
  return canRollOn(a, it) && !it.affs.some(x => AFF_BY[x.k].grp === a.grp) && affCount(it, a.type) < ANVIL_LIM[a.type === 'P' ? 0 : 1] && it.ilvl >= a.tiers[0][2];
}
function addWhy(it, k) {
  const w = anvilWhy(it); if (w) return w;
  const a = AFF_BY[k];
  if (it.affs.length >= AFF_MAX) return `最多 ${AFF_MAX} 条词条`;
  if (!canRollOn(a, it)) return '这个部位不能有这条词条';
  if (it.affs.some(x => AFF_BY[x.k].grp === a.grp)) return '已经有同类词条';
  if (affCount(it, a.type) >= ANVIL_LIM[a.type === 'P' ? 0 : 1]) return a.type === 'P' ? '前缀已满' : '后缀已满';
  if (it.ilvl < a.tiers[0][2]) return `要物品等级 ${a.tiers[0][2]}`;
  if (shardN(k) <= 0) return '没有这个词条的碎片';
  return null;
}
function upWhy(it, i) {
  const w = anvilWhy(it); if (w) return w;
  const x = it.affs[i]; if (!x) return '先点一条词条';
  const a = AFF_BY[x.k], n = x.t + 1;
  if (n > craftTop(a)) return n < a.tiers.length ? '再往上是只能掉落的溢彩档' : '已经是最高档';
  if (it.ilvl < a.tiers[n][2]) return `下一档要物品等级 ${a.tiers[n][2]}`;
  if (shardN(x.k) <= 0) return '没有这个词条的碎片';
  return null;
}
function refineWhy(it, i) {
  const w = anvilWhy(it); if (w) return w;
  if (!it.affs[i]) return '先点一条词条';
  if (glyphN('refine') <= 0) return '没有洗练符';
  return null;
}
function stripWhy(it) {
  const w = anvilWhy(it); if (w) return w;
  if (!it.affs.length) return '没有词条';
  if (glyphN('strip') <= 0) return '没有剥离符';
  return null;
}
/* 动作：都返回一行说明 */
// 扣潜力；附带希望符时有 hopeChance 几率这次不扣。不够扣也照样完成，潜力归 0
function spendFp(it, range, extra = 0, hope = false) {
  let cost = ri(range[0], range[1]) + extra, saved = false;
  if (hope) { S.glyphs.hope--; if (rnd() < CRAFT.glyphs.hopeChance) { cost = 0; saved = true; } }
  it.fp = Math.max(0, it.fp - cost);
  return saved ? '希望符生效，潜力没扣' : `潜力 -${cost}`;
}
// 加词条的起始档：物品等级允许的最高档（不超过铁砧上限）往下 addBelowTop 档
function addTier(a, it) { let top = 0; a.tiers.forEach((t, i) => { if (it.ilvl >= t[2]) top = i; }); return Math.max(0, Math.min(craftTop(a), top) - AV.addBelowTop); }
function craftAdd(it, k, hope) {
  const a = AFF_BY[k], t = addTier(a, it); S.shards[k]--;
  const x = { k, t, v: rollVal(a, t) }; it.affs.push(x); syncRarity(it);
  return `加上 ${affText(x)}，${spendFp(it, AV.add, 0, hope)}`;
}
function craftUp(it, i, hope, chaos) {
  const x = it.affs[i]; S.shards[x.k]--; x.t++;
  const msg = spendFp(it, AV.upgrade, Math.floor((x.t + 1) / AV.upgradeTierDiv), hope);
  let swap = '';
  if (chaos) {
    S.glyphs.chaos--;
    const a0 = AFF_BY[x.k], pool = AFF.filter(a => a.type === a0.type && a.k !== x.k && canRollOn(a, it) && !it.affs.some(y => y !== x && AFF_BY[y.k].grp === a.grp));
    if (pool.length) { const a = pick(pool); x.k = a.k; x.t = Math.min(x.t, craftTop(a)); swap = '，混沌符把它换成了别的词条'; }
  }
  x.v = rollVal(AFF_BY[x.k], x.t);
  return `升到 ${tierLabel(x)}：${affText(x)}${swap}，${msg}`;
}
/* 誓约：随机打一条这个部位能出的（已有就替换） */
const oathOpts = it => OATH.list.filter(o => oathFits(o, it) && o.id !== it.oath);
function addOath(it) { const ok = oathOpts(it); if (ok.length) it.oath = pick(ok).id; return it; }
const oathText = id => { const o = OATH_BY[id]; return o ? `誓约：${o.pos}；${o.neg}` : ''; };
function oathWhy(it) { if (!craftable(it)) return '独特装备、地图、符文不能立誓'; if (glyphN('oath') <= 0) return `没有立誓符（天梯 ${OATH.glyphLadder} 层起的宝箱 ${OATH.glyphDrop}% 掉）`; if (!oathOpts(it).length) return '这个部位没有能出的誓约'; return anvilWhy(it); }
function craftOath(it) { S.glyphs.oath--; const old = it.oath; addOath(it); return `${old ? '换成' : '立下'}${oathText(it.oath)}，${spendFp(it, [OATH.fpCost, OATH.fpCost])}`; }
function craftRefine(it, i) {
  const x = it.affs[i]; S.glyphs.refine--; x.v = rollVal(AFF_BY[x.k], x.t);
  return `洗成 ${affText(x)}，${spendFp(it, AV.refine)}`;
}
function craftStrip(it) {
  S.glyphs.strip--; const [x] = it.affs.splice(ri(0, it.affs.length - 1), 1); syncRarity(it);
  return `去掉了 ${affText(x)}，${spendFp(it, AV.strip)}`;
}

/* 溢彩：天梯宝箱里的稀有装备带 1 条顶两档的词条 */
function makeExalted(it) {
  if (it.u) return it;
  let cand = it.affs.filter(x => hasEx(AFF_BY[x.k]));
  if (!cand.length) {
    const pool = AFF.filter(a => hasEx(a) && canRollOn(a, it) && !it.affs.some(x => AFF_BY[x.k].grp === a.grp));
    if (!pool.length) return it;
    const a = pick(pool), x = { k: a.k, t: 0, v: 0 };
    const same = it.affs.filter(y => AFF_BY[y.k].type === a.type);
    if (same.length >= ANVIL_LIM[a.type === 'P' ? 0 : 1] || it.affs.length >= AFF_MAX) it.affs.splice(it.affs.indexOf(pick(same.length ? same : it.affs)), 1);
    it.affs.push(x); cand = [x];
  }
  const x = pick(cand), a = AFF_BY[x.k];
  x.t = a.tiers.length - 1 - ri(0, EXA.topTiers - 1); x.v = rollVal(a, x.t);
  syncRarity(it); it.ex = 1;
  return it;
}

/* 传奇熔铸：独特 + 同部位稀有 → 传奇（独特的规则和固定词条 + 转移“传奇潜力”条稀有词条） */
function fuseWhy(u, r) {
  if (!u || !u.u) return '先选一件独特装备';
  if (u.leg) return '已经是传奇';
  if (!(u.lp > 0)) return '这件独特装备没有传奇潜力';
  if (!r) return '再选一件同部位的稀有装备';
  if (r.kind !== u.kind) return '部位不同';
  if (r.rar !== 2 || r.u) return '只能用稀有装备';
  return null;
}
function craftFuse(u, r) {
  const pool = [...r.affs], n = Math.min(u.lp, pool.length), moved = [];
  for (let i = 0; i < n; i++) { const x = pool.splice(ri(0, pool.length - 1), 1)[0]; u.affs.push({ ...x }); moved.push(x); }
  u.leg = 1; u.lp = 0;
  removeItem(r); refreshStats();
  return `熔铸完成，转移了 ${moved.length} 条词条`;
}

/* 符文喂养：被喂的符文获得前者累计经验的 feed.mul 倍 */
function feedRune(src, dst) {
  const add = Math.floor(src.xp * DATA.runes.feed.mul);
  dst.xp = Math.min(MOD_XP[MOD_XP.length - 1], dst.xp + add); dst.lvl = modLevelOf(dst.xp);
  S.mods = S.mods.filter(m => m !== src);
  for (const k in S.equip) { const it = S.equip[k]; if (it && it.mods) it.mods = it.mods.map(m => m === src ? null : m); }
  refreshStats();
  return add;
}
