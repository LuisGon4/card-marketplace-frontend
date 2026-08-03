import { Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout'
import BrowsePage from './pages/BrowsePage'
import ListingDetailPage from './pages/ListingDetailPage'
import NotFoundPage from './pages/NotFoundPage'
import { useAuthStatus } from './hooks/useAuthStatus'

function App() {
  // Probed once at the root and passed down as plain props — no context,
  // no global store. AppLayout renders Header, so this flows App ->
  // AppLayout -> Header.
  const { status: authStatus, user } = useAuthStatus()

  return (
    <AppLayout authStatus={authStatus} user={user}>
      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/listings/:id" element={<ListingDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
