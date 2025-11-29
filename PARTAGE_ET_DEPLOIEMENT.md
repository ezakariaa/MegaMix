# 📤 Guide de Partage et Déploiement

Ce guide explique comment partager votre application MegaMix avec des amis ou la déployer en ligne.

## 🚀 Options de Partage

### Option 1 : Partage Local avec ngrok (Rapide et Simple)

**ngrok** permet d'exposer votre application locale sur Internet via un tunnel sécurisé.

#### Étapes :

1. **Installer ngrok** :
   - Téléchargez depuis https://ngrok.com/download
   - Ou installez via npm : `npm install -g ngrok`

2. **Démarrer votre application** :
   ```bash
   npm run dev
   ```

3. **Dans un nouveau terminal, créer un tunnel pour le serveur** :
   ```bash
   ngrok http 5000
   ```
   Vous obtiendrez une URL comme : `https://abc123.ngrok.io`

4. **Dans un autre terminal, créer un tunnel pour le client** :
   ```bash
   ngrok http 3000
   ```
   Vous obtiendrez une autre URL comme : `https://xyz789.ngrok.io`

5. **Configurer le client** :
   - Créez un fichier `.env` dans le dossier `client/` avec :
   ```
   VITE_API_URL=https://abc123.ngrok.io
   ```
   (Remplacez par l'URL ngrok de votre serveur)

6. **Redémarrer le client** :
   - Arrêtez le client (Ctrl+C)
   - Relancez : `npm run dev:client`

7. **Partager l'URL du client** :
   - Partagez l'URL ngrok du client (ex: `https://xyz789.ngrok.io`) avec votre ami
   - Votre ami pourra accéder à l'application et écouter vos albums !

**⚠️ Note** : Les URLs ngrok gratuites changent à chaque redémarrage. Pour une URL fixe, utilisez un compte ngrok payant.

---

### Option 2 : Déploiement sur un Service Cloud (Permanent)

#### A. Déploiement sur Railway (Recommandé)

1. **Créer un compte sur Railway** : https://railway.app

2. **Installer Railway CLI** :
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **Dans le dossier du projet, initialiser Railway** :
   ```bash
   railway init
   ```

4. **Configurer les variables d'environnement** dans Railway :
   - `PORT` : 5000 (ou laissez Railway le gérer)
   - `NODE_ENV` : production
   - `ALLOWED_ORIGINS` : Laissez vide pour accepter toutes les origines
   - `GOOGLE_API_KEY` : Votre clé API Google Drive (si nécessaire)
   - `LASTFM_API_KEY` : Votre clé API Last.fm (optionnel)
   - `FANART_API_KEY` : Votre clé API Fanart.tv (optionnel)

5. **Déployer le serveur** :
   ```bash
   cd server
   railway up
   ```

6. **Déployer le client** (sur Vercel, Netlify, ou Railway) :
   - Créez un fichier `.env` dans `client/` avec :
   ```
   VITE_API_URL=https://votre-serveur-railway.railway.app
   ```
   - Déployez sur Vercel/Netlify ou Railway

#### B. Déploiement sur Render

1. **Créer un compte sur Render** : https://render.com

2. **Déployer le serveur** :
   - Créez un nouveau "Web Service"
   - Connectez votre dépôt GitHub
   - Root Directory : `server`
   - Build Command : `npm install && npm run build`
   - Start Command : `npm start`
   - Ajoutez les variables d'environnement nécessaires

3. **Déployer le client** :
   - Créez un nouveau "Static Site"
   - Root Directory : `client`
   - Build Command : `npm install && npm run build`
   - Publish Directory : `dist`
   - Ajoutez la variable d'environnement : `VITE_API_URL=https://votre-serveur.onrender.com`

#### C. Déploiement sur Heroku

1. **Installer Heroku CLI** : https://devcenter.heroku.com/articles/heroku-cli

2. **Déployer le serveur** :
   ```bash
   cd server
   heroku create votre-app-serveur
   heroku config:set NODE_ENV=production
   heroku config:set ALLOWED_ORIGINS=*
   git push heroku main
   ```

3. **Déployer le client** :
   - Utilisez Vercel ou Netlify pour le client
   - Configurez `VITE_API_URL` avec l'URL Heroku de votre serveur

---

## ⚙️ Configuration

### Variables d'Environnement Serveur

Créez un fichier `.env` dans le dossier `server/` :

```env
PORT=5000
NODE_ENV=production

# CORS : Laissez vide ou "*" pour accepter toutes les origines
# Ou spécifiez: "https://votre-domaine.com,https://autre-domaine.com"
ALLOWED_ORIGINS=

# Vos clés API (optionnelles)
GOOGLE_API_KEY=votre_cle_api_google_drive
LASTFM_API_KEY=votre_cle_api_lastfm
FANART_API_KEY=votre_cle_api_fanart
```

### Variables d'Environnement Client

Créez un fichier `.env` dans le dossier `client/` :

```env
# URL de votre serveur backend
# En local: http://localhost:5000
# En production: https://votre-serveur.com
VITE_API_URL=https://votre-serveur.com
```

**⚠️ Important** : Les variables d'environnement dans Vite doivent commencer par `VITE_` pour être accessibles dans le code client.

---

## 🔒 Sécurité

### Pour un déploiement en production :

1. **Limitez les origines CORS** :
   ```env
   ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com
   ```

2. **Utilisez HTTPS** : Tous les services de déploiement modernes fournissent HTTPS automatiquement.

3. **Protégez vos clés API** : Ne commitez jamais vos fichiers `.env` dans Git.

---

## 📝 Notes Importantes

- **Fichiers audio** : Les fichiers audio sont stockés localement dans `server/uploads/`. Pour un déploiement cloud, vous devrez peut-être utiliser un service de stockage (AWS S3, Google Cloud Storage, etc.).

- **Base de données** : Actuellement, les données sont stockées dans des fichiers JSON. Pour une application en production, considérez l'utilisation d'une vraie base de données (PostgreSQL, MongoDB, etc.).

- **Performance** : Le streaming audio fonctionne mieux avec des connexions stables. Pour de gros fichiers, envisagez un CDN.

---

## 🆘 Dépannage

### Erreur CORS
- Vérifiez que `ALLOWED_ORIGINS` est correctement configuré
- En développement, vous pouvez mettre `ALLOWED_ORIGINS=*` temporairement

### L'application ne charge pas les albums
- Vérifiez que `VITE_API_URL` pointe vers le bon serveur
- Vérifiez que le serveur est démarré et accessible
- Ouvrez la console du navigateur pour voir les erreurs

### Les fichiers audio ne se chargent pas
- Vérifiez que les fichiers existent dans `server/uploads/`
- Vérifiez les permissions des fichiers
- Vérifiez que le serveur peut accéder aux fichiers

---

## 📞 Support

Si vous rencontrez des problèmes, vérifiez :
1. Les logs du serveur
2. La console du navigateur
3. Les variables d'environnement
4. La configuration CORS


