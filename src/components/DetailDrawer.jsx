import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'
import ImagePreviewModal from './ImagePreviewModal'
import PriceTrendPanel from './PriceTrendPanel'
import { saveDesktopMainScrollPosition } from '../utils/desktopScroll'

const statusStyleMap = {
  未拼装: 'theme-pill theme-pill-muted',
  已拼装: 'theme-pill theme-pill-info',
  已涂装: 'theme-pill theme-pill-accent',
}

function formatCurrency(value) {
  return `￥${Number(value || 0).toLocaleString('zh-CN')}`
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
    saveDesktopMainScrollPosition()
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
        { label: '贩售形式', value: selectedGunpla?.releaseType || '通贩' },
        { label: '关注渠道', value: selectedGunpla?.purchasePlatform || '-' },
      ]
    : [
        { label: '发售价', value: formatCurrency(selectedGunpla?.releasePrice) },
        { label: '入手价', value: formatCurrency(selectedGunpla?.purchasePrice) },
        { label: '到手折扣', value: purchaseDiscount ? `${purchaseDiscount} 折` : '待补全' },
        { label: '购入数量', value: purchaseCount },
        { label: '累计投入', value: formatCurrency(totalSpent) },
        { label: '购入平台', value: selectedGunpla?.purchasePlatform || '-' },
      ]

  return (
    <>
      <div
        className={`dex-modal-backdrop fixed inset-0 z-30 transition duration-300 ${
          isDetailOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeDetail}
      />

      <aside
        className={`dex-modal-panel fixed z-40 transition-transform duration-300 ${
          `right-0 top-0 h-full w-full max-w-[420px] rounded-none border-l theme-border p-4 ${
            isDetailOpen ? 'translate-x-0' : 'translate-x-full'
          }`
        }`}
      >
        {selectedGunpla ? (
          <div className="flex h-full flex-col">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.28em] theme-text-muted">
                  Model Detail
                </div>
                <h3 className="mt-2 truncate text-2xl font-semibold theme-text-primary">{selectedGunpla.name}</h3>
                <p className="mt-1 text-sm theme-text-secondary">
                  {[selectedGunpla.series, selectedGunpla.grade, selectedGunpla.scale].filter(Boolean).join(' / ')}
                </p>
                {selectedGunpla.modelCode ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] theme-text-muted">
                    {selectedGunpla.modelCode}
                  </p>
                ) : null}
                <p className="mt-2 max-w-md text-sm leading-6 theme-text-secondary">
                  图鉴详情面板
                </p>
              </div>

              <button onClick={closeDetail} className="app-btn-secondary !rounded-full !px-3.5 !py-2 !text-xs">
                关闭
              </button>
            </div>

            <button
              onClick={openPreview}
              className="group relative block overflow-hidden rounded-md"
            >
              {currentImage || selectedGunpla.coverImage ? (
                <img
                  src={currentImage || selectedGunpla.coverImage}
                  alt={selectedGunpla.name}
                  className={`w-full transition duration-500 group-hover:scale-[1.02] ${
                    'h-64 object-cover'
                  }`}
                />
              ) : (
                <div className="theme-surface-elevated flex h-64 items-center justify-center text-sm theme-text-muted">
                  暂无图片
                </div>
              )}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(20,20,20,0.78)] to-transparent"
              />
            </button>

            <div className="theme-segmented mt-3 inline-flex flex-wrap gap-2 rounded-[16px] p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key)
                    setActiveIndex(0)
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    activeTab === tab.key
                      ? 'theme-segmented-item--active'
                      : 'theme-segmented-item'
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
                      index === safeIndex
                        ? 'border-[color:var(--accent-strong)] shadow-[0_0_0_1px_rgba(95,70,51,0.08)]'
                        : 'theme-border bg-[color:var(--surface-soft)]'
                    }`}
                  >
                    <img src={img} alt="" className="h-14 w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs theme-text-muted">这个分类下暂时还没有图片。</p>
            )}

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                {infoRows.map((row) => (
                  <div
                    key={row.label}
                    className="theme-surface rounded-md p-3"
                  >
                    <div className="text-xs uppercase tracking-[0.2em] theme-text-muted">{row.label}</div>
                    <div className="mt-2 text-sm font-medium theme-text-primary">{row.value}</div>
                  </div>
                ))}
              </div>

              {!isWishlist ? (
                <div
                  className="theme-surface-soft rounded-md px-4 py-3 text-sm theme-text-secondary"
                >
                  当前价 {formatCurrency(selectedGunpla?.currentPrice)}
                  {selectedGunpla?.purchaseDate ? (
                    <span className="ml-4 theme-text-muted">购入日期 {selectedGunpla.purchaseDate}</span>
                  ) : null}
                </div>
              ) : null}

              {selectedGunpla?.reissuePrice ? (
                <div
                  className="theme-surface rounded-md p-3 text-sm theme-text-secondary"
                >
                  再版价格 {formatCurrency(selectedGunpla.reissuePrice)}
                </div>
              ) : null}

              {!isWishlist ? (
                <div className="flex flex-wrap gap-2">
                  {selectedGunpla.status ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs ${statusStyleMap[selectedGunpla.status] || 'theme-pill theme-pill-muted'}`}>
                      {selectedGunpla.status}
                    </span>
                  ) : null}
                  {selectedGunpla.buildStatus ? (
                    <span className="theme-pill theme-pill-info px-2.5 py-1 text-xs">
                      拼装阶段：{selectedGunpla.buildStatus}
                    </span>
                  ) : null}
                  {selectedGunpla.releaseType ? <span className="app-chip">{selectedGunpla.releaseType}</span> : null}
                </div>
              ) : (
                <span className="theme-pill theme-pill-accent px-2.5 py-1 text-xs">
                  愿望单
                </span>
              )}

              {(selectedGunpla.tags || []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedGunpla.tags.map((tag) => (
                    <span
                      key={tag}
                      className="theme-surface-soft rounded-full px-2.5 py-1 text-xs theme-text-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <PriceTrendPanel item={selectedGunpla} />

              <div
                className="theme-surface rounded-md p-4"
              >
                <div className="text-xs uppercase tracking-[0.2em] theme-text-muted">备注</div>
                <p className="mt-3 text-sm leading-6 theme-text-secondary">{selectedGunpla.note || '暂无备注'}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 border-t theme-border pt-4 md:grid-cols-2">
              <button onClick={handleEdit} className="app-btn-primary">
                编辑模型
              </button>
              <button
                onClick={handleDelete}
                className="app-btn-secondary theme-danger-ghost"
              >
                删除
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm theme-text-secondary">未选择模型</div>
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
