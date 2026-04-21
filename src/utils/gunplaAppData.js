import { addNode, flattenLabels, fromFlatList, sanitizeTree } from './configTree.js'

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
  headerCollapsed: false,
  sidebarCollapsed: false,
}

export const DEFAULT_THEME = {
  preset: 'hangar',
  desktopStyleId: 'legacy',
  backgroundImage: '',
  backgroundOpacity: 0.35,
}

const DESKTOP_STYLE_IDS = new Set(['legacy', 'showcase'])

export const THEME_PRESETS = [
  {
    id: 'hangar',
    label: '红韵唱片',
    description: '浅色内容底盘配合红色强调，更接近音乐客户端的清爽桌面体验。',
    swatches: ['#F5F5F7', '#FFFFFF', '#ECECEF', '#D33A31'],
  },
  {
    id: 'gallery',
    label: '暖白展柜',
    description: '更柔和的展柜质感，适合想保留浅色但弱化品牌红的场景。',
    swatches: ['#FBFAF8', '#FFFFFF', '#EFE7DC', '#B76B31'],
  },
  {
    id: 'tactical',
    label: '工业战术',
    description: '硬朗工业感与战术警示点缀并存，强调结构感、工具感和力量感。',
    swatches: ['#1A1A1A', '#333333', '#4F5F3D', '#FF6B00'],
  },
]

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

export const DEFAULT_PRICE_TREND = {
  enabled: true,
  benchmarkPrice: 0,
  taxIncludedPrice: 0,
  releaseYear: '',
  reissueMonth: '',
  targetPrice: 0,
  channels: [
    { id: 'pdd', label: 'PDD', price: 0 },
    { id: 'xianyu', label: '海鲜市场', price: 0 },
    { id: 'tb', label: 'TB', price: 0 },
  ],
  history: [],
}

function normalizePriceHistory(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((entry) => ({
      date: typeof entry?.date === 'string' ? entry.date : '',
      price: Number(entry?.price) || 0,
      provider: typeof entry?.provider === 'string' ? entry.provider : '',
      sourceUrl: typeof entry?.sourceUrl === 'string' ? entry.sourceUrl : '',
      sampledAt: typeof entry?.sampledAt === 'string' ? entry.sampledAt : '',
    }))
    .filter((entry) => entry.date && entry.price > 0)
    .slice(-30)
}

function normalizePriceTrendChannels(list) {
  const source = Array.isArray(list) && list.length > 0 ? list : DEFAULT_PRICE_TREND.channels
  return source.slice(0, 3).map((channel, index) => ({
    id:
      typeof channel?.id === 'string' && channel.id.trim()
        ? channel.id.trim()
        : DEFAULT_PRICE_TREND.channels[index]?.id || `channel-${index + 1}`,
    label:
      typeof channel?.label === 'string' && channel.label.trim()
        ? channel.label.trim()
        : DEFAULT_PRICE_TREND.channels[index]?.label || `渠道 ${index + 1}`,
    price: Number(channel?.price) || 0,
  }))
}

function normalizePriceTrendHistory(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((entry, index) => {
      const channels = Array.isArray(entry?.channels)
        ? entry.channels.map((channel) => ({
            id: typeof channel?.id === 'string' ? channel.id : '',
            label: typeof channel?.label === 'string' ? channel.label : '',
            price: Number(channel?.price) || 0,
          }))
        : []

      const average =
        Number(entry?.averagePrice) ||
        (() => {
          const prices = channels.map((channel) => Number(channel.price) || 0).filter((price) => price > 0)
          if (prices.length === 0) return 0
          return Number((prices.reduce((sum, price) => sum + price, 0) / prices.length).toFixed(1))
        })()

      return {
        id:
          typeof entry?.id === 'string' && entry.id.trim()
            ? entry.id.trim()
            : `${entry?.recordedAt || entry?.date || 'trend'}-${index}`,
        label:
          typeof entry?.label === 'string' && entry.label.trim()
            ? entry.label.trim()
            : typeof entry?.date === 'string'
              ? entry.date
              : `记录 ${index + 1}`,
        averagePrice: average,
        recordedAt:
          typeof entry?.recordedAt === 'string' && entry.recordedAt
            ? entry.recordedAt
            : typeof entry?.date === 'string'
              ? `${entry.date}T00:00:00.000Z`
              : '',
        channels,
      }
    })
    .filter((entry) => entry.averagePrice > 0 || entry.channels.some((channel) => channel.price > 0))
    .slice(-12)
}

export function normalizePriceTrendState(rawTrend, item = null) {
  if (rawTrend && typeof rawTrend === 'object') {
    return {
      enabled: rawTrend.enabled !== false,
      benchmarkPrice: Number(rawTrend.benchmarkPrice) || 0,
      taxIncludedPrice: Number(rawTrend.taxIncludedPrice) || 0,
      targetPrice: Number(rawTrend.targetPrice) || 0,
      releaseYear:
        typeof rawTrend.releaseYear === 'string'
          ? rawTrend.releaseYear
          : rawTrend.releaseYear != null
            ? String(rawTrend.releaseYear)
            : '',
      reissueMonth:
        typeof rawTrend.reissueMonth === 'string'
          ? rawTrend.reissueMonth
          : rawTrend.reissueMonth != null
            ? String(rawTrend.reissueMonth)
            : '',
      channels: normalizePriceTrendChannels(rawTrend.channels),
      history: normalizePriceTrendHistory(rawTrend.history),
    }
  }

  const legacyHistory = normalizePriceHistory(item?.priceHistory)
  return {
    ...DEFAULT_PRICE_TREND,
    enabled: true,
    channels: normalizePriceTrendChannels(
      DEFAULT_PRICE_TREND.channels.map((channel, index) => ({
        ...channel,
        price: index === 0 ? Number(item?.currentPrice) || 0 : 0,
      })),
    ),
    history: normalizePriceTrendHistory(
      legacyHistory.map((entry) => ({
        id: entry.date,
        label: entry.date,
        averagePrice: entry.price,
        recordedAt: entry.sampledAt || `${entry.date}T00:00:00.000Z`,
        channels: [
          {
            id: 'legacy',
            label: entry.provider || '历史价格',
            price: entry.price,
          },
        ],
      })),
    ),
  }
}

export function parseTheme(theme) {
  if (!theme || typeof theme !== 'object') return { ...DEFAULT_THEME }
  const opacity = Number(theme.backgroundOpacity)
  const preset = THEME_PRESETS.some((item) => item.id === theme.preset)
    ? theme.preset
    : DEFAULT_THEME.preset
  const desktopStyleId = DESKTOP_STYLE_IDS.has(theme.desktopStyleId)
    ? theme.desktopStyleId
    : DEFAULT_THEME.desktopStyleId
  return {
    preset,
    desktopStyleId,
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

  const headerCollapsed =
    typeof parsed?.headerCollapsed === 'boolean'
      ? parsed.headerCollapsed
      : UI_INITIAL_STATE.headerCollapsed
  const sidebarCollapsed =
    typeof parsed?.sidebarCollapsed === 'boolean'
      ? parsed.sidebarCollapsed
      : UI_INITIAL_STATE.sidebarCollapsed

  return {
    cardDensity,
    showGradeLogo,
    showSeriesLogo,
    sidebarWidth,
    headerCollapsed,
    sidebarCollapsed,
  }
}

export function normalizeStoredItem(item) {
  return {
    ...item,
    type: item?.type === 'wishlist' ? 'wishlist' : 'owned',
    purchaseCount: Number.isFinite(Number(item?.purchaseCount))
      ? Math.max(1, Number(item.purchaseCount))
      : 1,
    tags: Array.isArray(item?.tags) ? item.tags : [],
    buildImages: Array.isArray(item?.buildImages) ? item.buildImages : [],
    boxImages: Array.isArray(item?.boxImages) ? item.boxImages : [],
    coverImage: item?.coverImage || item?.image || '',
    name: item?.name || '',
    modelCode: item?.modelCode || '',
    boxNumber: item?.boxNumber || '',
    scale: item?.scale || '',
    grade: item?.grade || '',
    series: item?.series || '',
    releasePrice: Number(item?.releasePrice) || 0,
    reissuePrice: Number(item?.reissuePrice) || 0,
    releaseType: item?.releaseType || '通贩',
    purchasePlatform: item?.purchasePlatform || '',
    buildStatus: item?.buildStatus || '未开盒',
    purchasePrice: Number(item?.purchasePrice) || 0,
    expectedPrice: Number(item?.expectedPrice) || 0,
    currentPrice: Number(item?.currentPrice) || 0,
    status: item?.status || '',
    note: item?.note || '',
    priceHistory: normalizePriceHistory(item?.priceHistory),
    lastPriceSyncAt: typeof item?.lastPriceSyncAt === 'string' ? item.lastPriceSyncAt : '',
    lastPriceProvider:
      typeof item?.lastPriceProvider === 'string' ? item.lastPriceProvider : '',
    lastPriceSourceUrl:
      typeof item?.lastPriceSourceUrl === 'string' ? item.lastPriceSourceUrl : '',
    priceTrend: normalizePriceTrendState(item?.priceTrend, item),
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
