/* 图鉴数据导出：打开构建好的手机包，把游戏数据整理成 18 张表写进 data.json（图鉴页面 tools/codex/index.html 读它）。
   用法：node tools/codex/extract.js <game 目录> <输出 data.json> [基准结果 json，默认 tools/codex/bench.json]；一般用 tools/publish.sh codex */
const { loadPw } = require('../lib/page'), pw = loadPw(), fs = require('fs'), path = require('path'), os = require('os');
const GAME = process.argv[2], OUT = process.argv[3], BENCH_F = process.argv[4] || path.join(__dirname, 'bench.json');
(async () => {
  const b = await pw.chromium.launch({ args: ['--use-gl=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.route('**/phaser.min.js', r => r.fulfill({ body: fs.readFileSync(path.join(GAME, 'tools/vendor/phaser.min.js')), contentType: 'application/javascript' }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const tmp = path.join(os.tmpdir(), 'ashen-extract.html'); fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body>${fs.readFileSync(path.join(GAME, 'ashen-crypt-mobile.html'), 'utf8')}</body></html>`);
  const BENCH = fs.existsSync(BENCH_F) ? Object.fromEntries(JSON.parse(fs.readFileSync(BENCH_F, 'utf8')).map(r => [r.id, r])) : {};
  await p.addInitScript(b => { window.__BENCH = b; }, BENCH);
  await p.goto('file://' + tmp); await p.waitForFunction(() => window.__ash && window.__ash.G.ui, null, { timeout: 20000 });
  const data = await p.evaluate(() => {
    const A = window.__ash, T = {}, safe = f => { try { return f(); } catch (e) { return ''; } };
    const rng = v => Array.isArray(v) ? (v.length > 1 && v[0] !== v[1] ? `${v[0]}–${v[1]}` : String(v[0])) : String(v);
    const KIND = { weapon: '主手', off: '副手', shield: '盾牌（副手格）', core: '头冠', engine: '遁靴', hub: '法阵（副手格）', hands: '护手', chest: '胸甲', shoulders: '肩甲', ring: '戒指', amulet: '项链' };
    const tagN = t => (TAG_N[t] || t);
    // 品质
    const GL = GENS.list, gEnd = i => i + 1 < GL.length ? GL[i + 1].from - 1 : GENS.topLvl;
    T.quality = { name: '底材代数', cols: ['代', '名字前缀', '物品等级', '底材档位（旧品质 0–10）', '隐性', '第二隐性'], key: 0, rows: GL.map((g, i) => [GEN_N[i], g.n || '（原名）', `${g.from}–${gEnd(i)}`, `${g.q[0]} → ${g.q[1]}`, i >= 1 ? '×' + GENS.impMul : '×1', i >= 2 ? Object.entries(G2.gen3).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${({ melee: '近战', bow: '弓弩', gun: '枪', caster: '法器' })[k] || KIND[k] || k}：${v[2].replace('#', v[1])}`).join('；') : '—']) };
    // 武器
    T.weapons = { name: '武器', cols: ['id', '名称', '类别', '对口标签', '元素', '攻速', '暴击%', '触发系数', '伤害系数', '每秒系数（伤害系数×攻速）', '需求等级', '隐性', ...GL.map((g, i) => `${GEN_N[i]}每一下伤害（${g.from}→${gEnd(i)} 级）`), '标签'], key: 0,
      rows: Object.entries(WEAPONS).filter(([k]) => G2W[k]).map(([k, w]) => { const g = G2W[k] || {}, cat = GEMC.cats[w.cat || g.cat] || {}, pw = wPow(k);
        return [k, w.n, cat.n || g.cat || '', (cat.tags || []).map(tagN).join('、'), ELEM_N[g.el] || g.el, g.aps, w.crit ?? g.crit, g.pc ?? '', pw, +(pw * g.aps).toFixed(2), w.req || 1, g.t ? g.t.replace('#', g.imp ? rng([g.imp[1], g.imp[2]]) : '#') : '', ...GL.map((g, i) => { const f = L => { const q = genQ(L); return `${Math.round(qv(GEMC.hit.min, q) * pw)}–${Math.round(qv(GEMC.hit.max, q) * pw)}`; }; return `${f(g.from)} → ${f(gEnd(i))}`; }), (w.tags || []).filter(t => t !== 'Weapon').map(tagN).join('、')]; }) };
    // 防具 / 副手底材
    const arm = []; for (const kind in ARMORS) { if (!KIND[kind] || kind === 'weapon') continue; for (const [k, a] of Object.entries(ARMORS[kind])) { if (a.retired) continue; const g = (G2.off && G2.off[k]) || {}; const st = Object.entries(a).filter(([kk, v]) => typeof v === 'number' && !['w', 'req'].includes(kk)).map(([kk, v]) => `${kk} ${v}`).join('，'); arm.push([k, KIND[kind], a.n, a.req || 1, a.w ?? '', a.d || (g.t ? g.t.replace('#', g.imp ? rng([g.imp[1], g.imp[2]]) : '#') : ''), st, (a.tags || []).map(tagN).join('、')]); } }
    T.bases = { name: '防具与副手底材', cols: ['id', '部位', '名称', '需求等级', '掉落权重', '隐性', '数值', '标签'], key: 0, rows: arm };
    // 词条
    T.affixes = { name: '装备词条', cols: ['id', '说明', '部位', '前后缀', '标签限制', '档数', '各档数值', '各档权重', '各档最低物品等级', '分组'], key: 0,
      rows: AFF.filter(a => !a.off).map(a => [a.k, safe(() => a.pair ? a.f(['#', '#']) : a.f('#')), (a.on || []).map(o => KIND[o] || o).join('、'), a.type === 'P' ? '前缀' : a.type === 'S' ? '后缀' : a.type || '', a.tag ? tagN(a.tag) : '', a.tiers.length, a.tiers.map(t => rng(t[0])).join(' | '), a.tiers.map(t => t[1]).join(' | '), a.tiers.map(t => t[2]).join(' | '), a.grp || ''] ) };
    // 独特
    const uRow = u => { const lo = { u: u.id, uv: u.rules.map(([, a]) => a) }, hi = { u: u.id, uv: u.rules.map(([, a, c]) => c ?? a) }; const L = safe(() => ruleLines(lo)) || [], H = safe(() => ruleLines(hi)) || []; return L.map((t, i) => t === H[i] ? t : `${t} → ${H[i]}`).join('\n'); };
    T.legendary = { name: '传奇词条', cols: ['id', '名称', '部位', '需求等级', '规则（最低 → 最高）', '只对标签生效'], key: 0, rows: LEGA.map(u => [u.id, u.n + '之力', KIND[u.kind] || u.kind, u.req, uRow(u), u.when ? tagN(u.when) : '']) };
    T.uniques = { name: '神话装备', cols: ['id', '名称', '部位', '底材', '需求等级', '掉落权重', '深层开放', '规则（最低 → 最高）', '固定词条', '只对标签生效'], key: 0,
      rows: UNIQUES.map(u => { const lo = { u: u.id, uv: u.rules.map(([, a]) => a) }, hi = { u: u.id, uv: u.rules.map(([, a, c]) => c ?? a) }; const L = safe(() => ruleLines(lo)) || [], H = safe(() => ruleLines(hi)) || [];
        const base = u.kind === 'weapon' ? (WEAPONS[u.b] || {}).n : ((ARMORS[u.kind] || {})[u.b] || {}).n;
        return [u.id, u.n, KIND[u.kind] || u.kind, base || u.b, u.req, u.w || '只从 Boss 掉', u.ladderOnly ? `${u.ladderOnly} 层起` : '', L.map((t, i) => t === H[i] ? t : `${t} → ${H[i]}`).join('\n'), (u.fixed || []).map(([k]) => { const a = AFF_BY[k]; return a ? safe(() => a.f('…')) : k; }).join('、'), u.when ? tagN(u.when) : '']; }) };
    // 技能石
    const ROLE = { aoe: '清怪', mix: '均衡', single: '单体' }, ST = { dive: '冲进怪堆', hold: '站桩保持距离', kite: '风筝' }, AIM = { near: '最近的', dense: '最密处', line: '一条线上最多', arc: '扇形里最多' };
    const BEN = window.__BENCH || {};
    const play = g => { const B = g.base || {}; if (!B.form) return ['', ''];
      const F = (B.form === 'proj' && B.pellets > 1 && AU.form.shotgun) || AU.form[B.form] || AU.form.proj;
      const keep = F.stance === 'hold' ? `（${Math.round(Math.min(F.keepPx || 1e9, (B.range || 160) * UNIT * (g.rngMul || 1) * (F.keep || 1)))} 像素）` : '';
      const aim = B.form === 'proj' && !(B.pellets > 1) ? (B.pierce ? F.pierce : B.split ? F.split : B.aoe ? F.aoe : F.aim) : F.aim || 'near';
      return [(ST[F.stance] || F.stance) + keep, AIM[aim] || aim]; };
    const beh = B => [B.pierce >= 99 ? '穿透所有' : B.pierce ? '穿透 ' + B.pierce : '', B.chain ? '弹射 ' + B.chain : '', B.split ? '分裂 ' + B.split : '', B.extra ? '额外 ' + B.extra : '', B.pellets > 1 ? '弹丸 ' + B.pellets : ''].filter(Boolean).join('，');
    T.gems = { name: '技能石', cols: ['id', '名称', '形态', '定位', '伤害效用', '自动战斗站位', '瞄准', '射程', '范围', '打中后', '57 层击杀', '怪群秒伤', '单体秒伤', '倍率(1→20 级)', '需求等级', '掉落权重', '灯火消耗', '形态符文 1 级', '形态符文 20 级', '标签'], key: 0,
      rows: GEMS.map(g => { const C = (typeof TSK !== 'undefined' && TSK[g.id]) || {}; const fr = g.fr && MOD_BY[g.fr], B = g.base || {}, bn = BEN[g.id] || {}, [st, aim] = play(g);
        const FN = { orbit: '环绕', proj: '投射物', meteor: '坠落', nova: '新星', cone: '喷射', beam: '光束', aura: '光环', mine: '陷阱', stab: '地刺', cleave: '劈斩', orb: '法球', ram: '冲撞', shieldThrow: '掷盾' };
        return [g.id, g.n, g.util ? '功能' : FN[g.form] || g.form || '', ROLE[B.role] || (g.util ? '功能' : '其他'), B.eff != null ? Math.round(B.eff * 100) + '%' + (B.cont || B.aura ? '（每秒）' : '') : '', st, aim,
          B.range ? Math.round(B.range * UNIT * (g.rngMul || 1)) : '', B.aoe ? Math.round(B.aoe * UNIT) : '', beh(B),
          bn.kills != null ? Math.round(bn.kills) : '', bn.pack != null ? Math.round(bn.pack) : '', bn.single != null ? Math.round(bn.single) : '',
          rng(g.mul || []), g.req, g.w, C.cost ? rng(C.cost) : '', fr ? safe(() => fr.d(fr.fx(1))) : '', fr ? safe(() => fr.d(fr.fx(20))) : '', (g.tags || []).map(tagN).join('、')]; }) };
    // 套装（gear-v3）
    if (typeof SETS !== 'undefined') T.sets = { name: '套装', cols: ['id', '名称', '服务技能', '部位', '2 件', '4 件', '6 件'], key: 0,
      rows: SETS.map(s => [s.id, s.n, s.skills.map(g => (GEM_BY[g] || {}).n || g).join('、'), SET_KINDS.map(k => `${KIND[k] || k}：${s.pieces[k][0]}`).join('\n'), s.bonus[2].t, s.bonus[4].t, s.bonus[6].t]) };
    // 辅助石
    T.supports = { name: '辅助石（符文）', cols: ['id', '名称', '生效条件', '1 级', '20 级', '需求等级', '掉落权重', '力场'], key: 0,
      rows: MODS.filter(m => !m.retired).map(m => { const d = MOD_BY[m.id]; return [m.id, m.n, (RUNE_FIT[m.id] || []).map(c => c === 'weapon' ? '技能石 / 武器' : c.startsWith('tag:') ? '标签 ' + tagN(c.slice(4)) : c).join(' 且 '), safe(() => d.d(d.fx(1))), safe(() => d.d(d.fx(20))), m.req, m.w ?? '', m.field ? '是' : '']; }) };
    // 属性石
    T.stones = { name: '属性石', cols: ['id', '名称', '武器 / 副手（1 → 5 阶）', '护甲部位（1 → 5 阶）', '武器 4–5 阶额外'], key: 0,
      rows: Object.entries(STONES.list).map(([k, s]) => [k, s.n, s.w ? `${STAT_N2[s.w[0]] || s.w[0]} ${s.w[1]} → ${s.w[2]}` : '无效', s.a ? `${STAT_N2[s.a[0]] || s.a[0]} ${s.a[1]} → ${s.a[2]}` : '无效', s.wx ? `${STAT_N2[s.wx[0]] || s.wx[0]} ${s.wx[4]} / ${s.wx[5]}` : '']) };
    // 魂龛底子
    T.trigs = { name: '魂龛底子', cols: ['id', '名称', '类型', '方式', '容量', '说明', '掉落权重'], key: 0,
      rows: Object.entries(TCOND).map(([k, c]) => [k, c.n, c.kind === 'cast' ? '出手' : '响应', c.mode || '', c.cap ?? '', c.d || '', (TRG.condW || {})[k] ?? '']) };
    // 专精
    const ms = []; for (const M of MASTERY) { ms.push([M.id + ':bar', M.n, '专精条', '0–' + MST.barMax, '', mstLines(M.bar, 1).join('，') + '（每点）']);
      for (const q of M.pass) ms.push([q.id, M.n, '被动 · ' + q.n, `专精条 ${q.tier}`, '', `每级 ${mstLines(q.add, 1 / MST.passRef).join('，')}；3 级 ${mstLines(q.add, 1).join('，')}`]);
      for (const k of M.keys) ms.push([k.id, M.n, (k.elem ? '元素大天赋 · ' : '大天赋 · ') + k.n, `专精条 ${k.tier}`, k.need ? MPASS[k.need].n + ' 3 级' : '', k.d]); }
    T.mastery = { name: '专精', cols: ['id', '专精', '项目', '解锁', '前置', '效果'], key: 0, rows: ms };
    // 誓约
    T.oaths = { name: '誓约', cols: ['id', '部位', '正面', '负面'], key: 0, rows: OATH.list.map(o => [o.id, (o.on || []).map(s => KIND[s] || (SLOTS.find(x => x.id === s) || {}).n || s).join('、'), o.pos, o.neg]) };
    // 怪物 / Boss / 精英词缀
    T.monsters = { name: '怪物', cols: ['id', '名称', '元素', 'AI', '1 级血量', '1 级伤害', '出现层数', '权重', '抗性'], key: 0,
      rows: Object.entries(PROG.monsters).filter(([k, v]) => v && typeof v === 'object' && !k.startsWith('_')).map(([k, m]) => [k, m.n || k, ELEM_N[m.el] || m.el || '', m.ai || '', m.hp, m.dmg, m.minL || 1, m.w ?? '', m.res ? Object.entries(m.res).map(([e, v]) => (ELEM_N[e] || e) + ' ' + v).join('，') : '']) };
    T.bosses = { name: 'Boss', cols: ['id', '名称', '元素', '招式', '1 级血量', '1 级伤害'], key: 0, rows: BOSSES.map(x => [x.id, x.n, ELEM_N[x.el] || x.el, BOSS_PAT_N[x.pat] || x.pat, x.hp, x.dmg]) };
    T.elites = { name: '精英词缀', cols: ['id', '名称', '权重', '开放层数', '参数'], key: 0, rows: PROG.elite.affixes.map(a => [a.id, a.n, a.w, a.from, JSON.stringify(a.fx)]) };
    // 怪物成长

    // 标签
    const tagUse = {}; const add = (t, w) => { (tagUse[t] = tagUse[t] || new Set()).add(w); };
    for (const [k, w] of Object.entries(WEAPONS)) (w.tags || []).forEach(t => add(t, '武器'));
    for (const g of GEMS) (g.tags || []).forEach(t => add(t, '技能石'));
    for (const a of AFF) if (!a.off && a.tag) add(a.tag, '词条');
    for (const [k, f] of Object.entries(RUNE_FIT)) f.filter(c => c.startsWith('tag:')).forEach(c => add(c.slice(4), '辅助石'));
    T.tags = { name: '标签', cols: ['标签', '中文', '出现在'], key: 0, rows: Object.keys({ ...TAG_N, ...tagUse }).map(t => [t, TAG_N[t] || '', [...(tagUse[t] || [])].join('、')]) };
    // 规则
    T.rules = { name: '机制规则', cols: ['id', '说明（模板）'], key: 0, rows: Object.entries(RULES).filter(([k, v]) => v && v.text).map(([k, v]) => [k, v.text]) };
    // 掉落
    T.drops = { name: '掉落与数值', cols: ['项目', '数值', '说明'], key: 0, rows: [
      ...Object.entries(LOOT.drop).filter(([k]) => !k.startsWith('_')).map(([k, v]) => ['掉率.' + k, v, '']),
      ...Object.entries(LOOT.rarityWeights).filter(([k]) => !k.startsWith('_')).map(([k, v]) => ['稀有度权重.' + k, v, '']),
      ['怪物成长.前 20 层每层血量', PROG.monsterScaling.hpGrowth, ''], ['怪物成长.前 20 层每层伤害', PROG.monsterScaling.dmgGrowth, ''],
      ...PROG.monsterScaling.bands.map(bd => [`怪物成长.${bd.from} 层起`, `血 ×${bd.hp} · 伤 ×${bd.dmg}`, bd._说明 || '']),
      ['宝石掉落等级', `1 + 物品等级 / ${LOOT.runeDrop.lvlPer} ± ${LOOT.runeDrop.lvlSpread}`, ''], ['储物箱上限', LOOT.stashCap, ''] ] };
    return { generated: new Date().toISOString(), tables: T };
  });
  fs.writeFileSync(OUT, JSON.stringify(data));
  const t = data.tables; console.log(Object.entries(t).map(([k, v]) => `${v.name} ${v.rows.length}`).join(' / '), '| bytes', fs.statSync(OUT).size, '| errors', errs.slice(0, 3));
  await b.close();
})();
