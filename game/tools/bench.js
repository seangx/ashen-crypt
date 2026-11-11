#!/usr/bin/env node
/* 技能石基准：每颗伤害技能石单插一个出手时魂龛，自动战斗打 sec 秒，记击杀、实际秒伤、面板秒伤、承伤。
   承伤不扣血（每帧回满），灯火每帧回满，只比输出效率和挨打频率。
   用法：node tools/bench.js [--depth 57] [--sec 25] [--seeds 2] [--only GemFlame,GemTrap] [--json out.json]
   本机最多 2 个 Chromium（memory: sim-load），建议 nice -n 15。 */
const fs = require('fs'), path = require('path'), { openGame } = require('./lib/page');
const argv = process.argv.slice(2), o = { depth: 57, sec: 25, seeds: 2, html: path.join(__dirname, '..', 'ashen-crypt-mobile.html') };
for (let i = 0; i < argv.length; i++) { const a = argv[i].replace(/^--/, ''); o[a] = argv[++i]; }
(async () => {
  const { browser, page, errs } = await openGame(o.html);
  const rows = await page.evaluate(async o => {
    const A = window.__ash, P = window.P, only = o.only ? o.only.split(',') : null, out = [];
    for (const G of A.GEMS) {
      if (G.util || G.form === 'shieldThrow' || (only && !only.includes(G.id))) continue;
      const w = G.f3 === 'melee' ? 'TurbineBlades' : G.f3 === 'proj' ? 'Railgun' : 'StarfallRod', r = { id: G.id, n: G.n, form: G.form, kills: 0, dps: 0, panel: 0, taken: 0 };
      for (let s = 0; s < +o.seeds; s++) {
        P.setup({ gems: [G.id], weapon: w, depth: +o.depth, level: 50, ilvl: +o.depth }); await P.start(); const L0 = A.STATS.life; let taken = 0;
        P.step(+o.sec, () => { if (A.player.life < L0) { taken += L0 - A.player.life; A.player.life = L0; } A.player.soul = A.STATS.soulMax; });
        const D = A.RUN.dstat || {}, tot = Object.values(D).reduce((s, e) => s + e.d, 0);
        r.kills += A.RUN.kills / +o.seeds; r.dps += tot / +o.sec / +o.seeds; r.panel = A.STATS.dps; r.taken += taken / L0 * 100 * 60 / +o.sec / +o.seeds; P.stop();
      }
      out.push(r);
    }
    return out.sort((a, b) => b.kills - a.kills);
  }, o);
  const f = x => Math.round(x);
  console.log('技能石 | 形态 | 击杀 | 实际秒伤 | 面板秒伤 | 承伤 %血/分');
  for (const r of rows) console.log([r.n, r.form, f(r.kills), f(r.dps), f(r.panel), f(r.taken)].join(' | '));
  if (o.json) fs.writeFileSync(o.json, JSON.stringify(rows, null, 1));
  if (errs.length) console.log('页面错误：', [...new Set(errs)].slice(0, 5));
  await browser.close();
})();
