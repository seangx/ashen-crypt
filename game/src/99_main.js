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
async function start(data) {
  await waitFonts();
  Z = clamp(Math.round((window.devicePixelRatio || 1) * Math.min(innerWidth / W, innerHeight / H)), 2, 6);
  load(data || {}); refreshStats();
  if (S.auto.loop) AUTO.nextT = 1; // 上次是自动循环：打开就接着刷
  window.claude?.hot?.snapshot?.(() => ({ save: JSON.stringify(S) }));
  setInterval(() => { if (RUN) save(); }, 10000);
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W * Z, height: H * Z, pixelArt: true, roundPixels: true, backgroundColor: '#0d0a12',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, banner: false, disableContextMenu: true,
    input: { activePointers: 2 }, scene: [Boot, World, UI],
  });
}
window.__ash = { setHelp: i => { helpTopic = i; }, loadDemo, restoreBackup, LAD, ladderChallenge, unlocked, DATA_HASH, TREE, treeCanAlloc, DATA, AUTO, autoDriving, newMap, BOSSES, lootFx, get LX() { return LX; }, newUnique, equipChip, chipIn, UNIQUES, treeStats, modActive, newMod, weaponStats, MOBS, BOSS, WEAPONS, ARMORS, get zones() { return zones; }, get S() { return S; }, startRun, logic, get RUN() { return RUN; }, mouse, player, computeStats, rollItem, newItem, applyDie: null, salvage, craftAdd, craftUp, craftRefine, craftStrip, addWhy, upWhy, canAdd, AFF, AFF_BY, makeExalted, craftFuse, fuseWhy, feedRune, rollShard, craftable, craftTop, addTier, get STATS() { return STATS; }, refreshStats, get mobs() { return mobs; }, get projs() { return projs; }, equipItem, itemValue, G, findItem, tryDash, save };
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
