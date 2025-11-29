# 🔍 Vérifier l'URL API Utilisée

Le service Koyeb fonctionne, mais vous obtenez toujours un 404. Vérifions quelle URL est utilisée.

---

## 🔍 Étape 1 : Voir l'URL Exacte de la Requête

1. **Ouvrez votre site** : https://ezakariaa.github.io/MegaMix/

2. **Appuyez sur F12** → **Onglet "Network"** (Réseau)

3. **Essayez d'ajouter un album depuis Google Drive**

4. **Cherchez la requête qui échoue** (en rouge, probablement vers `/add-from-google-drive`)

5. **Cliquez dessus** et regardez l'onglet "Headers"

6. **Regardez "Request URL"** - quelle URL exacte est utilisée ?

**Elle devrait être** :
```
https://effective-donni-opticode-1865a644.koyeb.app/api/music/add-from-google-drive
```

**Si vous voyez** :
```
http://localhost:5000/api/music/add-from-google-drive
```
→ **Problème** : Le frontend utilise localhost au lieu de Koyeb

---

## 🔍 Étape 2 : Vérifier VITE_API_URL dans la Console

1. **Ouvrez la console** (F12 → Console)

2. **Tapez** et appuyez sur Entrée :
   ```javascript
   console.log(import.meta.env.VITE_API_URL)
   ```

**Vous devriez voir** :
```
https://effective-donni-opticode-1865a644.koyeb.app
```

**Si vous voyez** :
- `undefined` → Le secret n'est pas configuré
- `http://localhost:5000` → Mauvais (c'est la valeur par défaut)

---

## ✅ Solution : Configurer VITE_API_URL

### Si le Secret n'Existe Pas :

1. **Allez sur** : https://github.com/ezakariaa/MegaMix/settings/secrets/actions

2. **Cliquez sur "New repository secret"**

3. **Remplissez** :
   - **Name** : `VITE_API_URL`
   - **Secret** : `https://effective-donni-opticode-1865a644.koyeb.app`
   - ⚠️ **SANS** `/api` à la fin !
   - ⚠️ **AVEC** `https://` au début

4. **Cliquez sur "Add secret"**

### Redéployer le Frontend :

1. **Allez sur** : https://github.com/ezakariaa/MegaMix/actions

2. **Cliquez sur "Deploy to GitHub Pages"**

3. **Cliquez sur "Run workflow"** (bouton en haut à droite)

4. **Branche** : `main`

5. **Run workflow**

6. **Attendez 2-3 minutes**

### Vider le Cache :

1. **Sur votre site**, appuyez sur **Ctrl + Shift + R** (ou Ctrl + F5)

2. **Testez** à nouveau l'ajout depuis Google Drive

---

## 📝 Dites-Moi

Après avoir vérifié dans la console et Network, dites-moi :

1. **Quelle URL** est utilisée dans la requête Network ? (localhost ou Koyeb ?)
2. **Quelle valeur** affiche `import.meta.env.VITE_API_URL` dans la console ?

Avec ces informations, je pourrai identifier exactement le problème ! 🔍

