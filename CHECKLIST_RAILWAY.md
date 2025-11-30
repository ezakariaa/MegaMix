# ✅ Checklist de Configuration Railway

Vérifiez que votre configuration Railway est correcte avant de déployer.

---

## 📋 Configuration du Service `muzak-server`

### 1. Settings → Source
- [ ] **Repository** : Votre dépôt GitHub `MegaMix`
- [ ] **Branch** : `main` (ou votre branche principale)
- [ ] **Root Directory** : `server` ⚠️ **IMPORTANT**

### 2. Settings → Build
- [ ] **Build Command** : `npm install && npm run build`
  - OU laissez Railway détecter automatiquement (il utilisera `railway.json`)
- [ ] **Start Command** : `npm start`
  - OU laissez Railway détecter automatiquement

### 3. Settings → Variables (Environnement)
Ajoutez ces variables :

- [ ] `NODE_ENV=production`
- [ ] `ALLOWED_ORIGINS=*`
- [ ] `PORT=5000` (optionnel, Railway le définit automatiquement)

**Optionnel** (si vous avez les clés API) :
- [ ] `GOOGLE_API_KEY=votre_cle`
- [ ] `LASTFM_API_KEY=votre_cle`
- [ ] `FANART_API_KEY=votre_cle`

### 4. Settings → Networking
- [ ] Cliquez sur **"Generate Domain"** pour obtenir une URL publique
- [ ] Notez l'URL : `https://votre-app.up.railway.app`

---

## ❌ À NE PAS FAIRE

- [ ] ❌ Ne créez **PAS** de service pour `muzak-client` (le frontend reste sur GitHub Pages)
- [ ] ❌ Ne définissez **PAS** `PORT` si Railway le gère automatiquement (sauf si nécessaire)

---

## ✅ Après le Déploiement

### 1. Tester le Backend
Ouvrez dans votre navigateur :
```
https://votre-app.up.railway.app/api/health
```

Vous devriez voir :
```json
{"status":"OK","message":"MuZak Server is running"}
```

### 2. Vérifier les Logs
- Allez dans l'onglet **"Deployments"**
- Cliquez sur le dernier déploiement
- Vérifiez qu'il n'y a pas d'erreurs

### 3. Mettre à Jour le Frontend
- Allez sur GitHub : **Settings** → **Secrets and variables** → **Actions**
- Mettez à jour `VITE_API_URL` avec votre nouvelle URL Railway

---

## 🆘 Problèmes Courants

### Le build échoue
**Solution** : Vérifiez que **Root Directory** = `server`

### Le backend ne démarre pas
**Solution** : Vérifiez les logs dans **Deployments** → **View Logs**

### Erreur "Cannot find module"
**Solution** : Vérifiez que `npm install` s'exécute bien dans le dossier `server`

### Port déjà utilisé
**Solution** : Railway définit automatiquement le PORT, ne le définissez pas manuellement sauf si nécessaire

---

## 📝 Résumé

✅ **Un seul service** : `muzak-server`  
✅ **Root Directory** : `server`  
✅ **Variables** : `NODE_ENV=production`, `ALLOWED_ORIGINS=*`  
✅ **URL générée** : Notez votre URL Railway  
✅ **Test** : `/api/health` doit répondre

---

**Une fois tout vérifié, cliquez sur "Deploy" ! 🚀**

