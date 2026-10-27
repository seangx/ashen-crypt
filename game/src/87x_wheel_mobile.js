/* =========================================================
   手机：骸骨轮盘 → 大转盘（Sean：只出一件，所以用转盘不用老虎机）。
   每次里程碑：8 格候选（独特 = 金色），转一次只得 1 件；同标签候选权重更高（第一次 ×5，之后 ×3）。
   希望符 = 重转；放弃 = 15 词条碎片。桌面版仍是原来的三选一。
   ========================================================= */
const WHEEL_N = 8;
function wheelRoll(p) {
  const pool = UNIQUES.filter(u => u.req <= Math.max(p.ilvl, 1) + 10 && !u.ladderOnly).map(u => ({ id: u.id, w: reelOwned(u.id) ? REEL.ownedMul : 1 }))
    .concat(Object.keys(TRIG_U).map(k => ({ tu: k, w: reelOwned(k) ? REEL.ownedMul : 1 })));
  const myT = reelSkillTags(), hit = x => reelTags(x).some(t => myT.has(t)), out = [];
  const tagged = pool.filter(hit); for (let i = 0; i < 2 && tagged.length; i++) out.push(tagged.splice(Math.floor(rnd() * tagged.length), 1)[0]); // 至少 2 格同标签
  while (out.length < WHEEL_N) { const cand = pool.filter(x => !out.includes(x)); if (!cand.length) break; out.push(wpick(cand, c => c.w)); }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  const bonus = p.floor <= REEL.every ? 5 : 3, idx = out.map((_, i) => i);
  const win = wpick(idx, i => out[i].w * (hit(out[i]) ? bonus : 1));
  p.wheel = { opts: out.map(x => x.tu ? newUniqueTrig(x.tu, p.ilvl) : newUnique(x.id, p.ilvl)), tag: out.map(hit), win, spun: 0 };
  save(); return p.wheel;
}
function wheelCur() { const p = (S.reelsPending || [])[0]; if (!p) return null; if (!p.wheel) wheelRoll(p); return p; }
function wheelTake() { const p = wheelCur(); if (!p) return null; const it = p.wheel.opts[p.wheel.win]; reelGive(it); S.reelsPending.shift(); refreshStats(); save(); return it; }
function wheelReroll() { const p = wheelCur(); if (!p || !(S.glyphs && S.glyphs.hope > 0)) return false; S.glyphs.hope--; p.wheel = null; wheelCur(); return true; }
const wheelIcon = (sc, it) => { const k = it.kind === 'trig' ? 'i_star' : 'i_' + iconOf(it); return sc.textures.exists(k) ? k : 'i_star'; };
const wheelName = it => it.kind === 'trig' ? trigName(it) : itemName(it);

/* 图标块：居中的小容器（独特 = 深色圆盘 + 游戏内图标；魂龛 = 条件色图块），方便飞出/缩放 */
function wheelIconC(sc, it, s) {
  const k = sc.add.container(0, 0);
  if (it.kind === 'trig') trigTile(sc, k, -s / 2, -s / 2, s, it);
  else { const g = sc.add.graphics(); k.add(g); g.fillStyle(DK, 1).fillCircle(0, 2, s / 2 + 1); g.fillStyle(0x241c38, 1).fillCircle(0, 0, s / 2); g.lineStyle(2, 0xffd23a, 1).strokeCircle(0, 0, s / 2 - 1);
    const im = sc.add.image(0, 0, wheelIcon(sc, it)); im.setScale(Math.max(1, Math.floor(s * 0.78 / Math.max(im.width, im.height) * 2) / 2)); k.add(im); }
  return k;
}
const WSEG = [0xffc21a, 0x4a7bff, 0xa05cff, 0xff7a2a]; // 金 / 蓝 / 紫 / 橙（中奖格固定金色）
Object.assign(MobileUI.prototype, {
  win_reels(c, w, h) {
    const p = wheelCur(); if (!p) { T_(this, c, w / 2, 40, '没有未开的轮盘', { size: 12 }); mkBtn(this, c, w / 2 - 40, h - 40, 80, 28, '返回', () => this.closeWin()); return; }
    const Wh = p.wheel, n = Wh.opts.length, seg = Math.PI * 2 / n, PI2 = Math.PI * 2;
    let A = this.wh; if (!A || A.wh !== Wh) A = this.wh = { wh: Wh, phase: Wh.spun ? 'res' : 'idle', rot: -Math.PI / 2 - seg / 2, t0: 0, tick: 0, kick: 0, kv: 0, w: 0, parts: [] };
    T_(this, c, w / 2, 16, `第 ${p.floor} 层里程碑 · 还有 ${S.reelsPending.length} 次`, { size: 8, color: '#d8def5' });
    const R = Math.min(w / 2 - 34, 136), cx = w / 2, cy = 46 + R + 16, segC = i => WSEG[((i - Wh.win) % 4 + 4) % 4];
    const mk = this.make.graphics({ add: false }); mk.fillRect(c.x, c.y + 28, w, h - 28); const mask = mk.createGeometryMask();
    const rays = this.add.graphics(); c.add(rays); rays.setMask(mask);
    const g = this.add.graphics(); c.add(g);
    const icons = Wh.opts.map(it => { const k = wheelIconC(this, it, 38); c.add(k); return k; });
    const stars = Wh.tag.map(t => t ? T_(this, c, 0, 0, '★', { size: 12, color: '#fff7b0' }) : null);
    const top = this.add.graphics(); c.add(top); const fxg = this.add.graphics(); c.add(fxg); fxg.setMask(mask);
    const res = A.phase === 'res';
    const draw = now => {
      const rot = A.rot, sp = Math.min(1, Math.abs(A.w) / 14); g.clear();
      g.fillStyle(0x000000, 0.35).fillCircle(cx, cy + 8, R + 18);
      g.fillStyle(DK, 1).fillCircle(cx, cy, R + 16); g.fillStyle(0xb8741a, 1).fillCircle(cx, cy, R + 12); g.fillStyle(0xffd23a, 1).fillCircle(cx, cy, R + 9); g.fillStyle(DK, 1).fillCircle(cx, cy, R + 3);
      for (let i = 0; i < n; i++) { const a0 = rot + i * seg; g.fillStyle(segC(i), 1).slice(cx, cy, R, a0, a0 + seg, false).fillPath(); g.fillStyle(0xffffff, 0.16).slice(cx, cy, R * 0.97, a0 + 0.04, a0 + seg - 0.04, false).fillPath(); g.fillStyle(segC(i), 1).slice(cx, cy, R * 0.72, a0, a0 + seg, false).fillPath(); }
      if (sp > 0.15) for (let k = 1; k <= 3; k++) for (let i = 0; i < n; i++) { const a0 = rot + i * seg - k * A.w * 0.012; g.fillStyle(segC(i), 0.22 * sp).slice(cx, cy, R, a0, a0 + seg, false).fillPath(); } // 动态模糊
      if (A.phase !== 'idle' && A.phase !== 'spin') { const a0 = rot + Wh.win * seg; g.fillStyle(0xffffff, 0.3 + 0.25 * Math.sin(now / 80)).slice(cx, cy, R, a0, a0 + seg, false).fillPath(); }
      for (let i = 0; i < n; i++) { const a0 = rot + i * seg; g.lineStyle(4, DK, 1).lineBetween(cx, cy, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
        const am = a0 + seg / 2, ir = R * 0.66; icons[i].setPosition(cx + Math.cos(am) * ir, cy + Math.sin(am) * ir).setAlpha(sp > 0.5 ? 0.55 : 1).setVisible(!(A.pop && i === Wh.win));
        if (stars[i]) stars[i].setPosition(cx + Math.cos(am - seg * 0.3) * R * 0.9, cy + Math.sin(am - seg * 0.3) * R * 0.9 - 8).setAlpha(sp > 0.5 ? 0.3 : 1); }
      if (sp > 0.35) { g.lineStyle(2, 0xffffff, 0.25 * sp); for (let k = 0; k < 5; k++) { const a = -now / 40 + k * 1.3; g.beginPath(); g.arc(cx, cy, R * (0.4 + k * 0.11), a, a + 0.9); g.strokePath(); } }
      g.lineStyle(5, DK, 1).strokeCircle(cx, cy, R);
      const nb = 20, fast = A.phase === 'spin' ? 60 : A.phase === 'idle' ? 260 : 90;
      for (let k = 0; k < nb; k++) { const a = k / nb * PI2, on = (Math.floor(now / fast) + k) % 2, bx = cx + Math.cos(a) * (R + 10), by = cy + Math.sin(a) * (R + 10);
        if (on) g.fillStyle(0xffe27a, 0.35).fillCircle(bx, by, 6); g.fillStyle(DK, 1).fillCircle(bx, by, 4); g.fillStyle(on ? 0xfffbe0 : 0x9a5a10, 1).fillCircle(bx, by, 3); }
      g.fillStyle(DK, 1).fillCircle(cx, cy + 2, 22); g.fillStyle(0x2a3a7a, 1).fillCircle(cx, cy, 19); g.lineStyle(3, 0xffd23a, 1).strokeCircle(cx, cy, 17);
      const st = [...Array(10)].map((_, k) => { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 4 : 10; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; });
      g.fillStyle(0xffd23a, 1).fillPoints(st, true);
      top.clear(); const px = cx, py = cy - R - 14, kk = A.kick; // 指针：金色挂座 + 红箭头，过格弹一下
      top.fillStyle(DK, 1).fillRoundedRect(px - 16, py - 20, 32, 16, 5); top.fillStyle(0xffd23a, 1).fillRoundedRect(px - 13, py - 18, 26, 11, 4); top.fillStyle(DK, 1).fillCircle(px, py - 12, 3);
      const P = [[0, 30], [-13, 0], [13, 0]].map(([x, y]) => ({ x: px + x * Math.cos(kk) - y * Math.sin(kk), y: py + x * Math.sin(kk) + y * Math.cos(kk) }));
      top.fillStyle(DK, 1).fillTriangle(P[0].x, P[0].y + 3, P[1].x - 3, P[1].y - 1, P[2].x + 3, P[2].y - 1); top.fillStyle(0xff3b4a, 1).fillTriangle(P[0].x, P[0].y, P[1].x, P[1].y, P[2].x, P[2].y);
      top.fillStyle(0xff9aa2, 1).fillTriangle(P[1].x + 3, P[1].y + 2, (P[1].x + P[2].x) / 2, P[1].y + 2, (P[0].x + P[1].x) / 2, (P[0].y + P[1].y) / 2);
      if (A.phase === 'res') top.fillStyle(0x0d1430, 0.6).fillCircle(cx, cy, R + 18);
      rays.clear(); if (A.phase !== 'idle' && A.phase !== 'spin') { const e = Math.min(1, (now - A.tl) / 450), rr = (R + 40) * (0.3 + 0.7 * e) + 30, ra = now / 1600, ry = A.phase === 'res' ? A.hy : cy;
        rays.fillStyle(0xffd23a, 0.18).fillCircle(cx, ry, R * 0.7 * e);
        for (let k = 0; k < 16; k++) { const t = ra + k * Math.PI / 8; rays.fillStyle(k % 2 ? 0xfff0a0 : 0xffb21a, 0.3).fillTriangle(cx, ry, cx + Math.cos(t - 0.1) * rr * 2, ry + Math.sin(t - 0.1) * rr * 2, cx + Math.cos(t + 0.1) * rr * 2, ry + Math.sin(t + 0.1) * rr * 2); } }
      fxg.clear(); for (const q of A.parts) { const ws = Math.abs(Math.cos(q.r)) * q.s + 1; fxg.fillStyle(q.c, Math.min(1, q.life * 1.5)).fillRect(q.x - ws / 2, q.y - q.s / 2, ws, q.s * 0.6); }
      if (A.phase === 'land') { const f = Math.max(0, 0.95 - (now - A.tl) / 300); if (f > 0) fxg.fillStyle(0xffffff, f).fillCircle(cx, cy, R + 14); }
    };
    const burst = (N, x, y, v0 = 160) => { for (let i = 0; i < N; i++) { const a = rnd() * PI2, v = v0 * (0.4 + rnd()); A.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, s: 4 + rnd() * 4, r: rnd() * 6, vr: 6 + rnd() * 10, c: [0xffd23a, 0xffffff, 0xff7a2a, 0x7fe3f0, 0xa05cff, 0xff3b4a][i % 6], life: 1 + rnd() * 0.6 }); } };
    const hint = T_(this, c, w / 2, cy + R + 26, A.phase === 'spin' ? '转动中… 点任意处跳过' : '', { size: 8, color: '#d8def5' });
    const popIt = () => { // 中奖图标从转盘里飞出，放大到中间
      const am = A.rot + (Wh.win + 0.5) * seg, k = wheelIconC(this, Wh.opts[Wh.win], 38); c.add(k); k.setPosition(cx + Math.cos(am) * R * 0.66, cy + Math.sin(am) * R * 0.66); A.pop = k;
      this.tweens.add({ targets: k, x: cx, y: A.hy, scale: 2.5, duration: 650, ease: 'Back.easeOut' }); sfx('rare');
      { const cam = this.cameras.main, z0 = cam.zoom; this.tweens.add({ targets: cam, zoom: z0 * 1.04, duration: 170, yoyo: true, hold: 120, ease: 'Sine.easeInOut', onComplete: () => cam.setZoom(z0) }); }
    };
    A.hy = cy - R * 0.32;
    const startLand = () => { A.phase = 'land'; A.tl = this.time.now; A.rot = A.r1; A.w = 0; Wh.spun = 1; save(); hint.setText(''); burst(70, cx, cy, 260); this.cameras.main.shake(200, 0.006); sfx('unique'); };
    const toRes = () => { if (A.phase === 'spin') startLand(); A.phase = 'res'; A.parts.length || burst(50, cx, A.hy, 220); this.refresh(); };
    let last = this.time.now;
    const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!c.active) { ev.remove(); mk.destroy(); return; } const now = this.time.now, dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (A.phase === 'spin') { const t = Math.min(1, (now - A.t0) / A.dur), e = 1 - Math.pow(1 - t, 4), r = A.r0 + (A.r1 - A.r0) * e, ti = Math.floor((r + Math.PI / 2) / seg);
        A.w = (r - A.rot) / Math.max(dt, 0.001); if (ti !== A.tick) { A.tick = ti; A.kv = -14 * Math.min(1, 6 / Math.max(1, A.w)); if (A.w < 25) sfx('click'); } A.rot = r; if (t >= 1) startLand(); }
      else if (A.phase === 'idle') A.rot += dt * 0.2;
      else if (A.phase === 'land' && now - A.tl > 650) { A.phase = 'pop'; popIt(); }
      else if (A.phase === 'pop' && now - A.tl > 1600) { A.phase = 'res'; this.refresh(); return; }
      A.kv += (-A.kick * 260 - A.kv * 14) * dt; A.kick += A.kv * dt; // 指针弹簧
      for (const q of A.parts) { q.vy += 300 * dt; q.vx *= 0.99; q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt; q.life -= dt * 0.6; } A.parts = A.parts.filter(q => q.life > 0);
      if (A.phase === 'res' && rnd() < 0.25) A.parts.push({ x: cx + (rnd() - 0.5) * 120, y: A.hy - 60, vx: (rnd() - 0.5) * 40, vy: 20, s: 3, r: 0, vr: 8, c: 0xfff0a0, life: 1 });
      draw(now); } });
    draw(this.time.now);
    const by = cy + R + 34, bw = Math.floor((w - 28) / 2), hope = (S.glyphs && S.glyphs.hope) || 0;
    if (A.phase === 'idle') {
      T_(this, c, w / 2, by - 10, '8 件独特转出 1 件 · ★ = 和你技能同标签（更容易中）', { size: 8, color: '#d8def5' });
      mkBtn(this, c, 14, by + 6, w - 28, 44, '转！', () => { A.phase = 'spin'; A.t0 = this.time.now; A.dur = 4200; A.r0 = A.rot; const tgt = -Math.PI / 2 - (Wh.win + 0.5) * seg + (rnd() - 0.5) * seg * 0.6;
        A.r1 = tgt + Math.ceil((A.r0 - tgt) / PI2) * PI2 + PI2 * 7; A.tick = Math.floor((A.r0 + Math.PI / 2) / seg); sfx('chest'); this.refresh(); }, { style: 'w', size: 12 });
      mkBtn(this, c, 14, by + 58, bw, 30, `放弃（+${REEL.skipShards} 碎片）`, () => { reelSkip(); this.wh = null; toast(`碎片 +${REEL.skipShards}`); if (S.reelsPending.length) this.refresh(); else this.closeWin(); }, { size: 8, style: 'r' });
      mkBtn(this, c, 14 + bw, by + 58, bw, 30, '稍后再开', () => this.closeWin(), { size: 8 });
    } else if (A.phase !== 'res') {
      zoneOn(this, c, 0, 0, w, h, toRes);
    } else { // 结果：大图标悬在转盘上方（光环 + 上下浮动），下面一张名片
      const it = Wh.opts[Wh.win], tw = it.kind === 'trig', nm = wheelName(it);
      const halo = this.add.graphics(); c.add(halo); halo.fillStyle(0xffd23a, 0.25).fillCircle(0, 0, 58); halo.fillStyle(0xfff0a0, 0.3).fillCircle(0, 0, 44); halo.lineStyle(4, 0xffe27a, 1).strokeEllipse(0, -64, 64, 14); halo.lineStyle(2, 0xffffff, 0.8).strokeEllipse(0, -64, 56, 10);
      const k = wheelIconC(this, it, 38); c.add(k); k.setScale(2.5);
      halo.setPosition(cx, A.hy); k.setPosition(cx, A.hy);
      this.tweens.add({ targets: [k, halo], y: A.hy - 6, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
      const cw = w - 28, x = 14, y = cy + R * 0.42, chh = by - y - 4;
      bub(this, c, x, y, cw, chh, 0x4f5d9a, { r: 12, ring: 0xffa31a });
      T_(this, c, w / 2, y + 8, nm, { size: textW(nm, 12) <= cw - 16 ? 12 : 8, color: '#ffd23a' });
      T_(this, c, w / 2, y + 28, `${tw ? '魂龛' : KIND_N[it.kind] || it.kind} · ${it.ilvl} 级 · 独特${Wh.tag[Wh.win] ? '   ★ 同标签' : ''}`, { size: 8, color: '#e0e4f0' });
      const lines = (tw ? [`【${trigKindN(it.c)}】${TCOND[it.c].n}`, trigU(it).d] : ruleLines(it)).flatMap(l => wrapText(l, cw - 24, 8));
      const mx = Math.max(1, Math.floor((chh - 50) / 13)), L = lines.length > mx ? [...lines.slice(0, mx - 1), lines[mx - 1].slice(0, -1) + '…'] : lines;
      T(this, x + 12, y + 44, L.join('\n'), { size: 8, color: '#b6f09a', parent: c });
      mkBtn(this, c, 14, by + 6, w - 28, 44, '收下', () => { wheelTake(); this.wh = null; toast(`${nm} 进背包了`, '#ffd23a'); if (S.reelsPending.length) this.refresh(); else this.closeWin(); }, { style: 'w', size: 12 });
      mkBtn(this, c, 14, by + 58, bw, 30, `重转（希望符 ${hope}）`, () => { if (wheelReroll()) { this.wh = null; this.refresh(); } else toast('没有希望符'); }, { size: 8, disabled: !hope });
      mkBtn(this, c, 14 + bw, by + 58, bw, 30, `放弃（+${REEL.skipShards} 碎片）`, () => { reelSkip(); this.wh = null; toast(`碎片 +${REEL.skipShards}`); if (S.reelsPending.length) this.refresh(); else this.closeWin(); }, { size: 8, style: 'r' });
    }
  },
});
