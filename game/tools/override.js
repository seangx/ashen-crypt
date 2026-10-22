/* --override 路径=值（可写多次）：不改 data 文件，直接改打进 html 的 DATA，方便试曲线。
   例：--override progression.monsterScaling.knee=20 --override progression.monsterScaling.dmgGrowth2=1.03
   值按 JSON 解析（数字、true、null、[1,2]），解析不了就当字符串。 */
function overridesFrom(argv) {
  const out = [];
  argv.forEach((a, i) => { if (a === '--override' && argv[i + 1]) out.push(argv[i + 1]); });
  return out;
}
function applyOverrides(html, list) {
  if (!list.length) return html;
  const A = 'const DATA = ', B = ';\nconst DATA_HASH';
  const i = html.indexOf(A), j = html.indexOf(B, i);
  if (i < 0 || j < 0) throw new Error('html 里找不到 DATA');
  const data = JSON.parse(html.slice(i + A.length, j));
  for (const o of list) {
    const eq = o.indexOf('='); if (eq < 0) throw new Error('--override 要写成 路径=值：' + o);
    const keys = o.slice(0, eq).split('.'), raw = o.slice(eq + 1);
    let v; try { v = JSON.parse(raw); } catch (e) { v = raw; }
    let t = data; for (const k of keys.slice(0, -1)) { if (t[k] === undefined) throw new Error('没有这个路径：' + o); t = t[k]; }
    if (!(keys[keys.length - 1] in t)) console.log(`（注意：${keys.join('.')} 原来不存在，新加了）`);
    t[keys[keys.length - 1]] = v;
    console.log(`覆盖 ${keys.join('.')} = ${JSON.stringify(v)}`);
  }
  return html.slice(0, i + A.length) + JSON.stringify(data) + html.slice(j);
}
module.exports = { overridesFrom, applyOverrides };
