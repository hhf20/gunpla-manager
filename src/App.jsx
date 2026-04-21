import { Route, Routes } from 'react-router-dom'
import AddGunplaModal from './components/AddGunplaModal'
import CoverLibraryModal from './components/CoverLibraryModal'
import DetailDrawer from './components/DetailDrawer'
import EditGunplaPage from './components/EditGunplaPage'
import Header from './components/Header'
import ManualLibraryModal from './components/ManualLibraryModal'
import PriceTrendDetailPage from './components/PriceTrendDetailPage'
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
  const { filteredGunplaList, isMobileFilterDrawerOpen, setMobileFilterDrawerOpen } = useGunpla()

  return (
    <div className="app-shell-dex">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <MainContent items={filteredGunplaList} />
      </div>
      <AddGunplaModal />
      <DetailDrawer />
      <TypeManagementModal />
      <StatsModal />
      <ManualLibraryModal />
      <MobileFilterDrawer
        isOpen={isMobileFilterDrawerOpen}
        onClose={() => setMobileFilterDrawerOpen(false)}
      />
    </div>
  )
}

function MobileLayout() {
  const { isMobileFilterDrawerOpen, setMobileFilterDrawerOpen } = useGunpla()

  return (
    <div className="relative z-10 min-h-screen bg-transparent theme-text-primary">
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
    <div className="relative z-10 min-h-screen bg-transparent theme-text-primary">
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
    <div className="relative z-10 min-h-screen bg-transparent theme-text-primary">
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
      <Route path="/price-trend/:id" element={<PriceTrendDetailPage />} />
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

