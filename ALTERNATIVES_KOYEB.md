# 🚀 Alternatives à Koyeb - Services qui Restent Actifs

## ⚠️ Problème avec Koyeb

Sur le plan gratuit de Koyeb, le service peut s'arrêter après une période d'inactivité, et les données peuvent être perdues lors d'un redéploiement.

## ✅ Solutions Recommandées

### Option 1 : Railway (Recommandé) ⭐

**Avantages :**
- ✅ **Gratuit** (500 heures/mois, $5 de crédit gratuit)
- ✅ **Service toujours actif** (ne s'arrête pas)
- ✅ **Persistance des données** (volumes persistants)
- ✅ **Déploiement automatique depuis GitHub**
- ✅ **Pas de carte bancaire requise** (pour commencer)

**Déploiement :**

1. Allez sur : https://railway.app
2. Créez un compte (connectez avec GitHub)
3. Cliquez sur **"New Project"**
4. Sélectionnez **"Deploy from GitHub repo"**
5. Choisissez votre dépôt **MegaMix**
6. Railway détectera automatiquement le backend
7. Configurez :
   - **Root Directory** : `server`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
8. Ajoutez les variables d'environnement :
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=*
   ```
9. Railway déploiera automatiquement !

**URL générée :** `https://votre-app.up.railway.app`

---

### Option 2 : Render

**Avantages :**
- ✅ **Gratuit** (plan gratuit disponible)
- ✅ **Service toujours actif** (ne s'arrête pas après 15 minutes d'inactivité)
- ✅ **Persistance des données** (disques persistants)
- ✅ **Déploiement automatique depuis GitHub**

**Déploiement :**

1. Allez sur : https://render.com
2. Créez un compte (connectez avec GitHub)
3. Cliquez sur **"New +"** → **"Web Service"**
4. Connectez votre dépôt GitHub
5. Configurez :
   - **Name** : `muzak-backend`
   - **Environment** : `Node`
   - **Build Command** : `cd server && npm install && npm run build`
   - **Start Command** : `cd server && npm start`
   - **Root Directory** : `server`
6. Ajoutez les variables d'environnement :
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=*
   ```
7. Cliquez sur **"Create Web Service"**

**URL générée :** `https://muzak-backend.onrender.com`

---

### Option 3 : Fly.io

**Avantages :**
- ✅ **Gratuit** (généreux)
- ✅ **Service toujours actif**
- ✅ **Volumes persistants**
- ✅ **Déploiement via CLI**

**Déploiement :**

1. Installez Fly CLI : https://fly.io/docs/getting-started/installing-flyctl/
2. Créez un compte : `fly auth signup`
3. Dans le dossier `server/`, créez `fly.toml` :
   ```toml
   app = "muzak-backend"
   primary_region = "cdg"
   
   [build]
     builder = "paketobuildpacks/builder:base"
   
   [http_service]
     internal_port = 5000
     force_https = true
     auto_stop_machines = false
     auto_start_machines = true
     min_machines_running = 1
   
   [[vm]]
     memory_mb = 256
   ```
4. Déployez : `fly deploy`
5. Configurez les variables : `fly secrets set NODE_ENV=production ALLOWED_ORIGINS=*`

**URL générée :** `https://muzak-backend.fly.dev`

---

## 💾 Solution de Persistance des Données

### Option A : Base de Données MongoDB Atlas (Recommandé) ⭐

**Avantages :**
- ✅ **Gratuit** (512 MB de stockage)
- ✅ **Données persistantes** (même si le backend redémarre)
- ✅ **Pas de carte bancaire requise**
- ✅ **Backup automatique**

**Configuration :**

1. Créez un compte : https://www.mongodb.com/cloud/atlas
2. Créez un cluster gratuit (M0)
3. Créez un utilisateur de base de données
4. Obtenez la chaîne de connexion
5. Installez MongoDB dans votre backend :
   ```bash
   cd server
   npm install mongoose
   ```
6. Modifiez `server/src/utils/dataPersistence.ts` pour utiliser MongoDB au lieu de fichiers JSON

**Chaîne de connexion :** `mongodb+srv://username:password@cluster.mongodb.net/muzak?retryWrites=true&w=majority`

---

### Option B : Supabase (PostgreSQL)

**Avantages :**
- ✅ **Gratuit** (500 MB de base de données)
- ✅ **API REST automatique**
- ✅ **Interface graphique**
- ✅ **Backup automatique**

**Configuration :**

1. Créez un compte : https://supabase.com
2. Créez un nouveau projet
3. Obtenez la chaîne de connexion PostgreSQL
4. Installez le client PostgreSQL :
   ```bash
   cd server
   npm install pg
   ```

---

### Option C : Stockage Cloud (Google Drive / Dropbox)

**Avantages :**
- ✅ **Gratuit**
- ✅ **Synchronisation automatique**
- ✅ **Backup dans le cloud**

**Configuration :**

Modifiez `dataPersistence.ts` pour sauvegarder les fichiers JSON dans Google Drive ou Dropbox au lieu du système de fichiers local.

---

## 🔄 Migration depuis Koyeb

### Étape 1 : Sauvegarder les Données Actuelles

```powershell
# Si vous avez encore accès à Koyeb
.\backup-koyeb-data.ps1
```

### Étape 2 : Déployer sur le Nouveau Service

Suivez les instructions ci-dessus pour Railway, Render ou Fly.io.

### Étape 3 : Restaurer les Données

```powershell
# Modifiez l'URL dans restore-koyeb-data.ps1
$koyebUrl = "https://votre-nouvelle-url.railway.app"

# Restaurez
.\restore-koyeb-data.ps1 -BackupPath "backups/koyeb-YYYY-MM-DD_HH-mm-ss"
```

---

## 📊 Comparaison des Services

| Service | Gratuit | Toujours Actif | Persistance | Facile à Déployer |
|---------|---------|----------------|-------------|-------------------|
| **Railway** | ✅ (500h/mois) | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Render** | ✅ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Fly.io** | ✅ | ✅ | ✅ | ⭐⭐⭐ |
| **Koyeb** | ✅ | ❌ (s'arrête) | ❌ | ⭐⭐⭐⭐ |

---

## 🎯 Recommandation Finale

**Pour votre cas :**

1. **Backend** : Migrez vers **Railway** (le plus simple et fiable)
2. **Données** : Utilisez **MongoDB Atlas** pour la persistance (gratuit et fiable)

Cela garantit que :
- ✅ Votre backend reste toujours actif
- ✅ Vos données ne sont jamais perdues
- ✅ Tout est gratuit

---

## 🆘 Si vous avez Perdu vos Données

### Option 1 : Restaurer depuis une Sauvegarde Locale

Si vous avez des fichiers dans `server/data/` :

```powershell
# Vérifiez si vous avez des données locales
ls server/data/

# Si oui, importez-les
.\import-data.ps1
```

### Option 2 : Restaurer depuis une Sauvegarde Koyeb

```powershell
# Trouvez la dernière sauvegarde
ls backups/

# Restaurez
.\restore-koyeb-data.ps1 -BackupPath "backups/koyeb-YYYY-MM-DD_HH-mm-ss"
```

### Option 3 : Re-ajouter les Albums

Si vous n'avez pas de sauvegarde, vous devrez re-ajouter vos albums via l'interface ou depuis Google Drive.

---

## ✅ Checklist de Migration

- [ ] Choisir un nouveau service (Railway recommandé)
- [ ] Sauvegarder les données actuelles (si possible)
- [ ] Déployer le backend sur le nouveau service
- [ ] Configurer les variables d'environnement
- [ ] Tester l'endpoint `/api/health`
- [ ] Restaurer les données (si sauvegarde disponible)
- [ ] Mettre à jour l'URL du backend dans GitHub Secrets (`VITE_API_URL`)
- [ ] Redéployer le frontend
- [ ] Vérifier que tout fonctionne

---

## 📝 Notes Importantes

1. **Railway** offre 500 heures gratuites par mois (suffisant pour un service toujours actif)
2. **MongoDB Atlas** offre 512 MB gratuits (largement suffisant pour des milliers d'albums)
3. Les deux services ne nécessitent pas de carte bancaire pour commencer
4. Vous pouvez migrer progressivement sans perdre de données si vous sauvegardez d'abord

