# 🔧 Solution : Créer le package-lock.json pour Buildpack

Le problème : **Buildpack nécessite un `package-lock.json`** dans le dossier `server/`.

## 🚀 Solution : Modifier la Commande Build

Sur Koyeb, modifiez la **Build Command** pour créer le lockfile automatiquement.

### Configuration sur Koyeb

1. **Allez dans** : **Settings** → **Build**
2. **Build Command** : Remplacez par :

```bash
cd /builder/workspace && npm install --package-lock-only && npm install && npm run build
```

**OU** une version plus simple :

```bash
npm install --package-lock-only && npm install && npm run build
```

**OU** encore plus simple (Koyeb devrait gérer ça automatiquement) :

```bash
npm ci || (npm install && npm run build)
```

---

## ✅ Solution Recommandée (La Plus Simple)

**Build Command** :
```bash
npm install && npm run build
```

**Mais d'abord**, créons le `package-lock.json` manuellement sur votre machine et poussons-le sur GitHub :

```bash
cd server
rm -rf node_modules  # Supprimer node_modules
npm install          # Créer package-lock.json
git add package-lock.json
git commit -m "Ajouter package-lock.json pour Buildpack"
git push
```

---

## 🎯 Alternative : Utiliser Dockerfile

Si Buildpack continue à poser problème, revenez au **Dockerfile** qui ne nécessite pas de lockfile.

1. **Builder type** : `Dockerfile`
2. **Dockerfile location** : `server/Dockerfile`
3. **Work directory** : (vide - désactivé)

---

## 📝 Note

Le `package-lock.json` est important pour :
- ✅ Reproduire les mêmes versions de dépendances
- ✅ Builds plus rapides (cache)
- ✅ Sécurité (versions verrouillées)

