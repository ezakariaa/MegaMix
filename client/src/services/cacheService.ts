/**
 * Service de cache simple pour les données de l'API
 * Utilise localStorage pour persister les données entre les sessions
 */

const CACHE_PREFIX = 'muzak_cache_'
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes (augmenté pour améliorer les performances)

interface CacheEntry<T> {
  data: T
  timestamp: number
}

/**
 * Récupère une valeur du cache
 */
export function getCached<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key)
    if (!cached) return null

    const entry: CacheEntry<T> = JSON.parse(cached)
    const now = Date.now()

    // Vérifier si le cache est expiré
    if (now - entry.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }

    return entry.data
  } catch (error) {
    console.error('Erreur lors de la lecture du cache:', error)
    return null
  }
}

/**
 * Met en cache une valeur
 */
export function setCached<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch (error) {
    console.error('Erreur lors de l\'écriture du cache:', error)
    // Si le localStorage est plein, supprimer les anciennes entrées
    if (error instanceof DOMException && error.code === 22) {
      clearOldCache()
      // Réessayer
      try {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
        }
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
      } catch (retryError) {
        console.error('Impossible de mettre en cache après nettoyage:', retryError)
      }
    }
  }
}

/**
 * Supprime une valeur du cache
 */
export function removeCached(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key)
  } catch (error) {
    console.error('Erreur lors de la suppression du cache:', error)
  }
}

/**
 * Vide tout le cache
 */
export function clearCache(): void {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Erreur lors du nettoyage du cache:', error)
  }
}

/**
 * Nettoie les entrées de cache expirées
 */
function clearOldCache(): void {
  try {
    const keys = Object.keys(localStorage)
    const now = Date.now()
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const entry: CacheEntry<any> = JSON.parse(cached)
            if (now - entry.timestamp > CACHE_DURATION) {
              localStorage.removeItem(key)
            }
          }
        } catch (error) {
          // Si l'entrée est corrompue, la supprimer
          localStorage.removeItem(key)
        }
      }
    })
  } catch (error) {
    console.error('Erreur lors du nettoyage du cache:', error)
  }
}

/**
 * Vérifie si une clé existe dans le cache et n'est pas expirée
 */
export function hasCached(key: string): boolean {
  return getCached(key) !== null
}

