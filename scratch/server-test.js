const http = require('http');

const testDoc = {
  type: 'legislation',
  title: 'Lei de criação do COMTUR',
  slug: 'lei-de-criacao-do-comtur-' + Date.now(),
  summary: 'Dispõe sobre a criação do Conselho Municipal de Turismo e dá outras providências.',
  body: 'Dispõe sobre a criação do Conselho Municipal de Turismo e dá outras providências.',
  status: 'published',
  publishedAt: '2026-08-15T00:00:00.000Z',
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
};

const payload = JSON.stringify(testDoc);

const req = http.request({
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/comtur/content',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Post status:', res.statusCode);
    console.log('Post response:', body);

    // Now test GET
    const getReq = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/comtur/content?type=legislation',
      method: 'GET'
    }, (gRes) => {
      let gBody = '';
      gRes.on('data', c => gBody += c);
      gRes.on('end', () => {
        try {
          const list = JSON.parse(gBody);
          const docs = Array.isArray(list) ? list : (list.data || list.items || []);
          console.log('\nTotal legislation documents in DB:', docs.length);
          const found = docs.find(i => i.title === 'Lei de criação do COMTUR');
          if (found) {
            console.log('✅ Document created, retrieved and verified successfully in DB:');
            console.log('  ID:', found._id);
            console.log('  Título:', found.title);
            console.log('  Tipo:', found.metadata?.documentType);
            console.log('  Data:', found.metadata?.documentDate);
            console.log('  Ano:', found.metadata?.year);
            console.log('  Status:', found.status);
            console.log('  PDF:', found.metadata?.pdfFile);
            console.log('  Media:', found.media);
          } else {
            console.log('❌ Document not found in list response');
          }
        } catch (e) {
          console.log('GET parse error:', e.message, gBody.slice(0, 200));
        }
      });
    });
    getReq.end();
  });
});

req.on('error', (err) => {
  console.log('HTTP error:', err.message);
});

req.write(payload);
req.end();
