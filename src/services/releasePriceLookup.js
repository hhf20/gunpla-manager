/**
 * 桌面版通过主进程查询发售价，纯浏览器环境下不可用。
 * @param {{ name?: string, modelCode?: string, grade?: string }} payload
 */
export async function fetchGunplaReleasePriceFromMain(payload) {
  if (typeof window === 'undefined' || !window.api?.fetchGunplaReleasePrice) {
    return {
      ok: false,
      message: '联网查询发售价仅在金屋藏胶 / Gunpla Manager 桌面版中可用，请运行 Electron 或打包后的应用。',
    }
  }

  return window.api.fetchGunplaReleasePrice(payload || {})
}

/**
 * 从 Gunpla Wiki 拉取盒绘并保存到本地资料库。
 * @param {{ name?: string, modelCode?: string, grade?: string }} payload
 */
export async function fetchGunplaCoverImageFromMain(payload) {
  if (typeof window === 'undefined' || !window.api?.fetchGunplaCoverImage) {
    return {
      ok: false,
      message: '联网获取盒绘仅在金屋藏胶 / Gunpla Manager 桌面版中可用，请运行 Electron 或打包后的应用。',
    }
  }

  return window.api.fetchGunplaCoverImage(payload || {})
}
