FROM node:20-alpine

WORKDIR /app

# Verificação obrigatória de documentos institucionais enviados pelo COMTUR.
RUN apk add --no-cache clamav clamav-libunrar \
  && freshclam \
  && chmod -R a+rX /var/lib/clamav

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

ENV NODE_ENV=production
ENV UPLOAD_DIR=/data/apicemiterio

RUN mkdir -p /data/apicemiterio/sepultados /data/apicemiterio/users \
    /data/apicemiterio/cultura /data/apicemiterio/education/documents \
    /data/apicemiterio/votacao/candidates \
    /data/apicemiterio/votacao/banners \
  && chown -R node:node /data/apicemiterio

USER node

EXPOSE 5000

CMD ["node", "index.js"]
