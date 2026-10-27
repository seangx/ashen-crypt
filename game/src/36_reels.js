/* =========================================================
   骸骨轮盘（design/unique-reels.md）：主线最高层每推进 5 层，一次独特三选一。核心逻辑，桌面和手机共用。
   S.reelsDone：已给到的最高里程碑层；S.reelsPending：[{ floor, ilvl, opts?, jack? }]，开的时候才掷选项。
   ========================================================= */
const REEL = (DATA.loot && DATA.loot.reels) || { every: 5, choices: 3, ownedMul: 0.5, skipShards: 15, jackpot: 0.02 };
function reelMilestone(floor) { // Boss 倒下、最高层推进时调用
  if (!(floor > 0) || floor % REEL.every) return; S.reelsDone ??= 0; S.reelsPending ??= [];
  if (floor <= S.reelsDone) return; S.reelsDone = floor; S.reelsPending.push({ floor, ilvl: floor }); unlockEvent && unlockEvent('reels');
  if (G.ui) G.ui.feed(`骸骨轮盘 · 第 ${floor} 层`, COL.emberHi);
}
const reelSlotOf = it => it.kind === 'trig' ? 'trig' : it.kind;
function reelOwned(id) { return [...Object.values(S.equip), ...S.stash].some(it => it && it.u === id) || [...(S.trigs || []), ...(S.trigBag || [])].some(T => T && T.u === id); }
function reelRoll(p) {
  const pool = UNIQUES.filter(u => u.req <= Math.max(p.ilvl, 1) + 10 && !u.ladderOnly).map(u => ({ id: u.id, kind: u.kind, w: reelOwned(u.id) ? REEL.ownedMul : 1 }))
    .concat(Object.keys(TRIG_U).map(k => ({ tu: k, kind: 'trig', w: reelOwned(k) ? REEL.ownedMul : 1 })));
  const jack = rnd() < REEL.jackpot, out = [], used = new Set();
  const kinds = [...new Set(pool.map(x => x.kind))], jk = pick(kinds);
  for (let i = 0; i < REEL.choices; i++) {
    const cand = pool.filter(x => (jack ? x.kind === jk : !used.has(x.kind)) && !out.some(o => o === x)); if (!cand.length) break;
    const x = wpick(cand, c => c.w); used.add(x.kind); out.push(x);
  }
  // 同标签保底（unique-reels）：至少 1 个选项和身上技能同标签，第一次轮盘至少 2 个
  const myT = reelSkillTags(), hit = x => reelTags(x).some(t => myT.has(t)), need = Math.min(out.length, p.floor <= REEL.every ? 2 : 1);
  if (myT.size && !jack) for (let k = out.length - 1; k >= 0 && out.filter(hit).length < need; k--) { if (hit(out[k])) continue;
    const cand = pool.filter(x => hit(x) && !out.includes(x)); if (!cand.length) break; out[k] = wpick(cand, c => c.w); }
  p.opts = out.map(x => x.tu ? newUniqueTrig(x.tu, p.ilvl) : newUnique(x.id, p.ilvl)); p.jack = jack && out.length === REEL.choices;
  return p;
}
const REEL_SKIPT = new Set(['Hit', 'Attack', 'AttackSpeed', 'Range']);
function reelSkillTags() { const s = new Set(), add = g => { if (g && g.kind === 'gem') for (const t of gemTags(g)) if (!REEL_SKIPT.has(t)) s.add(t); };
  add(S.equip && S.equip.gem); for (const T of S.trigs || []) if (T) for (const g of T.socks || []) if (g && isSkill(g)) add(g); return s; }
function reelTags(x) { if (x.tu) return []; const u = UNIQUE_BY[x.id]; if (!u) return []; if (u.when) return [u.when];
  return u.kind === 'weapon' && WEAPONS[u.b] ? WEAPONS[u.b].tags.filter(t => !REEL_SKIPT.has(t)) : []; }
function reelCurrent() { const p = (S.reelsPending || [])[0]; if (p && !p.opts) { reelRoll(p); save(); } return p || null; }
function reelGive(it) { if (it.kind === 'trig') S.trigBag.unshift(it); else S.stash.unshift(it); it.isNew = true; }
function reelPick(k) { const p = reelCurrent(); if (!p) return; if (p.jack) p.opts.forEach(reelGive); else reelGive(p.opts[k]); S.reelsPending.shift(); refreshStats(); save(); }
function reelSkip() { const p = reelCurrent(); if (!p) return 0; S.reelsPending.shift(); for (let i = 0; i < REEL.skipShards; i++) { const k = rollShard(Math.max(1, p.ilvl)); S.shards[k] = (S.shards[k] || 0) + 1; } save(); return REEL.skipShards; }
function reelReroll() { const p = reelCurrent(); if (!p || !(S.glyphs && S.glyphs.hope > 0)) return false; S.glyphs.hope--; p.opts = null; reelCurrent(); return true; }
