// Gear power curve by item level: median / p90 / best-of-30 single-weapon DPS and armor+deflect of random drops.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('file://' + path.join(__dirname, '../build/game.html'));
  await p.waitForFunction(() => window.__ash && typeof game !== 'undefined' && game && game.isBooted, null, { timeout: 30000 });
  const rows = await p.evaluate(() => {
    const A = window.__ash; game.loop.sleep(); const S = A.S; const base = { ...S.equip };
    const pct = (a, q) => { a = [...a].sort((x, y) => x - y); return a[Math.floor(q * (a.length - 1))]; };
    const out = [];
    for (const L of [1, 3, 5, 8, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80]) {
      const dps = [], def = [];
      for (let i = 0; i < 400; i++) {
        const it = A.rollItem(L, 0, false);
        if (it.kind === 'weapon') dps.push(A.computeStats({ ...base, wl: it, wr: null }).dps);
        else if (['shield', 'core'].includes(it.kind)) { const n = A.computeStats({ ...base, [it.kind]: it }); def.push(n.armor + n.deflect); }
      }
      const best30 = []; for (let k = 0; k < 50; k++) { let m = 0; for (let j = 0; j < 30; j++) m = Math.max(m, dps[Math.floor(Math.random() * dps.length)]); best30.push(m); }
      out.push([L, Math.round(pct(dps, 0.5)), Math.round(pct(dps, 0.9)), Math.round(pct(best30, 0.5)), Math.round(pct(def, 0.5)), Math.round(pct(def, 0.9))]);
    }
    return out;
  });
  console.log('ilvl\tdpsMed\tdpsP90\tbest30\tdefMed\tdefP90');
  for (const r of rows) console.log(r.join('\t'));
  await b.close();
})();
