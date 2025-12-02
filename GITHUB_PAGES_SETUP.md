# 🚀 Configuration GitHub Pages

## 📋 Problèmes courants et solutions

### ❌ Les albums et la bibliothèque ne s'affichent pas

Cela peut être dû à plusieurs raisons :

#### 1. **Configuration de l'URL de l'API manquante**

Le frontend a besoin de connaître l'URL de votre backend déployé (Railway, Koyeb, etc.).

**Solution :**

1. Allez dans votre dépôt GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Cliquez sur **New repository secret**
3. Créez un secret nommé `VITE_API_URL` avec la valeur de votre backend :
   - Exemple Railway : `https://votre-app.up.railway.app`
   - Exemple Koyeb : `https://votre-app.koyeb.app`
   - **Important** : N'incluez PAS `/api` à la fin, c'est ajouté automatiquement

4. Redéployez votre application :
   - Allez dans **Actions** → **Deploy to GitHub Pages** → **Run workflow**

#### 2. **Problème de CORS**

Le backend doit autoriser les requêtes depuis GitHub Pages.

**Solution :**

Sur votre backend (Railway/Koyeb), configurez la variable d'environnement :

```env
ALLOWED_ORIGINS=https://votre-username.github.io,https://votre-username.github.io/MegaMix
```

Ou pour autoriser toutes les origines (moins sécurisé mais plus simple) :

```env
ALLOWED_ORIGINS=*
```

#### 3. **Vérifier que le backend fonctionne**

Testez votre backend directement dans le navigateur :

```
https://votre-backend.up.railway.app/api/albums
```

Vous devriez voir une réponse JSON avec vos albums.

### ✅ Vérification

1. Ouvrez la console du navigateur (F12) sur votre site GitHub Pages
2. Vérifiez les messages dans la console :
   - `[API] URL de l'API utilisée: ...` devrait afficher votre URL backend
   - S'il y a des erreurs CORS ou 404, vous les verrez ici

3. Vérifiez l'onglet **Network** :
   - Les requêtes vers `/api/albums` devraient retourner 200 (succès)
   - Si vous voyez des erreurs CORS, configurez `ALLOWED_ORIGINS` sur le backend

### 🔧 Configuration complète

#### Variables d'environnement GitHub Secrets

| Secret | Description | Exemple |
|--------|-------------|---------|
| `VITE_API_URL` | URL de votre backend (sans /api) | `https://muzak-server.up.railway.app` |

#### Variables d'environnement Backend (Railway/Koyeb)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Origines autorisées pour CORS | `https://votre-username.github.io` ou `*` |

### 📝 Notes importantes

- Le workflow GitHub Actions utilise `VITE_API_URL` pour construire l'application
- Si `VITE_API_URL` n'est pas défini, l'application pointera vers `http://localhost:5000` qui ne fonctionnera pas sur GitHub Pages
- Le backend doit être accessible publiquement (pas de localhost)
- Les requêtes API sont faites vers `${VITE_API_URL}/api`

### 🆘 Dépannage

Si après avoir configuré tout cela, ça ne fonctionne toujours pas :

1. **Vérifiez les logs GitHub Actions** :
   - Allez dans **Actions** → Cliquez sur le dernier workflow
   - Vérifiez que le build s'est bien passé
   - Vérifiez que `VITE_API_URL` est bien utilisé

2. **Vérifiez la console du navigateur** :
   - Ouvrez les outils de développement (F12)
   - Regardez l'onglet **Console** pour les erreurs
   - Regardez l'onglet **Network** pour les requêtes API

3. **Testez le backend directement** :
   - Ouvrez `https://votre-backend/api/albums` dans le navigateur
   - Vous devriez voir du JSON, pas une erreur

4. **Vérifiez CORS** :
   - Dans la console, si vous voyez "CORS policy", configurez `ALLOWED_ORIGINS`
   - L'URL GitHub Pages doit être dans la liste des origines autorisées

