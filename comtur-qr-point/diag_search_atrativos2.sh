#!/bin/bash
set -euo pipefail
echo "=== raw search ==="
curl -sk "https://127.0.0.1/api/comtur/content?q=atrativos&limit=20" | head -c 2000; echo
echo "=== raw search atrativo ==="
curl -sk "https://127.0.0.1/api/comtur/content?q=atrativo&limit=20" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(type(d), list(d.keys()) if isinstance(d,dict) else len(d)); items=d.get("data",d) if isinstance(d,dict) else d; items=items if isinstance(items,list) else [];
[print(i.get("type"), i.get("title")) for i in items]'
echo "=== q=Garça open ==="
curl -sk "https://127.0.0.1/api/comtur/content?q=Gar%C3%A7a&limit=20" | python3 -c 'import sys,json;d=json.load(sys.stdin);items=d.get("data") or [];
[print(i.get("type"),"|",i.get("title")) for i in items]'
echo "=== all types with atrativo in title via mongo ==="
docker exec -i mongo mongosh --quiet --eval '
db = db.getSiblingDB("api_semit");
// try common db names
' 2>/dev/null || true
docker exec api node <<'NODE'
const mongoose = require('mongoose');
(async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongo:27017/api_semit';
  await mongoose.connect(uri);
  const cols = await mongoose.connection.db.listCollections().toArray();
  const names = cols.map(c => c.name).filter(n => /comtur|content/i.test(n));
  console.log('cols', names);
  const colName = names.find(n => /content/i.test(n)) || names[0];
  const col = mongoose.connection.db.collection(colName);
  const docs = await col.find({
    status: 'published',
    $or: [
      { title: /atrativo/i },
      { summary: /atrativo/i },
      { slug: /atrativo/i },
    ]
  }).project({ title:1, type:1, slug:1, featured:1, status:1 }).toArray();
  console.log(JSON.stringify(docs, null, 2));
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
NODE
