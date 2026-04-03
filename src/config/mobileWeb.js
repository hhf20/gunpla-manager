const rawMobileWebUrl = String(import.meta.env.VITE_MOBILE_WEB_URL || '').trim()

export const MOBILE_WEB_URL = rawMobileWebUrl
export const MOBILE_WEB_PLACEHOLDER = 'https://your-project-name.vercel.app'

export function hasConfiguredMobileWebUrl() {
  return Boolean(rawMobileWebUrl)
}

export function getMobileWebUrlOrPlaceholder() {
  return rawMobileWebUrl || MOBILE_WEB_PLACEHOLDER
}
