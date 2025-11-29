# 🔧 Configuration Dockerfile sur Koyeb - CORRECT

## ⚠️ Le Problème

L'erreur indique que Docker ne trouve pas les fichiers :
- `"/tsconfig.json": not found`
- `"/src": not found`

C'est parce que le **"Work directory"** est configuré sur `server`, ce qui fait que Docker cherche les fichiers au mauvais endroit.

---

## ✅ Solution : Désactiver le Work Directory

### Sur Koyeb :

1. **Allez dans** : **Settings** → **Build**
2. **Configuration** :
   
   | Paramètre | Valeur | Note |
   |-----------|--------|------|
   | **Builder type** | `Dockerfile` | ✅ |
   | **Dockerfile location** | `server/Dockerfile` | ✅ Override activé |
   | **Work directory override** | ❌ **DÉSACTIVÉ** | ⚠️ **IMPORTANT !** |
   | **Work directory** | (vide) | Laisser vide |

3. **Cliquez sur "Save"**
4. **Allez dans "Overview"** et cliquez sur **"Redeploy"**

---

## 🎯 Pourquoi ?

Avec **Dockerfile** :
- Le **contexte de build** est automatiquement la **racine du projet** (où se trouve `.git`)
- Le Dockerfile indique `server/Dockerfile`, donc Docker sait où le trouver
- Les chemins dans le Dockerfile sont **relatifs au contexte** (racine)
- Le **Work directory** interfère et fait chercher dans `server/server/` au lieu de `server/`

**Donc** : Ne configurez **PAS** le Work directory avec Dockerfile !

---

## ✅ Vérification

Une fois redéployé, testez :
```
https://effective-donni-opticode-1865a644.koyeb.app/api/health
```

---

## 🔄 Si ça ne fonctionne toujours pas

Essayez de modifier le Dockerfile pour utiliser des chemins explicites :

```dockerfile
# À la place de COPY tsconfig.json ./
# Utilisez :
COPY server/tsconfig.json ./
COPY server/package.json ./
COPY server/src ./src
```

Mais normalement, avec le Work directory désactivé, ça devrait fonctionner !

