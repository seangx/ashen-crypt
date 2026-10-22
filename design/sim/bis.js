const path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = '/mnt/project-files/game';
const opt = { seed: +arg('seed', 1), level: +arg('level', 70), levels: (arg('levels', '40,50,60,70,80')).split(',').map(Number), html: path.resolve(ROOT, 'ashen-crypt.html') };

(async () => {
  const b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  // 可重置的随机数：同一个种子，模拟结果完全一样
  await p.addInitScript(seed => {
    let s = seed >>> 0;
    const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    Math.random = next; window.__reseed = v => { s = v >>> 0; };
    try { localStorage.clear(); } catch (e) { }
  }, opt.seed);
  await p.route('**/phaser.min.js', r => r.fulfill({ body: fs.readFileSync(path.join(ROOT, 'tools', 'vendor', 'phaser.min.js')), contentType: 'application/javascript' }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const html = fs.readFileSync(opt.html, 'utf8');
  const tmp = path.join(require('os').tmpdir(), 'ash-sim-' + process.pid + '.html');
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`);
  await p.goto('file://' + tmp);
  await p.waitForFunction(() => window.__ash && window.__ash.G.ui, null, { timeout: 20000 });
  const out = await p.evaluate(opt => {
    const A = window.__ash; A.G.fx = false; window.__reseed(opt.seed * 7919 + 1);
    const S = A.S; if (A.G.ui.closeWin) A.G.ui.closeWin();
    const LV = opt.level, IL = 100;
    S.level = LV; S.maxDepth = 101; S.ladder.best = 100; S.ladder.unlocked = 200;
    const ids = Object.keys(A.TREE.nodes).sort((a, b) => { const na = A.TREE.nodes[a], nb = A.TREE.nodes[b]; return (na.x * na.x + na.y * na.y) - (nb.x * nb.x + nb.y * nb.y) || (a < b ? -1 : 1); });
    S.tree = []; let go = true; while (go) { go = false; for (const id of ids) if (A.treeCanAlloc(id)) { S.tree.push(id); go = true; break; } }
    const ev = eq => { const n = A.computeStats(eq); return n.dps * (n.armor + n.deflect); };
    const mid = (a, t) => { const v = a.tiers[t][0]; return a.pair ? [Math.round((v[0] + v[1]) / 2), Math.round((v[2] + v[3]) / 2)] : v.length === 1 ? v[0] : Math.round((v[0] + v[1]) / 2); };
    const topQ = 10;
    const fill = (it, s) => { it.affs = []; it.fp = 99; for (let k = 0; k < 4; k++) { let best = null; for (const a of A.AFF) { if (!A.canAdd(it, a)) continue; const t = a.tiers.length - 1; const cl = { ...it, affs: [...it.affs, { k: a.k, t, v: mid(a, t) }] }; const v = ev({ ...S.equip, [s]: cl }); if (!best || v > best.v) best = { v, x: { k: a.k, t, v: mid(a, t) } }; } if (!best) break; it.affs.push(best.x); } it.rar = it.affs.length > 2 ? 2 : 1; it.rn = '毕业'; return it; };
    const kinds = { wl: ['weapon', A.WEAPONS], wr: ['weapon', A.WEAPONS], shield: ['shield', A.ARMORS.shield], core: ['core', A.ARMORS.core], engine: ['engine', A.ARMORS.engine], hub: ['hub', A.ARMORS.hub] };
    for (let pass = 0; pass < 2; pass++) for (const s of ['wl', 'wr', 'shield', 'core', 'engine', 'hub']) {
      const [kind, pool] = kinds[s]; let best = null;
      for (const b of Object.keys(pool)) { let it; try { it = A.newItem(kind, b, IL, topQ, 0); } catch (e) { continue; } fill(it, s); const v = ev({ ...S.equip, [s]: it }); if (!best || v > best.v) best = { v, it }; }
      if (best) { if (s === 'wl' || s === 'wr') { S.equip[s] = null; } A.equipItem(best.it, s); }
    }
    A.refreshStats();
    const st = A.STATS; const info = { dps: Math.round(st.dps), armor: Math.round(st.armor), deflect: Math.round(st.deflect), eq: Object.values(S.equip).map(it => it ? it.b : '-').join(' '), tree: S.tree.length };
    S.auto.ai = true; S.auto.loop = false; A.mouse.on = false;
    const dt = 1 / 30;
    const attempt = N => { A.LAD.pending = N; S.ladder.chain = false; A.startRun(); let t = 0; while (A.RUN && t < 400) { A.logic(dt); t += dt; } if (A.RUN) { A.RUN.result = 'timeout'; A.RUN.ending = 0.01; A.logic(dt); } for (let i = 0; i < 200 && !A.AUTO.last; i++) A.logic(dt); const r = A.AUTO.last ? A.AUTO.last.result : '?'; A.AUTO.last = null; A.G.ui.closeWin(); A.refreshStats(); return { r, t: Math.round(t) }; };
    const res = [];
    for (const N of opt.levels) { const a = [attempt(N), attempt(N)]; res.push([N, a.map(x => x.r + '/' + x.t + 's').join(' ')]); }
    return { info, res };
  }, opt);
  console.log(JSON.stringify(out.info));
  for (const r of out.res) console.log('天梯', r[0], r[1]);
  await b.close();
})();
