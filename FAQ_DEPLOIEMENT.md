# ❓ FAQ - Déploiement

## Le backend reste-t-il fonctionnel si je ferme Koyeb ?

**Oui ! Absolument !** ✅

### Pourquoi ?

- Votre backend est **hébergé sur les serveurs de Koyeb** (dans le cloud)
- Il fonctionne **24/7** indépendamment de votre ordinateur
- Vous n'avez **pas besoin** de :
  - Laisser votre ordinateur allumé
  - Garder Koyeb ouvert dans votre navigateur
  - Rester connecté à Koyeb

### Test

Fermez complètement Koyeb et testez votre backend :
```
https://effective-donni-opticode-1865a644.koyeb.app/api/health
```

Ça devrait fonctionner ! 🎉

---

## Mon backend s'arrête-t-il après un certain temps ?

**Non, pas sur le plan gratuit de Koyeb** (pour l'instant).

- ✅ Votre backend reste actif en permanence
- ✅ Il répond aux requêtes 24/7
- ✅ Pas de limite de temps sur le plan gratuit actuel

**Note** : Certains services gratuits (comme Render) mettent les applications en veille après 15 minutes d'inactivité. **Koyeb ne fait pas ça** sur le plan gratuit actuel.

---

## Comment arrêter mon backend ?

Pour arrêter complètement votre backend :

1. Allez sur Koyeb : https://www.koyeb.com
2. Ouvrez votre service "megamix"
3. **Settings** → **Advanced** → **Delete Service**

⚠️ **Attention** : Cela supprimera définitivement votre backend et toutes les données !

---

## Comment redémarrer mon backend ?

Votre backend redémarre automatiquement :
- En cas de crash
- Après un redéploiement
- Si Koyeb redémarre l'instance

Vous pouvez aussi forcer un redémarrage :
1. **Overview** → **Redeploy**

---

## Comment voir les logs de mon backend ?

1. Allez sur Koyeb
2. Ouvrez votre service
3. Onglet **"Console"** ou **"Logs"**

---

## Mon backend utilise-t-il des ressources quand personne ne l'utilise ?

Oui, mais c'est minime :
- L'instance reste allumée
- Elle consomme des ressources minimales
- Koyeb gère automatiquement la mise à l'échelle

Sur le plan gratuit, vous avez des limites de ressources, mais c'est largement suffisant pour votre application.

