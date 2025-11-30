# 🆘 Dépannage : Bibliothèque Vide sur GitHub Pages

## ⚠️ Problème

Votre ami voit la page GitHub Pages mais la bibliothèque est vide (pas d'albums).

---

## 🔍 Causes Possibles

### 1. ❌ Frontend pointe vers l'ancienne URL Koyeb (Le Plus Probable)

**Symptôme** : La page charge mais aucune donnée n'apparaît.

**Solution** : Mettre à jour `VITE_API_URL` dans GitHub Secrets.

### 2. ❌ Données non importées sur Railway

**Symptôme** : Le backend répond mais retourne 0 albums.

**Solution** : Importer les données avec `import-data.ps1`.

### 3. ❌ Problème CORS

**Symptôme** : Erreurs dans la console du navigateur (CORS blocked).

**Solution** : Vérifier `ALLOWED_ORIGINS=*` dans Railway.

### 4. ❌ Backend Railway non accessible

**Symptôme** : Erreurs de connexion dans la console.

**Solution** : Vérifier que Railway est actif.

---

## ✅ Solution Étape par Étape

### Étape 1 : Vérifier que le Backend Railway Fonctionne

1. Ouvrez dans votre navigateur :
   ```
   https://muzak-server-production.up.railway.app/api/health
   ```

2. Vous devriez voir :
   ```json
   {"status":"OK","message":"MuZak Server is running"}
   ```

3. Testez aussi :
   ```
   https://muzak-server-production.up.railway.app/api/music/albums
   ```

   **Si vous voyez `[]`** → Les données ne sont pas importées (voir Étape 3)

   **Si vous voyez une erreur** → Le backend a un problème

---

### Étape 2 : Mettre à Jour l'URL du Backend dans GitHub

**⚠️ CRUCIAL : Cette étape est nécessaire pour que le frontend se connecte à Railway !**

1. Allez sur votre dépôt GitHub
2. Cliquez sur **Settings** (en haut à droite)
3. Dans le menu de gauche, cliquez sur **Secrets and variables** → **Actions**
4. Cherchez le secret `VITE_API_URL`
5. Cliquez sur **Update** (ou créez-le s'il n'existe pas)
6. Mettez la valeur :
   ```
   https://muzak-server-production.up.railway.app
   ```
   ⚠️ **Important** : Pas de `/api` à la fin, juste l'URL de base
7. Cliquez sur **Update secret**

---

### Étape 3 : Redéployer le Frontend

Après avoir mis à jour le secret, redéployez le frontend :

**Option A : Commit vide (Recommandé)**
```bash
git commit --allow-empty -m "Update backend URL to Railway"
git push origin master
```

**Option B : Via GitHub Actions**
1. Allez dans **Actions** sur GitHub
2. Trouvez le workflow de déploiement
3. Cliquez sur **Run workflow**

Le frontend sera reconstruit avec la nouvelle URL Railway.

---

### Étape 4 : Importer les Données sur Railway

Si votre bibliothèque est vide sur Railway :

1. Vérifiez que vous avez des données locales dans `server/data/` :
   ```powershell
   ls server/data/
   ```

2. Si vous avez des fichiers `albums.json`, `tracks.json`, `artists.json`, importez-les :
   ```powershell
   .\import-data.ps1
   ```

3. Vérifiez que les données sont importées :
   ```
   https://muzak-server-production.up.railway.app/api/music/albums
   ```

---

### Étape 5 : Vérifier les Variables d'Environnement Railway

Dans Railway → Settings → Variables, vérifiez :

- [ ] `NODE_ENV=production`
- [ ] `ALLOWED_ORIGINS=*` ⚠️ **IMPORTANT pour CORS**

Si `ALLOWED_ORIGINS` n'est pas `*`, le frontend GitHub Pages ne pourra pas accéder au backend.

---

## 🔍 Vérification dans le Navigateur

### Ouvrir la Console du Navigateur

1. Ouvrez votre site GitHub Pages
2. Appuyez sur **F12** (ou Clic droit → Inspecter)
3. Allez dans l'onglet **Console**
4. Regardez les erreurs :

**✅ Si vous voyez :**
```
GET https://muzak-server-production.up.railway.app/api/music/albums 200
```
→ Le frontend se connecte correctement !

**❌ Si vous voyez :**
```
GET http://localhost:5000/api/music/albums net::ERR_CONNECTION_REFUSED
```
→ `VITE_API_URL` n'est pas configuré (voir Étape 2)

**❌ Si vous voyez :**
```
CORS policy: No 'Access-Control-Allow-Origin' header
```
→ `ALLOWED_ORIGINS=*` n'est pas configuré dans Railway (voir Étape 5)

**❌ Si vous voyez :**
```
GET https://effective-donni-opticode-1865a644.koyeb.app/api/music/albums 404
```
→ Le frontend pointe encore vers Koyeb (voir Étape 2)

---

## 📋 Checklist Complète

- [ ] Backend Railway répond à `/api/health` ✅
- [ ] `VITE_API_URL` mis à jour dans GitHub Secrets avec l'URL Railway ✅
- [ ] Frontend redéployé (via commit ou GitHub Actions) ✅
- [ ] `ALLOWED_ORIGINS=*` configuré dans Railway ✅
- [ ] Données importées sur Railway (si nécessaire) ✅
- [ ] Console du navigateur ne montre pas d'erreurs ✅

---

## 🆘 Si Rien ne Fonctionne

### Test 1 : Vérifier l'URL Utilisée par le Frontend

Dans la console du navigateur, tapez :
```javascript
console.log(import.meta.env.VITE_API_URL)
```

**Si vous voyez :**
- `undefined` → `VITE_API_URL` n'est pas configuré
- `http://localhost:5000` → `VITE_API_URL` n'est pas configuré
- `https://effective-donni-opticode-1865a644.koyeb.app` → Ancienne URL, mettre à jour
- `https://muzak-server-production.up.railway.app` → ✅ Correct !

### Test 2 : Tester l'API Directement

Dans la console du navigateur, tapez :
```javascript
fetch('https://muzak-server-production.up.railway.app/api/music/albums')
  .then(r => r.json())
  .then(console.log)
```

**Si vous voyez :**
- `[]` → Pas de données, importer avec `import-data.ps1`
- Un tableau avec des albums → ✅ Les données sont là !
- Une erreur CORS → `ALLOWED_ORIGINS=*` pas configuré

---

## 💡 Solution Rapide

**En résumé, les 3 choses à faire :**

1. ✅ **Mettre à jour `VITE_API_URL` dans GitHub Secrets** avec `https://muzak-server-production.up.railway.app`
2. ✅ **Redéployer le frontend** (commit vide)
3. ✅ **Vérifier `ALLOWED_ORIGINS=*` dans Railway**

Après ça, votre ami devrait voir la bibliothèque ! 🎵

---

## 📞 Besoin d'Aide ?

Si le problème persiste :
1. Partagez les erreurs de la console du navigateur
2. Partagez la réponse de `/api/music/albums` sur Railway
3. Vérifiez que `VITE_API_URL` est bien configuré dans GitHub Secrets

