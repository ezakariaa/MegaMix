/**
 * Utilitaires pour synchroniser les données avec Koyeb
 */

import { Album, Track, Artist } from '../types'

/**
 * Synchronise les données avec le backend Koyeb déployé
 * Cette fonction est appelée après chaque ajout local pour maintenir la synchronisation
 */
export async function syncToKoyeb(
  albums: Album[],
  tracks: Track[],
  artists: Artist[]
): Promise<void> {
  // Récupérer l'URL de Koyeb depuis les variables d'environnement
  const koyebUrl = process.env.KOYEB_URL || process.env.VITE_API_URL
  
  // Si on n'a pas d'URL Koyeb configurée, ne rien faire
  if (!koyebUrl) {
    console.log('[SYNC KOYEB] Aucune URL Koyeb configurée, synchronisation ignorée')
    return
  }

  // Si on est déjà sur Koyeb (en production), ne pas se synchroniser avec soi-même
  if (process.env.NODE_ENV === 'production' && koyebUrl.includes('koyeb.app')) {
    console.log('[SYNC KOYEB] Déjà sur Koyeb, synchronisation ignorée')
    return
  }

  // Construire l'URL de l'endpoint d'import
  const importUrl = `${koyebUrl.replace(/\/$/, '')}/api/music/import-data`

  console.log(`[SYNC KOYEB] Synchronisation vers ${importUrl}...`)

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
              console.log(`[SYNC KOYEB] Synchronisation réussie: ${response.counts?.albums || 0} albums, ${response.counts?.tracks || 0} tracks, ${response.counts?.artists || 0} artists`)
              resolve()
            } catch (error) {
              console.warn('[SYNC KOYEB] Réponse reçue mais erreur de parsing:', error)
              resolve() // On considère que c'est un succès si on a reçu une réponse 200
            }
          } else {
            console.error(`[SYNC KOYEB] Erreur HTTP ${res.statusCode}:`, data.substring(0, 500))
            // Ne pas rejeter pour ne pas bloquer l'ajout local
            resolve()
          }
        })
      })

      req.on('error', (error: Error) => {
        console.error('[SYNC KOYEB] Erreur réseau lors de la synchronisation:', error.message)
        // Ne pas rejeter pour ne pas bloquer l'ajout local
        resolve()
      })

      req.on('timeout', () => {
        console.warn('[SYNC KOYEB] Timeout lors de la synchronisation')
        req.destroy()
        resolve() // Ne pas bloquer l'ajout local
      })

      req.write(payload)
      req.end()
    })
  } catch (error: any) {
    // Ne pas faire échouer l'ajout local si la synchronisation échoue
    console.error('[SYNC KOYEB] Erreur lors de la synchronisation:', error.message)
  }
}

