import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Crée le dossier de téléchargement s'il n'existe pas
 */
export async function ensureUploadDirectory(): Promise<void> {
  const uploadDir = path.join(process.cwd(), 'uploads', 'temp')
  try {
    await fs.mkdir(uploadDir, { recursive: true })
  } catch (error) {
    console.error('Erreur lors de la création du dossier uploads:', error)
  }
}



