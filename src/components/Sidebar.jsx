import { useEffect, useMemo, useState } from 'react'
import { useGunpla } from '../context/GunplaContext'
import { addNode, flattenLabels } from '../utils/configTree'

const typeOptions = [
  { label: '全部', value: 'all' },
  { label: '我的收藏', value: 'owned' },
  { label: '愿望清单', value: 'wishlist' },
]

function Sidebar() {
  const {
    filterState,
    setFilterState,
    allTags,
    configTree,
    uiState,
    setSidebarWidth,
    openManual,
  } = useGunpla()
  const [expanded, setExpanded] = useState({})

  const sidebarWidth = Math.min(420, Math.max(248, Number(uiState?.sidebarWidth) || 288))

  const toggleListFilter = (key, value) => {
    setFilterState((prev) => {
      const list = prev[key]
      const exists = list.includes(value)
      return {
        ...prev,
        [key]: exists ? list.filter((item) => item !== value) : [...list, value],
      }
    })
  }

  const toggleListFilterMany = (key, values) => {
    const uniq = Array.from(new Set((values || []).filter(Boolean)))
    if (uniq.length === 0) return

    setFilterState((prev) => {
      const list = prev[key]
      const allSelected = uniq.every((value) => list.includes(value))
      if (allSelected) {
        const removeSet = new Set(uniq)
        return { ...prev, [key]: list.filter((value) => !removeSet.has(value)) }
      }
      const next = new Set(list)
      uniq.forEach((value) => next.add(value))
      return { ...prev, [key]: Array.from(next) }
    })
  }

  const tagsTree = useMemo(() => {
    const base = configTree?.customTags || []
    const existing = new Set(flattenLabels(base))
    const missing = (allTags || []).filter((tag) => tag && !existing.has(tag))
    if (missing.length === 0) return base

    let next = structuredClone(base)
    const archive = { id: 'virtual_unfiled', label: '未归档', children: [] }
    for (const tag of missing) archive.children = addNode(archive.children, null, tag)
    next = [...next, archive]
    return next
  }, [allTags, configTree?.customTags])

  useEffect(() => {
    const handleMouseUp = () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const startResize = (event) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    const onMove = (moveEvent) => {
      const nextWidth = startWidth + (moveEvent.clientX - startX)
      setSidebarWidth(nextWidth)
    }

    const onUp = () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const shouldShowNodeLogo = (sectionKey) => {
    if (sectionKey === 'grade') return uiState.showGradeLogo !== false
    if (sectionKey === 'series') return uiState.showSeriesLogo !== false
    return false
  }

  const renderTree = (sectionKey, nodes, filterKey, { cascade = false } = {}, depth = 0) =>
    (nodes || []).map((node) => {
      const hasChildren = (node.children || []).length > 0
      const expandedKey = `${sectionKey}__${node.id}`
      const isExpanded = expanded[expandedKey] ?? true
      const selectedList = filterState[filterKey]
      const isChecked = selectedList.includes(node.label)
      const subtreeLabels = cascade ? flattenLabels([node]) : [node.label]
      const showLogo = shouldShowNodeLogo(sectionKey)

      return (
        <div key={node.id} className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-200" style={{ marginLeft: `${depth * 12}px` }}>
            {hasChildren ? (
              <button
                type="button"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs text-slate-300 transition hover:bg-white/[0.1]"
                onClick={() => setExpanded((prev) => ({ ...prev, [expandedKey]: !isExpanded }))}
                title={isExpanded ? '收起' : '展开'}
              >
                {isExpanded ? '-' : '+'}
              </button>
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-600">•</span>
            )}

            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.04]">
              <input
                checked={isChecked}
                onChange={() =>
                  cascade
                    ? toggleListFilterMany(filterKey, subtreeLabels)
                    : toggleListFilter(filterKey, node.label)
                }
                type="checkbox"
                className="h-4 w-4 accent-cyan-400"
              />

              {showLogo ? (
                <span className="inline-flex h-7 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/8 bg-slate-950/70">
                  {node.logoUrl ? (
                    <img src={node.logoUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="px-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      {sectionKey === 'series' ? 'SERIES' : node.label}
                    </span>
                  )}
                </span>
              ) : null}

              <span className="truncate" title={node.label}>
                {node.label}
              </span>
            </label>
          </div>

          {hasChildren && isExpanded ? (
            <div>{renderTree(sectionKey, node.children, filterKey, { cascade }, depth + 1)}</div>
          ) : null}
        </div>
      )
    })

  return (
    <aside className="relative shrink-0 overflow-hidden px-4 py-4 lg:px-5" style={{ width: `${sidebarWidth}px` }}>
      <div className="app-panel-strong sticky top-4 overflow-hidden rounded-[30px] p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,212,255,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_55%)]" />

        <div className="relative">
          <section>
            <div className="text-[11px] uppercase tracking-[0.3em] text-sky-200/70">View Mode</div>
            <h3 className="mt-2 text-lg font-semibold text-white">筛选面板</h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              左侧栏支持拖拽调宽，方便同时展示 Logo 和完整文字。
            </p>
          </section>

          <section className="mt-5">
            <div className="app-section-title">视图类型</div>
            <div className="grid gap-2">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterState((prev) => ({ ...prev, type: option.value }))}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    filterState.type === option.value
                      ? 'border-cyan-300/25 bg-cyan-400/14 text-cyan-100'
                      : 'border-white/8 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <div className="app-section-title">Grade</div>
            <div className="rounded-[24px] border border-white/8 bg-black/10 p-3">
              <div className="space-y-1">{renderTree('grade', configTree?.grade, 'grades', { cascade: true })}</div>
            </div>
          </section>

          <section className="mt-6">
            <div className="app-section-title">拼装阶段</div>
            <div className="rounded-[24px] border border-white/8 bg-black/10 p-3">
              <div className="space-y-1">
                {renderTree('buildStatus', configTree?.buildStatusConfig, 'buildStatuses', { cascade: true })}
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="app-section-title">系列</div>
            <div className="rounded-[24px] border border-white/8 bg-black/10 p-3">
              <div className="space-y-1">{renderTree('series', configTree?.series, 'series', { cascade: true })}</div>
            </div>
          </section>

          <section className="mt-6">
            <div className="app-section-title">标签</div>
            <div className="rounded-[24px] border border-white/8 bg-black/10 p-3">
              <div className="space-y-1">{renderTree('tags', tagsTree, 'tags')}</div>
            </div>
          </section>

          <section className="mt-8 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={openManual}
              className="app-btn-secondary w-full !justify-between !rounded-2xl"
            >
              说明书目录
              <span className="text-xs text-slate-400">打开</span>
            </button>
          </section>
        </div>
      </div>

      <button
        type="button"
        aria-label="调整左侧栏宽度"
        onMouseDown={startResize}
        className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent"
      >
        <span className="absolute right-[3px] top-1/2 h-20 w-[2px] -translate-y-1/2 rounded-full bg-white/12 transition hover:bg-cyan-300/70" />
      </button>
    </aside>
  )
}

export default Sidebar
