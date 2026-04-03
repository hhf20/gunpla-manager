import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'

function MobileStatsPage() {
  const navigate = useNavigate()
  const { gunplaList } = useGunpla()

  const stats = useMemo(() => {
    const owned = gunplaList.filter((item) => item.type === 'owned')
    const wishlist = gunplaList.filter((item) => item.type === 'wishlist')
    const totalCost = owned.reduce(
      (sum, item) => sum + (item.purchasePrice || 0) * (item.purchaseCount || 1),
      0,
    )
    const byGrade = {}
    const bySeries = {}

    gunplaList.forEach((item) => {
      const grade = item.grade || '未分类'
      const series = item.series || '未分类'
      byGrade[grade] = (byGrade[grade] || 0) + 1
      bySeries[series] = (bySeries[series] || 0) + 1
    })

    return {
      total: gunplaList.length,
      owned: owned.length,
      wishlist: wishlist.length,
      totalCost,
      byGrade,
      bySeries,
      ownedRate: gunplaList.length ? Math.round((owned.length / gunplaList.length) * 100) : 0,
    }
  }, [gunplaList])

  const renderMap = (title, mapObj) => {
    const entries = Object.entries(mapObj).sort((a, b) => b[1] - a[1])
    return (
      <section className="app-panel rounded-[26px] p-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {entries.length === 0 ? (
            <span className="text-xs text-slate-500">暂无数据</span>
          ) : (
            entries.map(([key, value]) => (
              <span key={key} className="app-chip">
                {key} · {value}
              </span>
            ))
          )}
        </div>
      </section>
    )
  }

  if (stats.total === 0) {
    return (
      <main className="px-4 pb-28 pt-4">
        <div className="app-panel rounded-[28px] px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-white">暂无统计数据</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            请先在「藏品」页导入桌面端导出的 JSON 数据包。
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="app-btn-primary mt-6 !rounded-full !px-6 !py-3 !text-sm"
          >
            去藏品页
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 pb-28 pt-4">
      <section className="app-panel-strong rounded-[30px] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-sky-200/70">Collection Stats</div>
            <h1 className="mt-3 text-2xl font-semibold text-white">移动统计看板</h1>
            <p className="mt-2 text-sm text-slate-400">
              用更轻量的方式查看收藏数量、投入规模和主要分布。
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="app-btn-secondary shrink-0 !rounded-full !px-4 !py-2 !text-xs"
          >
            返回
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
            <div className="text-[11px] text-slate-400">模型总数</div>
            <div className="mt-2 text-2xl font-semibold text-white">{stats.total}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
            <div className="text-[11px] text-slate-400">收藏占比</div>
            <div className="mt-2 text-2xl font-semibold text-cyan-100">{stats.ownedRate}%</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
            <div className="text-[11px] text-slate-400">收藏 / 愿望</div>
            <div className="mt-2 text-lg font-semibold text-white">
              {stats.owned} / {stats.wishlist}
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
            <div className="text-[11px] text-slate-400">累计投入</div>
            <div className="mt-2 text-lg font-semibold text-emerald-100">
              ￥{stats.totalCost.toLocaleString('zh-CN')}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 space-y-4">
        {renderMap('按 Grade 分布', stats.byGrade)}
        {renderMap('按系列分布', stats.bySeries)}
      </div>
    </main>
  )
}

export default MobileStatsPage
