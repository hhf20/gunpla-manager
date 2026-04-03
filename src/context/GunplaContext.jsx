import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  downloadJsonFile,
  readJsonFile,
  readLocalStorage,
  writeLocalStorage,
} from '../utils/localStorage'
import { normalizeMatchKey, parseGunplaExcel } from '../utils/excelImport'
import {
  DEFAULT_BUILD_STATUS_CONFIG,
  DEFAULT_CATEGORY_CONFIG,
  DEFAULT_CONFIG_TREE,
  DEFAULT_DATA,
  DEFAULT_THEME,
  FILTER_INITIAL_STATE,
  UI_INITIAL_STATE,
  mergeMissingConfigTreeValues,
  normalizeCoverItem,
  normalizeStoredItem,
  parseConfigTree,
  parseFilterState,
  parseTheme,
  parseUiState,
  sortGunplaListLatestFirst,
  stemFromDisplayName,
} from '../utils/gunplaAppData'
import { getPlatformCapabilities } from '../utils/platformCapabilities'
import {
  addNode,
  buildOptions,
  collectSubtreeLabels,
  findNode,
  findNodeByLabel,
  hasLabel,
  flattenLabels,
  moveNode,
  removeNode,
  renameNode,
  setNodeLogo,
} from '../utils/configTree'

const GunplaContext = createContext(null)
const WEB_STORAGE_KEY = 'gunpla_manager_portable_data_v1'

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
export function GunplaProvider({ children }) {
  const platformCapabilities = useMemo(() => getPlatformCapabilities(), [])
  const [gunplaList, setGunplaList] = useState([])
  const [coverLibrary, setCoverLibrary] = useState([])
  const [configTree, setConfigTree] = useState(DEFAULT_CONFIG_TREE)
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
  const [isMobileFilterDrawerOpen, setMobileFilterDrawerOpen] = useState(false)

  const categoryConfig = useMemo(
    () => ({
      grade: flattenLabels(configTree.grade),
      series: flattenLabels(configTree.series),
      customTags: flattenLabels(configTree.customTags),
      releaseTypes: flattenLabels(configTree.releaseTypes),
      purchasePlatforms: flattenLabels(configTree.purchasePlatforms),
    }),
    [configTree],
  )

  const buildStatusConfig = useMemo(
    () => flattenLabels(configTree.buildStatusConfig),
    [configTree.buildStatusConfig],
  )

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      try {
        const data = window.api?.readData
          ? await window.api.readData()
          : readLocalStorage(WEB_STORAGE_KEY, DEFAULT_DATA)
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
        setConfigTree(
          parseConfigTree(safeData.configTree, safeData.categoryConfig, safeData.buildStatusConfig),
        )
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
    if (!isHydrated) return
    const payload = {
      gunplaList,
      coverLibrary,
      categoryConfig,
      configTree,
      buildStatusConfig,
      filterState,
      uiState,
      theme,
      manualRootPath,
    }

    if (window.api?.writeData) window.api.writeData(payload)
    else writeLocalStorage(WEB_STORAGE_KEY, payload)
  }, [
    gunplaList,
    coverLibrary,
    categoryConfig,
    configTree,
    buildStatusConfig,
    filterState,
    uiState,
    theme,
    manualRootPath,
    isHydrated,
  ])

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

  const getFieldNameByConfigKey = (key) => {
    if (key === 'grade') return 'grade'
    if (key === 'series') return 'series'
    if (key === 'customTags') return 'tags'
    if (key === 'buildStatusConfig') return 'buildStatus'
    if (key === 'releaseTypes') return 'releaseType'
    if (key === 'purchasePlatforms') return 'purchasePlatform'
    return ''
  }

  const getConfigUsageCount = (key, value) => {
    const field = getFieldNameByConfigKey(key)
    if (!field || !value) return 0
    if (field === 'tags') {
      return gunplaList.filter((item) => Array.isArray(item.tags) && item.tags.includes(value)).length
    }
    return gunplaList.filter((item) => item[field] === value).length
  }

  const getConfigNodeUsageCount = (key, nodeId) => {
    const nodes = configTree[key] || []
    const found = findNode(nodes, nodeId)
    if (!found?.node) return 0
    const labels = collectSubtreeLabels(found.node)
    return labels.reduce((sum, label) => sum + getConfigUsageCount(key, label), 0)
  }

  const addConfigNode = (key, parentId, label) => {
    const nextLabel = String(label || '').trim()
    if (!nextLabel) return { ok: false, message: '名称不能为空' }
    if (hasLabel(configTree[key] || [], nextLabel)) {
      return {
        ok: false,
        message: '同一配置分组中不允许存在重名节点，否则筛选和关联会产生歧义。',
      }
    }
    setConfigTree((prev) => {
      const list = prev[key] || []
      return { ...prev, [key]: addNode(list, parentId, nextLabel) }
    })
    return { ok: true }
  }

  const setConfigNodeLogoFromFile = async (key, nodeId, file) => {
    if (!['grade', 'series'].includes(key)) {
      return { ok: false, message: '只有 Grade 和 Series 支持上传 Logo' }
    }
    if (!file || !window.api?.saveImage) return { ok: false, message: '当前环境不支持上传图片' }
    try {
      const buffer = await file.arrayBuffer()
      const logoUrl = await window.api.saveImage(buffer, file.name)
      if (!logoUrl) return { ok: false, message: '保存图片失败' }
      setConfigTree((prev) => ({
        ...prev,
        [key]: setNodeLogo(prev[key] || [], nodeId, logoUrl),
      }))
      return { ok: true, logoUrl }
    } catch {
      return { ok: false, message: '上传 Logo 失败' }
    }
  }

  const renameConfigNode = (key, nodeId, nextLabel) => {
    const label = String(nextLabel || '').trim()
    if (!label) return { ok: false, message: '名称不能为空' }
    const before = findNode(configTree[key] || [], nodeId)?.node
    if (!before) return { ok: false, message: '未找到目标节点' }
    if (hasLabel(configTree[key] || [], label, nodeId)) {
      return {
        ok: false,
        message: '同一配置分组中不允许存在重名节点，否则筛选和关联会产生歧义。',
      }
    }
    const oldLabel = before.label

    setConfigTree((prev) => ({ ...prev, [key]: renameNode(prev[key] || [], nodeId, label) }))

    if (oldLabel !== label) {
      setGunplaList((prev) =>
        prev.map((item) => {
          if (key === 'grade' && item.grade === oldLabel) return { ...item, grade: label }
          if (key === 'series' && item.series === oldLabel) return { ...item, series: label }
          if (key === 'customTags' && Array.isArray(item.tags) && item.tags.includes(oldLabel)) {
            return { ...item, tags: item.tags.map((tag) => (tag === oldLabel ? label : tag)) }
          }
          if (key === 'buildStatusConfig' && item.buildStatus === oldLabel) {
            return { ...item, buildStatus: label }
          }
          if (key === 'releaseTypes' && item.releaseType === oldLabel) {
            return { ...item, releaseType: label }
          }
          if (key === 'purchasePlatforms' && item.purchasePlatform === oldLabel) {
            return { ...item, purchasePlatform: label }
          }
          return item
        }),
      )
    }
    return { ok: true, message: '重命名成功' }
  }

  const safeRemoveConfigNode = (key, nodeId, replacement = '') => {
    const nodes = configTree[key] || []
    const found = findNode(nodes, nodeId)
    if (!found?.node) return { ok: false, message: '未找到要删除的节点' }
    const labels = collectSubtreeLabels(found.node)
    const usageCount = labels.reduce((sum, label) => sum + getConfigUsageCount(key, label), 0)
    const nextReplacement = String(replacement || '').trim()

    if (usageCount > 0 && !nextReplacement) {
      return { ok: false, message: `该节点（含子节点）仍被 ${usageCount} 个模型使用，请先替换后再删除` }
    }

    if (usageCount > 0 && nextReplacement) {
      const set = new Set(labels)
      setGunplaList((prev) =>
        prev.map((item) => {
          if (key === 'grade' && set.has(item.grade)) return { ...item, grade: nextReplacement }
          if (key === 'series' && set.has(item.series)) return { ...item, series: nextReplacement }
          if (key === 'customTags' && Array.isArray(item.tags)) {
            return {
              ...item,
              tags: item.tags.map((tag) => (set.has(tag) ? nextReplacement : tag)),
            }
          }
          if (key === 'buildStatusConfig' && set.has(item.buildStatus)) {
            return { ...item, buildStatus: nextReplacement }
          }
          if (key === 'releaseTypes' && set.has(item.releaseType)) {
            return { ...item, releaseType: nextReplacement }
          }
          if (key === 'purchasePlatforms' && set.has(item.purchasePlatform)) {
            return { ...item, purchasePlatform: nextReplacement }
          }
          return item
        }),
      )
    }

    setConfigTree((prev) => {
      const res = removeNode(prev[key] || [], nodeId)
      return { ...prev, [key]: res.tree }
    })
    return { ok: true, message: '删除成功' }
  }

  const addCategoryItem = (key, value) => addConfigNode(key, null, value)
  const removeCategoryItem = (key, value) => {
    const node = findNodeByLabel(configTree[key] || [], value)
    if (node) safeRemoveConfigNode(key, node.id)
  }
  const safeRemoveConfigItem = (key, value, replacement = '') => {
    const node = findNodeByLabel(configTree[key] || [], value)
    if (!node) return { ok: false, message: '未找到要删除的配置项' }
    return safeRemoveConfigNode(key, node.id, replacement)
  }
  const addBuildStatus = (value) => addConfigNode('buildStatusConfig', null, value)
  const removeBuildStatus = (value) => removeCategoryItem('buildStatusConfig', value)
  const moveConfigNode = (key, nodeId, direction) => {
    if (!['up', 'down'].includes(direction)) return { ok: false, message: '仅支持上下移动' }
    setConfigTree((prev) => ({
      ...prev,
      [key]: moveNode(prev[key] || [], nodeId, direction),
    }))
    return { ok: true }
  }
  const getConfigTree = (key) => configTree[key] || []
  const getConfigSelectOptions = (key) => buildOptions(configTree[key] || [])

  const exportData = () => {
    const data = {
      gunplaList,
      categoryConfig,
      configTree,
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

  const exportPortableData = async () => {
    const cleanPortableUrl = (url) => {
      const value = String(url || '').trim()
      if (!value) return ''
      if (/^(https?:|data:|blob:)/i.test(value)) return value
      return ''
    }

    const toPortableImageUrl = async (url) => {
      const cleaned = cleanPortableUrl(url)
      if (cleaned) return cleaned

      const value = String(url || '').trim()
      if (!value || !value.startsWith('file://') || !window.api?.readImageBuffer) return ''

      try {
        const result = await window.api.readImageBuffer(value)
        if (!result?.ok || !result?.base64) return ''
        const ext = String(result.ext || '.png').replace(/^\./, '').toLowerCase()
        const mime = ext === 'jpg' ? 'jpeg' : ext
        return `data:image/${mime};base64,${result.base64}`
      } catch {
        return ''
      }
    }

    const data = {
      gunplaList: await Promise.all(
        gunplaList.map(async (item) => ({
          ...item,
          coverImage: await toPortableImageUrl(item.coverImage),
          buildImages: [],
          boxImages: [],
        })),
      ),
      coverLibrary: await Promise.all(
        coverLibrary.map(async (item) => ({
          ...item,
          imageUrl: await toPortableImageUrl(item.imageUrl),
        })),
      ),
      configTree,
      categoryConfig,
      buildStatusConfig,
      theme: {
        backgroundImage: '',
        backgroundOpacity: theme.backgroundOpacity,
      },
      exportedAt: new Date().toISOString(),
      version: 1,
      portable: true,
    }
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadJsonFile(`gunpla-manager-mobile-${timestamp}.json`, data)
    return { ok: true, message: '已导出移动端数据包' }
  }

  const importData = async (file) => {
    if (!file) {
      return { ok: false, message: '未找到封面' }
    }

    try {
      const data = await readJsonFile(file)
      if (!data || typeof data !== 'object') {
        return { ok: false, message: '\u5bfc\u5165\u5931\u8d25\uff1a\u6587\u4ef6\u5185\u5bb9\u4e0d\u662f\u6709\u6548\u7684 JSON \u5bf9\u8c61' }
      }
      if (!Array.isArray(data.gunplaList)) {
        return {
          ok: false,
          message: '\u5bfc\u5165\u5931\u8d25\uff1a\u6587\u4ef6\u683c\u5f0f\u9519\u8bef\uff0c\u7f3a\u5c11 gunplaList \u6570\u7ec4',
        }
      }

      const nextGunplaList = data.gunplaList.map(normalizeStoredItem)
      const nextCoverLibrary = Array.isArray(data.coverLibrary)
        ? data.coverLibrary.map(normalizeCoverItem).filter(Boolean)
        : []
      const nextConfigTree = parseConfigTree(data.configTree, data.categoryConfig, data.buildStatusConfig)
      const nextCategoryConfig = {
        grade: flattenLabels(nextConfigTree.grade),
        series: flattenLabels(nextConfigTree.series),
        customTags: flattenLabels(nextConfigTree.customTags),
        releaseTypes: flattenLabels(nextConfigTree.releaseTypes),
        purchasePlatforms: flattenLabels(nextConfigTree.purchasePlatforms),
      }
      const nextBuildStatusConfig = flattenLabels(nextConfigTree.buildStatusConfig)
      const nextFilterState = parseFilterState(data.filterState)
      const nextTheme = parseTheme(data.theme)
      const nextManualRootPath = typeof data.manualRootPath === 'string' ? data.manualRootPath : ''

      setGunplaList(sortGunplaListLatestFirst(nextGunplaList))
      setCoverLibrary(nextCoverLibrary)
      setConfigTree(nextConfigTree)
      setFilterState(nextFilterState)
      setTheme(nextTheme)
      setManualRootPath(nextManualRootPath)

      setSelectedGunplaId(null)
      setIsDetailOpen(false)
      const persistedPayload = {
        gunplaList: sortGunplaListLatestFirst(nextGunplaList),
        coverLibrary: nextCoverLibrary,
        categoryConfig: nextCategoryConfig,
        configTree: nextConfigTree,
        buildStatusConfig: nextBuildStatusConfig,
        filterState: nextFilterState,
        uiState,
        theme: nextTheme,
        manualRootPath: nextManualRootPath,
      }
      if (window.api?.writeData) await window.api.writeData(persistedPayload)
      else writeLocalStorage(WEB_STORAGE_KEY, persistedPayload)
      return { ok: true, message: '\u5bfc\u5165\u6210\u529f\uff0c\u5df2\u8986\u76d6\u5f53\u524d\u6570\u636e' }
    } catch {
      return { ok: false, message: '\u5bfc\u5165\u5931\u8d25\uff1aJSON \u89e3\u6790\u5931\u8d25\u6216\u6587\u4ef6\u5df2\u635f\u574f' }
    }
  }

  const importExcel = async (file) => {
    if (!file) return { ok: false, message: '未找到封面' }
    try {
      const parsed = await parseGunplaExcel(file)
      if (!parsed.ok) return { ok: false, message: parsed.message }

      const defaults = {
        type: 'owned',
        releasePrice: 0,
        reissuePrice: 0,
        purchasePlatform: '',
        buildStatus: '\u672a\u5f00\u76d2',
        series: categoryConfig.series?.[0] || 'SEED',
        scale: '1/144',
        purchaseDate: '',
        purchasePrice: 0,
        purchaseCount: 1,
        expectedPrice: 0,
        currentPrice: 0,
        status: '\u672a\u62fc\u88c5',
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
          releaseType: r.releaseType || categoryConfig.releaseTypes?.[0] || '社区',
          series: r.series || categoryConfig.series?.[0] || 'SEED',
          type,
          buildStatus: r.buildStatus || '\u672a\u5f00\u76d2',
          releasePrice: r.releasePrice || 0,
          reissuePrice: r.reissuePrice || 0,
          purchasePlatform: r.purchasePlatform || categoryConfig.purchasePlatforms?.[0] || '',
          purchaseDate: type === 'owned' ? r.purchaseDate || '' : '',
          purchasePrice: type === 'owned' ? r.purchasePrice || 0 : 0,
          expectedPrice: type === 'wishlist' ? r.expectedPrice || 0 : 0,
          currentPrice: r.currentPrice || 0,
          status: type === 'owned' ? r.status || '\u672a\u62fc\u88c5' : '',
          tags: Array.isArray(r.tags) ? r.tags : [],
          note: r.note || '',
          coverImage,
          buildImages: [],
          boxImages: [],
        }
      })

      setGunplaList((prev) => sortGunplaListLatestFirst([...items, ...prev]))
      setConfigTree((prev) => mergeMissingConfigTreeValues(prev, items))

      return { ok: true, message: `Excel \u5bfc\u5165\u6210\u529f\uff1a\u65b0\u589e ${items.length} \u6761` }
    } catch {
      return { ok: false, message: 'Excel \u5bfc\u5165\u5931\u8d25\uff1a\u6587\u4ef6\u89e3\u6790\u5f02\u5e38\u6216\u683c\u5f0f\u4e0d\u53d7\u652f\u6301' }
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
      return { ok: false, message: '\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u5bfc\u5165\u5c01\u9762\u6587\u4ef6\u5939' }
    }
    const folderPath = await window.api.selectFolder()
    if (!folderPath) return { ok: false, message: '未选择文件夹' }

    const res = await window.api.importCoverFolder(folderPath)
    if (!res?.ok) return { ok: false, message: res?.message || '社区封面' }

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
    if (!name) return { ok: false, message: '封面名称不能为空' }
    setCoverLibrary((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
    return { ok: true, message: '封面名称已更新' }
  }

  const importPortableData = async (file) => importData(file)

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
    return { ok: true, message: '图片编号已更新' }
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
    return { ok: true, message: '封面已删除' }
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
      return { ok: false, removed: 0, skipped: 0, message: '无效的图片地址' }
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
        message: '选中的封面仍被模型引用，已全部跳过',
      }
    }

    const skippedIds = new Set(skipped.map((cover) => cover.id))
    setCoverLibrary((prev) => prev.filter((c) => !idSet.has(c.id) || skippedIds.has(c.id)))

    for (const cover of toDelete) {
      const imageUrl = cover.imageUrl
      if (imageUrl && !isImageReferenced(imageUrl) && window.api?.deleteImage) {
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
      return { ok: false, removed: 0, message: '没有可清理的未引用封面' }
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
   * 将社区封面加入本地封面库，仅新增本地条目，不回写远端。
   * @param {{ id?: string, name?: string, image_url?: string, imageUrl?: string }} remote
   */
  const addCoverFromShared = (remote) => {
    const imageUrl = (remote && (remote.image_url || remote.imageUrl)) || ''
    if (!String(imageUrl).trim()) return { ok: false, message: '无效的图片地址' }
    if (coverLibrary.some((c) => c.imageUrl === imageUrl)) {
      return { ok: false, message: '本地封面库中已存在相同封面' }
    }
    const name = (remote && remote.name) || '社区封面'
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
        configTree,
        categoryConfig,
        buildStatusConfig,
        filterState,
        setFilterState,
        uiState,
        setUiState,
        platformCapabilities,
        setShowGradeLogo: (show) =>
          setUiState((prev) => ({
            ...prev,
            showGradeLogo: Boolean(show),
          })),
        setShowSeriesLogo: (show) =>
          setUiState((prev) => ({
            ...prev,
            showSeriesLogo: Boolean(show),
          })),
        setSidebarWidth: (width) =>
          setUiState((prev) => ({
            ...prev,
            sidebarWidth: Math.min(420, Math.max(248, Number(width) || 288)),
          })),
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
        getConfigTree,
        getConfigSelectOptions,
        addConfigNode,
        renameConfigNode,
        moveConfigNode,
        safeRemoveConfigNode,
        getConfigNodeUsageCount,
        setConfigNodeLogoFromFile,
        addBuildStatus,
        removeBuildStatus,
        exportData,
        exportPortableData,
        importData,
        importPortableData,
        importExcel,
        isMobileFilterDrawerOpen,
        setMobileFilterDrawerOpen,
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
