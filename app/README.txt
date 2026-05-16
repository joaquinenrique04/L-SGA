# SOT Desktop (Electron)

## Pasos
1) Copia tu app web dentro de `desktop/app/` (index.html, admin.html, css, js, src/data, etc.).
2) En una terminal:
   ```bash
   cd desktop
   npm install
   npm start
   ```
3) Para crear el instalador `.exe`:
   ```bash
   npm run dist
   ```

## Persistencia en disco (data.json)
En `preload.js` se expone una API segura.
En tu `admin.js`, añade:

```js
async function syncFromDisk(){
  if (!window.desktop?.readData) return; // si corres en navegador, no hace nada
  const data = await window.desktop.readData();
  localStorage.setItem('customServices', JSON.stringify(data.customServices || []));
  localStorage.setItem('customEquipos',  JSON.stringify(data.customEquipos  || []));
  if (typeof renderizarServicios==='function') renderizarServicios();
  if (typeof renderizarEquipos==='function')  renderizarEquipos();
  if (typeof poblarServiciosExistentes==='function') poblarServiciosExistentes();
}
async function syncToDisk(){
  if (!window.desktop?.writeData) return;
  const payload = {
    customServices: JSON.parse(localStorage.getItem('customServices') || '[]'),
    customEquipos:  JSON.parse(localStorage.getItem('customEquipos')  || '[]')
  };
  await window.desktop.writeData(payload);
}
// Llama a syncFromDisk() al abrir el Admin.
// Luego, tras cada localStorage.setItem(...), llama a syncToDisk().
```

## Cambiar la página inicial
En `main.js`:
```js
// Por defecto:
win.loadFile(path.join(__dirname, 'app', 'index.html'));
// Si quieres arrancar en el Administrador:
// win.loadFile(path.join(__dirname, 'app', 'admin.html'));
```
