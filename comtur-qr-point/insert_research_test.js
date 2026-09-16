#!/usr/bin/env node
const path = require('path');
process.chdir('/app');
const mongoose = require('mongoose');
const ComturContent = require('/app/models/ComturContent');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const ts = Date.now();
  const slug = `pesquisa-teste-satisfacao-${ts}`;
  const draftSlug = `pesquisa-rascunho-${ts}`;
  const base = {
    type: 'research',
    title: 'Pesquisa de Satisfação do Turista – Garça 2026',
    slug,
    summary: 'Avaliar a percepção dos visitantes sobre o turismo em Garça.',
    body: 'Coleta presencial com questionário estruturado em pontos turísticos.',
    location: 'Município de Garça',
    featured: true,
    status: 'published',
    startsAt: new Date('2026-06-01'),
    endsAt: new Date('2026-07-31'),
    publishedAt: new Date(),
    media: [
      { kind: 'image', title: 'Capa', url: '/uploads/comtur/test-cover.jpg', mimeType: 'image/jpeg' },
      { kind: 'document', title: 'Relatório', url: '/uploads/comtur/test-relatorio.pdf', mimeType: 'application/pdf', originalName: 'relatorio.pdf' }
    ],
    metadata: {
      objective: 'Avaliar a percepção dos visitantes sobre o turismo em Garça.',
      responsibleBody: 'Secretaria de Turismo / COMTUR',
      audience: 'Turistas',
      coverage: 'Município de Garça',
      participants: 500,
      methodology: 'Coleta presencial com questionário estruturado em pontos turísticos.',
      summaryResults: 'Satisfação geral elevada, com pontos de melhoria na sinalização.',
      conclusions: 'Priorizar sinalização e manutenção de atrativos.',
      highlightedResults: [
        { indicator: 'Satisfação geral', value: 87, unit: '%' },
        { indicator: 'Avaliação dos atrativos turísticos', value: 91, unit: '%' },
        { indicator: 'Avaliação da sinalização turística', value: 72, unit: '%' }
      ],
      startDate: '2026-06-01',
      endDate: '2026-07-31',
      coverUrl: '/uploads/comtur/test-cover.jpg',
      pdfFile: { url: '/uploads/comtur/test-relatorio.pdf', name: 'relatorio.pdf' },
      showOnPortal: true
    }
  };
  const pub = await ComturContent.create(base);
  const draft = await ComturContent.create({
    ...base,
    title: 'Pesquisa RASCUNHO não deve aparecer',
    slug: draftSlug,
    status: 'draft',
    publishedAt: null,
    featured: false
  });
  console.log(JSON.stringify({
    ok: true,
    collection: ComturContent.collection.name,
    pubId: String(pub._id),
    draftId: String(draft._id),
    slug,
    draftSlug
  }));
  await mongoose.disconnect();
})().catch((e) => {
  console.error('ERR', e && e.stack || e);
  process.exit(1);
});
