/* ---------- 音效 ---------- */
let AC = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function tone(f, d, type = 'square', vol = .04, slide = 0, delay = 0) {
  const a = AC; if (!a) return;
  const t0 = a.currentTime + delay; const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + d);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + d + .02);
}
const lastS = {};
function sfx(k) {
  if (!S.settings.sound || !AC || !G.fx) return;
  const now = performance.now(); const gap = { hit: 70, kill: 60, click: 40, shoot: 70, beam: 90, slash: 90, boom: 80, pick: 40, hurt: 120, die: 40 }[k] || 0;
  if (gap && now - (lastS[k] || 0) < gap) return; lastS[k] = now;
  switch (k) {
    case 'hit': tone(rf(180, 220), .05, 'square', .018, .5); break;
    case 'kill': tone(320, .06, 'triangle', .03, .6); break;
    case 'pick': tone(1320, .05, 'square', .012); break;
    case 'shoot': tone(rf(500, 560), .04, 'square', .01, .5); break;
    case 'beam': tone(900, .08, 'sine', .015, .7); break;
    case 'slash': tone(260, .05, 'sawtooth', .012, .5); break;
    case 'boom': tone(90, .2, 'sawtooth', .03, .4); break;
    case 'hurt': tone(150, .12, 'square', .04, .5); break;
    case 'dash': tone(400, .1, 'sine', .03, 2); break;
    case 'start': tone(140, .25, 'sawtooth', .03, 3); break;
    case 'die': tone(520, .05, 'triangle', .04); tone(780, .08, 'triangle', .04, 0, .05); break;
    case 'rare': [660, 880, 1100].forEach((f, i) => tone(f, .12, 'triangle', .04, 0, i * .07)); break;
    case 'unique': [523, 659, 784, 1046].forEach((f, i) => tone(f, .2, 'square', .03, 0, i * .09)); break;
    case 'chest': tone(200, .1, 'square', .04, 2); break;
    case 'boss': tone(110, .7, 'sawtooth', .06, .5); tone(82, .9, 'square', .04, .6, .1); break;
    case 'bossdie': [392, 523, 659, 784].forEach((f, i) => tone(f, .25, 'triangle', .05, 0, i * .1)); break;
    case 'ignite': tone(140, .25, 'sawtooth', .03, 3); break;
    case 'out': tone(300, .5, 'sine', .04, .2); break;
    case 'level': [440, 554, 659].forEach((f, i) => tone(f, .12, 'square', .025, 0, i * .06)); break;
    case 'craft': tone(600, .08, 'square', .03, 1.5); tone(900, .12, 'triangle', .03, 0, .06); break;
    case 'fail': tone(220, .2, 'sawtooth', .03, .5); break;
    case 'buy': tone(880, .06, 'square', .025); tone(1320, .08, 'square', .02, 0, .05); break;
    case 'click': tone(660, .03, 'square', .015); break;
    case 'open': tone(330, .06, 'triangle', .03, 1.6); break;
  }
}

