export interface Artist {
  id: string
  name: string
  albumCount?: number
  trackCount?: number
  coverArt?: string | null
  genre?: string
  biography?: string | null
  logo?: string | null
}

export interface Album {
  id: string
  title: string
  artist: string
  artistId: string
  year?: number
  genre?: string
  trackCount?: number
  coverArt?: string | null
  googleDriveFolderId?: string // ID du dossier Google Drive si l'album vient d'un dossier
  cdCount?: number // Nombre de CDs si l'album contient plusieurs CDs
}

export interface Track {
  id: string
  title: string
  artist: string // Artiste de la piste individuelle (TPE1)
  artistId: string // ID de l'artiste de la piste
  album: string
  albumId: string
  albumArtist?: string // Artiste de l'album (Album Artist / TPE2 si utilisé comme Album Artist)
  albumArtistId?: string // ID de l'artiste de l'album
  duration: number
  genre?: string
  filePath: string // Chemin local OU URL Google Drive
  googleDriveId?: string // ID Google Drive si le fichier vient de Google Drive
  trackNumber?: number
  year?: number
  // Tags ID3 additionnels pour les artistes
  band?: string // TPE2 - Band/Orchestra/Accompaniment (peut être Album Artist)
  conductor?: string // TPE3 - Conductor/Performer refinement
  remixer?: string // TPE4 - Interpreted, remixed, or otherwise modified by
}

export interface Genre {
  id: string
  name: string
  trackCount?: number
}

export interface Playlist {
  id: string
  name: string
  description?: string
  trackIds: string[]
  createdAt: Date
  updatedAt: Date
}
