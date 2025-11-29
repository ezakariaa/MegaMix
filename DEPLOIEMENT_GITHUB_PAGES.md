# 🚀 Déploiement sur GitHub Pages

Vous pouvez déployer le **frontend** sur GitHub Pages gratuitement ! Cependant, le **backend** doit être déployé séparément car GitHub Pages ne supporte que les sites statiques.

## 📋 Architecture

- **Frontend (React)** → GitHub Pages (gratuit)
- **Backend (Node.js/Express)** → Render, Railway, ou Heroku (gratuit aussi)

---

## 🔧 Étape 1 : Déployer le Backend

### Option A : Render (Recommandé - Gratuit)

1. **Créer un compte** : https://render.com
2. **Nouveau Web Service** :
   - Connectez votre dépôt GitHub
   - **Root Directory** : `server`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Environment Variables** :
     ```
     NODE_ENV=production
     PORT=10000
     ALLOWED_ORIGINS=https://votre-username.github.io
     GOOGLE_API_KEY=votre_cle (si nécessaire)
     ```
3. **Notez l'URL** : `https://votre-app.onrender.com`

### Option B : Railway (Gratuit avec limite)

1. **Créer un compte** : https://railway.app
2. **Nouveau projet** → **Deploy from GitHub repo**
3. **Sélectionnez le dossier `server`**
4. **Variables d'environnement** :
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=https://votre-username.github.io
   ```
5. **Notez l'URL** : `https://votre-app.railway.app`

---

## 🌐 Étape 2 : Configurer GitHub Pages

### 1. Activer GitHub Pages dans votre dépôt

1. Allez dans **Settings** → **Pages**
2. **Source** : `GitHub Actions`
3. Le workflow `.github/workflows/deploy.yml` se chargera du déploiement

### 2. Configurer l'URL du backend

1. Allez dans **Settings** → **Secrets and variables** → **Actions**
2. Créez un secret nommé `VITE_API_URL`
3. Valeur : l'URL de votre backend (ex: `https://votre-app.onrender.com`)

### 3. Pousser le code

```bash
git add .
git commit -m "Configuration pour GitHub Pages"
git push origin main
```

Le workflow GitHub Actions va :
- Builder le frontend avec l'URL du backend
- Déployer automatiquement sur GitHub Pages

### 4. Votre site sera disponible à :

`https://votre-username.github.io/MegaMix`

(Remplacez `votre-username` et `MegaMix` par vos valeurs)

---

## ⚙️ Configuration Alternative (Sans GitHub Actions)

Si vous préférez déployer manuellement :

### 1. Builder le frontend localement

```bash
cd client
# Créez un fichier .env avec :
# VITE_API_URL=https://votre-backend.onrender.com
npm run build
```

### 2. Déployer le dossier `dist`

1. Allez dans **Settings** → **Pages**
2. **Source** : `Deploy from a branch`
3. **Branch** : `gh-pages` (ou `main`)
4. **Folder** : `/client/dist`

### 3. Créer la branche gh-pages

```bash
cd client
npm run build
cd dist
git init
git add .
git commit -m "Deploy to GitHub Pages"
git branch -M gh-pages
git remote add origin https://github.com/votre-username/MegaMix.git
git push -u origin gh-pages
```

---

## 🔄 Mise à jour

À chaque fois que vous modifiez le code :

1. **Backend** : Les changements se déploient automatiquement (si configuré)
2. **Frontend** : Poussez sur `main`, GitHub Actions déploiera automatiquement

---

## ⚠️ Points Importants

### CORS

Assurez-vous que `ALLOWED_ORIGINS` dans votre backend inclut l'URL GitHub Pages :
```
ALLOWED_ORIGINS=https://votre-username.github.io,https://votre-username.github.io/MegaMix
```

### Variables d'environnement

Les variables d'environnement dans Vite doivent commencer par `VITE_` pour être accessibles dans le code client.

### Base Path (si votre repo n'est pas à la racine)

Si votre site est à `https://username.github.io/MegaMix` (et non `https://username.github.io`), vous devez configurer le base path dans `vite.config.ts` :

```typescript
export default defineConfig({
  base: '/MegaMix/',
  // ... reste de la config
})
```

---

## 🆘 Dépannage

### Le frontend ne charge pas les données

- Vérifiez que `VITE_API_URL` est correctement configuré
- Vérifiez la console du navigateur pour les erreurs CORS
- Vérifiez que le backend est bien démarré et accessible

### Erreur 404 sur les routes

Si vous utilisez React Router, vous devez configurer GitHub Pages pour rediriger toutes les routes vers `index.html`. Ajoutez un fichier `404.html` dans `client/public/` :

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>MuZak</title>
    <script>
      // Rediriger vers index.html pour gérer le routing React
      sessionStorage.redirect = location.href;
      location.replace(
        location.pathname.split('/').slice(0, -1).join('/') + '/index.html'
      );
    </script>
  </head>
  <body></body>
</html>
```

---

## 📝 Résumé

✅ **Frontend** : GitHub Pages (automatique via GitHub Actions)  
✅ **Backend** : Render/Railway (gratuit)  
✅ **URL publique** : `https://votre-username.github.io/MegaMix`  
✅ **Gratuit** : Oui, tout est gratuit !

Votre ami pourra accéder à votre application via l'URL GitHub Pages ! 🎉


