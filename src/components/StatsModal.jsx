import { useMemo } from 'react'
import { useGunpla } from '../context/GunplaContext'

function formatCurrency(value) {
  return `￥${Number(value || 0).toLocaleString('zh-CN')}`
}

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
      if (item.grade) byGrade[item.grade] = (byGrade[item.grade] || 0) + 1
      if (item.series) bySeries[item.series] = (bySeries[item.series] || 0) + 1
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
    { label: '总数', value: stats.total, tone: 'theme-text-primary' },
    {
      label: '收藏 / 愿望 / 完成',
      value: `${stats.owned} / ${stats.wishlist} / ${stats.completed}`,
      tone: 'theme-text-secondary',
    },
    { label: '累计投入', value: formatCurrency(stats.totalCost), tone: 'theme-text-primary' },
    {
      label: '浮动盈亏',
      value: formatCurrency(stats.pnl),
      tone: stats.pnl >= 0 ? 'text-emerald-700' : 'text-rose-700',
    },
    { label: '平均入手价', value: formatCurrency(stats.avgBuy), tone: 'theme-text-primary' },
    { label: '最高当前价', value: formatCurrency(stats.maxCurrent), tone: 'theme-text-secondary' },
  ]

  const renderMap = (title, mapObj) => {
    const entries = Object.entries(mapObj).sort((a, b) => Number(b[1]) - Number(a[1]))

    return (
      <section
        className="theme-surface rounded-[8px] p-4"
      >
        <h4 className="text-sm font-semibold theme-text-primary">{title}</h4>
        {entries.length === 0 ? (
          <div className="mt-3 text-sm theme-text-muted">暂无数据</div>
        ) : (
          <div className="mt-3 space-y-2">
            {entries.map(([key, value]) => (
              <div key={key} className="dex-stat-row">
                <span className="text-sm font-medium theme-text-primary">{key}</span>
                <span className="text-sm theme-text-secondary">{value}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <div
      className={`dex-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 transition ${
        isStatsOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={closeStats}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`dex-modal-panel w-full max-w-4xl overflow-hidden rounded-[8px] p-5 transition ${
          isStatsOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <div>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] theme-text-muted">Collection Insight</div>
              <h3 className="mt-2 text-2xl font-semibold theme-text-primary">统计分析</h3>
              <p className="mt-1 text-sm theme-text-secondary">从收藏数量、投入金额和拼装进度三个维度快速查看当前模型库状态。</p>
            </div>
            <button onClick={closeStats} className="app-btn-secondary !rounded-full !px-4 !py-2">
              关闭
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.label}
                className="theme-surface rounded-[8px] p-4"
              >
                <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">
                  {card.label}
                </div>
                <div className={`mt-3 text-2xl font-semibold ${card.tone}`}>{card.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 app-scroll-area max-h-[48vh] space-y-3 overflow-y-auto pr-1">
            {renderMap('按 Grade 分布', stats.byGrade)}
            {renderMap('按系列分布', stats.bySeries)}
            {renderMap('按拼装阶段分布', stats.byBuild)}
            {renderMap('按月份购入趋势', stats.byMonth)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsModal
