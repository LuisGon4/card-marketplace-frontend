import { Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout'
import BrowsePage from './pages/BrowsePage'
import CreateListingPage from './pages/CreateListingPage'
import MyListingsPage from './pages/MyListingsPage'
import ListingImagesPage from './pages/ListingImagesPage'
import ListingDetailPage from './pages/ListingDetailPage'
import ConversationsPage from './pages/ConversationsPage'
import ConversationThreadPage from './pages/ConversationThreadPage'
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
        {/* Declared above /listings/:id for the reader, though React Router
            ranks a static segment ("new", "mine") above a dynamic one
            regardless of declaration order — that ranking, not the ordering
            here, is what keeps these routes from being swallowed by :id. */}
        <Route
          path="/listings/new"
          element={<CreateListingPage authStatus={authStatus} user={user} />}
        />
        <Route path="/listings/mine" element={<MyListingsPage authStatus={authStatus} />} />
        <Route
          path="/listings/:id/images"
          element={<ListingImagesPage authStatus={authStatus} user={user} />}
        />
        <Route
          path="/listings/:id"
          element={<ListingDetailPage authStatus={authStatus} user={user} />}
        />
        <Route path="/conversations" element={<ConversationsPage authStatus={authStatus} />} />
        <Route
          path="/conversations/:id"
          element={<ConversationThreadPage authStatus={authStatus} user={user} />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
