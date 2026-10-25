const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  moveWindow: (dx, dy) => ipcRenderer.send('move-window', { dx, dy }),
  showMenu: () => ipcRenderer.send('show-menu'),
  openDashboard: () => ipcRenderer.send('open-dashboard'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  toggleAgent: () => ipcRenderer.invoke('toggle-agent'),
  getLocale: () => ipcRenderer.invoke('get-locale'),
  onSwitchSkin: (cb) => ipcRenderer.on('switch-skin', (_e, key) => cb(key)),
  onAgentStatus: (cb) => ipcRenderer.on('agent-status', (_e, running) => cb(running)),
  onSetLocale: (cb) => ipcRenderer.on('set-locale', (_e, loc) => cb(loc)),
});
