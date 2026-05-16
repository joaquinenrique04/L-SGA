// admin-import.js — Importar XLSX/TXT (Servicios, Equipos, Retirados)
// Requiere XLSX loaded en admin.html
(function(){
  function $(id){ return document.getElementById(id); }
  const up = (s)=>String(s||'').trim().toUpperCase();
  const low= (s)=>String(s||'').trim().toLowerCase();
  const norm=(s)=>String(s||'').trim();
  const strip=(s)=>norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  function readLS(key){
    try{ const raw=localStorage.getItem(key); const arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; }
    catch{ return []; }
  }
  function writeLS(key, arr){ localStorage.setItem(key, JSON.stringify(arr||[])); }

  function readCatalog(){ return readLS('catalogoModelos'); }
  function writeCatalog(arr){ writeLS('catalogoModelos', arr); }

  function normalizeTipo(x){
    const a = strip(x).toLowerCase();
    if (!a) return null;
    if (/(deco|decod|iptv)/.test(a)) return 'deco';
    if (/(repetidor|repeater|extensor|mesh)/.test(a)) return 'repetidor';
    if (/(equipo|mta|router|modem|cpe)/.test(a)) return 'equipo';
    return 'equipo'; // fallback
  }

  function importServiciosFromRows(rows){
    // Espera columnas: medio, categoria, servicio, materiales (opcional)
    const added = [];
    let servicios = readLS('customServices');
    const seen = new Set(servicios.map(x => [low(x.medio), low(x.categoria), up(x.servicio)].join('::')));

    rows.forEach(r => {
      const medio = low(r.medio || r.MEDIO || r.Medio);
      const categoria = low(r.categoria || r.CATEGORIA || r.Categoria || r.categoria);
      const servicio = norm(r.servicio || r.SERVICIO || r.Servicio || r.descripcion || r.Descripción);
      const matsStr = norm(r.materiales || r.MATERIALES || r.Materiales || '');
      const materiales = matsStr ? matsStr.split(/\r?\n/).map(s=>s.trim()).filter(Boolean) : [];
      if (!medio || !categoria || !servicio) return;
      const item = { medio, categoria, servicio, materiales };
      const key = [item.medio, item.categoria, up(item.servicio)].join('::');
      if (!seen.has(key)){
        seen.add(key);
        servicios.push(item);
        added.push(item);
      }
    });

    writeLS('customServices', servicios);
    return added.length;
  }

  function importEquiposFromRows(rows){
    // Espera columnas: medio, tipo, modelo
    const added = [];
    let cat = readCatalog();
    const seen = new Set(cat.map(x => [low(x.medio), low(x.tipo), up(x.modelo), x.aplica].join('::')));

    rows.forEach(r => {
      const medio = low(r.medio || r.MEDIO || r.Medio);
      const tipoIn = r.tipo || r.TIPO || r.Tipo;
      const modelo = norm(r.modelo || r.MODELO || r.Modelo || r.descripcion || r.Descripción);
      const tipo = normalizeTipo(tipoIn);
      if (!medio || !modelo || !tipo) return;
      const item = { medio, tipo, modelo, aplica:'instalado' };
      const key = [item.medio, item.tipo, up(item.modelo), item.aplica].join('::');
      if (!seen.has(key)){
        seen.add(key);
        cat.push(item);
        added.push(item);
      }
    });

    writeCatalog(cat);
    return added.length;
  }

  function importRetiradosFromRows(rows){
    // Espera columnas: medio, tipo, modelo (case-insensitive)
    const added = [];
    let cat = readCatalog();
    const seen = new Set(cat.map(x => [low(x.medio), low(x.tipo), up(x.modelo), x.aplica].join('::')));

    rows.forEach(r => {
      const medio  = low(r.medio || r.MEDIO || r.Medio);
      const tipoIn = r.tipo  || r.TIPO  || r.Tipo;
      const modelo = norm(r.modelo || r.MODELO || r.Modelo || r.descripcion || r.Descripción);
      const tipo   = normalizeTipo(tipoIn);
      if (!medio || !modelo || !tipo) return;
      const item = { medio, tipo, modelo, aplica:'retirado' };
      const key  = [item.medio, item.tipo, up(item.modelo), item.aplica].join('::');
      if (!seen.has(key)){
        seen.add(key);
        cat.push(item);
        added.push(item);
      }
    });

    writeCatalog(cat);
    return added.length;
  }



  function parseTxt(text){
    // CSV/TSV simple: usa la primera línea como encabezados
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(/[\t;,]| {2,}/).map(h => h.trim());
    const rows = [];
    for (let i=1; i<lines.length; i++){
      const cols = lines[i].split(/[\t;,]| {2,}/);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
      rows.push(obj);
    }
    return rows;
  }

  function importFile(cb){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.txt,.csv';
    input.onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (/\.xlsx?$/i.test(f.name)){
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(buf), {type:'array'});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, {defval:'', raw:false});
        cb(rows);
      } else {
        const text = await f.text();
        const rows = parseTxt(text);
        cb(rows);
      }
    };
    input.click();
  }

  function init(){
    // Importar Servicios
    const btnServ = document.getElementById('btnImportServicios');
    if (btnServ) {
      btnServ.addEventListener('click', () => {
        importFile((rows)=>{
          const n = importServiciosFromRows(rows);
          alert(`Cargados ${n} servicios.`);
          if (typeof renderizarServicios === 'function'){
            try { renderizarServicios(); } catch {}
          }
        });
      });
    }

    // Importar Equipos
    const btnEq = document.getElementById('btnImportEquipos');
    if (btnEq) {
      btnEq.addEventListener('click', () => {
        importFile((rows)=>{
          const n = importEquiposFromRows(rows);
          alert(`Cargados ${n} modelos de equipos.`);
          if (typeof renderizarEquipos === 'function'){
            try { renderizarEquipos(); } catch {}
          }
        });
      });
    }

    // Importar Retirados
    const btnRet = document.getElementById('btnImportRetirados');
    if (btnRet) {
      btnRet.addEventListener('click', () => {
        importFile((rows)=>{
          const n = importRetiradosFromRows(rows);
          alert(`Cargados ${n} modelos de retirados.`);
          if (typeof renderizarRetirados === 'function'){
            try { renderizarRetirados(); } catch {}
          }
          if (typeof window.refreshRetiradosFromAdmin === 'function'){
            try { window.refreshRetiradosFromAdmin(); } catch {}
          }
        });
      });
    }


  }

  document.addEventListener('DOMContentLoaded', init);
})();
