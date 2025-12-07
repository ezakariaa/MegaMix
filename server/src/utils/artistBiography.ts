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
 * Essaie plusieurs variantes du nom pour améliorer les chances de trouver une biographie
 */
function searchLastFmBiography(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    // Essayer plusieurs variantes du nom pour améliorer les chances de trouver une biographie
    const nameVariants = [
      artistName, // Nom original
      artistName.split(',')[0].trim(), // Si plusieurs artistes, prendre le premier
      artistName.split(' & ')[0].trim(), // Si "Artiste A & Artiste B", prendre le premier
      artistName.split(' and ')[0].trim(), // Si "Artiste A and Artiste B", prendre le premier
    ]
    
    // Supprimer les doublons
    const uniqueVariants = Array.from(new Set(nameVariants))
    
    // Essayer chaque variante jusqu'à trouver une biographie
    let attempts = 0
    const maxAttempts = uniqueVariants.length
    
    const tryNextVariant = (index: number) => {
      if (index >= maxAttempts) {
        resolve(null)
        return
      }
      
      const variant = uniqueVariants[index]
      const encodedName = encodeURIComponent(variant)
      const apiKey = process.env.LASTFM_API_KEY || 'c8c0ea12c9a1983cc29b3b5c6e8c8e4e'
      const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodedName}&api_key=${apiKey}&format=json&lang=fr`

      const timeout = setTimeout(() => {
        // Si timeout, essayer la variante suivante
        tryNextVariant(index + 1)
      }, 3000) // Timeout réduit à 3 secondes par variante

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
              // Si erreur, essayer la variante suivante
              console.warn(`[BIOGRAPHY] Erreur Last.fm API pour "${variant}":`, json.error)
              tryNextVariant(index + 1)
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
              // Décoder les entités HTML
              biography = biography.replace(/&quot;/g, '"')
              biography = biography.replace(/&amp;/g, '&')
              biography = biography.replace(/&lt;/g, '<')
              biography = biography.replace(/&gt;/g, '>')
              biography = biography.replace(/&nbsp;/g, ' ')
              // Limiter à 500 caractères
              if (biography.length > 500) {
                biography = biography.substring(0, 500) + '...'
              }
              if (biography && biography.length > 20) {
                console.log(`[BIOGRAPHY] Biographie trouvée pour "${variant}" (variante ${index + 1}/${maxAttempts})`)
                resolve(biography)
                return
              }
            }
            // Si pas de biographie valide, essayer la variante suivante
            tryNextVariant(index + 1)
          } catch (error) {
            // En cas d'erreur de parsing, essayer la variante suivante
            tryNextVariant(index + 1)
          }
        })
      }).on('error', (err) => {
        clearTimeout(timeout)
        // En cas d'erreur réseau, essayer la variante suivante
        tryNextVariant(index + 1)
      })
    }
    
    // Lancer la première tentative
    tryNextVariant(0)
  })
}
