# 🔧 Fix : Erreur 404 Google Drive

## 🔴 Problème

Erreur 404 quand vous ajoutez un album depuis Google Drive.

## 🎯 Cause

Le frontend utilise probablement `http://localhost:5000` au lieu de votre backend Koyeb.

---

## ✅ Solution en 3 Étapes

### Étape 1 : Vérifier le Secret GitHub

1. **Allez sur** : https://github.com/ezakariaa/MegaMix/settings/secrets/actions

2. **Vérifiez** que `VITE_API_URL` existe

3. **Si il n'existe pas**, créez-le :
   - Cliquez sur **"New repository secret"**
   - **Name** : `VITE_API_URL`
   - **Secret** : `https://effective-donni-opticode-1865a644.koyeb.app`
   - ⚠️ **IMPORTANT** : Sans `/api` à la fin !
   - Cliquez sur **"Add secret"**

### Étape 2 : Redéployer le Frontend

Même si le secret existe déjà, redéployez pour être sûr :

1. **Allez sur** : https://github.com/ezakariaa/MegaMix/actions

2. **Cliquez sur "Deploy to GitHub Pages"** (liste de gauche)

3. **Cliquez sur "Run workflow"** (bouton en haut à droite)

4. **Branche** : `main`

5. **Run workflow**

6. **Attendez 2-3 minutes**

### Étape 3 : Vider le Cache du Navigateur

1. **Ouvrez votre site** : https://ezakariaa.github.io/MegaMix/

2. **Appuyez sur** : **Ctrl + Shift + R** (ou **Ctrl + F5**)

   Cela force le rechargement sans utiliser le cache.

3. **Testez** l'ajout depuis Google Drive

---

## 🔍 Vérification

Pour vérifier que ça fonctionne :

1. **Ouvrez la console** (F12 → Console)

2. **Dans la console**, tapez :
   ```javascript
   console.log(import.meta.env.VITE_API_URL)
   ```

3. **Vous devriez voir** :
   ```
   https://effective-donni-opticode-1865a644.koyeb.app
   ```

   **Si vous voyez** `undefined` → Le secret n'est pas configuré ou le frontend n'a pas été redéployé.

---

## 📝 Si ça ne Fonctionne Toujours Pas

**Envoyez-moi** :

1. **L'URL exacte** de la requête qui échoue (dans la console du navigateur, onglet "Network")
2. **Le message d'erreur complet**
3. **Si `VITE_API_URL` est visible** dans la console (voir ci-dessus)

Et je pourrai identifier le problème exact ! 🔍

