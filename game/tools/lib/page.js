/* 打开构建好的手机包，注入调试助手 window.P（probe.js、smoke.js 共用）。
   playwright 路径：先找本机的，再找 slash-roguelite 的 node_modules，再找容器里的。
   本机最多同时开 2 个 Chromium，调用方自己保证（memory: sim-load）。 */
const path = require('path');
function loadPw() {
  for (const p of ['playwright', '/Users/marvingod/ai-workspace/slash-roguelite/node_modules/playwright', '/opt/node22/lib/node_modules/playwright']) { try { return require(p); } catch (e) { /* 下一个 */ } }
  throw new Error('找不到 playwright：npm i -g playwright 或设置 NODE_PATH');
}

// 页面里的助手。逻辑推进时同时推进 G.time：魂龛的 gemGap、每秒上限都看 G.time，不推进的话技能只放得出第一次
const HELPERS = () => {
  const A = window.__ash;
  const P = window.P = {
    A,
    // 配一套最小的测试装备：主手 + 一个魂龛（c 触发条件）+ 若干技能石 / 辅助石
    setup(o = {}) {
      const S = A.S; A.setUnlockAll(true); S.level = o.level ?? 40; S.maxDepth = S.depth = o.depth ?? 20; S.auto.lock = true;
      P.stop(); if (A.G.ui.winId) A.G.ui.closeWin(true);
      if (o.weapon !== false) S.equip.wl = A.newItem('weapon', o.weapon || 'Cannon', o.ilvl ?? 40, 0, 0);
      if (o.shield) S.equip.shield = A.newItem('shield', o.shield === true ? 'SigilShield' : o.shield, o.ilvl ?? 40, 0, 0);
      if (o.gems) { const T = newTrig(o.trig || 'cast', { rar: 2, sock: 4, ilvl: o.ilvl ?? 40 }); o.gems.forEach((g, k) => { T.socks[k] = typeof g === 'string' ? A.newGem(g, { lvl: 10 }) : A.newGem(g.id, { lvl: g.lvl ?? 10, var: g.var }); }); S.trigs = [T, null, null, null]; }
      A.refreshStats(); return P.W();
    },
    W: (i = 0, j = 0) => { const t = A.STATS.trigs && A.STATS.trigs[i]; return t && t.ws && t.ws[j] || null; },
    stop() { if (!A.RUN) return; A.RUN.result = 'abandon'; A.RUN.ending = 0.01; for (let k = 0; k < 100 && A.RUN; k++) A.logic(0.05); }, // 结束这一趟，直到 RUN 清空（不然下一次 startRun 会失败）
    // 开一趟（手机版 startRun 是异步的）：等 RUN 出现、有怪
    async start(timeout = 8000) { const t0 = Date.now(); let k = 0; while (Date.now() - t0 < timeout) { if (A.RUN && !A.RUN.prep && A.mobs.length) return true; if (!A.RUN && k++ % 10 === 0) { if (A.G.ui.winId) A.G.ui.closeWin(true); A.startRun(); } await new Promise(r => setTimeout(r, 50)); } return !!A.RUN; }, // 过场动画没放完时 startRun 会被忽略：没开起来就每 0.5 秒重试
    // 推进 sec 秒逻辑（暂停画面场景）；each(t) 每帧回调，返回 false 提前结束
    step(sec, each) { const ui = A.G.ui, dt = 1 / 30; ui.scene.pause('world'); let t = 0;
      try { while (t < sec && A.RUN) { A.logic(dt); A.G.time = (A.G.time || 0) + dt; t += dt; if (each && each(t) === false) break; } } finally { ui.scene.resume('world'); } return t; },
    // 怪变成木桩（只改一次）：方便量伤害、施放次数
    tank(hp = 1e7) { for (const m of A.mobs) if (!m._tank) { m._tank = 1; m.max = m.hp = hp; } },
    dealt(hp = 1e7) { return A.mobs.reduce((s, m) => s + (m._tank ? hp - Math.max(0, m.hp) : 0), 0); },
    fired: (i = 0) => (TRIGS_RT.n && TRIGS_RT.n[i]) || 0,
    // 当前窗口里能点、但在屏幕外的东西（滚动列表里被裁掉的会被 MFrame 关掉输入，不算）
    offscreen() { const ui = A.G.ui, cam = ui.cameras.main, Wd = cam.width, Hd = cam.height, bad = [];
      const walk = (o, depth) => { if (!o || depth > 30 || o.visible === false) return;
        if (o.input && o.input.enabled && o.getBounds) { const b = o.getBounds(); if (b.width > 2 && b.height > 2 && b.width < Wd * 0.95 && (b.x < -1 || b.y < -1 || b.right > Wd + 1 || b.bottom > Hd + 1)) { const lab = (o.parentContainer && o.parentContainer.list || []).find(x => x.type === 'Text'); bad.push({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), label: lab ? lab.text.slice(0, 16) : '' }); } }
        if (o.list) for (const c of o.list) walk(c, depth + 1); };
      for (const o of ui.children.list) walk(o, 0); return bad; },
  };
};

async function openGame(html, o = {}) {
  const pw = loadPw(), b = await pw.chromium.launch(), pg = await b.newPage({ viewport: { width: o.w || 390, height: o.h || 844 }, deviceScaleFactor: o.dpr || 1 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await pg.goto('file://' + path.resolve(html)); await pg.waitForFunction(() => window.__ash && window.__ash.G.ui, null, { timeout: 30000 }); await pg.waitForTimeout(800);
  await pg.evaluate(`(${HELPERS.toString()})()`);
  return { browser: b, page: pg, errs };
}
module.exports = { openGame, loadPw };
