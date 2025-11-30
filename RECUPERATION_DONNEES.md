# 🔄 Récupération des Données Perdues

## ⚠️ Situation Actuelle

Vous avez perdu vos albums après que le backend Koyeb se soit arrêté. Voici comment les récupérer.

---

## 🔍 Étape 1 : Vérifier les Sauvegardes Locales

### Option A : Vérifier `server/data/`

```powershell
# Vérifiez si vous avez des données locales
ls server/data/

# Si vous voyez albums.json, tracks.json, artists.json
# Vos données sont là ! Il suffit de les importer
```

### Option B : Vérifier les Sauvegardes

```powershell
# Vérifiez les sauvegardes
ls backups/

# Si vous avez des sauvegardes, vous pouvez les restaurer
```

---

## ✅ Étape 2 : Restaurer depuis les Données Locales

Si vous avez des fichiers dans `server/data/` :

```powershell
# 1. Vérifiez que votre backend Koyeb est actif
# Ouvrez : https://effective-donni-opticode-1865a644.koyeb.app/api/health

# 2. Si le backend répond, importez les données
.\import-data.ps1
```

---

## ✅ Étape 3 : Restaurer depuis une Sauvegarde

Si vous avez une sauvegarde dans `backups/` :

```powershell
# 1. Trouvez la dernière sauvegarde
ls backups/

# 2. Restaurez-la (remplacez le chemin par votre sauvegarde)
.\restore-koyeb-data.ps1 -BackupPath "backups\koyeb-2025-11-29_23-23-58"
```

---

## 🚀 Étape 4 : Redémarrer le Backend Koyeb

Si le backend est arrêté :

1. Allez sur : https://www.koyeb.com
2. Connectez-vous à votre compte
3. Trouvez votre service
4. Cliquez sur **"Redeploy"** ou **"Restart"**
5. Attendez 2-3 minutes
6. Testez : `https://effective-donni-opticode-1865a644.koyeb.app/api/health`

---

## 🔄 Étape 5 : Si Aucune Sauvegarde n'Existe

Si vous n'avez aucune sauvegarde :

### Option A : Re-ajouter depuis Google Drive

Si vos albums sont toujours sur Google Drive :

1. Ouvrez votre site
2. Allez dans **"Bibliothèque"**
3. Cliquez sur le bouton **Google Drive** (icône cloud)
4. Collez les liens Google Drive de vos albums
5. Les albums seront re-ajoutés automatiquement

### Option B : Re-uploader les Fichiers

Si vous avez les fichiers audio en local :

1. Ouvrez votre site
2. Allez dans **"Bibliothèque"**
3. Glissez-déposez vos dossiers de musique
4. Les albums seront scannés et ajoutés

---

## 🛡️ Étape 6 : Prévenir la Perte Future

### Solution Immédiate : Migrer vers Railway

Suivez le guide `ALTERNATIVES_KOYEB.md` pour migrer vers Railway, qui :
- ✅ Ne s'arrête jamais
- ✅ Persiste les données
- ✅ Est gratuit

### Solution Long Terme : Utiliser MongoDB Atlas

Pour une persistance garantie, utilisez MongoDB Atlas (voir `ALTERNATIVES_KOYEB.md`).

---

## 📋 Checklist de Récupération

- [ ] Vérifier `server/data/` pour des données locales
- [ ] Vérifier `backups/` pour des sauvegardes
- [ ] Redémarrer le backend Koyeb si nécessaire
- [ ] Importer les données locales si disponibles
- [ ] Restaurer depuis une sauvegarde si disponible
- [ ] Re-ajouter les albums depuis Google Drive si nécessaire
- [ ] Planifier la migration vers Railway pour éviter le problème à l'avenir

---

## 🆘 Si Rien ne Fonctionne

Si vous ne pouvez pas récupérer vos données :

1. **Vérifiez Google Drive** : Vos fichiers audio sont-ils toujours là ?
2. **Re-ajoutez progressivement** : Ajoutez les albums les plus importants d'abord
3. **Créez des sauvegardes régulières** : Utilisez `backup-koyeb-data.ps1` régulièrement
4. **Migrez vers Railway** : Pour éviter que cela se reproduise

---

## 💡 Astuce : Sauvegarde Automatique

Pour éviter de perdre vos données à l'avenir, créez une tâche planifiée Windows :

```powershell
# Créez un script de sauvegarde automatique
# Sauvegarde automatique tous les jours à 2h du matin
```

Ou utilisez GitHub Actions pour sauvegarder automatiquement (voir `SYNCHRONISATION_KOYEB.md`).

---

## ✅ Résumé Rapide

1. **Vérifiez** `server/data/` → Si oui, utilisez `import-data.ps1`
2. **Vérifiez** `backups/` → Si oui, utilisez `restore-koyeb-data.ps1`
3. **Redémarrez** Koyeb si nécessaire
4. **Re-ajoutez** depuis Google Drive si nécessaire
5. **Migrez** vers Railway pour éviter le problème

