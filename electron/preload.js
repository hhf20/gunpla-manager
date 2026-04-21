import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  readData: () => ipcRenderer.invoke('read-data'),
  writeData: (data) => ipcRenderer.invoke('write-data', data),
  saveImage: (fileBuffer, fileName) => ipcRenderer.invoke('save-image', fileBuffer, fileName),
  deleteImage: (imagePath) => ipcRenderer.invoke('delete-image', imagePath),
  readImageBuffer: (fileUrl) => ipcRenderer.invoke('read-image-buffer', fileUrl),
  logRenderer: (level, message) => ipcRenderer.invoke('log-renderer', level, message),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
  getLogsPath: () => ipcRenderer.invoke('get-logs-path'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  importCoverFolder: (folderPath) => ipcRenderer.invoke('import-cover-folder', folderPath),
  listPdfFiles: (folderPath, recursive = true) =>
    ipcRenderer.invoke('list-pdf-files', folderPath, recursive),
  fetchGunplaReleasePrice: (payload) =>
    ipcRenderer.invoke('fetch-gunpla-release-price', payload),
  searchGunplaCoverImages: (payload) =>
    ipcRenderer.invoke('search-gunpla-cover-images', payload),
  saveGunplaCoverCandidate: (candidate) =>
    ipcRenderer.invoke('save-gunpla-cover-candidate', candidate),
  fetchGunplaCoverImage: (payload) => ipcRenderer.invoke('fetch-gunpla-cover-image', payload),
  fetchGunplaPriceSnapshot: (payload) =>
    ipcRenderer.invoke('fetch-gunpla-price-snapshot', payload),
})
