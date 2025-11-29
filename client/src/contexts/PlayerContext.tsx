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
  setVolume: (volume: number) => void
  setShuffled: (shuffled: boolean) => void
  setRepeatMode: (mode: 'off' | 'all' | 'one') => void
  nextTrack: () => void
  previousTrack: () => void
  queue: Track[]
  setQueue: (tracks: Track[]) => void
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
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTrackRef = useRef<Track | null>(null)

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

    // Construire l'URL du fichier audio via l'API
    let audioUrl: string
    if (track.audioUrl) {
      audioUrl = track.audioUrl
    } else if (track.id) {
      // Utiliser l'ID de la piste pour récupérer le fichier via l'API
      audioUrl = `http://localhost:5000/api/music/track/${track.id}`
    } else {
      console.error('Aucune URL audio disponible pour la piste:', track)
      return
    }

    console.log('URL audio:', audioUrl)

    try {
      // Charger la nouvelle source
      audioRef.current.src = audioUrl
      console.log('Source audio définie, chargement...')
      
      // Attendre que l'audio soit chargé avant de jouer
      audioRef.current.load()
      
      // Attendre que les métadonnées soient chargées
      await new Promise<void>((resolve, reject) => {
        if (!audioRef.current) {
          reject(new Error('Audio element not available'))
          return
        }

        const audio = audioRef.current!
        
        const handleCanPlay = () => {
          audio.removeEventListener('canplay', handleCanPlay)
          audio.removeEventListener('error', handleError)
          audio.removeEventListener('loadstart', handleLoadStart)
          console.log('✅ Audio prêt à être joué, readyState:', audio.readyState)
          resolve()
        }

        const handleLoadStart = () => {
          console.log('🔄 Début du chargement audio, readyState:', audio.readyState)
        }

        const handleError = (e: Event) => {
          audio.removeEventListener('canplay', handleCanPlay)
          audio.removeEventListener('error', handleError)
          audio.removeEventListener('loadstart', handleLoadStart)
          console.error('❌ Erreur lors du chargement de l\'audio:', e)
          const audioError = audio.error
          if (audioError) {
            console.error('Code d\'erreur:', audioError.code, 'Message:', audioError.message)
          }
          reject(new Error(`Erreur lors du chargement de l'audio: ${audioError?.message || 'Erreur inconnue'}`))
        }

        // Si l'audio est déjà prêt
        if (audio.readyState >= 3) { // HAVE_FUTURE_DATA ou supérieur
          console.log('✅ Audio déjà prêt, readyState:', audio.readyState)
          resolve()
        } else {
          console.log('⏳ Attente du chargement audio, readyState actuel:', audio.readyState)
          audio.addEventListener('canplay', handleCanPlay)
          audio.addEventListener('error', handleError)
          audio.addEventListener('loadstart', handleLoadStart)
          
          // Timeout de sécurité
          setTimeout(() => {
            audio.removeEventListener('canplay', handleCanPlay)
            audio.removeEventListener('error', handleError)
            audio.removeEventListener('loadstart', handleLoadStart)
            if (audio.readyState < 3) {
              console.error('⏱️ Timeout: readyState après 10s:', audio.readyState)
              reject(new Error('Timeout lors du chargement de l\'audio'))
            }
          }, 10000) // 10 secondes
        }
      })

      // Démarrer la lecture
      console.log('▶️ Démarrage de la lecture...')
      setIsPlaying(true)
      console.log('✅ Lecture démarrée')
    } catch (error) {
      console.error('❌ Erreur lors de la préparation de la lecture:', error)
      setIsPlaying(false)
    }
  }, [togglePlay])

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
        setVolume,
        setShuffled: setIsShuffled,
        setRepeatMode,
        nextTrack,
        previousTrack,
        queue,
        setQueue,
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

