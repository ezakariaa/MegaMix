# 🔧 Corriger l'erreur "Not Found" sur Railway

## ❌ Problème

Quand vous accédez à `https://muzak-server.up.railway.app/api/music/albums`, vous voyez une page Railway "Not Found" avec le message "The train has not arrived at the station."

**Cela signifie que Railway ne route pas correctement les requêtes vers votre service.**

## 🔍 Diagnostic

### 1. Vérifier que le service est actif

1. Allez sur https://railway.app
2. Sélectionnez votre projet
3. Vérifiez que votre service backend est **actif** (pas en pause)
4. Regardez l'onglet **"Deployments"** :
   - Le dernier déploiement doit être **"Success"** (vert)
   - Il doit être récent (moins de 5 minutes)

### 2. Vérifier l'URL du domaine

1. Dans Railway, allez dans votre service backend
2. Allez dans l'onglet **"Settings"** ou **"Networking"**
3. Vérifiez le **domaine public** :
   - Il devrait être quelque chose comme : `muzak-server-production.up.railway.app`
   - ⚠️ **Notez l'URL exacte** - elle peut être différente de `muzak-server.up.railway.app`

### 3. Tester la route racine

Essayez d'accéder à la route racine :

```
https://muzak-server.up.railway.app/
```

**Résultats attendus :**
- ✅ Vous voyez du JSON avec les informations du serveur → Le service fonctionne !
- ❌ Vous voyez toujours "Not Found" → Le problème vient du routage Railway

### 4. Tester la route de santé

Essayez d'accéder à :

```
https://muzak-server.up.railway.app/api/health
```

**Résultats attendus :**
- ✅ Vous voyez `{"status":"OK",...}` → Le service fonctionne !
- ❌ Vous voyez "Not Found" → Le problème vient du routage Railway

## ✅ Solutions

### Solution 1 : Vérifier le domaine Railway

Le domaine peut être différent de ce que vous pensez :

1. Dans Railway, allez dans votre service
2. Allez dans **"Settings"** → **"Networking"** ou **"Domains"**
3. **Copiez l'URL exacte** du domaine public
4. **Mettez à jour** :
   - Le secret `VITE_API_URL` dans GitHub (si différent)
   - Testez avec la nouvelle URL

### Solution 2 : Vérifier que le service écoute sur le bon port

Railway définit automatiquement la variable `PORT`. Vérifiez dans les logs :

1. Dans Railway, allez dans l'onglet **"Logs"**
2. Cherchez la ligne : `🚀 Serveur MuZak démarré sur le port XXXX`
3. Le port devrait être quelque chose comme `5000` ou un autre port (Railway peut utiliser n'importe quel port)

**Si le port est différent de 5000**, c'est normal - Railway gère ça automatiquement.

### Solution 3 : Redéployer le service

Parfois, un redéploiement résout les problèmes de routage :

1. Dans Railway, allez dans votre service
2. Allez dans **"Settings"**
3. Cliquez sur **"Redeploy"** ou **"Deploy"**
4. Attendez 2-3 minutes que le redéploiement se termine

### Solution 4 : Vérifier la configuration du service

1. Dans Railway, allez dans votre service
2. Vérifiez l'onglet **"Settings"** :
   - **Root Directory** : Doit être `server` (si votre code est dans `server/`)
   - **Build Command** : Doit être `npm run build` (ou laisser vide pour auto-détection)
   - **Start Command** : Doit être `npm start` (ou laisser vide pour auto-détection)

### Solution 5 : Vérifier que le build a réussi

1. Dans Railway, allez dans l'onglet **"Deployments"**
2. Cliquez sur le dernier déploiement
3. Vérifiez les logs de build :
   - ✅ Vous devriez voir `npm run build` réussir
   - ✅ Vous devriez voir `dist/index.js` créé
   - ❌ Si vous voyez des erreurs, corrigez-les

## 🚨 Problèmes courants

### Problème 1 : Le domaine est différent

**Symptôme** : `muzak-server.up.railway.app` ne fonctionne pas, mais un autre domaine fonctionne.

**Solution** :
1. Trouvez le vrai domaine dans Railway Settings
2. Mettez à jour `VITE_API_URL` dans GitHub Secrets
3. Redéployez GitHub Pages

### Problème 2 : Le service est en pause

**Symptôme** : Railway affiche "Not Found" et le service est grisé.

**Solution** :
1. Dans Railway, cliquez sur le service
2. Cliquez sur **"Settings"**
3. Désactivez le mode pause si activé

### Problème 3 : Le build a échoué

**Symptôme** : Les logs montrent des erreurs de build.

**Solution** :
1. Vérifiez les logs de build dans Railway
2. Corrigez les erreurs (dépendances manquantes, erreurs TypeScript, etc.)
3. Redéployez

### Problème 4 : Le service n'écoute pas sur 0.0.0.0

**Symptôme** : Le service démarre mais Railway ne peut pas y accéder.

**Solution** : Le code écoute déjà sur `0.0.0.0`, donc ce n'est normalement pas le problème. Mais vérifiez les logs pour confirmer.

## ✅ Vérification finale

Une fois que tout fonctionne :

1. ✅ `https://votre-domaine.up.railway.app/` retourne du JSON
2. ✅ `https://votre-domaine.up.railway.app/api/health` retourne `{"status":"OK"}`
3. ✅ `https://votre-domaine.up.railway.app/api/music/albums` retourne vos albums en JSON
4. ✅ GitHub Pages peut accéder à l'API (plus d'erreurs CORS ou 404)

## 📞 Si rien ne fonctionne

Partagez :
1. L'URL exacte de votre domaine Railway (depuis Settings)
2. Un screenshot de la page "Deployments" dans Railway
3. Les 50 dernières lignes des logs Railway
4. Le résultat de `https://votre-domaine.up.railway.app/` dans le navigateur

