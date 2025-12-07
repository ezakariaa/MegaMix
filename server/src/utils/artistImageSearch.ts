import * as https from 'https'

/**
 * Récupère le MusicBrainz ID d'un artiste
 */
async function getMusicBrainzId(artistName: string): Promise<string | null> {
  if (!artistName || artistName.trim() === '') {
    return null
  }

  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    const url = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodedName}&fmt=json&limit=1`
    
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
          if (json.artists && json.artists.length > 0) {
            resolve(json.artists[0].id)
            return
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
 * Recherche une image d'artiste via iTunes Search API
 */
function searchiTunes(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    const url = `https://itunes.apple.com/search?term=${encodedName}&entity=musicArtist&limit=1`

    console.log(`[ITUNES] Recherche pour: ${artistName}`)
    console.log(`[ITUNES] URL: ${url}`)

    const timeout = setTimeout(() => {
      console.log(`[ITUNES] Timeout pour ${artistName}`)
      resolve(null)
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
          console.log(`[ITUNES] Réponse reçue pour ${artistName}, nombre de résultats: ${json.results ? json.results.length : 0}`)

          if (json.results && json.results.length > 0) {
            const artist = json.results[0]
            console.log(`[ITUNES] Artiste trouvé: ${artist.artistName || artistName}`)
            console.log(`[ITUNES] artistArtworkUrl100: ${artist.artistArtworkUrl100 || 'N/A'}`)
            console.log(`[ITUNES] artistArtworkUrl60: ${artist.artistArtworkUrl60 || 'N/A'}`)
            
            // iTunes retourne l'image de l'artiste dans artistArtworkUrl100 ou artistArtworkUrl60
            // On préfère la plus grande (100x100)
            const imageUrl = artist.artistArtworkUrl100 || artist.artistArtworkUrl60 || null

            if (imageUrl && imageUrl.startsWith('http')) {
              // iTunes retourne des URLs comme: https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/.../source/100x100bb.jpg
              // Les URLs iTunes sont déjà complètes et fonctionnelles, pas besoin de les modifier
              // Utiliser l'URL telle quelle
              console.log(`[ITUNES] ✓ Image trouvée pour ${artistName}`)
              console.log(`[ITUNES]   URL: ${imageUrl}`)
              resolve(imageUrl)
              return
            } else {
              console.log(`[ITUNES] ✗ URL d'image invalide pour ${artistName}: ${imageUrl}`)
              console.log(`[ITUNES]   Type: ${typeof imageUrl}, startsWith http: ${imageUrl?.startsWith('http')}`)
            }
          } else {
            console.log(`[ITUNES] ✗ Aucun résultat trouvé pour ${artistName}`)
          }
          resolve(null)
        } catch (error) {
          console.error(`[ITUNES] Erreur parsing JSON pour ${artistName}:`, error)
          resolve(null)
        }
      })
    }).on('error', (err) => {
      clearTimeout(timeout)
      console.warn(`[ITUNES] Erreur réseau pour ${artistName}:`, err)
      resolve(null)
    })
  })
}

/**
 * Recherche une image d'artiste (photo de profil) sur plusieurs sources automatiques
 * Sources utilisées (dans l'ordre) :
 * 1. iTunes/Apple Music (rapide et fiable)
 * 2. Last.fm (rapide)
 * 3. Fanart.tv (via MusicBrainz)
 * 4. TheAudioDB
 */
export async function searchArtistImage(artistName: string): Promise<string | null> {
  if (!artistName || artistName.trim() === '') {
    return null
  }

  console.log(`[ARTIST IMAGE] Recherche automatique pour: ${artistName}`)

  // PRIORITÉ 1 : Essayer iTunes/Apple Music (fiable et bonnes images d'artistes)
  try {
    console.log(`[ARTIST IMAGE] Tentative iTunes pour: ${artistName}`)
    const iTunesImage = await Promise.race([
      searchiTunes(artistName),
      new Promise<string | null>((resolve) => {
        setTimeout(() => {
          console.log(`[ARTIST IMAGE] Timeout iTunes pour: ${artistName}`)
          resolve(null)
        }, 5000)
      })
    ])
    if (iTunesImage && iTunesImage.trim() !== '' && iTunesImage.startsWith('http')) {
      console.log(`[ARTIST IMAGE] ✓ Image iTunes trouvée pour: ${artistName}`)
      console.log(`[ARTIST IMAGE]   URL: ${iTunesImage.substring(0, 100)}...`)
      return iTunesImage
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur iTunes pour ${artistName}:`, error)
  }

  // PRIORITÉ 2 : Essayer Last.fm (rapide)
  try {
    console.log(`[ARTIST IMAGE] Tentative Last.fm pour: ${artistName}`)
    const lastFmImage = await Promise.race([
      searchLastFm(artistName),
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 3000))
    ])
    if (lastFmImage && lastFmImage.startsWith('http')) {
      console.log(`[ARTIST IMAGE] ✓ Image trouvée sur Last.fm pour: ${artistName} - ${lastFmImage.substring(0, 80)}...`)
      return lastFmImage
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur Last.fm pour ${artistName}:`, error)
  }

  // PRIORITÉ 3 : Essayer Fanart.tv
  try {
    console.log(`[ARTIST IMAGE] Tentative Fanart.tv pour: ${artistName}`)
    const musicBrainzId = await getMusicBrainzId(artistName)
    if (musicBrainzId) {
      const apiKey = process.env.FANART_API_KEY || ''
      const url = apiKey 
        ? `https://webservice.fanart.tv/v3/music/${musicBrainzId}?api_key=${apiKey}`
        : `https://webservice.fanart.tv/v3/music/${musicBrainzId}`

      const fanartImage = await Promise.race([
        new Promise<string | null>((resolve) => {
          const timeout = setTimeout(() => {
            console.log(`[ARTIST IMAGE] Timeout Fanart.tv pour ${artistName}`)
            resolve(null)
          }, 4000)

          https.get(url, {
            headers: {
              'User-Agent': 'MegaMix/1.0',
              'Accept': 'application/json'
            }
          }, (response: any) => {
            let data = ''
            response.on('data', (chunk: Buffer) => { data += chunk.toString() })
            response.on('end', () => {
              clearTimeout(timeout)
              try {
                const json = JSON.parse(data)
                // Chercher artistthumb (photo de profil)
                if (json.artistthumb && json.artistthumb.length > 0) {
                  const thumbs = json.artistthumb.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
                  let thumbUrl = thumbs[0].url
                  
                  if (thumbUrl && !thumbUrl.startsWith('http')) {
                    if (thumbUrl.startsWith('/')) {
                      thumbUrl = `https://assets.fanart.tv${thumbUrl}`
                    } else {
                      thumbUrl = `https://assets.fanart.tv/fanart/music/${musicBrainzId}/artistthumb/${thumbUrl}`
                    }
                  }
                  
                  if (thumbUrl && thumbUrl.includes('images.fanart.tv')) {
                    thumbUrl = thumbUrl.replace('images.fanart.tv', 'assets.fanart.tv')
                  }
                  
                  if (thumbUrl && thumbUrl.startsWith('http')) {
                    console.log(`[ARTIST IMAGE] ✓ Image Fanart.tv trouvée pour ${artistName}`)
                    resolve(thumbUrl)
                    return
                  }
                }
                resolve(null)
              } catch (error) {
                console.warn(`[ARTIST IMAGE] Erreur parsing Fanart.tv pour ${artistName}:`, error)
                resolve(null)
              }
            })
          }).on('error', (err) => {
            clearTimeout(timeout)
            console.warn(`[ARTIST IMAGE] Erreur réseau Fanart.tv pour ${artistName}:`, err)
            resolve(null)
          })
        }),
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 4000))
      ])

      if (fanartImage && fanartImage.startsWith('http')) {
        console.log(`[ARTIST IMAGE] ✓ Image trouvée sur Fanart.tv pour: ${artistName}`)
        return fanartImage
      }
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur Fanart.tv pour ${artistName}:`, error)
  }

  // PRIORITÉ 4 : Essayer TheAudioDB
  try {
    console.log(`[ARTIST IMAGE] Tentative TheAudioDB pour: ${artistName}`)
    const audioDbImage = await Promise.race([
      searchTheAudioDbThumb(artistName),
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 3000))
    ])
    if (audioDbImage && audioDbImage.startsWith('http')) {
      console.log(`[ARTIST IMAGE] ✓ Image trouvée sur TheAudioDB pour: ${artistName}`)
      return audioDbImage
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur TheAudioDB pour ${artistName}:`, error)
  }

  // PRIORITÉ 5 : Essayer Deezer
  try {
    console.log(`[ARTIST IMAGE] Tentative Deezer pour: ${artistName}`)
    const deezerImage = await Promise.race([
      searchDeezer(artistName),
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 3000))
    ])
    if (deezerImage && deezerImage.startsWith('http')) {
      console.log(`[ARTIST IMAGE] ✓ Image trouvée sur Deezer pour: ${artistName}`)
      return deezerImage
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur Deezer pour ${artistName}:`, error)
  }

  // PRIORITÉ 6 : Essayer Yandex Music
  try {
    console.log(`[ARTIST IMAGE] Tentative Yandex Music pour: ${artistName}`)
    const yandexImage = await Promise.race([
      searchYandexMusic(artistName),
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 3000))
    ])
    if (yandexImage && yandexImage.startsWith('http')) {
      console.log(`[ARTIST IMAGE] ✓ Image trouvée sur Yandex Music pour: ${artistName}`)
      return yandexImage
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur Yandex Music pour ${artistName}:`, error)
  }

  // PRIORITÉ 7 : Essayer Amazon Music
  try {
    console.log(`[ARTIST IMAGE] Tentative Amazon Music pour: ${artistName}`)
    const amazonImage = await Promise.race([
      searchAmazonMusic(artistName),
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 3000))
    ])
    if (amazonImage && amazonImage.startsWith('http')) {
      console.log(`[ARTIST IMAGE] ✓ Image trouvée sur Amazon Music pour: ${artistName}`)
      return amazonImage
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur Amazon Music pour ${artistName}:`, error)
  }

  // PRIORITÉ 8 : Essayer Tidal
  try {
    console.log(`[ARTIST IMAGE] Tentative Tidal pour: ${artistName}`)
    const tidalImage = await Promise.race([
      searchTidal(artistName),
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 3000))
    ])
    if (tidalImage && tidalImage.startsWith('http')) {
      console.log(`[ARTIST IMAGE] ✓ Image trouvée sur Tidal pour: ${artistName}`)
      return tidalImage
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur Tidal pour ${artistName}:`, error)
  }

  console.log(`[ARTIST IMAGE] ✗ Aucune image trouvée pour: ${artistName}`)
  return null
}


// Ancien code supprimé - iTunes/Last.fm/Fanart.tv/AudioDB
/*
  // PRIORITÉ 1 : Essayer iTunes/Apple Music (fiable et bonnes images d'artistes)
  try {
    console.log(`[ARTIST IMAGE] Tentative iTunes pour: ${artistName}`)
    const iTunesImage = await Promise.race([
      searchiTunes(artistName),
      new Promise<string | null>((resolve) => {
        setTimeout(() => {
          console.log(`[ARTIST IMAGE] Timeout iTunes pour: ${artistName}`)
          resolve(null)
        }, 5000)
      })
    ])
    if (iTunesImage && iTunesImage.trim() !== '' && iTunesImage.startsWith('http')) {
      console.log(`[ARTIST IMAGE] ✓ Image iTunes trouvée pour: ${artistName}`)
      console.log(`[ARTIST IMAGE]   URL: ${iTunesImage.substring(0, 100)}...`)
      return iTunesImage
    } else {
      console.log(`[ARTIST IMAGE] ✗ Image iTunes invalide ou vide pour: ${artistName}`)
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur iTunes pour ${artistName}:`, error)
  }

  // PRIORITÉ 2 : Essayer Last.fm (rapide)
  try {
    console.log(`[ARTIST IMAGE] Tentative Last.fm pour: ${artistName}`)
    const lastFmImage = await Promise.race([
      searchLastFm(artistName),
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 3000))
    ])
    if (lastFmImage && lastFmImage.startsWith('http')) {
      console.log(`[ARTIST IMAGE] ✓ Image trouvée sur Last.fm pour: ${artistName} - ${lastFmImage.substring(0, 80)}...`)
      return lastFmImage
    } else {
      console.log(`[ARTIST IMAGE] ✗ Image Last.fm invalide ou vide pour: ${artistName}`)
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur Last.fm pour ${artistName}:`, error)
  }

  // PRIORITÉ 3 : Essayer Fanart.tv
  try {
    console.log(`[ARTIST IMAGE] Tentative Fanart.tv pour: ${artistName}`)
    const musicBrainzId = await getMusicBrainzId(artistName)
    if (musicBrainzId) {
      const apiKey = process.env.FANART_API_KEY || ''
      const url = apiKey 
        ? `https://webservice.fanart.tv/v3/music/${musicBrainzId}?api_key=${apiKey}`
        : `https://webservice.fanart.tv/v3/music/${musicBrainzId}`

      const fanartImage = await Promise.race([
        new Promise<string | null>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.log(`[ARTIST IMAGE] Timeout Fanart.tv pour ${artistName}`)
            resolve(null)
          }, 4000)

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

                // Chercher artistthumb (photo de profil)
                if (json.artistthumb && json.artistthumb.length > 0) {
                  const thumbs = json.artistthumb.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
                  let thumbUrl = thumbs[0].url

                  // Compléter l'URL si elle est relative
                  if (thumbUrl && !thumbUrl.startsWith('http')) {
                    if (thumbUrl.startsWith('/')) {
                      thumbUrl = `https://assets.fanart.tv${thumbUrl}`
                    } else {
                      thumbUrl = `https://assets.fanart.tv/fanart/music/${musicBrainzId}/artistthumb/${thumbUrl}`
                    }
                  }

                  // Remplacer images.fanart.tv par assets.fanart.tv si nécessaire
                  if (thumbUrl && thumbUrl.includes('images.fanart.tv')) {
                    thumbUrl = thumbUrl.replace('images.fanart.tv', 'assets.fanart.tv')
                  }

                  if (thumbUrl && thumbUrl.startsWith('http')) {
                    console.log(`[ARTIST IMAGE] ✓ Image Fanart.tv trouvée pour ${artistName}`)
                    console.log(`[ARTIST IMAGE]   URL: ${thumbUrl}`)
                    resolve(thumbUrl)
                    return
                  }
                }

                resolve(null)
              } catch (error) {
                console.warn(`[ARTIST IMAGE] Erreur parsing Fanart.tv pour ${artistName}:`, error)
                resolve(null)
              }
            })
          }).on('error', (err) => {
            clearTimeout(timeout)
            console.warn(`[ARTIST IMAGE] Erreur réseau Fanart.tv pour ${artistName}:`, err)
            resolve(null)
          })
        }),
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 4000))
      ])

      if (fanartImage && fanartImage.startsWith('http')) {
        console.log(`[ARTIST IMAGE] ✓ Image trouvée sur Fanart.tv pour: ${artistName} - ${fanartImage.substring(0, 80)}...`)
        return fanartImage
      } else {
        console.log(`[ARTIST IMAGE] ✗ Image Fanart.tv invalide ou vide pour: ${artistName}`)
      }
    } else {
      console.log(`[ARTIST IMAGE] ✗ MusicBrainz ID non trouvé pour ${artistName}, impossible de chercher sur Fanart.tv`)
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur Fanart.tv pour ${artistName}:`, error)
  }

  // PRIORITÉ 4 : Essayer Fanart.tv
  try {
    const musicBrainzId = await getMusicBrainzId(artistName)
    if (musicBrainzId) {
      const apiKey = process.env.FANART_API_KEY || ''
      const url = apiKey 
        ? `https://webservice.fanart.tv/v3/music/${musicBrainzId}?api_key=${apiKey}`
        : `https://webservice.fanart.tv/v3/music/${musicBrainzId}`

      const fanartImage = await Promise.race([
        new Promise<string | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
            resolve(null) // Résoudre avec null au lieu de rejeter
          }, 3000)

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
            
                // Chercher artistthumb (photo de profil)
            if (json.artistthumb && json.artistthumb.length > 0) {
                  const thumbs = json.artistthumb.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
                  let thumbUrl = thumbs[0].url
                  
                  if (thumbUrl && !thumbUrl.startsWith('http')) {
                    thumbUrl = `https://assets.fanart.tv/fanart/music/${musicBrainzId}/artistthumb/${thumbUrl}`
                  }
                  
                  if (thumbUrl && thumbUrl.startsWith('/')) {
                    thumbUrl = `https://assets.fanart.tv${thumbUrl}`
                  }
                  
                  if (thumbUrl && thumbUrl.includes('images.fanart.tv')) {
                    thumbUrl = thumbUrl.replace('images.fanart.tv', 'assets.fanart.tv')
                  }
                  
                  if (thumbUrl && thumbUrl.startsWith('http')) {
                    resolve(thumbUrl)
                return
              }
            }
                
            resolve(null)
          } catch (error) {
                resolve(null) // Résoudre avec null au lieu de rejeter
          }
        })
      }).on('error', (err) => {
        clearTimeout(timeout)
            resolve(null) // Résoudre avec null au lieu de rejeter
          })
        }),
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 3000))
      ])
      
      if (fanartImage) {
        console.log(`[ARTIST IMAGE] ✓ Image trouvée sur Fanart.tv pour: ${artistName} - ${fanartImage.substring(0, 80)}...`)
        return fanartImage
      }
    }
  } catch (error) {
    console.warn(`[ARTIST IMAGE] Erreur Fanart.tv pour ${artistName}:`, error)
  }

  console.log(`[ARTIST IMAGE] ✗ Aucune image trouvée pour: ${artistName}`)
  return null
}

/**
 * Recherche une bannière d'artiste (grande image pour la sidebar) sur plusieurs sources
 * Sources utilisées (dans l'ordre) :
 * 1. Last.fm (rapide et fiable, utilisé en premier pour une réponse rapide)
 * 2. Fanart.tv (artistbackground) - en parallèle avec Last.fm
 * 3. TheAudioDB (strArtistBanner)
 */
export async function searchArtistBackground(artistName: string): Promise<string | null> {
  if (!artistName || artistName.trim() === '') {
    console.log(`[ARTIST BACKGROUND] Nom d'artiste vide, retour null`)
    return null
  }

  console.log(`[ARTIST BACKGROUND] Début de la recherche pour: ${artistName}`)

  // PRIORITÉ 1 : Essayer Last.fm en premier (rapide et fiable)
  // On lance Last.fm et Fanart.tv en parallèle pour plus de rapidité
  const lastFmPromise = Promise.race([
    searchLastFm(artistName),
    new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 2000)) // Timeout de 2 secondes pour Last.fm
  ]).catch((err) => {
    console.warn(`[ARTIST BACKGROUND] Erreur Last.fm pour ${artistName}:`, err)
    return null
  })
  const fanartPromise = (async () => {
    try {
      const musicBrainzId = await getMusicBrainzId(artistName)
      if (musicBrainzId) {
      const apiKey = process.env.FANART_API_KEY || ''
      const url = apiKey 
        ? `https://webservice.fanart.tv/v3/music/${musicBrainzId}?api_key=${apiKey}`
        : `https://webservice.fanart.tv/v3/music/${musicBrainzId}`

        return new Promise<string | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
            console.log(`[ARTIST BACKGROUND] Timeout Fanart.tv pour ${artistName}`)
            resolve(null) // Résoudre avec null au lieu de rejeter pour ne pas bloquer
          }, 3000) // Timeout réduit à 3 secondes pour Fanart.tv

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
            
                // Chercher artistbackground (bannière)
            if (json.artistbackground && json.artistbackground.length > 0) {
                  const backgrounds = json.artistbackground.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
                  let bgUrl = backgrounds[0].url
                  
                  if (bgUrl && !bgUrl.startsWith('http')) {
                    bgUrl = `https://assets.fanart.tv/fanart/music/${musicBrainzId}/artistbackground/${bgUrl}`
                  }
                  
                  if (bgUrl && bgUrl.startsWith('/')) {
                    bgUrl = `https://assets.fanart.tv${bgUrl}`
                  }
                  
                  if (bgUrl && bgUrl.includes('images.fanart.tv')) {
                    bgUrl = bgUrl.replace('images.fanart.tv', 'assets.fanart.tv')
                  }
                  
                  if (bgUrl && bgUrl.startsWith('http')) {
                    resolve(bgUrl)
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
      return null
    } catch (error) {
      return null
    }
  })()

  // Attendre le premier résultat (Last.fm ou Fanart.tv)
  const results = await Promise.allSettled([lastFmPromise, fanartPromise])
  
  console.log(`[ARTIST BACKGROUND] Résultats pour ${artistName}:`, {
    lastFm: results[0].status === 'fulfilled' ? (results[0].value ? 'TROUVÉ' : 'NULL') : 'REJETÉ',
    fanart: results[1].status === 'fulfilled' ? (results[1].value ? 'TROUVÉ' : 'NULL') : 'REJETÉ'
  })
  
  // Vérifier Last.fm d'abord (généralement plus rapide)
  if (results[0].status === 'fulfilled' && results[0].value) {
    console.log(`[ARTIST BACKGROUND] ✓ Bannière trouvée sur Last.fm pour: ${artistName} - ${results[0].value.substring(0, 80)}...`)
    return results[0].value
  }
  
  // Vérifier Fanart.tv
  if (results[1].status === 'fulfilled' && results[1].value) {
    console.log(`[ARTIST BACKGROUND] ✓ Bannière trouvée sur Fanart.tv pour: ${artistName} - ${results[1].value.substring(0, 80)}...`)
    return results[1].value
  }

  // Si aucune image n'a été trouvée, essayer TheAudioDB
  const hasLastFm = results[0].status === 'fulfilled' && results[0].value
  const hasFanart = results[1].status === 'fulfilled' && results[1].value
  if (!hasLastFm && !hasFanart) {
    try {
      const theAudioDbBanner = await Promise.race([
        searchTheAudioDbBanner(artistName),
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 2000))
      ])
      if (theAudioDbBanner) {
        console.log(`[ARTIST BACKGROUND] ✓ Bannière trouvée sur TheAudioDB pour: ${artistName} - ${theAudioDbBanner.substring(0, 80)}...`)
        return theAudioDbBanner
      }
    } catch (error) {
      console.warn(`[ARTIST BACKGROUND] Erreur TheAudioDB pour ${artistName}:`, error)
    }
  }

  console.log(`[ARTIST BACKGROUND] ✗ Aucune bannière trouvée pour: ${artistName}`)
  return null
}

/**
 * Recherche le logo d'un artiste sur plusieurs sources
 * Sources utilisées (dans l'ordre) :
 * 1. Fanart.tv (artistlogo, hdmusiclogo, musiclogo)
 * 2. TheAudioDB (strArtistLogo)
 * 3. Last.fm (image de l'artiste comme fallback)
 */
export async function searchArtistLogo(artistName: string): Promise<string | null> {
  if (!artistName || artistName.trim() === '') {
    return null
  }

  // PRIORITÉ 1 : Essayer Fanart.tv
  try {
      const musicBrainzId = await getMusicBrainzId(artistName)
    if (musicBrainzId) {
      const apiKey = process.env.FANART_API_KEY || ''
      const url = apiKey 
        ? `https://webservice.fanart.tv/v3/music/${musicBrainzId}?api_key=${apiKey}`
        : `https://webservice.fanart.tv/v3/music/${musicBrainzId}`

      const fanartLogo = await new Promise<string | null>((resolve, reject) => {
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
              
              // Priorité 1 : artistlogo
              if (json.artistlogo && json.artistlogo.length > 0) {
                const logos = json.artistlogo.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
                let logoUrl = logos[0].url
                
                if (logoUrl && logoUrl.includes('bigpreview')) {
                  if (logoUrl.includes('images.fanart.tv')) {
                    logoUrl = logoUrl.replace('images.fanart.tv', 'assets.fanart.tv')
                  }
                  resolve(logoUrl)
                  return
                }
                
                if (logoUrl && !logoUrl.startsWith('http') && !logoUrl.startsWith('/')) {
                  logoUrl = `https://assets.fanart.tv/bigpreview/${logoUrl}`
                  resolve(logoUrl)
                  return
                }
                
                if (logoUrl && logoUrl.startsWith('/')) {
                  if (logoUrl.includes('/bigpreview/')) {
                    logoUrl = `https://assets.fanart.tv${logoUrl}`
                  } else {
                    logoUrl = `https://assets.fanart.tv/fanart/music/${musicBrainzId}/artistlogo${logoUrl}`
                  }
                }
                
                if (logoUrl && !logoUrl.startsWith('http')) {
                  const fileName = logoUrl.split('/').pop() || logoUrl
                  logoUrl = `https://assets.fanart.tv/bigpreview/${fileName}`
                }
                
                if (logoUrl && logoUrl.includes('images.fanart.tv')) {
                  logoUrl = logoUrl.replace('images.fanart.tv', 'assets.fanart.tv')
                }
                
                if (logoUrl && logoUrl.startsWith('http')) {
                  resolve(logoUrl)
                  return
                }
              }
              
              // Priorité 2 : hdmusiclogo
              if (json.hdmusiclogo && json.hdmusiclogo.length > 0) {
                const logos = json.hdmusiclogo.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
                let logoUrl = logos[0].url
                
                if (logoUrl && !logoUrl.startsWith('http')) {
                  logoUrl = `https://assets.fanart.tv/fanart/music/${musicBrainzId}/hdmusiclogo/${logoUrl}`
                }
                
                if (logoUrl && logoUrl.startsWith('/')) {
                  logoUrl = `https://assets.fanart.tv${logoUrl}`
                }
                
                if (logoUrl && logoUrl.includes('images.fanart.tv')) {
                  logoUrl = logoUrl.replace('images.fanart.tv', 'assets.fanart.tv')
                }
                
                if (logoUrl && logoUrl.startsWith('http')) {
                  resolve(logoUrl)
                return
              }
            }
              
              // Priorité 3 : musiclogo
              if (json.musiclogo && json.musiclogo.length > 0) {
                const logos = json.musiclogo.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
                let logoUrl = logos[0].url
                
                if (logoUrl && !logoUrl.startsWith('http')) {
                  logoUrl = `https://assets.fanart.tv/fanart/music/${musicBrainzId}/musiclogo/${logoUrl}`
                }
                
                if (logoUrl && logoUrl.startsWith('/')) {
                  logoUrl = `https://assets.fanart.tv${logoUrl}`
                }
                
                if (logoUrl && logoUrl.includes('images.fanart.tv')) {
                  logoUrl = logoUrl.replace('images.fanart.tv', 'assets.fanart.tv')
                }
                
                if (logoUrl && logoUrl.startsWith('http')) {
                  resolve(logoUrl)
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
      
      if (fanartLogo) {
        console.log(`[ARTIST LOGO] Logo trouvé sur Fanart.tv pour: ${artistName}`)
        return fanartLogo
      }
    }
  } catch (error) {
    console.warn(`[ARTIST LOGO] Erreur Fanart.tv pour ${artistName}:`, error)
  }

  // PRIORITÉ 2 : Essayer TheAudioDB
  try {
    const theAudioDbLogo = await searchTheAudioDbLogo(artistName)
    if (theAudioDbLogo) {
      console.log(`[ARTIST LOGO] Logo trouvé sur TheAudioDB pour: ${artistName}`)
      return theAudioDbLogo
    }
  } catch (error) {
    console.warn(`[ARTIST LOGO] Erreur TheAudioDB pour ${artistName}:`, error)
  }

  // PRIORITÉ 3 : Essayer Last.fm (utiliser l'image de l'artiste comme fallback)
  try {
    const lastFmImage = await searchLastFm(artistName)
    if (lastFmImage) {
      console.log(`[ARTIST LOGO] Image Last.fm utilisée comme logo pour: ${artistName}`)
      return lastFmImage
          }
        } catch (error) {
    console.warn(`[ARTIST LOGO] Erreur Last.fm pour ${artistName}:`, error)
  }

  console.log(`[ARTIST LOGO] Aucun logo trouvé pour: ${artistName}`)
  return null
}

/**
 * Recherche l'image d'un artiste sur Last.fm
 */
export function searchLastFm(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    const apiKey = process.env.LASTFM_API_KEY || 'c8c0ea12c9a1983cc29b3b5c6e8c8e4e'
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodedName}&api_key=${apiKey}&format=json`
    
    const timeout = setTimeout(() => {
      console.log(`[LAST.FM] Timeout pour ${artistName}`)
      resolve(null) // Résoudre avec null au lieu de rejeter
    }, 3000) // Timeout réduit à 3 secondes
    
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
            console.log(`[LAST.FM] Erreur API pour ${artistName}:`, json.error)
            resolve(null)
            return
          }
          if (json.artist && json.artist.image && json.artist.image.length > 0) {
            // Prendre la plus grande image disponible (généralement la dernière)
            // Exclure les placeholders Last.fm (images avec un hash spécifique)
            const images = json.artist.image.filter((img: any) => 
              img['#text'] && 
              img['#text'].length > 0 && 
              img['#text'].startsWith('http') &&
              !img['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f') // Exclure les placeholders
            )
            if (images.length > 0) {
              // Prendre la dernière image (généralement la plus grande, souvent "extralarge" ou "mega")
              const imageUrl = images[images.length - 1]['#text']
              if (imageUrl && imageUrl.startsWith('http') && imageUrl !== '') {
                console.log(`[LAST.FM] ✓ Image trouvée pour ${artistName}: ${imageUrl.substring(0, 80)}...`)
                resolve(imageUrl)
                return
          } else {
                console.log(`[LAST.FM] URL invalide pour ${artistName}: ${imageUrl}`)
              }
            }
          }
          console.log(`[LAST.FM] Aucune image valide pour ${artistName}`)
          resolve(null)
        } catch (error) {
          console.warn(`[LAST.FM] Erreur parsing JSON pour ${artistName}:`, error)
          resolve(null) // Résoudre avec null au lieu de rejeter
        }
      })
    }).on('error', (err) => {
      clearTimeout(timeout)
      console.warn(`[LAST.FM] Erreur réseau pour ${artistName}:`, err.message)
      resolve(null) // Résoudre avec null au lieu de rejeter
    })
  })
}

/**
 * Recherche le logo d'un artiste sur TheAudioDB
 */
function searchTheAudioDbLogo(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    const url = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodedName}`

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
          if (json.artists && json.artists.length > 0) {
            const artist = json.artists[0]
            if (artist.strArtistLogo) {
              resolve(artist.strArtistLogo)
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
 * Recherche la photo de profil d'un artiste sur TheAudioDB
 */
function searchTheAudioDbThumb(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    const url = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodedName}`

    console.log(`[AUDIODB THUMB] Recherche pour: ${artistName}`)
    console.log(`[AUDIODB THUMB] URL: ${url}`)

    const timeout = setTimeout(() => {
      console.log(`[AUDIODB THUMB] Timeout pour ${artistName}`)
      resolve(null) // Résoudre avec null au lieu de rejeter
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
          console.log(`[AUDIODB THUMB] Réponse reçue pour ${artistName}, nombre d'artistes: ${json.artists ? json.artists.length : 0}`)
          
          if (json.artists && json.artists.length > 0) {
            const artist = json.artists[0]
            console.log(`[AUDIODB THUMB] Artiste trouvé: ${artist.strArtist || artistName}`)
            console.log(`[AUDIODB THUMB] strArtistThumb disponible: ${!!artist.strArtistThumb}`)
            console.log(`[AUDIODB THUMB] strArtistThumb URL: ${artist.strArtistThumb || 'N/A'}`)
            
            // Vérifier strArtistThumb (photo de profil) - C'EST CE QU'ON VEUT POUR LA BANNIÈRE
            // AudioDB retourne généralement des URLs complètes comme: https://r2.theaudiodb.com/images/media/artist/thumb/xxx.jpg
            if (artist.strArtistThumb && artist.strArtistThumb.trim() !== '') {
              let thumbUrl = artist.strArtistThumb.trim()
              
              console.log(`[AUDIODB THUMB] URL brute reçue: ${thumbUrl}`)
              
              // Si l'URL est déjà complète (commence par http), l'utiliser telle quelle
              if (thumbUrl.startsWith('http://') || thumbUrl.startsWith('https://')) {
                console.log(`[AUDIODB THUMB] ✓ URL complète trouvée pour ${artistName}`)
                console.log(`[AUDIODB THUMB]   URL: ${thumbUrl}`)
                resolve(thumbUrl)
            return
          }
          
              // Si l'URL est relative, la compléter
              if (thumbUrl.startsWith('//')) {
                thumbUrl = 'https:' + thumbUrl
              } else if (thumbUrl.startsWith('/')) {
                // Si ça commence par /images/media/artist/thumb/, utiliser r2.theaudiodb.com
                if (thumbUrl.includes('/images/media/artist/thumb/')) {
                  thumbUrl = 'https://r2.theaudiodb.com' + thumbUrl
                } else {
                  thumbUrl = 'https://www.theaudiodb.com' + thumbUrl
                }
              } else {
                // URL relative sans slash, probablement juste le nom du fichier
                // Format attendu: https://r2.theaudiodb.com/images/media/artist/thumb/[filename]
                thumbUrl = 'https://r2.theaudiodb.com/images/media/artist/thumb/' + thumbUrl
              }
              
              console.log(`[AUDIODB THUMB] URL complétée: ${thumbUrl}`)
              
              // Vérifier que l'URL est valide
              if (thumbUrl.startsWith('http')) {
                console.log(`[AUDIODB THUMB] ✓ Image valide trouvée pour ${artistName}`)
                console.log(`[AUDIODB THUMB]   URL finale: ${thumbUrl}`)
                resolve(thumbUrl)
                return
              } else {
                console.log(`[AUDIODB THUMB] ✗ URL invalide après traitement: ${thumbUrl}`)
              }
            } else {
              console.log(`[AUDIODB THUMB] ✗ strArtistThumb vide ou null pour ${artistName}`)
              // Afficher tous les champs disponibles pour debug
              const strFields = Object.keys(artist).filter(k => k.startsWith('str') && k.includes('Thumb'))
              console.log(`[AUDIODB THUMB] Champs str*Thumb disponibles:`, strFields)
              if (strFields.length > 0) {
                strFields.forEach(field => {
                  console.log(`[AUDIODB THUMB]   ${field}: ${artist[field] || 'null'}`)
                })
              }
            }
          } else {
            console.log(`[AUDIODB THUMB] ✗ Aucun artiste trouvé pour ${artistName}`)
            if (data) {
              console.log(`[AUDIODB THUMB] Réponse reçue: ${data.substring(0, 200)}...`)
            }
          }
          resolve(null)
        } catch (error) {
          console.error(`[AUDIODB THUMB] Erreur parsing JSON pour ${artistName}:`, error)
          resolve(null) // Résoudre avec null au lieu de rejeter
        }
      })
    }).on('error', (err) => {
      clearTimeout(timeout)
      console.error(`[AUDIODB THUMB] Erreur réseau pour ${artistName}:`, err.message)
      resolve(null) // Résoudre avec null au lieu de rejeter
    })
  })
}

/**
 * Recherche la bannière d'un artiste sur TheAudioDB
 */
function searchTheAudioDbBanner(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    const url = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodedName}`

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
          if (json.artists && json.artists.length > 0) {
            const artist = json.artists[0]
            if (artist.strArtistBanner) {
              resolve(artist.strArtistBanner)
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
 * Recherche une image d'artiste via Deezer API
 */
function searchDeezer(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    // D'abord rechercher l'artiste pour obtenir son ID
    const searchUrl = `https://api.deezer.com/search/artist?q=${encodedName}&limit=1`
    
    const timeout = setTimeout(() => {
      console.log(`[DEEZER] Timeout pour ${artistName}`)
      resolve(null)
    }, 5000)
    
    https.get(searchUrl, {
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
            // Récupérer l'image de l'artiste (picture_big ou picture_medium)
            const imageUrl = artist.picture_big || artist.picture_medium || artist.picture || null
            
            if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('placeholder')) {
              console.log(`[DEEZER] ✓ Image trouvée pour ${artistName}`)
              resolve(imageUrl)
              return
            }
          }
          resolve(null)
        } catch (error) {
          console.warn(`[DEEZER] Erreur parsing JSON pour ${artistName}:`, error)
          resolve(null)
        }
      })
    }).on('error', (err) => {
      clearTimeout(timeout)
      console.warn(`[DEEZER] Erreur réseau pour ${artistName}:`, err.message)
      resolve(null)
    })
  })
}

/**
 * Recherche une image d'artiste via Yandex Music API
 */
function searchYandexMusic(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(artistName)
    // Yandex Music API - recherche d'artiste
    const searchUrl = `https://music.yandex.ru/handlers/music-search.jsx?text=${encodedName}&type=artist&page=0`
    
    const timeout = setTimeout(() => {
      console.log(`[YANDEX] Timeout pour ${artistName}`)
      resolve(null)
    }, 5000)
    
    https.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://music.yandex.ru/'
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
          // Yandex retourne les résultats dans result.artists.results
          if (json.result && json.result.artists && json.result.artists.results && json.result.artists.results.length > 0) {
            const artist = json.result.artists.results[0]
            // L'image est dans cover.uri ou cover.items[0].uri
            let imageUrl: string | null = null
            
            if (artist.cover && artist.cover.uri) {
              imageUrl = `https://${artist.cover.uri.replace('%%', '400x400')}`
            } else if (artist.cover && artist.cover.items && artist.cover.items.length > 0) {
              imageUrl = `https://${artist.cover.items[0].uri.replace('%%', '400x400')}`
            }
            
            if (imageUrl && imageUrl.startsWith('http')) {
              console.log(`[YANDEX] ✓ Image trouvée pour ${artistName}`)
              resolve(imageUrl)
              return
            }
          }
          resolve(null)
        } catch (error) {
          console.warn(`[YANDEX] Erreur parsing JSON pour ${artistName}:`, error)
          resolve(null)
        }
      })
    }).on('error', (err) => {
      clearTimeout(timeout)
      console.warn(`[YANDEX] Erreur réseau pour ${artistName}:`, err.message)
      resolve(null)
    })
  })
}

/**
 * Recherche une image d'artiste via Amazon Music (via scraping ou API si disponible)
 */
function searchAmazonMusic(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    // Amazon Music n'a pas d'API publique facilement accessible
    // On peut essayer de construire une URL de recherche et extraire l'image
    // Mais cela nécessiterait du scraping, ce qui est fragile
    // Pour l'instant, on retourne null et on pourra améliorer plus tard
    console.log(`[AMAZON] Recherche non implémentée pour ${artistName} (API limitée)`)
    resolve(null)
  })
}

/**
 * Recherche une image d'artiste via Tidal
 */
function searchTidal(artistName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    // Tidal nécessite généralement une authentification pour son API
    // On peut essayer une recherche publique mais les résultats sont limités
    const encodedName = encodeURIComponent(artistName)
    // Tidal utilise souvent des IDs spécifiques, difficile sans authentification
    console.log(`[TIDAL] Recherche non implémentée pour ${artistName} (API nécessite authentification)`)
    resolve(null)
  })
}
