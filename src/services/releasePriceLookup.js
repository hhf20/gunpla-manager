/**
 * 桌面版通过主进程查询发售价（日元）；纯浏览器环境无 IPC。
 * @param {{ name?: string, modelCode?: string, grade?: string }} payload
 */
export async function fetchGunplaReleasePriceFromMain(payload) {
  if (typeof window === 'undefined' || !window.api?.fetchGunplaReleasePrice) {
    return {
      ok: false,
      message: '联网查询发售价仅在使用 Gunpla Manager 桌面版时可用（请运行 electron 或打包后的应用）',
    }
  }
  return window.api.fetchGunplaReleasePrice(payload || {})
}

/**
 * 从 Gunpla Wiki 拉取盒绘并写入本地资料库目录，返回 file:// 地址。
 * @param {{ name?: string, modelCode?: string, grade?: string }} payload
 */
export async function fetchGunplaCoverImageFromMain(payload) {
  if (typeof window === 'undefined' || !window.api?.fetchGunplaCoverImage) {
    return {
      ok: false,
      message: '联网获取封面仅在使用 Gunpla Manager 桌面版时可用（请运行 electron 或打包后的应用）',
    }
  }
  return window.api.fetchGunplaCoverImage(payload || {})
}
