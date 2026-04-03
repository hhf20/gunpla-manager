import { Route, Routes, useLocation } from 'react-router-dom'
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

function MobileLayout() {
  const location = useLocation()
  const hideBottomNav = location.pathname.startsWith('/model/')
  const { isMobileFilterDrawerOpen, setMobileFilterDrawerOpen } = useGunpla()

  return (
    <div className="relative z-10 min-h-screen bg-transparent text-zinc-100">
      <Routes>
        <Route path="/" element={<MobileHomePage />} />
        <Route path="/model/:id" element={<MobileDetailPage />} />
        <Route path="/stats" element={<MobileStatsPage />} />
      </Routes>
      {!hideBottomNav ? <MobileBottomNav /> : null}
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
      <Route path="/" element={<AppShell />} />
      <Route path="/model/:id" element={<AppShell />} />
      <Route path="/stats" element={<AppShell />} />
      <Route path="/edit/:id" element={<EditGunplaPage />} />
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
