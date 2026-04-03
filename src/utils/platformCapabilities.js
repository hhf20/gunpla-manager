export function getPlatformCapabilities() {
  const api = typeof window !== 'undefined' ? window.api : null
  const isDesktopShell = Boolean(api?.readData && api?.writeData)

  return {
    isDesktopShell,
    supportsLocalImageLibrary: Boolean(api?.saveImage),
    supportsManualLibrary: Boolean(api?.selectFolder && api?.listPdfFiles),
    supportsAutoUpdate: Boolean(api?.checkForUpdates && api?.quitAndInstallUpdate),
    supportsLogs: Boolean(api?.openLogsFolder),
    supportsDesktopImport: true,
  }
}
