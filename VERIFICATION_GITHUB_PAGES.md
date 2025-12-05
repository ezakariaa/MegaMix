# 🔍 Vérification rapide - GitHub Pages ne charge pas les données

## ✅ Checklist de vérification

### 1. **Vérifier que VITE_API_URL est configuré dans GitHub**

1. Allez sur votre dépôt GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Vérifiez qu'il existe un secret nommé `VITE_API_URL`
4. La valeur doit être : `https://muzak-server-production.up.railway.app` (sans `/api` à la fin)

**Si le secret n'existe pas :**
- Cliquez sur **New repository secret**
- Nom : `VITE_API_URL`
- Valeur : `https://muzak-server-production.up.railway.app`
- Cliquez sur **Add secret**

### 2. **Redéployer l'application après avoir configuré le secret**

1. Allez dans **Actions** → **Deploy to GitHub Pages**
2. Cliquez sur **Run workflow**
3. Attendez que le déploiement se termine (2-3 minutes)

### 3. **Vérifier CORS sur Railway**

1. Allez sur https://railway.app
2. Sélectionnez votre projet `muzak-server-production`
3. Cliquez sur votre service (backend)
4. Allez dans **Variables**
5. Vérifiez que `ALLOWED_ORIGINS` existe et contient :
   ```
   ALLOWED_ORIGINS=*
   ```
   Ou spécifiquement votre URL GitHub Pages :
   ```
   ALLOWED_ORIGINS=https://votre-username.github.io,https://votre-username.github.io/MegaMix
   ```

### 4. **Tester le backend directement**

Ouvrez dans votre navigateur :
```
https://muzak-server-production.up.railway.app/api/music/albums
```

**Vous devriez voir :**
- Un JSON avec vos albums (64 albums selon vos logs)
- **PAS** une erreur 404 ou CORS

### 5. **Vérifier la console du navigateur sur GitHub Pages**

1. Ouvrez votre site GitHub Pages
2. Appuyez sur **F12** pour ouvrir les outils de développement
3. Allez dans l'onglet **Console**
4. Cherchez les messages commençant par `[API]`

**Messages à vérifier :**
- ✅ `[API] VITE_API_URL: https://muzak-server-production.up.railway.app` (doit être votre URL Railway, PAS localhost)
- ✅ `[API] ✅ Réponse reçue avec succès: 64 albums`
- ❌ Si vous voyez `localhost:5000` → Le secret n'est pas configuré
- ❌ Si vous voyez des erreurs CORS → Configurez `ALLOWED_ORIGINS` sur Railway

### 6. **Vérifier l'onglet Network**

1. Dans les outils de développement (F12)
2. Allez dans l'onglet **Network**
3. Rechargez la page
4. Cherchez les requêtes vers `/api/music/albums`
5. Cliquez sur la requête et vérifiez :
   - **Status** : Doit être `200` (succès)
   - **Request URL** : Doit pointer vers Railway, pas localhost
   - Si **Status** est `0` ou `CORS error` → Problème CORS

## 🚨 Problèmes courants et solutions

### Problème 1 : "VITE_API_URL n'est pas configuré"
**Symptôme :** Dans la console, vous voyez `localhost:5000`

**Solution :**
1. Configurez le secret `VITE_API_URL` dans GitHub (voir étape 1)
2. Redéployez l'application (voir étape 2)

### Problème 2 : "Erreur CORS"
**Symptôme :** Dans la console, vous voyez `CORS policy` ou `Access-Control-Allow-Origin`

**Solution :**
1. Configurez `ALLOWED_ORIGINS` sur Railway (voir étape 3)
2. Attendez 1-2 minutes que Railway redéploie
3. Rechargez votre site GitHub Pages

### Problème 3 : "404 Not Found"
**Symptôme :** Les requêtes retournent 404

**Solution :**
1. Vérifiez que l'URL Railway est correcte
2. Testez le backend directement (voir étape 4)
3. Vérifiez que Railway est bien déployé et fonctionne

### Problème 4 : "Les données sont vides"
**Symptôme :** Le backend répond mais avec 0 albums

**Solution :**
1. Vérifiez que vous avez bien synchronisé les données vers Railway :
   ```powershell
   .\import-data.ps1
   ```
2. Vérifiez que Railway a bien reçu les données (voir les logs Railway)

## 📝 Commandes utiles

### Vérifier les logs Railway
1. Allez sur Railway → Votre service → **Deployments**
2. Cliquez sur le dernier déploiement
3. Vérifiez les logs pour voir si les données sont bien chargées

### Tester l'API directement
```bash
# Tester les albums
curl https://muzak-server-production.up.railway.app/api/music/albums

# Tester les artistes
curl https://muzak-server-production.up.railway.app/api/music/artists

# Tester les genres
curl https://muzak-server-production.up.railway.app/api/music/genres
```

## ✅ Après avoir corrigé

1. **Videz le cache du navigateur** : Ctrl+Shift+R (ou Cmd+Shift+R sur Mac)
2. **Rechargez la page** GitHub Pages
3. **Vérifiez la console** : Vous devriez voir `✅ Réponse reçue avec succès: 64 albums`
4. **Vérifiez que les albums s'affichent** sur la page

