#!/usr/bin/env python3
"""End-to-end research persistence test via Mongo + public API."""
import json, subprocess, urllib.request, ssl, time
from pathlib import Path
from datetime import datetime, timezone

# 1) Confirm research in specializedMap fully
admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")
start = admin.find("specializedMap = {")
end = admin.find("};", start)
print("MAP_FULL", admin[start:end+2])

# 2) Insert published + draft research via mongosh inside mongo container
slug = f"pesquisa-teste-satisfacao-{int(time.time())}"
draft_slug = f"pesquisa-rascunho-{int(time.time())}"
now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

doc_pub = {
  "type": "research",
  "title": "Pesquisa de Satisfação do Turista – Garça 2026",
  "slug": slug,
  "summary": "Avaliar a percepção dos visitantes sobre o turismo em Garça.",
  "body": "Coleta presencial com questionário estruturado em pontos turísticos.",
  "location": "Município de Garça",
  "featured": True,
  "status": "published",
  "startsAt": "2026-06-01T00:00:00.000Z",
  "endsAt": "2026-07-31T00:00:00.000Z",
  "publishedAt": now,
  "media": [
    {"kind": "image", "title": "Capa", "url": "/uploads/comtur/test-cover.jpg", "mimeType": "image/jpeg"},
    {"kind": "document", "title": "Relatório", "url": "/uploads/comtur/test-relatorio.pdf", "mimeType": "application/pdf", "originalName": "relatorio.pdf"}
  ],
  "metadata": {
    "objective": "Avaliar a percepção dos visitantes sobre o turismo em Garça.",
    "responsibleBody": "Secretaria de Turismo / COMTUR",
    "audience": "Turistas",
    "coverage": "Município de Garça",
    "participants": 500,
    "methodology": "Coleta presencial com questionário estruturado em pontos turísticos.",
    "summaryResults": "Satisfação geral elevada, com pontos de melhoria na sinalização.",
    "conclusions": "Priorizar sinalização e manutenção de atrativos.",
    "highlightedResults": [
      {"indicator": "Satisfação geral", "value": 87, "unit": "%"},
      {"indicator": "Avaliação dos atrativos turísticos", "value": 91, "unit": "%"},
      {"indicator": "Avaliação da sinalização turística", "value": 72, "unit": "%"}
    ],
    "startDate": "2026-06-01",
    "endDate": "2026-07-31",
    "coverUrl": "/uploads/comtur/test-cover.jpg",
    "pdfFile": {"url": "/uploads/comtur/test-relatorio.pdf", "name": "relatorio.pdf"},
    "showOnPortal": True
  },
  "createdAt": {"$date": now},
  "updatedAt": {"$date": now}
}

doc_draft = dict(doc_pub)
doc_draft["slug"] = draft_slug
doc_draft["title"] = "Pesquisa RASCUNHO não deve aparecer"
doc_draft["status"] = "draft"
doc_draft["publishedAt"] = None

# discover db/collection
# Use node inside api container to insert via mongoose model if possible
js = f'''
const mongoose = require('mongoose');
(async () => {{
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongo:27017/api-semit';
  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection('comturcontents');
  const names = await mongoose.connection.db.listCollections().toArray();
  console.log('COLS', names.map(n => n.name).filter(n => /comtur|content/i.test(n.name)).join(','));
  // try known collections
  let target = 'comturcontents';
  for (const c of ['comturcontents','comtur_contents','contents','ComturContent']) {{
    const n = await mongoose.connection.db.collection(c).countDocuments({{}}).catch(()=>-1);
    if (n >= 0) {{ console.log('COUNT', c, n); if (n>=0 && (await mongoose.connection.db.listCollections({{name:c}}).hasNext())) target=c; }}
  }}
  const pub = {json.dumps(doc_pub)};
  const draft = {json.dumps(doc_draft)};
  delete pub.createdAt; delete pub.updatedAt; delete draft.createdAt; delete draft.updatedAt;
  pub.createdAt = new Date(); pub.updatedAt = new Date();
  draft.createdAt = new Date(); draft.updatedAt = new Date();
  const r1 = await mongoose.connection.db.collection(target).insertOne(pub);
  const r2 = await mongoose.connection.db.collection(target).insertOne(draft);
  console.log('INSERTED', target, String(r1.insertedId), String(r2.insertedId), pub.slug, draft.slug);
  await mongoose.disconnect();
}})().catch(e => {{ console.error('ERR', e); process.exit(1); }});
'''
Path("/tmp/research_insert.js").write_text(js, encoding="utf-8")
r = subprocess.run(
    "docker cp /tmp/research_insert.js api:/tmp/research_insert.js && docker exec api node /tmp/research_insert.js",
    shell=True, capture_output=True, text=True
)
print("INSERT_OUT", r.stdout)
print("INSERT_ERR", r.stderr[:800])
print("INSERT_CODE", r.returncode)

# Public API checks
ctx = ssl._create_unverified_context()
def get(url):
    with urllib.request.urlopen(url, context=ctx, timeout=20) as resp:
        return resp.status, resp.read().decode("utf-8", "replace")

st, body = get("https://127.0.0.1/api/comtur/content?type=research&limit=20")
print("LIST_STATUS", st)
data = json.loads(body)
items = data.get("data") or []
print("LIST_COUNT", len(items))
print("LIST_SLUGS", [i.get("slug") for i in items])
print("DRAFT_IN_PUBLIC", any(i.get("slug")==draft_slug for i in items))
print("PUB_IN_PUBLIC", any(i.get("slug")==slug for i in items))

st2, body2 = get(f"https://127.0.0.1/api/comtur/content/{slug}")
print("DETAIL_STATUS", st2)
detail = json.loads(body2)
d = detail.get("data") or detail
print("DETAIL_TITLE", d.get("title"))
print("DETAIL_TYPE", d.get("type"), "STATUS", d.get("status"))
print("DETAIL_RESULTS", (d.get("metadata") or {}).get("highlightedResults"))

# pages
st3, html = get("https://127.0.0.1/turismo/pesquisas/")
print("PAGE_LIST", st3, "Pesquisas" in html, "Ver pesquisa" in html)
st4, html4 = get(f"https://127.0.0.1/turismo/pesquisas/{slug}")
print("PAGE_DETAIL", st4, "detalhe" in html4.lower() or "Objetivo" in html4 or "Carregando" in html4)
