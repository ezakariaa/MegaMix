# 🔧 Solution : Désactiver le Dockerfile sur Railway

## ⚠️ Problème

Railway détecte automatiquement le `Dockerfile` dans `server/Dockerfile` et essaie de l'utiliser, mais ce Dockerfile est fait pour Koyeb et ne fonctionne pas avec Railway.

**Erreur typique :**
```
ERROR: failed to build: failed to solve: failed to compute cache key: 
failed to calculate checksum of ref: "/server/src": not found
```

## ✅ Solution : Désactiver le Dockerfile

### Option 1 : Renommer le Dockerfile (Recommandé)

Renommez le Dockerfile pour que Railway ne le détecte pas :

1. Dans votre projet local :
   ```bash
   # Renommez le Dockerfile
   mv server/Dockerfile server/Dockerfile.koyeb
   ```

2. Commitez et poussez :
   ```bash
   git add server/Dockerfile.koyeb
   git rm server/Dockerfile
   git commit -m "Rename Dockerfile to Dockerfile.koyeb for Railway compatibility"
   git push origin master
   ```

3. Railway redéploiera automatiquement et utilisera NIXPACKS (détection automatique)

---

### Option 2 : Configurer Railway pour utiliser NIXPACKS

Dans Railway Settings → Build :

1. Allez dans **Settings** → **Build**
2. Dans **"Builder"**, sélectionnez **"Railpack Default"** (au lieu de Dockerfile)
3. Configurez :
   - **Root Directory** : `server`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
4. Sauvegardez

---

### Option 3 : Créer un .dockerignore à la racine

Créez un fichier `.dockerignore` à la racine du projet pour empêcher Railway d'utiliser le Dockerfile :

```gitignore
# Ignorer le Dockerfile pour Railway
server/Dockerfile
```

Puis commitez :
```bash
git add .dockerignore
git commit -m "Ignore Dockerfile for Railway"
git push origin master
```

---

## ✅ Après la Correction

Une fois le Dockerfile désactivé, Railway utilisera **NIXPACKS** (détection automatique) qui :

- ✅ Détecte automatiquement Node.js
- ✅ Utilise le `package.json` dans `server/`
- ✅ Exécute `npm install && npm run build` automatiquement
- ✅ Utilise `npm start` pour démarrer

---

## 📋 Vérification

Après le redéploiement, vérifiez dans les **Build Logs** :

**✅ Vous devriez voir :**
```
Using Detected NIXPACKS
Detected Node.js
```

**❌ Vous ne devriez PAS voir :**
```
Using Detected Dockerfile
```

---

## 🎯 Recommandation

**Option 1 (Renommer)** est la plus simple et la plus propre. Le Dockerfile reste disponible pour Koyeb si vous en avez besoin plus tard.

---

**Une fois corrigé, Railway devrait déployer correctement ! 🚂**

