export function log(level, message, extra) {
  const text =
    extra !== undefined
      ? `${message} ${typeof extra === 'string' ? extra : JSON.stringify(extra)}`
      : message
  try {
    const api = typeof window !== 'undefined' ? window.api : null
    if (api?.logRenderer) api.logRenderer(level, text)
  } catch {
    // ignore
  }
}

export function initRendererLogging() {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    log('error', 'window.error', {
      message: event?.message,
      filename: event?.filename,
      lineno: event?.lineno,
      colno: event?.colno,
      error: event?.error?.stack || event?.error?.message,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    log('error', 'unhandledrejection', {
      reason: event?.reason?.stack || event?.reason?.message || String(event?.reason),
    })
  })
}

