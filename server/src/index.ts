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
// Par défaut, autoriser TOUTES les origines pour faciliter le déploiement
// Si ALLOWED_ORIGINS est défini, utiliser cette liste spécifique
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS?.trim()
let allowedOrigins: string[] = ['*'] // Par défaut, autoriser toutes les origines

if (allowedOriginsEnv && allowedOriginsEnv !== '*') {
  // Si ALLOWED_ORIGINS est défini et n'est pas '*', utiliser la liste spécifique
  allowedOrigins = allowedOriginsEnv.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0)
} else if (!allowedOriginsEnv && process.env.NODE_ENV === 'development') {
  // En développement local seulement, restreindre à localhost
  allowedOrigins = ['http://localhost:3000', 'http://localhost:5173']
}

// Log de la configuration CORS pour le débogage
console.log(`[CORS] ===== Configuration CORS =====`)
console.log(`[CORS]   NODE_ENV: ${process.env.NODE_ENV || 'non défini'}`)
console.log(`[CORS]   ALLOWED_ORIGINS: ${allowedOriginsEnv || 'non défini (autorise TOUTES les origines)'}`)
console.log(`[CORS]   Origines autorisées: ${allowedOrigins.includes('*') ? '✅ TOUTES (*)' : allowedOrigins.join(', ')}`)

app.use(cors({
  origin: (origin, callback) => {
    // Log toutes les requêtes pour le débogage
    console.log(`[CORS] 🔍 Requête reçue - Origine: ${origin || 'aucune (même domaine/Postman)'}`)
    
    // Si '*' est dans la liste, autoriser toutes les origines
    if (allowedOrigins.includes('*')) {
      console.log(`[CORS] ✅ Autorisation accordée (mode '*')`)
      return callback(null, true)
    }
    
    // Si aucune origine n'est fournie (requêtes depuis le même domaine, Postman, etc.), autoriser
    if (!origin) {
      console.log(`[CORS] ✅ Autorisation accordée (pas d'origine)`)
      return callback(null, true)
    }
    
    // Vérifier si l'origine est dans la liste autorisée
    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] ✅ Autorisation accordée (dans la liste)`)
      return callback(null, true)
    }
    
    // Log pour le débogage
    console.warn(`[CORS] ⚠️  Origine bloquée: ${origin}`)
    console.warn(`[CORS]   Origines autorisées: ${allowedOrigins.join(', ')}`)
    console.warn(`[CORS]   Pour autoriser cette origine, configurez ALLOWED_ORIGINS sur Railway`)
    
    callback(new Error(`Not allowed by CORS. Origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
}))

// Middleware pour logger toutes les requêtes entrantes (après CORS)
app.use((req, res, next) => {
  const origin = req.headers.origin || 'aucune'
  console.log(`[REQUEST] ${req.method} ${req.path} - Origine: ${origin}`)
  next()
})

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
  
  // Images d'artistes récupérées automatiquement via les APIs fanart (iTunes, Last.fm, Fanart.tv, TheAudioDB)
  console.log(`ℹ️  Récupération automatique des images d'artistes via les APIs fanart`)
})
