import { readLocalStorage, writeLocalStorage, GUNPLA_WEB_STORAGE_KEY } from './localStorage'

const DB_NAME = 'gunpla_manager_web_v1'
const DB_VERSION = 1
const STORE = 'kv'
const PAYLOAD_KEY = 'payload'

let storageFailureAlertShown = false

function isValidPayload(data) {
  return Boolean(data && typeof data === 'object' && Array.isArray(data.gunplaList))
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error || new Error('indexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

async function idbGet(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const r = store.get(key)
    r.onerror = () => reject(r.error)
    r.onsuccess = () => resolve(r.result)
  })
}

async function idbPut(key, value) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put(value, key)
  })
}

export async function readWebPayload(fallback) {
  if (typeof window === 'undefined') return fallback

  if (typeof indexedDB !== 'undefined') {
    try {
      const fromIdb = await idbGet(PAYLOAD_KEY)
      if (isValidPayload(fromIdb)) return fromIdb
    } catch { /* ignore */ }

    const fromLs = readLocalStorage(GUNPLA_WEB_STORAGE_KEY, null)
    if (isValidPayload(fromLs)) {
      try {
        await idbPut(PAYLOAD_KEY, fromLs)
        try {
          window.localStorage.removeItem(GUNPLA_WEB_STORAGE_KEY)
        } catch { /* ignore */ }
      } catch { /* ignore */ }
      return fromLs
    }
    return fallback
  }

  return readLocalStorage(GUNPLA_WEB_STORAGE_KEY, fallback)
}

export async function persistWebPayload(payload) {
  if (typeof window === 'undefined') return { ok: true }

  if (typeof indexedDB !== 'undefined') {
    try {
      await idbPut(PAYLOAD_KEY, payload)
      try {
        window.localStorage.removeItem(GUNPLA_WEB_STORAGE_KEY)
      } catch { /* ignore */ }
      return { ok: true }
    } catch { /* ignore */ }
  }

  try {
    writeLocalStorage(GUNPLA_WEB_STORAGE_KEY, payload)
    return { ok: true, usedLocalStorageFallback: true }
  } catch {
    if (!storageFailureAlertShown) {
      storageFailureAlertShown = true
      window.alert(
        '无法保存到本地：存储空间不足或浏览器限制。数据可能未保存，请导出备份、清理站点数据或换用支持 IndexedDB 的浏览器后重试。',
      )
    }
    return {
      ok: false,
      message: '无法写入本地存储，请检查浏览器存储空间或隐私模式设置。',
    }
  }
}
