# 🎨 Configuration GitHub Pages - Guide Complet

Guide étape par étape pour déployer le frontend sur GitHub Pages.

---

## 📋 Prérequis

✅ **Backend déployé sur Koyeb** : `https://effective-donni-opticode-1865a644.koyeb.app`  
✅ **Dépôt GitHub** : `ezakariaa/MegaMix`  
✅ **Workflow GitHub Actions** : Déjà configuré

---

## 🚀 Étapes de Configuration

### Étape 1 : Configurer le Secret GitHub pour l'URL du Backend

1. **Allez sur GitHub** : https://github.com/ezakariaa/MegaMix

2. **Cliquez sur "Settings"** (en haut du dépôt)

3. **Dans le menu de gauche** : **"Secrets and variables"** → **"Actions"**

4. **Cliquez sur "New repository secret"**

5. **Remplissez** :
   - **Name** : `VITE_API_URL`
   - **Value** : `https://effective-donni-opticode-1865a644.koyeb.app`
   
   ⚠️ **Important** : Ne mettez **PAS** `/api` à la fin, juste l'URL de base !

6. **Cliquez sur "Add secret"**

✅ **Résultat** : Le secret est maintenant disponible pour GitHub Actions

---

### Étape 2 : Configurer la Base URL pour GitHub Pages

Il faut configurer la base URL dans `vite.config.ts` pour que les assets soient chargés correctement.

**Si votre dépôt est** :
- `ezakariaa/MegaMix` → Base URL : `/MegaMix/`
- `ezakariaa/megamix` → Base URL : `/megamix/`
- À la racine du compte → Base URL : `/`

⚠️ **Vérifiez votre nom de dépôt** et ajustez si nécessaire.

---

### Étape 3 : Activer GitHub Pages

1. **Sur GitHub** : https://github.com/ezakariaa/MegaMix

2. **Settings** → **Pages** (dans le menu de gauche)

3. **Source** : Sélectionnez **"GitHub Actions"**

4. **Cliquez sur "Save"**

✅ **Résultat** : GitHub Pages est activé et utilisera le workflow pour déployer

---

### Étape 4 : Vérifier le Fichier 404.html (pour le Routing)

Le fichier `404.html` permet à React Router de fonctionner correctement sur GitHub Pages.

Il devrait déjà exister dans `client/public/404.html`. Vérifions qu'il est bien configuré.

---

### Étape 5 : Pousser le Code

Une fois tout configuré, poussez le code pour déclencher le déploiement :

```bash
git add .
git commit -m "Configuration GitHub Pages"
git push origin main
```

---

### Étape 6 : Vérifier le Déploiement

1. **Allez dans l'onglet "Actions"** sur GitHub
2. **Vérifiez que le workflow "Deploy to GitHub Pages"** s'exécute
3. **Attendez 2-3 minutes** pour que le déploiement se termine
4. **Une fois terminé**, votre site sera disponible à :
   ```
   https://ezakariaa.github.io/MegaMix
   ```

---

## ✅ Vérification Finale

Une fois déployé :

1. **Ouvrez** : `https://ezakariaa.github.io/MegaMix`
2. **Vérifiez** que :
   - ✅ Le site s'affiche
   - ✅ Les données se chargent depuis le backend Koyeb
   - ✅ Vous pouvez naviguer entre les pages (routing fonctionne)

---

## 🆘 Dépannage

### Le site affiche une page blanche

- Vérifiez la console du navigateur (F12)
- Vérifiez que `VITE_API_URL` est bien configuré dans les secrets GitHub
- Vérifiez que la base URL dans `vite.config.ts` correspond au nom de votre dépôt

### Erreur 404 sur les pages (routing)

- Vérifiez que `client/public/404.html` existe
- Vérifiez que le fichier redirige vers `index.html`

### Les données ne se chargent pas

- Vérifiez que `ALLOWED_ORIGINS=*` est configuré dans Koyeb
- Vérifiez l'URL du backend dans les secrets GitHub
- Ouvrez la console du navigateur pour voir les erreurs CORS

---

## 📝 Résumé

| Étape | Action | Où |
|-------|--------|-----|
| 1 | Ajouter secret `VITE_API_URL` | GitHub → Settings → Secrets |
| 2 | Configurer base URL | `client/vite.config.ts` |
| 3 | Activer GitHub Pages | GitHub → Settings → Pages |
| 4 | Vérifier 404.html | `client/public/404.html` |
| 5 | Pousser le code | `git push origin main` |
| 6 | Vérifier le déploiement | GitHub → Actions |

---

## 🎉 Résultat

Votre frontend sera accessible à :
```
https://ezakariaa.github.io/MegaMix
```

Et il communiquera avec votre backend sur :
```
https://effective-donni-opticode-1865a644.koyeb.app
```

Vous pouvez maintenant partager cette URL avec vos amis ! 🚀

