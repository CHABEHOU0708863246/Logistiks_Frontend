# Étape de build
FROM node:18-alpine AS build

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./

# Installer TOUTES les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Construire l'application en mode production
RUN npm run build

# Étape de production avec nginx
FROM nginx:alpine

# Copier les fichiers construits depuis le dossier de sortie Angular
COPY --from=build /app/dist/logistiks_frontend/browser /usr/share/nginx/html

# Copier la configuration nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port 8080 (requis par Cloud Run ou autres services cloud)
EXPOSE 8080

# Démarrer nginx
CMD ["nginx", "-g", "daemon off;"]
