import { useEffect, useMemo, useState } from 'react'
import { AUTHOR_WECHAT } from '../data/author'
import { useGunpla } from '../context/GunplaContext'

const groups = [
  { key: 'grade', label: '等级' },
  { key: 'series', label: '系列' },
  { key: 'customTags', label: '标签' },
  { key: 'buildStatusConfig', label: '拼装阶段' },
  { key: 'releaseTypes', label: '发售形式' },
  { key: 'purchasePlatforms', label: '购买平台' },
]

function countNodes(nodes) {
  let total = 0
  const walk = (list) => {
    for (const node of list || []) {
      total += 1
      walk(node.children)
    }
  }
  walk(nodes)
  return total
}

function countNodesInUse(nodes, key, getUsage) {
  let total = 0
  const walk = (list) => {
    for (const node of list || []) {
      if (getUsage(key, node.id) > 0) total += 1
      walk(node.children)
    }
  }
  walk(nodes)
  return total
}

function countMaxDepth(nodes, depth = 1) {
  if (!Array.isArray(nodes) || nodes.length === 0) return 0
  return Math.max(
    ...nodes.map((node) =>
      node.children?.length ? countMaxDepth(node.children, depth + 1) : depth,
    ),
  )
}

function filterNodes(nodes, keyword) {
  const normalized = String(keyword || '').trim().toLowerCase()
  if (!normalized) return nodes || []

  const walk = (list) =>
    (list || [])
      .map((node) => {
        const children = walk(node.children || [])
        const selfMatched = String(node.label || '').toLowerCase().includes(normalized)
        if (!selfMatched && children.length === 0) return null
        return { ...node, children }
      })
      .filter(Boolean)

  return walk(nodes)
}

function GroupStat({ label, value }) {
  return (
    <div className="theme-surface-soft rounded-[20px] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">{label}</div>
      <div className="mt-2 text-lg font-semibold theme-text-primary">{value}</div>
    </div>
  )
}

function TypeManagementModal() {
  const {
    isTypeManagementOpen,
    closeTypeManagement,
    getConfigTree,
    addConfigNode,
    renameConfigNode,
    reorderConfigNode,
    safeRemoveConfigNode,
    getConfigNodeUsageCount,
    getConfigSelectOptions,
    setConfigNodeLogoFromFile,
    uiState,
    setShowGradeLogo,
    setShowSeriesLogo,
  } = useGunpla()

  const [selectedGroupKey, setSelectedGroupKey] = useState(groups[0].key)
  const [searchText, setSearchText] = useState('')
  const [inputMap, setInputMap] = useState({})
  const [renameMap, setRenameMap] = useState({})
  const [expandedMap, setExpandedMap] = useState({})
  const [activeEditor, setActiveEditor] = useState(null)
  const [wipeBusy, setWipeBusy] = useState(false)
  const [dragState, setDragState] = useState(null)
  const [dropState, setDropState] = useState(null)

  useEffect(() => {
    if (!isTypeManagementOpen) return
    setSearchText('')
    setActiveEditor(null)
    setDragState(null)
    setDropState(null)
  }, [isTypeManagementOpen])

  useEffect(() => {
    setActiveEditor(null)
    setDragState(null)
    setDropState(null)
  }, [selectedGroupKey])

  const optionsMap = useMemo(() => {
    const map = {}
    for (const group of groups) map[group.key] = getConfigSelectOptions(group.key)
    return map
  }, [getConfigSelectOptions])

  const groupStatsMap = useMemo(() => {
    const map = {}
    for (const group of groups) {
      const nodes = getConfigTree(group.key)
      map[group.key] = {
        total: countNodes(nodes),
        root: Array.isArray(nodes) ? nodes.length : 0,
        inUse: countNodesInUse(nodes, group.key, getConfigNodeUsageCount),
        depth: countMaxDepth(nodes),
      }
    }
    return map
  }, [getConfigNodeUsageCount, getConfigTree])

  const selectedGroup = groups.find((group) => group.key === selectedGroupKey) || groups[0]
  const selectedNodes = getConfigTree(selectedGroupKey)
  const selectedStats = groupStatsMap[selectedGroupKey] || {
    total: 0,
    root: 0,
    inUse: 0,
    depth: 0,
  }
  const filteredNodes = useMemo(
    () => filterNodes(selectedNodes, searchText),
    [searchText, selectedNodes],
  )

  const getNodeEditorKey = (key, nodeId) => `${key}__${nodeId}`

  const handleAddRoot = (key) => {
    const value = (inputMap[`${key}__root`] || '').trim()
    if (!value) return

    const result = addConfigNode(key, null, value)
    if (!result?.ok) {
      window.alert(result?.message || '新增失败。')
      return
    }

    setInputMap((prev) => ({ ...prev, [`${key}__root`]: '' }))
  }

  const handleAddChild = (key, nodeId) => {
    const stateKey = `${key}__${nodeId}__child`
    const value = (inputMap[stateKey] || '').trim()
    if (!value) return

    const result = addConfigNode(key, nodeId, value)
    if (!result?.ok) {
      window.alert(result?.message || '新增失败。')
      return
    }

    setInputMap((prev) => ({ ...prev, [stateKey]: '' }))
    setExpandedMap((prev) => ({ ...prev, [getNodeEditorKey(key, nodeId)]: true }))
    setActiveEditor(null)
  }

  const handleRename = (key, nodeId, currentLabel) => {
    const renameKey = `${key}__${nodeId}__rename`
    const nextLabel = (renameMap[renameKey] || '').trim()
    if (!nextLabel || nextLabel === currentLabel) return

    const result = renameConfigNode(key, nodeId, nextLabel)
    if (!result?.ok) {
      window.alert(result?.message || '重命名失败。')
      return
    }

    setRenameMap((prev) => ({ ...prev, [renameKey]: '' }))
    setActiveEditor(null)
  }

  const handleDelete = (key, nodeId, label) => {
    const usage = getConfigNodeUsageCount(key, nodeId)
    let replacement = ''

    if (usage > 0) {
      const candidateText = (optionsMap[key] || [])
        .map((item) => item.path)
        .slice(0, 8)
        .join('\n')

      replacement =
        window.prompt(
          `“${label}”及其子级当前仍被 ${usage} 个模型引用。\n请输入替换值后再删除。\n可用值示例：\n${candidateText}`,
        ) || ''

      if (!replacement) return
    }

    const result = safeRemoveConfigNode(key, nodeId, replacement)
    if (!result?.ok) {
      window.alert(result?.message || '删除失败。')
      return
    }

    setActiveEditor(null)
  }

  const copyWechat = async () => {
    try {
      await navigator.clipboard.writeText(AUTHOR_WECHAT)
      window.alert('微信号已复制。')
    } catch {
      window.prompt('请手动复制微信号：', AUTHOR_WECHAT)
    }
  }

  const canUploadLogo = (key) => key === 'grade' || key === 'series'

  const handleLogoUpload = async (key, nodeId, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const result = await setConfigNodeLogoFromFile(key, nodeId, file)
    if (!result?.ok) {
      window.alert(result?.message || '上传 Logo 失败。')
      event.target.value = ''
      return
    }

    event.target.value = ''
    setActiveEditor(null)
  }

  const handleWipeAllData = async () => {
    if (wipeBusy) return

    const confirmed = window.confirm('确定要清空所有数据吗？此操作无法恢复。')
    if (!confirmed) return

    const phrase = window.prompt('为防止误触，请输入“清空”后继续：', '')
    if (phrase !== '清空') return

    if (!window.api?.wipeAllData) {
      window.alert('当前环境不支持清空数据，请在桌面版中使用。')
      return
    }

    setWipeBusy(true)
    try {
      const result = await window.api.wipeAllData()
      if (!result?.ok) {
        window.alert(result?.message || '清空失败，可能有文件仍在被占用。')
        return
      }

      closeTypeManagement()
    } finally {
      setWipeBusy(false)
    }
  }

  const toggleNodeAction = (key, nodeId, action, currentLabel = '') => {
    const nodeKey = getNodeEditorKey(key, nodeId)

    if (action === 'rename') {
      const renameKey = `${key}__${nodeId}__rename`
      setRenameMap((prev) => ({
        ...prev,
        [renameKey]:
          typeof prev[renameKey] === 'string' && prev[renameKey].length > 0
            ? prev[renameKey]
            : currentLabel,
      }))
    }

    setActiveEditor((prev) =>
      prev?.nodeKey === nodeKey && prev.action === action ? null : { nodeKey, action },
    )
  }

  const clearDragState = () => {
    setDragState(null)
    setDropState(null)
  }

  const canDropOnNode = (key, nodeId, parentId) =>
    dragState &&
    dragState.key === key &&
    dragState.nodeId !== nodeId &&
    dragState.parentId === parentId

  const updateDropStateFromEvent = (event, key, targetId, parentId) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const placement = event.clientY <= rect.top + rect.height / 2 ? 'before' : 'after'

    setDropState((prev) => {
      if (
        prev?.key === key &&
        prev?.targetId === targetId &&
        prev?.parentId === parentId &&
        prev?.placement === placement
      ) {
        return prev
      }

      return { key, targetId, parentId, placement }
    })

    return placement
  }

  const renderTree = (key, nodes, depth = 0, parentId = null, lineage = []) =>
    (nodes || []).map((node) => {
      const usage = getConfigNodeUsageCount(key, node.id)
      const hasChildren = (node.children || []).length > 0
      const childCount = countNodes(node.children || [])
      const expandedKey = getNodeEditorKey(key, node.id)
      const isExpanded = expandedMap[expandedKey] ?? true
      const childInputKey = `${key}__${node.id}__child`
      const renameKey = `${key}__${node.id}__rename`
      const activeAction =
        activeEditor?.nodeKey === expandedKey ? activeEditor.action || '' : ''
      const currentPath = [...lineage, node.label].join(' / ')
      const dropPlacement =
        dropState?.key === key && dropState?.targetId === node.id ? dropState.placement : ''
      const isDragging = dragState?.key === key && dragState?.nodeId === node.id

      return (
        <div key={node.id} className="space-y-3">
          <div
            className={`relative transition ${isDragging ? 'opacity-45' : 'opacity-100'}`}
            onDragOver={(event) => {
              if (!canDropOnNode(key, node.id, parentId)) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              updateDropStateFromEvent(event, key, node.id, parentId)
            }}
            onDrop={(event) => {
              if (!canDropOnNode(key, node.id, parentId)) return
              event.preventDefault()
              const placement = updateDropStateFromEvent(event, key, node.id, parentId)
              reorderConfigNode(key, dragState.nodeId, node.id, placement)
              clearDragState()
            }}
          >
            {dropPlacement === 'before' ? (
              <div className="pointer-events-none absolute inset-x-4 top-0 z-10 h-[3px] rounded-full bg-cyan-300" />
            ) : null}

            {dropPlacement === 'after' ? (
              <div className="pointer-events-none absolute inset-x-4 bottom-0 z-10 h-[3px] rounded-full bg-cyan-300" />
            ) : null}

            <div className="theme-surface rounded-[8px] p-4">
              <div className="flex flex-col gap-3 min-[1180px]:flex-row min-[1180px]:items-start min-[1180px]:justify-between">
                <div className="flex min-w-0 gap-3">
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      setDragState({ key, nodeId: node.id, parentId })
                      setDropState(null)
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', `${key}:${node.id}`)
                    }}
                    onDragEnd={clearDragState}
                    className="theme-surface-elevated flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-full text-base font-medium theme-text-secondary active:cursor-grabbing"
                    title="拖动排序"
                  >
                    ⋮⋮
                  </button>

                  {hasChildren ? (
                    <button
                      type="button"
                      className="theme-surface-elevated flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium theme-text-secondary"
                      onClick={() =>
                        setExpandedMap((prev) => ({ ...prev, [expandedKey]: !isExpanded }))
                      }
                      title={isExpanded ? '收起子级' : '展开子级'}
                    >
                      {isExpanded ? '−' : '+'}
                    </button>
                  ) : (
                    <span className="theme-surface-elevated flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs theme-text-muted">
                      {depth + 1}
                    </span>
                  )}

                  {canUploadLogo(key) ? (
                    <span className="theme-surface-elevated inline-flex h-10 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border theme-border">
                      {node.logoUrl ? (
                        <img src={node.logoUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">
                          {key === 'series' ? 'SERIES' : 'LOGO'}
                        </span>
                      )}
                    </span>
                  ) : null}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="theme-accent-badge px-3 py-1 text-[11px] font-medium">
                        {node.label}
                      </span>
                      <span className="theme-surface-elevated rounded-full px-3 py-1 text-xs theme-text-secondary">
                        引用 {usage}
                      </span>
                      <span className="theme-surface-elevated rounded-full px-3 py-1 text-xs theme-text-secondary">
                        层级 {depth + 1}
                      </span>
                      {hasChildren ? (
                        <span className="theme-surface-elevated rounded-full px-3 py-1 text-xs theme-text-secondary">
                          子项 {childCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 break-all text-xs leading-5 theme-text-muted">
                      {currentPath}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleNodeAction(key, node.id, 'rename', node.label)}
                    className="app-btn-secondary shrink-0 whitespace-nowrap !rounded-full !px-3 !py-1.5 !text-xs"
                  >
                    重命名
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleNodeAction(key, node.id, 'child')}
                    className="app-btn-secondary shrink-0 whitespace-nowrap !rounded-full !px-3 !py-1.5 !text-xs"
                  >
                    加子级
                  </button>
                  {canUploadLogo(key) ? (
                    <button
                      type="button"
                      onClick={() => toggleNodeAction(key, node.id, 'logo')}
                      className="app-btn-secondary shrink-0 whitespace-nowrap !rounded-full !px-3 !py-1.5 !text-xs"
                    >
                      Logo
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(key, node.id, node.label)}
                    className="app-btn-secondary shrink-0 whitespace-nowrap !rounded-full !px-3 !py-1.5 !text-xs"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--danger) 26%, transparent)',
                      color: 'var(--danger)',
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>

              {activeAction === 'rename' ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={renameMap[renameKey] || ''}
                    onChange={(event) =>
                      setRenameMap((prev) => ({ ...prev, [renameKey]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleRename(key, node.id, node.label)
                    }}
                    placeholder="新名称"
                    autoFocus
                    className="app-input !py-2.5"
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(key, node.id, node.label)}
                    className="app-btn-primary shrink-0 whitespace-nowrap !px-4 !py-2.5 !text-xs"
                  >
                    保存
                  </button>
                </div>
              ) : null}

              {activeAction === 'child' ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={inputMap[childInputKey] || ''}
                    onChange={(event) =>
                      setInputMap((prev) => ({ ...prev, [childInputKey]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleAddChild(key, node.id)
                    }}
                    placeholder="子级名称"
                    autoFocus
                    className="app-input !py-2.5"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddChild(key, node.id)}
                    className="app-btn-primary shrink-0 whitespace-nowrap !px-4 !py-2.5 !text-xs"
                  >
                    新增
                  </button>
                </div>
              ) : null}

              {activeAction === 'logo' && canUploadLogo(key) ? (
                <div className="mt-4">
                  <input
                    type="file"
                    accept="image/*"
                    className="app-file-input"
                    onChange={(event) => handleLogoUpload(key, node.id, event)}
                    autoFocus
                  />
                </div>
              ) : null}
            </div>
          </div>

          {hasChildren && isExpanded ? (
            <div className="ml-4 border-l pl-4 theme-border">
              {renderTree(key, node.children, depth + 1, node.id, [...lineage, node.label])}
            </div>
          ) : null}
        </div>
      )
    })

  return (
    <div
      className={`dex-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 transition duration-300 md:p-5 ${
        isTypeManagementOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={closeTypeManagement}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`dex-modal-panel flex h-[calc(100vh-24px)] max-h-[920px] w-full max-w-[1280px] flex-col overflow-hidden rounded-[8px] p-4 transition duration-300 md:p-6 ${
          isTypeManagementOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b theme-border pb-5">
          <h3 className="text-2xl font-semibold theme-text-primary">类型配置</h3>

          <button
            type="button"
            onClick={closeTypeManagement}
            className="app-btn-secondary shrink-0 whitespace-nowrap !rounded-[14px] !px-4 !py-2"
          >
            关闭
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="app-scroll-area min-h-0 space-y-4 overflow-y-auto pr-1">
            <section className="theme-surface rounded-[8px] p-4">
              <div className="space-y-2">
                {groups.map((group) => {
                  const stats = groupStatsMap[group.key] || { total: 0, inUse: 0 }
                  const active = group.key === selectedGroupKey
                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => {
                        setSelectedGroupKey(group.key)
                        setSearchText('')
                      }}
                      className={`w-full rounded-[22px] border px-4 py-3 text-left transition ${
                        active
                          ? 'border-[color:var(--accent-strong)] bg-white/[0.06]'
                          : 'theme-border bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold theme-text-primary">{group.label}</div>
                        <span className="theme-accent-badge px-2.5 py-1 text-[10px]">
                          {stats.total} 项
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] theme-text-muted">在用 {stats.inUse}</div>
                    </button>
                  )
                })}
              </div>
            </section>

            {selectedGroupKey === 'grade' || selectedGroupKey === 'series' ? (
              <section className="theme-surface rounded-[8px] p-4">
                <div className="space-y-3">
                  {selectedGroupKey === 'grade' ? (
                    <label className="flex items-start gap-3 rounded-[18px] theme-surface-soft px-4 py-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-cyan-400"
                        checked={uiState.showGradeLogo !== false}
                        onChange={(event) => setShowGradeLogo(event.target.checked)}
                      />
                      <span className="text-sm font-medium theme-text-primary">
                        显示 Grade Logo
                      </span>
                    </label>
                  ) : null}

                  {selectedGroupKey === 'series' ? (
                    <label className="flex items-start gap-3 rounded-[18px] theme-surface-soft px-4 py-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-cyan-400"
                        checked={uiState.showSeriesLogo !== false}
                        onChange={(event) => setShowSeriesLogo(event.target.checked)}
                      />
                      <span className="text-sm font-medium theme-text-primary">
                        显示 Series Logo
                      </span>
                    </label>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="theme-surface rounded-[8px] p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm theme-text-primary">
                <span>微信号</span>
                <span className="theme-accent-badge px-3 py-1 font-mono">{AUTHOR_WECHAT}</span>
                <button
                  type="button"
                  onClick={copyWechat}
                  className="app-btn-secondary shrink-0 whitespace-nowrap !rounded-full !px-3 !py-1.5 !text-xs"
                >
                  复制
                </button>
              </div>
            </section>

            <section className="theme-surface rounded-[8px] p-4">
              <button
                type="button"
                disabled={wipeBusy}
                onClick={handleWipeAllData}
                className="w-full rounded-2xl border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--danger) 10%, var(--surface-soft))',
                  color: 'var(--danger)',
                }}
              >
                {wipeBusy ? '清空中...' : '清空全部数据'}
              </button>
            </section>
          </aside>

          <section
            className="theme-surface flex min-h-0 flex-col rounded-[8px] p-4 md:p-5"
          >
            <div className="flex flex-col gap-4 border-b theme-border pb-5">
              <div className="flex flex-col gap-3 min-[1100px]:flex-row min-[1100px]:items-end min-[1100px]:justify-between">
                <h4 className="text-xl font-semibold theme-text-primary">{selectedGroup.label}</h4>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchText('')}
                    className="app-btn-secondary shrink-0 whitespace-nowrap !rounded-full !px-3 !py-1.5 !text-xs"
                  >
                    清空搜索
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 min-[1200px]:grid-cols-4">
                <GroupStat label="总数" value={selectedStats.total} />
                <GroupStat label="顶级" value={selectedStats.root} />
                <GroupStat label="在用" value={selectedStats.inUse} />
                <GroupStat label="层级" value={selectedStats.depth || 1} />
              </div>

              <div className="grid gap-3 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="theme-surface-soft rounded-[22px] p-4">
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder={`搜索${selectedGroup.label}`}
                    className="app-input"
                  />
                </div>

                <div className="theme-surface-soft rounded-[22px] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={inputMap[`${selectedGroup.key}__root`] || ''}
                      onChange={(event) =>
                        setInputMap((prev) => ({
                          ...prev,
                          [`${selectedGroup.key}__root`]: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleAddRoot(selectedGroup.key)
                      }}
                      placeholder={`新增${selectedGroup.label}`}
                      className="app-input"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddRoot(selectedGroup.key)}
                      className="app-btn-primary shrink-0 whitespace-nowrap"
                    >
                      新增
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="app-scroll-area mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
              {filteredNodes.length > 0 ? (
                <div className="space-y-4">{renderTree(selectedGroup.key, filteredNodes)}</div>
              ) : selectedStats.total > 0 ? (
                <div className="theme-surface-soft rounded-[24px] px-6 py-12 text-center text-base font-medium theme-text-primary">
                  无匹配结果
                </div>
              ) : (
                <div className="theme-surface-soft rounded-[24px] px-6 py-12 text-center text-base font-medium theme-text-primary">
                  暂无配置项
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default TypeManagementModal
