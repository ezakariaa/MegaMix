# 🔧 Dépannage - Application Locale

## ❌ Problème : localhost:3000 ne s'affiche pas

### Solution 1 : Démarrer le client

Le client doit être démarré séparément du serveur.

**Option A : Démarrer tout ensemble (recommandé)**

Dans le dossier racine du projet :
```bash
npm run dev
```

Cela démarre automatiquement :
- Le serveur sur `http://localhost:5000`
- Le client sur `http://localhost:3000`

**Option B : Démarrer séparément**

**Terminal 1 - Serveur** :
```bash
cd server
npm run dev
```

**Terminal 2 - Client** :
```bash
cd client
npm run dev
```

---

### Solution 2 : Vérifier que le port 3000 n'est pas occupé

Si le port 3000 est déjà utilisé, Vite essaiera un autre port (3001, 3002, etc.).

**Vérifier quel port est utilisé** :
- Regardez dans le terminal où vous avez lancé `npm run dev:client`
- Vous devriez voir : `Local: http://localhost:XXXX`

**Libérer le port 3000** :
```powershell
# Trouver le processus qui utilise le port 3000
netstat -ano | findstr :3000

# Tuer le processus (remplacez PID par le numéro trouvé)
taskkill /PID <PID> /F
```

---

### Solution 3 : Réinstaller les dépendances

Si le client ne démarre pas, réinstallez les dépendances :

```bash
cd client
rm -rf node_modules
npm install
npm run dev
```

---

### Solution 4 : Vérifier les erreurs dans le terminal

Quand vous lancez `npm run dev:client`, regardez les erreurs dans le terminal.

**Erreurs communes** :
- `Cannot find module` → Réinstallez les dépendances
- `Port already in use` → Changez le port ou tuez le processus
- `Syntax error` → Vérifiez le code

---

### Solution 5 : Vérifier que le serveur tourne

Le client a besoin du serveur pour fonctionner (pour les appels API).

**Vérifiez que le serveur tourne** :
- Ouvrez : `http://localhost:5000/api/health`
- Vous devriez voir : `{"status":"OK","message":"MuZak Server is running"}`

Si le serveur ne répond pas :
```bash
cd server
npm run dev
```

---

## ✅ Démarrage Complet (Étape par Étape)

### 1. Ouvrez un terminal dans le dossier du projet

### 2. Installez les dépendances (si pas déjà fait)
```bash
npm run install:all
```

### 3. Démarrez tout
```bash
npm run dev
```

Vous devriez voir :
```
[0] 🚀 Serveur MuZak démarré sur le port 5000
[1] VITE v5.x.x  ready in XXX ms
[1] ➜  Local:   http://localhost:3000/
```

### 4. Ouvrez votre navigateur
- Frontend : `http://localhost:3000`
- Backend : `http://localhost:5000/api/health`

---

## 🆘 Si rien ne fonctionne

1. **Fermez tous les terminaux**
2. **Réinstallez tout** :
   ```bash
   npm run install:all
   ```
3. **Redémarrez** :
   ```bash
   npm run dev
   ```
4. **Vérifiez les logs** dans les terminaux pour voir les erreurs

---

## 📝 Commandes Utiles

```bash
# Démarrer tout (client + serveur)
npm run dev

# Démarrer seulement le client
npm run dev:client

# Démarrer seulement le serveur
npm run dev:server

# Réinstaller toutes les dépendances
npm run install:all
```

