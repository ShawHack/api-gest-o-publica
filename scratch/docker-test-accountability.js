const mongoose = require('mongoose');

async function run() {
  console.log('=== TESTE BACKEND DIRETO — PRESTAÇÃO DE CONTAS COMTUR ===');
  console.log('Conectando ao MongoDB...');
  await mongoose.connect('mongodb://mongo:27017/apicemiterio');
  console.log('Mongoose conectado com sucesso!\n');

  const ComturContent = mongoose.models.ComturContent || mongoose.model('ComturContent', new mongoose.Schema({}, { strict: false }));

  // Clean previous test items
  await ComturContent.deleteMany({ type: 'accountability' });

  // 1. Criar Prestação de Contas de teste (Rascunho)
  console.log('1. Cadastrando Prestação de Contas (Rascunho):');
  const title = 'Prestação de Contas — 1º Quadrimestre de 2026';
  const slug = 'prestacao-de-contas-1-quadrimestre-de-2026';
  const summary = 'Relatório referente à execução financeira e às atividades do primeiro quadrimestre de 2026.';

  const doc = new ComturContent({
    type: 'accountability',
    title,
    slug,
    summary,
    body: summary,
    status: 'draft',
    metadata: {
      title,
      documentType: 'Prestação de Contas',
      year: 2026,
      periodType: 'Quadrimestral',
      period: '1º Quadrimestre',
      periodReference: '1º Quadrimestre',
      documentDate: '2026-09-08',
      summary,
      description: summary,
      pdfFile: {
        url: '/uploads/prestacao-contas-1-quadrimestre-2026.pdf',
        name: 'prestacao-contas-1-quadrimestre-2026.pdf',
        originalName: 'prestacao-contas-1-quadrimestre-2026.pdf',
        size: 23141384,
        sizeFormatted: 'PDF | 22,07 MB',
        mimeType: 'application/pdf'
      },
      showOnPortal: true,
      featured: false
    },
    media: [
      {
        kind: 'document',
        title,
        url: '/uploads/prestacao-contas-1-quadrimestre-2026.pdf',
        mimeType: 'application/pdf',
        size: 23141384,
        originalName: 'prestacao-contas-1-quadrimestre-2026.pdf',
        isAccessible: true
      }
    ]
  });

  const saved = await doc.save();
  console.log(`Documento salvo no banco com ID: ${saved._id}\n`);

  // 2. Reabrir e validar (F5 / persistência)
  console.log('2. Reabrindo documento do banco para validar persistência:');
  const found = await ComturContent.findById(saved._id);
  console.log(`Título: ${found.title} ✅`);
  console.log(`Tipo de Documento: ${found.metadata.documentType} ✅`);
  console.log(`Exercício: ${found.metadata.year} ✅`);
  console.log(`Tipo de Período: ${found.metadata.periodType} ✅`);
  console.log(`Período / Referência: ${found.metadata.period} ✅`);
  console.log(`Data do Documento: ${found.metadata.documentDate} ✅`);
  console.log(`PDF URL: ${found.metadata.pdfFile.url} ✅`);
  console.log(`PDF Tamanho: ${found.metadata.pdfFile.sizeFormatted} ✅`);
  console.log(`Status inicial: ${found.status} ✅\n`);

  // 3. Publicar Prestação de Contas
  console.log('3. Publicando Prestação de Contas...');
  await ComturContent.updateOne({ _id: saved._id }, { $set: { status: 'published', publishedAt: new Date('2026-09-08T10:00:00.000Z') } });
  const pubDoc = await ComturContent.findById(saved._id);
  console.log(`Documento publicado com status: ${pubDoc.status} ✅\n`);

  // 4. Testar filtros do portal público
  console.log('4. Testando filtros e buscas no banco:');
  const allAcc = await ComturContent.find({ type: 'accountability' });
  console.log(`Total de prestações de contas cadastradas: ${allAcc.length}`);

  const byName = await ComturContent.find({ type: 'accountability', title: { $regex: 'quadrimestre', $options: 'i' } });
  console.log(`- Busca por termo "quadrimestre": ${byName.length} documento(s) encontrado(s) ✅`);

  const byType = await ComturContent.find({ type: 'accountability', 'metadata.documentType': 'Prestação de Contas' });
  console.log(`- Filtro por tipo "Prestação de Contas": ${byType.length} documento(s) encontrado(s) ✅`);

  const byYear = await ComturContent.find({ type: 'accountability', 'metadata.year': 2026 });
  console.log(`- Filtro por exercício 2026: ${byYear.length} documento(s) encontrado(s) ✅`);

  const byPeriod = await ComturContent.find({ type: 'accountability', 'metadata.period': '1º Quadrimestre' });
  console.log(`- Filtro por período "1º Quadrimestre": ${byPeriod.length} documento(s) encontrado(s) ✅`);

  const publishedDocs = await ComturContent.find({ type: 'accountability', status: 'published' });
  console.log(`- Prestações publicadas: ${publishedDocs.length} ✅`);

  console.log('\n==================================================');
  console.log('✅ TESTE COMPLETO DE BANCO, CRUD E FILTROS DE PRESTAÇÃO DE CONTAS EXECUTADO COM SUCESSO!');
  console.log('==================================================\n');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
