/* 推层模拟：无头浏览器里跑真实的游戏逻辑。走位、冲刺、自动循环和自动推层都用游戏自己的自动战斗（src/52_auto.js，参数在 data/auto.json），
   这个脚本只负责在两局之间换装、插符文、点天赋。
   用法：node tools/sim.js [--runs 30 | --minutes 60] [--seed 1] [--gear auto|none] [--tree auto|none] [--lock] [--html ashen-crypt.html] [--json out.json] [--build whirl|random] [--ladder every:5|every:10m] [--ladderCap 3] [--override 路径=值 ...] [--seeds 1,2,3] [--par 3 | --serial]
     --minutes     按游戏内时间跑（包括每局之间的结算时间），代替 --runs
     --lock        锁定层数（不自动推层）
     --gear none   从不换装（检查“不换装备能不能一直推”）
     --tree auto   每局结束后把天赋点按固定顺序点掉（离起点最近的先点）
     --seed        随机种子；同一份数据、同一个种子，结果完全一样
     --craft auto  两局之间用铁砧：先熔铸（解锁后）；每个部位挑背包里物品等级和品质最高的 3 件底材做装，比身上好就换上；再拆掉背包里的装备（印记、独特除外），然后给身上每件装备反复做“秒伤 × (护甲 + 灵障)”提升最大的加词条 / 升档，直到没有提升或潜力用完；有希望符就附带
     --build whirl 旋风斩流派：天赋先走到旋风之心（mechanics.json 的 whirl.treeKey），左手只拿回旋骨刃，符文按 whirl.runeOrder 插，做装按 whirl.craftPref 的词条族优先级
     --build random 乱配对照：天赋随机点，做装随机挑词条族
     --ladder every:K  天梯开放后，每 K 局推层打一次天梯最高层（开着连打：赢了接着打新的最高层，输了回推层）
   需要 playwright（容器里一般在 /opt/node22/lib/node_modules/playwright）。Phaser 用 tools/vendor/ 里的本地副本。 */
const path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..');
const opt = { runs: +arg('runs', 30), seed: +arg('seed', 1), gear: arg('gear', 'auto'), tree: arg('tree', 'none'), html: path.resolve(ROOT, arg('html', 'ashen-crypt.html')), json: arg('json', null), maxT: +arg('maxT', 3600), minutes: +arg('minutes', 0), ladderArg: arg('ladder', ''), craft: arg('craft', 'none'), build: arg('build', 'none'), lock: process.argv.includes('--lock') };
// 天梯：every:K = 每 K 趟推关排一次；every:10m = 每 10 分钟游戏时间排一次（每次最多连打 ladderCap 局）。--build whirl/random 默认 every:10m
{ const la = opt.ladderArg || (['whirl', 'random'].includes(opt.build) ? 'every:10m' : ''), v = (la.split(':')[1] || '');
  opt.ladder = /m$/.test(v) ? 0 : +v || 0; opt.ladderMin = /m$/.test(v) ? parseFloat(v) : 0; opt.ladderCap = +arg('ladderCap', 3); }

// --seeds 1,2,3：每个种子跑一遍（并行的子进程），打印各自的汇总和中位数
const seedsArg = arg('seeds', null);
if (seedsArg) {
  const { spawn } = require('child_process'), seeds = seedsArg.split(',').map(Number);
  // 同时最多跑 --par 个（默认 3，太多会崩）；--serial 等于 --par 1
  const par = process.argv.includes('--serial') ? 1 : +arg('par', 3);
  const base = process.argv.slice(2).filter((a, i, all) => !(a === '--seeds' || all[i - 1] === '--seeds' || a === '--seed' || all[i - 1] === '--seed' || a === '--par' || all[i - 1] === '--par' || a === '--serial'));
  const one = sd => new Promise(res => { let buf = ''; const ch = spawn(process.execPath, [__filename, ...base, '--seed', String(sd)], { env: { ...process.env, ASH_SEEDS_CHILD: '1' } }); ch.stdout.on('data', d => buf += d); ch.stderr.on('data', d => buf += d); ch.on('close', () => res({ sd, buf })); });
  const out = [], queue = [...seeds];
  Promise.all(Array.from({ length: Math.min(par, seeds.length) }, async () => { while (queue.length) { const sd = queue.shift(); out.push(await one(sd)); } })).then(() => out.sort((a, b) => a.sd - b.sd))
    .then(all => {
      const K = [['push', '推层'], ['ladder', '天梯'], ['runs', '推关趟数'], ['tMed', '单趟中位秒'], ['flMed', '单趟层数中位'], ['lampout', '灯灭'], ['retreat', '撤回'], ['emergency', '紧急撤回'], ['dead', '阵亡'], ['itemsH', '带回装备/时'], ['salvH', '分解/时'], ['shardsH', '捡碎片/时'], ['salvShardsH', '分解碎片/时'], ['lostItems', '阵亡丢装备'], ['minHp', '每层最低血中位%'], ['minHpFront', '最深层附近最低血中位%'], ['devilPct', '小旋风伤害占比%']];
      const rows = all.map(({ sd, buf }) => { const m = buf.match(/^SUMMARY (.*)$/m); if (!m) { console.log(`种子 ${sd} 出错：\n${buf.slice(-2000)}`); return null; } return { sd, v: JSON.parse(m[1]) }; }).filter(Boolean);
      for (const r of rows) console.log(`种子 ${r.sd}：` + K.map(([k, n]) => `${n} ${r.v[k]}`).join('，'));
      const med = k => { const a = rows.map(r => r.v[k]).sort((x, y) => x - y); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : 0; };
      console.log(`中位数：` + K.map(([k, n]) => `${n} ${med(k)}`).join('，'));
      const pct = (k, q) => { const a = rows.map(r => r.v[k]).sort((x, y) => x - y); if (!a.length) return 0; const i = (a.length - 1) * q, lo = Math.floor(i); return +(a[lo] + (a[Math.min(lo + 1, a.length - 1)] - a[lo]) * (i - lo)).toFixed(1); };
      console.log(`四分位（p25 / 中位 / p75）：` + [['push', '推层'], ['ladder', '天梯']].map(([k, n]) => `${n} ${pct(k, 0.25)} / ${med(k)} / ${pct(k, 0.75)}`).join('，'));
    });
} else
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
  const html = require('./override').applyOverrides(fs.readFileSync(opt.html, 'utf8'), require('./override').overridesFrom(process.argv));
  const tmp = path.join(require('os').tmpdir(), 'ash-sim-' + process.pid + '.html');
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`);
  await p.goto('file://' + tmp);
  await p.waitForFunction(() => window.__ash && window.__ash.G.ui, null, { timeout: 20000 });
  const out = await p.evaluate(opt => {
    const A = window.__ash; A.G.fx = false; window.__reseed(opt.seed * 7919 + 1);
    const S = A.S; const rows = [];
    if (A.G.ui.closeWin) A.G.ui.closeWin();
    const WH = A.DATA.mechanics.whirl, B = opt.build;
    const spinDps = n => n.weapons.reduce((s, w) => s + (w ? w.dps * (w.spinMax || 1) : 0), 0); // 旋转满层的秒伤
    const ehpOf = n => { const w = n.weapons.find(x => x && x.whirl); const dr = 1 - (1 - (w ? Math.min(WH.drCap, WH.drPerStack * w.stackMax) / 100 : 0)) * (1 - (n.weapons.some(x => x && x.meleeGuard) ? A.DATA.mechanics.defense.meleeGuardLess : 0)); return A.defEhp(n, A.S.depth, Math.min(0.6, dr)); } // 有效生命：(生命 + 护盾 + 护盾回复×5) ÷ (1 − 护甲减伤 − 流派减伤) // 减伤合计在分数里最多算 60%; // 旋转满层减伤算进有效生命
    const score = () => spinDps(A.STATS) + ehpOf(A.STATS);
    const evS = eq => { const n = A.computeStats(eq); return spinDps(n) + ehpOf(n); };
    // 比较武器时把身上那把的符文挪过去再算；换上以后旧武器的符文退回符文袋，后面重新插
    const withMods = (it, cur) => ({ ...it, mods: Array(it.sock || 0).fill(null).map((_, i) => ((cur && cur.mods) || [])[i] || null) });
    const swapIn = (it, slot) => { const cur = S.equip[slot]; A.equipItem(it, slot); if (cur && cur.mods) { for (const m of cur.mods) if (m) S.mods.push(m); cur.mods = cur.mods.map(() => null); } A.refreshStats(); };
    const placeRunes = () => {
      // 旋风斩：左手的符文按 runeOrder 重排（同名取等级高的）
      if (B === 'whirl' && S.equip.wl && S.equip.wl.sock) {
        const w = S.equip.wl, pool = [...w.mods.filter(Boolean), ...S.mods], rank = m => { const i = WH.runeOrder.indexOf(m.mid); return (i < 0 ? 99 : i) * 100 - m.lvl; };
        const pickd = []; for (const m of pool.sort((a, b) => rank(a) - rank(b))) { if (pickd.length >= w.sock) break; if (A.modActive(m, w) && !pickd.some(x => x.mid === m.mid)) pickd.push(m); }
        w.mods = Array(w.sock).fill(null).map((_, i) => pickd[i] || null); S.mods = pool.filter(m => !pickd.includes(m)); A.refreshStats();
      }
      // 符文：先插武器 / 头冠 / 遁靴（生效才插），剩下的塞进法阵
      if (opt.gear === 'auto') for (const m of [...S.mods]) {
        let placed = false;
        for (const s of ['wl', 'wr', 'core', 'engine', 'hub']) { const w = S.equip[s]; if (!w || !w.sock) continue; const k = w.mods.indexOf(null); if (k < 0) continue; if (s === 'hub' || A.modActive(m, w)) { w.mods[k] = m; placed = true; break; } }
        if (placed) S.mods = S.mods.filter(x => x !== m);
      }
    };
    const fits = (it, s) => B !== 'whirl' || it.kind !== 'weapon' || (s === 'wl') === (it.b === 'TurbineBlades');
    // 选做装动作：默认按“秒伤 × 有效生命”贪心；whirl 按词条族优先级；random 随机
    const pickAct = (it, s, ev, mid) => {
      const acts = [];
      for (const a of A.AFF) if ((S.shards[a.k] || 0) > 0 && !A.addWhy(it, a.k)) acts.push({ add: a.k, k: a.k });
      it.affs.forEach((x, i) => { if (!A.upWhy(it, i)) acts.push({ up: i, k: x.k }); });
      if (!acts.length) return null;
      if (B === 'random') return acts[Math.floor(Math.random() * acts.length)];
      // whirl 严格按 craftPref：先按顺序把空位填满（SpinCap、SoulLess 这类贪心看不出价值的也填），再按顺序升档
      if (B === 'whirl') { const r = a => { const i = WH.craftPref.indexOf(a.k); return i < 0 ? 1e9 : (a.add ? 0 : 1000) + i; }; const best = acts.reduce((b, a) => r(a) < r(b) ? a : b); return r(best) < 1e9 ? best : null; }
      const base = ev({ ...S.equip, [s]: it }); let best = null;
      for (const act of acts) { const cl = { ...it, affs: it.affs.map(x => ({ ...x })) };
        if (act.add) { const a = A.AFF_BY[act.add], t = A.addTier(a, it); cl.affs.push({ k: a.k, t, v: mid(a, t) }); } else { const y = cl.affs[act.up]; y.t++; y.v = mid(A.AFF_BY[y.k], y.t); }
        const v = ev({ ...S.equip, [s]: cl }); if (v > base * 1.001 && (!best || v > best.v)) best = { v, act }; }
      return best && best.act;
    };
    const dt = 1 / 30; let simT = 0, pushes = 0, ladLeft = 0, ladNextT = 0; const crafts = { add: 0, up: 0, shatter: 0, fuse: 0 };
    S.auto.ai = true; S.auto.loop = true; S.auto.lock = opt.lock; A.mouse.on = false;
    S.salvage = { rar: [...A.DATA.camp.salvage.rar], old: A.DATA.camp.salvage.old, fav: null, on: opt.craft === 'auto' }; // 分解祭坛：--craft auto 时用默认规则
    A.startRun();
    for (let r = 0; opt.minutes ? simT < opt.minutes * 60 : r < opt.runs; r++) {
      while (!A.RUN) { A.logic(dt); simT += dt; } // 结算倒计时
      const L = A.RUN.L, depth = S.depth, mode = A.RUN.mode; let t = 0, minArmor = 1;
      while (A.RUN && t < opt.maxT) { A.logic(dt); t += dt; simT += dt; if (A.RUN && !A.RUN.ending) minArmor = Math.min(minArmor, A.player.life / A.STATS.life); }
      if (A.RUN) { A.RUN.result = 'timeout'; A.RUN.ending = 0.01; A.logic(dt); }
      const res = A.AUTO.last ? A.AUTO.last.result : '?';
      const soulE = t > 0 ? A.player.soulEmpty : 0; // 这局魂火见底的秒数
      A.G.ui.closeWin();
      // 换装：分数（秒伤 + 护甲 + 灵障）变高就换
      if (opt.gear === 'auto') for (const it of [...S.stash]) {
        if (it.kind === 'chip') continue;
        let slot = it.kind === 'weapon' ? (S.equip.wr ? (A.itemValue(it) > A.itemValue(S.equip.wl) ? 'wl' : 'wr') : 'wr') : it.kind;
        if (B === 'whirl' && it.kind === 'weapon') { slot = it.b === 'TurbineBlades' ? 'wl' : 'wr'; if (slot === 'wl' && !(S.equip.wl && S.equip.wl.b === 'TurbineBlades')) { swapIn(it, 'wl'); continue; } }
        const cur = S.equip[slot]; if (!cur) { A.equipItem(it, slot); continue; }
        if (it.kind === 'weapon') { if (evS({ ...S.equip, [slot]: withMods(it, cur) }) > evS(S.equip)) swapIn(it, slot); continue; }
        const before = score(); A.equipItem(it, slot); if (score() < before) A.equipItem(cur, slot);
      }
      placeRunes();
      const canAlloc = A.treeCanAlloc || window.treeCanAlloc;
      if (opt.tree === 'auto' && canAlloc) {
        const ids = Object.keys(A.TREE.nodes).sort((a, b) => { const na = A.TREE.nodes[a], nb = A.TREE.nodes[b]; return (na.x * na.x + na.y * na.y) - (nb.x * nb.x + nb.y * nb.y) || (a < b ? -1 : 1); });
        // whirl：先沿最短路走到旋风之心
        const route = () => { if (S.tree.includes(WH.treeKey)) return null; const prev = { start: null }, q = ['start', ...S.tree]; for (const x of S.tree) prev[x] = null; while (q.length) { const c = q.shift(); if (c === WH.treeKey) break; for (const n of A.TREE.nodes[c].nb) if (!(n in prev)) { prev[n] = c; q.push(n); } } let c = WH.treeKey; while (prev[c] && !S.tree.includes(prev[c]) && prev[c] !== 'start') c = prev[c]; return canAlloc(c) ? c : null; };
        let go = true; while (go) { go = false;
          if (B === 'random') { const c = ids.filter(id => canAlloc(id)); if (c.length) { S.tree.push(c[Math.floor(Math.random() * c.length)]); go = true; } continue; }
          const r = B === 'whirl' ? route() : null; if (r) { S.tree.push(r); go = true; continue; }
          for (const id of ids) if (canAlloc(id)) { S.tree.push(id); go = true; break; } }
      }
      // 铁砧（贪心）
      if (opt.craft === 'auto') {
        // 灯火秒数（粗算，不算击杀回复）：上限 ÷ (这层的燃烧 + 满层旋转的消耗)，推关做装按 秒伤 × 有效生命 × 灯火秒数
        const lightOf = n => { const w = n.weapons.find(x => x && x.whirl), SO = A.DATA.mechanics.soul; return n.soulMax / (SO.burn + S.maxDepth * SO.burnPerFloor + (w ? WH.soulPerSec * (1 - n.soulLess) : 0)); };
        const ev = eq => { const n = A.computeStats(eq); return spinDps(n) * ehpOf(n) * lightOf(n); };
        const mid = (a, t) => { const v = a.tiers[t][0]; return a.pair ? [Math.round((v[0] + v[1]) / 2), Math.round((v[2] + v[3]) / 2)] : v.length === 1 ? v[0] : Math.round((v[0] + v[1]) / 2); };
        const slots = ['wl', 'wr', 'shield', 'core', 'engine', 'hub'];
        if (A.unlocked('fuse')) for (const s of slots) { const u = S.equip[s]; if (!u || !u.u || u.leg || !(u.lp > 0)) continue; const rs = S.stash.filter(x => x.kind === u.kind && x.rar === 2 && !x.u).sort((a, b) => b.affs.length - a.affs.length); if (rs.length) { A.craftFuse(u, rs[0]); crafts.fuse++; } }
        if (A.unlocked('craft')) {
          const addT = A.addTier;
          const craftOn = (it, s) => {
            for (let guard = 0; guard < 40; guard++) {
              if (!it || !A.craftable(it) || !(it.fp > 0)) break;
              const act = pickAct(it, s, ev, mid); if (!act) break;
              const hope = (S.glyphs.hope || 0) > 0;
              if (act.add) { A.craftAdd(it, act.add, hope); crafts.add++; } else { A.craftUp(it, act.up, hope, false); crafts.up++; }
            }
          };
          // 新底材：每个部位挑物品等级最高的 3 件，做完比身上的好就换上
          for (const s of slots) {
            const kind = s === 'wl' || s === 'wr' ? 'weapon' : s;
            const cands = S.stash.filter(x => x.kind === kind && fits(x, s) && A.craftable(x) && x.fp > 0).sort((a, b) => (b.ilvl + b.q * 5) - (a.ilvl + a.q * 5)).slice(0, 3);
            for (const it of cands) { craftOn(it, s); const cur = ev(S.equip); if (ev({ ...S.equip, [s]: kind === 'weapon' ? withMods(it, S.equip[s]) : it }) > cur) { kind === 'weapon' ? swapIn(it, s) : A.equipItem(it, s); crafts.swap = (crafts.swap || 0) + 1; } }
            A.refreshStats();
          }
          for (const it of [...S.stash]) if (it.kind !== 'chip' && !it.u) { A.salvage(it); crafts.shatter++; }
          for (const s of slots) {
            for (let guard = 0; guard < 40; guard++) {
              const it = S.equip[s]; if (!it || !A.craftable(it) || !(it.fp > 0)) break;
              const act = pickAct(it, s, ev, mid); if (!act) break;
              const hope = (S.glyphs.hope || 0) > 0;
              if (act.add) { A.craftAdd(it, act.add, hope); crafts.add++; } else { A.craftUp(it, act.up, hope, false); crafts.up++; }
              A.refreshStats();
            }
          }
        }
      }
      placeRunes(); A.refreshStats();
      if (S.stash.length > 60) S.stash.splice(0, S.stash.length - 60);
      // 天梯：每 K 局推层排一次最高层（连打）
      if (mode !== 'ladder') pushes++;
      if (mode === 'ladder' && --ladLeft <= 0) { S.ladder.chain = false; A.LAD.pending = 0; } // 这次天梯打满 ladderCap 局就停
      const ladDue = opt.ladderMin ? simT >= ladNextT : opt.ladder && mode !== 'ladder' && pushes % opt.ladder === 0;
      if (ladDue && mode !== 'ladder' && A.unlocked('ladder') && !A.LAD.pending) { S.ladder.chain = true; A.LAD.pending = S.ladder.unlocked; ladLeft = opt.ladderMin ? opt.ladderCap : 1e9; ladNextT = simT + opt.ladderMin * 60; }
      const lr = A.AUTO.last;
      rows.push({ soulE, mode, dmg: lr.dmg || { whirl: 0, devil: 0 }, mins: lr.descent && lr.descent.mins || [], fl: lr.descent ? lr.descent.floors : 0, got: { items: lr.gain.items.length, shards: lr.gain.shards }, salv: lr.salv || { n: 0, shards: 0 }, lost: lr.lost || { items: 0, mods: 0, shards: 0 }, lad: mode === 'ladder' ? { t: Math.round(lr.t), jump: lr.lad ? lr.lad.jump : 0, unlocked: S.ladder.unlocked, best: S.ladder.best } : null, run: r + 1, L, depth, next: S.depth, back: S.auto.back, res, t: Math.round(t), min: Math.round(simT / 60), kills: S.stats.kills, lv: S.level, maxDepth: S.maxDepth, dps: Math.round(spinDps(A.STATS)), wf: (S.equip.wl && S.equip.wl.mods.some(m => m && m.mid === 'Whirl') ? '旋' : '') + (S.tree.includes(WH.treeKey) ? '心' : '') + (Object.values(S.equip).some(it => it && it.u === 'StormEye') ? '眼' : ''), armor: A.STATS.armor, deflect: A.STATS.deflect, minHp: Math.round(minArmor * 100),
        eq: ['wl', 'wr', 'shield', 'core', 'engine', 'hub'].map(k => S.equip[k] ? `${S.equip[k].b}/q${S.equip[k].q}/r${S.equip[k].rar}` : '-').join(' '),
        shards: Object.values(S.shards).reduce((a, b) => a + b, 0), glyphs: Object.values(S.glyphs).reduce((a, b) => a + b, 0), crafts: { ...crafts }, mods: S.mods.length + Object.values(S.equip).reduce((n, it) => n + (it && it.mods ? it.mods.filter(Boolean).length : 0), 0) });
    }
    return rows;
  }, opt);
  const RES_N = { lampout: '灯灭', retreat: '撤回', emergency: '紧急撤回', dead: '阵亡', win: '到底', timeout: '超时' };
  const lastC = out.length ? out[out.length - 1].crafts : null;
  for (const r of out) if (r.mode === 'ladder') console.log(`#${String(r.run).padStart(3)} ${String(r.min).padStart(4)}分 天梯${String(r.L).padStart(3)}层 ${r.res.padEnd(7)} ${String(r.lad.t).padStart(3)}s ${r.res === 'win' ? '跳+' + r.lad.jump : '    '} 解锁到${String(r.lad.unlocked).padStart(3)} 最高${String(r.lad.best).padStart(3)} 等级${String(r.lv).padStart(3)} 秒伤${String(r.dps).padStart(8)} 护甲${String(r.armor).padStart(7)} 最低血${String(r.minHp).padStart(4)}% 魂空${String(Math.round(r.soulE / Math.max(1, r.t) * 100)).padStart(3)}%`); else console.log(`#${String(r.run).padStart(3)} ${String(r.min).padStart(4)}分 第${String(r.depth).padStart(3)}层起 过${String(r.fl).padStart(3)}层 ${(RES_N[r.res] || r.res).padEnd(2, '　')} 下次${String(r.next).padStart(3)}${r.back ? '退' : ' '} ${String(r.t).padStart(4)}s 等级${String(r.lv).padStart(3)} 秒伤${String(r.dps).padStart(8)} 护甲${String(r.armor).padStart(7)} 灵障${String(r.deflect).padStart(6)} 最低血${String(r.minHp).padStart(4)}% 魂空${String(Math.round(r.soulE / Math.max(1, r.t) * 100)).padStart(3)}% 碎片${String(r.shards).padStart(4)} 铸符${String(r.glyphs).padStart(3)} 符文${String(r.mods).padStart(3)} ${(r.wf || '').padEnd(3, '　')}| ${r.eq}`);
  const lads = out.filter(r => r.mode === 'ladder'); out.splice(0, out.length, ...out.filter(r => r.mode !== 'ladder'));
  if (lads.length) console.log(`\n天梯 ${lads.length} 局，通过 ${lads.filter(r => r.res === 'win').length}；最高 ${lads[lads.length - 1].lad.best} 层，解锁到 ${lads[lads.length - 1].lad.unlocked} 层。`);
  const deaths = out.filter(r => r.res === 'dead' || r.res === 'timeout');
  // 推关一趟的分布：时长、层数、结束原因，以及每小时带回的东西（阵亡丢掉的已经扣掉）
  if (out.length) {
    const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
    const ts = out.map(r => r.t), fs_ = out.map(r => r.fl), hrs = ts.reduce((a, b) => a + b, 0) / 3600;
    const bucket = [[0, 60, '<1分'], [60, 180, '1–3分'], [180, 600, '3–10分'], [600, 1200, '10–20分'], [1200, 1e9, '>20分']].map(([a, b, n]) => `${n} ${out.filter(r => r.t >= a && r.t < b).length}`).join('，');
    const cause = Object.entries(out.reduce((o, r) => (o[RES_N[r.res] || r.res] = (o[RES_N[r.res] || r.res] || 0) + 1, o), {})).map(([k, n]) => `${k} ${n}`).join('，');
    const keptI = out.reduce((a, r) => a + r.got.items - r.lost.items, 0), keptS = out.reduce((a, r) => a + r.got.shards - r.lost.shards, 0), lostI = out.reduce((a, r) => a + r.lost.items, 0);
    console.log(`\n推关 ${out.length} 趟：时长 中位 ${q(ts, 0.5)}s（25% ${q(ts, 0.25)}s，75% ${q(ts, 0.75)}s，最长 ${Math.max(...ts)}s）；${bucket}`);
    console.log(`每趟通过层数：中位 ${q(fs_, 0.5)}（25% ${q(fs_, 0.25)}，75% ${q(fs_, 0.75)}，最多 ${Math.max(...fs_)}）；结束原因：${cause}`);
    { const all = out.flatMap(r => r.mins), fr = all.filter(x => x[2]); console.log(`每层最低血量中位：全部 ${q(all.map(x => x[1]), 0.5) ?? '-'}%，最深层附近 ${fr.length ? q(fr.map(x => x[1]), 0.5) : '-'}%（${fr.length} 层）`); }
    const salvN = out.reduce((a, r) => a + r.salv.n, 0), salvS = out.reduce((a, r) => a + r.salv.shards, 0);
    console.log(`每小时（推关时间）带回：装备 ${(keptI / hrs).toFixed(0)} 件，词条碎片 ${(keptS / hrs).toFixed(0)} 个；分解祭坛分解 ${(salvN / hrs).toFixed(0)} 件、得碎片 ${(salvS / hrs).toFixed(0)} 个；阵亡共丢装备 ${lostI} 件`);
  }
  { const all = [...out, ...lads], se = all.reduce((a, r) => a + r.soulE, 0), st = all.reduce((a, r) => a + r.t, 0); console.log(`魂火见底时间占比：${(se / Math.max(1, st) * 100).toFixed(1)}%（推层 ${(out.reduce((a, r) => a + r.soulE, 0) / Math.max(1, out.reduce((a, r) => a + r.t, 0)) * 100).toFixed(1)}%，天梯 ${(lads.reduce((a, r) => a + r.soulE, 0) / Math.max(1, lads.reduce((a, r) => a + r.t, 0)) * 100).toFixed(1)}%）`); }
  { const a = [...out, ...lads], w = a.reduce((x, r) => x + r.dmg.whirl, 0), d = a.reduce((x, r) => x + r.dmg.devil, 0); if (w + d) console.log(`旋风斩伤害：小旋风占 ${(d / (w + d) * 100).toFixed(1)}%`); }
  if (opt.craft === 'auto' && lastC) console.log(`铁砧：换上自制 ${lastC.swap||0} 次，加词条 ${lastC.add} 次，升档 ${lastC.up} 次，拆解 ${lastC.shatter} 件，熔铸 ${lastC.fuse} 次。`);
  console.log(`\n${out.length} 局，游戏内 ${out.length ? out[out.length - 1].min : 0} 分钟：最深第 ${out.length ? out[out.length - 1].maxDepth - 1 : 0} 层通关；阵亡 ${deaths.length} 趟${deaths.length ? '（首次从第 ' + deaths[0].depth + ' 层出发，第 ' + deaths[0].run + ' 局）' : ''}。`);
  if (process.env.ASH_SEEDS_CHILD) { // --seeds 的子进程：给父进程一行机器可读的汇总
    const q = (a, f) => { const t = [...a].sort((x, y) => x - y); return t.length ? t[Math.min(t.length - 1, Math.floor(f * t.length))] : 0; }, hrs = out.reduce((a, r) => a + r.t, 0) / 3600 || 1;
    const cnt = k => out.filter(r => r.res === k).length;
    console.log('SUMMARY ' + JSON.stringify({ push: out.length ? out[out.length - 1].maxDepth - 1 : 0, ladder: lads.length ? lads[lads.length - 1].lad.best : 0, runs: out.length, tMed: q(out.map(r => r.t), 0.5), flMed: q(out.map(r => r.fl), 0.5),
      lampout: cnt('lampout'), retreat: cnt('retreat'), emergency: cnt('emergency'), dead: cnt('dead'), salvH: Math.round(out.reduce((a, r) => a + r.salv.n, 0) / hrs), salvShardsH: Math.round(out.reduce((a, r) => a + r.salv.shards, 0) / hrs), itemsH: Math.round(out.reduce((a, r) => a + r.got.items - r.lost.items, 0) / hrs), shardsH: Math.round(out.reduce((a, r) => a + r.got.shards - r.lost.shards, 0) / hrs), lostItems: out.reduce((a, r) => a + r.lost.items, 0),
      minHp: q(out.flatMap(r => r.mins.map(x => x[1])), 0.5), minHpFront: q(out.flatMap(r => r.mins.filter(x => x[2]).map(x => x[1])), 0.5), devilPct: (() => { const a = [...out, ...lads], w = a.reduce((x, r) => x + r.dmg.whirl, 0), d = a.reduce((x, r) => x + r.dmg.devil, 0); return Math.round(d / Math.max(1, w + d) * 100); })() }));
  }
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(out, null, 1));
  const bad = errs.filter(e => !/GPU stall|swiftshader|GroupMarker/.test(e));
  if (bad.length) console.log(bad.join('\n'));
  fs.unlinkSync(tmp);
  await b.close();
})();
