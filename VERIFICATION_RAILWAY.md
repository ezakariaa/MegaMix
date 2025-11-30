# ✅ Vérification du Déploiement Railway

## 🎉 Félicitations !

Votre déploiement est marqué comme **"Deployment successful"** sur Railway. Maintenant, vérifions que tout fonctionne correctement.

---

## ✅ Étape 1 : Vérifier les Deploy Logs

1. Dans Railway, cliquez sur **"View logs"** du dernier déploiement
2. Allez dans l'onglet **"Deploy Logs"**
3. Cherchez ces messages :

**✅ Signes que le serveur démarre correctement :**
```
🚀 Serveur MuZak démarré sur le port XXXX
📍 URL: http://0.0.0.0:XXXX
```

**❌ Si vous voyez des erreurs :**
- `Missing script: "start"` → Root Directory pas configuré
- `Cannot find module` → Dépendances manquantes
- `Error:` → Erreur dans le code

---

## ✅ Étape 2 : Tester l'Endpoint Health

Ouvrez dans votre navigateur :
```
https://muzak-server-production.up.railway.app/api/health
```

**✅ Réponse attendue :**
```json
{
  "status": "OK",
  "message": "MuZak Server is running"
}
```

**❌ Si vous voyez :**
- `Application failed to respond` → Le serveur ne démarre pas
- `502 Bad Gateway` → Le serveur crash au démarrage
- `404 Not Found` → Route non trouvée (problème de routing)

---

## ✅ Étape 3 : Vérifier les Variables d'Environnement

Dans Railway → Settings → Variables, vérifiez que vous avez :

- [ ] `NODE_ENV=production`
- [ ] `ALLOWED_ORIGINS=*`
- [ ] `PORT` (optionnel, Railway le définit automatiquement)

---

## ✅ Étape 4 : Tester les Routes API

### Test 1 : Health Check
```
GET https://muzak-server-production.up.railway.app/api/health
```

### Test 2 : Albums (si vous avez des données)
```
GET https://muzak-server-production.up.railway.app/api/music/albums
```

---

## 🔧 Si le Serveur ne Répond Pas

### Problème 1 : "Application failed to respond"

**Causes possibles :**
- Le serveur ne démarre pas
- Le serveur crash immédiatement après le démarrage
- Le port est mal configuré

**Solution :**
1. Vérifiez les **Deploy Logs** pour voir l'erreur exacte
2. Vérifiez que le serveur écoute sur `0.0.0.0` (déjà corrigé dans le code)
3. Vérifiez que `PORT` est bien défini (Railway le définit automatiquement)

### Problème 2 : Le serveur démarre mais crash

**Solution :**
1. Regardez les **Deploy Logs** complets
2. Cherchez l'erreur JavaScript/Node.js
3. Vérifiez que tous les modules sont installés

### Problème 3 : Erreur CORS

**Solution :**
1. Vérifiez que `ALLOWED_ORIGINS=*` est dans les variables
2. Ou spécifiez votre URL frontend : `ALLOWED_ORIGINS=https://votre-username.github.io`

---

## 📋 Checklist Finale

- [ ] Déploiement marqué comme "successful" ✅
- [ ] Deploy Logs montrent "🚀 Serveur MuZak démarré" ✅
- [ ] `/api/health` répond avec `{"status":"OK"}` ✅
- [ ] Variables d'environnement configurées ✅
- [ ] URL accessible publiquement ✅

---

## 🎯 Prochaines Étapes

Une fois que tout fonctionne :

1. **Mettre à jour le Frontend** :
   - Allez sur GitHub → Settings → Secrets and variables → Actions
   - Mettez à jour `VITE_API_URL` avec votre URL Railway :
     ```
     https://muzak-server-production.up.railway.app
     ```

2. **Restaurer les Données** (si vous avez une sauvegarde) :
   ```powershell
   .\restore-railway-data.ps1 -BackupPath "backups\koyeb-YYYY-MM-DD_HH-mm-ss"
   ```
   (N'oubliez pas de modifier l'URL dans le script)

3. **Redéployer le Frontend** :
   - Le frontend se redéploiera automatiquement via GitHub Actions
   - OU faites un commit vide pour déclencher le redéploiement

---

## 🆘 Besoin d'Aide ?

Si quelque chose ne fonctionne pas :
1. Partagez les **Deploy Logs** complets
2. Partagez la réponse de `/api/health`
3. Vérifiez la configuration dans Railway Settings

---

**Félicitations pour votre déploiement Railway ! 🚂🎉**

