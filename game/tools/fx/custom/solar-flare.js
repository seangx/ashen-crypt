// 灰烬地窖自制特效：太阳爆发（一次性）。白光一闪，金色光芒从中心猛地射出、慢慢转、再收回变细，一圈细金环向外扩散。
// 和火系技能的区分：直线放射的光芒 + 金白配色，不出现火焰形状。射线画法改编自 pixelfx holy/sunburst（MIT）。
// bake.mjs 会把它复制到 pixelfx 的 src/fx/ashen/ 下再渲染，所以 import 路径按那个位置写。
import { fit, sparkle, clamp, seg, ease, TAU, WHITE } from "../../core/index.js";
import { GOLD } from "../holy/_lib.js";

export const meta = {
  name: "Solar Flare",
  desc: "A white flash, then gold rays shoot out from a small sun, turn a little and fold back in while a thin gold ring rolls outward.",
  tags: ["holy", "sun", "rays", "burst", "impact"],
  size: [128, 128],
  origin: [64, 64],
  duration: 0.9,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: GOLD, rays: 8, seed: 5 },
};

const R0 = 5;
function ray(p, C, a, r0, L, w0, k) {
  const ca = Math.cos(a), sa = Math.sin(a), x1 = ca * (r0 + L), y1 = sa * (r0 + L), pad = w0 + 1;
  p.shade(Math.min(0, x1) - pad, Math.min(0, y1) - pad, Math.max(0, x1) + pad, Math.max(0, y1) + pad, (x, y, out) => {
    const u = (x * ca + y * sa - r0) / L;
    if (u < 0 || u > 1) return;
    const across = Math.abs(-x * sa + y * ca), w = (w0 / 2) * (1 - u * 0.85) + 0.25;
    if (across > w) return;
    out.c = across < 0.5 ? (u < 0.35 ? C[7] : u < 0.75 ? C[6] : C[5]) : u < 0.3 ? C[5] : u < 0.65 ? C[4] : C[3];
    out.a = (u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25) * k;
  });
  p.glowLine(ca * r0, sa * r0, ca * (r0 + L * 0.8), sa * (r0 + L * 0.8), 5, C[5], 0.18 * k);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), N = o.rays * 2;
  const out = ease.outExpo(seg(t, 0.03, 0.28)), fold = seg(t, 0.42, 0.85), k = 1 - ease.inQuad(fold);
  const rot = 0.25 * ease.outQuart(seg(t, 0, 0.9));
  if (k <= 0.01) return;
  // 背后一团金光
  p.glow(0, 0, 50, C[4], 0.35 * k);
  // 外扩细金环
  const ringT = seg(t, 0.04, 0.6);
  if (ringT < 1) {
    const rr = 8 + 44 * ease.outQuart(ringT), ra = 1 - ringT;
    p.ring(0, 0, rr, 1.4, ringT < 0.3 ? C[6] : C[4], ra);
    p.glow(0, 0, rr + 4, C[4], 0.12 * ra);
  }
  // 光芒：长短相间，射出后收回变细
  for (let i = 0; i < N; i++) {
    const a = rot + (i * TAU) / N - TAU / 4, long = i % 2 === 0;
    const L = (long ? 40 : 22) * out * (1 - 0.55 * fold);
    if (L < 1) continue;
    ray(p, C, a, R0, L, (long ? 4.2 : 2.6) * (1 - 0.6 * fold), k);
    if (long && t > 0.2 && t < 0.7) {
      const g = seg(t, 0.2, 0.7);
      sparkle(p, Math.cos(a) * (R0 + L + 2), Math.sin(a) * (R0 + L + 2), 1 + 2.5 * Math.sin(g * Math.PI), C[7], C[5], 0.5 * k);
    }
  }
  // 小太阳：先白光一闪，再缩成金边白芯
  const flash = 1 - seg(t, 0, 0.08), cr = 4 + 7 * flash - 2 * fold;
  p.shade(-14, -14, 14, 14, (x, y, o2) => {
    const d = Math.hypot(x, y);
    if (d > cr + 1.5) return;
    o2.c = d < cr * 0.55 ? WHITE : d < cr ? C[7] : C[5];
    o2.a = k;
  });
  p.glow(0, 0, 18, C[6], (0.3 + 0.5 * flash) * k);
}
