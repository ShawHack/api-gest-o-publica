#!/bin/bash
echo '===8088 tickets-ish==='
for u in '/api/panels' '/api/tickets?unitId=4' '/tickets?unitId=4' '/api/units/4/tickets' '/p/'; do
  echo -n "$u -> "
  curl -sI --max-time 4 "http://10.15.25.31:8088$u" | head -1
done
curl -s --max-time 5 'http://10.15.25.31:8088/api/panels' | head -c 1200
echo
echo '===grep tickets in tv server==='
docker exec tv-semit sh -c 'grep -n "ticket\|Ticket\|novosga\|SGA\|8088\|25.31" server.js | head -50'
echo '===scratch fix routes==='
docker exec tv-semit sh -c 'grep -n ticket scratch-fix-routes.py 2>/dev/null | head'
ls /home/semit/Documentos/semit_tv_app 2>/dev/null | head
grep -RIn 'tickets\|10.15.25.31' /home/semit/Documentos/api-semit --include='*.js' 2>/dev/null | grep -i ticket | head -20
