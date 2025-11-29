# Guide de Configuration de l'API Google Drive

Ce guide vous explique comment obtenir une clé API Google Drive pour permettre à MuZak d'importer des albums depuis Google Drive.

## Étape 1 : Créer un Projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Connectez-vous avec votre compte Google
3. Cliquez sur le sélecteur de projet en haut de la page
4. Cliquez sur **"Nouveau projet"** (ou **"New Project"**)
5. Donnez un nom à votre projet (ex: "MuZak")
6. Cliquez sur **"Créer"** (ou **"Create"**)

## Étape 2 : Activer l'API Google Drive

1. Dans le menu latéral, allez dans **"APIs & Services"** > **"Bibliothèque"** (ou **"Library"**)
2. Dans la barre de recherche, tapez **"Google Drive API"**
3. Cliquez sur **"Google Drive API"**
4. Cliquez sur le bouton **"Activer"** (ou **"Enable"**)

## Étape 3 : Créer une Clé API

1. Dans le menu latéral, allez dans **"APIs & Services"** > **"Identifiants"** (ou **"Credentials"**)
2. Cliquez sur **"+ CRÉER DES IDENTIFIANTS"** (ou **"+ CREATE CREDENTIALS"**)
3. Sélectionnez **"Clé API"** (ou **"API key"**)
4. Une clé API sera générée automatiquement
5. **Important** : Cliquez sur **"Restreindre la clé"** (ou **"Restrict key"**) pour la sécurité
6. Dans **"Restrictions d'API"**, sélectionnez **"Restreindre la clé"** et choisissez **"Google Drive API"**
7. Dans **"Restrictions d'application"**, vous pouvez laisser **"Aucune"** pour le développement, ou restreindre par adresse IP si nécessaire
8. Cliquez sur **"Enregistrer"** (ou **"Save"**)
9. **Copiez la clé API** qui s'affiche (elle ressemble à : `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

## Étape 4 : Configurer la Clé API dans MuZak

1. Allez dans le dossier `server` de votre projet MuZak
2. Créez un fichier `.env` (s'il n'existe pas déjà) à la racine du dossier `server`
3. Ajoutez la ligne suivante dans le fichier `.env` :

```
GOOGLE_API_KEY=votre_cle_api_ici
```

Remplacez `votre_cle_api_ici` par la clé API que vous avez copiée à l'étape 3.

**Exemple :**
```
PORT=5000
NODE_ENV=development
GOOGLE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Étape 5 : Redémarrer le Serveur

1. Arrêtez le serveur s'il est en cours d'exécution (Ctrl+C)
2. Redémarrez le serveur avec `npm run dev` dans le dossier `server`

## Vérification

Une fois configuré, vous pouvez tester l'import depuis Google Drive :
1. Allez sur la page "Ma Bibliothèque"
2. Cliquez sur l'icône cloud-plus (☁️+)
3. Collez un lien vers un dossier Google Drive partagé publiquement
4. L'album devrait être importé avec succès

## Notes Importantes

- **Sécurité** : Ne partagez jamais votre clé API publiquement
- **Quotas** : Google Drive API a des limites de requêtes par jour (gratuit : 1 000 000 requêtes/jour)
- **Partage** : Les dossiers Google Drive doivent être partagés publiquement (lien partageable) pour que l'API puisse y accéder
- **Fichiers individuels** : Vous pouvez aussi partager des fichiers individuels au lieu de dossiers entiers

## Dépannage

Si vous rencontrez des erreurs :
1. Vérifiez que la clé API est correctement copiée dans le fichier `.env`
2. Vérifiez que l'API Google Drive est bien activée dans votre projet
3. Vérifiez que le fichier `.env` est dans le dossier `server` (pas dans `client`)
4. Vérifiez les logs du serveur pour voir les messages d'erreur détaillés

