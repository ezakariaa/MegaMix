import { Navbar as BootstrapNavbar } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
  return (
    <BootstrapNavbar fixed="top" className="spotify-navbar">
      <div className="navbar-container">
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
