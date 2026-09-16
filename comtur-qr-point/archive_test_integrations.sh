#!/bin/bash
set -euo pipefail
docker exec -i api node <<'NODE'
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const ComturContent = require('/app/models/ComturContent');
  const published = await ComturContent.find({
    status: 'published',
    type: { $in: ['open_data', 'research', 'integration'] },
  }).select('title slug type').lean();
  console.log('before', published);
  for (const p of published) {
    // timestamped e2e leftovers
    if (/-\d{10,}$/.test(p.slug || '') || /oculta|teste|test|rascunho/i.test(`${p.slug} ${p.title}`)) {
      await ComturContent.updateOne({ _id: p._id }, { $set: { status: 'archived', featured: false } });
      console.log('archived', p.slug);
    }
  }
  const after = await ComturContent.find({
    status: 'published',
    type: { $in: ['open_data', 'research', 'integration'] },
  }).select('title slug type').lean();
  console.log('after', after);
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
NODE
echo DONE
