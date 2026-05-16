// render.js (extraído de script.js)
function marcarBoton(idBtn)   { document.getElementById(idBtn)?.classList.add('active'); }
function desmarcarBoton(idBtn){ document.getElementById(idBtn)?.classList.remove('active'); }

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
  if (chkMateriales && chkMateriales.checked) {
    const materiales = obtenerMateriales(servicio);
    if (Array.isArray(materiales) && materiales.length) {
      textoFinal += `

***   MATERIALES  ***
${materiales.join('\n')}`;
    }
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
window.copiarTexto = copiarTexto;
window.limpiarCampos = limpiarCampos;
window.actualizarVisibilidadBtnDrops = actualizarVisibilidadBtnDrops;
window.limpiarDrops = limpiarDrops;
window.confirmarDrops = confirmarDrops;
window.toggleMateriales = toggleMateriales;
