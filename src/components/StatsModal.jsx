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
    const totalCurrent = owned.reduce(
      (sum, item) => sum + (item.currentPrice || 0) * (item.purchaseCount || 1),
      0,
    )
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

  const cards = [
    { label: '总数', value: stats.total, tone: 'text-white' },
    {
      label: '收藏 / 愿望 / 完成',
      value: `${stats.owned} / ${stats.wishlist} / ${stats.completed}`,
      tone: 'text-cyan-100',
    },
    { label: '累计投入', value: `¥${stats.totalCost.toLocaleString('zh-CN')}`, tone: 'text-white' },
    {
      label: '浮动盈亏',
      value: `¥${stats.pnl.toLocaleString('zh-CN')}`,
      tone: stats.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300',
    },
    { label: '平均入手价', value: `¥${stats.avgBuy.toLocaleString('zh-CN')}`, tone: 'text-white' },
    { label: '最高当前价', value: `¥${stats.maxCurrent.toLocaleString('zh-CN')}`, tone: 'text-amber-200' },
  ]

  const renderMap = (title, mapObj) => (
    <section className="rounded-[24px] border border-white/10 bg-black/10 p-4">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(mapObj).length === 0 ? (
          <span className="text-sm text-slate-500">暂无数据</span>
        ) : (
          Object.entries(mapObj).map(([key, value]) => (
            <span key={key} className="app-chip">
              {key}: {value}
            </span>
          ))
        )}
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
        className={`app-panel-strong relative w-full max-w-4xl overflow-hidden rounded-[32px] p-5 transition ${
          isStatsOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,212,255,0.13),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_45%)]" />

        <div className="relative">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-sky-200/70">
                Collection Insight
              </div>
              <h3 className="mt-2 text-2xl font-semibold text-white">统计分析</h3>
              <p className="mt-1 text-sm text-slate-400">像展柜后的数据卡片，帮助你快速看清收藏结构和投入分布。</p>
            </div>
            <button onClick={closeStats} className="app-btn-secondary !rounded-full !px-4 !py-2">
              关闭
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4"
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  {card.label}
                </div>
                <div className={`mt-3 text-2xl font-semibold ${card.tone}`}>{card.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 max-h-[48vh] space-y-3 overflow-y-auto pr-1">
            {renderMap('按 Grade 分布', stats.byGrade)}
            {renderMap('按系列分布', stats.bySeries)}
            {renderMap('按拼装进度分布', stats.byBuild)}
            {renderMap('按月购入趋势', stats.byMonth)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsModal
