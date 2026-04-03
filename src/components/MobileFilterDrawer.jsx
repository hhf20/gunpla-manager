import { useMemo, useState } from 'react'
import { useGunpla } from '../context/GunplaContext'
import { addNode, flattenLabels } from '../utils/configTree'

function MobileFilterDrawer({ isOpen, onClose }) {
  const { filterState, setFilterState, resetFilter, allTags, configTree } = useGunpla()
  const [expanded, setExpanded] = useState({})

  const tagsTree = useMemo(() => {
    const base = configTree?.customTags || []
    const existing = new Set(flattenLabels(base))
    const missing = (allTags || []).filter((tag) => tag && !existing.has(tag))
    if (missing.length === 0) return base

    let next = structuredClone(base)
    const archive = { id: 'mobile_virtual_unfiled', label: '未归档', children: [] }
    for (const tag of missing) archive.children = addNode(archive.children, null, tag)
    next = [...next, archive]
    return next
  }, [allTags, configTree?.customTags])

  const filterCount = useMemo(
    () =>
      filterState.grades.length +
      filterState.series.length +
      filterState.buildStatuses.length +
      filterState.tags.length +
      (filterState.type !== 'all' ? 1 : 0) +
      (filterState.searchText.trim() ? 1 : 0),
    [filterState],
  )

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
          <div className="flex items-center gap-2" style={{ marginLeft: `${depth * 10}px` }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [expandedKey]: !isExpanded }))}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs text-slate-300"
              >
                {isExpanded ? '-' : '+'}
              </button>
            ) : (
              <span className="flex h-6 w-6 items-center justify-center text-slate-600">·</span>
            )}

            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() =>
                  cascade
                    ? toggleListFilterMany(filterKey, subtreeLabels)
                    : toggleListFilter(filterKey, node.label)
                }
                className="h-4 w-4 accent-cyan-400"
              />
              <span className="truncate">{node.label}</span>
            </label>
          </div>

          {hasChildren && isExpanded ? (
            <div>{renderTree(sectionKey, node.children, filterKey, { cascade }, depth + 1)}</div>
          ) : null}
        </div>
      )
    })

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`app-panel-strong fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-sm flex-col rounded-r-[28px] transition-transform ${
          isOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full'
        }`}
      >
        <div className="border-b border-white/8 px-5 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-sky-200/70">Filters</div>
              <h2 className="mt-2 text-xl font-semibold text-white">筛选条件</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="app-btn-secondary !rounded-full !px-3 !py-2 !text-xs"
            >
              关闭
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-[11px] text-cyan-100">
              已启用 {filterCount} 项筛选
            </span>
            {filterState.searchText.trim() ? (
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 text-[11px] text-slate-300">
                搜索：{filterState.searchText}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            <section>
              <div className="app-section-title">Grade</div>
              <div className="rounded-[22px] border border-white/10 bg-black/10 p-3">
                {renderTree('grade', configTree?.grade, 'grades', { cascade: true })}
              </div>
            </section>

            <section>
              <div className="app-section-title">系列</div>
              <div className="rounded-[22px] border border-white/10 bg-black/10 p-3">
                {renderTree('series', configTree?.series, 'series', { cascade: true })}
              </div>
            </section>

            <section>
              <div className="app-section-title">拼装阶段</div>
              <div className="rounded-[22px] border border-white/10 bg-black/10 p-3">
                {renderTree('buildStatus', configTree?.buildStatusConfig, 'buildStatuses', {
                  cascade: true,
                })}
              </div>
            </section>

            <section>
              <div className="app-section-title">标签</div>
              <div className="rounded-[22px] border border-white/10 bg-black/10 p-3">
                {renderTree('tags', tagsTree, 'tags')}
              </div>
            </section>
          </div>
        </div>

        <div className="border-t border-white/8 px-5 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetFilter}
              className="app-btn-secondary flex-1 !rounded-full !px-4 !py-3 !text-sm"
            >
              清空筛选
            </button>
            <button
              type="button"
              onClick={onClose}
              className="app-btn-primary flex-1 !rounded-full !px-4 !py-3 !text-sm"
            >
              完成
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default MobileFilterDrawer
