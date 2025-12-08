import { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback } from 'react'

export interface Track {
  id: string
  title: string
  artist: string
  artistId?: string // ID de l'artiste pour faciliter la comparaison
  album: string
  albumId?: string // ID de l'album pour faciliter la comparaison
  coverArt?: string | null
  duration: number
  filePath?: string
  audioUrl?: string // URL pour lire le fichier audio
}

interface PlayerContextType {
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  volume: number
  isShuffled: boolean
  repeatMode: 'off' | 'all' | 'one'
  playTrack: (track: Track) => void
  playAlbum: (albumId: string, tracks: Track[], startIndex?: number) => void
  togglePlay: () => void
  setCurrentTime: (time: number) => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  setShuffled: (shuffled: boolean) => void
  setRepeatMode: (mode: 'off' | 'all' | 'one') => void
  nextTrack: () => void
  previousTrack: () => void
  queue: Track[]
  setQueue: (tracks: Track[]) => void
  recentlyPlayed: Track[]
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(50)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off')
  const [queue, setQueue] = useState<Track[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1)
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([])
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTrackRef = useRef<Track | null>(null)

  // Charger l'historique depuis localStorage au démarrage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentlyPlayed')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setRecentlyPlayed(parsed.slice(0, 10)) // Limiter à 10
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error)
    }
  }, [])

  // Fonction pour ajouter une piste à l'historique
  const addToRecentlyPlayed = useCallback((track: Track) => {
    setRecentlyPlayed(prev => {
      // Retirer la piste si elle existe déjà pour éviter les doublons
      const filtered = prev.filter(t => t.id !== track.id)
      // Ajouter la nouvelle piste au début et limiter à 10
      const updated = [track, ...filtered].slice(0, 10)
      // Sauvegarder dans localStorage
      try {
        localStorage.setItem('recentlyPlayed', JSON.stringify(updated))
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'historique:', error)
      }
      return updated
    })
  }, [])

  // Créer l'élément audio une seule fois
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = volume / 100
    }
    
    const audio = audioRef.current

    const handleTimeUpdate = () => {
      if (audio.currentTime !== undefined) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleLoadedMetadata = () => {
      // Mettre à jour la durée si elle n'est pas définie
      if (currentTrackRef.current && !currentTrackRef.current.duration && audio.duration) {
        const updatedTrack = {
          ...currentTrackRef.current,
          duration: Math.round(audio.duration),
        }
        currentTrackRef.current = updatedTrack
        setCurrentTrack(updatedTrack)
      }
      console.log('Métadonnées audio chargées, durée:', audio.duration)
    }

    const handleError = (e: Event) => {
      console.error('Erreur audio:', e)
      const audioError = audio.error
      if (audioError) {
        console.error('Code d\'erreur audio:', audioError.code, 'Message:', audioError.message)
      }
      setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('error', handleError)
    }
  }, [])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const playTrack = useCallback(async (track: Track) => {
    if (!audioRef.current) {
      console.error('Audio element not initialized')
      return
    }

    // Vérifier si c'est la même piste
    if (currentTrackRef.current?.id === track.id) {
      togglePlay()
      return
    }

    console.log('Lecture de la piste:', track.title, 'ID:', track.id)
    currentTrackRef.current = track
    setCurrentTrack(track)
    setCurrentTime(0)
    setIsPlaying(false) // Arrêter la lecture actuelle
    
    // Ajouter à l'historique des pistes récemment jouées
    addToRecentlyPlayed(track)

    // Construire l'URL du fichier audio via l'API
    let audioUrl: string
    if (track.audioUrl) {
      audioUrl = track.audioUrl
    } else if (track.id) {
      // Utiliser la variable d'environnement VITE_API_URL si définie, sinon utiliser localhost par défaut
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const cleanUrl = baseUrl.replace(/\/$/, '') // Retirer le slash final s'il existe
      const apiBaseUrl = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`
      audioUrl = `${apiBaseUrl}/music/track/${track.id}`
    } else {
      console.error('Aucune URL audio disponible pour la piste:', track)
      return
    }

    console.log('URL audio:', audioUrl)

    try {
      // Charger la nouvelle source
      audioRef.current.src = audioUrl
      console.log('Source audio définie, chargement...')
      
      // Charger l'audio
      audioRef.current.load()
      
      // Démarrer la lecture immédiatement sans attendre le chargement complet
      // L'audio se chargera en streaming
      const audio = audioRef.current
      
      // Gérer les erreurs en arrière-plan
      const handleError = (e: Event) => {
        console.error('❌ Erreur lors du chargement de l\'audio:', e)
        const audioError = audio.error
        if (audioError) {
          console.error('Code d\'erreur:', audioError.code, 'Message:', audioError.message)
        }
        setIsPlaying(false)
      }
      
      // Nettoyer les anciens listeners
      audio.removeEventListener('error', handleError)
      audio.addEventListener('error', handleError)
      
      // Démarrer la lecture immédiatement
      // Le navigateur chargera l'audio en streaming
      console.log('▶️ Démarrage de la lecture immédiate...')
      setIsPlaying(true)
      
      // Essayer de jouer immédiatement
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Lecture démarrée avec succès')
          })
          .catch((error) => {
            console.warn('⚠️ Lecture automatique bloquée, l\'utilisateur devra cliquer:', error)
            // Ne pas définir isPlaying à false ici, car l'utilisateur pourra cliquer sur play
          })
      }
    } catch (error) {
      console.error('❌ Erreur lors de la préparation de la lecture:', error)
      setIsPlaying(false)
    }
  }, [togglePlay, addToRecentlyPlayed])

  // Gérer la fin de piste
  const handleTrackEnded = useCallback(() => {
    if (!audioRef.current) return

    const audio = audioRef.current
    console.log('Piste terminée, mode repeat:', repeatMode, 'queue length:', queue.length, 'index:', currentTrackIndex)
    
    if (repeatMode === 'one') {
      audio.currentTime = 0
      audio.play().catch(console.error)
    } else if (queue.length > 0 && currentTrackIndex >= 0) {
      // Passer à la piste suivante
      const nextIndex = repeatMode === 'all' 
        ? (currentTrackIndex + 1) % queue.length
        : currentTrackIndex + 1
      
      if (nextIndex < queue.length) {
        const nextTrackItem = queue[nextIndex]
        if (nextTrackItem) {
          setCurrentTrackIndex(nextIndex)
          playTrack(nextTrackItem).catch(console.error)
        }
      }
    }
  }, [repeatMode, queue, currentTrackIndex, playTrack])

  useEffect(() => {
    if (!audioRef.current) return
    const audio = audioRef.current
    audio.addEventListener('ended', handleTrackEnded)
    return () => {
      audio.removeEventListener('ended', handleTrackEnded)
    }
  }, [handleTrackEnded])

  // Mettre à jour le volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  // Gérer la lecture/pause
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (isPlaying) {
        const playPromise = audioRef.current.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Lecture en cours')
            })
            .catch((error) => {
              console.error('Erreur lors de la lecture:', error)
              setIsPlaying(false)
            })
        }
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, currentTrack])

  const playAlbum = useCallback((albumId: string, tracks: Track[], startIndex: number = 0) => {
    if (tracks.length === 0) return

    setQueue(tracks)
    
    // Jouer la piste à l'index spécifié (par défaut la première)
    const trackToPlay = tracks[startIndex]
    if (trackToPlay) {
      setCurrentTrackIndex(startIndex)
      playTrack(trackToPlay)
    }
  }, [playTrack])

  const nextTrack = () => {
    if (queue.length === 0) return

    let nextIndex: number
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * queue.length)
    } else {
      nextIndex = (currentTrackIndex + 1) % queue.length
    }

    if (nextIndex === currentTrackIndex && queue.length > 1) {
      // Éviter de jouer la même piste si on shuffle
      nextIndex = (nextIndex + 1) % queue.length
    }

    setCurrentTrackIndex(nextIndex)
    playTrack(queue[nextIndex])
  }

  const previousTrack = () => {
    if (queue.length === 0) return

    let prevIndex: number
    if (isShuffled) {
      prevIndex = Math.floor(Math.random() * queue.length)
    } else {
      prevIndex = currentTrackIndex <= 0 ? queue.length - 1 : currentTrackIndex - 1
    }

    setCurrentTrackIndex(prevIndex)
    playTrack(queue[prevIndex])
  }

  // Fonction pour chercher (seek) une position dans la piste
  const seek = useCallback((time: number) => {
    if (!audioRef.current || !currentTrack) return
    
    // S'assurer que le temps est dans les limites valides
    const clampedTime = Math.max(0, Math.min(time, currentTrack.duration))
    
    // Mettre à jour l'élément audio
    audioRef.current.currentTime = clampedTime
    // Mettre à jour l'état
    setCurrentTime(clampedTime)
  }, [currentTrack])

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        volume,
        isShuffled,
        repeatMode,
        playTrack,
        playAlbum,
        togglePlay,
        setCurrentTime,
        seek,
        setVolume,
        setShuffled: setIsShuffled,
        setRepeatMode,
        nextTrack,
        previousTrack,
        queue,
        setQueue,
        recentlyPlayed,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}

