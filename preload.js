const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  chooseLibraryFolder: () => ipcRenderer.invoke('choose-library-folder'),
  rescanLibrary: () => ipcRenderer.invoke('rescan-library'),
  fetchLyrics: (trackInfo) => ipcRenderer.invoke('fetch-lyrics', trackInfo),
  toggleNativeFullscreen: () => ipcRenderer.invoke('toggle-native-fullscreen'),
  isNativeFullscreen: () => ipcRenderer.invoke('is-native-fullscreen'),
  updateDiscordPresence: (info) => ipcRenderer.invoke('update-discord-presence', info),
  clearDiscordPresence: () => ipcRenderer.invoke('clear-discord-presence'),
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor(),
});
