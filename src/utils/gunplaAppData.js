import { addNode, flattenLabels, fromFlatList, sanitizeTree } from './configTree'

export const DEFAULT_CATEGORY_CONFIG = {
  grade: ['HG', 'RG', 'MG', 'PG', 'RE100'],
  series: ['SEED', 'UC', 'OO'],
  customTags: ['PB限定', '透明件', '电镀件'],
  releaseTypes: ['通贩', 'PB限定', '基地限定'],
  purchasePlatforms: ['淘宝', '拼多多', 'Amazon', '实体店'],
}

export const FILTER_INITIAL_STATE = {
  searchText: '',
  grades: [],
  status: [],
  buildStatuses: [],
  series: [],
  tags: [],
  type: 'all',
}

export const DEFAULT_BUILD_STATUS_CONFIG = ['未开盒', '素组', '渗线', '水贴', '喷涂', '完成']

export const UI_INITIAL_STATE = {
  cardDensity: 'comfortable',
  showGradeLogo: true,
  showSeriesLogo: true,
  sidebarWidth: 288,
}

export const DEFAULT_THEME = {
  backgroundImage: '',
  backgroundOpacity: 0.35,
}

export const DEFAULT_CONFIG_TREE = {
  grade: fromFlatList(DEFAULT_CATEGORY_CONFIG.grade),
  series: fromFlatList(DEFAULT_CATEGORY_CONFIG.series),
  customTags: fromFlatList(DEFAULT_CATEGORY_CONFIG.customTags),
  releaseTypes: fromFlatList(DEFAULT_CATEGORY_CONFIG.releaseTypes),
  purchasePlatforms: fromFlatList(DEFAULT_CATEGORY_CONFIG.purchasePlatforms),
  buildStatusConfig: fromFlatList(DEFAULT_BUILD_STATUS_CONFIG),
}

export const DEFAULT_DATA = {
  gunplaList: [],
  coverLibrary: [],
  categoryConfig: DEFAULT_CATEGORY_CONFIG,
  configTree: DEFAULT_CONFIG_TREE,
  buildStatusConfig: DEFAULT_BUILD_STATUS_CONFIG,
  filterState: FILTER_INITIAL_STATE,
  uiState: UI_INITIAL_STATE,
  theme: DEFAULT_THEME,
  manualRootPath: '',
}

export function parseTheme(theme) {
  if (!theme || typeof theme !== 'object') return { ...DEFAULT_THEME }
  const opacity = Number(theme.backgroundOpacity)
  return {
    backgroundImage: typeof theme.backgroundImage === 'string' ? theme.backgroundImage : '',
    backgroundOpacity: Number.isFinite(opacity)
      ? Math.min(1, Math.max(0, opacity))
      : DEFAULT_THEME.backgroundOpacity,
  }
}

export function parseCategoryConfig(parsed) {
  return {
    grade: Array.isArray(parsed?.grade) ? parsed.grade : DEFAULT_CATEGORY_CONFIG.grade,
    series: Array.isArray(parsed?.series) ? parsed.series : DEFAULT_CATEGORY_CONFIG.series,
    customTags: Array.isArray(parsed?.customTags)
      ? parsed.customTags
      : DEFAULT_CATEGORY_CONFIG.customTags,
    releaseTypes: Array.isArray(parsed?.releaseTypes)
      ? parsed.releaseTypes
      : DEFAULT_CATEGORY_CONFIG.releaseTypes,
    purchasePlatforms: Array.isArray(parsed?.purchasePlatforms)
      ? parsed.purchasePlatforms
      : DEFAULT_CATEGORY_CONFIG.purchasePlatforms,
  }
}

export function parseBuildStatusConfig(parsed) {
  if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_BUILD_STATUS_CONFIG
  return parsed
}

export function parseConfigTree(rawTree, rawCategoryConfig, rawBuildStatusConfig) {
  const fromTree = rawTree && typeof rawTree === 'object' ? rawTree : null
  if (fromTree) {
    return {
      grade: sanitizeTree(fromTree.grade),
      series: sanitizeTree(fromTree.series),
      customTags: sanitizeTree(fromTree.customTags),
      releaseTypes: sanitizeTree(fromTree.releaseTypes),
      purchasePlatforms: sanitizeTree(fromTree.purchasePlatforms),
      buildStatusConfig: sanitizeTree(fromTree.buildStatusConfig),
    }
  }

  const parsedCategory = parseCategoryConfig(rawCategoryConfig)
  const parsedBuild = parseBuildStatusConfig(rawBuildStatusConfig)
  return {
    grade: fromFlatList(parsedCategory.grade),
    series: fromFlatList(parsedCategory.series),
    customTags: fromFlatList(parsedCategory.customTags),
    releaseTypes: fromFlatList(parsedCategory.releaseTypes),
    purchasePlatforms: fromFlatList(parsedCategory.purchasePlatforms),
    buildStatusConfig: fromFlatList(parsedBuild),
  }
}

export function parseFilterState(parsed) {
  return {
    ...FILTER_INITIAL_STATE,
    ...(parsed || {}),
    grades: Array.isArray(parsed?.grades) ? parsed.grades : [],
    status: Array.isArray(parsed?.status) ? parsed.status : [],
    buildStatuses: Array.isArray(parsed?.buildStatuses) ? parsed.buildStatuses : [],
    series: Array.isArray(parsed?.series) ? parsed.series : [],
    tags: Array.isArray(parsed?.tags) ? parsed.tags : [],
  }
}

export function parseUiState(parsed) {
  const density = parsed?.cardDensity
  const cardDensity = density === 'compact' || density === 'ultra' ? density : 'comfortable'
  const showGradeLogo =
    typeof parsed?.showGradeLogo === 'boolean'
      ? parsed.showGradeLogo
      : UI_INITIAL_STATE.showGradeLogo
  const showSeriesLogo =
    typeof parsed?.showSeriesLogo === 'boolean'
      ? parsed.showSeriesLogo
      : UI_INITIAL_STATE.showSeriesLogo
  const sidebarWidthRaw = Number(parsed?.sidebarWidth)
  const sidebarWidth = Number.isFinite(sidebarWidthRaw)
    ? Math.min(420, Math.max(248, sidebarWidthRaw))
    : UI_INITIAL_STATE.sidebarWidth

  return { cardDensity, showGradeLogo, showSeriesLogo, sidebarWidth }
}

export function normalizeStoredItem(item) {
  return {
    ...item,
    type: item.type === 'wishlist' ? 'wishlist' : 'owned',
    purchaseCount: Number.isFinite(Number(item.purchaseCount))
      ? Math.max(1, Number(item.purchaseCount))
      : 1,
    tags: Array.isArray(item.tags) ? item.tags : [],
    buildImages: Array.isArray(item.buildImages) ? item.buildImages : [],
    boxImages: Array.isArray(item.boxImages) ? item.boxImages : [],
    coverImage: item.coverImage || item.image || '',
    name: item.name || '',
    modelCode: item.modelCode || '',
    boxNumber: item.boxNumber || '',
    scale: item.scale || '1/144',
    grade: item.grade || '',
    series: item.series || '',
    releasePrice: item.releasePrice || 0,
    reissuePrice: item.reissuePrice || 0,
    releaseType: item.releaseType || '通贩',
    purchasePlatform: item.purchasePlatform || '',
    buildStatus: item.buildStatus || '未开盒',
  }
}

export function sortGunplaListLatestFirst(list) {
  return [...(list || [])].sort((a, b) => {
    const aid = Number(a?.id)
    const bid = Number(b?.id)
    const aOk = Number.isFinite(aid)
    const bOk = Number.isFinite(bid)
    if (aOk && bOk) return bid - aid
    if (aOk && !bOk) return -1
    if (!aOk && bOk) return 1
    return 0
  })
}

export function stemFromDisplayName(displayName) {
  if (typeof displayName !== 'string' || !displayName.trim()) return ''
  const last = displayName.includes('/') ? displayName.split('/').pop() : displayName
  return last.trim()
}

export function normalizeCoverItem(item) {
  if (!item || typeof item !== 'object') return null
  const parsedFolder1 =
    typeof item.name === 'string' && item.name.includes('/') ? item.name.split('/')[0] : ''
  const derivedImageCode =
    typeof item.imageCode === 'string' && item.imageCode.trim()
      ? item.imageCode.trim()
      : stemFromDisplayName(item.name)
  return {
    id: item.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: typeof item.name === 'string' ? item.name : '',
    folder1: typeof item.folder1 === 'string' ? item.folder1 : parsedFolder1,
    imageCode: derivedImageCode,
    imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : '',
    originalPath: typeof item.originalPath === 'string' ? item.originalPath : '',
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
  }
}

export function mergeMissingConfigTreeValues(configTree, items) {
  const pushMissing = (list, value) => {
    const label = String(value || '').trim()
    if (!label) return list
    const exists = flattenLabels(list).includes(label)
    if (exists) return list
    return addNode(list, null, label)
  }

  let next = { ...configTree }
  for (const item of items) {
    next = {
      ...next,
      grade: pushMissing(next.grade, item.grade),
      series: pushMissing(next.series, item.series),
      releaseTypes: pushMissing(next.releaseTypes, item.releaseType),
      purchasePlatforms: pushMissing(next.purchasePlatforms, item.purchasePlatform),
      buildStatusConfig: pushMissing(next.buildStatusConfig, item.buildStatus),
    }
  }
  return next
}
