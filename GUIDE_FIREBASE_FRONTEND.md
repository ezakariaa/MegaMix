# 🔥 Guide : Firebase Hosting pour le Frontend

## Pourquoi Firebase Hosting ?

- ✅ **100% gratuit** (avec généreuses limites)
- ✅ **Pas de carte bancaire requise**
- ✅ **HTTPS automatique**
- ✅ **CDN mondial** (chargement rapide partout)
- ✅ **Déploiement simple depuis GitHub**

## Architecture Recommandée

- **Backend** : Koyeb/Render/Fly.io (avec Dockerfile)
- **Frontend** : Firebase Hosting

---

## 🚀 Déploiement du Frontend sur Firebase

### 1. Installer Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Se connecter

```bash
firebase login
```

### 3. Dans le dossier client

```bash
cd client
firebase init hosting
```

**Questions** :
- **Which Firebase project?** : Créez un nouveau projet ou sélectionnez-en un
- **What do you want to use as your public directory?** : `dist`
- **Configure as a single-page app?** : `Yes`
- **Set up automatic builds?** : `Yes`
- **GitHub repo** : Sélectionnez votre repo
- **Build script** : `npm run build`
- **Directory to deploy** : `dist`

### 4. Créer un fichier `.firebaserc` (si nécessaire)

```json
{
  "projects": {
    "default": "votre-projet-firebase-id"
  }
}
```

### 5. Configurer l'URL du backend

Créer `client/.env.production` :
```
VITE_API_URL=https://votre-backend-koyeb.koyeb.app
```

### 6. Builder et déployer

```bash
# Builder
npm run build

# Déployer
firebase deploy --only hosting
```

---

## ⚙️ Configuration Automatique avec GitHub Actions

Créer `.github/workflows/firebase-deploy.yml` :

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: client/package-lock.json
      
      - name: Install dependencies
        run: |
          cd client
          npm ci
      
      - name: Build
        run: |
          cd client
          npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: votre-projet-firebase-id
```

---

## 📝 Résumé

1. **Backend** : Koyeb (avec Dockerfile) → `https://votre-backend.koyeb.app`
2. **Frontend** : Firebase Hosting → `https://votre-projet.web.app`
3. **Configuration** : `VITE_API_URL` pointe vers le backend Koyeb

---

## ✅ Avantages Firebase Hosting

- ✅ Gratuit sans carte bancaire
- ✅ Déploiement automatique depuis GitHub
- ✅ CDN mondial
- ✅ HTTPS automatique
- ✅ Intégration facile avec Firebase Functions (si besoin plus tard)

