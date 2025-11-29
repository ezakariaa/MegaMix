# 🔄 Redémarrer le Service Koyeb

Votre service est **"Stopped"** (arrêté), c'est pourquoi vous obtenez une erreur 404.

---

## ✅ Solution : Redémarrer le Service

### Sur Koyeb :

1. **Cliquez sur le bouton vert "Redeploy"** (en haut à droite)

2. **OU** allez dans l'onglet **"Overview"** et cliquez sur **"Redeploy"**

3. **Attendez 2-3 minutes** que le service redémarre

4. **Vérifiez** que le statut passe de **"Stopped"** à **"Running"** ou **"Healthy"**

---

## 🔍 Pourquoi le Service s'Arrête ?

Sur le **plan gratuit de Koyeb**, le service peut s'arrêter si :
- ❌ Aucune requête pendant un certain temps (inactivité)
- ❌ Le service a crashé
- ❌ Redéploiement en cours
- ❌ Limite de ressources atteinte

---

## ✅ Après le Redémarrage

Une fois le service redémarré :

1. **Testez** : https://effective-donni-opticode-1865a644.koyeb.app/api/health
   - ✅ Doit retourner : `{"status":"OK","message":"MuZak Server is running"}`

2. **Testez** l'ajout depuis Google Drive sur votre site

3. **Ça devrait fonctionner maintenant !** 🎉

---

## 🔄 Si le Service s'Arrête Souvent

**Solutions** :

1. **Faire des requêtes régulières** pour garder le service actif
2. **Upgrader vers un plan payant** (si vous voulez un service toujours actif)
3. **Utiliser un service de monitoring** qui ping votre service régulièrement

---

## 📝 Note

Le service Koyeb gratuit peut s'arrêter après une période d'inactivité. C'est normal. Il suffit de le redémarrer avec "Redeploy" quand vous en avez besoin.

