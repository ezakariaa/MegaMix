# 🚀 Guide Complet : Déploiement sur Fly.io

## 📋 Prérequis

- ✅ Windows PowerShell ou Terminal
- ✅ Node.js installé (pour vérifier)
- ✅ Aucune carte bancaire requise

---

## 🚀 Étape 1 : Installer Fly CLI

### Sur Windows (PowerShell)

1. **Ouvrez PowerShell en tant qu'administrateur** :
   - Cliquez droit sur le menu Démarrer
   - Sélectionnez "Windows PowerShell (Admin)" ou "Terminal (Admin)"

2. **Exécutez cette commande** :
   ```powershell
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

3. **Attendez l'installation** (quelques secondes)

4. **Fermez et rouvrez PowerShell** pour que les changements prennent effet

5. **Vérifiez l'installation** :
   ```bash
   fly version
   ```
   Vous devriez voir quelque chose comme : `fly v0.x.x`

---

## 🚀 Étape 2 : Créer un compte Fly.io

1. **Dans PowerShell, exécutez** :
   ```bash
   fly auth signup
   ```

2. **Choisissez une option** :
   - Appuyez sur `1` pour créer un compte avec email
   - Ou `2` pour utiliser GitHub

3. **Suivez les instructions** :
   - Entrez votre email
   - Créez un mot de passe
   - Confirmez votre email (vérifiez votre boîte mail)

4. **Une fois confirmé**, vous êtes connecté automatiquement

---

## 🚀 Étape 3 : Initialiser votre application

1. **Ouvrez PowerShell** dans le dossier de votre projet

2. **Allez dans le dossier server** :
   ```bash
   cd server
   ```

3. **Initialisez Fly.io** :
   ```bash
   fly launch
   ```

4. **Répondez aux questions** :

   - **App Name** : Entrez un nom unique (ex: `megamix-backend` ou `megamix-zakaria`)
     - ⚠️ Le nom doit être unique sur Fly.io
     - Si le nom est pris, Fly vous proposera une alternative
   
   - **Region** : Choisissez une région proche (ex: `par` pour Paris, `ams` pour Amsterdam)
     - Tapez le code de la région ou appuyez sur Entrée pour la région par défaut
   
   - **Postgres Database** : Appuyez sur `N` (vous n'en avez pas besoin)
   
   - **Redis Database** : Appuyez sur `N` (vous n'en avez pas besoin)

5. **Fly va créer** :
   - Un fichier `fly.toml` (configuration)
   - Un fichier `.dockerignore` (optionnel)

---

## ⚙️ Étape 4 : Configurer fly.toml

Fly a créé un fichier `fly.toml` dans le dossier `server/`. Vérifions qu'il est correct :

Le fichier devrait ressembler à ça :
```toml
app = "votre-nom-app"
primary_region = "par"  # ou votre région

[build]

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  memory_mb = 256
  cpu_kind = "shared"
  cpus = 1
```

**Important** : Vérifiez que `internal_port` correspond au port que votre serveur écoute. Si votre serveur utilise le port de `process.env.PORT`, c'est bon (Fly définit automatiquement `PORT`).

---

## 🔐 Étape 5 : Configurer les variables d'environnement

1. **Dans PowerShell, toujours dans le dossier `server/`**, configurez les secrets :

   ```bash
   fly secrets set NODE_ENV=production
   ```

   ```bash
   fly secrets set ALLOWED_ORIGINS=*
   ```

2. **Si vous avez les clés API** (optionnel) :

   ```bash
   fly secrets set GOOGLE_API_KEY=votre_cle_ici
   ```

   ```bash
   fly secrets set LASTFM_API_KEY=votre_cle_ici
   ```

   ```bash
   fly secrets set FANART_API_KEY=votre_cle_ici
   ```

3. **Vérifiez les secrets** :
   ```bash
   fly secrets list
   ```

---

## 🚀 Étape 6 : Déployer

1. **Toujours dans le dossier `server/`**, déployez :

   ```bash
   fly deploy
   ```

2. **Fly va** :
   - Créer une image Docker
   - Builder votre application
   - Déployer sur leurs serveurs
   - Cela prend **2-5 minutes**

3. **Pendant le déploiement**, vous verrez :
   ```
   ==> Building image
   ==> Creating release
   ==> Monitoring deployment
   ```

---

## 🔗 Étape 7 : Obtenir l'URL de votre backend

1. **Une fois le déploiement terminé**, obtenez l'URL :

   ```bash
   fly info
   ```

2. **Ou allez sur** : https://fly.io/dashboard
   - Cliquez sur votre application
   - L'URL est affichée en haut (ex: `https://megamix-backend.fly.dev`)

3. **Notez cette URL** - vous en aurez besoin pour le frontend !

---

## ✅ Étape 8 : Tester votre backend

1. **Ouvrez cette URL dans votre navigateur** :
   ```
   https://votre-app.fly.dev/api/health
   ```

2. **Vous devriez voir** :
   ```json
   {"status":"OK","message":"MuZak Server is running"}
   ```

✅ **Si vous voyez ça, votre backend fonctionne !**

---

## 🎨 Étape 9 : Configurer le frontend (GitHub Pages)

Maintenant que votre backend est déployé :

1. **Dans votre dépôt GitHub** :
   - Allez dans **Settings** → **Secrets and variables** → **Actions**
   - Cliquez sur **"New repository secret"**
   - Nom : `VITE_API_URL`
   - Valeur : l'URL Fly.io (ex: `https://megamix-backend.fly.dev`)
   - Cliquez sur **"Add secret"**

2. **Activez GitHub Pages** :
   - **Settings** → **Pages**
   - **Source** : `GitHub Actions`

3. **Poussez le code** :
   ```bash
   git add .
   git commit -m "Configuration Fly.io"
   git push origin main
   ```

---

## 🆘 Dépannage

### Erreur : "fly: command not found"

**Solution** :
1. Fermez et rouvrez PowerShell
2. Ou ajoutez Fly au PATH manuellement

### Erreur : "App name already taken"

**Solution** :
- Choisissez un nom plus unique (ajoutez votre nom ou des chiffres)

### Erreur lors du build

**Vérifiez** :
1. Que vous êtes dans le dossier `server/`
2. Que `package.json` existe
3. Les logs : `fly logs`

### L'application ne démarre pas

**Vérifiez les logs** :
```bash
fly logs
```

**Vérifiez les secrets** :
```bash
fly secrets list
```

### Erreur CORS

**Assurez-vous que** :
```bash
fly secrets set ALLOWED_ORIGINS=*
```

---

## 📝 Commandes Utiles Fly.io

```bash
# Voir les logs en temps réel
fly logs

# Voir les informations de l'app
fly info

# Voir les secrets
fly secrets list

# Ajouter un secret
fly secrets set NOM=VALEUR

# Redémarrer l'application
fly apps restart

# Ouvrir l'application dans le navigateur
fly open
```

---

## 💰 Plan Gratuit Fly.io

- ✅ **3 VMs gratuites** (256 MB RAM chacune)
- ✅ **Pas de mise en veille**
- ✅ **HTTPS automatique**
- ✅ **Aucune carte bancaire requise**
- ⚠️ Limite : 3 VMs simultanées (mais vous n'avez besoin que d'une seule)

---

## 🎉 Félicitations !

Votre backend est maintenant déployé sur Fly.io ! 🚀

**Prochaine étape** : Configurez le frontend GitHub Pages avec l'URL Fly.io.

