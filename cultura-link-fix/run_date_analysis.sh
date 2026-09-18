#!/bin/bash
set -euo pipefail
python3 /tmp/analyze_date_parse.py
docker exec -i api node <<'NODE'
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const CulturaPost = require('/app/models/CulturaPost');
  const posts = await CulturaPost.find({}).sort({ createdAt: -1 }).limit(5)
    .select('titulo datasHorarios createdAt publishedAt').lean();
  for (const p of posts) {
    console.log(JSON.stringify({
      titulo: p.titulo,
      datasHorarios: p.datasHorarios,
      createdAt: p.createdAt,
      publishedAt: p.publishedAt,
    }));
  }
  // timezone demo as on server
  const d = new Date('2026-09-17');
  console.log('parse YYYY-MM-DD =>', d.toISOString(), 'getDate=', d.getDate(), 'getUTCDate=', d.getUTCDate());
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
NODE
