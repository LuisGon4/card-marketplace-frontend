import { Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout'
import BrowsePage from './pages/BrowsePage'
import NotFoundPage from './pages/NotFoundPage'
import { useAuthStatus } from './hooks/useAuthStatus'

function App() {
  // Probed once at the root and passed down as a plain prop — no context,
  // no global store (plan §5 Step 6). AppLayout renders Header, so this
  // flows App -> AppLayout -> Header.
  const authStatus = useAuthStatus()

  return (
    <AppLayout authStatus={authStatus}>
      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
