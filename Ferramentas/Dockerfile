FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    fonts-liberation \
    fonts-dejavu \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV SOFFICE_PATH=/usr/bin/soffice
ENV NEXT_TELEMETRY_DISABLED=1
ENV MONGODB_URI=mongodb://mongo:27017/apicemiterio?replicaSet=rs0
ENV API_INTERNAL_URL=http://api:5000

COPY package.json package-lock.json* ./
RUN mkdir -p public && npm ci

COPY . .
# node-pre-gyp e seu tar empacotado são usados apenas para instalar o binário
# nativo do muhammara; não são necessários durante a execução da aplicação.
RUN npm run test:smoke \
  && npm run build \
  && npm prune --omit=dev \
  && rm -rf \
    node_modules/muhammara/node_modules/@mapbox \
    node_modules/muhammara/node_modules/tar

ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
