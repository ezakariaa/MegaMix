import { Container, Row, Col } from 'react-bootstrap'
import './Home.css'

function Playlists() {
  return (
    <Container fluid className="playlists-page">
      <Row>
        <Col>
          <h1 className="page-title">
            <i className="bi bi-list-ul me-2"></i>
            Playlists
          </h1>
          <p className="text-muted">Gérez vos playlists personnalisées (à implémenter)</p>
        </Col>
      </Row>
    </Container>
  )
}

export default Playlists
