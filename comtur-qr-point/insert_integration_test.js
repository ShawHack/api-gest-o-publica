#!/usr/bin/env node
process.chdir('/app');
const mongoose = require('mongoose');
const ComturContent = require('/app/models/ComturContent');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const ts = Date.now();
  const slug = `mapaturistico-${ts}`;
  const hiddenSlug = `interna-oculta-${ts}`;

  const pub = await ComturContent.create({
    type: 'integration',
    title: 'Sincronização com Mapaturístico',
    slug,
    summary: 'Conexão do portal com o mapa turístico municipal para publicação de atrativos e pontos.',
    body: 'Integração operacional do inventário turístico.',
    location: 'Secretaria de Turismo / SEMIT',
    featured: true,
    status: 'published',
    publishedAt: new Date(),
    media: [],
    metadata: {
      description: 'Conexão do portal com o mapa turístico municipal para publicação de atrativos e pontos.',
      kind: 'Sistema interno',
      integrationType: 'Sistema interno',
      responsibleBody: 'Secretaria de Turismo / SEMIT',
      system: 'Mapaturístico',
      platform: 'Mapaturístico',
      publicUrl: 'https://api.garca.sp.gov.br/mapaturistico/',
      documentationUrl: 'https://api.garca.sp.gov.br/mapaturistico/',
      integratesWhat: 'Atrativos, pontos turísticos e geolocalização',
      scope: 'Atrativos, pontos turísticos e geolocalização',
      direction: 'Bidirecional',
      periodicity: 'Sob demanda',
      techStatus: 'Ativa',
      lastSync: '2026-09-15',
      notes: 'Não armazena credenciais neste cadastro.',
      showOnPortal: true,
      noSecrets: true
    }
  });

  const hidden = await ComturContent.create({
    type: 'integration',
    title: 'Integração interna oculta',
    slug: hiddenSlug,
    summary: 'Não deve aparecer na listagem pública.',
    body: '',
    location: 'SEMIT',
    status: 'published',
    publishedAt: new Date(),
    media: [],
    metadata: {
      description: 'Não deve aparecer na listagem pública.',
      kind: 'Sistema interno',
      system: 'Interno',
      integratesWhat: 'Monitoramento',
      direction: 'Entrada',
      periodicity: 'Diária',
      techStatus: 'Ativa',
      showOnPortal: false,
      noSecrets: true
    }
  });

  const draft = await ComturContent.create({
    type: 'integration',
    title: 'Rascunho integração',
    slug: `rascunho-int-${ts}`,
    summary: 'Rascunho',
    status: 'draft',
    location: 'SEMIT',
    metadata: {
      kind: 'Outro',
      system: 'Teste',
      integratesWhat: 'Teste',
      direction: 'Entrada',
      periodicity: 'Sob demanda',
      techStatus: 'Em teste',
      showOnPortal: true,
      noSecrets: true
    }
  });

  console.log(JSON.stringify({
    ok: true,
    slug,
    hiddenSlug,
    draftSlug: draft.slug,
    pubId: String(pub._id),
    hiddenId: String(hidden._id),
    draftId: String(draft._id)
  }));
  await mongoose.disconnect();
})().catch((e) => {
  console.error('ERR', e && e.stack || e);
  process.exit(1);
});
