/* =========================================================
   表现层：Phaser 3
   ========================================================= */
const W = 480, H = 270, TOP_H = 20, FLOOR_Y = 56, FIELD_B = 232, BOT_Y = 238;
const hex = c => parseInt(c.slice(1), 16);
const COL = { ink: '#0d0a12', text: '#e9e0c9', dim: '#9b90a8', faint: '#6a5f7a', ember: '#ff9a3d', emberHi: '#ffd36a', good: '#86e07b', bad: '#ff6b6b', cyan: '#57e0d0', soul: '#e6a6ff', cu: '#d8814a', ag: '#d3dbe6', au: '#ffcc3a', dust: '#b9ad94', xp: '#9fd8ff', boss: '#ff6b5a' };
const G = { fx: true, time: 0, world: null, ui: null };
const FONT_DATA = /*FONT_DATA*/null;

