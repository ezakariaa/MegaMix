import { useState, useEffect, useMemo, useRef } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import DragDropZone from '../components/DragDropZone'
import AlbumGrid from '../components/AlbumGrid'
import { getAlbums, scanMusicFiles, Album } from '../services/musicService'
import { getCached } from '../services/cacheService'
import { usePlayer } from '../contexts/PlayerContext'
import './Home.css'

function Home() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(false)
  const { currentTrack, queue } = usePlayer()

  useEffect(() => {
    // Afficher immédiatement avec le cache (même si vide)
    // Puis rafraîchir en arrière-plan
    const cached = getCached<Album[]>('albums')
    if (cached) {
      setAlbums(cached) // Afficher immédiatement le cache
    }
    // Charger en arrière-plan (même si cache existe, pour rafraîchir)
    loadAlbums()
  }, [])

  const loadAlbums = async () => {
    try {
      const loadedAlbums = await getAlbums()
      setAlbums(loadedAlbums)
    } catch (error) {
      console.error('Erreur lors du chargement des albums:', error)
    }
  }

  const handleFilesDropped = async (files: File[]) => {
    setLoading(true)
    try {
      await scanMusicFiles(files)
      await loadAlbums()
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  // Derniers albums ajoutés (les derniers dans le tableau)
  const recentlyAddedAlbums = useMemo(() => {
    return [...albums].reverse().slice(0, 8)
  }, [albums])

  // Albums écoutés récemment (basé sur la queue et le currentTrack)
  const recentlyPlayedAlbums = useMemo(() => {
    const playedAlbumIds = new Set<string>()
    
    // Ajouter l'album actuellement en lecture
    if (currentTrack?.albumId) {
      playedAlbumIds.add(currentTrack.albumId)
    }
    
    // Ajouter les albums de la queue
    queue.forEach(track => {
      if (track.albumId) {
        playedAlbumIds.add(track.albumId)
      }
    })
    
    // Récupérer les albums correspondants
    const playedAlbums = albums.filter(album => playedAlbumIds.has(album.id))
    
    // Si moins de 8 albums, compléter avec des albums récents
    if (playedAlbums.length < 8) {
      const remaining = albums
        .filter(album => !playedAlbumIds.has(album.id))
        .reverse()
        .slice(0, 8 - playedAlbums.length)
      return [...playedAlbums, ...remaining].slice(0, 8)
    }
    
    return playedAlbums.slice(0, 8)
  }, [albums, currentTrack, queue])

  // Albums aléatoires
  const randomAlbums = useMemo(() => {
    if (albums.length === 0) return []
    
    // Créer une copie du tableau et le mélanger
    const shuffled = [...albums].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 8)
  }, [albums])

  // Refs pour les conteneurs défilables
  const recentlyAddedRef = useRef<HTMLDivElement>(null)
  const randomAlbumsRef = useRef<HTMLDivElement>(null)
  const recentlyPlayedRef = useRef<HTMLDivElement>(null)

  // Fonction pour gérer le défilement avec la molette
  useEffect(() => {
    const handleWheel = (e: WheelEvent, container: HTMLDivElement | null) => {
      if (!container) return
      
      // Vérifier si le conteneur peut défiler horizontalement
      const canScrollHorizontally = container.scrollWidth > container.clientWidth
      
      if (canScrollHorizontally && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        // Si le défilement vertical est plus important, convertir en horizontal
        e.preventDefault()
        container.scrollLeft += e.deltaY
      }
    }

    const recentlyAddedContainer = recentlyAddedRef.current?.querySelector('.album-grid') as HTMLDivElement
    const randomAlbumsContainer = randomAlbumsRef.current?.querySelector('.album-grid') as HTMLDivElement
    const recentlyPlayedContainer = recentlyPlayedRef.current?.querySelector('.album-grid') as HTMLDivElement

    const handleRecentlyAddedWheel = (e: WheelEvent) => handleWheel(e, recentlyAddedContainer)
    const handleRandomAlbumsWheel = (e: WheelEvent) => handleWheel(e, randomAlbumsContainer)
    const handleRecentlyPlayedWheel = (e: WheelEvent) => handleWheel(e, recentlyPlayedContainer)

    if (recentlyAddedContainer) {
      recentlyAddedContainer.addEventListener('wheel', handleRecentlyAddedWheel, { passive: false })
    }
    if (randomAlbumsContainer) {
      randomAlbumsContainer.addEventListener('wheel', handleRandomAlbumsWheel, { passive: false })
    }
    if (recentlyPlayedContainer) {
      recentlyPlayedContainer.addEventListener('wheel', handleRecentlyPlayedWheel, { passive: false })
    }

    return () => {
      if (recentlyAddedContainer) {
        recentlyAddedContainer.removeEventListener('wheel', handleRecentlyAddedWheel)
      }
      if (randomAlbumsContainer) {
        randomAlbumsContainer.removeEventListener('wheel', handleRandomAlbumsWheel)
      }
      if (recentlyPlayedContainer) {
        recentlyPlayedContainer.removeEventListener('wheel', handleRecentlyPlayedWheel)
      }
    }
  }, [recentlyAddedAlbums, randomAlbums, recentlyPlayedAlbums])

  // Fonction pour gérer le glisser-déposer (drag)
  useEffect(() => {
    const setupDragScroll = (container: HTMLDivElement | null) => {
      if (!container) return

      let isDown = false
      let startX: number
      let scrollLeft: number

      const handleMouseDown = (e: MouseEvent) => {
        isDown = true
        container.classList.add('active')
        startX = e.pageX - container.offsetLeft
        scrollLeft = container.scrollLeft
      }

      const handleMouseLeave = () => {
        isDown = false
        container.classList.remove('active')
      }

      const handleMouseUp = () => {
        isDown = false
        container.classList.remove('active')
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDown) return
        e.preventDefault()
        const x = e.pageX - container.offsetLeft
        const walk = (x - startX) * 2 // Multiplier pour un défilement plus rapide
        container.scrollLeft = scrollLeft - walk
      }

      // Support tactile
      let touchStartX: number
      let touchScrollLeft: number

      const handleTouchStart = (e: TouchEvent) => {
        touchStartX = e.touches[0].pageX - container.offsetLeft
        touchScrollLeft = container.scrollLeft
      }

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        const x = e.touches[0].pageX - container.offsetLeft
        const walk = (x - touchStartX) * 2
        container.scrollLeft = touchScrollLeft - walk
      }

      container.addEventListener('mousedown', handleMouseDown)
      container.addEventListener('mouseleave', handleMouseLeave)
      container.addEventListener('mouseup', handleMouseUp)
      container.addEventListener('mousemove', handleMouseMove)
      container.addEventListener('touchstart', handleTouchStart, { passive: false })
      container.addEventListener('touchmove', handleTouchMove, { passive: false })

      return () => {
        container.removeEventListener('mousedown', handleMouseDown)
        container.removeEventListener('mouseleave', handleMouseLeave)
        container.removeEventListener('mouseup', handleMouseUp)
        container.removeEventListener('mousemove', handleMouseMove)
        container.removeEventListener('touchstart', handleTouchStart)
        container.removeEventListener('touchmove', handleTouchMove)
      }
    }

    const recentlyAddedContainer = recentlyAddedRef.current?.querySelector('.album-grid') as HTMLDivElement
    const randomAlbumsContainer = randomAlbumsRef.current?.querySelector('.album-grid') as HTMLDivElement
    const recentlyPlayedContainer = recentlyPlayedRef.current?.querySelector('.album-grid') as HTMLDivElement

    const cleanup1 = recentlyAddedContainer ? setupDragScroll(recentlyAddedContainer) : undefined
    const cleanup2 = randomAlbumsContainer ? setupDragScroll(randomAlbumsContainer) : undefined
    const cleanup3 = recentlyPlayedContainer ? setupDragScroll(recentlyPlayedContainer) : undefined

    return () => {
      cleanup1?.()
      cleanup2?.()
      cleanup3?.()
    }
  }, [recentlyAddedAlbums, randomAlbums, recentlyPlayedAlbums])

  return (
    <DragDropZone onFilesDropped={handleFilesDropped}>
      <Container fluid className="home-page">
      {/* Afficher la page même si vide - l'utilisateur voit la structure immédiatement */}
      {/* Première section : Derniers albums ajoutés */}
      <Row className="mb-4">
        <Col>
          <h2 className="section-title">Derniers albums ajoutés</h2>
          {recentlyAddedAlbums.length > 0 ? (
            <div className="scrollable-albums" ref={recentlyAddedRef}>
              <AlbumGrid albums={recentlyAddedAlbums} />
            </div>
          ) : (
            <div className="text-center text-muted py-4">
              <p>Aucun album disponible</p>
            </div>
          )}
        </Col>
      </Row>

      {/* Deuxième section : Albums aléatoires */}
      <Row className="mb-4">
        <Col>
          <h2 className="section-title">Albums aléatoires</h2>
          {randomAlbums.length > 0 ? (
            <div className="scrollable-albums" ref={randomAlbumsRef}>
              <AlbumGrid albums={randomAlbums} />
            </div>
          ) : (
            <div className="text-center text-muted py-4">
              <p>Aucun album disponible</p>
            </div>
          )}
        </Col>
      </Row>

      {/* Troisième section : Albums écoutés récemment */}
      <Row className="mb-5">
        <Col>
          <h2 className="section-title">Albums écoutés récemment</h2>
          {recentlyPlayedAlbums.length > 0 ? (
            <div className="scrollable-albums" ref={recentlyPlayedRef}>
              <AlbumGrid albums={recentlyPlayedAlbums} />
            </div>
          ) : (
            <div className="text-center text-muted py-4">
              <p>Aucun album disponible</p>
            </div>
          )}
        </Col>
      </Row>
    </Container>
    </DragDropZone>
  )
}

export default Home
