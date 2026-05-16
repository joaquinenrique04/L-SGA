const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  readData: () => ipcRenderer.invoke('data:read'),
  writeData: (payload) => ipcRenderer.invoke('data:write', payload),
  exportData: (payload) => ipcRenderer.invoke('data:export', payload),
  importData: () => ipcRenderer.invoke('data:import'),
  getMachineId: () => ipcRenderer.invoke('license:get-machine-id')
});

contextBridge.exposeInMainWorld('electron', {
  clipboard: {
    writeText: (t) => clipboard.writeText(String(t ?? ''))
  }
});
