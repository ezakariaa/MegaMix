export interface Artist {
  id: string
  name: string
  albumCount?: number
  trackCount?: number
  coverArt?: string | null
  genre?: string
  biography?: string | null
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
}

export interface Track {
  id: string
  title: string
  artist: string
  artistId: string
  album: string
  albumId: string
  duration: number
  genre?: string
  filePath: string // Chemin local OU URL Google Drive
  googleDriveId?: string // ID Google Drive si le fichier vient de Google Drive
  trackNumber?: number
  year?: number
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
