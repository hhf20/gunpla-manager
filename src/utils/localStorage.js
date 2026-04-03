const isBrowser = typeof window !== 'undefined'

export const GUNPLA_WEB_STORAGE_KEY = 'gunpla_manager_portable_data_v1'

export function readLocalStorage(key, fallback) {
  if (!isBrowser) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export function writeLocalStorage(key, value) {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore write failures (private mode / quota)
  }
}

export function downloadJsonFile(filename, data) {
  if (!isBrowser) return
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function readJsonFile(file) {
  const text = await file.text()
  return JSON.parse(text)
}
