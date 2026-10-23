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
