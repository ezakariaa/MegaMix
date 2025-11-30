# 🚂 Migration de Koyeb vers Railway

Guide complet pour migrer votre backend MegaMix de Koyeb vers Railway.

---

## ✅ Pourquoi Railway ?

**Avantages de Railway :**
- ✅ **Service toujours actif** (ne s'arrête jamais, même sur le plan gratuit)
- ✅ **500 heures gratuites par mois** (suffisant pour un service 24/7)
- ✅ **$5 de crédit gratuit** au démarrage
- ✅ **Persistance des données** (volumes persistants)
- ✅ **Déploiement automatique depuis GitHub**
- ✅ **Pas de carte bancaire requise** pour commencer
- ✅ **Interface simple et intuitive**

---

## 📋 Prérequis

- [ ] Un compte GitHub avec votre dépôt MegaMix
- [ ] Les données sauvegardées depuis Koyeb (optionnel mais recommandé)
- [ ] 10-15 minutes de temps

---

## 🔄 Étape 1 : Sauvegarder les Données depuis Koyeb

**⚠️ IMPORTANT : Sauvegardez vos données avant de migrer !**

```powershell
# Sauvegarder toutes les données depuis Koyeb
.\backup-koyeb-data.ps1
```

Cela créera un dossier dans `backups/` avec tous vos albums, tracks et artists.

---

## 🚀 Étape 2 : Créer un Compte Railway

1. Allez sur : **https://railway.app**
2. Cliquez sur **"Start a New Project"**
3. Connectez-vous avec votre compte **GitHub**
4. Autorisez Railway à accéder à vos dépôts

---

## 📦 Étape 3 : Déployer le Backend sur Railway

### Option A : Déploiement depuis GitHub (Recommandé)

1. Dans Railway, cliquez sur **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**
3. Choisissez votre dépôt **MegaMix**
4. Railway détectera automatiquement le projet

### Configuration du Service

1. Railway va créer un service automatiquement
2. Cliquez sur le service pour le configurer
3. Allez dans l'onglet **"Settings"**

#### Configuration Build :

- **Root Directory** : `server`
- **Build Command** : `npm install && npm run build`
- **Start Command** : `npm start`

**OU** Railway utilisera automatiquement le fichier `railway.json` que nous avons créé.

#### Variables d'Environnement :

Allez dans l'onglet **"Variables"** et ajoutez :

```
NODE_ENV=production
ALLOWED_ORIGINS=*
PORT=5000
```

**Optionnel** (si vous avez les clés API) :
```
GOOGLE_API_KEY=votre_cle_ici
LASTFM_API_KEY=votre_cle_ici
FANART_API_KEY=votre_cle_ici
```

⚠️ **Note** : Railway définit automatiquement `PORT`, mais vous pouvez le laisser à 5000 pour être explicite.

---

## 🌐 Étape 4 : Obtenir l'URL du Backend

1. Dans Railway, allez dans l'onglet **"Settings"** de votre service
2. Scrollez jusqu'à **"Networking"**
3. Cliquez sur **"Generate Domain"**
4. Railway générera une URL comme : `https://votre-app.up.railway.app`
5. **Copiez cette URL** - vous en aurez besoin !

---

## ✅ Étape 5 : Tester le Backend

Ouvrez dans votre navigateur :
```
https://votre-app.up.railway.app/api/health
```

Vous devriez voir :
```json
{"status":"OK","message":"MuZak Server is running"}
```

✅ **Si vous voyez ça, votre backend Railway fonctionne !**

---

## 📥 Étape 6 : Restaurer les Données sur Railway

Si vous avez sauvegardé vos données depuis Koyeb :

```powershell
# Modifier l'URL dans restore-koyeb-data.ps1 pour Railway
# OU utiliser le nouveau script pour Railway
.\restore-railway-data.ps1 -BackupPath "backups\koyeb-YYYY-MM-DD_HH-mm-ss"
```

**OU** utilisez le script de restauration en modifiant l'URL :

1. Ouvrez `restore-koyeb-data.ps1`
2. Remplacez la ligne 77 :
   ```powershell
   $koyebUrl = "https://votre-app.up.railway.app"
   ```
3. Exécutez le script

---

## 🔗 Étape 7 : Mettre à Jour le Frontend

### Mettre à Jour l'URL du Backend dans GitHub

1. Allez sur votre dépôt GitHub : **Settings** → **Secrets and variables** → **Actions**
2. Trouvez le secret `VITE_API_URL`
3. Cliquez sur **"Update"**
4. Remplacez l'URL Koyeb par votre nouvelle URL Railway :
   ```
   https://votre-app.up.railway.app
   ```
5. Cliquez sur **"Update secret"**

### Redéployer le Frontend

Le frontend se redéploiera automatiquement via GitHub Actions, OU :

```bash
git commit --allow-empty -m "Trigger rebuild with Railway backend"
git push origin main
```

---

## 🎯 Étape 8 : Vérifier que Tout Fonctionne

1. **Backend** : Vérifiez `https://votre-app.up.railway.app/api/health`
2. **Frontend** : Ouvrez votre site GitHub Pages
3. **Testez** : Ajoutez un album, vérifiez que les données se chargent

---

## 🔧 Configuration Avancée Railway

### Volumes Persistants (pour les données)

Railway offre des volumes persistants pour stocker les données :

1. Dans Railway, allez dans **"Settings"** → **"Volumes"**
2. Cliquez sur **"Add Volume"**
3. **Mount Path** : `/app/data`
4. **Size** : 1 GB (gratuit)

⚠️ **Note** : Pour utiliser les volumes, vous devrez modifier le code pour utiliser `/app/data` au lieu de `server/data`.

### Domaine Personnalisé

1. Dans **"Settings"** → **"Networking"**
2. Cliquez sur **"Custom Domain"**
3. Ajoutez votre domaine personnalisé

---

## 📊 Comparaison Koyeb vs Railway

| Fonctionnalité | Koyeb (Gratuit) | Railway (Gratuit) |
|----------------|-----------------|-------------------|
| Service toujours actif | ❌ (s'arrête après inactivité) | ✅ (toujours actif) |
| Persistance des données | ❌ (perdues au redéploiement) | ✅ (volumes persistants) |
| Heures gratuites | Illimitées | 500h/mois |
| Crédit gratuit | Non | $5 |
| Déploiement GitHub | ✅ | ✅ |
| Carte bancaire requise | Non | Non |

---

## 🆘 Dépannage

### Le build Railway échoue

**Vérifiez :**
1. **Root Directory** = `server`
2. **Build Command** = `npm install && npm run build`
3. **Start Command** = `npm start`
4. Les variables d'environnement sont définies

### Le backend ne démarre pas

**Vérifiez les logs :**
1. Dans Railway, allez dans l'onglet **"Deployments"**
2. Cliquez sur le dernier déploiement
3. Consultez les logs pour voir l'erreur

**Erreurs communes :**
- `PORT` non défini → Ajoutez `PORT=5000` dans les variables
- Erreur de build → Vérifiez que `npm run build` fonctionne localement

### Le frontend ne charge pas les données

**Vérifiez :**
1. Le secret `VITE_API_URL` dans GitHub pointe vers Railway
2. `ALLOWED_ORIGINS=*` est défini dans Railway
3. Le backend répond à `/api/health`

### Erreur CORS

**Solution :**
1. Vérifiez que `ALLOWED_ORIGINS=*` est dans les variables Railway
2. Ou spécifiez votre URL GitHub Pages : `ALLOWED_ORIGINS=https://votre-username.github.io`

---

## 📝 Checklist de Migration

- [ ] Sauvegarder les données depuis Koyeb
- [ ] Créer un compte Railway
- [ ] Déployer le backend sur Railway
- [ ] Configurer les variables d'environnement
- [ ] Tester `/api/health`
- [ ] Restaurer les données sur Railway
- [ ] Mettre à jour `VITE_API_URL` dans GitHub Secrets
- [ ] Redéployer le frontend
- [ ] Vérifier que tout fonctionne
- [ ] (Optionnel) Configurer un volume persistant

---

## 🎉 Résultat Final

✅ **Backend Railway** : `https://votre-app.up.railway.app`  
✅ **Frontend GitHub Pages** : `https://votre-username.github.io/MegaMix`  
✅ **Service toujours actif** : Plus de problème d'inactivité !  
✅ **Données persistantes** : Vos albums ne seront plus perdus !

---

## 💡 Conseils

1. **Surveillez votre usage** : Railway offre 500h/mois gratuites (suffisant pour 24/7)
2. **Sauvegardez régulièrement** : Utilisez `backup-railway-data.ps1` régulièrement
3. **Volumes persistants** : Pour une vraie persistance, configurez un volume Railway
4. **MongoDB Atlas** : Pour une persistance encore plus fiable, migrez vers MongoDB Atlas (voir `ALTERNATIVES_KOYEB.md`)

---

## 📚 Ressources

- **Documentation Railway** : https://docs.railway.app
- **Guide de persistance** : Voir `ALTERNATIVES_KOYEB.md`
- **Scripts de sauvegarde** : `backup-railway-data.ps1` et `restore-railway-data.ps1`

---

**Bonne migration ! 🚂**

