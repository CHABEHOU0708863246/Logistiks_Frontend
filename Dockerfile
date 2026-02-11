# ============================================
# ÉTAPE 1 : BUILD
# ============================================
FROM node:18-alpine AS build

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production && \
    npm cache clean --force

# Copier le code source
COPY . .

# Build pour production
RUN npm run build -- --configuration=production

# ============================================
# ÉTAPE 2 : NGINX
# ============================================
FROM nginx:alpine

# Copier les fichiers buildés
COPY --from=build /app/dist/logistiks_frontend/browser /usr/share/nginx/html

# Copier la configuration nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Créer un utilisateur non-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Exposer le port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Démarrer nginx
CMD ["nginx", "-g", "daemon off;"]
