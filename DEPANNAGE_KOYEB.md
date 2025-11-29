# 🔧 Dépannage Déploiement Koyeb

## ❌ Erreur : Build Failed (Exit Code 51)

### Solutions à essayer :

### Solution 1 : Vérifier la configuration Koyeb

Dans Koyeb, vérifiez que :

1. **Work Directory** : `server` ✅
2. **Build Command** : `npm install && npm run build` ✅
3. **Run Command** : `npm start` ✅

### Solution 2 : TypeScript dans dependencies

J'ai modifié `server/package.json` pour mettre `typescript` dans `dependencies` au lieu de `devDependencies`, car Koyeb n'installe peut-être pas les devDependencies en production.

**Action requise** :
1. Poussez les changements :
   ```bash
   git add server/package.json server/.nvmrc
   git commit -m "Fix: TypeScript dans dependencies pour Koyeb"
   git push origin master
   ```
2. Redéployez sur Koyeb (il devrait redéployer automatiquement)

### Solution 3 : Ajouter un script postinstall

J'ai ajouté `"postinstall": "npm run build"` dans package.json pour que le build se fasse automatiquement après l'installation.

### Solution 4 : Vérifier localement

Testez que ça build localement :

```bash
cd server
npm install
npm run build
npm start
```

Si ça fonctionne localement, le problème vient de la configuration Koyeb.

### Solution 5 : Utiliser un Dockerfile (Alternative)

Si le buildpack ne fonctionne toujours pas, créez un Dockerfile :

**Créez `server/Dockerfile`** :
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY tsconfig.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY src ./src

# Builder
RUN npm run build

# Exposer le port
EXPOSE 8080

# Démarrer
CMD ["npm", "start"]
```

Puis dans Koyeb :
- **Builder type** : `Dockerfile`
- **Dockerfile path** : `server/Dockerfile`

---

## 🔍 Vérifications

1. ✅ Le dossier `server/` contient bien `package.json`
2. ✅ Le fichier `.nvmrc` existe avec `20`
3. ✅ TypeScript est dans `dependencies`
4. ✅ Le script `postinstall` est présent

---

## 🚀 Prochaines Étapes

1. **Poussez les changements** :
   ```bash
   git add .
   git commit -m "Fix configuration Koyeb"
   git push origin master
   ```

2. **Sur Koyeb** :
   - Le service devrait redéployer automatiquement
   - Ou cliquez sur "Redeploy"

3. **Vérifiez les logs** si disponible

---

## ⚠️ Si ça ne fonctionne toujours pas

Essayez **Render** à la place (voir `GUIDE_RENDER.md`) - il est souvent plus tolérant avec les configurations.

