import { useState, useEffect, useMemo } from 'react'
import { Container, Row, Col, Alert, Dropdown, Modal, Button, Form } from 'react-bootstrap'
import DragDropZone from '../components/DragDropZone'
import AlbumGrid from '../components/AlbumGrid'
import { getAlbums, scanMusicFiles, deleteAlbums, addMusicFromGoogleDrive, Album } from '../services/musicService'
import './Home.css'

type SortOption = 'alphabetical' | 'artist' | 'year' | 'recent'

function Library() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ loaded: number; total: number; percentage: number } | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical')
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false)
  const [googleDriveUrl, setGoogleDriveUrl] = useState('')
  const [loadingGoogleDrive, setLoadingGoogleDrive] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set())

  // Charger les albums au montage du composant
  useEffect(() => {
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

  // Trier les albums selon l'option sélectionnée
  const sortedAlbums = useMemo(() => {
    const albumsCopy = [...albums]
    
    switch (sortBy) {
      case 'alphabetical':
        return albumsCopy.sort((a, b) => {
          const titleA = a.title.toLowerCase()
          const titleB = b.title.toLowerCase()
          return titleA.localeCompare(titleB, 'fr', { numeric: true })
        })
      
      case 'artist':
        return albumsCopy.sort((a, b) => {
          const artistA = a.artist.toLowerCase()
          const artistB = b.artist.toLowerCase()
          if (artistA !== artistB) {
            return artistA.localeCompare(artistB, 'fr', { numeric: true })
          }
          // Si même artiste, trier par titre
          return a.title.toLowerCase().localeCompare(b.title.toLowerCase(), 'fr', { numeric: true })
        })
      
      case 'year':
        return albumsCopy.sort((a, b) => {
          // Albums sans année à la fin
          if (!a.year && !b.year) {
            return a.title.toLowerCase().localeCompare(b.title.toLowerCase(), 'fr', { numeric: true })
          }
          if (!a.year) return 1
          if (!b.year) return -1
          // Trier par année décroissante (plus récent en premier)
          if (a.year !== b.year) {
            return b.year - a.year
          }
          // Si même année, trier par titre
          return a.title.toLowerCase().localeCompare(b.title.toLowerCase(), 'fr', { numeric: true })
        })
      
      case 'recent':
        // Trier par ordre inverse (les derniers ajoutés en premier)
        // On crée un tableau avec les indices originaux pour préserver l'ordre
        const albumsWithIndex = albums.map((album, index) => ({ album, originalIndex: index }))
        return albumsWithIndex
          .sort((a, b) => b.originalIndex - a.originalIndex) // Ordre décroissant (derniers en premier)
          .map(item => item.album)
      
      default:
        return albumsCopy
    }
  }, [albums, sortBy])

  const handleGoogleDriveAdd = async () => {
    if (!googleDriveUrl.trim()) {
      setMessage({ type: 'error', text: 'Veuillez saisir un lien Google Drive' })
      return
    }

    setLoadingGoogleDrive(true)
    setMessage(null)

    try {
      const result = await addMusicFromGoogleDrive(googleDriveUrl)
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message || 'Album ajouté avec succès depuis Google Drive',
        })

        // Recharger les albums
        await loadAlbums()

        // Fermer le modal et réinitialiser
        setShowGoogleDriveModal(false)
        setGoogleDriveUrl('')

        // Cacher le message après 5 secondes
        setTimeout(() => setMessage(null), 5000)
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Erreur lors de l\'ajout depuis Google Drive',
        })
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout depuis Google Drive:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Erreur lors de l\'ajout depuis Google Drive',
      })
    } finally {
      setLoadingGoogleDrive(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedAlbums.size === 0) return

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedAlbums.size} album(s) de la bibliothèque ?`)) {
      return
    }

    try {
      const albumIds = Array.from(selectedAlbums)
      await deleteAlbums(albumIds)
      
      setMessage({
        type: 'success',
        text: `${albumIds.length} album(s) supprimé(s) avec succès`,
      })

      // Recharger les albums
      await loadAlbums()
      
      // Désactiver le mode sélection et vider la sélection
      setSelectionMode(false)
      setSelectedAlbums(new Set())

      // Cacher le message après 5 secondes
      setTimeout(() => setMessage(null), 5000)
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erreur lors de la suppression des albums',
      })
    }
  }

  const handleFilesDropped = async (files: File[]) => {
    setLoading(true)
    setMessage(null)
    setUploadProgress({ loaded: 0, total: 0, percentage: 0 })
    setProcessingStatus(`Traitement de ${files.length} fichier(s)...`)

    try {
      const result = await scanMusicFiles(files, (progress) => {
        setUploadProgress(progress)
        setProcessingStatus(`Upload : ${progress.percentage}%`)
      })
      
      setProcessingStatus('Analyse des métadonnées...')
      
      if (result.success) {
        setProcessingStatus('')
        setUploadProgress(null)
        setMessage({
          type: 'success',
          text: result.message || `${result.albums.length} album(s) ajouté(s) avec succès`,
        })
        
        // Recharger les albums
        await loadAlbums()
        
        // Cacher le message après 5 secondes
        setTimeout(() => setMessage(null), 5000)
      } else {
        setProcessingStatus('')
        setUploadProgress(null)
        setMessage({
          type: 'error',
          text: 'Erreur lors de l\'ajout des albums',
        })
      }
    } catch (error: any) {
      setProcessingStatus('')
      setUploadProgress(null)
      setMessage({
        type: 'error',
        text: error.message || 'Erreur lors du traitement des fichiers',
      })
    } finally {
      setLoading(false)
      setProcessingStatus('')
      setUploadProgress(null)
    }
  }

  return (
    <DragDropZone onFilesDropped={handleFilesDropped}>
      <Container fluid className="library-page">
        <Row>
          <Col>
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h1 className="page-title mb-0">
                  <i className="bi bi-music-note-list me-2"></i>
                  Ma Bibliothèque
                </h1>
                <div className="d-flex align-items-center gap-2">
                  <button
                    className={`selection-button ${selectionMode ? 'active' : ''}`}
                    onClick={() => {
                      setSelectionMode(!selectionMode)
                      if (selectionMode) {
                        setSelectedAlbums(new Set())
                      }
                    }}
                    aria-label="Mode sélection"
                    title="Mode sélection"
                  >
                    <i className="bi bi-check2-all"></i>
                  </button>
                  {selectedAlbums.size > 0 && (
                    <button
                      className="delete-button"
                      onClick={handleDeleteSelected}
                      aria-label="Supprimer les albums sélectionnés"
                      title={`Supprimer ${selectedAlbums.size} album(s)`}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  )}
                  <button
                    className="google-drive-button"
                    onClick={() => setShowGoogleDriveModal(true)}
                    aria-label="Ajouter depuis Google Drive"
                    title="Ajouter depuis Google Drive"
                  >
                    <i className="bi bi-cloud-plus"></i>
                  </button>
                  <Dropdown>
                    <Dropdown.Toggle variant="outline-secondary" className="filter-dropdown">
                      <i className="bi bi-funnel me-2"></i>
                      {sortBy === 'alphabetical' && 'Ordre alphabétique'}
                      {sortBy === 'artist' && 'Par artiste'}
                      {sortBy === 'year' && 'Par année'}
                      {sortBy === 'recent' && 'Par Dernier Ajout'}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item 
                        active={sortBy === 'alphabetical'}
                        onClick={() => setSortBy('alphabetical')}
                      >
                        <i className="bi bi-sort-alpha-down me-2"></i>
                        Ordre alphabétique
                      </Dropdown.Item>
                      <Dropdown.Item 
                        active={sortBy === 'artist'}
                        onClick={() => setSortBy('artist')}
                      >
                        <i className="bi bi-person me-2"></i>
                        Par artiste
                      </Dropdown.Item>
                      <Dropdown.Item 
                        active={sortBy === 'year'}
                        onClick={() => setSortBy('year')}
                      >
                        <i className="bi bi-calendar me-2"></i>
                        Par année
                      </Dropdown.Item>
                      <Dropdown.Item 
                        active={sortBy === 'recent'}
                        onClick={() => setSortBy('recent')}
                      >
                        <i className="bi bi-clock-history me-2"></i>
                        Par Dernier Ajout
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>
              <p className="drag-drop-instruction">
                Glissez un dossier de musique ici ou sélectionnez un dossier pour ajouter vos albums
              </p>
            </div>

            {/* Modal Google Drive */}
            <Modal show={showGoogleDriveModal} onHide={() => setShowGoogleDriveModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>
                  <i className="bi bi-cloud-plus me-2"></i>
                  Ajouter depuis Google Drive
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Lien Google Drive</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="https://drive.google.com/file/d/..."
                      value={googleDriveUrl}
                      onChange={(e) => setGoogleDriveUrl(e.target.value)}
                      disabled={loadingGoogleDrive}
                    />
                    <Form.Text className="text-muted">
                      Collez le lien de partage du fichier ou dossier Google Drive
                    </Form.Text>
                  </Form.Group>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setShowGoogleDriveModal(false)
                    setGoogleDriveUrl('')
                  }}
                  disabled={loadingGoogleDrive}
                >
                  Annuler
                </Button>
                <Button 
                  variant="success" 
                  onClick={handleGoogleDriveAdd}
                  disabled={!googleDriveUrl.trim() || loadingGoogleDrive}
                >
                  {loadingGoogleDrive ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Ajouter
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </Modal>

            {message && (
              <Alert 
                variant={message.type === 'success' ? 'success' : 'danger'}
                dismissible
                onClose={() => setMessage(null)}
                className="mb-4"
              >
                {message.text}
              </Alert>
            )}

            {loading && (
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">{processingStatus || 'Traitement en cours...'}</span>
                  {uploadProgress && (
                    <span className="text-muted">{uploadProgress.percentage}%</span>
                  )}
                </div>
                {uploadProgress && uploadProgress.total > 0 && (
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                      role="progressbar"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    ></div>
                  </div>
                )}
                {!uploadProgress && (
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                      role="progressbar"
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            <AlbumGrid 
              albums={sortedAlbums} 
              selectionMode={selectionMode}
              selectedAlbums={selectedAlbums}
              onSelectionChange={setSelectedAlbums}
            />
          </Col>
        </Row>
      </Container>
    </DragDropZone>
  )
}

export default Library
