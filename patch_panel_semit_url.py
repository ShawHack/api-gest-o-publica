#!/bin/bash
ID=0d7e3e10-b213-4061-8c7e-f432a6503b13
BASE=http://10.15.25.31:8088

echo '=== GET by id ==='
curl -s --max-time 8 "$BASE/api/panels/$ID" | head -c 800
echo

echo '=== PATCH novosgaApiUrl ==='
curl -s --max-time 8 -X PATCH "$BASE/api/panels/$ID" \
  -H 'Content-Type: application/json' \
  -d '{"novosgaApiUrl":"http://10.15.25.31"}' | head -c 800
echo

echo '=== PUT partial? ==='
# if PATCH failed, try fetching full and putting
python3 << 'PY'
import json, urllib.request
base='http://10.15.25.31:8088'
pid='0d7e3e10-b213-4061-8c7e-f432a6503b13'
# list panels
panels=json.load(urllib.request.urlopen(base+'/api/panels', timeout=8))
p=next(x for x in panels if x['id']==pid)
print('before', p['novosgaApiUrl'])
p['novosgaApiUrl']='http://10.15.25.31'
body=json.dumps(p).encode()
# try PATCH
for method, path in [
    ('PATCH', f'/api/panels/{pid}'),
    ('PUT', f'/api/panels/{pid}'),
    ('POST', f'/api/panels/{pid}'),
    ('PUT', '/api/panels'),
]:
    req=urllib.request.Request(base+path, data=body, method=method, headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            print(method, path, r.status, r.read()[:200])
            break
    except Exception as e:
        print(method, path, 'ERR', e)

panels=json.load(urllib.request.urlopen(base+'/api/panels', timeout=8))
p=next(x for x in panels if x['id']==pid)
print('after', p['novosgaApiUrl'])
PY
