# 🔄 Synchronisation Automatique avec Koyeb

## 📋 Description

Lorsque vous ajoutez un album depuis Google Drive en local, celui-ci est automatiquement synchronisé avec votre backend déployé sur Koyeb. Cela permet de maintenir vos données locales et distantes synchronisées sans intervention manuelle.

## ⚙️ Configuration

### 1. Ajouter la variable d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server/` :

```env
KOYEB_URL=https://effective-donni-opticode-1865a644.koyeb.app
```

Ou utilisez la variable `VITE_API_URL` si elle est déjà configurée :

```env
VITE_API_URL=https://effective-donni-opticode-1865a644.koyeb.app
```

### 2. Redémarrer le serveur

Après avoir configuré la variable d'environnement, redémarrez votre serveur local :

```bash
cd server
npm run dev
```

## 🎯 Fonctionnement

### Lors de l'ajout d'un album depuis Google Drive

1. **Ajout local** : L'album est ajouté à votre bibliothèque locale et sauvegardé dans `server/data/`
2. **Synchronisation automatique** : Immédiatement après, les données sont envoyées à Koyeb en arrière-plan
3. **Pas de blocage** : La synchronisation ne bloque pas l'ajout local, même en cas d'erreur

### Lors de la suppression d'un album

1. **Suppression locale** : L'album est supprimé de votre bibliothèque locale
2. **Synchronisation automatique** : Immédiatement après, l'état complet des données (sans l'album supprimé) est envoyé à Koyeb en arrière-plan
3. **Pas de blocage** : La synchronisation ne bloque pas la suppression locale, même en cas d'erreur

### Comportement

- ✅ **Si Koyeb est accessible** : Les données sont synchronisées automatiquement (ajout ET suppression)
- ⚠️ **Si Koyeb n'est pas accessible** : Les opérations locales fonctionnent quand même, l'erreur est seulement loggée
- 🔄 **Mode production sur Koyeb** : La synchronisation est automatiquement désactivée pour éviter les boucles

## 📝 Logs

Les logs de synchronisation apparaissent dans la console du serveur :

```
[SYNC KOYEB] Synchronisation vers https://...koyeb.app/api/music/import-data...
[SYNC KOYEB] Synchronisation réussie: 5 albums, 45 tracks, 10 artists
```

En cas d'erreur :

```
[SYNC KOYEB] Erreur lors de la synchronisation après ajout Google Drive: ...
```

## 🔧 Désactiver la synchronisation

Pour désactiver la synchronisation automatique, supprimez ou videz la variable d'environnement :

```env
KOYEB_URL=
```

Ou commentez la ligne dans votre `.env` :

```env
# KOYEB_URL=https://effective-donni-opticode-1865a644.koyeb.app
```

## ✅ Avantages

- **Synchronisation automatique** : Plus besoin d'exécuter le script `import-data.ps1` manuellement
- **Ajout ET suppression synchronisés** : Toutes les modifications locales sont automatiquement reflétées sur Koyeb
- **Transparent** : Fonctionne en arrière-plan sans bloquer les opérations locales
- **Robuste** : Les erreurs de synchronisation n'affectent pas les opérations locales
- **Performant** : La synchronisation est asynchrone et ne ralentit pas l'interface

## 🚀 Utilisation

Une fois configuré :
- **Ajoutez** un album depuis Google Drive → Il sera automatiquement synchronisé avec Koyeb
- **Supprimez** un album en local → Il sera automatiquement supprimé sur Koyeb

Tout se fait automatiquement en arrière-plan !

