#!/usr/bin/env node
/* 技能石基准：每颗伤害技能石单插一个出手时魂龛，主手用对口类别里伤害系数 1 的那把（四类每秒伤害系数相同），自动战斗。
   三项：
     击杀   正常打 sec 秒的击杀数（会受刷怪速度限制）
     怪群   固定 --pack（默认 12）只木桩，sec 秒里这颗技能石每秒打掉多少血 —— 清怪能力
     单体   只留一只不会动的木桩（开局放在角色前方 70 像素），sec 秒里这颗技能石每秒打掉多少血 —— 打 Boss 能力
   伤害只算这颗技能石（不含普攻）。承伤不扣血（每帧回满），灯火每帧回满。
   用法：node tools/bench.js [--depth 57] [--sec 20] [--seeds 1] [--only GemBolt,GemMeteor] [--skip kills] [--json out.json] [--html x.html]
   本机最多 2 个 Chromium（memory: sim-load），建议 nice -n 15。 */
const fs = require('fs'), path = require('path'), { openGame } = require('./lib/page');
const argv = process.argv.slice(2), o = { depth: 57, sec: 20, seeds: 1, skip: '', html: path.join(__dirname, '..', 'ashen-crypt-mobile.html') };
for (let i = 0; i < argv.length; i++) { const a = argv[i].replace(/^--/, ''); o[a] = argv[++i]; }
(async () => {
  const { browser, page, errs } = await openGame(o.html);
  const rows = await page.evaluate(async o => {
    const A = window.__ash, P = window.P, only = o.only ? o.only.split(',') : null, skip = o.skip.split(','), out = [], sec = +o.sec, N = +o.seeds;
    const PACK = +o.pack || 12; // 怪群：固定这么多只木桩（打不死的怪会无限堆积）
    const WPN = ['Cannon', 'PlasmaBlaster', 'TurbineBlades', 'FrostOrb']; // 四类里伤害系数 1、攻速 1.2 的那把
    const own = G => { const D = A.RUN.dstat || {}; let s = 0; for (const k in D) if (k !== '普攻') s += D[k].d; return s; };
    for (const G of A.GEMS) {
      if (G.util || G.form === 'shieldThrow' || (only && !only.includes(G.id))) continue;
      let w = 'Cannon'; for (const c of WPN) { P.setup({ gems: [G.id], weapon: c }); if (P.W() && P.W().b.aff) { w = c; break; } }
      const r = { id: G.id, n: G.n, form: G.form, w, eff: G.base.eff, kills: 0, pack: 0, single: 0 };
      const run = async (mode) => {
        P.setup({ gems: [G.id], weapon: w, depth: +o.depth, level: 50, ilvl: +o.depth }); for (const k of ['mobs', 'projs', 'meteors', 'zones']) if (A[k]) A[k].length = 0; await P.start(); const L0 = A.STATS.life; let one = null; // 上一轮的木桩、弹道先清掉
        P.step(sec, () => { A.player.life = L0; A.player.soul = A.STATS.soulMax;
          if (mode === 'pack') { P.tank(); const live = A.mobs.filter(m => !m.dead); if (live.length > PACK) { A.mobs.length = 0; A.mobs.push(...live.slice(0, PACK)); } }
          if (mode === 'single') { if (!one) { one = A.mobs.find(m => !m.dead && !m.boss && m.rise <= 0.2); if (one) { one.x = A.player.x + 70; one.y = A.player.y; one.spd = 0; } } if (one) { P.tank(); one.spd = 0; one.kx = one.ky = 0; A.mobs.length = 0; A.mobs.push(one); } } }); // 单体：训练木桩，不动，放在角色前方 70 像素
        const v = mode === 'kills' ? A.RUN.kills : own() / sec; P.stop(); return v;
      };
      for (let s = 0; s < N; s++) for (const m of ['kills', 'pack', 'single']) if (!skip.includes(m)) r[m] += await run(m) / N;
      out.push(r);
    }
    return out;
  }, o);
  const f = x => Math.round(x);
  console.log('技能石 | 形态 | 主手 | 伤害效用 | 击杀 | 怪群秒伤 | 单体秒伤');
  for (const r of rows) console.log([r.n, r.form, r.w, r.eff, f(r.kills), f(r.pack), f(r.single)].join(' | '));
  if (o.json) fs.writeFileSync(o.json, JSON.stringify(rows, null, 1));
  if (errs.length) console.log('页面错误：', [...new Set(errs)].slice(0, 5));
  await browser.close();
})();
