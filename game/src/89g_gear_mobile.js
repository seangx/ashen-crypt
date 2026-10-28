/* 手机装备图标 v2（只进手机包，随 GUI 皮肤开关：?gui=0 / localStorage ash-gui='0' 回到旧样子）
   问题（Sean：不同装备视觉上太接近）：图标只有 14px 缩在 30px 格子里；盾 / 靴 / 法阵同一个轮廓只换色；稀有度只有一圈细边；
   品质只有一个看不清的小数字；独特和它的底材一模一样。
   做法：图标仍是像素画，2 倍放大后占满格子；盾 / 头冠 / 靴 / 法阵每种底材单独画轮廓；格子底色 + 边框 + 光晕按稀有度拉开（GUI 包的槽 / 卡框染色）；
   品质用左下角色牌（按档位换颜色）；独特：金色描边 + 按 id 转色相 + 左上角主题徽记 + 角上的流光。图标美术仍是像素，GUI 包只用在格子底和框上。 */
const GX = (() => {
  const OUT = '#120c18';
  // ---- 新轮廓（12×12，字母见 PAL）：每个底材一个 ----
  const R = {
    shield: {
      TitaniumShield: ['...ssssss...', '..svvvvvvs..', '.svvSSSSvvs.', '.svSvvvvSvs.', 'svvSvwwvSvvs', 'svvSvwwvSvvs', '.svSvvvvSvs.', '.svvSSSSvvs.', '..sSvvvvSs..', '...sSSSSs...'],
      SigilShield: ['YYYYYYYYYYYY', 'YyyyyffyyyyY', 'YyyyyffyyyyY', 'YyffffffffyY', 'YyffffffffyY', 'YyyyyffyyyyY', '.YyyyffyyyY.', '.YyyyffyyyY.', '..YyyffyyY..', '...YyyyyY...', '....YyyY....', '.....YY.....'],
      PhantomShield: ['..vvvvvvvv..', '.vppppppppv.', 'vppvvppvvppv', 'vpvkkvvkkvpv', 'vppvvppvvppv', 'vppppppppppv', 'vppppvvppppv', 'vppppppppppv', 'vppppppppppv', 'vpvppvvppvpv', 'vv.vppppv.vv', '.v..vvvv..v.'],
      NebulaShield: ['...cccccc...', '..cllllllc..', '.cllCCCCllc.', 'cllCllllCllc', 'clCllffllClc', 'clClffffllCc', 'clClffffllCc', 'clCllffllClc', 'cllCllllCllc', '.cllCCCCllc.', '..cllllllc..', '...cccccc...'],
      CrystalShield: ['.....cc.....', '....clvc....', '...clvvlc...', '..clvvllBc..', '.clvvllllBc.', 'clvvlllllBBc', 'clvlllllBBBc', '.clllllBBBc.', '..clllBBBc..', '...clBBBc...', '....cBBc....', '.....cc.....'],
      EtherealShield: ['..PPPPPPPP..', '.PppppppppP.', 'PppPPPPPPppP', 'PpPkkkkkkPpP', 'PpPkkffkkPpP', 'PpPkkffkkPpP', 'PppPPPPPPppP', 'PppppppppppP', 'PppppppppppP', '.PpppPPpppP.', '.PPppppppPP.', '..PPPPPPPP..'],
      PolymerShield: ['.eeeeeeeeee.', 'eqqqqwqqqqqe', 'eqqqqwqqqqqe', 'ewwwwwwwwwwe', 'eqqqqwqqqqqe', 'eqqqqwqqwwqe', 'ewwwwwwqqqqe', 'eqqqqwqqqqqe', 'eqqqqwqqqqqe', '.eqqqwqqqqe.', '..eeeqqeeee.', '......ee....'],
    },
    core: {
      TitaniumCore: ['...ssssss...', '..svvvvvvs..', '.svvvssvvvs.', '.svvsSSsvvs.', '.svssSSssvs.', '.sSSkkkkSSs.', '.sSkrkkrkSs.', '.sSSkkkkSSs.', '.sSsSSSSsSs.', '.ssS....Sss.', '.sS......Ss.', '............'],
      PhantomCore: ['.....vv.....', '....vVVv....', '...vVVVVv...', '..vVVVVVVv..', '..vVkkkkVv..', '.vVVkrkrVVv.', '.vVVkkkkVVv.', 'vVVVVkkVVVVv', 'vVVVVVVVVVVv', 'vVVv....vVVv', 'vVv......vVv', '............'],
      NebulaCore: ['c....cc....c', 'cl..clcl..lc', 'cCl.cllc.lCc', 'cClllllllCCc', 'cClfllllfCCc', '.cCCCCCCCCc.', '.c.l.c.l.c..', '.cl.lcl.lc..', '.c..lcl..c..', '..c.lcl.c...', '...c.l.c....', '....c.c.....'],
      CrystalCore: ['.....ll.....', '..l..lBl..l.', '.lBl.lBl.lBl', '.lBllBBBllBl', '.lBvllBllvBl', '.lBBlllllBBl', '.lBBBBBBBBBl', '.BBBBBBBBBB.', '............', '............', '............', '............'],
      EtherealCore: ['...pppppp...', '..pPPPPPPp..', '.pPPPPPPPPp.', '.pPPkkkkPPp.', '.pPkkrkrkkp.', '.pPPkkkkPPp.', '.pPPPkkPPPp.', '.pPPPPPPPPp.', 'pP.pPPPPp.Pp', 'p..pP.PPp..p', '...p..Pp....', '............'],
      PolymerCore: ['............', '...wwwwww...', '..wwbwwbww..', '..wkkwwkkw..', '..wwwqqwww..', '..wbwqqwbw..', '...wqwwqw...', '...wwqqww...', '....wwww....', '............', '............', '............'],
    },
    engine: {
      Thruster: ['............', '............', '............', '...PPP......', '...PpP......', '...PpP......', '...PpPPP....', '..PppppppP..', '.PppppppppP.', '.PPPPPPPPPP.', '............', '............'],
      Warp: ['..y.........', '.yfy..PPP...', 'yfffy.PYP...', '.yfffyPYP...', '..yyyyPYP...', '...yyyPYPP..', '...YYPYYYYP.', '..PYYYYYYYYP', '.PPPPPPPPPPP', '............', '............', '............'],
      Afterburner: ['............', '...eee......', '...eoe......', '...eoe......', '...eoee.....', '.o.eooeee...', 'oyoeooooee..', '.o.eoooooee.', '..eeeeeeeee.', '..yo.ooo....', '..o.yoy.....', '............'],
      FusionDrive: ['..m.........', '.mgm.hhh....', '..m..hmh....', '...hhhmhh...', '..hmmmmmmh..', '.hmmgmmmmmh.', '.hmmmmgmmmh.', '.hmmmmmmmmh.', '.hhhhhhhhhh.', '.m.g.m..g.m.', '..m...m.....', '............'],
      EMP: ['............', '...BBB..l...', '...BlB.l....', '...BlBll....', '...BBBBl....', '...BlBl.....', '...BlBBBB...', '..BllllllB..', '.BBBBBBBBBB.', '.l.B.l.B.l..', '............', '............'],
      BlackHoleWarp: ['............', '..pp........', '.p..PPP.....', '.p.PkkP.....', '..pPkkP.....', '...PkkPPP...', '..PkppkkkP..', '.PkpvvpkkkP.', '.PkpvvpkkkP.', '.PPkppkkPP..', '..PPPPPPP...', '............'],
      Annihilator: ['..r..r..r...', '..e..e..e...', '..eNNNNe....', '..eNnnNe....', '..eNnnNe....', '..eNnnNeeee.', '..eNnnnnnnNe', '.eNnnnnnnnNe', '.eNNNNNNNNNe', 'ee.o.e.o.e.e', '............', '............'],
    },
  };
  const UP = rows => rows.flatMap(r => { const d = [...r].map(ch => ch + ch).join(''); return [d, d]; });
  // ---- 法阵：外框形状 + 中心符号，按代码生成 ----
  const HUBS = {
    AmberNexus: { shape: 'sun', g: ['#.#.#', '.###.', '#####', '.###.', '#.#.#'], c: ['Y', 'o', 'f', 'e'] },
    SilverNexus: { shape: 'oct', g: ['...##', '..##.', '.###.', '.##..', '##...'], c: ['S', 'l', 'f', 'B'] },
    CrystalNexus: { shape: 'hex', g: ['..#..', '.###.', '#####', '.###.', '..#..'], c: ['Y', 'f', 'w', 'y'] },
    OnyxNexus: { shape: 'sq', g: ['.###.', '#...#', '#.#.#', '#...#', '.###.'], c: ['k', 'V', 'w', 'S'] },
    BaryteNexus: { shape: 'tri', g: ['#.#.#', '.....', '#.#.#', '.....', '#.#.#'], c: ['h', 'm', 'f', 'g'] },
    FrostNexus: { shape: 'snow', g: ['#.#.#', '.#.#.', '..#..', '.#.#.', '#.#.#'], c: ['B', 'l', 'w', 'v'] },
    QuartzNexus: { shape: 'dia', g: ['#####', '.###.', '..#..', '.###.', '#####'], c: ['q', 'v', 'w', 'e'] },
    ZirconNexus: { shape: 'moon', g: ['.###.', '##...', '##...', '##...', '.###.'], c: ['P', 'p', 'f', 'k'] },
    IridiumNexus: { shape: 'twin', g: ['..#..', '.#.#.', '#.#.#', '.#.#.', '..#..'], c: ['C', 'c', 'w', 'S'] },
  };
  function hubRows(h) {
    const [dk, md, hi, ac] = h.c, g = Array.from({ length: 12 }, () => Array(12).fill('.'));
    const D = { sun: (x, y) => Math.hypot(x, y), snow: (x, y) => Math.hypot(x, y), moon: (x, y) => Math.hypot(x, y), twin: (x, y) => Math.hypot(x, y), oct: (x, y) => Math.max(Math.abs(x), Math.abs(y), (Math.abs(x) + Math.abs(y)) * 0.74),
      hex: (x, y) => Math.max(Math.abs(y), Math.abs(x) * 0.87 + Math.abs(y) * 0.5), sq: (x, y) => Math.max(Math.abs(x), Math.abs(y)) * 0.98, dia: (x, y) => (Math.abs(x) + Math.abs(y)) * 0.78, tri: (x, y) => Math.max(y * 0.9 + 1.2, -y * 0.45 + Math.abs(x) * 0.95 + 0.4) }[h.shape];
    for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) {
      const x = i - 5.5, y = j - 5.5, d = D(x, y), Ro = h.shape === 'tri' ? 5.6 : 5.9;
      if (d <= Ro && d > Ro - 1.1) g[j][i] = dk; else if (d <= Ro - 1.1 && d > Ro - 2.2) g[j][i] = md;
      if (h.shape === 'twin' && d <= Ro - 3.3 && d > Ro - 4.3) g[j][i] = hi;
      if (h.shape === 'moon' && x > 1.2 && x < 5.5 && Math.hypot(x - 2.6, y) < 3.1 && d <= Ro - 2.2) g[j][i] = '.'; // 月牙缺口
    }
    if (h.shape === 'sun') for (const [i, j] of [[5, 0], [6, 0], [5, 11], [6, 11], [0, 5], [0, 6], [11, 5], [11, 6]]) g[j][i] = hi; // 光芒
    if (h.shape === 'snow') for (const [i, j] of [[5, 0], [6, 0], [5, 11], [6, 11], [0, 5], [0, 6], [11, 5], [11, 6], [1, 1], [10, 1], [1, 10], [10, 10]]) g[j][i] = hi;
    h.g.forEach((r, b) => [...r].forEach((ch, a) => { if (ch === '#') g[3 + b][3 + a + (h.shape === 'moon' ? -1 : 0)] = hi; }));
    for (let j = 3; j < 9; j++) for (let i = 3; i < 9; i++) if (g[j][i] === '.' && h.shape !== 'tri') g[j][i] = ac;
    return g.map(r => r.join(''));
  }
  for (const k in HUBS) (R.hub ??= {})[k] = hubRows(HUBS[k]);
  // ---- 颜色 ----
  const hsl = c => { const r = parseInt(c.slice(1, 3), 16) / 255, g = parseInt(c.slice(3, 5), 16) / 255, b = parseInt(c.slice(5, 7), 16) / 255, M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2; let h = 0, s = 0;
    if (M !== m) { const d = M - m; s = l > 0.5 ? d / (2 - M - m) : d / (M + m); h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; };
  const rgb = ([h, s, l]) => { h = ((h % 360) + 360) % 360; const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return '#' + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); };
  const shiftPal = deg => { const o = {}; for (const k in PAL) { const [h, s, l] = hsl(PAL[k]); o[k] = k === 'k' ? PAL[k] : rgb([h + deg, l > 0.2 && l < 0.92 ? Math.max(s, 0.4) : s, l]); } return o; };
  // 独特：同底材的几件按色相均分，彼此拉开
  const URANK = {}, UCNT = {}; for (const u of UNIQUES) { UCNT[u.kind + u.b] = (UCNT[u.kind + u.b] || 0) + 1; URANK[u.id] = UCNT[u.kind + u.b] - 1; }
  const uShift = id => { const n = UCNT[UNIQUE_BY[id].kind + UNIQUE_BY[id].b] || 1; return 40 + URANK[id] * (320 / Math.max(2, n)); };
  // ---- 稀有度外观：[底, 亮边, 暗边, 光晕] ----
  const RAR_LOOK = [
    { bg: 0x3a3548, fr: 0x9a93aa, gl: 0, w: 1 },       // 普通：灰
    { bg: 0x1f4a9a, fr: 0x5fa0ff, gl: 0.5, w: 1.5 },    // 罕见：蓝
    { bg: 0x80600e, fr: 0xffd23a, gl: 0.8, w: 2 },     // 稀有：金
    { bg: 0x8a3410, fr: 0xff8a2a, gl: 1, w: 2 },     // 独特：橙
  ];
  const LOOK_LEG = { bg: 0x62103f, fr: 0xff5fa2, gl: 1, w: 2 }, LOOK_EX = { bg: 0x0b4f48, fr: 0x5dffd0, gl: 1, w: 2 };
  const lookOf = it => it.leg ? LOOK_LEG : it.ex ? LOOK_EX : RAR_LOOK[Math.min(3, it.rar || 0)];
  // 品质 0–10 → 色牌：灰 / 绿 / 蓝 / 紫 / 金
  const TIERC = q => q >= 9 ? [0xffd23a, '#2a1a00'] : q >= 7 ? [0xb06bff, '#ffffff'] : q >= 5 ? [0x3f8cff, '#ffffff'] : q >= 3 ? [0x3fae5a, '#ffffff'] : [0x6a627a, '#ffffff'];
  // ---- 徽记 7×7（独特左上角）----
  const EM = {
    flame: ['...#...', '..##...', '.###.#.', '.#####.', '#######', '.#####.', '..###..'], snow: ['#..#..#', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '#..#..#'],
    bolt: ['...###.', '..###..', '.###...', '#######', '...###.', '..##...', '.#.....'], drop: ['...#...', '..###..', '..###..', '.#####.', '#######', '#######', '.#####.'],
    swirl: ['.#####.', '#.....#', '#.###.#', '#.#.#.#', '#.#####', '#......', '.######'], crown: ['#..#..#', '##.#.##', '#######', '#######', '#######', '.#####.', '.......'],
    skull: ['.#####.', '#######', '##.#.##', '#######', '.#####.', '.#.#.#.', '.......'], heart: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
    gem: ['..###..', '.#####.', '#######', '.#####.', '..###..', '...#...', '.......'], star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
    moon: ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..'], eye: ['.......', '..###..', '.#####.', '###.###', '.#####.', '..###..', '.......'],
  };
  const emOf = id => /Frost|Winter|Coffin|Shard/.test(id) ? 'snow' : /Ember|Fire|Solar|Scorch|Wild|Wrath|Burn|Lamp|Flame/.test(id) ? 'flame' : /Storm|Thunder|Volt|Chain|Tempest|Lee|Spectra/.test(id) ? 'bolt' : /Plague|Fungus|Waste|Nukie|cloud|Doom/.test(id) ? 'drop' : /Whirl|Vortex|Tide|Siebenmeilen|Walker|Return/.test(id) ? 'swirl' : /Crown|King|Bastion|Judge/.test(id) ? 'crown' : /Bone|Skull|Splitter|Breaker|Hundred|Slot|Ripper|Aether/.test(id) ? 'skull' : /Heart|Pure|Martyr|Grand/.test(id) ? 'heart' : /Echo|Twin|Prism|Glass|Aegis|Balu/.test(id) ? 'gem' : /Moon|Dark|Dead|Void|Escape/.test(id) ? 'moon' : /Eye|Light|Bertha|Gruvak|Goro/.test(id) ? 'eye' : 'star';
  // ---- 贴图 ----
  function iconCanvas(rows, pal, outline) {
    const c = sprite(UP(rows), outline, null, pal), o = document.createElement('canvas'); o.width = c.width + 2; o.height = c.height + 2; const x = o.getContext('2d'); x.drawImage(c, 1, 1); return o;
  }
  const rowsOf = it => { const b = baseOf(it); return (R[it.kind] && R[it.kind][it.b]) || ART[b.ic] || ART.sword; };
  function texFor(sc, it) {
    const T = sc.textures, uid = it.u && UNIQUE_BY[it.u] ? it.u : null, key = uid ? 'gxu_' + uid : it.fb ? 'gx_fb_' + baseOf(it).ic : `gx_${it.kind}_${it.b}`;
    if (T.exists(key)) return key;
    const rows = rowsOf(it);
    if (!uid) { T.addCanvas(key, iconCanvas(rows, null, OUT)); return key; }
    // 独特：转色相 + 金色描边 + 流光十字
    const c = iconCanvas(rows, shiftPal(uShift(uid)), '#ffcf3a'), x = c.getContext('2d'); x.fillStyle = '#ffffff';
    for (const [px, py] of [[3, 3], [c.width - 4, 6], [5, c.height - 4]]) { x.fillRect(px, py - 2, 1, 5); x.fillRect(px - 2, py, 5, 1); x.fillStyle = '#fff2a8'; x.fillRect(px, py, 1, 1); x.fillStyle = '#ffffff'; }
    T.addCanvas(key, c); return key;
  }
  const emKey = n => 'gx_em_' + n;
  const _bt = buildTextures;
  buildTextures = function (sc) {
    _bt(sc);
    for (const n in EM) { const k = emKey(n); if (sc.textures.exists(k)) sc.textures.remove(k); sc.textures.addCanvas(k, sprite(EM[n].map(r => r.replace(/#/g, 'y')), OUT)); }
  };
  return { texFor, lookOf, TIERC, emOf, R, uShift };
})();
const GEAR_KINDS = new Set(['weapon', 'off', 'shield', 'core', 'engine', 'hub']);
const _mkCellGx = mkCell;
mkCell = function (sc, parent, x, y, it, o = {}) {
  const c = _mkCellGx(sc, parent, x, y, it, o), s = o.size || 20;
  if (!it || !GEAR_KINDS.has(it.kind) || !GUI_SKIN.on || s < 24 || !guiReady(sc) || !sc.textures.exists('gx_em_star')) return c;
  // 去掉旧的稀有度描边 / 底光 / 图标 / 品质小数字
  const oldIc = 'i_' + iconOf(it); c.getAt(0).destroy();
  for (const ch of c.list.slice()) {
    const k = ch.texture && ch.texture.key;
    if ((ch.type === 'NineSlice' && (k === 'f_glow' || (k === 'f_rar' && ch.x === 0))) || (ch.type === 'Image' && k === oldIc) || (ch.type === 'Text' && it.q && ch.text === String(it.q))) ch.destroy();
  }
  const L = GX.lookOf(it), uniq = !!it.u || it.leg || it.ex, put = (el, at) => { c.addAt(el, at); return el; };
  let at = 0;
  // 1. 底：深色圆角底（稀有度底色，上亮下暗）+ GUI 包的高光条
  const bg = sc.add.graphics(), dk = v => { const r = (v >> 16 & 255) * 0.55, g = (v >> 8 & 255) * 0.55, b = (v & 255) * 0.55; return (r << 16) | (g << 8) | b; };
  bg.fillStyle(dk(L.bg), 1).fillRoundedRect(0, 0, s, s, 5); bg.fillStyle(L.bg, 1).fillRoundedRect(1, 1, s - 2, s * 0.62, { tl: 4, tr: 4, bl: 2, br: 2 });
  put(bg, at++); put(gNine(sc, 2, 1, s - 4, Math.round(s * 0.45), 'btn_lt', 0xffffff).setAlpha(it.rar >= 1 || uniq ? 0.22 : 0.12), at++);
  // 2. 光晕（罕见以上）：圆角分层外发光，独特 / 传奇 / 溢彩缓慢呼吸
  if (L.gl) { const gl = sc.add.graphics(); for (let i = 2; i >= 1; i--) gl.lineStyle(i + 1, L.fr, 0.2 * L.gl).strokeRoundedRect(-i + 0.5, -i + 0.5, s + 2 * i - 1, s + 2 * i - 1, 5 + i);
    put(gl, at++); if (uniq && G.fx !== false) sc.tweens.add({ targets: gl, alpha: 0.35, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: (x * 5 + y * 3) % 600 }); }
  // 3. 图标：2 倍放大像素画，居中
  const key = GX.texFor(sc, it), im = sc.textures.get(key).getSourceImage();
  put(img(sc, Math.round((s - im.width) / 2), Math.round((s - im.height) / 2) - 1, key), at++);
  // 4. 稀有度边框：普通 1px 灰；罕见 1.5px 蓝；稀有 / 独特 2px 亮边 + 内侧暗线
  const fr = sc.add.graphics(); fr.lineStyle(L.w, L.fr, 1).strokeRoundedRect(L.w / 2, L.w / 2, s - L.w, s - L.w, 5); if (L.w >= 2) fr.lineStyle(1, 0x000000, 0.45).strokeRoundedRect(2.5, 2.5, s - 5, s - 5, 3); put(fr, at++);
  if (uniq) for (const [cx, cy] of [[0, 0], [s - 3, 0], [0, s - 3], [s - 3, s - 3]]) put(rect(sc, cx, cy, 3, 3, it.leg ? '#ffd1e6' : it.ex ? '#d1fff0' : '#ffe9a0', 1), at++); // 四角金钉
  // 5. 独特徽记（左上）：按 id 取主题
  if (it.u) put(img(sc, 2, 2, 'gx_em_' + GX.emOf(it.u)).setScale(0.8), at++);
  // 6. 品质色牌（左下）
  if (it.q) { const [bc, tc] = GX.TIERC(it.q), n = String(it.q), w = n.length * 4 + 3, bx = 1, by = s - 10;
    const g = sc.add.graphics(); g.fillStyle(0x0d0a12, 1).fillRoundedRect(bx - 1, by - 1, w + 2, 10, 3); g.fillStyle(bc, 1).fillRoundedRect(bx, by, w, 8, 2); put(g, at++);
    put(T(sc, bx + 2, by, n, { size: 'num', color: tc }), at++); }
  return c;
};
