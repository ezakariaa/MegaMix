# Configuration des Photos d'Artistes depuis Google Drive

## Description

Vous pouvez maintenant stocker vos propres photos d'artistes dans un dossier Google Drive et le système les récupérera automatiquement pour les afficher sur la page Artistes et dans la bannière d'artiste.

## Configuration

### 1. Créer un dossier Google Drive

1. Créez un dossier dans Google Drive
2. Partagez-le en mode **"Tout le monde avec le lien"** (public)
3. Copiez l'ID du dossier depuis l'URL :
   - Exemple d'URL : `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`
   - L'ID est : `1a2b3c4d5e6f7g8h9i0j`

### 2. Ajouter des photos d'artistes

- Nommez vos fichiers avec le **nom exact de l'artiste**
- Formats supportés : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.bmp`
- Exemples :
  - `The Beatles.jpg`
  - `Michael Jackson.png`
  - `Édith Piaf.jpg` (les accents sont gérés automatiquement)

### 3. Configurer la variable d'environnement

Ajoutez dans votre fichier `.env` du serveur :

```env
GOOGLE_DRIVE_ARTISTS_FOLDER_ID=votre_id_de_dossier
GOOGLE_API_KEY=votre_clé_api_google (optionnel, mais recommandé)
```

#### Obtenir une clé API Google (optionnel mais recommandé)

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un projet ou sélectionnez un projet existant
3. Activez l'API Google Drive
4. Créez des identifiants (clé API)
5. Copiez la clé API dans votre `.env`

**Note** : Sans clé API, le système utilisera le scraping HTML (moins fiable mais fonctionne pour les dossiers publics).

## Fonctionnement

1. **Priorité** : Les photos Google Drive sont recherchées **en premier** avant toutes les autres sources
2. **Matching** : Le système fait correspondre le nom de l'artiste avec le nom du fichier (insensible à la casse, sans accents)
3. **Proxy** : Les images sont servies via le proxy d'images pour éviter les problèmes CORS

## Exemples de noms de fichiers

- `The Beatles.jpg` → correspond à "The Beatles"
- `michael-jackson.png` → correspond à "Michael Jackson"
- `Édith Piaf.jpg` → correspond à "Édith Piaf" ou "Edith Piaf"
- `AC/DC.jpg` → correspond à "AC/DC"

## Dépannage

### Les photos ne s'affichent pas

1. Vérifiez que le dossier est bien partagé publiquement
2. Vérifiez que `GOOGLE_DRIVE_ARTISTS_FOLDER_ID` est correctement configuré
3. Vérifiez que le nom du fichier correspond au nom de l'artiste (sans extension)
4. Consultez les logs du serveur pour voir les erreurs éventuelles

### Logs utiles

Le serveur affiche des logs pour chaque recherche :
- `[GOOGLE DRIVE ARTIST] Image trouvée pour {artiste}: {nom_fichier}` → Succès
- `[GOOGLE DRIVE ARTIST] Erreur lors de la recherche pour {artiste}` → Erreur


