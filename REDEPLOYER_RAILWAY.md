# 🔄 Redéployer Railway avec le nouveau code

## 🎯 Problème

Le serveur Railway utilise encore l'ancienne version du code qui ne sépare pas les genres multiples. Sur GitHub Pages, vous voyez des genres comme "Rock, Pop" au lieu de "Rock" et "Pop" séparés.

## ✅ Solution : Redéployer Railway

Railway se déploie automatiquement depuis votre dépôt GitHub. Pour mettre à jour Railway avec le nouveau code :

### Option 1 : Push vers GitHub (Recommandé)

1. **Commitez vos modifications** :
   ```bash
   git add .
   git commit -m "Fix: Séparation des genres multiples"
   git push origin main
   ```

2. **Railway redéploiera automatiquement** :
   - Railway détecte automatiquement les changements sur la branche `main`
   - Le redéploiement prend généralement 2-5 minutes
   - Vous pouvez suivre le déploiement sur Railway → Deployments

### Option 2 : Redéploiement manuel sur Railway

1. **Allez sur Railway** : https://railway.app
2. **Sélectionnez votre projet** : `muzak-server-production`
3. **Cliquez sur votre service** (backend)
4. **Allez dans l'onglet "Deployments"**
5. **Cliquez sur "Redeploy"** sur le dernier déploiement
6. **Attendez 2-5 minutes** que le redéploiement se termine

### Option 3 : Forcer un nouveau déploiement

Si Railway ne détecte pas automatiquement les changements :

1. **Allez sur Railway** → Votre projet → Votre service
2. **Allez dans "Settings"**
3. **Cliquez sur "Redeploy"** ou **"Deploy Latest"**
4. **Attendez que le déploiement se termine**

## 🔍 Vérifier que le redéploiement a fonctionné

### 1. Vérifier les logs Railway

1. Allez sur Railway → Votre service → **Logs**
2. Cherchez les messages `[GENRES]` ou `[INIT]`
3. Vous devriez voir : `[INIT] ✅ Données chargées: X album(s)...`

### 2. Tester l'API directement

Ouvrez dans votre navigateur :
```
https://muzak-server-production.up.railway.app/api/music/genres
```

**Vous devriez voir** :
- Des genres séparés : `{"id": "rock", "name": "Rock", ...}`, `{"id": "pop", "name": "Pop", ...}`
- **PAS** de genres avec virgules : `{"name": "Rock, Pop"}` ❌

### 3. Vérifier sur GitHub Pages

1. Allez sur votre site GitHub Pages
2. Ouvrez la page **Genres**
3. Les genres devraient maintenant être séparés :
   - ✅ "Rock" (séparé)
   - ✅ "Pop" (séparé)
   - ❌ "Rock, Pop" (ne devrait plus apparaître)

## ⚠️ Important

Après le redéploiement, les genres seront automatiquement recalculés depuis les albums et pistes existants. Vous n'avez **PAS besoin** de réimporter les données.

Le code sépare automatiquement les genres multiples lors du calcul, donc même si les albums ont "Rock, Pop" dans leur champ `genre`, l'API retournera deux genres distincts : "Rock" et "Pop".

## 🆘 Si ça ne fonctionne toujours pas

1. **Vérifiez que le code est bien poussé sur GitHub** :
   - Allez sur votre dépôt GitHub
   - Vérifiez que `server/src/routes/music.ts` contient les fonctions `splitGenres()` et `generateGenreId()`

2. **Vérifiez les logs Railway** :
   - Cherchez des erreurs de compilation ou de démarrage
   - Vérifiez que le serveur démarre correctement

3. **Videz le cache du navigateur** :
   - Sur GitHub Pages, appuyez sur **Ctrl+Shift+R** (ou **Cmd+Shift+R** sur Mac)
   - Cela force le rechargement sans cache

4. **Vérifiez que Railway utilise bien le bon dépôt** :
   - Railway → Settings → Source
   - Vérifiez que c'est bien votre dépôt GitHub et la bonne branche (`main`)

## 📝 Résumé

1. ✅ Le code local est correct (sépare les genres)
2. ⚠️ Railway doit être redéployé avec le nouveau code
3. ✅ Après redéploiement, les genres seront automatiquement séparés
4. ✅ Pas besoin de réimporter les données

