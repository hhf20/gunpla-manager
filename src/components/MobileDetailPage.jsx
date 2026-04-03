import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'

const statusStyleMap = {
  未拼装: 'border border-slate-400/30 bg-slate-500/20 text-slate-100',
  已拼装: 'border border-sky-400/30 bg-sky-500/20 text-sky-100',
  已涂装: 'border border-fuchsia-400/30 bg-fuchsia-500/20 text-fuchsia-100',
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '未填写'
  return `￥${Number(value || 0).toLocaleString('zh-CN')}`
}

function formatDiscount(item) {
  const releasePrice = Number(item?.releasePrice || 0)
  const purchasePrice = Number(item?.purchasePrice || 0)
  if (releasePrice <= 0 || purchasePrice <= 0) return null
  return Number(((purchasePrice / releasePrice) * 10).toFixed(1))
}

function renderIdentity(item) {
  return [item.grade, item.series, item.releaseType, item.scale].filter(Boolean).join(' / ')
}

function MobileDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { gunplaList } = useGunpla()

  const item = useMemo(
    () => gunplaList.find((entry) => String(entry.id) === String(id)) || null,
    [gunplaList, id],
  )

  const isWishlist = item?.type === 'wishlist'
  const purchaseCount = Number(item?.purchaseCount || 1)
  const purchaseDiscount = item ? formatDiscount(item) : null
  const totalSpent = item ? Number(item.purchasePrice || 0) * purchaseCount : 0

  const infoRows = useMemo(() => {
    if (!item) return []
    if (isWishlist) {
      return [
        { label: '发售形式', value: item.releaseType || '未填写' },
        { label: '关注渠道', value: item.purchasePlatform || '未填写' },
        { label: '盒子编号', value: item.boxNumber || '未填写' },
        { label: '机体编号', value: item.modelCode || '未填写' },
      ]
    }
    return [
      {
        label: '到手折扣',
        value: purchaseDiscount ? `${purchaseDiscount} 折` : '待补充',
      },
      { label: '购入数量', value: String(purchaseCount) },
      { label: '累计投入', value: formatCurrency(totalSpent) },
      { label: '购入平台', value: item.purchasePlatform || '未填写' },
      { label: '盒子编号', value: item.boxNumber || '未填写' },
      { label: '机体编号', value: item.modelCode || '未填写' },
      { label: '拼装阶段', value: item.buildStatus || '未填写' },
    ]
  }, [item, isWishlist, purchaseCount, purchaseDiscount, totalSpent])

  if (!item) {
    return (
      <main className="px-4 py-8">
        <div className="app-panel rounded-[28px] p-6 text-center text-slate-300">
          没有找到对应的模型数据。
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 pb-10 pt-4">
      <section className="app-panel-strong rounded-[30px] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.3em] text-sky-200/70">Model Detail</div>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-white">{item.name}</h1>
            <p className="mt-2 text-sm text-slate-400">{renderIdentity(item) || '基础信息待补充'}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="app-btn-secondary shrink-0 !rounded-full !px-4 !py-2 !text-xs"
          >
            返回
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(item.tags || []).map((tag) => (
            <span key={tag} className="app-chip">
              {tag}
            </span>
          ))}
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 text-[11px] text-slate-400">
            {isWishlist ? '愿望清单' : '我的收藏'}
          </span>
        </div>

        {!isWishlist ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.status ? (
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${statusStyleMap[item.status] || 'app-chip'}`}
              >
                {item.status}
              </span>
            ) : null}
            {item.buildStatus ? (
              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-2.5 py-1 text-xs text-cyan-100">
                拼装：{item.buildStatus}
              </span>
            ) : null}
            {item.releaseType ? <span className="app-chip">{item.releaseType}</span> : null}
          </div>
        ) : (
          <div className="mt-4">
            <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-2.5 py-1 text-xs text-amber-100">
              愿望单
            </span>
          </div>
        )}
      </section>

      <section className="app-panel mt-5 overflow-hidden rounded-[30px] ring-1 ring-white/5">
        {item.coverImage ? (
          <img
            src={item.coverImage}
            alt={item.name}
            className="h-auto w-full object-contain bg-slate-950/80"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-slate-950/80 text-sm text-slate-500">
            暂无封面
          </div>
        )}
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="app-panel rounded-[24px] p-4">
          <div className="text-[11px] text-slate-400">发售价</div>
          <div className="mt-2 text-lg font-semibold text-white">{formatCurrency(item.releasePrice)}</div>
        </div>
        {isWishlist ? (
          <div className="app-panel rounded-[24px] p-4">
            <div className="text-[11px] text-slate-400">目标价</div>
            <div className="mt-2 text-lg font-semibold text-amber-100">
              {formatCurrency(item.expectedPrice)}
            </div>
          </div>
        ) : (
          <div className="app-panel rounded-[24px] p-4">
            <div className="text-[11px] text-slate-400">入手价</div>
            <div className="mt-2 text-lg font-semibold text-cyan-100">
              {formatCurrency(item.purchasePrice)}
            </div>
          </div>
        )}
        {!isWishlist && item.currentPrice ? (
          <div className="app-panel rounded-[24px] p-4">
            <div className="text-[11px] text-slate-400">当前价</div>
            <div className="mt-2 text-base font-semibold text-slate-200">
              {formatCurrency(item.currentPrice)}
            </div>
          </div>
        ) : null}
        {!isWishlist && purchaseDiscount ? (
          <div className="app-panel rounded-[24px] p-4">
            <div className="text-[11px] text-slate-400">到手折扣</div>
            <div className="mt-2 text-base font-semibold text-emerald-100">{purchaseDiscount} 折</div>
          </div>
        ) : null}
      </section>

      {!isWishlist ? (
        <section className="app-panel mt-5 rounded-[28px] p-4">
          <h2 className="text-sm font-semibold text-white">购入信息</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>当前价 {formatCurrency(item.currentPrice)}</span>
              {item.purchaseDate ? (
                <span className="text-slate-400">购入日期 {item.purchaseDate}</span>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {item.reissuePrice ? (
        <section className="app-panel mt-5 rounded-[28px] p-4">
          <div className="text-[11px] text-slate-400">再版价格</div>
          <div className="mt-2 text-base font-semibold text-slate-200">
            {formatCurrency(item.reissuePrice)}
          </div>
        </section>
      ) : null}

      <section className="app-panel mt-5 rounded-[28px] p-4">
        <h2 className="text-sm font-semibold text-white">资料卡</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {infoRows.map((row) => (
            <div key={row.label} className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
              <div className="text-[11px] text-slate-400">{row.label}</div>
              <div className="mt-2 text-sm font-medium text-slate-100">{row.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="app-panel mt-5 rounded-[28px] p-4">
        <h2 className="text-sm font-semibold text-white">备注</h2>
        <p className="mt-3 text-sm leading-6 text-slate-200">{item.note || '暂无备注。'}</p>
      </section>
    </main>
  )
}

export default MobileDetailPage