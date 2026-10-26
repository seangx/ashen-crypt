// S('GemWhirl') skill, P('r_Melee') support, E() empty
const S=(g,l)=>`<div class="slot sk"><img class=px src=assets/${g}.png>${l?`<span class="badge o y" style="background:#1a1426;bottom:-8px;right:-6px;font-size:10px">${l}</span>`:''}</div>`;
const P=r=>`<div class="slot sp"><img class=px src=assets/${r}.png></div>`;
const E=()=>`<div class="slot em">＋</div>`;
const row=a=>`<div style="display:flex;align-items:center;gap:0">${a.join('<div class=link></div>')}</div>`;
document.querySelectorAll('[data-s]').forEach(el=>el.innerHTML=row(eval('['+el.dataset.s+']')));
