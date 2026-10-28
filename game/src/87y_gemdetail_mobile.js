/* 宝石详情弹窗（手机）：点技能石 / 辅助石 → 名字、图标、等级品质、标签、效果、能插在哪 → 装备 / 卸下 */
const gemNm = g => g ? (isSkill(g) ? GEM_BY[g.b].n : MOD_BY[g.mid].n) : '';
Object.assign(MobileUI.prototype, {
  gemDetail(it, o = {}) {
    const T0 = o.T0 || null, sk = isSkill(it), inSock = o.k != null;
    if (it.isNew) { it.isNew = false; save(); }
    const lines = [];
    if (sk) {
      const G = GEM_BY[it.b];
      lines.push([`${it.lvl || 1} 级 · 品质 ${it.q || 0}% · ${FORM_N[G.form] || '技能石'}`, '#ffe066']);
      for (const [t, c] of gemLines(it)) if (t && !/主手 ×|现在的主手|需要盾牌|经验/.test(t)) lines.push([t, c]);
      lines.push([`施放耗灯：${gemCost(it).toFixed(1)} / 次`, '#ffb347']);
      lines.push([`插在：任意魂龛的孔（每个魂龛最多 ${T0 ? trigMaxSkills(T0) : 1} 颗技能石）${G.form ? '' : ''}`, '#b9c2ea']);
    } else {
      const host = T0 && T0.socks.find(isSkill);
      for (const l of modTip(it)) if (l && l.t && !/^插在|经验/.test(l.t)) lines.push([l.t, l.c || '#e0e4f0']);
      lines.push(['插在：魂龛的孔里，辅助同一魂龛里对得上的技能石', '#b9c2ea']);
      if (host) lines.push([supportFits(it, host) ? `对 ${gemNm(host)} 生效` : `${gemNm(host)} 不满足条件，不生效`, supportFits(it, host) ? '#7cf05a' : '#ff6a5a']);
    }
    const build = (p, w) => {
      const key = sk ? 'i_' + iconOf(it) : 'mod_' + it.mid, im = this.textures.get(key).getSourceImage(), s = 44;
      const g = this.add.graphics(); p.add(g);
      if (sk) { g.fillStyle(DK, 1).fillRoundedRect(-2, -2, s + 4, s + 5, 9); g.fillStyle(0xf58a3a, 1).fillRoundedRect(0, 0, s, s, 8); }
      else { g.fillStyle(DK, 1).fillCircle(s / 2, s / 2 + 1, s / 2 + 2); g.fillStyle(0x3a8ae8, 1).fillCircle(s / 2, s / 2, s / 2); }
      img(this, s / 2 - im.width, s / 2 - im.height, key, p).setScale(2);
      T(this, s + 10, 4, gemNm(it), { parent: p, color: '#ffffff', shadowColor: '#1a1426' });
      T(this, s + 10, 22, sk ? '技能石' : (MOD_BY[it.mid].field ? '力场辅助石' : '辅助石'), { size: 8, parent: p, color: sk ? '#ffb347' : '#6fc8ff' });
      let y = s + 10;
      for (const [t, c] of lines) { const r = TW(this, 0, y, t, w, { size: 8, color: c || '#e0e4f0', parent: p }); y += r.h + 3; }
      return y;
    };
    const acts = [];
    if (inSock) acts.push({ l: '卸下', style: 'r', fn: () => { unsocketAt(T0, o.k); sfx('click'); this.refresh(); } });
    else acts.push({ l: '装备', style: 'w', fn: () => this.gemEquip(it, T0) });
    this.popup(build, acts);
  },
  gemEquip(it, T0) {
    if (!T0) { toast('这一位还没有魂龛，先放一个'); return; }
    const empty = []; for (let k = 0; k < T0.sock; k++) if (!T0.socks[k] && trigCanSock(T0, k, it)) empty.push(k);
    if (empty.length) { socketInto(T0, empty[0], it); sfx('click'); toast(`已装进第 ${empty[0] + 1} 孔`); gemPick = null; this.refresh(); return; }
    const any = T0.socks.some((_, k) => trigCanSock(T0, k, it));
    if (!any) { toast(isSkill(it) && T0.c === 'always' ? '常驻只能插瘟疫光环、游雷、旋风斩' : '这个魂龛放不下'); return; }
    gemPick = it; toast('没有空孔：点一个亮起的孔替换'); this.refresh();
  },
});
