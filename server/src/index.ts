import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import musicRoutes from './routes/music'
import { ensureUploadDirectory } from './utils/fileUtils'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Créer le dossier de téléchargement
ensureUploadDirectory()

// Configuration CORS plus permissive pour le développement
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Middleware
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

// Routes de base
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MuZak Server is running' })
})

// Routes API
app.use('/api/music', musicRoutes)

// Route pour obtenir tous les genres (doit accéder aux données de musicRoutes)
// On va créer une route dans musicRoutes à la place

app.get('/api/playlists', (req, res) => {
  res.json({ playlists: [] })
})

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur MuZak démarré sur le port ${PORT}`)
  console.log(`📍 URL: http://localhost:${PORT}`)
  
  // Vérifier la configuration de la clé API Google Drive
  if (process.env.GOOGLE_API_KEY) {
    console.log(`✅ Clé API Google Drive configurée (${process.env.GOOGLE_API_KEY.substring(0, 10)}...)`)
  } else {
    console.log(`⚠️  Clé API Google Drive non configurée - l'import depuis Google Drive ne fonctionnera pas`)
  }
})
