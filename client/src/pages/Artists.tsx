import { useState, useEffect, useRef } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import ArtistGrid from '../components/ArtistGrid'
import { getArtists, Artist } from '../services/musicService'
import './Home.css'

function Artists() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const scrollRestoredRef = useRef(false)

  useEffect(() => {
    // Charger les artistes immédiatement
    loadArtists(false)
    
    // Recharger les images depuis Google Drive en parallèle (ne bloque pas l'affichage)
    reloadImagesFromGoogleDrive().then(() => {
      // Attendre un peu pour que le cache soit bien chargé puis recharger les artistes
      setTimeout(() => {
        console.log('[Artists] Premier rechargement après chargement Google Drive...')
        loadArtists(true) // Forcer le rechargement pour récupérer les nouvelles images
      }, 1500)
      
      // Recharger à nouveau après un délai supplémentaire pour récupérer les images
      // qui ont été trouvées et sauvegardées en arrière-plan
      setTimeout(() => {
        console.log('[Artists] Deuxième rechargement pour récupérer les images sauvegardées...')
        loadArtists(true)
      }, 4000)
      
      // Dernier rechargement pour s'assurer que toutes les images sont bien récupérées
      setTimeout(() => {
        console.log('[Artists] Rechargement final avec refresh du composant...')
        loadArtists(true)
        setRefreshKey(prev => prev + 1)
      }, 7000)
    })
  }, [])

  // Restaurer la position de scroll après le chargement des artistes
  useEffect(() => {
    if (artists.length === 0) return

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
  }, [artists, refreshKey])

  const reloadImagesFromGoogleDrive = async (): Promise<void> => {
    try {
      const ARTIST_IMAGES_FOLDER_ID = '1J8sjsrpahbYPIT3LGofGvPub9N_qjEGn' // ID du dossier Google Drive
      console.log('[Artists] Rechargement des images depuis Google Drive...')
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/music/load-artist-images-from-drive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderId: ARTIST_IMAGES_FOLDER_ID }),
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('[Artists] ✓ Images Google Drive rechargées:', data.message)
        console.log(`[Artists] ${data.imagesLoaded || 0} image(s) chargée(s) dans le cache`)
        
        // Afficher quelques noms d'artistes chargés pour debug
        if (data.artists && Array.isArray(data.artists)) {
          console.log(`[Artists] Exemples d'artistes dans le cache: ${data.artists.slice(0, 5).join(', ')}`)
        }
        
        // Attendre un peu plus longtemps pour que le cache soit bien prêt
        await new Promise(resolve => setTimeout(resolve, 1000))
      } else {
        console.warn('[Artists] Erreur lors du rechargement des images Google Drive:', response.statusText)
      }
    } catch (error) {
      console.error('[Artists] Erreur lors du rechargement des images Google Drive:', error)
    }
  }

  const loadArtists = async (forceReload = false) => {
    try {
      // Ajouter le paramètre forceReload pour forcer le rechargement des images
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/music/artists${forceReload ? '?forceReload=true' : ''}`
      const response = await fetch(apiUrl)
      const data = await response.json()
      const loadedArtists = data.artists || []
      
      // Trier les artistes par ordre alphabétique (insensible à la casse)
      const sortedArtists = [...loadedArtists].sort((a, b) => {
        const nameA = a.name.toLowerCase().trim()
        const nameB = b.name.toLowerCase().trim()
        return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' })
      })
      setArtists(sortedArtists)
      console.log(`[Artists] ${sortedArtists.length} artiste(s) chargé(s) et triés par ordre alphabétique${forceReload ? ' (rechargement forcé)' : ''}`)
      // Compter les artistes avec images
      const artistsWithImages = sortedArtists.filter(a => a.coverArt).length
      console.log(`[Artists] ${artistsWithImages} artiste(s) avec image(s) depuis Google Drive`)
    } catch (error) {
      console.error('Erreur lors du chargement des artistes:', error)
    }
  }

  return (
    <Container fluid className="artists-page">
      <Row>
        <Col>
          <h1 className="page-title">
            <i className="bi bi-person-badge me-2"></i>
            Artistes
          </h1>
          <ArtistGrid key={refreshKey} artists={artists} />
        </Col>
      </Row>
    </Container>
  )
}

export default Artists
