// Headless push-bot for 灰烬地窖. Usage: node sim.js <policy> <simMinutes> [seed]
// policy: none (never equip, no talents) | tree (talents only) | gear (auto-equip + talents)
const { chromium } = require('playwright');
const path = require('path');
const policy = process.argv[2] || 'none', simMin = +(process.argv[3] || 60), html = process.argv[4] || path.join(__dirname, '../build/game.html');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.error('PAGEERR', e.message));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('file://' + html);
  await p.waitForFunction(() => window.__ash && typeof game !== 'undefined' && game && game.isBooted, null, { timeout: 30000 });
  await p.waitForTimeout(500);
  const out = await p.evaluate(({ policy, simMin }) => {
    const A = window.__ash; game.loop.sleep();
    localStorage.clear(); Object.assign(A.S, {}); // fresh state is loaded already (no save)
    const S = A.S; const dt = 1 / 30; let simT = 0; const log = []; let fails = 0;
    const closeUi = () => { if (A.G.ui && A.G.ui.winId) A.G.ui.closeWin(); };
    const treeStep = () => {
      if (policy === 'none') return;
      const T = A.TREE.nodes; let guard = 0;
      while (S.level - 1 - S.tree.length > 0 && guard++ < 50) {
        const cand = Object.keys(T).filter(id => T[id].kind !== 'start' && !S.tree.includes(id) && T[id].nb.some(x => x === 'start' || S.tree.includes(x)));
        if (!cand.length) break;
        // greedy: pick node that maximises dps*ehp
        let best = null, bv = -1;
        for (const id of cand) { S.tree.push(id); const n = A.computeStats(); S.tree.pop(); const v = n.dps * (n.armor + n.deflect); if (v > bv) { bv = v; best = id; } }
        S.tree.push(best);
      }
      A.refreshStats();
    };
    const gearStep = () => {
      if (policy !== 'gear') return;
      for (const it of [...S.stash]) {
        if (!['weapon', 'shield', 'core', 'engine', 'hub'].includes(it.kind)) continue;
        const cur = A.computeStats(); const curV = cur.dps * (cur.armor + cur.deflect);
        const slots = it.kind === 'weapon' ? ['wl', 'wr'] : [it.kind];
        for (const sl of slots) { const n = A.computeStats({ ...S.equip, [sl]: it }); if (n.dps * (n.armor + n.deflect) > curV * 1.02) { (window.__upg = window.__upg || []).push([S.depth, it.b + (it.u ? '/U:' + it.u : ''), it.q, it.rar, Math.round(cur.dps), Math.round(n.dps)]); A.equipItem(it, sl); break; } }
      }
      S.stash = S.stash.slice(0, 60);
    };
    const F = { x0: 10, x1: 470, y0: 62, y1: 226 };
    const bot = () => {
      const pl = A.player, m = A.mouse; m.on = true;
      let fx = 0, fy = 0, near = 1e9;
      for (const o of A.mobs) { if (o.dead) continue; const dx = pl.x - o.x, dy = pl.y - o.y, d = Math.hypot(dx, dy) || 1; near = Math.min(near, d); const w = 1 / (d * d); fx += dx / d * w * (o.boss ? 3 : 1); fy += dy / d * w * (o.boss ? 3 : 1); }
      for (const o of A.projs) { if (!o.enemy && !o.hostile && !o.foe) continue; const dx = pl.x - o.x, dy = pl.y - o.y, d = Math.hypot(dx, dy) || 1; if (d < 30) { fx += dx / d / (d * d) * 2; fy += dy / d / (d * d) * 2; } }
      // wall repulsion + centre pull
      fx += 1 / Math.max(4, pl.x - F.x0) ** 2 - 1 / Math.max(4, F.x1 - pl.x) ** 2; fy += 1 / Math.max(4, pl.y - F.y0) ** 2 - 1 / Math.max(4, F.y1 - pl.y) ** 2;
      { const cx = 240 - pl.x, cy = 144 - pl.y; fx += -fy * 0.8 + cx * 1e-6; fy += fx * 0.8 + cy * 1e-6; }
      const l = Math.hypot(fx, fy) || 1; m.x = Math.max(F.x0, Math.min(F.x1, pl.x + fx / l * 40)); m.y = Math.max(F.y0 + 4, Math.min(F.y1, pl.y + fy / l * 40));
      if (near < 22 || pl.armor < A.STATS.armor * 0.5 && near < 40) A.tryDash();
    };
    const target = () => Math.max(1, S.depth);
    while (simT < simMin * 60) {
      closeUi(); treeStep(); gearStep();
      const L = S.depth, b0 = S.stats.bosses; A.startRun(L); closeUi(); let t = 0;
      while (A.RUN && t < 600) { bot(); A.logic(dt); t += dt; }
      simT += t;
      const res = A.RUN ? 'timeout' : (S.maxDepth > L ? 'win' : (S.stats.deaths ? 'x' : '?'));
      if (A.RUN) { /* force end */ }
      const won = S.stats.bosses > b0;
      if (!won) { fails++; if (fails >= 2) { S.depth = Math.max(1, L - 1); fails = 0; } } else fails = 0;
      if (won) S.depth = S.maxDepth;
      const st = A.STATS;
      log.push([Math.round(simT / 60), L, won ? 'W' : 'L', Math.round(t), S.level, Math.round(st.dps), Math.round(st.armor), Math.round(st.deflect)]);
    }
    const eq = Object.entries(S.equip).map(([k, it]) => it ? `${k}:${it.b}${it.u ? '(U:' + it.u + ')' : ''} q${it.q} r${it.rar} il${it.ilvl}` : k + ':-'); const ws = A.STATS.weapons.map(w => w ? Math.round(w.dps) : 0); return { log, maxDepth: S.maxDepth, level: S.level, deaths: S.stats.deaths, eq, ws, upg: window.__upg };
  }, { policy, simMin });
  console.log(JSON.stringify({eq: out.eq, ws: out.ws})); for (const u of (out.upg||[])) console.log('UPG', u.join(' ')); console.log(policy, 'maxDepth', out.maxDepth, 'lvl', out.level, 'deaths', out.deaths);
  for (const r of out.log.filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 25)) === 0 || i === a.length - 1)) console.log(r.join('\t'));
  await b.close();
})();
