import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from 'react-bootstrap'
import './DragDropZone.css'

interface DragDropZoneProps {
  onFilesDropped: (files: File[]) => void
  children?: React.ReactNode
}

function DragDropZone({ onFilesDropped, children }: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const dragCounterRef = useRef(0)
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Filtre les fichiers audio
  const audioExtensions = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.wma']
  const isAudioFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return audioExtensions.includes(ext)
  }

  // Empêcher le comportement par défaut du navigateur (ouvrir les fichiers/dossiers)
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      // Ne pas bloquer si l'événement vient de notre zone de drop
      const target = e.target as HTMLElement
      if (target?.closest('.drag-drop-zone')) {
        return // Laisser notre zone gérer l'événement
      }
      e.preventDefault()
      e.stopPropagation()
    }

    // Réinitialiser le drag si on sort de la fenêtre
    const handleDragEnd = () => {
      setIsDragging(false)
      dragCounterRef.current = 0
    }

    // Empêcher le comportement par défaut sur tout le document pour éviter l'ouverture de fichiers
    document.addEventListener('dragenter', preventDefaults, false)
    document.addEventListener('dragover', preventDefaults, false)
    document.addEventListener('drop', preventDefaults, false)
    document.addEventListener('dragend', handleDragEnd, false)
    window.addEventListener('dragleave', handleDragEnd, false)
    window.addEventListener('mouseup', handleDragEnd, false)

    return () => {
      document.removeEventListener('dragenter', preventDefaults)
      document.removeEventListener('dragover', preventDefaults)
      document.removeEventListener('drop', preventDefaults)
      document.removeEventListener('dragend', handleDragEnd)
      window.removeEventListener('dragleave', handleDragEnd)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Vérifier si on a des fichiers ou dossiers AVANT d'incrémenter
    if (!e.dataTransfer?.items || e.dataTransfer.items.length === 0) {
      return
    }
    
    // Annuler le timeout précédent si existe
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current)
      dragTimeoutRef.current = null
    }
    
    // Réinitialiser le compteur à 1 si c'est un nouveau drag
    if (dragCounterRef.current === 0) {
      dragCounterRef.current = 1
      setIsDragging(true)
      
      // Timeout de sécurité : fermer automatiquement après 30 secondes
      dragTimeoutRef.current = setTimeout(() => {
        setIsDragging(false)
        dragCounterRef.current = 0
        dragTimeoutRef.current = null
      }, 30000)
    } else {
      dragCounterRef.current++
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounterRef.current--
    
    // Si le compteur atteint 0 ou négatif, réinitialiser
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragging(false)
      // Annuler le timeout
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current)
        dragTimeoutRef.current = null
      }
    }
    
    // Vérifier aussi si on sort vraiment de la zone (coordonnées)
    const rect = dropZoneRef.current?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX
      const y = e.clientY
      // Si on est complètement en dehors de la zone
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        dragCounterRef.current = 0
        setIsDragging(false)
        // Annuler le timeout
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current)
          dragTimeoutRef.current = null
        }
      }
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Forcer le mode copy pour permettre le drop
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Réinitialiser immédiatement les états
    setIsDragging(false)
    dragCounterRef.current = 0
    
    // Annuler le timeout si existe
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current)
      dragTimeoutRef.current = null
    }

    console.log('=== DROP EVENT ===')
    console.log('Items:', e.dataTransfer.items?.length)
    console.log('Files:', e.dataTransfer.files?.length)

    // Créer une copie des items avant qu'ils ne soient invalidés
    const items = e.dataTransfer.items
    const files: File[] = []

    if (!items || items.length === 0) {
      console.warn('Aucun item dans le drop')
      // Réinitialiser quand même les états
      return
    }

    // Vérifier si on est déjà en train de traiter
    if (isProcessing) {
      console.warn('Traitement déjà en cours, ignoré')
      return
    }

    // Traiter chaque item
    const processItems = async () => {
      // Traiter les items de manière séquentielle pour éviter les problèmes
      // avec les références webkit qui peuvent être invalidées
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        // Vérifier si c'est un fichier ou dossier
        if (item.kind === 'file') {
          try {
            // Essayer d'obtenir l'entrée File System (nécessaire pour les dossiers)
            const entry = item.webkitGetAsEntry()
            
            if (entry) {
              console.log(`Traitement de l'entrée: ${entry.name} (${entry.isDirectory ? 'dossier' : 'fichier'})`)
              await processEntry(entry, files)
            } else {
              // Fallback : essayer d'obtenir le fichier directement
              const file = item.getAsFile()
              if (file) {
                console.log(`Fichier direct: ${file.name}`)
                if (isAudioFile(file)) {
                  files.push(file)
                }
              }
            }
          } catch (error) {
            console.error(`Erreur lors du traitement de l'item ${i}:`, error)
          }
        }
      }
    }

    try {
      await processItems()
      console.log(`Total de ${files.length} fichier(s) audio collecté(s)`)
    } catch (error) {
      console.error('Erreur lors du traitement des items:', error)
    }

    // Si on n'a pas de fichiers, essayer avec dataTransfer.files comme fallback
    if (files.length === 0 && e.dataTransfer.files.length > 0) {
      console.log('Fallback: utilisation de dataTransfer.files')
      const droppedFiles = Array.from(e.dataTransfer.files)
      const audioFiles = droppedFiles.filter(isAudioFile)
      files.push(...audioFiles)
      console.log(`${audioFiles.length} fichier(s) audio trouvé(s)`)
    }

    if (files.length > 0) {
      console.log(`Traitement final de ${files.length} fichier(s) audio`)
      setIsProcessing(true)
      try {
        await onFilesDropped(files)
      } catch (error) {
        console.error('Erreur lors du traitement des fichiers:', error)
      } finally {
        // S'assurer que l'état est réinitialisé après le traitement
        setIsProcessing(false)
        setIsDragging(false)
        dragCounterRef.current = 0
        
        // Attendre un peu pour permettre à l'UI de se mettre à jour
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } else {
      console.warn('Aucun fichier audio trouvé')
      // Réinitialiser les états même si aucun fichier trouvé
      setIsDragging(false)
      dragCounterRef.current = 0
      
      // Ne pas afficher d'alerte pour éviter de bloquer l'utilisateur
      console.info('Utilisez le bouton "Sélectionner un dossier" si le drag & drop ne fonctionne pas')
    }
    
    // S'assurer que le drag est désactivé à la fin (sécurité supplémentaire)
    setTimeout(() => {
      setIsDragging(false)
      dragCounterRef.current = 0
    }, 100)
  }, [onFilesDropped, isAudioFile, isProcessing])

  // Fonction récursive améliorée pour parcourir les dossiers
  const processEntry = async (entry: FileSystemEntry | null, files: File[]): Promise<void> => {
    if (!entry) {
      return
    }

    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      return new Promise<void>((resolve) => {
        fileEntry.file((file) => {
          if (file && isAudioFile(file)) {
            console.log(`  ✓ Fichier audio: ${file.name}`)
            files.push(file)
          }
          resolve()
        }, (error) => {
          console.error(`  ✗ Erreur lecture fichier ${entry.name}:`, error)
          resolve()
        })
      })
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const reader = dirEntry.createReader()
      
      console.log(`  📁 Ouverture du dossier: ${entry.name}`)
      
      // Fonction pour lire toutes les entrées d'un dossier
      const readAllEntries = (): Promise<FileSystemEntry[]> => {
        const entries: FileSystemEntry[] = []
        
        const readBatch = (): Promise<void> => {
          return new Promise((resolve, reject) => {
            reader.readEntries((batch) => {
              if (batch.length === 0) {
                resolve()
                return
              }
              
              entries.push(...batch)
              console.log(`  → Lu ${batch.length} entrées (total: ${entries.length})`)
              
              // Lire le batch suivant
              readBatch().then(resolve).catch(reject)
            }, (error) => {
              console.error(`  ✗ Erreur lecture dossier ${entry.name}:`, error)
              reject(error)
            })
          })
        }
        
        return readBatch().then(() => entries)
      }

      try {
        const allEntries = await readAllEntries()
        console.log(`  📁 Dossier ${entry.name}: ${allEntries.length} entrées trouvées`)
        
        // Traiter toutes les entrées de manière séquentielle pour éviter les problèmes
        // et s'assurer que les références restent valides
        for (const subEntry of allEntries) {
          try {
            await processEntry(subEntry, files)
          } catch (error) {
            console.error(`Erreur lors du traitement de l'entrée ${subEntry.name}:`, error)
          }
        }
      } catch (error) {
        console.error(`  ✗ Erreur lors du traitement du dossier ${entry.name}:`, error)
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const audioFiles = selectedFiles.filter(isAudioFile)

    if (audioFiles.length > 0) {
      setIsProcessing(true)
      try {
        await onFilesDropped(audioFiles)
      } finally {
        setIsProcessing(false)
      }
    }

    // Réinitialiser l'input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div
      ref={dropZoneRef}
      className={`drag-drop-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        webkitdirectory=""
        directory=""
        accept="audio/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      {children}
      {isDragging && (
        <div 
          className="drag-overlay"
          onClick={() => {
            // Permettre de cliquer pour fermer si bloqué
            setIsDragging(false)
            dragCounterRef.current = 0
          }}
          onMouseLeave={() => {
            // Fermer automatiquement si on sort avec la souris
            setTimeout(() => {
              setIsDragging(false)
              dragCounterRef.current = 0
            }, 500)
          }}
        >
          <div className="drag-message">
            <i className="bi bi-cloud-upload"></i>
            <h3>Déposez votre dossier de musique ici</h3>
            <p>Les fichiers audio seront analysés et ajoutés à votre bibliothèque</p>
            <p className="text-muted mt-3" style={{ fontSize: '0.85rem', opacity: 0.7 }}>
              Cliquez n'importe où pour annuler
            </p>
          </div>
        </div>
      )}
      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-message">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p>Traitement des fichiers en cours...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export { DragDropZone }
export default DragDropZone

// Composant bouton de sélection de dossier
export function FolderSelectButton({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const audioExtensions = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.wma']
  const isAudioFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return audioExtensions.includes(ext)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const audioFiles = selectedFiles.filter(isAudioFile)

    if (audioFiles.length > 0) {
      setIsProcessing(true)
      try {
        await onFilesSelected(audioFiles)
      } finally {
        setIsProcessing(false)
      }
    }

    // Réinitialiser l'input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        webkitdirectory=""
        directory=""
        accept="audio/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <Button
        variant="success"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="folder-select-button"
      >
        {isProcessing ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            Traitement...
          </>
        ) : (
          <>
            <i className="bi bi-folder-plus me-2"></i>
            Sélectionner un dossier
          </>
        )}
      </Button>
    </>
  )
}
