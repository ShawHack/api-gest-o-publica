#!/bin/bash
echo '=== senhas proxy path ==='
docker exec nginx sed -n '770,810p' /etc/nginx/conf.d/default.conf
echo
curl -sk --max-time 8 "https://127.0.0.1/senhas/api/unidades/4/painel" | head -c 800
echo
curl -sk --max-time 8 "https://127.0.0.1/senhas/api/unidades/6/painel" | head -c 800
echo
docker exec api wget -qO- "http://127.0.0.1:5000/api/agenda/public/novosga-proxy/unidades/4/painel" 2>&1 | head -c 400
echo
# check auth bypass - maybe need specific header
docker exec api wget -qO- "http://127.0.0.1:5000/api/agenda/public/panels/calls?slug=semit" 2>&1 | head -c 300
echo
