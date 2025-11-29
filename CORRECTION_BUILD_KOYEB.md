# 🔧 Correction Build Koyeb - Exit Code 51

## Problème

Le buildpack de Koyeb ne parvient pas à builder votre application TypeScript.

## Solution : Utiliser Dockerfile au lieu du Buildpack

### Option 1 : Utiliser le Dockerfile (Recommandé)

J'ai créé un `Dockerfile` dans le dossier `server/`. Sur Koyeb :

1. **Allez dans votre service** sur Koyeb
2. **Settings** → **Build** → **Builder type**
3. Changez de **"Buildpack"** à **"Dockerfile"**
4. **Dockerfile path** : `server/Dockerfile`
5. **Save** et **Redeploy**

### Option 2 : Vérifier la configuration Buildpack

Si vous voulez continuer avec Buildpack :

1. **Work Directory** : `server` ✅
2. **Build Command** : `npm install && npm run build`
3. **Run Command** : `npm start`

**Vérifiez aussi** :
- Que `server/package.json` existe
- Que TypeScript est dans `dependencies` (pas seulement `devDependencies`)

---

## Fichiers Créés

J'ai créé :
- ✅ `server/Dockerfile` - Configuration Docker
- ✅ `server/.dockerignore` - Fichiers à ignorer

---

## Prochaines Étapes

1. **Sur Koyeb**, changez le Builder type vers **Dockerfile**
2. **Redeployez**
3. Le build devrait fonctionner maintenant !

---

## Alternative : Firebase Hosting pour le Frontend

Une fois le backend déployé, vous pouvez utiliser **Firebase Hosting** pour le frontend :

1. **Backend** : Koyeb (avec Dockerfile)
2. **Frontend** : Firebase Hosting (gratuit, sans carte bancaire)

Firebase Hosting est excellent pour les sites React statiques !

