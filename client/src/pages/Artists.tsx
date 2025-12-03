import { useState, useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import ArtistGrid from '../components/ArtistGrid'
import { getArtists, Artist } from '../services/musicService'
import './Home.css'

function Artists() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Charger les artistes immédiatement
    loadArtists(false)
    
    // Recharger les images depuis Google Drive en parallèle (ne bloque pas l'affichage)
    reloadImagesFromGoogleDrive().then(() => {
      // Une fois les images Google Drive rechargées, mettre à jour les artistes
      setTimeout(() => {
        loadArtists(true) // Forcer le rechargement pour récupérer les nouvelles images
        setRefreshKey(prev => prev + 1)
      }, 1000) // Attendre 1s pour que le cache Google Drive soit rechargé
    })
  }, [])

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
