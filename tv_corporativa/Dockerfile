FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3050

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3050

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3050/api/health || exit 1

CMD ["node", "server.js"]
