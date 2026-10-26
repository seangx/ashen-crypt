/* 技能石 / 符文新图标（只进手机包）：纯代码逐像素绘制，启动时生成一次贴图并缓存
   技能石 20×20：刻面宝石轮廓，按流派着色，中间是技能符号；符文 16×16：按系别分形状和颜色，中间是刻纹 */
const ICO = (() => {
  const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const OUT = '#0d0a12';
  // 流派色：[亮, 中, 暗]
  const SCHOOL = {
    fire: '#ff9a3c', frost: '#7fe3f0', storm: '#ffe066', holy: '#f2c46a', plague: '#9be05a', arcane: '#c98cff', steel: '#c9c1b4', blood: '#ff6b6b',
  };
  const shade = c => [mix(c, '#ffffff', 0.45), c, mix(c, '#2a2433', 0.55), mix(c, '#0d0a12', 0.75)];
  const GEM_SCHOOL = { GemWhirl: 'steel', GemStab: 'steel', GemRam: 'blood', GemBolt: 'steel', GemTaser: 'storm', GemSpark: 'storm', GemSickle: 'blood', GemFirepot: 'fire', GemScatter: 'steel', GemPlague: 'plague', GemBeam: 'holy', GemFlame: 'fire', GemMiasma: 'plague', GemNova: 'arcane', GemFrostNova: 'frost', GemMeteor: 'fire', GemFrostOrb: 'frost', GemTrap: 'blood', GemShield: 'holy' };
  // 技能符号 9×9（# 实心）
  const G = {
    GemWhirl: ['...###...', '.##...#..', '#....#.#.', '#...#...#', '#..#.#..#', '#...#...#', '.#.#....#', '..#...##.', '...###...'],
    GemStab: ['........#', '.......##', '......##.', '.....##..', '....##...', '.#.##....', '..##.....', '.#.#.....', '#........'],
    GemRam: ['.........', '##.......', '.##..#...', '..##.##..', '########.', '..##.##..', '.##..#...', '##.......', '.........'],
    GemBolt: ['.........', '.......#.', '......###', '.....###.', '....###..', '#..###...', '.####....', '..##.....', '.#.#.....'],
    GemTaser: ['....###..', '...###...', '..###....', '.######..', '....###..', '...###...', '..##.....', '.##......', '#........'],
    GemSpark: ['....#....', '.#..#..#.', '..#.#.#..', '...###...', '#########', '...###...', '..#.#.#..', '.#..#..#.', '....#....'],
    GemSickle: ['..#####..', '.#.....#.', '#.......#', '........#', '.......#.', '......#..', '.....#...', '...##....', '.##......'],
    GemFirepot: ['...#.....', '..#.#....', '...#.#...', '..#####..', '.#######.', '#########', '#########', '.#######.', '..#####..'],
    GemScatter: ['#........', '.#....#..', '..#..#...', '...##..##', '########.', '...##..##', '..#..#...', '.#....#..', '#........'],
    GemPlague: ['....#....', '.#.###.#.', '..#####..', '.##.#.##.', '####.####', '.##.#.##.', '..#####..', '.#.###.#.', '....#....'],
    GemBeam: ['....#....', '....#....', '...###...', '...###...', '..#####..', '..#####..', '.#######.', '.#######.', '#########'],
    GemFlame: ['....#....', '...##....', '...###...', '..####.#.', '.#####.#.', '.########', '#########', '.#######.', '..#####..'],
    GemMiasma: ['..#...#..', '.#.#.#.#.', '#...#...#', '.#.....#.', '..#.#.#..', '.#.....#.', '#...#...#', '.#.#.#.#.', '..#...#..'],
    GemNova: ['#...#...#', '.#..#..#.', '..#...#..', '...###...', '####.####', '...###...', '..#...#..', '.#..#..#.', '#...#...#'],
    GemFrostNova: ['....#....', '..#.#.#..', '...###...', '.#..#..#.', '####.####', '.#..#..#.', '...###...', '..#.#.#..', '....#....'],
    GemMeteor: ['#........', '.#.......', '..#.#....', '...#.....', '....####.', '...######', '...######', '...######', '....####.'],
    GemFrostOrb: ['...###...', '..#####..', '.##.#.##.', '###.#.###', '#.#####.#', '###.#.###', '.##.#.##.', '..#####..', '...###...'],
    GemTrap: ['.#.#.#.#.', '..#####..', '.##...##.', '##.###.##', '.#.#.#.#.', '##.###.##', '.##...##.', '..#####..', '.#.#.#.#.'],
    GemShield: ['#########', '#.......#', '#...#...#', '#..###..#', '#...#...#', '.#.....#.', '.#.....#.', '..#...#..', '...###...'],
  };
  const P = (x, c, a, b) => { x.fillStyle = c; x.fillRect(a, b, 1, 1); };
  const inGem = (i, j) => { const cx = 9.5, cy = 9.5, dx = Math.abs(i - cx), dy = Math.abs(j - cy); return dx <= 9 && dy <= 9 && dx + dy * 0.62 <= 10.2 && dy + dx * 0.62 <= 10.2; }; // 八边形刻面宝石
  function skillGem(id) {
    const [hi, mid, lo, dk] = shade(SCHOOL[GEM_SCHOOL[id] || 'steel']), g = G[id] || G.GemNova;
    return cvs(20, 20, x => {
      for (let j = 0; j < 20; j++) for (let i = 0; i < 20; i++) {
        if (!inGem(i, j)) { if (inGem(i - 1, j) || inGem(i + 1, j) || inGem(i, j - 1) || inGem(i, j + 1)) P(x, OUT, i, j); continue; }
        const edge = !inGem(i - 1, j) || !inGem(i + 1, j) || !inGem(i, j - 1) || !inGem(i, j + 1);
        // 四块刻面：左上亮、右下暗
        const u = i + j < 19 ? (i < j ? 1 : 0) : (i < j ? 2 : 3);
        P(x, edge ? (i + j < 19 ? hi : dk) : [mix(mid, hi, 0.35), mid, lo, mix(lo, dk, 0.4)][u], i, j);
      }
      P(x, '#ffffff', 5, 4); P(x, '#ffffff', 4, 5); P(x, hi, 6, 4); // 高光
      // 符号：深色描边 + 亮色笔画
      const on = (a, b) => g[b] && g[b][a] === '#';
      for (let b = -1; b <= 9; b++) for (let a = -1; a <= 9; a++) if (!on(a, b) && (on(a - 1, b) || on(a + 1, b) || on(a, b - 1) || on(a, b + 1))) P(x, dk, a + 5, b + 5);
      for (let b = 0; b < 9; b++) for (let a = 0; a < 9; a++) if (on(a, b)) P(x, '#fff6e0', a + 5, b + 5);
    });
  }
  // 符文系别：形状 + 颜色
  const FAM = {
    proj: { ids: ['Pierce', 'Chain', 'Split', 'Boomerang', 'RapidProjectiles', 'Persist', 'Velocity', 'Comet'], c: '#7fb8ff', shape: 'diamond' },
    area: { ids: ['AreaOfEffect', 'Debris', 'Aftershock', 'Knockback', 'Crush'], c: '#ff9a3c', shape: 'round' },
    elem: { ids: ['Shock', 'Blind', 'Radiation', 'Kinetic', 'Thermal', 'Plasma', 'Electric', 'Inferno', 'Agony'], c: '#c98cff', shape: 'hex' },
    skill: { ids: ['Whirl', 'ShieldThrow', 'FrostOrbRune', 'Meteor', 'FrostNova', 'Spark'], c: '#7fe3f0', shape: 'tri' },
    melee: { ids: ['AdditionalAttacks', 'AttackSpeed', 'Range', 'SteamHammer', 'Rigor', 'Lethal', 'ArmorOnHit', 'Melee', 'Thorns', 'Purity', 'DeathThreshold', 'Overcharge', 'DashOnHit', 'Agility'], c: '#ff6b6b', shape: 'shield' },
  };
  const ELEM_C = { Shock: '#ffe066', Electric: '#ffe066', Inferno: '#ff7a3c', Thermal: '#ffae5a', Plasma: '#f2c46a', Radiation: '#9be05a', Agony: '#ff6b9a', Blind: '#b0a8c8', Kinetic: '#c9c1b4', FrostOrbRune: '#7fe3f0', FrostNova: '#a8f0ff', Meteor: '#ff9a3c', Spark: '#ffe066', ShieldThrow: '#f2c46a', Whirl: '#c9c1b4' };
  const famOf = id => { for (const k in FAM) if (FAM[k].ids.includes(id)) return k; return MOD_BY[id] && MOD_BY[id].field ? 'field' : 'melee'; };
  const SH = {
    diamond: (i, j) => Math.abs(i - 7.5) + Math.abs(j - 7.5) <= 7.6,
    round: (i, j) => (i - 7.5) ** 2 + (j - 7.5) ** 2 <= 49,
    hex: (i, j) => Math.abs(j - 7.5) <= 7 && Math.abs(i - 7.5) * 0.9 + Math.abs(j - 7.5) * 0.5 <= 7,
    tri: (i, j) => j >= 1 && j <= 14 && Math.abs(i - 7.5) <= (j - 0.5) * 0.55,
    shield: (i, j) => i >= 1 && i <= 14 && j >= 1 && (j <= 8 || Math.abs(i - 7.5) <= (15 - j) * 1.0),
    field: (i, j) => { const r = (i - 7.5) ** 2 + (j - 7.5) ** 2; return r <= 52; },
  };
  const hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  function rune(id) {
    const f = famOf(id), fam = FAM[f] || { c: '#f2c46a', shape: 'field' }, [hi, mid, lo, dk] = shade(ELEM_C[id] || fam.c), sh = SH[fam.shape], h = hash(id);
    // 刻纹：5×7 左右对称，由 id 决定；保证有竖笔
    const rows = []; for (let b = 0; b < 7; b++) { let r = ''; for (let a = 0; a < 3; a++) r += (h >>> ((b * 3 + a) % 31)) & 1 ? '#' : '.'; rows.push(r.slice(0, 2) + '#' === r ? r : r.slice(0, 2) + (b % 2 ? '#' : r[2])); }
    const on = (a, b) => { if (b < 0 || b > 6 || a < 0 || a > 4) return false; const k = a > 2 ? 4 - a : a; return rows[b][k] === '#'; };
    return cvs(16, 16, x => {
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
        if (!sh(i, j)) { if (sh(i - 1, j) || sh(i + 1, j) || sh(i, j - 1) || sh(i, j + 1)) P(x, OUT, i, j); continue; }
        const edge = !sh(i - 1, j) || !sh(i + 1, j) || !sh(i, j - 1) || !sh(i, j + 1);
        P(x, edge ? (i + j < 15 ? hi : dk) : (i + j < 13 ? mid : lo), i, j);
      }
      if (fam.shape === 'field') { x.strokeStyle = '#c8913a'; for (let t = 0; t < 32; t++) { const a = t / 32 * Math.PI * 2; P(x, '#ffd36a', Math.round(7.5 + Math.cos(a) * 5.6), Math.round(7.5 + Math.sin(a) * 5.6)); } }
      for (let b = 0; b < 7; b++) for (let a = 0; a < 5; a++) if (on(a, b)) P(x, '#1a1422', a + 6, b + 5); else if (on(a, b - 1)) P(x, mix(lo, '#000000', 0.2), a + 6, b + 5);
      for (let b = 0; b < 7; b++) for (let a = 0; a < 5; a++) if (on(a, b)) P(x, '#fff6e0', a + 5, b + 4);
      P(x, '#ffffff', 4, 3);
    });
  }
  return { skillGem, rune, famOf, GEM_SCHOOL, SCHOOL };
})();

// 启动时覆盖贴图：技能石用 sg_<id>，符文直接替换 mod_<id>
for (const g of GEMS) ARMORS.gem[g.id].ic = 'sg_' + g.id;
const _buildTex0 = buildTextures;
buildTextures = function (sc) {
  _buildTex0(sc);
  const add = (k, c) => { if (sc.textures.exists(k)) sc.textures.remove(k); sc.textures.addCanvas(k, c); };
  for (const g of GEMS) add('i_sg_' + g.id, ICO.skillGem(g.id));
  for (const m of MODS) add('mod_' + m.id, ICO.rune(m.id));
};
// 格子：技能石去掉旧的青色圆框，加槽位点；符文右上角加等级段点（1–4）
const _mkCell0 = mkCell;
mkCell = function (sc, parent, x, y, it, o = {}) {
  const c = _mkCell0(sc, parent, x, y, it, o), s = o.size || 20;
  if (it && it.kind === 'gem') {
    c.list.filter(ch => ch.type === 'Graphics').forEach(ch => ch.destroy());
    const n = it.sock || 0, mods = it.mods || [];
    for (let i = 0; i < n; i++) { const px_ = s - 4 - i * 4, py_ = s - 5; rect(sc, px_ - 1, py_ - 1, 4, 4, COL.ink, 1, c); rect(sc, px_, py_, 2, 2, mods[i] ? COL.cyan : '#4a3f5a', 1, c); }
    if ((it.q || 0) >= 10) rect(sc, s - 4, 2, 2, 2, COL.emberHi, 1, c); // 高品质：右上金点
  } else if (it && it.kind === 'mod' && s >= 18) {
    const b = Math.min(3, Math.floor((Math.max(1, it.lvl) - 1) / 5));
    for (let i = 0; i <= b; i++) rect(sc, s - 4 - i * 3, s - 4, 2, 2, b >= 3 ? COL.emberHi : b >= 2 ? COL.ember : COL.dim, 1, c);
  }
  return c;
};
