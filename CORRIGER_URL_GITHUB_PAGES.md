# 🔧 Corriger l'URL de l'API dans GitHub Pages

## ❌ Problème

Votre backend Railway fonctionne sur `https://muzak-server-production.up.railway.app` et retourne bien les albums, mais GitHub Pages essaie toujours d'accéder à l'ancienne URL `https://muzak-server.up.railway.app` (sans `-production`).

**Symptômes :**
- ✅ Le backend fonctionne : `https://muzak-server-production.up.railway.app/api/music/albums` retourne vos albums
- ❌ GitHub Pages affiche "0 albums" et des erreurs CORS/404 dans la console
- ❌ La console montre des requêtes vers `muzak-server.up.railway.app` (sans `-production`)

## ✅ Solution

### Étape 1 : Mettre à jour le secret GitHub

1. Allez sur votre dépôt GitHub
2. Cliquez sur **Settings** → **Secrets and variables** → **Actions**
3. **Cherchez** le secret `VITE_API_URL`
4. **Cliquez dessus** pour le modifier (ou créez-le s'il n'existe pas)
5. **Mettez à jour la valeur** avec :
   ```
   https://muzak-server-production.up.railway.app
   ```
   ⚠️ **Important** :
   - Utilisez l'URL **exacte** de votre domaine Railway (avec `-production`)
   - **N'incluez PAS** `/api` à la fin
   - **Pas d'espace** avant ou après

6. **Sauvegardez**

### Étape 2 : Redéployer GitHub Pages

1. Allez dans **Actions** (onglet en haut de votre dépôt GitHub)
2. Cliquez sur **"Deploy to GitHub Pages"** dans la liste des workflows
3. Cliquez sur **"Run workflow"** (bouton en haut à droite)
4. Sélectionnez la branche **"main"** (ou votre branche principale)
5. Cliquez sur **"Run workflow"**
6. **Attendez 2-3 minutes** que le déploiement se termine

### Étape 3 : Vérifier le déploiement

1. Dans **Actions**, cliquez sur le workflow en cours
2. Vérifiez que toutes les étapes sont **vertes** (succès)
3. Cherchez dans les logs de build la ligne qui affiche :
   ```
   ✅ VITE_API_URL configuré: https://muzak-server-production.up.railway.app
   ```

### Étape 4 : Vider le cache et tester

1. **Ouvrez votre site GitHub Pages** : `https://ezakariaa.github.io/MegaMix/`
2. **Videz le cache** :
   - **Windows** : `Ctrl+Shift+Delete` ou `Ctrl+F5`
   - **Mac** : `Cmd+Shift+R`
3. **Ouvrez la console** (F12)
4. **Vérifiez** :
   - `[API] URL de l'API utilisée:` devrait afficher `https://muzak-server-production.up.railway.app/api`
   - Les requêtes devraient aller vers `muzak-server-production.up.railway.app`
   - Plus d'erreurs 404 ou CORS
   - Vos albums devraient s'afficher ! 🎉

## 🔍 Vérification

### Dans la console du navigateur

Après le redéploiement, vous devriez voir :

✅ **Bon signe** :
```
[API] URL de l'API utilisée: https://muzak-server-production.up.railway.app/api
[API] Requête GET vers: https://muzak-server-production.up.railway.app/api/music/albums
```

❌ **Mauvais signe** (si vous voyez encore ça) :
```
[API] URL de l'API utilisée: https://muzak-server.up.railway.app/api
[API] Requête GET vers: https://muzak-server.up.railway.app/api/music/albums
```

### Dans l'onglet Network

1. Ouvrez les outils de développement (F12)
2. Allez dans l'onglet **Network**
3. Rafraîchissez la page
4. Cherchez la requête vers `/api/music/albums`
5. **Vérifiez l'URL** : elle doit être `https://muzak-server-production.up.railway.app/api/music/albums`
6. **Vérifiez le statut** : doit être `200` (succès)

## 🚨 Si ça ne fonctionne toujours pas

### Vérification 1 : Le secret est bien sauvegardé

1. Dans GitHub, allez dans **Settings** → **Secrets and variables** → **Actions**
2. Vérifiez que `VITE_API_URL` existe et a la valeur `https://muzak-server-production.up.railway.app`
3. ⚠️ **Pas d'espace**, **pas de `/api` à la fin**

### Vérification 2 : Le build utilise bien la variable

1. Dans **Actions**, ouvrez le dernier workflow "Deploy to GitHub Pages"
2. Cliquez sur l'étape **"Build"**
3. Cherchez dans les logs :
   - `✅ VITE_API_URL configuré: https://muzak-server-production.up.railway.app`
   - Si vous voyez `⚠️ ATTENTION: VITE_API_URL n'est pas configuré`, le secret n'est pas bien configuré

### Vérification 3 : CORS est bien configuré

1. Dans Railway, vérifiez que `ALLOWED_ORIGINS` est configuré avec :
   - `*` (toutes les origines)
   - OU `https://ezakariaa.github.io,https://ezakariaa.github.io/MegaMix`

### Vérification 4 : Le cache du navigateur

Parfois le navigateur cache l'ancienne version :

1. **Fermez complètement** le navigateur
2. **Rouvrez-le**
3. **Ouvrez votre site** en navigation privée (Ctrl+Shift+N ou Cmd+Shift+N)
4. Testez à nouveau

## ✅ Résumé

**Actions à faire :**
1. ✅ Mettre à jour `VITE_API_URL` dans GitHub Secrets avec `https://muzak-server-production.up.railway.app`
2. ✅ Redéployer GitHub Pages (Actions → Deploy to GitHub Pages → Run workflow)
3. ✅ Attendre 2-3 minutes
4. ✅ Vider le cache et rafraîchir
5. ✅ Vérifier dans la console que l'URL est correcte

**Une fois fait, vos 200 albums devraient s'afficher ! 🎵**

