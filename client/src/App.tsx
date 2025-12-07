import { useState, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { PlayerProvider } from './contexts/PlayerContext'
import ErrorBoundary from './components/ErrorBoundary'
import ScrollToTop from './components/ScrollToTop'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import RightSidebar from './components/RightSidebar'
import PlayerFooter from './components/PlayerFooter'
import MobileNavFooter from './components/MobileNavFooter'
import './App.css'

// Code splitting : charger les pages seulement quand elles sont nécessaires
const Home = lazy(() => import('./pages/Home'))
const Library = lazy(() => import('./pages/Library'))
const Artists = lazy(() => import('./pages/Artists'))
const Compilations = lazy(() => import('./pages/Compilations'))
const Genres = lazy(() => import('./pages/Genres'))
const Playlists = lazy(() => import('./pages/Playlists'))
const AlbumDetail = lazy(() => import('./pages/AlbumDetail'))
const ArtistDetailPage = lazy(() => import('./pages/ArtistDetailPage'))
const GenreDetailPage = lazy(() => import('./pages/GenreDetailPage'))
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'))
const AnalyzeTags = lazy(() => import('./pages/AnalyzeTags'))

// Composant de chargement pour Suspense
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
    <div className="spinner-border text-success" role="status">
      <span className="visually-hidden">Chargement...</span>
    </div>
  </div>
)

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleMenuToggle = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleSidebarClose = () => {
    setIsSidebarOpen(false)
  }

  // Base path pour GitHub Pages (sans slash final pour React Router)
  // Note: vite.config.ts utilise '/MegaMix/' (avec slash) mais React Router basename doit être '/MegaMix' (sans slash)
  const basename = process.env.NODE_ENV === 'production' ? '/MegaMix' : ''

  return (
    <ErrorBoundary>
      <PlayerProvider>
        <Router basename={basename}>
          <ScrollToTop />
          <div className="App">
            <Navbar onMenuToggle={handleMenuToggle} />
            <div className="app-layout">
              <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />
              <main className="main-content">
                <div className="main-content-wrapper">
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/library" element={<Library />} />
                      <Route path="/artists" element={<Artists />} />
                      <Route path="/artist/:artistId" element={<ArtistDetailPage />} />
                      <Route path="/compilations" element={<Compilations />} />
                      <Route path="/album/:albumId" element={<AlbumDetail />} />
                      <Route path="/genres" element={<Genres />} />
                      <Route path="/genre/:genreId" element={<GenreDetailPage />} />
                      <Route path="/playlists" element={<Playlists />} />
                      <Route path="/search" element={<SearchResultsPage />} />
                      <Route path="/analyze-tags" element={<AnalyzeTags />} />
                    </Routes>
                  </Suspense>
                </div>
              </main>
              <RightSidebar />
            </div>
            <PlayerFooter />
            <MobileNavFooter />
          </div>
        </Router>
      </PlayerProvider>
    </ErrorBoundary>
  )
}

export default App
