let game = null, Z = 3;
// 像素光标做成系统光标：由浏览器直接绘制，没有一帧的延迟
function makeCursors() {
  const k = Math.max(2, Math.min(4, Math.round(Z * 0.8)));
  const up = (src, ox, oy) => { const c = document.createElement('canvas'); c.width = src.width * k; c.height = src.height * k; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, c.width, c.height); return `url(${c.toDataURL()}) ${ox * k} ${oy * k}`; };
  const cross = document.createElement('canvas'); cross.width = cross.height = 7; const g = cross.getContext('2d');
  g.fillStyle = '#120c18'; g.fillRect(2, 0, 3, 7); g.fillRect(0, 2, 7, 3); g.fillStyle = '#ffe6a0'; g.fillRect(3, 1, 1, 5); g.fillRect(1, 3, 5, 1); g.clearRect(3, 3, 1, 1);
  return { arrow: up(sprite(ART.cursor, '#0d0a12'), 1, 1) + ', default', cross: up(cross, 3, 3) + ', crosshair' };
}
// 先把用到的字形从网络字体里取回来再开游戏（最多等 4 秒，取不到就用系统字体）
async function waitFonts() {
  if (!document.fonts) return;
  const want = [`500 11px "Noto Sans SC"`, `700 11px "Noto Sans SC"`].map(f => document.fonts.load(f, FONT_DATA.chars + '0123456789'));
  try { await Promise.race([Promise.all(want), new Promise(r => setTimeout(r, 4000))]); } catch (e) { }
  // 字体晚到时：清空测宽缓存，重画界面
  document.fonts.addEventListener?.('loadingdone', () => { MW = {}; G.ui && G.ui.refresh(); });
}
// 打开就进示范存档：网址带 ?demo=spark，或页面里预先写了 window.ASH_BOOT_DEMO（tools/standalone.py 打的单文件包）。
// 同一个来源、同一个存档只载入一次（记在 localStorage），之后再打开就是接着玩；第一次载入前照样把原来的进度备份，营地手册“存档”页可以一键恢复。
function bootDemo() {
  let name = null; try { name = new URLSearchParams(location.search).get('demo'); } catch (e) { }
  name = name || window.ASH_BOOT_DEMO; if (!name || !DEMO_SAVES[name]) return;
  const flag = SAVE_KEY + '-booted-' + name; let done = false; try { done = !!localStorage.getItem(flag); } catch (e) { }
  if (done && !new URLSearchParams(location.search).has('fresh')) return;
  try { if (!localStorage.getItem(BACKUP_KEY) && localStorage.getItem(SAVE_KEY)) localStorage.setItem(BACKUP_KEY, localStorage.getItem(SAVE_KEY)); } catch (e) { }
  load({ save: DEMO_SAVES[name] }); save(); try { localStorage.setItem(flag, '1'); } catch (e) { }
}
async function start(data) {
  await waitFonts();
  Z = clamp(Math.round((window.devicePixelRatio || 1) * Math.min(innerWidth / W, innerHeight / H)), 2, 6);
  load(data || {}); bootDemo(); refreshStats();
  if (S.auto.loop) AUTO.nextT = 1; // 上次是自动循环：打开就接着刷
  window.claude?.hot?.snapshot?.(() => ({ save: JSON.stringify(S) }));
  setInterval(() => { if (RUN) save(); }, 10000);
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W * Z, height: H * Z, pixelArt: true, roundPixels: true, backgroundColor: '#0d0a12',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, banner: false, disableContextMenu: true,
    input: { activePointers: 2 }, scene: [Boot, World, MOBILE ? MobileUI : UI],
  });
}
window.__ash = { setPrepOff: v => { PREP_OFF = v; }, setUnlockAll: v => { if (v === 'ev') UNLOCK_EV = true; else UNLOCK_ALL = v; if (v && !S.equip.wr) { const o = guaranteeOff(1); o.rar = 0; o.q = 0; o.affs = []; S.equip.wr = o; refreshStats(); } }, checkUnlocks, GEMS, GEM_BY, newGem, gemPolish, gemSocket, feedGem, skillItem, defEhp, armorDr, typicalHit, setHelp: i => { helpTopic = i; }, loadDemo, restoreBackup, LAD, ladderChallenge, unlocked, DATA_HASH, TREE, treeCanAlloc, DATA, AUTO, autoDriving, BOSSES, lootFx, get LX() { return LX; }, newUnique, UNIQUES, treeStats, modActive, newMod, weaponStats, MOBS, BOSS, WEAPONS, ARMORS, get zones() { return zones; }, get meteors() { return meteors; }, get S() { return S; }, startRun, logic, get RUN() { return RUN; }, mouse, player, computeStats, rollItem, newItem, applyDie: null, salvage, craftAdd, craftUp, craftRefine, craftStrip, addWhy, upWhy, canAdd, AFF, AFF_BY, makeExalted, craftFuse, fuseWhy, feedRune, rollShard, craftable, craftTop, addTier, get STATS() { return STATS; }, refreshStats, get mobs() { return mobs; }, get projs() { return projs; }, equipItem, itemValue, G, findItem, tryDash, save };
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
