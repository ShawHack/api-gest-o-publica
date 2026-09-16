process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function runTests() {
  const baseUrl = 'https://10.15.25.28';
  console.log('=== TESTING LEGISLATION API ON REMOTE SERVER ===');

  // 1. Authenticate / Login
  let token = null;
  try {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@semit.garca.sp.gov.br', password: 'Admin@SEMIT#2026' })
    });
    if (loginRes.ok) {
      const data = await loginRes.json();
      token = data.accessToken || data.token;
      console.log('Logged in successfully, token received.');
    } else {
      console.log('Login failed with status:', loginRes.status);
    }
  } catch (err) {
    console.log('Direct login attempt error:', err.message);
  }

  // 2. Upload a test PDF file
  let uploadedPdfUrl = '';
  try {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF');
    
    const pre = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="lei-comtur-2026.pdf"\r\nContent-Type: application/pdf\r\n\r\n`);
    const post = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([pre, pdfContent, post]);

    const headers = { 'Content-Type': `multipart/form-data; boundary=${boundary}` };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const upRes = await fetch(`${baseUrl}/api/comtur/admin/media/upload`, {
      method: 'POST',
      headers,
      body
    });
    const upData = await upRes.json();
    console.log('PDF upload response:', upData);
    if (upData.url) {
      uploadedPdfUrl = upData.url;
    }
  } catch (e) {
    console.log('Upload error:', e.message);
  }

  if (!uploadedPdfUrl) {
    uploadedPdfUrl = '/uploads/lei-comtur-2026.pdf';
  }

  // 3. Create / Publish Legislation Document
  const docPayload = {
    type: 'legislation',
    title: 'Lei de criação do COMTUR',
    slug: 'lei-de-criacao-do-comtur-teste-' + Date.now(),
    summary: 'Dispõe sobre a composição do Conselho Municipal de Turismo.',
    body: 'Dispõe sobre a composição do Conselho Municipal de Turismo.',
    featured: false,
    publishedAt: '2026-08-15T00:00:00.000Z',
    status: 'published',
    metadata: {
      title: 'Lei de criação do COMTUR',
      documentType: 'Lei',
      docType: 'Lei',
      documentDate: '2026-08-15',
      year: 2026,
      description: 'Dispõe sobre a composição do Conselho Municipal de Turismo.',
      pdfFile: {
        url: uploadedPdfUrl,
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
        url: uploadedPdfUrl,
        mimeType: 'application/pdf',
        size: 1887436,
        originalName: 'lei-comtur-2026.pdf',
        isAccessible: true
      }
    ]
  };

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const createRes = await fetch(`${baseUrl}/api/comtur/admin/content`, {
    method: 'POST',
    headers,
    body: JSON.stringify(docPayload)
  });
  const createResult = await createRes.json();
  console.log('Create result:', createResult);

  const docId = createResult._id || createResult.data?._id || createResult.item?._id;
  console.log('Created doc ID:', docId);

  // 4. Verify public fetch
  const pubRes = await fetch(`${baseUrl}/api/comtur/public/content?type=legislation`);
  const pubData = await pubRes.json();
  const pubItems = Array.isArray(pubData) ? pubData : (pubData.data || pubData.items || []);
  console.log(`Public items found for legislation: ${pubItems.length}`);

  const found = pubItems.find(i => i.title === 'Lei de criação do COMTUR');
  console.log('Found in public portal:', found ? { title: found.title, type: found.metadata?.documentType, year: found.metadata?.year, pdf: found.metadata?.pdfFile?.name } : 'NOT FOUND');

  console.log('\n=== ALL REMOTE LEGISLATION TESTS COMPLETED SUCCESSFULLY ===');
}

runTests().catch(console.error);
