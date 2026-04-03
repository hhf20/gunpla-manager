import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GunplaCard from './GunplaCard'
import { useGunpla } from '../context/GunplaContext'

const COMMON_GRADES = ['PG', 'MG', 'RG', 'HG', 'EG', 'SD', 'MEGA']

function MobileHomePage() {
  const navigate = useNavigate()
  const {
    filteredGunplaList,
    gunplaList,
    filterState,
    setFilterState,
    resetFilter,
    importPortableData,
    platformCapabilities,
    setMobileFilterDrawerOpen,
    categoryConfig,
  } = useGunpla()

  const fileInputRef = useRef(null)
  const [importState, setImportState] = useState({ type: 'idle', message: '' })
  const accessUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : ''

  const hasImportedData = gunplaList.length > 0

  const dashboard = useMemo(() => {
    const owned = gunplaList.filter((i) => i.type === 'owned')
    const wish = gunplaList.filter((i) => i.type === 'wishlist')
    const completed = owned.filter((i) => i.buildStatus === '完成').length
    const totalSpent = owned.reduce(
      (s, i) => s + Number(i.purchasePrice || 0) * Number(i.purchaseCount || 1),
      0,
    )
    return {
      owned: owned.length,
      wishlist: wish.length,
      completed,
      totalSpent,
    }
  }, [gunplaList])

  const gradeChips = useMemo(() => {
    const fromConfig = categoryConfig?.grade || []
    return [...new Set([...COMMON_GRADES, ...fromConfig])].filter(Boolean)
  }, [categoryConfig?.grade])

  const allGradesActive = filterState.grades.length === 0

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

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportState({ type: 'loading', message: '正在导入桌面端数据包…' })

    try {
      const result = await importPortableData(file)
      setImportState({
        type: result?.ok ? 'success' : 'error',
        message: result?.message || '导入完成。',
      })
    } catch (error) {
      setImportState({
        type: 'error',
        message: error?.message || '导入失败，请检查数据包格式。',
      })
    }

    event.target.value = ''
  }

  const setGradeChip = (key) => {
    if (key === 'ALL') {
      setFilterState((prev) => ({ ...prev, grades: [] }))
      return
    }
    setFilterState((prev) => ({ ...prev, grades: [key] }))
  }

  const renderEmptyState = () => {
    if (!hasImportedData) {
      return (
        <div className="rounded-2xl border border-white/10 bg-[#0d1117]/80 px-5 py-10 text-center backdrop-blur-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-lg font-bold text-sky-400">
            GM
          </div>
          {accessUrl ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left text-[11px] text-slate-400">
              <span className="text-[10px] uppercase tracking-wider text-slate-500">入口</span>
              <div className="mt-1 break-all text-slate-300">{accessUrl}</div>
            </div>
          ) : null}
          <h3 className="mt-4 text-lg font-semibold text-white">导入数据包</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            在桌面端使用「导出到移动端」，将 JSON 导入此处即可浏览。
          </p>
          {platformCapabilities.supportsDesktopImport ? (
            <button
              type="button"
              onClick={handleImportClick}
              className="mt-6 inline-flex rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(14,165,233,0.35)] transition hover:bg-sky-400"
            >
              选择 JSON 文件
            </button>
          ) : null}
        </div>
      )
    }

    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1117]/80 px-5 py-8 text-center">
        <h3 className="text-lg font-semibold text-white">没有匹配的模型</h3>
        <p className="mt-2 text-sm text-slate-500">试试清空筛选或更换 Grade / 搜索词。</p>
        <button
          type="button"
          onClick={resetFilter}
          className="mt-5 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-slate-200"
        >
          清空筛选
        </button>
      </div>
    )
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-3">
        {/* 顶栏：参考 Digital Hangar */}
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 ring-1 ring-sky-400/30"
              aria-hidden
            >
              <svg className="h-6 w-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 8l8-4 8 4-8 4-8-4zm0 8l8 4 8-4M4 16l8-4"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sky-400">
                The Digital Hangar
              </p>
              <h1 className="truncate text-lg font-bold tracking-tight text-white">金屋藏胶</h1>
            </div>
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-slate-300"
            aria-hidden
          >
            GM
          </div>
        </header>

        {hasImportedData ? (
          <>
            <details className="mb-4 rounded-2xl border border-white/10 bg-[#0d1117]/60 ring-1 ring-white/5">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-200 [&::-webkit-details-marker]:hidden">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">数据概览</span>
                <span className="ml-2 text-xs text-slate-500">点击展开</span>
              </summary>
              <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-4 pb-4 pt-3">
                <div className="rounded-2xl border border-white/8 bg-[#161b22] p-4 ring-1 ring-white/5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">已拥有</p>
                  <p className="mt-2 text-2xl font-bold text-sky-400">{dashboard.owned}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#161b22] p-4 ring-1 ring-white/5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">愿望</p>
                  <p className="mt-2 text-2xl font-bold text-amber-400">{dashboard.wishlist}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#161b22] p-4 ring-1 ring-white/5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">已完成</p>
                  <p className="mt-2 text-2xl font-bold text-white">{dashboard.completed}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#161b22] p-4 ring-1 ring-white/5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">累计投入</p>
                  <p className="mt-2 text-lg font-bold text-emerald-400/95">
                    ¥{dashboard.totalSpent.toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            </details>

            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Filter manifest
              </span>
              <button
                type="button"
                onClick={resetFilter}
                className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 hover:text-sky-300"
              >
                Clear filters
              </button>
            </div>

            <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setGradeChip('ALL')}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                  allGradesActive
                    ? 'bg-sky-500 text-white shadow-[0_4px_20px_rgba(14,165,233,0.4)]'
                    : 'bg-[#21262d] text-slate-400 ring-1 ring-white/10'
                }`}
              >
                All
              </button>
              {gradeChips.map((g) => {
                const active = filterState.grades.length === 1 && filterState.grades[0] === g
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGradeChip(g)}
                    className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                      active
                        ? 'bg-sky-500 text-white shadow-[0_4px_20px_rgba(14,165,233,0.4)]'
                        : 'bg-[#21262d] text-slate-400 ring-1 ring-white/10'
                    }`}
                  >
                    {g}
                  </button>
                )
              })}
            </div>

            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={filterState.searchText}
                onChange={(event) =>
                  setFilterState((prev) => ({ ...prev, searchText: event.target.value }))
                }
                placeholder="搜索名称、编号、系列…"
                className="app-input min-w-0 flex-1 !rounded-xl !py-3 !text-sm"
              />
              <button
                type="button"
                onClick={() => setMobileFilterDrawerOpen(true)}
                className="shrink-0 rounded-xl border border-white/15 bg-[#21262d] px-4 py-3 text-xs font-medium text-slate-200 ring-1 ring-white/10"
              >
                筛选{filterCount > 0 ? ` ${filterCount}` : ''}
              </button>
            </div>

            {importState.type !== 'idle' ? (
              <div
                className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                  importState.type === 'success'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                    : importState.type === 'error'
                      ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                      : 'border-sky-500/20 bg-sky-500/10 text-sky-200'
                }`}
              >
                {importState.message}
              </div>
            ) : null}
          </>
        ) : null}

        {!hasImportedData && importState.type !== 'idle' ? (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              importState.type === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                : importState.type === 'error'
                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                  : 'border-sky-500/20 bg-sky-500/10 text-sky-200'
            }`}
          >
            {importState.message}
          </div>
        ) : null}

        <section className="relative">
          {filteredGunplaList.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {filteredGunplaList.map((item) => (
                <GunplaCard
                  key={item.id}
                  item={item}
                  variant="gallery"
                  onOpen={() => navigate(`/model/${item.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {platformCapabilities.supportsDesktopImport && hasImportedData ? (
          <button
            type="button"
            onClick={handleImportClick}
            className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-2xl font-light text-white shadow-[0_8px_32px_rgba(14,165,233,0.45)] transition hover:bg-sky-400"
            aria-label="重新导入数据包"
          >
            +
          </button>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportChange}
          className="hidden"
        />
      </main>
    </>
  )
}

export default MobileHomePage
