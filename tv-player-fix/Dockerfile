FROM api-semit-tv-semit

COPY playlist-engine.js /app/public/playlist-engine.js
COPY storage-cache.js /app/public/storage-cache.js
COPY app.js /app/public/app.js
COPY js/playlist-engine.js /app/public/js/playlist-engine.js
COPY js/storage-cache.js /app/public/js/storage-cache.js
COPY js/app.js /app/public/js/app.js

# O processo escuta IPv4; localhost pode resolver para ::1 e gerar falso unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3050/api/health || exit 1
