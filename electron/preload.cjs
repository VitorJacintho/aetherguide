/**
 * Ponte segura entre as páginas e o processo principal (contextIsolation + sandbox).
 * Expõe só o necessário em `window.aetherguide`. Tipos em src/desktop.ts.
 */
const { contextBridge, ipcRenderer } = require('electron');

/** Assina um canal e devolve a função para cancelar. */
function listen(channel, cb) {
  const handler = (_event, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('aetherguide', {
  isDesktop: true,
  shortcuts: { toggle: 'Ctrl+Shift+O', lock: 'Ctrl+Shift+L', record: 'Ctrl+Shift+R' },
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setOverlay: (patch) => ipcRenderer.invoke('overlay:set', patch),
  onSettings: (cb) => listen('settings:changed', cb),
  onLock: (cb) => listen('overlay:lock', cb),

  // gravações (janela principal)
  toggleRecording: () => ipcRenderer.invoke('recorder:toggle'),
  getRecorderStatus: () => ipcRenderer.invoke('recorder:get'),
  onRecorderStatus: (cb) => listen('recorder:status', cb),
  listRecordings: () => ipcRenderer.invoke('recordings:list'),
  onRecordingsChanged: (cb) => listen('recordings:changed', () => cb()),
  deleteRecording: (name) => ipcRenderer.invoke('recordings:delete', name),
  openRecordingsFolder: () => ipcRenderer.invoke('recordings:open-folder'),
  playRecording: (name, speed) => ipcRenderer.invoke('recordings:play', name, speed),
  setRecorderOptions: (opts) => ipcRenderer.invoke('recorder:options', opts),

  // gravações (janela de overlay)
  readRecording: (name) => ipcRenderer.invoke('recordings:read', name),
  onRecorderCommand: (cb) => listen('recorder:command', cb),
  recorderAppend: (chunk) => ipcRenderer.invoke('recorder:append', chunk),
  recorderStatus: (s) => ipcRenderer.send('recorder:status', s),
  recorderFinish: (summary) => ipcRenderer.invoke('recorder:finish', summary),
});
