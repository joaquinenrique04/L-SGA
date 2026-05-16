(function () {
  const MAX_VIEWER_ROWS = 1000;
  let allRows = [];
  let filteredRows = [];
  let columns = [];
  let highlightedSot = '';
  let sortState = { column: '', direction: 'asc' };
  let columnFilters = {};
  let viewerCollapsed = false;
  let isResizing = false;

  function normalize(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  function getSearchValue() {
    return document.getElementById('excelViewerSearch')?.value?.trim() || '';
  }

  function getColumnFilterValue(column) {
    return normalize(columnFilters[column] || '');
  }

  function getViewerElements() {
    return {
      workspace: document.querySelector('.preview-workspace'),
      card: document.querySelector('.excel-viewer-card'),
      handle: document.getElementById('excelViewerResizeHandle'),
      toggle: document.getElementById('excelViewerToggle'),
      showButton: document.getElementById('excelViewerShowButton')
    };
  }

  function syncViewerToggle() {
    const { workspace, toggle, showButton } = getViewerElements();
    if (!workspace || !toggle) return;
    workspace.classList.toggle('excel-collapsed', viewerCollapsed);
    toggle.textContent = viewerCollapsed ? 'Mostrar base' : 'Ocultar base';
    if (showButton) showButton.classList.toggle('hidden', !viewerCollapsed);
  }

  function setViewerWidth(width) {
    const { card } = getViewerElements();
    if (!card) return;
    const nextWidth = Math.max(420, Math.min(width, window.innerWidth - 560));
    card.style.flexBasis = `${nextWidth}px`;
  }

  function matchesSearch(row, searchTerm) {
    if (!searchTerm) return true;
    return columns.some((column) => normalize(row[column]).includes(searchTerm));
  }

  function matchesColumnFilters(row) {
    return columns.every((column) => {
      const filter = getColumnFilterValue(column);
      if (!filter) return true;
      return normalize(row[column]).includes(filter);
    });
  }

  function compareValues(a, b) {
    const av = String(a ?? '').trim();
    const bv = String(b ?? '').trim();
    return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
  }

  function sortRows(rows) {
    if (!sortState.column) return rows;
    const sorted = rows.slice().sort((left, right) => {
      const result = compareValues(left[sortState.column], right[sortState.column]);
      return sortState.direction === 'asc' ? result : -result;
    });
    return sorted;
  }

  function updateSort(column) {
    if (sortState.column === column) {
      sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      sortState = { column, direction: 'asc' };
    }
  }

  function buildHeader() {
    const thead = document.querySelector('#excelViewerTable thead');
    if (!thead) return;
    thead.innerHTML = '';

    if (!columns.length) return;

    const tr = document.createElement('tr');
    columns.forEach((column) => {
      const th = document.createElement('th');
      th.className = 'excel-sortable';
      th.textContent = column;
      if (sortState.column === column) {
        th.dataset.sort = sortState.direction;
      }
      th.addEventListener('click', () => {
        updateSort(column);
        buildHeader();
        applySearch(window.sotDbMeta || {});
      });
      tr.appendChild(th);
    });
    thead.appendChild(tr);

    const filterRow = document.createElement('tr');
    filterRow.className = 'excel-filter-row';
    columns.forEach((column) => {
      const th = document.createElement('th');
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Filtrar';
      input.value = columnFilters[column] || '';
      input.addEventListener('input', (event) => {
        columnFilters[column] = event.target.value;
        applySearch(window.sotDbMeta || {});
      });
      input.addEventListener('click', (event) => event.stopPropagation());
      th.appendChild(input);
      filterRow.appendChild(th);
    });
    thead.appendChild(filterRow);
  }

  function buildBody() {
    const tbody = document.querySelector('#excelViewerTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!filteredRows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.className = 'excel-viewer-empty';
      td.colSpan = Math.max(columns.length, 1);
      td.textContent = allRows.length
        ? 'No hay filas que coincidan con la búsqueda.'
        : 'Carga una base para verla aquí.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    filteredRows.forEach((row) => {
      const tr = document.createElement('tr');
      const rowSot = String(row[window.colSOT || ''] ?? '').replace(/\D/g, '');
      if (highlightedSot && rowSot === highlightedSot) tr.classList.add('is-highlighted');
      tr.addEventListener('click', () => {
        highlightedSot = rowSot;
        if (typeof window.cargarFilaExcelEnFormulario === 'function') {
          window.cargarFilaExcelEnFormulario(row);
        } else {
          buildBody();
        }
      });

      columns.forEach((column) => {
        const td = document.createElement('td');
        td.textContent = String(row[column] ?? '');
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  function updateMeta(meta = {}) {
    const node = document.getElementById('excelViewerMeta');
    if (!node) return;

    if (!allRows.length) {
      node.textContent = 'Sin base cargada.';
      return;
    }

    const totalRows = Number(meta.rows) || allRows.length;
    const visible = filteredRows.length;
    const suffix = totalRows > allRows.length
      ? ` · mostrando primeras ${allRows.length}`
      : '';
    node.textContent = `${meta.fileName || 'Base cargada'} · ${totalRows} filas · ${visible} visibles${suffix}`;
  }

  function applySearch(meta) {
    const searchTerm = normalize(getSearchValue());
    const searched = allRows.filter((row) => matchesSearch(row, searchTerm) && matchesColumnFilters(row));
    filteredRows = sortRows(searched);
    buildBody();
    updateMeta(meta);
  }

  function renderExcelViewer(rows, meta = {}) {
    allRows = Array.isArray(rows) ? rows.slice(0, MAX_VIEWER_ROWS) : [];
    columns = allRows.length ? Object.keys(allRows[0]) : [];
    buildHeader();
    applySearch(meta);
  }

  function highlightExcelViewerRow(sot) {
    highlightedSot = String(sot ?? '').replace(/\D/g, '');
    buildBody();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('excelViewerSearch')?.addEventListener('input', () => {
      applySearch(window.sotDbMeta || {});
    });
    document.getElementById('excelViewerClearFilters')?.addEventListener('click', () => {
      columnFilters = {};
      sortState = { column: '', direction: 'asc' };
      const search = document.getElementById('excelViewerSearch');
      if (search) search.value = '';
      buildHeader();
      applySearch(window.sotDbMeta || {});
    });

    document.getElementById('excelViewerToggle')?.addEventListener('click', () => {
      viewerCollapsed = !viewerCollapsed;
      syncViewerToggle();
    });

    document.getElementById('excelViewerShowButton')?.addEventListener('click', () => {
      viewerCollapsed = false;
      syncViewerToggle();
    });

    document.getElementById('excelViewerResizeHandle')?.addEventListener('mousedown', (event) => {
      isResizing = true;
      document.body.classList.add('is-resizing');
      event.preventDefault();
    });

    window.addEventListener('mousemove', (event) => {
      if (!isResizing) return;
      const workspace = document.querySelector('.preview-workspace');
      if (!workspace) return;
      const workspaceRect = workspace.getBoundingClientRect();
      const nextWidth = workspaceRect.right - event.clientX;
      setViewerWidth(nextWidth);
    });

    window.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      document.body.classList.remove('is-resizing');
    });

    syncViewerToggle();
  });

  window.renderExcelViewer = renderExcelViewer;
  window.highlightExcelViewerRow = highlightExcelViewerRow;
})();
