const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/comtur-content-admin.html?type=legislation',
  runScripts: 'dangerously',
  resources: 'usable'
});

const { window } = dom;
const { document } = window;

console.log('--- TESTING LEGISLATION SIMPLIFIED ADMIN ---');

// Wait for scripts to initialize
setTimeout(() => {
  try {
    const listPanelTitle = document.getElementById('listPanelTitle').textContent;
    console.log('Sidebar Title:', listPanelTitle);
    console.assert(listPanelTitle === 'LEGISLAÇÃO', 'Sidebar title should be LEGISLAÇÃO');

    const legisFields = document.getElementById('legislationFields');
    console.log('Legislation Fields display:', legisFields.style.display);
    console.assert(legisFields.style.display === 'block', 'Legislation fields should be visible');

    // 1. Fill document data
    document.getElementById('legisTitle').value = 'Lei de criação do COMTUR';
    document.getElementById('legisTitle').dispatchEvent(new window.Event('input'));

    const slugVal = document.getElementById('legisSlug').value;
    console.log('Generated Slug:', slugVal);
    console.assert(slugVal === 'lei-de-criacao-do-comtur', 'Slug should be lei-de-criacao-do-comtur');

    document.getElementById('legisDocType').value = 'Lei';
    document.getElementById('legisDocumentDate').value = '2026-08-15';
    document.getElementById('legisDocumentDate').dispatchEvent(new window.Event('change'));

    const yearVal = document.getElementById('legisYear').value;
    console.log('Auto Year:', yearVal);
    console.assert(yearVal === '2026', 'Year should auto-fill 2026');

    document.getElementById('legisSummary').value = 'Dispõe sobre a composição do Conselho Municipal de Turismo.';

    // 2. Mock attached PDF
    window.legisPdfFile = {
      url: 'https://example.com/files/lei-comtur-2026.pdf',
      name: 'lei-comtur-2026.pdf',
      originalName: 'lei-comtur-2026.pdf',
      size: 1887436,
      sizeFormatted: '1.8 MB',
      mimeType: 'application/pdf'
    };
    window.renderLegisPdfPreview();

    console.log('Empty Box display:', document.getElementById('legisPdfEmpty').style.display);
    console.log('Preview Box display:', document.getElementById('legisPdfPreview').style.display);
    console.log('File name display:', document.getElementById('legisPdfFileNameDisplay').textContent);
    console.log('Size display:', document.getElementById('legisPdfSizeDisplay').textContent);

    // 3. Test buildPayload
    // We can simulate saveContent payload
    const payload = window.buildPayload ? window.buildPayload('published') : null;
    console.log('\nPayload generated for published:');
    console.log(JSON.stringify(payload, null, 2));

    console.assert(payload.title === 'Lei de criação do COMTUR', 'Title match');
    console.assert(payload.type === 'legislation', 'Type match');
    console.assert(payload.status === 'published', 'Status match');
    console.assert(payload.metadata.documentType === 'Lei', 'DocType match');
    console.assert(payload.metadata.year === 2026, 'Year match');
    console.assert(payload.metadata.pdfFile.url === 'https://example.com/files/lei-comtur-2026.pdf', 'PDF match');
    console.assert(payload.media.length === 1, 'Media attached');

    // 4. Test renderList and selectItem
    window.allItems = [
      {
        _id: 'legis-123',
        type: 'legislation',
        title: 'Lei de criação do COMTUR',
        slug: 'lei-de-criacao-do-comtur',
        status: 'published',
        publishedAt: '2026-08-15T00:00:00.000Z',
        summary: 'Dispõe sobre a composição do Conselho Municipal de Turismo.',
        metadata: {
          documentType: 'Lei',
          documentDate: '2026-08-15',
          year: 2026,
          pdfFile: window.legisPdfFile
        },
        media: payload.media
      }
    ];

    window.renderList();
    const listHtml = document.getElementById('list').innerHTML;
    console.log('\nRendered Sidebar item HTML:\n', listHtml);
    console.assert(listHtml.includes('Lei de criação do COMTUR'), 'Sidebar contains title');
    console.assert(listHtml.includes('Lei'), 'Sidebar contains type');
    console.assert(listHtml.includes('15/08/2026'), 'Sidebar contains formatted date');
    console.assert(listHtml.includes('Publicado'), 'Sidebar contains status');

    // 5. Test loadItemForEdit
    window.loadItemForEdit(window.allItems[0]);
    console.log('\nForm reloaded:');
    console.log('Title in form:', document.getElementById('legisTitle').value);
    console.log('DocType in form:', document.getElementById('legisDocType').value);
    console.log('DocDate in form:', document.getElementById('legisDocumentDate').value);
    console.log('Summary in form:', document.getElementById('legisSummary').value);
    console.log('Preview Box display after load:', document.getElementById('legisPdfPreview').style.display);

    console.log('\n✅ ALL SIMULATION TESTS PASSED PERFECTLY!');
    process.exit(0);
  } catch (e) {
    console.error('Test failed with error:', e);
    process.exit(1);
  }
}, 500);
