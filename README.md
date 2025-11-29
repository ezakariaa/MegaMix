# MuZak 🎵

Application web pour organiser et gérer votre bibliothèque musicale locale.

## 🚀 Fonctionnalités

- 📁 Organisation de votre bibliothèque musicale locale
- 🎤 Tri par artiste, albums, genres
- 📋 Création et gestion de playlists
- 🌐 Streaming webradio (à venir)

## 🛠️ Technologies

- **Frontend**: React 18, TypeScript, Bootstrap 5, Vite
- **Backend**: Node.js, Express, TypeScript
- **Outils**: ESLint, Concurrently

## 📦 Installation

### Prérequis

- Node.js (version 18 ou supérieure)
- npm ou yarn

### Étapes d'installation

1. **Installer toutes les dépendances** :

```bash
npm run install:all
```

Ou manuellement :

```bash
npm install
cd client && npm install
cd ../server && npm install
```

2. **Configurer les variables d'environnement** :

```bash
cp server/.env.example server/.env
```

Puis éditez `server/.env` pour configurer les chemins de votre bibliothèque musicale.

## 🏃 Démarrage

### Mode développement

Pour lancer le client et le serveur en même temps :

```bash
npm run dev
```

Ou séparément :

```bash
# Terminal 1 - Client
npm run dev:client

# Terminal 2 - Serveur
npm run dev:server
```

- Client : http://localhost:3000
- Serveur API : http://localhost:5000

### Build de production

```bash
npm run build
```

## 📁 Structure du projet

```
MuZak/
├── client/                 # Application React
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/         # Pages de l'application
│   │   ├── App.tsx        # Composant principal
│   │   └── main.tsx       # Point d'entrée
│   ├── package.json
│   └── vite.config.ts
├── server/                 # API Node.js
│   ├── src/
│   │   └── index.ts       # Point d'entrée du serveur
│   ├── package.json
│   └── tsconfig.json
├── package.json            # Configuration workspace
└── README.md
```

## 🎯 Prochaines étapes

- [ ] Scanner la bibliothèque musicale locale
- [ ] Extraire les métadonnées (artiste, album, genre, etc.)
- [ ] Implémenter la recherche
- [ ] Créer un lecteur audio
- [ ] Gestion des playlists (CRUD)
- [ ] Streaming webradio

## 📝 Licence

MIT

## 👤 Auteur

Développé avec ❤️ pour la gestion de bibliothèques musicales locales
