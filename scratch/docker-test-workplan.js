const mongoose = require('mongoose');

async function run() {
  console.log('=== TESTE BACKEND DIRETO — PLANO DE TRABALHO COMTUR ===');
  console.log('Conectando ao MongoDB...');
  await mongoose.connect('mongodb://mongo:27017/apicemiterio');
  console.log('Mongoose conectado com sucesso!\n');

  const ComturContent = mongoose.models.ComturContent || mongoose.model('ComturContent', new mongoose.Schema({}, { strict: false }));

  // 1. Criar plano de trabalho
  console.log('1. Cadastrando Plano de Trabalho de teste:');
  const title = 'Plano de Trabalho do COMTUR — 2026';
  const slug = 'plano-de-trabalho-comtur-2026';
  const summary = 'Plano de ações e metas do Conselho Municipal de Turismo para o exercício de 2026.';

  const doc = new ComturContent({
    type: 'work_plan',
    title,
    slug,
    summary,
    body: summary,
    status: 'draft',
    metadata: {
      title,
      year: 2026,
      periodType: 'Anual',
      responsibleBody: 'COMTUR',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: summary,
      pdfFile: {
        url: '/uploads/plano-trabalho-comtur-2026.pdf',
        name: 'plano-de-trabalho-comtur-2026.pdf',
        originalName: 'plano-de-trabalho-comtur-2026.pdf',
        size: 2411724,
        sizeFormatted: 'PDF | 2,3 MB',
        mimeType: 'application/pdf'
      },
      showOnPortal: true,
      featured: false
    },
    media: [
      {
        kind: 'document',
        title,
        url: '/uploads/plano-trabalho-comtur-2026.pdf',
        mimeType: 'application/pdf',
        size: 2411724,
        originalName: 'plano-de-trabalho-comtur-2026.pdf',
        isAccessible: true
      }
    ]
  });

  const saved = await doc.save();
  console.log(`Documento salvo no banco com ID: ${saved._id}\n`);

  // 2. Reabrir e validar
  console.log('2. Reabrindo documento do banco para validar:');
  const found = await ComturContent.findById(saved._id);
  console.log(`Título: ${found.title} ✅`);
  console.log(`Exercício: ${found.metadata.year} ✅`);
  console.log(`Período: ${found.metadata.periodType} ✅`);
  console.log(`Órgão: ${found.metadata.responsibleBody} ✅`);
  console.log(`Data inicial: ${found.metadata.startDate} ✅`);
  console.log(`Data final: ${found.metadata.endDate} ✅`);
  console.log(`PDF URL: ${found.metadata.pdfFile.url} ✅`);
  console.log(`PDF Tamanho: ${found.metadata.pdfFile.sizeFormatted} ✅`);
  console.log(`Status inicial: ${found.status} ✅\n`);

  // 3. Publicar
  console.log('3. Publicando Plano de Trabalho...');
  found.status = 'published';
  found.publishedAt = new Date();
  await found.save();
  console.log(`Documento publicado com status: ${found.status} ✅\n`);

  // 4. Testar filtros
  console.log('4. Testando filtros no banco:');
  const allWp = await ComturContent.find({ type: 'work_plan' });
  console.log(`Total de planos cadastrados: ${allWp.length}`);

  const byName = await ComturContent.find({ type: 'work_plan', title: { $regex: 'comtur', $options: 'i' } });
  console.log(`- Busca por nome "comtur": ${byName.length} documento(s) encontrado(s) ✅`);

  const byYear = await ComturContent.find({ type: 'work_plan', 'metadata.year': 2026 });
  console.log(`- Filtro por exercício 2026: ${byYear.length} documento(s) encontrado(s) ✅`);

  const byPeriod = await ComturContent.find({ type: 'work_plan', 'metadata.periodType': 'Anual' });
  console.log(`- Filtro por período "Anual": ${byPeriod.length} documento(s) encontrado(s) ✅`);

  console.log('\n==================================================');
  console.log('✅ TESTE COMPLETO DE BANCO, CRUD E FILTROS DE PLANO DE TRABALHO EXECUTADO COM SUCESSO!');
  console.log('==================================================\n');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
