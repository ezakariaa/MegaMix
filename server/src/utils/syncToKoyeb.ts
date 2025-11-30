/**
 * Utilitaires pour synchroniser les données avec Railway (ou Koyeb pour compatibilité)
 */

import { Album, Track, Artist } from '../types'

/**
 * Synchronise les données avec le backend Railway/Koyeb déployé
 * Cette fonction est appelée après chaque ajout/suppression local pour maintenir la synchronisation
 */
export async function syncToKoyeb(
  albums: Album[],
  tracks: Track[],
  artists: Artist[]
): Promise<void> {
  // Récupérer l'URL depuis les variables d'environnement (Railway ou Koyeb)
  const remoteUrl = process.env.RAILWAY_URL || process.env.KOYEB_URL || process.env.VITE_API_URL
  
  // Si on n'a pas d'URL configurée, ne rien faire
  if (!remoteUrl) {
    console.log('[SYNC] Aucune URL distante configurée, synchronisation ignorée')
    return
  }

  // Si on est déjà sur Railway/Koyeb (en production), ne pas se synchroniser avec soi-même
  const isProduction = process.env.NODE_ENV === 'production'
  const isRailway = remoteUrl.includes('railway.app')
  const isKoyeb = remoteUrl.includes('koyeb.app')
  
  if (isProduction && (isRailway || isKoyeb)) {
    console.log('[SYNC] Déjà sur le serveur distant, synchronisation ignorée')
    return
  }

  // Construire l'URL de l'endpoint d'import
  const importUrl = `${remoteUrl.replace(/\/$/, '')}/api/music/import-data`

  const serviceName = isRailway ? 'Railway' : isKoyeb ? 'Koyeb' : 'distant'
  console.log(`[SYNC ${serviceName.toUpperCase()}] Synchronisation vers ${importUrl}...`)

  try {
    const https = require('https')
    const http = require('http')
    const { URL } = require('url')

    const payload = JSON.stringify({
      albums,
      tracks,
      artists,
    })

    const url = new URL(importUrl)
    const protocol = url.protocol === 'https:' ? https : http

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 60000, // 60 secondes
    }

    await new Promise<void>((resolve, reject) => {
      const req = protocol.request(options, (res: any) => {
        let data = ''

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString()
        })

        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              const response = JSON.parse(data)
              console.log(`[SYNC ${serviceName.toUpperCase()}] Synchronisation réussie: ${response.counts?.albums || 0} albums, ${response.counts?.tracks || 0} tracks, ${response.counts?.artists || 0} artists`)
              resolve()
            } catch (error) {
              console.warn(`[SYNC ${serviceName.toUpperCase()}] Réponse reçue mais erreur de parsing:`, error)
              resolve() // On considère que c'est un succès si on a reçu une réponse 200
            }
          } else {
            console.error(`[SYNC ${serviceName.toUpperCase()}] Erreur HTTP ${res.statusCode}:`, data.substring(0, 500))
            // Ne pas rejeter pour ne pas bloquer l'ajout local
            resolve()
          }
        })
      })

      req.on('error', (error: Error) => {
        console.error(`[SYNC ${serviceName.toUpperCase()}] Erreur réseau lors de la synchronisation:`, error.message)
        // Ne pas rejeter pour ne pas bloquer l'ajout local
        resolve()
      })

      req.on('timeout', () => {
        console.warn(`[SYNC ${serviceName.toUpperCase()}] Timeout lors de la synchronisation`)
        req.destroy()
        resolve() // Ne pas bloquer l'ajout local
      })

      req.write(payload)
      req.end()
    })
  } catch (error: any) {
    // Ne pas faire échouer l'ajout local si la synchronisation échoue
    const serviceName = isRailway ? 'Railway' : isKoyeb ? 'Koyeb' : 'distant'
    console.error(`[SYNC ${serviceName.toUpperCase()}] Erreur lors de la synchronisation:`, error.message)
  }
}

