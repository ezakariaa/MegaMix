# 💾 Sauvegarde des Données Koyeb

## ⚠️ Important : Persistance des Données sur Koyeb

Sur Koyeb (plan gratuit), les données peuvent être perdues lors d'un redéploiement si le volume n'est pas persistant. Pour éviter cela, **sauvegardez toujours vos données avant de redéployer**.

## 🔄 Solutions pour Préserver vos Données

### Solution 1 : Sauvegarde Automatique Avant Redéploiement (Recommandé)

Avant chaque redéploiement, exécutez le script de sauvegarde :

```powershell
.\backup-koyeb-data.ps1
```

Ce script :
- ✅ Exporte toutes les données depuis Koyeb
- ✅ Sauvegarde dans `backups/koyeb-YYYY-MM-DD_HH-mm-ss/`
- ✅ Crée aussi un fichier ZIP de la sauvegarde
- ✅ Affiche un récapitulatif

### Solution 2 : Restauration Après Redéploiement

Si vous avez perdu des données, restaurez-les depuis une sauvegarde :

```powershell
.\restore-koyeb-data.ps1 -BackupPath "backups/koyeb-2024-01-15_14-30-00"
```

Ou depuis un ZIP :

```powershell
.\restore-koyeb-data.ps1 -BackupPath "backups/koyeb-2024-01-15_14-30-00.zip"
```

## 📋 Procédure Complète de Redéploiement Sécurisé

### Étape 1 : Sauvegarder les Données

```powershell
.\backup-koyeb-data.ps1
```

Notez le chemin de la sauvegarde (affiché à la fin).

### Étape 2 : Redéployer sur Koyeb

1. Faites vos modifications de code
2. Push vers GitHub
3. Koyeb redéploiera automatiquement

### Étape 3 : Vérifier que les Données Sont Toujours Là

1. Ouvrez votre site : `https://ezakariaa.github.io/MegaMix/`
2. Vérifiez que vos albums sont toujours présents

### Étape 4 : Restaurer si Nécessaire

Si les données ont disparu :

```powershell
.\restore-koyeb-data.ps1 -BackupPath "chemin/de/votre/sauvegarde"
```

## 🔄 Synchronisation Automatique

Rappel : La synchronisation automatique est déjà en place ! Lorsque vous ajoutez un album en local, il est automatiquement synchronisé avec Koyeb. Cela permet de maintenir vos données à jour sans avoir à restaurer manuellement.

## 📝 Structure des Sauvegardes

Les sauvegardes sont stockées dans :

```
backups/
  └── koyeb-2024-01-15_14-30-00/
      ├── albums.json
      ├── tracks.json
      └── artists.json
  └── koyeb-2024-01-15_14-30-00.zip  (archive)
```

## 🎯 Bonnes Pratiques

1. **Sauvegardez régulièrement** : Avant chaque redéploiement important
2. **Gardez plusieurs sauvegardes** : Ne supprimez pas les anciennes sauvegardes tout de suite
3. **Testez la restauration** : Vérifiez qu'une sauvegarde fonctionne avant de supprimer les autres
4. **Synchronisation locale** : Vos données locales dans `server/data/` sont aussi une sauvegarde

## 🔧 Configuration du Script

Si votre URL Koyeb change, modifiez la variable dans les scripts :

```powershell
$koyebUrl = "https://votre-nouvelle-url.koyeb.app"
```

## ✅ Checklist Avant Redéploiement

- [ ] Exécuter `.\backup-koyeb-data.ps1`
- [ ] Vérifier que la sauvegarde a réussi
- [ ] Noter le chemin de la sauvegarde
- [ ] Faire les modifications de code
- [ ] Push vers GitHub
- [ ] Vérifier que les données sont toujours présentes après redéploiement
- [ ] Si perte de données : restaurer avec `.\restore-koyeb-data.ps1`

