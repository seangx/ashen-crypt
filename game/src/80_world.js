/* ---------- 场景：Boot ---------- */
function newCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  create() { buildTextures(this); this.scene.start('world'); this.scene.launch('ui'); }
}

/* ---------- 场景：World（地窖与战斗） ---------- */
class World extends Phaser.Scene {
  constructor() { super('world'); }
  create() {
    G.world = this; this.cameras.main.setZoom(Z).centerOn(W / 2, H / 2);
    this.roomTex = this.textures.exists('room') ? this.textures.get('room') : this.textures.createCanvas('room', VW, VH);
    this.roomImg = this.add.image(0, 0, 'room').setOrigin(0).setDepth(0); this.roomL = null;
    this.cameras.main.setRoundPixels(true);
    // 无限场地：平铺地砖（跟着相机挪，纹理偏移 = 相机位置，所以地面不动）+ 按区块生成的装饰 + 固定在屏幕上的暗角
    this.floorTS = Array.from({ length: 9 }, () => this.add.image(0, 0, 'px').setOrigin(0).setDepth(0).setVisible(false)); // 3×3 块地砖图拼起来盖住视野
    this.chunks = new Map(); this.chunkN = 0;
    const vt = this.textures.exists('vig') ? this.textures.get('vig') : this.textures.createCanvas('vig', W, H); drawVignette(vt.getContext()); vt.refresh();
    this.vig = this.add.image(0, 0, 'vig').setOrigin(0).setDepth(1).setVisible(false);
    this.wallG = this.add.graphics().setDepth(5);
    if (this.renderer.type === Phaser.WEBGL && CryptFX) {
      // 彩色光照：半分辨率的光照图，先填冷色环境光，再叠加各个光源；用“两倍正片叠底”盖在场景上（0.5 = 原色，更亮的地方会提亮）
      const gl = this.renderer.gl; this.MUL2 = this.renderer.addBlendMode([gl.DST_COLOR, gl.SRC_COLOR], gl.FUNC_ADD);
      this.lightRT = this.add.renderTexture(0, 0, LW, LHt).setOrigin(0).setScale(2).setDepth(50).setBlendMode(this.MUL2);
      this.lightRT.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      try { this.renderer.pipelines.addPostPipeline('CryptFX', CryptFX); } catch (e) { }
      this.cameras.main.setPostPipeline('CryptFX'); const pp = this.cameras.main.getPostPipeline('CryptFX'); this.post = Array.isArray(pp) ? pp[0] : pp;
      this.glowG = this.add.graphics().setDepth(57.5).setBlendMode(Phaser.BlendModes.ADD); // 弹道的光晕和拖尾
    } else {
      this.lightTex = this.textures.exists('light') ? this.textures.get('light') : this.textures.createCanvas('light', LW, LHt);
      this.lightImg = this.add.image(0, 0, 'light').setOrigin(0).setScale(2).setDepth(50);
    }
    this.glows = SCONCES.map(s => this.add.image(s.x, s.y + 2, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(51));
    this.heroGlow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(51).setScale(1.1);
    this.barG = this.add.graphics().setDepth(52);
    this.lootG = this.add.graphics().setDepth(55);
    this.projG = this.add.graphics().setDepth(58);
    this.groundG = this.add.graphics().setDepth(8.5);
    this.whirlG = this.add.graphics().setDepth(9.8); // 旋风的月牙刀光：画在怪下面（怪挡住刀光），不再叠加在怪身上发白 // 贴地的范围圈（在影子和怪下面）
    this.fxG = this.add.graphics().setDepth(59);
    this.hero = this.add.image(0, 0, 'hero_0').setOrigin(0.5, 1);
    this.heroSh = this.add.image(0, 0, 'shadow').setDepth(9);
    this.hubG = this.add.graphics().setDepth(9.2);
    this.spr = new Map(); this.frame = 0; this.lines = []; this.rings = []; this.dmgCount = 0; this.trail = [];
    const P = (cfg, depth = 30) => this.add.particles(0, 0, 'px', { emitting: false, ...cfg }).setDepth(depth);
    this.scorch = [];
    this.em = {
      bone: P({ lifespan: { min: 350, max: 800 }, speed: { min: 30, max: 90 }, angle: { min: 200, max: 340 }, gravityY: 260, tint: [0xece3cb, 0xb9ad94, 0x7d7262] }),
      bossdie: P({ lifespan: { min: 500, max: 1200 }, speed: { min: 40, max: 140 }, angle: { min: 190, max: 350 }, gravityY: 200, tint: [0xece3cb, 0x7a55a0, 0xffd75e] }),
      spark: P({ lifespan: 220, speed: { min: 15, max: 45 } }, 60),
      // 打击火花（2 像素、叠加发光）和骨屑
      spark2: this.add.particles(0, 0, 'px2', { emitting: false, lifespan: { min: 90, max: 230 }, speed: { min: 30, max: 110 }, scale: { start: 1, end: 0.3 }, alpha: { start: 1, end: 0 }, gravityY: 140, blendMode: 'ADD' }).setDepth(60),
      chip: this.add.particles(0, 0, 'px2', { emitting: false, lifespan: { min: 400, max: 800 }, speed: { min: 40, max: 110 }, angle: { min: 200, max: 340 }, gravityY: 320, scale: { start: 1, end: 0.5 }, tint: [0xece3cb, 0xb9ad94, 0xfff6dc] }).setDepth(30),
      fire: P({ lifespan: { min: 250, max: 450 }, speed: { min: 10, max: 40 }, gravityY: -30, tint: [0xff9a3d, 0xffd36a, 0xe8533a] }, 60),
      loot: P({ lifespan: 500, speedY: -14, speedX: 0, alpha: { start: 1, end: 0 } }, 56),
    };
    const cv = this.game.canvas;
    // 直接监听画布的原生事件：鼠标在 UI 按钮上时 Phaser 不会把移动事件传到下层场景
    const nat = e => { const r = cv.getBoundingClientRect(); const x = clamp((e.clientX - r.left) / r.width * W, 0, W), y = clamp((e.clientY - r.top) / r.height * H, 0, H); const d = Math.hypot(x - mouse.x, y - mouse.y); mouse.x = x; mouse.y = y; if (e.pointerType === 'touch') mouse.touch = true; else mouse.on = true; return d; };
    // 在场地上动鼠标或触摸：接管角色（几秒不动后回到自动）
    const onField = () => !MOBILE && RUN && !(G.ui && G.ui.winId) && mouse.y > TOP_H && mouse.y < BOT_Y;
    cv.addEventListener('pointermove', e => { const d = nat(e); if (onField()) autoTouch(e.pointerType === 'touch' ? -1 : d); });
    cv.addEventListener('pointerdown', e => { ac(); nat(e); if (onField() && (e.pointerType === 'touch' || e.button === 2)) autoTouch(-1); if (e.button === 2) tryDash(); });
    cv.addEventListener('pointerleave', () => { mouse.on = false; }); cv.addEventListener('pointerenter', () => { mouse.on = true; });
  }
  // 震屏有冷却，只在大事件上用
  hitStop(d, cd = 0.35) { if (!G.fx || G.time < (this.stopCd || 0)) return; this.stopUntil = G.time + d; this.stopCd = G.time + cd; } // 有冷却，打 Boss 时不会一直卡
  shake(ms, amt) { if (!G.fx || G.time < (this.shakeT || 0)) return; this.shakeT = G.time + 0.6; this.cameras.main.shake(ms, amt); }
  dmgText(x, y, str, col, big) {
    if (this.dmgCount > 30) return; this.dmgCount++;
    // 伤害数字复用文字对象，避免每次都新建纹理
    this.dmgPool ??= { n: [], b: [] }; const pool = big ? this.dmgPool.b : this.dmgPool.n;
    const t = (pool.pop() || T(this, 0, 0, '', { size: 'num', scale: big ? 1.7 : 1 })).setText(str).setPosition(Math.round(x + rf(-3, 3)), Math.round(y)).setOrigin(0.5, 1).setTint(hex(col)).setDepth(70).setAlpha(1).setVisible(true);
    this.tweens.add({ targets: t, y: y - 10, duration: big ? 700 : 500, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: big ? 400 : 280, duration: 260, onComplete: () => { t.setVisible(false); pool.push(t); this.dmgCount--; } });
  }
  label(x, y, s, c) {
    const t = T(this, x, y, s, { size: 8, color: c, align: 'center' }).setDepth(72);
    this.tweens.add({ targets: t, y: y - 10, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }
  update(_, delta) {
    const dt = Math.min(0.05, delta / 1000); G.time += dt; this.dt = dt;
    if (G.time >= (this.stopUntil || 0)) logic(dt); // 顿帧：世界停几十毫秒，画面照常
    if (!RUN) camSnap();
    if (MOBILE && this.mobileView()) {} else {
    const vw = RUN ? AW : VW, vcy = RUN ? VIEW_CY : (TOP_H + BOT_Y) / 2; // 营地是固定的 480×270 房间
    this.cx = Math.round(CAM.x + vw / 2 - W / 2); this.cy = Math.round(CAM.y + vcy - SCR_CY); this.cameras.main.centerOn(this.cx + W / 2, this.cy + H / 2); // 相机跟着角色，按整像素对齐
    }

    this.consume();
    this.render(dt);
  }
  // 手机「全景」：把整条 480 宽的战斗视野缩放进竖屏（上下留黑边）；「跟随」= 270 宽的跟随视野。只改相机，不碰玩法
  mobileView() {
    const pano = false, k = 1; // 手机场地就是竖屏战斗区，不再需要「全景」
    if (this.vk !== k) { this.vk = k; this.cameras.main.setZoom(Z * k); }
    if (!pano) return false;
    this.cx = Math.round(CAM.x); this.cy = Math.round(CAM.y + VIEW_CY - SCR_CY / k); this.cameras.main.centerOn(this.cx + VW / 2, this.cy + H / k / 2);
    return true;
  }
  // 处理战斗逻辑产生的表现事件
  consume() {
    for (const e of fxq) {
      switch (e.t) {
        case 'num': this.dmgText(e.x, e.y, fmt(e.v), e.hurt ? COL.bad : e.crit ? COL.emberHi : ELEM_C[e.el], e.crit); break;
        case 'text': this.label(e.x, e.y, e.s, e.c); break;
        case 'beam': this.lines.push({ ...e, life: 0.09, jag: e.el === 'ele' }); break;
        case 'bolt': this.lines.push({ ...e, life: 0.15, jag: true }); break;
        case 'chest': this.rings.push({ x: e.x, y: e.y - 4, r: 46, life: 0.5, max: 0.5, el: 'exp', fill: false }, { x: e.x, y: e.y - 4, r: 26, life: 0.35, max: 0.35, el: 'pla', fill: true }); this.em.spark2.particleTint = 0xffd24a; this.em.spark2.explode(24, e.x, e.y - 6); { const t = T(this, e.x, e.y - 34, `Boss 宝箱 ×${e.n}`, { size: 12, scale: 1.5, color: COL.emberHi, align: 'center' }).setDepth(73); if (t.setStroke) t.setStroke('#1a0f08', 4); this.tweens.add({ targets: t, y: e.y - 50, duration: 1400, ease: 'Cubic.out' }); this.tweens.add({ targets: t, alpha: 0, delay: 1100, duration: 500, onComplete: () => t.destroy() }); } sfx('rare'); this.cameras.main.shake(120, 0.004); break; /* Boss 统一掉落：金色爆环 + 火花 + 件数 */
        case 'frostburst': this.rings.push({ x: e.x, y: e.y, r: e.r, life: 0.3, max: 0.3, el: 'cold', fill: false }); this.em.spark2.particleTint = 0x6fb4e8; this.em.spark2.explode(6, e.x, e.y); break; /* 冰封球终爆：冷色环 + 冰屑，不放火花、不闪白 */
        case 'boom': this.rings.push({ x: e.x, y: e.y, r: e.r, life: 0.25, max: 0.25, el: e.el, fill: true }); this.em.fire.explode(10, e.x, e.y); this.em.spark2.particleTint = hex(ELEM_C[e.el]); this.em.spark2.explode(8, e.x, e.y); if (this.post) this.post.waves.push({ x: e.x, y: e.y, r: e.r * 1.4 + 16, k: 1, life: 0.35, t0: G.time }); break;
        case 'ring': this.rings.push({ x: e.x, y: e.y, r: e.r, life: 0.18, max: 0.18, el: e.el }); break;
        case 'shield': this.rings.push({ x: e.x, y: e.y - 6, r: 11, life: 0.2, max: 0.2, el: 'cyan' }); break;
        case 'cone': { const n = 4; for (let i = 0; i < n; i++) { const a = e.a + rf(-0.5, 0.5), d = rf(8, e.r); this.em.fire.explode(1, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d); } break; }
        case 'sflash': if (this.rings.length < 40) this.rings.push({ x: e.x, y: e.y, r: 5, life: 0.08, max: 0.08, el: 'flash' }); break;
        case 'sarc': // 弹射（连锁，照流放之路 2 闪电箭）：沿真实弹射路线的锯齿电弧，每帧重新抖
          if (this.lines.length < 120) for (const [x2, y2] of e.ts) this.lines.push({ x1: e.x, y1: e.y, x2, y2, life: rf(0.15, 0.24), arc: 1 });
          if (this.rings.length < 40) this.rings.push({ x: e.x, y: e.y, r: 6, life: 0.1, max: 0.1, el: 'flash' });
          this.em.spark2.particleTint = 0xd8f4ff; this.em.spark2.explode(3, e.x, e.y); break;
        case 'freeze': // 冻结：冰蓝闪一下 + 碎冰粒子
          if (this.rings.length < 40) this.rings.push({ x: e.x, y: e.y, r: 9, life: 0.2, max: 0.2, el: 'cold' });
          this.em.spark2.particleTint = 0x9fe3ff; this.em.spark2.explode(6, e.x, e.y); if (this.em.chip) this.em.chip.explode(2, e.x, e.y); break;
        case 'bounce': // 弹射：投射物在场边反弹时的小火花
          if (this.rings.length < 40) this.rings.push({ x: e.x, y: e.y, r: 6, life: 0.1, max: 0.1, el: 'flash' });
          this.em.spark2.particleTint = 0xd8f4ff; this.em.spark2.explode(4, e.x, e.y); break;
        case 'hit': this.em.spark2.particleTint = hex(ELEM_C[e.el]); this.em.spark2.explode(2, e.x, e.y); break;
        case 'impact': this.em.spark2.particleTint = hex(e.crit ? '#ffe6a0' : ELEM_C[e.el]); this.em.spark2.explode(e.big ? (e.crit ? 10 : 4) : 4, e.x, e.y); if (e.crit) this.em.chip.explode(e.big ? 4 : 1, e.x, e.y); if (e.big && e.crit) this.hitStop(0.05, 1.2); break;
        case 'burn': this.em.fire.explode(2, e.x, e.y - 6); break;
        case 'die': if (e.boss) { this.em.bossdie.explode(60, e.x, e.y - 12); this.shake(300, 0.01); this.hitStop(0.09); } else { this.em.bone.explode(e.elite ? 6 : 2, e.x, e.y - 6); this.em.chip.explode(e.elite ? 12 : 2, e.x, e.y - 6); if (e.elite) { this.hitStop(0.06); this.shake(90, 0.002); } } break;
        case 'pick': this.em.spark.particleTint = 0xfff2c8; this.em.spark.explode(4, e.x, e.y - 4); break;
        case 'orbitHit': break;
        case 'meteorHit': { this.scorch.push({ x: e.x, y: e.y, r: e.r, life: 6, max: 6, sd: Math.random() * 100 | 0 }); if (this.scorch.length > 40) this.scorch.shift(); // 陨石落地：白闪 + 火球爆开 + 碎石、火星飞溅 + 一道冲击波；星坠雨多颗时震屏限频
          if (G.time - (this.mFlash || 0) > 0.2) { this.mFlash = G.time; this.rings.push({ x: e.x, y: e.y, r: e.r * 0.25, life: 0.08, max: 0.08, el: 'exp', fill: true }); } /* 只在落点中心一小团橙闪、限频（以前白色大实心圆，十几颗同时落地整屏一闪一闪） */ this.rings.push({ x: e.x, y: e.y, r: e.r * 1.15, life: 0.32, max: 0.32, el: 'exp' });
          this.em.fire.explode(16, e.x, e.y - 2); this.em.chip.particleTint = 0x5a3020; this.em.chip.explode(10, e.x, e.y - 2); this.em.spark2.particleTint = 0xffb040; this.em.spark2.explode(14, e.x, e.y - 3);
          if (this.post) this.post.waves.push({ x: e.x, y: e.y, r: e.r * 1.3, k: 0.5, life: 0.28, t0: G.time });
          if (G.time - (this.mShake || 0) > 0.4) { this.mShake = G.time; this.shake(80, 0.003); } /* 震屏限频、减弱 */ break; }
        case 'slam': this.rings.push({ x: e.x, y: e.y, r: e.r, life: 0.25, max: 0.25, el: 'exp', fill: true }); this.shake(90, 0.004); this.em.chip.explode(6, e.x, e.y); break;
        case 'wcut': { const a = e.a + Math.PI / 2 + rf(-0.4, 0.4), c = Math.cos(a) * 4, sn = Math.sin(a) * 4; this.lines.push({ x1: e.x - c, y1: e.y - sn, x2: e.x + c, y2: e.y + sn, el: 'kin', life: 0.07 }); break; } // 旋风砍中：一道斜切 + 碎屑，代替整只怪发白
        case 'spike': this.lines.push({ x1: e.x, y1: e.y + 1, x2: e.x, y2: e.y - 9, el: e.el, life: 0.12 }); this.em.bone.explode(2, e.x, e.y - 2); break;
      }
    }
    fxq.length = 0;
  }
  render(dt) {
    const L = RUN ? RUN.L : S.depth; const theme = RUN ? themeFor(L) : THEMES[0];
    // 不在任务里就是营地：底图按解锁了哪些设施重画
    const open = Object.fromEntries(CAMP.facilities.map(f => [f.id, facOpen(f)])), key = RUN ? L : 'camp' + CAMP.facilities.map(f => +open[f.id]).join('');
    if (this.roomL !== key) {
      if (RUN) { // 换层：重画地砖、清掉旧区块装饰
        if (this.textures.exists('floorT')) this.textures.remove('floorT');
        const fc = newCanvas(FLOOR_TW, FLOOR_TH); drawFloorTile(fc.getContext('2d'), theme, L * 7919 + 13); this.textures.addCanvas('floorT', fc); this.floorTS.forEach(im => im.setTexture('floorT')); // 用新画布：Phaser 的 CanvasPool 复用旧画布不清空，会留下暗块
        this.clearChunks(); this.theme = theme;
      } else { drawCamp(this.roomTex.getContext(), open); this.roomTex.refresh(); this.clearChunks(); }
      this.roomL = key;
    }
    this.roomImg.setVisible(!RUN); this.floorTS.forEach(im => im.setVisible(!!RUN)); this.vig.setVisible(!!RUN).setPosition(this.cx, this.cy); if (MOBILE) this.vig.setScale(1 / (this.vk || 1)); // 跟相机走（缩放相机下 scrollFactor 0 会错位） this.glows.forEach(gl => gl.setVisible(!RUN));
    const pano = MOBILE && this.vk !== 1, cx = pano ? Math.round(CAM.x) : this.cx, cy = pano ? Math.round(CAM.y) : this.cy, decoL = RUN ? this.syncChunks(L, cx, cy, pano ? VW : W, pano ? VH : H) : []; // 视野附近的蜡烛、火盆（世界坐标）
    if (RUN) { const fx0 = Math.floor(cx / FLOOR_TW) * FLOOR_TW, fy0 = Math.floor(cy / FLOOR_TH) * FLOOR_TH; this.floorTS.forEach((im, k) => im.setPosition(fx0 + (k % 3) * FLOOR_TW, fy0 + (k / 3 | 0) * FLOOR_TH)); }
    const SC = RUN ? [] : SCONCES;
    const t = G.time; this.frame++;
    const g = this.wallG; g.clear();
    for (const s of SC) flame(g, s.x, s.y - 1, t);
    for (const d of decoL) if (d.s === 2) flame(g, d.x, d.y, t); else { const h = 2 + ((t * 9 + d.x) | 0) % 2; g.fillStyle(0xff9a3d, 1).fillRect(d.x - 1, d.y - h, 2, h); g.fillStyle(0xffe7a0, 1).fillRect(d.x - 1, d.y - 1, 1, 1); }
    if (!RUN) campFx(g, t, open);
    // 玩家
    const fr = (t * 4 | 0) % 2, bob = Math.round(Math.sin(t * 3) * 1);
    { const wi = STATS.weapons.findIndex(w => w && w.whirl), n = wi >= 0 && RUN ? player.spin[wi].n : 0; this.spinRate = n > 0 ? 2 + 2 * n / STATS.weapons[wi].stackMax : 0; } // 每秒转几圈：旋势越高越快
    const sig = dollSig(S.equip);
    if (sig !== this.dollSig) { // 装备变了：重画纸娃娃
      this.dollSig = sig; this.dollN = (this.dollN || 0) + 1;
      for (const f of [0, 1]) { const cv = dollCanvas(S.equip, f); for (const [k, c] of [['doll_', cv], ['doll_fl_', silhouette(cv, '#ffffff')]]) { const key = k + f; if (this.textures.exists(key)) this.textures.remove(key); this.textures.addCanvas(key, c); } }
      for (const v of [1, 2]) { const key = 'doll_v' + v; if (this.textures.exists(key)) this.textures.remove(key); this.textures.addCanvas(key, dollCanvas(S.equip, 0, v)); } // 转身用的侧面、背面
      this.hero.setTexture('doll_0'); if (this.heroCS && this.heroCS.cs) this.heroCS.cs.setTexture('doll_0'); G.ui && G.ui.dollChanged && G.ui.dollChanged(); // 影子也要换到新纹理，旧的已经删掉
    }
    // 旋风斩转身：正 → 侧 → 背 → 另一侧，一圈 4 帧；身后拖两个旧帧的淡残影
    const SPIN = [['doll_0', false], ['doll_v1', false], ['doll_v2', false], ['doll_v1', true]], ph = this.spinRate ? (this.spinPh = (this.spinPh || 0) + dt * this.spinRate * 4) : 0;
    const hk = this.spinRate ? SPIN[(ph | 0) % 4][0] : (player.fbT > 0.12 ? 'doll_fl_' : 'doll_') + fr;
    if (this.hero.texture.key !== hk || this.dollDirty !== this.dollN) { this.hero.setTexture(hk); this.dollDirty = this.dollN; }
    if (player.chill > 0) this.hero.setTint(0xb8e6ff); else if (this.hero.isTinted) this.hero.clearTint(); // 角色被冰缓
    this.hero.setPosition(player.x, player.y + (this.spinRate ? 0 : bob)).setFlipX(this.spinRate ? SPIN[(ph | 0) % 4][1] : player.face < 0).setDepth(ySort(player.y)).setAlpha(player.dashT > 0 ? 0.5 : 1);
    if (!this.spinGh) this.spinGh = [0, 1].map(i => this.add.image(0, 0, 'doll_0').setOrigin(0.5, 1).setTintFill(0x7a2a1a));
    this.spinGh.forEach((gh, i) => { if (!this.spinRate) return gh.setVisible(false); const s = SPIN[((ph | 0) + 3 - i) % 4]; gh.setVisible(true).setTexture(s[0]).setFlipX(s[1]).setPosition(player.x + Math.cos(-ph * Math.PI / 2 - i) * (i + 1) * 1.5, player.y).setDepth(ySort(player.y) - 0.01).setAlpha(0.4 - i * 0.15); });
    this.heroSh.setPosition(player.x, player.y + 1);
    { const hub = S.equip.hub, hg = this.hubG; hg.clear(); if (hub) { const b = baseOf(hub); const c = hex(b.el ? ELEM_C[b.el] : b.mass ? '#e9e0c9' : b.energy ? '#c08aff' : '#57e0d0'); const n = 22; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + t * 0.7; hg.fillStyle(c, 0.35 + 0.3 * Math.sin(i * 1.3 + t * 3)); hg.fillRect(Math.round(player.x + Math.cos(a) * 9), Math.round(player.y + 1 + Math.sin(a) * 3), 1, 1); } } }
    if (player.dashT > 0 && this.frame % 2 === 0) {
      const ghost = this.add.image(player.x, player.y, 'doll_fl_' + fr).setOrigin(0.5, 1).setTint(0x7a55a0).setAlpha(0.5).setDepth(9.5).setFlipX(player.face < 0);
      this.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
    }
    // 实体
    const bar = this.barG; bar.clear();
    for (const m of mobs) this.syncMob(m, bar, t);
    for (const dp of drops) this.syncDrop(dp, t);
    for (const [ent, o] of this.spr) if (o.seen !== this.frame) { o.img.destroy(); o.sh && o.sh.destroy(); o.cs && o.cs.destroy(); this.spr.delete(ent); }
    // 掉落光柱
    const lg = this.lootG; lg.clear();
    for (const dp of drops) if ((dp.kind === 'item' && dp.item.rar > 0) || dp.kind === 'map') this.beam(lg, dp, t);
    // 投射物、环绕刃
    const pg = this.projG; pg.clear(); this.groundG.clear(); this.whirlG.clear(); if (this.glowG) this.glowG.clear();
    for (const p of projs) this.drawProj(pg, p, t);
    STATS.weapons.forEach((W_, wi) => {
      if (!W_ || W_.form !== 'orbit') return;
      // 回旋骨刃：有旋势时人在转（刀光圈 + 风）；没有时每次砍中画一道横扫
      const n = W_.whirl ? player.spin[wi].n : 0, R = whirlR(W_, n);
      if (n > 0) { const f = n / W_.stackMax; whirlFx(this.groundG, this.whirlG, this.glowG, player.x, player.y, R, f, t, STATS.flag.areaEye, Math.PI / 2 - (this.spinPh || 0) * Math.PI / 2 + 0.5); if (f >= 1 && this.post && G.time - (this.wPulse || 0) > 0.55) { this.wPulse = G.time; this.post.waves.push({ x: player.x, y: player.y, r: R + 10, k: 0.45, life: 0.3, t0: G.time }); } } // 满层：每圈一道空气冲击波
      else if (player.swing[wi] > 0) { const k = player.swing[wi] / 0.18, a0 = (player.face < 0 ? Math.PI : 0) - 2.4 + (1 - k) * 4.8; for (let s2 = 0; s2 < 16; s2++) { const q = s2 / 16, an = a0 - q * 2.2; pg.fillStyle(0xdfe6ee, 0.8 * k * (1 - q)); pg.fillRect(Math.round(player.x + Math.cos(an) * R), Math.round(player.y - 6 + Math.sin(an) * R * 0.4), 2, 1); } }
    });
    // 红圈重击：地上一片红，外圈实线，内圈从外往里收，收到中心就砸下
    for (const m of mobs) if (m.slam) enemySlamFx(this.groundG, pg, m.slam, t); // 敌方重击：暗红紫的警告样式（玩家的陨石是暖橙金）
    for (const sc of this.scorch) scorchFx(this.groundG, sc, t, dt); this.scorch = this.scorch.filter(s => s.life > 0); // 陨石砸过的焦痕
    for (const M of meteors) meteorFx(this, this.groundG, pg, this.glowG, M, t); // 陨石：预警圈 + 斜着落下的火石（参考暗黑 2 / 3）
    for (const z of zones) if (z.devil) { const a = Math.min(1, z.t * 2); if (this.glowG) devilFx(this.groundG, this.glowG, z.x, z.y + 2, z.r, t, z.seed, a); else tornado(pg, z.x, z.y + 2, z.r * 1.6, z.r * 1.2, t, z.seed, a * 0.85); } // 旋风之心甩出的小旋风
    for (const z of zones) if (z.fire) fireGroundFx(this, this.groundG, pg, this.glowG, z, t); // 火地：焦土 + 跳动的火舌
    for (const z of zones) { if (z.devil || z.fire) continue; const c = z.enemy && z.el !== 'nuc' ? 0xff3a7a : hex(ELEM_C[z.el]); if (z.enemy) { const ea = Math.min(1, z.t); pg.fillStyle(z.el === 'nuc' ? 0x2f5a22 : 0x4a0a30, (z.el === 'nuc' ? 0.35 : 0.4) * ea).fillEllipse(z.x, z.y, z.r * 2, z.r * 1.2); pg.lineStyle(1, z.el === 'nuc' ? 0x6ad040 : 0xd02060, 0.7 * ea).strokeEllipse(z.x, z.y, z.r * 2, z.r * 1.2); } /* 敌方地面区域：毒池绿、骨法师火圈按元素色 */ const n = Math.max(10, z.r * 1.5 | 0); pg.fillStyle(c, z.vortex ? 0.8 : 0.45); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (z.vortex ? t * 6 : 0), rr = z.r * (z.vortex ? 0.4 + 0.6 * ((i * 7) % 5) / 5 : (0.5 + 0.5 * Math.abs(Math.sin(i * 1.7 + t * 3)))); pg.fillRect(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr * 0.6, 1, 1); } }
    for (const W_ of STATS.weapons) if (W_ && W_.form === 'aura') { const c = hex(ELEM_C[W_.el]); const n = 28; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + t * 0.8; pg.fillStyle(c, 0.25 + 0.25 * Math.sin(i + t * 4)); pg.fillRect(player.x + Math.cos(a) * W_.rng, player.y - 2 + Math.sin(a) * W_.rng * 0.6, 1, 1); } }
    // 特效线与环
    const fg = this.fxG; fg.clear();
    for (const l of this.lines) { l.life -= dt; if (l.arc) { arcFx(fg, this.glowG, l); continue; } const c = hex(ELEM_C[l.el] || '#ffffff'); fg.fillStyle(c, 1); if (l.jag) jag(fg, l.x1, l.y1, l.x2, l.y2); else { pline(fg, l.x1, l.y1, l.x2, l.y2); fg.fillStyle(0xffffff, 0.8); pline(fg, l.x1, l.y1 - 1, l.x2, l.y2 - 1); } }
    this.lines = this.lines.filter(l => l.life > 0);
    for (const r of this.rings) {
      r.life -= dt; const k = 1 - r.life / r.max; const rr = r.r * (0.4 + 0.6 * k); const c = r.el === 'cyan' ? 0x57e0d0 : r.el === 'flash' ? 0xe8fbff : hex(ELEM_C[r.el]);
      if (r.fill) { fg.fillStyle(c, 0.25 * (1 - k)); fg.fillCircle(r.x, r.y, rr); }
      fg.fillStyle(c, 1 - k); const n = Math.max(12, rr * 2 | 0); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; fg.fillRect(r.x + Math.cos(a) * rr - .5, r.y + Math.sin(a) * rr * 0.75 - .5, 1, 1); }
    }
    this.rings = this.rings.filter(r => r.life > 0);
    if (RUN) { // 屏幕外的 Boss、稀有掉落：屏幕边上画个小箭头指过去
      const tg = mobs.filter(m => m.boss && !m.dead).map(m => [m, 0xff5a4a]).concat(drops.filter(d => (d.kind === 'item' && d.item.rar >= 2) || d.kind === 'map' || d.kind === 'glyph').map(d => [d, hex(d.item ? icol(d.item) : '#ffd36a')]));
      for (const [o, c] of tg) { if (!offView(o, -4) || (MOBILE && this.vk !== 1)) continue; this.edgeArrow(fg, o.x, o.y - 6, c, t); }
    }
    // 光照：每个光源有颜色；WebGL 下画进彩色光照图，否则沿用旧的暗部遮罩
    const fl = 1 + Math.sin(t * 9) * .04 + Math.sin(t * 23) * .03;
    const WARM = 0xff9a4a, lights = SC.map(s => ({ x: s.x, y: s.y + 6, r2: (64 * fl) ** 2, i: .75, c: WARM }));
    for (const d of decoL) if (lights.length < 8) lights.push({ x: d.x, y: d.y + 2, r2: ((d.s === 2 ? 70 : 34) * fl) ** 2, i: d.s === 2 ? .75 : .5, c: WARM });
    lights.push({ x: player.x + player.face * 4, y: player.y - 6, r2: (110 * fl) ** 2, i: .38, c: 0x7fd0e0 }); // 提灯亡魂身上的青色魂光
    if (!RUN) { const gt = FAC_BY.gate; lights.push({ x: gt.x - 36, y: gt.y - 14, r2: (46 * fl) ** 2, i: .6, c: WARM }, { x: gt.x + 36, y: gt.y - 14, r2: (46 * fl) ** 2, i: .6, c: WARM }, { x: 240, y: 178, r2: (80 * fl) ** 2, i: .75, c: 0xffa050 });
      const FC = { altar: 0xc08aff, runes: 0x57e0d0, stele: 0xffd36a };
      for (const id of ['altar', 'runes', 'stele', 'chest', 'anvil', 'statue']) if (open[id]) lights.push({ x: FAC_BY[id].x, y: FAC_BY[id].y - 12, r2: id === 'altar' ? 900 : 620, i: .35, c: FC[id] || 0xd0a070 }); }
    for (const m of mobs) if ((m.burn > 1 || m.boss) && lights.length < 18) lights.push({ x: m.x, y: m.y - 6, r2: m.boss ? 1600 : 420, i: .4, c: m.boss ? 0xc23a5a : 0xff7a3a });
    for (const r of this.rings) if (r.fill && lights.length < 22) lights.push({ x: r.x, y: r.y, r2: (r.r * 1.5) ** 2, i: .6, c: hex(ELEM_C[r.el] || '#ffd36a') });
    for (const dp of drops) if (dp.kind === 'item' && dp.item.rar >= 1 && lights.length < 24) lights.push({ x: dp.x, y: dp.y - 8, r2: 520, i: .45, c: hex(icol(dp.item)) });
    if (this.lightRT) {
      const rt = this.lightRT; rt.setPosition(cx, cy); rt.fill(RUN ? 0x34324c : 0x2e2c44);
      for (const l of lights) rt.stamp('ldisc', null, (l.x - cx) / 2, (l.y - cy) / 2, { scale: Math.sqrt(l.r2) / 64, tint: l.c, alpha: l.i * 0.85, blendMode: Phaser.BlendModes.ADD });
      // 热浪：墙上的火把、营地的火盆和篝火
      const hz = SC.map(s => ({ x: s.x, y: s.y - 6, w: 6, h: 18 })); for (const d of decoL) if (d.s === 2) hz.push({ x: d.x, y: d.y - 6, w: 6, h: 18 });
      if (!RUN) { const gt = FAC_BY.gate; hz.push({ x: gt.x - 36, y: gt.y - 18, w: 8, h: 26 }, { x: gt.x + 36, y: gt.y - 18, w: 8, h: 26 }, { x: 240, y: 176, w: 9, h: 28 }); }
      this.post.hazes = hz;
    } else { const amb = RUN ? 0.4 : 0.32; this.lightImg.setPosition(cx, cy); renderLight(this.lightTex.getContext(), lights.map(l => ({ ...l, x: l.x - cx, y: l.y - cy })), amb, theme.fog); this.lightTex.refresh(); }
    this.glows.forEach(gl => gl.setAlpha(.16 * fl));
    this.heroGlow.setPosition(player.x + player.face * 4, player.y - 6).setAlpha((this.lightRT ? .07 : .14) * fl);
    // 投影：火把、营地火光把角色和怪的影子投到地上；怪的影子也背着提灯亡魂的光
    const casters = [...SC, ...decoL.filter(d => d.s === 2)].map(s => ({ x: s.x, y: s.y + 6, r: 140 }));
    if (!RUN) casters.push({ x: FAC_BY.gate.x - 36, y: FAC_BY.gate.y - 10, r: 100 }, { x: FAC_BY.gate.x + 36, y: FAC_BY.gate.y - 10, r: 100 }, { x: 240, y: 180, r: 120 });
    this.heroCS = this.heroCS || {}; this.castShadow(this.heroCS, this.hero.texture.key, player.x, player.y + bob, player.face < 0, casters);
    const mc = [...casters, { x: player.x, y: player.y + 2, r: 115 }];
    for (const m of mobs) { const o = this.spr.get(m); if (o) this.castShadow(o, o.key, o.img.x, m.y + 1, m.face < 0, mc); }
  }
  // 屏幕边缘的指向箭头（世界坐标画，位置贴着视野边）
  edgeArrow(g, x, y, c, t) {
    const cx = this.cx + W / 2, cy = this.cy + SCR_CY, dx = x - cx, dy = y - cy, a = Math.atan2(dy, dx), hw = W / 2 - 8, hh = (MOBILE ? MBOT - MTOP : BOT_Y - TOP_H) / 2 - 8;
    const k = Math.min(hw / Math.max(1e-6, Math.abs(dx)), hh / Math.max(1e-6, Math.abs(dy))), px = Math.round(cx + dx * k), py = Math.round(cy + dy * k), ux = Math.cos(a), uy = Math.sin(a), b = 1 + 0.5 * Math.sin(t * 8);
    g.fillStyle(0x0d0a12, 0.8).fillTriangle(px + ux * 6, py + uy * 6, px - uy * 5 - ux * 3, py + ux * 5 - uy * 3, px + uy * 5 - ux * 3, py - ux * 5 - uy * 3);
    g.fillStyle(c, 0.7 + 0.3 * Math.sin(t * 8)).fillTriangle(px + ux * 5 * b, py + uy * 5 * b, px - uy * 3 - ux * 2, py + ux * 3 - uy * 2, px + uy * 3 - ux * 2, py - ux * 3 - uy * 2);
  }
  // 无限地面的装饰区块：视野周围的区块按（层, 区块坐标）定随机种子生成，离开视野就回收
  syncChunks(L, cx, cy, w = W, h = H) {
    const i0 = Math.floor((cx - 8) / CHUNK), i1 = Math.floor((cx + w + 8) / CHUNK), j0 = Math.floor((cy - 8) / CHUNK), j1 = Math.floor((cy + h + 8) / CHUNK), want = new Set(), out = [];
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const key = L + ':' + i + ':' + j; want.add(key); let c = this.chunks.get(key);
      if (!c) { const tk = 'chunk_' + (this.chunkN++), cv = newCanvas(CHUNK, CHUNK); const ls = drawChunkDecor(cv.getContext('2d'), this.theme || themeFor(L), (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(L, 83492791)) >>> 0); this.textures.addCanvas(tk, cv);
        c = { tk, img: this.add.image(i * CHUNK, j * CHUNK, tk).setOrigin(0).setDepth(0.5), lights: ls.map(l => ({ ...l, x: l.x + i * CHUNK, y: l.y + j * CHUNK })) }; this.chunks.set(key, c); }
      for (const l of c.lights) if (l.x > cx - 40 && l.x < cx + w + 40 && l.y > cy - 40 && l.y < cy + h + 40) out.push(l);
    }
    for (const [key, c] of this.chunks) if (!want.has(key)) { c.img.destroy(); this.textures.remove(c.tk); this.chunks.delete(key); }
    return out;
  }
  clearChunks() { for (const c of this.chunks.values()) { c.img.destroy(); this.textures.remove(c.tk); } this.chunks.clear(); }
  // 一个影子：取最近的强光源，把精灵压扁、翻过来、朝背光方向铺在地上
  castShadow(o, key, x, y, flip, list) {
    if (!this.lightRT) return;
    let best = null;
    for (const l of list) { const dx = x - l.x, dy = y - l.y, d = Math.hypot(dx, dy * 1.3); if (d < 6) continue; const k = 1 - d / l.r; if (k > 0 && (!best || k > best.k)) best = { a: Math.atan2(dy, dx), k }; }
    if (!o.cs) o.cs = this.add.image(0, 0, key).setOrigin(0.5, 1).setTintFill(0x000000).setDepth(9.1);
    if (!best) { o.cs.setVisible(false); return; }
    if (o.cs.texture.key !== key) o.cs.setTexture(key);
    o.cs.setVisible(true).setPosition(Math.round(x), Math.round(y)).setRotation(best.a - Math.PI / 2).setScale(flip ? -1 : 1, -(0.45 + 0.35 * (1 - best.k))).setAlpha(0.4 * Math.min(1, best.k * 2.5));
  }
  drawProj(g, p, t) {
    // 光晕 + 短拖尾（叠加发光层）
    const gg = this.glowG;
    if (gg && p.oshard) { gg.fillStyle(0x3f86c8, 0.06).fillCircle(p.x, p.y, 1.5); } /* 冰锥只给一点点光，几十片叠加也不会糊成白团 */
    else if (gg && p.orb) { gg.fillStyle(0x2a6fb0, 0.07).fillCircle(p.x, p.y, 8); }
    else if (gg && !p.mine && !p.spark) {
      const c = p.enemy ? 0xff5a4a : hex(ELEM_C[p.el]), y0 = p.lob ? p.y - p.z : p.y, tr = p._tr || (p._tr = []);
      tr.unshift(p.x, y0); if (tr.length > 12) tr.length = 12;
      for (let i = 2; i < tr.length; i += 2) { gg.fillStyle(c, 0.4 * (1 - i / 12)); gg.fillCircle(tr[i], tr[i + 1], 2 - i * 0.1); }
      gg.fillStyle(c, 0.22); gg.fillCircle(p.x, y0, 5); gg.fillStyle(c, 0.45); gg.fillCircle(p.x, y0, 2.5);
    }
    if (p.enemy) { g.fillStyle(0x120c18, 1).fillRect(p.x - 2, p.y - 2, 4, 4); g.fillStyle(hex(ELEM_C[p.el]), 1).fillRect(p.x - 1, p.y - 1, 2, 2); return; }
    const c = hex(ELEM_C[p.el]);
    if (p.lob) { g.fillStyle(0x000000, 0.35).fillRect(p.x - 2, p.y, 4, 1); const y = p.y - p.z; g.fillStyle(0x120c18, 1).fillRect(p.x - 2, y - 2, 5, 5); g.fillStyle(0x8f5d36, 1).fillRect(p.x - 1, y - 1, 3, 3); g.fillStyle(0xffd36a, 1).fillRect(p.x, y - 3, 1, 2); return; }
    if (p.sthrow) { const k = p.age * 14; g.fillStyle(0x6a4a10, 1).fillEllipse(p.x, p.y, 13, 9 + 3 * Math.sin(k)); g.fillStyle(0xffd860, 1).fillEllipse(p.x, p.y, 10, 6 + 3 * Math.sin(k)); g.fillStyle(0xfff6c0, 1).fillCircle(p.x, p.y, 1.8); return; } // 飞盾
    if (p.orb) { /* 寒魄球（参考暗黑 2/3 冰封球）：外层冷雾 + 三条旋臂 + 冰晶本体 + 旋转冰棱 + 闪烁冰屑；只用冷色，和敌方红紫区分开 */
      const sp = p.age * 7, x = p.x, y = p.y;
      const tr = p.tr || (p.tr = []); tr.unshift(x, y); if (tr.length > 16) tr.length = 16;
      for (let i = 2; i < tr.length; i += 2) g.fillStyle(0x3f86c8, 0.12 * (1 - i / 16)).fillCircle(tr[i], tr[i + 1], 4 - i * 0.15);
      g.fillStyle(0x24508f, 0.1).fillCircle(x, y, 9);
      for (let arm = 0; arm < 3; arm++) for (let j = 1; j <= 5; j++) { const a = sp + arm * 2.094 + j * 0.45, r = 3 + j * 1.5; g.fillStyle(j > 3 ? 0x4f9ed8 : 0x8fcff0, 0.7 - j * 0.1).fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1); }
      g.fillStyle(0x163f73, 0.95).fillCircle(x, y, 5); g.fillStyle(0x3f8fd0, 0.9).fillCircle(x, y, 4); g.fillStyle(0x7cc4ec, 0.9).fillCircle(x - 0.5, y - 0.5, 2.2);
      for (let i = 0; i < 4; i++) { const a = -sp * 0.6 + i * Math.PI / 2, cx = Math.cos(a), cy = Math.sin(a); g.fillStyle(0xa8ddf5, 0.85).fillRect(Math.round(x + cx * 5), Math.round(y + cy * 5), 1, 1); g.fillStyle(0x5fa8e0, 0.8).fillRect(Math.round(x + cx * 6.5), Math.round(y + cy * 6.5), 1, 1); }
      g.fillStyle(0xd8f2ff, 0.7).fillRect(Math.round(x - 2), Math.round(y - 2), 1, 1);
      for (let i = 0; i < 5; i++) { const h = Math.sin(i * 12.9898 + Math.floor(p.age * 10) * 78.233) * 43758.5453, fr = h - Math.floor(h); if (fr > 0.55) continue; const a = fr * 11.4 + i, r = 7 + fr * 8; g.fillStyle(i & 1 ? 0xb8e6ff : 0x6fb4e8, 0.6).fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1); }
      return; }
    if (p.oshard) { /* 冰封球的冰锥：沿速度方向 4 像素长，白头蓝尾 */
      const v = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / v, uy = p.vy / v;
      for (let j = 0; j < 4; j++) g.fillStyle(j === 0 ? 0xbfe8ff : j === 1 ? 0x8cc8f0 : 0x4a8fd0, 0.85 - j * 0.18).fillRect(Math.round(p.x - ux * j), Math.round(p.y - uy * j), 1, 1);
      return; }
    if (p.shard) { g.fillStyle(0xe8fbff, 1).fillRect(p.x - 1, p.y - 1, 2, 2); g.fillStyle(c, 1).fillRect(p.x - p.vx / NV.shardSpeed * 2 - 0.5, p.y - p.vy / NV.shardSpeed * 2 - 0.5, 1, 1); return; } // 碎冰的冰片
    const k = p.W.key;
    if (p.mine) { const on = p.arm <= 0 && (t * 4 | 0) % 2; g.fillStyle(0x120c18, 1).fillRect(p.x - 3, p.y - 1, 6, 3); g.fillStyle(c, 1).fillRect(p.x - 2, p.y, 4, 1); if (on) g.fillStyle(0xffffff, 1).fillRect(p.x - .5, p.y - 1, 1, 1); return; }
    if (k === 'Shuriken' || k === 'TurbineBlades' || k === 'FlameSlinger') { const a = t * 20; g.fillStyle(k === 'FlameSlinger' ? 0xff9a3d : 0xdfe6ee, 1); for (let i = 0; i < 3; i++) { const aa = a + i * 2.1; g.fillRect(p.x + Math.cos(aa) * 2 - .5, p.y + Math.sin(aa) * 2 - .5, 1, 1); } g.fillStyle(0xffffff, 1).fillRect(p.x - .5, p.y - .5, 1, 1); return; }
    if (p.spark) { // 游雷（照流放之路 2 闪电箭）：顺着速度拉长的亮白箭头 + 一条抖动的锯齿电尾
      const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, nx = -uy, ny = ux, x = p.x, y = p.y;
      const st = p._st || (p._st = []); st.unshift(x, y); if (st.length > 20) st.length = 20; // 最近 10 帧的位置：电尾就是真实的波形轨迹
      const fl = (t * 30 + x) | 0;
      let px_ = x, py = y; for (let i = 2; i < st.length; i += 2) { g.fillStyle(i < 8 ? 0x9fdcff : 0x4f8fd8, 0.75 - i * 0.03); pline(g, px_, py, st[i], st[i + 1]); px_ = st[i]; py = st[i + 1]; }
      if (fl % 4 === 0) { const j = rf(-2, 2); g.fillStyle(0xd8f4ff, 0.9).fillRect(Math.round(x - ux * 5 + nx * j), Math.round(y - uy * 5 + ny * j), 1, 1); } // 偶尔一颗电火星
      if (this.glowG) { this.glowG.fillStyle(0x9fdcff, 0.25); pline(this.glowG, x - ux * 6, y - uy * 6, x + ux * 3, y + uy * 3); this.glowG.fillCircle(x + ux * 2, y + uy * 2, 2); }
      g.fillStyle(0xbfe6ff, 1); pline(g, x - ux * 4, y - uy * 4, x + ux * 2, y + uy * 2); // 箭身
      g.fillStyle(0xffffff, 1); pline(g, x - ux * 1, y - uy * 1, x + ux * 3, y + uy * 3); // 亮白箭头
      return;
    }
    if (k === 'SporeBlaster' || k === 'Orbitron' || k === 'Zapper') { g.fillStyle(0x120c18, 1).fillRect(p.x - 2, p.y - 2, 4, 4); g.fillStyle(c, 1).fillRect(p.x - 1, p.y - 1, 2, 2); if (k === 'Zapper' && (t * 10 | 0) % 2) g.fillStyle(0xffffff, 1).fillRect(p.x - .5, p.y - .5, 1, 1); return; }
    if (p.W.b.wide) { const sp = Math.hypot(p.vx, p.vy) || 1, nx = -p.vy / sp, ny = p.vx / sp; g.fillStyle(c, 0.9); pline(g, p.x - nx * 6, p.y - ny * 6, p.x + nx * 6, p.y + ny * 6); g.fillStyle(0xffffff, 0.8); pline(g, p.x - nx * 3, p.y - ny * 3, p.x + nx * 3, p.y + ny * 3); return; }
    if (p.W.aoeR && p.W.form === 'proj') { g.fillStyle(0x120c18, 1).fillRect(p.x - 2, p.y - 2, 5, 5); g.fillStyle(0x8f5d36, 1).fillRect(p.x - 1, p.y - 1, 3, 3); g.fillStyle(0xffd36a, 1).fillRect(p.x, p.y - 3, 1, 2); return; }
    const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp;
    g.fillStyle(c, 0.5); pline(g, p.x - ux * 6, p.y - uy * 6, p.x - ux * 3, p.y - uy * 3);
    g.fillStyle(c, 1); pline(g, p.x - ux * 3, p.y - uy * 3, p.x, p.y);
    g.fillStyle(0xffffff, 1).fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
  }
  syncMob(m, bar, t) {
    let o = this.spr.get(m);
    if (!o) { o = { img: this.add.image(0, 0, 'px').setOrigin(0.5, 1), sh: this.add.image(0, 0, 'shadow').setDepth(9) }; this.spr.set(m, o); }
    o.seen = this.frame;
    let sx = m.x, sy = m.y;
    if (m.kbT > 0) { const k = 2.5 * m.kbT / 0.12; sx += Math.cos(m.kbA) * k; sy += Math.sin(m.kbA) * k * 0.6; m.kbT -= this.dt || 0.016; } // 挨打时往后一顿
    const moving = Math.abs(m.vx) + Math.abs(m.vy) > 2; const fr = moving ? ((t * 6 + m.x * 0.1) | 0) % 2 : 0;
    const frz = m.frzT > 0, key = `m_${m.type}_${frz ? 0 : fr}${m.fl > 0 ? '_fl' : frz ? '_ice' : m.elite ? '_e' : ''}`; // 冻结：整只变成冰蓝剪影、不摆动
    if (o.key !== key) { o.img.setTexture(key); o.key = key; }
    const h = o.img.height, w = o.img.width;
    const rise = m.rise > 0 ? Math.round(h * clamp(m.rise / 0.45, 0, 1)) : 0;
    o.img.setPosition(sx, sy + 1 + rise).setDepth(ySort(sy)).setFlipX(m.face < 0);
    if (rise) o.img.setCrop(0, 0, w, h - rise); else if (o.img.isCropped) o.img.setCrop();
    // 异常着色
    if (m.fl > 0) o.img.clearTint();
    else if (frz) o.img.clearTint();
    else if (m.chill > 0) o.img.setTint(m.chill >= 6 ? 0x8fd0ff : 0xc4ecff); // 冰缓：越深越蓝
    else if (m.shock && (t * 8 | 0) % 2) o.img.setTint(0xa8dcff);
    else if (m.rad.length) o.img.setTint(0xb8f08a);
    else if (m.burn > 1) o.img.setTint(0xffc090);
    else if (m.blind > 0.2) o.img.setTint(0xfff0a0);
    else o.img.clearTint();
    o.sh.setPosition(sx, sy + 1).setScale(m.boss ? 2 : 1, 1);
    if (frz) { const hw = (w >> 1) + 1; bar.fillStyle(0xe8fbff, 0.9); for (let i = -hw; i <= hw; i += 2) bar.fillRect(Math.round(sx + i), Math.round(sy - ((i * 7 + 13) % 3)), 1, 2); bar.fillStyle(0x9fe3ff, 0.7).fillRect(Math.round(sx - hw), Math.round(sy), hw * 2 + 1, 1); } // 冻结：脚下一圈冰凌
    if (m.hp < m.max && !m.boss) {
      const bw = m.elite ? 14 : 10; const bx = Math.round(sx - (bw >> 1)), by = Math.round(sy - h - 3);
      bar.fillStyle(0x120c18, 1).fillRect(bx - 1, by - 1, bw + 2, 3); bar.fillStyle(0x4a1c22, 1).fillRect(bx, by, bw, 1); bar.fillStyle(0xff5a4a, 1).fillRect(bx, by, Math.max(1, Math.round(bw * m.hp / m.max)), 1);
      if (m.chill > 0) { bar.fillStyle(0x9fe3ff, 1); for (let i = 0; i < Math.min(m.chill, 10); i++) bar.fillRect(bx + i, by + 2, 1, 1); } // 冰缓层数：血条下一排点
      if (m.shock) { bar.fillStyle(0x7fc8ff, 1); for (let i = 0; i < Math.min(m.shock, 5); i++) bar.fillRect(bx + i * 2, by - 3, 1, 1); }
    }
  }
  syncDrop(dp, t) {
    let o = this.spr.get(dp);
    if (!o) { o = { img: this.add.image(0, 0, 'px').setOrigin(0.5, 1), sh: this.add.image(0, 0, 'shadow').setDepth(9).setScale(0.6, 1) }; this.spr.set(dp, o); }
    o.seen = this.frame;
    const key = dp.kind === 'shard' ? 'shard' : dp.kind === 'glyph' ? 'glyph_' + dp.id : dp.kind === 'mod' ? 'mod_' + dp.mod.mid : dp.kind === 'map' ? 'i_a_map' : 'i_' + iconOf(dp.item);
    if (o.key !== key) { o.img.setTexture(key); o.key = key; }
    const bob = dp.z === 0 ? Math.round(Math.sin(t * 4 + dp.x) * .8) : 0;
    o.img.setPosition(Math.round(dp.x), Math.round(dp.y - dp.z) + bob).setDepth(dp.kind === 'item' ? 57 : ySort(dp.y));
    o.sh.setPosition(Math.round(dp.x), Math.round(dp.y) + 1);
  }
  beam(g, dp, t) {
    const it = dp.item || dp.map; const x = Math.round(dp.x), y = Math.round(dp.y - dp.z) - 6;
    const c = hex(icol(it)); const h = it.leg || it.ex ? 80 : it.rar === 3 ? 70 : it.rar === 2 ? 50 : 30;
    const a = .4 + Math.sin(t * 5) * .12;
    for (let i = 0; i < 6; i++) { const seg = h / 6; g.fillStyle(c, a * (i + 1) / 6); g.fillRect(x - 1, y - h + i * seg, 3, seg + 1); }
    g.fillStyle(c, a * .35); g.fillRect(x - 3, y - h * .5, 7, h * .5);
    if (rnd() < .25) { this.em.loot.particleTint = c; this.em.loot.explode(1, x + rf(-3, 3), y - rf(0, h * .5)); }
  }
}
// 按 y 排前后：只看在视野里的相对位置，深度保持在 10–12.9（场地无限大，世界坐标的 y 可能很大或是负数）
const ySort = y => 10 + clamp((y - CAM.y) / 100, 0, 2.9);
function flame(g, x, y, t) {
  const tt = t * 12 + x; const h = 5 + Math.round(Math.sin(tt) + Math.sin(tt * 1.7));
  g.fillStyle(0xe8533a, 1).fillRect(x - 2, y - h + 2, 5, h - 1);
  g.fillStyle(0xff9a3d, 1).fillRect(x - 1, y - h + 1, 3, h - 1);
  g.fillStyle(0xffe7a0, 1).fillRect(x, y - h + 3, 1, Math.max(1, h - 3));
  if (Math.sin(tt * 2.3) > .6) g.fillStyle(0xffd36a, 1).fillRect(x + (Math.sin(tt) > 0 ? 1 : -1), y - h - 1, 1, 1);
}
function pline(g, x0, y0, x1, y1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy, n = 0;
  while (n++ < 600) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
// 游雷命中电弧：外层青色锯齿 + 内层白芯，中途劈出一根短叉，每帧重新随机；发光层上铺一层淡光
function arcFx(g, gg, l) {
  const k = Math.min(1, l.life / 0.12), dx = l.x2 - l.x1, dy = l.y2 - l.y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, seg = Math.max(3, L / 7 | 0);
  let px_ = l.x1, py = l.y1, bx = 0, by = 0;
  for (let i = 1; i <= seg; i++) { const q = i / seg, o = i === seg ? 0 : rf(-4, 4), qx = l.x1 + dx * q + nx * o, qy = l.y1 + dy * q + ny * o;
    g.fillStyle(0x6fc4ff, 0.9 * k); pline(g, px_ + nx, py + ny, qx + nx, qy + ny); g.fillStyle(0xffffff, k); pline(g, px_, py, qx, qy);
    if (i === (seg >> 1)) { bx = qx; by = qy; } px_ = qx; py = qy; }
  if (bx) { const s = rf(-1, 1) < 0 ? -1 : 1; g.fillStyle(0xbfe6ff, 0.8 * k); pline(g, bx, by, bx + dx / L * 5 + nx * 6 * s, by + dy / L * 5 + ny * 6 * s); }
  if (gg) { gg.fillStyle(0x7fc8ff, 0.18 * k); gg.fillCircle(l.x2, l.y2, 4); gg.fillCircle((l.x1 + l.x2) / 2, (l.y1 + l.y2) / 2, 3); }
}
function jag(g, x1, y1, x2, y2) { let px_ = x1, py = y1; for (let i = 1; i <= 5; i++) { const t = i / 5; const nx = i === 5 ? x2 : x1 + (x2 - x1) * t + rf(-3, 3), ny = i === 5 ? y2 : y1 + (y2 - y1) * t + rf(-3, 3); pline(g, px_, py, nx, ny); px_ = nx; py = ny; } }
