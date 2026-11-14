/* 手机包：矢量物品图标 + 物品档次效果 + 左下角半圆拼合血球（只进手机包）
   - 物品图标：62_icons.js 的 SVG 启动前画成 128 像素画布，这里注册成线性过滤的贴图 iv_键，格子里缩到格子大小（技能石、符文仍用像素图）
   - 档次（越高叠得越多）：罕见 / 稀有白色底光，稀有起有扫光（70_gfx 的 mkCell 已有），独特加旋转光芒，传奇加外圈呼吸光晕和星点，溢彩加彩虹流光和星点
   - 血球：生命和灯火合成一个球，左半生命（球边浅蓝是护盾），右半灯火，中间铜隔条 */
const TIER_OF = it => !it || it.kind === 'mod' || it.kind === 'gem' ? null : it.ex ? 'ex' : it.la ? 'leg' : 'r' + (it.rar || 0); // 传奇（稀有 + 传奇词条）用原来熔铸传奇的光晕
const GEN_TINT = ['#c9cfdc', '#4fb8ff', '#ffd23a']; // 底材一代 / 二代 / 三代
{
  const _bt = buildTextures;
  buildTextures = function (sc) {
    _bt(sc);
    const T = sc.textures, add = (k, c) => { if (T.exists(k)) T.remove(k); T.addCanvas(k, c); T.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR); };
    for (const k in ICON_CV) add('iv_' + k, ICON_CV[k]);
    const cv = (n, f) => { const c = document.createElement('canvas'); c.width = c.height = n; f(c.getContext('2d'), n); return c; };
    add('fx_glow', cv(64, (x, n) => { const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.45, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); }));
    add('fx_rays', cv(96, (x, n) => { x.translate(n / 2, n / 2); for (let i = 0; i < 12; i++) { x.rotate(Math.PI / 6); const g = x.createLinearGradient(0, 0, 0, -n / 2); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(-2, 0); x.lineTo(-7, -n / 2); x.lineTo(7, -n / 2); x.lineTo(2, 0); x.fill(); } }));
    add('fx_rainbow', cv(64, (x, n) => { const g = x.createConicGradient ? x.createConicGradient(0, n / 2, n / 2) : null; if (g) { ['#ff6a6a', '#ffd23a', '#7cf05a', '#5fe0ff', '#6a7bff', '#e36cff', '#ff6a6a'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c)); x.fillStyle = g; } else x.fillStyle = '#9ff'; x.filter = 'blur(4px)'; x.beginPath(); x.arc(n / 2, n / 2, n / 2 - 6, 0, Math.PI * 2); x.fill(); }));
    add('fx_star', cv(32, (x, n) => { x.fillStyle = '#fff8d0'; x.shadowColor = '#ffd23a'; x.shadowBlur = 6; x.beginPath(); const c = n / 2; x.moveTo(c, 3); x.quadraticCurveTo(c, c, n - 3, c); x.quadraticCurveTo(c, c, c, n - 3); x.quadraticCurveTo(c, c, 3, c); x.quadraticCurveTo(c, c, c, 3); x.fill(); }));
  };
  // 格子：换矢量图标、叠档次效果、品质数字上色
  const _mk = mkCell;
  mkCell = function (sc, parent, x, y, it, o = {}) {
    const c = _mk(sc, parent, x, y, it, o), s = o.size || 20, t = TIER_OF(it);
    if (!it || it.kind === 'mod' || it.kind === 'gem') return c;
    const key = 'i_' + iconOf(it), vk = 'iv_' + iconOf(it);
    const icon = c.list.find(ch => ch.type === 'Image' && ch.texture && ch.texture.key === key);
    if (icon && sc.textures.exists(vk)) { icon.setTexture(vk).setOrigin(0.5).setPosition(s / 2, s / 2).setDisplaySize(s * 0.84, s * 0.84); if (t === 'r0') icon.setTint(0xd8d8d8); }
    const qt = c.list.find(ch => ch.type === 'Text' && it.gen && ch.text === String(it.gen + 1)); if (qt) qt.setTint(hex(GEN_TINT[it.gen] || COL.dim));
    if (s >= 30 && (it.set || it.rar === 3)) { const tg = it.set ? ['套', '#2f8a45'] : ['神', '#b8402a'], tc = sc.add.container(s - 12, s - 11); c.add(tc); rect(sc, 0, 0, 12, 11, tg[1], 1, tc); T(sc, 6, 5.5, tg[0], { size: 8, color: '#ffffff', align: 'center', valign: 'middle', shadow: false, parent: tc }); c.tagC = tc; } // ui-v2：右下角标（套装 / 神话）
    if (G.fx === false || !t || t === 'r0') return c;
    const at = icon ? c.list.indexOf(icon) : c.list.length, layers = [], tw = [];
    const im = (k, a, sz) => { const i = sc.add.image(s / 2, s / 2, k).setDisplaySize(s * sz, s * sz).setAlpha(a); layers.push(i); return i; };
    const pulse = (target, from, to, d) => tw.push(sc.tweens.add({ targets: target, alpha: { from, to }, duration: d, yoyo: true, repeat: -1, ease: 'Sine.inOut' }));
    if (t === 'leg' || t === 'ex') { const au = nine(sc, -2, -2, s + 4, s + 4, 'f_glow', 3).setTint(hex(t === 'leg' ? '#ff5fd0' : '#7dffcf')); layers.push(au); pulse(au, 0.35, 0.95, 900); }
    if (t === 'ex') { const rb = im('fx_rainbow', 0.75, 0.9); tw.push(sc.tweens.add({ targets: rb, angle: 360, duration: 3500, repeat: -1 })); }
    if (t === 'r3' || t === 'leg') { const ry = im('fx_rays', t === 'leg' ? 0.75 : 0.6, 1.0); tw.push(sc.tweens.add({ targets: ry, angle: 360, duration: t === 'leg' ? 6000 : 9000, repeat: -1 })); }
    im('fx_glow', t === 'r1' ? 0.3 : t === 'r2' ? 0.45 : 0.55, 0.9);
    layers.forEach((l, i) => c.addAt(l, at + i));
    if ((t === 'leg' || t === 'ex') && s >= 18) for (const [sx, sy, sz, dl] of [[s - 3, 3, 0.38, 0], [4, s - 5, 0.26, 700]]) { const st = sc.add.image(sx, sy, 'fx_star').setDisplaySize(s * sz, s * sz).setAlpha(0); c.add(st); tw.push(sc.tweens.add({ targets: st, alpha: { from: 0.1, to: 1 }, angle: 45, duration: 800, delay: dl, yoyo: true, repeat: -1, ease: 'Sine.inOut' })); }
    c.once('destroy', () => tw.forEach(x => x.remove()));
    return c;
  };
}
// 半圆拼合血球：左半生命、右半能量（沿用原来的球底图、液体画法和高光）。灯火只是倒计时，画在顶栏进度条下面（用户 11-14）
{
  const _bh = MobileUI.prototype.buildHud, _uh = MobileUI.prototype.updateHud, _do = UI.prototype.drawOrb;
  MobileUI.prototype.drawOrb = function (o, ...a) { if (this.splitOrb && (o === this.hpOrb || o === this.soulOrb)) return; return _do.call(this, o, ...a); }; // 两个球交给 drawSplit 画
  MobileUI.prototype.buildHud = function () {
    _bh.call(this); this.splitOrb = true;
    for (const [t, x, y] of [[this.hpT, 17, 27], [this.defT, 17, 40], [this.soulT, 47, 27], [this.burnT, 47, 40]]) { this.hpOrb.add(t); t.setPosition(x, y); } // 先把右半边的字挪到血球上
    this.hpT.setScale(this.hpT.scale * 0.85); this.soulT.setScale(this.soulT.scale * 0.8); this.burnT.setScale(this.burnT.scale * 0.85); // 半个球放不下原来的字号
    this.burnT.setTint(0xa8e4ff); this.soulT.setTint(0xe6f6ff); this.soulOrb.removeAll(true); // 再清空原灯火瓶（容器保留，别处还会切换它的可见性）
    this.lampT = T(this, 196, -1, '', { size: 8, color: '#ffd36a', align: 'right', parent: this.bossC });
  };
  MobileUI.prototype.updateHud = function () {
    _uh.call(this);
    const P = STATS, hf = clamp(player.life / P.life, 0, 1), df = P.shield > 0 ? clamp(player.shield / P.shield, 0, 1) : 0, sf = clamp(player.soul / P.soulMax, 0, 1), ef = clamp(player.en / (P.enMax || 1), 0, 1);
    const lad = RUN && RUN.mode === 'ladder', blink = RUN && !lad && sf < SOUL.lowWarn && (G.time * 4 | 0) % 2;
    // 灯火：顶栏进度条下面一条细条 + 右端“还能走多久”（按最近 3 秒的实际净变化估；击杀会续）
    if (RUN) { const now = G.time, ls = this.lampS; if (!ls || ls.run !== RUN) this.lampS = { run: RUN, t: now, v: player.soul, net: null }; else if (now - ls.t >= 0.25) { const d = (player.soul - ls.v) / (now - ls.t), k = Math.min(1, (now - ls.t) / 3); ls.net = ls.net == null ? d : ls.net + (d - ls.net) * k; ls.t = now; ls.v = player.soul; } }
    const net = RUN && this.lampS && this.lampS.net != null ? this.lampS.net : null, left = net != null && net < -0.05 ? player.soul / -net : Infinity;
    if (RUN) { const b = this.bossG, fw = Math.round(184 * sf); b.fillStyle(0x120c1c, 1).fillRect(8, 11, 184, 2); b.fillStyle(player.soul <= 0 ? 0x5a4a7a : blink ? 0xff6b5a : sf < LST.ember.max ? 0xd8a040 : 0xffd36a, 1).fillRect(8, 11, fw, 2); }
    const st = RUN && TRIGS_RT.lampState !== 'dim' ? LST[TRIGS_RT.lampState].n.slice(0, 1) + ' ' : '', lt = !RUN ? '' : st + (left < 600 ? mmss(left) : Math.round(sf * 100) + '%'); if (this.lampT.text !== lt) this.lampT.setText(lt); this.lampT.setTint(hex(blink ? '#ff6b5a' : '#ffd36a'));
    // 能量：右半球，数字是当前值，下面是每秒净变化（3 秒平滑）
    if (RUN) { const now = G.time, es = this.enS; if (!es || es.run !== RUN) this.enS = { run: RUN, t: now, v: player.en, net: null }; else if (now - es.t >= 0.25) { const d = (player.en - es.v) / (now - es.t), k = Math.min(1, (now - es.t) / 3); es.net = es.net == null ? d : es.net + (d - es.net) * k; es.t = now; es.v = player.en; } }
    const en = RUN && this.enS && this.enS.net != null ? this.enS.net : null, et = String(Math.round(player.en)), bt = !RUN || en == null || Math.abs(en) < 0.05 ? '' : `${en >= 0 ? '+' : '−'}${r1(Math.abs(en))}/秒`;
    if (this.soulT.text !== et) this.soulT.setText(et); if (this.burnT.text !== bt) this.burnT.setText(bt);
    const dry = ef < 0.12;
    const o = this.hpOrb, key = [Math.round(hf * 46), Math.round(df * 40), Math.round(ef * 46), dry].join(); if (o.splitKey === key) return; o.splitKey = key;
    const g = o.g, { cx, cy, r } = ORB, ri = r - 2.5; g.clear();
    const liquid = (f, side, liq, hi, dark) => { const top = Math.round(cy + ri - f * 2 * ri);
      for (let j = Math.max(top, Math.ceil(cy - ri)); j < cy + ri; j++) { const dy = j + 0.5 - cy, hw = Math.sqrt(Math.max(0, ri * ri - dy * dy)); if (hw < 0.5) continue;
        const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw), a = side < 0 ? x0 : cx, b = side < 0 ? cx : x1; if (b <= a) continue;
        g.fillStyle(j < top + 2 ? hi : liq, 1).fillRect(a, j, b - a, 1); if (j >= top + 2 && side < 0) g.fillStyle(dark, 1).fillRect(a, j, Math.max(1, Math.round((x1 - x0) * 0.22)), 1); } };
    liquid(hf, -1, 0xb52a2a, 0xff7a6a, 0x6a1418);
    liquid(ef, 1, dry ? 0x4a6a8a : 0x2f8fd8, dry ? 0x9ab8d0 : 0xa8e4ff, 0x123a6a);
    if (df > 0) { g.fillStyle(0xbfe0ff, 1); const n = Math.round(df * 60); for (let i = 0; i < n; i++) { const an = Math.PI / 2 + (i / 60) * Math.PI; g.fillRect(Math.round(cx - 0.5 + Math.cos(an) * (r - 1.5)), Math.round(cy - 0.5 + Math.sin(an) * (r - 1.5)), 1, 1); } } // 护盾：左半球边从下往上包
    g.fillStyle(0x0d0912, 1).fillRect(cx - 1, cy - r + 1, 2, r * 2 - 2); g.fillStyle(0xc9893a, 1).fillRect(cx - 1, cy - r - 2, 2, 4).fillRect(cx - 1, cy + r - 2, 2, 4); // 铜隔条
  };
}
// 能量 / 灯火分项：下行中点右半个球，看能量的回复和消耗、灯火的燃烧，和照现在的速度还能走多久
{
  const _bh = MobileUI.prototype.buildHud;
  MobileUI.prototype.buildHud = function () {
    _bh.call(this);
    zoneOn(this, this.hpOrb, ORB.cx, ORB.cy - ORB.r, ORB.r, ORB.r * 2, () => {
      if (!RUN) return; const P = STATS, lad = RUN.mode === 'ladder', burn = lad ? 0 : (SOUL.burn + lampBurnL(RUN.base)) * P.burnMul, skill = P.trigCost || 0;
      const hit = P.lampHit ? P.lampHit * (P.enGainMul || 1) / Math.max(0.1, P.lampGap || 1) : 0, en = this.enS && this.enS.net, net = this.lampS && this.lampS.net, left = net != null && net < -0.05 ? player.soul / -net : null;
      this.ask('能量和灯火', () => {}, '知道了', `能量 ${Math.round(player.en)} / ${fmt(P.enMax)}：放技能用，不够时这次出手改放底技能\n每秒自然回 +${r1(P.enRegen)}，底技能命中约 +${r1(hit)}/秒\n魂龛技能消耗约 −${r1(skill)}/秒（按期望频率估算）\n实际净变化 ${en == null ? '—' : (en >= 0 ? '+' : '−') + r1(Math.abs(en)) + '/秒'}\n\n灯火（顶上那条细条）：这一趟的倒计时，放技能不消耗\n燃烧 −${r1(burn)}/秒${lad ? '（天梯按层数另算，越烧越快）' : `（第 ${RUN.base} 层）`}，击杀会回${left != null ? `\n照现在的速度约 ${Math.ceil(left)} 秒灯灭` : ''}`);
    });
  };
}
