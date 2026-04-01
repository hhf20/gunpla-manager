import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import AddGunplaModal from './components/AddGunplaModal'
import DetailDrawer from './components/DetailDrawer'
import EditGunplaPage from './components/EditGunplaPage'
import StatsModal from './components/StatsModal'
import TypeManagementModal from './components/TypeManagementModal'
import CoverLibraryModal from './components/CoverLibraryModal'
import ThemeBackground from './components/ThemeBackground'
import ManualLibraryModal from './components/ManualLibraryModal'
import { GunplaProvider, useGunpla } from './context/GunplaContext'
import { useSupabaseSession } from './hooks/useSupabaseSession'

function SupabaseSessionInit() {
  useSupabaseSession()
  return null
}

function AppLayout() {
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />} />
      <Route path="/edit/:id" element={<EditGunplaPage />} />
    </Routes>
  )
}

function App() {
  return (
    <GunplaProvider>
      <SupabaseSessionInit />
      <ThemeBackground />
      <AppRoutes />
      <CoverLibraryModal />
    </GunplaProvider>
  )
}

export default App
