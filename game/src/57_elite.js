/* =========================================================
   精英词缀（design/defense-v3 §8.3）：精英生成时按层数抽 1–3 个。数据在 progression.json 的 elite.affixes。
   元素魂：攻击变成该元素、伤害提高，死亡时留一块该元素的地面；噬光：命中吸灯火；破盾：打护盾 ×2；
   枯血：附近时你的生命回复无效；冲锋、弹幕、召魂：定时招式；坚壁：身边有普通怪时受伤减半；镜反：反弹伤害。
   ========================================================= */
const ARENA = F; // 场地边界（下面的 F 是词条参数）
const EAF = ELITE.affixes || [], EAF_BY = Object.fromEntries(EAF.map(a => [a.id, a]));
const ELEM_AF = new Set(['exp', 'cold', 'ele', 'pla', 'nuc', 'kin']);
const eliteFloor = () => RUN ? (RUN.mode === 'ladder' ? RUN.L : RUN.base || RUN.L) : 1;
// 天梯：每层固定抽 count 个（同一层每次一样），整层精英都带
function ladderEliteAx(N) { let h = (N * 2654435761) >>> 0; const r = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296), n = (ELITE.count || [[1, 1]]).reduce((k, [f, c]) => N >= f ? c : k, 1), out = [];
  for (let i = 0; i < n; i++) { const pool = EAF.filter(a => N >= a.from && !out.includes(a.id) && !(ELEM_AF.has(a.id) && out.some(x => ELEM_AF.has(x)))); if (!pool.length) break; let t = r() * pool.reduce((s, a) => s + a.w, 0); out.push((pool.find(a => (t -= a.w) < 0) || pool[0]).id); } return out; }
function rollEliteAffixes(m) {
  const F = eliteFloor(), n = (ELITE.count || [[1, 1]]).reduce((k, [f, c]) => F >= f ? c : k, 1), out = RUN && RUN.eliteAx ? [...RUN.eliteAx] : [];
  for (let i = out.length; i < n; i++) {
    const pool = EAF.filter(a => F >= a.from && !out.includes(a.id) && !(ELEM_AF.has(a.id) && out.some(x => ELEM_AF.has(x)))); if (!pool.length) break;
    out.push(wpick(pool, a => a.w).id);
  }
  m.ax = out; m.axT = {};
  for (const id of out) { const fx = EAF_BY[id].fx; if (fx.el) { m.el = fx.el; m.dmg *= 1 + fx.dmg / 100; } if (fx.every) m.axT[id] = fx.every * rf(0.4, 1); }
}
const eaf = (m, id) => m && m.ax && m.ax.includes(id) ? EAF_BY[id].fx : null;
const eliteName = m => m.ax ? m.ax.map(id => EAF_BY[id].n).join('·') : '';
// 每帧：招式计时、枯血、坚壁
function eliteStep(m, dt, d, dx, dy, bl) {
  let f;
  if ((f = eaf(m, 'blight')) && d < f.r) player.blightT = RUN.t + 0.2;
  if ((f = eaf(m, 'wall'))) { const r2 = f.r * f.r; m.wallOn = mobs.some(n => n !== m && !n.dead && !n.elite && !n.boss && dist2(n, m) < r2); }
  if (m.chg) { // 冲锋中：直线冲，撞到就 2 倍伤害 + 击退
    const c = m.chg; c.t -= dt;
    if (c.wind > 0) { c.wind -= dt; if (c.wind <= 0) fx({ t: 'ring', x: m.x, y: m.y - 4, r: 10, el: m.el || 'kin' }); return; }
    m.x += c.vx * dt; m.y += c.vy * dt;
    if (!c.hit && dist2(m, player) < (m.size + 8) ** 2) { c.hit = 1; const F = EAF_BY.charge.fx; if (hurtPlayer(m.dmg * F.mul * bl, m.el, ctrlK(m), { melee: 1, elite: 1, aff: 1, ax: m.ax })) { const ux = player.x - m.x, uy = player.y - m.y, l = Math.hypot(ux, uy) || 1; player.x = clamp(player.x + ux / l * F.knock, ARENA.x0, ARENA.x1); player.y = clamp(player.y + uy / l * F.knock * 0.6, ARENA.y0, ARENA.y1); } /* 击退（不出场地） */ }
    if (c.t <= 0) m.chg = null; return;
  }
  for (const id of m.ax) {
    const F = EAF_BY[id].fx; if (!F.every) continue;
    if ((m.axT[id] -= dt) > 0) continue; m.axT[id] = F.every;
    if (id === 'charge' && d < F.range) { const s = m.spd * F.spd; m.chg = { wind: F.windup, t: F.windup + F.dur, vx: dx / d * s, vy: dy / d * s }; fx({ t: 'text', x: m.x, y: m.y - 16, s: '冲锋', c: EAF_BY.charge.c }); }
    else if (id === 'barrage') { const a0 = Math.atan2(dy, dx), MA = PROG.monsterAttack, fan = F.fan * Math.PI / 180; for (let k = 0; k < F.n; k++) { const a = a0 + (k - (F.n - 1) / 2) * fan / Math.max(1, F.n - 1); projs.push({ enemy: true, x: m.x, y: m.y - 6, vx: Math.cos(a) * MA.shotSpd, vy: Math.sin(a) * MA.shotSpd, life: MA.shotLife, dmg: m.dmg * F.dmg * bl, ck: ctrlK(m), elite: 1, aff: 1, el: m.el, ax: m.ax }); } }
    else if (id === 'summon') { const kids = mobs.filter(n => !n.dead && n.sumBy === m).length; for (let k = 0; k < Math.min(F.n, F.max - kids); k++) { const a = rf(0, Math.PI * 2), c = spawnMob(pickMob(RUN.L), { x: m.x + Math.cos(a) * 16, y: m.y + Math.sin(a) * 10, noElite: 1 }); c.sumBy = m; } if (F.n) fx({ t: 'ring', x: m.x, y: m.y - 4, r: 18, el: 'nuc' }); }
  }
}
// 精英打到你：噬光吸灯火；破盾在 hurtPlayer 里处理护盾
function eliteOnHurt(src) { const f = src && src.ax && src.ax.includes('drain') && EAF_BY.drain.fx; if (f && RUN) player.soul = Math.max(0, player.soul - f.lamp); }
const eliteShieldMul = src => src && src.ax && src.ax.includes('breaker') ? EAF_BY.breaker.fx.shieldMul : 1;
// 精英挨打：坚壁减伤、镜反
function eliteTaken(m, amt, small) {
  if (!m.ax) return amt; let f;
  if (m.wallOn && (f = eaf(m, 'wall'))) amt *= 1 - f.less / 100;
  if (!small && (f = eaf(m, 'mirror')) && STATS.life && RUN && !(RUN.mirT > RUN.t)) { RUN.mirT = RUN.t + (f.gap || 0); } else f = null; // 镜反有全局冷却：出手越快、一次砸中的镜反精英越多，都不该反得越多（原来连射 / 范围流派被反死）
  if (f) hurtPlayer(Math.min(amt * f.pct / 100, STATS.life * f.cap / 100), 'kin', 1, { elite: 1, mirror: 1 });
  return amt;
}
// 精英死了：元素魂留地面
function eliteDie(m) { for (const id of m.ax || []) { const g = EAF_BY[id].fx.ground; if (g) zones.push({ enemy: true, x: m.x, y: m.y, r: g.r, t: g.dur, tickT: g.tick, tick: g.tick, dmg: m.dmg * g.pct, ck: 1, el: EAF_BY[id].fx.el }); } }
const healBlocked = () => RUN && player.blightT > RUN.t; // 枯血

/* 受伤来源统计（defense-v3 §8.4）：每次受伤按 来源 × 元素 记下护盾前的伤害，结算时给占比最大的一项和一句建议 */
const HURT_CAT = src => !src ? '地面效果' : src.mirror ? '镜反' : src.slam ? '重击红圈' : src.boss ? 'Boss 招式' : src.aff ? '精英招式' : src.ranged ? '远程' : '近战';
function hurtLog(d, el, src) { if (!RUN || d <= 0) return; const H = RUN.hurt || (RUN.hurt = {}), k = HURT_CAT(src) + '|' + (el || 'kin'); H[k] = (H[k] || 0) + d; }
function hurtList(r) { const H = (r && r.hurt) || {}, tot = Object.values(H).reduce((s, v) => s + v, 0); return tot > 0 ? Object.entries(H).sort((a, b) => b[1] - a[1]).map(([k, v]) => { const [c, e] = k.split('|'); return `${ELEM_N[e] || e}·${c}  ${Math.round(v / tot * 100)}%`; }) : []; }
function hurtTop(r) {
  const H = r && r.hurt; if (!H) return null; const tot = Object.values(H).reduce((s, v) => s + v, 0); if (tot <= 0) return null;
  const [k, v] = Object.entries(H).sort((a, b) => b[1] - a[1])[0], [cat, el] = k.split('|'), L = r.L || monLv(), P = STATS;
  const tip = cat === '近战' || cat === '精英招式' ? `近战伤害降低 ${Math.round(P.meleeDR || 0)}%` : cat === '远程' ? `远程伤害降低 ${Math.round(P.rangedDR || 0)}%` : cat === '重击红圈' ? `冲刺槽 ${P.dashMax || 1}：躲红圈靠冲刺，多带冲刺槽或冲刺回复` : cat === '地面效果' ? '地面效果：精英死后的元素地面别久站' : cat === '镜反' ? '镜反精英：别硬打，先清别的' : '';
  return `${Math.round(v / tot * 100)}% 伤害来自${ELEM_N[el]}·${cat}：${ELEM_N[el]}抗性 ${(P.res || {})[el] || 0}（减伤 ${Math.round(resDrL((P.res || {})[el] || 0, L) * 100)}%）${tip ? '，' + tip : ''}`;
}
