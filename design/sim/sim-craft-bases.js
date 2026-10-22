/* 推层模拟：无头浏览器里跑真实的游戏逻辑。走位、冲刺、自动循环和自动推层都用游戏自己的自动战斗（src/52_auto.js，参数在 data/auto.json），
   这个脚本只负责在两局之间换装、插符文、点天赋。
   用法：node tools/sim.js [--runs 30 | --minutes 60] [--seed 1] [--gear auto|none] [--tree auto|none] [--lock] [--html ashen-crypt.html] [--json out.json]
     --minutes     按游戏内时间跑（包括每局之间的结算时间），代替 --runs
     --lock        锁定层数（不自动推层）
     --gear none   从不换装（检查“不换装备能不能一直推”）
     --tree auto   每局结束后把天赋点按固定顺序点掉（离起点最近的先点）
     --seed        随机种子；同一份数据、同一个种子，结果完全一样
     --craft auto  两局之间用铁砧：先熔铸（解锁后），再拆掉背包里的装备（印记、独特除外），然后给身上每件装备反复做“秒伤 × (护甲 + 灵障)”提升最大的加词条 / 升档，直到没有提升或潜力用完；有希望符就附带
     --ladder every:K  天梯开放后，每 K 局推层打一次天梯最高层（开着连打：赢了接着打新的最高层，输了回推层）
   需要 playwright（容器里一般在 /opt/node22/lib/node_modules/playwright）。Phaser 用 tools/vendor/ 里的本地副本。 */
const path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..');
const opt = { runs: +arg('runs', 30), seed: +arg('seed', 1), gear: arg('gear', 'auto'), tree: arg('tree', 'none'), html: path.resolve(ROOT, arg('html', 'ashen-crypt.html')), json: arg('json', null), maxT: +arg('maxT', 600), minutes: +arg('minutes', 0), ladder: +((arg('ladder', '') || '').split(':')[1] || 0), craft: arg('craft', 'none'), lock: process.argv.includes('--lock') };

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
  await p.route('**/phaser.min.js', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'vendor', 'phaser.min.js')), contentType: 'application/javascript' }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const html = fs.readFileSync(opt.html, 'utf8');
  const tmp = path.join(require('os').tmpdir(), 'ash-sim-' + process.pid + '.html');
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`);
  await p.goto('file://' + tmp);
  await p.waitForFunction(() => window.__ash && window.__ash.G.ui, null, { timeout: 20000 });
  const out = await p.evaluate(opt => {
    const A = window.__ash; A.G.fx = false; window.__reseed(opt.seed * 7919 + 1);
    const S = A.S; const rows = [];
    if (A.G.ui.closeWin) A.G.ui.closeWin();
    const score = () => A.STATS.dps + A.STATS.armor + A.STATS.deflect;
    const dt = 1 / 30; let simT = 0, pushes = 0; const crafts = { add: 0, up: 0, shatter: 0, fuse: 0 };
    S.auto.ai = true; S.auto.loop = true; S.auto.lock = opt.lock; A.mouse.on = false;
    A.startRun();
    for (let r = 0; opt.minutes ? simT < opt.minutes * 60 : r < opt.runs; r++) {
      while (!A.RUN) { A.logic(dt); simT += dt; } // 结算倒计时
      const L = A.RUN.L, depth = S.depth, mode = A.RUN.mode; let t = 0, minArmor = 1;
      while (A.RUN && t < opt.maxT) { A.logic(dt); t += dt; simT += dt; if (A.RUN && !A.RUN.ending) minArmor = Math.min(minArmor, A.player.armor / A.STATS.armor); }
      if (A.RUN) { A.RUN.result = 'timeout'; A.RUN.ending = 0.01; A.logic(dt); }
      const res = A.AUTO.last ? A.AUTO.last.result : '?';
      A.G.ui.closeWin();
      // 换装：分数（秒伤 + 护甲 + 灵障）变高就换
      if (opt.gear === 'auto') for (const it of [...S.stash]) {
        if (it.kind === 'chip') continue;
        const slot = it.kind === 'weapon' ? (S.equip.wr ? (A.itemValue(it) > A.itemValue(S.equip.wl) ? 'wl' : 'wr') : 'wr') : it.kind;
        const cur = S.equip[slot]; if (!cur) { A.equipItem(it, slot); continue; }
        const before = score(); A.equipItem(it, slot); if (score() < before) A.equipItem(cur, slot);
      }
      // 符文：先插武器 / 头冠 / 遁靴（生效才插），剩下的塞进法阵
      if (opt.gear === 'auto') for (const m of [...S.mods]) {
        let placed = false;
        for (const s of ['wl', 'wr', 'core', 'engine', 'hub']) { const w = S.equip[s]; if (!w || !w.sock) continue; const k = w.mods.indexOf(null); if (k < 0) continue; if (s === 'hub' || A.modActive(m, w)) { w.mods[k] = m; placed = true; break; } }
        if (placed) S.mods = S.mods.filter(x => x !== m);
      }
      const canAlloc = A.treeCanAlloc || window.treeCanAlloc;
      if (opt.tree === 'auto' && canAlloc) {
        const ids = Object.keys(A.TREE.nodes).sort((a, b) => { const na = A.TREE.nodes[a], nb = A.TREE.nodes[b]; return (na.x * na.x + na.y * na.y) - (nb.x * nb.x + nb.y * nb.y) || (a < b ? -1 : 1); });
        let go = true; while (go) { go = false; for (const id of ids) if (canAlloc(id)) { S.tree.push(id); go = true; break; } }
      }
      // 铁砧（贪心）
      if (opt.craft === 'auto') {
        const ev = eq => { const n = A.computeStats(eq); return n.dps * (n.armor + n.deflect); };
        const mid = (a, t) => { const v = a.tiers[t][0]; return a.pair ? [Math.round((v[0] + v[1]) / 2), Math.round((v[2] + v[3]) / 2)] : v.length === 1 ? v[0] : Math.round((v[0] + v[1]) / 2); };
        const slots = ['wl', 'wr', 'shield', 'core', 'engine', 'hub'];
        if (A.unlocked('fuse')) for (const s of slots) { const u = S.equip[s]; if (!u || !u.u || u.leg || !(u.lp > 0)) continue; const rs = S.stash.filter(x => x.kind === u.kind && x.rar === 2 && !x.u).sort((a, b) => b.affs.length - a.affs.length); if (rs.length) { A.craftFuse(u, rs[0]); crafts.fuse++; } }
        if (A.unlocked('craft')) {
          const addT = (a, it) => { let top = 0; a.tiers.forEach((t, i) => { if (it.ilvl >= t[2]) top = i; }); const ct = A.craftTop ? A.craftTop(a) : a.tiers.length - 1; return Math.max(0, Math.min(ct, top) - (DATA.craft.anvil.addBelowTop ?? 99)); };
          const craftOn = (it, s) => {
            for (let guard = 0; guard < 40; guard++) {
              if (!it || !A.craftable(it) || !(it.fp > 0)) break;
              const base = ev({ ...S.equip, [s]: it }); let best = null;
              const tryAct = (act, mut) => { const cl = { ...it, affs: it.affs.map(x => ({ ...x })) }; mut(cl); const v = ev({ ...S.equip, [s]: cl }); if (v > base * 1.001 && (!best || v > best.v)) best = { v, act }; };
              for (const a of A.AFF) if ((S.shards[a.k] || 0) > 0 && !A.addWhy(it, a.k)) tryAct({ add: a.k }, cl => { const t = addT(a, it); cl.affs.push({ k: a.k, t, v: mid(a, t) }); });
              it.affs.forEach((x, i) => { if (!A.upWhy(it, i)) tryAct({ up: i }, cl => { const y = cl.affs[i]; y.t++; y.v = mid(A.AFF_BY[y.k], y.t); }); });
              if (!best) break;
              const hope = (S.glyphs.hope || 0) > 0;
              if (best.act.add) { A.craftAdd(it, best.act.add, hope); crafts.add++; } else { A.craftUp(it, best.act.up, hope, false); crafts.up++; }
            }
          };
          // 新底材：每个部位挑物品等级最高的 3 件，做完比身上的好就换上
          for (const s of slots) {
            const kind = s === 'wl' || s === 'wr' ? 'weapon' : s;
            const cands = S.stash.filter(x => x.kind === kind && A.craftable(x) && x.fp > 0).sort((a, b) => (b.ilvl + b.q * 5) - (a.ilvl + a.q * 5)).slice(0, 3);
            for (const it of cands) { craftOn(it, s); const cur = ev(S.equip); if (ev({ ...S.equip, [s]: it }) > cur) { A.equipItem(it, s); crafts.swap = (crafts.swap || 0) + 1; } }
            A.refreshStats();
          }
          for (const it of [...S.stash]) if (it.kind !== 'chip' && !it.u) { A.salvage(it); crafts.shatter++; }
          for (const s of slots) {
            for (let guard = 0; guard < 40; guard++) {
              const it = S.equip[s]; if (!it || !A.craftable(it) || !(it.fp > 0)) break;
              const base = ev(S.equip); let best = null;
              const tryAct = (act, mut) => { const cl = { ...it, affs: it.affs.map(x => ({ ...x })) }; mut(cl); const v = ev({ ...S.equip, [s]: cl }); if (v > base * 1.001 && (!best || v > best.v)) best = { v, act }; };
              for (const a of A.AFF) if ((S.shards[a.k] || 0) > 0 && !A.addWhy(it, a.k)) tryAct({ add: a.k }, cl => { const t = addT(a, it); cl.affs.push({ k: a.k, t, v: mid(a, t) }); });
              it.affs.forEach((x, i) => { if (!A.upWhy(it, i)) tryAct({ up: i }, cl => { const y = cl.affs[i]; y.t++; y.v = mid(A.AFF_BY[y.k], y.t); }); });
              if (!best) break;
              const hope = (S.glyphs.hope || 0) > 0;
              if (best.act.add) { A.craftAdd(it, best.act.add, hope); crafts.add++; } else { A.craftUp(it, best.act.up, hope, false); crafts.up++; }
              A.refreshStats();
            }
          }
        }
      }
      A.refreshStats();
      if (S.stash.length > 60) S.stash.splice(0, S.stash.length - 60);
      // 天梯：每 K 局推层排一次最高层（连打）
      if (mode !== 'ladder') pushes++;
      if (opt.ladder && mode !== 'ladder' && pushes % opt.ladder === 0 && A.unlocked('ladder') && !A.LAD.pending) { S.ladder.chain = true; A.LAD.pending = S.ladder.unlocked; }
      const lr = A.AUTO.last;
      rows.push({ mode, lad: mode === 'ladder' ? { t: Math.round(lr.t), jump: lr.lad ? lr.lad.jump : 0, unlocked: S.ladder.unlocked, best: S.ladder.best } : null, run: r + 1, L, depth, next: S.depth, back: S.auto.back, res, t: Math.round(t), min: Math.round(simT / 60), kills: S.stats.kills, lv: S.level, maxDepth: S.maxDepth, dps: Math.round(A.STATS.dps), armor: A.STATS.armor, deflect: A.STATS.deflect, minHp: Math.round(minArmor * 100),
        eq: ['wl', 'wr', 'shield', 'core', 'engine', 'hub'].map(k => S.equip[k] ? `${S.equip[k].b}/q${S.equip[k].q}/r${S.equip[k].rar}` : '-').join(' '),
        shards: Object.values(S.shards).reduce((a, b) => a + b, 0), glyphs: Object.values(S.glyphs).reduce((a, b) => a + b, 0), crafts: { ...crafts }, mods: S.mods.length + Object.values(S.equip).reduce((n, it) => n + (it && it.mods ? it.mods.filter(Boolean).length : 0), 0) });
    }
    return rows;
  }, opt);
  const lastC = out.length ? out[out.length - 1].crafts : null;
  for (const r of out) if (r.mode === 'ladder') console.log(`#${String(r.run).padStart(3)} ${String(r.min).padStart(4)}分 天梯${String(r.L).padStart(3)}层 ${r.res.padEnd(7)} ${String(r.lad.t).padStart(3)}s ${r.res === 'win' ? '跳+' + r.lad.jump : '    '} 解锁到${String(r.lad.unlocked).padStart(3)} 最高${String(r.lad.best).padStart(3)} 等级${String(r.lv).padStart(3)} 秒伤${String(r.dps).padStart(8)} 护甲${String(r.armor).padStart(7)} 最低血${String(r.minHp).padStart(4)}%`); else console.log(`#${String(r.run).padStart(3)} ${String(r.min).padStart(4)}分 难度${String(r.depth).padStart(3)}→${String(r.next).padStart(3)}${r.back ? '退' : ' '} ${r.res.padEnd(7)} ${String(r.t).padStart(3)}s 等级${String(r.lv).padStart(3)} 秒伤${String(r.dps).padStart(8)} 护甲${String(r.armor).padStart(7)} 灵障${String(r.deflect).padStart(6)} 最低血${String(r.minHp).padStart(4)}% 碎片${String(r.shards).padStart(4)} 铸符${String(r.glyphs).padStart(3)} 符文${String(r.mods).padStart(3)} | ${r.eq}`);
  const lads = out.filter(r => r.mode === 'ladder'); out.splice(0, out.length, ...out.filter(r => r.mode !== 'ladder'));
  if (lads.length) console.log(`\n天梯 ${lads.length} 局，通过 ${lads.filter(r => r.res === 'win').length}；最高 ${lads[lads.length - 1].lad.best} 层，解锁到 ${lads[lads.length - 1].lad.unlocked} 层。`);
  const deaths = out.filter(r => r.res !== 'win');
  if (opt.craft === 'auto' && lastC) console.log(`铁砧：换上自制 ${lastC.swap||0} 次，加词条 ${lastC.add} 次，升档 ${lastC.up} 次，拆解 ${lastC.shatter} 件，熔铸 ${lastC.fuse} 次。`);
  console.log(`\n${out.length} 局，游戏内 ${out.length ? out[out.length - 1].min : 0} 分钟：最深第 ${out.length ? out[out.length - 1].maxDepth - 1 : 0} 层通关；失败 ${deaths.length} 次${deaths.length ? '（首次在难度 ' + deaths[0].depth + '，第 ' + deaths[0].run + ' 局）' : ''}。`);
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(out, null, 1));
  const bad = errs.filter(e => !/GPU stall|swiftshader|GroupMarker/.test(e));
  if (bad.length) console.log(bad.join('\n'));
  fs.unlinkSync(tmp);
  await b.close();
})();
