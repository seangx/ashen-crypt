#!/usr/bin/env node
/* 技能专属特效：按 data/skillfx.json 的 sheets，用 pixelfx（MIT，github.com/patch-gg/pixelfx）渲染原始图集到 build/fxraw/<键>_<元素>.png/.json。
   之后跑 python3 tools/fx/pack.py 裁帧、缩小、打包成 vendor/fxsheets.js。
   用法：PIXELFX=/path/to/pixelfx node tools/fx/bake.mjs [键...]
   不设 PIXELFX 时依次找：仓库旁边的 _vendor/pixelfx（往上找几层目录）。 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const findPfx = () => {
  if (process.env.PIXELFX) return process.env.PIXELFX;
  let d = GAME; for (let i = 0; i < 6; i++) { const c = join(d, '_vendor', 'pixelfx'); if (existsSync(join(c, 'tools', 'lib', 'fxlib.mjs'))) return c; d = dirname(d); }
  throw new Error('找不到 pixelfx：设置 PIXELFX 环境变量，或 git clone https://github.com/patch-gg/pixelfx 到仓库旁边的 _vendor/pixelfx');
};
const PFX = findPfx(), L = await import(pathToFileURL(join(PFX, 'tools', 'lib', 'fxlib.mjs')).href);
const cfg = JSON.parse(readFileSync(join(GAME, 'data', 'skillfx.json'), 'utf8'));
const out = join(GAME, 'build', 'fxraw'); mkdirSync(out, { recursive: true });
const want = process.argv.slice(2);
for (const [key, s] of Object.entries(cfg.sheets)) {
  if (want.length && !want.includes(key)) continue;
  if (s.fx.startsWith('ashen/')) { // 自制特效放在 tools/fx/custom/，渲染前复制到 pixelfx 的 src/fx/ashen/（import 路径按那里写）
    const dst = join(PFX, 'src', 'fx', 'ashen'); mkdirSync(dst, { recursive: true });
    copyFileSync(join(GAME, 'tools', 'fx', 'custom', s.fx.slice(6) + '.js'), join(dst, s.fx.slice(6) + '.js'));
  }
  const fx = await L.loadEffect(s.fx);
  for (const el of [s.el, ...(s.els || [])]) {
    const options = { ...(s.opts || {}) };
    if (el !== s.el || !s.keepPal) options.palette = cfg.elemPal[el]; // 默认按元素配色；keepPal 时第一个元素保留特效自带配色（或 opts 里给的）
    const r = L.renderFrames(fx, { bg: 'none', actor: false, options });
    const name = `${key}_${el}`, sh = L.spriteSheet(fx, r, name);
    writeFileSync(join(out, name + '.png'), sh.png); writeFileSync(join(out, name + '.json'), JSON.stringify(sh.json));
    console.log(`${name}  ${s.fx}  ${r.n} 帧  ${r.w}×${r.h}`);
  }
}
