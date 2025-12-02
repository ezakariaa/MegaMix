# 🚀 Configuration GitHub Pages

## 📋 Problèmes courants et solutions

### ⚠️ **IMPORTANT : Synchroniser vos données locales vers Railway**

Si vous venez d'importer des albums en local (comme 200 albums, 2790 pistes, 108 artistes), vous devez les synchroniser vers Railway pour que GitHub Pages puisse les afficher.

**Solution rapide :**

1. **Utilisez le script PowerShell** (le plus simple) :
   ```powershell
   .\import-data.ps1
   ```
   
   ⚠️ **Avant d'exécuter**, modifiez l'URL Railway dans le script si nécessaire (ligne 96) :
   ```powershell
   $railwayUrl = "https://votre-app.up.railway.app"
   ```

2. **Ou configurez la synchronisation automatique** :
   
   Ajoutez dans `server/.env` :
   ```env
   RAILWAY_URL=https://votre-app.up.railway.app
   ```
   
   Puis redémarrez le serveur. Les prochains ajouts seront synchronisés automatiquement.

### ❌ Les albums et la bibliothèque ne s'affichent pas

Cela peut être dû à plusieurs raisons :

#### 1. **Configuration de l'URL de l'API manquante**

Le frontend a besoin de connaître l'URL de votre backend déployé (Railway, Koyeb, etc.).

**Solution :**

1. Allez dans votre dépôt GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Cliquez sur **New repository secret**
3. Créez un secret nommé `VITE_API_URL` avec la valeur de votre backend :
   - Exemple Railway : `https://muzak-server-production.up.railway.app` (utilisez l'URL EXACTE de votre domaine Railway)
   - Exemple Koyeb : `https://votre-app.koyeb.app`
   - **Important** : 
     - N'incluez PAS `/api` à la fin, c'est ajouté automatiquement
     - Utilisez l'URL EXACTE de votre domaine Railway (vérifiez dans Railway → Settings → Networking)
     - Si votre domaine est `muzak-server-production.up.railway.app`, utilisez exactement cette URL

4. Redéployez votre application :
   - Allez dans **Actions** → **Deploy to GitHub Pages** → **Run workflow**

#### 2. **Problème de CORS** ⚠️ **LE PLUS FRÉQUENT**

Le backend doit autoriser les requêtes depuis GitHub Pages. Si vous voyez cette erreur dans la console :
```
Access to XMLHttpRequest ... has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Solution :**

1. **Allez sur Railway** : https://railway.app
2. **Sélectionnez votre projet** (ex: `muzak-server-production`)
3. **Cliquez sur votre service** (votre backend)
4. **Allez dans l'onglet "Variables"**
5. **Ajoutez ou modifiez la variable** `ALLOWED_ORIGINS` :

   **Option A - Autoriser toutes les origines** (plus simple, moins sécurisé) :
   ```
   ALLOWED_ORIGINS=*
   ```

   **Option B - Autoriser uniquement GitHub Pages** (plus sécurisé) :
   ```
   ALLOWED_ORIGINS=https://ezakariaa.github.io,https://ezakariaa.github.io/MegaMix
   ```
   ⚠️ Remplacez `ezakariaa` par votre nom d'utilisateur GitHub !

6. **Redéployez le service** : Railway redéploiera automatiquement après avoir sauvegardé la variable

7. **Attendez 1-2 minutes** que le redéploiement se termine

8. **Rafraîchissez votre site GitHub Pages** : Les albums devraient maintenant s'afficher !

#### 3. **Vérifier que le backend fonctionne**

Testez votre backend directement dans le navigateur :

```
https://votre-backend.up.railway.app/api/albums
```

Vous devriez voir une réponse JSON avec vos albums.

### ✅ Vérification

1. Ouvrez la console du navigateur (F12) sur votre site GitHub Pages
2. Vérifiez les messages dans la console :
   - `[API] URL de l'API utilisée: ...` devrait afficher votre URL backend
   - S'il y a des erreurs CORS ou 404, vous les verrez ici

3. Vérifiez l'onglet **Network** :
   - Les requêtes vers `/api/albums` devraient retourner 200 (succès)
   - Si vous voyez des erreurs CORS, configurez `ALLOWED_ORIGINS` sur le backend

### 🔧 Configuration complète

#### Variables d'environnement GitHub Secrets

| Secret | Description | Exemple |
|--------|-------------|---------|
| `VITE_API_URL` | URL de votre backend (sans /api) | `https://muzak-server.up.railway.app` |

#### Variables d'environnement Backend (Railway/Koyeb)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Origines autorisées pour CORS | `https://votre-username.github.io` ou `*` |

### 📝 Notes importantes

- Le workflow GitHub Actions utilise `VITE_API_URL` pour construire l'application
- Si `VITE_API_URL` n'est pas défini, l'application pointera vers `http://localhost:5000` qui ne fonctionnera pas sur GitHub Pages
- Le backend doit être accessible publiquement (pas de localhost)
- Les requêtes API sont faites vers `${VITE_API_URL}/api`

### 🆘 Dépannage

Si après avoir configuré tout cela, ça ne fonctionne toujours pas :

1. **Vérifiez les logs GitHub Actions** :
   - Allez dans **Actions** → Cliquez sur le dernier workflow
   - Vérifiez que le build s'est bien passé
   - Vérifiez que `VITE_API_URL` est bien utilisé

2. **Vérifiez la console du navigateur** :
   - Ouvrez les outils de développement (F12)
   - Regardez l'onglet **Console** pour les erreurs
   - Regardez l'onglet **Network** pour les requêtes API

3. **Testez le backend directement** :
   - Ouvrez `https://votre-backend/production` dans le navigateur
   - Vous devriez voir du JSON, pas une erreur

4. **Vérifiez CORS** :
   - Dans la console, si vous voyez "CORS policy", configurez `ALLOWED_ORIGINS`
   - L'URL GitHub Pages doit être dans la liste des origines autorisées
   - 📖 **Guide détaillé** : Voir `CORRIGER_CORS_RAILWAY.md` pour les instructions pas à pas

