# ⚡ Import Rapide des Données

## 🚀 Méthode la Plus Simple

J'ai créé un script PowerShell pour importer automatiquement vos données.

### Étape 1 : Pousser le Code avec les Nouveaux Endpoints

```powershell
cd C:\Users\Amine\Desktop\MegaMix\MegaMix

git add server/src/routes/music.ts

git commit -m "Ajouter endpoints import/export de données"

git push origin main
```

**Attendez 2-3 minutes** que Koyeb redéploie le backend.

### Étape 2 : Exécuter le Script d'Import

```powershell
cd C:\Users\Amine\Desktop\MegaMix\MegaMix

.\import-data.ps1
```

C'est tout ! Le script va :
- ✅ Lire vos fichiers JSON locaux
- ✅ Les envoyer vers Koyeb
- ✅ Afficher le résultat

---

## ✅ Vérification

Après l'import :

1. **Rafraîchissez votre site** : https://ezakariaa.github.io/MegaMix/
2. **Vérifiez** que vos albums s'affichent

---

## 🔄 Si les Données Disparaissent

**Important** : Sur Koyeb gratuit, les données ne persistent pas entre les redémarrages.

Si les données disparaissent :
1. Réexécutez simplement : `.\import-data.ps1`
2. Vos données seront réimportées

**Astuce** : Gardez vos fichiers JSON locaux comme sauvegarde !

---

## 📝 Alternative : Import Manuel

Si le script ne fonctionne pas, consultez `GUIDE_IMPORT_DONNEES.md` pour les méthodes manuelles.

