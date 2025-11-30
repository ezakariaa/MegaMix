# 🆘 Dépannage Railway - Application Failed to Respond

## 🔍 Diagnostic du Problème

Si vous voyez "Application failed to respond", suivez ces étapes :

---

## ✅ Étape 1 : Vérifier les Logs de Déploiement

1. Dans Railway, allez sur votre service `muzak-server`
2. Cliquez sur l'onglet **"Deployments"**
3. Cliquez sur le dernier déploiement
4. Regardez les **"Deploy Logs"** (pas les Build Logs)

**Cherchez :**
- ✅ `🚀 Serveur MuZak démarré sur le port XXXX` → Le serveur démarre correctement
- ❌ `Error: Cannot find module` → Problème de dépendances
- ❌ `EADDRINUSE` → Port déjà utilisé
- ❌ `Missing script: "start"` → Root Directory pas configuré

---

## 🔧 Solutions selon l'Erreur

### Erreur 1 : "Missing script: start"

**Problème** : Root Directory pas configuré

**Solution** :
1. Settings → Source
2. Cliquez sur **"Add Root Directory"**
3. Entrez : `server`
4. Sauvegardez
5. Railway redéploiera automatiquement

---

### Erreur 2 : "Cannot find module 'express'" ou autres modules

**Problème** : Les dépendances ne sont pas installées dans le bon dossier

**Solution** :
1. Vérifiez que **Root Directory** = `server`
2. Vérifiez que **Build Command** = `npm install && npm run build`
3. Si le problème persiste, modifiez le Build Command :
   ```
   cd server && npm install && npm run build
   ```

---

### Erreur 3 : "EADDRINUSE: address already in use"

**Problème** : Le port est déjà utilisé ou mal configuré

**Solution** :
1. Dans les Variables d'environnement, **supprimez** `PORT` (Railway le gère automatiquement)
2. OU définissez `PORT` à une valeur différente (ex: `5000`)
3. Vérifiez dans `server/src/index.ts` que le port est bien :
   ```typescript
   const PORT = process.env.PORT || 5000
   ```

---

### Erreur 4 : Le serveur démarre mais ne répond pas

**Problème** : Le serveur écoute sur le mauvais port ou interface

**Solution** :
1. Vérifiez que le serveur écoute sur `0.0.0.0` et non `localhost` :
   ```typescript
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`🚀 Serveur MuZak démarré sur le port ${PORT}`)
   })
   ```

---

### Erreur 5 : "dist/index.js not found"

**Problème** : Le build n'a pas créé le dossier `dist`

**Solution** :
1. Vérifiez que **Build Command** = `npm install && npm run build`
2. Vérifiez que `server/tsconfig.json` existe et est correct
3. Regardez les **Build Logs** pour voir si le build a réussi

---

## 📋 Checklist Complète de Vérification

### Configuration Railway

- [ ] **Root Directory** = `server` (dans Settings → Source)
- [ ] **Build Command** = `npm install && npm run build` (dans Settings → Build)
- [ ] **Start Command** = `npm start` (dans Settings → Deploy)
- [ ] **Variables d'environnement** :
  - [ ] `NODE_ENV=production`
  - [ ] `ALLOWED_ORIGINS=*`
  - [ ] `PORT` (optionnel, Railway le gère automatiquement)

### Vérification du Code

- [ ] `server/package.json` contient le script `"start": "node dist/index.js"`
- [ ] `server/src/index.ts` écoute sur le port depuis `process.env.PORT`
- [ ] Le build crée bien `server/dist/index.js`

---

## 🔍 Vérification des Logs

### Build Logs (onglet "Build Logs")
Cherchez :
```
✓ Build completed successfully
✓ Compiled successfully
```

### Deploy Logs (onglet "Deploy Logs")
Cherchez :
```
🚀 Serveur MuZak démarré sur le port XXXX
📍 URL: http://localhost:XXXX
```

Si vous voyez ces messages, le serveur démarre correctement !

---

## 🚨 Problème Persistant

Si le problème persiste après avoir vérifié tout ça :

1. **Vérifiez les logs complets** :
   - Build Logs : Vérifiez qu'il n'y a pas d'erreurs de compilation
   - Deploy Logs : Vérifiez que le serveur démarre

2. **Testez localement** :
   ```bash
   cd server
   npm install
   npm run build
   npm start
   ```
   Si ça fonctionne localement, le problème vient de la configuration Railway.

3. **Recréez le service** :
   - Supprimez le service `muzak-server`
   - Créez un nouveau service
   - Configurez-le avec Root Directory = `server` dès le début

---

## 📞 Aide Supplémentaire

- **Documentation Railway** : https://docs.railway.app
- **Help Station Railway** : https://railway.app/help
- **Logs Railway** : Vérifiez toujours les logs avant de demander de l'aide

---

## ✅ Résumé Rapide

**Les 3 choses les plus importantes :**

1. ✅ **Root Directory** = `server` (CRUCIAL !)
2. ✅ **Build Command** = `npm install && npm run build`
3. ✅ **Start Command** = `npm start`

Si ces 3 choses sont correctes, le problème vient probablement du code ou des logs.

