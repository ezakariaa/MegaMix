# 🌐 Partager avec ngrok (Solution Locale - Gratuit)

Si vous ne voulez **aucun service cloud** et préférez utiliser votre propre ordinateur, **ngrok** est la solution parfaite.

## ⚠️ Limitations

- Votre ordinateur doit rester **allumé et connecté à Internet**
- Si vous éteignez votre PC, l'application ne sera plus accessible
- Les URLs ngrok gratuites changent à chaque redémarrage

## 📋 Installation

### 1. Installer ngrok

**Option A : Téléchargement direct**
- Allez sur https://ngrok.com/download
- Téléchargez pour Windows
- Extrayez l'exécutable

**Option B : Via npm (si vous avez Node.js)**
```bash
npm install -g ngrok
```

### 2. Créer un compte ngrok (gratuit)

1. Allez sur https://dashboard.ngrok.com/signup
2. Créez un compte gratuit
3. Vous obtiendrez un **authtoken**

### 3. Configurer ngrok

Ouvrez un terminal et exécutez :
```bash
ngrok config add-authtoken VOTRE_TOKEN_ICI
```

## 🚀 Utilisation

### 1. Démarrer votre application

Dans un terminal :
```bash
npm run dev
```

Votre serveur backend tourne sur `http://localhost:5000`

### 2. Exposer le backend avec ngrok

Dans un **nouveau terminal** :
```bash
ngrok http 5000
```

Vous obtiendrez une URL comme :
```
Forwarding  https://abc123.ngrok.io -> http://localhost:5000
```

### 3. Exposer le frontend avec ngrok

Dans un **autre terminal** :
```bash
cd client
# Créez un fichier .env avec :
# VITE_API_URL=https://abc123.ngrok.io
npm run dev
```

Dans un **nouveau terminal** :
```bash
ngrok http 3000
```

Vous obtiendrez une autre URL comme :
```
Forwarding  https://xyz789.ngrok.io -> http://localhost:3000
```

### 4. Partager l'URL

Partagez l'URL du frontend (ex: `https://xyz789.ngrok.io`) avec votre ami !

## 🔧 Configuration Permanente (URL Fixe)

Avec le plan gratuit, les URLs changent à chaque redémarrage.

Pour une **URL fixe** (gratuit aussi) :
1. Allez sur https://dashboard.ngrok.com/cloud-edge/domains
2. Créez un domaine gratuit (ex: `megamix.ngrok-free.app`)
3. Utilisez :
```bash
ngrok http 5000 --domain=megamix.ngrok-free.app
```

## ⚙️ Configuration CORS

Assurez-vous que votre `.env` dans `server/` contient :
```
ALLOWED_ORIGINS=https://xyz789.ngrok.io
```

Ou pour accepter toutes les origines :
```
ALLOWED_ORIGINS=*
```

## 📝 Avantages

✅ **100% gratuit**  
✅ **Aucune carte bancaire**  
✅ **Contrôle total** sur vos données  
✅ **Pas de limites** de stockage  

## ⚠️ Inconvénients

❌ Votre PC doit rester allumé  
❌ Consomme votre bande passante  
❌ URLs qui changent (sauf avec domaine gratuit)  

## 🎯 Quand Utiliser ngrok ?

- Pour tester rapidement
- Pour partager temporairement avec des amis
- Si vous avez une connexion Internet stable
- Si vous ne voulez pas utiliser de services cloud

