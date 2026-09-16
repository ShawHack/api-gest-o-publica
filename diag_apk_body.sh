#!/bin/bash
# Simula pedido do APK e inspeciona corpo
curl -sk --max-time 8 \
  -A 'okhttp/4.12.0' \
  -H 'Accept: */*' \
  'https://api.garca.sp.gov.br/tv/api/tickets?unitId=4' \
  -o /tmp/apk_t4.bin -D /tmp/apk_t4.hdr
echo '=== headers ==='
cat /tmp/apk_t4.hdr
echo '=== size ==='
wc -c /tmp/apk_t4.bin
echo '=== body head ==='
head -c 300 /tmp/apk_t4.bin; echo
python3 - <<'PY'
import json
raw=open('/tmp/apk_t4.bin','rb').read()
print('bytes', len(raw))
try:
  d=json.loads(raw)
  print('ok', type(d), len(d) if isinstance(d,list) else d)
  if isinstance(d,list) and d:
    print('id type', type(d[0].get('id')).__name__, 'senha', d[0].get('senha'))
except Exception as e:
  print('JSON ERR', e)
PY

echo '=== via 127 ==='
curl -sk --max-time 8 -A 'okhttp/4.12.0' 'https://127.0.0.1/tv/api/tickets?unitId=4' -o /tmp/apk_t4b.bin -w 'code=%{http_code} size=%{size_download}\n'
python3 -c 'import json;d=json.load(open("/tmp/apk_t4b.bin")); print(len(d), d[0]["senha"] if d else None)'
