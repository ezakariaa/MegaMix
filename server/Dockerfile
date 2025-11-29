# Dockerfile pour déploiement sur Koyeb ou autres plateformes
FROM node:20-alpine

WORKDIR /app

# Installer les dépendances système nécessaires pour sharp et autres
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev

# Copier les fichiers de configuration
COPY package*.json ./
COPY tsconfig.json ./

# Installer les dépendances
RUN npm ci --only=production=false

# Copier le code source
COPY src ./src

# Créer les dossiers nécessaires
RUN mkdir -p data uploads/temp

# Builder l'application
RUN npm run build

# Supprimer les devDependencies pour réduire la taille de l'image
RUN npm prune --production

# Exposer le port (Koyeb assignera automatiquement un port)
EXPOSE 8080

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=8080

# Démarrer l'application
CMD ["npm", "start"]

