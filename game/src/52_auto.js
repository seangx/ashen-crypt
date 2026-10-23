/* ---------------- 自动战斗 · 接管 · 自动循环 · 自动推层 ----------------
   参数在 data/auto.json。游戏和 tools/sim.js 用的是同一套：logic() 每帧调用 autoStep()。 */
const AU = DATA.auto;
const AUTO = { clock: 0, manualT: -1e9, moved: 0, nextT: 0, last: null, lastT: -1e9, retreat: false, pass: null };
// 自动开着、而且玩家最近没有动鼠标：由 AI 走位
const autoDriving = () => S.auto.ai && AUTO.clock - AUTO.manualT >= AU.takeover.idleResume;
const manualLeft = () => Math.max(0, AU.takeover.idleResume - (AUTO.clock - AUTO.manualT));
// 玩家在场地上动了鼠标或触摸：切到手动
function autoTouch(dist) {
  AUTO.moved += dist;
  if (dist < 0 || AUTO.moved >= AU.takeover.moveThreshold) { AUTO.manualT = AUTO.clock; AUTO.moved = 0; }
}

// 虚拟场地：营地里就是房间；推关里是以 AUTO.anchor 为中心、和旧场地一样大的框，anchor 每秒最多漂 AU.steer.anchorDrift 像素去追角色
function autoBox() {
  if (!RUN) return { ...FIX, cx: 240, cy: 144 };
  const A = AUTO.anchor || (AUTO.anchor = { x: player.x, y: player.y - 6 });
  return { x0: A.x - 230, x1: A.x + 230, y0: A.y - 82, y1: A.y + 82, cx: A.x, cy: A.y };
}
function autoAnchorStep(dt) {
  if (!RUN) { AUTO.anchor = null; return; }
  const A = autoBox(), d = AU.steer.anchorDrift ?? 12, dx = player.x - A.cx, dy = player.y - 6 - A.cy, l = Math.hypot(dx, dy);
  if (l > 1e-6) { const k = Math.min(l, d * dt) / l; AUTO.anchor.x += dx * k; AUTO.anchor.y += dy * k; }
}
// 走位：怪、敌方弹、毒池、墙都往外推，再加一点绕圈；附近没有怪就去捡东西
function autoTarget() {
  const P = player, K = AU.steer;
  let fx = 0, fy = 0, near = 1e9;
  for (const m of mobs) {
    if (m.dead) continue;
    const dx = P.x - m.x, dy = P.y - m.y, d = Math.hypot(dx, dy) || 1; near = Math.min(near, d - m.size);
    const w = K.mobRepel * (m.boss ? K.bossMul : 1) / (d * d); fx += dx / d * w; fy += dy / d * w;
  }
  for (const p of projs) {
    if (!p.enemy) continue;
    const dx = P.x - p.x, dy = P.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < K.projRange) { const w = K.projRepel / (d * d); fx += dx / d * w; fy += dy / d * w; }
  }
  for (const z of zones) {
    if (!z.enemy) continue;
    const dx = P.x - z.x, dy = P.y - z.y, d = Math.hypot(dx, dy) || 1, edge = Math.max(1, d - z.r);
    if (d < z.r + K.zoneMargin + 20) { const w = K.zoneRepel / (edge * edge); fx += dx / d * w; fy += dy / d * w; }
  }
  // 场地无限大：AI 心里还是按一块和原来一样大的“虚拟场地”走位（中心是 AUTO.anchor，慢慢跟着角色漂移），免得一直往一个方向跑、把怪甩在身后
  const B = autoBox();
  const wall = (a, b) => K.wallRepel * (1 / Math.max(4, a) ** 2 - 1 / Math.max(4, b) ** 2); fx += wall(P.x - B.x0, B.x1 - P.x); fy += wall(P.y - B.y0, B.y1 - P.y);
  // 绕圈：推力转 90° 的分量，免得被逼进角落
  const tx = -fy * K.orbit, ty = fx * K.orbit; fx += tx; fy += ty;
  // 附近没怪：去捡最近的掉落，否则慢慢回中间
  if (near > K.lootRange) {
    let best = null, bd = 1e9; for (const dp of drops) { const d = dist2(dp, P); if (d < bd) { bd = d; best = dp; } }
    if (best) return { x: best.x, y: best.y, near };
  }
  fx += (B.cx - P.x) * K.centerPull; fy += (B.cy - P.y) * K.centerPull;
  const l = Math.hypot(fx, fy);
  if (l < 1e-9) return { x: P.x, y: P.y, near };
  return { x: clamp(P.x + fx / l * K.lookAhead, B.x0, B.x1), y: clamp(P.y + fy / l * K.lookAhead, B.y0, B.y1), near };
}
// 近战模式：找怪最密的地方，从怪堆里来回穿过（穿到另一边 pass 像素再折返），这样风暴之眼能沿路留龙卷风；护甲低时后撤（风筝模式），回复后再冲
const MELEE_FORMS = ['orbit', 'ram', 'reflect'];
// 环绕武器要有旋身符文或旋风之心才按近战走，否则照常风筝；撞城、荆棘类一直近战
const meleeW = () => STATS.weapons.find(w => w && ((MELEE_FORMS.includes(w.form) && (w.form !== 'orbit' || w.whirl || STATS.flag.whirlHeart)) || (w.form === 'nova' && w.frostNova && AU.nova.melee))); // 霜环：近战打法（auto.json nova）
function meleeTarget(W) {
  const K = AU.melee, f = player.life / STATS.life;
  if (f < K.retreat) AUTO.retreat = true; else if (f >= K.back) AUTO.retreat = false;
  const dim = RUN && RUN.mode !== 'ladder' && player.soul < STATS.soulMax * K.lightRetreat && RUN.boss && !RUN.boss.dead; // 灯火快灭还在打 Boss：别贴脸
  if (AUTO.retreat || dim) { AUTO.pass = null; return null; }
  const live = mobs.filter(m => !m.dead && m.rise <= 0.2);
  if (!live.length) { AUTO.pass = null; return null; }
  let best = null, bn = -1, bd = 1e9;
  for (const m of live) { let n = 0; for (const o of live) if (dist2(m, o) < K.denseR * K.denseR) n++; const d = dist2(m, player); if (n > bn || (n === bn && d < bd)) { best = m; bn = n; bd = d; } }
  // 怪堆中心
  let cx = 0, cy = 0, cn = 0; for (const o of live) if (dist2(best, o) < K.denseR * K.denseR) { cx += o.x; cy += o.y; cn++; } cx /= cn; cy /= cn;
  const near = Math.min(...live.map(m => Math.sqrt(dist2(m, player)) - m.size));
  const P = AUTO.pass, stale = !P || AUTO.clock - P.t > K.passTime || Math.hypot(P.x - player.x, P.y - player.y) < K.passReach || Math.hypot(P.cx - cx, P.cy - cy) > K.denseR;
  if (stale) { // 新的穿越点：从自己穿过怪堆中心，到另一边 pass 像素
    let dx = cx - player.x, dy = cy - player.y, l = Math.hypot(dx, dy);
    if (l < 1) { const a = rnd() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); l = 1; }
    AUTO.pass = { x: clamp(cx + dx / l * K.pass, autoBox().x0, autoBox().x1), y: clamp(cy + dy / l * K.pass, autoBox().y0, autoBox().y1), cx, cy, t: AUTO.clock };
  }
  return { x: AUTO.pass.x, y: AUTO.pass.y, near, melee: 1 };
}
// 每帧：返回 AI 的目标点（不由 AI 驾驶时返回 null），需要时冲刺
function autoStep(dt) {
  AUTO.clock += dt; autoAnchorStep(dt);
  if (!RUN) { autoLoop(dt); return G.fx ? campTarget() : null; }
  if (!autoDriving() || RUN.ending) return null;
  const MW = meleeW();
  if (AU.slamDodge) { // 红圈：在圈里就冲刺出去，没冲刺槽就走出去（近战、远程都躲）
    let s = null; for (const m of mobs) if (m.slam && dist2(player, m.slam) < (m.slam.r + 2) ** 2 && (!s || m.slam.t < s.t)) s = m.slam;
    if (s) { const dx = player.x - s.x, dy = player.y - s.y, dl = Math.hypot(dx, dy) || 1, ux = dl > 0.5 ? dx / dl : 1, uy = dl > 0.5 ? dy / dl : 0, out = { x: s.x + ux * (s.r + 14), y: s.y + uy * (s.r + 14), near: 0 };
      if (player.dash >= 1 && player.dashT <= 0) { tryDash(out, true); if (player.dashT > 0) RUN.slamDash = (RUN.slamDash || 0) + 1; }
      return out; }
  }
  const mt = MW ? meleeTarget(MW) : null;
  if (mt) return mt; // 近战贴身时不靠冲刺躲
  const t = autoTarget();
  const K = AU.steer;
  // 近战流派不因为怪靠近就冲刺躲开，只在护甲低、后撤时冲
  if ((!MW && t.near < K.dashNear) || (player.life < STATS.life * K.dashLowArmor && t.near < K.dashLowNear)) tryDash(t, true);
  return t;
}
// 自动循环：在营地停留 camp.idleStay 秒后出发
function autoLoop(dt) {
  if (!(S.auto.loop || LAD.pending) || !AUTO.nextT) return;
  AUTO.nextT -= dt;
  if (AUTO.nextT <= 0) { AUTO.nextT = 0; startRun(); }
}
// 一局结束：自动循环开着时推层，并排下一局
function autoAfterRun(r) {
  // 推关：超过出发前的最深层算成功；没超过但平安返回（灯灭、撤回）不算失败，原地再来；阵亡算失败
  const A = S.auto, P = AU.push, won = r.mode === 'ladder' ? r.result === 'win' : S.maxDepth > r.descent.prevMax, safe = r.mode !== 'ladder' && r.result !== 'dead' && r.result !== 'timeout';
  if (r.mode === 'ladder') ladderAfterRun(r);
  else if (S.auto.loop && !A.lock && !won && safe) { /* 平安返回：不变 */ }
  else if (S.auto.loop && !A.lock) {
    if (won) {
      A.fails = 0;
      if (A.back) { if (++A.backWins >= P.winsToRetry) { A.back = false; A.backWins = 0; S.depth = S.maxDepth; } }
      else S.depth = S.maxDepth;
    } else {
      A.backWins = 0;
      if (++A.fails >= P.lossesToRetreat) { A.fails = 0; A.back = true; S.depth = Math.max(1, Math.min(S.depth, S.maxDepth) - 1); }
    }
  }
  AUTO.last = r; AUTO.lastT = AUTO.clock;
  AUTO.nextT = S.auto.loop || LAD.pending ? CAMP.idleStay : 0; // 在营地停留一会儿再出发
}
// 手动期间的经验和掉落倍数
const manualMul = () => autoDriving() ? 1 : AU.takeover.manualLootXpMul;
