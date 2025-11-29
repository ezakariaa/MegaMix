import { useState } from 'react'
import { Navbar as BootstrapNavbar } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import './Navbar.css'

interface NavbarProps {
  onMenuToggle?: () => void
}

function Navbar({ onMenuToggle }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen)
    if (onMenuToggle) {
      onMenuToggle()
    }
  }

  return (
    <BootstrapNavbar fixed="top" className="spotify-navbar">
      <div className="navbar-container">
        {/* Bouton hamburger pour mobile */}
        <button 
          className="navbar-menu-toggle"
          onClick={handleMenuToggle}
          aria-label="Toggle menu"
        >
          <i className={`bi ${isMenuOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
        </button>
        {/* Logo à gauche */}
        <BootstrapNavbar.Brand as={Link} to="/" className="navbar-brand">
          <i className="bi bi-music-note-beamed me-2"></i>
          <strong>MuZak</strong>
        </BootstrapNavbar.Brand>
      </div>
    </BootstrapNavbar>
  )
}

export default Navbar
