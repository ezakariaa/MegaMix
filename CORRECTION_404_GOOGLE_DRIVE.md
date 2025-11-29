# ✅ Correction : Erreur 404 Google Drive

## 🔴 Problème

Erreur 404 lors de l'ajout d'un album depuis Google Drive.

## 🎯 Cause Probable

L'URL API dans le frontend pointe vers `localhost` au lieu de votre backend Koyeb.

---

## ✅ Solution : Vérifier et Configurer VITE_API_URL

### Étape 1 : Vérifier la Console du Navigateur

1. **Ouvrez votre site** : https://ezakariaa.github.io/MegaMix/
2. **Appuyez sur F12** pour ouvrir les outils développeur
3. **Onglet "Console"**
4. **Essayez d'ajouter un album depuis Google Drive**
5. **Regardez l'erreur** - quelle URL est utilisée ?

Vous devriez voir une requête vers :
```
https://effective-donni-opticode-1865a644.koyeb.app/api/music/add-from-google-drive
```

**Si vous voyez** :
```
http://localhost:5000/api/music/add-from-google-drive
```

→ Le secret `VITE_API_URL` n'est pas configuré ou le frontend n'a pas été redéployé avec la bonne URL.

---

### Étape 2 : Vérifier le Secret GitHub

1. **Allez sur** : https://github.com/ezakariaa/MegaMix/settings/secrets/actions

2. **Vérifiez** que `VITE_API_URL` existe

3. **Si il n'existe pas**, créez-le :
   - **Name** : `VITE_API_URL`
   - **Secret** : `https://effective-donni-opticode-1865a644.koyeb.app`
   - ⚠️ **SANS** `/api` à la fin
   - ⚠️ **AVEC** `https://`

4. **Si il existe**, vérifiez sa valeur (cliquez dessus pour voir)

---

### Étape 3 : Redéployer le Frontend

**Si vous venez de créer/modifier le secret** :

1. **Poussez un commit** pour déclencher le redéploiement :
   ```powershell
   cd C:\Users\Amine\Desktop\MegaMix\MegaMix
   
   # Faire un petit changement pour déclencher le workflow
   git commit --allow-empty -m "Redéploiement pour appliquer VITE_API_URL"
   
   git push origin main
   ```

2. **Attendez 2-3 minutes** que GitHub Actions déploie

3. **Videz le cache de votre navigateur** :
   - **Ctrl + Shift + R** (Windows)
   - Ou **Ctrl + F5**

4. **Testez à nouveau** l'ajout depuis Google Drive

---

### Étape 4 : Vérifier l'Endpoint sur Koyeb

Testez directement l'endpoint pour voir s'il existe :

1. **Ouvrez** : https://effective-donni-opticode-1865a644.koyeb.app/api/health
   - ✅ **Doit retourner** : `{"status":"OK","message":"MuZak Server is running"}`

2. **Testez** (avec curl ou Postman) :
   ```
   POST https://effective-donni-opticode-1865a644.koyeb.app/api/music/add-from-google-drive
   Body: { "url": "test" }
   ```
   
   - **404** = La route n'existe pas → Il faut redéployer le backend
   - **400** = La route existe mais l'URL est invalide → C'est normal, l'endpoint fonctionne

---

## 🔧 Si l'Endpoint n'Existe Pas sur Koyeb

Si vous obtenez 404 même en testant directement l'endpoint :

1. **Vérifiez** que le code avec l'endpoint est sur GitHub
2. **Poussez le code** si nécessaire :
   ```powershell
   git add .
   git commit -m "Assurer que l'endpoint Google Drive est présent"
   git push origin main
   ```

3. **Sur Koyeb**, le service devrait redéployer automatiquement

4. **Attendez 2-3 minutes**

---

## 📝 Diagnostic Rapide

**Ouvrez la console du navigateur (F12) et dites-moi** :

1. **Quelle URL** est utilisée pour la requête Google Drive ?
2. **Quel est le code d'erreur** exact (404, 500, etc.) ?
3. **Le message d'erreur complet** ?

Avec ces informations, je pourrai identifier le problème exact ! 🔍

