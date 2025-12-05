import * as https from 'https'

/**
 * Cache des images Google Drive par nom d'artiste
 * Format: { "artistName": "https://drive.google.com/uc?export=download&id=FILE_ID" }
 */
let googleDriveImagesCache: Map<string, string> = new Map()
let cacheLoadingPromise: Promise<void> | null = null
let cacheLoaded = false

/**
 * Normalise un nom d'artiste pour la correspondance
 * Retire les accents, les caractères spéciaux, normalise les espaces
 */
function normalizeArtistName(name: string): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Retire les accents
    .replace(/[^a-z0-9\s]/g, '') // Retire les caractères spéciaux (mais garde les espaces)
    .replace(/\s+/g, ' ') // Normalise les espaces multiples en un seul espace
    .trim()
}

/**
 * Charge les images d'artistes depuis un dossier Google Drive
 * @param folderId L'ID du dossier Google Drive contenant les images d'artistes
 * @param forceReload Force le rechargement même si le cache est déjà chargé
 * @returns Promise qui se résout quand le cache est chargé
 */
export async function loadArtistImagesFromGoogleDrive(folderId: string, forceReload: boolean = false): Promise<void> {
  // Si le cache est déjà en cours de chargement, attendre ce chargement
  if (cacheLoadingPromise && !forceReload) {
    console.log('[GOOGLE DRIVE IMAGES] Cache déjà en cours de chargement, attente...')
    return cacheLoadingPromise
  }

  // Si le cache est déjà chargé et qu'on ne force pas, retourner immédiatement
  // MAIS seulement si le cache a vraiment des données
  if (cacheLoaded && !forceReload && googleDriveImagesCache.size > 0) {
    console.log(`[GOOGLE DRIVE IMAGES] Cache déjà chargé (${googleDriveImagesCache.size} images)`)
    // Ne pas retourner immédiatement, toujours vérifier que le cache est valide
  }

  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
  if (!GOOGLE_API_KEY) {
    console.warn('[GOOGLE DRIVE IMAGES] Pas de clé API Google Drive configurée')
    return Promise.resolve()
  }

  console.log(`[GOOGLE DRIVE IMAGES] ===== DÉBUT DU CHARGEMENT DU CACHE =====`)
  console.log(`[GOOGLE DRIVE IMAGES] Folder ID: ${folderId}`)
  console.log(`[GOOGLE DRIVE IMAGES] Force reload: ${forceReload}`)

  cacheLoadingPromise = new Promise<void>((resolve, reject) => {
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
            console.error('[GOOGLE DRIVE IMAGES] ❌ Erreur API Google Drive:', json.error)
            cacheLoadingPromise = null
            resolve()
            return
          }

          if (!json.files || json.files.length === 0) {
            console.log('[GOOGLE DRIVE IMAGES] ⚠️ Aucun fichier trouvé dans le dossier')
            cacheLoadingPromise = null
            resolve()
            return
          }

          // Filtrer uniquement les images
          const imageFiles = json.files.filter((file: any) => {
            const mimeType = file.mimeType || ''
            return mimeType.startsWith('image/') || 
                   /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name)
          })

          console.log(`[GOOGLE DRIVE IMAGES] 📁 ${json.files.length} fichier(s) trouvé(s) dans le dossier`)
          console.log(`[GOOGLE DRIVE IMAGES] 🖼️  ${imageFiles.length} image(s) détectée(s)`)

          // Créer un nouveau cache
          const newCache = new Map<string, string>()

          // Ajouter chaque image au cache
          imageFiles.forEach((file: any) => {
            const fileName = file.name
            // Retirer l'extension du nom de fichier pour obtenir le nom d'artiste
            const artistName = fileName
              .replace(/\.(jpg|jpeg|png|gif|webp|bmp)$/i, '')
              .trim()

            if (artistName) {
              const imageUrl = `https://drive.google.com/uc?export=download&id=${file.id}`
              newCache.set(artistName, imageUrl)
              console.log(`[GOOGLE DRIVE IMAGES]   ✓ "${artistName}" → ${file.id}`)
            }
          })

          // Remplacer l'ancien cache par le nouveau
          googleDriveImagesCache.clear()
          newCache.forEach((value, key) => {
            googleDriveImagesCache.set(key, value)
          })
          
          cacheLoaded = true
          cacheLoadingPromise = null

          console.log(`[GOOGLE DRIVE IMAGES] ✅ Cache chargé avec succès: ${googleDriveImagesCache.size} image(s)`)
          
          // Afficher tous les noms dans le cache pour le débogage
          const cacheKeys = Array.from(googleDriveImagesCache.keys())
          console.log(`[GOOGLE DRIVE IMAGES] 📋 Tous les noms dans le cache:`)
          cacheKeys.forEach((key, index) => {
            console.log(`[GOOGLE DRIVE IMAGES]   ${index + 1}. "${key}"`)
          })
          
          resolve()
        } catch (error) {
          console.error('[GOOGLE DRIVE IMAGES] ❌ Erreur parsing JSON:', error)
          cacheLoadingPromise = null
          resolve() // Résoudre sans erreur pour ne pas bloquer
        }
      })
    }).on('error', (err) => {
      console.error('[GOOGLE DRIVE IMAGES] ❌ Erreur réseau:', err)
      cacheLoadingPromise = null
      resolve() // Résoudre sans erreur pour ne pas bloquer
    })
  })

  return cacheLoadingPromise
}

/**
 * S'assure que le cache est chargé avant de faire une recherche
 */
async function ensureCacheLoaded(): Promise<void> {
  const folderId = process.env.ARTIST_IMAGES_FOLDER_ID
  const apiKey = process.env.GOOGLE_API_KEY

  if (!folderId || !apiKey) {
    console.warn('[GOOGLE DRIVE IMAGES] ⚠️ ARTIST_IMAGES_FOLDER_ID ou GOOGLE_API_KEY manquant')
    return
  }

  // Si le cache est vide, FORCER le rechargement
  if (googleDriveImagesCache.size === 0) {
    console.log('[GOOGLE DRIVE IMAGES] Cache vide, rechargement FORCÉ...')
    await loadArtistImagesFromGoogleDrive(folderId, true) // Force reload
  } else if (cacheLoadingPromise) {
    // Si en cours de chargement, attendre
    await cacheLoadingPromise
  }
}

/**
 * Recherche une image d'artiste dans le cache Google Drive
 * @param artistName Le nom de l'artiste
 * @returns L'URL de l'image si trouvée, null sinon
 */
export async function getArtistImageFromGoogleDrive(artistName: string): Promise<string | null> {
  if (!artistName || !artistName.trim()) {
    return null
  }

  // S'assurer que le cache est chargé
  await ensureCacheLoaded()

  // Vérifier si le cache est toujours vide après le chargement
  if (googleDriveImagesCache.size === 0) {
    console.log(`[GOOGLE DRIVE IMAGES] ⚠️⚠️⚠️ CACHE VIDE pour "${artistName}"`)
    console.log(`[GOOGLE DRIVE IMAGES]   Folder ID: ${process.env.ARTIST_IMAGES_FOLDER_ID || 'NON DÉFINI'}`)
    console.log(`[GOOGLE DRIVE IMAGES]   API Key: ${process.env.GOOGLE_API_KEY ? 'DÉFINIE' : 'NON DÉFINIE'}`)
    return null
  }

  const trimmedName = artistName.trim()
  const searchName = trimmedName.toLowerCase()
  console.log(`[GOOGLE DRIVE IMAGES] 🔍 Recherche pour: "${trimmedName}" (recherche: "${searchName}")`)

  // RECHERCHE SIMPLE: Correspondance exacte insensible à la casse
  for (const [cachedName, url] of googleDriveImagesCache.entries()) {
    const cachedNameLower = cachedName.trim().toLowerCase()
    
    // Correspondance exacte
    if (cachedNameLower === searchName) {
      console.log(`[GOOGLE DRIVE IMAGES] ✅✅✅ TROUVÉ: "${cachedName}" pour "${trimmedName}"`)
      return url
    }
  }

  // Si pas trouvé, afficher TOUT le cache pour debug
  console.log(`[GOOGLE DRIVE IMAGES] ❌ NON TROUVÉ: "${trimmedName}"`)
  console.log(`[GOOGLE DRIVE IMAGES]   Cache contient ${googleDriveImagesCache.size} image(s):`)
  const cacheKeys = Array.from(googleDriveImagesCache.keys())
  cacheKeys.forEach((key, index) => {
    console.log(`[GOOGLE DRIVE IMAGES]     ${index + 1}. "${key}" (recherche: "${key.toLowerCase()}")`)
  })
  
  return null
}

/**
 * Version synchrone (pour compatibilité avec le code existant)
 * ⚠️ ATTENTION: Peut retourner null si le cache n'est pas encore chargé
 */
export function getArtistImageFromGoogleDriveSync(artistName: string): string | null {
  if (!artistName || !artistName.trim()) {
    return null
  }

  if (googleDriveImagesCache.size === 0) {
    return null
  }

  const trimmedName = artistName.trim()

  // PRIORITÉ 1: Correspondance exacte (insensible à la casse)
  for (const [cachedName, url] of googleDriveImagesCache.entries()) {
    if (cachedName.trim().toLowerCase() === trimmedName.toLowerCase()) {
      return url
    }
  }

  // PRIORITÉ 2: Essayer avec normalisation (pour compatibilité)
  const normalizedName = normalizeArtistName(trimmedName)
  if (normalizedName !== trimmedName.toLowerCase()) {
    for (const [cachedName, url] of googleDriveImagesCache.entries()) {
      const normalizedCachedName = normalizeArtistName(cachedName)
      if (normalizedCachedName === normalizedName) {
        return url
      }
    }
  }

  return null
}

/**
 * Vide le cache des images Google Drive
 */
export function clearGoogleDriveImagesCache(): void {
  googleDriveImagesCache.clear()
  cacheLoaded = false
  cacheLoadingPromise = null
  console.log('[GOOGLE DRIVE IMAGES] Cache vidé')
}

/**
 * Récupère le cache des images Google Drive (pour debug)
 */
export function getGoogleDriveImagesCache(): Map<string, string> {
  return googleDriveImagesCache
}

/**
 * Vérifie si le cache est chargé
 */
export function isCacheLoaded(): boolean {
  return cacheLoaded && googleDriveImagesCache.size > 0
}
