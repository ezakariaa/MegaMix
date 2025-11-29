import * as https from 'https'
import * as http from 'http'

/**
 * Recherche spécifiquement l'image "artistbackground" (bannière d'artiste) depuis plusieurs sources
 * Ordre de recherche : Fanart.tv (artistbackground) -> Fanart.tv (artistthumb) -> Last.fm -> Deezer -> Spotify -> Discogs
 */
export async function searchArtistBackground(artistName: string): Promise<string | null> {
  if (!artistName || artistName.trim() === '') {
    return null
  }

  // PRIORITÉ 1 : Essayer Fanart.tv artistbackground en premier (bannière d'artiste)
  try {
    const fanartBackground = await searchFanartBackground(artistName)
    if (fanartBackground && await isImageAccessible(fanartBackground)) {
      console.log(`[ARTIST BACKGROUND] Image bannière trouvée sur Fanart.tv (artistbackground) pour: ${artistName}`)
      return fanartBackground
    } else if (fanartBackground) {
      console.warn(`[ARTIST BACKGROUND] Image Fanart.tv trouvée mais non accessible (403), essai des autres sources...`)
    }
  } catch (error) {
    console.warn(`[ARTIST BACKGROUND] Erreur Fanart.tv (background) pour ${artistName}:`, error)
  }

  // PRIORITÉ 2 : Essayer Fanart.tv artistthumb en second (photo de profil d'artiste)
  try {
    const fanartThumb = await searchFanartThumb(artistName)
    if (fanartThumb && await isImageAccessible(fanartThumb)) {
      console.log(`[ARTIST BACKGROUND] Image d'artiste (thumb) trouvée sur Fanart.tv pour: ${artistName}`)
      return fanartThumb
    } else if (fanartThumb) {
      console.warn(`[ARTIST BACKGROUND] Image Fanart.tv (thumb) trouvée mais non accessible (403), essai des autres sources...`)
    }
  } catch (error) {
    console.warn(`[ARTIST BACKGROUND] Erreur Fanart.tv (thumb) pour ${artistName}:`, error)
  }

  // PRIORITÉ 3 : Essayer Last.fm (retourne des photos d'artistes)
  try {
    const lastFmImage = await searchLastFm(artistName)
    if (lastFmImage && await isImageAccessible(lastFmImage)) {
      console.log(`[ARTIST BACKGROUND] Image d'artiste trouvée sur Last.fm pour: ${artistName}`)
      return lastFmImage
    } else if (lastFmImage) {
      console.warn(`[ARTIST BACKGROUND] Image Last.fm trouvée mais non accessible, essai des autres sources...`)
    }
  } catch (error) {
    console.warn(`[ARTIST BACKGROUND] Erreur Last.fm pour ${artistName}:`, error)
  }

  // PRIORITÉ 4 : Essayer Deezer
  try {
    const deezerImage = await searchDeezer(artistName)
    if (deezerImage && await isImageAccessible(deezerImage)) {
      console.log(`[ARTIST BACKGROUND] Image d'artiste trouvée sur Deezer pour: ${artistName}`)
      return deezerImage
    } else if (deezerImage) {
      console.warn(`[ARTIST BACKGROUND] Image Deezer trouvée mais non accessible, essai des autres sources...`)
    }
  } catch (error) {
    console.warn(`[ARTIST BACKGROUND] Erreur Deezer pour ${artistName}:`, error)
  }

  // PRIORITÉ 5 : Essayer Spotify
  try {
    const spotifyImage = await searchSpotify(artistName)
    if (spotifyImage && await isImageAccessible(spotifyImage)) {
      console.log(`[ARTIST BACKGROUND] Image d'artiste trouvée sur Spotify pour: ${artistName}`)
      return spotifyImage
    } else if (spotifyImage) {
      console.warn(`[ARTIST BACKGROUND] Image Spotify trouvée mais non accessible, essai des autres sources...`)
    }
  } catch (error) {
    console.warn(`[ARTIST BACKGROUND] Erreur Spotify pour ${artistName}:`, error)
  }

  // PRIORITÉ 6 : Essayer Discogs
  try {
    const discogsImage = await searchDiscogs(artistName)
    if (discogsImage && await isImageAccessible(discogsImage)) {
      console.log(`[ARTIST BACKGROUND] Image d'artiste trouvée sur Discogs pour: ${artistName}`)
      return discogsImage
    } else if (discogsImage) {
      console.warn(`[ARTIST BACKGROUND] Image Discogs trouvée mais non accessible`)
    }
  } catch (error) {
    console.warn(`[ARTIST BACKGROUND] Erreur Discogs pour ${artistName}:`, error)
  }

  console.log(`[ARTIST BACKGROUND] Aucune image d'artiste trouvée pour: ${artistName}`)
  return null
}

/**
 * Recherche l'image d'un artiste sur internet via plusieurs sources
 * Sources utilisées (dans l'ordre) :
 * 1. Last.fm API (gratuite, images d'artistes)
 * 2. Fanart.tv (meilleures images d'artistes, nécessite MusicBrainz ID)
 * 3. iTunes Search API (gratuite, couvertures d'albums)
 * 4. MusicBrainz (gratuite)
 */
export async function searchArtistImage(artistName: string): Promise<string | null> {
  if (!artistName || artistName.trim() === '') {
    return null
  }

  // Essayer Last.fm en premier
  try {
    const lastFmImage = await searchLastFm(artistName)
    if (lastFmImage) {
      console.log(`[ARTIST IMAGE] Image trouvée sur Last.fm pour: ${artistName}`)
      return lastFmImage
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur Last.fm pour ${artistName}:`, error)
  }

  // Essayer Fanart.tv en second
  try {
    const fanartImage = await searchFanart(artistName)
    if (fanartImage) {
      console.log(`[ARTIST IMAGE] Image trouvée sur Fanart.tv pour: ${artistName}`)
      return fanartImage
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur Fanart.tv pour ${artistName}:`, error)
  }

  // Essayer iTunes en troisième
  try {
    const iTunesImage = await searchiTunes(artistName)
    if (iTunesImage) {
      console.log(`[ARTIST IMAGE] Image trouvée sur iTunes pour: ${artistName}`)
      return iTunesImage
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur iTunes pour ${artistName}:`, error)
  }

  // Essayer MusicBrainz en dernier
  try {
    const musicBrainzImage = await searchMusicBrainz(artistName)
    if (musicBrainzImage) {
      console.log(`[ARTIST IMAGE] Image trouvée sur MusicBrainz pour: ${artistName}`)
      return musicBrainzImage
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur MusicBrainz pour ${artistName}:`, error)
  }

  console.log(`[ARTIST IMAGE] Aucune image trouvée pour: ${artistName}`)
  return null
}

/**
 * Recherche sur Last.fm
 * Note: Last.fm nécessite une clé API. On peut utiliser une clé publique de démo
 * ou permettre à l'utilisateur de configurer sa propre clé via LASTFM_API_KEY
 */
function searchLastFm(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    // Utiliser la clé API depuis les variables d'environnement ou une clé de démo
    const apiKey = process.env.LASTFM_API_KEY || 'c8c0ea12c9a1983cc29b3b5c6e8c8e4e'
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodedName}&api_key=${apiKey}&format=json`
    
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
            console.warn(`[ARTIST IMAGE] Erreur Last.fm API:`, json.error)
            resolve(null)
            return
          }
          if (json.artist && json.artist.image && json.artist.image.length > 0) {
            // Last.fm retourne plusieurs tailles, prendre la plus grande (extralarge ou mega)
            const largeImage = json.artist.image.find((img: any) => img.size === 'extralarge' || img.size === 'mega')
            const imageUrl = largeImage ? largeImage['#text'] : json.artist.image[json.artist.image.length - 1]['#text']
            if (imageUrl && imageUrl !== '' && !imageUrl.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
              // 2a96cbd8b46e442fc41c2b86b821562f est l'ID de l'image placeholder de Last.fm
              resolve(imageUrl)
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

/**
 * Recherche sur iTunes Search API
 * iTunes ne retourne pas d'image d'artiste directement, mais on peut chercher plusieurs albums
 * et utiliser la couverture du meilleur album comme image de l'artiste
 */
function searchiTunes(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    // Chercher plusieurs albums de l'artiste pour obtenir la meilleure image
    const url = `https://itunes.apple.com/search?term=${encodedName}&entity=album&limit=5`
    
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
          if (json.results && json.results.length > 0) {
            // Parcourir les albums pour trouver la meilleure image
            // Préférer les albums récents ou populaires
            for (const album of json.results) {
              // Vérifier que l'artiste correspond bien
              const artistMatch = album.artistName?.toLowerCase().includes(artistName.toLowerCase()) ||
                                artistName.toLowerCase().includes(album.artistName?.toLowerCase() || '')
              
              if (artistMatch && album.artworkUrl100) {
                // Prendre l'image la plus grande disponible
                // iTunes retourne artworkUrl100, on peut récupérer une version plus grande
                let imageUrl = album.artworkUrl100
                
                // Essayer de récupérer une version 600x600 (meilleure qualité)
                if (imageUrl.includes('100x100bb')) {
                  imageUrl = imageUrl.replace('100x100bb', '600x600bb')
                } else if (imageUrl.includes('100x100')) {
                  imageUrl = imageUrl.replace('100x100', '600x600')
                }
                
                if (imageUrl) {
                  resolve(imageUrl)
                  return
                }
              }
            }
            
            // Si aucun match exact, prendre le premier album
            const firstAlbum = json.results[0]
            if (firstAlbum.artworkUrl100) {
              let imageUrl = firstAlbum.artworkUrl100
              if (imageUrl.includes('100x100bb')) {
                imageUrl = imageUrl.replace('100x100bb', '600x600bb')
              } else if (imageUrl.includes('100x100')) {
                imageUrl = imageUrl.replace('100x100', '600x600')
              }
              if (imageUrl) {
                resolve(imageUrl)
                return
              }
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

/**
 * Recherche spécifiquement l'image "artistthumb" (photo de profil d'artiste) sur Fanart.tv
 * Nécessite un MusicBrainz ID, donc on cherche d'abord l'artiste sur MusicBrainz
 */
function searchFanartThumb(artistName: string): Promise<string | null> {
  return new Promise(async (resolve, reject) => {
    try {
      // D'abord, obtenir le MusicBrainz ID de l'artiste
      const musicBrainzId = await getMusicBrainzId(artistName)
      if (!musicBrainzId) {
        resolve(null)
        return
      }

      // Ensuite, chercher l'image artistthumb sur Fanart.tv
      const apiKey = process.env.FANART_API_KEY || ''
      const url = apiKey 
        ? `https://webservice.fanart.tv/v3/music/${musicBrainzId}?api_key=${apiKey}`
        : `https://webservice.fanart.tv/v3/music/${musicBrainzId}`

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
            console.log(`[FANART THUMB] Réponse API pour ${musicBrainzId}:`, JSON.stringify(json, null, 2).substring(0, 500))
            
            // Fanart.tv retourne artistthumb pour les photos de profil d'artistes
            // On préfère artistthumb (photo de profil) plutôt que artistbackground (bannière)
            if (json.artistthumb && json.artistthumb.length > 0) {
              // Trier par likes pour obtenir la meilleure qualité
              const thumbs = json.artistthumb.sort((a: any, b: any) => {
                return (b.likes || 0) - (a.likes || 0)
              })
              
              let imageUrl = thumbs[0].url
              
              // Si l'URL ne commence pas par http, construire l'URL complète
              if (imageUrl && !imageUrl.startsWith('http')) {
                // Format: https://images.fanart.tv/fanart/music/{musicbrainz-id}/artistthumb/{filename}
                imageUrl = `https://images.fanart.tv/fanart/music/${musicBrainzId}/artistthumb/${imageUrl}`
              }
              
              // Si l'URL est relative (commence par /), ajouter le domaine
              if (imageUrl && imageUrl.startsWith('/')) {
                imageUrl = `https://images.fanart.tv${imageUrl}`
              }
              
              console.log(`[FANART THUMB] URL de l'image: ${imageUrl}`)
              
              if (imageUrl) {
                resolve(imageUrl)
                return
              }
            }
            resolve(null)
          } catch (error) {
            console.error(`[FANART THUMB] Erreur parsing JSON:`, error)
            console.error(`[FANART THUMB] Données reçues:`, data.substring(0, 500))
            reject(error)
          }
        })
      }).on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Recherche spécifiquement l'image "artistbackground" (bannière d'artiste) sur Fanart.tv
 * Nécessite un MusicBrainz ID, donc on cherche d'abord l'artiste sur MusicBrainz
 */
function searchFanartBackground(artistName: string): Promise<string | null> {
  return new Promise(async (resolve, reject) => {
    try {
      // D'abord, obtenir le MusicBrainz ID de l'artiste
      const musicBrainzId = await getMusicBrainzId(artistName)
      if (!musicBrainzId) {
        resolve(null)
        return
      }

      // Ensuite, chercher l'image artistbackground sur Fanart.tv
      const apiKey = process.env.FANART_API_KEY || ''
      const url = apiKey 
        ? `https://webservice.fanart.tv/v3/music/${musicBrainzId}?api_key=${apiKey}`
        : `https://webservice.fanart.tv/v3/music/${musicBrainzId}`

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
            console.log(`[FANART] Réponse API pour ${musicBrainzId}:`, JSON.stringify(json, null, 2).substring(0, 500))
            
            // Fanart.tv retourne artistbackground pour les bannières d'artistes
            // On cherche spécifiquement artistbackground (pas artistthumb)
            if (json.artistbackground && json.artistbackground.length > 0) {
              // Prendre la première bannière (généralement la meilleure)
              // On peut aussi prendre celle avec le meilleur score si disponible
              const backgrounds = json.artistbackground.sort((a: any, b: any) => {
                // Trier par likes (si disponible) ou prendre la première
                return (b.likes || 0) - (a.likes || 0)
              })
              
              // L'API Fanart.tv retourne soit une URL complète, soit juste un nom de fichier
              let imageUrl = backgrounds[0].url
              
              console.log(`[FANART] URL brute retournée par l'API: ${imageUrl}`)
              
              // Si l'URL ne commence pas par http, construire l'URL complète
              if (imageUrl && !imageUrl.startsWith('http')) {
                // Format: https://images.fanart.tv/fanart/music/{musicbrainz-id}/artistbackground/{filename}
                imageUrl = `https://images.fanart.tv/fanart/music/${musicBrainzId}/artistbackground/${imageUrl}`
              }
              
              // Si l'URL est relative (commence par /), ajouter le domaine
              if (imageUrl && imageUrl.startsWith('/')) {
                imageUrl = `https://images.fanart.tv${imageUrl}`
              }
              
              // Si l'URL contient assets.fanart.tv, remplacer par images.fanart.tv
              if (imageUrl && imageUrl.includes('assets.fanart.tv')) {
                imageUrl = imageUrl.replace('assets.fanart.tv', 'images.fanart.tv')
              }
              
              console.log(`[FANART] URL finale de l'image bannière: ${imageUrl}`)
              console.log(`[FANART] MusicBrainz ID: ${musicBrainzId}`)
              
              if (imageUrl && imageUrl.startsWith('http')) {
                resolve(imageUrl)
                return
              }
            }
            resolve(null)
          } catch (error) {
            console.error(`[FANART] Erreur parsing JSON:`, error)
            console.error(`[FANART] Données reçues:`, data.substring(0, 500))
            reject(error)
          }
        })
      }).on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Recherche sur Fanart.tv (meilleures images d'artistes)
 * Nécessite un MusicBrainz ID, donc on cherche d'abord l'artiste sur MusicBrainz
 */
function searchFanart(artistName: string): Promise<string | null> {
  return new Promise(async (resolve, reject) => {
    try {
      // D'abord, obtenir le MusicBrainz ID de l'artiste
      const musicBrainzId = await getMusicBrainzId(artistName)
      if (!musicBrainzId) {
        resolve(null)
        return
      }

      // Ensuite, chercher l'image sur Fanart.tv
      const apiKey = process.env.FANART_API_KEY || ''
      // Fanart.tv permet l'accès sans clé API pour les requêtes publiques, mais avec une clé c'est mieux
      const url = apiKey 
        ? `https://webservice.fanart.tv/v3/music/${musicBrainzId}?api_key=${apiKey}`
        : `https://webservice.fanart.tv/v3/music/${musicBrainzId}`

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
            // Fanart.tv retourne plusieurs types d'images : artistbackground, artistthumb, hdmusiclogo, etc.
            // On préfère artistbackground (bannière) ou artistthumb (photo de l'artiste)
            if (json.artistbackground && json.artistbackground.length > 0) {
              // Prendre la première bannière (généralement la meilleure)
              const imageUrl = json.artistbackground[0].url
              if (imageUrl) {
                resolve(imageUrl)
                return
              }
            }
            if (json.artistthumb && json.artistthumb.length > 0) {
              // Sinon, prendre la première photo de l'artiste
              const imageUrl = json.artistthumb[0].url
              if (imageUrl) {
                resolve(imageUrl)
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
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Obtient le MusicBrainz ID d'un artiste
 */
function getMusicBrainzId(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    const url = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodedName}&fmt=json&limit=1`
    
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'))
    }, 5000)
    
    https.get(url, {
      headers: {
        'User-Agent': 'MegaMix/1.0 (https://github.com/your-repo)',
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
          if (json.artists && json.artists.length > 0) {
            const artist = json.artists[0]
            resolve(artist.id)
          } else {
            resolve(null)
          }
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

/**
 * Recherche sur MusicBrainz (via Cover Art Archive)
 */
function searchMusicBrainz(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    const url = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodedName}&fmt=json&limit=1`
    
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'))
    }, 5000)
    
    https.get(url, {
      headers: {
        'User-Agent': 'MegaMix/1.0 (https://github.com/your-repo)',
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
          if (json.artists && json.artists.length > 0) {
            const artist = json.artists[0]
            // MusicBrainz ne retourne pas directement d'image, mais on peut utiliser Cover Art Archive
            // Pour l'instant, on retourne null
            resolve(null)
          } else {
            resolve(null)
          }
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

/**
 * Recherche sur Deezer API
 */
function searchDeezer(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    const url = `https://api.deezer.com/search/artist?q=${encodedName}&limit=1`

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
          if (json.data && json.data.length > 0) {
            const artist = json.data[0]
            if (artist.picture_big || artist.picture_medium || artist.picture) {
              // Prendre la plus grande image disponible
              const imageUrl = artist.picture_big || artist.picture_medium || artist.picture
              if (imageUrl && imageUrl !== '') {
                resolve(imageUrl)
                return
              }
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

/**
 * Recherche sur Spotify API (nécessite une clé API)
 */
function searchSpotify(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    // Spotify nécessite OAuth, donc on utilise une approche alternative
    // On peut utiliser l'API publique de Spotify sans authentification pour certaines requêtes
    const encodedName = encodeURIComponent(artistName)
    const url = `https://api.spotify.com/v1/search?q=${encodedName}&type=artist&limit=1`

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
          // Spotify nécessite généralement une authentification
          // Si la requête échoue, on retourne null
          if (response.statusCode === 401 || response.statusCode === 403) {
            resolve(null)
            return
          }
          
          const json = JSON.parse(data)
          if (json.artists && json.artists.items && json.artists.items.length > 0) {
            const artist = json.artists.items[0]
            if (artist.images && artist.images.length > 0) {
              // Prendre la plus grande image
              const imageUrl = artist.images[0].url
              if (imageUrl) {
                resolve(imageUrl)
                return
              }
            }
          }
          resolve(null)
        } catch (error) {
          resolve(null) // Ne pas rejeter, juste retourner null
        }
      })
    }).on('error', (err) => {
      clearTimeout(timeout)
      resolve(null) // Ne pas rejeter, juste retourner null
    })
  })
}

/**
 * Recherche sur Discogs API
 */
function searchDiscogs(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    // Discogs API nécessite un User-Agent personnalisé
    const url = `https://api.discogs.com/database/search?q=${encodedName}&type=artist&per_page=1`

    const timeout = setTimeout(() => {
      reject(new Error('Timeout'))
    }, 5000)

    https.get(url, {
      headers: {
        'User-Agent': 'MegaMix/1.0 (https://github.com/your-repo)',
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
          if (json.results && json.results.length > 0) {
            const result = json.results[0]
            if (result.thumb || result.cover_image) {
              const imageUrl = result.cover_image || result.thumb
              if (imageUrl && imageUrl !== '') {
                resolve(imageUrl)
                return
              }
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

/**
 * Recherche alternative : utiliser une recherche Google Images via DuckDuckGo ou autre
 * Note: Cette approche est plus complexe et peut nécessiter du scraping
 */
/**
 * Vérifie si une image est accessible (pas d'erreur 403, 404, etc.)
 */
function isImageAccessible(imageUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const protocol = imageUrl.startsWith('https') ? https : http
    const timeout = setTimeout(() => {
      resolve(false)
    }, 3000) // Timeout court pour ne pas ralentir

    protocol.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.google.com/'
      },
      timeout: 3000
    }, (response: any) => {
      clearTimeout(timeout)
      // Vérifier si l'image est accessible (200 OK)
      // Accepter aussi les redirections (301, 302, 303, 307, 308)
      if (response.statusCode === 200 || 
          response.statusCode === 301 || 
          response.statusCode === 302 || 
          response.statusCode === 303 || 
          response.statusCode === 307 || 
          response.statusCode === 308) {
        resolve(true)
      } else {
        // Erreur 403, 404, etc. - image non accessible
        resolve(false)
      }
      // Fermer la connexion
      response.destroy()
    }).on('error', () => {
      clearTimeout(timeout)
      resolve(false)
    }).on('timeout', () => {
      resolve(false)
    })
  })
}

export async function searchArtistImageAlternative(artistName: string): Promise<string | null> {
  // Pour l'instant, on utilise une approche simple avec Last.fm
  // On peut améliorer avec d'autres sources plus tard
  return searchLastFm(artistName)
}

