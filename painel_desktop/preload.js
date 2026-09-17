const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopApi', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getCachedPlaylist: () => ipcRenderer.invoke('get-cached-playlist'),
  forceSync: () => ipcRenderer.invoke('force-sync-media'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  onPlaylistUpdated: (callback) => {
    const subscription = (_event, playlist) => callback(playlist)
    ipcRenderer.on('playlist-updated', subscription)
    return () => ipcRenderer.removeListener('playlist-updated', subscription)
  },
  onFullscreenChange: (callback) => {
    const subscription = (_event, isFull) => callback(isFull)
    ipcRenderer.on('fullscreen-change', subscription)
    return () => ipcRenderer.removeListener('fullscreen-change', subscription)
  },
})
