import { useGunpla } from '../context/GunplaContext'

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
  const isGalleryCard = variant === 'gallery'
  const isDexCard = variant === 'dex' || variant === 'default'
  const { openDetail } = useGunpla()
  const isWishlist = item.type === 'wishlist'
  const coverImage = item.coverImage || ''
  const buildImages = Array.isArray(item.buildImages) ? item.buildImages.filter(Boolean) : []
  const boxImages = Array.isArray(item.boxImages) ? item.boxImages.filter(Boolean) : []
  const galleryImages = [coverImage, ...buildImages, ...boxImages].filter(Boolean)
  const primaryShowcaseImage = buildImages[0] || coverImage || boxImages[0] || ''
  const secondaryShowcaseImage =
    galleryImages.find((image) => image && image !== primaryShowcaseImage) || ''

  const handleOpen = () => {
    if (typeof onOpen === 'function') onOpen(item)
    else openDetail(item.id)
  }

  if (isGalleryCard) {
    const title = normalizeTitlePart(item.name) || buildDisplayTitle(item)
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="group w-full cursor-pointer border-0 bg-transparent p-0 text-left touch-manipulation [-webkit-tap-highlight-color:transparent]"
      >
        <div className="theme-surface-elevated relative aspect-[3/4] w-full overflow-hidden rounded-[12px]">
          {item.coverImage ? (
            <img
              src={item.coverImage}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="flex h-full min-h-[88px] items-center justify-center text-[10px] theme-text-muted">无图</div>
          )}
          {isWishlist ? (
            <span className="theme-accent-badge pointer-events-none absolute left-1.5 top-1.5 px-1.5 py-0.5 text-[9px] font-bold">
              WISH
            </span>
          ) : null}
        </div>
        <p
          className="mt-1.5 line-clamp-2 text-left text-[10px] font-medium leading-tight theme-text-secondary"
          title={title}
        >
          {title}
        </p>
      </button>
    )
  }

  if (isDexCard) {
    const displayTitle = normalizeTitlePart(item.name) || buildDisplayTitle(item)
    const image = primaryShowcaseImage || secondaryShowcaseImage || ''
    const isOwned = item.type === 'owned'
    const isFavorite = Boolean(item.favorite)
    const idLabel = normalizeTitlePart(item.boxNumber) || '-'

    return (
      <article
        onClick={handleOpen}
        className="group dex-card cursor-pointer"
        style={!isOwned ? { filter: 'grayscale(100%)', opacity: 0.45 } : undefined}
      >
        <div className="dex-card-id">{idLabel}</div>
        <div className="dex-card-image-wrap">
          {image ? (
            <img src={image} alt={item.name || '模型图片'} className="dex-card-image" loading="lazy" />
          ) : (
            <div className="dex-card-empty">NO IMAGE</div>
          )}
          {isFavorite ? <span className="dex-favorite">★</span> : null}
        </div>
        <div className="dex-card-name" title={displayTitle}>
          {displayTitle}
        </div>
        <div className="dex-card-status">{isOwned ? (item.buildStatus || '已拥有') : '未拥有'}</div>
      </article>
    )
  }

  return null
}

export default GunplaCard
