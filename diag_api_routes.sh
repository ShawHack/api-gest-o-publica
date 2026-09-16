#!/bin/bash
docker exec api sh -c 'grep -RIn novosga-proxy /app --include="*.js" | head -40'
echo ===
docker exec api sh -c 'grep -RIn "novosgaProxyPainel\|AgendaRoutes" /app --include="*.js" | head -40'
echo ===
docker exec api sh -c 'ls /app; ls /app/src 2>/dev/null | head'
