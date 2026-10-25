/* ---------------- 营地：主页、分解祭坛 ----------------
   参数在 data/camp.json。回营地时按 S.salvage 的规则把带回的装备拆成词条碎片（游戏和 tools/sim.js 共用一套）。 */
const CAMP = DATA.camp;
const FAC_BY = Object.fromEntries(CAMP.facilities.map(f => [f.id, f]));
const facOpen = f => !f.unlock || unlocked(f.unlock);
const salvRules = () => (S.salvage ??= { rar: [...CAMP.salvage.rar], old: CAMP.salvage.old, fav: null, on: true });
// 收藏词条：玩家没改过时，取主武器流派的做装偏好前 favN 个
function salvFav() {
  const R = salvRules(); if (R.fav) return R.fav;
  return STATS.weapons.some(w => w && w.whirl) ? WH.craftPref.slice(0, CAMP.salvage.favN) : STATS.weapons.some(w => w && w.spark) ? SP.craftPref.slice(0, CAMP.salvage.favN) : [];
}
// 这件会不会被自动分解：返回原因（old 太旧 / rar 按稀有度），不分解返回 null。
// 独特、传奇、溢彩、印记永远不分解；太旧的装备不看收藏词条，直接分解
function salvWhy(it) {
  if (!it || it.kind === 'chip' || it.kind === 'gem' || it.u || it.leg || it.ex) return null; // 技能石不自动分解
  const R = salvRules();
  if (R.old && it.ilvl < S.maxDepth - CAMP.salvageIlvlBack) return 'old';
  const fav = salvFav(); if (it.affs.some(x => fav.includes(x.k))) return null;
  return R.rar[it.rar] ? 'rar' : null;
}
// 按规则分解一批装备（只动背包里的，身上穿着的不动）
function autoSalvage(items) {
  const out = { n: 0, shards: 0 };
  for (const it of items) {
    if (!S.stash.includes(it) || !salvWhy(it)) continue;
    const g = salvage(it); out.n++; out.shards += Object.values(g).reduce((a, b) => a + b, 0);
  }
  return out;
}
// 批量拆解（手动多选）：按品质勾选 + 单件点选；只动背包里的装备，印记不动，身上穿着的不在背包里
const BULK_CATS = ['普通', '罕见', '稀有', '独特'];
const bulkSel = () => { if (!Array.isArray(S.bulkSal) || S.bulkSal.length !== 4) S.bulkSal = [true, false, false, false]; return S.bulkSal; };
const bulkCat = it => (it.u || it.leg || it.ex || it.rar >= 3) ? 3 : (it.rar | 0);
const bulkOk = it => !!it && it.kind !== 'chip' && it.kind !== 'gem' && S.stash.includes(it);
const bulkYield = it => (it.affs || []).reduce((a, x) => a + CRAFT.shatter.perAffix + (x.t + 1 >= CRAFT.shatter.bonusTier ? CRAFT.shatter.bonus : 0), 0);
// pick：Map(id → true/false) 单件点选，覆盖品质勾选
const bulkHit = (it, pick) => pick && pick.has(it.id) ? pick.get(it.id) : !!bulkSel()[bulkCat(it)];
function bulkList(pick) { return S.stash.filter(it => bulkOk(it) && bulkHit(it, pick)); }
function bulkSalvage(list) { const out = { n: 0, shards: 0 }; for (const it of list) { if (!bulkOk(it)) continue; out.shards += Object.values(salvage(it)).reduce((a, b) => a + b, 0); out.n++; } save(); return out; }
// 营地里角色的走位：在篝火边慢慢踱步；快出发时走向地窖入口（天梯走向石碑）
const CAMP_HOME = { x: 240, y: 158 };
function campTarget() {
  const C = AUTO.camp || (AUTO.camp = { x: CAMP_HOME.x, y: CAMP_HOME.y, t: 0 });
  if ((S.auto.loop || LAD.pending) && AUTO.nextT > 0 && AUTO.nextT < 1.4) { const f = FAC_BY[LAD.pending ? 'stele' : 'gate']; return { x: f.x, y: f.y + 6 }; }
  if (G.ui && G.ui.campGo) return G.ui.campGo;
  if ((C.t -= 1 / 60) <= 0) { C.t = rf(2, 5); C.x = CAMP_HOME.x + rf(-36, 36); C.y = CAMP_HOME.y + rf(-8, 14); }
  return C;
}
