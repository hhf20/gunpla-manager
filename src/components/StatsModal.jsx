import { useMemo } from 'react'
import { useGunpla } from '../context/GunplaContext'

function StatsModal() {
  const { isStatsOpen, closeStats, gunplaList } = useGunpla()

  const stats = useMemo(() => {
    const owned = gunplaList.filter((item) => item.type === 'owned')
    const wishlist = gunplaList.filter((item) => item.type === 'wishlist')
    const totalTimes = owned.reduce((sum, item) => sum + (item.purchaseCount || 1), 0)
    const totalCost = owned.reduce(
      (sum, item) => sum + (item.purchasePrice || 0) * (item.purchaseCount || 1),
      0,
    )
    const totalCurrent = owned.reduce((sum, item) => sum + (item.currentPrice || 0), 0)
    const pnl = totalCurrent - totalCost
    const avgBuy = totalTimes ? Math.round(totalCost / totalTimes) : 0
    const maxCurrent = owned.reduce((max, item) => Math.max(max, item.currentPrice || 0), 0)

    const byGrade = {}
    const bySeries = {}
    const byBuild = {}
    const byMonth = {}

    gunplaList.forEach((item) => {
      byGrade[item.grade] = (byGrade[item.grade] || 0) + 1
      bySeries[item.series] = (bySeries[item.series] || 0) + 1
      byBuild[item.buildStatus || '未定义'] = (byBuild[item.buildStatus || '未定义'] || 0) + 1
      if (item.purchaseDate) {
        const month = item.purchaseDate.slice(0, 7)
        byMonth[month] = (byMonth[month] || 0) + (item.purchaseCount || 1)
      }
    })

    return {
      total: gunplaList.length,
      owned: owned.length,
      wishlist: wishlist.length,
      completed: gunplaList.filter((item) => item.buildStatus === '完成').length,
      totalCost,
      pnl,
      avgBuy,
      maxCurrent,
      byGrade,
      bySeries,
      byBuild,
      byMonth,
    }
  }, [gunplaList])

  const renderMap = (title, mapObj) => (
    <section className="rounded-xl border border-zinc-800 p-3">
      <h4 className="mb-2 text-sm font-semibold text-zinc-200">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {Object.entries(mapObj).map(([key, value]) => (
          <span key={key} className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
            {key}: {value}
          </span>
        ))}
      </div>
    </section>
  )

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition ${
        isStatsOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={closeStats}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl transition ${
          isStatsOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-zinc-100">统计分析</h3>
          <button
            onClick={closeStats}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition hover:brightness-110"
          >
            关闭
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 p-3 text-sm text-zinc-300">
            总数：{stats.total}
          </div>
          <div className="rounded-xl border border-zinc-800 p-3 text-sm text-zinc-300">
            已拥有：{stats.owned} / 愿望：{stats.wishlist} / 完成：{stats.completed}
          </div>
          <div className="rounded-xl border border-zinc-800 p-3 text-sm text-zinc-300">
            总花费：￥{stats.totalCost}
          </div>
          <div className="rounded-xl border border-zinc-800 p-3 text-sm text-zinc-300">
            总盈亏：<span className={stats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>￥{stats.pnl}</span>
          </div>
          <div className="rounded-xl border border-zinc-800 p-3 text-sm text-zinc-300">
            均价：￥{stats.avgBuy}
          </div>
          <div className="rounded-xl border border-zinc-800 p-3 text-sm text-zinc-300">
            最高当前价：￥{stats.maxCurrent}
          </div>
        </div>
        <div className="mt-4 space-y-3 max-h-[45vh] overflow-y-auto pr-1">
          {renderMap('按等级分布', stats.byGrade)}
          {renderMap('按系列分布', stats.bySeries)}
          {renderMap('按拼装状态分布', stats.byBuild)}
          {renderMap('按月购入次数趋势', stats.byMonth)}
        </div>
      </div>
    </div>
  )
}

export default StatsModal
