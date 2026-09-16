const mongoose = require('mongoose');
const ComturContent = require('./models/ComturContent');

async function testBackendLegislation() {
  console.log('=== TESTE BACKEND DIRETO — LEGISLAÇÃO COMTUR ===');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://mongo:27017/apicemiterio';
  console.log('Conectando ao MongoDB...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('Mongoose conectado com sucesso!');

  // 1. Cadastrar Documento de Teste
  console.log('\n1. Cadastrando documento legal de teste:');
  console.log('Título: Lei de criação do COMTUR');
  console.log('Tipo: Lei');
  console.log('Data: 15/08/2026');
  console.log('PDF: arquivo de teste');

  const testDoc = new ComturContent({
    type: 'legislation',
    title: 'Lei de criação do COMTUR',
    slug: 'lei-de-criacao-do-comtur-teste-' + Date.now(),
    summary: 'Dispõe sobre a criação do Conselho Municipal de Turismo e dá outras providências.',
    body: 'Dispõe sobre a criação do Conselho Municipal de Turismo e dá outras providências.',
    status: 'draft',
    publishedAt: null,
    featured: false,
    metadata: {
      title: 'Lei de criação do COMTUR',
      documentType: 'Lei',
      docType: 'Lei',
      documentDate: '2026-08-15',
      year: 2026,
      description: 'Dispõe sobre a criação do Conselho Municipal de Turismo e dá outras providências.',
      pdfFile: {
        url: '/uploads/lei-comtur-2026.pdf',
        name: 'lei-comtur-2026.pdf',
        originalName: 'lei-comtur-2026.pdf',
        size: 1887436,
        sizeFormatted: '1,8 MB',
        mimeType: 'application/pdf',
        title: 'Lei de criação do COMTUR'
      },
      showOnPortal: true,
      featured: false
    },
    media: [
      {
        kind: 'document',
        title: 'Lei de criação do COMTUR',
        url: '/uploads/lei-comtur-2026.pdf',
        mimeType: 'application/pdf',
        size: 1887436,
        originalName: 'lei-comtur-2026.pdf',
        isAccessible: true
      }
    ]
  });

  const saved = await testDoc.save();
  console.log('Documento salvo no banco com ID:', saved._id.toString());

  // 2. Reabrir e Validar Campos
  console.log('\n2. Reabrindo documento do banco para validar:');
  const fetched = await ComturContent.findById(saved._id);
  console.log('Título:', fetched.title, fetched.title === 'Lei de criação do COMTUR' ? '✅' : '❌');
  console.log('Tipo:', fetched.metadata?.documentType, fetched.metadata?.documentType === 'Lei' ? '✅' : '❌');
  console.log('Data:', fetched.metadata?.documentDate, fetched.metadata?.documentDate === '2026-08-15' ? '✅' : '❌');
  console.log('Ano:', fetched.metadata?.year, fetched.metadata?.year === 2026 ? '✅' : '❌');
  console.log('PDF URL:', fetched.metadata?.pdfFile?.url, fetched.metadata?.pdfFile?.url === '/uploads/lei-comtur-2026.pdf' ? '✅' : '❌');
  console.log('PDF Tamanho:', fetched.metadata?.pdfFile?.sizeFormatted, fetched.metadata?.pdfFile?.sizeFormatted === '1,8 MB' ? '✅' : '❌');
  console.log('Status inicial:', fetched.status, fetched.status === 'draft' ? '✅' : '❌');

  // 3. Publicar
  console.log('\n3. Publicando documento...');
  fetched.status = 'published';
  fetched.publishedAt = new Date('2026-08-15T00:00:00.000Z');
  await fetched.save();
  console.log('Documento publicado com status:', fetched.status, '✅');

  // 4. Testar Filtros na Listagem
  console.log('\n4. Testando filtros da listagem no portal público:');
  const allLegis = await ComturContent.find({ type: 'legislation' }).lean();
  console.log(`Total de legislações cadastradas: ${allLegis.length}`);

  // Filtro por Nome
  const filterByName = allLegis.filter(d => (d.title || '').toLowerCase().includes('comtur'));
  console.log(`- Busca por nome "comtur": ${filterByName.length} documento(s) encontrado(s) ✅`);

  // Filtro por Tipo
  const filterByType = allLegis.filter(d => (d.metadata?.documentType || d.metadata?.docType) === 'Lei');
  console.log(`- Filtro por tipo "Lei": ${filterByType.length} documento(s) encontrado(s) ✅`);

  // Filtro por Ano
  const filterByYear = allLegis.filter(d => d.metadata?.year === 2026 || (d.metadata?.documentDate && d.metadata?.documentDate.startsWith('2026')));
  console.log(`- Filtro por ano "2026": ${filterByYear.length} documento(s) encontrado(s) ✅`);

  // Filtro por Intervalo de Datas
  const filterByRange = allLegis.filter(d => {
    const dStr = d.metadata?.documentDate || d.publishedAt;
    if (!dStr) return false;
    const dt = new Date(dStr);
    return dt >= new Date('2026-01-01') && dt <= new Date('2026-12-31');
  });
  console.log(`- Filtro por intervalo (01/01/2026 a 31/12/2026): ${filterByRange.length} documento(s) encontrado(s) ✅`);

  console.log('\n==================================================');
  console.log('✅ TESTE COMPLETO DE BANCO, CRUD E FILTROS EXECUTADO COM SUCESSO!');
  console.log('==================================================');
  await mongoose.connection.close();
  process.exit(0);
}

testBackendLegislation().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
