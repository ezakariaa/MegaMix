# 🚀 Guide Complet : Configuration Koyeb (Avec Dockerfile)

## 📋 Étape 1 : Vérifier les Fichiers

Assurez-vous que ces fichiers existent :

- ✅ `server/Dockerfile` (créé)
- ✅ `server/.dockerignore` (créé)
- ✅ `server/package.json` (déjà existant)
- ✅ `server/tsconfig.json` (déjà existant)

---

## 📤 Étape 2 : Pousser le Code sur GitHub

Si vous avez modifié des fichiers, poussez-les :

```bash
git add server/Dockerfile server/.dockerignore server/package.json
git commit -m "Ajout Dockerfile pour Koyeb"
git push origin master
```

---

## 🔧 Étape 3 : Configurer Koyeb avec Dockerfile

### 3.1. Allez sur Koyeb

1. **Ouvrez** : https://app.koyeb.com
2. **Connectez-vous** à votre compte
3. **Allez dans votre service** qui a échoué (ou créez-en un nouveau)

### 3.2. Modifier le Builder Type

1. **Cliquez sur votre service**
2. **Allez dans** : **"Settings"** (ou **"Configuration"**)
3. **Section** : **"Build"** ou **"Customize Buildpack settings"**
4. **Changez** :
   - **Builder type** : De **"Buildpack"** → **"Dockerfile"**
   - **Dockerfile path** : `server/Dockerfile`
5. **Cliquez sur** : **"Save"** ou **"Update"**

### 3.3. Vérifier les Variables d'Environnement

1. **Allez dans** : **"Environment"** ou **"Variables"**
2. **Vérifiez/ajoutez** :

```
NODE_ENV = production
ALLOWED_ORIGINS = *
```

**Si vous avez les clés API** (optionnel) :
```
GOOGLE_API_KEY = votre_cle_ici
LASTFM_API_KEY = votre_cle_ici
FANART_API_KEY = votre_cle_ici
```

⚠️ **Important** : Ne définissez **PAS** `PORT` - Koyeb le gère automatiquement !

### 3.4. Vérifier le Work Directory

1. **Allez dans** : **"Settings"** → **"General"**
2. **Work Directory** : Devrait être vide (ou `server` si vous continuez avec Buildpack)

**Avec Dockerfile**, le work directory est géré dans le Dockerfile lui-même, donc laissez vide ou `server`.

---

## 🚀 Étape 4 : Redéployer

1. **Cliquez sur** : **"Redeploy"** ou **"Deploy"**
2. **Attendez** 3-5 minutes pour le build
3. **Surveillez les logs** pour voir la progression

---

## ✅ Étape 5 : Vérifier le Déploiement

### 5.1. Vérifier que le Service est Running

Dans l'onglet **"Overview"** :
- Le statut devrait être **"Running"** (vert)
- **Public URL** devrait être affichée (ex: `https://votre-app.koyeb.app`)

### 5.2. Tester l'API

Ouvrez dans votre navigateur :
```
https://votre-app.koyeb.app/api/health
```

Vous devriez voir :
```json
{"status":"OK","message":"MuZak Server is running"}
```

✅ **Si vous voyez ça, c'est bon !**

---

## 🆘 Dépannage

### Le Build Échoue Toujours

**Vérifiez les logs** :
1. **Allez dans** : **"Logs"**
2. **Regardez les erreurs** de build

**Problèmes communs** :

#### Erreur : "Cannot find module 'typescript'"
**Solution** : TypeScript est déjà dans `dependencies` dans `package.json`, donc normalement ça devrait fonctionner. Vérifiez que le fichier est bien poussé sur GitHub.

#### Erreur : "Dockerfile not found"
**Solution** : 
- Vérifiez que le Dockerfile est dans `server/Dockerfile`
- Vérifiez le path dans Koyeb : `server/Dockerfile`

#### Erreur : "Build failed"
**Solution** :
- Vérifiez les logs pour voir l'erreur exacte
- Testez le build localement :
  ```bash
  cd server
  docker build -t test-megamix .
  ```

### Le Service Ne Démarre Pas

**Vérifiez** :
1. Les **logs** dans Koyeb
2. Les **variables d'environnement**
3. Que `PORT` n'est **pas** défini (Koyeb le gère)

### Erreur 500 sur l'API

**Vérifiez** :
1. Les logs du service
2. Que toutes les dépendances sont installées
3. Que les dossiers `data` et `uploads` sont créés

---

## 📝 Configuration Finale Koyeb

### Résumé de la Configuration

| Paramètre | Valeur |
|-----------|--------|
| **Builder type** | `Dockerfile` |
| **Dockerfile path** | `server/Dockerfile` |
| **Work Directory** | (vide ou `server`) |
| **Variables** | `NODE_ENV=production`, `ALLOWED_ORIGINS=*` |
| **Port** | (géré automatiquement par Koyeb) |

---

## 🎨 Étape 6 : Configurer le Frontend

Une fois le backend déployé sur Koyeb :

1. **Notez l'URL** : `https://votre-app.koyeb.app`

2. **Configurez GitHub Pages** :
   - Dans votre repo GitHub : **Settings** → **Secrets and variables** → **Actions**
   - Créez un secret : `VITE_API_URL` = `https://votre-app.koyeb.app`

3. **Activez GitHub Pages** :
   - **Settings** → **Pages**
   - **Source** : `GitHub Actions`

4. **Poussez le code** :
   ```bash
   git push origin master
   ```

Le workflow déploiera automatiquement le frontend avec la bonne URL backend.

---

## 🎉 Félicitations !

Votre backend devrait maintenant être déployé sur Koyeb ! 🚀

**Prochaine étape** : Configurez le frontend GitHub Pages avec l'URL Koyeb.

