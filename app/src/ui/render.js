// render.js (extraído de script.js)
function marcarBoton(idBtn)   { document.getElementById(idBtn)?.classList.add('active'); }
function desmarcarBoton(idBtn){ document.getElementById(idBtn)?.classList.remove('active'); }

function normalizarTextoMaterial(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function tipoEquipoKey(medio, tipo) {
  const m = String(medio || '').toLowerCase();
  const t = String(tipo || '').toLowerCase();
  if (t === 'equipo') return m === 'hfc' ? 'MTA' : 'Router';
  if (t === 'deco') return m === 'hfc' ? 'Decodificador' : 'IPTV';
  if (t === 'repetidor') return 'Repetidor';
  return t;
}

function getEquipoKey(medio, tipo, modelo) {
  return `${medio}::${tipoEquipoKey(medio, tipo)}::${modelo}`.trim().toUpperCase();
}

function cargarMaterialesAutomaticosPorEquipo() {
  // Los materiales automaticos por modelo exacto se leen desde localStorage.materialesAutomaticosPorEquipo.
  try {
    const raw = localStorage.getItem('materialesAutomaticosPorEquipo');
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function guardarMaterialesAutomaticosPorEquipo(data) {
  localStorage.setItem('materialesAutomaticosPorEquipo', JSON.stringify(data || {}));
}

function cargarCatalogoMateriales() {
  try {
    const raw = localStorage.getItem('catalogoMateriales');
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function parsearMaterialManual(linea) {
  const texto = String(linea || '').trim();
  if (!texto) return null;

  const cantidadMatch = texto.match(/\s*(?::|x)\s*(\d+)\s*(?:\[.*\])?$/i);
  const cantidad = cantidadMatch ? parseInt(cantidadMatch[1], 10) : 1;
  const sinCantidad = cantidadMatch ? texto.slice(0, cantidadMatch.index).trim() : texto;
  const codeMatch = sinCantidad.match(/^(\d{5,})\s*-\s*(.+)$/);

  return {
    codigoMaterial: codeMatch ? codeMatch[1].trim() : '',
    nombreMaterial: codeMatch ? codeMatch[2].trim() : sinCantidad,
    cantidad,
    automatico: false
  };
}

function formatearMaterial(material) {
  const codigo = String(material.codigoMaterial || '').trim();
  const nombre = String(material.nombreMaterial || '').trim();
  const cantidad = Number.isFinite(material.cantidad) ? material.cantidad : 1;
  const base = codigo ? `${codigo} - ${nombre}` : nombre;
  return `${base} x ${cantidad}`;
}

function consolidarMateriales(materiales) {
  // Combina materiales manuales y automaticos por codigo, o por nombre si no existe codigo.
  const map = new Map();
  (materiales || []).forEach(item => {
    if (!item) return;
    const codigo = String(item.codigoMaterial || '').trim();
    const nombre = String(item.nombreMaterial || '').trim();
    if (!codigo && !nombre) return;

    const materialId = String(item.materialId || '').trim();
    const key = materialId ? `id:${materialId}` : (codigo ? `codigo:${normalizarTextoMaterial(codigo)}` : `nombre:${normalizarTextoMaterial(nombre)}`);
    const cantidad = parseInt(item.cantidad ?? item.cantidadPorEquipo ?? 1, 10);
    const safeCantidad = Number.isInteger(cantidad) && cantidad > 0 ? cantidad : 1;
    if (!map.has(key)) {
      map.set(key, {
        codigoMaterial: codigo,
        nombreMaterial: nombre,
        materialId,
        cantidad: 0,
        automatico: false
      });
    }
    const actual = map.get(key);
    actual.cantidad += safeCantidad;
    actual.automatico = actual.automatico || item.automatico === true;
    if (!actual.materialId && materialId) actual.materialId = materialId;
    if (!actual.codigoMaterial && codigo) actual.codigoMaterial = codigo;
    if (!actual.nombreMaterial && nombre) actual.nombreMaterial = nombre;
  });
  return Array.from(map.values());
}

function contarSeries(ids) {
  return ids
    .map(id => document.getElementById(id)?.value?.trim() || '')
    .filter(Boolean).length;
}

function obtenerMaterialesAutomaticosDelEquipo(medio, tipo, modelo, cantidadEquipos) {
  const cantidad = parseInt(cantidadEquipos || 0, 10);
  if (!modelo || !Number.isInteger(cantidad) || cantidad <= 0) return [];
  const data = cargarMaterialesAutomaticosPorEquipo();
  const key = getEquipoKey(medio, tipo, modelo);
  const materiales = Array.isArray(data[key]) ? data[key] : [];
  const catalogo = cargarCatalogoMateriales();
  return materiales
    .map(item => {
      const catalogItem = item.materialId ? catalogo.find(mat => mat.id === item.materialId) : catalogo.find(mat =>
        (item.codigo && mat.codigo === item.codigo) || (!item.codigo && normalizarTextoMaterial(mat.nombre) === normalizarTextoMaterial(item.nombre))
      );
      if (item.materialId && !catalogItem) return null;
      if (catalogItem && catalogItem.activo === false) return null;
      const cantidadPorEquipo = parseInt(item.cantidad || 0, 10);
      if (!Number.isInteger(cantidadPorEquipo) || cantidadPorEquipo <= 0) return null;
      return {
        materialId: item.materialId || catalogItem?.id || '',
        codigoMaterial: String(item.codigo || item.codigoMaterial || '').trim(),
        nombreMaterial: String(item.nombre || item.nombreMaterial || '').trim(),
        cantidad: cantidad * cantidadPorEquipo,
        automatico: true
      };
    })
    .filter(Boolean);
}

function calcularMaterialesAutomaticosPorEquiposInstalados() {
  // Recalcula desde cero los materiales automaticos configurados por modelo exacto instalado.
  const medio = String(typeof medioActual !== 'undefined' ? medioActual : '').toLowerCase();
  const equipos = [
    {
      tipoEquipo: 'equipo',
      modelo: document.getElementById('equipo')?.value || '',
      cantidad: document.getElementById('serieMta')?.value?.trim() ? 1 : 0
    },
    {
      tipoEquipo: 'deco',
      modelo: document.getElementById('deco')?.value || '',
      cantidad: contarSeries(['serieDeco1', 'serieDeco2', 'serieDeco3', 'serieDeco4', 'serieDeco5'])
    },
    {
      tipoEquipo: 'repetidor',
      modelo: document.getElementById('repetidor')?.value || '',
      cantidad: contarSeries(['serieRep1', 'serieRep2'])
    }
  ];

  return equipos.flatMap(equipo =>
    obtenerMaterialesAutomaticosDelEquipo(medio, equipo.tipoEquipo, equipo.modelo, equipo.cantidad)
  );
}

function actualizarTexto() {
  // N° ACTA ← SOT (robusto: numSot / sot / name="sot")
  const sot      = (document.querySelector('#numSot, #sot, input[name="sot"]')?.value || '').trim();
  const fecha    = document.getElementById('fecha')?.value?.trim() || '';
  const hora     = document.getElementById('hora')?.value?.trim() || '';
  const cintillo = document.getElementById('cintillo')?.value?.trim() || '';
  const tecnico  = document.getElementById('tecnico')?.value?.trim() || '';

  let servicio = '';
  const selectServicio = document.getElementById('servicio');
  const buscadorServicio = document.getElementById('buscadorServicio');
  if (selectServicio && selectServicio.style.display !== 'none') {
    servicio = (selectServicio.value || '').trim();
  } else if (buscadorServicio && buscadorServicio.style.display !== 'none') {
    servicio = (buscadorServicio.value || '').trim();
  }
  const codigosMantenimiento = [
    servicio,
    document.getElementById('buscadorServicioExtra1')?.value?.trim() || '',
    document.getElementById('buscadorServicioExtra2')?.value?.trim() || ''
  ].filter(Boolean);
  const servicioTexto = (typeof categoriaActual !== 'undefined' && categoriaActual === 'mantenimiento')
    ? codigosMantenimiento.join('\n')
    : servicio;

  // Instalados
  const equipo    = document.getElementById('equipo')?.value || '';
  const serieMta  = document.getElementById('serieMta')?.value?.trim() || '';
  const campoSerieMta  = document.getElementById('serieMta');
  const iconoAlertaMta = document.getElementById('iconoAlertaMta');

  const deco       = document.getElementById('deco')?.value || '';
  const seriesDeco = [
    document.getElementById('serieDeco1')?.value,
    document.getElementById('serieDeco2')?.value,
    document.getElementById('serieDeco3')?.value,
    document.getElementById('serieDeco4')?.value,
    document.getElementById('serieDeco5')?.value
  ].filter(s => s?.trim() !== '');
  const iconoAlertaDeco = document.getElementById('iconoAlertaDeco');

  const repetidor = document.getElementById('repetidor')?.value || '';
  const seriesRep = [
    document.getElementById('serieRep1')?.value,
    document.getElementById('serieRep2')?.value
  ].filter(s => s?.trim() !== '');
  const iconoAlertaRep = document.getElementById('iconoAlertaRep');


  let lineasEquipos = '';

  if (equipo) {
    if (!serieMta) {
      campoSerieMta?.classList.add('input-alerta');
      if (iconoAlertaMta) iconoAlertaMta.style.display = 'inline';
    } else {
      campoSerieMta?.classList.remove('input-alerta');
      if (iconoAlertaMta) iconoAlertaMta.style.display = 'none';
    }
    lineasEquipos += `${equipo}` + (serieMta ? ` / ${serieMta}` : '') + '\n';
  } else {
    campoSerieMta?.classList.remove('input-alerta');
    if (iconoAlertaMta) iconoAlertaMta.style.display = 'none';
  }

  if (deco) {
    const campoDeco1 = document.getElementById('serieDeco1');
    if (seriesDeco.length === 0) {
      campoDeco1?.classList.add('input-alerta');
      if (iconoAlertaDeco) iconoAlertaDeco.style.display = 'inline';
    } else {
      campoDeco1?.classList.remove('input-alerta');
      if (iconoAlertaDeco) iconoAlertaDeco.style.display = 'none';
    }
    lineasEquipos += `${deco}` + (seriesDeco.length ? ' / ' + seriesDeco.join(' / ') : '') + '\n';
  } else {
    document.getElementById('serieDeco1')?.classList.remove('input-alerta');
    if (iconoAlertaDeco) iconoAlertaDeco.style.display = 'none';
  }

  if (repetidor) {
    const campoRep1 = document.getElementById('serieRep1');
    if (seriesRep.length === 0) {
      campoRep1?.classList.add('input-alerta');
      if (iconoAlertaRep) iconoAlertaRep.style.display = 'inline';
    } else {
      campoRep1?.classList.remove('input-alerta');
      if (iconoAlertaRep) iconoAlertaRep.style.display = 'none';
    }
    lineasEquipos += `${repetidor}` + (seriesRep.length ? ' / ' + seriesRep.join(' / ') : '') + '\n';
  } else {
    document.getElementById('serieRep1')?.classList.remove('input-alerta');
    if (iconoAlertaRep) iconoAlertaRep.style.display = 'none';
  }

  // ============== RETIRADOS ==============
  const retEq   = document.getElementById('retEq')?.value || '';
  const retEqSn = document.getElementById('retSerieEq')?.value?.trim() || '';
  const retDeco = document.getElementById('retDeco')?.value || '';
  const retDecoSeries = [
    document.getElementById('retSerieDeco1')?.value,
    document.getElementById('retSerieDeco2')?.value,
    document.getElementById('retSerieDeco3')?.value,
    document.getElementById('retSerieDeco4')?.value,
    document.getElementById('retSerieDeco5')?.value
  ].filter(s => s?.trim() !== '');
  const retRep = document.getElementById('retRep')?.value || '';
  const retRepSeries = [
    document.getElementById('retSerieRep1')?.value,
    document.getElementById('retSerieRep2')?.value
  ].filter(s => s?.trim() !== '');

  let lineasRet = '';
  if (retEq)   lineasRet += `${retEq}` + (retEqSn ? ` / ${retEqSn}` : '') + '\n';
  if (retDeco) lineasRet += `${retDeco}` + (retDecoSeries.length ? ' / ' + retDecoSeries.join(' / ') : '') + '\n';
  if (retRep)  lineasRet += `${retRep}` + (retRepSeries.length ? ' / ' + retRepSeries.join(' / ') : '') + '\n';

  // =================== CARTA ===================
  let textoFinal =
`N° ACTA   : ${sot}
HORA      : ${hora}
FECHA     : ${fecha}
CINTILLO  : ${cintillo}
${servicioTexto}
TECNICO   : ${tecnico}
CONTRATA  : C&S TELECOMUNICACIONES EIRL
**********************************************`;

  // Título y líneas de equipos instalados (si hay)
  if (lineasEquipos.trim()) {
    textoFinal += `
Equipos instalados
${lineasEquipos.trim()}`;
  }

  // Materiales (si aplica y checkbox activado)
  const chkMateriales = document.getElementById('chkMateriales');
  // Los materiales manuales vienen del servicio; los automaticos vienen de reglas por equipo.
  const materialesManuales = (chkMateriales && chkMateriales.checked ? (obtenerMateriales(servicio) || []) : [])
    .map(parsearMaterialManual)
    .filter(Boolean);
  const materialesAutomaticos = calcularMaterialesAutomaticosPorEquiposInstalados();
  const materiales = consolidarMateriales([...materialesManuales, ...materialesAutomaticos])
    .map(formatearMaterial);
  if (materiales.length) {
    textoFinal += `

***   MATERIALES  ***
${materiales.join('\n')}`;
  }

  // Al final del texto: equipos retirados (si hay)
  if (lineasRet.trim()) {
    textoFinal += `

Equipos retirados
${lineasRet.trim()}`;
  }

  document.getElementById('textoSalida').textContent = textoFinal;
}


async function copiarTexto() {
  const texto = (document.getElementById('textoSalida')?.textContent || '').trim();
  if (!texto) {
    alert('No hay texto para copiar.');
    return;
  }

  const ok = () => {
    const check = document.getElementById('checkCopiado');
    if (check) check.style.display = 'inline';
  };

  // 1) intenta con el API moderno asegurando foco
  try {
    if (document.hasFocus && !document.hasFocus()) window.focus();
    // pequeña espera para que aplique el foco en Chromium/Electron
    await new Promise(r => setTimeout(r, 50));
    await navigator.clipboard.writeText(texto);
    ok();
    return;
  } catch (e1) {
    console.warn('navigator.clipboard.writeText falló:', e1);
  }

  // 2) fallback clásico con execCommand('copy')
  try {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    ok();
    return;
  } catch (e2) {
    console.warn('execCommand(copy) falló:', e2);
  }

  // 3) fallback Electron (si lo expusiste en el preload)
  try {
    if (window?.electron?.clipboard?.writeText) {
      window.electron.clipboard.writeText(texto);
      ok();
      return;
    }
  } catch (e3) {
    console.warn('Electron clipboard falló:', e3);
  }

  alert('No se pudo copiar automáticamente. Selecciona el texto y usa Ctrl+C.');
}


function limpiarCampos() {
  const ids = [
    'sot','numSot','fecha','hora','cintillo','tecnico',
    'inputServicio','servicio','buscadorServicio','buscadorServicioExtra1','buscadorServicioExtra2',
    'equipo','serieMta',
    'deco','serieDeco1','serieDeco2','serieDeco3','serieDeco4','serieDeco5',
    'repetidor','serieRep1','serieRep2',
    // retirados
    'retEq','retSerieEq',
    'retDeco','retSerieDeco1','retSerieDeco2','retSerieDeco3','retSerieDeco4','retSerieDeco5',
    'retRep','retSerieRep1','retSerieRep2'
  ];
  ids.forEach(id => { const el = document.getElementById(id); if (el) { el.value = ''; el.classList && el.classList.remove('input-alerta'); } });

  ['iconoAlertaMta','iconoAlertaDeco','iconoAlertaRep'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });

  // Limpiar DROPS también (sin llamar a actualizarTexto para mantener el placeholder)
  try {
    window.materialesDrops = [];
    document.querySelectorAll('.drop-primary').forEach(x => x.checked = false);
    const ecs = document.getElementById('ecs300m'); if (ecs) ecs.value = '';
    const btnDrops = document.getElementById('btnListaDrops'); if (btnDrops) btnDrops.classList.add('hidden');
  } catch(_) {}

  // Limpiar checkbox de materiales
  const chkMateriales = document.getElementById('chkMateriales');
  if (chkMateriales) chkMateriales.checked = false;

  if (typeof window.resetCodigosMantenimiento === 'function') {
    window.resetCodigosMantenimiento();
  }

  if (typeof window.highlightExcelViewerRow === 'function') {
    window.highlightExcelViewerRow('');
  }

  document.getElementById('textoSalida').textContent = 'Aquí se mostrará el contenido tipo carta...';
}

function actualizarVisibilidadBtnDrops() {
  const btn = document.getElementById('btnListaDrops');
  if (!btn) return;
  const esFTTH = (typeof medioActual !== 'undefined' && medioActual === 'ftth');
  let servicio = '';
  const selectServicio = document.getElementById('servicio');
  const buscadorServicio = document.getElementById('buscadorServicio');
  if (selectServicio && selectServicio.style.display !== 'none') {
    servicio = (selectServicio.value || '').trim();
  } else if (buscadorServicio && buscadorServicio.style.display !== 'none') {
    servicio = (buscadorServicio.value || '').trim();
  }
  btn.classList.toggle('hidden', !(esFTTH && servicio));
}

function limpiarDrops() {
  window.materialesDrops = [];
  document.querySelectorAll('.drop-primary').forEach(x => x.checked = false);
  const ecs = document.getElementById('ecs300m'); if (ecs) ecs.value = '';
  if (typeof actualizarTexto === 'function') actualizarTexto();
}

function confirmarDrops() {
  const nuevas = [];
  const primary = Array.from(document.querySelectorAll('.drop-primary')).find(x => x.checked);
  if (primary) {
    const len = parseInt(primary.dataset.len || '0', 10);
    const item = DROPS_DATA[len];
    if (item) nuevas.push(`${item.code} - ${item.label} : 01`);
  }
  const ecs = document.getElementById('ecs300m');
  const metros = parseInt(ecs && ecs.value ? ecs.value : '0', 10);
  if (metros > 0 && metros < 301) nuevas.push(`1062235 - CABLE FO ECS DROP 300M ECOSS : ${metros}m`);
  window.materialesDrops = nuevas;
  cerrarModalDrops();
  if (typeof actualizarTexto === 'function') actualizarTexto();
}



// Función para toggle de materiales
function toggleMateriales(activado) {
  actualizarTexto();
}

// Exponer en window
window.marcarBoton = marcarBoton;
window.desmarcarBoton = desmarcarBoton;
window.actualizarTexto = actualizarTexto;
window.getEquipoKey = getEquipoKey;
window.cargarMaterialesAutomaticosPorEquipo = cargarMaterialesAutomaticosPorEquipo;
window.guardarMaterialesAutomaticosPorEquipo = guardarMaterialesAutomaticosPorEquipo;
window.cargarCatalogoMateriales = cargarCatalogoMateriales;
window.obtenerMaterialesAutomaticosDelEquipo = obtenerMaterialesAutomaticosDelEquipo;
window.calcularMaterialesAutomaticosPorEquiposInstalados = calcularMaterialesAutomaticosPorEquiposInstalados;
window.consolidarMateriales = consolidarMateriales;
window.copiarTexto = copiarTexto;
window.limpiarCampos = limpiarCampos;
window.actualizarVisibilidadBtnDrops = actualizarVisibilidadBtnDrops;
window.limpiarDrops = limpiarDrops;
window.confirmarDrops = confirmarDrops;
window.toggleMateriales = toggleMateriales;
