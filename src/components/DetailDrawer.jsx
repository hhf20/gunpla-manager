import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'
import ImagePreviewModal from './ImagePreviewModal'
import ModelCommentsSection from './ModelCommentsSection'

const statusStyleMap = {
  未拼装: 'bg-gray-500 text-white',
  已拼装: 'bg-blue-500 text-white',
  已涂装: 'bg-purple-500 text-white',
}

function DetailDrawer() {
  const {
    selectedGunpla,
    isDetailOpen,
    closeDetail,
    deleteGunpla,
  } = useGunpla()
  const navigate = useNavigate()

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
  const isWishlist = selectedGunpla?.type === 'wishlist'
  const purchaseCount = Number(selectedGunpla?.purchaseCount || 1)
  const purchaseDiscount =
    !isWishlist &&
    Number(selectedGunpla?.releasePrice) > 0 &&
    Number(selectedGunpla?.purchasePrice) > 0
      ? Number(
          ((Number(selectedGunpla.purchasePrice) / Number(selectedGunpla.releasePrice)) * 100).toFixed(
            1,
          ),
        )
      : null
  const totalSpent = Number(selectedGunpla?.purchasePrice || 0) * (purchaseCount || 1)
  const [activeTab, setActiveTab] = useState('cover')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

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

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/45 transition duration-300 ${
          isDetailOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        onClick={closeDetail}
      />
      <aside
        className={`fixed right-0 top-0 z-40 h-full w-full max-w-[400px] bg-zinc-900 border-l border-zinc-800 p-5 shadow-2xl transition-transform duration-300 ${
          isDetailOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedGunpla ? (
          <div className="flex h-full flex-col">
            <button onClick={openPreview} className="group relative block">
              <img
                src={currentImage || selectedGunpla.coverImage}
                alt={selectedGunpla.name}
                className="h-52 w-full rounded-xl object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            </button>
            <div className="mt-3 flex gap-2">
              {[
                { key: 'cover', label: '封面', count: selectedGunpla.coverImage ? 1 : 0 },
                {
                  key: 'build',
                  label: '成品',
                  count: (selectedGunpla.buildImages || []).length,
                },
                { key: 'box', label: '盒照', count: (selectedGunpla.boxImages || []).length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key)
                    setActiveIndex(0)
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs transition ${
                    activeTab === tab.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:brightness-110'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            {tabImages.length > 0 ? (
              <div className="mt-2 grid grid-cols-5 gap-2">
                {tabImages.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    onClick={() => setActiveIndex(idx)}
                    className={`overflow-hidden rounded-md border ${
                      idx === safeIndex ? 'border-blue-500' : 'border-zinc-700'
                    }`}
                  >
                    <img src={img} alt="" className="h-12 w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">该分类暂无图片</p>
            )}
            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
              <div>
                <h3 className="text-2xl font-bold text-zinc-100">{selectedGunpla.name}</h3>
                {selectedGunpla.modelCode ? (
                  <p className="mt-1 text-xs text-zinc-500">{selectedGunpla.modelCode}</p>
                ) : null}
                <p className="mt-1 text-sm text-zinc-400">
                  {selectedGunpla.series} / {selectedGunpla.grade} / {selectedGunpla.scale}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-800 p-3 text-sm">
                <p className="text-zinc-300">
                  {selectedGunpla.reissuePrice
                    ? `初版：￥${selectedGunpla.releasePrice || 0} → 再版：￥${selectedGunpla.reissuePrice}`
                    : `初版：￥${selectedGunpla.releasePrice || 0}`}
                </p>
                <p className="mt-1 text-zinc-400">
                  发售方式：{selectedGunpla.releaseType || '通贩'} · 平台：
                  {selectedGunpla.purchasePlatform || '-'}
                </p>
                {isWishlist ? (
                  <p className="text-yellow-300">期望价：￥{selectedGunpla.expectedPrice || 0}</p>
                ) : (
                  <>
                    <p className="text-zinc-400">购买价：￥{selectedGunpla.purchasePrice}</p>
                    <p className="mt-1 text-zinc-500">购买次数：{purchaseCount}</p>
                    {purchaseDiscount !== null ? (
                      <p
                        className={
                          purchaseDiscount > 7
                            ? 'text-red-400'
                            : purchaseDiscount <= 5
                              ? 'text-emerald-400'
                              : 'text-yellow-300'
                        }
                      >
                        到手：{purchaseDiscount}算
                      </p>
                    ) : null}
                    <p className="mt-1 text-emerald-400">合计花费：￥{totalSpent}</p>
                  </>
                )}
                <p className="mt-1 text-emerald-400">当前价：￥{selectedGunpla.currentPrice}</p>
              </div>

              {isWishlist ? (
                <span className="inline-flex rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs text-yellow-300">
                  想买
                </span>
              ) : (
                <div className="flex gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
                      statusStyleMap[selectedGunpla.status]
                    }`}
                  >
                    {selectedGunpla.status}
                  </span>
                  {selectedGunpla.buildStatus ? (
                    <span className="inline-flex rounded-full bg-blue-500/20 px-2.5 py-1 text-xs text-blue-300">
                      拼装：{selectedGunpla.buildStatus}
                    </span>
                  ) : null}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedGunpla.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="bg-zinc-700 px-2 py-1 rounded-md text-xs text-zinc-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="rounded-xl bg-zinc-800 p-3">
                <p className="text-xs text-zinc-400">备注</p>
                <p className="mt-2 text-sm text-zinc-200">
                  {selectedGunpla.note || '暂无备注'}
                </p>
              </div>

              <ModelCommentsSection modelId={String(selectedGunpla.id)} />
            </div>

            <div className="mt-4 flex gap-2 border-t border-zinc-800 pt-4">
              <button
                onClick={handleEdit}
                className="flex-1 rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
              >
                编辑
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-200 transition hover:bg-zinc-700"
              >
                删除
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">未选择模型</p>
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
