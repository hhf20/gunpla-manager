import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'

export default function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { filterState, setMobileFilterDrawerOpen, isMobileFilterDrawerOpen } = useGunpla()

  const filterCount = useMemo(
    () =>
      filterState.grades.length +
      filterState.series.length +
      filterState.buildStatuses.length +
      filterState.tags.length +
      (filterState.type !== 'all' ? 1 : 0) +
      (filterState.searchText.trim() ? 1 : 0),
    [filterState],
  )

  const navItems = [
    { label: '藏品', path: '/', active: location.pathname === '/' },
    { label: '统计', path: '/stats', active: location.pathname === '/stats' },
    {
      label: `筛选${filterCount > 0 ? ` ${filterCount}` : ''}`,
      action: () => setMobileFilterDrawerOpen(true),
      active: isMobileFilterDrawerOpen || filterCount > 0,
    },
  ]

  return (
    <nav
      className="app-panel-strong fixed inset-x-0 bottom-0 z-30 mx-4 mb-[max(1rem,env(safe-area-inset-bottom))] grid grid-cols-3 gap-2 rounded-[26px] p-2 shadow-[0_-12px_40px_rgba(0,0,0,0.35)]"
      aria-label="移动端主导航"
    >
      {navItems.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.action || (() => navigate(item.path))}
          className={`rounded-[18px] px-3 py-3 text-sm transition ${
            item.active
              ? 'bg-cyan-400/18 text-cyan-50 shadow-[0_10px_24px_rgba(34,211,238,0.16)]'
              : 'text-slate-300'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
