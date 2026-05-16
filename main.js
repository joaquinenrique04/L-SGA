const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

// Archivo de datos persistente (en carpeta del usuario)
const DATA_FILE = path.join(app.getPath('userData'), 'data.json');

function defaultData() {
  return {
    activation: null,
    customServices: [],
    customEquipos: []
  };
}

function formatMachineId(hex) {
  const clean = String(hex || '').replace(/[^a-f0-9]/gi, '').toUpperCase();
  return [clean.slice(0, 4), clean.slice(4, 8), clean.slice(8, 12), clean.slice(12, 16)]
    .filter(Boolean)
    .join('-');
}

function getWindowsMachineGuid() {
  try {
    const output = execFileSync('reg', [
      'query',
      'HKLM\\SOFTWARE\\Microsoft\\Cryptography',
      '/v',
      'MachineGuid'
    ], {
      encoding: 'utf8',
      windowsHide: true
    });

    const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
    return match ? match[1].trim() : '';
  } catch (e) {
    console.warn('No se pudo leer MachineGuid:', e.message);
    return '';
  }
}

function getMachineId() {
  const source = [
    getWindowsMachineGuid(),
    os.hostname(),
    os.arch(),
    os.platform()
  ].join('|');

  const hash = crypto.createHash('sha256').update(source).digest('hex');
  return formatMachineId(hash);
}

function ensureData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData(), null, 2));
    }
  } catch (e) {
    console.error('No se pudo crear DATA_FILE:', e);
  }
}
function readData() {
  ensureData();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return { ...defaultData(), ...(JSON.parse(raw || '{}') || {}) };
  } catch (e) {
    console.error('No se pudo leer DATA_FILE:', e);
    return defaultData();
  }
}
function writeData(payload) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ ...defaultData(), ...(payload || {}) }, null, 2));
    return true;
  } catch (e) {
    console.error('No se pudo escribir DATA_FILE:', e);
    return false;
  }
}

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Carga tu app web desde /app (ajusta a index.html o admin.html)
  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  // Abre DevTools en desarrollo (opcional)
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  ensureData();

  // IPC para leer/escribir datos
  ipcMain.handle('data:read', () => readData());
  ipcMain.handle('data:write', (_e, payload) => ({ ok: writeData(payload) }));
  ipcMain.handle('license:get-machine-id', () => getMachineId());

  // Exportar/Importar manual por archivo (opcional)
  ipcMain.handle('data:export', async (_e, payload) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exportar datos (JSON)',
      defaultPath: 'custom-services.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || !filePath) return { ok: false };
    try {
      fs.writeFileSync(filePath, JSON.stringify(payload || {}, null, 2), 'utf-8');
      return { ok: true, filePath };
    } catch (e) { return { ok: false, error: String(e) }; }
  });
  ipcMain.handle('data:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Importar datos (JSON)',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths || !filePaths[0]) return { ok: false };
    try {
      const txt = fs.readFileSync(filePaths[0], 'utf-8');
      const json = JSON.parse(txt);
      writeData(json);
      return { ok: true, json };
    } catch (e) { return { ok: false, error: String(e) }; }
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
