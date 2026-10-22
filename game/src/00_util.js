const rnd = Math.random;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const rf = (a, b) => a + rnd() * (b - a);
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function wpick(list, wf) { let t = 0; for (const x of list) t += wf(x); let r = rnd() * t; for (const x of list) { r -= wf(x); if (r <= 0) return x; } return list[list.length - 1]; }
const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
function fmt(n) {
  if (!isFinite(n)) return 'inf';
  const a = Math.abs(n);
  if (a < 10 && n % 1) return (Math.round(n * 10) / 10).toString();
  if (a < 1000) return Math.floor(n).toString();
  let u = 0; while (Math.abs(n) >= 1000 && u < UNITS.length - 1) { n /= 1000; u++; }
  return (Math.abs(n) < 10 ? n.toFixed(2) : Math.abs(n) < 100 ? n.toFixed(1) : Math.floor(n)) + UNITS[u];
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
