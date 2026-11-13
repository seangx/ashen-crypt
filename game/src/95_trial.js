/* =========================================================
   毕业形态试玩台（design/endgame-v1.md 1.0，用户 11-13：先做技能石毕业形态的 demo，有吸引力再拆到变体 / 套装 / 神话）
   网址带 ?try=<名字> 打开。不读、不写玩家存档（save() 直接返回）；角色不会死；页面右上角按钮切换“毕业形态 / 原版”对比。
   毕业形态的开关挂在试玩台技能石的 trial 字段上（40_stats 合进 W），正式数据和存档里都没有。
   ========================================================= */
const TRIALS = {
  pounce: { n: '腐爪 · 流光闪斩', gem: 'GemRotClaw', lvl: 20, depth: 25, level: 50, dens: 3.5, cap: 220, weapon: 'TurbineBlades', ilvl: 60, // 怪海要密：一直有怪，闪斩才不断
    trial: { pounce: { T: 0.06, gap: 0.08, rng: 150, over: 10, mul: 1 } } },
};
let TRIAL = null;
try { const q = new URLSearchParams(location.search).get('try'); if (q && TRIALS[q]) TRIAL = q; } catch (e) { }
function trialBoot() {
  if (!TRIAL) return; const D = TRIALS[TRIAL];
  /* S 是 load() 从空档建好的（没读玩家存档） */ UNLOCK_ALL = true; S.level = D.level; S.maxDepth = S.depth = D.depth; S.auto.lock = true; S.auto.loop = true;
  S.equip.wl = newItem('weapon', D.weapon, D.ilvl, 0, 2);
  const T = newTrig('cast', { rar: 2, sock: 4, ilvl: D.ilvl }), g = newGem(D.gem, { lvl: D.lvl }); g.trial = D.trial; T.socks[0] = g; S.trigs = [T, null, null, null];
  setInterval(() => { if (RUN && STATS.life) player.life = STATS.life; if (RUN && !RUN.trialD) { RUN.trialD = 1; RUN.dens *= +(new URLSearchParams(location.search).get('dens')) || D.dens || 1; const cap = +(new URLSearchParams(location.search).get('cap')) || D.cap; if (cap) PROG.run.horde.hardCap = cap; } }, 200); // 不会死；怪更密（看得出清怪手感）；网址可加 &dens=5&cap=400 试更密的怪海（只改内存，不进数据）
  const b = document.createElement('button'), lab = () => `${D.n}：${g.trial ? '毕业形态' : '原版'}（点击切换）`;
  b.textContent = lab(); Object.assign(b.style, { position: 'fixed', top: '6px', right: '6px', zIndex: 99, font: '13px sans-serif', padding: '6px 10px', background: '#1b2042', color: '#ffd36a', border: '1px solid #c8913a', borderRadius: '4px' });
  b.onclick = () => { g.trial = g.trial ? null : D.trial; refreshStats(); b.textContent = lab(); };
  document.body.appendChild(b);
}
