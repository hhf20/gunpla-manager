import { useLocation, useNavigate } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'

const tabs = [
  { id: 'hangar', label: '机库', type: 'all' },
  { id: 'collection', label: '收藏', type: 'owned' },
  { id: 'wishlist', label: '愿望', type: 'wishlist' },
  { id: 'stats', label: '统计', path: '/stats' },
]

export default function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { filterState, setFilterState } = useGunpla()

  const isStats = location.pathname === '/stats'

  const handleClick = (tab) => {
    if (tab.path) {
      navigate(tab.path)
      return
    }
    navigate('/')
    setFilterState((prev) => ({ ...prev, type: tab.type }))
  }

  const isActive = (tab) => {
    if (tab.path) return isStats
    if (isStats) return false
    return filterState.type === tab.type
  }

  return (
    <nav
      className="app-panel-strong fixed inset-x-0 bottom-0 z-30 mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] grid grid-cols-4 gap-1 rounded-[22px] p-1.5 shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
      aria-label="移动端主导航"
    >
      {tabs.map((tab) => {
        const active = isActive(tab)
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleClick(tab)}
            className={`flex flex-col items-center justify-center rounded-[16px] py-2.5 text-[11px] font-semibold transition ${
              active
                ? 'bg-sky-500/25 text-sky-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
