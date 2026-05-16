// admin/admin-export-all.js
(function(){
  const load = (k,d)=>{ try{const r=localStorage.getItem(k);return r?JSON.parse(r):d;}catch{return d;} };
  function toXLSX(filename, rows, sheetName){
    if (!rows || !rows.length){ alert('No hay datos para exportar.'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Datos');
    XLSX.writeFile(wb, filename);
  }
  function toTXT(filename, lines){
    const blob = new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  }
  function hook(id,fn){ const b=document.getElementById(id); if(b) b.addEventListener('click',fn); }

  document.addEventListener('DOMContentLoaded', ()=>{
    // ----- Retirados -----
    hook('btnExportRetiradosXLSX', ()=>{
      const lista = load('catalogoModelos', []).filter(x => x.aplica === 'retirado');
      const rows = Array.isArray(lista)? lista.map(e=> ({
        medio: (e.medio||'').toUpperCase(), tipo: (e.tipo||'').toUpperCase(), modelo: e.modelo||''
      })) : [];
      toXLSX('EQUIPOS_RETIRADOS.xlsx', rows, 'Retirados');
    });
    hook('btnExportRetiradosTXT', ()=>{
      const lista = load('catalogoModelos', []).filter(x => x.aplica === 'retirado');
      const lines = (Array.isArray(lista)? lista : []).map(e=> [ (e.medio||'').toUpperCase(), (e.tipo||'').toUpperCase(), e.modelo||'' ].join('\t'));
      toTXT('EQUIPOS_RETIRADOS.txt', lines);
    });
  });
})();
