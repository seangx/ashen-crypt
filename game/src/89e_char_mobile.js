/* 详细角色面板（手机，11-10）：装备页点“详细属性”，弹窗里分段列出全部属性（可上下滑）。
   输出（每个魂龛的技能）→ 六系（伤害提高、主效果强度、穿抗）→ 防御 → 灯火 → 其他 → 职业 */
Object.assign(MobileUI.prototype, {
  charLines() {
    const P = STATS, TA = (P.tree && P.tree.add) || {}, R = P.raw || {}, F = P.flag || {}, L = [], pc = v => Math.round(v * 100) + '%', n1 = v => Math.round(v * 10) / 10;
    const H = t => L.push({ t, c: COL.emberHi }), row = (a, b, c) => L.push({ t: `${a}：${b}`, s: 8, c: c || COL.text }), note = t => L.push({ t, s: 8, c: COL.dim });
    const lv = monLv();
    // ---- 输出 ----
    H('输出');
    row('总秒伤', `${fmt(P.dps)}（出手 ${fmt(P.castDps || 0)} · 响应 ${fmt(P.respDps || 0)}）`, COL.emberHi);
    const wLine = W => { const el = W.el, mn = ELEM.reduce((s, e) => s + (W.min[e] || 0), 0), mx = ELEM.reduce((s, e) => s + (W.max[e] || 0), 0);
      return `${ELEM_N[el] || ''} ${fmt(mn)}–${fmt(mx)} · 每秒 ${n1(W.aps || 0)} 次 · 暴击 ${pc(Math.min(1, W.crit || 0))} ×${(W.critMult || 1.5).toFixed(2)}`; };
    const W0 = P.weapons && P.weapons[0]; if (W0) { row('普攻', wLine(W0), ELEM_C[W0.el]); if (P.castShare) note(`出手类魂龛占掉 ${pc(P.castShare)} 的出手`); }
    (P.trigs || []).forEach((t, i) => { if (!t || !t.on) return; const C = TCOND[t.T.c];
      if (!t.ws.length) return row(`魂龛 ${i + 1} · ${C.n}`, '空', COL.faint);
      for (const W of t.ws) { if (W.util) { row(`魂龛 ${i + 1} · ${C.n}`, `${W.n}（功能）· 每秒约 ${n1(t.per || 0)} 次 · 耗灯 ${n1(W.cost)}`, '#c98cff'); continue; }
        row(`魂龛 ${i + 1} · ${C.n}`, `${(GEM_BY[W.gem] || {}).n || W.n || ''} · 秒伤 ${fmt(t.dps)}`, ELEM_C[W.el]); note(`　${wLine(W)} · 每秒放 ${n1(t.per || 0)} 次 · 耗灯 ${n1(W.cost)}${t.mode === 'always' ? ' / 秒' : ' / 次'}`); } });
    row('通用', `全部伤害提高 ${n1((TA['inc:all'] || 0) + (R['inc:all'] || 0))}% · 攻击速度 ×${(P.aspdInc ? 1 + P.aspdInc / 100 : 1).toFixed(2)} · 基础暴击率 +${n1(P.baseCrit || 0)}%`);
    row('形态', `投射物 +${P.projAdd || 0} · 范围提高 ${n1((R.aoeInc || 0) + (TA.aoeInc || 0))}% · 持续时间提高 ${n1(P.durInc || 0)}% · 延迟 +${n1(P.delayAdd || 0)} 秒`);
    // ---- 六系 ----
    H('六系'); note('伤害提高只对那个元素的技能生效；主效果强度是破甲、灼烧这些减益的强弱');
    for (const e of ELEM) { const inc = (TA['inc:' + e] || 0) + (R['inc:' + e] || 0), efx = ((1 + (TA['efx:' + e] || 0) / 100) * (1 + (F.pureHeart || 0) / 100) - 1) * 100, pen = R['pen:' + e] || 0;
      row(`${ELEM_N[e]} · ${AIL_MAIN[e]}`, `伤害提高 ${n1(inc)}% · 主效果 +${n1(efx)}% · 穿抗 ${n1(pen)}%${fxOn(e) ? ' · 有副效果' : ''}`, ELEM_C[e]); }
    // ---- 防御 ----
    H('防御');
    row('生命 / 护盾', `${fmt(P.life)} / ${fmt(P.shield)}（护盾每秒回复 ${n1(P.shieldRegen || 0)}）`, '#ff8a7a');
    row('护甲', `${fmt(P.armor)}，对 ${lv} 级的怪减伤 ${pc(armorDrL(P.armor, lv))}`);
    row('抗性', ELEM.map(e => `${ELEM_N[e]} ${Math.round(P.res[e])}`).join(' · ') + `（上限 ${P.maxRes}）`);
    row('闪避 / 格挡', `闪避 ${Math.round(P.dodge || 0)}（上限 ${P.dodgeCap}%） · 格挡 ${pc(P.blockCh || 0)}，挡住减 ${fmt(P.blockVal || 0)}`);
    row('条件减伤', `近战 ${n1(P.meleeDR || 0)}% · 远程 ${n1(P.rangedDR || 0)}% · 精英 ${n1(P.eliteDR || 0)}% · 受控敌人 ${n1(P.ctrlWeaken || 0)}%`);
    row('站位减伤', `每个贴身敌人 ${n1(P.closePer || 0)}%（上限 ${n1(P.closeCap || 0)}%） · 身边没人时 ${n1(P.farDR || 0)}%`);
    row('恢复', `每秒回生命 ${n1(P.lifeRegen || 0)} · 击杀回生命 ${n1(P.lifeOnKill || 0)} · 命中回护盾 ${n1(P.shieldOnHit || 0)}‰`);
    row('坚韧', `${fmt(toughness(P))}（按 ${lv} 级的怪，等于能扛多少原始伤害）`, '#ffd0a0');
    // ---- 灯火 ----
    H('灯火');
    row('上限 / 回复', `${fmt(P.soulMax)} · 回复 +${n1(P.soulRegen || 0)}% · 燃烧 ×${(P.burnMul || 1).toFixed(2)}`);
    row('消耗', `技能消耗降低 ${pc(P.soulLess || 0)} · 魂龛总耗灯每秒约 ${n1(P.trigCost || 0)}`);
    row('回灯', `普攻命中 ${n1(P.lampHit || 0)} · 命中 ${n1(P.lampOnHit || 0)} · 暴击 ${n1(P.lampOnCrit || 0)} · 被命中 ${n1(P.lampOnStruck || 0)}`);
    // ---- 其他 ----
    H('其他');
    row('移动', `移速 ${Math.round(P.speed)} · 冲刺槽 ${P.dashMax} · 冲刺回复每秒 ${n1(P.dashRegen || 0)}`);
    row('杂项', `拾取范围 ${Math.round(P.pickup || 0)} · 掉落提高 ${n1(P.findInc || 0)}% · 辅助石等级 +${P.modLvl || 0}`);
    // ---- 职业 ----
    H('职业'); const m = mstS(), A = advOf(m.picks);
    if (!m.picks.length) note('还没有选职业'); else { row('基础职业', m.picks.map(x => `${MST_BY[x].n}（专精条 ${mstBar(x)}）`).join(' + ')); if (A) row('高级职业', advOpen(A) ? `${A.n}（已点 ${advSpent(A)}）` : `${A.n}（两个专精条都到 ${CLS.advBar} 点解锁）`, advOpen(A) ? '#ffd23a' : COL.dim); }
    return L;
  },
});
const AIL_MAIN = { kin: '破甲', exp: '灼烧', ele: '感电', cold: '冰缓', pla: '审判', nuc: '疫病' };
