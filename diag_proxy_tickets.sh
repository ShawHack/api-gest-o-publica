#!/bin/bash
echo '=== direct api container ==='
docker exec api sh -c 'wget -qO- "http://127.0.0.1:5000/api/agenda/public/novosga-proxy/unidades/4/painel" 2>&1 | head -c 600'
echo
docker exec api sh -c 'wget -qO- "http://127.0.0.1:5000/agenda/public/novosga-proxy/unidades/4/painel" 2>&1 | head -c 600'
echo
docker exec api sh -c 'wget -qO- "http://127.0.0.1:5000/api/agenda/public/panels/calls?slug=semit" 2>&1 | head -c 400'
echo
echo '=== via nginx ==='
curl -sk --max-time 8 "https://127.0.0.1/api/agenda/public/novosga-proxy/unidades/4/painel" | head -c 600
echo
curl -sk --max-time 8 "https://127.0.0.1/api/agenda/public/novosga-proxy/unidades/6/painel" | head -c 600
echo
echo '=== nginx agenda location ==='
docker exec nginx grep -n "agenda\|novosga-proxy\|location.*/api" /etc/nginx/conf.d/default.conf | head -40
