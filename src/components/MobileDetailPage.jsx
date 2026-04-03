import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MobileGunplaDetailContent from './MobileGunplaDetailContent'
import { useGunpla } from '../context/GunplaContext'

function MobileDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { gunplaList } = useGunpla()
  const [fullscreen, setFullscreen] = useState(false)

  const item = useMemo(
    () => gunplaList.find((entry) => String(entry.id) === String(id)) || null,
    [gunplaList, id],
  )

  useEffect(() => {
    if (fullscreen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
    return undefined
  }, [fullscreen])

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
    <>
      <main className="px-4 pb-10 pt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="app-btn-secondary shrink-0 !rounded-full !px-4 !py-2 !text-xs"
          >
            返回
          </button>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="app-btn-primary shrink-0 !rounded-full !px-4 !py-2 !text-xs"
          >
            全屏预览
          </button>
        </div>
        <MobileGunplaDetailContent item={item} />
      </main>

      {fullscreen ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0f18] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <span className="text-sm font-medium text-white">详情</span>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="app-btn-secondary !rounded-full !px-4 !py-2 !text-xs"
            >
              关闭
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-2">
            <MobileGunplaDetailContent item={item} />
          </div>
        </div>
      ) : null}
    </>
  )
}

export default MobileDetailPage
