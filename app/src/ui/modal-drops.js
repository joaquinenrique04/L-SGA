// modal-drops.js (extraído de script.js)
function renderOpcionesDrops() {
  const cont = document.getElementById('listaOpcionesDrops');
  if (!cont) return;
  cont.innerHTML = '';

  const titulo1 = document.createElement('div');
  titulo1.className = 'modal-subtitle';
  titulo1.textContent = 'Drop principal (solo uno)';
  cont.appendChild(titulo1);

  [50,80,100,150,220,300].forEach(len => {
    const data = DROPS_DATA[len]; if (!data) return;
    const row = document.createElement('label'); row.className = 'row';
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.className = 'drop-primary'; chk.dataset.len = String(len);
    const span = document.createElement('span'); span.textContent = (data.label.includes('FASTCONNECT') ? data.label : `FASTCONNECT DROP CABLE ${len}MTS`);
    chk.addEventListener('change', (e) => { if (e.target.checked) document.querySelectorAll('.drop-primary').forEach(x => { if (x !== e.target) x.checked = false; }); });
    row.appendChild(chk); row.appendChild(span); cont.appendChild(row);
  });

  const titulo2 = document.createElement('div');
  titulo2.className = 'modal-subtitle';
  titulo2.textContent = 'ECS 300 m (opcional, por metraje)';
  cont.appendChild(titulo2);

  const rowEcs = document.createElement('div'); rowEcs.className = 'row';
  const lblEcs = document.createElement('label'); lblEcs.setAttribute('for','ecs300m'); lblEcs.textContent = 'Metros a usar de ECS 300M ECOSS (1062235):';
  const inEcs = document.createElement('input'); inEcs.type = 'number'; inEcs.id = 'ecs300m'; inEcs.min = '1'; inEcs.max = '300'; inEcs.step = '1'; inEcs.placeholder = '1–300';
  rowEcs.appendChild(lblEcs); rowEcs.appendChild(inEcs); cont.appendChild(rowEcs);
}

function abrirModalDrops()  { renderOpcionesDrops(); document.getElementById('modalDrops')?.classList.remove('hidden'); }

function cerrarModalDrops() { document.getElementById('modalDrops')?.classList.add('hidden'); }

// Exponer en window para uso desde HTML/script.js
window.renderOpcionesDrops = renderOpcionesDrops;
window.abrirModalDrops = abrirModalDrops;
window.cerrarModalDrops = cerrarModalDrops;
