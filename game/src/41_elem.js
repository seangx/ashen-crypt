/* =========================================================
   元素系统（system-v2 §6）：附加伤害最多的元素 = “附加元素”，带出该元素的附加特效；
   技能本源元素 = 附加元素时“共鸣”。基石：纯色 / 杂糅 / 异变 / 余波。
   ========================================================= */
const EL_FX_N = { kin: '碎裂', exp: '引燃', ele: '雷爆', cold: '霜结', pla: '审判', nuc: '疫染' };
let ELQ = [];
function elemStats(P) {
  const W0 = P.weapons && P.weapons[0]; P.addEl = null; P.addEl2 = null; P.resoN = 0; P.reso = 1;
  if (!W0 || !W0.flat) return;
  const avg = e => { const f = W0.flat[e]; return f ? (f[0] + f[1]) / 2 : 0; };
  const L = ELEM.map(e => [e, avg(e) + (e === W0.el ? 1e-6 : 0)]).filter(x => x[1] > 0.01).sort((a, b) => b[1] - a[1]);
  if (!L.length) return;
  P.addEl = L[0][0]; P.addEl2 = L[1] ? L[1][0] : null;
}
// 共鸣：技能本源元素 = 附加元素，每个 +12%（纯色 20%，上限 3 / 4；纯色之心无上限）
function elemReso(P, Ws) {
  if (!P.addEl || P.flag.mixed) return 1;
  const n = Ws.filter(W => W && W.el === P.addEl).length, F = P.flag;
  const per = (F.pureHeart ? Math.max(F.pureHeart, F.pureColor ? 20 : 12) : F.pureColor ? 20 : 12) + (F.resoInc || 0) + (P.resoInc || 0), cap = F.pureHeart ? 99 : F.pureColor ? 4 : 3;
  P.resoN = Math.min(cap, n); P.reso = 1 + P.resoN * per / 100; return P.reso;
}
function elemA(W, e) { const f = W.flat && W.flat[e]; if (!f) return 0; const F = STATS.flag;
  return (f[0] + f[1]) / 2 * (W.incMul && W.incMul[e] || 1) * (1 + ((STATS.addFx || 0) + (F.addFx || 0)) / 100); }
function elemFx(m, W, e, A) {
  const F = STATS.flag; if (A <= 0 || m.dead && e !== 'kin') return;
  const hurt = (n, d, el) => damage(n, mitigate(n, el, d), el, false, true);
  switch (e) {
    case 'kin': { const r = 40, sp = () => { for (const n of mobs) if (n !== m && !n.dead && dist2(n, m) < r * r) hurt(n, A * 0.6, 'kin'); };
      sp(); if (F.boneBreak && rnd() < F.boneBreak / 100) { A *= 0.5; sp(); } if (mobs.length <= 15 || rnd() < 0.15) fx({ t: 'ring', x: m.x, y: m.y - 4, r, el: 'kin' }); break; }
    case 'exp': m.burn += A * 0.5; break;
    case 'ele': if ((m.elCd || 0) > G.time) break; m.elCd = G.time + 0.5; ELQ.push({ t: 0.5, x: m.x, y: m.y, d: A * 0.8, chain: !!F.chainBlast }); break;
    case 'cold': { const fz = m.frzT > 0; chillOn(m, 1, W); if (fz) hurt(m, A * 1.5, 'cold'); break; }
    case 'pla': { const was = m.blindT > 0; m.blindT = Math.max(m.blindT, 2); m.blindK = Math.max(m.blindK || 0, MECH.blindLess); if (was && STATS.shield > 0) player.shield = Math.min(STATS.shield, player.shield + A * 0.1); break; }
    case 'nuc': m.rad.push({ dps: A * 0.15 * (F.plagueTide ? 1.5 : 1), t: 4 }); break;
  }
}
// 命中时：附加元素特效
function elemOnHit(m, W, o) {
  const P = STATS, F = P.flag; if (!P.addEl || !W.flat || o.arc || o.re || o.ground || o.efx) return;
  const tick = W.cont ? 1 / (W.aps || 1) : 1; let e = P.addEl;
  if (F.prismFx) { const sum = ELEM.reduce((s, x) => s + elemA(W, x), 0); e = ELEM[(P.prismI = ((P.prismI || 0) + 1) % 6)]; return elemFx(m, W, e, sum * 0.4 * tick); }
  let A = elemA(W, e) * tick; if (A <= 0) return;
  if (F.mutate) e = W.el; // 异变：特效换成本源元素
  elemFx(m, W, e, A);
  if ((F.mixed || F.twinFx) && P.addEl2) elemFx(m, W, P.addEl2, elemA(W, P.addEl2) * tick * (F.twinFx ? 1 : 0.6));
  if (F.emberGrip && e !== 'exp') elemFx(m, W, 'exp', A);
  if (F.echoFx && rnd() < 0.25) elemFx(m, W, e, A);
}
function elemStep(dt) {
  if (!ELQ.length) return;
  for (const q of ELQ) { q.t -= dt; if (q.t > 0) continue; q.done = 1; fx({ t: 'ring', x: q.x, y: q.y - 4, r: 50, el: 'ele' });
    const hit = mobs.filter(n => !n.dead && (n.x - q.x) ** 2 + (n.y - q.y) ** 2 < 2500);
    for (const n of hit) damage(n, mitigate(n, 'ele', q.d), 'ele', false, true);
    if (q.chain) mobs.filter(n => !n.dead && !hit.includes(n)).sort((a, b) => ((a.x - q.x) ** 2 + (a.y - q.y) ** 2) - ((b.x - q.x) ** 2 + (b.y - q.y) ** 2)).slice(0, 2).forEach(n => { fx({ t: 'bolt', x1: q.x, y1: q.y - 5, x2: n.x, y2: n.y - 5, el: 'ele' }); damage(n, mitigate(n, 'ele', q.d * 0.6), 'ele', false, true); }); }
  ELQ = ELQ.filter(q => !q.done);
}
// 死亡：瘟疫传染（基础：一半层数传给最近 2 个）、野火圈、霜棺
function elemDeath(m, near) {
  const F = STATS.flag;
  if (m.rad.length && !F.contagion) { const full = F.plagueTide && STATS.addEl === 'nuc', r = 60 * (full ? 1.5 : 1);
    for (const x of near(r, 2)) x.rad.push(...m.rad.slice(0, full ? 99 : Math.ceil(m.rad.length / 2)).map(q => ({ ...q }))); }
  if (F.wildfire && m.burn > 0) { const d = m.burn * 0.5; fx({ t: 'ring', x: m.x, y: m.y - 4, r: 40, el: 'exp' }); for (const x of near(40, 99)) x.burn += d; }
  if (F.frostCoffin && m.frzT > 0) for (const x of near(70, 4)) { fx({ t: 'bolt', x1: m.x, y1: m.y - 5, x2: x.x, y2: x.y - 5, el: 'cold' }); damage(x, mitigate(x, 'cold', m.max * 0.1), 'cold', false, true); chillOn(x, 2); }
}
// 独特装备 / 灯火：伤害倍率（hitMob 里乘上）
function elemMul(m) {
  const F = STATS.flag; let k = 1;
  if (F.judgeBlind && m.blindT > 0) k *= 1 + F.judgeBlind / 100;
  if (F.darkWalker && typeof lampLightR === 'function') { const r = lampLightR(); if (r && dist2(m, player) > r * r) k *= 1 + F.darkWalker / 100; }
  return k;
}
// 面板「最缺」：每种加成加一档时秒伤提高多少，取最大
function elemNeed(P) {
  const W = P.weapons && P.weapons[0]; if (!W) return '—';
  const inc = (P.raw['inc:all'] || 0), c = Math.min(1, W.crit || 0), cm = W.critMult || 1.5;
  const fl = W.flat ? ELEM.reduce((s, e) => s + (W.flat[e] ? (W.flat[e][0] + W.flat[e][1]) / 2 * (W.incMul && W.incMul[e] || 1) : 0), 0) : 0, sh = W.avg > 0 ? Math.min(1, fl / W.avg) : 0;
  const G = [['提高', 20 / (100 + inc)], ['暴击', c >= 1 ? 0 : 0.05 * (cm - 1) / (1 + c * (cm - 1))], ['速度', 10 / (100 + (P.aspdInc || 0))], ['附加', 0.2 * Math.max(sh, 0.15)]];
  G.sort((a, b) => b[1] - a[1]); return `${G[0][0]} +${Math.round(G[0][1] * 100)}%`;
}
const elemFxName = P => P.addEl ? `${ELEM_N[P.addEl]}·${EL_FX_N[STATS.flag.mutate ? (P.weapons[0] || {}).el || P.addEl : P.addEl]}${P.resoN ? ` 共鸣${P.resoN}` : ''}` : '无附加';
