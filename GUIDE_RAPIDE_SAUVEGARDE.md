# 💾 Guide Rapide : Sauvegarde Avant Redéploiement

## ⚡ En 3 Étapes

### 1️⃣ Sauvegarder

```powershell
.\backup-koyeb-data.ps1
```

### 2️⃣ Redéployer

Faites vos modifications et poussez vers GitHub :
```bash
git add .
git commit -m "Mes modifications"
git push
```

### 3️⃣ Vérifier ou Restaurer

**Si les données sont toujours là** ✅ : Rien à faire !

**Si les données ont disparu** ❌ : Restaurez
```powershell
.\restore-koyeb-data.ps1 -BackupPath "backups/koyeb-YYYY-MM-DD_HH-mm-ss"
```

## 🔄 Alternative : Synchronisation Automatique

Avec la synchronisation automatique en place :
- ✅ Vos données locales (`server/data/`) sont aussi une sauvegarde
- ✅ Les ajouts/suppressions sont automatiquement synchronisés
- ✅ Vous pouvez restaurer depuis vos données locales avec `import-data.ps1`

## 📋 Checklist Express

- [ ] `.\backup-koyeb-data.ps1` → Sauvegarde
- [ ] Modifications de code
- [ ] `git push` → Redéploiement
- [ ] Vérifier le site
- [ ] Restaurer si nécessaire

## 💡 Astuce

Sauvegardez **avant chaque redéploiement important**. Mieux vaut prévenir que guérir ! 🛡️

