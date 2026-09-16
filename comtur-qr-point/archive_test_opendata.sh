#!/bin/bash
set -euo pipefail

echo "=== archive test open_data / research / integration leftovers ==="
docker exec -i api node <<'NODE'
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const ComturContent = require('/app/models/ComturContent');
  const testPatterns = [
    /atrativos-turisticos-\d+/i,
    /rascunho-dados-\d+/i,
    /pesquisa-teste/i,
    /pesquisa-rascunho/i,
    /integracao-teste/i,
    /teste-satisfacao/i,
  ];
  const published = await ComturContent.find({
    status: 'published',
    type: { $in: ['open_data', 'research', 'integration'] },
  }).select('title slug type featured status createdAt').lean();
  console.log('published specialized:', published.map(p => `${p.type}|${p.slug}|${p.title}`).join('\n') || '(none)');

  const toArchive = published.filter(p =>
    testPatterns.some(rx => rx.test(p.slug || '') || rx.test(p.title || '')) ||
    /teste|test|rascunho/i.test(p.title || '') ||
    /teste|test|rascunho/i.test(p.slug || '')
  );
  // Also specifically the known open_data title from e2e
  for (const p of published) {
    if (p.type === 'open_data' && /Atrativos turísticos de Garça/i.test(p.title || '')) {
      if (!toArchive.find(x => String(x._id) === String(p._id))) toArchive.push(p);
    }
  }
  console.log('toArchive', toArchive.length);
  for (const p of toArchive) {
    await ComturContent.updateOne({ _id: p._id }, { $set: { status: 'archived', featured: false } });
    console.log('archived', p.type, p.slug, p.title);
  }

  const after = await ComturContent.find({ status: 'published', type: 'open_data' }).select('title slug').lean();
  console.log('open_data still published:', after.map(x => x.title));
  const searchish = await ComturContent.find({
    status: 'published',
    $or: [{ title: /atrativo/i }, { summary: /atrativo/i }, { slug: /atrativo/i }],
  }).select('type title slug').lean();
  console.log('still matching atrativo:', searchish);
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
NODE

echo "=== verify API ==="
curl -sk "https://127.0.0.1/api/comtur/content?type=open_data&limit=10" | python3 -c 'import sys,json;d=json.load(sys.stdin);items=d.get("data")or[];print("open_data n=",len(items));
[print("-",i.get("title")) for i in items]'
curl -sk "https://127.0.0.1/api/comtur/content?type=attraction&limit=10" | python3 -c 'import sys,json;d=json.load(sys.stdin);items=d.get("data")or[];print("attraction n=",len(items));
[print("-",i.get("title")) for i in items]'
echo DONE
