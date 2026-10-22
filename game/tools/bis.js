/* 毕业配装测试：在指定物品等级下按流派直接配一身满档装备，测秒伤、有效生命和天梯能爬到几层。
   用法：node tools/bis.js [--build whirl,spark,random] [--levels 30,70,100] [--seed 1] [--html ashen-crypt.html] [--override 路径=值 ...]
     --build   whirl 旋风斩成型（回旋骨刃 + 旋身等符文、词条按 whirl.craftPref、天赋先拿旋风之心、物品等级 ≥20 戴风暴之眼）
     --build   spark 游雷（电球）成型（雷灵 + 游雷等符文、词条按 spark.craftPref、天赋先拿织雷之心、物品等级 ≥20 戴雷冠）
               random 乱配对照（同样的词条条数和档位，但词条族、底材、天赋随机；符文随便插）
               auto 每个部位按“秒伤 × 有效生命”挑最好的词条和底材
               写多个用逗号隔开，最后输出前两个的比值
     角色等级 = 物品等级；词条取物品等级允许的、铁砧能做到的最高档；符文等级 = min(20, 物品等级 / 5)。
     天梯从第 1 层开始连打（按剩余时间跳层），第一次失败就停，报告最高通过层。
     --dump 文件  把第一个流派、第一个物品等级的配装存成游戏存档（天梯连打之后、单趟之前），给游戏里的“毕业存档”用。
     单趟：之后用同一身装备从推关第 1 层出发往下走，报告这一趟的时长、通过层数和结束原因（--descentMax 秒封顶，默认 1800）。 */
const path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..');
const opt = { seed: +arg('seed', 1), builds: arg('build', 'whirl,random').split(','), levels: arg('levels', '30,70,100').split(',').map(Number), html: path.resolve(ROOT, arg('html', 'ashen-crypt.html')), descentMax: +arg('descentMax', 1800), dump: arg('dump', null) };

const OV = require('./override'), HTML = OV.applyOverrides(fs.readFileSync(opt.html, 'utf8'), OV.overridesFrom(process.argv));
async function run(build, IL) {
  const b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.addInitScript(seed => {
    let s = seed >>> 0;
    const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    Math.random = next; window.__reseed = v => { s = v >>> 0; };
    try { localStorage.clear(); } catch (e) { }
  }, opt.seed);
  await p.route('**/phaser.min.js', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'vendor', 'phaser.min.js')), contentType: 'application/javascript' }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const tmp = path.join(require('os').tmpdir(), `ash-bis-${process.pid}-${build}-${IL}.html`);
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body>${HTML}</body></html>`);
  await p.goto('file://' + tmp);
  await p.waitForFunction(() => window.__ash && window.__ash.G.ui, null, { timeout: 20000 });
  const out = await p.evaluate(({ build, IL, seed, DMAX, DUMP }) => {
    const A = window.__ash; A.G.fx = false; window.__reseed(seed * 7919 + IL);
    const S = A.S, WH = A.DATA.mechanics.whirl, SPK = A.DATA.mechanics.spark, ARCH = build === 'whirl' || build === 'spark', BP = build === 'spark' ? SPK : WH, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
    if (A.G.ui.closeWin) A.G.ui.closeWin();
    S.level = IL; S.maxDepth = IL + 1; S.ladder.best = IL; S.ladder.unlocked = 1;
    for (const k in S.equip) S.equip[k] = null; S.stash = []; S.mods = []; S.tree = [];
    const spinDps = n => n.weapons.reduce((s, w) => s + (w ? w.dps * (w.spinMax || 1) : 0), 0);
    // 有效生命：护甲 + 灵障，旋转满层减伤也算进去
    const ehpOf = n => { const w = n.weapons.find(x => x && x.whirl); const dr = 1 - (1 - (w ? Math.min(WH.drCap, WH.drPerStack * w.stackMax) / 100 : 0)) * (1 - (n.weapons.some(x => x && x.meleeGuard) ? A.DATA.mechanics.defense.meleeGuardLess : 0)); return A.defEhp(n, A.S.depth, Math.min(0.6, dr)); } // 有效生命：(生命 + 护盾 + 护盾回复×5) ÷ (1 − 护甲减伤 − 流派减伤) // 减伤合计在分数里最多算 60%;
    const ev = eq => { const n = A.computeStats(eq); return spinDps(n) * ehpOf(n); };
    const mid = (a, t) => { const v = a.tiers[t][0]; return a.pair ? [Math.round((v[0] + v[1]) / 2), Math.round((v[2] + v[3]) / 2)] : v.length === 1 ? v[0] : Math.round((v[0] + v[1]) / 2); };
    const topT = (a, it) => { let top = 0; a.tiers.forEach((t, i) => { if (it.ilvl >= t[2]) top = i; }); return Math.min(A.craftTop(a), top); };
    // 天赋
    const ids = Object.keys(A.TREE.nodes).sort((a, b) => { const na = A.TREE.nodes[a], nb = A.TREE.nodes[b]; return (na.x * na.x + na.y * na.y) - (nb.x * nb.x + nb.y * nb.y) || (a < b ? -1 : 1); });
    const route = () => { if (S.tree.includes(BP.treeKey)) return null; const prev = { start: null }, q = ['start', ...S.tree]; for (const x of S.tree) prev[x] = null; while (q.length) { const c = q.shift(); if (c === BP.treeKey) break; for (const n of A.TREE.nodes[c].nb) if (!(n in prev)) { prev[n] = c; q.push(n); } } let c = BP.treeKey; while (prev[c] && !S.tree.includes(prev[c]) && prev[c] !== 'start') c = prev[c]; return A.treeCanAlloc(c) ? c : null; };
    for (let go = true; go;) { go = false;
      if (build === 'random') { const c = ids.filter(id => A.treeCanAlloc(id)); if (c.length) { S.tree.push(pick(c)); go = true; } continue; }
      const r = ARCH ? route() : null; if (r) { S.tree.push(r); go = true; continue; }
      for (const id of ids) if (A.treeCanAlloc(id)) { S.tree.push(id); go = true; break; } }
    // 词条：4 条，档位 = 铁砧能做到的最高档
    const fill = (it, s) => {
      it.affs = []; it.fp = 0;
      for (let k = 0; k < 4; k++) {
        const ok = A.AFF.filter(a => A.canAdd(it, a)); if (!ok.length) break;
        let a;
        if (build === 'random') a = pick(ok);
        else if (ARCH) a = BP.craftPref.map(kk => ok.find(x => x.k === kk)).find(Boolean) || null;
        if (build === 'auto' || (ARCH && !a)) { let best = null; for (const x of ok) { const t = topT(x, it); const cl = { ...it, affs: [...it.affs, { k: x.k, t, v: mid(x, t) }] }; const v = ev({ ...S.equip, [s]: cl }); if (!best || v > best.v) best = { v, a: x }; } a = best.a; }
        const t = topT(a, it); it.affs.push({ k: a.k, t, v: mid(a, t) });
      }
      it.rar = it.affs.length > 2 ? 2 : it.affs.length ? 1 : 0; it.rn = it.rar === 2 ? '毕业' : null; return it;
    };
    const Q = (() => { const ok = A.DATA.loot.quality.list.map((q, i) => i).filter(i => IL >= A.DATA.loot.quality.list[i].ilvlMin); return ok[ok.length - 1]; })();
    const pools = { wl: ['weapon', A.WEAPONS], wr: ['weapon', A.WEAPONS], shield: ['shield', A.ARMORS.shield], core: ['core', A.ARMORS.core], engine: ['engine', A.ARMORS.engine], hub: ['hub', A.ARMORS.hub] };
    const make = (kind, b) => { const it = A.newItem(kind, b, IL, Q, 0); return it; };
    const RL = Math.max(1, Math.min(20, Math.round(IL / 5))), xpAt = L => L <= 1 ? 0 : A.DATA.astro.modXp[L - 2];
    const runesFor = (it, order) => { if (!it.sock) return; it.sock = Math.max(it.sock, 4); it.mods = Array(it.sock).fill(null); const cands = (order || A.DATA.runes.list.map(r => r.id)).map(id => A.newMod(id, xpAt(RL))).filter(m => A.modActive(m, it)); let k = 0; for (const m of (order ? cands : cands.sort(() => rnd() - 0.5))) { if (k >= it.sock) break; it.mods[k++] = m; } };
    for (let pass = 0; pass < 2; pass++) for (const s of ['wl', 'wr', 'shield', 'core', 'engine', 'hub']) {
      const [kind, pool] = pools[s];
      let bases = Object.keys(pool).filter(b => (pool[b].req || 1) <= IL);
      if (ARCH && s === 'wl') bases = [build === 'spark' ? SPK.base : 'TurbineBlades'];
      let best = null;
      if (ARCH && s === 'core' && IL >= 20) { best = { it: A.newUnique(build === 'spark' ? SPK.uniqueId : 'StormEye', IL) }; }
      else if (build === 'random') { const it = fill(make(kind, pick(bases)), s); best = { it }; }
      else for (const b of bases) { let it; try { it = make(kind, b); } catch (e) { continue; } fill(it, s); if (s === 'wl' || s === 'wr') runesFor(it, ARCH && s === 'wl' ? BP.runeOrder : null); const v = ev({ ...S.equip, [s]: it }); if (!best || v > best.v) best = { v, it }; }
      if (best.it.kind === 'weapon' && !(best.it.mods || []).some(Boolean)) runesFor(best.it, ARCH && s === 'wl' ? BP.runeOrder : null);
      S.equip[s] = best.it;
    }
    A.refreshStats();
    const st = A.STATS;
    const info = { dps: Math.round(spinDps(st)), ehp: Math.round(ehpOf(st)), panel: Math.round(st.dps), stack: (st.weapons.find(x => x && x.whirl) || {}).stackMax || 0, sparkN: (st.weapons.find(x => x && x.spark) || {}).sparkN || 0, res: Math.round(Object.values(st.res).reduce((a, b) => a + b, 0) / 5),
      eq: ['wl', 'wr', 'shield', 'core', 'engine', 'hub'].map(k => S.equip[k] ? (S.equip[k].u || S.equip[k].b) : '-').join(' '),
      runes: (S.equip.wl.mods || []).filter(Boolean).map(m => m.mid).join(','), heart: S.tree.includes(BP.treeKey) };
    // 天梯连打
    S.auto.ai = true; S.auto.loop = false; A.mouse.on = false;
    const dt = 1 / 30; let N = 1, best = 0, tries = 0, last = '';
    while (tries++ < 60) {
      A.LAD.pending = N; S.ladder.chain = false; A.AUTO.last = null; A.startRun();
      let t = 0; while (A.RUN && t < 300) { A.logic(dt); t += dt; }
      if (A.RUN) { A.RUN.result = 'timeout'; A.RUN.ending = 0.01; A.logic(dt); }
      const r = A.AUTO.last; A.G.ui.closeWin(); A.LAD.pending = 0;
      if (!r || r.result !== 'win') { last = `${N} 层${r ? (r.result === 'dead' ? '死亡' : '超时') : '?'}（${Math.round(t)} 秒）`; break; }
      best = N; N += r.lad.jump;
    }
    // 存档：最深层开满，碎片和铸符各给一些，营地设施都已清出
    let snap = null;
    if (DUMP) {
      S.maxDepth = Math.min(A.DATA.progression.run.maxDepth, 66); // 再深这身装备每层要好几分钟 S.depth = S.maxDepth; S.ladder.best = best; S.xp = 0; S.stats.missions = Math.max(S.stats.missions, 200);
      for (const k of BP.craftPref) S.shards[k] = 40; for (const k in S.glyphs) S.glyphs[k] = 6;
      S.campSeen = A.DATA.camp.facilities.map(f => f.id); S.auto = { ...S.auto, loop: false, lock: false, fails: 0, back: false, backWins: 0 };
      snap = JSON.stringify(S);
    }
    // 推关单趟：从第 1 层出发一直往下走，直到灯灭或阵亡（最多 descentMax 秒游戏时间）
    S.auto.lock = true; S.depth = 1; A.AUTO.last = null; A.startRun(1);
    let dt2 = 0; while (A.RUN && dt2 < DMAX) { A.logic(dt); dt2 += dt; }
    if (A.RUN) { A.RUN.result = 'timeout'; A.RUN.ending = 0.01; A.logic(dt); }
    const dr = A.AUTO.last, descent = { t: Math.round(dt2), floors: dr ? dr.descent.floors : 0, res: dr ? dr.result : '?' };
    return { info, best, last, descent, snap };
  }, { build, IL, seed: opt.seed, DMAX: opt.descentMax, DUMP: !!opt.dump });
  fs.unlinkSync(tmp); await b.close();
  const bad = errs.filter(e => !/GPU stall|swiftshader|GroupMarker/.test(e));
  if (bad.length) console.log(bad.join('\n'));
  return out;
}

const mm = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
(async () => {
  const res = {};
  for (const build of opt.builds) for (const IL of opt.levels) {
    const r = await run(build, IL); (res[build] = res[build] || {})[IL] = r;
    if (opt.dump && r.snap) { fs.writeFileSync(path.resolve(opt.dump), r.snap); console.log('存档写到 ' + opt.dump); opt.dump = null; }
    console.log(`${build.padEnd(6)} 物品等级 ${String(IL).padStart(3)}：秒伤 ${String(r.info.dps).padStart(9)}（面板 ${String(r.info.panel).padStart(8)}${r.info.stack ? '，满 ' + r.info.stack + ' 层' : ''}${r.info.sparkN ? '，每串 ' + r.info.sparkN + ' 颗游雷' : ''}）  有效生命 ${String(r.info.ehp).padStart(6)}  平均抗性 ${String(r.info.res).padStart(3)}%  天梯 ${String(r.best).padStart(3)} 层（止于 ${r.last}）  单趟 ${{ lampout: '灯灭', retreat: '撤回', dead: '阵亡', win: '到底', timeout: '超时' }[r.descent.res] || r.descent.res} ${mm(r.descent.t)} 过 ${r.descent.floors} 层${r.info.heart ? (build === 'spark' ? ' 织雷之心' : ' 旋风之心') : ''} | ${r.info.eq} | 符文 ${r.info.runes}`);
  }
  if (opt.builds.length >= 2) {
    const [a, b] = opt.builds; console.log(`\n${a} / ${b}：`);
    for (const IL of opt.levels) { const x = res[a][IL], y = res[b][IL]; console.log(`  物品等级 ${IL}：秒伤 ×${(x.info.dps / y.info.dps).toFixed(2)}  有效生命 ×${(x.info.ehp / y.info.ehp).toFixed(2)}  秒伤×有效生命 ×${(x.info.dps * x.info.ehp / (y.info.dps * y.info.ehp)).toFixed(2)}  天梯 ${x.best} vs ${y.best}  单趟 ${x.descent.floors} 层/${mm(x.descent.t)} vs ${y.descent.floors} 层/${mm(y.descent.t)}`); }
  }
})();
