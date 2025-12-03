import { Link, useLocation } from 'react-router-dom'
import './MobileNavFooter.css'

function MobileNavFooter() {
  const location = useLocation()

  const menuItems = [
    {
      icon: 'bi-house-door',
      label: 'Accueil',
      path: '/',
    },
    {
      icon: 'bi-music-note-list',
      label: 'Bibliothèque',
      path: '/library',
    },
    {
      icon: 'bi-person-badge',
      label: 'Artistes',
      path: '/artists',
    },
    {
      icon: 'bi-vinyl',
      label: 'Albums',
      path: '/albums',
    },
    {
      icon: 'bi-collection-play',
      label: 'Compilations',
      path: '/compilations',
    },
    {
      icon: 'bi-list-ul',
      label: 'Playlists',
      path: '/playlists',
    },
  ]

  return (
    <nav className="mobile-nav-footer">
      {menuItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          title={item.label}
        >
          <i className={`bi ${item.icon}`}></i>
          <span className="mobile-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

export default MobileNavFooter

