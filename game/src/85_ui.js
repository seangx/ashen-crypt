/* ---------- 界面状态 ---------- */
let selId = null, hoverId = null, modWeapon = 'wl', craftId = null, confirmKey = null, craftLog = [], helpTopic = 0;
let craftAff = -1, craftTab = 0, addPage = 0, useHope = false, useChaos = false, fuseId = null, feedOn = false, feedSrc = null;
let atlasTab = 0, atlasSel = null, ladPick = 1;
const treeView = { x: 0, y: 0, z: 1 };
// 墓图的悬浮说明
function mapTip(m) {
  const out = [{ t: mapName(m), c: RCOL[m.rar] }, { t: `怪物等级 +${m.tier}`, s: 8, c: '#ff8a7a' }, { t: `物品数量提高 ${mapQty(m)}%` + (mapRar(m) ? `，物品稀有度提高 ${mapRar(m)}%` : ''), s: 8, c: '#e9d9a8' }];
  for (const x of m.affs) { const a = MAP_AFF_BY[x.k]; out.push({ t: a.t(x.v), s: 8, c: a.bad ? '#ff9a8a' : '#a9c4ff' }); }
  if (!m.affs.length) out.push({ t: '没有词条', s: 8, c: COL.faint });
  return out;
}
function confirm2(key) { if (confirmKey === key) { confirmKey = null; return true; } confirmKey = key; setTimeout(() => { if (confirmKey === key) { confirmKey = null; G.ui && G.ui.refresh(); } }, 3000); return false; }
function findItem(id) {
  for (const s of SLOTS) if (S.equip[s.id] && S.equip[s.id].id === id) return { it: S.equip[s.id], where: 'equip', slot: s.id };
  const it = S.stash.find(x => x.id === id); if (it) return { it, where: 'stash' };
  return null;
}
const MENU = [{ id: 'gear', n: '装备', ic: 'i_w_crossbow' }, { id: 'mods', n: '符文', ic: 'mod_Chain' }, { id: 'craft', n: '铁砧', ic: 'i_anvil' }, { id: 'tree', n: '天赋', ic: 'i_star' }, { id: 'atlas', n: '墓图', ic: 'i_a_map' }, { id: 'ladder', n: '天梯', ic: 'i_ladder' }, { id: 'help', n: '手册', ic: 'i_book' }];
const pct = v => Math.round(v * 100) + '%';
// 营地设施的悬浮说明
const FAC_TIP = {
  gate: () => `往下走：下一趟从第 ${descentStart()} 层出发。点开可以选层、锁层。`,
  chest: () => `背包和身上的装备（背包 ${S.stash.length} 件）`,
  statue: () => `天赋树${treePoints() > 0 ? `：还有 ${treePoints()} 点没用` : ''}`,
  anvil: () => '做装：加词条、升一档、拆解',
  altar: () => `回营地时按规则自动分解带回的装备。按现在的规则，背包里有 ${S.stash.filter(salvWhy).length} 件会被分解。`,
  runes: () => '插符文' + (unlocked('feed') ? '、喂养符文' : ''),
  atlas: () => '墓图和命盘',
  stele: () => `天梯：最高第 ${S.ladder.best} 层，已解锁到第 ${S.ladder.unlocked} 层。从这里出发，打完回营地。`,
};

/* 物品卡：返回 {c,h} */
function mkCard(sc, parent, x, y, it, w, o = {}) {
  const c = sc.add.container(x, y); if (parent) parent.add(c);
  const b = baseOf(it); let cy = 0;
  img(sc, 0, 0, 'i_' + iconOf(it), c);
  T(sc, 17, 1, itemName(it), { color: icol(it), parent: c });
  cy = 16;
  T(sc, 0, cy, `${rarName(it)} · ${KIND_N[it.kind]}${it.rar === 2 ? ' · ' + b.n : ''} · 物品等级 ${it.ilvl}`, { size: 8, color: COL.dim, parent: c }); cy += 11;
  for (let i = 0; i <= 10; i++) rect(sc, i * 5, cy + 2, 4, 3, i <= it.q ? COL.ember : '#2f2740', 1, c);
  T(sc, 58, cy, `品质：${QN[it.q]}`, { size: 8, color: COL.dim, parent: c }); cy += 11;
  rect(sc, 0, cy + 1, w, 1, '#3a3049', 1, c); cy += 4;
  const ln = (t, col = '#b8afc4') => { const r = TW(sc, 0, cy, t, w, { size: 8, color: col, parent: c }); cy += r.h; };
  for (const [t, col] of baseLines(it)) ln(t, col);
  if (it.sock) {
    const hub = it.kind === 'hub';
    for (let i = 0; i < it.sock; i++) {
      const m = it.mods[i]; const sx = i * 13;
      rect(sc, sx, cy + 1, 12, 12, hub ? '#5a3a14' : '#2a2236', 1, c); rect(sc, sx + 1, cy + 2, 10, 10, '#120c18', 1, c);
      if (m) { const im = img(sc, sx + 1, cy + 2, 'mod_' + m.mid, c); if (!modActive(m, it)) im.setAlpha(0.35); }
    }
    T(sc, it.sock * 13 + 3, cy + 3, hub ? `升级槽 ${it.sock}` : `符文槽 ${it.sock}`, { size: 8, color: COL.faint, parent: c }); cy += 15;
  }
  if (it.affs.length) { rect(sc, 0, cy + 1, w, 1, '#3a3049', 1, c); cy += 4; }
  it.affs.forEach((x, i) => {
    const a = AFF_BY[x.k]; const ex = exTier(a, x.t), top = !ex && x.t === craftTop(a), hi = a.tiers.length - x.t <= 3;
    rect(sc, 0, cy + 2, 13, 9, ex ? '#0f4a3a' : top ? '#5a2d10' : hi ? '#3c2a52' : '#2a2236', 1, c);
    T(sc, 7, cy + 3, tierLabel(x), { size: 8, color: ex ? EX_C : top ? COL.emberHi : hi ? '#d9b8ff' : COL.dim, align: 'center', shadow: false, parent: c });
    if (o.selAff === i) { const sh = rect(sc, -2, cy - 1, w + 4, 12, COL.ember, 0.18, c); c.sendToBack(sh); }
    const t = TW(sc, 16, cy, affText(x), w - 16, { color: it.rar === 1 ? '#a9c4ff' : '#efe2b6', parent: c });
    if (o.pick) {
      const z = sc.add.zone(-2, cy - 1, w + 4, t.h + 1).setOrigin(0).setInteractive(); c.add(z);
      const hl = rect(sc, -2, cy - 1, w + 4, t.h + 1, COL.cyan, 0.12, c); c.sendToBack(hl);
      z.on('pointerover', () => hl.setFillStyle(hex(COL.cyan), 0.3)); z.on('pointerout', () => hl.setFillStyle(hex(COL.cyan), 0.12));
      z.on('pointerup', () => o.pick(i));
    }
    cy += t.h;
  });
  if (it.u) { rect(sc, 0, cy + 1, w, 1, '#5a3a14', 1, c); cy += 4; for (const r of ruleLines(it)) ln(r, '#ff9a3c'); }
  if (it.kind === 'chip') ln(chipSock(it) ? '已插在天赋树的印记槽里' : '插在天赋树的印记槽里生效（先点亮旁边的天赋）', COL.faint);
  if (it.rar < 3 && it.kind !== 'map') { T(sc, 0, cy + 1, `词条 ${it.affs.length}/${AFF_MAX} · 锻造潜力 ${it.fp || 0}`, { size: 8, color: it.fp > 0 ? COL.faint : COL.bad, parent: c }); cy += 11; }
  if (it.u) { T(sc, 0, cy + 1, it.leg ? '传奇：已熔铸' : `传奇潜力 ${it.lp || 0}`, { size: 8, color: it.leg ? LEG_C : COL.faint, parent: c }); cy += 11; }
  if (o.compare) for (const ln of compareLines(it)) { const t = TW(sc, 0, cy + 1, ln.t, w, { size: 8, color: ln.c, parent: c }); cy += t.h; }
  return { c, h: cy };
}
const DASH_N = { step: '冲刺：纯位移', warp: '冲刺：瞬移到落点并炸开', trail: '冲刺：沿途留下火痕', burst: '冲刺结束：向四周炸开', storm: '冲刺结束：向附近敌人放连锁雷', vortex: '冲刺结束：留下吸住敌人的漩涡', nova: '冲刺：在起点爆炸' };
const FORM_N = { proj: '发射投射物', beam: '持续光束', orbit: '环绕身边的刃', nova: '以自身为中心爆发', cone: '前方喷射', mine: '在脚下布置陷阱', aura: '身边持续伤害的力场', ram: '撞上敌人造成伤害，越快越痛', stab: '从地下刺向附近敌人', reflect: '受到攻击时伤害周围敌人' };
const r1 = v => Math.round(v * 10) / 10;
// 底材行：按品质的固有数值
function baseLines(it) {
  const b = baseOf(it), q = it.q, out = [], dim = '#b8afc4';
  if (it.kind === 'weapon' || it.kind === 'engine') {
    if (it.kind === 'engine') { out.push([DASH_N[b.dash], COL.cyan]); out.push([`移动推力 ${ENGINE_THRUST[q]}` + (b.thrustInc ? `，移动速度提高 ${qv(b.thrustInc, q)}%` : ''), dim]); }
    else out.push([FORM_N[b.form], COL.dim]);
    if (b.min) { const [mn, mx] = weaponBase(b, q); out.push([`${ELEM_N[b.el]}伤害 ${fmt(mn)}–${fmt(mx)}${b.cont ? ' / 秒' : ''}`, ELEM_C[b.el]]); }
    if (b.aura) out.push([`每秒 ${qv(b.aura, q)} ${ELEM_N[b.el]}伤害`, ELEM_C[b.el]]);
    const p = [];
    if (b.aps) p.push(`每秒攻击 ${r1(qv(b.aps, q))}`);
    if (b.crit) p.push(`暴击 ${b.crit}%`);
    if (b.range) p.push(`射程 ${Math.round(qv(b.range, q) * UNIT)}`);
    if (b.aoe) p.push(`范围 ${Math.round(qv(b.aoe, q) * UNIT)}`);
    if (p.length) out.push([p.join(' · '), dim]);
    const im = [];
    const big = v => v >= 1000000 ? '无限' : v;
    if (b.pierce) im.push('无限穿透');
    if (b.chain) im.push(`${b.form === 'proj' ? '弹射' : '连锁'} ${qv(b.chain, q)}`);
    if (b.split) im.push(`分裂 ${qv(b.split, q)}`);
    if (b.extra) im.push(b.form === 'stab' ? `同时刺 ${1 + qv(b.extra, q)} 个目标` : `额外攻击 ${qv(b.extra, q)}`);
    if (b.ret) im.push('投射物会返回');
    if (b.knock) im.push('命中击退');
    if (b.aspdInc) im.push(`攻速提高 ${b.aspdInc}%`);
    if (b.thermalInc) im.push(`元素伤害提高 ${b.thermalInc}%`);
    if (b.bossMore) im.push(`对 Boss 伤害总增 ${qv(b.bossMore, q) * 10}%`);
    for (const e of ELEM) if (b['ail_' + e]) im.push(`${AIL[e].n}几率 ${Math.round(b['ail_' + e] * 100)}%`);
    if (im.length) out.push([im.join('，'), '#e9d9a8']);
    out.push(['标签：' + itemTags(it).filter(t => TAG_N[t] && t !== 'Weapon').map(t => TAG_N[t]).join(' '), COL.faint]);
  } else {
    const p = [];
    if (b.armor) p.push(`护甲 +${Math.round(qv(b.armor, q))}`);
    if (b.deflect) p.push(`护盾 +${Math.round(qv(b.deflect, q))}`);
    if (b.dodge) p.push(`闪避 +${Math.round(qv(b.dodge, q))}`);
    if (b.res) p.push(`${ELEM_N[b.el]}抗性 +${qv(b.res, q)}%`);
    for (const k of ['mass', 'energy', 'time']) if (b[k]) p.push(`${ATTR_N[k]} +${qv(b[k], q)}`);
    out.push([p.join('，'), '#e9d9a8']);
    if (it.kind === 'hub') out.push(['插在升级槽里的符文会随击杀成长；力场符文只在这里生效', COL.faint]);
  }
  return out;
}
function compareLines(it) {
  const slot = slotsFor(it)[0];
  if (!slot) return chipSock(it) ? [{ t: '已插入', c: COL.dim }] : [];
  if (Object.values(S.equip).includes(it)) return [{ t: '已装备', c: COL.dim }];
  const cur = S.equip[slot]; const base = STATS; const next = computeStats({ ...S.equip, [slot]: it });
  const out = [];
  const d = (a, b, n) => { const p = a ? (b / a - 1) * 100 : b > 0 ? 100 : 0; if (Math.abs(b - a) < 0.5) return null; return { t: `${n} ${fmt(a)} → ${fmt(b)}（${p >= 0 ? '+' : ''}${p.toFixed(0)}%）`, c: b >= a ? COL.good : COL.bad }; };
  out.push(d(base.dps, next.dps, `装备到${SLOTS.find(s => s.id === slot).n}后秒伤`) || { t: `装备到${SLOTS.find(s => s.id === slot).n}：秒伤不变`, c: COL.dim });
  for (const [k, n] of [['armor', '护甲'], ['shield', '护盾']]) { const l = d(base[k], next[k], n); if (l) out.push(l); }
  return out;
}
function modTip(m, host) {
  const def = MOD_BY[m.mid]; const L = clamp(m.lvl + (STATS.modLvl || 0), 1, 30);
  const out = [{ t: `${def.n}  ${m.lvl} 级${STATS.modLvl ? `（+${STATS.modLvl}）` : ''}`, c: COL.cyan }, { t: def.d(def.fx(L)), s: 8 }, { t: '插在：' + modWhere(m), s: 8, c: COL.dim }];
  if (m.lvl < MOD_MAX) out.push({ t: `经验 ${fmt(m.xp)} / ${fmt(MOD_XP[m.lvl - 1])}（插在法阵的升级槽里才会成长）`, s: 8, c: COL.faint });
  if (host) out.push(modActive(m, host) ? { t: `对${itemName(host)}生效`, s: 8, c: COL.good } : host.kind === 'hub' ? { t: '在法阵里只成长，不生效', s: 8, c: COL.dim } : { t: `${itemName(host)}不满足条件，不生效`, s: 8, c: COL.bad });
  return out;
}

/* ---------- UI 场景 ---------- */
class UI extends Phaser.Scene {
  constructor() { super('ui'); }
  create() {
    G.ui = this; this.cameras.main.setZoom(Z).centerOn(W / 2, H / 2); this.winId = null; this.winC = null; this.tipC = null; this.feeds = []; this.toastC = null;
    this.buildHud();
    this.titleC = this.add.container(0, 0).setDepth(20); this.buildTitle();
    this.bannerT = T(this, W / 2, 96, '', { color: COL.boss, align: 'center', scale: 2, shadowColor: '#2b0b10' }).setDepth(30).setAlpha(0);
    this.feedC = this.add.container(0, 0).setDepth(15);
    this.toastC = this.add.container(0, 0).setDepth(300);
    this.curMode = null; this.curCss = makeCursors();
    const kb = this.input.keyboard;
    kb.on('keydown-SPACE', e => { e.preventDefault && e.preventDefault(); ac(); tryDash(); });
    kb.on('keydown-SHIFT', () => tryDash());
    kb.on('keydown-ENTER', () => { ac(); if (!this.winId) this.toggleLoop(); });
    kb.on('keydown-ESC', () => this.closeWin());
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'].forEach((k, i) => kb.on('keydown-' + k, () => this.toggleWin(MENU[i].id)));
  }
  /* --- HUD：顶部绶带 + 骨头条，左下血球，右下灯火瓶，中间石台底栏 --- */
  buildHud() {
    const top = this.add.container(0, 0).setDepth(10); this.topC = top;
    this.ribbon = this.add.nineslice(0, 2, 'ribbon', null, 120, 22, 14, 14, 0, 0).setOrigin(0); top.add(this.ribbon);
    this.depthT = T(this, W / 2, 7, '', { align: 'center', color: COL.emberHi, parent: top });
    this.dPrev = mkBtn(this, top, 0, 6, 14, 14, '<', () => { if (S.depth > 1 && !RUN) { S.depth--; S.auto.lock = true; } }, { size: 8, tip: [{ t: '降低难度（会锁定层数）', s: 8 }] });
    this.dNext = mkBtn(this, top, 0, 6, 14, 14, '>', () => { if (S.depth < S.maxDepth && !RUN) { S.depth++; S.auto.lock = S.depth < S.maxDepth; } }, { size: 8, tip: () => [{ t: S.maxDepth >= PROG.run.maxDepth ? `已到最深层（第 ${PROG.run.maxDepth} 层），之后自动推层就一直刷这层` : '提高难度（通关后解锁下一层；不是最深层时会锁定层数）', s: 8 }] });
    const bc = this.add.container(W / 2 - 100, 26); top.add(bc); this.bossC = bc;
    this.bossT = T(this, 100, 0, '', { size: 8, align: 'center', parent: bc });
    bc.add(img(this, 0, 10, 'bonebar')); this.bossG = this.add.graphics(); bc.add(this.bossG);
    const bz = this.add.zone(0, 0, 200, 26).setOrigin(0).setInteractive(); bc.add(bz);
    bz.on('pointerover', () => showTip(ladderBusy() ? [{ t: '天梯进度', c: COL.boss }, { t: `普通怪 ${LD.run.normalP} 点，精英 ${LD.run.eliteP} 点，攒满 ${RUN.need} 点后 ${RUN.bossD.n} 出现。${mmss(RUN.limit)} 内击败它算通过，剩的时间越多跳得越多。`, s: 8 }] : [{ t: '任务进度', c: COL.boss }, { t: `击杀数达到要求后 ${(RUN ? RUN.bossD : bossFor(S.depth + (armedMap() ? armedMap().tier : 0))).n} 出现：${BOSS_PAT_N[(RUN ? RUN.bossD : bossFor(S.depth)).pat]}。击败它完成任务。Boss 出现 ${MECH.fatigueStart} 秒后会疲惫，每秒承伤 +${Math.round((MECH.fatigueStep - 1) * 100)}%。`, s: 8 }])); bz.on('pointerout', hideTip);

    // 两个球：底图、液体（图形）、高光
    const orb = (x, key, tip) => {
      const c = this.add.container(x, H - 65).setDepth(11); c.add(img(this, 0, 0, key)); const g = this.add.graphics(); c.add(g); c.add(img(this, 0, 0, 'orb_hi'));
      const z = this.add.zone(6, 6, 52, 58).setOrigin(0).setInteractive(); c.add(z); z.on('pointerover', () => showTip(tip())); z.on('pointerout', hideTip);
      c.g = g; c.key = ''; return c;
    };
    this.hpOrb = orb(1, 'orb_hp', () => [{ t: `生命 ${Math.ceil(player.life)} / ${fmt(STATS.life)}`, c: '#ff8a7a' }, { t: '生命归零就阵亡。推关和天梯里不会自己回，只靠命中回生命（吸血）和打掉守关 Boss，回营地回满。', s: 8 }, { t: `护盾（球边的白蓝色）${Math.ceil(player.shield)} / ${fmt(STATS.shield)}，每秒回复 ${r1(STATS.shieldRegen)}`, s: 8, c: '#bfe0ff' }, { t: '护盾先挡伤害，挨打时也照常回复。', s: 8, c: COL.dim }, { t: `护甲 ${fmt(STATS.armor)}：本层普通怪一下（约 ${fmt(typicalHit(RUN ? RUN.L : S.depth))}）减伤 ${Math.round(armorDr(STATS.armor, typicalHit(RUN ? RUN.L : S.depth)) * 100)}%`, s: 8, c: COL.text }, { t: '护甲对小伤害减得多，对重击减得少。', s: 8, c: COL.dim }, { t: '球上方的点是冲刺槽：空格或右键冲刺，冲刺时无敌。', s: 8, c: COL.dim }, ...(MECH.leechHitCap != null || MECH.leechCapPct != null ? [{ t: `命中回护甲有上限：${MECH.leechHitCap != null ? `每次挥砍最多算 ${MECH.leechHitCap} 个敌人` : ''}${MECH.leechHitCap != null && MECH.leechCapPct != null ? '，' : ''}${MECH.leechCapPct != null ? `每秒最多回 ${fmt(STATS.armor * MECH.leechCapPct / 100)}（护甲上限的 ${MECH.leechCapPct}%）` : ''}${player.leechCapped > 0 ? '。现在已经封顶' : ''}`, s: 8, c: player.leechCapped > 0 ? COL.emberHi : COL.dim }] : [])]);
    this.hpT = T(this, 32, 27, '', { align: 'center', parent: this.hpOrb }); this.defT = T(this, 32, 40, '', { size: 8, color: '#bfe0ff', align: 'center', parent: this.hpOrb });
    this.soulOrb = orb(W - 65, 'orb_soul', () => [{ t: `灯火 ${Math.round(player.soul)} / ${STATS.soulMax}`, c: '#b9a2ff' }, { t: `推关时每秒燃烧 ${SOUL.burn} + 层数 × ${SOUL.burnPerFloor}，击杀回（普通 ${SOUL.onKill.normal}、精英 ${SOUL.onKill.elite}、Boss ${SOUL.onKill.boss}，×${Math.round(STATS.soulGainMul * 100) / 100}）；烧完平安返回，阵亡则捡到的东西每件 ${SOUL.deathKeep}% 保住。`, s: 8 }, { t: `天梯里不燃烧，每秒回复 ${Math.round(STATS.soulRegen * 10) / 10}。`, s: 8, c: COL.dim }, { t: `旋风斩转的时候每秒消耗 ${Math.round(WH.soulPerSec * (1 - STATS.soulLess) * 100) / 100}，每砍中一个敌人回 ${WH.soulPerHit}（一次最多 ${WH.soulHitCap} 个）。`, s: 8, c: '#9a7cff' }]);
    this.soulT = T(this, 32, 27, '', { color: '#e6dcff', align: 'center', parent: this.soulOrb }); this.burnT = T(this, 32, 40, '', { size: 8, color: '#b9a2ff', align: 'center', parent: this.soulOrb });
    // 血球上方：旋转层数、冲刺槽
    this.dashG = this.add.graphics().setDepth(11);
    this.spinC = this.add.container(5, H - 88).setDepth(11); img(this, 0, 0, 'mod_Whirl', this.spinC); this.spinT = T(this, 13, 1, '', { parent: this.spinC });

    const bot = this.add.container(66, BOT_Y).setDepth(10); this.bot = bot; const DW = W - 132;
    bot.add(this.add.tileSprite(0, 0, DW, H - BOT_Y, 'dock').setOrigin(0));
    this.xpG = this.add.graphics(); bot.add(this.xpG);
    bot.add(nine(this, 3, 9, 20, 20, 'sock_h'));
    this.lvT = T(this, 13, 14, '', { color: COL.xp, align: 'center', parent: bot });
    this.dpsT = T(this, DW - 4, 9, '', { size: 8, color: COL.emberHi, align: 'right', parent: bot });
    this.diceT = T(this, DW - 4, 19, '', { size: 8, color: '#d9cfb8', align: 'right', parent: bot }); this.shardI = img(this, 0, 20, 'shard', bot);
    const tipLv = () => showTip([{ t: `等级 ${S.level}`, c: COL.xp }, { t: `经验 ${fmt(S.xp)} / ${fmt(xpNeed(S.level))}（石台上沿的蓝线）`, s: 8 }, { t: `预计秒伤 ${fmt(STATS.dps)}：两把武器的单体期望，含暴击。`, s: 8 }, { t: `词条碎片 ${Object.values(S.shards).reduce((a, b) => a + b, 0)}（${Object.values(S.shards).filter(n => n > 0).length} 种）`, s: 8, c: '#d9cfb8' }, ...GLYPHS.map(g => ({ t: `${g.n} ×${glyphN(g.id)}`, c: g.c, s: 8 }))]);
    for (const [zx, zw] of [[0, 26], [DW - 40, 40]]) { const z = this.add.zone(zx, 6, zw, 24).setOrigin(0).setInteractive(); bot.add(z); z.on('pointerover', tipLv); z.on('pointerout', hideTip); }
    // 系统入口：嵌在石台里的凹槽，只放图标，角上是快捷键
    this.menuBtns = MENU.map((m, i) => {
      const b = this.add.container(28 + i * 25, 7); bot.add(b);
      const bg = nine(this, 0, 0, 24, 24, 'sock'), hl = nine(this, 0, 0, 24, 24, 'sock_h').setVisible(false); b.add([bg, hl]);
      const tex = this.textures.get(m.ic).getSourceImage(); b.ic = img(this, Math.round(12 - tex.width / 2), Math.round(12 - tex.height / 2), m.ic, b);
      T(this, 2, 0, String(i + 1), { size: 'num', color: COL.faint, parent: b });
      b.badge = T(this, 23, -2, '', { size: 'num', color: COL.ember, align: 'right', parent: b });
      const z = this.add.zone(0, 0, 24, 24).setOrigin(0).setInteractive(); b.add(z);
      z.on('pointerover', () => { b.hov = true; showTip([{ t: `${m.n}  [${i + 1}]`, c: COL.emberHi }, ...(!unlocked(m.id) ? [{ t: unlockText(m.id), s: 8, c: COL.dim }] : [])]); });
      z.on('pointerout', () => { b.hov = false; b.y = 7; hideTip(); });
      z.on('pointerdown', () => { if (unlocked(m.id)) b.y = 8; });
      z.on('pointerup', () => { b.y = 7; if (!unlocked(m.id)) { toast(`${m.n}：${unlockText(m.id)}`); return; } sfx('click'); this.toggleWin(m.id); });
      b.hl = hl; return b;
    });
    const bx = 28 + 7 * 25 + 4;
    this.aiBtn = mkBtn(this, bot, bx, 7, 34, 12, '自动', () => { S.auto.ai = !S.auto.ai; if (S.auto.ai) AUTO.manualT = -1e9; save(); }, { size: 8, tip: () => [{ t: S.auto.ai ? '自动战斗：开' : '自动战斗：关', c: COL.emberHi }, { t: '开着时角色自己走位和冲刺。在场地上动鼠标或触摸就临时接管，几秒不动后交还。', s: 8 }] });
    this.lockBtn = mkBtn(this, bot, bx, 19, 34, 12, '推层', () => { S.auto.lock = !S.auto.lock; save(); }, { size: 8, tip: () => [{ t: S.auto.lock ? '锁定层数：开' : '锁定层数：关（自动推层）', c: COL.emberHi }, { t: S.auto.lock ? `一直打难度 ${S.depth}。` : '打赢去最深层；连输两次退一层，退下来赢三次再回去冲。', s: 8 }] });
    this.sndBtn = mkBtn(this, bot, bx + 36, 7, 15, 24, '音', () => { S.settings.sound = !S.settings.sound; ac(); save(); }, { size: 8, tip: () => [{ t: S.settings.sound ? '音效：开' : '音效：关' }] });
    // 开始 / 暂停自动循环；暂停后打完这一局就停
    this.mainBtn = mkBtn(this, bot, bx + 53, 7, 52, 24, '开始', () => { ac(); this.toggleLoop(); }, { style: 'w', icon: 'torch', iconX: 5, labelX: 16, tip: () => [
      { t: S.auto.loop ? '暂停  [回车]' : '开始自动刷  [回车]', c: COL.emberHi },
      { t: S.auto.loop ? '打完这一局就停下。' : '一趟接一趟自动打，每趟回营地后停留几秒再出发。', s: 8 },
      { t: `下一趟：从第 ${descentStart()} 层出发${S.depth >= PROG.run.maxDepth ? `（已到最深层）` : ''}`, s: 8, c: COL.dim },
      ...(armedMap() ? [{ t: `会消耗墓图台上的${mapName(armedMap())}（怪物等级 +${armedMap().tier}）`, s: 8, c: RCOL[armedMap().rar] }] : [])] });
  }
  // 球里的液体：按行画，留出 2 像素暗边；灵障是沿球边从下往上包的青色
  drawOrb(o, f, liq, hi, dark, rim, rimCol) {
    const key = Math.round(f * 46) + ':' + Math.round(rim * 40) + ':' + liq; if (o.key === key) return; o.key = key;
    const g = o.g, { cx, cy, r } = ORB, ri = r - 2.5; g.clear();
    const top = Math.round(cy + ri - f * 2 * ri);
    for (let j = Math.max(top, Math.ceil(cy - ri)); j < cy + ri; j++) {
      const dy = j + 0.5 - cy, hw = Math.sqrt(Math.max(0, ri * ri - dy * dy)); if (hw < 0.5) continue;
      const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw), w = x1 - x0;
      g.fillStyle(j < top + 2 ? hi : liq, 1).fillRect(x0, j, w, 1);
      if (j >= top + 2) g.fillStyle(dark, 1).fillRect(x0, j, Math.max(1, Math.round(w * 0.22)), 1);
    }
    if (rim > 0) { g.fillStyle(rimCol, 1); const n = Math.round(rim * 60); for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const a = Math.PI / 2 + s * (i / 60) * Math.PI; g.fillRect(Math.round(cx - 0.5 + Math.cos(a) * (r - 1.5)), Math.round(cy - 0.5 + Math.sin(a) * (r - 1.5)), 1, 1); } }
  }
  updateHud() {
    const P = STATS;
    const hf = clamp(player.life / P.life, 0, 1), df = P.shield > 0 ? clamp(player.shield / P.shield, 0, 1) : 0;
    this.drawOrb(this.hpOrb, hf, player.hurtT > 0 ? 0xffffff : 0xb52a2a, 0xff7a6a, 0x6a1418, df, 0xbfe0ff); // 红色生命，球边白蓝色护盾
    const sf = clamp(player.soul / P.soulMax, 0, 1), lad = RUN && RUN.mode === 'ladder', blink = RUN && !lad && sf < SOUL.lowWarn && (G.time * 4 | 0) % 2; // 推关里灯火低于 lowWarn 时闪
    this.drawOrb(this.soulOrb, sf, player.soul <= 0 ? 0x5a4a7a : blink ? 0xd8a040 : 0x7a55d0, blink ? 0xffe08a : 0xc9b0ff, 0x3a2470, 0, 0);
    const ht = String(Math.ceil(player.life)); if (this.hpT.text !== ht) this.hpT.setText(ht);
    const dt = P.shield ? '+' + Math.ceil(player.shield) : ''; if (this.defT.text !== dt) this.defT.setText(dt);
    const st = Math.round(sf * 100) + '%'; if (this.soulT.text !== st) this.soulT.setText(st);
    const bt = !RUN ? '' : lad ? `+${r1(P.soulRegen)}/秒` : `−${r1((SOUL.burn + RUN.base * SOUL.burnPerFloor) * P.burnMul)}/秒`; if (this.burnT.text !== bt) this.burnT.setText(bt);
    const g = this.dashG; g.clear();
    for (let i = 0; i < P.dashMax; i++) { const f = clamp(player.dash - i, 0, 1), x = 7 + i * 9, y = H - 74; g.fillStyle(0x0b080e, 1).fillRect(x, y, 7, 7); g.fillStyle(f >= 1 ? 0xc08aff : 0x2a1e3a, 1).fillRect(x + 1, y + 1, 5, 5); if (f >= 1) g.fillStyle(0xe6c8ff, 1).fillRect(x + 1, y + 1, 5, 1); else g.fillStyle(0xc08aff, 1).fillRect(x + 1, y + 6 - Math.round(f * 5), 5, Math.round(f * 5)); }
    const wi = P.weapons.findIndex(w => w && w.whirl), sw = P.weapons[wi]; // 旋转层数（看第一把带旋身的武器）
    this.spinC.setVisible(!!sw && !!RUN);
    if (sw) { const sp = player.spin[wi].n, spt = `${sp}`; if (this.spinT.text !== spt) this.spinT.setText(spt).setTint(hex(sp >= sw.stackMax ? COL.emberHi : COL.text)); }
    const L = RUN ? RUN.L : S.depth;
    const dl = ladderBusy() ? `天梯 ${L} 层 · ${mmss(Math.max(0, RUN.limit - RUN.t))}` : RUN && RUN.map ? `墓图 ${RUN.map.tier} 阶 · 怪物等级 ${L}` : !RUN && armedMap() ? `难度 ${L} · 墓图 ${armedMap().tier} 阶` : RUN ? `第 ${L} 层 · ${themeFor(L).n}` : `营地 · 下一趟从第 ${descentStart()} 层出发`;
    if (this.depthT.text !== dl) { this.depthT.setText(dl); const tw = textW(dl), rw = tw + 44; this.ribbon.setSize(rw, 22); this.ribbon.x = Math.round(W / 2 - rw / 2); this.dPrev.x = this.ribbon.x - 16; this.dNext.x = this.ribbon.x + rw + 2; }
    this.dPrev.setVisible(!RUN).setDisabled(S.depth <= 1); this.dNext.setVisible(!RUN).setDisabled(S.depth >= S.maxDepth);
    this.bossC.setVisible(!!RUN); this.topC.setVisible(!this.winId);
    const b = this.bossG; b.clear();
    if (RUN && RUN.boss && !RUN.boss.dead) {
      const f = RUN.boss.hp / RUN.boss.max, fw = Math.round(184 * f);
      b.fillStyle(0xc23a5a, 1).fillRect(8, 15, fw, 6); b.fillStyle(0xff8aa0, 1).fillRect(8, 15, fw, 1); b.fillStyle(0x8a2440, 1); for (let i = 6; i < fw; i += 7) b.fillRect(8 + i, 16, 1, 5);
      const fat = Math.round((fatigue(RUN.boss) - 1) * 100), t = RUN.bossD.n + (fat > 0 ? `  疲惫 +${fat}%` : ''); if (this.bossT.text !== t) this.bossT.setText(t).setTint(hex('#ff9aa8'));
    } else if (RUN) {
      const f = Math.min(1, RUN.prog / RUN.need), fw = Math.round(184 * f), won = RUN.result === 'win';
      b.fillStyle(won ? 0xffd36a : 0x7a55a0, 1).fillRect(8, 15, fw, 6); b.fillStyle(won ? 0xfff0b0 : 0xa888d0, 1).fillRect(8, 15, fw, 1);
      const t = won ? '完成' : `${Math.floor(RUN.prog + 1e-6)} / ${RUN.need}`; if (this.bossT.text !== t) this.bossT.setText(t).setTint(hex(COL.text));
    }
    const lt = String(S.level); if (this.lvT.text !== lt) this.lvT.setText(lt);
    const xg = this.xpG; xg.clear(); const DW = W - 132; xg.fillStyle(0x14202c, 1).fillRect(0, 3, DW, 3); xg.fillStyle(0x9fd8ff, 1).fillRect(0, 3, Math.round(DW * clamp(S.xp / xpNeed(S.level), 0, 1)), 2); xg.fillStyle(0x0b080e, 1); for (let i = 34; i < DW; i += 34) xg.fillRect(i, 3, 1, 3);
    const dps = fmt(STATS.dps); if (this.dpsT.text !== dps) this.dpsT.setText(dps);
    const sh = fmt(Object.values(S.shards).reduce((a, b) => a + b, 0)); if (this.diceT.text !== sh) { this.diceT.setText(sh); this.shardI.x = DW - 6 - textW(sh, 8) - 5; }
    this.menuBtns.forEach((bt, i) => {
      const id = MENU[i].id, on = unlocked(id); let badge = '';
      if (id === 'gear') { const n = S.stash.filter(x => x.isNew).length; badge = n ? String(n) : ''; }
      if (id === 'mods' && S.mods.some(m => m.isNew)) badge = '!';
      if (id === 'tree' && treePoints() > 0) badge = String(treePoints());
      if (id === 'atlas') { const n = S.maps.filter(m => m.isNew).length; badge = marblePoints() > 0 ? String(marblePoints()) : n ? String(n) : ''; }
      bt.badge.setText(on ? badge : '');
      bt.hl.setVisible(on && (this.winId === id || bt.hov)); bt.ic.setAlpha(on ? 1 : 0.3);
    });
    this.mainBtn.setLabel(S.auto.loop ? '暂停' : RUN ? '继续' : '开始');
    this.aiBtn.setLabel(S.auto.ai ? '自动' : '手动'); this.aiBtn.lab.setTint(hex(S.auto.ai ? COL.good : COL.dim));
    this.lockBtn.setLabel(S.auto.lock ? '锁层' : '推层'); this.lockBtn.lab.setTint(hex(S.auto.lock ? COL.emberHi : COL.text));
    this.updateAuto();
    this.sndBtn.lab.setTint(hex(S.settings.sound ? COL.text : COL.faint));
  }
  buildTitle() {
    const c = this.titleC;
    T(this, W / 2, 72, '灰烬地窖', { color: COL.emberHi, align: 'center', scale: 4, shadowColor: '#5a2412', parent: c });
    T(this, W / 2, 130, '提灯亡魂跟着鼠标移动，武器会自动攻击最近的敌人。', { size: 8, color: COL.text, align: 'center', parent: c });
    T(this, W / 2, 142, '空格或右键冲刺。打够数量引出 Boss，击败它完成任务。', { size: 8, color: COL.dim, align: 'center', parent: c });
    this.pressT = T(this, W / 2, 166, '按回车，或点右下角「开始任务」', { color: COL.ember, align: 'center', parent: c });
  }
  /* --- 提示 --- */
  setTip(content) {
    if (this.tipC) { this.tipC.destroy(); this.tipC = null; }
    if (!content) return;
    const c = this.add.container(0, 0).setDepth(900); this.tipC = c;
    const bg = nine(this, 0, 0, 10, 10, 'f_tip', 2); c.add(bg);
    let w = 0, h = 0;
    if (content.item) { const r = mkCard(this, c, 6, 6, content.item, 176, { compare: true }); w = 176; h = r.h; }
    else {
      const maxW = 200; let y = 6;
      for (const ln of content) { const t = TW(this, 6, y, ln.t, maxW, { size: ln.s || 12, color: ln.c || COL.text, parent: c }); w = Math.max(w, Math.min(maxW, t.width)); y += t.h; }
      h = y - 6;
    }
    bg.setSize(w + 12, h + 10); c.tw = w + 12; c.th = h + 10;
    this.placeTip();
  }
  placeTip() { const c = this.tipC; if (!c) return; let x = mouse.x + 10, y = mouse.y + 10; if (x + c.tw > W - 2) x = mouse.x - c.tw - 6; if (y + c.th > H - 2) y = H - 2 - c.th; c.setPosition(Math.round(Math.max(2, x)), Math.round(Math.max(2, y))); }
  toast(msg, color = COL.text) {
    if (!G.fx) return;
    const list0 = this.toastC.list; if (list0.length && list0[list0.length - 1].msg === msg && list0[list0.length - 1].alpha > 0.5) return;
    while (this.toastC.list.length >= 3) this.toastC.list[0].destroy();
    const c = this.add.container(W / 2, RUN ? 58 : 28); c.msg = msg; // 推关时在骨头条下面，营地里贴着顶部 this.toastC.add(c);
    const w = Math.min(300, textW(msg) + 14); c.add(nine(this, -w / 2, 0, w, 19, 'f_tip', 2)); T(this, 0, 4, msg, { color, align: 'center', parent: c });
    this.toastC.list.forEach(o => { if (o !== c) o.y += 22; });
    this.tweens.add({ targets: c, alpha: 0, delay: 1800, duration: 400, onComplete: () => c.destroy() });
  }
  // 拾取记录：右下灯火瓶上方，右对齐，名字右边是像素图标
  feed(msg, color = COL.text, icon) { if (!G.fx) return; this.feeds.unshift({ msg, color, icon, t: G.time }); this.feeds = this.feeds.slice(0, 5); this.renderFeed(); }
  feedItem(it) { this.feed(itemName(it), icol(it), 'i_' + iconOf(it)); }
  renderFeed() { this.feedC.removeAll(true); this.feeds.forEach((f, i) => { const y = H - 84 - i * 15, c = this.add.container(0, 0); this.feedC.add(c); c.feed = f; if (f.icon && this.textures.exists(f.icon)) { const s = this.textures.get(f.icon).getSourceImage(); img(this, W - 6 - 14 + Math.round((14 - s.width) / 2), y + Math.round((14 - s.height) / 2), f.icon, c); } T(this, W - 24, y + 2, f.msg, { color: f.color, align: 'right', parent: c }); }); }
  banner(text, color = COL.boss) { if (!G.fx) return; this.bannerT.setText(text).setTint(hex(color)).setAlpha(1); this.tweens.killTweensOf(this.bannerT); this.tweens.add({ targets: this.bannerT, alpha: 0, delay: 1400, duration: 500 }); }
  /* --- 窗口 --- */
  // 开始 / 暂停自动循环
  toggleLoop() {
    if (S.auto.loop) { S.auto.loop = false; AUTO.nextT = 0; if (RUN) toast('打完这一局就停下'); }
    else { S.auto.loop = true; if (!RUN) { this.closeWin(); startRun(); } }
    save();
  }
  // 自动战斗提示 + 一局结束后的结算条（不挡操作）
  buildAuto() {
    this.autoT = T(this, 70, BOT_Y - 11, '', { size: 8, color: COL.faint }).setDepth(12);
    const c = this.add.container(6, 28).setDepth(40).setVisible(false); this.sumC = c;
    c.add(nine(this, 0, 0, 220, 44, 'f_win', 8));
    this.sumT = [T(this, 110, 5, '', { align: 'center', parent: c }), T(this, 110, 19, '', { size: 8, color: COL.dim, align: 'center', parent: c }), T(this, 110, 31, '', { size: 8, color: COL.faint, align: 'center', parent: c })];
  }
  updateAuto() {
    if (!this.autoT) this.buildAuto();
    const st = !RUN ? '' : autoDriving() ? '自动战斗中' : S.auto.ai ? `手动 · ${Math.ceil(manualLeft())} 秒后交还自动` : '手动操作';
    if (this.autoT.text !== st) this.autoT.setText(st);
    this.autoT.setVisible(!this.winId);
    const r = AUTO.last, show = !RUN && r && S.auto.loop && AUTO.nextT > 0;
    this.sumC.setVisible(!!show);
    if (!show) return;
    const win = r.result === 'win', g = r.gain, A = S.auto;
    const lad = r.mode === 'ladder';
    const RN = { win: '抵达最深处', lampout: '灯火燃尽 · 平安返回', retreat: '险胜 · 撤回', emergency: '紧急撤回', dead: '阵亡', timeout: '时间到' };
    const l1 = lad ? `天梯 ${r.L} 层${win ? `通过 · 用时 ${mmss(r.t)} · 跳 ${r.lad.jump} 层` : r.result === 'timeout' ? ' · 时间到' : ' · 阵亡'}` : `${RN[r.result] || r.result} · 第 ${r.descent.from === r.base ? r.base : r.descent.from + '–' + r.base} 层`;
    const l2 = `击杀 ${r.kills} · 装备 ${g.items.length} 件${r.salv && r.salv.n ? `，分解 ${r.salv.n} 件得碎片 ${r.salv.shards}` : ''} · 经验 +${fmt(g.xp)}${g.lv ? ` · 升 ${g.lv} 级` : ''}`;
    const why = A.lock ? '（锁定层数）' : A.back ? `（退一层练级，再赢 ${AU.push.winsToRetry - A.backWins} 次回去冲）` : !win && A.fails ? `（再输 ${AU.push.lossesToRetreat - A.fails} 次退一层）` : '';
    const l3 = LAD.pending ? `${Math.ceil(AUTO.nextT)} 秒后开始天梯第 ${LAD.pending} 层` : `${Math.ceil(AUTO.nextT)} 秒后出发：从第 ${descentStart()} 层往下走${lad ? '' : why}`;
    [l1, l2, l3].forEach((s, i) => { if (this.sumT[i].text !== s) this.sumT[i].setText(s); });
    this.sumT[0].setTint(hex(win || (!lad && r.result !== 'dead') ? COL.emberHi : COL.bad));
  }
  toggleWin(id) { if (this.winId === id) this.closeWin(); else this.openWin(id); }
  openWin(id, arg) { if (MENU.some(m => m.id === id) && !unlocked(id)) return; if (id === 'ladder') ladPick = S.ladder.unlocked; this.winId = id; this.winArg = arg; confirmKey = null; hoverId = null; sfx('open'); this.refresh(true); }
  closeWin() {
    if (!this.winId) return;
    this.winId = null; hideTip(); if (this.winC) { this.winC.destroy(); this.winC = null; } if (this.dimR) { this.dimR.destroy(); this.dimR = null; }
  }
  refresh(anim) {
    hideTip();
    if (this.winC) { this.winC.destroy(); this.winC = null; }
    if (!this.winId) return;
    if (!this.dimR) { this.dimR = rect(this, 0, TOP_H, W, BOT_Y - TOP_H, COL.ink, 0.6).setDepth(90).setInteractive(); this.dimR.on('pointerup', () => { if (this.winId !== 'summary') this.closeWin(); }); }
    const [w, h] = { summary: [372, 176], depart: [300, 134] }[this.winId] || [470, 210];
    const x = Math.round((W - w) / 2), y = TOP_H + Math.round((BOT_Y - TOP_H - h) / 2);
    const c = this.add.container(x, y).setDepth(100); this.winC = c;
    const skin = { gear: 'f_leather', mods: 'f_leather', craft: 'f_stone', salvage: 'f_stone', depart: 'f_stone' }[this.winId] || 'f_win'; // 装备皮革、铁砧石板、其余铁框
    c.add(this.add.tileSprite(3, 3, w - 6, h - 6, 'n' + skin.slice(1)).setOrigin(0)); // 九宫格拉伸会把噪点拉成色块，底纹单独平铺
    const bg = nine(this, 0, 0, w, h, 'o_frame', 8); c.add(bg); bg.setInteractive();
    this['win_' + this.winId](c, w, h);
    const title = { gear: '装备', mods: '符文', craft: '铁砧', tree: '天赋', atlas: '墓图', ladder: '天梯', help: '手册', summary: '', depart: '地窖入口', salvage: '分解祭坛' }[this.winId];
    if (title) {
      const pw = textW(title) + 44; c.add(this.add.nineslice(Math.round((w - pw) / 2), -10, 'ribbon', null, pw, 22, 14, 14, 0, 0).setOrigin(0)); T(this, w / 2, -5, title, { color: COL.emberHi, align: 'center', parent: c });
      mkBtn(this, c, w - 20, 4, 15, 14, 'x', () => this.closeWin(), { size: 8, tip: [{ t: '关闭  [Esc]', s: 8 }] });
      if (RUN && ['gear', 'mods', 'craft', 'tree'].includes(this.winId)) { const hs = '任务进行中 · 修改立即生效', hw = textW(hs, 8) + 8, hx = Math.round(w / 2 + pw / 2 + 6); c.add(nine(this, hx, -3, hw, 13, 'f_plaque')); T(this, hx + 4, -1, hs, { size: 8, color: COL.dim, parent: c }); }
    }
    if (anim) { c.setScale(0.96).setAlpha(0.6); this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 90, ease: 'Quad.easeOut' }); }
  }
  // 身上 6 个槽位
  equipSlots(c, ox, oy, onClick, selFn) {
    const pos = { core: [26, 0], wl: [0, 26], wr: [52, 26], hub: [0, 52], engine: [26, 52], shield: [52, 52] };
    const ghost = { wl: 'i_w_crossbow', wr: 'i_w_sickle', shield: 'i_a_boneward', core: 'i_a_helm', engine: 'i_a_shadowstep', hub: 'i_a_circle' };
    for (const s of SLOTS) {
      const it = S.equip[s.id]; const [x, y] = pos[s.id];
      mkCell(this, c, ox + x, oy + y, it, { size: 24, sel: selFn(it, s.id), ghost: ghost[s.id], tip: [{ t: s.id === 'wr' && !unlocked('wr') ? `${s.n}：${unlockText('wr')}` : `${s.n}（空）`, c: COL.dim }], onHover: i => { if (i) { hoverId = i.id; this.renderPane(); } }, onOut: () => { hoverId = null; this.renderPane(); }, onClick: i => onClick(i, s.id) });
    }
  }
  /* 装备 */
  win_gear(c) {
    T(this, 10, 6, '身上', { size: 8, color: COL.dim, parent: c });
    this.equipSlots(c, 18, 20, (i, slot) => { if (i) { selId = selId === i.id ? null : i.id; this.refresh(); } }, it => it && it.id === selId);
    { const cv = dollCanvas(S.equip, 0); if (this.textures.exists('doll_ui')) this.textures.remove('doll_ui'); this.textures.addCanvas('doll_ui', cv); // 中间格：当前样子
      rect(this, 44, 46, 24, 24, '#120c18', 1, c); const im = img(this, 44 + 12 - DOLL_W / 2, 46 + 24 - DOLL_H, 'doll_ui', c); im.setCrop(DOLL_W / 2 - 12, 0, 24, DOLL_H); }
    const P = STATS;
    const rows = [['预计秒伤', fmt(P.dps), COL.emberHi], ['生命', fmt(P.life), '#ff8a7a'], ['护盾', `${fmt(P.shield)}（每秒 +${r1(P.shieldRegen)}）`, '#bfe0ff'], ['护甲', `${fmt(P.armor)}（减伤 ${Math.round(armorDr(P.armor, typicalHit(S.depth)) * 100)}%）`], ['闪避', P.dodge + '%'], ['冲刺槽', String(P.dashMax)],
      ['属性', `${P.mass} / ${P.energy} / ${P.time}`]];
    const az = rect(this, 8, 152, 124, 10, '#000', 0, c).setInteractive();
    az.on('pointerover', () => showTip([{ t: `${ATTR_N.mass} ${P.mass} / ${ATTR_N.energy} ${P.energy} / ${ATTR_N.time} ${P.time}`, c: COL.emberHi }, { t: `${ATTR_N.mass}每点：护甲提高 2%，物理伤害总增 1%，加速降低 1%。`, s: 8 }, { t: `${ATTR_N.energy}每点：灵障提高 2%，冲刺回复提高 1%，元素伤害总增 1%。`, s: 8 }, { t: `${ATTR_N.time}每点：攻击和移动快 1%。`, s: 8 }])); az.on('pointerout', hideTip);
    rows.forEach(([a, b, col], i) => { const y = 102 + i * 10; T(this, 10, y, a, { size: 8, color: COL.dim, parent: c }); T(this, 128, y, b, { size: 8, color: col || COL.text, align: 'right', parent: c }); });
    T(this, 10, 164, '抗性', { size: 8, color: COL.dim, parent: c });
    ELEM.forEach((e, i) => T(this, 10 + i * 20, 175, String(P.res[e]), { size: 8, color: ELEM_C[e], parent: c }));
    T(this, 10, 186, `上限 ${P.maxRes}%`, { size: 8, color: COL.faint, parent: c });
    const rz = rect(this, 8, 162, 124, 34, '#000', 0, c).setInteractive();
    rz.on('pointerover', () => showTip([{ t: '抗性', c: COL.emberHi }, ...ELEM.map(e => ({ t: `${ELEM_N[e]} ${P.res[e]}%`, c: ELEM_C[e], s: 8 })), { t: `按百分比减少对应元素的伤害，上限 ${P.maxRes}%。`, s: 8 }])); rz.on('pointerout', hideTip);
    // 背包
    T(this, 140, 6, `背包 ${S.stash.length}/${STASH_CAP}`, { size: 8, color: COL.dim, parent: c });
    for (let i = 0; i < STASH_CAP; i++) {
      const it = S.stash[i]; const x = 140 + (i % 10) * 16, y = 18 + (i / 10 | 0) * 16;
      mkCell(this, c, x, y, it, { size: 16, sel: it && it.id === selId, upg: true, onHover: v => { if (v) { hoverId = v.id; this.renderPane(); } }, onOut: () => { hoverId = null; this.renderPane(); }, onClick: v => { if (!v) return; if (selId === v.id) equipItem(v); selId = v.id; v.isNew = false; save(); this.refresh(); } });
    }
    mkBtn(this, c, 140, 118, 40, 16, '整理', () => { sortStash(); this.refresh(); }, { size: 8 });
    mkBtn(this, c, 184, 118, 116, 16, confirmKey === 'junk' ? '再点一次确认' : '拆解所有普通装备', () => { if (confirm2('junk')) { S.stash.filter(x => x.rar === 0).forEach(salvage); save(); } this.refresh(); }, { size: 8, style: confirmKey === 'junk' ? 'r' : 'n' });
    T(this, 140, 140, '点一下选中，再点一下装备。', { size: 8, color: COL.faint, parent: c });
    T(this, 140, 151, '绿色箭头表示比身上那件更好。', { size: 8, color: COL.faint, parent: c });
    this.paneC = this.add.container(306, 6); c.add(this.paneC);
    this.renderPane();
  }
  renderPane() {
    if (!this.paneC || this.winId !== 'gear') return;
    const p = this.paneC; p.removeAll(true);
    const id = hoverId || selId; const f = id ? findItem(id) : null;
    if (!f) { TW(this, 0, 20, '把鼠标放到装备上查看详情。', 150, { size: 8, color: COL.faint, parent: p }); return; }
    const it = f.it; const r = mkCard(this, p, 0, 0, it, 154, { compare: true });
    if (hoverId && hoverId !== selId) return;
    const by = 176;
    if (f.where === 'stash') {
      if (it.kind === 'weapon') { mkBtn(this, p, 0, by, 48, 16, '装左手', () => { equipItem(it, 'wl'); save(); this.refresh(); }, { size: 8, style: 'w' }); mkBtn(this, p, 52, by, 48, 16, '装右手', () => { equipItem(it, 'wr'); save(); this.refresh(); }, { size: 8, style: 'w', disabled: !unlocked('wr'), tip: unlocked('wr') ? null : [{ t: unlockText('wr'), s: 8 }] }); }
      else mkBtn(this, p, 0, by, 100, 16, '装备', () => { equipItem(it); save(); this.refresh(); }, { size: 8, style: 'w' });
      mkBtn(this, p, 104, by, 48, 16, confirmKey === 'sal' + it.id ? '确认' : '拆解', () => { if (confirm2('sal' + it.id)) { const g = salvage(it); const n = Object.values(g).reduce((a, b) => a + b, 0); if (n) toast(`得到 ${n} 个词条碎片`, '#d9cfb8'); selId = null; save(); } this.refresh(); }, { size: 8, style: confirmKey === 'sal' + it.id ? 'r' : 'n', tip: [{ t: '拆解', c: COL.emberHi }, { t: `毁掉装备，每条词条给 ${CRAFT.shatter.perAffix} 个对应的碎片，T${CRAFT.shatter.bonusTier} 及以上多给 ${CRAFT.shatter.bonus} 个。`, s: 8 }] });
    } else {
      mkBtn(this, p, 0, by, 48, 16, '卸下', () => { unequip(f.slot); save(); this.refresh(); }, { size: 8 });
      if (it.sock || ['core', 'engine', 'hub'].includes(f.slot)) mkBtn(this, p, 52, by, 48, 16, '符文', () => { modWeapon = f.slot; this.openWin('mods'); }, { size: 8 });
    }
    mkBtn(this, p, f.where === 'stash' ? 0 : 104, by - 20, f.where === 'stash' ? 152 : 48, 16, '铁砧', () => { craftId = it.id; craftAff = -1; this.openWin('craft'); }, { size: 8, disabled: !unlocked('craft'), tip: unlocked('craft') ? null : [{ t: unlockText('craft'), s: 8 }] });
  }
  /* 符文 */
  win_mods(c) {
    const host = S.equip[modWeapon];
    const hosts = ['wl', 'wr', 'core', 'engine', 'hub'];
    hosts.forEach((s, i) => mkBtn(this, c, 10 + i * 46, 8, 43, 16, SLOTS.find(x => x.id === s).n, () => { modWeapon = s; this.refresh(); }, { size: 8, style: modWeapon === s ? 's' : 'n' }));
    const isHub = modWeapon === 'hub';
    if (!host) { TW(this, 10, 34, '这个位置没有装备。', 200, { size: 8, color: COL.faint, parent: c }); }
    else {
      mkCell(this, c, 10, 30, host, { size: 24 });
      T(this, 40, 30, itemName(host), { color: icol(host), parent: c });
      TW(this, 40, 44, '标签：' + itemTags(host).filter(t => TAG_N[t] && t !== 'Weapon').map(t => TAG_N[t]).join(' '), 180, { size: 8, color: COL.dim, parent: c });
      T(this, 10, 66, isHub ? '升级槽：符文在这里随击杀成长，力场符文在这里生效' : `符文槽 ${host.sock}`, { size: 8, color: COL.faint, parent: c });
      if (!host.sock) TW(this, 10, 80, '这件装备没有符文槽。', 220, { size: 8, color: COL.faint, parent: c });
      for (let i = 0; i < host.sock; i++) {
        const m = host.mods[i]; const x = 10 + i * 28, y = 80;
        if (isHub) rect(this, x - 2, y - 2, 28, 28, '#c08a1c', 1, c);
        mkCell(this, c, x, y, m, { size: 24, host, onHover: v => { if (v) showTip(modTip(v, host)); else showTip([{ t: '空槽', c: COL.dim }, { t: '从右边点一个符文插进来。', s: 8 }]); }, onOut: hideTip, onClick: v => { if (v && feedOn && feedSrc && feedSrc !== v) return this.doFeed(v); if (v) { host.mods[i] = null; S.mods.unshift(v); refreshStats(); save(); this.refresh(); } } });
      }
      const Wi = modWeapon === 'wl' ? STATS.weapons[0] : modWeapon === 'wr' ? STATS.weapons[1] : modWeapon === 'engine' ? STATS.engine : null;
      if (Wi) {
        const lines = [Wi.form === 'engine' ? `冲刺伤害 ${fmt(Wi.avg)}` : `秒伤 ${fmt(Wi.dps)} · 每秒攻击 ${r1(Wi.aps)} · 暴击 ${pct(Math.min(1, Wi.crit))} ×${Wi.critMult.toFixed(2)}`,
          ELEM.filter(e => Wi.max[e] > 0).map(e => `${ELEM_N[e]} ${fmt(Wi.min[e])}–${fmt(Wi.max[e])}`).join('  '),
          [Wi.pierce && '无限穿透', Wi.chain && `${Wi.form === 'proj' ? '弹射（碰屏幕边）' : '连锁'} ${Wi.chain}`, Wi.split && `分裂 ${Wi.split}`, Wi.ret && '回旋', Wi.extra && `额外攻击 ${Wi.extra}`].filter(Boolean).join('  ') || '没有弹道加成',
          '异常几率：' + (ELEM.filter(e => Wi.ail[e] > 0).map(e => `${AIL[e].n} ${pct(Math.min(1, Wi.ail[e]))}`).join('  ') || '无')];
        lines.forEach((s, i) => TW(this, 10, 116 + i * 11, s, 220, { size: 8, color: i === 0 ? COL.emberHi : COL.text, parent: c }));
      }
    }
    // 符文库存
    T(this, 244, 8, `符文 ${S.mods.length}`, { size: 8, color: COL.dim, parent: c });
    S.mods.slice(0, 50).forEach((m, i) => {
      const x = 244 + (i % 10) * 21, y = 20 + (i / 10 | 0) * 21;
      if (feedOn && feedSrc === m) rect(this, x - 1, y - 1, 22, 22, COL.ember, 1, c);
      mkCell(this, c, x, y, m, { size: 20, host, onHover: v => showTip(modTip(v, host)), onOut: hideTip, onClick: v => {
        m.isNew = false;
        if (feedOn) { if (!feedSrc || feedSrc === v) { feedSrc = feedSrc === v ? null : v; return this.refresh(); } return this.doFeed(v); }
        if (!host) return toast('这个位置没有装备');
        const k = host.mods.indexOf(null); if (k < 0) return toast(host.sock ? '槽满了，先点左边的符文取下' : '这件装备没有符文槽');
        host.mods[k] = v; S.mods = S.mods.filter(x => x !== v); refreshStats(); save(); this.refresh();
      } });
    });
    if (feedOn) TW(this, 244, 132, feedSrc ? `已选 ${MOD_BY[feedSrc.mid].n}（经验 ${fmt(feedSrc.xp)}）作为饲料，再点要喂的符文（右边或左边槽里的都行）。` : `先点一个符文当饲料：被喂的符文获得它累计经验的 ${Math.round(DATA.runes.feed.mul * 100)}%。`, 214, { size: 8, color: COL.emberHi, parent: c });
    else {
      TW(this, 244, 132, '点一个符文插进当前装备。红色等级表示在这里不生效。', 214, { size: 8, color: COL.faint, parent: c });
      TW(this, 244, 152, '武器、头冠、遁靴的符文槽让符文生效；法阵的升级槽让符文成长。', 214, { size: 8, color: COL.faint, parent: c });
    }
    mkBtn(this, c, 244, 176, 80, 18, feedOn ? '喂养：开' : '喂养：关', () => { feedOn = !feedOn; feedSrc = null; this.refresh(); }, { size: 8, style: feedOn ? 's' : 'n', disabled: !unlocked('feed'), tip: [{ t: '符文喂养', c: COL.emberHi }, { t: unlocked('feed') ? '把一枚符文喂给另一枚，被喂的获得它的经验。' : unlockText('feed'), s: 8 }] });
  }
  doFeed(dst) {
    if (!confirm2('feed' + dst.id)) { toast(`再点一次：把 ${MOD_BY[feedSrc.mid].n} 喂给 ${MOD_BY[dst.mid].n}`, COL.emberHi); return this.refresh(); }
    const add = feedRune(feedSrc, dst); feedSrc = null; sfx('craft'); toast(`${MOD_BY[dst.mid].n} 经验 +${fmt(add)}，现在 ${dst.lvl} 级`, COL.cyan); save(); this.refresh();
  }
  /* 铁砧 */
  win_craft(c, w, h) {
    const tabs = [['铁砧', true], ['熔铸', unlocked('fuse')]];
    tabs.forEach(([n, ok], i) => mkBtn(this, c, 10 + i * 46, 4, 43, 15, n, () => { craftTab = i; this.refresh(); }, { size: 8, style: craftTab === i ? 's' : 'n', disabled: !ok, tip: ok ? null : [{ t: unlockText('fuse'), s: 8 }] }));
    if (craftTab === 1 && unlocked('fuse')) return this.fusePane(c, w, h);
    const all = [...SLOTS.map(s => S.equip[s.id]).filter(Boolean), ...S.stash];
    let it = all.find(x => x.id === craftId); if (!it) { it = all.find(craftable) || all[0]; craftId = it && it.id; craftAff = -1; }
    all.slice(0, 64).forEach((x, i) => mkCell(this, c, 10 + (i % 8) * 16, 24 + (i / 8 | 0) * 16, x, { size: 16, sel: x === it, onClick: v => { craftId = v.id; craftAff = -1; craftLog = []; addPage = 0; this.refresh(); } }));
    craftLog.slice(0, 2).forEach((s, i) => TW(this, 10, 158 + i * 22, s, 128, { size: 8, color: i ? COL.faint : COL.text, parent: c }));
    if (!it) return;
    if (craftAff >= it.affs.length) craftAff = -1;
    mkCard(this, c, 146, 6, it, 160, { pick: craftable(it) ? i => { craftAff = craftAff === i ? -1 : i; this.refresh(); } : null, selAff: craftAff });
    const X = 316, adv = unlocked('craftAdv');
    const done = msg => { craftLog.unshift(msg); sfx('craft'); refreshStats(); save(); this.refresh(); };
    // 铸符数量和附带开关
    GLYPHS.forEach((g, i) => T(this, X + i * 37, 6, `${g.n.slice(0, 2)} ${glyphN(g.id)}`, { size: 8, color: glyphN(g.id) ? g.c : COL.faint, parent: c }));
    if (useHope && !glyphN('hope')) useHope = false; if (useChaos && !glyphN('chaos')) useChaos = false;
    mkBtn(this, c, X, 18, 72, 14, useHope ? '附带希望符' : '不带希望符', () => { useHope = !useHope; this.refresh(); }, { size: 8, style: useHope ? 's' : 'n', disabled: !glyphN('hope'), tip: [{ t: '希望符', c: GLYPH_BY.hope.c }, { t: `加词条或升档时附带一张：${Math.round(CRAFT.glyphs.hopeChance * 100)}% 几率这次不扣潜力。`, s: 8 }] });
    mkBtn(this, c, X + 76, 18, 72, 14, useChaos ? '附带混沌符' : '不带混沌符', () => { useChaos = !useChaos; this.refresh(); }, { size: 8, style: useChaos ? 's' : 'n', disabled: !glyphN('chaos'), tip: [{ t: '混沌符', c: GLYPH_BY.chaos.c }, { t: '升档时附带一张：升档后这条词条换成同类型（前缀或后缀）里随机的另一条，档位不变。', s: 8 }] });
    const sel = it.affs[craftAff];
    const uw = upWhy(it, craftAff), extra = sel ? Math.floor((sel.t + 2) / AV.upgradeTierDiv) : 0;
    mkBtn(this, c, X, 36, 148, 16, sel ? `升一档 · 碎片 ${shardN(sel.k)}` : '升一档（先点一条词条）', () => done(craftUp(it, craftAff, useHope, useChaos)), { size: 8, style: 'w', disabled: !!uw, tip: [{ t: '升一档', c: COL.emberHi }, { t: `花 1 个该词条的碎片，潜力扣 ${AV.upgrade[0]}–${AV.upgrade[1]}${extra ? ` + ${extra}` : ''}。数值重新随。最高两档（溢彩）只能掉落。`, s: 8 }, ...(uw ? [{ t: uw, s: 8, c: COL.bad }] : [])] });
    const rw = adv ? refineWhy(it, craftAff) : unlockText('craftAdv'), sw = adv ? stripWhy(it) : unlockText('craftAdv');
    mkBtn(this, c, X, 55, 72, 16, '洗数值', () => done(craftRefine(it, craftAff)), { size: 8, disabled: !!rw, tip: [{ t: '洗数值', c: GLYPH_BY.refine.c }, { t: `花 1 张洗练符，选中的词条在同档内重新随数值，潜力扣 ${AV.refine[0]}–${AV.refine[1]}。`, s: 8 }, ...(rw ? [{ t: rw, s: 8, c: COL.bad }] : [])] });
    mkBtn(this, c, X + 76, 55, 72, 16, '移除', () => done(craftStrip(it)), { size: 8, disabled: !!sw, tip: [{ t: '移除', c: GLYPH_BY.strip.c }, { t: `花 1 张剥离符，随机去掉一条词条，潜力扣 ${AV.strip[0]}–${AV.strip[1]}。`, s: 8 }, ...(sw ? [{ t: sw, s: 8, c: COL.bad }] : [])] });
    mkBtn(this, c, X, 74, 148, 16, confirmKey === 'shat' + it.id ? '再点一次确认拆解' : '拆解', () => {
      if (!confirm2('shat' + it.id)) return this.refresh();
      const g = salvage(it); const n = Object.values(g).reduce((a, b) => a + b, 0); craftId = null; done(`拆解 ${itemName(it)}，得到 ${n} 个词条碎片`);
    }, { size: 8, style: confirmKey === 'shat' + it.id ? 'r' : 'n', tip: [{ t: '拆解', c: COL.emberHi }, { t: `毁掉装备，每条词条给 ${CRAFT.shatter.perAffix} 个对应碎片，T${CRAFT.shatter.bonusTier} 及以上多给 ${CRAFT.shatter.bonus} 个。`, s: 8 }] });
    // 加词条：有碎片、能加到这件装备上的词条族
    const opts = craftable(it) ? AFF.filter(a => shardN(a.k) > 0 && canAdd(it, a)) : [];
    const per = 7, pages = Math.max(1, Math.ceil(opts.length / per)); addPage = Math.min(addPage, pages - 1);
    T(this, X, 95, `加词条（${opts.length} 种可加）`, { size: 8, color: COL.dim, parent: c });
    if (pages > 1) { mkBtn(this, c, X + 112, 93, 17, 12, '<', () => { addPage = (addPage + pages - 1) % pages; this.refresh(); }, { size: 8 }); mkBtn(this, c, X + 131, 93, 17, 12, '>', () => { addPage = (addPage + 1) % pages; this.refresh(); }, { size: 8 }); }
    const aw = anvilWhy(it);
    if (!opts.length) TW(this, X, 110, aw || (it.affs.length >= AFF_MAX ? `已经有 ${AFF_MAX} 条词条` : '没有能加到这件装备上的碎片。拆解装备或打怪能得到碎片。'), 148, { size: 8, color: COL.faint, parent: c });
    opts.slice(addPage * per, addPage * per + per).forEach((a, i) => {
      const why = addWhy(it, a.k);
      mkBtn(this, c, X, 108 + i * 14, 148, 13, `${a.type === 'P' ? '前' : '后'} ${affName(a)} ×${shardN(a.k)}`, () => done(craftAdd(it, a.k, useHope)), { size: 8, labelX: 4, disabled: !!why, tip: [{ t: affName(a), c: COL.emberHi }, { t: `从 T${addTier(a, it) + 1} 开始（${a.f(rollVal(a, addTier(a, it)))} 左右），花 1 个碎片，潜力扣 ${AV.add[0]}–${AV.add[1]}。`, s: 8 }, ...(why ? [{ t: why, s: 8, c: COL.bad }] : [])] });
    });
  }
  // 传奇熔铸
  fusePane(c, w, h) {
    const items = [...SLOTS.map(s => S.equip[s.id]).filter(Boolean), ...S.stash];
    const us = items.filter(x => x.u && !x.leg);
    let u = us.find(x => x.id === craftId) || us[0]; craftId = u && u.id;
    T(this, 10, 24, `独特装备 ${us.length}`, { size: 8, color: COL.dim, parent: c });
    us.slice(0, 48).forEach((x, i) => mkCell(this, c, 10 + (i % 8) * 16, 36 + (i / 8 | 0) * 16, x, { size: 16, sel: x === u, onClick: v => { craftId = v.id; fuseId = null; this.refresh(); } }));
    TW(this, 10, 150, `独特装备保留规则和固定词条，再从同部位的稀有装备上随机转移“传奇潜力”条词条（档位不变）。稀有装备会被消耗。`, 128, { size: 8, color: COL.faint, parent: c });
    if (!u) { TW(this, 146, 30, '没有可以熔铸的独特装备。', 160, { size: 8, color: COL.faint, parent: c }); return; }
    mkCard(this, c, 146, 6, u, 160);
    const rs = items.filter(x => x.kind === u.kind && x.rar === 2 && !x.u);
    let r = rs.find(x => x.id === fuseId) || null;
    T(this, 316, 24, `同部位的稀有装备 ${rs.length}`, { size: 8, color: COL.dim, parent: c });
    rs.slice(0, 36).forEach((x, i) => mkCell(this, c, 316 + (i % 9) * 16, 36 + (i / 9 | 0) * 16, x, { size: 16, sel: x === r, onClick: v => { fuseId = v.id; this.refresh(); } }));
    if (r) TW(this, 316, 104, r.affs.map(x => `${tierLabel(x)} ${affText(x)}`).join('\n'), 148, { size: 8, color: '#efe2b6', parent: c });
    const why = fuseWhy(u, r);
    mkBtn(this, c, 316, 176, 148, 20, confirmKey === 'fuse' ? '再点一次确认' : '熔铸', () => {
      if (!confirm2('fuse')) return this.refresh();
      craftLog.unshift(craftFuse(u, r)); fuseId = null; sfx('craft'); save(); this.refresh();
    }, { style: confirmKey === 'fuse' ? 'r' : 'w', size: 8, disabled: !!why, tip: why ? [{ t: why, s: 8, c: COL.bad }] : [{ t: `转移 ${Math.min(u.lp, r.affs.length)} 条词条`, s: 8 }] });
  }
  /* 天赋树 · 星空版（设计稿见 Open Design ashen-crypt-talent-tree）
     节点按品级区分：小节点 = 星点，中节点 = 青环宝珠 + 图标，大型节点 = 金色宝珠 + 光芒 + 分支色内环 + 图标，印记槽 = 青色菱形。
     左栏：天赋点、搜索、标签筛选、构筑预设、印记、重置；右栏：汇总。两栏都能收起。 */
  win_tree(c, w, h) {
    const pts = treePoints(), U = treeUI, V = treeView;
    const on = id => id === 'start' || S.tree.includes(id);
    // ---- 星空底图（只生成一次）----
    const BW = w - 6, BH = h - 6;
    if (!this.textures.exists('tree_sky')) treeSkyTex(this, BW, BH);
    c.add(this.add.image(3, 3, 'tree_sky').setOrigin(0));
    const tw = this.add.graphics(); c.add(tw);
    const stars = treeTwinkles(BW, BH);
    const twinkle = () => { if (!tw.scene) return; tw.clear(); const t = performance.now() / 1000; for (const s of stars) { const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * s.sp + s.ph)); tw.fillStyle(s.c, a).fillRect(3 + s.x, 3 + s.y, 1, 1); if (s.big && a > 0.7) tw.fillStyle(s.c, (a - 0.7) * 1.6).fillRect(2 + s.x, 3 + s.y, 3, 1).fillRect(3 + s.x, 2 + s.y, 1, 3); } };
    const tev = this.time.addEvent({ delay: 120, loop: true, callback: twinkle }); c.once('destroy', () => tev.remove()); twinkle();
    // ---- 视口：两栏之间 ----
    const LW = 88, RW = 106;
    const VL = U.left ? LW + 2 : 4, VR = U.right ? w - RW - 2 : w - 4;
    const VX = 3, VY = 3, VW = w - 6, VH = h - 6; // 画在整块面板上，栏位半透明盖在上面
    const CX = (VL + VR) / 2, CY = VY + VH / 2;
    const g = this.add.graphics(); c.add(g);
    const sx = x => Math.round(CX + (x - V.x) * V.z), sy = y => Math.round(CY + (y - V.y) * V.z);
    const k = clamp(V.z, 0.75, 1.5);
    const rad = nd => Math.round((nd.kind === 'k' || nd.kind === 'start' ? 5.5 : nd.kind === 'n' ? 4 : nd.kind === 'sock' ? 3.5 : 1.5) * k);
    // 搜索 / 标签 / 预设
    const txt = nd => (nd.n || '') + ' ' + treeLines(nd).join(' ') + ' ' + (nd.kind === 'sock' ? '印记槽' : '');
    const tag = TREE_TAGS.find(t => t.n === U.tag);
    const match = id => { const nd = TREE.nodes[id]; if (nd.kind === 'start') return false; const s = txt(nd); return (!U.q || s.includes(U.q)) && (!tag || tag.re.test(s)); };
    const filt = !!(U.q || tag), hit = new Set(filt ? Object.keys(TREE.nodes).filter(match) : []);
    const pre = U.preset && DEMO_SAVES[U.preset] ? new Set(JSON.parse(DEMO_SAVES[U.preset]).tree) : null;
    let hov = null, path = new Set();
    const labels = [];
    for (const id in TREE.nodes) { const nd = TREE.nodes[id]; if (nd.kind !== 'k') continue; labels.push([nd, T(this, 0, 0, nd.n, { size: 8, color: on(id) ? COL.emberHi : '#8f8ab8', align: 'center', parent: c })]); }
    const brL = TREE_BRANCH.map(B => [TREE.nodes[B.id + '4'], T(this, 0, 0, B.n, { size: 8, color: B.c, align: 'center', parent: c })]);
    const inV = (x, y, m = 0) => x >= VL + m && x <= VR - m && y >= VY + m && y <= VY + VH - m;
    const clip = (x1, y1, x2, y2) => { // Liang–Barsky
      let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
      for (const [p, q] of [[-dx, x1 - VL], [dx, VR - x1], [-dy, y1 - VY], [dy, VY + VH - y1]]) { if (p === 0) { if (q < 0) return null; } else { const r = q / p; if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } } }
      return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
    };
    const draw = () => {
      g.clear();
      // 连线：像素线（星座线）
      for (const [a, b] of TREE.edges) {
        const A = TREE.nodes[a], B = TREE.nodes[b]; const l = clip(sx(A.x), sy(A.y), sx(B.x), sy(B.y)); if (!l) continue;
        const lit = on(a) && on(b), pv = (path.has(a) || on(a)) && (path.has(b) || on(b)) && (path.has(a) || path.has(b));
        if (lit) { pxLine(g, l, 0x9fc8ff, 0.18, 3); pxLine(g, l, 0xf4f8ff, 1); }
        else if (pv) { pxLine(g, l, 0xffd36a, 0.2, 3); pxLine(g, l, 0xffe9a8, 0.95); }
        else pxLine(g, l, (on(a) || on(b)) ? 0x6f78b8 : 0x3a3f74, filt ? 0.35 : 0.7);
      }
      for (const id in TREE.nodes) {
        const nd = TREE.nodes[id], r = rad(nd), X = sx(nd.x), Y = sy(nd.y);
        if (!inV(X - r - 3, Y - r - 3) || !inV(X + r + 3, Y + r + 3)) continue;
        const got = on(id), can = treeCanAlloc(id), dim = filt && !hit.has(id) ? 0.35 : 1, pv = path.has(id);
        if (filt && hit.has(id)) pxRing(g, X, Y, r + 3, 0xff7cf2, 0.9);
        if (pre && pre.has(id) && !got) pxRing(g, X, Y, r + 2, 0x7fc8ff, 0.7);
        if (pv && !got) pxRing(g, X, Y, r + 2, 0xffd36a, 0.9);
        else if (can) pxRing(g, X, Y, r + 1, 0xffd36a, 0.55 * dim);
        treeNodeGfx(g, nd, X, Y, r, got, dim);
      }
      for (const [nd, t] of labels) { const x = sx(nd.x), y = sy(nd.y) + rad(nd) + 4; t.setPosition(x, y); t.setVisible(V.z >= 1.1 && inV(x - 20, y) && inV(x + 20, y + 9)); }
      for (const [nd, t] of brL) { const x = sx(nd.x) + 14, y = sy(nd.y) - 4; t.setPosition(x, y); t.setVisible(inV(x - 12, y) && inV(x + 12, y + 9)); }
    };
    // 预览路径：从已点节点出发到悬停节点的最短路
    const pathTo = id => {
      if (on(id)) return [];
      const prev = { }, q = ['start', ...S.tree], seen = new Set(q);
      while (q.length) { const x = q.shift(); if (x === id) break; for (const n of TREE.nodes[x].nb) if (!seen.has(n)) { seen.add(n); prev[n] = x; q.push(n); } }
      const out = []; let x = id; while (x && !on(x)) { out.push(x); x = prev[x]; } return out;
    };
    draw();
    const pick = () => { let best = null, bd = 1e9; const lx = mouse.x - c.x, ly = mouse.y - c.y; if (!inV(lx, ly)) return null; for (const id in TREE.nodes) { const nd = TREE.nodes[id]; const d = (sx(nd.x) - lx) ** 2 + (sy(nd.y) - ly) ** 2, r = rad(nd) + 3; if (d < r * r && d < bd) { bd = d; best = id; } } return best; };
    const RAR = { s: ['普通 · 小节点', '#dfe8ff'], n: ['稀有 · 中节点', COL.cyan], k: ['传奇 · 大型节点', COL.emberHi], start: ['起点', COL.emberHi], sock: ['印记槽', COL.cyan] };
    const tipFor = id => {
      const nd = TREE.nodes[id], got = on(id), can = treeCanAlloc(id), [rn, rc] = RAR[nd.kind], need = path.size;
      const bn = nd.b >= 0 ? TREE_BRANCH[nd.b].n + ' · ' : '';
      const act = got ? (nd.kind === 'start' ? '起点' : treeCanRefund(id) ? '点击退回' : '退回会断开别的节点') : can ? '点击点亮' : need ? `还没连上 · 走过去要 ${need} 点（金色路径）` : pts ? '还没连上' : '没有天赋点';
      if (nd.kind === 'sock') { const ch = chipIn(id); return ch ? [{ t: itemName(ch), c: RCOL[ch.rar] }, ...ch.affs.map(x => ({ t: affText(x), s: 8 })), ...ruleLines(ch).map(t => ({ t, s: 8, c: '#ff9a3c' })), { t: '点击取下', s: 8, c: COL.dim }] : [{ t: '印记槽', c: nd.c }, { t: got ? '点左栏的印记插进来' : act, s: 8, c: COL.dim }]; }
      return [{ t: nd.n || rn.split(' · ')[1], c: nd.kind === 's' ? nd.c : nd.kind === 'n' ? nd.c : COL.emberHi }, { t: bn + rn, s: 8, c: rc }, ...treeLines(nd).map(t => ({ t, s: 8 })), { t: act, s: 8, c: COL.dim }];
    };
    const z = this.add.zone(VX, VY, VW, VH).setOrigin(0).setInteractive(); c.add(z);
    let drag = null;
    const setHov = id => { if (id === hov) return; hov = id; path = new Set(id ? pathTo(id) : []); draw(); if (id) showTip(tipFor(id)); else hideTip(); };
    z.on('pointerdown', () => { drag = { x: mouse.x, y: mouse.y, vx: V.x, vy: V.y, moved: false }; });
    z.on('pointermove', () => {
      if (drag && (drag.moved || Math.hypot(mouse.x - drag.x, mouse.y - drag.y) > 3)) { drag.moved = true; V.x = drag.vx - (mouse.x - drag.x) / V.z; V.y = drag.vy - (mouse.y - drag.y) / V.z; hideTip(); hov = null; path = new Set(); draw(); return; }
      setHov(pick());
    });
    z.on('pointerout', () => { drag = null; setHov(null); });
    z.on('pointerup', () => {
      const d = drag; drag = null; if (d && d.moved) return;
      const id = pick(); if (!id) return; const nd = TREE.nodes[id];
      if (treeCanAlloc(id)) { S.tree.push(id); sfx('craft'); }
      else if (on(id) && nd.kind === 'sock' && chipIn(id)) { unequipChip(id); hideTip(); }
      else if (on(id) && treeCanRefund(id)) treeKeep(S.tree.filter(x => x !== id));
      else return;
      refreshStats(); save(); this.refresh();
    });
    const zoom = f => { V.z = clamp(V.z * f, 0.5, 2.5); draw(); };
    z.on('wheel', (p, dx, dy) => zoom(dy > 0 ? 1 / 1.15 : 1.15));
    // ---- 底部：图例 + 缩放 ----
    const ly = h - 17, lx0 = VL + 2;
    rect(this, lx0, ly - 1, 150, 14, '#070918', 0.7, c);
    const lg = this.add.graphics(); c.add(lg);
    let lx = lx0 + 7;
    [['s', '普通'], ['n', '稀有'], ['k', '传奇'], ['sock', '印记槽']].forEach(([kd, n]) => {
      treeNodeGfx(lg, { kind: kd, c: '#7fc8ff', b: 2, add: {}, icon: 'none' }, lx, ly + 6, kd === 'k' ? 4 : kd === 'n' ? 3 : kd === 'sock' ? 3 : 1, true, 1);
      T(this, lx + 6, ly + 1, n, { size: 8, color: COL.dim, parent: c }); lx += 13 + textW(n, 8) + 6;
    });
    mkBtn(this, c, VR - 32, h - 18, 14, 14, '-', () => zoom(1 / 1.25), { size: 8, tip: [{ t: '缩小', s: 8 }] });
    mkBtn(this, c, VR - 17, h - 18, 14, 14, '+', () => zoom(1.25), { size: 8, tip: [{ t: '放大', s: 8 }] });
    mkBtn(this, c, VR - 59, h - 18, 26, 14, '回中', () => { V.x = 0; V.y = 0; V.z = 1; draw(); }, { size: 8 });
    // ---- 左栏 ----
    if (U.left) {
      const p = rect(this, 3, 3, LW - 1, h - 6, '#080a1c', 0.82, c); p.setInteractive(); rect(this, LW + 2, 3, 1, h - 6, '#3a3f74', 1, c);
      T(this, 8, 6, `天赋点 ${pts}`, { color: pts ? COL.emberHi : COL.dim, parent: c });
      const keys = S.tree.filter(id => TREE.nodes[id]?.kind === 'k').length;
      T(this, 8, 20, `已点 ${S.tree.length} · 大型 ${keys}`, { size: 8, color: COL.faint, parent: c });
      // 搜索框（浏览器输入框盖在画布上，能打中文）
      rect(this, 7, 33, 78, 13, '#141836', 1, c); rect(this, 7, 45, 78, 1, '#3a3f74', 1, c);
      const qT = T(this, 10, 34, U.q || '搜索名称或效果', { size: 8, color: U.q ? COL.text : COL.faint, parent: c });
      const qz = this.add.zone(7, 33, 78, 13).setOrigin(0).setInteractive(); c.add(qz);
      qz.on('pointerup', () => treeSearchInput(this, c.x + 7, c.y + 33, 78, 13, U.q, v => { U.q = v.trim(); this.refresh(); }));
      if (U.q) mkBtn(this, c, 74, 34, 10, 11, 'x', () => { U.q = ''; this.refresh(); }, { size: 8 });
      T(this, 8, 49, '标签', { size: 8, color: COL.dim, parent: c });
      TREE_TAGS.forEach((t, i) => mkBtn(this, c, 7 + (i % 3) * 26, 60 + Math.floor(i / 3) * 13, 25, 12, t.n, () => { U.tag = U.tag === t.n ? null : t.n; this.refresh(); }, { size: 8, style: U.tag === t.n ? 's' : 'n' }));
      const py = 60 + Math.ceil(TREE_TAGS.length / 3) * 13 + 2;
      T(this, 8, py, '构筑预设', { size: 8, color: COL.dim, parent: c });
      [['spark', '游雷'], ['whirl', '旋风斩'], ['nova', '霜环'], ['meteor', '陨火'], ['orb', '寒魄']].forEach(([id, n], i) => mkBtn(this, c, 7 + i * 40, py + 11, 38, 13, n, () => { U.preset = U.preset === id ? null : id; this.refresh(); }, { size: 8, style: U.preset === id ? 's' : 'n', tip: [{ t: `${n}的毕业天赋：在盘上用蓝圈标出来`, s: 8 }] }));
      let cy = py + 27;
      if (pre) {
        const left = [...pre].filter(id => !S.tree.includes(id) && TREE.nodes[id]).length;
        mkBtn(this, c, 7, cy, 78, 13, left ? `按预设点亮 (${left})` : '预设已点满', () => {
          let n = 0; for (let more = true; more && treePoints() > 0;) { more = false; for (const id of pre) if (treeCanAlloc(id)) { S.tree.push(id); n++; more = true; if (!treePoints()) break; } }
          if (n) { sfx('craft'); refreshStats(); save(); } else toast(treePoints() ? '预设里没有能连上的节点' : '没有天赋点'); this.refresh();
        }, { size: 8, disabled: !left, tip: [{ t: '按顺序点亮预设里能连上的节点，点数用完为止。不会退回已点的天赋。', s: 8 }] });
        cy += 16;
      }
      const chips = S.stash.filter(x => x.kind === 'chip');
      if (chips.length) {
        T(this, 8, cy, '印记', { size: 8, color: COL.cyan, parent: c }); cy += 11;
        chips.slice(0, 10).forEach((it, i) => {
          const bx = 7 + (i % 5) * 16, by = cy + Math.floor(i / 5) * 16;
          rect(this, bx, by, 14, 14, it.rar === 3 ? '#5a3a14' : '#1a1e40', 1, c); img(this, bx + 1, by + 1, 'i_' + iconOf(it), c);
          const zz = this.add.zone(bx, by, 14, 14).setOrigin(0).setInteractive(); c.add(zz);
          zz.on('pointerover', () => showTip([{ t: itemName(it), c: RCOL[it.rar] }, ...it.affs.map(x => ({ t: affText(x), s: 8 })), ...ruleLines(it).map(t => ({ t, s: 8, c: '#ff9a3c' })), { t: '点击插到空的印记槽', s: 8, c: COL.dim }]));
          zz.on('pointerout', hideTip);
          zz.on('pointerup', () => { hideTip(); if (equipChip(it)) { sfx('craft'); save(); } this.refresh(); });
        });
      }
      mkBtn(this, c, 7, h - 22, 78, 15, confirmKey === 'respec' ? '确认重置' : '全部重置', () => { if (!S.tree.length) return; if (confirm2('respec')) { treeKeep([]); refreshStats(); save(); } this.refresh(); }, { size: 8, style: confirmKey === 'respec' ? 'r' : 'n', tip: [{ t: '退回全部天赋点（目前免费），插着的印记回到背包', s: 8 }, { t: '拖动平移，滚轮或右下角按钮缩放；只能点和已点节点相连的节点，点已点的节点可以退回。', s: 8, c: COL.dim }] });
    }
    mkBtn(this, c, (U.left ? LW + 3 : 4), 22, 9, 16, U.left ? '<' : '>', () => { U.left = !U.left; this.refresh(); }, { size: 8, tip: [{ t: U.left ? '收起左栏' : '展开左栏', s: 8 }] });
    // ---- 右栏：汇总 ----
    if (U.right) {
      const RX = w - RW - 3;
      const p = rect(this, RX, 3, RW, h - 6, '#080a1c', 0.82, c); p.setInteractive(); rect(this, RX - 1, 3, 1, h - 6, '#3a3f74', 1, c);
      T(this, RX + 6, 6, '汇总', { color: COL.emberHi, parent: c });
      const lines = treeSummary(on);
      const lc = this.add.container(0, 0); c.add(lc);
      const top = 22, bot = h - 17, LWd = RW - 10;
      const rows = []; for (const [t, col, hd] of lines) for (const s of wrapText(t, LWd - (hd ? 0 : 3), 8)) rows.push([s, col, hd]);
      const vis = Math.floor((bot - top) / 10);
      U.scroll = clamp(U.scroll || 0, 0, Math.max(0, rows.length - vis));
      const render = () => { lc.removeAll(true); rows.slice(U.scroll, U.scroll + vis).forEach(([s, col, hd], i) => T(this, RX + (hd ? 6 : 9), top + i * 10, s, { size: 8, color: col, parent: lc })); };
      render();
      p.on('wheel', (pp, dx, dy) => { const o = U.scroll; U.scroll = clamp(U.scroll + (dy > 0 ? 3 : -3), 0, Math.max(0, rows.length - vis)); if (o !== U.scroll) render(); });
      if (rows.length > vis) T(this, RX + RW - 6, h - 16, '滚轮', { size: 8, color: COL.faint, align: 'right', parent: c });
    }
    mkBtn(this, c, U.right ? w - RW - 13 : w - 13, 22, 9, 16, U.right ? '>' : '<', () => { U.right = !U.right; this.refresh(); }, { size: 8, tip: [{ t: U.right ? '收起汇总' : '展开汇总', s: 8 }] });
  }
  /* 墓图 · 命盘 · 祝福 */
  win_atlas(c, w, h) {
    ['墓图', '命盘', '祝福'].forEach((n, i) => mkBtn(this, c, 10 + i * 48, 6, 46, 16, n + (i === 1 && marblePoints() ? ` ${marblePoints()}` : ''), () => { atlasTab = i; this.refresh(); }, { size: 8, style: atlasTab === i ? 's' : 'n' }));
    this['atlas_' + atlasTab](c, w, h);
  }
  atlas_0(c, w, h) {
    const sel = S.maps.find(m => m.id === atlasSel) || null;
    const armed = armedMap();
    T(this, 10, 30, '墓图台', { size: 8, color: COL.dim, parent: c });
    mkCell(this, c, 10, 40, armed, { size: 24, sel: armed && armed === sel, ghost: 'i_a_map', tip: [{ t: '墓图台（空）', c: COL.dim }, { t: '放上一张墓图，下次任务会消耗它。', s: 8 }], onHover: m => m && showTip(mapTip(m)), onClick: m => { if (m) { atlasSel = m.id; this.refresh(); } } });
    TW(this, 40, 42, armed ? `下次任务：${mapName(armed)}` : '没放墓图：按普通难度出发', 150, { size: 8, color: armed ? RCOL[armed.rar] : COL.faint, parent: c });
    T(this, 10, 72, `墓图 ${S.maps.length}`, { size: 8, color: COL.dim, parent: c });
    const list = [...S.maps].sort((a, b) => b.tier - a.tier || b.rar - a.rar);
    for (let i = 0; i < 40; i++) {
      const m = list[i]; const x = 10 + (i % 10) * 19, y = 82 + Math.floor(i / 10) * 19;
      mkCell(this, c, x, y, m, { size: 18, sel: m && (m.id === atlasSel || m.id === S.mapArmed), onHover: m => m && showTip(mapTip(m)), onClick: m => { if (!m) return; m.isNew = false; atlasSel = m.id; this.refresh(); } });
    }
    TW(this, 10, 162, '墓图从怪物和 Boss 身上掉落。阶级越高怪物越强，掉落越多。', 186, { size: 8, color: COL.faint, parent: c });
    // 右侧：选中的墓图
    const px = 214; rect(this, px - 8, 28, 1, h - 40, '#33293f', 1, c);
    if (!sel) { TW(this, px, 34, '点一张墓图查看。', 240, { size: 8, color: COL.faint, parent: c }); return; }
    img(this, px, 30, 'i_a_map', c); T(this, px + 17, 31, mapName(sel), { color: RCOL[sel.rar], parent: c });
    let cy = 50;
    for (const l of mapTip(sel).slice(1)) { const t = TW(this, px, cy, l.t, 240, { size: 8, color: l.c || '#b8afc4', parent: c }); cy += t.h; }
    const on = sel.id === S.mapArmed;
    mkBtn(this, c, px, 150, 92, 16, on ? '从墓图台取下' : '放上墓图台', () => { S.mapArmed = on ? null : sel.id; sel.isNew = false; save(); this.refresh(); }, { size: 8, style: on ? 'n' : 'w' });
    mkBtn(this, c, px + 96, 150, 52, 16, confirmKey === 'dropmap' ? '确认' : '丢弃', () => { if (confirm2('dropmap')) { S.maps = S.maps.filter(m => m !== sel); if (S.mapArmed === sel.id) S.mapArmed = null; save(); } this.refresh(); }, { size: 8, style: confirmKey === 'dropmap' ? 'r' : 'n' });
    TW(this, px, 172, '墓图的稀有度和词条在掉落时就定了。', 240, { size: 8, color: COL.faint, parent: c });
  }
  atlas_1(c, w, h) {
    const pts = marblePoints();
    T(this, 10, 30, `命盘点 ${pts}`, { color: pts ? COL.emberHi : COL.dim, parent: c });
    TW(this, 10, 46, '每解锁一层难度、每完成两张墓图得 1 点。弹珠从顶上落下，只能点亮上方相邻钉子已点亮的钉子。', 120, { size: 8, color: COL.faint, parent: c });
    // 汇总
    const L = lootFx(null); let cy = 104;
    const rows = Object.keys(MARBLE_TEXT).filter(k => !k.startsWith('call:') && L[k]).map(k => MARBLE_TEXT[k](L[k])).concat(Object.entries(L.call).map(([k, v]) => MARBLE_TEXT['call:' + k](v)));
    for (const t of rows.slice(0, 9)) { T(this, 10, cy, t, { size: 8, color: '#e9d9a8', parent: c }); cy += 9; }
    mkBtn(this, c, w - 64, 186, 56, 16, confirmKey === 'mreset' ? '确认' : '全部重置', () => { if (!S.marble.length) return; if (confirm2('mreset')) { S.marble = []; save(); } this.refresh(); }, { size: 8, style: confirmKey === 'mreset' ? 'r' : 'n', tip: [{ t: '退回全部命盘点（免费）', s: 8 }] });
    const g = this.add.graphics(); c.add(g);
    const cx = 290, top = 34, dx = 26, dy = 22;
    const P = nd => [cx + (nd.c - nd.r / 2) * dx, top + nd.r * dy];
    for (const id in MARBLE.nodes) { const nd = MARBLE.nodes[id]; const [x, y] = P(nd); for (const d of nd.down) { const [x2, y2] = P(MARBLE.nodes[d]); const lit = marbleOn(id) && marbleOn(d); g.lineStyle(1, hex(lit ? COL.emberHi : marbleOn(id) || marbleOn(d) ? '#6a5a7e' : '#33293f'), 1).lineBetween(x, y, x2, y2); } }
    for (const id in MARBLE.nodes) {
      const nd = MARBLE.nodes[id]; const [x, y] = P(nd); const got = marbleOn(id), can = marbleCanAlloc(id);
      const r = nd.kind === 'k' ? 5 : nd.kind === 'n' ? 4 : nd.kind === 'start' ? 5 : 3;
      const col = nd.kind === 'k' ? COL.emberHi : nd.kind === 'n' ? COL.cyan : '#e9d9a8';
      g.fillStyle(0x120c18, 1).fillCircle(x, y, r + 1);
      g.fillStyle(hex(got ? col : can ? '#4b3e60' : '#231b2e'), 1).fillCircle(x, y, r);
      if (got) g.fillStyle(0xffffff, 0.6).fillRect(x - 1, y - r + 1, 2, 1);
      if (can) { g.lineStyle(1, hex(COL.emberHi), (Math.sin(G.time * 6) + 1) / 4 + 0.4).strokeCircle(x, y, r + 2); }
      const z = this.add.zone(x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4).setOrigin(0).setInteractive(); c.add(z);
      z.on('pointerover', () => showTip([{ t: nd.kind === 'start' ? '弹珠起点' : nd.n || (nd.kind === 'n' ? '召唤' : '钉子'), c: col }, ...marbleLines(nd).map(t => ({ t, s: 8 })), ...(nd.kind === 'start' ? [] : [{ t: got ? (marbleCanRefund(id) ? '点击退回' : '退回会断开下面的钉子') : can ? '点击点亮' : pts ? '上方还没连上' : '没有命盘点', s: 8, c: COL.dim }])]));
      z.on('pointerout', hideTip);
      z.on('pointerup', () => { if (can) { S.marble.push(id); sfx('craft'); } else if (S.marble.includes(id) && marbleCanRefund(id)) S.marble = S.marble.filter(x => x !== id); else return; save(); this.refresh(); });
    }
    // 弹珠
    g.fillStyle(0xdfe6ee, 1).fillCircle(cx, top - 10, 3); g.fillStyle(0xffffff, 1).fillRect(cx - 1, top - 12, 1, 1);
  }
  atlas_2(c, w, h) {
    TW(this, 10, 30, '四个 Boss 按任务等级轮流出现。每个 Boss 击败 1、5、15 次后，各得到一种永久祝福。', 450, { size: 8, color: COL.faint, parent: c });
    BOSSES.forEach((B, i) => {
      const y = 48 + i * 36; const k = S.bossKills[B.id] || 0;
      rect(this, 10, y, 450, 32, '#1a1422', 1, c);
      img(this, 14, y + 2, 'm_boss_' + B.id + '_0', c).setScale(0.75);
      T(this, 34, y + 4, B.n, { size: 8, color: ELEM_C[B.el], parent: c }); T(this, 34, y + 16, `击败 ${k} 次`, { size: 8, color: COL.dim, parent: c });
      T(this, 34, y + 25, '', { size: 8, parent: c });
      BOONS[B.id].forEach((bn, j) => {
        const got = boonGot(B.id, j); const bx = 110 + j * 116;
        rect(this, bx, y + 3, 112, 26, got ? '#3a2a12' : '#231b2e', 1, c);
        T(this, bx + 4, y + 5, `${bn.n}${got ? '' : `（${BOON_AT[j]} 次）`}`, { size: 8, color: got ? COL.emberHi : COL.faint, parent: c });
        T(this, bx + 4, y + 17, Object.entries(bn.add).map(([kk, v]) => treeText(kk, v)).join('，'), { size: 8, color: got ? '#e9d9a8' : '#5d5170', parent: c });
      });
    });
  }
  /* 天梯 */
  win_ladder(c, w, h) {
    const L = S.ladder, ti = ladderTier(L.best), tier = LADDER_TIERS[ti], nx = LADDER_TIERS[ti + 1];
    ladPick = clamp(ladPick, 1, L.unlocked);
    T(this, 12, 10, tier ? tier.n : '未定段位', { color: tier ? tier.c : COL.dim, scale: 2, parent: c });
    T(this, 12, 36, nx ? `下一段位 ${nx.n}：${nx.at} 层` : '已是最高段位', { size: 8, color: COL.dim, parent: c });
    T(this, 12, 48, L.best ? `最高 ${L.best} 层 · 用时 ${mmss(L.bestTime)}` : '还没有通过任何一层', { size: 8, color: COL.text, parent: c });
    T(this, 12, 60, `已解锁到第 ${L.unlocked} 层`, { size: 8, color: COL.good, parent: c });
    // 选层
    mkBtn(this, c, 12, 76, 18, 18, '<', () => { ladPick = Math.max(1, ladPick - 1); this.refresh(); }, { size: 8, disabled: ladPick <= 1 });
    T(this, 62, 85, `第 ${ladPick} 层`, { align: 'center', valign: 'middle', color: COL.emberHi, parent: c });
    mkBtn(this, c, 94, 76, 18, 18, '>', () => { ladPick = Math.min(L.unlocked, ladPick + 1); this.refresh(); }, { size: 8, disabled: ladPick >= L.unlocked });
    mkBtn(this, c, 116, 76, 40, 18, '最高', () => { ladPick = L.unlocked; this.refresh(); }, { size: 8, disabled: ladPick >= L.unlocked });
    const busy = ladderBusy(), queued = LAD.pending;
    mkBtn(this, c, 12, 100, 92, 22, busy ? '进行中' : queued ? '已排队' : '挑战', () => ladderChallenge(ladPick), { style: 'w', disabled: !!(busy || queued), tip: () => [{ t: `挑战天梯第 ${ladPick} 层`, c: COL.emberHi }, { t: RUN && !busy ? '当前这局打完后开始。' : '马上开始。', s: 8 }, { t: '不消耗任何东西；失败没有损失。', s: 8, c: COL.dim }] });
    mkBtn(this, c, 108, 100, 48, 22, L.chain ? '连打 开' : '连打 关', () => { L.chain = !L.chain; save(); this.refresh(); }, { size: 8, style: L.chain ? 's' : 'n', tip: [{ t: '连打', c: COL.emberHi }, { t: '开着时，成功后接着打新的最高层；失败后回到推层。关着时只打一次。', s: 8 }] });
    const R = LD.run, J = LD.jumps.list;
    const desc = TW(this, 12, 128, `怪物等级 = 层数，怪和精英更多。攒满 ${ladderNeed(ladPick)} 点（精英 ${R.eliteP} 点）出守关 Boss，限时 ${mmss(R.timeLimit)}；剩 ${J[0][0]} 秒以上跳 ${J[0][1]} 层，${J[1][0]} 秒以上跳 ${J[1][1]} 层。墓图和命盘不生效。宝箱：装备、碎片、铸符，${LD.reward.exaltedFrom} 层起可能出溢彩。新段位首次送每种铸符各 ${LD.tiers.firstGlyphs} 张。`, 150, { size: 8, color: COL.dim, parent: c });
    if (!LD.run.mobDrops) TW(this, 12, 128 + desc.h + 2, '天梯里的怪物不掉落，只有通关宝箱。', 150, { size: 8, color: COL.emberHi, parent: c });
    // 各元素最好成绩
    rect(this, 166, 8, 1, h - 16, '#33293f', 1, c);
    T(this, 174, 10, '各元素最好', { size: 8, color: COL.emberHi, parent: c });
    const be = ladderBestByElem();
    ELEM.forEach((e, i) => { const r = be[e]; T(this, 174, 24 + i * 12, ELEM_N[e], { size: 8, color: ELEM_C[e], parent: c }); T(this, 204, 24 + i * 12, r ? `${r.lvl} 层 ${mmss(r.time)}` : '—', { size: 8, color: r ? COL.text : COL.faint, parent: c }); });
    // 最近记录：两列各 10 条
    rect(this, 262, 8, 1, h - 16, '#33293f', 1, c);
    T(this, 270, 10, `最近记录（共 ${L.records.length} 条）`, { size: 8, color: COL.emberHi, parent: c });
    const recs = L.records.slice(0, LD.records.show), half = Math.ceil(LD.records.show / 2);
    if (!recs.length) T(this, 270, 26, '通过一层后会记下用时和当时的配装', { size: 8, color: COL.faint, parent: c });
    recs.forEach((r, i) => {
      const x = 270 + Math.floor(i / half) * 96, y = 24 + (i % half) * 18;
      const wp = r.build.equip.find(q => q.slot === 'wl') || r.build.equip[0];
      const nm = q => q.u ? UNIQUE_BY[q.u].n : baseOf({ kind: q.slot === 'wl' || q.slot === 'wr' ? 'weapon' : q.slot, b: q.b }).n;
      const tc = LADDER_TIERS[ladderTier(r.lvl)];
      T(this, x, y, `${r.lvl} 层 · ${mmss(r.time)} · +${r.jump}`, { size: 8, color: tc ? tc.c : COL.text, parent: c });
      T(this, x, y + 9, `${r.date.slice(5, 10)} ${ELEM_N[r.build.elem]} ${wp ? nm(wp) : ''}`, { size: 8, color: COL.faint, parent: c });
      const z = this.add.zone(x - 2, y - 1, 94, 18).setOrigin(0).setInteractive(); c.add(z);
      z.on('pointerover', () => showTip([{ t: `天梯 ${r.lvl} 层 · 用时 ${mmss(r.time)} · 跳 ${r.jump} 层`, c: COL.emberHi }, { t: new Date(r.date).toLocaleString('zh-CN'), s: 8, c: COL.dim },
        { t: `秒伤 ${fmt(r.build.dps)} · 生命 ${fmt(r.build.life || 0)} · 护盾 ${fmt(r.build.shield ?? r.build.deflect ?? 0)} · 护甲 ${fmt(r.build.armor)} · ${ELEM_N[r.build.elem]}`, s: 8 },
        ...r.build.equip.map(q => ({ t: `${SLOTS.find(s => s.id === q.slot).n}：${nm(q)} · ${RAR[q.rar].n} · ${QN[q.q]}`, s: 8, c: RCOL[q.rar] })),
        { t: r.build.keys.length ? '核心天赋：' + r.build.keys.map(k => TREE.nodes[k].n).join('、') : '没有核心天赋', s: 8, c: '#ff9a3c' }]));
      z.on('pointerout', hideTip);
    });
  }
  /* 手册 */
  win_help(c) {
    const pages = [
      ['操作', '亡魂跟着鼠标移动，两只手上的武器会自动攻击射程内最近的敌人。空格、Shift 或右键冲刺：冲刺时无敌，遁靴还会在冲刺时触发效果。回车开始任务，数字键 1–7 打开窗口；每升一级得 1 个天赋点。'],
      ['伤害', '伤害先算固定附加（武器底材和“附加 X–Y 伤害”），再乘“提高”（同类全部相加后乘一次），最后乘“总增”（每一条单独连乘）。武器上的词条只作用于那把武器。'],
      ['元素', '物理：碎骨，在周围炸开。火焰：余震，按比例再命中几次，并累积灼烧。闪电：感电，叠层降低全部抗性。圣光：致盲，3 秒内敌人伤害降低。瘟疫：疫病，4 秒内造成命中伤害的一部分，可叠加。'],
      ['符文', '武器、头冠和遁靴有符文槽。符文只在满足条件的装备上生效，例如穿刺符文要武器能穿透。法阵的升级槽里的符文会随击杀获得经验并升级（最高 20 级），力场符文只在法阵里生效。'],
      ['铁砧', `铁砧用词条碎片改装备。加词条：有空位时花 1 个该词条的碎片，从比物品等级允许的最高档低几档的地方开始。升一档：花 1 个该词条的碎片。每次都会扣“锻造潜力”，扣到 0 就不能再改了。最高两档（溢彩）做不出来，只从天梯宝箱里出。拆解装备、打怪都能得到碎片。洗数值和移除要用铸符，铸符主要从天梯宝箱里出。稀有度跟着词条数变：1–2 条罕见，3–4 条稀有。`],
      ['墓图', '墓图从怪物和 Boss 身上掉落。放上墓图台后，下一次任务会消耗它：怪物等级加上墓图的阶级，词条让任务更难，同时提高物品数量。命盘只加掉落、经验和怪物等级，每解锁一层难度、每完成两张墓图得 1 点。四个 Boss 轮流出现，各击败 1、5、15 次后得到永久祝福。'],
      ['天梯', `通关第 ${PROG.unlocks.ladder.depth} 层后开放。天梯的怪物等级等于层数，怪更多、精英更多，墓图和命盘不生效。打满进度后守关 Boss 出现，限时内击败它就通过，剩的时间越多跳的层越多。通过后开宝箱，并记下用时和配装。死亡或超时没有损失。可以随时手动接管。`],
      ['灯火', `推关是一趟往下走：从最深层往回退 ${SOUL.startBack} 层出发（锁层时从锁定的层出发），每层打满进度、打掉守关 Boss 后直接进入下一层。灯火（护甲条下的紫色细条）进入时是满的，每秒燃烧，越深烧得越快；推关中不会自然回复，只靠击杀补（Boss 补得最多）。灯火烧完就平安返回，这一趟捡到的全部带走；最深层附近的某一层打得太险（最低血量低于 ${SOUL.returnHp}%），打完那层的 Boss 也会自动撤回；最深层附近护甲一旦跌到 ${SOUL.returnHpNow}% 以下，会立刻紧急撤回，同样全部带走；阵亡的话，捡到的装备、符文、词条碎片每件有 ${SOUL.deathKeep}% 几率保住。旋风斩等流派技能也从同一条里扣。天梯里不燃烧。`],
      ['营地', `营地是主页：一趟结束后回到这里。点地窖入口出发（可以选层、锁层），点储物箱、天赋石像、符文台、墓图台打开对应的窗口；铁砧和分解祭坛在通关第 ${PROG.unlocks.craft.depth} 层后清出来，天梯石碑在通关第 ${PROG.unlocks.ladder.depth} 层后清出来，天梯从石碑出发。自动刷时在营地停留 ${CAMP.idleStay} 秒再出发。分解祭坛：每次回营地，按规则把带回的装备拆成词条碎片（默认分解普通、罕见，保留稀有；物品等级低于 最深层 − ${CAMP.salvageIlvlBack} 的全部分解；带收藏词条的留下）。独特、传奇、溢彩装备和印记永远不自动分解。`],
      ['防御', '护甲就是生命。灵障先吸收伤害，2 秒没受伤就开始回复。抗性按百分比减伤，有上限。闪避直接躲开一次攻击。'],
      ['存档', '毕业存档：旋风斩成型，100 级，最深层开满，天梯打到 70 层左右；两把回旋骨刃插旋身符文，头冠是风暴之眼，旋风之心已点。游雷毕业存档：100 级，两把雷灵插 20 级游雷符文，每串 18 颗游雷，头冠是雷冠，织雷之心已点，天梯 63 层。载入前会把你现在的进度备份一份，之后可以一键恢复（只备份第一次载入前的进度）。正在打的一趟会作废。'],
    ];
    pages.forEach(([n], i) => mkBtn(this, c, 10, 8 + i * 18, 70, 16, n, () => { helpTopic = i; this.refresh(); }, { size: 8, style: helpTopic === i ? 's' : 'n' }));
    const [n, txt] = pages[helpTopic];
    T(this, 92, 10, n, { color: COL.emberHi, parent: c });
    TW(this, 92, 28, txt, 360, { size: 12, color: COL.text, parent: c });
    if (n === '存档') {
      mkBtn(this, c, 92, 130, 150, 22, confirmKey === 'demo' ? '确认载入' : '载入旋风斩毕业存档', () => { if (!confirm2('demo')) return this.refresh(); loadDemo('whirl'); toast('已载入旋风斩毕业存档', COL.emberHi); }, { size: 8, style: confirmKey === 'demo' ? 'r' : 'w', icon: 'mod_Whirl', iconX: 5, labelX: 22 });
      mkBtn(this, c, 92, 156, 150, 22, confirmKey === 'demoSpark' ? '确认载入' : '载入游雷毕业存档', () => { if (!confirm2('demoSpark')) return this.refresh(); loadDemo('spark'); toast('已载入游雷毕业存档', COL.emberHi); }, { size: 8, style: confirmKey === 'demoSpark' ? 'r' : 'w', icon: 'mod_Spark', iconX: 5, labelX: 22 });
      mkBtn(this, c, 92, 182, 150, 22, confirmKey === 'demoNova' ? '确认载入' : '载入霜环毕业存档', () => { if (!confirm2('demoNova')) return this.refresh(); loadDemo('nova'); toast('已载入霜环毕业存档', COL.emberHi); }, { size: 8, style: confirmKey === 'demoNova' ? 'r' : 'w', icon: 'mod_FrostNova', iconX: 5, labelX: 22 });
      mkBtn(this, c, 250, 182, 150, 22, confirmKey === 'demoOrb' ? '确认载入' : '载入寒魄球毕业存档', () => { if (!confirm2('demoOrb')) return this.refresh(); loadDemo('orb'); toast('已载入寒魄球毕业存档', COL.emberHi); }, { icon: 'mod_FrostOrbRune' });
      mkBtn(this, c, 250, 156, 150, 22, confirmKey === 'demoMeteor' ? '确认载入' : '载入陨火毕业存档', () => { if (!confirm2('demoMeteor')) return this.refresh(); loadDemo('meteor'); toast('已载入陨火毕业存档', COL.emberHi); }, { icon: 'mod_Meteor' });
      mkBtn(this, c, 250, 130, 150, 22, confirmKey === 'restore' ? '确认恢复' : '恢复之前的进度', () => { if (!confirm2('restore')) return this.refresh(); restoreBackup(); toast('已恢复之前的进度', COL.emberHi); }, { size: 8, style: confirmKey === 'restore' ? 'r' : 'n', disabled: !hasBackup() });
    }
    T(this, 92, 186, '系统与数值参考 Astroloot 复刻；画面、名字和文字为原创。', { size: 8, color: COL.faint, parent: c });
  }
  /* 结算 */
  // 一趟结算：绶带标题，一排带图标的数，凹槽里的装备，拿到的符文和铸符只放图标
  win_summary(c, w, h) {
    const r = this.winArg; if (!r) return;
    const lad = r.mode === 'ladder', lamp = r.result === 'lampout', back = r.result === 'retreat', emg = r.result === 'emergency';
    const win = r.result === 'win' || (!lad && (lamp || back || emg)); // 推关：灯火燃尽、撤回、紧急撤回都是平安返回
    const title = lad ? (win ? `天梯 ${r.L} 层通过` : r.result === 'timeout' ? '时间到' : '阵亡') : lamp ? '灯火燃尽 · 平安返回' : back ? '险胜 · 撤回' : emg ? '紧急撤回' : win ? '抵达最深处' : '阵亡';
    const pw = textW(title) + 52; c.add(this.add.nineslice(Math.round((w - pw) / 2), -10, 'ribbon', null, pw, 22, 14, 14, 0, 0).setOrigin(0)); T(this, w / 2, -5, title, { color: win ? COL.emberHi : COL.bad, align: 'center', parent: c });
    const g = r.gain;
    const note = lad && win && r.lad.tierUp.length ? [`晋升${LADDER_TIERS[r.lad.tierUp[r.lad.tierUp.length - 1]].n}：送每种铸符各 ${LD.tiers.firstGlyphs} 张`, COL.emberHi]
      : g.boon ? [`${BOSS_BY[g.boon.b].n}的祝福：${BOONS[g.boon.b][g.boon.i].n}（${treeText(...Object.entries(BOONS[g.boon.b][g.boon.i].add)[0])}）`, COL.emberHi]
      : emg ? [`护甲跌到 ${SOUL.returnHpNow}% 以下，带着全部东西撤回`, COL.emberHi]
      : back ? [`最后一层最低血量 ${Math.round(r.descent.minHp * 100)}%，打完守关 Boss 撤回，东西全部带走`, COL.emberHi]
      : lad ? [win ? `跳 ${r.lad.jump} 层，已解锁到第 ${S.ladder.unlocked} 层` : '天梯失败没有损失', COL.dim]
      : r.descent.floors ? [`打通到第 ${r.descent.from + r.descent.floors - 1} 层 · 最深纪录第 ${S.maxDepth - 1} 层`, COL.good] : null;
    if (note) T(this, w / 2, 16, note[0], { size: 8, color: note[1], align: 'center', parent: c });
    const floors = lad ? `${r.L}` : r.descent.from === r.base ? `${r.base}` : `${r.descent.from}–${r.base}`;
    const cols = [['i_ladder', floors, r.map ? `墓图 ${r.map.tier} 阶` : '层'], ['skull', String(r.kills), '击杀'], ['torch', mmss(r.t), '用时'], ['i_star', '+' + fmt(g.xp), g.lv ? `升 ${g.lv} 级` : '经验'], ['shard', '+' + (g.shards + (r.salv ? r.salv.shards : 0)), r.salv && r.salv.n ? `分解 ${r.salv.n} 件` : '碎片']];
    cols.forEach(([ic, v, l], i) => { const cx = Math.round(w / 2 + (i - 2) * 66), s2 = this.textures.get(ic).getSourceImage(); img(this, cx - Math.round(s2.width / 2), 38 - Math.round(s2.height / 2), ic, c); T(this, cx, 48, v, { align: 'center', color: i === 3 ? COL.xp : COL.text, parent: c }); T(this, cx, 62, l, { size: 8, color: COL.dim, align: 'center', parent: c }); });
    const kept = g.items.filter(it => S.stash.includes(it) || Object.values(S.equip).includes(it) || Object.values(S.chips).includes(it));
    const best = [...kept].sort((a, b) => b.rar - a.rar || b.q - a.q).slice(0, 15), x0 = Math.round(w / 2 - best.length * 21 / 2);
    best.forEach((it, i) => mkCell(this, c, x0 + i * 21, 80, it, { size: 20, upg: true }));
    if (!best.length) T(this, w / 2, 86, '没有留下装备', { size: 8, color: COL.faint, align: 'center', parent: c });
    else if (kept.length > best.length) T(this, x0 + best.length * 21 + 2, 86, `+${kept.length - best.length}`, { size: 8, color: COL.dim, parent: c });
    // 符文、铸符、墓图：只放图标
    const extra = [...g.mods.map(m => ['mod_' + m.mid, '']), ...Object.entries(g.glyphs).map(([k, n]) => ['glyph_' + k, '×' + n]), ...(g.maps.length ? [['i_a_map', '×' + g.maps.length]] : [])];
    let ex = Math.round(w / 2 - extra.reduce((a, [ic, t]) => a + this.textures.get(ic).getSourceImage().width + textW(t, 8) + 6, 0) / 2);
    for (const [ic, t] of extra) { const s2 = this.textures.get(ic).getSourceImage(); img(this, ex, 112 - Math.round(s2.height / 2), ic, c); ex += s2.width + 1; if (t) { T(this, ex, 107, t, { size: 8, parent: c }); ex += textW(t, 8); } ex += 5; }
    if (!lad && r.lost) TW(this, 16, 126, `阵亡：捡到的东西每件 ${SOUL.deathKeep}% 几率保住，这次丢了装备 ${r.lost.items} 件、符文 ${r.lost.mods} 个、碎片 ${r.lost.shards} 个。`, w - 32, { size: 8, color: COL.bad, parent: c });
    else if (!win) TW(this, 16, 126, '失败不会丢掉已经捡起的东西。地上没捡的会消失。', w - 32, { size: 8, color: COL.faint, parent: c });
    mkBtn(this, c, w / 2 - 128, h - 32, 72, 22, '装备', () => { this.closeWin(); this.openWin('gear'); }, { size: 8, icon: 'i_w_crossbow', iconX: 6, labelX: 26 });
    mkBtn(this, c, w / 2 - 52, h - 32, 72, 22, '铁砧', () => { this.closeWin(); this.openWin('craft'); }, { size: 8, icon: 'i_anvil', iconX: 6, labelX: 26, disabled: !unlocked('craft') });
    mkBtn(this, c, w / 2 + 24, h - 32, 104, 22, lad ? '再打天梯' : `再下行 · ${descentStart()} 层`, () => { this.closeWin(); if (lad) ladderChallenge(S.ladder.unlocked); else startRun(); }, { size: 8, style: 'w', icon: 'torch', iconX: 6, labelX: 18 });
  }
  /* --- 营地 --- */
  // 每个设施一个点击区和名字；没解锁的点了只提示
  buildCamp() {
    const c = this.add.container(0, 0).setDepth(8); this.campC = c; this.campG = this.add.graphics(); c.add(this.campG);
    this.facs = CAMP.facilities.map(f => {
      const mi = MENU.findIndex(m => m.id === f.win), cw = mi >= 0 ? 11 : 0, lw = textW(f.n, 8);
      const lab = T(this, f.x - cw / 2, f.y + 4, f.id === 'gate' ? '' : f.n, { size: 8, color: COL.dim, align: 'center', parent: c });
      if (mi >= 0) { const kx = Math.round(f.x - cw / 2 + lw / 2 + 2); c.add(nine(this, kx, f.y + 4, 9, 10, 'f_btn_w', 3)); T(this, kx + 5, f.y + 5, String(mi + 1), { size: 'num', color: '#2a1306', align: 'center', shadow: false, parent: c }); } // 快捷键小铜牌
      if (f.id === 'gate') this.goBtn = mkBtn(this, c, f.x - 40, f.y + 2, 80, 15, '', () => { if (RUN || this.winId) return; ac(); startRun(); }, { style: 'w', size: 8, icon: 'torch', iconX: 4, labelX: 14, tip: () => [{ t: '下行', c: COL.emberHi }, { t: `从第 ${descentStart()} 层出发，一直往下走到灯火燃尽。点入口本身可以选层。`, s: 8 }] });
      const z = this.add.zone(f.x - f.r, f.y - f.r * 1.6, f.r * 2, f.r * 1.6 + 6).setOrigin(0).setInteractive(); c.add(z);
      const o = { f, lab, hover: false };
      z.on('pointerover', () => { o.hover = true; showTip(facOpen(f) ? [{ t: f.n, c: COL.emberHi }, { t: FAC_TIP[f.id](), s: 8 }] : [{ t: '被碎石堵住了', c: COL.dim }, { t: `${f.n}：${unlockText(f.unlock)}`, s: 8, c: COL.faint }]); });
      z.on('pointerout', () => { o.hover = false; hideTip(); });
      z.on('pointerup', () => { if (this.winId || RUN) return; if (!facOpen(f)) { toast(`${f.n}：${unlockText(f.unlock)}`); return; } sfx('click'); this.openWin(f.win); });
      return o;
    });
  }
  updateCamp() {
    if (!this.campC) this.buildCamp();
    const show = !RUN && !this.winId; this.campC.setVisible(show);
    if (RUN) return;
    // 新清出来的设施：提示一次，亮几秒
    S.campSeen ??= CAMP.facilities.filter(facOpen).map(f => f.id);
    for (const o of this.facs) if (facOpen(o.f) && !S.campSeen.includes(o.f.id)) { S.campSeen.push(o.f.id); o.flashT = G.time + 4; toast(`营地里清出了${o.f.n}`, COL.emberHi); save(); }
    if (!show) return;
    const gl = `下行 · 第 ${descentStart()} 层`; if (this.goBtn.lab.text !== gl) this.goBtn.setLabel(gl);
    const g = this.campG; g.clear();
    for (const o of this.facs) {
      const op = facOpen(o.f), col = o.hover ? COL.emberHi : op ? COL.text : COL.faint;
      if (o.lab.tintTopLeft !== hex(col)) o.lab.setTint(hex(col));
      if (op && o.flashT > G.time) { const k = (o.flashT - G.time) / 4, r = o.f.r * (1.4 - 0.4 * ((G.time * 1.5) % 1)); g.fillStyle(0xffd36a, 0.7 * k); for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; g.fillRect(Math.round(o.f.x + Math.cos(a) * r), Math.round(o.f.y - 8 + Math.sin(a) * r * 0.55), 1, 1); } }
    }
  }
  // 一趟结束：角色从地窖入口走出来；不在自动循环时打开结算
  backToCamp(r) {
    const gt = FAC_BY[r.mode === 'ladder' ? 'stele' : 'gate']; player.x = gt.x; player.y = gt.y + 8; AUTO.camp = null;
    if (!S.auto.loop && !LAD.pending) this.openWin('summary', r);
  }
  /* 地窖入口：选层、锁层、出发 */
  win_depart(c, w, h) {
    const m = armedMap();
    T(this, w / 2, 14, `下一趟从第 ${descentStart()} 层出发`, { align: 'center', color: COL.emberHi, parent: c });
    T(this, w / 2, 30, `最深纪录：第 ${S.maxDepth - 1} 层通关 · ${S.auto.lock ? '锁层：从选定的层出发' : `从最深层往回退 ${SOUL.startBack} 层热身`}`, { size: 8, color: COL.dim, align: 'center', parent: c });
    mkBtn(this, c, w / 2 - 62, 46, 18, 16, '<', () => { if (S.depth > 1) { S.depth--; S.auto.lock = true; save(); } this.refresh(); }, { size: 8, disabled: S.depth <= 1 });
    T(this, w / 2, 50, `难度 ${S.depth}`, { align: 'center', parent: c });
    mkBtn(this, c, w / 2 + 44, 46, 18, 16, '>', () => { if (S.depth < S.maxDepth) { S.depth++; S.auto.lock = S.depth < S.maxDepth; save(); } this.refresh(); }, { size: 8, disabled: S.depth >= S.maxDepth });
    mkBtn(this, c, w / 2 - 62, 68, 124, 16, S.auto.lock ? '锁层：开（点击改为推层）' : '推层：开（点击改为锁层）', () => { S.auto.lock = !S.auto.lock; if (!S.auto.lock) S.depth = S.maxDepth; save(); this.refresh(); }, { size: 8 });
    if (m) T(this, w / 2, 90, `会用掉墓图台上的${mapName(m)}（怪物等级 +${m.tier}）`, { size: 8, color: RCOL[m.rar], align: 'center', parent: c });
    else if (unlocked('ladder')) T(this, w / 2, 90, '天梯从右边的天梯石碑出发', { size: 8, color: COL.faint, align: 'center', parent: c });
    mkBtn(this, c, w / 2 - 110, h - 28, 104, 20, '出发', () => { this.closeWin(); startRun(); }, { size: 8, style: 'w' });
    mkBtn(this, c, w / 2 + 6, h - 28, 104, 20, S.auto.loop ? '停止自动刷' : '自动刷  [回车]', () => { this.closeWin(); this.toggleLoop(); }, { size: 8, tip: [{ t: '一趟接一趟自动打，每趟回营地后停留几秒再出发。', s: 8 }] });
  }
  /* 分解祭坛：自动分解的规则 */
  win_salvage(c, w, h) {
    const R = salvRules(), fav = salvFav(), back = S.maxDepth - CAMP.salvageIlvlBack;
    const tog = (y, on, label, fn, tip) => { const b = mkBtn(this, c, 10, y, 160, 14, label, () => { fn(); save(); this.refresh(); }, { size: 8, labelX: 18, tip }); rect(this, 5, 4, 7, 7, '#120c18', 1, b); if (on) rect(this, 6, 5, 5, 5, COL.ember, 1, b); return b; };
    T(this, 10, 12, '回营地时自动分解带回的装备', { size: 8, color: COL.emberHi, parent: c });
    tog(26, R.on, '自动分解', () => { R.on = !R.on; }, [{ t: '关掉后带回的装备都留着，可以在铁砧手动拆解。', s: 8 }]);
    ['普通', '罕见', '稀有'].forEach((n, i) => tog(44 + i * 16, R.rar[i], `${n}装备`, () => { R.rar[i] = !R.rar[i]; }, [{ t: `分解${n}装备（带收藏词条的留下）`, s: 8 }]));
    tog(94, R.old, `旧装备（物品等级 < ${Math.max(1, back)}）`, () => { R.old = !R.old; }, [{ t: `物品等级低于 最深层 − ${CAMP.salvageIlvlBack} 的装备全部分解，不看稀有度和收藏词条。`, s: 8 }]);
    TW(this, 10, 114, '独特、传奇、溢彩装备和印记、符文、墓图永远不会被自动分解；身上穿着的也不会。', 160, { size: 8, color: COL.faint, parent: c });
    const n = S.stash.filter(salvWhy).length;
    mkBtn(this, c, 10, h - 30, 160, 20, confirmKey === 'salvNow' ? `确认分解 ${n} 件` : `现在分解背包（${n} 件）`, () => { if (!confirm2('salvNow')) return this.refresh(); const g = autoSalvage([...S.stash]); toast(`分解 ${g.n} 件，得到碎片 ${g.shards} 个`, '#d9cfb8'); save(); this.refresh(); }, { size: 8, style: confirmKey === 'salvNow' ? 'r' : 'w', disabled: !n });
    // 收藏词条：带这些词条族的装备不按稀有度分解
    rect(this, 180, 10, 1, h - 20, '#33293f', 1, c);
    const list = AFF.filter(a => !a.tk).sort((a, b) => (fav.includes(b.k) - fav.includes(a.k)) || (affName(a) < affName(b) ? -1 : 1));
    const per = 36, pages = Math.ceil(list.length / per); this.salvPage = Math.min(this.salvPage || 0, pages - 1);
    T(this, 190, 12, `收藏词条 ${fav.length} 个${R.fav ? '' : '（默认：主武器流派的做装词条）'}`, { size: 8, color: COL.emberHi, parent: c });
    if (pages > 1) { mkBtn(this, c, w - 66, 9, 17, 13, '<', () => { this.salvPage = (this.salvPage + pages - 1) % pages; this.refresh(); }, { size: 8 }); mkBtn(this, c, w - 46, 9, 17, 13, '>', () => { this.salvPage = (this.salvPage + 1) % pages; this.refresh(); }, { size: 8 }); }
    list.slice(this.salvPage * per, this.salvPage * per + per).forEach((a, i) => {
      const on = fav.includes(a.k), b = mkBtn(this, c, 190 + (i % 3) * 92, 28 + (i / 3 | 0) * 13, 90, 12, affName(a), () => { R.fav = on ? fav.filter(k => k !== a.k) : [...fav, a.k]; save(); this.refresh(); }, { size: 8, labelX: 13, color: on ? COL.emberHi : COL.text, tip: [{ t: affName(a), c: COL.emberHi }, { t: on ? '已收藏：带这条词条的装备留下（点击取消）' : '点击收藏', s: 8 }] });
      rect(this, 3, 3, 6, 6, '#120c18', 1, b); if (on) rect(this, 4, 4, 4, 4, COL.ember, 1, b);
    });
    if (R.fav) mkBtn(this, c, w - 98, h - 22, 88, 14, '恢复默认收藏', () => { R.fav = null; save(); this.refresh(); }, { size: 8 });
  }
  update() {
    this.updateHud(); this.updateCamp();
    if (this.tipC) this.placeTip();
    const mode = RUN && !this.winId && mouse.y > TOP_H && mouse.y < BOT_Y ? 'cross' : 'arrow';
    if (mode !== this.curMode) { this.curMode = mode; this.game.canvas.style.cursor = this.curCss[mode]; }
    this.titleC.setVisible(!RUN && !this.winId && S.stats.missions === 0);
    if (this.titleC.visible) this.pressT.setAlpha((G.time * 2 | 0) % 2 ? 0.55 : 1);
    this.feedC.list.forEach(t => { const age = G.time - t.feed.t; t.setAlpha(age > 8 ? Math.max(0, 1 - (age - 8) / 2) : 1); });
    this.feedC.setVisible(!this.winId);
  }
}
function sortStash() { S.stash.sort((a, b) => (a.kind > b.kind ? 1 : a.kind < b.kind ? -1 : 0) || b.rar - a.rar || b.q - a.q || b.ilvl - a.ilvl); S.stash.forEach(x => x.isNew = false); save(); }
