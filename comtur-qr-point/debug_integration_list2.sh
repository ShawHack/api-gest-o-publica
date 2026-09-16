#!/bin/bash
set -e
echo "=== controller listAdmin / getPublic ==="
docker exec api node -e '
const fs=require("fs");
const t=fs.readFileSync("/app/controllers/ComturContentController.js","utf8");
console.log("len", t.length);
console.log("has listAdmin", t.includes("listAdmin"));
console.log("has getPublic showOnPortal", t.includes("showOnPortal"));
const m=t.match(/static async listAdmin\(req,res\)\{[^}]+\}/);
console.log("listAdmin", m&&m[0]);
const g=t.match(/static async getPublic\(req,res\)\{[^}]+\}/);
console.log("getPublic", g&&g[0].slice(0,350));
'

echo "=== simulate listAdmin ==="
docker exec -w /app api node -e '
const mongoose=require("mongoose");
const Content=require("./models/ComturContent");
(async()=>{
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const data=await Content.find({type:"integration"}).sort({updatedAt:-1}).limit(500).lean();
    console.log("OK count", data.length);
    console.log(JSON.stringify(data.map(d=>({slug:d.slug,status:d.status,title:d.title}) )));
  } catch(e) { console.error("ERR", e); }
  await mongoose.disconnect();
})().catch(e=>{console.error(e); process.exit(1);});
'

echo "=== extract loadItems + integration card from admin ==="
python3 - <<'PY'
from pathlib import Path
admin=Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html').read_text(encoding='utf-8')
# loadItems function start
i=admin.find('async function loadItems')
print(admin[i:i+2200])
print('----CARD----')
j=admin.find("if (item.type === 'integration')")
print(admin[j:j+900])
# check plural label helper
for needle in ['listTitle.toLowerCase()', 'plural', 'carregar:']:
    print(needle, admin.count(needle))
PY

echo "=== nginx access last integration admin ==="
docker logs nginx --tail 200 2>&1 | grep -E 'admin/content|type=integration' | tail -20

echo "=== container vs host admin integrationFields ==="
docker exec api grep -c "integrationFields" /app/public/comtur-content-admin.html || echo 'no container public'
ls -la /home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html
# how is public served?
docker inspect api --format '{{json .Mounts}}' | python3 -m json.tool 2>/dev/null | head -80
