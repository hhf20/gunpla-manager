import GunplaCard from './GunplaCard'
import { useGunpla } from '../context/GunplaContext'

function MainContent({ items }) {
  const { gunplaList, filterState, setFilterState, resetFilter, uiState, setUiState } = useGunpla()

  const ownedCount = items.filter((item) => item.type === 'owned').length
  const wishlistCount = items.filter((item) => item.type === 'wishlist').length
  const completedCount = items.filter((item) => item.buildStatus === '完成').length
  const totalCost = items
    .filter((item) => item.type === 'owned')
    .reduce((sum, item) => sum + (item.purchasePrice || 0) * (item.purchaseCount || 1), 0)

  const filterChips = [
    ...filterState.grades.map((value) => ({ key: 'grades', value })),
    ...filterState.status.map((value) => ({ key: 'status', value })),
    ...filterState.buildStatuses.map((value) => ({ key: 'buildStatuses', value })),
    ...filterState.series.map((value) => ({ key: 'series', value })),
    ...filterState.tags.map((value) => ({ key: 'tags', value })),
    ...(filterState.type !== 'all'
      ? [{ key: 'type', value: filterState.type === 'owned' ? '我的收藏' : '愿望清单' }]
      : []),
  ]

  const removeChip = (chip) => {
    if (chip.key === 'type') {
      setFilterState((prev) => ({ ...prev, type: 'all' }))
      return
    }

    setFilterState((prev) => ({
      ...prev,
      [chip.key]: prev[chip.key].filter((item) => item !== chip.value),
    }))
  }

  const isNoData = gunplaList.length === 0
  const isNoOwned = filterState.type === 'owned' && ownedCount === 0
  const isNoWishlist = filterState.type === 'wishlist' && wishlistCount === 0
  const isFilteredEmpty = !isNoData && !isNoOwned && !isNoWishlist && items.length === 0
  const cardDensity = uiState?.cardDensity || 'comfortable'

  const densityClass =
    cardDensity === 'ultra'
      ? 'columns-2 gap-4 md:columns-3 xl:columns-4 2xl:columns-6'
      : cardDensity === 'compact'
        ? 'columns-1 gap-5 md:columns-3 xl:columns-4 2xl:columns-5'
        : 'columns-1 gap-6 md:columns-2 xl:columns-3 2xl:columns-4'

  const stats = [
    { label: '已拥有', value: ownedCount, tone: 'text-cyan-100' },
    { label: '愿望单', value: wishlistCount, tone: 'text-amber-100' },
    { label: '已完成', value: completedCount, tone: 'text-emerald-100' },
    { label: '累计投入', value: `¥${totalCost.toLocaleString('zh-CN')}`, tone: 'text-white' },
  ]

  return (
    <main className="flex-1 overflow-y-auto px-4 pb-5 pt-3 md:px-6 md:pb-6 md:pt-4">
      <section className="app-panel-strong relative overflow-hidden rounded-[28px] px-5 py-5 md:px-6 md:py-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(103,212,255,0.14),transparent_24%),linear-gradient(110deg,rgba(255,255,255,0.03),transparent_52%)]" />

        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-sky-100/55">
                Collection Showcase
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">模型总览</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
                保留一点展陈氛围，但把视线快速带回当前筛选结果和卡片内容本身。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-[132px] rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{stat.label}</div>
                  <div className={`mt-2 text-xl font-semibold ${stat.tone}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start xl:justify-end">
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">卡片密度</div>
              <div className="mt-2 flex items-center gap-3">
                <select
                  value={cardDensity}
                  onChange={(event) =>
                    setUiState((prev) => ({
                      ...(prev || {}),
                      cardDensity: event.target.value,
                    }))
                  }
                  className="app-input w-32 !rounded-full !py-2.5 !pr-10"
                >
                  <option value="comfortable">标准</option>
                  <option value="compact">紧凑</option>
                  <option value="ultra">超密</option>
                </select>
                <span className="text-xs text-slate-400">调节列表的信息密度</span>
              </div>
            </div>
          </div>
        </div>

        {filterChips.length > 0 ? (
          <div className="relative mt-4 border-t border-white/10 pt-4">
            <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">当前筛选</div>
            <div className="flex flex-wrap gap-2">
              {filterChips.map((chip) => (
                <button key={`${chip.key}-${chip.value}`} onClick={() => removeChip(chip)} className="app-chip">
                  {chip.value}
                  <span className="text-[11px] text-slate-400">移除</span>
                </button>
              ))}
              <button onClick={resetFilter} className="app-btn-secondary !rounded-full !px-4 !py-1.5 !text-xs">
                清空筛选
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {isNoData || isNoOwned || isNoWishlist || isFilteredEmpty ? (
        <section className="app-panel mt-6 rounded-[28px] px-6 py-14 text-center">
          <div className="mx-auto max-w-xl">
            <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Empty Showcase</div>
            <p className="mt-4 text-2xl font-semibold text-white">
              {isNoData
                ? '这里还没有任何模型，先把第一台作品放进展柜吧。'
                : isNoWishlist
                  ? '愿望清单还是空的，可以先把想买的机体记下来。'
                  : isNoOwned
                    ? '当前还没有已入手模型，先补充几台收藏吧。'
                    : '当前筛选条件下没有匹配到模型。'}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {isFilteredEmpty
                ? '你可以尝试移除一部分筛选项，或者切换到其他视图继续浏览。'
                : '新增、导入或者调整分类后，这里会立刻刷新。'}
            </p>
          </div>
        </section>
      ) : (
        <section className="mt-6">
          <div className={densityClass}>
            {items.map((item) => (
              <div key={item.id} className="mb-6 break-inside-avoid">
                <GunplaCard item={item} />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default MainContent
