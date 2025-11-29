# 🚂 Déploiement sur Railway (Sans Carte Bancaire)

Railway offre un plan gratuit **sans nécessiter de carte bancaire** avec 500 heures de crédit par mois.

## 📋 Étapes de Déploiement

### 1. Créer un compte Railway

1. Allez sur https://railway.app
2. Cliquez sur **"Start a New Project"**
3. Connectez-vous avec **GitHub** (recommandé)
4. **Aucune carte bancaire requise** ✅

### 2. Créer un nouveau projet

1. Cliquez sur **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**
3. Choisissez votre dépôt **MegaMix**
4. Railway détectera automatiquement que c'est un projet Node.js

### 3. Configurer le déploiement

Railway devrait détecter automatiquement votre structure, mais vous devez spécifier :

#### Root Directory
- Cliquez sur votre service
- Allez dans **Settings** → **Root Directory**
- Entrez : `server`

#### Variables d'Environnement

Allez dans **Variables** et ajoutez :

| Nom | Valeur |
|-----|--------|
| `NODE_ENV` | `production` |
| `PORT` | (laissez Railway le gérer automatiquement) |
| `ALLOWED_ORIGINS` | `*` |

**Optionnel** (si vous avez les clés) :
| Nom | Valeur |
|-----|--------|
| `GOOGLE_API_KEY` | votre clé |
| `LASTFM_API_KEY` | votre clé |
| `FANART_API_KEY` | votre clé |

### 4. Déploiement automatique

Railway va :
- Détecter automatiquement `package.json` dans `server/`
- Installer les dépendances (`npm install`)
- Builder le projet (`npm run build`)
- Démarrer le serveur (`npm start`)

### 5. Obtenir l'URL

Une fois déployé :
- Railway vous donnera une URL comme : `https://megamix-production.up.railway.app`
- Notez cette URL pour configurer votre frontend

## ⚙️ Configuration Avancée

### Build Command (si nécessaire)

Si Railway ne détecte pas automatiquement :
- **Build Command** : `npm install && npm run build`

### Start Command

- **Start Command** : `npm start`

## 💰 Plan Gratuit Railway

- ✅ **500 heures/mois** (gratuit)
- ✅ **Pas de mise en veille** automatique
- ✅ **Pas de carte bancaire** requise
- ✅ **HTTPS automatique**
- ⚠️ Si vous dépassez 500h, le service s'arrête (mais vous pouvez le redémarrer le mois suivant)

## 🔗 Prochaines Étapes

1. Notez l'URL de votre backend Railway
2. Configurez votre frontend GitHub Pages avec cette URL
3. Voir `DEPLOIEMENT_GITHUB_PAGES.md` pour la suite

## 🆘 Dépannage

### Le déploiement échoue
- Vérifiez que le **Root Directory** est bien `server`
- Vérifiez les logs dans Railway (onglet **Deployments**)

### L'application ne démarre pas
- Vérifiez que `PORT` n'est pas défini (Railway le gère automatiquement)
- Vérifiez les logs pour les erreurs

### Erreur CORS
- Assurez-vous que `ALLOWED_ORIGINS` est défini à `*` ou votre URL GitHub Pages

