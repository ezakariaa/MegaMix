# 🚀 Guide de Déploiement - MegaMix

Guide complet pour déployer MegaMix en production.

---

## 📋 Architecture

- **Frontend** : GitHub Pages (gratuit)
- **Backend** : Koyeb (gratuit, sans carte bancaire)

---

## 🎯 Partie 1 : Déployer le Backend sur Koyeb

### Étape 1 : Créer un compte Koyeb

1. Allez sur : https://www.koyeb.com
2. Créez un compte (gratuit, pas de carte bancaire)
3. Connectez votre compte GitHub

### Étape 2 : Créer un nouveau service

1. Cliquez sur **"Create Service"**
2. Sélectionnez **"GitHub"**
3. Choisissez votre dépôt **MegaMix**

### Étape 3 : Configuration Build

#### Option A : Buildpack (Recommandé si Dockerfile ne fonctionne pas)

1. **Builder type** : `Buildpack`
2. **Work directory** : `server` (Override activé)
3. **Build Command** : `npm install && npm run build`
4. **Run Command** : `npm start`

#### Option B : Dockerfile

1. **Builder type** : `Dockerfile`
2. **Dockerfile location** : `server/Dockerfile` (Override activé)
3. **Work directory** : (vide - Override désactivé)

### Étape 4 : Variables d'environnement

Allez dans **"Environment"** et ajoutez :

```
NODE_ENV = production
ALLOWED_ORIGINS = *
```

**Optionnel** (si vous avez les clés API) :
```
GOOGLE_API_KEY = votre_cle_ici
LASTFM_API_KEY = votre_cle_ici
FANART_API_KEY = votre_cle_ici
```

⚠️ **Important** : Ne définissez **PAS** `PORT` - Koyeb le gère automatiquement !

### Étape 5 : Déployer

1. Cliquez sur **"Deploy"**
2. Attendez 3-5 minutes
3. Notez l'URL : `https://votre-app.koyeb.app`

### Étape 6 : Tester

Ouvrez dans votre navigateur :
```
https://votre-app.koyeb.app/api/health
```

Vous devriez voir :
```json
{"status":"OK","message":"MuZak Server is running"}
```

✅ **Si vous voyez ça, votre backend fonctionne !**

---

## 🎨 Partie 2 : Déployer le Frontend sur GitHub Pages

### Étape 1 : Configurer l'URL du Backend

1. Dans votre dépôt GitHub : **Settings** → **Secrets and variables** → **Actions**
2. Cliquez sur **"New repository secret"**
3. Nom : `VITE_API_URL`
4. Valeur : l'URL de votre backend Koyeb (ex: `https://votre-app.koyeb.app`)
5. Cliquez sur **"Add secret"**

### Étape 2 : Activer GitHub Pages

1. **Settings** → **Pages**
2. **Source** : `GitHub Actions`
3. Le workflow `.github/workflows/deploy.yml` déploiera automatiquement

### Étape 3 : Pousser le code

```bash
git add .
git commit -m "Configuration déploiement"
git push origin main
```

Le workflow GitHub Actions va :
- Builder le frontend avec l'URL du backend
- Déployer automatiquement sur GitHub Pages

### Étape 4 : Votre site est en ligne !

Votre application sera accessible à :
```
https://votre-username.github.io/MegaMix
```

---

## 🆘 Dépannage

### Le build Koyeb échoue

#### Si vous utilisez Dockerfile :
1. **Vérifiez** : Work directory est **vide** (Override désactivé)
2. **Vérifiez** : Dockerfile location = `server/Dockerfile`
3. **Essayez Buildpack** : Voir `SOLUTION_KOYEB_BUILDPACK.md`

#### Si vous utilisez Buildpack :
1. **Vérifiez** : Work directory = `server`
2. **Vérifiez** : Build Command = `npm install && npm run build`
3. **Vérifiez** : Run Command = `npm start`

### Test Local

Testez le build localement :

```bash
cd server
npm install
npm run build
npm start
```

Si ça fonctionne localement, le problème vient de Koyeb.

### Le frontend ne charge pas les données

**Vérifiez** :
1. Le secret `VITE_API_URL` est configuré dans GitHub
2. L'URL pointe vers votre backend Koyeb
3. `ALLOWED_ORIGINS=*` est défini dans Koyeb

### Erreur CORS

**Vérifiez** :
1. `ALLOWED_ORIGINS=*` dans les variables d'environnement Koyeb
2. Ou spécifiez votre URL GitHub Pages : `ALLOWED_ORIGINS=https://votre-username.github.io`

---

## 📝 Résultat Final

✅ **Backend** : `https://votre-app.koyeb.app`  
✅ **Frontend** : `https://votre-username.github.io/MegaMix`  
✅ **Partageable** : Partagez l'URL GitHub Pages avec vos amis !
