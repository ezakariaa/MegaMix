import * as https from 'https'

/**
 * Cache des images Google Drive par nom d'artiste
 * Format: { "artistName": "https://drive.google.com/uc?export=view&id=FILE_ID" }
 */
let googleDriveImagesCache: Map<string, string> = new Map()

/**
 * Charge les images d'artistes depuis un dossier Google Drive
 * @param folderId L'ID du dossier Google Drive contenant les images d'artistes
 * @returns Promise qui se résout quand le cache est chargé
 */
export async function loadArtistImagesFromGoogleDrive(folderId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

    if (!GOOGLE_API_KEY) {
      console.warn('[GOOGLE DRIVE IMAGES] Pas de clé API Google Drive configurée, impossible de charger les images')
      resolve() // Résoudre sans erreur pour ne pas bloquer
      return
    }

    console.log(`[GOOGLE DRIVE IMAGES] Chargement des images depuis le dossier: ${folderId}`)

    // Lister tous les fichiers du dossier
    const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&supportsAllDrives=true&includeItemsFromAllDrives=true&key=${GOOGLE_API_KEY}`

    https.get(apiUrl, {
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
        try {
          const json = JSON.parse(data)

          if (json.error) {
            console.error('[GOOGLE DRIVE IMAGES] Erreur API:', json.error)
            resolve() // Résoudre sans erreur
            return
          }

          if (!json.files || json.files.length === 0) {
            console.log('[GOOGLE DRIVE IMAGES] Aucun fichier trouvé dans le dossier')
            resolve()
            return
          }

          // Filtrer uniquement les images
          const imageFiles = json.files.filter((file: any) => {
            const mimeType = file.mimeType || ''
            return mimeType.startsWith('image/') || 
                   /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
          })

          console.log(`[GOOGLE DRIVE IMAGES] ${imageFiles.length} image(s) trouvée(s) dans le dossier`)

          // Vider le cache précédent
          googleDriveImagesCache.clear()

          // Ajouter chaque image au cache
          imageFiles.forEach((file: any) => {
            // Extraire le nom d'artiste depuis le nom de fichier
            // Exemples: "Bruce Springsteen.jpg" -> "Bruce Springsteen"
            //          "The Beatles.png" -> "The Beatles"
            const fileName = file.name
            const artistName = fileName
              .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '') // Retirer l'extension
              .trim()

            if (artistName) {
              // URL pour afficher l'image depuis Google Drive
              // Utiliser export=download pour obtenir l'image directement (plus fiable que export=view)
              const imageUrl = `https://drive.google.com/uc?export=download&id=${file.id}`
              // Stocker avec le nom original (pas normalisé) pour garder la casse
              googleDriveImagesCache.set(artistName, imageUrl)
              console.log(`[GOOGLE DRIVE IMAGES] Image ajoutée au cache: "${artistName}" -> ${file.id}`)
              console.log(`[GOOGLE DRIVE IMAGES]   URL: ${imageUrl}`)
            }
          })

          console.log(`[GOOGLE DRIVE IMAGES] ✓ Cache chargé: ${googleDriveImagesCache.size} image(s) d'artiste(s)`)
          resolve()
        } catch (error) {
          console.error('[GOOGLE DRIVE IMAGES] Erreur parsing:', error)
          resolve() // Résoudre sans erreur
        }
      })
    }).on('error', (err) => {
      console.error('[GOOGLE DRIVE IMAGES] Erreur réseau:', err)
      resolve() // Résoudre sans erreur pour ne pas bloquer
    })
  })
}

/**
 * Normalise un nom d'artiste pour la correspondance
 * Retire les accents, les caractères spéciaux, etc.
 */
function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Retire les accents
    .replace(/[^a-z0-9\s]/g, '') // Retire les caractères spéciaux
    .replace(/\s+/g, ' ') // Normalise les espaces multiples
    .trim()
}

/**
 * Recherche une image d'artiste dans le cache Google Drive
 * @param artistName Le nom de l'artiste
 * @returns L'URL de l'image si trouvée, null sinon
 */
export function getArtistImageFromGoogleDrive(artistName: string): string | null {
  if (!artistName || !artistName.trim()) {
    return null
  }

  // Log pour déboguer
  console.log(`[GOOGLE DRIVE IMAGES] Recherche pour: "${artistName}"`)
  console.log(`[GOOGLE DRIVE IMAGES] Cache contient ${googleDriveImagesCache.size} image(s)`)

  // Afficher les clés du cache pour déboguer
  if (googleDriveImagesCache.size > 0) {
    const cacheKeys = Array.from(googleDriveImagesCache.keys())
    console.log(`[GOOGLE DRIVE IMAGES] Clés dans le cache: ${cacheKeys.slice(0, 5).join(', ')}${cacheKeys.length > 5 ? '...' : ''}`)
  }

  // Normaliser le nom de l'artiste
  const normalizedName = normalizeArtistName(artistName)
  console.log(`[GOOGLE DRIVE IMAGES] Nom normalisé: "${normalizedName}"`)

  // Chercher par nom exact (insensible à la casse, sans accents)
  for (const [cachedName, url] of googleDriveImagesCache.entries()) {
    const normalizedCachedName = normalizeArtistName(cachedName)
    if (normalizedCachedName === normalizedName) {
      console.log(`[GOOGLE DRIVE IMAGES] ✓ Image trouvée (correspondance exacte): "${cachedName}" pour "${artistName}"`)
      return url
    }
  }

  // Chercher par correspondance partielle
  for (const [cachedName, url] of googleDriveImagesCache.entries()) {
    const normalizedCachedName = normalizeArtistName(cachedName)
    // Vérifier si l'un contient l'autre (pour gérer les variations)
    if (normalizedCachedName.includes(normalizedName) || normalizedName.includes(normalizedCachedName)) {
      // Mais seulement si la correspondance est significative (au moins 5 caractères)
      if (normalizedName.length >= 5 || normalizedCachedName.length >= 5) {
        console.log(`[GOOGLE DRIVE IMAGES] ✓ Image trouvée (correspondance partielle): "${cachedName}" pour "${artistName}"`)
        return url
      }
    }
  }

  console.log(`[GOOGLE DRIVE IMAGES] ✗ Aucune image trouvée pour: "${artistName}"`)
  return null
}

/**
 * Vide le cache des images Google Drive
 */
export function clearGoogleDriveImagesCache(): void {
  googleDriveImagesCache.clear()
  console.log('[GOOGLE DRIVE IMAGES] Cache vidé')
}

/**
 * Récupère le cache des images Google Drive (pour debug)
 */
export function getGoogleDriveImagesCache(): Map<string, string> {
  return googleDriveImagesCache
}

