// excel.js — cache persistente + DOM binding robusto
(function () {
  // ===================== Helpers =====================
  function normSOT(v) { return String(v ?? '').replace(/\D/g, ''); }
  function stripAcc(s) { return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

  // Detecta la columna SOT en un arreglo de filas (objetos)
  function detectarColumnaSOT(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const candidatos = ['sot', 'n° sot', 'nro sot', 'n de sot', 'n° de sot', 'numero sot', 'numero de sot', 'orden de trabajo', 'ot'];
    const keys = Object.keys(rows[0] || {});

    // 1) Por encabezado
    for (const k of keys) {
      const sk = stripAcc(k).toLowerCase();
      if (candidatos.some(h => sk.includes(stripAcc(h).toLowerCase()))) return k;
    }
    // 2) Heurística: la que tenga más valores "tipo número largo"
    let best = null;
    for (const k of keys) {
      let c = 0;
      for (const r of rows) {
        const nv = normSOT(r[k]);
        if (nv.length >= 6) c++;
      }
      if (!best || c > best.c) best = { k, c };
    }
    return best?.k || keys[0];
  }

  function construirIndiceSOT(rows, colName) {
    const map = new Map();
    if (!Array.isArray(rows)) return map;
    for (const row of rows) {
      const key = normSOT(row[colName]);
      if (key && !map.has(key)) map.set(key, row);
    }
    return map;
  }

  // ===================== Cache persistente =====================
  let SOT_DB = []; // filas JSON
  let SOT_DB_META = { fileName: '', rows: 0, loadedAt: '', colSOTName: '' };

  function syncExcelViewer() {
    window.sotDbMeta = SOT_DB_META;
    if (typeof window.renderExcelViewer === 'function') {
      window.renderExcelViewer(SOT_DB, SOT_DB_META);
    }
  }

  function renderExcelStatus() {
    const el = document.getElementById('excelStatus');
    if (!el) return;
    if (SOT_DB && SOT_DB.length) {
      const dt = new Date(SOT_DB_META.loadedAt || Date.now());
      el.textContent = `Base cargada: ${SOT_DB_META.fileName || 'sin nombre'} (${SOT_DB.length} filas) — ${dt.toLocaleString()}`;
      el.style.color = 'green';
    } else {
      el.textContent = 'Sin base cargada';
      el.style.color = '#a00';
    }
  }

  async function restoreSotDb() {
    try {
      // 1) localStorage
      const txt = localStorage.getItem('sotDb');
      if (txt) {
        const j = JSON.parse(txt);
        if (Array.isArray(j)) SOT_DB = j;
      }
      const metaTxt = localStorage.getItem('sotDbMeta');
      if (metaTxt) {
        const jm = JSON.parse(metaTxt);
        if (jm && typeof jm === 'object') SOT_DB_META = jm;
      }

      // 2) Disco (Electron) si no hay nada
      if ((!SOT_DB || SOT_DB.length === 0) && window.desktop?.readData) {
        const disk = await window.desktop.readData();
        if (Array.isArray(disk?.sotDb)) {
          SOT_DB = disk.sotDb;
          if (disk.sotDbMeta) SOT_DB_META = disk.sotDbMeta;
          localStorage.setItem('sotDb', JSON.stringify(SOT_DB));
          localStorage.setItem('sotDbMeta', JSON.stringify(SOT_DB_META));
        }
      }
    } catch (e) {
      console.warn('restoreSotDb error:', e);
    }

    // Reconstruir globals que usa tu app
    if (SOT_DB && SOT_DB.length) {
      window.datosExcel = SOT_DB;
      window.colSOT = SOT_DB_META.colSOTName || detectarColumnaSOT(SOT_DB) || null;
      window.sotIndex = construirIndiceSOT(SOT_DB, window.colSOT || '');
    }
    renderExcelStatus();
    syncExcelViewer();
  }

  async function cacheSotDb(rows, meta = {}) {
    try {
      SOT_DB = Array.isArray(rows) ? rows : [];
      SOT_DB_META = {
        fileName: meta.fileName || '',
        rows: SOT_DB.length,
        loadedAt: meta.loadedAt || new Date().toISOString(),
        colSOTName: meta.colSOTName || detectarColumnaSOT(SOT_DB) || ''
      };
      localStorage.setItem('sotDb', JSON.stringify(SOT_DB));
      localStorage.setItem('sotDbMeta', JSON.stringify(SOT_DB_META));

      // Persistir también en disco (si es el .exe)
      if (window.desktop?.readData && window.desktop?.writeData) {
        const current = await window.desktop.readData();
        await window.desktop.writeData({
          ...current,
          sotDb: SOT_DB,
          sotDbMeta: SOT_DB_META
        });
      }
    } catch (e) {
      console.warn('cacheSotDb error:', e);
    }

    // Reconstruir globals y status
    if (SOT_DB && SOT_DB.length) {
      window.datosExcel = SOT_DB;
      window.colSOT = SOT_DB_META.colSOTName || detectarColumnaSOT(SOT_DB) || null;
      window.sotIndex = construirIndiceSOT(SOT_DB, window.colSOT || '');
    }
    renderExcelStatus();
    syncExcelViewer();
  }

  // Exponer helper de búsqueda por si lo usas desde otro script
  window.buscarSotEnCache = function (sot) {
    const key = normSOT(sot);
    if (!key || !window.sotIndex) return null;
    return window.sotIndex.get(key) || null;
  };

  // ===================== Carga del Excel (input file) =====================
  function bindExcelListener() {
    const inputExcel = document.getElementById('inputExcel');
    if (!inputExcel) return false;

    if (!window.__excelListenerBound) {
      inputExcel.addEventListener('change', async function (event) {
        const archivo = event.target.files?.[0];
        if (!archivo) return;

        const lector = new FileReader();
        lector.onload = async function (e) {
          try {
            const data = new Uint8Array(e.target.result);
            // Parsear con SheetJS
            const wb = XLSX.read(data, { type: 'array' });
            const hoja = wb.Sheets['Hoja1'] || wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(hoja, { defval: '', raw: false });

            // Construir globals a partir de rows
            const colName = detectarColumnaSOT(rows) || '';
            window.datosExcel = rows;
            window.colSOT = colName;
            window.sotIndex = construirIndiceSOT(rows, colName);

            // Cachear (localStorage + disco si Electron)
            await cacheSotDb(rows, { fileName: archivo.name, colSOTName: colName });

            alert(`Archivo Excel cargado: ${archivo.name} (${rows.length} filas)`);
          } catch (err) {
            console.error('Error leyendo Excel:', err);
            alert('No se pudo leer el Excel: ' + err.message);
          }
        };
        lector.readAsArrayBuffer(archivo);
      });
      window.__excelListenerBound = true;
    }
    return true;
  }

  // Si el input aún no existe, espera al DOM; además restaura la base en cada carga
  document.addEventListener('DOMContentLoaded', async () => {
    bindExcelListener();
    await restoreSotDb(); // ← importante: restaura base si ya estaba cargada antes
  }, { once: true });
})();
