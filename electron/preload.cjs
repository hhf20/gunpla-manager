const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  readData: () => ipcRenderer.invoke('read-data'),
  writeData: (data) => ipcRenderer.invoke('write-data', data),
  saveImage: (fileBuffer, fileName) => ipcRenderer.invoke('save-image', fileBuffer, fileName),
  deleteImage: (imagePath) => ipcRenderer.invoke('delete-image', imagePath),
  readImageBuffer: (fileUrl) => ipcRenderer.invoke('read-image-buffer', fileUrl),
  logRenderer: (level, message) => ipcRenderer.invoke('log-renderer', level, message),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getLogsPath: () => ipcRenderer.invoke('get-logs-path'),
  checkForUpdates: () => ipcRenderer.invoke('update-check'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('update-quit-and-install'),
  wipeAllData: () => ipcRenderer.invoke('wipe-user-data'),
  onUpdateEvent: (handler) => {
    if (typeof handler !== 'function') return () => {}
    const listener = (_event, payload) => handler(payload)
    ipcRenderer.on('update-event', listener)
    return () => ipcRenderer.removeListener('update-event', listener)
  },
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  importCoverFolder: (folderPath) => ipcRenderer.invoke('import-cover-folder', folderPath),
  listPdfFiles: (folderPath, recursive = true) =>
    ipcRenderer.invoke('list-pdf-files', folderPath, recursive),
  fetchGunplaReleasePrice: (payload) =>
    ipcRenderer.invoke('fetch-gunpla-release-price', payload),
  fetchGunplaCoverImage: (payload) => ipcRenderer.invoke('fetch-gunpla-cover-image', payload),
})
