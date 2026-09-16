#!/bin/bash
set -e
echo '=== /tv/ proxy ==='
docker exec nginx sed -n '349,380p' /etc/nginx/conf.d/default.conf
echo '=== APK URLs ==='
grep -RIn -E '8082|8088|8090|3050|:8080|/tv/|painel|DEFAULT_BASE|defaultServer' \
  /home/semit/Documentos/semit_tv_native/app/src/main/java \
  /home/semit/Documentos/semit_tv_app/lib \
  /home/semit/Documentos/semit_painel_native/app/src/main/java 2>/dev/null | head -50
echo '=== LOG HITS high ports ==='
docker logs --tail 4000 nginx 2>&1 | grep -c 'api.garca.sp.gov.br:8082' || true
docker logs --tail 4000 nginx 2>&1 | grep -c 'api.garca.sp.gov.br:8088' || true
docker logs --tail 4000 nginx 2>&1 | grep -c 'api.garca.sp.gov.br:8090' || true
echo '=== LOG HITS /tv/ ==='
docker logs --tail 4000 nginx 2>&1 | grep -c '"GET /tv/' || true
echo '=== LOG HITS painel ==='
docker logs --tail 4000 nginx 2>&1 | grep -cE '/painel|/painel-senhas|"/p/' || true
echo '=== tv-semit ports ==='
docker port tv-semit 2>/dev/null || true
