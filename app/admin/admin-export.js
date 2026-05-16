/**
 * admin-export.js
 * Exporta:
 *  - Servicios efectivos (código + personalizados; prioridad personalizados)
 *  - Modelos de equipos personalizados
 * En formatos XLSX y TXT.
 * Requiere que admin.html cargue SheetJS (xlsx.full.min.js).
 */

(function(){
  // Helpers para recolectar datos
  function _normKey(m,c,s){
    return [String(m||'').toLowerCase(), String(c||'').toLowerCase(), String(s||'').trim().toUpperCase()].join('::');
  }
  function _collectBaseServices(){
    const out = [];
    try {
      const data = window.categoriasServicio || {};
      const mats = window.materialesPorServicio || {};
      for (const medio of Object.keys(data)){
        const cats = data[medio] || {};
        for (const cat of Object.keys(cats)){
          const servicios = (cats[cat] && Array.isArray(cats[cat].servicios)) ? cats[cat].servicios : [];
          for (const serv of servicios){
            const materiales = Array.isArray(mats[serv]) ? mats[serv] : [];
            out.push({medio, categoria:cat, servicio:serv, materiales, source:'code'});
          }
        }
      }
    } catch(e){ /* ignore */ }
    return out;
  }
  function _collectLocalServices(){
    let lista = [];
    try {
      const raw = localStorage.getItem('customServices');
      if (raw) { lista = JSON.parse(raw); if (!Array.isArray(lista)) lista = []; }
    } catch { lista = []; }
    return lista.map(s => ({...s, source:'local'}));
  }
  function buildEffectiveServices(){
    const base = _collectBaseServices();
    const loc  = _collectLocalServices();
    const map = new Map();
    for (const it of base){ map.set(_normKey(it.medio,it.categoria,it.servicio), it); }
    for (const it of loc){ map.set(_normKey(it.medio,it.categoria,it.servicio), it); } // override/append
    return Array.from(map.values())
      .sort((a,b)=> (a.medio||'').localeCompare(b.medio||'') || (a.categoria||'').localeCompare(b.categoria||'') || (a.servicio||'').localeCompare(b.servicio||''));
  }

  function collectCustomEquipos(){
    try {
      const raw = localStorage.getItem('catalogoModelos');
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr.filter(x => x.aplica === 'instalado');
    } catch { return []; }
  }

  // Utilidades para descargar
  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
  function nowStamp(){
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  // Export: Servicios → XLSX
  function exportServiciosXLSX(){
    const servicios = buildEffectiveServices();
    const rows = servicios.map(s => ({
      Medio: (s.medio||'').toUpperCase(),
      Categoria: (s.categoria||'').charAt(0).toUpperCase()+ (s.categoria||'').slice(1),
      Servicio: s.servicio || '',
      Materiales: Array.isArray(s.materiales) ? s.materiales.join('\n') : ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servicios');
    const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
    downloadBlob(new Blob([wbout], {type:'application/octet-stream'}), `servicios_${nowStamp()}.xlsx`);
  }
  // Export: Servicios → TXT
  function exportServiciosTXT(){
    const servicios = buildEffectiveServices();
    const lineas = [];
    lineas.push('# Medio | Categoria | Servicio | Materiales (1 por línea dentro de cada bloque)');
    servicios.forEach(s => {
      lineas.push('');
      lineas.push(`Medio: ${ (s.medio||'').toUpperCase() }`);
      lineas.push(`Categoria: ${ (s.categoria||'') }`);
      lineas.push(`Servicio: ${ (s.servicio||'') }`);
      if (Array.isArray(s.materiales) && s.materiales.length){
        lineas.push('Materiales:');
        s.materiales.forEach(m => lineas.push(`  - ${m}`));
      } else {
        lineas.push('Materiales: (sin detalle)');
      }
    });
    const blob = new Blob([lineas.join('\n')], {type:'text/plain;charset=utf-8'});
    downloadBlob(blob, `servicios_${nowStamp()}.txt`);
  }

  // Export: Equipos personalizados → XLSX
  function exportEquiposXLSX(){
    const equipos = collectCustomEquipos();
    const rows = equipos.map(e => ({
      Medio: (e.medio||'').toUpperCase(),
      Tipo: (e.tipo||'').toUpperCase(),
      Modelo: e.modelo || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipos');
    const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
    downloadBlob(new Blob([wbout], {type:'application/octet-stream'}), `equipos_${nowStamp()}.xlsx`);
  }
  // Export: Equipos personalizados → TXT
  function exportEquiposTXT(){
    const equipos = collectCustomEquipos();
    const lineas = [];
    lineas.push('# Medio | Tipo | Modelo (solo equipos personalizados)');
    equipos.forEach(e => {
      lineas.push(`${(e.medio||'').toUpperCase()} | ${(e.tipo||'').toUpperCase()} | ${e.modelo||''}`);
    });
    const blob = new Blob([lineas.join('\n')], {type:'text/plain;charset=utf-8'});
    downloadBlob(blob, `equipos_${nowStamp()}.txt`);
  }

  // Enlazar botones cuando exista el DOM
  document.addEventListener('DOMContentLoaded', () => {
    const b1 = document.getElementById('btnExportServiciosXLSX');
    const b2 = document.getElementById('btnExportServiciosTXT');
    const b3 = document.getElementById('btnExportEquiposXLSX');
    const b4 = document.getElementById('btnExportEquiposTXT');
    if (b1) b1.addEventListener('click', exportServiciosXLSX);
    if (b2) b2.addEventListener('click', exportServiciosTXT);
    if (b3) b3.addEventListener('click', exportEquiposXLSX);
    if (b4) b4.addEventListener('click', exportEquiposTXT);
  });
})();
