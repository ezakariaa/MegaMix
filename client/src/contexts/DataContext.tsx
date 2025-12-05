import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getAlbums, Album } from '../services/musicService'

interface DataContextType {
  albums: Album[]
  loading: boolean
  refreshAlbums: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)

  const refreshAlbums = async () => {
    setLoading(true)
    try {
      const loadedAlbums = await getAlbums(false) // Ne pas utiliser le cache pour le refresh
      setAlbums(loadedAlbums)
    } catch (error) {
      console.error('Erreur lors du chargement des albums:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Charger les albums au démarrage avec cache
    const loadInitialAlbums = async () => {
      setLoading(true)
      try {
        const loadedAlbums = await getAlbums(true) // Utiliser le cache
        setAlbums(loadedAlbums)
      } catch (error) {
        console.error('Erreur lors du chargement initial des albums:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialAlbums()
  }, [])

  return (
    <DataContext.Provider value={{ albums, loading, refreshAlbums }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}



