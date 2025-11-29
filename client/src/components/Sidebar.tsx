import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

function Sidebar() {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Charger l'état depuis localStorage ou false par défaut
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  // Sauvegarder l'état dans localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed))
    // Mettre à jour la classe sur le body pour ajuster le layout
    document.body.classList.toggle('sidebar-collapsed', isCollapsed)
  }, [isCollapsed])

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

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
      icon: 'bi-tags',
      label: 'Genres',
      path: '/genres',
    },
    {
      icon: 'bi-list-ul',
      label: 'Playlists',
      path: '/playlists',
    },
  ]

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-content">
        <button 
          className="sidebar-toggle"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Agrandir la sidebar' : 'Réduire la sidebar'}
        >
          <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
        </button>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <i className={`bi ${item.icon}`}></i>
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default Sidebar
