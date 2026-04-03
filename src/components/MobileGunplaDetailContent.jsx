import { useEffect, useMemo, useState } from 'react'
import ImagePreviewModal from './ImagePreviewModal'

const statusStyleMap = {
  未拼装: 'border border-slate-400/30 bg-slate-500/20 text-slate-100',
  已拼装: 'border border-sky-400/30 bg-sky-500/20 text-slate-100',
  已涂装: 'border border-fuchsia-400/30 bg-fuchsia-500/20 text-fuchsia-100',
}

function formatCurrency(value) {
  return `¥${Number(value || 0).toLocaleString('zh-CN')}`
}

function formatDiscount(item) {
  const releasePrice = Number(item?.releasePrice || 0)
  const purchasePrice = Number(item?.purchasePrice || 0)
  if (releasePrice <= 0 || purchasePrice <= 0) return null
  return Number(((purchasePrice / releasePrice) * 10).toFixed(1))
}

export default function MobileGunplaDetailContent({ item }) {
  const [activeTab, setActiveTab] = useState('cover')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  useEffect(() => {
    setActiveTab('cover')
    setActiveIndex(0)
  }, [item?.id])

  const isWishlist = item.type === 'wishlist'
  const purchaseCount = Number(item?.purchaseCount || 1)
  const purchaseDiscount = formatDiscount(item)
  const totalSpent = Number(item.purchasePrice || 0) * purchaseCount

  const tabImages = useMemo(() => {
    if (!item) return []
    if (activeTab === 'build') return item.buildImages || []
    if (activeTab === 'box') return item.boxImages || []
    return item.coverImage ? [item.coverImage] : []
  }, [activeTab, item])

  const safeIndex = Math.min(activeIndex, Math.max(0, tabImages.length - 1))
  const currentImage = tabImages[safeIndex] || ''

  const tabs = [
    { key: 'cover', label: '封面', count: item.coverImage ? 1 : 0 },
    { key: 'build', label: '成品', count: (item.buildImages || []).length },
    { key: 'box', label: '盒照', count: (item.boxImages || []).length },
  ]

  const infoRows = useMemo(() => {
    if (!item) return []
    if (isWishlist) {
      return [
        { label: '发售价', value: formatCurrency(item.releasePrice) },
        { label: '目标价', value: formatCurrency(item.expectedPrice) },
        { label: '发售形式', value: item.releaseType || '通贩' },
        { label: '关注渠道', value: item.purchasePlatform || '-' },
        { label: '盒子编号', value: item.boxNumber || '-' },
        { label: '机体编号', value: item.modelCode || '-' },
      ]
    }
    return [
      { label: '发售价', value: formatCurrency(item.releasePrice) },
      { label: '入手价', value: formatCurrency(item.purchasePrice) },
      { label: '到手折扣', value: purchaseDiscount ? `${purchaseDiscount} 折` : '待补充' },
      { label: '购入数量', value: String(purchaseCount) },
      { label: '累计投入', value: formatCurrency(totalSpent) },
      { label: '购入平台', value: item.purchasePlatform || '-' },
      { label: '盒子编号', value: item.boxNumber || '-' },
      { label: '机体编号', value: item.modelCode || '-' },
      { label: '拼装阶段', value: item.buildStatus || '-' },
    ]
  }, [item, isWishlist, purchaseCount, purchaseDiscount, totalSpent])

  const goPrev = () => {
    if (tabImages.length < 2) return
    setActiveIndex((prev) => (prev - 1 + tabImages.length) % tabImages.length)
  }

  const goNext = () => {
    if (tabImages.length < 2) return
    setActiveIndex((prev) => (prev + 1) % tabImages.length)
  }

  const openPreview = () => {
    if (!currentImage) return
    setIsPreviewOpen(true)
  }

  return (
    <>
      <section className="app-panel-strong rounded-[30px] p-5">
        <div className="text-[11px] uppercase tracking-[0.28em] text-sky-200/70">Model Detail</div>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">{item.name}</h2>
        <p className="mt-1 text-sm text-slate-400">
          {[item.series, item.grade, item.scale].filter(Boolean).join(' / ')}
        </p>
        {item.modelCode ? (
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{item.modelCode}</p>
        ) : null}
      </section>

      <button
        type="button"
        onClick={openPreview}
        className="group relative mt-4 block w-full overflow-hidden rounded-[24px] text-left ring-1 ring-white/10"
      >
        {currentImage || item.coverImage ? (
          <img
            src={currentImage || item.coverImage}
            alt={item.name}
            className="max-h-80 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-64 items-center justify-center bg-slate-950/70 text-sm text-slate-500">暂无图片</div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 to-transparent" />
      </button>

      <div className="mt-3 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key)
              setActiveIndex(0)
            }}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              activeTab === tab.key
                ? 'bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/30'
                : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {tabImages.length > 0 ? (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {tabImages.map((img, index) => (
            <button
              key={`${img}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`overflow-hidden rounded-xl border ${
                index === safeIndex ? 'border-cyan-300/60' : 'border-white/10'
              }`}
            >
              <img src={img} alt="" className="h-14 w-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">这个分类下暂时还没有图片。</p>
      )}

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {infoRows.map((row) => (
            <div key={row.label} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{row.label}</div>
              <div className="mt-2 text-sm font-medium text-white">{row.value}</div>
            </div>
          ))}
        </div>

        {!isWishlist ? (
          <div className="rounded-[22px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-300">
            当前价 {formatCurrency(item.currentPrice)}
            {item.purchaseDate ? (
              <span className="ml-4 text-slate-400">购入日期 {item.purchaseDate}</span>
            ) : null}
          </div>
        ) : null}

        {item.reissuePrice ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
            再版价格 {formatCurrency(item.reissuePrice)}
          </div>
        ) : null}

        {!isWishlist ? (
          <div className="flex flex-wrap gap-2">
            {item.status ? (
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${statusStyleMap[item.status] || 'app-chip'}`}
              >
                {item.status}
              </span>
            ) : null}
            {item.buildStatus ? (
              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-2.5 py-1 text-xs text-cyan-100">
                拼装阶段：{item.buildStatus}
              </span>
            ) : null}
            {item.releaseType ? <span className="app-chip">{item.releaseType}</span> : null}
          </div>
        ) : (
          <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-2.5 py-1 text-xs text-amber-100">
            愿望单
          </span>
        )}

        {(item.tags || []).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-500/25 bg-slate-700/20 px-2.5 py-1 text-xs text-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">备注</div>
          <p className="mt-3 text-sm leading-6 text-slate-200">{item.note || '暂无备注'}</p>
        </div>
      </div>

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        images={tabImages}
        currentIndex={safeIndex}
        onClose={() => setIsPreviewOpen(false)}
        onPrev={goPrev}
        onNext={goNext}
      />
    </>
  )
}
