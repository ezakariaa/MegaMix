import { useState } from 'react'
import { Container, Form, Button, Alert, Card } from 'react-bootstrap'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

interface TagAnalysis {
  success: boolean
  filename: string
  commonTags: any
  nativeTags: {
    count: number
    tags: Array<{
      id: string
      value: any
      type: string
      length?: number
    }>
  }
  specificTags: {
    TPE1: any
    TPE2: any
    TPE3: any
    TPE4: any
    TALB: any
    TIT2: any
    TYER: any
    TCON: any
    TRCK: any
    TPOS: any
    TCOM: any
  }
  formatInfo: any
  summary: {
    title: string
    artist: string
    album: string
    albumArtist: string
    hasTPE1: boolean
    hasTPE2: boolean
    hasTPE3: boolean
    hasTPE4: boolean
    totalNativeTags: number
  }
}

function AnalyzeTags() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TagAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
      setError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post<TagAnalysis>(
        `${API_BASE_URL}/music/analyze-tags`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      setResult(response.data)
    } catch (err: any) {
      console.error('Erreur lors de l\'analyse:', err)
      setError(err.response?.data?.error || err.message || 'Erreur lors de l\'analyse du fichier')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="py-4">
      <h1 className="mb-4">
        <i className="bi bi-tags me-2"></i>
        Analyse des tags MP3
      </h1>

      <Card className="mb-4">
        <Card.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Sélectionner un fichier MP3</Form.Label>
              <Form.Control
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={loading}
              />
              <Form.Text className="text-muted">
                Sélectionnez un fichier audio pour analyser tous ses tags ID3
              </Form.Text>
            </Form.Group>
            <Button
              variant="primary"
              onClick={handleAnalyze}
              disabled={!file || loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Analyse en cours...
                </>
              ) : (
                <>
                  <i className="bi bi-search me-2"></i>
                  Analyser les tags
                </>
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {result && (
        <div>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Résumé</h5>
            </Card.Header>
            <Card.Body>
              <p><strong>Fichier:</strong> {result.filename}</p>
              <p><strong>Titre:</strong> {result.summary.title}</p>
              <p><strong>Artiste:</strong> {result.summary.artist}</p>
              <p><strong>Album:</strong> {result.summary.album}</p>
              <p><strong>Album Artist:</strong> {result.summary.albumArtist}</p>
              <hr />
              <p><strong>Tags ID3 présents:</strong></p>
              <ul>
                <li>TPE1 (Artiste principal): {result.summary.hasTPE1 ? '✓ Oui' : '✗ Non'}</li>
                <li>TPE2 (Groupe/Orchestre): {result.summary.hasTPE2 ? '✓ Oui' : '✗ Non'}</li>
                <li>TPE3 (Chef d'orchestre): {result.summary.hasTPE3 ? '✓ Oui' : '✗ Non'}</li>
                <li>TPE4 (Remixeur): {result.summary.hasTPE4 ? '✓ Oui' : '✗ Non'}</li>
              </ul>
              <p><strong>Total de tags natifs:</strong> {result.summary.totalNativeTags}</p>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Tags communs (normalisés)</h5>
            </Card.Header>
            <Card.Body>
              <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
                {JSON.stringify(result.commonTags, null, 2)}
              </pre>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Tags ID3 spécifiques</h5>
            </Card.Header>
            <Card.Body>
              <ul>
                <li><strong>TPE1</strong> (Artiste principal): {result.specificTags.TPE1 || 'Non défini'}</li>
                <li><strong>TPE2</strong> (Groupe/Orchestre): {result.specificTags.TPE2 || 'Non défini'}</li>
                <li><strong>TPE3</strong> (Chef d'orchestre): {result.specificTags.TPE3 || 'Non défini'}</li>
                <li><strong>TPE4</strong> (Remixeur): {result.specificTags.TPE4 || 'Non défini'}</li>
                <li><strong>TALB</strong> (Album): {result.specificTags.TALB || 'Non défini'}</li>
                <li><strong>TIT2</strong> (Titre): {result.specificTags.TIT2 || 'Non défini'}</li>
                <li><strong>TYER</strong> (Année): {result.specificTags.TYER || 'Non défini'}</li>
                <li><strong>TCON</strong> (Genre): {result.specificTags.TCON || 'Non défini'}</li>
                <li><strong>TRCK</strong> (Numéro de piste): {result.specificTags.TRCK || 'Non défini'}</li>
                <li><strong>TPOS</strong> (Numéro de disque): {result.specificTags.TPOS || 'Non défini'}</li>
                <li><strong>TCOM</strong> (Compositeur): {result.specificTags.TCOM || 'Non défini'}</li>
              </ul>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Tous les tags natifs ({result.nativeTags.count})</h5>
            </Card.Header>
            <Card.Body>
              <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px', overflow: 'auto', maxHeight: '400px' }}>
                {JSON.stringify(result.nativeTags.tags, null, 2)}
              </pre>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Informations sur le format</h5>
            </Card.Header>
            <Card.Body>
              <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
                {JSON.stringify(result.formatInfo, null, 2)}
              </pre>
            </Card.Body>
          </Card>
        </div>
      )}
    </Container>
  )
}

export default AnalyzeTags


