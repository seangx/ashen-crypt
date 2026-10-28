/* ---------------- 装备 v2（design/gear-v2.md、defense-v3.md）----------------
   启动时把 data/gear2.json 套到词条表、武器表、副手隐性上。老存档已在 gemV 升级时清空，这里不做迁移。 */
const G2 = DATA.gear2, G2W = G2.weapons, G2D = G2.defense, STONES = G2.stones;
{
  // 1. 词条池：keep 改部位，add 新增，其余停止掉落
  const mkTiers = (t1, top, topI, n, dec) => { const r = x => dec ? +x.toFixed(dec) : Math.max(1, Math.round(x)); const out = []; const W = [1000, 700, 450, 250, 120, 60];
    for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n, lo = t1 + (top - t1) * Math.pow(a, 1.25), hi = t1 + (top - t1) * Math.pow(b, 1.25); out.push([[r(i ? lo : t1 * 0.8 || t1), r(hi)], W[i], i ? Math.round(topI * Math.pow(a, 0.9)) : 1, 999]); }
    return out; };
  const scaleT = (tiers, m) => tiers.map(([v, w, a, b]) => [v.map(x => Math.max(1, Math.round(x * m))), w, a, b]);
  const keep = G2.keep;
  for (const a of AFF) {
    const K = keep[a.k];
    if (!K) { a.off = true; continue; }
    a.off = false; a.on = K.on.slice(); if (K.text) { const t = K.text; a.f = v => t.replace('#', v); }
    if (K.w) { const tot = a.tiers.reduce((s, t) => s + t[1], 0) || 1; a.tiers = a.tiers.map(t => [t[0], Math.max(1, Math.round(t[1] * K.w / tot)), t[2], t[3]]); }
    if (K.tiers) a.tiers = K.tiers;
    if (a.stat === 'res') a.f = v => `${ELEM_N[a.el]}抗性 +${v}`;
  }
  for (const [k, [text, stat, type, on, t1, top, topI, o]] of Object.entries(G2.add)) {
    let tiers = o.tiers;
    if (o.src) tiers = scaleT(ASTRO.affixes[o.src].tiers, o.mul);
    if (!tiers) tiers = mkTiers(t1, top, topI, o.n || 4, o.dec);
    if (o.w) { const tot = tiers.reduce((s, t) => s + t[1], 0); tiers = tiers.map(t => [t[0], Math.max(1, Math.round(t[1] * o.w / tot)), t[2], t[3]]); }
    const pair = stat === 'flat', el = pair ? o.el : o.el || null;
    const f = pair ? v => text.replace('#', `${v[0]}–${v[1]}`) : v => text.replace('#', v);
    const a = { k, f, stat, el, local: !!o.local || pair, grp: o.grp || (o.src ? o.src : k), type, on, pair, tiers, off: false };
    AFF.push(a); AFF_BY[k] = a;
  }
  // 2. 主手武器表
  GEMC.retired = Object.keys(WEAPONS).filter(k => !G2W[k]);
  for (const [k, w] of Object.entries(G2W)) {
    if (w.new && !WEAPONS[k]) { const c = WEAPONS[w.new.clone]; WEAPONS[k] = { ...c, key: k, n: w.new.n, ic: w.new.ic, cat: w.cat }; if (ASTRO.weapons) ASTRO.weapons[k] = { ...ASTRO.weapons[w.new.clone] }; if (DATA.items.weapons) DATA.items.weapons[k] = { ...DATA.items.weapons[w.new.clone], n: w.new.n }; }
    const W = WEAPONS[k]; W.crit = w.crit; W.bel = w.el; W.cat = w.cat; W.w = W.w || 1000; W.pc = w.pc;
    GEMC.pow[k] = w.pow; GEMC.spd[k] = w.spd / 1.2;
    IMPL[k] = { g2: w.imp, knock: w.knock, t: w.t.replace('#', `${w.imp[1]}–${w.imp[2]}`), fx: {} };
  }
  for (const k of GEMC.retired) { WEAPONS[k].w = 0; delete IMPL[k]; }
  for (const [ck, c] of Object.entries(GEMC.cats)) c.bases = Object.keys(G2W).filter(k => G2W[k].cat === ck);
  // 3. 副手：隐性改成 §5，不再有“主手技能总增”；所有副手共用词条池
  for (const [k, o] of Object.entries(G2.off)) if (ARMORS.off[k]) { ARMORS.off[k].sup = {}; ARMORS.off[k].imp2 = o.imp; ARMORS.off[k].d = o.t.replace('#', `${o.imp[1]}–${o.imp[2]}`); ARMORS.off[k].tags = ['Offhand', 'any']; }
}
// 隐性按品质 0 → 10 线性
const g2v = (r, q) => r[1] + (r[2] - r[1]) * clamp(q || 0, 0, 10) / 10;
function implFx(it) { const I = IMPL[it.b]; if (!I) return {}; if (!I.g2) return I.fx; const [s] = I.g2, v = g2v(I.g2, it.q), fx = {};
  if (s.startsWith('ail:')) fx.ail = { [s.slice(4)]: v / 100 }; else if (s === 'meleeLess') fx.inc = -v; else fx[s] = v; if (I.knock) fx.knock = 1; return fx; }
// 属性石：stone = { kind:'stone', sid, t(1..5) }，插在 it.stones
const stoneOf = sid => STONES.list[sid];
const stoneVal = (r, t) => r[1] + (r[2] - r[1]) * (t - 1) / 4;
const isWeaponLike = it => it && (it.kind === 'weapon' || it.kind === 'off');
function stoneSockN(it) { const s = STONES.sockets[it.kind]; if (!s) return 0; if (it.u) return it.stoneN ?? 1; return s[clamp(it.rar || 0, 0, 2)]; }
function stoneFx(it, s) { const S0 = stoneOf(s.sid); if (!S0) return null; const r = isWeaponLike(it) ? S0.w : S0.a; if (!r) return null; return [r[0], +stoneVal(r, s.t).toFixed(r[2] < 5 ? 2 : 0)]; }
function stoneText(it, s) { const S0 = stoneOf(s.sid), f = stoneFx(it, s); if (!f) return `${S0.n}：此部位无效`; return `${S0.n} ${s.t} 阶：${STAT_N2[f[0]] || f[0]} +${f[1]}`; }
const STAT_N2 = { 'inc:all': '伤害提高%', life: '生命', baseCrit: '基础暴击率%', critDmgG: '暴击伤害%', aspd: '攻速提高%', moveInc: '移速提高%', 'pen:all': '穿抗%', armor: '护甲', lifeOnKill: '击杀回复生命', lifeRegen: '每秒回复生命', rangedDR: '远程伤害降低%', soulKillInc: '击杀回灯火%', burnLess: '灯火燃烧降低%', findInc: '掉落提高%', lampOnCrit: '暴击回灯火' };
for (const e of ELEM) { STAT_N2['flat:' + e] = `附加${ELEM_N[e]}伤害`; STAT_N2['res:' + e] = `${ELEM_N[e]}抗性`; }
function rollStone(ilvl) { const ids = Object.keys(STONES.list), tw = STONES.tierW.map((w, i) => i * 20 <= (ilvl || 1) ? w : 0); return { id: S.nextId++, kind: 'stone', sid: pick(ids), t: wpick([1, 2, 3, 4, 5], t => tw[t - 1]), isNew: 1 }; }
// 装备上属性石的汇总（同种只算一颗，取最高阶）
function stoneSum(items, add) {
  for (const it of items) { const best = {}; for (const s of it.stones || []) if (s && (!best[s.sid] || best[s.sid].t < s.t)) best[s.sid] = s;
    for (const s of Object.values(best)) { const f = stoneFx(it, s); if (f) add(f[0], f[1]); const S0 = stoneOf(s.sid); if (S0.wx && isWeaponLike(it) && s.t >= 4) add(S0.wx[0], S0.wx[s.t]); } }
}
// 3 合 1：同种同阶 3 颗 → 高一阶 1 颗
function stoneFuse(sid, t) { const pool = (S.stones || []).filter(s => s.sid === sid && s.t === t); if (pool.length < 3 || t >= 5) return false; const used = pool.slice(0, 3); S.stones = S.stones.filter(s => !used.includes(s)); S.stones.unshift({ id: S.nextId++, kind: 'stone', sid, t: t + 1, isNew: 1 }); save(); return true; }
function stoneSocket(it, k, s) { it.stones = it.stones || []; const n = stoneSockN(it); if (k >= n) return false; const old = it.stones[k]; it.stones[k] = s; S.stones = S.stones.filter(x => x !== s); if (old) S.stones.unshift(old); refreshStats(); save(); return true; }
function stoneUnsocket(it, k) { const s = (it.stones || [])[k]; if (!s) return; it.stones[k] = null; S.stones.unshift(s); refreshStats(); save(); }
// defense-v3：按怪物等级的护甲、抗性减伤
const monLv = () => (typeof RUN !== 'undefined' && RUN && RUN.L) || (S.depth || 1);
const armorDrL = (A, L) => A > 0 ? A / (A + G2D.armorK * Math.max(1, L)) : 0;
const resDrL = (R, L) => R > 0 ? R / (R + G2D.resK * Math.max(1, L)) : R < 0 ? Math.max(-1, R / (G2D.resK * Math.max(1, L))) : 0;
// 灯火回复类词条：每秒有上限（gear-v2 §4.3）
function lampGain(k, v, cap) { if (!v || typeof RUN === 'undefined' || !RUN) return; if (RUN.mode === 'ladder') v *= 0.5; /* 天梯：灯火获取减半 */ const g = RUN.lg || (RUN.lg = {}), s = Math.floor(RUN.t); if (!g[k] || g[k].s !== s) g[k] = { s, n: 0 };
  const a = Math.min(v, cap - g[k].n); if (a <= 0) return; g[k].n += a; player.soul = Math.min(STATS.soulMax, player.soul + a); }
