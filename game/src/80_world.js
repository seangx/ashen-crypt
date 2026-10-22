/* ---------- 场景：Boot ---------- */
class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  create() { buildTextures(this); this.scene.start('world'); this.scene.launch('ui'); }
}

/* ---------- 场景：World（地窖与战斗） ---------- */
class World extends Phaser.Scene {
  constructor() { super('world'); }
  create() {
    G.world = this; this.cameras.main.setZoom(Z).centerOn(W / 2, H / 2);
    this.roomTex = this.textures.exists('room') ? this.textures.get('room') : this.textures.createCanvas('room', W, H);
    this.add.image(0, 0, 'room').setOrigin(0).setDepth(0); this.roomL = null;
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
      this.add.image(0, 0, 'light').setOrigin(0).setScale(2).setDepth(50);
    }
    this.glows = SCONCES.map(s => this.add.image(s.x, s.y + 2, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(51));
    this.heroGlow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(51).setScale(1.1);
    this.barG = this.add.graphics().setDepth(52);
    this.lootG = this.add.graphics().setDepth(55);
    this.projG = this.add.graphics().setDepth(58);
    this.fxG = this.add.graphics().setDepth(59);
    this.hero = this.add.image(0, 0, 'hero_0').setOrigin(0.5, 1);
    this.heroSh = this.add.image(0, 0, 'shadow').setDepth(9);
    this.hubG = this.add.graphics().setDepth(9.2);
    this.spr = new Map(); this.frame = 0; this.lines = []; this.rings = []; this.dmgCount = 0; this.trail = [];
    const P = (cfg, depth = 30) => this.add.particles(0, 0, 'px', { emitting: false, ...cfg }).setDepth(depth);
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
    const onField = () => RUN && !(G.ui && G.ui.winId) && mouse.y > TOP_H && mouse.y < BOT_Y;
    cv.addEventListener('pointermove', e => { const d = nat(e); if (onField()) autoTouch(e.pointerType === 'touch' ? -1 : d); });
    cv.addEventListener('pointerdown', e => { ac(); nat(e); if (onField() && (e.pointerType === 'touch' || e.button === 2)) autoTouch(-1); if (e.button === 2) tryDash(); });
    cv.addEventListener('pointerleave', () => { mouse.on = false; }); cv.addEventListener('pointerenter', () => { mouse.on = true; });
  }
  // 震屏有冷却，只在大事件上用
  hitStop(d, cd = 0.35) { if (!G.fx || G.time < (this.stopCd || 0)) return; this.stopUntil = G.time + d; this.stopCd = G.time + cd; } // 有冷却，打 Boss 时不会一直卡
  shake(ms, amt) { if (!G.fx || G.time < (this.shakeT || 0)) return; this.shakeT = G.time + 0.6; this.cameras.main.shake(ms, amt); }
  dmgText(x, y, str, col, big) {
    if (this.dmgCount > 50) return; this.dmgCount++;
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

    this.consume();
    this.render(dt);
  }
  // 处理战斗逻辑产生的表现事件
  consume() {
    for (const e of fxq) {
      switch (e.t) {
        case 'num': this.dmgText(e.x, e.y, fmt(e.v), e.hurt ? COL.bad : e.crit ? COL.emberHi : ELEM_C[e.el], e.crit); break;
        case 'text': this.label(e.x, e.y, e.s, e.c); break;
        case 'beam': this.lines.push({ ...e, life: 0.09, jag: e.el === 'ele' }); break;
        case 'bolt': this.lines.push({ ...e, life: 0.15, jag: true }); break;
        case 'boom': this.rings.push({ x: e.x, y: e.y, r: e.r, life: 0.25, max: 0.25, el: e.el, fill: true }); this.em.fire.explode(10, e.x, e.y); this.em.spark2.particleTint = hex(ELEM_C[e.el]); this.em.spark2.explode(8, e.x, e.y); if (this.post) this.post.waves.push({ x: e.x, y: e.y, r: e.r * 1.4 + 16, k: 1, life: 0.35, t0: G.time }); break;
        case 'ring': this.rings.push({ x: e.x, y: e.y, r: e.r, life: 0.18, max: 0.18, el: e.el }); break;
        case 'shield': this.rings.push({ x: e.x, y: e.y - 6, r: 11, life: 0.2, max: 0.2, el: 'cyan' }); break;
        case 'cone': { const n = 4; for (let i = 0; i < n; i++) { const a = e.a + rf(-0.5, 0.5), d = rf(8, e.r); this.em.fire.explode(1, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d); } break; }
        case 'hit': this.em.spark2.particleTint = hex(ELEM_C[e.el]); this.em.spark2.explode(2, e.x, e.y); break;
        case 'impact': this.em.spark2.particleTint = hex(e.crit ? '#ffe6a0' : ELEM_C[e.el]); this.em.spark2.explode(e.big ? (e.crit ? 10 : 4) : 4, e.x, e.y); if (e.crit) this.em.chip.explode(e.big ? 4 : 1, e.x, e.y); if (e.big && e.crit) this.hitStop(0.05, 1.2); break;
        case 'burn': this.em.fire.explode(2, e.x, e.y - 6); break;
        case 'die': if (e.boss) { this.em.bossdie.explode(60, e.x, e.y - 12); this.shake(300, 0.01); this.hitStop(0.09); } else { this.em.bone.explode(6, e.x, e.y - 6); this.em.chip.explode(e.elite ? 12 : 5, e.x, e.y - 6); if (e.elite) { this.hitStop(0.06); this.shake(90, 0.002); } } break;
        case 'pick': this.em.spark.particleTint = 0xfff2c8; this.em.spark.explode(4, e.x, e.y - 4); break;
        case 'orbitHit': break;
        case 'spike': this.lines.push({ x1: e.x, y1: e.y + 1, x2: e.x, y2: e.y - 9, el: e.el, life: 0.12 }); this.em.bone.explode(2, e.x, e.y - 2); break;
      }
    }
    fxq.length = 0;
  }
  render(dt) {
    const L = RUN ? RUN.L : S.depth; const theme = RUN ? themeFor(L) : THEMES[0];
    // 不在任务里就是营地：底图按解锁了哪些设施重画
    const open = Object.fromEntries(CAMP.facilities.map(f => [f.id, facOpen(f)])), key = RUN ? L : 'camp' + CAMP.facilities.map(f => +open[f.id]).join('');
    if (this.roomL !== key) { if (RUN) drawBackground(this.roomTex.getContext(), theme, L * 7919 + 13); else drawCamp(this.roomTex.getContext(), open); this.roomTex.refresh(); this.roomL = key; }
    const t = G.time; this.frame++;
    const g = this.wallG; g.clear();
    for (const s of SCONCES) flame(g, s.x, s.y - 1, t);
    if (!RUN) campFx(g, t, open);
    // 玩家
    const fr = (t * 4 | 0) % 2, bob = Math.round(Math.sin(t * 3) * 1);
    const sig = dollSig(S.equip);
    if (sig !== this.dollSig) { // 装备变了：重画纸娃娃
      this.dollSig = sig; this.dollN = (this.dollN || 0) + 1;
      for (const f of [0, 1]) { const cv = dollCanvas(S.equip, f); for (const [k, c] of [['doll_', cv], ['doll_fl_', silhouette(cv, '#ffffff')]]) { const key = k + f; if (this.textures.exists(key)) this.textures.remove(key); this.textures.addCanvas(key, c); } }
      this.hero.setTexture('doll_0'); if (this.heroCS && this.heroCS.cs) this.heroCS.cs.setTexture('doll_0'); G.ui && G.ui.dollChanged && G.ui.dollChanged(); // 影子也要换到新纹理，旧的已经删掉
    }
    const hk = (player.hurtT > 0.15 ? 'doll_fl_' : 'doll_') + fr;
    if (this.hero.texture.key !== hk || this.dollDirty !== this.dollN) { this.hero.setTexture(hk); this.dollDirty = this.dollN; }
    this.hero.setPosition(player.x, player.y + bob).setFlipX(player.face < 0).setDepth(10 + player.y / 100).setAlpha(player.dashT > 0 ? 0.5 : 1);
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
    const pg = this.projG; pg.clear(); if (this.glowG) this.glowG.clear();
    for (const p of projs) this.drawProj(pg, p, t);
    STATS.weapons.forEach((W_, wi) => {
      if (!W_ || W_.form !== 'orbit') return;
      // 旋身：刃数跟攻速走，层数越高半径越大、拖尾越长；满层时脚下一圈风纹
      const n = W_.whirl ? player.spin[wi].n : 0, R = W_.rng * (1 + n * WH.rngPer / 100);
      const nb = W_.whirl ? W_.blades : 3, tail = Math.floor(n / 2);
      if (W_.whirl && n >= W_.stackMax) for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2 - t * 3; pg.fillStyle(0xdfe6ee, 0.12 + 0.12 * Math.sin(k * 1.7 + t * 6)); pg.fillRect(player.x + Math.cos(a) * R * 0.85, player.y + Math.sin(a) * R * 0.5, 2, 1); }
      for (let i = 0; i < nb; i++) {
        const a0 = player.orbitA + i * Math.PI * 2 / nb;
        for (let k = tail; k >= 1; k--) { const a = a0 - k * 0.09; pg.fillStyle(0xdfe6ee, 0.5 * (1 - k / (tail + 1))); pg.fillRect(player.x + Math.cos(a) * R - 1, player.y - 6 + Math.sin(a) * R * 0.7 - 1, 2, 2); }
        const x = player.x + Math.cos(a0) * R, y = player.y - 6 + Math.sin(a0) * R * 0.7;
        // 骨刃：沿切线的一道弯月（先描深色边再画亮面），刃尖朝旋转方向
        const tx = -Math.sin(a0), ty = Math.cos(a0) * 0.7, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl, ox = Math.cos(a0), oy = Math.sin(a0) * 0.7;
        const px = k => [Math.round(x + ux * k + ox * (1 - k * k / 6)), Math.round(y + uy * k + oy * (1 - k * k / 6))];
        pg.fillStyle(0x120c18, 1); for (let k = -2; k <= 3; k++) { const [qx, qy] = px(k); pg.fillRect(qx - 1, qy - 1, 3, 3); }
        for (let k = -2; k <= 3; k++) { const [qx, qy] = px(k); pg.fillStyle(k >= 2 ? 0xffffff : k <= -1 ? 0x9a8f86 : 0xdfe6ee, 1).fillRect(qx, qy, 1, 1); pg.fillRect(qx - Math.round(ox), qy - Math.round(oy), 1, 1); }
      }
    });
    for (const z of zones) { const c = hex(ELEM_C[z.el]); if (z.enemy) { pg.fillStyle(0x2f5a22, 0.35 * Math.min(1, z.t)).fillEllipse(z.x, z.y, z.r * 2, z.r * 1.2); } const n = Math.max(10, z.r * 1.5 | 0); pg.fillStyle(c, z.vortex ? 0.8 : 0.45); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (z.vortex ? t * 6 : 0), rr = z.r * (z.vortex ? 0.4 + 0.6 * ((i * 7) % 5) / 5 : (0.5 + 0.5 * Math.abs(Math.sin(i * 1.7 + t * 3)))); pg.fillRect(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr * 0.6, 1, 1); } }
    for (const W_ of STATS.weapons) if (W_ && W_.form === 'aura') { const c = hex(ELEM_C[W_.el]); const n = 28; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + t * 0.8; pg.fillStyle(c, 0.25 + 0.25 * Math.sin(i + t * 4)); pg.fillRect(player.x + Math.cos(a) * W_.rng, player.y - 2 + Math.sin(a) * W_.rng * 0.6, 1, 1); } }
    // 特效线与环
    const fg = this.fxG; fg.clear();
    for (const l of this.lines) { l.life -= dt; const c = hex(ELEM_C[l.el] || '#ffffff'); fg.fillStyle(c, 1); if (l.jag) jag(fg, l.x1, l.y1, l.x2, l.y2); else { pline(fg, l.x1, l.y1, l.x2, l.y2); fg.fillStyle(0xffffff, 0.8); pline(fg, l.x1, l.y1 - 1, l.x2, l.y2 - 1); } }
    this.lines = this.lines.filter(l => l.life > 0);
    for (const r of this.rings) {
      r.life -= dt; const k = 1 - r.life / r.max; const rr = r.r * (0.4 + 0.6 * k); const c = r.el === 'cyan' ? 0x57e0d0 : hex(ELEM_C[r.el]);
      if (r.fill) { fg.fillStyle(c, 0.25 * (1 - k)); fg.fillCircle(r.x, r.y, rr); }
      fg.fillStyle(c, 1 - k); const n = Math.max(12, rr * 2 | 0); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; fg.fillRect(r.x + Math.cos(a) * rr - .5, r.y + Math.sin(a) * rr * 0.75 - .5, 1, 1); }
    }
    this.rings = this.rings.filter(r => r.life > 0);
    // 光照：每个光源有颜色；WebGL 下画进彩色光照图，否则沿用旧的暗部遮罩
    const fl = 1 + Math.sin(t * 9) * .04 + Math.sin(t * 23) * .03;
    const WARM = 0xff9a4a, lights = SCONCES.map(s => ({ x: s.x, y: s.y + 6, r2: (64 * fl) ** 2, i: .75, c: WARM }));
    lights.push({ x: player.x + player.face * 4, y: player.y - 6, r2: (110 * fl) ** 2, i: .55, c: 0x7fd0e0 }); // 提灯亡魂身上的青色魂光
    if (!RUN) { const gt = FAC_BY.gate; lights.push({ x: gt.x - 36, y: gt.y - 14, r2: (46 * fl) ** 2, i: .6, c: WARM }, { x: gt.x + 36, y: gt.y - 14, r2: (46 * fl) ** 2, i: .6, c: WARM }, { x: 240, y: 178, r2: (80 * fl) ** 2, i: .75, c: 0xffa050 });
      const FC = { altar: 0xc08aff, runes: 0x57e0d0, stele: 0xffd36a };
      for (const id of ['altar', 'runes', 'stele', 'chest', 'anvil', 'statue', 'atlas']) if (open[id]) lights.push({ x: FAC_BY[id].x, y: FAC_BY[id].y - 12, r2: id === 'altar' ? 900 : 620, i: .35, c: FC[id] || 0xd0a070 }); }
    for (const m of mobs) if ((m.burn > 1 || m.boss) && lights.length < 18) lights.push({ x: m.x, y: m.y - 6, r2: m.boss ? 1600 : 420, i: .4, c: m.boss ? 0xc23a5a : 0xff7a3a });
    for (const r of this.rings) if (r.fill && lights.length < 22) lights.push({ x: r.x, y: r.y, r2: (r.r * 1.5) ** 2, i: .6, c: hex(ELEM_C[r.el] || '#ffd36a') });
    for (const dp of drops) if (dp.kind === 'item' && dp.item.rar >= 1 && lights.length < 24) lights.push({ x: dp.x, y: dp.y - 8, r2: 520, i: .45, c: hex(icol(dp.item)) });
    if (this.lightRT) {
      const rt = this.lightRT; rt.fill(RUN ? 0x34324c : 0x2e2c44);
      for (const l of lights) rt.stamp('ldisc', null, l.x / 2, l.y / 2, { scale: Math.sqrt(l.r2) / 64, tint: l.c, alpha: l.i * 0.85, blendMode: Phaser.BlendModes.ADD });
      // 热浪：墙上的火把、营地的火盆和篝火
      const hz = SCONCES.map(s => ({ x: s.x, y: s.y - 6, w: 6, h: 18 }));
      if (!RUN) { const gt = FAC_BY.gate; hz.push({ x: gt.x - 36, y: gt.y - 18, w: 8, h: 26 }, { x: gt.x + 36, y: gt.y - 18, w: 8, h: 26 }, { x: 240, y: 176, w: 9, h: 28 }); }
      this.post.hazes = hz;
    } else { const amb = RUN ? 0.4 : 0.32; renderLight(this.lightTex.getContext(), lights, amb, theme.fog); this.lightTex.refresh(); }
    this.glows.forEach(gl => gl.setAlpha(.16 * fl));
    this.heroGlow.setPosition(player.x + player.face * 4, player.y - 6).setAlpha((this.lightRT ? .07 : .14) * fl);
    // 投影：火把、营地火光把角色和怪的影子投到地上；怪的影子也背着提灯亡魂的光
    const casters = SCONCES.map(s => ({ x: s.x, y: s.y + 6, r: 140 }));
    if (!RUN) casters.push({ x: FAC_BY.gate.x - 36, y: FAC_BY.gate.y - 10, r: 100 }, { x: FAC_BY.gate.x + 36, y: FAC_BY.gate.y - 10, r: 100 }, { x: 240, y: 180, r: 120 });
    this.heroCS = this.heroCS || {}; this.castShadow(this.heroCS, this.hero.texture.key, player.x, player.y + bob, player.face < 0, casters);
    const mc = [...casters, { x: player.x, y: player.y + 2, r: 115 }];
    for (const m of mobs) { const o = this.spr.get(m); if (o) this.castShadow(o, o.key, o.img.x, m.y + 1, m.face < 0, mc); }
  }
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
    if (gg && !p.mine) {
      const c = p.enemy ? 0xff5a4a : hex(ELEM_C[p.el]), y0 = p.lob ? p.y - p.z : p.y, tr = p._tr || (p._tr = []);
      tr.unshift(p.x, y0); if (tr.length > 12) tr.length = 12;
      for (let i = 2; i < tr.length; i += 2) { gg.fillStyle(c, 0.4 * (1 - i / 12)); gg.fillCircle(tr[i], tr[i + 1], 2 - i * 0.1); }
      gg.fillStyle(c, 0.22); gg.fillCircle(p.x, y0, 5); gg.fillStyle(c, 0.45); gg.fillCircle(p.x, y0, 2.5);
    }
    if (p.enemy) { g.fillStyle(0x120c18, 1).fillRect(p.x - 2, p.y - 2, 4, 4); g.fillStyle(hex(ELEM_C[p.el]), 1).fillRect(p.x - 1, p.y - 1, 2, 2); return; }
    const c = hex(ELEM_C[p.el]);
    if (p.lob) { g.fillStyle(0x000000, 0.35).fillRect(p.x - 2, p.y, 4, 1); const y = p.y - p.z; g.fillStyle(0x120c18, 1).fillRect(p.x - 2, y - 2, 5, 5); g.fillStyle(0x8f5d36, 1).fillRect(p.x - 1, y - 1, 3, 3); g.fillStyle(0xffd36a, 1).fillRect(p.x, y - 3, 1, 2); return; }
    const k = p.W.key;
    if (p.mine) { const on = p.arm <= 0 && (t * 4 | 0) % 2; g.fillStyle(0x120c18, 1).fillRect(p.x - 3, p.y - 1, 6, 3); g.fillStyle(c, 1).fillRect(p.x - 2, p.y, 4, 1); if (on) g.fillStyle(0xffffff, 1).fillRect(p.x - .5, p.y - 1, 1, 1); return; }
    if (k === 'Shuriken' || k === 'TurbineBlades' || k === 'FlameSlinger') { const a = t * 20; g.fillStyle(k === 'FlameSlinger' ? 0xff9a3d : 0xdfe6ee, 1); for (let i = 0; i < 3; i++) { const aa = a + i * 2.1; g.fillRect(p.x + Math.cos(aa) * 2 - .5, p.y + Math.sin(aa) * 2 - .5, 1, 1); } g.fillStyle(0xffffff, 1).fillRect(p.x - .5, p.y - .5, 1, 1); return; }
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
    const key = `m_${m.type}_${fr}${m.fl > 0 ? '_fl' : m.elite ? '_e' : ''}`;
    if (o.key !== key) { o.img.setTexture(key); o.key = key; }
    const h = o.img.height, w = o.img.width;
    const rise = m.rise > 0 ? Math.round(h * clamp(m.rise / 0.45, 0, 1)) : 0;
    o.img.setPosition(sx, sy + 1 + rise).setDepth(10 + sy / 100).setFlipX(m.face < 0);
    if (rise) o.img.setCrop(0, 0, w, h - rise); else if (o.img.isCropped) o.img.setCrop();
    // 异常着色
    if (m.fl > 0) o.img.clearTint();
    else if (m.shock && (t * 8 | 0) % 2) o.img.setTint(0xa8dcff);
    else if (m.rad.length) o.img.setTint(0xb8f08a);
    else if (m.burn > 1) o.img.setTint(0xffc090);
    else if (m.blind > 0.2) o.img.setTint(0xfff0a0);
    else o.img.clearTint();
    o.sh.setPosition(sx, sy + 1).setScale(m.boss ? 2 : 1, 1);
    if (m.hp < m.max && !m.boss) {
      const bw = m.elite ? 14 : 10; const bx = Math.round(sx - (bw >> 1)), by = Math.round(sy - h - 3);
      bar.fillStyle(0x120c18, 1).fillRect(bx - 1, by - 1, bw + 2, 3); bar.fillStyle(0x4a1c22, 1).fillRect(bx, by, bw, 1); bar.fillStyle(0xff5a4a, 1).fillRect(bx, by, Math.max(1, Math.round(bw * m.hp / m.max)), 1);
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
    o.img.setPosition(Math.round(dp.x), Math.round(dp.y - dp.z) + bob).setDepth(dp.kind === 'item' ? 57 : 10 + dp.y / 100);
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
function jag(g, x1, y1, x2, y2) { let px_ = x1, py = y1; for (let i = 1; i <= 5; i++) { const t = i / 5; const nx = i === 5 ? x2 : x1 + (x2 - x1) * t + rf(-3, 3), ny = i === 5 ? y2 : y1 + (y2 - y1) * t + rf(-3, 3); pline(g, px_, py, nx, ny); px_ = nx; py = ny; } }
