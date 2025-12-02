# ✅ Vérifier que CORS est bien configuré sur Railway

## 🔍 Checklist rapide

### 1. Vérifier que la variable existe

1. Allez sur https://railway.app
2. Sélectionnez votre projet → votre service backend
3. Cliquez sur **"Variables"** (ou **"Environment"**)
4. **Cherchez** `ALLOWED_ORIGINS` dans la liste
5. ✅ Elle doit exister avec la valeur `*` ou `https://ezakariaa.github.io,https://ezakariaa.github.io/MegaMix`

### 2. Vérifier que le redéploiement est terminé

1. Dans Railway, allez dans l'onglet **"Deployments"** (ou **"Logs"**)
2. Regardez le **dernier déploiement** :
   - ✅ Il doit être marqué comme **"Success"** (vert) ou **"Active"**
   - ❌ S'il est encore en cours, attendez qu'il se termine (1-2 minutes)
   - ❌ S'il a échoué, vérifiez les logs d'erreur

### 3. Tester directement l'API

Ouvrez cette URL dans votre navigateur :

```
https://muzak-server.up.railway.app/api/music/albums
```

**Résultats attendus :**
- ✅ **Vous voyez du JSON** avec vos albums → CORS fonctionne !
- ❌ **Erreur CORS** → La variable n'est pas encore appliquée, attendez le redéploiement
- ❌ **404 Not Found** → Vérifiez que l'URL est correcte
- ❌ **500 Internal Server Error** → Vérifiez les logs Railway

### 4. Tester avec les en-têtes CORS

Ouvrez la console du navigateur (F12) et exécutez :

```javascript
fetch('https://muzak-server.up.railway.app/api/music/albums', {
  method: 'GET',
  headers: {
    'Origin': 'https://ezakariaa.github.io'
  }
})
.then(response => {
  console.log('✅ Succès !', response.status);
  console.log('En-têtes CORS:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
  });
  return response.json();
})
.then(data => console.log('Données:', data))
.catch(error => console.error('❌ Erreur:', error));
```

**Résultats attendus :**
- ✅ `Access-Control-Allow-Origin: *` ou `Access-Control-Allow-Origin: https://ezakariaa.github.io` → CORS fonctionne !
- ❌ Pas d'en-tête `Access-Control-Allow-Origin` → La variable n'est pas appliquée

### 5. Vérifier les logs Railway

1. Dans Railway, allez dans l'onglet **"Logs"**
2. Cherchez des messages de démarrage du serveur :
   - ✅ `🚀 Serveur MuZak démarré sur le port...`
   - ✅ `[INIT] Données chargées: X album(s)...`
3. Cherchez des erreurs :
   - ❌ Si vous voyez des erreurs, partagez-les

## 🚨 Problèmes courants

### Problème 1 : La variable existe mais ça ne fonctionne toujours pas

**Solution :**
1. **Supprimez** la variable `ALLOWED_ORIGINS`
2. **Attendez** que Railway redéploie (1 minute)
3. **Recréez** la variable avec la valeur `*`
4. **Attendez** à nouveau le redéploiement (1-2 minutes)

### Problème 2 : Le redéploiement ne démarre pas automatiquement

**Solution :**
1. Dans Railway, allez dans l'onglet **"Settings"**
2. Cherchez **"Redeploy"** ou **"Deploy"**
3. Cliquez pour forcer un redéploiement

### Problème 3 : L'URL Railway a changé

**Solution :**
1. Vérifiez l'URL exacte de votre service Railway
2. Elle doit être quelque chose comme : `https://muzak-server-production.up.railway.app`
3. Mettez à jour le secret `VITE_API_URL` dans GitHub si nécessaire

### Problème 4 : Cache du navigateur

**Solution :**
1. Videz le cache du navigateur : **Ctrl+Shift+Delete** (Windows) ou **Cmd+Shift+Delete** (Mac)
2. Ou faites un **hard refresh** : **Ctrl+F5** (Windows) ou **Cmd+Shift+R** (Mac)

## ✅ Une fois que tout fonctionne

Après avoir configuré CORS correctement :

1. ✅ Les requêtes depuis GitHub Pages fonctionnent
2. ✅ Les albums s'affichent (200 albums, 2790 pistes, 108 artistes)
3. ✅ Plus d'erreurs CORS dans la console
4. ✅ Le message d'erreur rouge disparaît

## 📞 Si rien ne fonctionne

Si après avoir suivi toutes ces étapes, ça ne fonctionne toujours pas :

1. **Vérifiez l'URL exacte** de votre service Railway
2. **Vérifiez que le service est actif** (pas en pause)
3. **Vérifiez les logs Railway** pour des erreurs de démarrage
4. **Partagez** :
   - L'URL exacte de votre Railway
   - Un screenshot de la page Variables dans Railway
   - Les logs Railway (dernières 50 lignes)

