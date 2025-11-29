# 🔍 Diagnostic : Erreur 404 Google Drive

## 🔴 Problème

Erreur 404 lors de l'ajout d'un album depuis Google Drive.

## 🎯 Causes Possibles

### 1. L'URL API n'est pas correctement configurée

Le client utilise `VITE_API_URL` pour construire l'URL de l'API.

**Vérification** :
- Le secret GitHub `VITE_API_URL` est-il défini ?
- Quelle est sa valeur exacte ?

**URL attendue** :
```
https://effective-donni-opticode-1865a644.koyeb.app/api/music/add-from-google-drive
```

### 2. La route n'est pas déployée sur Koyeb

L'endpoint `/add-from-google-drive` existe dans le code, mais peut-être que :
- Le code n'a pas été poussé sur GitHub
- Koyeb n'a pas redéployé après les changements

### 3. Problème de build

Le code TypeScript pourrait ne pas être compilé correctement sur Koyeb.

---

## ✅ Solutions

### Solution 1 : Vérifier l'URL API

1. **Ouvrez la console du navigateur** (F12)
2. **Allez dans l'onglet "Network"**
3. **Essayez d'ajouter un album depuis Google Drive**
4. **Regardez l'URL de la requête qui échoue**

Vous devriez voir une requête vers :
```
https://effective-donni-opticode-1865a644.koyeb.app/api/music/add-from-google-drive
```

**Si l'URL est différente** (par exemple `http://localhost:5000`), alors `VITE_API_URL` n'est pas configuré.

### Solution 2 : Vérifier le Secret GitHub

1. **Allez sur** : https://github.com/ezakariaa/MegaMix/settings/secrets/actions
2. **Vérifiez** que `VITE_API_URL` existe
3. **Vérifiez** que sa valeur est : `https://effective-donni-opticode-1865a644.koyeb.app`
   - ⚠️ **SANS** `/api` à la fin
   - ⚠️ **AVEC** `https://` au début

### Solution 3 : Redéployer le Frontend

Si le secret n'existait pas avant, il faut redéployer le frontend :

1. **Poussez un commit** (n'importe quel changement)
2. **Attendez** que GitHub Actions déploie
3. **Testez** à nouveau

### Solution 4 : Vérifier que l'Endpoint Existe sur Koyeb

Testez directement l'endpoint :

1. **Ouvrez** : https://effective-donni-opticode-1865a644.koyeb.app/api/health
2. **Si ça fonctionne**, l'API est accessible

3. **Testez** l'endpoint Google Drive (doit retourner une erreur 400, pas 404) :
   ```
   POST https://effective-donni-opticode-1865a644.koyeb.app/api/music/add-from-google-drive
   Body: { "url": "test" }
   ```

   - **404** = La route n'existe pas (problème de déploiement)
   - **400** = La route existe mais l'URL est invalide (normal)

---

## 🚀 Actions Immédiates

### 1. Vérifier la Console du Navigateur

Appuyez sur **F12** → **Console** → Essayez d'ajouter un album

**Que voyez-vous dans la console ?**
- L'URL complète de la requête qui échoue
- Le message d'erreur exact

### 2. Vérifier les Logs Koyeb

1. **Allez sur Koyeb** : https://console.koyeb.com
2. **Ouvrez votre service** "megamix"
3. **Onglet "Logs"**
4. **Essayez d'ajouter un album** depuis le site
5. **Regardez les logs** pour voir si la requête arrive

---

## 📝 Information Nécessaire

Pour diagnostiquer, j'ai besoin de :

1. **L'URL exacte** de la requête qui échoue (dans la console du navigateur)
2. **Le message d'erreur complet** (404, 500, etc.)
3. **Si `VITE_API_URL` est configuré** dans les secrets GitHub

Envoyez-moi ces informations et je pourrai identifier le problème exact !

