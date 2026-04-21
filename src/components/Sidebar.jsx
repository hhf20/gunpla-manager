import { useEffect, useMemo, useRef, useState } from 'react'
import { useGunpla } from '../context/GunplaContext'
import { addNode, flattenLabels } from '../utils/configTree'
import { scrollDesktopContainersToTop } from '../utils/desktopScroll'

function Sidebar() {
  const {
    filterState,
    setFilterState,
    allTags,
    configTree,
    uiState,
    setSidebarWidth,
    setSidebarCollapsed,
    openManual,
  } = useGunpla()
  const [expanded, setExpanded] = useState({})
  const bodyRef = useRef(null)

  const sidebarWidth = Math.min(420, Math.max(248, Number(uiState?.sidebarWidth) || 288))
  const isSidebarCollapsed = uiState?.sidebarCollapsed === true

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

  const scrollToTop = () => {
    scrollDesktopContainersToTop(bodyRef.current)
  }

  const renderTree = (sectionKey, nodes, filterKey, { cascade = false } = {}, depth = 0) =>
    (nodes || []).map((node) => {
      const hasChildren = (node.children || []).length > 0
      const expandedKey = `${sectionKey}__${node.id}`
      const isExpanded = expanded[expandedKey] ?? true
      const selectedList = filterState[filterKey]
      const isChecked = selectedList.includes(node.label)
      const subtreeLabels = cascade ? flattenLabels([node]) : [node.label]
      return (
        <div key={node.id} className="space-y-1">
          <div className="flex items-center gap-2 text-sm theme-text-primary" style={{ marginLeft: `${depth * 12}px` }}>
            {hasChildren ? (
              <button
                type="button"
                className="theme-surface-soft flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs theme-text-secondary transition hover:bg-[color:var(--brand-soft)] hover:text-[var(--accent-strong)]"
                onClick={() => setExpanded((prev) => ({ ...prev, [expandedKey]: !isExpanded }))}
                title={isExpanded ? '收起' : '展开'}
              >
                {isExpanded ? '-' : '+'}
              </button>
            ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center theme-text-secondary">·</span>
            )}

            <label className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1 transition hover:bg-[rgba(255,255,255,0.04)]">
              <input
                checked={isChecked}
                onChange={() =>
                  cascade
                    ? toggleListFilterMany(filterKey, subtreeLabels)
                    : toggleListFilter(filterKey, node.label)
                }
                type="checkbox"
                className="h-3.5 w-3.5 accent-[var(--accent-strong)]"
              />

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

  if (isSidebarCollapsed) {
    return (
      <aside className="dex-sidenav-wrap" style={{ width: '72px' }}>
        <div className="dex-sidenav h-full px-2 py-3">

          <div className="relative flex w-full flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="app-btn-secondary !min-h-[44px] !w-full !rounded-2xl !px-2 !py-2 !text-xs"
            >
              展开
            </button>
            <div className="theme-surface-soft rounded px-2 py-2 text-center text-[10px] uppercase tracking-[0.24em] theme-text-muted">
              索引
            </div>
          </div>

          <div className="relative flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={openManual}
              className="app-btn-secondary !min-h-[44px] !w-full !rounded-2xl !px-2 !py-2 !text-[11px]"
            >
              目录
            </button>
            <button
              type="button"
              onClick={scrollToTop}
              className="app-btn-secondary !min-h-[44px] !w-full !rounded-2xl !px-2 !py-2 !text-[11px]"
            >
              TOP
            </button>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="dex-sidenav-wrap" style={{ width: `${sidebarWidth}px` }}>
      <div className="dex-sidenav h-full p-3">
        <div ref={bodyRef} className="app-scroll-area relative min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] theme-text-muted">Filter Library</div>
              <div className="mt-1 text-sm font-semibold theme-text-primary">筛选导航</div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className="app-btn-secondary !rounded-full !px-3 !py-1.5 !text-[11px]"
            >
              收起左侧
            </button>
          </div>

          <section>
            <div className="app-section-title">Grade</div>
            <div className="theme-surface-soft rounded-md p-2.5">
              <div className="space-y-1">{renderTree('grade', configTree?.grade, 'grades', { cascade: true })}</div>
            </div>
          </section>

          <section className="mt-6">
            <div className="app-section-title">拼装阶段</div>
            <div className="theme-surface-soft rounded-md p-2.5">
              <div className="space-y-1">
                {renderTree('buildStatus', configTree?.buildStatusConfig, 'buildStatuses', { cascade: true })}
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="app-section-title">系列</div>
            <div className="theme-surface-soft rounded-md p-2.5">
              <div className="space-y-1">{renderTree('series', configTree?.series, 'series', { cascade: true })}</div>
            </div>
          </section>

          <section className="mt-6">
            <div className="app-section-title">标签</div>
            <div className="theme-surface-soft rounded-md p-2.5">
              <div className="space-y-1">{renderTree('tags', tagsTree, 'tags')}</div>
            </div>
          </section>
        </div>

        <div className="relative mt-4 space-y-2 border-t theme-border pt-4">
          <button
            type="button"
            onClick={openManual}
            className="app-btn-secondary w-full !justify-between !rounded-2xl"
          >
            说明书目录
            <span className="text-xs theme-text-muted">打开</span>
          </button>
          <button
            type="button"
            onClick={scrollToTop}
            className="app-btn-secondary w-full !justify-between !rounded-2xl"
          >
            TOP
            <span className="text-xs theme-text-muted">回到顶部</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        aria-label="调整左侧栏宽度"
        onMouseDown={startResize}
        className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent"
      >
        <span className="absolute right-[3px] top-1/2 h-20 w-[2px] -translate-y-1/2 rounded-full bg-[var(--line)] transition hover:bg-[var(--accent-strong)]" />
      </button>
    </aside>
  )
}

export default Sidebar
