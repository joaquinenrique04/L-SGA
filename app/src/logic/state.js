// state.js (extraído de script.js)
let categoriaActual = 'instalacion'; // Variable global para la categoría actual
let maintenanceExtraCodesVisible = 0;

function actualizarPanelCodigosMantenimiento() {
  const panel = document.getElementById('maintenanceCodesPanel');
  const extra1 = document.getElementById('buscadorServicioExtra1');
  const extra2 = document.getElementById('buscadorServicioExtra2');
  const btnAdd = document.getElementById('btnAddMaintenanceCode');
  const btnRemove = document.getElementById('btnRemoveMaintenanceCode');
  const isMaintenance = categoriaActual === 'mantenimiento';

  if (panel) panel.classList.toggle('hidden', !isMaintenance);

  if (!isMaintenance) {
    maintenanceExtraCodesVisible = 0;
    if (extra1) extra1.value = '';
    if (extra2) extra2.value = '';
  }

  if (extra1) extra1.classList.toggle('hidden', !isMaintenance || maintenanceExtraCodesVisible < 1);
  if (extra2) extra2.classList.toggle('hidden', !isMaintenance || maintenanceExtraCodesVisible < 2);
  if (btnAdd) btnAdd.classList.toggle('hidden', !isMaintenance || maintenanceExtraCodesVisible >= 2);
  if (btnRemove) btnRemove.classList.toggle('hidden', !isMaintenance || maintenanceExtraCodesVisible === 0);
}

function agregarCodigoMantenimiento() {
  if (categoriaActual !== 'mantenimiento' || maintenanceExtraCodesVisible >= 2) return;
  maintenanceExtraCodesVisible += 1;
  actualizarPanelCodigosMantenimiento();
}

function quitarCodigoMantenimiento() {
  if (categoriaActual !== 'mantenimiento' || maintenanceExtraCodesVisible <= 0) return;
  const extra1 = document.getElementById('buscadorServicioExtra1');
  const extra2 = document.getElementById('buscadorServicioExtra2');
  if (maintenanceExtraCodesVisible === 2 && extra2) extra2.value = '';
  if (maintenanceExtraCodesVisible === 1 && extra1) extra1.value = '';
  maintenanceExtraCodesVisible -= 1;
  actualizarPanelCodigosMantenimiento();
  actualizarTexto();
}

function resetCodigosMantenimiento() {
  maintenanceExtraCodesVisible = 0;
  const extra1 = document.getElementById('buscadorServicioExtra1');
  const extra2 = document.getElementById('buscadorServicioExtra2');
  if (extra1) extra1.value = '';
  if (extra2) extra2.value = '';
  actualizarPanelCodigosMantenimiento();
}

function integrarServiciosPersonalizados() {
  let listaCustom = [];
  try {
    const raw = localStorage.getItem('customServices');
    if (raw) {
      listaCustom = JSON.parse(raw);
      if (!Array.isArray(listaCustom)) listaCustom = [];
    }
  } catch { listaCustom = []; }

  listaCustom.forEach(item => {
    const {medio, categoria, servicio, materiales} = item;
    const servicioNormalizado = normalizaServicio(servicio);
    if (categoriasServicio[medio] && Array.isArray(categoriasServicio[medio][categoria])) {
      if (!categoriasServicio[medio][categoria].includes(servicioNormalizado)) {
        categoriasServicio[medio][categoria].push(servicioNormalizado);
      }
    }
    if (window.materialesPorServicio) {
      // Crear clave única por medio, categoria y servicio
      const key = `${medio}_${categoria}_${servicioNormalizado}`;
      window.materialesPorServicio[key] = materiales;
    }
  });
}

function cambiarMedio(nuevoMedio) {
  medioActual = nuevoMedio;
  configurarMedio(medioActual);

  if (nuevoMedio === 'hfc') {
    marcarBoton('btnHFC');
    desmarcarBoton('btnFTTH');
  } else {
    marcarBoton('btnFTTH');
    desmarcarBoton('btnHFC');
  }
  marcarBoton('btnInstalacion');
  desmarcarBoton('btnMantenimiento');
  desmarcarBoton('btnPostventa');
  cambiarCategoria('instalacion');
}

function configurarMedio(medio) {
  // Instalados → equipo
  const lblEq    = document.getElementById('lblEquipoPrincipal');
  const lblSer   = document.getElementById('lblSeriePrincipal');
  const selectEq = document.getElementById('equipo');
  if (lblEq && lblSer && selectEq) {
    selectEq.innerHTML = `<option value="">-- Selecciona un ${medio === 'hfc' ? 'equipo MTA' : 'router'} --</option>`;
    lblEq.textContent  = equiposPorMedio[medio].labelEquipo;
    lblSer.textContent = equiposPorMedio[medio].labelSerie;
    equiposPorMedio[medio].opciones.forEach(modelo => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = modelo;
      selectEq.appendChild(opt);
    });

    // + custom equipos (tipo equipo, instalados)
    let arrEquipos = [];
    try {
      const raw = localStorage.getItem('catalogoModelos');
      if (raw) { arrEquipos = JSON.parse(raw); if (!Array.isArray(arrEquipos)) arrEquipos = []; }
    } catch { arrEquipos = []; }
    arrEquipos
      .filter(item => item.medio === medio && item.tipo === 'equipo' && item.aplica === 'instalado')
      .forEach(item => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = item.modelo;
        selectEq.appendChild(opt);
      });
  }

  // Instalados → deco/ipTv
  const lblDc    = document.getElementById('lblDecoPrincipal');
  const selectDc = document.getElementById('deco');
  if (lblDc && selectDc) {
    selectDc.innerHTML = `<option value="">-- Selecciona un ${medio === 'hfc' ? 'decodificador' : 'IPTV'} --</option>`;
    lblDc.textContent  = decoPorMedio[medio].labelDeco;
    decoPorMedio[medio].opciones.forEach(modelo => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = modelo;
      selectDc.appendChild(opt);
    });

    // + custom equipos (tipo deco, instalados)
    let arrEquipos = [];
    try {
      const raw = localStorage.getItem('catalogoModelos');
      if (raw) { arrEquipos = JSON.parse(raw); if (!Array.isArray(arrEquipos)) arrEquipos = []; }
    } catch { arrEquipos = []; }
    arrEquipos
      .filter(item => item.medio === medio && item.tipo === 'deco' && item.aplica === 'instalado')
      .forEach(item => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = item.modelo;
        selectDc.appendChild(opt);
      });
  }

  // Instalados → repetidor (se suman personalizados tipo "repetidor")
  const selectRep = document.getElementById('repetidor');
  if (selectRep) {
    // deja las opciones fijas y añade personalizadas
    let arrEquipos = [];
    try {
      const raw = localStorage.getItem('catalogoModelos');
      if (raw) { arrEquipos = JSON.parse(raw); if (!Array.isArray(arrEquipos)) arrEquipos = []; }
    } catch { arrEquipos = []; }
    // limpiamos todo salvo el placeholder
    const first = selectRep.querySelector('option');
    selectRep.innerHTML = '';
    if (first) selectRep.appendChild(first);
    // personalizadas (instalados)
    arrEquipos
      .filter(item => item.medio === medio && item.tipo === 'repetidor' && item.aplica === 'instalado')
      .forEach(item => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = item.modelo;
        selectRep.appendChild(opt);
      });
  }

  // ================== RETIRADOS ==================
  const retEq    = document.getElementById('retEq');
  const retDeco  = document.getElementById('retDeco');
  const retRep   = document.getElementById('retRep');
  const lblRetEq = document.getElementById('lblRetEq');
  const lblRetDc = document.getElementById('lblRetDeco');

  if (retEq && lblRetEq) {
    retEq.innerHTML = `<option value="">-- Selecciona equipo retirado --</option>`;
    lblRetEq.textContent = (medio === 'hfc')
      ? "Equipo retirado (MTA):"
      : "Equipo retirado (Router/ONT):";
    (retiradosPorMedio[medio].equipo || []).forEach(m => {
      const o = document.createElement('option');
      o.value = o.textContent = m;
      retEq.appendChild(o);
    });
    // + custom equipos retirados (tipo equipo)
    let arrEquipos = [];
    try {
      const raw = localStorage.getItem('catalogoModelos');
      if (raw) { arrEquipos = JSON.parse(raw); if (!Array.isArray(arrEquipos)) arrEquipos = []; }
    } catch { arrEquipos = []; }
    arrEquipos
      .filter(item => item.medio === medio && item.tipo === 'equipo' && item.aplica === 'retirado')
      .forEach(item => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = item.modelo;
        retEq.appendChild(opt);
      });
  }
  if (retDeco && lblRetDc) {
    retDeco.innerHTML = `<option value="">-- Selecciona decodificador/IPTV retirado --</option>`;
    lblRetDc.textContent = (medio === 'hfc')
      ? "Decodificador retirado:"
      : "IPTV retirado:";
    (retiradosPorMedio[medio].deco || []).forEach(m => {
      const o = document.createElement('option');
      o.value = o.textContent = m;
      retDeco.appendChild(o);
    });
    // + custom equipos retirados (tipo deco)
    let arrEquipos = [];
    try {
      const raw = localStorage.getItem('catalogoModelos');
      if (raw) { arrEquipos = JSON.parse(raw); if (!Array.isArray(arrEquipos)) arrEquipos = []; }
    } catch { arrEquipos = []; }
    arrEquipos
      .filter(item => item.medio === medio && item.tipo === 'deco' && item.aplica === 'retirado')
      .forEach(item => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = item.modelo;
        retDeco.appendChild(opt);
      });
  }

  // Repetidor retirado
  if (retRep) {
    retRep.innerHTML = `<option value="">-- Selecciona un repetidor retirado --</option>`;
    // + custom equipos retirados (tipo repetidor)
    let arrEquipos = [];
    try {
      const raw = localStorage.getItem('catalogoModelos');
      if (raw) { arrEquipos = JSON.parse(raw); if (!Array.isArray(arrEquipos)) arrEquipos = []; }
    } catch { arrEquipos = []; }
    arrEquipos
      .filter(item => item.medio === medio && item.tipo === 'repetidor' && item.aplica === 'retirado')
      .forEach(item => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = item.modelo;
        retRep.appendChild(opt);
      });
  }

  actualizarTexto();
}

function cambiarCategoria(tipo) {
  categoriaActual = tipo; // Actualizar la variable global
  const selectServicio = document.getElementById("servicio");
  const buscador       = document.getElementById("buscadorServicio");
  const datalist       = document.getElementById("datalistServicios");

  ['btnInstalacion','btnMantenimiento','btnPostventa'].forEach(id => desmarcarBoton(id));
  if (tipo === 'instalacion') marcarBoton('btnInstalacion');
  else if (tipo === 'mantenimiento') marcarBoton('btnMantenimiento');
  else marcarBoton('btnPostventa');

  if (tipo === 'mantenimiento') {
    selectServicio.style.display = 'none';
    buscador.style.display = 'block';
    datalist.innerHTML = '';
    categoriasServicio[medioActual][tipo].forEach(opcion => {
      const opt = document.createElement("option");
      opt.value = opcion;
      datalist.appendChild(opt);
    });
  } else {
    selectServicio.style.display = 'block';
    buscador.style.display = 'none';
    selectServicio.innerHTML = '<option value="">-- Selecciona un servicio --</option>';
    categoriasServicio[medioActual][tipo].forEach(opcion => {
      const opt = document.createElement("option");
      opt.value = opt.textContent = opcion;
      selectServicio.appendChild(opt);
    });
    selectServicio.dataset.opcionesOriginales = JSON.stringify(categoriasServicio[medioActual][tipo]);
  }

  selectServicio.value = '';
  buscador.value = '';
  actualizarPanelCodigosMantenimiento();
  actualizarTexto();
}

function normalizaServicio(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

function obtenerMateriales(servicioCrudo) {
  const servicioNormalizado = normalizaServicio(servicioCrudo);
  const src = window.materialesPorServicio || {};
  // Buscar clave exacta por medio, categoria y servicio
  const keyExacta = `${medioActual}_${categoriaActual}_${servicioNormalizado}`;
  if (src[keyExacta]) {
    return src[keyExacta];
  }
  // Fallback: buscar por servicio solo (para compatibilidad con servicios hardcodeados)
  const idx = {};
  Object.keys(src).forEach(k => {
    if (!k.includes('_')) { // Solo claves sin '_', es decir, servicios hardcodeados
      idx[ normalizaServicio(k) ] = src[k];
    }
  });
  return idx[servicioNormalizado];
}

// Ya no se usa filtrarServicios, se usa datalist nativo

// state.js
// Helpers robustos para SOT
function _getSotInput() {
  // Busca por IDs comunes y por atributo name/placeholder
  return document.querySelector(
    '#numSot, #sot, #numeroSot, input[name="sot"], input[placeholder*="sot" i]'
  );
}
function _normalizeSOT(v){ return String(v ?? '').replace(/\D/g,''); }

// Búsqueda usando índice creado al cargar el Excel
// Normaliza SOT: solo dígitos
function _normalizeSOT(v){ return String(v ?? '').replace(/\D/g,''); }

// Encuentra el input de SOT de forma robusta
function _getSotInput() {
  return document.querySelector('#numSot, #sot, #numeroSot, input[name="sot"], input[placeholder*="sot" i]');
}

function _aplicarFilaExcel(row, target) {
  if (!row) return false;

  const strip = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const findKey = (keys) => Object.keys(row).find(x => keys.some(key => strip(x).includes(strip(key))));

  if (target) target.value = _normalizeSOT(target.value || row[window.colSOT || '']);

  const kFecha = findKey(['fecha','fech','date']);
  if (kFecha) {
    let raw = String(row[kFecha] ?? '').trim().replace(/\s+/g,'');
    const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    let fechaFmt = raw;
    if (m) {
      let a = +m[1], b = +m[2], y = +m[3];
      let dia = a, mes = b;
      if (b > 12 && a <= 12) { dia = b; mes = a; }
      else if (a <= 12 && b <= 12) { dia = b; mes = a; }
      if (y > 100) y = y % 100;
      fechaFmt = `${dia}/${mes}/${y.toString().padStart(2,'0')}`;
    }
    const nFecha = document.getElementById('fecha');
    if (nFecha) nFecha.value = fechaFmt;
  }

  let horaStr = '';
  const kHora = findKey(['hora', 'time']);
  if (kHora && row[kHora] != null) horaStr = String(row[kHora]).trim();
  if (!horaStr) {
    const kRango = findKey(['inicio - fin', 'inicio-fin', 'inicio fin']);
    if (kRango && row[kRango] != null) horaStr = String(row[kRango]).trim();
  }
  const nodeHora = document.getElementById('hora');
  if (nodeHora) nodeHora.value = horaStr;

  const kCint = findKey(['cintillo','cint']);
  if (kCint) { const n = document.getElementById('cintillo'); if (n) n.value = String(row[kCint] ?? '').trim(); }

  const kTec = findKey(['tecnico 1','técnico 1','tecnico','técnico','nombre tecnico','responsable']);
  if (kTec)  { const n = document.getElementById('tecnico');  if (n) n.value = String(row[kTec] ?? '').trim(); }

  actualizarTexto();
  return true;
}

function limpiarSeriesSotAnterior() {
  const seriesIds = [
    'serieMta',
    'serieDeco1', 'serieDeco2', 'serieDeco3', 'serieDeco4', 'serieDeco5',
    'serieRep1', 'serieRep2',
    'retSerieEq',
    'retSerieDeco1', 'retSerieDeco2', 'retSerieDeco3', 'retSerieDeco4', 'retSerieDeco5',
    'retSerieRep1', 'retSerieRep2'
  ];

  seriesIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    el.classList?.remove('input-alerta');
  });

  ['iconoAlertaMta', 'iconoAlertaDeco', 'iconoAlertaRep'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

// ---- NUEVA buscarDatos ----
function buscarDatos() {
  const el = _getSotInput();
  const target = _normalizeSOT(el?.value);
  if (!target) { alert('Ingresa Nº de SOT.'); return; }

  if (!(window.sotIndex instanceof Map) || window.sotIndex.size === 0) {
    alert('Primero carga el Excel (Hoja1) — no hay índice de SOT.');
    return;
  }

  const row = window.sotIndex.get(target);
  if (!row) { alert('SOT no encontrado.'); return; }
  if (typeof window.highlightExcelViewerRow === 'function') {
    window.highlightExcelViewerRow(target);
  }
  limpiarSeriesSotAnterior();
  _aplicarFilaExcel(row, el);
}
window.buscarDatos = buscarDatos;
window.cargarFilaExcelEnFormulario = function cargarFilaExcelEnFormulario(row) {
  const el = _getSotInput();
  const rowSot = _normalizeSOT(row?.[window.colSOT || '']);
  if (rowSot && typeof window.highlightExcelViewerRow === 'function') {
    window.highlightExcelViewerRow(rowSot);
  }
  return _aplicarFilaExcel(row, el);
};





// Exponer en window
window.integrarServiciosPersonalizados = integrarServiciosPersonalizados;
window.cambiarMedio = cambiarMedio;
window.configurarMedio = configurarMedio;
  window.cambiarCategoria = cambiarCategoria;
window.agregarCodigoMantenimiento = agregarCodigoMantenimiento;
window.quitarCodigoMantenimiento = quitarCodigoMantenimiento;
window.resetCodigosMantenimiento = resetCodigosMantenimiento;
window.normalizaServicio = normalizaServicio;
window.obtenerMateriales = obtenerMateriales;
window.limpiarSeriesSotAnterior = limpiarSeriesSotAnterior;
window.buscarDatos = buscarDatos;


// ───────────────────────────────────────────────────────────────
// REGISTRO DIARIO DE EQUIPOS INSTALADOS (IDs reales del formulario)
// ───────────────────────────────────────────────────────────────

const REG_KEY = 'registroInstalados';

function _leerRegistro() {
  try { return JSON.parse(localStorage.getItem(REG_KEY)) || []; }
  catch { return []; }
}
function _guardarRegistro(arr) { localStorage.setItem(REG_KEY, JSON.stringify(arr)); }

function _fechaHoyDDMMYYYY() {
  const d = new Date(); const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0'); const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function _val(...sels){
  for (const s of sels){ const el = document.querySelector(s); if (el && typeof el.value !== 'undefined') return (el.value || '').trim(); }
  return '';
}
function _series(listIds, fallbackId){
  const arr = [];
  for (const id of listIds){ const v = document.getElementById(id)?.value?.trim(); if (v) arr.push(v); }
  if (!arr.length && fallbackId){ const v = document.getElementById(fallbackId)?.value?.trim(); if (v) arr.push(v); }
  return arr;
}

function registrarInstalados() {
  const sot     = _val('#numSot', '#sot', 'input[name="sot"]');
  const fecha   = _val('#fecha') || _fechaHoyDDMMYYYY();
  const tecnico = _val('#tecnico');

  const items = [];

  // MTA / Router
  const mtaLabel = _val('#equipo', '#mta', 'select[name="equipo"]');
  const serieMta = _val('#serieMta', '#serieMTA', '#serie');
  if (mtaLabel && serieMta) items.push({ sot, fecha, equipo: `MTA ${mtaLabel}`, serie: serieMta, tecnico });

  // Deco / IPTV
  const decoLabel   = _val('#deco', '#decodificador', '#iptv');
  const seriesDeco  = _series(['serieDeco1','serieDeco2','serieDeco3','serieDeco4','serieDeco5'],'serieDeco');
  if (decoLabel && seriesDeco.length) for (const s of seriesDeco) items.push({ sot, fecha, equipo:`Deco ${decoLabel}`, serie:s, tecnico });

  // Repetidor
  const repLabel = _val('#repetidor', '#rep');
  const seriesRep= _series(['serieRep1','serieRep2','serieRep3','serieRep4','serieRep5'],'serieRep');
  if (repLabel && seriesRep.length) for (const s of seriesRep) items.push({ sot, fecha, equipo:`Repetidor ${repLabel}`, serie:s, tecnico });

  if (!items.length) { alert('No hay equipos con serie para registrar.'); return; }

  const reg = _leerRegistro();
  const key = r => `${r.sot}__${r.equipo}__${r.serie}`;
  const set = new Set(reg.map(key));
  let nuevos = 0;
  for (const it of items) {
    const k = key(it);
    if (!set.has(k)) { reg.push(it); set.add(k); nuevos++; }
  }
  _guardarRegistro(reg);
  alert(`Registrado(s) ${nuevos} equipo(s) para la SOT ${sot || '(sin SOT)'}.`);
}
window.registrarInstalados = registrarInstalados;

// ── Exportadores a Excel (XLSX)
function descargarExcelDelDia() {
  if (typeof XLSX === 'undefined') { alert('No se encontró la librería XLSX.'); return; }
  const hoy = _fechaHoyDDMMYYYY();
  const reg = _leerRegistro().filter(r => (r.fecha||'') === hoy);
  if (!reg.length) { alert('No hay registros para hoy.'); return; }

  const rows = reg.map(r => ({ 'SOT': r.sot||'', 'Fecha': r.fecha||'', 'Equipo': r.equipo||'', 'Serie equipo': r.serie||'', 'Técnico': r.tecnico||'' }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: ['SOT','Fecha','Equipo','Serie equipo','Técnico'] });
  XLSX.utils.book_append_sheet(wb, ws, 'Instalados');
  const [dd,mm,yy] = hoy.split('/');
  XLSX.writeFile(wb, `instalados_${yy}-${mm}-${dd}.xlsx`);
}
function descargarExcelCompleto() {
  if (typeof XLSX === 'undefined') { alert('No se encontró la librería XLSX.'); return; }
  const reg = _leerRegistro();
  if (!reg.length) { alert('No hay registros.'); return; }
  const rows = reg.map(r => ({ 'SOT': r.sot||'', 'Fecha': r.fecha||'', 'Equipo': r.equipo||'', 'Serie equipo': r.serie||'', 'Técnico': r.tecnico||'' }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: ['SOT','Fecha','Equipo','Serie equipo','Técnico'] });
  XLSX.utils.book_append_sheet(wb, ws, 'Instalados');
  XLSX.writeFile(wb, `instalados_todos.xlsx`);
}
function limpiarRegistroDelDia() {
  const hoy = _fechaHoyDDMMYYYY();
  const otros = _leerRegistro().filter(r => (r.fecha||'') !== hoy);
  _guardarRegistro(otros);
  alert('Registro de hoy eliminado (otros días se mantienen).');
}
window.descargarExcelDelDia = descargarExcelDelDia;
window.descargarExcelCompleto = descargarExcelCompleto;
window.limpiarRegistroDelDia = limpiarRegistroDelDia;





// Llama a esto al iniciar (donde ya integras personalizados)
function integrarServiciosPersonalizadosDesdeBundle() {
  const fromCode = Array.isArray(window.CUSTOM_SERVICES_BUNDLED)
    ? window.CUSTOM_SERVICES_BUNDLED
    : [];
  if (!fromCode.length) return;

  fromCode.forEach(s => {
    const medio = (s.medio || 'hfc').toLowerCase();
    const cat   = (s.categoria || 'instalacion').toLowerCase();
    const desc  = normalizaServicio(s.servicio || '');
    if (!desc) return;

    // 1) Asegurar que el servicio aparezca en el combo de ese medio/categoría
    try {
      const arr = window.categoriasServicio?.[medio]?.[cat];
      if (!Array.isArray(arr)) return;
      if (!arr.includes(desc)) arr.push(desc);
    } catch (e) { /* si no existe la rama, la ignoramos */ }

    // 2) Materiales por servicio (si hay)
    if (!window.materialesPorServicio) window.materialesPorServicio = {};
    if (Array.isArray(s.materiales)) {
      // Crear clave única por medio, categoria y servicio
      const key = `${medio}_${cat}_${desc}`;
      window.materialesPorServicio[key] = s.materiales.slice();
    } else if (!(desc in window.materialesPorServicio)) {
      window.materialesPorServicio[desc] = [];
    }
  });
}
// En tu init de la app, llama además:
integrarServiciosPersonalizadosDesdeBundle();
