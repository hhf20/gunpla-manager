import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GunplaCard from './GunplaCard'
import MobileFilterDrawer from './MobileFilterDrawer'
import { useGunpla } from '../context/GunplaContext'

function MobileHomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    filteredGunplaList,
    gunplaList,
    filterState,
    setFilterState,
    resetFilter,
    importPortableData,
    platformCapabilities,
  } = useGunpla()

  const fileInputRef = useRef(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [importState, setImportState] = useState({ type: 'idle', message: '' })
  const accessUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : ''

  const ownedCount = filteredGunplaList.filter((item) => item.type === 'owned').length
  const wishlistCount = filteredGunplaList.filter((item) => item.type === 'wishlist').length
  const hasImportedData = gunplaList.length > 0

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

  const statusTabs = [
    { key: 'all', label: '全部', count: filteredGunplaList.length },
    { key: 'owned', label: '我的收藏', count: ownedCount },
    { key: 'wishlist', label: '愿望清单', count: wishlistCount },
  ]

  const navItems = [
    { label: '藏品', path: '/', active: location.pathname === '/' },
    { label: '统计', path: '/stats', active: location.pathname === '/stats' },
    { label: `筛选${filterCount > 0 ? ` ${filterCount}` : ''}`, action: () => setFiltersOpen(true), active: filtersOpen || filterCount > 0 },
  ]

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
        type: result?.success ? 'success' : 'error',
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

  const renderEmptyState = () => {
    if (!hasImportedData) {
      return (
        <div className="app-panel rounded-[28px] px-5 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-lg text-cyan-100">
            GM
            {accessUrl ? (
              <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-[11px] text-cyan-100">
                当前移动端入口：{accessUrl}
              </span>
            ) : null}
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">先导入桌面端数据包</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            移动端首版以只读浏览为主。先在桌面端点击“导出到移动端”，再把生成的 JSON 数据包导入到这里。
          </p>
          {platformCapabilities.supportsDesktopImport ? (
            <button
              type="button"
              onClick={handleImportClick}
              className="app-btn-primary mt-5 !rounded-full !px-5 !py-3 !text-sm"
            >
              导入桌面端数据包
            </button>
          ) : null}
        </div>
      )
    }

    return (
      <div className="app-panel rounded-[28px] px-5 py-8 text-center">
        <h3 className="text-lg font-semibold text-white">没有匹配的模型</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          当前筛选条件下没有找到结果。你可以清空筛选，或者重新搜索名称、编号、系列。
        </p>
        <button
          type="button"
          onClick={resetFilter}
          className="app-btn-secondary mt-5 !rounded-full !px-5 !py-3 !text-sm"
        >
          清空筛选
        </button>
      </div>
    )
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        <section className="app-panel-strong overflow-hidden rounded-[30px] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.32em] text-sky-200/70">
                Portable Showcase
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-white">金屋藏胶</h1>
              <p className="mt-1 text-sm text-slate-400">Gunpla Manager 移动只读收藏端</p>
            </div>
            <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-100">
              PWA
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3">
              <div className="text-[11px] text-slate-400">总数</div>
              <div className="mt-1 text-lg font-semibold text-white">{filteredGunplaList.length}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3">
              <div className="text-[11px] text-slate-400">收藏</div>
              <div className="mt-1 text-lg font-semibold text-cyan-100">{ownedCount}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3">
              <div className="text-[11px] text-slate-400">愿望</div>
              <div className="mt-1 text-lg font-semibold text-amber-100">{wishlistCount}</div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-[24px] border border-white/8 bg-black/15 p-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterState((prev) => ({ ...prev, type: tab.key }))}
                className={`flex-1 rounded-[18px] px-3 py-2.5 text-sm transition ${
                  filterState.type === tab.key
                    ? 'bg-cyan-400/18 text-cyan-50 shadow-[0_10px_30px_rgba(34,211,238,0.16)]'
                    : 'text-slate-300'
                }`}
              >
                <div>{tab.label}</div>
                <div className="mt-1 text-[11px] text-slate-400">{tab.count}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={filterState.searchText}
              onChange={(event) =>
                setFilterState((prev) => ({ ...prev, searchText: event.target.value }))
              }
              placeholder="搜索名称、编号、系列"
              className="app-input !rounded-full !py-3"
            />
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="app-btn-secondary !rounded-full !px-4 !py-3 !text-sm"
            >
              筛选{filterCount > 0 ? ` ${filterCount}` : ''}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {platformCapabilities.supportsDesktopImport ? (
              <button
                type="button"
                onClick={handleImportClick}
                className="app-btn-primary !rounded-full !px-4 !py-2.5 !text-xs"
              >
                导入桌面端数据包
              </button>
            ) : null}

            {filterCount > 0 ? (
              <button
                type="button"
                onClick={resetFilter}
                className="app-btn-secondary !rounded-full !px-4 !py-2.5 !text-xs"
              >
                清空筛选
              </button>
            ) : null}

            <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 text-[11px] text-slate-400">
              桌面端维护资料，移动端专注浏览与查找
            </span>
          </div>

          {accessUrl ? (
            <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
              当前移动端入口：{accessUrl}
            </div>
          ) : null}

          {importState.type !== 'idle' ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                importState.type === 'success'
                  ? 'border-emerald-300/15 bg-emerald-400/10 text-emerald-100'
                  : importState.type === 'error'
                    ? 'border-rose-300/15 bg-rose-400/10 text-rose-100'
                    : 'border-cyan-300/15 bg-cyan-400/10 text-cyan-100'
              }`}
            >
              {importState.message}
            </div>
          ) : null}
        </section>

        <section className="mt-5 space-y-4">
          {filteredGunplaList.length === 0
            ? renderEmptyState()
            : filteredGunplaList.map((item) => (
                <GunplaCard
                  key={item.id}
                  item={item}
                  onOpen={() => navigate(`/model/${item.id}`)}
                />
              ))}
        </section>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportChange}
          className="hidden"
        />
      </main>

      <nav className="app-panel-strong fixed inset-x-0 bottom-0 z-30 mx-4 mb-4 grid grid-cols-3 gap-2 rounded-[26px] p-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action || (() => navigate(item.path))}
            className={`rounded-[18px] px-3 py-3 text-sm transition ${
              item.active
                ? 'bg-cyan-400/18 text-cyan-50 shadow-[0_10px_24px_rgba(34,211,238,0.16)]'
                : 'text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <MobileFilterDrawer isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </>
  )
}

export default MobileHomePage
