async function toPortableImageUrl(url, readImageBuffer) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  if (!value.startsWith('file://') || typeof readImageBuffer !== 'function') return ''

  try {
    const result = await readImageBuffer(value)
    if (!result?.ok || !result?.base64) return ''
    const ext = String(result.ext || '.png').replace(/^\./, '').toLowerCase()
    const mime = ext === 'jpg' ? 'jpeg' : ext
    return `data:image/${mime};base64,${result.base64}`
  } catch {
    return ''
  }
}

export async function createPortableExportPayload({
  gunplaList,
  coverLibrary,
  configTree,
  categoryConfig,
  buildStatusConfig,
  theme,
  readImageBuffer,
}) {
  return {
    gunplaList: await Promise.all(
      gunplaList.map(async (item) => ({
        ...item,
        coverImage: await toPortableImageUrl(item.coverImage, readImageBuffer),
        buildImages: [],
        boxImages: [],
      })),
    ),
    coverLibrary: await Promise.all(
      coverLibrary.map(async (item) => ({
        ...item,
        imageUrl: await toPortableImageUrl(item.imageUrl, readImageBuffer),
      })),
    ),
    configTree,
    categoryConfig,
    buildStatusConfig,
    theme: {
      preset: theme.preset,
      backgroundImage: '',
      backgroundOpacity: theme.backgroundOpacity,
    },
    exportedAt: new Date().toISOString(),
    version: 1,
    portable: true,
  }
}
