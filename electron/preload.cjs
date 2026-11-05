/**
 * Ponte segura entre as páginas e o processo principal (contextIsolation + sandbox).
 * Expõe só o necessário em `window.aetherguide`.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aetherguide', {
  isDesktop: true,
  shortcuts: { toggle: 'Ctrl+Shift+O', lock: 'Ctrl+Shift+L' },
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setOverlay: (patch) => ipcRenderer.invoke('overlay:set', patch),
  onSettings: (cb) => {
    const handler = (_event, settings) => cb(settings);
    ipcRenderer.on('settings:changed', handler);
    return () => ipcRenderer.removeListener('settings:changed', handler);
  },
  onLock: (cb) => {
    const handler = (_event, locked) => cb(locked);
    ipcRenderer.on('overlay:lock', handler);
    return () => ipcRenderer.removeListener('overlay:lock', handler);
  },
});
