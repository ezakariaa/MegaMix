import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Ne pas remettre en haut si on revient sur /artists avec une position sauvegardée
    if (pathname === '/artists') {
      const savedData = sessionStorage.getItem('artistsScrollPosition')
      if (savedData) {
        // La page Artists gérera la restauration elle-même
        return
      }
    }

    // Petit délai pour s'assurer que le DOM est rendu
    const timer = setTimeout(() => {
      // Remettre le scroll en haut à chaque changement de route (sauf si position sauvegardée)
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      
      // Aussi pour le conteneur principal si nécessaire
      const mainContent = document.querySelector('.main-content') as HTMLElement
      if (mainContent) {
        mainContent.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [pathname])

  return null
}

export default ScrollToTop

