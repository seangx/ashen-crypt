/* ---------- 物品图标（界面用，矢量） ----------
   和界面素材同一风格：64×64，粗黑描边、上亮下暗的渐变、白色高光。战场上掉落的还是像素图（SPR.icons）。
   ICON_SVG[图标键] = SVG 字符串；界面用 iconURL(键) 取图片地址，没有矢量版的退回像素图。 */
const ICON_SVG = (() => {
  const C = { // 渐变：[亮, 暗]
    bone: ['#fff6df', '#cdb98d'], wood: ['#d6914f', '#8a4a1e'], iron: ['#e6ecf6', '#8592ad'], gold: ['#ffe680', '#e79a1c'], fire: ['#ffdf5a', '#ff5a1e'],
    holy: ['#fffbd0', '#ffc62e'], ele: ['#b8ecff', '#2f7dff'], nuc: ['#d6ff8a', '#3fae2a'], cold: ['#eefcff', '#55c8f5'], purp: ['#efb8ff', '#8338dc'],
    red: ['#ff9a8a', '#d02b2b'], dark: ['#6e5a96', '#2a1d44'], clay: ['#e08a5a', '#8e3e22'], paper: ['#fff3c4', '#e6c27a'], leaf: ['#a8f070', '#3c9a2a'],
    void: ['#a77bff', '#3a1470'], ember: ['#ffb14a', '#c2350e'], cyan: ['#a8fff4', '#1fb8b0'], pink: ['#ffc2e6', '#e0459a'], steel: ['#c7cfe0', '#5e6a86'],
  };
  const defs = '<defs>' + Object.entries(C).map(([k, [a, b]]) => `<linearGradient id="${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('')
    + '<radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>';
  const O = 'stroke="#1a1426" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
  const f = (c, d, x = '') => `<path d="${d}" fill="url(#${c})" ${O} ${x}/>`; // 带描边的填充形状
  const ln = (d, w = 3.5, col = '#1a1426') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const hl = (d, w = 2.4, op = 0.7) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round"/>`; // 高光
  const ci = (c, x, y, r, x2 = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${c})" ${O} ${x2}/>`;
  const glow = (x, y, r, col, op = 0.55) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${op}" style="filter:blur(3px)"/>`;
  const bolt = (x, y, s = 1, c = 'holy') => f(c, `M${x + 2 * s} ${y - 12 * s}L${x - 7 * s} ${y + 2 * s}H${x}L${x - 3 * s} ${y + 12 * s}L${x + 8 * s} ${y - 3 * s}H${x + 1 * s}Z`);
  const flame = (x, y, s = 1, c = 'fire') => f(c, `M${x} ${y - 14 * s}C${x + 9 * s} ${y - 5 * s} ${x + 9 * s} ${y + 2 * s} ${x + 6 * s} ${y + 6 * s}C${x + 3 * s} ${y + 10 * s} ${x - 3 * s} ${y + 10 * s} ${x - 6 * s} ${y + 6 * s}C${x - 9 * s} ${y + 2 * s} ${x - 7 * s} ${y - 4 * s} ${x - 3 * s} ${y - 7 * s}C${x - 2 * s} ${y - 3 * s} ${x} ${y - 2 * s} ${x + 1 * s} ${y - 3 * s}C${x + 2 * s} ${y - 7 * s} ${x} ${y - 11 * s} ${x} ${y - 14 * s}Z`);
  const star = (x, y, r, c = 'gold') => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1); } return f(c, d + 'Z'); };
  const snow = (x, y, r, col = '#fff') => { let d = ''; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; d += `M${(x - Math.cos(a) * r).toFixed(1)} ${(y - Math.sin(a) * r).toFixed(1)}L${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r).toFixed(1)}`; } return ln(d, 2.4, col); };
  const skull = (x, y, s = 1, c = 'bone') => f(c, `M${x - 9 * s} ${y + 2 * s}C${x - 11 * s} ${y - 12 * s} ${x + 11 * s} ${y - 12 * s} ${x + 9 * s} ${y + 2 * s}V${y + 7 * s}H${x - 9 * s}Z`) + `<circle cx="${x - 4 * s}" cy="${y - 1 * s}" r="${2.6 * s}" fill="#1a1426"/><circle cx="${x + 4 * s}" cy="${y - 1 * s}" r="${2.6 * s}" fill="#1a1426"/>` + ln(`M${x - 3 * s} ${y + 7 * s}V${y + 4 * s}M${x} ${y + 7 * s}V${y + 4 * s}M${x + 3 * s} ${y + 7 * s}V${y + 4 * s}`, 1.6);
  const S = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}${body}</svg>`;
  // 一族的模板
  const trap = (c, glowCol) => glow(32, 40, 14, glowCol, 0.5) + f('iron', 'M8 44a24 10 0 0 0 48 0V40H8z') + f('steel', 'M10 40C10 24 20 16 32 16S54 24 54 40Z') + ln('M14 40L18 30L22 38L26 28L30 38L34 28L38 38L42 28L46 38L50 30L52 40', 2.6) + ci(c, 32, 40, 7) + hl('M16 34C18 26 24 21 30 20');
  const boot = (c, deco = '') => f(c, 'M20 8H40V36L54 42C58 44 58 54 52 54H16C13 54 12 51 13 48L20 36Z') + f('dark', 'M13 48H57V55H13Z') + f('iron', 'M18 8H42V15H18Z') + hl('M24 16V36') + deco;
  const shield = (c, emb = '') => f(c, 'M32 6L54 13V30C54 44 44 54 32 58C20 54 10 44 10 30V13Z') + ln('M32 11L49 16V30C49 41 41 49 32 53C23 49 15 41 15 30V16Z', 1.6, '#ffffff66') + emb + hl('M15 18V28');
  const circle = (c, sym) => glow(32, 32, 22, '#ffffff', 0.25) + ci(c, 32, 32, 24) + `<circle cx="32" cy="32" r="17" fill="none" stroke="#1a1426" stroke-width="2.5"/>` + `<circle cx="32" cy="32" r="20.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="3 3"/>` + `<path d="M32 15L46.7 40.5H17.3Z M32 49L17.3 23.5H46.7Z" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>` + (sym || '') + hl('M14 24C16 18 21 13 27 11');
  const crown = (c, gem) => f(c, 'M10 46L8 18L20 30L32 12L44 30L56 18L54 46Z') + f(c, 'M10 46H54V54H10Z') + ci(gem, 32, 36, 5.5) + ci(gem, 18, 40, 3.5) + ci(gem, 46, 40, 3.5) + hl('M14 24L15 42');
  const hood = (c, eyes) => f(c, 'M32 6C16 6 8 22 9 40C10 50 14 56 18 58H46C50 56 54 50 55 40C56 22 48 6 32 6Z') + f('dark', 'M32 20C22 20 18 30 19 40C20 48 24 52 32 52C40 52 44 48 45 40C46 30 42 20 32 20Z') + `<ellipse cx="26" cy="37" rx="3.5" ry="2.6" fill="${eyes}"/><ellipse cx="38" cy="37" rx="3.5" ry="2.6" fill="${eyes}"/>` + glow(26, 37, 4, eyes, 0.6) + glow(38, 37, 4, eyes, 0.6) + hl('M16 22C19 15 24 11 30 10');
  const I = {};
  /* ---- 主手 ---- */
  I.w_crossbow = f('wood', 'M22 56L42 18L50 22L30 60Z') + f('bone', 'M6 30C14 12 40 4 58 10L56 17C42 12 20 18 13 34Z') + ln('M9 32L57 13', 1.8) + f('iron', 'M14 46L48 12L53 17L19 51Z') + f('red', 'M48 12L60 4L54 18Z') + ci('iron', 36, 36, 4) + hl('M11 26C20 15 36 9 52 9');
  I.w_firepot = glow(32, 14, 10, '#ffb040', 0.6) + f('clay', 'M18 26C10 34 10 50 20 56H44C54 50 54 34 46 26Z') + f('clay', 'M22 18H42V27H22Z') + f('paper', 'M22 30H42V40H22Z') + flame(32, 14, 0.65) + ln('M32 18V12', 2.4) + hl('M17 36C17 44 20 50 24 53');
  I.w_lightrod = glow(42, 18, 16, '#fff3a0', 0.75) + f('wood', 'M12 56L36 24L41 28L17 60Z') + ci('holy', 42, 19, 10) + ln('M42 3V7M58 19H54M53.3 7.7L50.5 10.5M30.7 7.7L33.5 10.5', 2.6, '#ffd23a') + hl('M37 15C38 12 41 11 43 11');
  I.w_stormseal = f('paper', 'M16 6H48V58L40 52L32 58L24 52L16 58Z') + bolt(32, 30, 1.25, 'ele') + ln('M20 12H44', 2, '#c0392b') + hl('M20 18V48', 2, 0.5);
  I.w_censer = glow(32, 12, 12, '#a6ff6a', 0.5) + ln('M32 4V18M20 22L32 4L44 22', 2.2) + f('iron', 'M12 30C12 22 52 22 52 30C52 46 44 54 32 54S12 46 12 30Z') + f('nuc', 'M12 30C12 34 52 34 52 30C52 26 12 26 12 30Z') + `<circle cx="22" cy="42" r="3" fill="#1a1426"/><circle cx="32" cy="44" r="3" fill="#1a1426"/><circle cx="42" cy="42" r="3" fill="#1a1426"/>` + hl('M16 34C17 42 21 48 26 50');
  I.w_maul = f('wood', 'M30 26L36 26L38 60L28 60Z') + f('bone', 'M8 12H56V32H8Z') + f('iron', 'M8 12H14V32H8ZM50 12H56V32H50Z') + ln('M24 18V26M32 18V26M40 18V26', 2) + hl('M17 16H47');
  I.w_bladering = glow(32, 32, 14, '#fff', 0.3) + [0, 1, 2, 3].map(i => `<g transform="rotate(${i * 90} 32 32)">${f('iron', 'M32 32C34 20 42 12 54 10C48 18 44 26 40 34Z')}</g>`).join('') + ci('bone', 32, 32, 9) + ci('dark', 32, 32, 3.5) + hl('M42 14C46 12 50 11 52 11', 2);
  I.w_bell = glow(32, 50, 10, '#fff3a0', 0.6) + f('gold', 'M32 8C20 8 16 18 16 30C16 40 12 44 8 48H56C52 44 48 40 48 30C48 18 44 8 32 8Z') + ci('gold', 32, 52, 5) + f('gold', 'M28 4H36V9H28Z') + hl('M22 16C20 22 20 30 20 38');
  I.w_frostbell = glow(32, 32, 20, '#bff4ff', 0.4) + f('cold', 'M32 8C20 8 16 18 16 30C16 40 12 44 8 48H56C52 44 48 40 48 30C48 18 44 8 32 8Z') + f('cold', 'M14 48L18 58L22 48M28 48L32 60L36 48M42 48L46 58L50 48') + snow(32, 28, 7) + f('iron', 'M28 4H36V9H28Z') + hl('M22 16C20 22 20 30 20 38');
  I.w_starrod = glow(42, 20, 16, '#ffe680', 0.6) + f('purp', 'M12 56L36 26L41 30L17 60Z') + star(42, 20, 14) + hl('M38 14L42 8', 2);
  I.w_frostorb = glow(32, 28, 22, '#bff4ff', 0.5) + f('iron', 'M18 52L24 44H40L46 52Z') + ci('cold', 32, 28, 17) + snow(32, 28, 9) + hl('M20 22C22 16 26 13 31 12');
  I.w_piercer = f('wood', 'M24 58L44 22L52 26L32 62Z') + f('steel', 'M4 32C12 12 42 4 60 10L58 18C44 13 20 19 12 37Z') + ln('M7 34L59 14', 1.8) + f('iron', 'M8 54L52 10L56 14L12 58Z') + f('red', 'M52 10L63 2L58 16Z') + f('red', 'M8 54L2 56L6 62L12 58Z') + ci('gold', 38, 38, 4.5) + hl('M9 28C18 15 36 9 54 9');
  I.w_trap_exp = trap('fire', '#ff8a3d'); I.w_trap_pla = trap('holy', '#ffe27a'); I.w_trap_ele = trap('ele', '#7fc8ff'); I.w_trap_kin = trap('bone', '#ffffff'); I.w_trap_nuc = trap('nuc', '#8fe05a');
  I.w_scatter = f('wood', 'M6 44L26 34L30 42L12 54Z') + f('iron', 'M24 30L48 18L52 26L28 38Z') + f('iron', 'M46 12L60 8L60 32L52 28Z') + ci('bone', 30, 40, 3) + hl('M28 30L46 21');
  I.w_orrery = glow(32, 32, 14, '#a6ff6a', 0.4) + `<ellipse cx="32" cy="32" rx="26" ry="10" fill="none" stroke="#1a1426" stroke-width="5" transform="rotate(-25 32 32)"/><ellipse cx="32" cy="32" rx="26" ry="10" fill="none" stroke="#e6c27a" stroke-width="2.5" transform="rotate(-25 32 32)"/>` + ci('nuc', 32, 32, 11) + ci('purp', 54, 22, 4.5) + ci('bone', 11, 42, 4) + hl('M26 27C28 24 31 23 33 23');
  I.w_firewheel = glow(32, 32, 20, '#ff9a3d', 0.5) + [0, 1, 2, 3, 4, 5].map(i => `<g transform="rotate(${i * 60} 32 32)">${flame(32, 11, 0.55)}</g>`).join('') + ci('iron', 32, 32, 13) + ci('ember', 32, 32, 6) + hl('M24 26C26 23 28 22 31 21');
  I.w_wisp = glow(30, 28, 18, '#7fc8ff', 0.6) + f('ele', 'M30 8C42 8 48 18 46 30C44 40 36 44 34 52L28 44L22 52C20 44 14 38 14 28C14 16 20 8 30 8Z') + `<ellipse cx="25" cy="26" rx="3" ry="4.5" fill="#1a1426"/><ellipse cx="35" cy="26" rx="3" ry="4.5" fill="#1a1426"/><circle cx="26" cy="24.5" r="1.2" fill="#fff"/><circle cx="36" cy="24.5" r="1.2" fill="#fff"/>` + bolt(50, 48, 0.55) + hl('M20 18C22 14 25 12 29 11');
  I.w_sporesac = glow(32, 36, 18, '#a6ff6a', 0.4) + f('leaf', 'M32 10C46 12 54 26 52 40C50 52 40 58 32 58S14 52 12 40C10 26 18 12 32 10Z') + ci('nuc', 24, 30, 4) + ci('nuc', 40, 38, 5) + ci('nuc', 28, 46, 3) + ci('leaf', 50, 12, 3) + ci('leaf', 56, 22, 2.2) + hl('M18 28C19 22 22 17 26 15');
  I.w_thorns = f('iron', 'M14 14L24 8H40L50 14L54 30L46 34V56H18V34L10 30Z') + ln('M32 10V56', 2) + [[10, 22, -1], [54, 22, 1], [18, 40, -1], [46, 40, 1], [24, 8, -1], [40, 8, 1]].map(([x, y, s]) => f('bone', `M${x} ${y}L${x + s * 9} ${y - 3}L${x} ${y + 4}Z`)).join('') + hl('M22 16V30');
  I.w_spike = f('dark', 'M6 54H58V58H6Z') + f('bone', 'M12 54L20 22L26 54Z') + f('bone', 'M24 54L32 6L40 54Z') + f('bone', 'M38 54L46 26L52 54Z') + hl('M30 18L28 40', 2);
  I.w_holygun = glow(54, 22, 12, '#fff3a0', 0.7) + f('wood', 'M8 34H26L22 60H4Z') + f('gold', 'M4 18H48V34H4Z') + f('gold', 'M44 16H56V30H44Z') + flame(56, 20, 0.7, 'holy') + ln('M24 34V44H32', 2.6) + ci('holy', 16, 26, 3.5) + hl('M8 22H42');
  I.w_flameskull = glow(48, 48, 14, '#ff8a3d', 0.6) + flame(48, 50, 0.8) + skull(28, 30, 2.1) + hl('M14 16C17 10 22 8 28 8');
  I.w_sickle = f('wood', 'M14 58L26 38L31 41L19 61Z') + f('iron', 'M28 40C14 26 22 6 44 6C58 6 60 20 56 26C52 16 40 14 34 20C28 26 30 34 34 38Z') + hl('M24 22C26 14 34 10 42 10');
  I.w_lightscythe = glow(38, 18, 18, '#fff3a0', 0.6) + f('wood', 'M10 60L36 14L41 17L15 63Z') + f('holy', 'M38 16C46 4 60 6 62 18C56 12 48 12 42 22Z') + hl('M44 10C50 7 56 8 59 12', 2);
  /* ---- 遁靴 ---- */
  I.a_shadowstep = boot('dark', ln('M24 44C28 40 34 40 38 44', 2.4, '#b38cff'));
  I.a_soulstep = boot('cyan', glow(46, 20, 8, '#a8fff4', 0.7) + ci('cyan', 48, 18, 5));
  I.a_emberstep = boot('ember', flame(50, 26, 0.6));
  I.a_plaguestep = boot('leaf', ci('nuc', 48, 24, 4) + ci('nuc', 54, 32, 2.6));
  I.a_stormstep = boot('ele', bolt(50, 24, 0.7));
  I.a_voidstep = boot('void', `<circle cx="48" cy="24" r="7" fill="#12082a" stroke="#c9a8ff" stroke-width="2"/>`);
  I.a_doomstep = boot('red', skull(48, 22, 0.7));
  /* ---- 盾牌 ---- */
  I.a_boneward = shield('bone', skull(32, 30, 1.1, 'iron'));
  I.a_phantomward = shield('purp', `<ellipse cx="27" cy="30" rx="3" ry="4" fill="#fff"/><ellipse cx="37" cy="30" rx="3" ry="4" fill="#fff"/>`);
  I.a_veilward = shield('cold', ln('M18 22C26 28 38 16 46 22M18 32C26 38 38 26 46 32M20 42C28 48 36 36 44 42', 2.4, '#ffffffcc'));
  I.a_crystalward = shield('cyan', f('cold', 'M32 16L42 30L32 46L22 30Z') + ln('M22 30H42M32 16V46', 1.6, '#ffffffaa'));
  I.a_shadeward = shield('dark', f('purp', 'M32 18L36 28L46 30L36 33L32 44L28 33L18 30L28 28Z'));
  I.a_tombward = shield('clay', ln('M20 24H44M20 36H44M26 18V30M38 30V42M32 42V50', 2.2) + ln('M23 22L25 26M29 22L31 26M35 34L37 38M41 34L43 38', 1.4));
  /* ---- 头冠 ---- */
  I.a_helm = f('iron', 'M10 38C10 18 20 8 32 8S54 18 54 38V50H42V40H22V50H10Z') + f('steel', 'M28 8H36V40H28Z') + ln('M16 30H26M38 30H48', 3) + hl('M16 20C18 15 22 12 26 11');
  I.a_phantomhood = hood('purp', '#ffe680');
  I.a_veilcrown = crown('iron', 'cold') + ln('M10 50C18 56 46 56 54 50', 2, '#ffffffaa');
  I.a_crystalcrown = crown('cold', 'cyan');
  I.a_shadehood = hood('dark', '#ff5a7a');
  I.a_mask = f('bone', 'M12 14C12 8 52 8 52 14V34C52 48 42 58 32 58S12 48 12 34Z') + `<path d="M18 28L28 30L26 36L18 34Z M46 28L36 30L38 36L46 34Z" fill="#1a1426"/>` + ln('M22 46C28 50 36 50 42 46M26 44V49M32 45V50M38 44V49', 1.8) + ln('M32 10V22', 1.6) + ln('M29 13L35 15M29 18L35 20', 1.4) + hl('M17 18V32');
  /* ---- 法阵 ---- */
  I.a_circle = circle('purp'); I.a_circle_exp = circle('ember', flame(32, 34, 0.55)); I.a_circle_ele = circle('ele', bolt(32, 32, 0.6)); I.a_circle_pla = circle('holy', star(32, 32, 7, 'bone'));
  I.a_circle_kin = circle('steel', skull(32, 32, 0.6)); I.a_circle_nuc = circle('leaf', ci('nuc', 32, 32, 5)); I.a_circle_cold = circle('cold', snow(32, 32, 7, '#1a1426'));
  /* ---- 副手 ---- */
  I.o_quiver = f('wood', 'M18 22L36 14L48 52L30 60Z') + [[24, 8], [30, 5], [36, 7]].map(([x, y]) => ln(`M${x + 4} ${y + 18}L${x} ${y}`, 2.6) + f('red', `M${x} ${y}L${x - 4} ${y - 4}L${x + 3} ${y - 2}Z`)).join('') + ln('M22 34L40 27M26 46L44 39', 2.2) + hl('M23 26L33 54', 2, 0.5);
  I.o_source = glow(32, 32, 22, '#c890ff', 0.6) + ci('purp', 32, 34, 17) + flame(32, 34, 0.75, 'pink') + hl('M20 28C21 23 25 19 30 18');
  I.o_censer = glow(32, 14, 10, '#ffb040', 0.6) + ln('M22 6V18M42 6V18', 2.2) + f('gold', 'M12 26H52C52 42 44 52 32 52S12 42 12 26Z') + f('gold', 'M24 52H40V58H24Z') + flame(32, 18, 0.6) + hl('M17 30C18 38 22 44 27 47');
  I.o_totem = f('wood', 'M26 30H38V60H26Z') + skull(32, 20, 1.3) + ci('gold', 18, 40, 4.5) + ci('gold', 46, 40, 4.5) + ln('M18 35V30H26M46 35V30H38', 1.8) + hl('M28 34V56', 2, 0.5);
  I.o_lantern = glow(32, 36, 18, '#a6ff6a', 0.55) + ln('M32 4V10', 2.4) + f('iron', 'M22 10H42V16H22Z') + f('iron', 'M18 16H46V52H18Z', 'fill-opacity=".35"') + flame(32, 38, 0.8, 'nuc') + f('iron', 'M16 52H48V58H16Z') + ln('M18 16V52M46 16V52M32 16V52', 2.2);
  /* ---- 印记、墓图 ---- */
  I.a_sigil = f('purp', 'M32 6L54 19V45L32 58L10 45V19Z') + f('dark', 'M32 16L45 24V40L32 48L19 40V24Z') + star(32, 32, 8, 'pink') + hl('M14 22V40');
  I.a_sigil_e = glow(32, 32, 24, '#ffe680', 0.5) + f('gold', 'M32 6L54 19V45L32 58L10 45V19Z') + f('dark', 'M32 16L45 24V40L32 48L19 40V24Z') + star(32, 32, 9, 'holy') + hl('M14 22V40');
  I.a_map = f('paper', 'M8 12L24 8L40 12L56 8V52L40 56L24 52L8 56Z') + ln('M24 8V52M40 12V56', 1.6) + ln('M14 40C20 30 30 44 36 30S48 24 50 18', 2.2, '#c0392b') + ln('M46 14L52 20M52 14L46 20', 2.6, '#c0392b');
  for (const k in I) I[k] = S(I[k]);
  return I;
})();
// 手机包：启动前把每个 SVG 画到 128×128 的画布上（Phaser 里注册成贴图，见 89b_extras_mobile.js）
const ICON_CV = {};
const ICON_READY = typeof MOBILE !== 'undefined' && MOBILE ? Promise.all(Object.entries(ICON_SVG).map(([k, svg]) => new Promise(res => {
  const im = new Image(); im.onload = () => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; cv.getContext('2d').drawImage(im, 0, 0, 128, 128); ICON_CV[k] = cv; res(); }; im.onerror = () => res();
  im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}))) : Promise.resolve();
const ICON_URL = {};
// 界面里的物品图标：有矢量版用矢量版，否则用像素图
function iconURL(key) {
  if (ICON_URL[key]) return ICON_URL[key];
  const s = ICON_SVG[key.replace(/^i_/, '')]; if (s) return (ICON_URL[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
  return null;
}
