# ===== STAGE 1: build do frontend =====
FROM node:20-alpine AS webbuilder
WORKDIR /app/frontend
# Copia só o necessário para aproveitar cache
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# ===== STAGE 2: backend + estáticos =====
FROM node:20-alpine
WORKDIR /usr/src/app

# Instala apenas prod deps do backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copia código do backend
COPY backend ./

# Copia o build do frontend para a pasta estática
RUN mkdir -p public
COPY --from=webbuilder /app/frontend/build ./public

# (opcional) criar diretório de uploads se você usa UPLOAD_DIR=/data/apicemiterio
RUN mkdir -p /data/apicemiterio && chown -R node:node /data/apicemiterio /usr/src/app

ENV NODE_ENV=production
EXPOSE 5000

# roda como usuário não-root
USER node

CMD ["npm", "start"]
