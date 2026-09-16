#!/bin/bash
set -e
echo "ADMIN_FIELDS $(curl -sk https://127.0.0.1/comtur-content-admin.html | grep -c researchFields)"
curl -sk https://127.0.0.1/comtur-content-admin.html | grep -o "'research': 'researchFields'" | head -1
echo "LIST_PAGE"
curl -sk https://127.0.0.1/turismo/pesquisas/ | grep -oE 'Pesquisas|Ver pesquisa|type=research' | sort -u
echo "DETAIL_PAGE"
curl -sk https://127.0.0.1/turismo/pesquisas/pesquisa-teste-satisfacao-1789490203055 | grep -oE 'Carregando|/api/comtur/content/' | sort -u
echo "FILTER"
docker exec -w /app api node -e 'const {publicContentFilter}=require("./helpers/comtur-content"); console.log(JSON.stringify(publicContentFilter({type:"research"})));'
