import { useNavigate } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'

const statusStyleMap = {
  未拼装: 'bg-gray-500 text-white',
  已拼装: 'bg-blue-500 text-white',
  已涂装: 'bg-purple-500 text-white',
}
const buildStatusColorMap = {
  未开盒: 'bg-gray-500 text-white',
  素组: 'bg-blue-500 text-white',
  渗线: 'bg-cyan-500 text-white',
  水贴: 'bg-purple-500 text-white',
  喷涂: 'bg-orange-500 text-white',
  完成: 'bg-emerald-500 text-white',
}

function GunplaCard({ item }) {
  const { openDetail } = useGunpla()
  const navigate = useNavigate()
  const profit = item.currentPrice - (item.purchasePrice || 0)
  const isUp = profit >= 0
  const isWishlist = item.type === 'wishlist'
  const purchaseDiscount =
    !isWishlist && Number(item.releasePrice) > 0 && Number(item.purchasePrice) > 0
      ? Number(((Number(item.purchasePrice) / Number(item.releasePrice)) * 100).toFixed(1))
      : null
  const hoverImage =
    item.buildImages && item.buildImages.length > 0 ? item.buildImages[0] : item.coverImage

  return (
    <article
      onClick={() => openDetail(item.id)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-zinc-800 transition-all duration-300 ease-out hover:-translate-y-1 ${
        isWishlist
          ? 'border border-dashed border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/20'
          : 'border border-zinc-700 hover:shadow-lg hover:shadow-black/30'
      }`}
    >
      <div className="relative w-full bg-zinc-900 rounded-t-2xl overflow-hidden">
        <img
          src={item.coverImage}
          alt={item.name}
          className="h-auto w-full object-contain transition duration-300 group-hover:scale-[1.01]"
          loading="lazy"
        />
        {hoverImage && hoverImage !== item.coverImage ? (
          <img
            src={hoverImage}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0 transition duration-300 group-hover:opacity-100"
            loading="lazy"
          />
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-zinc-100 font-semibold">{item.name}</h3>
          {item.modelCode ? (
            <p className="text-xs text-zinc-500 mt-0.5">{item.modelCode}</p>
          ) : null}
          <p className="text-sm text-zinc-400">
            {item.series} · {item.scale}
          </p>
        </div>

        {isWishlist ? (
          <div className="text-sm space-y-2">
            <p className="text-yellow-300">期望价：￥{item.expectedPrice || 0}</p>
            <span className="inline-flex rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs text-yellow-300">
              想买
            </span>
          </div>
        ) : (
          <>
            <div className="text-sm space-y-1">
              <p className="text-zinc-400">购买价: ￥{item.purchasePrice}</p>
              <p className={isUp ? 'text-emerald-400' : 'text-red-400'}>
                当前价: ￥{item.currentPrice}
              </p>
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
            </div>

            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs ${statusStyleMap[item.status]}`}
            >
              {item.status}
            </span>
            {item.buildStatus ? (
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs ml-2 ${
                  buildStatusColorMap[item.buildStatus] || 'bg-zinc-600 text-zinc-100'
                }`}
              >
                {item.buildStatus}
              </span>
            ) : null}
          </>
        )}

        <div className="flex flex-wrap gap-2">
          {(item.tags || []).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-zinc-700 px-2 py-1 text-xs text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-start justify-end gap-2 p-3 opacity-0 transition duration-300 group-hover:opacity-100">
        <button
          onClick={(event) => {
            event.stopPropagation()
            openDetail(item.id)
          }}
          className="pointer-events-auto rounded-lg bg-zinc-950/80 px-3 py-1.5 text-xs text-zinc-100 backdrop-blur transition duration-200 hover:brightness-110"
        >
          查看
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            navigate(`/edit/${item.id}`)
          }}
          className="pointer-events-auto rounded-lg bg-blue-500/90 px-3 py-1.5 text-xs text-white transition duration-200 hover:brightness-110"
        >
          编辑
        </button>
      </div>
    </article>
  )
}

export default GunplaCard
