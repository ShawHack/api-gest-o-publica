#!/bin/bash
sleep 2
echo "LIST:"
curl -sk "https://127.0.0.1/api/comtur/content?type=integration&limit=20"
echo
echo -n "HIDDEN:"
curl -sk -o /tmp/h.json -w "%{http_code}" "https://127.0.0.1/api/comtur/content/interna-oculta-1789491743472"
echo
cat /tmp/h.json; echo
echo -n "PUB:"
curl -sk -o /tmp/p.json -w "%{http_code}" "https://127.0.0.1/api/comtur/content/mapaturistico-1789491743472"
echo
python3 -c "import json; print(json.load(open('/tmp/p.json'))['data']['title'])"
