import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { PlayerProvider } from './contexts/PlayerContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import RightSidebar from './components/RightSidebar'
import PlayerFooter from './components/PlayerFooter'
import Home from './pages/Home'
import Artists from './pages/Artists'
import Albums from './pages/Albums'
import Genres from './pages/Genres'
import Playlists from './pages/Playlists'
import Library from './pages/Library'
import AlbumDetail from './pages/AlbumDetail'
import './App.css'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleMenuToggle = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleSidebarClose = () => {
    setIsSidebarOpen(false)
  }

  return (
    <ErrorBoundary>
      <PlayerProvider>
        <Router>
          <div className="App">
            <Navbar onMenuToggle={handleMenuToggle} />
            <div className="app-layout">
              <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />
              <main className="main-content">
                <div className="main-content-wrapper">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/artists" element={<Artists />} />
                    <Route path="/albums" element={<Albums />} />
                    <Route path="/album/:albumId" element={<AlbumDetail />} />
                    <Route path="/genres" element={<Genres />} />
                    <Route path="/playlists" element={<Playlists />} />
                  </Routes>
                </div>
              </main>
              <RightSidebar />
            </div>
            <PlayerFooter />
          </div>
        </Router>
      </PlayerProvider>
    </ErrorBoundary>
  )
}

export default App
