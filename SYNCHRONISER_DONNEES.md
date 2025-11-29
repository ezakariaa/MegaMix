# 📊 Synchroniser les Données Locales vers Koyeb

Vos albums sont stockés localement dans `server/data/`, mais le backend Koyeb a un dossier `data/` vide.

---

## 🎯 Solution : Créer un Endpoint d'Import

Je vais créer un endpoint API pour importer vos données locales vers le backend Koyeb.

---

## 📋 Étapes

### Étape 1 : Créer l'Endpoint d'Import

Je vais ajouter une route `/api/music/import-data` qui accepte les données JSON.

### Étape 2 : Exporter vos Données Locales

Copiez le contenu de vos fichiers JSON locaux.

### Étape 3 : Importer vers Koyeb

Utilisez l'endpoint pour envoyer les données au backend Koyeb.

---

## ⚠️ Note Importante

**Koyeb (plan gratuit) ne persiste pas les fichiers** entre les redémarrages. Les données seront perdues si :
- Le service redémarre
- Le service est mis à jour
- Le service est supprimé

**Solutions durables** :
1. Utiliser une base de données externe (MongoDB Atlas gratuit, Supabase, etc.)
2. Utiliser un service de stockage (Cloudinary pour les images, etc.)
3. Re-ajouter les albums via l'interface (si peu d'albums)

---

## 🚀 Solution Temporaire : Endpoint d'Import

Pour l'instant, créons un endpoint d'import pour que vous puissiez synchroniser vos données.

