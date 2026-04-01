import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { downloadJsonFile, readJsonFile } from '../utils/localStorage'
import { normalizeMatchKey, parseGunplaExcel } from '../utils/excelImport'

const GunplaContext = createContext(null)

const defaultCategoryConfig = {
  grade: ['HG', 'RG', 'MG', 'PG', 'RE100'],
  series: ['SEED', 'UC', 'OO'],
  customTags: ['PB限定', '透明版', '电镀版'],
  releaseTypes: ['通贩', 'PB限定', '基地限定'],
  purchasePlatforms: ['淘宝', '拼多多', 'Amazon', '实体店'],
}

const FILTER_INITIAL_STATE = {
  searchText: '',
  grades: [],
  status: [],
  buildStatuses: [],
  series: [],
  tags: [],
  type: 'all',
}
const defaultBuildStatusConfig = ['未开盒', '素组', '渗线', '水贴', '喷涂', '完成']
const UI_INITIAL_STATE = {
  cardDensity: 'comfortable', // comfortable | compact | ultra
}
const DEFAULT_THEME = {
  backgroundImage: '',
  backgroundOpacity: 0.35,
}

function parseTheme(t) {
  if (!t || typeof t !== 'object') return { ...DEFAULT_THEME }
  const o = Number(t.backgroundOpacity)
  return {
    backgroundImage: typeof t.backgroundImage === 'string' ? t.backgroundImage : '',
    backgroundOpacity: Number.isFinite(o) ? Math.min(1, Math.max(0, o)) : DEFAULT_THEME.backgroundOpacity,
  }
}

const DEFAULT_DATA = {
  gunplaList: [],
  coverLibrary: [],
  categoryConfig: defaultCategoryConfig,
  buildStatusConfig: defaultBuildStatusConfig,
  filterState: FILTER_INITIAL_STATE,
  uiState: UI_INITIAL_STATE,
  theme: DEFAULT_THEME,
  manualRootPath: '',
}

export function filterGunplaList(gunplaList, filterState) {
  return gunplaList.filter((item) => {
    if (filterState.type !== 'all' && item.type !== filterState.type) return false

    const search = filterState.searchText.trim().toLowerCase()
    if (search && !item.name.toLowerCase().includes(search)) return false

    if (filterState.grades.length > 0 && !filterState.grades.includes(item.grade)) {
      return false
    }

    if (filterState.status.length > 0 && !filterState.status.includes(item.status)) {
      return false
    }
    if (
      filterState.buildStatuses.length > 0 &&
      !filterState.buildStatuses.includes(item.buildStatus)
    ) {
      return false
    }

    if (filterState.series.length > 0 && !filterState.series.includes(item.series)) {
      return false
    }

    if (
      filterState.tags.length > 0 &&
      !filterState.tags.every((tag) => Array.isArray(item.tags) && item.tags.includes(tag))
    ) {
      return false
    }

    return true
  })
}

function normalizeStoredItem(item) {
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
    modelCode: item.modelCode || '',
    releasePrice: item.releasePrice || 0,
    reissuePrice: item.reissuePrice || 0,
    releaseType: item.releaseType || '通贩',
    purchasePlatform: item.purchasePlatform || '',
    buildStatus: item.buildStatus || '未开盒',
  }
}

function sortGunplaListLatestFirst(list) {
  // 按 id（Date.now() / excel 导入生成的数值）降序，让“最新新增”的卡片始终在最前。
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

function parseCategoryConfig(parsed) {
  return {
    grade: Array.isArray(parsed?.grade) ? parsed.grade : defaultCategoryConfig.grade,
    series: Array.isArray(parsed?.series) ? parsed.series : defaultCategoryConfig.series,
    customTags: Array.isArray(parsed?.customTags)
      ? parsed.customTags
      : defaultCategoryConfig.customTags,
    releaseTypes: Array.isArray(parsed?.releaseTypes)
      ? parsed.releaseTypes
      : defaultCategoryConfig.releaseTypes,
    purchasePlatforms: Array.isArray(parsed?.purchasePlatforms)
      ? parsed.purchasePlatforms
      : defaultCategoryConfig.purchasePlatforms,
  }
}
function parseBuildStatusConfig(parsed) {
  if (!Array.isArray(parsed) || parsed.length === 0) return defaultBuildStatusConfig
  return parsed
}
function parseFilterState(parsed) {
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

function parseUiState(parsed) {
  const d = parsed?.cardDensity
  const cardDensity = d === 'compact' || d === 'ultra' ? d : 'comfortable'
  return { cardDensity }
}

function stemFromDisplayName(displayName) {
  if (typeof displayName !== 'string' || !displayName.trim()) return ''
  const last = displayName.includes('/') ? displayName.split('/').pop() : displayName
  return last.trim()
}

function normalizeCoverItem(item) {
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

export function GunplaProvider({ children }) {
  const [gunplaList, setGunplaList] = useState([])
  const [coverLibrary, setCoverLibrary] = useState([])
  const [categoryConfig, setCategoryConfig] = useState(defaultCategoryConfig)
  const [buildStatusConfig, setBuildStatusConfig] = useState(defaultBuildStatusConfig)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTypeManagementOpen, setIsTypeManagementOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isCoverLibraryOpen, setIsCoverLibraryOpen] = useState(false)
  const [coverLibraryMode, setCoverLibraryMode] = useState('manage') // 'manage' | 'select'
  const [onPickCover, setOnPickCover] = useState(null)
  const [editingGunpla, setEditingGunpla] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedGunplaId, setSelectedGunplaId] = useState(null)
  const [filterState, setFilterState] = useState(FILTER_INITIAL_STATE)
  const [uiState, setUiState] = useState(UI_INITIAL_STATE)
  const [theme, setTheme] = useState(DEFAULT_THEME)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isManualOpen, setIsManualOpen] = useState(false)
  const [manualRootPath, setManualRootPath] = useState(DEFAULT_DATA.manualRootPath || '')

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      if (!window.api?.readData) {
        setIsHydrated(true)
        return
      }
      try {
        const data = await window.api.readData()
        if (cancelled) return
        const safeData = data && typeof data === 'object' ? data : DEFAULT_DATA
        const nextGunplaList = Array.isArray(safeData.gunplaList)
          ? safeData.gunplaList.map(normalizeStoredItem)
          : []
        setGunplaList(sortGunplaListLatestFirst(nextGunplaList))
        setCoverLibrary(
          Array.isArray(safeData.coverLibrary)
            ? safeData.coverLibrary.map(normalizeCoverItem).filter(Boolean)
            : [],
        )
        setCategoryConfig(parseCategoryConfig(safeData.categoryConfig))
        setBuildStatusConfig(parseBuildStatusConfig(safeData.buildStatusConfig))
        setFilterState(parseFilterState(safeData.filterState))
        setUiState(parseUiState(safeData.uiState))
        setTheme(parseTheme(safeData.theme))
        setManualRootPath(typeof safeData.manualRootPath === 'string' ? safeData.manualRootPath : '')
      } catch {
        if (!cancelled) window.alert('读取本地文件失败，将以空数据启动')
      } finally {
        if (!cancelled) setIsHydrated(true)
      }
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isHydrated || !window.api?.writeData) return
    window.api.writeData({
      gunplaList,
      coverLibrary,
      categoryConfig,
      buildStatusConfig,
      filterState,
      uiState,
      theme,
      manualRootPath,
    })
  }, [gunplaList, coverLibrary, categoryConfig, buildStatusConfig, filterState, uiState, theme, manualRootPath, isHydrated])

  const selectedGunpla = useMemo(
    () => gunplaList.find((item) => item.id === selectedGunplaId) || null,
    [gunplaList, selectedGunplaId],
  )
  const filteredGunplaList = useMemo(
    () => filterGunplaList(gunplaList, filterState),
    [gunplaList, filterState],
  )
  const allTags = useMemo(
    () =>
      [
        ...new Set([
          ...gunplaList.flatMap((item) => item.tags || []),
          ...categoryConfig.customTags,
        ]),
      ].filter(Boolean),
    [gunplaList, categoryConfig.customTags],
  )

  const addGunpla = (payload) => {
    const nextItem = {
      ...payload,
      type: payload.type === 'wishlist' ? 'wishlist' : 'owned',
      buildImages: payload.buildImages || [],
      boxImages: payload.boxImages || [],
      buildStatus: payload.buildStatus || '未开盒',
      id: Date.now(),
    }
    setGunplaList((prev) => [nextItem, ...prev])
  }

  const updateGunpla = (id, payload) => {
    setGunplaList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...payload,
              type: payload.type === 'wishlist' ? 'wishlist' : 'owned',
              buildImages: payload.buildImages || [],
              boxImages: payload.boxImages || [],
              buildStatus: payload.buildStatus || '未开盒',
            }
          : item,
      ),
    )
  }

  const deleteGunpla = (id) => {
    setGunplaList((prev) => prev.filter((item) => item.id !== id))
    if (selectedGunplaId === id) {
      setIsDetailOpen(false)
      setSelectedGunplaId(null)
    }
  }

  const openAddModal = () => {
    setEditingGunpla(null)
    setIsModalOpen(true)
  }

  const openEditModal = (item) => {
    setEditingGunpla(item)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingGunpla(null)
  }

  const openDetail = (id) => {
    setSelectedGunplaId(id)
    setIsDetailOpen(true)
  }

  const closeDetail = () => {
    setIsDetailOpen(false)
  }
  const resetFilter = () => setFilterState(FILTER_INITIAL_STATE)
  const addCategoryItem = (key, value) => {
    const nextValue = value.trim()
    if (!nextValue) return
    setCategoryConfig((prev) => {
      if (prev[key].includes(nextValue)) return prev
      return { ...prev, [key]: [...prev[key], nextValue] }
    })
  }
  const removeCategoryItem = (key, value) => {
    setCategoryConfig((prev) => ({
      ...prev,
      [key]: prev[key].filter((item) => item !== value),
    }))
  }
  const getConfigUsageCount = (key, value) => {
    if (key === 'grade') return gunplaList.filter((item) => item.grade === value).length
    if (key === 'series') return gunplaList.filter((item) => item.series === value).length
    if (key === 'customTags') {
      return gunplaList.filter((item) => Array.isArray(item.tags) && item.tags.includes(value))
        .length
    }
    if (key === 'buildStatusConfig') {
      return gunplaList.filter((item) => item.buildStatus === value).length
    }
    if (key === 'releaseTypes') {
      return gunplaList.filter((item) => item.releaseType === value).length
    }
    if (key === 'purchasePlatforms') {
      return gunplaList.filter((item) => item.purchasePlatform === value).length
    }
    return 0
  }
  const safeRemoveConfigItem = (key, value, replacement = '') => {
    const usageCount = getConfigUsageCount(key, value)
    if (usageCount > 0 && !replacement) {
      return {
        ok: false,
        message: `该类型仍被 ${usageCount} 个模型使用，请先替换后再删除`,
      }
    }

    if (usageCount > 0 && replacement) {
      setGunplaList((prev) =>
        prev.map((item) => {
          if (key === 'grade' && item.grade === value) return { ...item, grade: replacement }
          if (key === 'series' && item.series === value) return { ...item, series: replacement }
          if (key === 'customTags' && Array.isArray(item.tags) && item.tags.includes(value)) {
            return {
              ...item,
              tags: item.tags.map((tag) => (tag === value ? replacement : tag)),
            }
          }
          if (key === 'buildStatusConfig' && item.buildStatus === value) {
            return { ...item, buildStatus: replacement }
          }
          if (key === 'releaseTypes' && item.releaseType === value) {
            return { ...item, releaseType: replacement }
          }
          if (key === 'purchasePlatforms' && item.purchasePlatform === value) {
            return { ...item, purchasePlatform: replacement }
          }
          return item
        }),
      )
    }

    if (key === 'buildStatusConfig') {
      setBuildStatusConfig((prev) => prev.filter((item) => item !== value))
    } else {
      setCategoryConfig((prev) => ({
        ...prev,
        [key]: prev[key].filter((item) => item !== value),
      }))
    }
    return { ok: true, message: '删除成功' }
  }
  const addBuildStatus = (value) => {
    const nextValue = value.trim()
    if (!nextValue) return
    setBuildStatusConfig((prev) => (prev.includes(nextValue) ? prev : [...prev, nextValue]))
  }
  const removeBuildStatus = (value) => {
    setBuildStatusConfig((prev) => prev.filter((item) => item !== value))
  }

  const exportData = () => {
    const data = {
      gunplaList,
      categoryConfig,
      buildStatusConfig,
      filterState,
      theme,
      manualRootPath,
      exportedAt: new Date().toISOString(),
      version: 1,
    }
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadJsonFile(`gunpla-manager-backup-${timestamp}.json`, data)
  }

  const importData = async (file) => {
    if (!file) {
      return { ok: false, message: '未选择文件' }
    }

    try {
      const data = await readJsonFile(file)
      if (!data || typeof data !== 'object') {
        return { ok: false, message: '导入失败：文件内容不是有效的 JSON 对象' }
      }
      if (!Array.isArray(data.gunplaList) || typeof data.categoryConfig !== 'object') {
        return {
          ok: false,
          message: '导入失败：文件格式错误，需要包含 gunplaList 数组和 categoryConfig 对象',
        }
      }

      const nextGunplaList = data.gunplaList.map(normalizeStoredItem)
      const nextCoverLibrary = Array.isArray(data.coverLibrary)
        ? data.coverLibrary.map(normalizeCoverItem).filter(Boolean)
        : []
      const nextCategoryConfig = parseCategoryConfig(data.categoryConfig)
      const nextBuildStatusConfig = parseBuildStatusConfig(data.buildStatusConfig)
      const nextFilterState = parseFilterState(data.filterState)
      const nextTheme = parseTheme(data.theme)
      const nextManualRootPath = typeof data.manualRootPath === 'string' ? data.manualRootPath : ''

      setGunplaList(sortGunplaListLatestFirst(nextGunplaList))
      setCoverLibrary(nextCoverLibrary)
      setCategoryConfig(nextCategoryConfig)
      setBuildStatusConfig(nextBuildStatusConfig)
      setFilterState(nextFilterState)
      setTheme(nextTheme)
      setManualRootPath(nextManualRootPath)

      setSelectedGunplaId(null)
      setIsDetailOpen(false)
      if (window.api?.writeData) {
        await window.api.writeData({
          gunplaList: sortGunplaListLatestFirst(nextGunplaList),
          coverLibrary: nextCoverLibrary,
          categoryConfig: nextCategoryConfig,
          buildStatusConfig: nextBuildStatusConfig,
          filterState: nextFilterState,
          theme: nextTheme,
          manualRootPath: nextManualRootPath,
        })
      }
      return { ok: true, message: '导入成功，已覆盖当前数据' }
    } catch {
      return { ok: false, message: '导入失败：JSON 解析失败或文件已损坏' }
    }
  }

  const importExcel = async (file) => {
    if (!file) return { ok: false, message: '未选择文件' }
    try {
      const parsed = await parseGunplaExcel(file)
      if (!parsed.ok) return { ok: false, message: parsed.message }

      const defaults = {
        type: 'owned',
        releasePrice: 0,
        reissuePrice: 0,
        purchasePlatform: '',
        buildStatus: '未开盒',
        series: categoryConfig.series?.[0] || 'SEED',
        scale: '1/144',
        purchaseDate: '',
        purchasePrice: 0,
        purchaseCount: 1,
        expectedPrice: 0,
        currentPrice: 0,
        status: '未拼装',
        tags: [],
        note: '',
        coverImage: '',
        buildImages: [],
        boxImages: [],
      }

      const codeToUrl = new Map()
      for (const c of coverLibrary) {
        const k = normalizeMatchKey(c.imageCode)
        if (k && c.imageUrl && !codeToUrl.has(k)) codeToUrl.set(k, c.imageUrl)
      }

      const now = Date.now()
      const items = parsed.rows.map((r, idx) => {
        const type = r.type === 'wishlist' ? 'wishlist' : 'owned'
        const modelKey = normalizeMatchKey(r.modelCode)
        const coverImage = modelKey ? codeToUrl.get(modelKey) || '' : ''
        return {
          ...defaults,
          id: now + idx,
          name: r.name,
          modelCode: r.modelCode || '',
          grade: (r.grade || '').toUpperCase() || categoryConfig.grade?.[0] || 'HG',
          scale: r.scale || defaults.scale,
          releaseType: r.releaseType || categoryConfig.releaseTypes?.[0] || '通贩',
          series: r.series || categoryConfig.series?.[0] || 'SEED',
          type,
          buildStatus: r.buildStatus || '未开盒',
          releasePrice: r.releasePrice || 0,
          reissuePrice: r.reissuePrice || 0,
          purchasePlatform:
            r.purchasePlatform || categoryConfig.purchasePlatforms?.[0] || '',
          purchaseDate: type === 'owned' ? r.purchaseDate || '' : '',
          purchasePrice: type === 'owned' ? r.purchasePrice || 0 : 0,
          expectedPrice: type === 'wishlist' ? r.expectedPrice || 0 : 0,
          currentPrice: r.currentPrice || 0,
          status: type === 'owned' ? r.status || '未拼装' : '',
          tags: Array.isArray(r.tags) ? r.tags : [],
          note: r.note || '',
          coverImage,
          buildImages: [],
          boxImages: [],
        }
      })

      setGunplaList((prev) => sortGunplaListLatestFirst([...items, ...prev]))

      setCategoryConfig((prev) => {
        const merge = (arr, vals) => [...new Set([...(arr || []), ...vals.filter(Boolean)])]
        return {
          ...prev,
          grade: merge(prev.grade, items.map((x) => x.grade)),
          series: merge(prev.series, items.map((x) => x.series)),
          releaseTypes: merge(prev.releaseTypes, items.map((x) => x.releaseType)),
          purchasePlatforms: merge(prev.purchasePlatforms, items.map((x) => x.purchasePlatform)),
        }
      })
      setBuildStatusConfig((prev) => {
        const set = new Set(prev)
        items.forEach((x) => x.buildStatus && set.add(x.buildStatus))
        return Array.from(set)
      })

      return { ok: true, message: `Excel 导入成功：新增 ${items.length} 条` }
    } catch {
      return { ok: false, message: 'Excel 导入失败：文件解析异常或格式不支持' }
    }
  }

  const openCoverLibrary = (mode = 'manage', pickHandler = null) => {
    setCoverLibraryMode(mode === 'select' ? 'select' : 'manage')
    setOnPickCover(() => (typeof pickHandler === 'function' ? pickHandler : null))
    setIsCoverLibraryOpen(true)
  }
  const closeCoverLibrary = () => {
    setIsCoverLibraryOpen(false)
    setOnPickCover(null)
    setCoverLibraryMode('manage')
  }

  const importCoverFolder = async () => {
    if (!window.api?.selectFolder || !window.api?.importCoverFolder) {
      return { ok: false, message: '当前环境不支持导入封面文件夹' }
    }
    const folderPath = await window.api.selectFolder()
    if (!folderPath) return { ok: false, message: '未选择文件夹' }

    const res = await window.api.importCoverFolder(folderPath)
    if (!res?.ok) return { ok: false, message: res?.message || '导入失败' }

    const incoming = Array.isArray(res.items) ? res.items.map(normalizeCoverItem).filter(Boolean) : []
    setCoverLibrary((prev) => {
      const existingOriginal = new Set(prev.map((x) => x.originalPath).filter(Boolean))
      const next = incoming.filter((x) => !x.originalPath || !existingOriginal.has(x.originalPath))
      return [...next, ...prev]
    })

    return { ok: true, message: res.message || `已导入 ${incoming.length} 张封面` }
  }

  const renameCover = (id, nextName) => {
    const name = (nextName || '').trim()
    if (!name) return { ok: false, message: '名称不能为空' }
    setCoverLibrary((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
    return { ok: true, message: '已重命名' }
  }

  const setThemeOpacity = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return
    setTheme((prev) => parseTheme({ ...prev, backgroundOpacity: Math.min(1, Math.max(0, n)) }))
  }

  const setThemeBackgroundFromFile = async (file) => {
    if (!file || !window.api?.saveImage) return
    const buffer = await file.arrayBuffer()
    const url = await window.api.saveImage(buffer, file.name)
    if (url) setTheme((prev) => parseTheme({ ...prev, backgroundImage: url }))
  }

  const clearThemeBackground = () => {
    setTheme((prev) => parseTheme({ ...prev, backgroundImage: '' }))
  }

  const setCoverImageCode = (id, nextCode) => {
    const imageCode = (nextCode || '').trim()
    if (!imageCode) return { ok: false, message: '图片编号不能为空' }
    setCoverLibrary((prev) => prev.map((c) => (c.id === id ? { ...c, imageCode } : c)))
    return { ok: true, message: '已更新图片编号' }
  }

  const deleteCover = async (id) => {
    const cover = coverLibrary.find((c) => c.id === id)
    if (!cover) return { ok: false, message: '未找到封面' }

    const imageUrl = cover.imageUrl
    setCoverLibrary((prev) => prev.filter((c) => c.id !== id))

    const isReferenced = gunplaList.some((g) => {
      if (g.coverImage === imageUrl) return true
      if (Array.isArray(g.buildImages) && g.buildImages.includes(imageUrl)) return true
      if (Array.isArray(g.boxImages) && g.boxImages.includes(imageUrl)) return true
      return false
    })
    if (!isReferenced && imageUrl && window.api?.deleteImage) {
      await window.api.deleteImage(imageUrl)
    }
    return { ok: true, message: '已删除' }
  }

  const isImageReferenced = (imageUrl) =>
    gunplaList.some((g) => {
      if (g.coverImage === imageUrl) return true
      if (Array.isArray(g.buildImages) && g.buildImages.includes(imageUrl)) return true
      if (Array.isArray(g.boxImages) && g.boxImages.includes(imageUrl)) return true
      return false
    })

  const deleteCoversBulk = async (ids) => {
    const idSet = new Set((ids || []).filter(Boolean))
    if (idSet.size === 0) {
      return { ok: false, removed: 0, skipped: 0, message: '未选择任何封面' }
    }

    const targets = coverLibrary.filter((c) => idSet.has(c.id))
    if (targets.length === 0) {
      return { ok: false, removed: 0, skipped: 0, message: '未找到要删除的封面' }
    }

    const toDelete = []
    const skipped = []
    for (const cover of targets) {
      if (isImageReferenced(cover.imageUrl)) skipped.push(cover)
      else toDelete.push(cover)
    }

    if (toDelete.length === 0) {
      return {
        ok: false,
        removed: 0,
        skipped: skipped.length,
        message: '选中的封面都仍被模型引用，已全部跳过',
      }
    }

    setCoverLibrary((prev) => prev.filter((c) => !idSet.has(c.id) || skipped.includes(c)))

    for (const cover of toDelete) {
      const imageUrl = cover.imageUrl
      if (imageUrl && !isImageReferenced(imageUrl) && window.api?.deleteImage) {
        // 忽略删除失败
        await window.api.deleteImage(imageUrl)
      }
    }

    return {
      ok: true,
      removed: toDelete.length,
      skipped: skipped.length,
      message:
        skipped.length > 0
          ? `已删除 ${toDelete.length} 张封面，跳过 ${skipped.length} 张仍被模型引用的封面`
          : `已删除 ${toDelete.length} 张封面`,
    }
  }

  const clearUnusedCovers = async () => {
    if (coverLibrary.length === 0) {
      return { ok: false, removed: 0, message: '当前没有任何封面' }
    }
    const unused = coverLibrary.filter((c) => !isImageReferenced(c.imageUrl))
    if (unused.length === 0) {
      return { ok: false, removed: 0, message: '没有未被引用的封面可以清理' }
    }

    const unusedIds = new Set(unused.map((c) => c.id))
    setCoverLibrary((prev) => prev.filter((c) => !unusedIds.has(c.id)))

    for (const cover of unused) {
      const imageUrl = cover.imageUrl
      if (imageUrl && !isImageReferenced(imageUrl) && window.api?.deleteImage) {
        await window.api.deleteImage(imageUrl)
      }
    }

    return {
      ok: true,
      removed: unused.length,
      message: `已清理 ${unused.length} 张未被任何模型引用的封面`,
    }
  }

  /**
   * 将云端共享封面加入本地封面库（仅新增本地条目，不写回云端）
   * @param {{ id?: string, name?: string, image_url?: string, imageUrl?: string }} remote
   */
  const addCoverFromShared = (remote) => {
    const imageUrl = (remote && (remote.image_url || remote.imageUrl)) || ''
    if (!String(imageUrl).trim()) return { ok: false, message: '无效的图片地址' }
    if (coverLibrary.some((c) => c.imageUrl === imageUrl)) {
      return { ok: false, message: '本地库中已有相同封面' }
    }
    const name = (remote && remote.name) || '共享封面'
    const rid = remote && remote.id != null ? String(remote.id) : ''
    const item = normalizeCoverItem({
      id: rid ? `cloud_${rid}` : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      imageUrl,
      folder1: '社区',
      imageCode: stemFromDisplayName(name),
      createdAt: new Date().toISOString(),
    })
    setCoverLibrary((prev) => [item, ...prev])
    return { ok: true, cover: item }
  }

  return (
    <GunplaContext.Provider
      value={{
        gunplaList,
        filteredGunplaList,
        coverLibrary,
        categoryConfig,
        buildStatusConfig,
        filterState,
        setFilterState,
        uiState,
        setUiState,
        theme,
        setThemeOpacity,
        setThemeBackgroundFromFile,
        clearThemeBackground,
        resetFilter,
        allTags,
        selectedGunpla,
        isDetailOpen,
        isModalOpen,
        isTypeManagementOpen,
        isStatsOpen,
        isManualOpen,
        isCoverLibraryOpen,
        coverLibraryMode,
        editingGunpla,
        addGunpla,
        updateGunpla,
        deleteGunpla,
        openAddModal,
        openTypeManagement: () => setIsTypeManagementOpen(true),
        closeTypeManagement: () => setIsTypeManagementOpen(false),
        openStats: () => setIsStatsOpen(true),
        closeStats: () => setIsStatsOpen(false),
        openManual: () => setIsManualOpen(true),
        closeManual: () => setIsManualOpen(false),
        manualRootPath,
        setManualRootPath,
        openCoverLibrary,
        closeCoverLibrary,
        importCoverFolder,
        renameCover,
        setCoverImageCode,
        deleteCover,
        deleteCoversBulk,
        clearUnusedCovers,
        addCoverFromShared,
        onPickCover,
        openEditModal,
        closeModal,
        openDetail,
        closeDetail,
        addCategoryItem,
        removeCategoryItem,
        safeRemoveConfigItem,
        getConfigUsageCount,
        addBuildStatus,
        removeBuildStatus,
        exportData,
        importData,
        importExcel,
      }}
    >
      {children}
    </GunplaContext.Provider>
  )
}

export function useGunpla() {
  const ctx = useContext(GunplaContext)
  if (!ctx) throw new Error('useGunpla must be used within GunplaProvider')
  return ctx
}
