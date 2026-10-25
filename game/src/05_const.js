/* =========================================================
   表现层：Phaser 3
   ========================================================= */
/* 核心 / 界面的边界：
   VW × VH、TOP_H、BOT_Y 是「战斗视野」——核心（战斗、自动、模拟）只认这一套，两个版本完全一样，所以数值和手感不分平台。
   W × H 是屏幕的逻辑分辨率，只给界面和渲染用：桌面 480×270，手机竖屏 270×(480~600，按机型高宽比)。
   PLATFORM 由 tools/build.py 在打包时写进来。 */
const PLATFORM = typeof ASH_PLATFORM !== 'undefined' ? ASH_PLATFORM : 'desktop', MOBILE = PLATFORM === 'mobile';
const VW = 480, VH = 270, TOP_H = 20, FLOOR_Y = 56, FIELD_B = 232, BOT_Y = 238;
const W = MOBILE ? 270 : VW, H = MOBILE ? Math.max(480, Math.min(600, Math.round(270 * (innerHeight || 480) / (innerWidth || 270)))) : VH;
/* 手机版屏幕上战斗区（逻辑像素）：顶栏下面到操作区上面 */
const MTOP = 48, NAV_H = 46, MBOT = H - NAV_H;
/* 战斗场地（核心只认这一组）：视野宽 AW、高 AVH，场地是视野里 AT..AB 那一条。
   桌面 = 480×270 视野里顶栏和底栏之间；手机 = 竖屏上真正看得到的战斗区（顶栏下沿到导航上沿），弹射、出怪、飞出屏幕、自动走位都按它算。 */
const AW = MOBILE ? W : VW, AT = MOBILE ? 0 : TOP_H, AB = MOBILE ? MBOT - MTOP : BOT_Y, AVH = MOBILE ? AB : VH;
const SCR_CY = MOBILE ? (MTOP + MBOT) / 2 : (TOP_H + BOT_Y) / 2; // 屏幕上战斗区的竖直中心：角色就画在这里
/* 虚拟摇杆（只有手机版的界面会写）：x,y 是 -1..1 的方向和力度 */
const STICK = { on: false, x: 0, y: 0 };
const hex = c => parseInt(c.slice(1), 16);
const COL = { ink: '#0d0a12', text: '#e9e0c9', dim: '#9b90a8', faint: '#6a5f7a', ember: '#ff9a3d', emberHi: '#ffd36a', good: '#86e07b', bad: '#ff6b6b', cyan: '#57e0d0', soul: '#e6a6ff', cu: '#d8814a', ag: '#d3dbe6', au: '#ffcc3a', dust: '#b9ad94', xp: '#9fd8ff', boss: '#ff6b5a' };
const G = { fx: true, time: 0, world: null, ui: null };
const FONT_DATA = /*FONT_DATA*/null;


const TOUCH = 30; // 手机最小点击区（逻辑像素；390 宽屏上约 43 像素）
