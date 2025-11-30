# 🔍 Guide de Diagnostic des Deploy Logs Railway

## 📋 Erreurs Courantes dans les Deploy Logs

### Erreur 1 : "Cannot find module"

**Message typique :**
```
Error: Cannot find module 'express'
```

**Solution :**
- Vérifiez que `npm install` s'exécute bien dans le dossier `server`
- Vérifiez que **Root Directory** = `server` dans Railway Settings
- Vérifiez que toutes les dépendances sont dans `server/package.json`

---

### Erreur 2 : "Cannot find module './routes/music'"

**Message typique :**
```
Error: Cannot find module './routes/music'
```

**Solution :**
- Vérifiez que le build a créé `dist/routes/music.js`
- Vérifiez que tous les fichiers TypeScript sont compilés
- Regardez les Build Logs pour voir s'il y a eu des erreurs de compilation

---

### Erreur 3 : "ENOENT: no such file or directory"

**Message typique :**
```
Error: ENOENT: no such file or directory, mkdir '/app/uploads/temp'
```

**Solution :**
- Le problème vient de `ensureUploadDirectory()` qui utilise `process.cwd()`
- Sur Railway, `process.cwd()` peut pointer vers `/app` au lieu de `/app/server`
- **Solution** : Utiliser des chemins relatifs au fichier au lieu de `process.cwd()`

---

### Erreur 4 : Le serveur démarre mais crash immédiatement

**Message typique :**
```
🚀 Serveur MuZak démarré sur le port 5000
📍 URL: http://0.0.0.0:5000
[Puis crash]
```

**Causes possibles :**
- Erreur dans une route qui s'exécute au démarrage
- Problème avec les imports de modules
- Erreur dans `ensureUploadDirectory()` ou autres fonctions d'initialisation

**Solution :**
- Ajoutez un try-catch autour du démarrage du serveur
- Vérifiez les logs complets pour voir l'erreur exacte

---

### Erreur 5 : "Port already in use"

**Message typique :**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution :**
- Railway définit automatiquement le PORT
- Ne définissez pas `PORT` dans les variables d'environnement (ou utilisez la valeur que Railway fournit)
- Vérifiez que le code utilise bien `process.env.PORT`

---

## 🔍 Comment Lire les Deploy Logs

### 1. Accéder aux Logs

1. Dans Railway, allez sur votre service `muzak-server`
2. Cliquez sur l'onglet **"Deployments"**
3. Cliquez sur le dernier déploiement (celui qui a échoué)
4. Cliquez sur l'onglet **"Deploy Logs"** (pas Build Logs)

### 2. Chercher les Indices

**✅ Signes que le serveur démarre :**
```
🚀 Serveur MuZak démarré sur le port XXXX
📍 URL: http://0.0.0.0:XXXX
```

**❌ Signes d'erreur :**
- `Error:` → Erreur JavaScript/Node.js
- `Cannot find module` → Module manquant
- `ENOENT` → Fichier ou dossier introuvable
- `EADDRINUSE` → Port déjà utilisé
- `SyntaxError` → Erreur de syntaxe dans le code compilé

### 3. Analyser l'Erreur

1. **Copiez l'erreur complète** (les dernières lignes des logs)
2. **Identifiez le type d'erreur** (voir ci-dessus)
3. **Cherchez la ligne de code** qui cause l'erreur
4. **Corrigez le problème**

---

## 🛠️ Solutions Rapides

### Solution 1 : Vérifier que dist/index.js existe

Dans les Build Logs, cherchez :
```
✓ Build completed successfully
```

Si vous ne voyez pas ça, le build a échoué.

### Solution 2 : Vérifier les chemins

Si vous voyez des erreurs `ENOENT`, le problème vient probablement de `process.cwd()`.

**Test rapide :** Ajoutez dans `server/src/index.ts` :
```typescript
console.log('Current working directory:', process.cwd())
console.log('__dirname:', __dirname)
```

### Solution 3 : Vérifier les imports

Si vous voyez `Cannot find module`, vérifiez que :
- Tous les fichiers sont compilés dans `dist/`
- Les chemins d'import sont corrects (relatifs, pas absolus)
- Les extensions `.js` sont utilisées dans les imports (si nécessaire)

---

## 📝 Checklist de Diagnostic

Quand vous avez une erreur dans les Deploy Logs :

- [ ] **Build réussi ?** → Vérifiez les Build Logs
- [ ] **dist/index.js existe ?** → Vérifiez dans les Build Logs
- [ ] **Modules installés ?** → Vérifiez que `npm install` a réussi
- [ ] **Root Directory correct ?** → Doit être `server`
- [ ] **Variables d'environnement ?** → Vérifiez dans Settings → Variables
- [ ] **Port configuré ?** → Railway le définit automatiquement
- [ ] **Chemins corrects ?** → Vérifiez `process.cwd()` vs chemins relatifs

---

## 🆘 Si Rien ne Fonctionne

1. **Testez localement** :
   ```bash
   cd server
   npm install
   npm run build
   npm start
   ```
   Si ça fonctionne localement, le problème vient de la configuration Railway.

2. **Vérifiez la configuration Railway** :
   - Root Directory = `server`
   - Build Command = `npm install && npm run build`
   - Start Command = `npm start`

3. **Regardez les logs complets** :
   - Copiez TOUS les Deploy Logs
   - Cherchez la première erreur (pas la dernière)
   - L'erreur réelle est souvent au début des logs

---

## 💡 Conseils

- **Toujours vérifier les Build Logs d'abord** : Si le build échoue, le déploiement ne peut pas réussir
- **Les erreurs sont souvent au début** : Scrollez vers le haut des logs
- **Copiez l'erreur complète** : Pas juste la dernière ligne
- **Testez localement** : Si ça fonctionne en local, c'est un problème de configuration Railway

---

**Besoin d'aide ?** Partagez les Deploy Logs complets et je pourrai vous aider à identifier le problème exact !

