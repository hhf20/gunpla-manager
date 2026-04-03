import { Route, Routes } from 'react-router-dom'
import AddGunplaModal from './components/AddGunplaModal'
import CoverLibraryModal from './components/CoverLibraryModal'
import DetailDrawer from './components/DetailDrawer'
import EditGunplaPage from './components/EditGunplaPage'
import Header from './components/Header'
import ManualLibraryModal from './components/ManualLibraryModal'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import MobileDetailPage from './components/MobileDetailPage'
import MobileHomePage from './components/MobileHomePage'
import MobileStatsPage from './components/MobileStatsPage'
import MobileBottomNav from './components/MobileBottomNav'
import MobileFilterDrawer from './components/MobileFilterDrawer'
import StatsModal from './components/StatsModal'
import ThemeBackground from './components/ThemeBackground'
import TypeManagementModal from './components/TypeManagementModal'
import { GunplaProvider, useGunpla } from './context/GunplaContext'
import { useIsMobileLayout } from './hooks/useIsMobileLayout'

function DesktopLayout() {
  const { filteredGunplaList } = useGunpla()

  return (
    <div className="relative z-10 flex min-h-screen flex-col bg-transparent text-zinc-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainContent items={filteredGunplaList} />
      </div>
      <AddGunplaModal />
      <DetailDrawer />
      <TypeManagementModal />
      <StatsModal />
      <ManualLibraryModal />
    </div>
  )
}

/** 仅首页：详情/统计必须在顶层 Route 注册，否则宽屏走 DesktopLayout 时内层 Routes 不挂载，URL 变了页面不变 */
function MobileLayout() {
  const { isMobileFilterDrawerOpen, setMobileFilterDrawerOpen } = useGunpla()

  return (
    <div className="relative z-10 min-h-screen bg-transparent text-zinc-100">
      <MobileHomePage />
      <MobileBottomNav />
      <MobileFilterDrawer
        isOpen={isMobileFilterDrawerOpen}
        onClose={() => setMobileFilterDrawerOpen(false)}
      />
    </div>
  )
}

function MobileDetailPageWrapper() {
  const { isMobileFilterDrawerOpen, setMobileFilterDrawerOpen } = useGunpla()
  return (
    <div className="relative z-10 min-h-screen bg-transparent text-zinc-100">
      <MobileDetailPage />
      <MobileFilterDrawer
        isOpen={isMobileFilterDrawerOpen}
        onClose={() => setMobileFilterDrawerOpen(false)}
      />
    </div>
  )
}

function MobileStatsPageWrapper() {
  const { isMobileFilterDrawerOpen, setMobileFilterDrawerOpen } = useGunpla()
  return (
    <div className="relative z-10 min-h-screen bg-transparent text-zinc-100">
      <MobileStatsPage />
      <MobileBottomNav />
      <MobileFilterDrawer
        isOpen={isMobileFilterDrawerOpen}
        onClose={() => setMobileFilterDrawerOpen(false)}
      />
    </div>
  )
}

function AppShell() {
  const isMobileLayout = useIsMobileLayout()
  return isMobileLayout ? <MobileLayout /> : <DesktopLayout />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/edit/:id" element={<EditGunplaPage />} />
      <Route path="/model/:id" element={<MobileDetailPageWrapper />} />
      <Route path="/stats" element={<MobileStatsPageWrapper />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  )
}

function App() {
  return (
    <GunplaProvider>
      <ThemeBackground />
      <AppRoutes />
      <CoverLibraryModal />
    </GunplaProvider>
  )
}

export default App
