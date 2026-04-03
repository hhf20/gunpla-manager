import { useNavigate } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'

const statusStyleMap = {
  未拼装: 'border border-slate-400/30 bg-slate-500/20 text-slate-100',
  已拼装: 'border border-sky-400/30 bg-sky-500/20 text-sky-100',
  已涂装: 'border border-fuchsia-400/30 bg-fuchsia-500/20 text-fuchsia-100',
}

const buildStatusColorMap = {
  未开盒: 'border border-slate-400/30 bg-slate-500/20 text-slate-100',
  素组: 'border border-blue-400/30 bg-blue-500/20 text-blue-100',
  渗线: 'border border-cyan-400/30 bg-cyan-500/20 text-cyan-100',
  水贴: 'border border-violet-400/30 bg-violet-500/20 text-violet-100',
  喷涂: 'border border-orange-400/30 bg-orange-500/20 text-orange-100',
  完成: 'border border-emerald-400/30 bg-emerald-500/20 text-emerald-100',
}

function formatCurrency(value) {
  return `¥${Number(value || 0).toLocaleString('zh-CN')}`
}

function formatDiscount(item) {
  const releasePrice = Number(item.releasePrice || 0)
  const purchasePrice = Number(item.purchasePrice || 0)
  if (releasePrice <= 0 || purchasePrice <= 0) return null
  return Number(((purchasePrice / releasePrice) * 10).toFixed(1))
}

function normalizeTitlePart(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildDisplayTitle(item) {
  const parts = [
    item.grade,
    item.series,
    item.releaseType,
    item.boxNumber,
    item.modelCode,
    item.name,
  ]
    .map(normalizeTitlePart)
    .filter(Boolean)

  return parts.length > 0 ? parts.join(' ') : '未命名模型'
}

function GunplaCard({ item, onOpen = null, variant = 'default' }) {
  const isMobileCard = variant === 'mobile'
  const { openDetail } = useGunpla()
  const navigate = useNavigate()
  const isWishlist = item.type === 'wishlist'
  const discount = formatDiscount(item)
  const hoverImage =
    item.buildImages && item.buildImages.length > 0 ? item.buildImages[0] : item.coverImage

  const primaryStats = isWishlist
    ? [
        { label: '目标价', value: formatCurrency(item.expectedPrice) },
        { label: '发售价', value: formatCurrency(item.releasePrice) },
      ]
    : [
        { label: '入手价', value: formatCurrency(item.purchasePrice) },
        { label: '折扣', value: discount ? `${discount} 折` : '待补充' },
      ]

  const handleOpen = () => {
    if (typeof onOpen === 'function') onOpen(item)
    else openDetail(item.id)
  }

  const articleClass = [
    'group app-panel relative cursor-pointer overflow-hidden rounded-[28px] transition duration-300',
    isMobileCard
      ? 'border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.35)] active:scale-[0.99] active:opacity-[0.97]'
      : [
          'hover:-translate-y-1',
          isWishlist
            ? 'border-amber-400/35 shadow-[0_18px_44px_rgba(245,158,11,0.14)]'
            : 'hover:shadow-[0_24px_56px_rgba(0,0,0,0.28)]',
        ].join(' '),
  ].join(' ')

  return (
    <article onClick={handleOpen} className={articleClass}>
      <div className="relative overflow-hidden bg-slate-950/85">
        {item.coverImage ? (
          <img
            src={item.coverImage}
            alt={item.name}
            className="h-auto w-full object-contain transition duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-sm text-slate-500">
            暂无封面
          </div>
        )}

        {hoverImage && hoverImage !== item.coverImage ? (
          <img
            src={hoverImage}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0 transition duration-500 group-hover:opacity-100"
            loading="lazy"
          />
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
          {item.grade ? (
            <span className="rounded-full border border-white/10 bg-slate-950/78 px-2.5 py-1 text-[10px] tracking-[0.18em] text-slate-100">
              {item.grade}
            </span>
          ) : null}
          {isWishlist ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/20 px-2.5 py-1 text-[10px] tracking-[0.18em] text-amber-100">
              WISH
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-base font-semibold leading-6 text-white">
            {buildDisplayTitle(item)}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
            {item.scale ? <span>{item.scale}</span> : null}
            {item.purchasePlatform ? <span>{item.purchasePlatform}</span> : null}
            {item.purchaseCount > 1 ? <span>x{item.purchaseCount}</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {primaryStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-3 py-2.5"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{stat.label}</div>
              <div className="mt-1.5 text-sm font-semibold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-[11px] text-slate-300">
          {isWishlist ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {item.releaseType ? <span>贩售模式 {item.releaseType}</span> : null}
              {item.boxNumber ? <span>盒号 {normalizeTitlePart(item.boxNumber)}</span> : null}
              {item.modelCode ? <span>机体编号 {normalizeTitlePart(item.modelCode)}</span> : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>发售价 {formatCurrency(item.releasePrice)}</span>
              {item.currentPrice ? <span>当前价 {formatCurrency(item.currentPrice)}</span> : null}
              {item.boxNumber ? <span>盒号 {normalizeTitlePart(item.boxNumber)}</span> : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {!isWishlist && item.status ? (
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusStyleMap[item.status] || 'app-chip'}`}>
              {item.status}
            </span>
          ) : null}
          {item.buildStatus ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                buildStatusColorMap[item.buildStatus] ||
                'border border-slate-500/30 bg-slate-600/20 text-slate-100'
              }`}
            >
              {item.buildStatus}
            </span>
          ) : null}
        </div>

        {(item.tags || []).length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {(item.tags || []).slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-600/30 bg-slate-700/20 px-2 py-0.5 text-[11px] text-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {!isMobileCard ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end gap-2 p-4 opacity-0 transition duration-300 group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              openDetail(item.id)
            }}
            className="app-btn-secondary pointer-events-auto !rounded-xl !px-3 !py-2 !text-xs"
          >
            查看详情
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              navigate(`/edit/${item.id}`)
            }}
            className="app-btn-primary pointer-events-auto !rounded-xl !px-3 !py-2 !text-xs"
          >
            编辑
          </button>
        </div>
      ) : null}
    </article>
  )
}

export default GunplaCard
