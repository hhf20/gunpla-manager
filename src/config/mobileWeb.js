const rawMobileWebUrl = String(import.meta.env.VITE_MOBILE_WEB_URL || '').trim()

export const MOBILE_WEB_URL = rawMobileWebUrl
export const MOBILE_WEB_PLACEHOLDER = 'https://hhf20.github.io/gunpla-manager/'

export function hasConfiguredMobileWebUrl() {
  return Boolean(rawMobileWebUrl)
}

export function getMobileWebUrlOrPlaceholder() {
  return rawMobileWebUrl || MOBILE_WEB_PLACEHOLDER
}
