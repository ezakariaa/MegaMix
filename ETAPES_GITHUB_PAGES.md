# 🎯 Configuration GitHub Pages - Étapes Détaillées

Guide pas-à-pas pour déployer votre frontend sur GitHub Pages.

---

## ✅ Étape 1 : Configurer le Secret GitHub

### 1.1 Aller sur GitHub

1. Ouvrez : https://github.com/ezakariaa/MegaMix
2. Cliquez sur **"Settings"** (en haut du dépôt)

### 1.2 Accéder aux Secrets

1. Dans le menu de gauche, cliquez sur **"Secrets and variables"**
2. Cliquez sur **"Actions"**

### 1.3 Créer le Secret

1. Cliquez sur **"New repository secret"** (bouton vert)
2. Remplissez :
   - **Name** : `VITE_API_URL`
   - **Secret** : `https://effective-donni-opticode-1865a644.koyeb.app`
   
   ⚠️ **Important** : 
   - Ne mettez **PAS** `/api` à la fin
   - Pas d'espace avant/après
   - Commencez par `https://`

3. Cliquez sur **"Add secret"**

✅ **Résultat** : Vous verrez `VITE_API_URL` dans la liste des secrets

---

## ✅ Étape 2 : Vérifier la Configuration Vite

Le fichier `client/vite.config.ts` a déjà été configuré avec :
- Base URL : `/MegaMix/` (pour GitHub Pages)
- Configuration de production automatique

✅ **Aucune action nécessaire** - C'est déjà fait !

---

## ✅ Étape 3 : Activer GitHub Pages

### 3.1 Accéder aux Paramètres Pages

1. Sur GitHub : https://github.com/ezakariaa/MegaMix
2. **Settings** → **Pages** (menu de gauche)

### 3.2 Configurer la Source

1. **Source** : Sélectionnez **"GitHub Actions"**
2. Cliquez sur **"Save"**

✅ **Résultat** : GitHub Pages est activé et utilisera le workflow automatique

---

## ✅ Étape 4 : Pousser le Code

Poussez les modifications sur GitHub pour déclencher le déploiement :

```bash
cd C:\Users\Amine\Desktop\MegaMix\MegaMix

# Vérifier les modifications
git status

# Ajouter les fichiers modifiés
git add client/vite.config.ts
git add client/public/404.html
git add CONFIGURATION_GITHUB_PAGES.md
git add ETAPES_GITHUB_PAGES.md

# Créer un commit
git commit -m "Configuration GitHub Pages avec base URL"

# Pousser sur GitHub
git push origin main
```

---

## ✅ Étape 5 : Vérifier le Déploiement

### 5.1 Surveiller le Workflow

1. **Allez dans l'onglet "Actions"** sur GitHub
2. **Cliquez sur le workflow "Deploy to GitHub Pages"** qui est en cours
3. **Surveillez les étapes** :
   - ✅ Checkout
   - ✅ Setup Node.js
   - ✅ Install dependencies
   - ✅ Build (avec `VITE_API_URL`)
   - ✅ Setup Pages
   - ✅ Upload artifact
   - ✅ Deploy to GitHub Pages

### 5.2 Attendre la Fin

⏱️ **Temps estimé** : 2-3 minutes

### 5.3 Vérifier le Résultat

Une fois terminé, vous verrez :
```
✅ Deploy to GitHub Pages
```

Votre site sera disponible à :
```
https://ezakariaa.github.io/MegaMix
```

---

## ✅ Étape 6 : Tester Votre Site

### 6.1 Ouvrir le Site

Ouvrez dans votre navigateur :
```
https://ezakariaa.github.io/MegaMix
```

### 6.2 Vérifier

✅ Le site s'affiche  
✅ La navigation fonctionne  
✅ Les données se chargent depuis le backend Koyeb  

### 6.3 Vérifier la Console

1. **Appuyez sur F12** pour ouvrir les outils développeur
2. **Onglet "Console"**
3. **Vérifiez** qu'il n'y a pas d'erreurs
4. **Onglet "Network"** → Vérifiez que les appels API partent vers :
   ```
   https://effective-donni-opticode-1865a644.koyeb.app/api/...
   ```

---

## 🆘 Dépannage

### Le workflow échoue

**Vérifiez** :
1. Le secret `VITE_API_URL` est bien configuré
2. L'URL du backend est correcte (sans `/api` à la fin)
3. Le workflow a accès aux permissions Pages

### Le site ne s'affiche pas

**Vérifiez** :
1. GitHub Pages est activé (Settings → Pages)
2. Le déploiement est terminé (Actions)
3. L'URL est correcte : `https://ezakariaa.github.io/MegaMix`

### Les données ne se chargent pas

**Vérifiez** :
1. `ALLOWED_ORIGINS=*` est configuré sur Koyeb
2. L'URL du backend dans le secret est correcte
3. La console du navigateur pour les erreurs CORS

### Erreur 404 sur les routes

**Vérifiez** :
1. Le fichier `client/public/404.html` existe
2. La base URL dans `vite.config.ts` correspond au nom du dépôt

---

## ✅ Checklist Finale

- [ ] Secret `VITE_API_URL` créé sur GitHub
- [ ] GitHub Pages activé (Source: GitHub Actions)
- [ ] Code poussé sur GitHub
- [ ] Workflow déployé avec succès
- [ ] Site accessible sur `https://ezakariaa.github.io/MegaMix`
- [ ] Les données se chargent depuis le backend
- [ ] La navigation fonctionne correctement

---

## 🎉 Félicitations !

Votre application est maintenant déployée :

🌐 **Frontend** : https://ezakariaa.github.io/MegaMix  
🔧 **Backend** : https://effective-donni-opticode-1865a644.koyeb.app  

Vous pouvez partager l'URL GitHub Pages avec vos amis ! 🚀

