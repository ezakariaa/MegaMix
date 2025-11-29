# 📊 Architecture des Données - Où Tout Va ?

## 🎯 Réponse Courte

**GitHub Pages** sert **SEULEMENT** le frontend (code React compilé).

Toutes les **données** (images, tags, playlists) sont gérées par le **BACKEND**, pas GitHub.

---

## 📁 Où sont Stockées les Données Actuellement ?

### ✅ Backend (Koyeb/Render/Fly.io)

Le backend gère **TOUT** :

1. **Données JSON** (albums, tracks, artists, playlists)
   - Stockées dans : `server/data/`
   - Fichiers : `albums.json`, `tracks.json`, `artists.json`
   - Gérées par le backend Node.js

2. **Images**
   - **Pas stockées localement** ✅
   - **Streamées depuis** :
     - Google Drive (vos fichiers audio)
     - Fanart.tv, Last.fm, Deezer (images d'artistes)
   - Le backend fait un proxy pour éviter les erreurs CORS

3. **Playlists**
   - Actuellement : `[]` (vide)
   - Seront stockées dans des fichiers JSON côté backend

---

## 🌐 GitHub Pages = Frontend Uniquement

**GitHub Pages** sert **SEULEMENT** :

- ✅ Code HTML/CSS/JavaScript compilé de React
- ✅ Fichiers statiques (pas de données dynamiques)
- ✅ Interface utilisateur

**GitHub Pages ne gère PAS** :

- ❌ Fichiers JSON (albums, tracks, etc.)
- ❌ Images (elles viennent du backend)
- ❌ Playlists
- ❌ Aucune donnée dynamique

---

## 🏗️ Architecture Complète

```
┌─────────────────────────────────────────────────────────┐
│  UTILISATEUR (Navigateur)                                │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼────────┐  ┌─────▼──────────┐
│  GitHub Pages  │  │  Backend       │
│  (Frontend)    │  │  (Koyeb/etc.)  │
│                │  │                │
│  - React App   │  │  - API Node.js │
│  - HTML/CSS/JS │  │  - Données JSON│
│  - Statique    │  │  - Proxy Images│
│                │  │  - Streaming   │
└────────┬───────┘  └─────┬──────────┘
         │                │
         │  ┌─────────────┘
         │  │
         └──┼─► Appels API (fetch)
            │
    ┌───────▼──────────┐
    │  Sources Externes │
    │                   │
    │  - Google Drive   │
    │  - Fanart.tv      │
    │  - Last.fm        │
    │  - Deezer         │
    └───────────────────┘
```

---

## 📝 Flux des Données

### 1. Frontend (GitHub Pages)
```
- Affiche l'interface React
- Fait des appels API au backend
- Reçoit les données JSON
```

### 2. Backend (Koyeb/Render/Fly.io)
```
- Stocke les données dans server/data/*.json
- Gère les playlists
- Stream les fichiers audio depuis Google Drive
- Proxie les images depuis Fanart.tv, etc.
```

### 3. Sources Externes
```
- Google Drive : vos fichiers audio
- Fanart.tv, Last.fm : images d'artistes
```

---

## 🔐 Stockage des Données

### Actuellement dans votre App

**Backend** (`server/data/`) :
- ✅ `albums.json` → Liste des albums
- ✅ `tracks.json` → Liste des pistes
- ✅ `artists.json` → Liste des artistes
- ⚠️ `playlists.json` → Pas encore implémenté (vide)

**Images** :
- ✅ Streamées depuis Google Drive (audio)
- ✅ Proxifiées depuis Fanart.tv, Last.fm (artistes)

### Si vous déployez sur Koyeb/Render

Les fichiers JSON dans `server/data/` sont **sur le serveur** du backend, pas sur GitHub.

**Important** : Ces données sont **permanentes** sur le serveur du backend.

---

## 💡 Si vous voulez stocker les images localement

Si vous voulez stocker les images d'artistes (pas juste les streamer) :

### Option 1 : Firebase Storage
- ✅ Gratuit (limite généreuse)
- ✅ Pas de carte bancaire
- ✅ CDN intégré

### Option 2 : Cloudinary
- ✅ Gratuit (limite généreuse)
- ✅ Optimisation automatique d'images
- ✅ CDN

### Option 3 : Backend actuel
- ✅ Stream depuis sources externes (actuel)
- ✅ Pas de stockage nécessaire
- ✅ Moins de coûts

---

## ✅ Résumé

| Élément | Où il est | Service |
|---------|-----------|---------|
| **Frontend React** | GitHub Pages | Statique |
| **Données JSON** | Backend (Koyeb/etc.) | `server/data/*.json` |
| **Images Artistes** | Proxifiées depuis sources externes | Via Backend |
| **Fichiers Audio** | Google Drive | Stream via Backend |
| **Playlists** | Backend (futur) | `server/data/playlists.json` |

---

## 🎯 Conclusion

**Vous avez raison** : GitHub Pages ne peut pas gérer les données dynamiques.

**Solution** : 
- ✅ Frontend → GitHub Pages (code statique)
- ✅ Backend → Koyeb/Render (données + API)
- ✅ Images → Streamées via backend depuis sources externes

Tout fonctionne déjà correctement ! Les données sont gérées par le backend, pas GitHub. 🎉

