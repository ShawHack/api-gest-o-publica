#!/usr/bin/env node
process.chdir('/app');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ComturContent = require('/app/models/ComturContent');
const { BASE_DIR } = require('/app/helpers/image-upload');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const ts = Date.now();
  const slug = `atrativos-turisticos-${ts}`;
  const draftSlug = `rascunho-dados-${ts}`;

  // place a real CSV under comtur images dir so public download path works
  const dir = path.join(BASE_DIR, 'comtur');
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${ts}-atrativos.csv`;
  const abs = path.join(dir, filename);
  fs.writeFileSync(abs, 'nome,categoria,endereco\nParque Municipal,Atrativo,Centro\nMuseu,Atrativo,Centro\n', 'utf8');
  const url = `/images/comtur/${filename}`;

  const base = {
    type: 'open_data',
    title: 'Atrativos turísticos de Garça',
    slug,
    summary: 'Relação dos atrativos e pontos turísticos cadastrados no município de Garça.',
    body: 'Dados extraídos do cadastro municipal de turismo.',
    location: 'Secretaria de Turismo',
    featured: true,
    status: 'published',
    publishedAt: new Date(),
    media: [{
      kind: 'document',
      title: 'Atrativos turísticos de Garça',
      url,
      mimeType: 'text/csv',
      originalName: 'atrativos-turisticos.csv',
      isAccessible: true
    }],
    metadata: {
      description: 'Relação dos atrativos e pontos turísticos cadastrados no município de Garça.',
      responsibleBody: 'Secretaria de Turismo',
      category: 'Atrativos turísticos',
      source: 'Cadastro Municipal de Turismo',
      dataSource: 'Cadastro Municipal de Turismo',
      periodicity: 'Mensal',
      lastUpdated: '2026-09-15',
      format: 'CSV',
      resourceDescription: 'CSV com nome, categoria e endereço dos atrativos.',
      recordCount: 2,
      columns: 'nome, categoria, endereco',
      methodology: 'Exportação do cadastro municipal.',
      license: 'Uso público',
      dataFile: {
        url,
        name: 'atrativos-turisticos.csv',
        originalName: 'atrativos-turisticos.csv',
        format: 'CSV',
        mimeType: 'text/csv',
        uploadedAt: new Date().toISOString()
      },
      showOnPortal: true
    }
  };

  const pub = await ComturContent.create(base);
  const draft = await ComturContent.create({
    ...base,
    title: 'RASCUNHO dados abertos',
    slug: draftSlug,
    status: 'draft',
    publishedAt: null,
    featured: false
  });

  console.log(JSON.stringify({
    ok: true,
    slug,
    draftSlug,
    pubId: String(pub._id),
    draftId: String(draft._id),
    url
  }));
  await mongoose.disconnect();
})().catch((e) => {
  console.error('ERR', e && e.stack || e);
  process.exit(1);
});
