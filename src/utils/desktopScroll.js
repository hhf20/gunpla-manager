export const DESKTOP_MAIN_SCROLL_ID = 'desktop-main-scroll'
export const DESKTOP_MAIN_SCROLL_KEY = 'desktop-main-scroll-top'

export function saveDesktopMainScrollPosition() {
  if (typeof window === 'undefined') return
  const element = document.getElementById(DESKTOP_MAIN_SCROLL_ID)
  if (!element) return
  window.sessionStorage.setItem(DESKTOP_MAIN_SCROLL_KEY, String(element.scrollTop || 0))
}

export function restoreDesktopMainScrollPosition(element) {
  if (typeof window === 'undefined' || !element) return
  const stored = Number(window.sessionStorage.getItem(DESKTOP_MAIN_SCROLL_KEY) || 0)
  if (!Number.isFinite(stored) || stored <= 0) return

  const apply = () => {
    element.scrollTop = stored
  }

  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
}

export function scrollDesktopContainersToTop(sidebarElement = null) {
  sidebarElement?.scrollTo({ top: 0, behavior: 'smooth' })
  document.getElementById(DESKTOP_MAIN_SCROLL_ID)?.scrollTo({ top: 0, behavior: 'smooth' })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
