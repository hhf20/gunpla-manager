import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'
import ImagePreviewModal from './ImagePreviewModal'

const statusStyleMap = {
  未拼装: 'border border-slate-400/30 bg-slate-500/20 text-slate-100',
  已拼装: 'border border-blue-400/30 bg-blue-500/20 text-blue-100',
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

function DetailDrawer() {
  const { selectedGunpla, isDetailOpen, closeDetail, deleteGunpla } = useGunpla()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('cover')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const isWishlist = selectedGunpla?.type === 'wishlist'
  const purchaseCount = Number(selectedGunpla?.purchaseCount || 1)
  const purchaseDiscount = formatDiscount(selectedGunpla)
  const totalSpent = Number(selectedGunpla?.purchasePrice || 0) * purchaseCount

  useEffect(() => {
    setActiveTab('cover')
    setActiveIndex(0)
  }, [selectedGunpla?.id, isDetailOpen])

  const tabImages = useMemo(() => {
    if (!selectedGunpla) return []
    if (activeTab === 'build') return selectedGunpla.buildImages || []
    if (activeTab === 'box') return selectedGunpla.boxImages || []
    return selectedGunpla.coverImage ? [selectedGunpla.coverImage] : []
  }, [activeTab, selectedGunpla])

  const safeIndex = Math.min(activeIndex, Math.max(0, tabImages.length - 1))
  const currentImage = tabImages[safeIndex] || ''

  const handleDelete = () => {
    if (!selectedGunpla) return
    const ok = window.confirm(`确认删除「${selectedGunpla.name}」吗？`)
    if (!ok) return
    deleteGunpla(selectedGunpla.id)
  }

  const handleEdit = () => {
    if (!selectedGunpla) return
    navigate(`/edit/${selectedGunpla.id}`)
    closeDetail()
  }

  const openPreview = () => {
    if (!currentImage) return
    setIsPreviewOpen(true)
  }

  const goPrev = () => {
    if (tabImages.length < 2) return
    setActiveIndex((prev) => (prev - 1 + tabImages.length) % tabImages.length)
  }

  const goNext = () => {
    if (tabImages.length < 2) return
    setActiveIndex((prev) => (prev + 1) % tabImages.length)
  }

  const tabs = [
    { key: 'cover', label: '封面', count: selectedGunpla?.coverImage ? 1 : 0 },
    { key: 'build', label: '成品', count: (selectedGunpla?.buildImages || []).length },
    { key: 'box', label: '盒照', count: (selectedGunpla?.boxImages || []).length },
  ]

  const infoRows = isWishlist
    ? [
        { label: '发售价', value: formatCurrency(selectedGunpla?.releasePrice) },
        { label: '目标价', value: formatCurrency(selectedGunpla?.expectedPrice) },
        { label: '发售形式', value: selectedGunpla?.releaseType || '通贩' },
        { label: '关注渠道', value: selectedGunpla?.purchasePlatform || '-' },
      ]
    : [
        { label: '发售价', value: formatCurrency(selectedGunpla?.releasePrice) },
        { label: '入手价', value: formatCurrency(selectedGunpla?.purchasePrice) },
        { label: '到手折扣', value: purchaseDiscount ? `${purchaseDiscount} 折` : '待补充' },
        { label: '购入数量', value: purchaseCount },
        { label: '累计投入', value: formatCurrency(totalSpent) },
        { label: '购入平台', value: selectedGunpla?.purchasePlatform || '-' },
      ]

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition duration-300 ${
          isDetailOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeDetail}
      />

      <aside
        className={`app-panel-strong fixed right-0 top-0 z-40 h-full w-full max-w-[480px] rounded-none border-l border-white/10 p-5 transition-transform duration-300 ${
          isDetailOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedGunpla ? (
          <div className="flex h-full flex-col">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.28em] text-sky-200/70">Model Detail</div>
                <h3 className="mt-2 truncate text-2xl font-semibold text-white">{selectedGunpla.name}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {[selectedGunpla.series, selectedGunpla.grade, selectedGunpla.scale].filter(Boolean).join(' / ')}
                </p>
                {selectedGunpla.modelCode ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {selectedGunpla.modelCode}
                  </p>
                ) : null}
              </div>

              <button onClick={closeDetail} className="app-btn-secondary !rounded-full !px-3.5 !py-2 !text-xs">
                关闭
              </button>
            </div>

            <button onClick={openPreview} className="group relative block overflow-hidden rounded-[24px]">
              {currentImage || selectedGunpla.coverImage ? (
                <img
                  src={currentImage || selectedGunpla.coverImage}
                  alt={selectedGunpla.name}
                  className="h-64 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-64 items-center justify-center bg-slate-950/70 text-sm text-slate-500">
                  暂无图片
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 to-transparent" />
            </button>

            <div className="mt-3 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
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

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
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
                  当前价 {formatCurrency(selectedGunpla?.currentPrice)}
                  {selectedGunpla?.purchaseDate ? (
                    <span className="ml-4 text-slate-400">购入日期 {selectedGunpla.purchaseDate}</span>
                  ) : null}
                </div>
              ) : null}

              {selectedGunpla?.reissuePrice ? (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
                  再版价格 {formatCurrency(selectedGunpla.reissuePrice)}
                </div>
              ) : null}

              {!isWishlist ? (
                <div className="flex flex-wrap gap-2">
                  {selectedGunpla.status ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs ${statusStyleMap[selectedGunpla.status] || 'app-chip'}`}>
                      {selectedGunpla.status}
                    </span>
                  ) : null}
                  {selectedGunpla.buildStatus ? (
                    <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-2.5 py-1 text-xs text-cyan-100">
                      拼装阶段：{selectedGunpla.buildStatus}
                    </span>
                  ) : null}
                  {selectedGunpla.releaseType ? (
                    <span className="app-chip">{selectedGunpla.releaseType}</span>
                  ) : null}
                </div>
              ) : (
                <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-2.5 py-1 text-xs text-amber-100">
                  愿望单
                </span>
              )}

              {(selectedGunpla.tags || []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedGunpla.tags.map((tag) => (
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
                <p className="mt-3 text-sm leading-6 text-slate-200">{selectedGunpla.note || '暂无备注'}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-3 border-t border-white/10 pt-4">
              <button onClick={handleEdit} className="app-btn-primary flex-1">
                编辑模型
              </button>
              <button
                onClick={handleDelete}
                className="app-btn-secondary flex-1 !border-rose-400/20 !text-rose-100 hover:!bg-rose-500/12"
              >
                删除
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">未选择模型</div>
        )}
      </aside>

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

export default DetailDrawer
