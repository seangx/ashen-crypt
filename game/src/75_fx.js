/* ---------- 画面后处理：辉光、热浪、冲击波、暗部偏冷、暗角 ----------
   只在 WebGL 下用；World 场景的相机挂这条管线。坐标都按 480×270 的游戏像素传进来。 */
const CRYPT_FRAG = `
#define SHADER_NAME CRYPT_FX
precision mediump float;
uniform sampler2D uMainSampler;
uniform sampler2D uBloomSampler;
uniform int uPass;
uniform vec2 uTexel;
uniform float uTime;
uniform float uBloom;
uniform float uFlipY;
uniform vec4 uWave[4];
uniform vec4 uHaze[8];
varying vec2 outTexCoord;
const vec2 GS = vec2(480.0, 270.0);
vec2 toGame(vec2 uv) { return vec2(uv.x, mix(uv.y, 1.0 - uv.y, uFlipY)) * GS; }
vec2 toUV(vec2 g) { vec2 u = g / GS; return vec2(u.x, mix(u.y, 1.0 - u.y, uFlipY)); }
vec3 bright(vec2 uv) { vec3 c = texture2D(uMainSampler, uv).rgb; return c * smoothstep(0.55, 1.0, dot(c, vec3(0.3, 0.59, 0.11))); }
void main() {
  vec2 uv = outTexCoord;
  if (uPass == 1) { // 取亮部并缩到一半（2×2 平均）
    vec3 b = bright(uv + uTexel * vec2(-0.5, -0.5)) + bright(uv + uTexel * vec2(0.5, -0.5)) + bright(uv + uTexel * vec2(-0.5, 0.5)) + bright(uv + uTexel * vec2(0.5, 0.5));
    gl_FragColor = vec4(b * 0.25, 1.0); return;
  }
  if (uPass == 2) { // 9 点高斯模糊（横 / 竖各一次）
    vec3 b = texture2D(uMainSampler, uv).rgb * 0.227;
    b += (texture2D(uMainSampler, uv + uTexel * 1.0).rgb + texture2D(uMainSampler, uv - uTexel * 1.0).rgb) * 0.195;
    b += (texture2D(uMainSampler, uv + uTexel * 2.0).rgb + texture2D(uMainSampler, uv - uTexel * 2.0).rgb) * 0.122;
    b += (texture2D(uMainSampler, uv + uTexel * 3.0).rgb + texture2D(uMainSampler, uv - uTexel * 3.0).rgb) * 0.054;
    b += (texture2D(uMainSampler, uv + uTexel * 4.0).rgb + texture2D(uMainSampler, uv - uTexel * 4.0).rgb) * 0.016;
    gl_FragColor = vec4(b, 1.0); return;
  }
  vec2 g = toGame(uv), off = vec2(0.0);
  for (int i = 0; i < 8; i++) { // 火焰上方的热浪：按行横向抖动
    vec4 h = uHaze[i]; if (h.w <= 0.0) continue;
    float dy = h.y - g.y, dx = abs(g.x - h.x); if (dy < 0.0 || dy > h.w || dx > h.z) continue;
    float f = smoothstep(0.0, 5.0, dy) * (1.0 - dy / h.w) * (1.0 - dx / h.z);
    off.x += sin(g.y * 0.9 + uTime * 9.0 + h.x) * 1.2 * f;
  }
  for (int i = 0; i < 4; i++) { // 爆炸冲击波：一圈往外推的折射
    vec4 w = uWave[i]; if (w.w <= 0.0) continue;
    vec2 d = g - w.xy; d.y *= 1.4; float L = length(d), k = 1.0 - abs(L - w.z) / 5.0;
    if (k <= 0.0 || L < 0.5) continue;
    off -= d / L * k * w.w * 2.5;
  }
  vec2 su = toUV(g + off);
  vec3 col = texture2D(uMainSampler, su).rgb + texture2D(uBloomSampler, su).rgb * uBloom;
  float l = dot(col, vec3(0.3, 0.59, 0.11));
  col = mix(col * vec3(0.84, 0.92, 1.14), col, smoothstep(0.0, 0.45, l)); // 暗部偏冷
  vec2 v = g / GS - vec2(0.5, 0.55);
  col *= 1.0 - smoothstep(0.3, 0.85, length(v * vec2(1.1, 1.35))) * 0.4;
  gl_FragColor = vec4(col, 1.0);
}`;
const CryptFX = window.Phaser && Phaser.Renderer.WebGL ? class extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) { super({ game, name: 'CryptFX', fragShader: CRYPT_FRAG }); this.waves = []; this.hazes = []; this.bloom = 2.2; this.flip = 1; }
  onPreRender() {
    const w = new Float32Array(16), h = new Float32Array(32);
    this.waves = this.waves.filter(o => G.time - o.t0 < o.life);
    this.waves.slice(-4).forEach((o, i) => { const a = (G.time - o.t0) / o.life; w.set([o.x - CAM.x, o.y - CAM.y, a * o.r, (1 - a) * o.k], i * 4); });
    this.hazes.slice(0, 8).forEach((o, i) => h.set([o.x - CAM.x, o.y - CAM.y, o.w, o.h], i * 4));
    this.set1f('uTime', G.time); this.set1f('uBloom', this.bloom); this.set1f('uFlipY', this.flip);
    this.set4fv('uWave', w); this.set4fv('uHaze', h);
  }
  // 辉光分四步：取亮部缩一半 → 横向模糊 → 竖向模糊 → 和原图合成（同时做热浪、冲击波、调色）
  onDraw(target) {
    const h1 = this.halfFrame1, h2 = this.halfFrame2, gl = this.gl;
    this.set1i('uPass', 1); this.set2f('uTexel', 1 / target.width, 1 / target.height); this.bindAndDraw(target, h1);
    this.set1i('uPass', 2); this.set2f('uTexel', 1.5 / h1.width, 0); this.bindAndDraw(h1, h2);
    this.set2f('uTexel', 0, 1.5 / h1.height); this.bindAndDraw(h2, h1);
    this.set2f('uTexel', 3 / h1.width, 0); this.bindAndDraw(h1, h2); // 第二轮放宽，光晕更大更柔
    this.set2f('uTexel', 0, 3 / h1.height); this.bindAndDraw(h2, h1);
    this.set1i('uPass', 3); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, h1.texture.webGLTexture); this.set1i('uBloomSampler', 1);
    this.bindAndDraw(target);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
  }
} : null;

/* 陨石（参考暗黑 2 法师 / 暗黑 3 秘术师的陨石）：
   延迟期间地上是预警圈（暗红焦痕 + 转动的虚线符文圈），圈中心的影子从小长大；
   火石从右上方斜着落下，越近越大，后面拖一条白 → 黄 → 橙 → 暗红的火尾，沿途掉火星。 */
const MFX = { h0: 150, dx: 0.55 };
function meteorFx(sc, gg, pg, glow, M, t) {
  const k = clamp(1 - Math.max(0, M.t) / M.T, 0, 1), r = M.r, ry = r * 0.6;
  gg.fillStyle(0x3a0e06, 0.18 + 0.22 * k).fillEllipse(M.x, M.y, r * 2, ry * 2);
  const n = Math.max(12, r * 0.9 | 0), rot = t * 1.6 + M.x;
  for (let i = 0; i < n; i++) { if ((i & 1) && k < 0.85) continue; const a = rot + i / n * Math.PI * 2; gg.fillStyle(k > 0.85 ? 0xffe070 : 0xff7a2a, 0.55 + 0.4 * k); gg.fillRect(Math.round(M.x + Math.cos(a) * r), Math.round(M.y + Math.sin(a) * ry), 2, 1); }
  const sr = 2 + r * 0.45 * k; gg.fillStyle(0x000000, 0.25 + 0.3 * k).fillEllipse(M.x, M.y, sr * 2, sr * 1.2); // 影子越来越大
  const e = (1 - k) * (1 - k), h = MFX.h0 * e, x = M.x + h * MFX.dx, y = M.y - h, s = 2.5 + 3 * k; // 越到后面越快
  for (let i = 9; i >= 1; i--) { const q = i / 9, tx = x + q * 26 * MFX.dx, ty = y - q * 26, w = s * (1 - q * 0.75) + Math.sin(t * 30 + i) * 0.5;
    pg.fillStyle(q < 0.25 ? 0xfff2b0 : q < 0.5 ? 0xffc040 : q < 0.75 ? 0xff7a1a : 0xa02a10, 0.9 - q * 0.6).fillCircle(tx, ty, Math.max(0.8, w)); }
  if (glow) glow.fillStyle(0xff8a2a, 0.35).fillCircle(x, y, s * 2.6);
  pg.fillStyle(0xff9a3a, 1).fillCircle(x, y, s + 1); pg.fillStyle(0x4a2414, 1).fillCircle(x - 0.5, y + 0.5, s - 0.5); pg.fillStyle(0xfff0a0, 1).fillRect(Math.round(x + s * 0.2), Math.round(y - s * 0.6), 2, 1); // 火石：橙边、暗心、一点高光
  if (rnd() < 0.5) sc.em.fire.explode(1, x + 6 * MFX.dx, y - 6);
}
/* 火地（暗黑 2 陨石落地后的燃烧地面）：焦黑的地面、发亮的熔岩裂纹，上面一簇簇火舌跳动，最后半秒淡出 */
function fireGroundFx(sc, gg, pg, glow, z, t) {
  const a = Math.min(1, z.t * 2), r = z.r, ry = r * 0.6, sd = (z.x * 13 + z.y * 7) | 0;
  gg.fillStyle(0x1a0804, 0.45 * a).fillEllipse(z.x, z.y, r * 2, ry * 2); gg.fillStyle(0x7a2008, 0.25 * a).fillEllipse(z.x, z.y, r * 1.3, ry * 1.3);
  for (let i = 0; i < 5; i++) { const an = (sd + i * 73) % 628 / 100, l = r * (0.5 + ((sd >> i) & 3) * 0.12); gg.lineStyle(1, 0xff6a1a, (0.4 + 0.3 * Math.sin(t * 5 + i)) * a); gg.lineBetween(z.x, z.y, z.x + Math.cos(an) * l, z.y + Math.sin(an) * l * 0.6); }
  const n = Math.max(6, r / 4 | 0);
  for (let i = 0; i < n; i++) { const an = (sd * 0.37 + i * 2.39), d = r * 0.85 * Math.sqrt(((i * 37 + sd) % 100) / 100), fx_ = Math.round(z.x + Math.cos(an) * d), fy = Math.round(z.y + Math.sin(an) * d * 0.6);
    const fl = 0.5 + 0.5 * Math.sin(t * 14 + i * 1.9), hh = (3 + 5 * fl) * a;
    pg.fillStyle(0xe8401a, 0.8 * a).fillRect(fx_ - 1, fy - hh, 3, hh); pg.fillStyle(0xffb030, 0.9 * a).fillRect(fx_, fy - hh * 0.8, 1, hh * 0.7); pg.fillStyle(0xfff0a0, a).fillRect(fx_, fy - 2, 1, 1); }
  if (glow) glow.fillStyle(0xff6a1a, 0.12 * a).fillEllipse(z.x, z.y - 3, r * 2, ry * 2);
  if (rnd() < 0.12) sc.em.fire.explode(1, z.x + rf(-r, r) * 0.7, z.y + rf(-ry, ry) * 0.7 - 3);
}

/* 敌方重击预警：暗红紫底、粗的品红外圈带朝里的尖刺（危险样式），内圈从外往里收，最后 0.25 秒闪烁 */
function enemySlamFx(gg, pg, s, t) {
  const k = 1 - Math.max(0, s.t) / s.T, blink = k > 0.75 && ((t * 16) | 0) % 2;
  gg.fillStyle(0x3a0620, 0.3 + 0.25 * k).fillCircle(s.x, s.y, s.r); gg.lineStyle(2, blink ? 0xffffff : 0xd0205a, 0.95).strokeCircle(s.x, s.y, s.r);
  const n = Math.max(8, s.r / 5 | 0); gg.fillStyle(0xd0205a, 0.9); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + t; for (let d = 1; d <= 3; d++) gg.fillRect(Math.round(s.x + Math.cos(a) * (s.r - d * 1.5)), Math.round(s.y + Math.sin(a) * (s.r - d * 1.5)), 4 - d, 1); }
  pg.lineStyle(2, 0xff4a8a, 0.9).strokeCircle(s.x, s.y, Math.max(1, s.r * (1 - k)));
}
/* 陨石焦痕：落点留下 6 秒的焦黑地面和几粒忽明忽暗的余烬，慢慢淡掉 */
function scorchFx(gg, s, t, dt) {
  s.life -= dt; const a = Math.min(1, s.life / 2), r = s.r * 0.8, ry = r * 0.6;
  gg.fillStyle(0x140604, 0.55 * a).fillEllipse(s.x, s.y, r * 2, ry * 2); gg.fillStyle(0x2a0e06, 0.5 * a).fillEllipse(s.x, s.y, r * 1.2, ry * 1.2);
  for (let i = 0; i < 7; i++) { const an = s.sd + i * 2.39, d = r * 0.8 * (((s.sd + i * 37) % 10) / 10), f = 0.5 + 0.5 * Math.sin(t * (4 + i) + i * 3);
    gg.fillStyle(f > 0.6 ? 0xffb030 : 0xc0401a, (0.3 + 0.6 * f) * a).fillRect(Math.round(s.x + Math.cos(an) * d), Math.round(s.y + Math.sin(an) * d * 0.6), 1, 1); }
}
