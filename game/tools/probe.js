#!/usr/bin/env node
/* 对构建好的游戏执行一段代码，把返回值按 JSON 打出来（借鉴 forgeax 的 remote eval）。
   用法：
     node tools/probe.js -e 'return A.STATS.dps'
     node tools/probe.js -e 'P.setup({gems:["GemStab"]}); await P.start(); P.tank(); P.step(10); return {fired:P.fired(), dealt:P.dealt()}'
     node tools/probe.js script.js            # 文件内容当函数体
     node tools/probe.js --shot out.png -e '...'   # 执行完截图
     node tools/probe.js --html ashen-crypt-mobile.html ...
   作用域：A（window.__ash）、P（tools/lib/page.js 的助手：setup / start / step / tank / dealt / fired / W / offscreen）、
   以及页面里的全部全局函数（fire、trigFire、hurtPlayer……）。代码是 async 函数体，可以 await，用 return 返回。 */
const fs = require('fs'), path = require('path'), { openGame } = require('./lib/page');
const argv = process.argv.slice(2), opt = { html: path.join(__dirname, '..', 'ashen-crypt-mobile.html') };
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a === '-e') opt.code = argv[++i]; else if (a === '--html') opt.html = argv[++i]; else if (a === '--shot') opt.shot = argv[++i]; else opt.code = fs.readFileSync(a, 'utf8'); }
if (!opt.code) { console.error('缺少 -e 代码或脚本文件'); process.exit(2); }
(async () => {
  const { browser, page, errs } = await openGame(opt.html);
  let out;
  try { out = await page.evaluate(async code => { const A = window.__ash, P = window.P; try { const v = await (new Function('A', 'P', `return (async () => { ${code} })()`))(A, P); return { ok: true, value: v === undefined ? null : JSON.parse(JSON.stringify(v, (k, x) => typeof x === 'number' && !Number.isInteger(x) ? Math.round(x * 1000) / 1000 : x)) }; } catch (e) { return { ok: false, error: e.message, stack: (e.stack || '').split('\n').slice(0, 4).join('\n') }; } }, opt.code); }
  catch (e) { out = { ok: false, error: e.message.split('\n')[0] }; }
  if (opt.shot) { await page.waitForTimeout(300); await page.screenshot({ path: opt.shot }); out.shot = path.resolve(opt.shot); }
  if (errs.length) out.pageErrors = [...new Set(errs)].slice(0, 8);
  console.log(JSON.stringify(out, null, 1)); await browser.close(); process.exit(out.ok ? 0 : 1);
})();
