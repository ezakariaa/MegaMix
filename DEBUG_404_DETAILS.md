# 🔍 Debug 404 - Vérifier l'URL Exacte

Le service Koyeb fonctionne, mais vous obtenez toujours un 404. Il faut vérifier quelle URL exacte est utilisée.

---

## 🔍 Étape 1 : Voir l'URL Exacte de la Requête

### Dans le Navigateur :

1. **Ouvrez votre site** : https://ezakariaa.github.io/MegaMix/

2. **Appuyez sur F12** pour ouvrir les outils développeur

3. **Allez dans l'onglet "Network"** (Réseau)

4. **Essayez d'ajouter un album depuis Google Drive**

5. **Regardez la liste des requêtes** - cherchez celle qui échoue (en rouge)

6. **Cliquez dessus** pour voir les détails

7. **Dans l'onglet "Headers"** ou "General", regardez :
   - **Request URL** : Quelle est l'URL exacte ?

**Elle devrait être** :
```
https://effective-donni-opticode-1865a644.koyeb.app/api/music/add-from-google-drive
```

**Si vous voyez** :
```
http://localhost:5000/api/music/add-from-google-drive
```
→ Le frontend n'utilise pas la bonne URL (VITE_API_URL pas configuré)

---

## 🔍 Étape 2 : Vérifier VITE_API_URL dans la Console

1. **Ouvrez la console** (F12 → Console)

2. **Tapez** :
   ```javascript
   console.log(import.meta.env.VITE_API_URL)
   ```

3. **Vous devriez voir** :
   ```
   https://effective-donni-opticode-1865a644.koyeb.app
   ```

   **Si vous voyez** :
   - `undefined` → Le secret n'est pas configuré ou le frontend n'a pas été redéployé
   - `http://localhost:5000` → L'URL par défaut est utilisée (mauvais)

---

## 🔍 Étape 3 : Vérifier le Secret GitHub

1. **Allez sur** : https://github.com/ezakariaa/MegaMix/settings/secrets/actions

2. **Vérifiez** que `VITE_API_URL` existe

3. **Vérifiez** que sa valeur est exactement :
   ```
   https://effective-donni-opticode-1865a644.koyeb.app
   ```
   ⚠️ **SANS** `/api` à la fin
   ⚠️ **AVEC** `https://`

---

## 🔍 Étape 4 : Test Direct de l'Endpoint

Testons si l'endpoint existe vraiment sur Koyeb :

1. **Ouvrez** dans votre navigateur :
   ```
   https://effective-donni-opticode-1865a644.koyeb.app/api/health
   ```
   
   **Doit retourner** :
   ```json
   {"status":"OK","message":"MuZak Server is running"}
   ```

2. **Testez** l'endpoint Google Drive (doit retourner 400, pas 404) :

   Utilisez curl ou Postman, ou allez sur cette page :
   ```
   https://effective-donni-opticode-1865a644.koyeb.app/api/music/add-from-google-drive
   ```
   
   - **404** = La route n'existe pas sur Koyeb
   - **400** ou autre = La route existe (c'est normal, elle attend une requête POST)

---

## ✅ Solution : Si l'URL est localhost

Si vous voyez `localhost` dans les requêtes :

### 1. Vérifiez que le Secret Existe

GitHub → Settings → Secrets → Actions → `VITE_API_URL`

### 2. Redéployez le Frontend

1. **Allez sur** : https://github.com/ezakariaa/MegaMix/actions
2. **Cliquez sur "Deploy to GitHub Pages"**
3. **"Run workflow"** → Branche `main`
4. **Attendez 2-3 minutes**

### 3. Videz le Cache

1. **Ctrl + Shift + R** sur votre site
2. **Ou** ouvrez en navigation privée

---

## 📝 Informations à Me Donner

Pour diagnostiquer, j'ai besoin de :

1. **L'URL exacte** de la requête qui échoue (dans Network)
2. **La valeur de** `import.meta.env.VITE_API_URL` dans la console
3. **Le code d'erreur** (404, 500, etc.)
4. **Si** `https://effective-donni-opticode-1865a644.koyeb.app/api/health` fonctionne

Avec ces informations, je pourrai identifier le problème exact ! 🔍

