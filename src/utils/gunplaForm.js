export const ITEM_TYPE_OPTIONS = [
  { label: '我的收藏', value: 'owned' },
  { label: '愿望清单', value: 'wishlist' },
]

export const OWNED_STATUS_OPTIONS = ['未拼装', '已拼装', '已涂装']

export function createEmptyGunplaForm({ defaultReleaseType = '通贩', defaultPlatform = '' } = {}) {
  return {
    type: 'owned',
    grade: '',
    series: '',
    scale: '',
    boxNumber: '',
    modelCode: '',
    name: '',
    releasePrice: '',
    reissuePrice: '',
    releaseType: defaultReleaseType,
    purchasePlatform: defaultPlatform,
    buildStatus: '',
    purchaseDate: '',
    purchasePrice: '',
    purchaseCount: 1,
    expectedPrice: '',
    currentPrice: '',
    status: OWNED_STATUS_OPTIONS[0],
    tags: '',
    note: '',
    coverImage: '',
    buildImages: [],
    boxImages: [],
  }
}

export function createGunplaFormFromItem(
  item,
  { defaultReleaseType = '通贩', defaultPlatform = '' } = {},
) {
  const base = createEmptyGunplaForm({ defaultReleaseType, defaultPlatform })
  if (!item) return base

  return {
    ...base,
    type: item.type === 'wishlist' ? 'wishlist' : 'owned',
    grade: item.grade || base.grade,
    series: item.series || base.series,
    scale: item.scale || '',
    boxNumber: item.boxNumber || '',
    modelCode: item.modelCode || '',
    name: item.name || '',
    releasePrice: item.releasePrice ?? '',
    reissuePrice: item.reissuePrice ?? '',
    releaseType: item.releaseType || defaultReleaseType,
    purchasePlatform: item.purchasePlatform || defaultPlatform,
    buildStatus: item.buildStatus || base.buildStatus,
    purchaseDate: item.purchaseDate || '',
    purchasePrice: item.purchasePrice ?? '',
    purchaseCount: item.purchaseCount ?? 1,
    expectedPrice: item.expectedPrice ?? '',
    currentPrice: item.currentPrice ?? '',
    status: item.status || OWNED_STATUS_OPTIONS[0],
    tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
    note: item.note || '',
    coverImage: item.coverImage || '',
    buildImages: Array.isArray(item.buildImages) ? item.buildImages : [],
    boxImages: Array.isArray(item.boxImages) ? item.boxImages : [],
  }
}

export function gunplaFormToPayload(form) {
  return {
    type: form.type === 'wishlist' ? 'wishlist' : 'owned',
    grade: form.grade,
    series: form.series,
    scale: form.scale.trim(),
    boxNumber: form.boxNumber.trim(),
    modelCode: form.modelCode.trim(),
    name: form.name.trim(),
    releasePrice: Number(form.releasePrice) || 0,
    reissuePrice: Number(form.reissuePrice) || 0,
    releaseType: form.releaseType,
    purchasePlatform: form.purchasePlatform.trim(),
    buildStatus: form.buildStatus,
    purchaseDate: form.type === 'owned' ? form.purchaseDate : '',
    purchasePrice: form.type === 'owned' ? Number(form.purchasePrice) || 0 : 0,
    purchaseCount: Math.max(1, Number(form.purchaseCount) || 1),
    expectedPrice: form.type === 'wishlist' ? Number(form.expectedPrice) || 0 : 0,
    currentPrice: Number(form.currentPrice) || 0,
    status: form.type === 'owned' ? form.status : '',
    tags: form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    note: form.note.trim(),
    coverImage: form.coverImage || '',
    buildImages: Array.isArray(form.buildImages) ? form.buildImages : [],
    boxImages: Array.isArray(form.boxImages) ? form.boxImages : [],
  }
}

export async function saveImageFilesToLibrary(files) {
  const list = Array.from(files || [])
  const results = await Promise.all(
    list.map(async (file) => {
      if (!window.api?.saveImage) return ''
      const buffer = await file.arrayBuffer()
      const savedPath = await window.api.saveImage(buffer, file.name)
      return savedPath || ''
    }),
  )
  return results.filter(Boolean)
}
