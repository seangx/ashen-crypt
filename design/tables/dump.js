const pw=require('playwright'),fs=require('fs');
(async()=>{const b=await pw.chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/phaser.min.js',r=>r.fulfill({body:fs.readFileSync('/mnt/project-files/game/tools/vendor/phaser.min.js'),contentType:'application/javascript'}));
await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
await p.goto('file:///mnt/project-files/game/ashen-crypt.html');
await p.waitForFunction(()=>window.__ash&&window.__ash.G.ui,null,{timeout:30000});
const out=await p.evaluate(()=>{
 const tn=t=>(t||[]).map(x=>TAG_N[x]||x).join('、');
 const v0=x=>Array.isArray(x)?(Array.isArray(x[0])?x[0].join('–'):x.join('–')):x;
 const R={};
 R.weapons=Object.values(WEAPONS).map(w=>({id:w.key,n:w.n,cat:w.cat||'',retired:w.retired?'是':'',el:ELEM_N[w.el]||w.el||'',req:w.req,w:w.w,min:v0(w.min),max:v0(w.max),aps:v0(w.aps),crit:v0(w.crit),range:v0(w.range),tags:tn(w.tags),gem:(GEM_BY[GEM_OF_BASE[w.key]]||{}).n||''}));
 R.armors=[];for(const kind of ['off','shield','core','engine','hub'])for(const a of Object.values(ARMORS[kind])){const num={};for(const k in a){if(['key','n','ic','tags','d','sup','w','req'].includes(k))continue;const v=a[k];if(typeof v==='number'||Array.isArray(v))num[k]=v0(v)}R.armors.push({kind:KIND_N[kind],id:a.key,n:a.n,req:a.req||'',w:a.w??'',d:a.d||'',sup:a.sup?JSON.stringify(a.sup):'',stats:JSON.stringify(num)})}
 R.gems=GEMS.map(g=>{const s=g.src.map(k=>WEAPONS[k]).filter(Boolean);return {id:g.id,n:g.n,form:g.form,el:[...new Set(s.map(w=>ELEM_N[w.el]))].join('/')||'圣光（盾）',tags:tn(g.tags),mul:JSON.stringify(g.mul),spd:g.spd,req:g.req,w:g.w,ai:g.ai||'',fr:g.fr||'',src:s.map(w=>w.n).join('、'),fx:g.fx?Object.keys(g.fx).join(','):''}});
 R.mods=MODS.map(m=>{let d1='',dm='';try{d1=m.d?m.d(m.fx(1)):''}catch(e){d1='?'}try{dm=m.d?m.d(m.fx(MOD_MAX)):''}catch(e){dm='?'}return {id:m.id,n:m.n,type:m.field?'力场（法阵）':(FORM_GEM[m.id]?'形态（已并进技能石）':'辅助'),fit:((DATA.runes.list.find(r=>r.id===m.id)||{}).fit||[]).map(c=>c==='weapon'?'技能':c==='engine'?'遁靴':(TAG_N[c.slice(4)]||c)).join('+'),req:m.req,w:m.w,d1,dm}});
 R.affs=AFF.filter(a=>!a.off).map(a=>{const t=a.tiers.filter(t=>t[1]);const fmt=v=>{try{return a.f(a.pair?[v[0],v[2]??v[1]]:(Array.isArray(v)?v[0]:v))}catch(e){return ''}};const top=t[t.length-1];const topv=top?top[0]:null;let tt='';try{tt=a.f(a.pair?[topv[1]??topv[0],topv[3]??topv[1]]:(Array.isArray(topv)?topv[topv.length-1]:topv))}catch(e){};return {k:a.k,type:a.type==='P'?'前缀':'后缀',on:(a.on||[]).map(o=>KIND_N[o]||o).join('、'),tag:TAG_N[a.tag]||a.tag||'',el:ELEM_N[a.el]||(a.el==='thermal'?'元素':a.el||''),tiers:t.length,t1:fmt(t[0]?t[0][0]:0),top:tt,topIlvl:top?top[2]:'',w:t.reduce((s,x)=>s+x[1],0)}});
 R.uniq=UNIQUES.map(u=>{const merge=(x,y)=>{if(x===y)return x;const A=x.split(/(-?\d+(?:\.\d+)?)/),B=y.split(/(-?\d+(?:\.\d+)?)/);if(A.length!==B.length)return x+' ～ '+y;return A.map((t,i)=>i%2&&t!==B[i]?t+'–'+B[i]:t).join('')};const rules=(u.rules||[]).map(r=>{const [k,a,b2]=r;try{const f=RULE_TEXT[k];if(!f)return k+' '+a;const ta=f(a),tb=b2!=null?f(b2):ta;return merge(String(ta),String(tb))}catch(e){return k+' '+a}}).join('；');const fx=(u.fixed||[]).map(x=>x[0]).join('、');return {id:u.id,n:u.n,kind:KIND_N[u.kind]||u.kind,base:(WEAPONS[u.b]||ARMORS[u.kind]?.[u.b]||{}).n||u.b,req:u.req,w:u.w,ladder:u.ladderOnly?'天梯 '+u.ladderOnly:'',fixed:fx,rules}});
 R.oath=OATH.list.map(o=>({id:o.id,on:(o.on||[]).map(x=>KIND_N[x]||x).join('、'),pos:o.pos||'',neg:o.neg||''}));
 R.glyph=GLYPHS.map(g=>({id:g.id,n:g.n,d:g.d||''}));
 return R});
fs.writeFileSync('content.json',JSON.stringify(out));
console.log(Object.entries(out).map(([k,v])=>k+':'+v.length).join(' '),errs.slice(0,3));
console.log(JSON.stringify(out.mods.slice(0,3)),JSON.stringify(out.affs.slice(0,2)),JSON.stringify(out.uniq.slice(0,2)),JSON.stringify(out.oath.slice(0,1)));
await b.close()})();
