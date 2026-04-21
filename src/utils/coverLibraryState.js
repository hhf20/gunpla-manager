export function isImageReferencedByAnyGunpla(gunplaList, imageUrl) {
  return gunplaList.some((item) => {
    if (item.coverImage === imageUrl) return true
    if (Array.isArray(item.buildImages) && item.buildImages.includes(imageUrl)) return true
    if (Array.isArray(item.boxImages) && item.boxImages.includes(imageUrl)) return true
    return false
  })
}

export function mergeIncomingCovers(existingCovers, incomingCovers) {
  const existingOriginal = new Set(existingCovers.map((item) => item.originalPath).filter(Boolean))
  const next = incomingCovers.filter(
    (item) => !item.originalPath || !existingOriginal.has(item.originalPath),
  )
  return [...next, ...existingCovers]
}

export function partitionCoverTargetsByUsage(covers, gunplaList) {
  const removable = []
  const referenced = []

  for (const cover of covers) {
    if (isImageReferencedByAnyGunpla(gunplaList, cover.imageUrl)) referenced.push(cover)
    else removable.push(cover)
  }

  return { removable, referenced }
}
