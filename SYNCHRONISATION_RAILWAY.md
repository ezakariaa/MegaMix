# 🔄 Synchronisation Automatique avec Railway

## 📋 Description

Lorsque vous ajoutez ou supprimez un album en local, les modifications sont automatiquement synchronisées avec votre backend déployé sur Railway. Cela permet de maintenir vos données locales et distantes synchronisées sans intervention manuelle.

**Synchronisation bidirectionnelle** :
- ✅ **Local → Railway** : Ajout/suppression en local → Synchronisé automatiquement vers Railway
- ✅ **Railway → Local** : Les modifications sur Railway (via le site web) sont déjà visibles par tous

---

## ⚙️ Configuration

### 1. Ajouter la variable d'environnement

Créez ou modifiez le fichier `.env` dans le dossier `server/` :

```env
RAILWAY_URL=https://muzak-server-production.up.railway.app
```

**OU** utilisez la variable `VITE_API_URL` si elle est déjà configurée :

```env
VITE_API_URL=https://muzak-server-production.up.railway.app
```

**Note** : Pour compatibilité avec l'ancien système Koyeb, vous pouvez aussi utiliser :
```env
KOYEB_URL=https://muzak-server-production.up.railway.app
```

### 2. Redémarrer le serveur

Après avoir configuré la variable d'environnement, redémarrez votre serveur local :

```bash
cd server
npm run dev
```

---

## 🎯 Fonctionnement

### Lors de l'ajout d'un album

1. **Ajout local** : L'album est ajouté à votre bibliothèque locale et sauvegardé dans `server/data/`
2. **Synchronisation automatique** : Immédiatement après, les données sont envoyées à Railway en arrière-plan
3. **Pas de blocage** : La synchronisation ne bloque pas l'ajout local, même en cas d'erreur

### Lors de la suppression d'un album

1. **Suppression locale** : L'album est supprimé de votre bibliothèque locale
2. **Synchronisation automatique** : Immédiatement après, l'état complet des données (sans l'album supprimé) est envoyé à Railway en arrière-plan
3. **Pas de blocage** : La synchronisation ne bloque pas la suppression locale, même en cas d'erreur

### Comportement

- ✅ **Si Railway est accessible** : Les données sont synchronisées automatiquement (ajout ET suppression)
- ⚠️ **Si Railway n'est pas accessible** : Les opérations locales fonctionnent quand même, l'erreur est seulement loggée
- 🔄 **Mode production sur Railway** : La synchronisation est automatiquement désactivée pour éviter les boucles

---

## 📝 Logs

Les logs de synchronisation apparaissent dans la console du serveur :

```
[SYNC RAILWAY] Synchronisation vers https://muzak-server-production.up.railway.app/api/music/import-data...
[SYNC RAILWAY] Synchronisation réussie: 5 albums, 45 tracks, 10 artists
```

En cas d'erreur :

```
[SYNC RAILWAY] Erreur lors de la synchronisation après ajout Google Drive: ...
```

---

## 🔧 Désactiver la synchronisation

Pour désactiver la synchronisation automatique, supprimez ou videz la variable d'environnement :

```env
RAILWAY_URL=
```

Ou commentez la ligne dans votre `.env` :

```env
# RAILWAY_URL=https://muzak-server-production.up.railway.app
```

---

## ✅ Avantages

- **Synchronisation automatique** : Plus besoin d'exécuter le script `import-data.ps1` manuellement
- **Ajout ET suppression synchronisés** : Toutes les modifications locales sont automatiquement reflétées sur Railway
- **Transparent** : Fonctionne en arrière-plan sans bloquer les opérations locales
- **Robuste** : Les erreurs de synchronisation n'affectent pas les opérations locales
- **Performant** : La synchronisation est asynchrone et ne ralentit pas l'interface

---

## 🚀 Utilisation

Une fois configuré :
- **Ajoutez** un album depuis Google Drive en local → Il sera automatiquement synchronisé avec Railway
- **Supprimez** un album en local → Il sera automatiquement supprimé sur Railway

Tout se fait automatiquement en arrière-plan !

---

## 🔄 Migration depuis Koyeb

Si vous migrez depuis Koyeb vers Railway :

1. **Mettez à jour la variable d'environnement** :
   ```env
   # Ancien (Koyeb)
   # KOYEB_URL=https://effective-donni-opticode-1865a644.koyeb.app
   
   # Nouveau (Railway)
   RAILWAY_URL=https://muzak-server-production.up.railway.app
   ```

2. **Redémarrez le serveur** : Le système détectera automatiquement Railway

3. **C'est tout !** La synchronisation fonctionnera avec Railway

---

## 📊 Comparaison Local vs Railway

| Action | Local | Railway | Synchronisation |
|--------|-------|---------|-----------------|
| Ajouter un album | ✅ | ✅ | ✅ Automatique |
| Supprimer un album | ✅ | ✅ | ✅ Automatique |
| Modifier un album | ✅ | ✅ | ✅ Automatique |

**Note** : Les modifications faites directement sur Railway (via le site web) sont immédiatement visibles par tous les utilisateurs, pas besoin de synchronisation.

---

## 🆘 Dépannage

### La synchronisation ne fonctionne pas

1. **Vérifiez la variable d'environnement** :
   ```bash
   echo $RAILWAY_URL
   # ou dans PowerShell
   echo $env:RAILWAY_URL
   ```

2. **Vérifiez les logs** : Regardez la console du serveur pour voir les messages `[SYNC RAILWAY]`

3. **Testez la connexion** :
   ```bash
   curl https://muzak-server-production.up.railway.app/api/health
   ```

### Erreurs de synchronisation

Si vous voyez des erreurs dans les logs :
- **Erreur réseau** : Vérifiez que Railway est accessible
- **Erreur HTTP 401/403** : Vérifiez `ALLOWED_ORIGINS=*` dans Railway
- **Timeout** : Railway peut être lent, c'est normal, la synchronisation réessayera au prochain ajout

---

**La synchronisation bidirectionnelle est maintenant configurée ! 🎵**

