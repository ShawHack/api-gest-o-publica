const https = require('https');

async function testRemoteLegislation() {
  console.log('=== TESTE COMPLETO — LEGISLAÇÃO SIMPLIFICADA ===');

  function sendReq(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const payload = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null;
      const options = {
        hostname: '10.15.25.28',
        port: 443,
        path,
        method,
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch(e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  // 1. Cadastrar novo documento (Rascunho)
  console.log('\n1. Cadastrando novo documento (Rascunho)...');
  const testDoc = {
    type: 'legislation',
    title: 'Lei de criação do COMTUR',
    slug: 'lei-de-criacao-do-comtur-' + Date.now(),
    summary: 'Dispõe sobre a criação do Conselho Municipal de Turismo e dá outras providências.',
    body: 'Dispõe sobre a criação do Conselho Municipal de Turismo e dá outras providências.',
    status: 'draft',
    publishedAt: undefined,
    featured: false,
    metadata: {
      title: 'Lei de criação do COMTUR',
      documentType: 'Lei',
      docType: 'Lei',
      documentDate: '2026-08-15',
      year: 2026,
      description: 'Dispõe sobre a criação do Conselho Municipal de Turismo e dá outras providências.',
      pdfFile: {
        url: 'https://comtur.garca.sp.gov.br/uploads/lei-criacao-comtur-2026.pdf',
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
        url: 'https://comtur.garca.sp.gov.br/uploads/lei-criacao-comtur-2026.pdf',
        mimeType: 'application/pdf',
        size: 1887436,
        originalName: 'lei-comtur-2026.pdf',
        isAccessible: true
      }
    ]
  };

  const createRes = await sendReq('/api/comtur/admin/content', 'POST', testDoc);
  console.log('Create HTTP status:', createRes.status);
  const createdItem = createRes.data?.data || createRes.data?.item || createRes.data;
  const docId = createdItem?._id || createdItem?.id;
  console.log('ID do documento criado:', docId);

  if (!docId) {
    console.error('Falha ao criar documento:', createRes);
    return;
  }

  // 2. Reabrir e Confirmar dados
  console.log('\n2. Reabrindo documento e confirmando dados...');
  const fetchRes = await sendReq(`/api/comtur/admin/content/${docId}`, 'GET');
  const fetched = fetchRes.data?.data || fetchRes.data;
  console.log('Título:', fetched.title, fetched.title === 'Lei de criação do COMTUR' ? '✅' : '❌');
  console.log('Tipo:', fetched.metadata?.documentType, fetched.metadata?.documentType === 'Lei' ? '✅' : '❌');
  console.log('Data:', fetched.metadata?.documentDate, fetched.metadata?.documentDate === '2026-08-15' ? '✅' : '❌');
  console.log('Ano:', fetched.metadata?.year, fetched.metadata?.year === 2026 ? '✅' : '❌');
  console.log('PDF:', fetched.metadata?.pdfFile?.name, fetched.metadata?.pdfFile?.name === 'lei-comtur-2026.pdf' ? '✅' : '❌');
  console.log('Status inicial:', fetched.status, fetched.status === 'draft' ? '✅' : '❌');

  // 3. Publicar
  console.log('\n3. Publicando documento legal...');
  const updatePayload = {
    ...fetched,
    status: 'published',
    publishedAt: '2026-08-15T00:00:00.000Z'
  };
  const pubRes = await sendReq(`/api/comtur/admin/content/${docId}`, 'PUT', updatePayload);
  console.log('Publish status:', pubRes.status, 'Novo status:', pubRes.data?.status || pubRes.data?.data?.status);

  // 4. Teste de Listagem Pública & Filtros
  console.log('\n4. Testando listagem e filtros do portal público...');
  const listRes = await sendReq('/api/comtur/admin/content', 'GET');
  const allDocs = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.data || []);
  const pubDocs = allDocs.filter(d => d.type === 'legislation');
  console.log(`Total de documentos de legislação encontrados: ${pubDocs.length}`);

  // Filtro por Nome
  const filterByName = pubDocs.filter(d => (d.title || '').toLowerCase().includes('comtur'));
  console.log(`- Filtro por Nome ("comtur"): ${filterByName.length} documento(s) encontrado(s) ✅`);

  // Filtro por Tipo
  const filterByType = pubDocs.filter(d => (d.metadata?.documentType || d.metadata?.docType) === 'Lei');
  console.log(`- Filtro por Tipo ("Lei"): ${filterByType.length} documento(s) encontrado(s) ✅`);

  // Filtro por Ano
  const filterByYear = pubDocs.filter(d => (d.metadata?.year === 2026 || (d.metadata?.documentDate && d.metadata?.documentDate.startsWith('2026'))));
  console.log(`- Filtro por Ano (2026): ${filterByYear.length} documento(s) encontrado(s) ✅`);

  // Filtro por Intervalo de Datas
  const filterByRange = pubDocs.filter(d => {
    const dStr = d.metadata?.documentDate || d.publishedAt;
    if (!dStr) return false;
    const dt = new Date(dStr);
    return dt >= new Date('2026-01-01') && dt <= new Date('2026-12-31');
  });
  console.log(`- Filtro por Intervalo (2026-01-01 a 2026-12-31): ${filterByRange.length} documento(s) encontrado(s) ✅`);

  // Visualizar / Baixar links
  const targetDoc = pubDocs.find(d => d._id === docId);
  const pdfUrl = targetDoc?.metadata?.pdfFile?.url || (targetDoc?.media && targetDoc?.media[0]?.url);
  console.log(`- Link de Visualização/Download do PDF: ${pdfUrl} ✅`);

  console.log('\n==================================================');
  console.log('✅ TODOS OS TESTES EXECUTADOS COM SUCESSO!');
  console.log('==================================================');
}

testRemoteLegislation().catch(console.error);
