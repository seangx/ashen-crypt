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

Object.assign(MobileUI.prototype, {
  win_reels(c, w, h) {
    const p = wheelCur(); if (!p) { T_(this, c, w / 2, 40, '没有未开的轮盘', { size: 12 }); mkBtn(this, c, w / 2 - 40, h - 40, 80, 28, '返回', () => this.closeWin()); return; }
    const Wh = p.wheel, sc = this, n = Wh.opts.length, seg = Math.PI * 2 / n;
    let A = this.wh; if (!A || A.wh !== Wh) A = this.wh = { wh: Wh, phase: Wh.spun ? 'res' : 'idle', rot: -Math.PI / 2 - seg / 2, t0: 0, tick: 0, kick: 0, parts: [] };
    T_(this, c, w / 2, 16, `第 ${p.floor} 层里程碑 · 还有 ${S.reelsPending.length} 次`, { size: 8, color: '#d8def5' });
    const R = Math.min(w / 2 - 30, 132), cx = w / 2, cy = 40 + R + 14;
    const rays = this.add.graphics(); c.add(rays);
    const g = this.add.graphics(); c.add(g);
    const icons = Wh.opts.map(it => { const im = this.add.image(0, 0, wheelIcon(this, it)); im.setScale(26 / Math.max(im.width, im.height)); c.add(im); return im; });
    const stars = Wh.tag.map(t => t ? T_(this, c, 0, 0, '★', { size: 8, color: '#fff7b0' }) : null);
    const ptr = this.add.graphics(); c.add(ptr); const fxg = this.add.graphics(); c.add(fxg);
    const SEGC = [0xffb21a, 0xff8a1a];
    const draw = (now) => {
      const rot = A.rot; g.clear();
      g.fillStyle(DK, 1).fillCircle(cx, cy + 4, R + 10); g.fillStyle(0xffd23a, 1).fillCircle(cx, cy, R + 8); g.fillStyle(0xc9551a, 1).fillCircle(cx, cy, R + 3);
      for (let i = 0; i < n; i++) { const a0 = rot + i * seg, a1 = a0 + seg, it = Wh.opts[i];
        g.fillStyle(it.kind === 'trig' ? 0xffd23a : SEGC[i % 2], 1).slice(cx, cy, R, a0, a1, false).fillPath();
        if (A.phase !== 'idle' && A.phase !== 'spin' && i === Wh.win) { g.fillStyle(0xffffff, 0.35 + 0.25 * Math.sin(now / 90)).slice(cx, cy, R, a0, a1, false).fillPath(); }
        g.lineStyle(3, DK, 1).lineBetween(cx, cy, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
        const am = a0 + seg / 2, ir = R * 0.64; icons[i].setPosition(cx + Math.cos(am) * ir, cy + Math.sin(am) * ir);
        if (stars[i]) stars[i].setPosition(cx + Math.cos(am) * R * 0.88 - 4, cy + Math.sin(am) * R * 0.88 - 6); }
      g.lineStyle(4, DK, 1).strokeCircle(cx, cy, R);
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, on = (Math.floor(now / 160) + k) % 2; g.fillStyle(on ? 0xfffbe0 : 0xb06a10, 1).fillCircle(cx + Math.cos(a) * (R + 5.5), cy + Math.sin(a) * (R + 5.5), 2.5); } // 灯泡
      g.fillStyle(DK, 1).fillCircle(cx, cy + 2, 17); g.fillStyle(0xffd23a, 1).fillCircle(cx, cy, 15); g.fillStyle(0xfff3b0, 1).fillCircle(cx - 4, cy - 4, 5);
      ptr.clear(); const kk = A.kick * 0.5, px = cx, py = cy - R - 12; // 指针（过格时被拨一下）
      const P = [[0, 26], [-11, -4], [11, -4]].map(([x, y]) => ({ x: px + x * Math.cos(kk) - y * Math.sin(kk), y: py + x * Math.sin(kk) + y * Math.cos(kk) }));
      ptr.fillStyle(DK, 1).fillTriangle(P[0].x, P[0].y + 2, P[1].x - 2, P[1].y, P[2].x + 2, P[2].y); ptr.fillStyle(0xff3b4a, 1).fillTriangle(P[0].x, P[0].y, P[1].x, P[1].y, P[2].x, P[2].y); ptr.fillStyle(0xffffff, 1).fillCircle(px, py, 4);
      rays.clear(); if (A.phase === 'land' || A.phase === 'res') { const ra = now / 1400, rr = A.phase === 'res' ? R + 60 : R + 40 + 30 * Math.min(1, (now - A.t0) / 400);
        for (let k = 0; k < 14; k++) { const t = ra + k * Math.PI / 7; rays.fillStyle(k % 2 ? 0xffe27a : 0xffa31a, 0.32).fillTriangle(cx, cy, cx + Math.cos(t - 0.12) * rr, cy + Math.sin(t - 0.12) * rr, cx + Math.cos(t + 0.12) * rr, cy + Math.sin(t + 0.12) * rr); } }
      fxg.clear(); for (const q of A.parts) { fxg.fillStyle(q.c, Math.max(0, q.life)).fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
      if (A.phase === 'land') { const f = Math.max(0, 0.9 - (now - A.t0) / 350); if (f > 0) fxg.fillStyle(0xffffff, f).fillCircle(cx, cy, R + 10); }
    };
    const burst = (N, x, y) => { for (let i = 0; i < N; i++) { const a = rnd() * Math.PI * 2, v = 80 + rnd() * 200; A.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, s: 3 + rnd() * 3, c: [0xffd23a, 0xffffff, 0xff8a1a, 0x9fe8ff][i % 4], life: 1 }); } };
    const startLand = () => { const s = this.time.now; A.phase = 'land'; A.t0 = s; A.rot = A.r1; Wh.spun = 1; save(); burst(60, cx, cy - R * 0.5); this.cameras.main.shake(220, 0.006); sfx('unique'); };
    let last = this.time.now;
    const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!c.active) { ev.remove(); return; } const now = this.time.now, dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (A.phase === 'spin') { const t = Math.min(1, (now - A.t0) / A.dur), e = 1 - Math.pow(1 - t, 3), r = A.r0 + (A.r1 - A.r0) * e, ti = Math.floor((r + Math.PI / 2) / seg);
        if (ti !== A.tick) { A.tick = ti; A.kick = -0.6; sfx('click'); } A.rot = r; if (t >= 1) startLand(); }
      else if (A.phase === 'idle') A.rot += dt * 0.25;
      else if (A.phase === 'land' && now - A.t0 > 1100) { A.phase = 'res'; this.refresh(); return; }
      A.kick *= Math.pow(0.002, dt);
      for (const q of A.parts) { q.vy += 420 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt * 0.8; } A.parts = A.parts.filter(q => q.life > 0);
      draw(now); } });
    draw(this.time.now);
    const by = cy + R + 24, bw = Math.floor((w - 28) / 2), hope = (S.glyphs && S.glyphs.hope) || 0;
    if (A.phase === 'idle') {
      T_(this, c, w / 2, by, '8 件独特里转出 1 件 · ★ = 和你的技能同标签（更容易转到）', { size: 8, color: '#d8def5' });
      mkBtn(this, c, 14, by + 18, w - 28, 44, '转！', () => { A.phase = 'spin'; A.t0 = this.time.now; A.dur = 3800; A.r0 = A.rot; const tgt = -Math.PI / 2 - (Wh.win + 0.5) * seg + (rnd() - 0.5) * seg * 0.6;
        A.r1 = tgt + Math.ceil((A.r0 - tgt) / (Math.PI * 2)) * Math.PI * 2 + Math.PI * 2 * 5; A.tick = Math.floor((A.r0 + Math.PI / 2) / seg); sfx('chest'); this.refresh(); }, { style: 'w', size: 12 });
      mkBtn(this, c, 14, by + 70, bw, 30, `放弃（+${REEL.skipShards} 碎片）`, () => { reelSkip(); this.wh = null; toast(`碎片 +${REEL.skipShards}`); if (S.reelsPending.length) this.refresh(); else this.closeWin(); }, { size: 8, style: 'r' });
      mkBtn(this, c, 14 + bw, by + 70, bw, 30, '稍后再开', () => this.closeWin(), { size: 8 });
    } else if (A.phase === 'spin' || A.phase === 'land') {
      T_(this, c, w / 2, by + 8, A.phase === 'spin' ? '转动中… 点任意处跳过' : '', { size: 8, color: '#d8def5' });
      zoneOn(this, c, 0, 0, w, h, () => { if (A.phase === 'spin') startLand(); A.phase = 'res'; this.refresh(); });
    } else { // 结果卡
      const it = Wh.opts[Wh.win], tw = it.kind === 'trig', nm = wheelName(it), cw = w - 40, chh = 150, x = 20, y = cy - chh / 2 + 6;
      bub(this, c, x, y, cw, chh, 0x4f5d9a, { r: 12, ring: 0xffa31a });
      bub(this, c, x + 12, y + 14, 64, 64, 0x241c38, { r: 10, ring: 0xffd23a });
      const im = this.add.image(x + 44, y + 46, wheelIcon(this, it)); im.setScale(48 / Math.max(im.width, im.height)); c.add(im);
      this.tweens.add({ targets: im, scale: im.scale * 1.12, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.easeInOut' });
      const tx = x + 88, tmw = cw - 96;
      T(this, tx, y + 14, nm, { size: textW(nm, 12) <= tmw ? 12 : 8, color: '#ffd23a', parent: c });
      T(this, tx, y + 34, `${tw ? '魂龛' : KIND_N[it.kind] || it.kind} · ${it.ilvl} 级 · 独特`, { size: 8, color: '#e0e4f0', parent: c });
      if (Wh.tag[Wh.win]) { bub(this, c, tx, y + 50, 64, 18, 0xffd23a, { r: 9 }); T_(this, c, tx + 32, y + 53, '★ 同标签', { size: 8, color: '#2a1306', shadowColor: null }); }
      const lines = (tw ? [`【${trigKindN(it.c)}】${TCOND[it.c].n}`, trigU(it).d] : ruleLines(it)).flatMap(l => wrapText(l, cw - 24, 8));
      const L = lines.length > 4 ? [...lines.slice(0, 3), lines[3].slice(0, -1) + '…'] : lines;
      T(this, x + 12, y + 86, L.join('\n'), { size: 8, color: '#b6f09a', parent: c });
      mkBtn(this, c, 14, by + 6, w - 28, 44, '收下', () => { const g2 = wheelTake(); this.wh = null; toast(`${nm} 进背包了`, '#ffd23a'); if (S.reelsPending.length) this.refresh(); else this.closeWin(); }, { style: 'w', size: 12 });
      mkBtn(this, c, 14, by + 58, bw, 30, `重转（希望符 ${hope}）`, () => { if (wheelReroll()) { this.wh = null; this.refresh(); } else toast('没有希望符'); }, { size: 8, disabled: !hope });
      mkBtn(this, c, 14 + bw, by + 58, bw, 30, `放弃（+${REEL.skipShards} 碎片）`, () => { reelSkip(); this.wh = null; toast(`碎片 +${REEL.skipShards}`); if (S.reelsPending.length) this.refresh(); else this.closeWin(); }, { size: 8, style: 'r' });
      if (!A.burst) { A.burst = 1; burst(40, cx, y + 40); }
    }
  },
});
