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
/* ---------- 明亮改版像素美术（data/artpack.json → vendor/artpack.js）：启动前解码成画布，有图就用新图 ---------- */
const ARTC = {};
const ART_READY = typeof window !== 'undefined' && window.ART_PACK ? Promise.all(Object.entries(window.ART_PACK).map(([k, a]) => new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = a.w; c.height = a.h; c.getContext('2d').drawImage(im, 0, 0); ARTC[k] = c; res(); }; im.onerror = () => res(); im.src = a.img; }))) : Promise.resolve();
const NEW_ART = !!(typeof window !== 'undefined' && window.ART_PACK && window.ART_PACK.hero_f0);
const MOB_ART = { skel: 'm_skel', thief: 'm_thief', armor: 'm_armor', mage: 'm_mage', hound: 'm_hound', archer: 'm_archer', wraith: 'm_wraith', boss: 'b_lord', boss_lord: 'b_lord', boss_moon: 'b_moon', boss_bog: 'b_bog', boss_storm: 'b_storm' };
// 图四周加 1 像素：col 给了就是这个颜色的描边（精英金边、蓝边），没给就是透明边（和描边版尺寸一致）
function padOutline(src, col) {
  const c = document.createElement('canvas'); c.width = src.width + 2; c.height = src.height + 2; const x = c.getContext('2d');
  if (col) { const s = silhouette(src, col); for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) x.drawImage(s, dx, dy); }
  x.drawImage(src, 1, 1); return c;
}
const copyCv = src => { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c; }; // 登记成贴图时用副本：Phaser 删贴图会回收画布，原图还要反复用
const flipCv = src => { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; };
function buildSprites() {
  for (const B of BOSSES) { ART['boss_' + B.id + 'A'] = recolor(ART.bossA, B.pal); ART['boss_' + B.id + 'B'] = recolor(ART.bossB, B.pal); }
  for (const k of MOB_SPR) {
    SPR[k] = [0, 1].map(f => {
      const nk = MOB_ART[k] && ARTC[MOB_ART[k] + (f ? 'B' : 'A')];
      if (nk) { const base = padOutline(nk); return { n: base, e1: padOutline(nk, '#4f8dff'), e2: padOutline(nk, '#ffd23a'), fl: silhouette(base, '#ffffff'), ice: silhouette(base, '#9fe8ff') }; } // 明亮改版的新怪物图
      const rows = ART[k + (f ? 'B' : 'A')];
      const base = sprite(rows);
      return { n: base, e1: sprite(rows, '#4f8dff'), e2: sprite(rows, '#ffd23a'), fl: silhouette(base, '#ffffff'), ice: silhouette(base, '#9fe8ff') };
    });
  }
  SPR.ghost = sprite(ART.ghost, '#0b3b40');
  SPR.chest = ARTC.p_chest ? padOutline(ARTC.p_chest) : sprite(ART.chest); SPR.chestG = ARTC.p_chestG ? padOutline(ARTC.p_chestG) : sprite(ART.chestG);
  SPR.chestFl = silhouette(SPR.chest, '#fff'); SPR.chestGFl = silhouette(SPR.chestG, '#fff');
  SPR.skull = ARTC.p_skull ? copyCv(ARTC.p_skull) : sprite(ART.skull); SPR.torch = ARTC.p_torch ? copyCv(ARTC.p_torch) : sprite(ART.torch);
  SPR.icons = {};
  for (const k of ['sword', 'dagger', 'staff', 'axe', 'scepter', 'hood', 'helm', 'crown', 'robe', 'armor', 'armorg', 'mail', 'ring', 'ringb', 'ringm', 'ringd', 'amulet', 'amber', 'flame', 'heart', 'lantern', 'scythe']) SPR.icons[k] = sprite(ART[k]);
  for (const k in ART) if (/^[wao]_/.test(k)) SPR.icons[k] = sprite(ART[k]);
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
  const el = { Debris: 'kin', Kinetic: 'kin', SteamHammer: 'kin', ConvKin: 'kin', ConvExp: 'exp', ConvEle: 'ele', ConvCold: 'cold', ConvPla: 'pla', ConvNuc: 'nuc', Aftershock: 'exp', Inferno: 'exp', Shock: 'ele', Electric: 'ele', Blind: 'pla', Plasma: 'pla', Radiation: 'nuc', Agony: 'nuc' }[a.id];
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
// gear-v3 新部位（像素版，战场掉落用；界面用 62_icons 的矢量图）：复用旧的戒指 / 项链 / 甲胄图
Object.assign(ART, { a_ring_bone: ART.ring, a_ring_crystal: ART.ringb, a_ring_blood: ART.ringm, a_ring_lamp: ART.ringd, a_amulet_bone: ART.amulet, a_amulet_soul: recolor(ART.amulet, { y: 'v', Y: 'V' }), a_amulet_rune: recolor(ART.amulet, { y: 'c', Y: 'C' }),
  a_chest_bone: ART.armor, a_chest_shroud: ART.robe, a_chest_robe: recolor(ART.robe, { p: 'v', P: 'V' }), a_glove_bone: ART.armorg, a_glove_claw: ART.armorg, a_glove_wrap: ART.armorg, a_shoulder_bone: ART.mail, a_shoulder_spike: ART.mail, a_shoulder_ash: ART.mail });
// 头冠图标（复用旧的兜帽 / 头盔 / 王冠图）
Object.assign(ART, {
  a_helm: ART.helm, a_phantomhood: recolor(ART.hood, { p: 'v', P: 'V' }), a_veilcrown: recolor(ART.crown, { w: 'c', b: 'C', r: 'l' }),
  a_crystalcrown: recolor(ART.crown, { w: 'l', b: 'B', r: 'v' }), a_shadehood: recolor(ART.hood, { p: 'P', P: 'k', r: 'p' }),
  a_map: ['............', '.NnnnnnnnnN.', '.nffffffffn.', '.nfbffffffn.', '.nffbbfffff.', '.nffffbfrfn.', '.nffffbrffn.', '.nffffrfrfn.', '.nfffffffbn.', '.nffffffffn.', '.NnnnnnnnnN.', '............'],
  a_sigil: ['............', '.....kk.....', '....kvvk....', '...kvllvk...', '..kvlwwlvk..', '.kvlw..wlvk.', '.kvlw..wlvk.', '..kvlwwlvk..', '...kvllvk...', '....kvvk....', '.....kk.....', '............'],
  a_sigil_e: ['............', '.....kk.....', '....koOk....', '...koyyok...', '..koywwyok..', '.koyw..wyok.', '.koyw..wyok.', '..koywwyok..', '...koyyok...', '....koOk....', '.....kk.....', '............'],
  a_mask: ['............', '...wwwwww...', '..wwbwwbww..', '..wkkwwkkw..', '..wwwqqwww..', '..wbwqqwbw..', '...wqwwqw...', '...wwqqww...', '....wwww....', '............', '............', '............'],
});
// 副手图标 12×12（箭袋 / 法源 / 香炉 / 图腾 / 提灯）
Object.assign(ART, {
  o_quiver: ['.......w.w..', '......wbwb..', '.....N.v.v..', '....NnNv.v..', '...NnnNnv...', '...nnnnNn...', '..NnnnnN....', '..nnnnNn....', '.NnnnnN.....', '.nnnnNn.....', '.NnnN.......', '..NN........'],
  o_source: ['.....pp.....', '....pPPp....', '...pPllPp...', '..pPlwwlPp..', '..pPlwwlPp..', '...pPllPp...', '....pPPp....', '.....pp.....', '....kVVk....', '...kVvvVk...', '...kkkkkk...', '............'],
  o_censer: ['.....o......', '....oyo.....', '.....o......', '...NNNNN....', '..NnnnnnN...', '.NnyonyonN..', '.NnnnnnnnN..', '..NnnnnnN...', '...NNNNN....', '....N.N.....', '...NN.NN....', '............'],
  o_totem: ['...wwwww....', '..wbwwwbw...', '..wkwwwkw...', '..wwbbbww...', '...wkwkw....', '....nnn.....', '...yYyYy....', '...YyYyY....', '....nnn.....', '....nNn.....', '....nNn.....', '....NNN.....'],
  o_lantern: ['.....kk.....', '....k..k....', '...kkkkkk...', '...kcCCck...', '..kcCllCck..', '..kCllwlCk..', '..kCllllCk..', '..kcCllCck..', '...kcCCck...', '...kkkkkk...', '....kkkk....', '............'],
});
// 副手在纸娃娃手上（小图，[行, 握点 x, 握点 y]）
Object.assign(HELD, { BoneQuiver: [['.ww', 'nNw', 'nN.', 'N..'], 1, 1], SoulSource: [['.p.', 'plp', '.p.'], 1, 2], AshCenser: [['.o.', 'NnN', '.N.'], 1, 1], BoneTotem: [['www', 'wkw', '.n.', '.n.'], 1, 2], GraveLantern: [['.k.', 'kck', 'klk', '.k.'], 1, 0] });
// 头冠在纸娃娃上：整颗头换掉（低像素下只叠一层看不出来）。f 正面 / s 侧面（朝右）/ b 背面，宽度取偶数，底边对齐脖子
// pal 压暗大面积主色：泛光从亮度 0.55 开始，成片的浅色会糊成白球，只留眼睛这类小点发亮
const HEAD_DOLL = {
  TitaniumCore: { // 铁骨盔：银色圆盔，中脊，T 形面罩里两点红光
    pal: { v: '#7d8699', s: '#666f82' },
    f: ['....vv....', '..ssvvss..', '.sssvvssS.', '.svssssSS.', 'ssssssssSS', '.skrkkrkS.', '.sSkkkkSS.', '..SSkkSS..'],
    s: ['...vv...', '.ssvvss.', 'sssvvsss', 'ssssssss', 'ssssssss', 'sssskrkk', 'SSSSSkkk', '.SSSSSk.'],
    b: ['....vv....', '..ssvvss..', '.sssvvssS.', '.sssvvsSS.', 'ssssvvssSS', '.sssvvsSS.', '.ssSvvSSS.', '..SSSSSS..'],
  },
  PhantomCore: { // 幻影兜帽：灰白尖帽，帽尖歪向一边，黑脸青眼
    pal: { v: '#7f7b9a', V: '#524f6e' },
    f: ['.......vv.', '.....vvv..', '...vvvvv..', '..vvvvvvv.', '.vvVVVVVvv', '.vVkkkkkVv', '.vVkckkcVv', '.vvkkkkVvV', '.vVVkkVVvV'],
    s: ['.vv.....', '..vvv...', '..vvvvv.', '.vvvvvvv', 'vvvvvVVV', 'vvvvVkkk', 'vvvvVkck', 'vvvvVkkk', '.VvvVVVV'],
    b: ['.......vv.', '.....vvv..', '...vvvvv..', '..vvvvvvv.', '.vvvvvvvvv', '.vvvvvvvVv', '.vvvvvvVVv', '.vvvvvVVvV', '.vVVvvVVvV'],
  },
  NebulaCore: { // 灵纱冠：青色王冠，下面一整片深青面纱垂到肩，只透出两只眼
    pal: { c: '#33a094' },
    f: ['c..c.cc.c..c', 'cc.cccccc.cc', 'ccccyccycccc', '.CCCCCCCCCC.', '.CCkkCCkkCC.', '.CClkCCklCC.', '.CCCCCCCCCC.', '.cCCCCCCCCc.', '..c.Cc.C.c..'],
    s: ['c.c.cc.c', 'cccccccc', 'ccycccyc', 'CCCCCCCC', 'CCCCCCkk', 'CCCCCClk', 'CCCCCCCC', 'cCCCCCCc', '.c.Cc.C.'],
    b: ['c..c.cc.c..c', 'cc.cccccc.cc', 'cccccccccccc', '.CCCCCCCCCC.', '.CCCcCCCCCC.', '.CCCCCCcCCC.', '.CcCCCCCCCC.', '.cCCCCCcCCc.', '..c.Cc.C.c..'],
  },
  CrystalCore: { // 晶冠：头就是一块蓝水晶，顶上乱戳几根晶刺
    pal: { l: '#5f8fd6', B: '#3a5fa8', w: '#bfe0ff' },
    f: ['..w.....l...', '.ll..w.ll.l.', '.lB.lwlBl.lB', '.lBlwwlBllB.', '.lBBlllBBBB.', '.BlkkBBkkBB.', '.BBBBBBBBBB.', '..BBlBBlBB..', '...BBBBBB...'],
    s: ['.w....l.', 'll..w.ll', 'lB.lwlBl', 'lBlwwlBl', 'lBBlllBB', 'BlBBBBkk', 'BBBBBBBB', '.BBlBBB.', '..BBBB..'],
    b: ['..w.....l...', '.ll..w.ll.l.', '.lB.lwlBl.lB', '.lBlwwlBllB.', '.lBBlllBBBB.', '.BlBBlBBBlB.', '.BBBBBBBBBB.', '..BBlBBlBB..', '...BBBBBB...'],
  },
  EtherealCore: { // 幽影兜帽：暗紫罩袍，亮紫边，黑脸里两点红眼，下摆破碎
    f: ['....pp....', '...pPPp...', '..pPPPPp..', '.pPPkkPPp.', 'pPPkkkkPPp', 'pPkrkkrkPp', 'pPkkkkkkPp', '.pPPkkPPp.', 'p.pP.Pp.p.'],
    s: ['...pp...', '..pPPp..', '.pPPPPp.', 'pPPPPkkp', 'pPPPkkkk', 'pPPPkkrk', 'pPPPkkkk', '.pPPPkkp', 'p.pP.Pp.'],
    b: ['....pp....', '...pPPp...', '..pPPPPp..', '.pPPPPPPp.', 'pPPPpPPPPp', 'pPPPPPpPPp', 'pPpPPPPPPp', '.pPPPPpPp.', 'p.pP.Pp.p.'],
  },
  PolymerCore: { // 缝合面具：骨白大脸，黑眼洞，红线缝着；背面是皮绳绑带
    pal: { w: '#7a705e', b: '#5c5447' },
    f: ['..wwwwww..', '.wwwwwwbb.', 'wwkkwwkkwb', 'wwkkwwkkwb', 'wqwwqqwwqb', 'wwqwwwwqbb', '.wwqqqqwb.', '..wbwwbb..'],
    s: ['..wwwww.', '.nnwwwww', 'nnnwwwkk', 'nnnwwwkk', 'Nnnwwqwb', 'nnnwwwqb', '.nnnwqqb', '..NNwbb.'],
    b: ['..NNNNNN..', '.NnnnnnnN.', 'NnnnnnnnnN', 'NnqqqqqqnN', 'NnnnnnnnnN', 'NnqqqqqqnN', '.NnnnnnnN.', '..NNNNNN..'],
  },
};
const DOLL_W = NEW_ART ? 48 : 26, DOLL_H = NEW_ART ? 25 : 18, DOLL_OX = 7, DOLL_OY = 4; // 明亮改版：主角 16×20，左右各留 16 放武器，头顶留 5 放头冠
const dollSig = eq => ['wl', 'wr', 'core', 'engine'].map(k => eq[k] ? eq[k].b + (uqId(eq[k]) || '') : '-').join('|') + '|' + (setLook(eq) || { id: '-' }).id;
/* 套装穿齐的背饰（data/skillfx.json 的 sets）：返回 { id, cfg, cv 单只右翼, root 根部像素 }，没有就 null */
function setLook(eq = S.equip) {
  const L = DATA.skillfx && DATA.skillfx.sets; if (!L || !NEW_ART || typeof setCounts !== 'function') return null; const n = setCounts(eq);
  for (const id in n) { const c = L[id]; if (c && c.art && ARTC[c.art] && n[id] >= c.need) return { id, cfg: c, cv: ARTC[c.art], root: weaponGrip(ARTC[c.art]) }; } return null;
}
// 一对翅膀拼成一张图（纸娃娃 UI 用）：返回 { cv, x, y }，x / y 是这张图放在纸娃娃画布上的左上角（可以是负的）
function setBackPair(eq) {
  const L = setLook(eq); if (!L) return null; const { cv, root: [rx, ry] } = L, w = cv.width, h = cv.height, c = document.createElement('canvas'); c.width = 2 * (w - rx); c.height = h; const x = c.getContext('2d');
  x.drawImage(cv, w - 2 * rx, 0); x.save(); x.scale(-1, 1); x.drawImage(cv, -(w - rx) - rx, 0); x.restore(); // 右翼根部对齐中线，左翼镜像
  const [sx, sy] = L.cfg.sh; return { cv: c, x: sx - (w - rx), y: sy - ry };
}
const uqId = it => it && (it.u || it.la); // 独特（u）或传奇词条（la）的 id：专属造型、特效都按它找
const wpnArt = it => it && (uqId(it) && ARTC['u_' + uqId(it)] || ARTC['w_' + it.b]); // 独特 / 传奇武器有专属造型（art-src/uniques.png）就用专属的
// 画出一帧纸娃娃（outline 后的画布）
// view：0 正面，1 侧面，2 背面（旋风斩转身用）。侧面把身子压窄、脸只露一只眼在边上；背面盖住脸、两手的武器前后对调
const DOLL_SIDE = r => (r.slice(2, 10) + '').padEnd(8, '.');
function dollCanvas(eq, fr, view = 0, noMain = false) { // noMain：正面不画主手武器（战场上武器是单独一张图，跟着出手方向转）
  if (NEW_ART) return dollCanvasNew(eq, fr, view, noMain);
  const c = document.createElement('canvas'); c.width = DOLL_W; c.height = DOLL_H; const x = c.getContext('2d');
  const put = (img, dx, dy, alpha = 1) => { x.globalAlpha = alpha; x.drawImage(img, dx, dy); x.globalAlpha = 1; };
  // 盾：背在身后
  const shIt = eqK(eq, 'shield'); if (shIt) { const [a, b] = SHIELD_COL[shIt.b] || ['b', 'w']; put(sprite(recolor(SHIELD_DOLL, { x: a, X: b, y: 'y' })), DOLL_OX - 2, DOLL_OY + 4); }
  // 副手武器（右手槽）在身后
  const held = (it, hand, alpha) => { if (!it) return; const h = HELD[it.b]; if (!h) return; const [rows, ax, ay] = h; const [hx, hy] = DOLL_HAND[hand]; put(sprite(rows), DOLL_OX + hx - ax - 1, DOLL_OY + hy - ay - 1, alpha); };
  if (view === 2) held(eq.wl, 'back', 0.85); else if (view === 0) held(eq.wr, 'back', 0.85);
  const boots = eq.engine ? BOOT_COL[eq.engine.b] || 'P' : 'k';
  const hd = eq.core ? HEAD_DOLL[eq.core.b] || {} : {};
  let rows = DOLL_BODY[fr];
  if (view === 2) rows = rows.map((r, j) => j >= 2 && j <= 4 ? r.replace(/[kf]/g, 'p') : r);
  if (view === 1) rows = rows.map((r, j) => { let q = DOLL_SIDE(r); if (j >= 2 && j <= 4) q = q.replace(/[kf]/g, 'p').slice(0, 5) + (j === 3 ? 'kf' : 'kk') + q[7]; return q; });
  const hr = hd[['f', 's', 'b'][view]]; // 戴了头冠：身子不画头，整颗换掉
  const body = hr ? rows.map((r, j) => j <= 5 ? '.'.repeat(r.length) : r) : rows, bx = view === 1 ? DOLL_OX + 1 : DOLL_OX - 1;
  put(sprite(recolor(body, { F: boots, G: 'p', b: 'w' })), bx, DOLL_OY - 1);
  if (view === 0) { if (!noMain) held(eq.wl, 'front', 1); } else if (view === 2) held(eq.wr, 'front', 1);
  else if (eq.wl) { const h = HELD[eq.wl.b]; if (h) { const [wr, ax, ay] = h; put(sprite(wr), DOLL_OX + 9 - ax, DOLL_OY + 7 - ay - 1); } } // 侧面：武器伸在身前
  if (hr) put(sprite(hr, undefined, null, hd.pal), DOLL_W / 2 - hr[0].length / 2 - 1, DOLL_OY + 5 - hr.length); // 头最后画，武器不挡脸
  return c;
}
// 明亮改版的纸娃娃：正面图水平翻一下（空手在右握武器，灯在左手）；头冠底边对齐头部下沿；副手 / 盾挂在身后左侧
const HERO_BX = 16, HERO_BY = 5, HERO_HAND = { 0: [13, 14], 1: [12, 13], 2: [3, 14] }, HERO_HEAD = { 0: [8, 12], 1: [7, 12], 2: [8, 12] };
function dollCanvasNew(eq, fr, view, noMain) {
  const c = document.createElement('canvas'); c.width = DOLL_W; c.height = DOLL_H; const x = c.getContext('2d');
  const body = view === 1 ? ARTC['hero_s' + (fr & 1)] : view === 2 ? ARTC['hero_b' + (fr & 1)] : flipCv(ARTC['hero_f' + (fr & 1)]);
  const bx = HERO_BX + Math.round((16 - body.width) / 2), by = DOLL_H - body.height;
  const wpn = it => { const w = wpnArt(it); if (!w) return; const g = weaponGrip(w), [hx, hy] = HERO_HAND[view]; x.drawImage(w, HERO_BX + hx - g[0], HERO_BY + hy - g[1]); };
  const off = eq.wr && ARTC[eq.wr.kind === 'shield' ? 'o_shield' : 'o_' + eq.wr.b]; if (off && view !== 2) x.drawImage(off, HERO_BX - off.width + 3, HERO_BY + 7); // 副手 / 盾：身后左侧
  if (view === 2 && !noMain) wpn(eq.wl); // 背面：武器在身前（被身体挡住）
  x.drawImage(body, bx, by);
  if (view !== 2 && !noMain) wpn(eq.wl);
  if (off && view === 2) x.drawImage(off, HERO_BX + 13, HERO_BY + 7);
  const hm = eq.core && ARTC['h_' + eq.core.b]; if (hm) { const [cx, cy] = HERO_HEAD[view], im = view === 1 ? hm : hm; x.drawImage(im, HERO_BX + cx - Math.round(im.width / 2), HERO_BY + cy - im.height); }
  return c;
}
const GRIP_CACHE = new Map();
function weaponGrip(cv) { // 握把：最左边 3 列不透明像素的平均高度，横向往里 2 格
  if (GRIP_CACHE.has(cv)) return GRIP_CACHE.get(cv);
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let x0 = -1;
  for (let i = 0; i < cv.width && x0 < 0; i++) for (let j = 0; j < cv.height; j++) if (d[(j * cv.width + i) * 4 + 3] > 0) { x0 = i; break; }
  let sy = 0, n = 0; for (let i = x0; i < x0 + 3; i++) for (let j = 0; j < cv.height; j++) if (d[(j * cv.width + i) * 4 + 3] > 0) { sy += j; n++; }
  const g = [x0 + 2, Math.round(sy / Math.max(1, n))]; GRIP_CACHE.set(cv, g); return g;
}
// 主手武器单独的图：战场上画大一点（WPN_SCALE 倍），握把对准前手，枪口朝出手方向
// base：图里武器本来指的方向（握把 → 武器重心），转的时候减掉；朝左时用左右镜像的那张，武器不会倒过来
const HERO_SCALE = NEW_ART ? 1.5 : 1; // 明亮改版：战场上主角整体放大 1.5 倍（武器、头冠跟着），比小怪大一号
const WPN_SCALE = NEW_ART ? HERO_SCALE : 1.5; // 明亮改版的武器本身就画得大，只跟着主角放大
function heldWeapon(it) {
  const b = it.b;
  if (NEW_ART && wpnArt(it)) { const cv = wpnArt(it), [gx, gy] = weaponGrip(cv), w = cv.width, hh = cv.height; return { cv: copyCv(cv), fl: flipCv(cv), ox: (gx + 0.5) / w, oy: (gy + 0.5) / hh, oxF: (w - gx - 0.5) / w, base: 0, baseF: Math.PI }; } // 明亮改版：图里武器朝右
  const h = HELD[b]; if (!h) return null;
  const [rows, ax, ay] = h, cv = sprite(rows), w = cv.width, hh = cv.height;
  let sx = 0, sy = 0, n = 0; rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { sx += i; sy += j; n++; } }));
  const dx = sx / n - ax, dy = sy / n - ay, base = Math.hypot(dx, dy) < 0.5 ? 0 : Math.atan2(dy, dx);
  const fl = document.createElement('canvas'); fl.width = w; fl.height = hh; const x = fl.getContext('2d'); x.translate(w, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0);
  return { cv, fl, ox: (ax + 1.5) / w, oy: (ay + 1.5) / hh, oxF: (w - ax - 1.5) / w, base, baseF: Math.PI - base };
}
