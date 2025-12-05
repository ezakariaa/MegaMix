import { useState, useEffect, useRef, useMemo } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import ArtistGrid from '../components/ArtistGrid'
import { getArtists, Artist } from '../services/musicService'
import './Home.css'

function Artists() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const scrollRestoredRef = useRef(false)

  // Trier les artistes avec useMemo pour éviter les re-tris inutiles
  // Doit être déclaré avant les useEffect qui l'utilisent
  const sortedArtists = useMemo(() => {
    return [...artists].sort((a, b) => {
      const nameA = a.name.toLowerCase().trim()
      const nameB = b.name.toLowerCase().trim()
      return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' })
    })
  }, [artists])

  useEffect(() => {
    // Charger les artistes immédiatement et afficher la page (utilise le cache si disponible)
    // Les images seront récupérées automatiquement via les fanarts en arrière-plan
    loadArtists(false)
  }, [])

  // Restaurer la position de scroll après le chargement des artistes
  useEffect(() => {
    if (sortedArtists.length === 0) return

    const restoreScrollPosition = () => {
      try {
        const savedData = sessionStorage.getItem('artistsScrollPosition')
        if (!savedData) {
          scrollRestoredRef.current = true
          return
        }

        const scrollData = JSON.parse(savedData)
        const timeDiff = Date.now() - scrollData.timestamp

        // Ne restaurer que si moins de 5 minutes se sont écoulées
        if (timeDiff > 5 * 60 * 1000) {
          sessionStorage.removeItem('artistsScrollPosition')
          scrollRestoredRef.current = true
          return
        }

        // Attendre que le DOM soit complètement rendu
        const delay = refreshKey > 0 ? 1500 : 500
        setTimeout(() => {
          // Essayer d'abord de scroller vers la carte de l'artiste
          if (scrollData.artistId) {
            const artistCard = document.querySelector(`[data-artist-id="${scrollData.artistId}"]`) as HTMLElement
            if (artistCard) {
              // Scroller vers la carte avec un offset pour laisser un peu d'espace en haut
              const cardTop = artistCard.getBoundingClientRect().top + window.scrollY
              window.scrollTo({ 
                top: Math.max(0, cardTop - 120), 
                behavior: 'smooth' 
              })
              scrollRestoredRef.current = true
              // Nettoyer après la restauration
              setTimeout(() => {
                sessionStorage.removeItem('artistsScrollPosition')
              }, 1000)
              return
            }
          }

          // Si la carte n'est pas trouvée, utiliser la position sauvegardée
          if (scrollData.cardOffsetTop !== undefined) {
            window.scrollTo({ 
              top: Math.max(0, scrollData.cardOffsetTop - 120), 
              behavior: 'smooth' 
            })
          } else if (scrollData.windowScroll) {
            window.scrollTo({ 
              top: scrollData.windowScroll, 
              behavior: 'smooth' 
            })
          }

          scrollRestoredRef.current = true
          // Nettoyer après la restauration
          setTimeout(() => {
            sessionStorage.removeItem('artistsScrollPosition')
          }, 1000)
        }, delay)
      } catch (error) {
        console.error('Erreur lors de la restauration de la position de scroll:', error)
        sessionStorage.removeItem('artistsScrollPosition')
        scrollRestoredRef.current = true
      }
    }

    // Réinitialiser le flag lors du changement de refreshKey pour permettre une nouvelle restauration
    if (refreshKey > 0 && scrollRestoredRef.current) {
      scrollRestoredRef.current = false
    }

    restoreScrollPosition()
  }, [sortedArtists, refreshKey])

  const loadArtists = async (forceReload = false): Promise<void> => {
    try {
      let loadedArtists: Artist[]
      
      if (forceReload) {
        // Forcer le rechargement depuis l'API
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/music/artists?forceReload=true`
        const response = await fetch(apiUrl)
        const data = await response.json()
        loadedArtists = data.artists || []
      } else {
        // Utiliser getArtists() qui utilise le cache en priorité
        loadedArtists = await getArtists()
      }
      
      // Ne pas trier ici, utiliser useMemo pour optimiser
      setArtists(loadedArtists)
    } catch (error) {
      console.error('Erreur lors du chargement des artistes:', error)
      throw error // Propager l'erreur pour que le finally soit appelé
    }
  }

  return (
    <Container fluid className="artists-page">
      <Row>
        <Col>
          <h1 className="page-title mb-3">
            <i className="bi bi-person-badge me-2"></i>
            Artistes
          </h1>
          <ArtistGrid key={refreshKey} artists={sortedArtists} />
        </Col>
      </Row>
    </Container>
  )
}

export default Artists

