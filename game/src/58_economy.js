/* ---------- 骨币经济：分解给骨币、骨坊赌部件、同名宝石合成（data/camp.json 的 economy） ---------- */
const ECO = DATA.camp.economy;
function gainCoins(n) { n = Math.max(0, Math.round(n || 0)); if (!n) return 0; S.coins = (S.coins || 0) + n; unlockEvent('gainCoin'); return n; }
const coinOfItem = it => { const C = ECO.coin, r = it.u || it.leg || it.ex ? 2 : clamp(it.rar | 0, 0, 2); return Math.round(C.rar[r] * (1 + (it.ilvl || 1) / C.ilvlDiv)); };
const coinOfGem = g => ECO.coin.gem + (g.lvl || 1);
const coinOfRune = m => ECO.coin.rune + Math.floor((m.lvl || 1) / 2);

/* 骨坊：选一个部位，花骨币买一件未鉴定装备（买下才揭晓） */
const SHOP_SLOTS = ['wl', 'wr', 'shield', 'core', 'engine', 'hub'];
const slotKind = s => (SLOTS.find(x => x.id === s) || {}).kind || s;
const shopIlvl = () => Math.max(1, S.maxDepth || 1);
const shopPrice = () => Math.round(ECO.shop.base + ECO.shop.perIlvl * shopIlvl());
const shopWhy = () => (S.coins || 0) < shopPrice() ? `骨币不够（要 ${shopPrice()}）` : S.stash.length >= STASH_CAP ? '储物箱满了' : null;
function gamble(slot) {
  if (shopWhy()) return null;
  const P = ECO.shop, L = shopIlvl(), kind = slotKind(slot); let it = null;
  if (rnd() < P.unique) { const pool = UNIQUES.filter(u => u.kind === kind && u.w > 0 && u.req <= L && !u.ladderOnly); if (pool.length) it = newUnique(wpick(pool, u => u.w).id, L, 0); }
  if (!it) it = rollItem(L, 0, false, wpick([0, 1, 2], r => P.rar[r]), false, kind);
  S.coins -= shopPrice(); it.isNew = true; S.stash.unshift(it); refreshStats(); save();
  return it;
}

/* 宝石合成：同名、同等级的 n 颗（技能石看 b，辅助石看 mid）合成一颗高一级的。留品质高、孔多的那颗，品质和孔数取最大；被合掉的技能石上插着的辅助石退回库存 */
const mergeKey = x => (x.kind === 'gem' ? 'g|' + x.b : 'm|' + x.mid) + '|' + x.lvl;
const mergeable = x => x && (x.kind === 'gem' || x.kind === 'mod') && x.lvl < MOD_MAX;
function mergeGroups() {
  const m = new Map();
  for (const x of [...S.stash.filter(y => y.kind === 'gem'), ...S.mods]) if (mergeable(x)) { const k = mergeKey(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return [...m.values()].filter(a => a.length >= ECO.merge.n);
}
function mergeSet(set) {
  const keep = set.reduce((a, b) => ((b.q || 0) - (a.q || 0) || (b.sock || 0) - (a.sock || 0)) > 0 ? b : a);
  for (const x of set) if (x !== keep) {
    if (x.kind === 'gem') { keep.q = Math.max(keep.q || 0, x.q || 0); while (keep.sock < x.sock) { keep.sock++; keep.mods.push(null); } for (const m of x.mods || []) if (m) S.mods.unshift(m); S.stash = S.stash.filter(y => y !== x); }
    else S.mods = S.mods.filter(y => y !== x);
  }
  keep.lvl++; keep.xp = lvlXp(keep.lvl); keep.isNew = false;
  return keep;
}
// 一键合成：反复合到合不动为止，返回合了几次、升到的宝石
function mergeAll() {
  let n = 0; const ups = new Set();
  for (let guard = 0; guard < 999; guard++) {
    const gs = mergeGroups(); if (!gs.length) break;
    for (const g of gs) for (let i = 0; i + ECO.merge.n <= g.length; i += ECO.merge.n) { ups.add(mergeSet(g.slice(i, i + ECO.merge.n))); n++; }
  }
  if (n) { refreshStats(); save(); }
  return { n, ups: [...ups].filter(x => S.stash.includes(x) || S.mods.includes(x)) };
}
const mergeCount = () => mergeGroups().reduce((a, g) => a + Math.floor(g.length / ECO.merge.n), 0);
const coinTxt = g => g && g.coins ? ` · 骨币 +${g.coins}` : '';
