
// index-retirados-bridge.js — ahora lee del catálogo unificado + base de código
(function(){
  function low(s){ return String(s||'').trim().toLowerCase(); }
  function up(s){ return String(s||'').trim().toUpperCase(); }
  function readCatalog(){
    try{ const raw=localStorage.getItem('catalogoModelos'); const arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; }catch{ return []; }
  }

  function mergedByMedio(){
    // base de código (si existe)
    const base = (window.retiradosPorMedio || {});
    const out = { hfc:{equipo:[], deco:[], repetidor:[]}, ftth:{equipo:[], deco:[], repetidor:[]} };

    ['hfc','ftth'].forEach(m=>{
      const grp = base[m] || {};
      ['equipo','deco','repetidor'].forEach(t=>{
        (grp[t]||[]).forEach(v=>{ if(!out[m][t].includes(v)) out[m][t].push(String(v)); });
      });
    });

    // del catálogo unificado (aplica: retirado)
    const cat = readCatalog().filter(x => x.aplica === 'retirado');
    cat.forEach(it=>{
      const m=low(it.medio), t=low(it.tipo), v=String(it.modelo);
      if (!out[m]) return;
      if (!out[m][t]) out[m][t]=[];
      if (!out[m][t].some(x => up(x)===up(v))) out[m][t].push(v);
    });

    return out;
  }

  function fill(sel, arr){
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">— Selecciona —</option>';
    arr.forEach(v=>{
      const o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o);
    });
    if (arr.some(v => v===val)) sel.value = val;
  }

  function refresh(){
    const medio = (window.medioActual || 'hfc').toLowerCase();
    const data = mergedByMedio()[medio] || {equipo:[], deco:[], repetidor:[]};
    fill(document.getElementById('retEq'), data.equipo||[]);
    fill(document.getElementById('retDeco'), data.deco||[]);
    fill(document.getElementById('retRep'), data.repetidor||[]);
  }

  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('medio-change', refresh);
  window.refreshRetiradosFromAdmin = refresh;
})();
