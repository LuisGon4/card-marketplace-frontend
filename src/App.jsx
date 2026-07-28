import { Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout'
import BrowsePage from './pages/BrowsePage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
