import * as https from 'https'

/**
 * Récupère la biographie d'un artiste depuis Last.fm
 */
export async function getArtistBiography(artistName: string): Promise<string | null> {
  if (!artistName || artistName.trim() === '') {
    return null
  }

  try {
    const biography = await searchLastFmBiography(artistName)
    if (biography) {
      console.log(`[BIOGRAPHY] Biographie trouvée sur Last.fm pour: ${artistName}`)
      return biography
    }
  } catch (error) {
    console.warn(`[BIOGRAPHY] Erreur Last.fm pour ${artistName}:`, error)
  }

  console.log(`[BIOGRAPHY] Aucune biographie trouvée pour: ${artistName}`)
  return null
}

/**
 * Recherche la biographie sur Last.fm
 */
function searchLastFmBiography(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    const apiKey = process.env.LASTFM_API_KEY || 'c8c0ea12c9a1983cc29b3b5c6e8c8e4e'
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodedName}&api_key=${apiKey}&format=json&lang=fr`

    const timeout = setTimeout(() => {
      reject(new Error('Timeout'))
    }, 5000)

    https.get(url, {
      headers: {
        'User-Agent': 'MegaMix/1.0',
        'Accept': 'application/json'
      }
    }, (response: any) => {
      let data = ''
      
      response.on('data', (chunk: Buffer) => {
        data += chunk.toString()
      })
      
      response.on('end', () => {
        clearTimeout(timeout)
        try {
          const json = JSON.parse(data)
          if (json.error) {
            console.warn(`[BIOGRAPHY] Erreur Last.fm API:`, json.error)
            resolve(null)
            return
          }
          if (json.artist && json.artist.bio && json.artist.bio.content) {
            // Nettoyer la biographie (supprimer les liens Last.fm)
            let biography = json.artist.bio.content.trim()
            // Supprimer les références Last.fm à la fin
            biography = biography.replace(/<a[^>]*>Read more on Last\.fm<\/a>\.?/gi, '')
            biography = biography.replace(/User-contributed text.*$/gi, '')
            // Supprimer les balises HTML restantes
            biography = biography.replace(/<[^>]*>/g, '')
            // Limiter à 500 caractères
            if (biography.length > 500) {
              biography = biography.substring(0, 500) + '...'
            }
            if (biography && biography.length > 20) {
              resolve(biography)
              return
            }
          }
          resolve(null)
        } catch (error) {
          reject(error)
        }
      })
    }).on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}




