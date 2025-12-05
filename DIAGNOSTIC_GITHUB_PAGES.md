# 🔍 Diagnostic - GitHub Pages n'affiche pas les albums

## ⚡ Diagnostic rapide

### Étape 1 : Ouvrir la console du navigateur

1. Sur votre page GitHub Pages, appuyez sur **F12**
2. Allez dans l'onglet **Console**
3. Cherchez les messages commençant par `[API]`

### Étape 2 : Vérifier la configuration

**Message attendu :**
```
[API] VITE_API_URL: https://muzak-server-production.up.railway.app
```

**Si vous voyez :**
```
[API] VITE_API_URL: non défini (utilise localhost:5000)
❌ [API] ERREUR CRITIQUE: VITE_API_URL n'est pas configuré
```

**→ SOLUTION :** Configurez le secret `VITE_API_URL` dans GitHub

### Étape 3 : Vérifier les erreurs réseau

Dans l'onglet **Network** (F12 → Network) :
1. Rechargez la page
2. Cherchez les requêtes vers `/api/music/albums`
3. Cliquez sur la requête et vérifiez :
   - **Status** : `200` = OK, `0` ou `CORS` = Problème
   - **Request URL** : Doit pointer vers Railway

## 🚨 Solutions selon le problème

### Problème 1 : VITE_API_URL non configuré

**Symptôme :** Console affiche `localhost:5000`

**Solution :**
1. GitHub → Votre dépôt → **Settings** → **Secrets and variables** → **Actions**
2. Cliquez sur **New repository secret**
3. Nom : `VITE_API_URL`
4. Valeur : `https://muzak-server-production.up.railway.app` (sans `/api`)
5. **Add secret**
6. **Actions** → **Deploy to GitHub Pages** → **Run workflow**

### Problème 2 : Erreur CORS

**Symptôme :** Console affiche `CORS policy` ou `Access-Control-Allow-Origin`

**Solution :**
1. Railway → Votre projet → **Variables**
2. Ajoutez ou modifiez `ALLOWED_ORIGINS` :
   ```
   ALLOWED_ORIGINS=*
   ```
   Ou spécifiquement :
   ```
   ALLOWED_ORIGINS=https://ezakariaa.github.io,https://ezakariaa.github.io/MegaMix
   ```
3. Attendez 1-2 minutes que Railway redéploie
4. Rechargez GitHub Pages

### Problème 3 : Backend retourne 0 albums

**Symptôme :** La requête réussit (Status 200) mais retourne `[]`

**Solution :**
1. Vérifiez que les données sont synchronisées sur Railway :
   ```powershell
   cd server
   node scripts/import-data.js
   ```
2. Vérifiez les logs Railway pour confirmer la réception des données

### Problème 4 : Timeout

**Symptôme :** Console affiche `timeout of 60000ms exceeded`

**Solution :**
1. Vérifiez que Railway est bien démarré (logs Railway)
2. Testez directement : https://muzak-server-production.up.railway.app/api/music/albums
3. Si ça fonctionne, c'est un problème de cache navigateur → Videz le cache (Ctrl+Shift+R)

## 📋 Checklist complète

- [ ] VITE_API_URL configuré dans GitHub Secrets
- [ ] Application redéployée après configuration du secret
- [ ] ALLOWED_ORIGINS configuré sur Railway
- [ ] Backend Railway accessible (test direct dans le navigateur)
- [ ] Données synchronisées sur Railway (64 albums)
- [ ] Cache navigateur vidé (Ctrl+Shift+R)
- [ ] Console vérifiée (F12)

## 🔗 Liens utiles

- **Railway Dashboard** : https://railway.app
- **GitHub Actions** : Votre dépôt → Actions
- **GitHub Secrets** : Votre dépôt → Settings → Secrets and variables → Actions

