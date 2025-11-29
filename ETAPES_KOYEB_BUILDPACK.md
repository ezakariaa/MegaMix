# 🎯 Étapes pour Déployer avec Buildpack

## ⚠️ PROBLÈME : Missing Lockfile

Le buildpack nécessite un `package-lock.json` mais il n'existe pas dans `server/`.

## 🔧 SOLUTION : Modifier la Build Command

### Étape 1 : Sur Koyeb

1. **Ouvrez Koyeb** : https://www.koyeb.com
2. **Allez dans votre service** "megamix"
3. **Cliquez sur l'onglet "Settings"**
4. **Section "Build"** :

   | Paramètre | Valeur |
   |-----------|--------|
   | **Builder type** | `Buildpack` |
   | **Work directory override** | ✅ Activé |
   | **Work directory** | `server` |
   | **Build Command** | `npm install --package-lock-only && npm install && npm run build` ⚠️ **MODIFIÉ** |
   | **Run Command** | `npm start` |

   **OU** encore plus simple (si la première ne marche pas) :
   
   | Paramètre | Valeur |
   |-----------|--------|
   | **Build Command** | `npm ci || (npm install && npm run build)` |

5. **Cliquez sur "Save"**

---

## 🔄 Alternative : Créer package-lock.json et le pousser

Si la solution ci-dessus ne fonctionne pas, créons le lockfile localement :

### Étape 1 : Pousser le Code sur GitHub

```bash
cd C:\Users\Amine\Desktop\MegaMix\MegaMix\server
npm install --package-lock-only
git add package-lock.json
git commit -m "Ajouter package-lock.json pour Buildpack"
git push origin main
```

Puis utilisez la configuration normale :

   | **Build Command** | `npm install && npm run build` |

---

## ⚙️ Étape 3 : Vérifier les Variables d'Environnement

Dans **Settings** → **Environment**, assurez-vous d'avoir :

```
NODE_ENV = production
ALLOWED_ORIGINS = *
```

---

## 🚀 Étape 4 : Redeployer

1. **Allez dans l'onglet "Overview"**
2. **Cliquez sur "Redeploy"** (bouton vert en haut à droite)
3. **Attendez 3-5 minutes**

---

## ✅ Étape 5 : Tester

Une fois le déploiement terminé, testez :

```
https://votre-url.koyeb.app/api/health
```

Vous devriez voir :
```json
{"status":"OK","message":"MuZak Server is running"}
```

---

## 🆘 Si ça Échoue Encore

Envoyez-moi une capture d'écran de la page d'erreur pour que je puisse voir les détails !

