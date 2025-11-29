# Dockerfile pour déploiement sur Koyeb ou autres plateformes
FROM node:20-alpine

WORKDIR /app

# Installer les dépendances système nécessaires pour sharp et autres
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    libc6-compat

# Copier les fichiers de configuration
COPY package*.json ./
COPY tsconfig.json ./

# Installer les dépendances (toutes, y compris devDependencies pour le build)
RUN npm ci

# Copier le code source
COPY src ./src

# Créer les dossiers nécessaires
RUN mkdir -p data uploads/temp

# Builder l'application TypeScript
RUN npm run build

# Vérifier que le build a réussi
RUN ls -la dist/ || (echo "Build failed - dist directory not found" && exit 1)

# Supprimer les devDependencies après le build pour réduire la taille
RUN npm prune --production

# Exposer le port (Koyeb assignera automatiquement un port via PORT env var)
EXPOSE 8080

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=8080

# Démarrer l'application
CMD ["npm", "start"]

