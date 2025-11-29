# 🚀 Guide de Déploiement sur Render

## Configuration sur Render.com

### 1. Root Directory
```
server
```

### 2. Build Command
```
npm install && npm run build
```

### 3. Start Command
```
npm start
```

### 4. Variables d'Environnement Requises

| Nom | Valeur | Description |
|-----|--------|-------------|
| `NODE_ENV` | `production` | Mode production |
| `PORT` | `10000` | Port (Render assigne automatiquement, mais cette valeur est utilisée comme fallback) |
| `ALLOWED_ORIGINS` | `*` | CORS - accepter toutes les origines (ou spécifiez votre URL GitHub Pages) |

### 5. Variables d'Environnement Optionnelles

| Nom | Valeur | Description |
|-----|--------|-------------|
| `GOOGLE_API_KEY` | `votre_cle` | Pour l'import depuis Google Drive |
| `LASTFM_API_KEY` | `votre_cle` | Pour les images d'artistes |
| `FANART_API_KEY` | `votre_cle` | Pour les images haute qualité |

## ⚠️ Notes Importantes

- **Mise en veille** : L'application gratuite se met en veille après 15 minutes d'inactivité
- **Démarrage** : Le premier accès après la mise en veille peut prendre 30-60 secondes
- **Stockage** : Les fichiers uploadés sont stockés dans `server/uploads/` (limité sur le plan gratuit)

## 🔗 Après le Déploiement

Une fois déployé, vous obtiendrez une URL comme :
```
https://megamix-xxxx.onrender.com
```

Testez-la dans votre navigateur :
```
https://megamix-xxxx.onrender.com/api/health
```

Vous devriez voir :
```json
{"status":"OK","message":"MuZak Server is running"}
```

## 📝 Prochaines Étapes

1. Notez l'URL de votre backend Render
2. Configurez le frontend pour utiliser cette URL (voir `DEPLOIEMENT_GITHUB_PAGES.md`)
3. Déployez le frontend sur GitHub Pages

