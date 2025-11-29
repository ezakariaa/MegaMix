# 🚂 Guide Complet : Déploiement sur Railway

## 📋 Prérequis

- ✅ Un compte GitHub avec votre dépôt MegaMix
- ✅ Aucune carte bancaire requise
- ✅ 5-10 minutes

---

## 🚀 Étape 1 : Créer un compte Railway

1. **Allez sur** : https://railway.app
2. **Cliquez sur** : **"Start a New Project"** ou **"Login"**
3. **Choisissez** : **"Login with GitHub"** (recommandé)
   - Cela connectera Railway à votre compte GitHub
   - **Aucune carte bancaire requise** ✅

---

## 🚀 Étape 2 : Créer un nouveau projet

1. Une fois connecté, cliquez sur **"New Project"** (en haut à droite)
2. Sélectionnez **"Deploy from GitHub repo"**
3. **Autorisez Railway** à accéder à vos dépôts GitHub (si demandé)
4. **Cherchez et sélectionnez** votre dépôt **MegaMix**

Railway va automatiquement :
- Détecter que c'est un projet Node.js
- Commencer à analyser votre code

---

## ⚙️ Étape 3 : Configurer le service

### 3.1. Spécifier le Root Directory

Railway doit savoir que le backend est dans le dossier `server` :

1. Cliquez sur votre **service** (il devrait s'appeler "MegaMix" ou similaire)
2. Allez dans l'onglet **"Settings"**
3. Descendez jusqu'à **"Root Directory"**
4. Cliquez sur **"Edit"**
5. Entrez : `server`
6. Cliquez sur **"Save"**

### 3.2. Vérifier les commandes de build

Railway devrait détecter automatiquement :
- **Build Command** : `npm install && npm run build`
- **Start Command** : `npm start`

Si ce n'est pas le cas, allez dans **Settings** → **Deploy** et configurez :
- **Build Command** : `npm install && npm run build`
- **Start Command** : `npm start`

---

## 🔐 Étape 4 : Configurer les variables d'environnement

1. Dans votre service, allez dans l'onglet **"Variables"**
2. Cliquez sur **"New Variable"** pour chaque variable

### Variables OBLIGATOIRES :

| Nom | Valeur | Description |
|-----|--------|-------------|
| `NODE_ENV` | `production` | Mode production |
| `ALLOWED_ORIGINS` | `*` | CORS - accepter toutes les origines (vous pourrez changer plus tard avec votre URL GitHub Pages) |

**⚠️ Important** : Ne définissez **PAS** la variable `PORT` - Railway la gère automatiquement !

### Variables OPTIONNELLES (si vous les avez) :

| Nom | Valeur | Description |
|-----|--------|-------------|
| `GOOGLE_API_KEY` | `votre_cle_ici` | Pour l'import depuis Google Drive |
| `LASTFM_API_KEY` | `votre_cle_ici` | Pour les images d'artistes |
| `FANART_API_KEY` | `votre_cle_ici` | Pour les images haute qualité |

**Comment ajouter une variable** :
1. Cliquez sur **"New Variable"**
2. Entrez le **Nom** (ex: `NODE_ENV`)
3. Entrez la **Valeur** (ex: `production`)
4. Cliquez sur **"Add"**

---

## 🚀 Étape 5 : Déploiement

Une fois les variables configurées :

1. Railway va **automatiquement** commencer à déployer
2. Vous pouvez voir la progression dans l'onglet **"Deployments"**
3. Le déploiement prend généralement **2-5 minutes**

### Pendant le déploiement, vous verrez :
- ✅ Installation des dépendances (`npm install`)
- ✅ Compilation TypeScript (`npm run build`)
- ✅ Démarrage du serveur (`npm start`)

---

## 🔗 Étape 6 : Obtenir l'URL de votre backend

Une fois le déploiement terminé :

1. Allez dans l'onglet **"Settings"**
2. Descendez jusqu'à **"Domains"**
3. Railway vous donne automatiquement une URL comme :
   ```
   https://megamix-production.up.railway.app
   ```
4. **Notez cette URL** - vous en aurez besoin pour le frontend !

### Tester votre backend

Ouvrez cette URL dans votre navigateur :
```
https://votre-url.railway.app/api/health
```

Vous devriez voir :
```json
{"status":"OK","message":"MuZak Server is running"}
```

✅ **Si vous voyez ça, votre backend fonctionne !**

---

## 🎨 Étape 7 : Configurer le frontend (GitHub Pages)

Maintenant que votre backend est déployé, configurez le frontend :

### 7.1. Créer le fichier .env pour le build

1. Dans votre dépôt GitHub, allez dans **Settings** → **Secrets and variables** → **Actions**
2. Cliquez sur **"New repository secret"**
3. Créez un secret nommé : `VITE_API_URL`
4. Valeur : l'URL de votre backend Railway (ex: `https://megamix-production.up.railway.app`)
5. Cliquez sur **"Add secret"**

### 7.2. Activer GitHub Pages

1. Dans votre dépôt GitHub, allez dans **Settings** → **Pages**
2. **Source** : Sélectionnez **"GitHub Actions"**
3. Le workflow `.github/workflows/deploy.yml` se chargera du reste

### 7.3. Pousser le code

```bash
git add .
git commit -m "Configuration pour Railway et GitHub Pages"
git push origin main
```

Le workflow GitHub Actions va :
- Builder le frontend avec l'URL Railway
- Déployer automatiquement sur GitHub Pages

---

## ✅ Vérification finale

1. **Backend Railway** : `https://votre-url.railway.app/api/health` → ✅ OK
2. **Frontend GitHub Pages** : `https://votre-username.github.io/MegaMix` → ✅ OK
3. **Test complet** : Ouvrez votre site GitHub Pages et ajoutez un album depuis Google Drive

---

## 🆘 Dépannage

### Le déploiement échoue

**Vérifiez les logs** :
1. Allez dans **Deployments**
2. Cliquez sur le dernier déploiement
3. Regardez les logs pour voir l'erreur

**Erreurs communes** :
- ❌ "Root Directory not found" → Vérifiez que c'est bien `server`
- ❌ "Build failed" → Vérifiez que `npm run build` fonctionne localement
- ❌ "Port already in use" → Ne définissez pas `PORT` dans les variables

### L'application ne démarre pas

1. Vérifiez les **logs** dans Railway
2. Assurez-vous que `NODE_ENV=production` est défini
3. Vérifiez que `PORT` n'est **PAS** défini (Railway le gère)

### Erreur CORS

1. Vérifiez que `ALLOWED_ORIGINS=*` est défini
2. Ou spécifiez votre URL GitHub Pages : `ALLOWED_ORIGINS=https://votre-username.github.io`

### Les fichiers Google Drive ne se chargent pas

1. Vérifiez que `GOOGLE_API_KEY` est correctement configuré
2. Vérifiez que les fichiers Google Drive sont **partagés publiquement**

---

## 💰 Plan Gratuit Railway

- ✅ **500 heures/mois** (gratuit)
- ✅ **Pas de mise en veille** automatique
- ✅ **Pas de carte bancaire** requise
- ✅ **HTTPS automatique**
- ⚠️ Si vous dépassez 500h, le service s'arrête (mais vous pouvez le redémarrer le mois suivant)

---

## 📝 Prochaines Étapes

Une fois tout configuré :

1. ✅ Votre backend est sur Railway
2. ✅ Votre frontend est sur GitHub Pages
3. ✅ Votre ami peut accéder à votre bibliothèque musicale !

**URL à partager** : `https://votre-username.github.io/MegaMix`

---

## 🎉 Félicitations !

Votre application MegaMix est maintenant en ligne et partageable ! 🚀

