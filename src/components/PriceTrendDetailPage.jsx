import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'
import {
  averageTrendPrice,
  buildPriceTrendChart,
  clonePriceTrend,
  normalizePriceTrendChannels,
  toPriceCurrency,
  toPriceNumber,
} from '../utils/priceTrend'

const TREND_RANGE_OPTIONS = [
  { key: '7d', label: '7天', days: 7 },
  { key: '30d', label: '30天', days: 30 },
  { key: '90d', label: '90天', days: 90 },
  { key: 'all', label: '全部', days: 0 },
]

const SECONDARY_TABS = [
  { key: 'view', label: '浏览信息' },
  { key: 'edit', label: '编辑更新' },
]

function MetricCard({ label, value, tone = '', valueTone = 'theme-text-primary' }) {
  return (
    <div className={`theme-surface-soft rounded-[8px] px-4 py-3 ${tone}`}>
      <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${valueTone}`}>{value}</div>
    </div>
  )
}

function PriceField({ label, value, onChange, placeholder = '0' }) {
  return (
    <label className="theme-surface-soft rounded-[8px] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">{label}</div>
      <input
        value={value}
        onChange={onChange}
        className="mt-2 w-full border-0 bg-transparent p-0 text-2xl font-semibold theme-text-primary outline-none"
        placeholder={placeholder}
      />
    </label>
  )
}

function channelTone(index) {
  if (index === 0) return 'theme-channel-card--a'
  if (index === 1) return 'theme-channel-card--b'
  return 'theme-channel-card--c'
}

function formatTrendDelta(delta) {
  return delta > 0 ? `+${toPriceCurrency(delta)}` : toPriceCurrency(delta)
}

function PriceTrendDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { gunplaList, savePriceTrendForGunpla, closeDetail } = useGunpla()
  const item = useMemo(
    () => gunplaList.find((entry) => String(entry.id) === String(id)) || null,
    [gunplaList, id],
  )

  const [draft, setDraft] = useState(null)
  const [weekLabel, setWeekLabel] = useState('本周')
  const [message, setMessage] = useState('')
  const [trendRange, setTrendRange] = useState('30d')
  const [trendAnchorTime] = useState(() => Date.now())
  const [secondaryTab, setSecondaryTab] = useState('view')

  useEffect(() => {
    closeDetail()
  }, [closeDetail])

  useEffect(() => {
    if (!item) return
    setDraft(clonePriceTrend(item.priceTrend))
  }, [item])

  const history = useMemo(() => draft?.history || [], [draft])
  const historyDesc = [...history].reverse()
  const channels = draft?.channels || []
  const currentAverage = averageTrendPrice(channels)
  const currentHighest = Math.max(0, ...channels.map((channel) => toPriceNumber(channel.price)))
  const historyValues = history.map((entry) => toPriceNumber(entry.averagePrice)).filter((value) => value > 0)
  const historyLowest = historyValues.length ? Math.min(...historyValues) : 0
  const delta =
    history.length > 1
      ? Number((toPriceNumber(history.at(-1)?.averagePrice) - toPriceNumber(history[0]?.averagePrice)).toFixed(1))
      : 0
  const trendHistory = useMemo(() => {
    const option = TREND_RANGE_OPTIONS.find((item) => item.key === trendRange) || TREND_RANGE_OPTIONS[3]
    if (!option.days) return history

    const cutoff = trendAnchorTime - option.days * 24 * 60 * 60 * 1000
    return history.filter((entry) => {
      const ts = new Date(entry.recordedAt || '').getTime()
      return Number.isFinite(ts) && ts >= cutoff
    })
  }, [history, trendAnchorTime, trendRange])

  const chart = buildPriceTrendChart(trendHistory, draft?.targetPrice)

  if (!item || !draft) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="theme-surface w-full max-w-xl rounded-[8px] p-8 text-center theme-text-secondary">
          没有找到对应的价格趋势数据。
        </div>
      </main>
    )
  }

  const updateChannel = (index, patch) =>
    setDraft((prev) => ({
      ...prev,
      channels: prev.channels.map((channel, channelIndex) =>
        channelIndex === index ? { ...channel, ...patch } : channel,
      ),
    }))

  const saveTrend = () => {
    savePriceTrendForGunpla(item.id, draft)
    setMessage('价格趋势已更新。')
  }

  const exitPage = () => {
    closeDetail()
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const recordThisWeek = () => {
    const nextChannels = normalizePriceTrendChannels(draft.channels)
    const average = averageTrendPrice(nextChannels)

    if (!(average > 0)) {
      setMessage('请至少填写一个有效的渠道价格后再记录本周。')
      return
    }

    const nextEntry = {
      id: `${Date.now()}`,
      label: weekLabel.trim() || '本周',
      averagePrice: average,
      recordedAt: new Date().toISOString(),
      channels: nextChannels,
    }

    setDraft((prev) => ({
      ...prev,
      history: [...prev.history, nextEntry].slice(-12),
    }))
    setMessage('已记录一条新的周度价格。')
  }

  const updateHistoryEntry = (entryId, updater) =>
    setDraft((prev) => ({
      ...prev,
      history: prev.history.map((entry) => {
        if (entry.id !== entryId) return entry
        const next = updater(entry)
        return { ...next, averagePrice: averageTrendPrice(next.channels) }
      }),
    }))

  const deleteHistoryEntry = (entryId) =>
    setDraft((prev) => ({
      ...prev,
      history: prev.history.filter((entry) => entry.id !== entryId),
    }))

  const handleCreateReminder = () => {
    window.alert('提醒功能将在后续版本接入，你可以先通过“目标入手价 + 记录本周”跟踪价格。')
  }

  return (
    <main className="app-scroll-area relative z-10 min-h-screen overflow-y-auto px-4 pb-10 pt-4 md:px-6">
      <section className="mx-auto flex max-w-[1560px] flex-col gap-5">
        <div className="flex flex-col gap-4 min-[1360px]:flex-row min-[1360px]:items-end min-[1360px]:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.34em] theme-text-muted">
              Price Command
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight theme-text-primary md:text-4xl">
              价格趋势看板
            </h1>
          </div>

          <div className="theme-toolbar flex flex-wrap items-center gap-2 rounded-[8px] px-3 py-3">
            <button
              type="button"
              onClick={exitPage}
              className="app-btn-secondary !rounded-[14px] !px-4 !py-2 !text-xs"
            >
              返回模型
            </button>
            <button
              type="button"
              onClick={saveTrend}
              className="app-btn-primary !rounded-[14px] !px-5 !py-2.5 !text-xs"
            >
              更新趋势
            </button>
          </div>
        </div>

        <section className="theme-surface overflow-hidden rounded-[8px] px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 border-b theme-border pb-5 min-[1400px]:flex-row min-[1400px]:items-end min-[1400px]:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.26em] theme-text-muted">
                <span>{item.grade || 'MODEL'}</span>
                {item.series ? <span>{item.series}</span> : null}
                {item.scale ? <span>{item.scale}</span> : null}
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight theme-text-primary md:text-3xl">
                {item.name || '未命名模型'}
              </h2>
              <p className="mt-2 text-sm leading-6 theme-text-secondary">
                {[item.releaseType || '通贩', item.boxNumber ? `盒号 ${item.boxNumber}` : '', item.modelCode || '']
                  .filter(Boolean)
                  .join(' / ')}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <section className="theme-surface-elevated rounded-[10px] border p-4 md:p-5">
              <div className="grid gap-4 min-[1400px]:grid-cols-[220px_minmax(0,1fr)]">
                <div className="theme-surface-elevated overflow-hidden rounded-[8px]">
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt={item.name || '模型封面'}
                      className="h-[280px] w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-[280px] items-center justify-center text-sm theme-text-muted">
                      暂无封面
                    </div>
                  )}
                </div>

                <div className="flex min-h-[280px] flex-col justify-between gap-3">
                  <div className="grid gap-3 sm:grid-cols-2 min-[1560px]:grid-cols-4">
                    <div className="theme-metric-card theme-metric-card--accent rounded-[8px] px-4 py-3 sm:col-span-2">
                      <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">当前均价</div>
                      <div className="mt-2 text-3xl font-semibold text-[color:var(--accent-strong)]">
                        {toPriceCurrency(currentAverage)}
                      </div>
                    </div>
                    <MetricCard
                      label="涨跌幅"
                      value={formatTrendDelta(delta)}
                      valueTone={delta > 0 ? 'text-[color:var(--danger)]' : 'text-[color:var(--success)]'}
                    />
                    <MetricCard
                      label="目标入手价"
                      value={draft.targetPrice > 0 ? toPriceCurrency(draft.targetPrice) : '未设置'}
                    />
                    <MetricCard
                      label="历史最低"
                      value={historyLowest > 0 ? toPriceCurrency(historyLowest) : '暂无'}
                      tone="theme-metric-card--danger"
                      valueTone="text-[color:var(--danger)]"
                    />
                    <MetricCard
                      label="历史最高"
                      value={currentHighest > 0 ? toPriceCurrency(currentHighest) : '暂无'}
                    />
                  </div>

                  <div className="theme-surface rounded-[8px] px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="theme-text-secondary">
                        最近记录：{history.at(-1)?.label || '暂无'}
                      </span>
                      <span className="theme-text-secondary">
                        记录条数：{history.length}
                      </span>
                      <span className="theme-text-secondary">
                        渠道数：{channels.length}
                      </span>
                    </div>
                  </div>

                  <div className="theme-surface-soft rounded-[8px] px-3 py-3">
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="theme-text-muted">日元定价</span>
                        <span className="font-medium theme-text-primary">{toPriceCurrency(draft.benchmarkPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="theme-text-muted">含税日元</span>
                        <span className="font-medium theme-text-primary">{toPriceCurrency(draft.taxIncludedPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="theme-text-muted">发售年份</span>
                        <span className="font-medium theme-text-primary">{draft.releaseYear || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="theme-text-muted">再版月份</span>
                        <span className="font-medium theme-text-primary">{draft.reissueMonth || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="theme-surface rounded-[8px] px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] theme-text-muted">
                    Trend Line
                  </div>
                  <div className="mt-1 text-base font-semibold theme-text-primary">周度均价走势</div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs theme-text-secondary">
                  <div className="theme-segmented inline-flex rounded-md p-1">
                    {TREND_RANGE_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setTrendRange(option.key)}
                        className={`rounded-md px-2.5 py-1 text-xs transition ${
                          trendRange === option.key ? 'theme-segmented-item--active' : 'theme-segmented-item'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="h-[2px] w-5 bg-[var(--accent-strong)]" />
                    周度均价
                  </span>
                  {chart.lowest > 0 ? (
                    <span className="flex items-center gap-2">
                      <span className="h-[2px] w-5 bg-[var(--danger)]" />
                      历史最低
                    </span>
                  ) : null}
                  {chart.target > 0 ? (
                    <span className="flex items-center gap-2">
                      <span className="h-[2px] w-5 border-t border-dashed border-[var(--warn)]" />
                      目标入手价
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="theme-surface-elevated mt-4 overflow-hidden rounded-[8px] px-3 py-3">
                {trendHistory.length > 0 ? (
                  <>
                    <svg viewBox={`0 0 ${chart.width} 232`} className="h-64 w-full">
                      <defs>
                        <linearGradient id="priceTrendMain" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="var(--accent-strong)" />
                          <stop offset="100%" stopColor="var(--accent-soft-solid)" />
                        </linearGradient>
                      </defs>

                      <path d={`M${chart.left} ${chart.bottom} H${chart.right}`} stroke="var(--chart-grid)" strokeWidth="1" />
                      <path d={`M${chart.left} 150 H${chart.right}`} stroke="var(--chart-grid-soft)" strokeWidth="1" />
                      <path d={`M${chart.left} 104 H${chart.right}`} stroke="var(--chart-grid-soft)" strokeWidth="1" />
                      <path d={`M${chart.left} 58 H${chart.right}`} stroke="var(--chart-grid-soft)" strokeWidth="1" />

                      {chart.lowestY !== null ? (
                        <path
                          d={`M${chart.left} ${chart.lowestY} H${chart.right}`}
                          stroke="var(--danger)"
                          strokeWidth="2"
                        />
                      ) : null}

                      {chart.targetY !== null ? (
                        <path
                          d={`M${chart.left} ${chart.targetY} H${chart.right}`}
                          stroke="var(--warn)"
                          strokeWidth="2"
                          strokeDasharray="8 8"
                        />
                      ) : null}

                      <polyline
                        fill="none"
                        stroke="url(#priceTrendMain)"
                        strokeWidth="4"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={chart.polyline}
                      />

                      {chart.dots.map((dot) => (
                        <g key={dot.id}>
                          <circle cx={dot.x} cy={dot.y} r="6" fill="var(--surface-elevated)" />
                          <circle cx={dot.x} cy={dot.y} r="4" fill="var(--accent-strong)" />
                          <text
                            x={dot.x}
                            y={dot.y - 12}
                            textAnchor="middle"
                            className="fill-[var(--text-1)] text-[12px] font-medium"
                          >
                            {dot.averagePrice}
                          </text>
                        </g>
                      ))}
                    </svg>

                    <div className="mt-3 flex justify-between gap-2 text-xs theme-text-muted">
                      {trendHistory.map((entry) => (
                        <span key={entry.id}>{entry.label}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-64 items-center justify-center px-6 text-center text-sm leading-6 theme-text-secondary">
                    当前时间范围暂无价格记录，点击上方“添加价格（记录本周）”开始积累趋势。
                  </div>
                )}
              </div>
            </section>

            <section className="theme-surface rounded-[8px] p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] theme-text-muted">Secondary Info</div>
                  <div className="mt-1 text-lg font-semibold theme-text-primary">基础信息与用户行为</div>
                </div>
                <div className="theme-segmented inline-flex rounded-md p-1">
                  {SECONDARY_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSecondaryTab(tab.key)}
                      className={`rounded-md px-2.5 py-1 text-xs transition ${
                        secondaryTab === tab.key ? 'theme-segmented-item--active' : 'theme-segmented-item'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {secondaryTab === 'view' ? (
                <div className="space-y-4">
                  <section className="theme-surface-soft rounded-[8px] p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">渠道概览</div>
                    <div className="app-scroll-area mt-3 overflow-x-auto pb-1">
                      <div className="grid min-w-[720px] grid-cols-3 gap-2">
                        {channels.map((channel, index) => (
                          <div key={channel.id || index} className="theme-surface rounded-[8px] px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">
                              {channel.label || `渠道 ${index + 1}`}
                            </div>
                            <div className="mt-1 font-semibold theme-text-primary">
                              {toPriceCurrency(channel.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="theme-surface-soft rounded-[8px] p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">最近历史</div>
                    {historyDesc.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {historyDesc.slice(0, 6).map((entry) => (
                          <div key={entry.id} className="theme-surface flex items-center justify-between rounded-[8px] px-3 py-2">
                            <span className="theme-text-secondary">{entry.label}</span>
                            <span className="font-semibold theme-text-primary">
                              {toPriceCurrency(entry.averagePrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm theme-text-secondary">暂无历史记录。</div>
                    )}
                  </section>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="theme-surface-soft rounded-[8px] p-4">
                      <div className="text-[11px] uppercase tracking-[0.24em] theme-text-muted">Actions</div>
                      <div className="mt-1 text-base font-semibold theme-text-primary">用户行为</div>
                      <div className="mt-3 flex flex-col gap-3">
                        <label>
                          <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">本周标签</div>
                          <input
                            value={weekLabel}
                            onChange={(event) => setWeekLabel(event.target.value)}
                            className="app-input mt-2 !rounded-[14px]"
                            placeholder="例如：本周 / 4月第2周"
                          />
                        </label>
                        <button type="button" onClick={recordThisWeek} className="app-btn-primary">
                          添加价格
                        </button>
                        <button type="button" onClick={saveTrend} className="app-btn-secondary">
                          收藏并保存
                        </button>
                        <button type="button" onClick={handleCreateReminder} className="app-btn-secondary">
                          价格提醒
                        </button>
                        {message ? (
                          <div className="theme-toast rounded-[8px] px-3.5 py-3 text-sm theme-text-secondary">
                            {message}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 space-y-3">
                    {channels.map((channel, index) => (
                      <div
                        key={channel.id}
                        className={`theme-channel-card rounded-[8px] px-4 py-4 ${channelTone(index)}`}
                      >
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                          <label>
                            <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">渠道名称</div>
                            <input
                              value={channel.label}
                              onChange={(event) => updateChannel(index, { label: event.target.value })}
                              className="app-input mt-2 !rounded-[14px]"
                              placeholder={`渠道 ${index + 1}`}
                            />
                          </label>
                          <label>
                            <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">当前价格</div>
                            <input
                              value={channel.price || ''}
                              onChange={(event) => updateChannel(index, { price: toPriceNumber(event.target.value) })}
                              className="app-input mt-2 !rounded-[14px]"
                              placeholder="0"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {historyDesc.length > 0 ? (
                      historyDesc.map((entry) => (
                        <section key={entry.id} className="theme-surface-soft rounded-[8px] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">
                                History Entry
                              </div>
                              <div className="mt-1 text-lg font-semibold theme-text-primary">{entry.label}</div>
                              <div className="mt-1 text-sm theme-text-secondary">
                                均价 {toPriceCurrency(entry.averagePrice)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteHistoryEntry(entry.id)}
                              className="app-btn-secondary theme-danger-ghost"
                            >
                              删除记录
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 min-[1400px]:grid-cols-4">
                            <label className="theme-surface rounded-[8px] px-4 py-3">
                              <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">标签</div>
                              <input
                                value={entry.label}
                                onChange={(event) =>
                                  updateHistoryEntry(entry.id, (current) => ({ ...current, label: event.target.value }))
                                }
                                className="mt-2 w-full border-0 bg-transparent p-0 text-lg font-semibold theme-text-primary outline-none"
                              />
                            </label>

                            <div className="grid gap-3 md:grid-cols-3 min-[1400px]:col-span-3">
                              {entry.channels.map((channel, index) => (
                                <div
                                  key={`${entry.id}-${channel.id}`}
                                  className={`theme-channel-card rounded-[8px] px-4 py-3 ${channelTone(index)}`}
                                >
                                  <div className="text-[10px] uppercase tracking-[0.18em] theme-text-secondary">
                                    {channel.label || `渠道 ${index + 1}`}
                                  </div>
                                  <input
                                    value={channel.price || ''}
                                    onChange={(event) =>
                                      updateHistoryEntry(entry.id, (current) => ({
                                        ...current,
                                        channels: current.channels.map((inner, innerIndex) =>
                                          innerIndex === index
                                            ? { ...inner, price: toPriceNumber(event.target.value) }
                                            : inner,
                                        ),
                                      }))
                                    }
                                    className="mt-2 w-full border-0 bg-transparent p-0 text-xl font-semibold theme-text-primary outline-none"
                                    placeholder="0"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      ))
                    ) : (
                      <div className="theme-surface-soft rounded-[8px] px-6 py-12 text-center text-sm leading-6 theme-text-secondary">
                        还没有任何历史记录。先维护渠道价格并点击“记录本周”，即可开始积累趋势。
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </section>
      </section>
    </main>
  )
}

export default PriceTrendDetailPage
