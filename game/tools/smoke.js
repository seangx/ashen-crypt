#!/usr/bin/env node
/* 构建后自检（借鉴 forgeax 的 falsifier smoke + UI 预览截图）。失败时退出码 1。
   0. 源码里没有被行内注释吞掉的代码
   1. 页面能起来、没有报错
   2. 每颗技能石（每个变体）：输出技能放进【出手】魂龛、功能技能放进【每 N 秒】魂龛，打木桩 6 秒
      → 必须施放过；输出技能必须打出伤害、面板秒伤 > 0、射程不离谱（不是近身形态时 ≥ MIN_RNG；0 按发射逻辑的默认 160 算）
   3. 每个窗口在 390×844 下打开：不报错、能点的东西都在屏幕里；截图存到 --out
   用法：node tools/smoke.js [--html ashen-crypt-mobile.html] [--out 目录] [--only gems|ui] */
const path = require('path'), fs = require('fs'), os = require('os'), { openGame } = require('./lib/page');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const html = arg('--html', path.join(__dirname, '..', 'ashen-crypt-mobile.html')), out = arg('--out', path.join(os.tmpdir(), 'ashen-smoke')), only = arg('--only', '');
const MIN_RNG = 60, CLOSE_FORMS = ['orbit', 'ram', 'aura', 'mine', 'nova', 'meteor', 'cleave'];   // 这些形态本来就贴身 / 落点，不查射程
const WINS = ['gear', 'trig', 'mods', 'tree', 'craft', 'salvage', 'shop', 'ladder', 'depart', 'stones', 'tbag', 'tcraft', 'reels', 'rbulk', 'more', 'settings', 'help'];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const { browser, page, errs } = await openGame(html); const fails = [], t0 = Date.now();
  const fail = (what, why) => { fails.push(`${what}：${why}`); };

  // 0. 源码检查：行内 // 注释后面又跟了代码（被注释吞掉，10-29 出过三处：冲刺不位移、魂龛范围词条无效、出手技能不给命中类魂龛充能）
  { const src = path.join(__dirname, '..', 'src'), pat = /\/\/[^\n]*?(?:[;}]\s*|\s)(?:if \(|for \(|const |let |return |[A-Za-z_]\w*(?:\.\w+|\[\w+\])+\s*(?:[+\-*]?=)[^=])/;
    for (const f of fs.readdirSync(src).filter(f => f.endsWith('.js'))) fs.readFileSync(path.join(src, f), 'utf8').split('\n').forEach((l, i) => { let k = l.indexOf('//'); while (k > 0 && l[k - 1] === ':') k = l.indexOf('//', k + 2); if (k >= 0 && pat.test(l.slice(k))) fail(`源码 ${f}:${i + 1}`, '行内注释后面还有代码，会被注释掉：' + l.slice(k, k + 60)); }); }

  if (only !== 'ui') {
    const list = await page.evaluate(() => P.A.GEMS.flatMap(G => G.form === 'shieldThrow' ? [{ id: G.id, n: G.n, util: 0, shield: 1 }] : [{ id: G.id, n: G.n, util: G.util ? 1 : 0 }]));
    for (const g of list) {
      const r = await page.evaluate(async g => {
        const W = P.setup({ gems: [g.id], trig: g.util ? 'timer' : 'cast', shield: !!g.shield, weapon: 'Cannon' });
        if (!W) return { err: '魂龛里没有生成技能（插不进去或被过滤）' };
        const info = { form: W.form, rng: Math.round(W.rng || 0), aoe: Math.round(W.aoeR || 0), dps: Math.round(W.dps || 0) };
        if (!(await P.start())) return { ...info, err: '开局失败' };
        let e = null; try { P.step(6, () => { P.tank(); P.A.player.life = P.A.STATS.life; P.A.player.soul = P.A.STATS.soulMax; }); } catch (x) { e = x.message; }
        const res = { ...info, fired: P.fired(), dealt: Math.round(P.dealt()), err: e }; P.stop(); return res;
      }, g).catch(e => ({ err: e.message.split('\n')[0] }));
      const name = `技能 ${g.n}`;
      if (r.err) { fail(name, r.err); continue; }
      if (!r.fired) fail(name, '6 秒内一次都没放出来');
      if (!g.util) { if (r.dps <= 0) fail(name, `面板秒伤 ${r.dps}`); if (r.fired && r.dealt <= 0) fail(name, '放了但没打出伤害'); if (!CLOSE_FORMS.includes(r.form) && (r.rng || 160) < MIN_RNG && r.aoe < 30) fail(name, `射程只有 ${r.rng}（形态 ${r.form}）`); }
      g.r = r;
    }
    // 技能变体（variants.json）：每个变体实战 6 秒（3 秒不够：怪还没走到跟前），要放得出来、打得出伤害、元素和定义一致
    const vr = await page.evaluate(async () => { const bad = [], A = P.A; let n = 0;
      for (const G of A.GEMS) for (const d of (VARS[G.id] || [])) { n++;
        const W0 = P.setup({ gems: [{ id: G.id, lvl: 15 }], trig: 'cast', shield: G.form === 'shieldThrow', weapon: 'Cannon' }); const g = A.S.trigs[0].socks[0]; g.v = d.v.id; A.refreshStats(); const W = P.W();
        if (!W) { bad.push(`${d.n}·${d.vn}：魂龛里没有技能`); continue; } if (W.el !== d.el) bad.push(`${d.n}·${d.vn}：元素 ${W.el}，应为 ${d.el}`);
        if (!(await P.start())) { bad.push(`${d.n}·${d.vn}：开局失败`); continue; }
        try { P.step(6, () => { P.tank(); A.player.life = A.STATS.life; A.player.soul = A.STATS.soulMax; }); } catch (e) { bad.push(`${d.n}·${d.vn}：${e.message}`); }
        if (!P.fired()) bad.push(`${d.n}·${d.vn}：6 秒内没放出来`); else if (P.dealt() <= 0) bad.push(`${d.n}·${d.vn}：放了但没打出伤害`); P.stop(); }
      return { n, bad }; }).catch(e => ({ n: 0, bad: [e.message.split('\n')[0]] }));
    for (const b of vr.bad) fail('技能变体', b); if (!vr.n) fail('技能变体', '一个变体都没有');
    console.log(`技能变体 ${vr.n} 个`);
    console.log(`技能石 ${list.length} 个：` + list.map(g => g.r ? `${g.n} ${g.r.fired}次` : '').filter(Boolean).join('，'));
  }

  if (only !== 'gems') {
    await page.evaluate(() => { P.setup({ gems: ['GemStab'] }); });
    for (const id of WINS) {
      const r = await page.evaluate(id => { const ui = P.A.G.ui; try { ui.closeWin(true); ui.openWin(id); } catch (e) { return { err: e.message }; } return { open: ui.winId === id }; }, id).catch(e => ({ err: e.message.split('\n')[0] }));
      if (r.err) { fail(`窗口 ${id}`, r.err); continue; } if (!r.open) continue; // 没解锁 / 需要参数的窗口跳过
      await page.waitForTimeout(250);
      const bad = await page.evaluate(() => P.offscreen());
      if (bad.length) fail(`窗口 ${id}`, `${bad.length} 个能点的东西在屏幕外：` + bad.slice(0, 3).map(b => `${b.label || '?'}@${b.x},${b.y} ${b.w}×${b.h}`).join('；'));
      await page.screenshot({ path: path.join(out, `win_${id}.png`) });
    }
    await page.evaluate(() => P.A.G.ui.closeWin(true));
    // 每种装备 × 每档稀有度点开详情（11-11：盾、法阵的详情一点就崩，因为还指向 gear-v3 删掉的旧格子）
    const det = await page.evaluate(() => { const A = P.A, ui = A.G.ui, seen = {}, bad = []; ui.openWin('gear');
      for (let i = 0; i < 3000; i++) { const it = A.rollItem(40 + (i % 60), 50, i % 3 === 0); if (!it || seen[it.kind + it.rar]) continue; seen[it.kind + it.rar] = 1; A.S.stash.push(it);
        try { ui.showDetail(it, null, ui.itemActs(it)); A.itemValue(it); } catch (e) { bad.push(`${it.kind}/${it.rar}：${e.message}`); } ui.closePopup(); A.S.stash.splice(A.S.stash.indexOf(it), 1); }
      ui.closeWin(true); return { n: Object.keys(seen).length, bad }; }).catch(e => ({ n: 0, bad: [e.message.split('\n')[0]] }));
    for (const b of det.bad) fail('物品详情', b);
    if (det.n < 20) fail('物品详情', `只试到 ${det.n} 种装备 × 稀有度`);
  }

  for (const e of [...new Set(errs)].slice(0, 10)) fail('页面报错', e);
  await browser.close();
  console.log(`截图：${out}`); console.log(`用时 ${Math.round((Date.now() - t0) / 1000)} 秒`);
  if (fails.length) { console.log(`\n✗ ${fails.length} 项没通过：`); for (const f of fails) console.log('  - ' + f); process.exit(1); }
  console.log('\n✓ 全部通过');
})();
