import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import musicRoutes from './routes/music'
import { ensureUploadDirectory } from './utils/fileUtils'

dotenv.config()

const app = express()
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000

// Créer le dossier de téléchargement (async, mais on ne bloque pas le démarrage)
ensureUploadDirectory().catch(err => {
  console.error('⚠️  Erreur lors de la création du dossier uploads:', err)
})

// Configuration CORS
// En production, accepter toutes les origines si ALLOWED_ORIGINS n'est pas défini
// Sinon, utiliser la liste des origines autorisées
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : process.env.NODE_ENV === 'production' 
    ? ['*'] // En production, accepter toutes les origines par défaut
    : ['http://localhost:3000'] // En développement, seulement localhost

app.use(cors({
  origin: (origin, callback) => {
    // En production sans origine spécifique, autoriser toutes les origines
    if (allowedOrigins.includes('*') || !origin) {
      return callback(null, true)
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Middleware
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

// Routes de base
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MuZak Server is running',
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  })
})

// Route racine pour diagnostiquer
app.get('/', (req, res) => {
  res.json({ 
    message: 'MuZak API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      albums: '/api/music/albums',
      tracks: '/api/music/tracks',
      artists: '/api/music/artists'
    },
    port: PORT,
    host: HOST
  })
})

// Routes API
app.use('/api/music', musicRoutes)

// Route pour obtenir tous les genres (doit accéder aux données de musicRoutes)
// On va créer une route dans musicRoutes à la place

app.get('/api/playlists', (req, res) => {
  res.json({ playlists: [] })
})

// Démarrage du serveur
// Écouter sur 0.0.0.0 pour être accessible depuis Railway
const HOST = process.env.HOST || '0.0.0.0'
app.listen(PORT, HOST, () => {
  console.log(`🚀 Serveur MuZak démarré sur le port ${PORT}`)
  console.log(`📍 URL: http://${HOST}:${PORT}`)
  
  // Vérifier la configuration de la clé API Google Drive
  if (process.env.GOOGLE_API_KEY) {
    console.log(`✅ Clé API Google Drive configurée (${process.env.GOOGLE_API_KEY.substring(0, 10)}...)`)
  } else {
    console.log(`⚠️  Clé API Google Drive non configurée - l'import depuis Google Drive ne fonctionnera pas`)
  }

  // Charger automatiquement les images d'artistes depuis Google Drive si configuré
  const ARTIST_IMAGES_FOLDER_ID = process.env.ARTIST_IMAGES_FOLDER_ID
  if (ARTIST_IMAGES_FOLDER_ID && process.env.GOOGLE_API_KEY) {
    console.log(`📁 Chargement automatique des images d'artistes depuis Google Drive...`)
    console.log(`📁 Folder ID: ${ARTIST_IMAGES_FOLDER_ID}`)
    const { loadArtistImagesFromGoogleDrive } = require('./utils/googleDriveImages')
    loadArtistImagesFromGoogleDrive(ARTIST_IMAGES_FOLDER_ID)
      .then(() => {
        console.log(`✅ Images d'artistes chargées depuis Google Drive`)
        // Vérifier le cache après chargement
        const { getGoogleDriveImagesCache } = require('./utils/googleDriveImages')
        const cache = getGoogleDriveImagesCache()
        console.log(`📊 Cache Google Drive: ${cache.size} image(s) chargée(s)`)
        if (cache.size > 0) {
          const cacheKeys = Array.from(cache.keys())
          console.log(`📊 Exemples d'artistes dans le cache: ${cacheKeys.slice(0, 5).join(', ')}`)
        }
      })
      .catch((err: Error) => {
        console.warn(`⚠️  Erreur lors du chargement des images depuis Google Drive:`, err.message)
        console.error(`⚠️  Détails de l'erreur:`, err)
      })
  } else if (ARTIST_IMAGES_FOLDER_ID) {
    console.log(`⚠️  ARTIST_IMAGES_FOLDER_ID configuré mais GOOGLE_API_KEY manquante`)
  } else {
    console.log(`ℹ️  ARTIST_IMAGES_FOLDER_ID non configuré - les images Google Drive ne seront pas chargées automatiquement`)
  }
})
