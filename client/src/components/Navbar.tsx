import { useState } from 'react'
import { Navbar as BootstrapNavbar } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import './Navbar.css'

interface NavbarProps {
  onMenuToggle?: () => void
}

function Navbar({ onMenuToggle }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen)
    if (onMenuToggle) {
      onMenuToggle()
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/library?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogin = () => {
    console.log('Connexion cliquée')
  }

  return (
    <BootstrapNavbar fixed="top" className="spotify-navbar">
      <div className="navbar-container">
        {/* Section gauche - Logo */}
        <div className="navbar-left">
          <button 
            className="navbar-menu-toggle"
            onClick={handleMenuToggle}
            aria-label="Toggle menu"
          >
            <i className={`bi ${isMenuOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
          </button>
          <BootstrapNavbar.Brand as={Link} to="/" className="navbar-brand">
            <i className="bi bi-music-note-beamed me-2"></i>
            <strong>MuZak</strong>
          </BootstrapNavbar.Brand>
        </div>
        
        {/* Section centre - Recherche */}
        <div className="navbar-center">
          <form className="navbar-search" onSubmit={handleSearch}>
            <div className="navbar-search-container">
              <i className="bi bi-search navbar-search-icon"></i>
              <input
                type="text"
                className="navbar-search-input"
                placeholder="Rechercher des artistes, albums, pistes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="navbar-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Effacer"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Section droite - Connexion */}
        <div className="navbar-right">
          <button 
            className="navbar-login-btn"
            onClick={handleLogin}
            aria-label="Se connecter"
          >
            <i className="bi bi-person-circle me-2"></i>
            <span className="navbar-login-text">Connexion</span>
          </button>
        </div>
      </div>
    </BootstrapNavbar>
  )
}

export default Navbar
