/* ---------------- 像素美术 ---------------- */
const PAL = { w: '#ece3cb', b: '#b9ad94', g: '#7d7262', k: '#1e1626', r: '#ff4b3e', s: '#a3aec0', S: '#5d6678', p: '#7a55a0', P: '#46305f', y: '#ffd75e', Y: '#c08a1c', o: '#ff9a3d', c: '#57e0d0', C: '#2a8f9a', n: '#8f5d36', N: '#5a3820', m: '#6fae5a', e: '#e8533a', v: '#dfe6ee', V: '#8b95a3', B: '#5b8fe0', f: '#ffe7a0', h: '#3a2a1a', l: '#9fd8ff', q: '#c23a5a' };
function sprite(rows, outline = '#120c18', mono = null, pal = null) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas'); c.width = w + 2; c.height = h + 2;
  const x = c.getContext('2d');
  const on = (i, j) => j >= 0 && j < h && i >= 0 && i < rows[j].length && rows[j][i] !== '.';
  if (outline) {
    x.fillStyle = outline;
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
      if (on(i, j)) continue;
      if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) x.fillRect(i + 1, j + 1, 1, 1);
    }
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) {
    const ch = rows[j][i]; if (ch === '.') continue;
    x.fillStyle = mono || (pal && pal[ch]) || PAL[ch] || '#f0f'; x.fillRect(i + 1, j + 1, 1, 1);
  }
  return c;
}
const ART = {
  // 尸犬：贴地的骨狗，侧面；骨弓手：戴灰兜帽的骷髅拉骨弓
  houndA: ['.........ww.', '........wkrw', '.g.....wwww.', 'gwbwbwbwbww.', '.wbwbwbwbg..', '..bggggggb..', '..w.w...w.w.', '.ww.w..ww.w.'],
  houndB: ['.........ww.', '........wkrw', '.g.....wwww.', 'gwbwbwbwbww.', '.wbwbwbwbg..', '..bggggggb..', '...w.w.w..w.', '..ww.ww.w.ww'],
  archerA: ['..SSSSS...', '.SSSSSSSn.', '.SkrwkrS.n', '.SwwgwwS.N', '..wkwkb..N', '...bbb...N', '.b.wbwbwwN', 'w.bwgwb..N', 'w..wbw...n', '...ggg..n.', '...w.b....', '...w.b....', '..ww.bb...'],
  archerB: ['..SSSSS...', '.SSSSSSSn.', '.SkrwkrS.n', '.SwwgwwS.N', '..wkwkb..N', '...bbb...N', '.b.wbwbwwN', 'w.bwgwb..N', '.w.wbw...n', '...ggg..n.', '..w...b...', '..w...b...', '.ww...bb..'],
  // 霜魂：飘着的冰蓝兜帽魂影，手里一团寒气（远程，寒霜）；下摆是碎冰拖尾，两帧摆动
  wraithA: ['...VVVV...', '..VvvvvV..', '.VvBBBBvV.', '.VBkllkBV.', '.VBBllBBV.', '..VvvvvV..', '.lVvBBvVl.', 'lvVBvvBVvl', '.l.VvvV.l.', '...VBBV...', '...vBBv...', '....Vv.l..', '...l..V...'],
  wraithB: ['...VVVV...', '..VvvvvV..', '.VvBBBBvV.', '.VBkllkBV.', '.VBBllBBV.', '..VvvvvV..', '.lVvBBvVl.', 'lvVBvvBVvl', '.l.VvvV.l.', '...VBBV...', '...vBBv...', '...lvV....', '....V..l..'],
  skelA: ['..wwwww..', '.wwwwwwb.', '.wkrwkrb.', '.wwwgwwb.', '..wkwkb..', '...bbb...', '.b.wbw.b.', 'w.bwgwb.w', 'w..wbw..w', '...ggg...', '...w.b...', '...w.b...', '..ww.bb..'],
  skelB: ['..wwwww..', '.wwwwwwb.', '.wkrwkrb.', '.wwwgwwb.', '..wkwkb..', '...bbb...', '.b.wbw.b.', 'w.bwgwb.w', '.w.wbw.w.', '...ggg...', '..w...b..', '..w...b..', '.ww...bb.'],
  armorA: ['..sssss..', '.sssssSS.', '.sSSSSSS.', '.wkrwkrb.', '..wkwkb..', '.sSsssSs.', 'sSsssssSs', 'w.sSsSs.w', 'w..sss..w', '...SSS...', '...w.b...', '...s.S...', '..ss.SS..'],
  armorB: ['..sssss..', '.sssssSS.', '.sSSSSSS.', '.wkrwkrb.', '..wkwkb..', '.sSsssSs.', 'sSsssssSs', '.wsSsSsw.', '...sss...', '...SSS...', '..w...b..', '..s...S..', '.ss...SS.'],
  thiefA: ['..ppppp..', '.pppppPP.', '.pkrwkrP.', '.pwwgwwP.', '..pkwkP..', '.ppPPPpp.', 'p.pPpPp.P', 'w.pPPPp.w', '...PPP...', '...p.P...', '...p.P...', '..kk.kk..'],
  thiefB: ['..ppppp..', '.pppppPP.', '.pkrwkrP.', '.pwwgwwP.', '..pkwkP..', '.ppPPPpp.', 'p.pPpPp.P', '.wpPPPpw.', '...PPP...', '..p...P..', '..p...P..', '.kk...kk.'],
  mageA: ['.......c.', '..wwwwwCc', '.wwwwwwbn', '.wkcwkcbn', '.wwwgwwbn', '..wkwkb.n', '.pPPPPPpn', 'p.pPpPp.n', 'w.pPPPp.n', '..pPPPPp.', '..pPPPPp.', '.pPPPPPPp'],
  mageB: ['........c', '..wwwwwcC', '.wwwwwwbn', '.wkcwkcbn', '.wwwgwwbn', '..wkwkb.n', '.pPPPPPpn', 'p.pPpPp.n', 'w.pPPPp.n', '..pPPPPp.', '..pPPPPp.', '..pPPPPPp'],
  bossA: ['...y.y.y.y.y...', '...yyyyyyyyy...', '...YyYyYyYyY...', '..wwwwwwwwwwb..', '.wwwwwwwwwwwwb.', '.wkkkwwwwkkkwb.', '.wkrkwwwwkrkwb.', '.wwwwwwgwwwwwb.', '..wwwwgggwwwb..', '..wkwkwkwkwkb..', '...wwwwwwwwb...', '.PPPpbwwwbpPPP.', 'PPPpwbgwgbwpPPP', 'PPpwwbwgwbwwpPP', 'PPp.wwbwbww.pPP', 'PP..wgbgbgw..PP', 'P...wbwgwbw...P', '....ggg.ggg....', '....wb...bw....', '....wb...bw....', '...www...www...'],
  bossB: ['...y.y.y.y.y...', '...yyyyyyyyy...', '...YyYyYyYyY...', '..wwwwwwwwwwb..', '.wwwwwwwwwwwwb.', '.wkkkwwwwkkkwb.', '.wkrkwwwwkrkwb.', '.wwwwwwgwwwwwb.', '..wwwwgggwwwb..', '..wkwkwkwkwkb..', '...wwwwwwwwb...', '.PPPpbwwwbpPPP.', 'PPPpwbgwgbwpPPP', 'PPpwwbwgwbwwpPP', 'PPp.wwbwbww.pPP', 'PP..wgbgbgw..PP', 'P...wbwgwbw...P', '....ggg.ggg....', '...wb.....bw...', '...wb.....bw...', '..www.....www..'],
  ghost: ['..cccc..', '.cccccc.', 'cckcckcc', 'cclcclcc', 'cccccccc', 'cccccccc', 'c.cc.cc.', '...c..c.'],
  chest: ['.NNNNNNNN.', 'NnnnnnnnnN', 'NnnnyynnnN', 'NNNNyYNNNN', 'NnnnnnnnnN', 'NnnnnnnnnN', 'NNNNNNNNNN'],
  chestG: ['.YYYYYYYY.', 'YyyyyyyyyY', 'YyyyrryyyY', 'YYYYrrYYYY', 'YyyyyyyyyY', 'YyyyyyyyyY', 'YYYYYYYYYY'],
  // 物品图标 12×12
  sword: ['..........vv', '.........vVv', '........vVv.', '.......vVv..', '......vVv...', '.....vVv....', '.y..vVv.....', '.yyvVv......', '..yyv.......', '.nyyy.......', 'nn..y.......', 'nn..........'],
  dagger: ['............', '..........v.', '.........vv.', '........vV..', '.......vV...', '......vV....', '...y.vV.....', '....yV......', '...nyy......', '..nn..y.....', '.nn.........', '............'],
  staff: ['.........oo.', '........ofoo', '........oooo', '.......nYoo.', '......nn....', '.....nn.....', '....nN......', '...nN.......', '..nN........', '.nN.........', 'nN..........', 'N...........'],
  axe: ['......lll...', '.....llvvl..', '....lvvvvl..', '...nlvvvl...', '..nN.lvl....', '.nN...l.....', 'nN..........', 'N...........', '............', '............', '............', '............'],
  scepter: ['........yBy.', '.......yBlBy', '........yBy.', '.......yY...', '......yY....', '.....nY.....', '....nN......', '...nN.......', '..nN........', '.nN.........', 'nN..........', '............'],
  hood: ['....pppp....', '...pppppp...', '..pppPPppp..', '..ppkkkkpp..', '.pppkrkrppp.', '.ppPkkkkPpp.', '.ppP....Ppp.', 'pppP....Pppp', 'ppPP....PPpp', 'pPP......PPp', '............', '............'],
  helm: ['....ssss....', '..ssvvvsss..', '.svvvssssSs.', '.svsssssSSs.', '.ssSSSSSSSs.', '.sSkkkkkkSs.', '.sSkSsSkkSs.', '.sSSSsSSSSs.', '..sSSsSSSs..', '...SS..SS...', '............', '............'],
  crown: ['............', '.w..w..w..w.', '.ww.ww.ww.ww', '.wwwwwwwwwww', '.wbwbwbwbwbw', '.wwrwwwwrwww', '.bbbbbbbbbbb', '............', '............', '............', '............', '............'],
  robe: ['...pp..pp...', '..ppPPPPpp..', '.ppPppppPpp.', '.pPppyyppPp.', '.pPpppppPPp.', '..pPppppPp..', '..pPpPPpPp..', '..pPppppPp..', '.ppPppppPpp.', '.pPPppppPPp.', '.pPPPPPPPPp.', '............'],
  armor: ['..bw....wb..', '.bwwbwwbwwb.', '.bwwwbbwwwb.', '..bwgwwgwb..', '..bwwggwwb..', '..bgwwwwgb..', '..bwwggwwb..', '...bwwwwb...', '...bgggb....', '............', '............', '............'],
  armorg: ['..Yy....yY..', '.Yyyyyyyyyy.', '.YyyyYYyyyY.', '..YyhyyhyY..', '..YyyhhyyY..', '..YhyyyyhY..', '..YyyhhyyY..', '...YyyyyY...', '...YhhhY....', '............', '............', '............'],
  mail: ['..sS....Ss..', '.ssSssssSss.', '.sSsSsSsSsS.', '..SsSsSsSs..', '..sSsSsSsS..', '..SsSsSsSs..', '..sSsSsSsS..', '...SsSsSs...', '...sSsSs....', '............', '............', '............'],
  ring: ['............', '....yyyy....', '...yY..Yy...', '..yY....Yy..', '..y......y..', '..y......y..', '..yY....Yy..', '...yY..Yy...', '....yyyy....', '............', '............', '............'],
  ringb: ['.....rr.....', '....rrrr....', '...wbrrbw...', '..wb....bw..', '..w......w..', '..w......w..', '..wb....bw..', '...wb..bw...', '....wwww....', '............', '............', '............'],
  ringm: ['.....ll.....', '....lvvl....', '...yllllY...', '..yY.ll.Yy..', '..y......y..', '..y......y..', '..yY....Yy..', '...yY..Yy...', '....yyyy....', '............', '............', '............'],
  ringd: ['....wwww....', '....wkwk....', '...ywwwwY...', '..yY.ww.Yy..', '..y......y..', '..y......y..', '..yY....Yy..', '...yY..Yy...', '....yyyy....', '............', '............', '............'],
  amulet: ['..g......g..', '...g....g...', '....g..g....', '.....gg.....', '....wwww....', '...wwbbww...', '...wbkkbw...', '...wwbbww...', '....wwww....', '.....ww.....', '............', '............'],
  amber: ['..g......g..', '...g....g...', '....g..g....', '.....gg.....', '....oooo....', '...ofooYo...', '...ooooYo...', '...oooYYo...', '....oYYo....', '.....oo.....', '............', '............'],
  flame: ['..g......g..', '...g....g...', '....g..g....', '.....gg.....', '.....cc.....', '....cllc....', '...cclllc...', '...cclllc...', '....cccc....', '.....CC.....', '............', '............'],
  heart: ['..g......g..', '...g....g...', '....g..g....', '...ee.ee....', '..eoooooe...', '..eofffoe...', '...eofoe....', '....eoe.....', '.....e......', '............', '............', '............'],
  lantern: ['.....YY.....', '....Y..Y....', '...YYYYYY...', '...YffffY...', '...YfoofY...', '...YfoofY...', '...YffffY...', '...YYYYYY...', '....YYYY....', '............', '............', '............'],
  scythe: ['...vvvvvv...', '.vvVVVVVVn..', 'vV......n...', 'v......n....', '......n.....', '.....n......', '....nN......', '...nN.......', '..nN........', '.nN.........', 'nN..........', '............'],
  // 新武器图标 12×12
  w_crossbow: ['............', '.s........s.', '..s......s..', '...s....s...', '....s..s....', '.nnnnnnnnnvv', '.Nn.s..s....', '.N.s....s...', '..s......s..', '.s........s.', '............', '............'],
  w_firepot: ['.....oy.....', '....oyfo....', '.....oo.....', '....NnnN....', '...nnnnnn...', '..nnnyynnn..', '..nnyeeynn..', '..nnnyynnN..', '...nnnnnN...', '....NNNN....', '............', '............'],
  w_lightrod: ['.........yy.', '........yffy', '........yffy', '.......nYyy.', '......nn....', '.....nn.....', '....nN......', '...nN.......', '..nN........', '.nN.........', 'nN..........', '............'],
  w_stormseal: ['..wwwwwww...', '..wbbbbbw...', '..wbBlbbw...', '..wbbBlbw...', '..wbBlbbw...', '..wbbBbbw...', '..wbbbbbw...', '..wwwwwww...', '....e.e.....', '....e..e....', '............', '............'],
  w_sickle: ['....vvvv....', '..vvVVVVv...', '.vV.....v...', '.v.........', 'v...........', 'v.....n.....', 'v....n......', '.v..n.......', '..vn........', '..n.........', '.N..........', '............'],
  w_bladering: ['.....v......', '....vV......', '..sssss.....', '.s.....s.vv.', '.s.....sVv..', 'vs..y..s....', 'Vs.....s....', '.s.....s....', '..sssss.....', '.....Vv.....', '......v.....', '............'],
  w_flameskull: ['...o..o.....', '..oeoeoeo...', '..eooooe....', '..wwwwww....', '.wwwwwwww...', '.wkkwwkkw...', '.wkowwkow...', '.wwwkkwww...', '..wbwbwb....', '..wwwwww....', '............', '............'],
  w_sporesac: ['.....m......', '....mgm.....', '...mmmmm....', '..mmMmmmm...', '.mmmmmMmmm..', '.mMmmmmmmm..', '.mmmmMmmMm..', '..mmmmmmm...', '...mMmmm....', '....mmm.....', '............', '............'],
  a_boneward: ['..wwwwwwww..', '.wbbbbbbbbw.', '.wbwwwwwwbw.', '.wbwbbbbwbw.', '.wbwbwwbwbw.', '.wbwbwwbwbw.', '..wbwbbwbw..', '..wbwwwwbw..', '...wbbbbw...', '....wbbw....', '.....ww.....', '............'],
  a_veilward: ['..cccccccc..', '.cCCCCCCCCc.', '.cCllllllCc.', '.cCllCClCCc.', '.cCllllllCc.', '.cCClCllCCc.', '..cCllllCc..', '..cCClClCc..', '...cCllCc...', '....cCCc....', '.....cc.....', '............'],
  a_tombward: ['...ssssss...', '..sVVVVVVs..', '.sVsssssVs..', '.sVsSSsssVs.', '.sVsSssssVs.', '.sVsSSsssVs.', '.sVsSssssVs.', '.sVssssssVs.', '.sVVVVVVVVs.', '.ssssssssss.', '............', '............'],
  a_heartstone: ['............', '..ee...ee...', '.eooe.eooe..', '.eofoeooooe.', '.eooooooooe.', '..eooooooe..', '...eooooe...', '....eooe....', '.....ee.....', '............', '............', '............'],
  a_soulgem: ['.....pp.....', '....pffp....', '...pfpPPp...', '..pfpPPPPp..', '.pPpPPPPPPp.', '.pPPPPPPPPp.', '..pPPPPPPp..', '...pPPPPp...', '....pPPp....', '.....pp.....', '............', '............'],
  a_shadowstep: ['............', '...PPP......', '...PpP......', '...PpP......', '...PpP......', '...PpPP.....', '..PppppPP...', '.PppppppPP..', '.PPPPPPPPPP.', '............', '............', '............'],
  a_emberstep: ['............', '...NNN......', '...NnN......', '...NnN......', '...NnN......', '...NnNN.....', '..NnnnnNN...', '.NnnnnnnNN..', '.NNNNNNNNNN.', '.o.e.o.e.o..', '............', '............'],
  a_stormstep: ['............', '...SSS......', '...SsS......', '...SsS......', '...SsS......', '...SsSS.....', '..SsssssSS..', '.SssssssSS..', '.SSSSSSSSSS.', '..l..B..l...', '............', '............'],
  a_circle: ['....gggg....', '..gg.y..gg..', '.g...y....g.', '.g.yyyyy..g.', 'g...y.y...g.', 'g..y...y..g.', '.g.yyyyy..g.', '.g........g.', '..gg....gg..', '....gggg....', '............', '............'],
  // 提灯亡魂（玩家）
  hero0: ['...PPP....', '..PpppP...', '.PpkkkpP..', '.Pkfkfkp..', '.PpkkkpP..', '..PpppP.Y.', '.PpppppPYY', '.PpPppPYfY', '.PpppppYoY', '..PpPpP.Y.', '..PpPpP...', '...P.P....'],
  hero1: ['...PPP....', '..PpppP...', '.PpkkkpP..', '.Pkfkfkp..', '.PpkkkpP..', '..PpppP.Y.', '.PpppppPYY', '.PpPppPYfY', '.PpppppYoY', '..PpPpP.Y.', '..PpPpP...', '..P.P.P...'],
  // 小图标
  skull: ['.wwww.', 'wwwwww', 'wkwwkw', 'wwggww', '.wkwk.'],
  torch: ['.o.', 'ofo', 'oyo', '.n.', '.n.', '.N.', '.N.'],
};

// 新图标：一部分是现有图标换色
const recolor = (rows, map) => rows.map(r => [...r].map(ch => map[ch] || ch).join(''));
const TRAP = ['............', '............', '....xxxx....', '...xXXXXx...', '..xXyXXyXx..', '.sxXXXXXXxs.', '.SsxxxxxxsS.', '..SSSSSSSS..', '............', '............', '............', '............'];
Object.assign(ART, {
  w_censer: ['.....nn.....', '......n.....', '..m...n..m..', '.m.m.YYY.m..', '....YyyyY...', '...YyhhhyY..', '...YhmmmhY..', '...YyhhhyY..', '....YyyyY...', '.....YYY....', '......Y.....', '............'],
  w_maul: ['..ssssss....', '.sSSSSSSs...', '.sSwwwwSs...', '.sSSSSSSs...', '..ssnsss....', '.....n......', '....nN......', '...nN.......', '..nN........', '.nN.........', 'nN..........', '............'],
  w_bell: ['.....yy.....', '....yYYy....', '...yYffYy...', '...yYffYy...', '..yYYffYYy..', '..yYfffYYy..', '.yYYYYYYYYy.', '.yyyyyyyyyy.', '.....YY.....', '............', '............', '............'],
  w_frostorb: ['............', '....wllw....', '...lBBBBl...', '..lBwlBBBl..', '..lBlBBBBl..', '..lBBBBBBl..', '..lBBBBBBl..', '...lBBBBl...', '....llll....', '.....nn.....', '....nnnn....', '............'],
  w_starrod: ['.........oy.', '........oyfo', '.........oo.', '........n...', '.......n....', '......n.....', '.....n......', '....n.......', '...N........', '..N.........', '.N..........', '............'],
  w_frostbell: ['.....ll.....', '....lBBl....', '...lBwwBl...', '...lBwwBl...', '..lBBwwBBl..', '..lBwwwBBl..', '.lBBBBBBBBl.', '.llllllllll.', '.....BB.....', '....w..w....', '............', '............'],
  w_piercer: recolor(['............', '.s........s.', '..s......s..', '...s....s...', '....s..s....', '.nnnnnnnnnvv', '.Nn.s..s....', '.N.s....s...', '..s......s..', '.s........s.', '............', '............'], { s: 'q', n: 'h', N: 'k' }),
  w_trap_exp: recolor(TRAP, { x: 'N', X: 'o', y: 'e' }), w_trap_pla: recolor(TRAP, { x: 'Y', X: 'y', y: 'f' }),
  w_trap_ele: recolor(TRAP, { x: 'B', X: 'l', y: 'v' }), w_trap_kin: recolor(TRAP, { x: 'b', X: 'w', y: 'g' }), w_trap_nuc: recolor(TRAP, { x: 'h', X: 'm', y: 'g' }),
  w_scatter: ['............', '............', '.......vvvv.', '.nnnnnnVVVVv', '.NnnnnnVVVV.', 'NNn.n.......', 'NN..n.......', 'N...........', '............', '............', '............', '............'],
  w_orrery: ['.....m......', '...mmmmm....', '..m.....m...', '.m..YYY..m..', '.m.YmmmY.m..', 'mm.YmhmY.mm.', '.m.YmmmY.m..', '.m..YYY..m..', '..m.....m...', '...mmmmm....', '.....m......', '............'],
  w_firewheel: ['....e..e....', '..e.oooo.e..', '...oyyyyo...', '.eoy....yoe.', '..oy.nn.yo..', '..oy.nn.yo..', '.eoy....yoe.', '...oyyyyo...', '..e.oooo.e..', '....e..e....', '............', '............'],
  w_wisp: ['.....l......', '....lvl.....', '...lvvvl....', '..lvBvBvl...', '..lvvvvvl...', '...lvvvl....', '....lBl.....', '...l.l.l....', '..l..l..l...', '............', '............', '............'],
  w_thorns: ['..w..w..w...', '.wbw.bw.bw..', '..nnnnnnnn..', '.wnNNNNNNnw.', '..nNnnnnNn..', '.bnNnwwnNnb.', '..nNnnnnNn..', '.wnNNNNNNnw.', '..nnnnnnnn..', '.bw.wb.wb...', '..w..w..w...', '............'],
  w_spike: ['.....w......', '.....w......', '....wbw.....', '..w.wbw.w...', '..w.wbw.w...', '.wbwbgbwbw..', '.wbwbgbwbw..', 'gggggggggg..', '.hhhhhhhh...', '............', '............', '............'],
  w_holygun: ['............', '..........y.', '.......yyyyf', '.YYYYYYYYYy.', '.YyyyyyyY...', 'nnY.Y.......', 'nN..Y.......', 'N...........', '............', '............', '............', '............'],
  w_lightscythe: recolor(['...vvvvvv...', '.vvVVVVVVn..', 'vV......n...', 'v......n....', '......n.....', '.....n......', '....nN......', '...nN.......', '..nN........', '.nN.........', 'nN..........', '............'], { v: 'y', V: 'f', n: 'Y', N: 'n' }),
  a_phantomward: recolor(['..wwwwwwww..', '.wbbbbbbbbw.', '.wbwwwwwwbw.', '.wbwbbbbwbw.', '.wbwbwwbwbw.', '.wbwbwwbwbw.', '..wbwbbwbw..', '..wbwwwwbw..', '...wbbbbw...', '....wbbw....', '.....ww.....', '............'], { w: 'v', b: 'p' }),
  a_crystalward: recolor(['..cccccccc..', '.cCCCCCCCCc.', '.cCllllllCc.', '.cCllCClCCc.', '.cCllllllCc.', '.cCClCllCCc.', '..cCllllCc..', '..cCClClCc..', '...cCllCc...', '....cCCc....', '.....cc.....', '............'], { c: 'l', C: 'B', l: 'v' }),
  a_shadeward: recolor(['..cccccccc..', '.cCCCCCCCCc.', '.cCllllllCc.', '.cCllCClCCc.', '.cCllllllCc.', '.cCClCllCCc.', '..cCllllCc..', '..cCClClCc..', '...cCllCc...', '....cCCc....', '.....cc.....', '............'], { c: 'p', C: 'P', l: 'k' }),
  a_phantomcore: recolor(['.....pp.....', '....pffp....', '...pfpPPp...', '..pfpPPPPp..', '.pPpPPPPPPp.', '.pPPPPPPPPp.', '..pPPPPPPp..', '...pPPPPp...', '....pPPp....', '.....pp.....', '............', '............'], { p: 'v', P: 'V' }),
  a_crystalcore: recolor(['.....pp.....', '....pffp....', '...pfpPPp...', '..pfpPPPPp..', '.pPpPPPPPPp.', '.pPPPPPPPPp.', '..pPPPPPPp..', '...pPPPPp...', '....pPPp....', '.....pp.....', '............', '............'], { p: 'l', P: 'B' }),
  a_shadecore: recolor(['.....pp.....', '....pffp....', '...pfpPPp...', '..pfpPPPPp..', '.pPpPPPPPPp.', '.pPPPPPPPPp.', '..pPPPPPPp..', '...pPPPPp...', '....pPPp....', '.....pp.....', '............', '............'], { p: 'P', P: 'k', f: 'p' }),
  a_stitchcore: ['............', '..ee...ee...', '.eqqe.eqqe..', '.eqwqeqqqqe.', '.eqqwqwqqqe.', '..eqqwqqqe..', '...eqwqqe...', '....eqqe....', '.....ee.....', '............', '............', '............'],
  a_soulstep: recolor(['............', '...PPP......', '...PpP......', '...PpP......', '...PpP......', '...PpPP.....', '..PppppPP...', '.PppppppPP..', '.PPPPPPPPPP.', '............', '............', '............'], { P: 'Y', p: 'y' }).map((r, i) => i === 9 ? '..f..f..f...' : r),
  a_plaguestep: recolor(['............', '...NNN......', '...NnN......', '...NnN......', '...NnN......', '...NnNN.....', '..NnnnnNN...', '.NnnnnnnNN..', '.NNNNNNNNNN.', '.m.g.m.g.m..', '............', '............'], { N: 'h', n: 'm' }),
  a_voidstep: recolor(['............', '...PPP......', '...PpP......', '...PpP......', '...PpP......', '...PpPP.....', '..PppppPP...', '.PppppppPP..', '.PPPPPPPPPP.', '..k.pkp.k...', '............', '............'], { P: 'k', p: 'P' }),
  a_doomstep: recolor(['............', '...NNN......', '...NnN......', '...NnN......', '...NnN......', '...NnNN.....', '..NnnnnNN...', '.NnnnnnnNN..', '.NNNNNNNNNN.', 'e.o.e.o.e.o.', '............', '............'], { N: 'k', n: 'e' }),
});
const CIRCLE = ['....gggg....', '..gg.y..gg..', '.g...y....g.', '.g.yyyyy..g.', 'g...y.y...g.', 'g..y...y..g.', '.g.yyyyy..g.', '.g........g.', '..gg....gg..', '....gggg....', '............', '............'];
Object.assign(ART, { a_circle_exp: recolor(CIRCLE, { y: 'o' }), a_circle_ele: recolor(CIRCLE, { y: 'l' }), a_circle_pla: recolor(CIRCLE, { y: 'f' }), a_circle_kin: recolor(CIRCLE, { y: 'w', g: 'S' }), a_circle_nuc: recolor(CIRCLE, { y: 'm' }), a_circle_cold: recolor(CIRCLE, { y: 'l', g: 'V' }) });
const SPR = {};
function silhouette(c, color) {
  const s = document.createElement('canvas'); s.width = c.width; s.height = c.height;
  const x = s.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, s.width, s.height);
  return s;
}
function buildSprites() {
  for (const B of BOSSES) { ART['boss_' + B.id + 'A'] = recolor(ART.bossA, B.pal); ART['boss_' + B.id + 'B'] = recolor(ART.bossB, B.pal); }
  for (const k of MOB_SPR) {
    SPR[k] = [0, 1].map(f => {
      const rows = ART[k + (f ? 'B' : 'A')];
      const base = sprite(rows);
      return { n: base, e1: sprite(rows, '#4f8dff'), e2: sprite(rows, '#ffd23a'), fl: silhouette(base, '#ffffff'), ice: silhouette(base, '#9fe8ff') };
    });
  }
  SPR.ghost = sprite(ART.ghost, '#0b3b40');
  SPR.chest = sprite(ART.chest); SPR.chestG = sprite(ART.chestG);
  SPR.chestFl = silhouette(SPR.chest, '#fff'); SPR.chestGFl = silhouette(SPR.chestG, '#fff');
  SPR.skull = sprite(ART.skull); SPR.torch = sprite(ART.torch);
  SPR.icons = {};
  for (const k of ['sword', 'dagger', 'staff', 'axe', 'scepter', 'hood', 'helm', 'crown', 'robe', 'armor', 'armorg', 'mail', 'ring', 'ringb', 'ringm', 'ringd', 'amulet', 'amber', 'flame', 'heart', 'lantern', 'scythe']) SPR.icons[k] = sprite(ART[k]);
  for (const k in ART) if (/^[wa]_/.test(k)) SPR.icons[k] = sprite(ART[k]);
  SPR.hero = [sprite(ART.hero0), sprite(ART.hero1)]; SPR.heroFl = SPR.hero.map(c => silhouette(c, '#ffffff'));
  SPR.shard = sprite(ART.shard); SPR.glyphs = {}; for (const g of GLYPHS) SPR.glyphs[g.id] = makeGlyph(g.c);
  SPR.mods = {}; for (const m of MODS) SPR.mods[m.id] = makeGem(modColor(m));
}
// 铸符：刻着彩色符号的小石板
function makeGlyph(col) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 10; const x = c.getContext('2d');
  x.fillStyle = '#120c18'; x.fillRect(1, 0, 6, 10); x.fillRect(0, 1, 8, 8);
  x.fillStyle = '#5d6678'; x.fillRect(1, 1, 6, 8); x.fillStyle = '#8b95a3'; x.fillRect(1, 1, 6, 1); x.fillRect(1, 1, 1, 7);
  x.fillStyle = col; x.fillRect(3, 2, 2, 1); x.fillRect(4, 3, 1, 3); x.fillRect(2, 4, 4, 1); x.fillRect(3, 7, 2, 1);
  return c;
}
// 模组图标：按类别上色的宝石
function modColor(m) {
  const a = MOD_BY[m.id] || m; if (a.field) return '#57e0d0';
  const el = { Debris: 'kin', Kinetic: 'kin', SteamHammer: 'kin', Aftershock: 'exp', Inferno: 'exp', Shock: 'ele', Electric: 'ele', Blind: 'pla', Plasma: 'pla', Radiation: 'nuc', Agony: 'nuc' }[a.id];
  if (el) return ELEM_C[el];
  if (['Pierce', 'Chain', 'Split', 'Boomerang', 'RapidProjectiles', 'Range'].includes(a.id)) return '#c08aff';
  if (['Rigor', 'Lethal', 'DeathThreshold', 'Purity', 'Thermal'].includes(a.id)) return '#ffd75e';
  return '#ff8a7a';
}
function makeGem(col) {
  return sprite(['...cc...', '..cwcc..', '.cwcccc.', 'cccccccd', 'dcccccdd', '.dcccdd.', '..dddd..', '...dd...'].map(r => r), '#120c18', null, { c: col, w: '#ffffff', d: shade(col, -0.35) });
}
function shade(hexc, k) { const n = parseInt(hexc.slice(1), 16); const f = v => clamp(Math.round(v * (1 + k)), 0, 255); const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255); return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
function makeCoins(c1, c2, c3) {
  return [5, 3, 1, 3].map(w => {
    const c = document.createElement('canvas'); c.width = 7; c.height = 7; const x = c.getContext('2d');
    const ox = (7 - (w + 2)) / 2 | 0;
    x.fillStyle = '#120c18'; x.fillRect(ox + 1, 0, w, 7); x.fillRect(ox, 1, w + 2, 5);
    x.fillStyle = c1; x.fillRect(ox + 1, 1, w, 5);
    x.fillStyle = c2; x.fillRect(ox + 1, 5, w, 1); if (w > 1) x.fillRect(ox + w, 1, 1, 5);
    x.fillStyle = c3; x.fillRect(ox + 1, 1, 1, w > 1 ? 2 : 1);
    return c;
  });
}
let DUST_ICON, SOUL_ICON;
const GLOW = (() => { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); const g = x.createRadialGradient(48, 48, 0, 48, 48, 48); g.addColorStop(0, '#ffb060'); g.addColorStop(.5, 'rgba(255,120,40,.35)'); g.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 96, 96); return c; })();

// 3×5 像素数字
const FONT = { '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', '.': '000000000000010', 'K': '101101110101101', 'M': '101111111101101', 'B': '110101110101110', 'T': '111010010010010', '!': '010010010000010', '+': '000010111010000', 'x': '000101010101000', '/': '001001010100100', 'Q': '111101101111011', 'a': '000011101101011', 'i': '010000010010010', 'S': '011100010001110', ':': '000010000010000', '-': '000000111000000', 's': '000011110001110' };
function makeSmallIcons() {
  DUST_ICON = sprite(['..bb..', '.bwwb.', 'bwwbgb', 'bbgggb', '.gggg.']);
  SOUL_ICON = sprite(['..P..', '.PpP.', 'PpfpP', 'PpppP', '.PPP.']);
}
Object.assign(ART, {
  anvil: ['............', '............', 'ssssssssss..', 'sSSSSSSSSSs.', '.sSSSSSSSs..', '...sSSSs....', '...sSSSs....', '..ssSSSss...', '.sSSSSSSSs..', '............'],
  star: ['.....y......', '.....y......', '....yyy.....', 'yyyyyfyyyy..', '.yyyfffyy...', '..yyyyyy....', '..yy..yy....', '.y......y...'],
  shard: ['..w', '.wb', 'wbg', 'bg.', 'g..'],
  ladder: ['..y......y..', '..N......N..', '..NnnnnnnN..', '..N......N..', '..N......N..', '..NnnnnnnN..', '..N......N..', '..N......N..', '..NnnnnnnN..', '..N......N..'],
  book: ['.NNNNNNNN...', '.NnnnnnnNw..', '.NnyyyynNw..', '.NnnnnnnNw..', '.NnnnnnnNw..', '.NnnnnnnNw..', '.NnnnnnnNw..', '.NNNNNNNNw..', '..wwwwwwww..'],
  soulf: ['....p...', '...pP...', '..pPfp..', '..pffp..', '.pPffPp.', '.pPffPp.', '..pPPp..'],
  cursor: ['w....', 'ww...', 'www..', 'wwww.', 'wwwww', 'www..', 'w.ww.', '...w.'],
  up: ['..g..', '.ggg.', 'ggggg'],
});
PAL.g2 = '#86e07b';

/* ---------- 纸娃娃：亡魂身上显示当前装备 ---------- */
// 身体 12×14，朝右。F = 遁靴，b = 手
const DOLL_BODY = [
  ['....PPPP....', '...PppppP...', '..PppkkkpP..', '..Ppkfkfkp..', '..PppkkkpP..', '...PppppP...', '..PpppppppP.', '.bPppGpppPb.', '..PpppppppP.', '..PpPppPpP..', '..PppppppP..', '..PpPppPpP..', '...FF..FF...', '..FFF..FFF..'],
  ['....PPPP....', '...PppppP...', '..PppkkkpP..', '..Ppkfkfkp..', '..PppkkkpP..', '...PppppP...', '..PpppppppP.', '.bPppGpppPb.', '..PpppppppP.', '..PpPppPpP..', '..PppppppP..', '..PpPppPpP..', '..FF....FF..', '.FFF....FFF.'],
];
const DOLL_HAND = { back: [1, 7], front: [10, 7] };
// 手持武器小图：rows + 握把位置
const HELD = {
  Cannon: [['.s..s..', '..ss...', 'nnnnnnv', '..ss...', '.s..s..'], 1, 2],
  Rocket: [['..oy.', '.oyo.', '.NnN.', 'nnnnn', 'nnynn', '.nnn.'], 2, 4],
  Laser: [['....yy', '...yfy', '...nY.', '..n...', '.n....', 'n.....'], 1, 4],
  Taser: [['wwww', 'wBlw', 'wlBw', 'wwww', '.e.e'], 0, 2],
  PlutoniumBar: [['..n..', '..n..', '.YYY.', 'YmhmY', '.YYY.'], 2, 0],
  Hullbreaker: [['sssss', 'sSwSs', 'sssss', '..n..', '..n..', '..N..', '..N..'], 2, 5],
  TurbineBlades: [['..v..', '.sss.', 'vs.sv', '.sss.', '..v..'], 0, 2],
  PlasmaNova: [['..Y..', '.yyy.', '.yfy.', 'yyyyy', '..f..'], 2, 0],
  FrostOrb: [['.lwl.', 'lBBBl', 'lBBBl', '.lll.', '..n..'], 0, 4],
  StarfallRod: [['...oy', '..nfo', '.n...', 'n....', 'N....'], 0, 4],
  FrostBell: [['..B..', '.lll.', '.lwl.', 'lllll', '..w..'], 2, 0],
  Railgun: [['.q..q..', '..qq...', 'hhhhhhv', '..qq...', '.q..q..'], 1, 2],
  BlastMine: [['.NN.', 'NooN', 'sNNs'], 1, 1], PlasmaMine: [['.YY.', 'YyyY', 'sYYs'], 1, 1], StormMine: [['.BB.', 'BllB', 'sBBs'], 1, 1],
  ShrapnelMine: [['.bb.', 'bwwb', 'sbbs'], 1, 1], WasteMine: [['.hh.', 'hmmh', 'shhs'], 1, 1],
  Blastgun: [['....vv', 'nnnVVV', 'Nn....', 'N.....'], 1, 2],
  Orbitron: [['.m.m.', 'm.Y.m', '.YmY.', 'm.Y.m', '.m.m.'], 2, 4],
  FlameSlinger: [['.oeo.', 'oy.yo', 'e.n.e', 'oy.yo', '.oeo.'], 2, 2],
  Zapper: [['.l.', 'lvl', '.B.'], 1, 3],
  SporeBlaster: [['..m..', '.mMm.', 'mmmMm', '.mmm.'], 2, 3],
  Thorns: [['w.w', 'nnn', 'w.w'], 1, 1],
  Spikes: [['...w', '..wb', '.wb.', 'nb..', 'N...'], 0, 4],
  PlasmaBlaster: [['....y.', 'YYYYyf', 'Yyy...', 'nY....', 'N.....'], 0, 3],
  FlameThrower: [['.o.o.', 'wwwww', 'wkwkw', '.www.'], 2, 3],
  Shuriken: [['.vvv.', 'v...v', 'v....', '.n...', 'n....'], 0, 4],
  PlasmaCutter: [['yyyy..', 'f...Y.', '...Y..', '..Y...', '.Y....', 'n.....'], 0, 5],
};
const SHIELD_DOLL = ['.xxx.', 'xXXXx', 'xXyXx', 'xXXXx', '.xXx.', '..x..'];
const SHIELD_COL = { SigilShield: ['y', 'Y'], TitaniumShield: ['b', 'w'], PhantomShield: ['p', 'v'], NebulaShield: ['C', 'c'], CrystalShield: ['B', 'l'], EtherealShield: ['P', 'p'], PolymerShield: ['q', 'e'] };
const BOOT_COL = { Thruster: 'P', Warp: 'Y', Afterburner: 'e', FusionDrive: 'm', EMP: 'B', BlackHoleWarp: 'k', Annihilator: 'o' };
// 头冠图标（复用旧的兜帽 / 头盔 / 王冠图）
Object.assign(ART, {
  a_helm: ART.helm, a_phantomhood: recolor(ART.hood, { p: 'v', P: 'V' }), a_veilcrown: recolor(ART.crown, { w: 'c', b: 'C', r: 'l' }),
  a_crystalcrown: recolor(ART.crown, { w: 'l', b: 'B', r: 'v' }), a_shadehood: recolor(ART.hood, { p: 'P', P: 'k', r: 'p' }),
  a_map: ['............', '.NnnnnnnnnN.', '.nffffffffn.', '.nfbffffffn.', '.nffbbfffff.', '.nffffbfrfn.', '.nffffbrffn.', '.nffffrfrfn.', '.nfffffffbn.', '.nffffffffn.', '.NnnnnnnnnN.', '............'],
  a_sigil: ['............', '.....kk.....', '....kvvk....', '...kvllvk...', '..kvlwwlvk..', '.kvlw..wlvk.', '.kvlw..wlvk.', '..kvlwwlvk..', '...kvllvk...', '....kvvk....', '.....kk.....', '............'],
  a_sigil_e: ['............', '.....kk.....', '....koOk....', '...koyyok...', '..koywwyok..', '.koyw..wyok.', '.koyw..wyok.', '..koywwyok..', '...koyyok...', '....koOk....', '.....kk.....', '............'],
  a_mask: ['............', '...wwwwww...', '..wwbwwbww..', '..wkkwwkkw..', '..wwwqqwww..', '..wbwqqwbw..', '...wqwwqw...', '...wwqqww...', '....wwww....', '............', '............', '............'],
});
// 头冠在纸娃娃上：换兜帽颜色，或者叠一层头饰
const HEAD_DOLL = {
  TitaniumCore: { over: ['..ssss..', '.sSvvSs.', 'sSSSSSSs'], ox: 2, oy: -1 },
  PhantomCore: { hood: { P: 'V', p: 'v' } },
  NebulaCore: { over: ['c..cc..c', '.cCCCCc.'], ox: 2, oy: -2 },
  CrystalCore: { over: ['l..l..l.', 'lB.lB.lB', 'BBBBBBBB'], ox: 2, oy: -2 },
  EtherealCore: { hood: { P: 'k', p: 'P' } },
  PolymerCore: { over: ['wwwwww', 'wkqqkw', 'wwqqww'], ox: 3, oy: 2 },
};
const DOLL_W = 26, DOLL_H = 18, DOLL_OX = 7, DOLL_OY = 4;
const dollSig = eq => ['wl', 'wr', 'shield', 'core', 'engine'].map(k => eq[k] ? eq[k].b : '-').join('|');
// 画出一帧纸娃娃（outline 后的画布）
// view：0 正面，1 侧面，2 背面（旋风斩转身用）。侧面把身子压窄、脸只露一只眼在边上；背面盖住脸、两手的武器前后对调
const DOLL_SIDE = r => (r.slice(2, 10) + '').padEnd(8, '.');
function dollCanvas(eq, fr, view = 0) {
  const c = document.createElement('canvas'); c.width = DOLL_W; c.height = DOLL_H; const x = c.getContext('2d');
  const put = (img, dx, dy, alpha = 1) => { x.globalAlpha = alpha; x.drawImage(img, dx, dy); x.globalAlpha = 1; };
  // 盾：背在身后
  if (eq.shield) { const [a, b] = SHIELD_COL[eq.shield.b] || ['b', 'w']; put(sprite(recolor(SHIELD_DOLL, { x: a, X: b, y: 'y' })), DOLL_OX - 2, DOLL_OY + 4); }
  // 副手武器（右手槽）在身后
  const held = (it, hand, alpha) => { if (!it) return; const h = HELD[it.b]; if (!h) return; const [rows, ax, ay] = h; const [hx, hy] = DOLL_HAND[hand]; put(sprite(rows), DOLL_OX + hx - ax - 1, DOLL_OY + hy - ay - 1, alpha); };
  if (view === 2) held(eq.wl, 'back', 0.85); else if (view === 0) held(eq.wr, 'back', 0.85);
  const boots = eq.engine ? BOOT_COL[eq.engine.b] || 'P' : 'k';
  const hd = eq.core ? HEAD_DOLL[eq.core.b] || {} : {};
  let rows = DOLL_BODY[fr];
  if (view === 2) rows = rows.map((r, j) => j >= 2 && j <= 4 ? r.replace(/[kf]/g, 'p') : r);
  if (view === 1) rows = rows.map((r, j) => { let q = DOLL_SIDE(r); if (j >= 2 && j <= 4) q = q.replace(/[kf]/g, 'p').slice(0, 5) + (j === 3 ? 'kf' : 'kk') + q[7]; return q; });
  const body = rows.map((r, j) => j <= 5 && hd.hood ? recolor([r], hd.hood)[0] : r), bx = view === 1 ? DOLL_OX + 1 : DOLL_OX - 1;
  put(sprite(recolor(body, { F: boots, G: 'p', b: 'w' })), bx, DOLL_OY - 1);
  if (hd.over && view !== 1) put(sprite(hd.over), DOLL_OX + hd.ox - 1, DOLL_OY + hd.oy - 1);
  if (view === 0) held(eq.wl, 'front', 1); else if (view === 2) held(eq.wr, 'front', 1);
  else if (eq.wl) { const h = HELD[eq.wl.b]; if (h) { const [hr, ax, ay] = h; put(sprite(hr), DOLL_OX + 9 - ax, DOLL_OY + 7 - ay - 1); } } // 侧面：武器伸在身前
  return c;
}
