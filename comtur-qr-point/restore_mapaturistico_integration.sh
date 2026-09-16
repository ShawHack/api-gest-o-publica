#!/bin/bash
set -euo pipefail

echo "=== restore mapaturistico integrations ==="
docker exec -i api node <<'NODE'
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const ComturContent = require('/app/models/ComturContent');

  const archived = await ComturContent.find({
    type: 'integration',
    $or: [
      { slug: /mapaturistico/i },
      { title: /mapa\s*tur[ií]stico/i },
      { title: /Mapatur[ií]stico/i },
    ],
  }).lean();
  console.log('found', archived.map(a => ({ id: String(a._id), slug: a.slug, title: a.title, status: a.status, featured: a.featured, showOnPortal: a.metadata?.showOnPortal })));

  for (const a of archived) {
    // restore the map sync integration(s)
    if (/mapaturistico/i.test(a.slug || '') || /Mapatur/i.test(a.title || '') || /mapa/i.test(a.title || '')) {
      // skip purely "oculta" internal test
      if (/oculta/i.test(a.slug || '') || /oculta/i.test(a.title || '')) {
        console.log('skip oculta', a.slug);
        continue;
      }
      await ComturContent.updateOne(
        { _id: a._id },
        {
          $set: {
            status: 'published',
            featured: false,
            'metadata.showOnPortal': a.metadata?.showOnPortal !== false,
          },
        }
      );
      console.log('restored', a.slug, a.title);
    }
  }

  const pub = await ComturContent.find({ type: 'integration' }).select('title slug status metadata.showOnPortal featured').lean();
  console.log('all integrations now:', pub);

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
NODE

echo "=== public API integration ==="
curl -sk "https://127.0.0.1/api/comtur/content?type=integration&limit=20" | python3 -c '
import sys,json
d=json.load(sys.stdin)
items=d.get("data") or []
print("public n=", len(items))
for i in items:
  print("-", i.get("slug"), "|", i.get("title"), "| status", i.get("status"))
'

echo "=== admin list filter in helper/controller ==="
docker exec api grep -n "integration\|showOnPortal\|admin/content\|listAdmin\|listPublic" /app/helpers/comtur-content.js /app/controllers/ComturContentController.js 2>/dev/null | head -60

echo "=== admin content endpoint (no auth expect 401) ==="
curl -sk -o /tmp/admin_int.json -w "code:%{http_code}\n" "https://127.0.0.1/api/comtur/admin/content?type=integration"
head -c 300 /tmp/admin_int.json; echo

echo "=== loadItems error message source ==="
python3 - <<'PY'
from pathlib import Path
a=Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
i=a.find('Não foi possível carregar integrações')
print('found', i)
print(a[i-200:i+250] if i>=0 else 'missing')
# specializedMap integration
print('integration in specializedMap', 'integration:' in a[a.find('specializedMap'):a.find('specializedMap')+800])
PY
