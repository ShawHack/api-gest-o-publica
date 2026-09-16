const http = require('http');

console.log('=== TESTE REMOTO: CRIAÇÃO E CONSULTA DE INDICADOR (type=indicator) ===');

async function run() {
  const mongoose = require('/home/semit/Documentos/api-semit/backend/node_modules/mongoose');
  
  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/semit_agenda';
  await mongoose.connect(mongoUri);
  console.log('1. Conectado ao MongoDB com sucesso.');

  const ComturContent = mongoose.model('ComturContent', new mongoose.Schema({
    type: String,
    title: String,
    slug: String,
    summary: String,
    body: String,
    status: String,
    featured: Boolean,
    metadata: mongoose.Schema.Types.Mixed,
    publishedAt: Date
  }, { timestamps: true }), 'comtur_contents');

  // Clean old test indicator if exists
  await ComturContent.deleteMany({ slug: 'test-taxa-ocupacao-hoteleira-2026' });

  // Create automatic indicator
  const indAuto = await ComturContent.create({
    type: 'indicator',
    title: 'Total de Meios de Hospedagem Cadastrados',
    slug: 'test-total-hospedagens-auto',
    summary: 'Indicador automático gerado a partir da contagem de hospedagens publicadas.',
    status: 'published',
    featured: true,
    publishedAt: new Date(),
    metadata: {
      name: 'Total de Meios de Hospedagem Cadastrados',
      category: 'Hospedagem & Ocupação',
      description: 'Indicador automático gerado a partir da contagem de hospedagens publicadas.',
      sourceType: 'automatic',
      metricKey: 'lodging.total',
      unit: 'estabelecimentos',
      visualizationType: 'card',
      publicTitle: 'Meios de Hospedagem Cadastrados',
      publicDesc: 'Total de estabelecimentos hoteleiros ativos na base do COMTUR.',
      showObservatory: true,
      featured: true,
      measurements: []
    }
  });
  console.log('2. Indicador Automático criado com ID:', indAuto._id.toString());

  // Create manual indicator with time-series measurements
  const indManual = await ComturContent.create({
    type: 'indicator',
    title: 'Taxa Média de Ocupação Hoteleira',
    slug: 'test-taxa-ocupacao-hoteleira-2026',
    summary: 'Série histórica mensal da taxa de ocupação da rede hoteleira de Garça.',
    status: 'published',
    featured: true,
    publishedAt: new Date(),
    metadata: {
      name: 'Taxa Média de Ocupação Hoteleira',
      category: 'Hospedagem & Ocupação',
      description: 'Série histórica mensal da taxa de ocupação da rede hoteleira de Garça.',
      sourceType: 'manual',
      unit: '%',
      periodicity: 'Mensal',
      source: 'Pesquisa Amostral COMTUR / Hotéis de Garça',
      sourceUrl: 'https://turismo.garca.sp.gov.br',
      visualizationType: 'line_chart',
      publicTitle: 'Taxa Média de Ocupação Hoteleira',
      publicDesc: 'Percentual médio de leitos ocupados mensalmente no município.',
      showObservatory: true,
      featured: true,
      measurements: [
        { period: 'Jan/2026', date: '2026-01-31', value: '78,5', source: 'Amostra COMTUR', notes: 'Alta temporada de férias' },
        { period: 'Fev/2026', date: '2026-02-28', value: '82,0', source: 'Amostra COMTUR', notes: 'Período de Carnaval' },
        { period: 'Mar/2026', date: '2026-03-31', value: '64,2', source: 'Amostra COMTUR', notes: 'Início do outono' },
        { period: 'Abr/2026', date: '2026-04-30', value: '71,8', source: 'Amostra COMTUR', notes: 'Feriados prolongados' }
      ]
    }
  });
  console.log('3. Indicador Manual (Série Histórica) criado com ID:', indManual._id.toString());

  // Verify retrieval
  const found = await ComturContent.find({ type: 'indicator', status: 'published' });
  console.log(`4. Total de indicadores ativos encontrados no banco: ${found.length}`);
  
  const manualFound = found.find(i => i.slug === 'test-taxa-ocupacao-hoteleira-2026');
  if (manualFound && manualFound.metadata?.measurements?.length === 4) {
    console.log('✅ Medições da série histórica persistidas com sucesso (4 registros)!');
  } else {
    throw new Error('Falha ao validar série histórica persistida.');
  }

  // Cleanup test documents
  await ComturContent.deleteMany({ slug: { $in: ['test-total-hospedagens-auto', 'test-taxa-ocupacao-hoteleira-2026'] } });
  console.log('5. Limpeza de registros de teste concluída.');

  await mongoose.disconnect();
  console.log('=== TESTE REMOTO CONCLUÍDO COM 100% DE SUCESSO! ===');
}

run().catch(err => {
  console.error('❌ Erro no teste remoto:', err);
  process.exit(1);
});
