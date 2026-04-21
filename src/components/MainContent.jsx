import { useEffect, useRef } from 'react'
import GunplaCard from './GunplaCard'
import { useGunpla } from '../context/GunplaContext'
import {
  DESKTOP_MAIN_SCROLL_ID,
  DESKTOP_MAIN_SCROLL_KEY,
  restoreDesktopMainScrollPosition,
} from '../utils/desktopScroll'

const MAIN_SCROLL_ID = DESKTOP_MAIN_SCROLL_ID
const MAIN_SCROLL_KEY = DESKTOP_MAIN_SCROLL_KEY

function MainContent({ items }) {
  const { gunplaList, filterState, setFilterState, resetFilter, uiState, setUiState } = useGunpla()
  const scrollRef = useRef(null)
  const restoredRef = useRef(false)

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

  const dexGridClass =
    cardDensity === 'ultra'
      ? 'grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
      : cardDensity === 'compact'
        ? 'grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6'
        : 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'

  const stats = [
    { label: '已拥有', value: ownedCount, tone: 'text-[var(--accent-strong)]' },
    { label: '愿望单', value: wishlistCount, tone: 'text-[var(--warn)]' },
    { label: '已完成', value: completedCount, tone: 'text-[var(--success)]' },
    { label: '累计投入', value: `￥${totalCost.toLocaleString('zh-CN')}`, tone: 'theme-text-primary' },
  ]
  useEffect(() => {
    const el = scrollRef.current
    if (!el || restoredRef.current) return
    restoredRef.current = true
    restoreDesktopMainScrollPosition(el)
  }, [items.length])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    window.sessionStorage.setItem(MAIN_SCROLL_KEY, String(el.scrollTop))
  }

  return (
    <main
      id={MAIN_SCROLL_ID}
      ref={scrollRef}
      onScroll={handleScroll}
      className="app-scroll-area flex-1 overflow-y-auto px-3 pb-6 pt-2 md:px-5 md:pb-7 md:pt-3"
    >
      <section className="theme-surface rounded-md px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] theme-text-muted">Collection Dex</p>
            <h2 className="mt-1 text-2xl font-semibold theme-text-primary">图鉴网格</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="theme-surface-soft rounded-md px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.2em] theme-text-muted">{stat.label}</div>
                <div className={`mt-1 text-base font-semibold ${stat.tone}`}>{stat.value}</div>
              </div>
            ))}
          </div>
          <div className="theme-surface-soft rounded-md px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.2em] theme-text-muted">密度</div>
            <select
              value={cardDensity}
              onChange={(event) => setUiState((prev) => ({ ...(prev || {}), cardDensity: event.target.value }))}
              className="app-input mt-1 w-24 !h-8 !rounded !py-1 !pr-7 !text-xs"
            >
              <option value="comfortable">标准</option>
              <option value="compact">紧凑</option>
              <option value="ultra">超密</option>
            </select>
          </div>
        </div>

        <div className="mt-3 border-t theme-border pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-[0.2em] theme-text-muted">Current Filters</div>
            {filterChips.length > 0 ? (
              <button onClick={resetFilter} className="app-btn-secondary !h-8 !rounded !px-3 !py-1 !text-xs">
                清空
              </button>
            ) : null}
          </div>
          {filterChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {filterChips.map((chip) => (
                <button key={`${chip.key}-${chip.value}`} onClick={() => removeChip(chip)} className="app-chip !rounded !px-2 !py-1 !text-[11px]">
                  {chip.value}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs theme-text-secondary">暂无附加筛选</div>
          )}
        </div>
      </section>

      {isNoData || isNoOwned || isNoWishlist || isFilteredEmpty ? (
        <section className="mt-4 rounded-md theme-surface px-6 py-10 text-center">
          <div className="mx-auto max-w-xl">
            <div className="text-[11px] uppercase tracking-[0.32em] theme-text-muted">Empty Dex</div>
            <p className="mt-4 text-2xl font-semibold theme-text-primary">
              {isNoData
                ? '这里还没有任何模型，先把第一台作品放进展柜吧。'
                : isNoWishlist
                  ? '愿望清单还是空的，可以先把想买的机体记下来。'
                  : isNoOwned
                    ? '当前还没有已入手模型，先补充几台收藏。'
                    : '当前筛选条件下没有匹配到模型。'}
            </p>
          </div>
        </section>
      ) : (
        <section className="mt-5">
          <div className={dexGridClass}>
            {items.map((item) => (
              <div key={item.id} className="min-w-0">
                <GunplaCard item={item} variant="dex" />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default MainContent
