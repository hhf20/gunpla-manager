import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import updater from 'electron-updater'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  lookupGunplaCoverImageInfo,
  lookupGunplaReleasePrice,
} from './releasePriceProviders/gunplaFandom.js'

const { autoUpdater } = updater

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = !app.isPackaged
const WIPE_ON_RELAUNCH_FLAG = '--wipe-user-data-on-launch'
const userDataDir = app.getPath('userData')
const dataDir = path.join(userDataDir, 'data')
const imagesDir = path.join(dataDir, 'images')
const dataFilePath = path.join(dataDir, 'data.json')
const logsDir = path.join(userDataDir, 'logs')
const mainLogPath = path.join(logsDir, 'main.log')
const rendererLogPath = path.join(logsDir, 'renderer.log')

/** @type {BrowserWindow | null} */
let mainWindow = null

async function safeRm(targetPath) {
  try {
    await fs.rm(targetPath, { recursive: true, force: true })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e?.message || String(e) }
  }
}

const DEFAULT_DATA = {
  gunplaList: [],
  coverLibrary: [],
  categoryConfig: {
    grade: ['HG', 'RG', 'MG', 'PG', 'RE100'],
    series: ['SEED', 'UC', 'OO'],
    customTags: ['\u0050\u0042\u9650\u5b9a', '\u900f\u660e\u4ef6', '\u7535\u9540\u4ef6'],
    releaseTypes: ['\u666e\u901a', '\u0050\u0042\u9650\u5b9a', '\u57fa\u5730\u9650\u5b9a'],
    purchasePlatforms: ['\u6dd8\u5b9d', '\u62fc\u591a\u591a', 'Amazon', '\u5b9e\u4f53\u5e97'],
  },
  buildStatusConfig: ['\u672a\u5f00\u76d2', '\u7d20\u7ec4', '\u6e17\u7ebf', '\u6c34\u8d34', '\u55b7\u6d82', '\u5b8c\u6210'],
  filterState: {
    searchText: '',
    grades: [],
    status: [],
    buildStatuses: [],
    series: [],
    tags: [],
    type: 'all',
  },
  theme: {
    backgroundImage: '',
    backgroundOpacity: 0.35,
  },
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const PDF_EXTS = new Set(['.pdf'])

const WIKI_IMAGE_DOWNLOAD_HEADERS = {
  'User-Agent': 'GunplaManager/2.0 (Electron; wiki cover download)',
}

function extFromMime(mime) {
  const m = (mime || '').toLowerCase()
  if (m.includes('jpeg')) return '.jpg'
  if (m.includes('png')) return '.png'
  if (m.includes('webp')) return '.webp'
  if (m.includes('gif')) return '.gif'
  return ''
}

/**
 * @param {{ downloadUrl: string, suggestedFileName: string }} info
 */
async function downloadWikiCoverToLibrary(info) {
  await ensureStorage()
  const res = await fetch(info.downloadUrl, {
    headers: WIKI_IMAGE_DOWNLOAD_HEADERS,
    signal: AbortSignal.timeout(25000),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`下载图片 HTTP ${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 400 || buf.length > 25 * 1024 * 1024) {
    throw new Error('图片大小异常')
  }
  let ext = path.extname(info.suggestedFileName || '').toLowerCase()
  if (!IMAGE_EXTS.has(ext)) {
    ext = extFromMime(res.headers.get('content-type') || '') || ''
  }
  if (!IMAGE_EXTS.has(ext)) {
    ext = '.jpg'
  }
  const rawBase = path.basename(info.suggestedFileName || 'wiki_cover', path.extname(info.suggestedFileName || ''))
  const base = (rawBase.replace(/[^\w.-]/g, '_') || 'wiki_cover').slice(0, 100)
  const uniqueName = `${base}_${Date.now()}${ext}`
  const targetPath = path.join(imagesDir, uniqueName)
  await fs.writeFile(targetPath, buf)
  return `file://${targetPath.replace(/\\/g, '/')}`
}

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.mkdir(imagesDir, { recursive: true })
  await fs.mkdir(logsDir, { recursive: true })
  try {
    await fs.access(dataFilePath)
  } catch {
    await fs.writeFile(dataFilePath, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8')
  }
}

async function wipeUserDataDirectories() {
  const targets = [
    dataDir,
    logsDir,
    path.join(userDataDir, 'Cache'),
    path.join(userDataDir, 'Code Cache'),
    path.join(userDataDir, 'GPUCache'),
    path.join(userDataDir, 'Local Storage'),
    path.join(userDataDir, 'Session Storage'),
    path.join(userDataDir, 'IndexedDB'),
  ]

  const errors = []
  for (const targetPath of targets) {
    const res = await safeRm(targetPath)
    if (!res.ok) errors.push({ path: targetPath, message: res.message })
  }

  return errors
}

async function appendLog(filePath, level, message) {
  try {
    await fs.mkdir(logsDir, { recursive: true })
    const ts = new Date().toISOString()
    const line = `[${ts}] [${level}] ${String(message ?? '')}\n`
    await fs.appendFile(filePath, line, 'utf-8')
  } catch {
    // ignore
  }
}

function logMain(level, message) {
  console.log(`[main:${level}]`, message)
  appendLog(mainLogPath, level, message)
}

function sendUpdateEvent(payload) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-event', payload)
    }
  } catch {
    // ignore
  }
}

function initAutoUpdater() {
  if (isDev) {
    logMain('info', 'autoUpdater disabled in dev')
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    logMain('info', 'autoUpdater: checking-for-update')
    sendUpdateEvent({ type: 'checking-for-update' })
  })
  autoUpdater.on('update-available', (info) => {
    logMain('info', `autoUpdater: update-available ${info?.version || ''}`)
    sendUpdateEvent({ type: 'update-available', info })
  })
  autoUpdater.on('update-not-available', (info) => {
    logMain('info', `autoUpdater: update-not-available ${info?.version || ''}`)
    sendUpdateEvent({ type: 'update-not-available', info })
  })
  autoUpdater.on('download-progress', (progress) => {
    sendUpdateEvent({ type: 'download-progress', progress })
  })
  autoUpdater.on('update-downloaded', (info) => {
    logMain('info', `autoUpdater: update-downloaded ${info?.version || ''}`)
    sendUpdateEvent({ type: 'update-downloaded', info })
  })
  autoUpdater.on('error', (err) => {
    logMain('error', `autoUpdater: error ${err?.message || String(err)}`)
    sendUpdateEvent({ type: 'error', message: err?.message || String(err) })
  })
}

async function readDataFile() {
  try {
    const raw = await fs.readFile(dataFilePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_DATA
    return parsed
  } catch {
    return DEFAULT_DATA
  }
}

async function writeDataFile(data) {
  const safeData = data && typeof data === 'object' ? data : DEFAULT_DATA
  await fs.writeFile(dataFilePath, JSON.stringify(safeData, null, 2), 'utf-8')
  return { ok: true }
}

async function walkImages(dirPath) {
  const results = []
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await walkImages(full)))
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!IMAGE_EXTS.has(ext)) continue
    results.push(full)
  }
  return results
}

async function walkPdfs(dirPath, recursive) {
  const results = []
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (recursive) results.push(...(await walkPdfs(full, recursive)))
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!PDF_EXTS.has(ext)) continue
    results.push(full)
  }
  return results
}

async function copyImageToLibrary(sourcePath) {
  await ensureStorage()
  const ext = path.extname(sourcePath || '').toLowerCase() || '.png'
  const base = path
    .basename(sourcePath || `image${ext}`, ext)
    .replace(/[^\w.-]/g, '_')
  const uniqueName = `${base}_${Date.now()}${ext}`
  const targetPath = path.join(imagesDir, uniqueName)
  const buffer = await fs.readFile(sourcePath)
  await fs.writeFile(targetPath, buffer)
  return `file://${targetPath.replace(/\\/g, '/')}`
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    title: '金屋藏胶 / Gunpla Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    const appVersion = app.getVersion()
    mainWindow.webContents.session
      .clearCache()
      .catch(() => {})
    mainWindow.webContents.session
      .clearStorageData({
        storages: ['serviceworkers', 'cachestorage', 'filesystem', 'indexdb', 'localstorage'],
      })
      .catch(() => {})
      .finally(() => {
        mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'), {
          query: { v: appVersion },
        })
      })
  }
}

ipcMain.handle('read-data', async () => {
  await ensureStorage()
  return readDataFile()
})

ipcMain.handle('write-data', async (_, data) => {
  await ensureStorage()
  return writeDataFile(data)
})

ipcMain.handle('save-image', async (_, fileBuffer, fileName) => {
  await ensureStorage()
  const ext = path.extname(fileName || '').toLowerCase() || '.png'
  const base = path.basename(fileName || `image${ext}`, ext).replace(/[^\w.-]/g, '_')
  const uniqueName = `${base}_${Date.now()}${ext}`
  const targetPath = path.join(imagesDir, uniqueName)
  const buffer = Buffer.from(fileBuffer)
  await fs.writeFile(targetPath, buffer)
  return `file://${targetPath.replace(/\\/g, '/')}`
})

ipcMain.handle('delete-image', async (_, imagePath) => {
  if (!imagePath) return { ok: false }
  try {
    const normalized = imagePath.startsWith('file://') ? imagePath.slice(7) : imagePath
    await fs.unlink(normalized)
    return { ok: true }
  } catch {
    return { ok: false }
  }
})

/** 读取资料库目录内图片为 base64，供上传到云端（路径校验防目录穿越） */
ipcMain.handle('read-image-buffer', async (_, fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('file://')) {
    return { ok: false, message: '仅支持本机 file:// 图片' }
  }
  await ensureStorage()
  let filePath
  try {
    filePath = fileURLToPath(fileUrl)
  } catch {
    return { ok: false, message: '路径无效' }
  }
  const resolved = path.resolve(filePath)
  const imagesResolved = path.resolve(imagesDir)
  const rel = path.relative(imagesResolved, resolved)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return { ok: false, message: '只能读取封面资料库目录内的图片' }
  }
  try {
    const buffer = await fs.readFile(resolved)
    const ext = path.extname(resolved).toLowerCase() || '.png'
    if (!IMAGE_EXTS.has(ext)) {
      return { ok: false, message: '不支持的图片格式' }
    }
    return { ok: true, ext, base64: buffer.toString('base64') }
  } catch {
    return { ok: false, message: '读取文件失败' }
  }
})

ipcMain.handle('select-folder', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
  if (res.canceled) return ''
  return res.filePaths?.[0] || ''
})

ipcMain.handle('import-cover-folder', async (_, folderPath) => {
  if (!folderPath) return { ok: false, message: '未选择文件夹', items: [] }
  try {
    const abs = path.resolve(folderPath)
    const files = await walkImages(abs)
    const now = Date.now()
    const items = await Promise.all(
      files.map(async (filePath, idx) => {
        const imageUrl = await copyImageToLibrary(filePath)
        // folder1: 相对导入根目录的一级子文件夹（只展示第一层树形结构）
        const ext = path.extname(filePath)
        const relPath = path.relative(abs, filePath)
        const parts = relPath.split(path.sep)
        const folder1 = parts.length >= 2 ? parts[0] : ''
        const filename = path.basename(filePath, ext)
        const name = folder1 ? `${folder1}/${filename}` : filename
        // 图片编号：与 Excel「模型编号」对齐，使用源文件名（不含扩展名），不含文件夹前缀
        const imageCode = filename
        return {
          id: `${now}_${idx}`,
          name,
          folder1,
          imageCode,
          imageUrl,
          originalPath: filePath,
          createdAt: new Date().toISOString(),
        }
      }),
    )
    return { ok: true, message: `已导入 ${items.length} 张封面`, items }
  } catch {
    return { ok: false, message: '导入失败：无法读取文件夹或复制图片', items: [] }
  }
})

ipcMain.handle('list-pdf-files', async (_, folderPath, recursive = true) => {
  if (!folderPath) return { ok: false, message: '未选择目录', data: [] }
  try {
    const abs = path.resolve(folderPath)
    const pdfPaths = await walkPdfs(abs, recursive)
    const now = Date.now()
    const root = abs

    const data = pdfPaths.map((filePath, idx) => {
      const rel = path.relative(root, filePath)
      const parts = rel.split(path.sep)
      const folder1 = parts.length >= 2 ? parts[0] : ''
      const name = path.basename(filePath)
      const fileUrl = `file://${filePath.replace(/\\/g, '/')}`

      return {
        id: `${now}_${idx}`,
        name,
        fileUrl,
        relativePath: rel,
        folder1,
      }
    })

    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      message: err?.message || '列出 PDF 失败',
      data: [],
    }
  }
})

ipcMain.handle('log-renderer', async (_, level, message) => {
  await appendLog(rendererLogPath, level || 'info', message)
  return { ok: true }
})

ipcMain.handle('open-logs-folder', async () => {
  await fs.mkdir(logsDir, { recursive: true })
  await shell.openPath(logsDir)
  return { ok: true, path: logsDir }
})

ipcMain.handle('open-external', async (_, url) => {
  const target = String(url || '').trim()
  if (!target) return { ok: false, message: '未提供可打开的链接' }

  try {
    await shell.openExternal(target)
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err?.message || String(err) }
  }
})

ipcMain.handle('get-logs-path', async () => {
  await fs.mkdir(logsDir, { recursive: true })
  return { ok: true, logsDir, mainLogPath, rendererLogPath }
})

ipcMain.handle('update-check', async () => {
  if (isDev) {
    return { ok: false, message: '开发模式不支持自动更新（请打包后测试）' }
  }
  try {
    const res = await autoUpdater.checkForUpdates()
    return { ok: true, updateInfo: res?.updateInfo || null }
  } catch (err) {
    return { ok: false, message: err?.message || String(err) }
  }
})

ipcMain.handle('update-quit-and-install', async () => {
  if (isDev) {
    return { ok: false, message: '开发模式不支持安装更新' }
  }
  try {
    autoUpdater.quitAndInstall()
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err?.message || String(err) }
  }
})

ipcMain.handle('wipe-user-data', async () => {
  if (isDev) {
    return { ok: false, message: '开发模式不建议清空（请打包后再测试）' }
  }
  try {
    // 尽量减少占用，先关闭窗口
    for (const w of BrowserWindow.getAllWindows()) {
      try {
        w.hide()
      } catch {
        // ignore
      }
      try {
        w.destroy()
      } catch {
        // ignore
      }
    }

    const targets = [
      dataDir,
      logsDir,
      path.join(userDataDir, 'Cache'),
      path.join(userDataDir, 'Code Cache'),
      path.join(userDataDir, 'GPUCache'),
      path.join(userDataDir, 'Local Storage'),
      path.join(userDataDir, 'Session Storage'),
      path.join(userDataDir, 'IndexedDB'),
    ]

    const errors = []
    for (const t of targets) {
      const res = await safeRm(t)
      if (!res.ok) errors.push({ path: t, message: res.message })
    }

    if (errors.length > 0) {
      return { ok: false, message: '部分文件仍在占用，清空未完成', errors }
    }

    app.relaunch()
    app.exit(0)
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err?.message || String(err) }
  }
})

ipcMain.removeHandler('wipe-user-data')
ipcMain.handle('wipe-user-data', async () => {
  if (isDev) {
    return { ok: false, message: '开发模式不建议清空，请打包后再测试。' }
  }

  try {
    for (const w of BrowserWindow.getAllWindows()) {
      try {
        w.hide()
      } catch {
        // ignore
      }
      try {
        w.destroy()
      } catch {
        // ignore
      }
    }

    const relaunchArgs = process.argv.filter((arg) => arg !== WIPE_ON_RELAUNCH_FLAG)
    relaunchArgs.push(WIPE_ON_RELAUNCH_FLAG)

    setTimeout(() => {
      app.relaunch({ args: relaunchArgs })
      app.exit(0)
    }, 150)

    return { ok: true, restarting: true }
  } catch (err) {
    return { ok: false, message: err?.message || String(err) }
  }
})

ipcMain.handle('fetch-gunpla-release-price', async (_, payload) => {
  const p = payload && typeof payload === 'object' ? payload : {}
  return lookupGunplaReleasePrice(p)
})

ipcMain.handle('fetch-gunpla-cover-image', async (_, payload) => {
  const p = payload && typeof payload === 'object' ? payload : {}
  try {
    const info = await lookupGunplaCoverImageInfo(p)
    if (!info.ok) {
      return info
    }
    const imageUrl = await downloadWikiCoverToLibrary(info)
    return {
      ok: true,
      imageUrl,
      sourceUrl: info.sourceUrl,
      provider: info.provider,
    }
  } catch (e) {
    return {
      ok: false,
      message: e?.message || String(e),
    }
  }
})

app.whenReady().then(async () => {
  if (process.argv.includes(WIPE_ON_RELAUNCH_FLAG)) {
    const errors = await wipeUserDataDirectories()
    if (errors.length > 0) {
      await appendLog(mainLogPath, 'error', `wipe user data failed: ${JSON.stringify(errors)}`)
    }
  }

  await ensureStorage()
  app.setName('金屋藏胶 / Gunpla Manager')
  logMain('info', `app ready (isDev=${isDev}) userData=${userDataDir}`)
  createWindow()
  initAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

process.on('uncaughtException', (err) => {
  logMain('error', `uncaughtException: ${err?.stack || err?.message || String(err)}`)
})

process.on('unhandledRejection', (reason) => {
  logMain('error', `unhandledRejection: ${reason?.stack || reason?.message || String(reason)}`)
})
