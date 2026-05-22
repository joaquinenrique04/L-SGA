
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

  function renderizarEquipos(){
    const cat = readCatalog().filter(x => x.aplica === 'instalado');
    const tbody = tablaEquiposBody;
    tbody.innerHTML='';
    if (!cat.length){
      const tr=document.createElement('tr'); const td=document.createElement('td');
      td.colSpan=5; td.style.textAlign='center'; td.textContent='No hay modelos de equipos registrados.';
      tr.appendChild(td); tbody.appendChild(tr); return;
    }
    cat.forEach((it, idx)=>{
      const tr=document.createElement('tr');
      const c=(t)=>{ const td=document.createElement('td'); td.textContent=t; tr.appendChild(td); };
      c(idx+1); c(up(it.medio));
      let textoTipo=''; if (it.tipo==='equipo') textoTipo = it.medio==='hfc'?'MTA':'Router';
      else if (it.tipo==='deco') textoTipo = it.medio==='hfc'?'Decodificador':'IPTV';
      else if (it.tipo==='repetidor') textoTipo='Repetidor';
      c(textoTipo);
      c(it.modelo||'');
      const tdAcc=document.createElement('td');
      const bE=document.createElement('button'); bE.textContent='Editar'; bE.className='acciones-btn';
      bE.onclick=()=>{
        medioEquipoSelect.value = low(it.medio); tipoEquipoSelect.value = low(it.tipo);
        equipoInput.value = it.modelo; editEquipoIndexInput.value = String(idx);
        saveEquipoButton.textContent='Actualizar Modelo';
      };
      const bD=document.createElement('button'); bD.textContent='Eliminar'; bD.className='acciones-btn eliminar';
      bD.onclick=()=>{
        if (!confirm('¿Eliminar este modelo?')) return;
        const arr = readCatalog().filter(x => !(x.aplica==='instalado' && low(x.medio)===low(it.medio) && low(x.tipo)===low(it.tipo) && up(x.modelo)===up(it.modelo)));
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
    if (idx>=0){
      // buscar elemento filtrado por 'instalado' con mismo índice visual
      const filtered = arr.filter(x => x.aplica==='instalado');
      const target = filtered[idx];
      const pos = arr.findIndex(x => x===target);
      if (pos>=0) arr[pos] = nuevo;
      saveEquipoButton.textContent='Guardar Modelo';
    } else {
      // evitar duplicados exactos
      if (!arr.some(x => x.aplica==='instalado' && low(x.medio)===medio && low(x.tipo)===tipo && up(x.modelo)===up(modelo))){
        arr.push(nuevo);
      }
    }
    writeCatalog(arr);
    equipoInput.value=''; editEquipoIndexInput.value='-1';
    renderizarEquipos();
    poblarFiltrosEquipos();
  });

  /* ===================== REGLAS DE MATERIALES AUTOMATICOS ===================== */
  const REGLAS_MATERIALES_KEY = 'reglasMaterialesPorEquipo';
  const reglaTipoEquipoSelect = $('reglaTipoEquipoSelect');
  const reglaMedioSelect      = $('reglaMedioSelect');
  const reglaCondicionInput   = $('reglaCondicionInput');
  const reglaExclusionInput   = $('reglaExclusionInput');
  const reglaMaterialInput    = $('reglaMaterialInput');
  const reglaCodigoInput      = $('reglaCodigoInput');
  const reglaCantidadInput    = $('reglaCantidadInput');
  const reglaActivoSelect     = $('reglaActivoSelect');
  const editReglaIndexInput   = $('editReglaIndex');
  const saveReglaButton       = $('saveReglaButton');
  const clearReglaButton      = $('clearReglaButton');
  const tablaReglasBody       = document.querySelector('#tablaReglasMateriales tbody');

  function readReglasMateriales(){
    return readLS(REGLAS_MATERIALES_KEY);
  }

  function writeReglasMateriales(arr){
    writeLS(REGLAS_MATERIALES_KEY, arr);
  }

  function limpiarFormularioRegla(){
    if (reglaTipoEquipoSelect) reglaTipoEquipoSelect.value = '';
    if (reglaMedioSelect) reglaMedioSelect.value = 'ambos';
    if (reglaCondicionInput) reglaCondicionInput.value = '';
    if (reglaExclusionInput) reglaExclusionInput.value = '';
    if (reglaMaterialInput) reglaMaterialInput.value = '';
    if (reglaCodigoInput) reglaCodigoInput.value = '';
    if (reglaCantidadInput) reglaCantidadInput.value = '1';
    if (reglaActivoSelect) reglaActivoSelect.value = 'true';
    if (editReglaIndexInput) editReglaIndexInput.value = '-1';
    if (saveReglaButton) saveReglaButton.textContent = 'Guardar Regla';
  }

  function validarReglaMaterial(regla){
    if (!regla.tipoEquipo) return 'Debes seleccionar el tipo de equipo.';
    if (!regla.condicionModelo) return 'Debes escribir la condición del modelo.';
    if (!regla.nombreMaterial) return 'Debes escribir el material automático.';
    if (!Number.isInteger(regla.cantidadPorEquipo) || regla.cantidadPorEquipo <= 0) {
      return 'La cantidad por equipo debe ser un número entero mayor a 0.';
    }
    return '';
  }

  function renderizarReglasMateriales(){
    if (!tablaReglasBody) return;
    const reglas = readReglasMateriales();
    tablaReglasBody.innerHTML = '';
    if (!reglas.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 9;
      td.style.textAlign = 'center';
      td.textContent = 'No hay reglas de materiales automáticos registradas.';
      tr.appendChild(td);
      tablaReglasBody.appendChild(tr);
      return;
    }

    reglas.forEach((regla, idx) => {
      const tr = document.createElement('tr');
      const c = (text) => {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      };
      c(idx + 1);
      c(up(regla.tipoEquipo));
      c(up(regla.medio || 'ambos'));
      c(regla.condicionModelo || '');
      c(regla.excluirSiContiene || '');
      c(`${regla.codigoMaterial ? `${regla.codigoMaterial} - ` : ''}${regla.nombreMaterial || ''}`);
      c(String(regla.cantidadPorEquipo || 0));
      c(regla.activo === false ? 'Inactivo' : 'Activo');

      const tdAcc = document.createElement('td');
      const bE = document.createElement('button');
      bE.textContent = 'Editar';
      bE.className = 'acciones-btn';
      bE.onclick = () => {
        reglaTipoEquipoSelect.value = low(regla.tipoEquipo);
        reglaMedioSelect.value = low(regla.medio || 'ambos');
        reglaCondicionInput.value = regla.condicionModelo || '';
        reglaExclusionInput.value = regla.excluirSiContiene || '';
        reglaMaterialInput.value = regla.nombreMaterial || '';
        reglaCodigoInput.value = regla.codigoMaterial || '';
        reglaCantidadInput.value = String(regla.cantidadPorEquipo || 1);
        reglaActivoSelect.value = regla.activo === false ? 'false' : 'true';
        editReglaIndexInput.value = String(idx);
        saveReglaButton.textContent = 'Actualizar Regla';
      };

      const bD = document.createElement('button');
      bD.textContent = 'Eliminar';
      bD.className = 'acciones-btn eliminar';
      bD.onclick = () => {
        if (!confirm('¿Eliminar esta regla de materiales automáticos?')) return;
        const arr = readReglasMateriales();
        arr.splice(idx, 1);
        writeReglasMateriales(arr);
        limpiarFormularioRegla();
        renderizarReglasMateriales();
      };

      const bT = document.createElement('button');
      bT.textContent = regla.activo === false ? 'Activar' : 'Desactivar';
      bT.className = 'acciones-btn';
      bT.onclick = () => {
        const arr = readReglasMateriales();
        if (!arr[idx]) return;
        arr[idx].activo = arr[idx].activo === false;
        writeReglasMateriales(arr);
        renderizarReglasMateriales();
      };

      tdAcc.append(bE, bD, bT);
      tr.appendChild(tdAcc);
      tablaReglasBody.appendChild(tr);
    });
  }

  saveReglaButton?.addEventListener('click', () => {
    // Administracion de reglas guardadas en localStorage.reglasMaterialesPorEquipo.
    const cantidad = parseInt(reglaCantidadInput?.value || '0', 10);
    const regla = {
      id: '',
      tipoEquipo: low(reglaTipoEquipoSelect?.value),
      medio: low(reglaMedioSelect?.value || 'ambos'),
      condicionModelo: norm(reglaCondicionInput?.value),
      excluirSiContiene: norm(reglaExclusionInput?.value),
      codigoMaterial: norm(reglaCodigoInput?.value),
      nombreMaterial: norm(reglaMaterialInput?.value),
      cantidadPorEquipo: cantidad,
      activo: reglaActivoSelect?.value !== 'false'
    };

    const error = validarReglaMaterial(regla);
    if (error) { alert(error); return; }

    const arr = readReglasMateriales();
    const idx = parseInt(editReglaIndexInput?.value || '-1', 10);
    if (idx >= 0 && arr[idx]) {
      regla.id = arr[idx].id || `regla_${Date.now()}`;
      arr[idx] = regla;
      saveReglaButton.textContent = 'Guardar Regla';
    } else {
      regla.id = `regla_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      arr.push(regla);
    }

    writeReglasMateriales(arr);
    limpiarFormularioRegla();
    renderizarReglasMateriales();
  });

  clearReglaButton?.addEventListener('click', limpiarFormularioRegla);

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
      const cat = readCatalog().filter(x => x.aplica !== 'instalado');
      writeCatalog(cat);
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
  renderizarReglasMateriales();
  renderizarRetirados();
  poblarFiltrosRetirados();

  // Exponer funciones para importaciones
  window.renderizarServicios = renderizarServicios;
  window.renderizarEquipos = renderizarEquipos;
  window.renderizarReglasMateriales = renderizarReglasMateriales;
  window.renderizarRetirados = renderizarRetirados;
  window.poblarFiltrosServicios = poblarFiltrosServicios;
  window.poblarFiltrosEquipos = poblarFiltrosEquipos;
  window.poblarFiltrosRetirados = poblarFiltrosRetirados;
});
