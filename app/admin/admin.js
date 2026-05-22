
/* admin.js — catálogo unificado para instalados y retirados
 * Estructura localStorage 'catalogoModelos': 
 *   [{ medio:'hfc'|'ftth', tipo:'equipo'|'deco'|'repetidor', modelo:'...', aplica:'instalado'|'retirado' }]
 * Compatibilidad: migra customEquipos (instalado) y customRetirados (retirado) si existen.
 */
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const norm = (s)=>String(s||'').trim();
  const low  = (s)=>norm(s).toLowerCase();
  const up   = (s)=>norm(s).toUpperCase();

  function readLS(key){
    try{ const raw=localStorage.getItem(key); const arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; }
    catch{ return []; }
  }
  function writeLS(key, arr){ localStorage.setItem(key, JSON.stringify(arr||[])); }
  function readObjectLS(key){
    try{
      const raw = localStorage.getItem(key);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    } catch { return {}; }
  }
  function writeObjectLS(key, obj){ localStorage.setItem(key, JSON.stringify(obj || {})); }

  /* ---------- migración a catálogo unificado ---------- */
  (function migrate(){
    let catalogo = readLS('catalogoModelos');
    let changed = false;

    // desde customEquipos (instalados)
    const ce = readLS('customEquipos');
    if (ce.length){
      ce.forEach(x => {
        const item = { medio: low(x.medio), tipo: low(x.tipo), modelo: norm(x.modelo), aplica: 'instalado' };
        const k = JSON.stringify(item).toUpperCase();
        if (!catalogo.some(y => JSON.stringify({medio:low(y.medio), tipo:low(y.tipo), modelo:up(y.modelo), aplica:y.aplica}) === k)){
          catalogo.push(item); changed = true;
        }
      });
    }
    // desde customRetirados
    const cr = readLS('customRetirados');
    if (cr.length){
      cr.forEach(x => {
        const item = { medio: low(x.medio), tipo: low(x.tipo), modelo: norm(x.modelo), aplica: 'retirado' };
        const k = JSON.stringify(item).toUpperCase();
        if (!catalogo.some(y => JSON.stringify({medio:low(y.medio), tipo:low(y.tipo), modelo:up(y.modelo), aplica:y.aplica}) === k)){
          catalogo.push(item); changed = true;
        }
      });
    }
    if (changed) {
      writeLS('catalogoModelos', catalogo);
      // Limpiar las claves antiguas después de migrar
      localStorage.removeItem('customEquipos');
      localStorage.removeItem('customRetirados');
    }
  })();

  /* ===================== SERVICIOS (sin cambios) ===================== */
  const medioSelect        = $('medioSelect');
  const categoriaSelect    = $('categoriaSelect');
  const servicioInput      = $('servicioInput');
  const materialesTextarea = $('materialesTextarea');
  const saveServiceButton  = $('saveServiceButton');
  const tablaServiciosBody = document.querySelector('#tablaServicios tbody');
  const editIndexInput     = $('editIndex');

  function renderizarServicios(){
    const lista = readLS('customServices');
    const tbody = tablaServiciosBody;
    tbody.innerHTML = '';
    if (!lista.length){
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6; td.style.textAlign='center'; td.textContent='No hay servicios registrados.';
      tr.appendChild(td); tbody.appendChild(tr); return;
    }
    lista.forEach((item, idx)=>{
      const tr=document.createElement('tr');
      const c=(t)=>{ const td=document.createElement('td'); td.textContent=t; tr.appendChild(td); };
      c(idx+1);
      c(up(item.medio));
      c(item.categoria ? item.categoria.charAt(0).toUpperCase()+item.categoria.slice(1) : '');
      c(item.servicio||'');
      { const td=document.createElement('td'); td.innerText=(Array.isArray(item.materiales)?item.materiales:[]).join('\n'); tr.appendChild(td); }
      const tdAcc=document.createElement('td');
      const bE=document.createElement('button'); bE.textContent='Editar'; bE.className='acciones-btn';
      bE.onclick=()=>{
        medioSelect.value = low(item.medio||'hfc');
        categoriaSelect.value = low(item.categoria||'instalacion');
        servicioInput.value = item.servicio||'';
        materialesTextarea.value = (Array.isArray(item.materiales)?item.materiales:[]).join('\n');
        editIndexInput.value = String(idx);
        saveServiceButton.textContent = 'Actualizar Servicio';
      };
      const bD=document.createElement('button'); bD.textContent='Eliminar'; bD.className='acciones-btn eliminar';
      bD.onclick=()=>{
        if (!confirm('¿Eliminar este servicio?')) return;
        const arr = readLS('customServices'); arr.splice(idx,1); writeLS('customServices', arr); renderizarServicios();
      };
      tdAcc.append(bE,bD); tr.appendChild(tdAcc); tbody.appendChild(tr);
    });
    aplicarFiltrosServicios();
  }
  saveServiceButton?.addEventListener('click', ()=>{
    const medio=low(medioSelect.value), categoria=low(categoriaSelect.value);
    const servicio=norm(servicioInput.value), mats=norm(materialesTextarea.value);
    if (!servicio){ alert('Debes escribir la descripción del servicio.'); return; }
    const materialesArr = mats ? mats.split(/\r?\n/).map(s=>s.trim()).filter(Boolean) : [];
    const arr = readLS('customServices');
    const idx = parseInt(editIndexInput.value,10);
    const nuevo = { medio, categoria, servicio, materiales: materialesArr };
    if (idx>=0){ arr[idx]=nuevo; saveServiceButton.textContent='Guardar Servicio'; }
    else { arr.push(nuevo); }
    writeLS('customServices', arr);
    servicioInput.value=''; materialesTextarea.value=''; editIndexInput.value='-1';
    renderizarServicios();
    poblarFiltrosServicios();
  });

  /* ===================== CATALOGO UNIFICADO ===================== */
  function readCatalog(){ return readLS('catalogoModelos'); }
  function writeCatalog(arr){ writeLS('catalogoModelos', arr); }

  /* -------- INSTALADOS (UI existente) -------- */
  const medioEquipoSelect    = $('medioEquipoSelect');
  const tipoEquipoSelect     = $('tipoEquipoSelect');
  const equipoInput          = $('equipoInput');
  const saveEquipoButton     = $('saveEquipoButton');
  const tablaEquiposBody     = document.querySelector('#tablaEquipos tbody');
  const editEquipoIndexInput = $('editEquipoIndex');
  const editEquipoKeyOriginalInput = $('editEquipoKeyOriginal');
  const materialesEquipoPanel = $('materialesEquipoPanel');
  const buscarMaterialEquipoInput = $('buscarMaterialEquipoInput');
  const filtroUnidadMaterialEquipo = $('filtroUnidadMaterialEquipo');
  const tablaMaterialesEquipoBody = document.querySelector('#tablaMaterialesEquipo tbody');

  function tipoEquipoKey(medio, tipo){
    const m = low(medio);
    const t = low(tipo);
    if (t === 'equipo') return m === 'hfc' ? 'MTA' : 'Router';
    if (t === 'deco') return m === 'hfc' ? 'Decodificador' : 'IPTV';
    if (t === 'repetidor') return 'Repetidor';
    return t;
  }

  function getEquipoKey(medio, tipo, modelo) {
    return `${medio}::${tipoEquipoKey(medio, tipo)}::${modelo}`.trim().toUpperCase();
  }

  function parseMaterialLinea(linea){
    const texto = norm(linea).replace(/\s*\[.*?\]\s*$/g, '');
    if (!texto) return null;
    const sinCantidad = texto.replace(/\s*(?::|x)\s*\d+\s*$/i, '').trim();
    const match = sinCantidad.match(/^(\d{5,})\s*-\s*(.+)$/);
    const nombre = match ? match[2].trim() : sinCantidad;
    if (!nombre) return null;
    return {
      codigo: match ? match[1].trim() : '',
      nombre,
      unidad: 'UNIDAD'
    };
  }

  function obtenerCatalogoMaterialesUnico(){
    const materiales = [];
    const agregar = (linea) => {
      const item = parseMaterialLinea(linea);
      if (item) materiales.push(item);
    };

    try {
      Object.values(window.materialesPorServicio || {}).forEach(lista => {
        if (Array.isArray(lista)) lista.forEach(agregar);
      });
    } catch {}

    readLS('customServices').forEach(servicio => {
      if (Array.isArray(servicio.materiales)) servicio.materiales.forEach(agregar);
    });

    [
      '8000181 - APP ACTIVA CHIP CLARO PERU',
      '1063021 - CONECTOR RJ 11',
      '1051697 - CONTROL REMOTO AN-4803 ECOSS',
      '1040714 - CONTROL REMOTO SMK HFC',
      '1004838 - CABLE HDMI CHD1-6 MALE TO MALE',
      'CONTROL AMCO',
      'CONECTOR RJ45'
    ].forEach(agregar);

    const map = new Map();
    materiales.forEach(item => {
      const key = item.codigo ? `codigo:${item.codigo}` : `nombre:${up(item.nombre)}`;
      if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values()).sort((a,b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }

  function cargarMaterialesAutomaticosPorEquipo(){
    return readObjectLS('materialesAutomaticosPorEquipo');
  }

  function guardarMaterialesAutomaticosPorEquipo(data){
    writeObjectLS('materialesAutomaticosPorEquipo', data);
  }

  function materialesConfiguradosParaKey(key){
    const data = cargarMaterialesAutomaticosPorEquipo();
    return Array.isArray(data[key]) ? data[key] : [];
  }

  function leerMaterialesDesdeTabla(){
    const out = [];
    tablaMaterialesEquipoBody?.querySelectorAll('input[data-material-key]').forEach(input => {
      const cantidad = parseInt(input.value || '0', 10);
      if (!Number.isInteger(cantidad) || cantidad <= 0) return;
      out.push({
        codigo: input.dataset.codigo || '',
        nombre: input.dataset.nombre || '',
        cantidad,
        unidad: input.dataset.unidad || 'UNIDAD'
      });
    });
    return out;
  }

  function guardarMaterialesDelEquipo(key){
    if (!key) return;
    const data = cargarMaterialesAutomaticosPorEquipo();
    const materiales = leerMaterialesDesdeTabla();
    if (materiales.length) data[key] = materiales;
    else delete data[key];
    guardarMaterialesAutomaticosPorEquipo(data);
  }

  function renderMaterialesParaEquipoEditado(equipo){
    if (!tablaMaterialesEquipoBody || !materialesEquipoPanel) return;
    const key = getEquipoKey(equipo.medio, equipo.tipo, equipo.modelo);
    const asignados = new Map(materialesConfiguradosParaKey(key).map(item => {
      const itemKey = item.codigo ? `codigo:${item.codigo}` : `nombre:${up(item.nombre)}`;
      return [itemKey, item];
    }));
    const filtro = up(buscarMaterialEquipoInput?.value || '');
    const unidadFiltro = up(filtroUnidadMaterialEquipo?.value || '');
    const catalogo = obtenerCatalogoMaterialesUnico();

    tablaMaterialesEquipoBody.innerHTML = '';
    catalogo
      .filter(item => {
        const texto = up(`${item.codigo} ${item.nombre}`);
        const unidad = up(item.unidad || 'UNIDAD');
        return (!filtro || texto.includes(filtro)) && (!unidadFiltro || unidad === unidadFiltro);
      })
      .forEach(item => {
        const itemKey = item.codigo ? `codigo:${item.codigo}` : `nombre:${up(item.nombre)}`;
        const actual = asignados.get(itemKey);
        const cantidad = actual ? parseInt(actual.cantidad || 0, 10) : 0;
        const tr = document.createElement('tr');
        if (cantidad > 0) tr.classList.add('auto-material-activo');

        const tdMat = document.createElement('td');
        tdMat.textContent = `${item.codigo ? `${item.codigo} - ` : ''}${item.nombre}`;
        const tdCant = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '1';
        input.className = 'auto-material-cantidad';
        input.value = cantidad > 0 ? String(cantidad) : '';
        input.dataset.materialKey = itemKey;
        input.dataset.codigo = item.codigo || '';
        input.dataset.nombre = item.nombre || '';
        input.dataset.unidad = item.unidad || 'UNIDAD';
        input.addEventListener('input', () => {
          const val = parseInt(input.value || '0', 10);
          if (val < 0) input.value = '0';
          tr.classList.toggle('auto-material-activo', parseInt(input.value || '0', 10) > 0);
        });
        tdCant.appendChild(input);
        const tdUnidad = document.createElement('td');
        tdUnidad.textContent = item.unidad || 'UNIDAD';
        tr.append(tdMat, tdCant, tdUnidad);
        tablaMaterialesEquipoBody.appendChild(tr);
      });
  }

  function poblarFiltroUnidadesMateriales(){
    if (!filtroUnidadMaterialEquipo) return;
    const actual = filtroUnidadMaterialEquipo.value;
    const unidades = new Set(obtenerCatalogoMaterialesUnico().map(item => item.unidad || 'UNIDAD'));
    filtroUnidadMaterialEquipo.innerHTML = '<option value="">Todas</option>';
    unidades.forEach(unidad => {
      const opt = document.createElement('option');
      opt.value = unidad;
      opt.textContent = unidad;
      filtroUnidadMaterialEquipo.appendChild(opt);
    });
    filtroUnidadMaterialEquipo.value = actual;
  }

  function mostrarPanelMaterialesEquipo(equipo){
    if (!materialesEquipoPanel) return;
    materialesEquipoPanel.classList.remove('hidden');
    poblarFiltroUnidadesMateriales();
    renderMaterialesParaEquipoEditado(equipo);
  }

  function ocultarPanelMaterialesEquipo(){
    if (materialesEquipoPanel) materialesEquipoPanel.classList.add('hidden');
    if (tablaMaterialesEquipoBody) tablaMaterialesEquipoBody.innerHTML = '';
    if (buscarMaterialEquipoInput) buscarMaterialEquipoInput.value = '';
    if (filtroUnidadMaterialEquipo) filtroUnidadMaterialEquipo.value = '';
    if (editEquipoKeyOriginalInput) editEquipoKeyOriginalInput.value = '';
  }

  function refrescarMaterialesEquipoEditado(){
    const idx = parseInt(editEquipoIndexInput?.value || '-1', 10);
    if (idx < 0) return;
    renderMaterialesParaEquipoEditado({
      medio: medioEquipoSelect.value,
      tipo: tipoEquipoSelect.value,
      modelo: equipoInput.value
    });
  }

  buscarMaterialEquipoInput?.addEventListener('input', refrescarMaterialesEquipoEditado);
  filtroUnidadMaterialEquipo?.addEventListener('change', refrescarMaterialesEquipoEditado);

  function renderizarEquipos(){
    const cat = readCatalog().filter(x => x.aplica === 'instalado');
    const tbody = tablaEquiposBody;
    tbody.innerHTML='';
    if (!cat.length){
      const tr=document.createElement('tr'); const td=document.createElement('td');
      td.colSpan=6; td.style.textAlign='center'; td.textContent='No hay modelos de equipos registrados.';
      tr.appendChild(td); tbody.appendChild(tr); return;
    }
    const materialesData = cargarMaterialesAutomaticosPorEquipo();
    cat.forEach((it, idx)=>{
      const tr=document.createElement('tr');
      const c=(t)=>{ const td=document.createElement('td'); td.textContent=t; tr.appendChild(td); };
      c(idx+1); c(up(it.medio));
      let textoTipo=''; if (it.tipo==='equipo') textoTipo = it.medio==='hfc'?'MTA':'Router';
      else if (it.tipo==='deco') textoTipo = it.medio==='hfc'?'Decodificador':'IPTV';
      else if (it.tipo==='repetidor') textoTipo='Repetidor';
      c(textoTipo);
      c(it.modelo||'');
      const key = getEquipoKey(it.medio, it.tipo, it.modelo);
      const totalMateriales = Array.isArray(materialesData[key]) ? materialesData[key].length : 0;
      c(totalMateriales ? `Materiales auto: ${totalMateriales}` : '');
      const tdAcc=document.createElement('td');
      const bE=document.createElement('button'); bE.textContent='Editar'; bE.className='acciones-btn';
      bE.onclick=()=>{
        medioEquipoSelect.value = low(it.medio); tipoEquipoSelect.value = low(it.tipo);
        equipoInput.value = it.modelo; editEquipoIndexInput.value = String(idx);
        editEquipoKeyOriginalInput.value = getEquipoKey(it.medio, it.tipo, it.modelo);
        saveEquipoButton.textContent='Actualizar Modelo';
        mostrarPanelMaterialesEquipo(it);
      };
      const bD=document.createElement('button'); bD.textContent='Eliminar'; bD.className='acciones-btn eliminar';
      bD.onclick=()=>{
        if (!confirm('¿Eliminar este modelo?')) return;
        const arr = readCatalog().filter(x => !(x.aplica==='instalado' && low(x.medio)===low(it.medio) && low(x.tipo)===low(it.tipo) && up(x.modelo)===up(it.modelo)));
        const materiales = cargarMaterialesAutomaticosPorEquipo();
        delete materiales[getEquipoKey(it.medio, it.tipo, it.modelo)];
        guardarMaterialesAutomaticosPorEquipo(materiales);
        writeCatalog(arr); renderizarEquipos();
      };
      tdAcc.append(bE,bD); tr.appendChild(tdAcc); tbody.appendChild(tr);
    });
    aplicarFiltrosEquipos();
  }

  saveEquipoButton?.addEventListener('click', ()=>{
    const medio=low(medioEquipoSelect.value), tipo=low(tipoEquipoSelect.value), modelo=norm(equipoInput.value);
    if (!modelo){ alert('Debes escribir el modelo.'); return; }
    const arr = readCatalog();
    const idx = parseInt(editEquipoIndexInput.value,10);
    const nuevo = { medio, tipo, modelo, aplica: 'instalado' };
    const nuevoKey = getEquipoKey(medio, tipo, modelo);
    if (idx>=0){
      // buscar elemento filtrado por 'instalado' con mismo índice visual
      const filtered = arr.filter(x => x.aplica==='instalado');
      const target = filtered[idx];
      const pos = arr.findIndex(x => x===target);
      if (pos>=0) arr[pos] = nuevo;
      const oldKey = editEquipoKeyOriginalInput?.value || (target ? getEquipoKey(target.medio, target.tipo, target.modelo) : '');
      if (oldKey && oldKey !== nuevoKey) {
        const materiales = cargarMaterialesAutomaticosPorEquipo();
        delete materiales[oldKey];
        guardarMaterialesAutomaticosPorEquipo(materiales);
      }
      guardarMaterialesDelEquipo(nuevoKey);
      saveEquipoButton.textContent='Guardar Modelo';
    } else {
      // evitar duplicados exactos
      if (!arr.some(x => x.aplica==='instalado' && low(x.medio)===medio && low(x.tipo)===tipo && up(x.modelo)===up(modelo))){
        arr.push(nuevo);
      }
    }
    writeCatalog(arr);
    equipoInput.value=''; editEquipoIndexInput.value='-1';
    ocultarPanelMaterialesEquipo();
    renderizarEquipos();
    poblarFiltrosEquipos();
  });

  /* -------- RETIRADOS (usa mismo catálogo) -------- */
  const medioRetSelect = $('medioRetSelect');
  const tipoRetSelect  = $('tipoRetSelect');
  const retiradoInput  = $('retiradoInput');
  const saveRetButton  = $('saveRetButton');
  const tablaRetiradosBody = document.querySelector('#tablaRetirados tbody');
  const editRetIndex   = $('editRetIndex');

  function renderizarRetirados(){
    const cat = readCatalog().filter(x => x.aplica === 'retirado');
    const tbody = tablaRetiradosBody;
    tbody.innerHTML='';
    if (!cat.length){
      const tr=document.createElement('tr'); const td=document.createElement('td');
      td.colSpan=5; td.style.textAlign='center'; td.textContent='No hay equipos retirados.';
      tr.appendChild(td); tbody.appendChild(tr); return;
    }
    cat.forEach((it, idx)=>{
      const tr=document.createElement('tr');
      const c=(t)=>{ const td=document.createElement('td'); td.textContent=t; tr.appendChild(td); };
      c(idx+1); c(up(it.medio));
      let label=''; if (it.tipo==='equipo') label='EQUIPO'; else if (it.tipo==='deco') label='DECO'; else if (it.tipo==='repetidor') label='REPETIDOR'; else label=up(it.tipo);
      c(label);
      c(it.modelo||'');
      const tdAcc=document.createElement('td');
      const bE=document.createElement('button'); bE.textContent='Editar'; bE.className='acciones-btn';
      bE.onclick=()=>{ medioRetSelect.value=low(it.medio); tipoRetSelect.value=low(it.tipo); retiradoInput.value=it.modelo; editRetIndex.value=String(idx); saveRetButton.textContent='Actualizar Retirado'; };
      const bD=document.createElement('button'); bD.textContent='Eliminar'; bD.className='acciones-btn eliminar';
      bD.onclick=()=>{
        if (!confirm('¿Eliminar este retirado?')) return;
        const arr = readCatalog();
        // localizar el idx de vista en el arreglo completo
        const filtered = arr.filter(x => x.aplica==='retirado');
        const target = filtered[idx];
        const pos = arr.findIndex(x => x===target);
        if (pos>=0){ arr.splice(pos,1); writeCatalog(arr); renderizarRetirados(); }
      };
      tdAcc.append(bE,bD); tr.appendChild(tdAcc); tbody.appendChild(tr);
    });
    aplicarFiltrosRetirados();
  }

  saveRetButton?.addEventListener('click', ()=>{
    const medio=low(medioRetSelect.value), tipo=low(tipoRetSelect.value), modelo=norm(retiradoInput.value);
    if (!modelo){ alert('Escribe el modelo retirado.'); return; }
    const arr = readCatalog();
    const idx = parseInt(editRetIndex.value,10);
    const nuevo = { medio, tipo, modelo, aplica:'retirado' };
    if (idx>=0){
      const filtered = arr.filter(x => x.aplica==='retirado');
      const target = filtered[idx];
      const pos = arr.findIndex(x => x===target);
      if (pos>=0) arr[pos] = nuevo;
      saveRetButton.textContent='Guardar Retirado';
    } else {
      if (!arr.some(x => x.aplica==='retirado' && low(x.medio)===medio && low(x.tipo)===tipo && up(x.modelo)===up(modelo))){
        arr.push(nuevo);
      }
    }
    writeCatalog(arr);
    retiradoInput.value=''; editRetIndex.value='-1';
    renderizarRetirados();
    poblarFiltrosRetirados();
  });

  /* Clear buttons */
  const btnClearServ = $('btnClearServicios');
  if (btnClearServ) {
    btnClearServ.addEventListener('click', () => {
      if (!confirm('¿Borrar TODOS los servicios registrados? Esta acción no se puede deshacer.')) return;
      writeLS('customServices', []);
      renderizarServicios();
      poblarFiltrosServicios();
    });
  }

  const btnClearEq = $('btnClearEquipos');
  if (btnClearEq) {
    btnClearEq.addEventListener('click', () => {
      if (!confirm('¿Borrar TODOS los equipos instalados registrados? Esta acción no se puede deshacer.')) return;
      const instalados = readCatalog().filter(x => x.aplica === 'instalado');
      const materiales = cargarMaterialesAutomaticosPorEquipo();
      instalados.forEach(item => delete materiales[getEquipoKey(item.medio, item.tipo, item.modelo)]);
      guardarMaterialesAutomaticosPorEquipo(materiales);
      const cat = readCatalog().filter(x => x.aplica !== 'instalado');
      writeCatalog(cat);
      ocultarPanelMaterialesEquipo();
      renderizarEquipos();
      poblarFiltrosEquipos();
    });
  }

  const btnClearRet = $('btnClearRetirados');
  if (btnClearRet) {
    btnClearRet.addEventListener('click', () => {
      if (!confirm('¿Borrar TODOS los equipos retirados registrados? Esta acción no se puede deshacer.')) return;
      const cat = readCatalog().filter(x => x.aplica !== 'retirado');
      writeCatalog(cat);
      renderizarRetirados();
      poblarFiltrosRetirados();
    });
  }

  /* ===================== FILTROS ===================== */
  function poblarFiltrosServicios() {
    const selectMedio = $('filtroMedioServicios');
    const selectCategoria = $('filtroCategoriaServicios');
    const selectDescripcion = $('filtroDescripcionServicios');
    const lista = readLS('customServices');
    const medios = new Set();
    const categorias = new Set();
    const descripciones = new Set();
    lista.forEach(item => {
      medios.add(up(item.medio));
      categorias.add(item.categoria ? item.categoria.charAt(0).toUpperCase() + item.categoria.slice(1) : '');
      descripciones.add(item.servicio);
    });
    selectMedio.innerHTML = '<option value="">Todos los Medios</option>';
    medios.forEach(m => { const opt = document.createElement('option'); opt.value = m; opt.textContent = m; selectMedio.appendChild(opt); });
    selectCategoria.innerHTML = '<option value="">Todas las Categorías</option>';
    categorias.forEach(c => { const opt = document.createElement('option'); opt.value = c; opt.textContent = c; selectCategoria.appendChild(opt); });
    selectDescripcion.innerHTML = '<option value="">Todas las Descripciones</option>';
    descripciones.forEach(d => { const opt = document.createElement('option'); opt.value = d; opt.textContent = d; selectDescripcion.appendChild(opt); });
  }

  function poblarFiltrosEquipos() {
    const selectMedio = $('filtroMedioEquipos');
    const selectTipo = $('filtroTipoEquipos');
    const selectModelo = $('filtroModeloEquipos');
    const cat = readCatalog().filter(x => x.aplica === 'instalado');
    const medios = new Set();
    const tipos = new Set();
    const modelos = new Set();
    cat.forEach(it => {
      medios.add(up(it.medio));
      let textoTipo = ''; if (it.tipo === 'equipo') textoTipo = it.medio === 'hfc' ? 'MTA' : 'Router';
      else if (it.tipo === 'deco') textoTipo = it.medio === 'hfc' ? 'Decodificador' : 'IPTV';
      else if (it.tipo === 'repetidor') textoTipo = 'Repetidor';
      tipos.add(textoTipo);
      modelos.add(it.modelo);
    });
    selectMedio.innerHTML = '<option value="">Todos los Medios</option>';
    medios.forEach(m => { const opt = document.createElement('option'); opt.value = m; opt.textContent = m; selectMedio.appendChild(opt); });
    selectTipo.innerHTML = '<option value="">Todos los Tipos</option>';
    tipos.forEach(t => { const opt = document.createElement('option'); opt.value = t; opt.textContent = t; selectTipo.appendChild(opt); });
    selectModelo.innerHTML = '<option value="">Todos los Modelos</option>';
    modelos.forEach(m => { const opt = document.createElement('option'); opt.value = m; opt.textContent = m; selectModelo.appendChild(opt); });
  }

  function poblarFiltrosRetirados() {
    const selectMedio = $('filtroMedioRetirados');
    const selectTipo = $('filtroTipoRetirados');
    const selectModelo = $('filtroModeloRetirados');
    const cat = readCatalog().filter(x => x.aplica === 'retirado');
    const medios = new Set();
    const tipos = new Set();
    const modelos = new Set();
    cat.forEach(it => {
      medios.add(up(it.medio));
      let label = ''; if (it.tipo === 'equipo') label = 'EQUIPO'; else if (it.tipo === 'deco') label = 'DECO'; else if (it.tipo === 'repetidor') label = 'REPETIDOR'; else label = up(it.tipo);
      tipos.add(label);
      modelos.add(it.modelo);
    });
    selectMedio.innerHTML = '<option value="">Todos los Medios</option>';
    medios.forEach(m => { const opt = document.createElement('option'); opt.value = m; opt.textContent = m; selectMedio.appendChild(opt); });
    selectTipo.innerHTML = '<option value="">Todos los Tipos</option>';
    tipos.forEach(t => { const opt = document.createElement('option'); opt.value = t; opt.textContent = t; selectTipo.appendChild(opt); });
    selectModelo.innerHTML = '<option value="">Todos los Modelos</option>';
    modelos.forEach(m => { const opt = document.createElement('option'); opt.value = m; opt.textContent = m; selectModelo.appendChild(opt); });
  }

  function aplicarFiltrosServicios() {
    const filtroMedio = $('filtroMedioServicios')?.value || '';
    const filtroCategoria = $('filtroCategoriaServicios')?.value || '';
    const filtroDescripcion = $('filtroDescripcionServicios')?.value || '';
    const rows = tablaServiciosBody.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 4) return;
      const medio = cells[1].textContent;
      const categoria = cells[2].textContent;
      const descripcion = cells[3].textContent;
      const visible = (!filtroMedio || medio === filtroMedio) &&
                      (!filtroCategoria || categoria === filtroCategoria) &&
                      (!filtroDescripcion || descripcion === filtroDescripcion);
      row.style.display = visible ? '' : 'none';
    });
  }

  function aplicarFiltrosEquipos() {
    const filtroMedio = $('filtroMedioEquipos')?.value || '';
    const filtroTipo = $('filtroTipoEquipos')?.value || '';
    const filtroModelo = $('filtroModeloEquipos')?.value || '';
    const rows = tablaEquiposBody.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 4) return;
      const medio = cells[1].textContent;
      const tipo = cells[2].textContent;
      const modelo = cells[3].textContent;
      const visible = (!filtroMedio || medio === filtroMedio) &&
                      (!filtroTipo || tipo === filtroTipo) &&
                      (!filtroModelo || modelo === filtroModelo);
      row.style.display = visible ? '' : 'none';
    });
  }

  function aplicarFiltrosRetirados() {
    const filtroMedio = $('filtroMedioRetirados')?.value || '';
    const filtroTipo = $('filtroTipoRetirados')?.value || '';
    const filtroModelo = $('filtroModeloRetirados')?.value || '';
    const rows = tablaRetiradosBody.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 4) return;
      const medio = cells[1].textContent;
      const tipo = cells[2].textContent;
      const modelo = cells[3].textContent;
      const visible = (!filtroMedio || medio === filtroMedio) &&
                      (!filtroTipo || tipo === filtroTipo) &&
                      (!filtroModelo || modelo === filtroModelo);
      row.style.display = visible ? '' : 'none';
    });
  }

  // Event listeners para filtros
  $('filtroMedioServicios')?.addEventListener('change', aplicarFiltrosServicios);
  $('filtroCategoriaServicios')?.addEventListener('change', aplicarFiltrosServicios);
  $('filtroDescripcionServicios')?.addEventListener('change', aplicarFiltrosServicios);

  $('filtroMedioEquipos')?.addEventListener('change', aplicarFiltrosEquipos);
  $('filtroTipoEquipos')?.addEventListener('change', aplicarFiltrosEquipos);
  $('filtroModeloEquipos')?.addEventListener('change', aplicarFiltrosEquipos);

  $('filtroMedioRetirados')?.addEventListener('change', aplicarFiltrosRetirados);
  $('filtroTipoRetirados')?.addEventListener('change', aplicarFiltrosRetirados);
  $('filtroModeloRetirados')?.addEventListener('change', aplicarFiltrosRetirados);

  /* init */
  renderizarServicios();
  poblarFiltrosServicios();
  renderizarEquipos();
  poblarFiltrosEquipos();
  renderizarRetirados();
  poblarFiltrosRetirados();

  // Exponer funciones para importaciones
  window.renderizarServicios = renderizarServicios;
  window.renderizarEquipos = renderizarEquipos;
  window.renderizarRetirados = renderizarRetirados;
  window.poblarFiltrosServicios = poblarFiltrosServicios;
  window.poblarFiltrosEquipos = poblarFiltrosEquipos;
  window.poblarFiltrosRetirados = poblarFiltrosRetirados;
  window.getEquipoKey = getEquipoKey;
  window.obtenerCatalogoMaterialesUnico = obtenerCatalogoMaterialesUnico;
  window.cargarMaterialesAutomaticosPorEquipo = cargarMaterialesAutomaticosPorEquipo;
  window.guardarMaterialesAutomaticosPorEquipo = guardarMaterialesAutomaticosPorEquipo;
  window.renderMaterialesParaEquipoEditado = renderMaterialesParaEquipoEditado;
});
