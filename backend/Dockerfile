FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

ENV NODE_ENV=production
ENV UPLOAD_DIR=/data/apicemiterio

RUN mkdir -p /data/apicemiterio/sepultados /data/apicemiterio/users \
    /data/apicemiterio/cultura /data/apicemiterio/education/documents \
    /data/apicemiterio/votacao/candidates \
    /data/apicemiterio/votacao/banners \
  && chown -R node:node /app /data/apicemiterio

USER node

EXPOSE 5000

CMD ["node", "index.js"]
