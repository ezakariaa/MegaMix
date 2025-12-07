/**
 * Service de cache simple pour les données de l'API
 * Utilise localStorage pour persister les données entre les sessions
 */

const CACHE_PREFIX = 'muzak_cache_'
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes (augmenté pour améliorer les performances et réduire les requêtes)

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
    // Vérifier la taille avant de mettre en cache
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    }
    const serialized = JSON.stringify(entry)
    const size = new Blob([serialized]).size
    
    // Si la donnée est trop volumineuse (> 5 MB), ne pas la mettre en cache
    const MAX_CACHE_SIZE = 5 * 1024 * 1024 // 5 MB
    if (size > MAX_CACHE_SIZE) {
      console.warn(`[CACHE] Données trop volumineuses pour "${key}" (${Math.round(size / 1024 / 1024)} MB), pas de mise en cache`)
      return
    }
    
    // Nettoyer préventivement si on approche de la limite
    const estimatedQuota = 5 * 1024 * 1024 // Estimation conservatrice de 5 MB
    const currentUsage = estimateLocalStorageUsage()
    if (currentUsage + size > estimatedQuota * 0.8) { // Si on dépasse 80% du quota estimé
      console.log(`[CACHE] Nettoyage préventif (usage: ${Math.round(currentUsage / 1024)} KB)`)
      clearLargeCaches(key)
    }
    
    localStorage.setItem(CACHE_PREFIX + key, serialized)
  } catch (error: any) {
    // Vérifier si c'est une erreur de quota
    const isQuotaError = 
      (error instanceof DOMException && (error.code === 22 || error.code === 1014)) ||
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    
    if (isQuotaError) {
      console.warn(`[CACHE] Quota localStorage dépassé pour la clé "${key}", nettoyage agressif...`)
      
      // Nettoyage agressif : supprimer les caches les plus volumineux d'abord
      clearLargeCaches(key)
      
      // Réessayer
      try {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
        }
        const serialized = JSON.stringify(entry)
        const size = new Blob([serialized]).size
        
        // Si c'est encore trop volumineux après nettoyage, ne pas mettre en cache
        if (size > 5 * 1024 * 1024) {
          console.warn(`[CACHE] Données toujours trop volumineuses après nettoyage (${Math.round(size / 1024 / 1024)} MB), pas de mise en cache`)
          return
        }
        
        localStorage.setItem(CACHE_PREFIX + key, serialized)
      } catch (retryError: any) {
        // Si ça échoue encore, supprimer TOUS les caches sauf celui qu'on essaie de sauvegarder
        console.warn('[CACHE] Nettoyage agressif insuffisant, suppression de tous les caches...')
        clearAllCachesExcept(key)
        
        // Dernier essai
        try {
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
          }
          const serialized = JSON.stringify(entry)
          const size = new Blob([serialized]).size
          
          // Si c'est encore trop volumineux, ne pas mettre en cache
          if (size > 5 * 1024 * 1024) {
            console.warn(`[CACHE] Données trop volumineuses même après nettoyage complet (${Math.round(size / 1024 / 1024)} MB), pas de mise en cache`)
            return
          }
          
          localStorage.setItem(CACHE_PREFIX + key, serialized)
        } catch (finalError) {
          console.error('[CACHE] Impossible de mettre en cache même après nettoyage complet:', finalError)
          // Ne pas bloquer l'application, continuer sans cache
        }
      }
    } else {
      console.error('Erreur lors de l\'écriture du cache:', error)
    }
  }
}

/**
 * Estime l'utilisation actuelle du localStorage
 */
function estimateLocalStorageUsage(): number {
  try {
    let total = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const item = localStorage.getItem(key)
        if (item) {
          total += new Blob([item]).size
        }
      }
    }
    return total
  } catch (error) {
    return 0
  }
}

/**
 * Nettoie les caches les plus volumineux (tracks, albums avec images)
 */
function clearLargeCaches(excludeKey?: string): void {
  try {
    // Ordre de priorité : supprimer les plus volumineux d'abord
    const priorityKeys = ['tracks', 'albums', 'artists', 'genres']
    
    // D'abord, supprimer tous les caches sauf celui qu'on essaie de sauvegarder
    const keys = Object.keys(localStorage)
    const excludeFullKey = excludeKey ? CACHE_PREFIX + excludeKey : null
    
    // Trier par taille (les plus gros d'abord)
    const cacheEntries: Array<{ key: string; size: number }> = []
    
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX) && key !== excludeFullKey) {
        try {
          const item = localStorage.getItem(key)
          if (item) {
            const size = new Blob([item]).size
            cacheEntries.push({ key, size })
          }
        } catch (e) {
          // Ignorer les erreurs de lecture
        }
      }
    }
    
    // Trier par taille décroissante
    cacheEntries.sort((a, b) => b.size - a.size)
    
    // Supprimer les caches les plus volumineux jusqu'à libérer au moins 2 MB
    let freedSpace = 0
    const targetFreeSpace = 2 * 1024 * 1024 // 2 MB
    
    for (const entry of cacheEntries) {
      if (freedSpace < targetFreeSpace) {
        console.log(`[CACHE] Suppression du cache "${entry.key}" (${Math.round(entry.size / 1024)} KB)`)
        localStorage.removeItem(entry.key)
        freedSpace += entry.size
      } else {
        break
      }
    }
    
    // Si on n'a pas libéré assez d'espace, supprimer tous les caches sauf celui qu'on essaie de sauvegarder
    if (freedSpace < targetFreeSpace && excludeFullKey) {
      console.warn('[CACHE] Nettoyage insuffisant, suppression de tous les autres caches...')
      for (const key of keys) {
        if (key.startsWith(CACHE_PREFIX) && key !== excludeFullKey) {
          localStorage.removeItem(key)
        }
      }
    }
    
    // Nettoyer aussi les anciennes entrées expirées
    clearOldCache()
  } catch (error) {
    console.error('[CACHE] Erreur lors du nettoyage des gros caches:', error)
  }
}

/**
 * Supprime tous les caches sauf celui spécifié
 */
function clearAllCachesExcept(keepKey: string): void {
  try {
    const keys = Object.keys(localStorage)
    const keepFullKey = CACHE_PREFIX + keepKey
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX) && key !== keepFullKey) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('[CACHE] Erreur lors du nettoyage complet:', error)
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
 * Récupère une valeur du cache même si elle est expirée
 * Utile en cas d'erreur réseau pour afficher les dernières données disponibles
 */
export function getCachedEvenExpired<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key)
    if (!cached) return null

    const entry: CacheEntry<T> = JSON.parse(cached)
    // Retourner les données même si expirées
    return entry.data
  } catch (error) {
    console.error('Erreur lors de la lecture du cache:', error)
    return null
  }
}

/**
 * Vérifie si une clé existe dans le cache et n'est pas expirée
 */
export function hasCached(key: string): boolean {
  return getCached(key) !== null
}

