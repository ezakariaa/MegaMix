# 🆓 Alternatives Gratuites (Sans Carte Bancaire)

Railway demande maintenant une carte bancaire après l'essai. Voici des alternatives **100% gratuites** sans carte bancaire :

---

## 🥇 Option 1 : Fly.io (Recommandé)

### Avantages
- ✅ **Gratuit sans carte bancaire**
- ✅ **3 VMs gratuites** (256 MB RAM chacune)
- ✅ **Pas de mise en veille**
- ✅ **HTTPS automatique**
- ✅ **Déploiement simple**

### Déploiement

1. **Installer Fly CLI** :
   ```bash
   # Windows (PowerShell)
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **Créer un compte** :
   ```bash
   fly auth signup
   ```

3. **Dans le dossier server** :
   ```bash
   cd server
   fly launch
   ```
   - Suivez les instructions
   - Choisissez une région (ex: `par` pour Paris)
   - Ne créez pas de base de données (appuyez sur N)

4. **Configurer les variables d'environnement** :
   ```bash
   fly secrets set NODE_ENV=production
   fly secrets set ALLOWED_ORIGINS=*
   fly secrets set GOOGLE_API_KEY=votre_cle  # si vous l'avez
   ```

5. **Déployer** :
   ```bash
   fly deploy
   ```

6. **Obtenir l'URL** :
   ```bash
   fly info
   ```

**Site** : https://fly.io

---

## 🥈 Option 2 : Cyclic.sh

### Avantages
- ✅ **Gratuit sans carte bancaire**
- ✅ **Spécialisé pour Node.js**
- ✅ **Déploiement depuis GitHub**
- ✅ **HTTPS automatique**

### Déploiement

1. **Allez sur** : https://cyclic.sh
2. **Connectez votre compte GitHub**
3. **Sélectionnez votre dépôt** MegaMix
4. **Configurez** :
   - **Root Directory** : `server`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
5. **Variables d'environnement** :
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS=*`
6. **Déployez** - Cyclic fait le reste automatiquement

**Site** : https://cyclic.sh

---

## 🥉 Option 3 : ngrok (Votre PC)

### Avantages
- ✅ **100% gratuit**
- ✅ **Aucune carte bancaire**
- ✅ **Contrôle total**
- ✅ **Pas de limites**

### Inconvénients
- ❌ Votre PC doit rester allumé
- ❌ URLs qui changent (sauf avec domaine gratuit)

### Déploiement

Voir le guide : `GUIDE_NGROK_LOCAL.md`

**Site** : https://ngrok.com

---

## 🎯 Option 4 : Render (Avec Carte Bancaire)

Si vous acceptez de mettre une carte bancaire (mais ne sera pas débitée) :

- ✅ **Plan gratuit** : 750 heures/mois
- ✅ **Mise en veille** après 15 min d'inactivité
- ⚠️ **Carte bancaire requise** (mais pas débitée sur le plan gratuit)

Voir le guide : `GUIDE_RENDER.md`

---

## 📊 Comparaison Rapide

| Service | Gratuit | Carte Bancaire | Mise en Veille | Limites |
|---------|---------|----------------|----------------|---------|
| **Fly.io** | ✅ | ❌ Non | ❌ Non | 3 VMs gratuites |
| **Cyclic.sh** | ✅ | ❌ Non | ❌ Non | Limites généreuses |
| **ngrok** | ✅ | ❌ Non | ❌ Non | Aucune (mais PC doit rester allumé) |
| **Render** | ✅ | ⚠️ Oui (non débitée) | ⚠️ Oui (15 min) | 750h/mois |
| **Railway** | ⚠️ Essai limité | ⚠️ Oui (après essai) | ❌ Non | 500h/mois |

---

## 🎯 Ma Recommandation

Pour votre cas (streaming depuis Google Drive, pas de stockage local) :

1. **Fly.io** - Le plus simple et fiable
2. **Cyclic.sh** - Très simple, spécialisé Node.js
3. **ngrok** - Si vous préférez garder tout sur votre PC

---

## 🚀 Guide Rapide Fly.io

Si vous choisissez Fly.io, voici les étapes :

1. Installez Fly CLI (voir ci-dessus)
2. Créez un compte : `fly auth signup`
3. Dans `server/` : `fly launch`
4. Configurez les secrets : `fly secrets set ...`
5. Déployez : `fly deploy`
6. Obtenez l'URL : `fly info`

C'est tout ! 🎉

