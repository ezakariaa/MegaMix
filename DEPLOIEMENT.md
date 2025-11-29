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
4. Configurez :

#### Configuration Build

- **Builder type** : `Dockerfile`
- **Dockerfile location** : `server/Dockerfile` (Override activé)
- **Work directory** : (vide - Override désactivé)

#### Variables d'environnement

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

### Étape 3 : Déployer

1. Cliquez sur **"Deploy"**
2. Attendez 3-5 minutes
3. Notez l'URL : `https://votre-app.koyeb.app`

### Étape 4 : Tester

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

### Étape 1 : Configurer GitHub Actions

Le fichier `.github/workflows/deploy.yml` est déjà configuré.

### Étape 2 : Configurer l'URL du Backend

1. Dans votre dépôt GitHub : **Settings** → **Secrets and variables** → **Actions**
2. Cliquez sur **"New repository secret"**
3. Nom : `VITE_API_URL`
4. Valeur : l'URL de votre backend Koyeb (ex: `https://votre-app.koyeb.app`)
5. Cliquez sur **"Add secret"**

### Étape 3 : Activer GitHub Pages

1. **Settings** → **Pages**
2. **Source** : `GitHub Actions`
3. GitHub Actions déploiera automatiquement

### Étape 4 : Pousser le code

```bash
git add .
git commit -m "Configuration déploiement"
git push origin main
```

Le workflow GitHub Actions va :
- Builder le frontend avec l'URL du backend
- Déployer automatiquement sur GitHub Pages

### Étape 5 : Votre site est en ligne !

Votre application sera accessible à :
```
https://votre-username.github.io/MegaMix
```

---

## 🆘 Dépannage

### Le build Koyeb échoue

**Vérifiez** :
1. Work directory est **vide** (Override désactivé)
2. Dockerfile location = `server/Dockerfile`
3. Variables d'environnement sont configurées

**Testez localement** :
```bash
cd server
docker build -t test-megamix .
```

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

## 📝 Fichiers Importants

- `server/Dockerfile` - Configuration Docker pour Koyeb
- `.github/workflows/deploy.yml` - Déploiement automatique GitHub Pages
- `server/.env` - Variables d'environnement (ne pas commiter)

---

## 🎉 Résultat Final

✅ **Backend** : `https://votre-app.koyeb.app`  
✅ **Frontend** : `https://votre-username.github.io/MegaMix`  
✅ **Partageable** : Partagez l'URL GitHub Pages avec vos amis !

