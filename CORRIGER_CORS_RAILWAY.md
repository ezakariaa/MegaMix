# 🔧 Corriger l'erreur CORS sur Railway

## ❌ Problème

Vous voyez cette erreur dans la console du navigateur :

```
Access to XMLHttpRequest at 'https://muzak-server.up.railway.app/api/music/albums' 
from origin 'https://ezakariaa.github.io' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Cela signifie que Railway bloque les requêtes depuis GitHub Pages.**

## ✅ Solution (5 minutes)

### Étape 1 : Ouvrir Railway

1. Allez sur https://railway.app
2. Connectez-vous avec votre compte
3. Sélectionnez votre projet (ex: `muzak-server-production`)

### Étape 2 : Accéder aux variables d'environnement

1. Cliquez sur votre **service backend** (celui qui héberge votre API)
2. Cliquez sur l'onglet **"Variables"** (ou **"Environment"**)

### Étape 3 : Configurer ALLOWED_ORIGINS

**Option A - Autoriser toutes les origines** (recommandé pour commencer) :

1. Cherchez la variable `ALLOWED_ORIGINS`
2. Si elle n'existe pas, cliquez sur **"New Variable"**
3. **Nom** : `ALLOWED_ORIGINS`
4. **Valeur** : `*`
5. Cliquez sur **"Add"** ou **"Save"**

**Option B - Autoriser uniquement GitHub Pages** (plus sécurisé) :

1. Cherchez la variable `ALLOWED_ORIGINS`
2. Si elle n'existe pas, cliquez sur **"New Variable"**
3. **Nom** : `ALLOWED_ORIGINS`
4. **Valeur** : `https://ezakariaa.github.io,https://ezakariaa.github.io/MegaMix`
   ⚠️ **Remplacez `ezakariaa` par votre nom d'utilisateur GitHub !**
5. Cliquez sur **"Add"** ou **"Save"**

### Étape 4 : Redéploiement automatique

- Railway va **automatiquement redéployer** votre service après avoir sauvegardé la variable
- Attendez **1-2 minutes** que le redéploiement se termine
- Vous verrez un message "Deploying..." ou "Redeploying..." dans l'interface

### Étape 5 : Vérifier

1. **Rafraîchissez votre site GitHub Pages** (Ctrl+F5 pour vider le cache)
2. **Ouvrez la console** (F12)
3. Les erreurs CORS devraient avoir disparu
4. Vos albums devraient maintenant s'afficher ! 🎉

## 🔍 Vérification rapide

Testez votre backend directement dans le navigateur :

```
https://muzak-server.up.railway.app/api/music/albums
```

Vous devriez voir du JSON avec vos albums. Si vous voyez une erreur CORS même ici, c'est que le redéploiement n'est pas encore terminé.

## ⚠️ Notes importantes

- **Le redéploiement prend 1-2 minutes** : soyez patient !
- **Videz le cache du navigateur** : Ctrl+F5 ou Cmd+Shift+R
- **Vérifiez l'orthographe** : `ALLOWED_ORIGINS` (avec un S à la fin)
- **Pas d'espaces** dans la valeur de la variable
- **Option A (`*`)** est plus simple mais moins sécurisé (autorise toutes les origines)
- **Option B** est plus sécurisé (autorise uniquement votre GitHub Pages)

## 🆘 Si ça ne fonctionne toujours pas

📖 **Guide de vérification détaillé** : Voir `VERIFIER_CORS_RAILWAY.md` pour une checklist complète

### Vérifications rapides :

1. **Vérifiez que la variable est bien sauvegardée** :
   - Dans Railway, allez dans Variables
   - Vérifiez que `ALLOWED_ORIGINS` apparaît bien avec la valeur `*` ou votre URL GitHub Pages

2. **Vérifiez que le redéploiement est terminé** :
   - Dans Railway, regardez l'onglet "Deployments"
   - Le dernier déploiement doit être marqué comme "Success" (vert)

3. **Testez directement l'API** :
   - Ouvrez dans le navigateur : `https://muzak-server.up.railway.app/api/music/albums`
   - Vous devriez voir du JSON, pas une erreur CORS

4. **Videz le cache du navigateur** :
   - **Ctrl+Shift+Delete** (Windows) ou **Cmd+Shift+Delete** (Mac)
   - Ou **hard refresh** : **Ctrl+F5** (Windows) ou **Cmd+Shift+R** (Mac)

## ✅ Une fois corrigé

Après avoir configuré CORS, votre site GitHub Pages devrait :
- ✅ Charger les albums depuis Railway
- ✅ Afficher votre bibliothèque complète
- ✅ Fonctionner normalement sans erreurs CORS

**Vos 200 albums, 2790 pistes et 108 artistes devraient maintenant s'afficher ! 🎵**

