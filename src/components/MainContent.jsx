import GunplaCard from './GunplaCard'
import { useGunpla } from '../context/GunplaContext'

function MainContent({ items }) {
  const { gunplaList, filterState, setFilterState, resetFilter, uiState, setUiState } = useGunpla()

  // 上方统计必须跟随筛选条件动态变化：使用当前渲染的 items（已被 filterGunplaList 过滤）。
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

  return (
    <main className="flex-1 overflow-y-auto bg-zinc-950/55 backdrop-blur-[2px]">
      <div className="px-6 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-zinc-100">我的收藏</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
              <span>已拥有：{ownedCount}</span>
              <span>愿望清单：{wishlistCount}</span>
              <span>已完成：{completedCount}</span>
              <span>总花费：￥{totalCost}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">展示密度</span>
            <select
              value={cardDensity}
              onChange={(e) =>
                setUiState((prev) => ({
                  ...(prev || {}),
                  cardDensity: e.target.value,
                }))
              }
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
            >
              <option value="comfortable">标准</option>
              <option value="compact">紧凑</option>
              <option value="ultra">更多</option>
            </select>
          </div>
        </div>

        {filterChips.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {filterChips.map((chip) => (
              <button
                key={`${chip.key}-${chip.value}`}
                onClick={() => removeChip(chip)}
                className="group inline-flex items-center gap-2 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-700"
              >
                {chip.value}
                <span className="opacity-0 transition group-hover:opacity-100">x</span>
              </button>
            ))}
            <button
              onClick={resetFilter}
              className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400 transition hover:brightness-110"
            >
              清空筛选
            </button>
          </div>
        ) : null}
      </div>

      {isNoData || isNoOwned || isNoWishlist || isFilteredEmpty ? (
        <div className="mx-6 mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
          <p className="text-zinc-200 text-lg">
            {isNoData
              ? '你还没有任何模型，点击右上角开始添加'
              : isNoWishlist
                ? '还没有想买的模型，去收藏一些吧'
                : isNoOwned
                  ? '你还没有任何模型，点击右上角开始添加'
                  : '没有符合条件的模型'}
          </p>
        </div>
      ) : (
        <div className="p-6">
          <div className={densityClass}>
            {items.map((item) => (
              <div key={item.id} className="mb-6 break-inside-avoid">
                <GunplaCard item={item} />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

export default MainContent
