# 🛡️ Protection des Données lors des Redéploiements

## ⚠️ Problème Identifié

Sur Koyeb (plan gratuit), lors d'un redéploiement, le système de fichiers peut être réinitialisé, ce qui peut entraîner la perte des données stockées dans `server/data/`.

## ✅ Solutions Disponibles

### Solution 1 : Sauvegarde Avant Redéploiement (Recommandé)

**Toujours sauvegarder avant de redéployer !**

```powershell
# 1. Sauvegarder les données depuis Koyeb
.\backup-koyeb-data.ps1

# 2. Faire vos modifications et redéployer

# 3. Si les données ont disparu, restaurer
.\restore-koyeb-data.ps1 -BackupPath "backups/koyeb-YYYY-MM-DD_HH-mm-ss"
```

### Solution 2 : Synchronisation Automatique (Déjà en Place)

Grâce à la synchronisation automatique :
- ✅ Quand vous ajoutez un album en local → Il est automatiquement synchronisé avec Koyeb
- ✅ Quand vous supprimez un album en local → Il est automatiquement supprimé sur Koyeb

**Avantage** : Vos données locales dans `server/data/` servent aussi de sauvegarde !

### Solution 3 : Export/Import Manuel

Si vous préférez le faire manuellement :

1. **Exporter depuis Koyeb** :
   - Ouvrez : `https://effective-donni-opticode-1865a644.koyeb.app/api/music/export-data`
   - Sauvegardez la réponse JSON

2. **Importer après redéploiement** :
   - Utilisez le script `import-data.ps1` pour restaurer

## 📋 Checklist Complète Avant Redéploiement

- [ ] **Sauvegarder les données depuis Koyeb** : `.\backup-koyeb-data.ps1`
- [ ] **Vérifier la sauvegarde** : Les fichiers sont dans `backups/`
- [ ] **Faire vos modifications de code**
- [ ] **Tester localement** si possible
- [ ] **Push vers GitHub** (Koyeb redéploiera automatiquement)
- [ ] **Attendre le redéploiement** (2-5 minutes)
- [ ] **Vérifier que les données sont toujours là** sur le site
- [ ] **Si perte de données** : `.\restore-koyeb-data.ps1 -BackupPath "chemin"`

## 🔄 Workflow Recommandé

### Scénario 1 : Redéploiement avec Modification de Code

1. **Sauvegarde** : `.\backup-koyeb-data.ps1`
2. **Modifications** : Changez votre code
3. **Commit & Push** : `git add . && git commit -m "..." && git push`
4. **Vérification** : Vérifiez que les données sont toujours présentes
5. **Restauration si nécessaire** : Utilisez le script de restauration

### Scénario 2 : Redéploiement d'Urgence (sans sauvegarde)

1. **Télécharger les données** : Utilisez `backup-koyeb-data.ps1` immédiatement
2. **Redéployer** : Faites votre redéploiement
3. **Restaurer** : Utilisez `restore-koyeb-data.ps1` avec la sauvegarde

### Scénario 3 : Perte de Données Après Redéploiement

1. **Trouver la dernière sauvegarde** : Dans `backups/`
2. **Restaurer** : `.\restore-koyeb-data.ps1 -BackupPath "backups/derniere-sauvegarde"`
3. **Vérifier** : Rafraîchir le site

## 📁 Structure des Sauvegardes

```
backups/
  ├── koyeb-2024-01-15_14-30-00/
  │   ├── albums.json
  │   ├── tracks.json
  │   └── artists.json
  ├── koyeb-2024-01-15_14-30-00.zip
  ├── koyeb-2024-01-16_10-15-00/
  └── ...
```

## 🎯 Points Importants

1. **Les données locales sont aussi une sauvegarde** : Votre dossier `server/data/` contient une copie de vos données
2. **Synchronisation automatique** : Les ajouts/suppressions sont automatiquement synchronisés
3. **Sauvegarde avant redéploiement** : Toujours sauvegarder avant de modifier le code
4. **Plusieurs sauvegardes** : Gardez plusieurs sauvegardes pour plus de sécurité

## 🔧 Configuration

Si votre URL Koyeb change, modifiez les scripts :

```powershell
# Dans backup-koyeb-data.ps1 et restore-koyeb-data.ps1
$koyebUrl = "https://votre-nouvelle-url.koyeb.app"
```

## ✅ Résumé

**Pour éviter de perdre vos albums lors d'un redéploiement :**

1. ✅ Sauvegardez toujours avec `backup-koyeb-data.ps1` avant de redéployer
2. ✅ Vos données locales sont aussi une sauvegarde
3. ✅ La synchronisation automatique maintient vos données à jour
4. ✅ En cas de perte, restaurez avec `restore-koyeb-data.ps1`

