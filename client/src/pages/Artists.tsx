import { useState, useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import ArtistGrid from '../components/ArtistGrid'
import { getArtists, Artist } from '../services/musicService'
import './Home.css'

function Artists() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Recharger les images depuis Google Drive à chaque accès à la page
    reloadImagesFromGoogleDrive()
    
    // Charger les artistes après le rechargement des images (avec forceReload)
    setTimeout(() => {
      loadArtists(true) // Forcer le rechargement des images
    }, 500) // Attendre 500ms pour que le cache Google Drive soit rechargé
    
    // Recharger les artistes plusieurs fois pour récupérer les images chargées depuis Google Drive
    const refreshTimers = [
      setTimeout(() => {
        console.log('[Artists] Rechargement 1 (après 2s) pour récupérer les images Google Drive...')
        loadArtists(true) // Forcer le rechargement
        setRefreshKey(prev => prev + 1)
      }, 2000),
      setTimeout(() => {
        console.log('[Artists] Rechargement 2 (après 5s) pour récupérer les images Google Drive...')
        loadArtists(true) // Forcer le rechargement
        setRefreshKey(prev => prev + 1)
      }, 5000),
      setTimeout(() => {
        console.log('[Artists] Rechargement 3 (après 8s) pour récupérer les images Google Drive...')
        loadArtists(true) // Forcer le rechargement
        setRefreshKey(prev => prev + 1)
      }, 8000)
    ]
    
    return () => refreshTimers.forEach(timer => clearTimeout(timer))
  }, [])

  const reloadImagesFromGoogleDrive = async () => {
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
        console.log(`[Artists] ${data.imagesLoaded || 0} image(s) chargée(s)`)
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
