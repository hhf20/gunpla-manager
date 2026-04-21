import { useNavigate } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'
import {
  averageTrendPrice,
  toPriceCurrency,
} from '../utils/priceTrend'

function getChannels(item) {
  return (item?.priceTrend?.channels || []).slice(0, 3)
}

function getLatestAverage(item) {
  const history = Array.isArray(item?.priceTrend?.history) ? item.priceTrend.history : []
  if (history.length > 0) return Number(history.at(-1)?.averagePrice || 0)

  const prices = getChannels(item)
    .map((channel) => Number(channel?.price || 0))
    .filter((value) => value > 0)

  if (!prices.length) return 0
  return averageTrendPrice(getChannels(item))
}

function PriceTrendPanel({ item }) {
  const navigate = useNavigate()
  const { closeDetail } = useGunpla()

  const history = Array.isArray(item?.priceTrend?.history) ? item.priceTrend.history.slice(-5) : []
  const latest = history.at(-1) || null
  const earliest = history[0] || null
  const delta =
    latest && earliest
      ? Number(latest.averagePrice || 0) - Number(earliest.averagePrice || 0)
      : 0
  const channels = getChannels(item)
  const latestAverage = getLatestAverage(item)
  const hasAnyData =
    history.length > 0 || channels.some((channel) => Number(channel?.price || 0) > 0)

  return (
    <section className="rounded-[10px] border border-white/20 bg-[#1a1f2b] p-4 text-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/15 pb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            Price Trend
          </div>
          <div className="mt-2 text-base font-semibold text-slate-100">市场价格趋势</div>
          <div className="mt-1 text-xs text-slate-300">
            展示最近趋势摘要，完整维护请进入详情页。
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            closeDetail()
            navigate(`/price-trend/${item.id}`)
          }}
          className="rounded-md border border-white/20 bg-[#232a3a] px-3 py-1.5 text-xs text-slate-100 transition hover:bg-[#2d3650]"
        >
          查看详情
        </button>
      </div>

      {!hasAnyData ? (
        <div className="mt-4 rounded-[8px] border border-dashed border-white/20 bg-[#141926] px-4 py-5 text-sm text-slate-300">
          还没有任何价格趋势数据。你可以在详情页里维护 3 个渠道价格、目标入手价，
          然后按周记录走势。
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[8px] border border-white/15 bg-[#232a3a] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">当前均价</div>
              <div className="mt-2 text-base font-semibold text-slate-100">
                {toPriceCurrency(latestAverage)}
              </div>
            </div>

            <div className="rounded-[8px] border border-white/15 bg-[#232a3a] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">区间变化</div>
              <div className={`mt-2 text-base font-semibold ${delta <= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {delta >= 0 ? '+' : ''}
                {toPriceCurrency(delta)}
              </div>
            </div>

            <div className="rounded-[8px] border border-white/15 bg-[#232a3a] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">维护渠道</div>
              <div className="mt-2 text-base font-semibold text-slate-100">{channels.length} 个</div>
            </div>
          </div>

          <div className="mt-4 rounded-[8px] border border-white/15 bg-[#141926] p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">最近记录</div>
            {history.length > 0 ? (
              <div className="mt-2 space-y-2">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-md bg-[#232a3a] px-3 py-2 text-sm">
                    <span className="text-slate-300">{entry.label}</span>
                    <span className="font-semibold text-slate-100">{toPriceCurrency(entry.averagePrice)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-300">当前已填写渠道价格，但还没有周度记录。</div>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {channels.map((channel, index) => (
              <div key={channel.id || index} className="rounded-[8px] border border-white/15 bg-[#232a3a] px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  {channel.label || `渠道 ${index + 1}`}
                </div>
                <div className="mt-2 text-base font-semibold text-slate-100">
                  {toPriceCurrency(channel.price)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export default PriceTrendPanel
