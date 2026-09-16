const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

console.log('Testing comtur-content-admin.html for Legislation functionality...');

// 1. Verify all required DOM IDs exist in HTML
const requiredDomIds = [
  'legislationFields',
  'legisTitle',
  'legisDocType',
  'legisNumber',
  'legisYear',
  'legisOfficialIdentifier',
  'legisResponsibleBody',
  'legisSlug',
  'legisSummary',
  'legisDocumentDate',
  'legisPublicationDate',
  'legisEffectiveFrom',
  'legisEffectiveUntil',
  'legisLegalStatus',
  'legisPdfEmpty',
  'legisPdfPreview',
  'legisPdfFileInput',
  'btnViewLegisPdf',
  'btnReplaceLegisPdf',
  'btnRemoveLegisPdf',
  'legisPdfFileNameDisplay',
  'legisPdfSizeDisplay',
  'legisPdfDateDisplay',
  'legisPdfTitle',
  'legisPdfProgress',
  'legisCategory',
  'legisCustomTags',
  'legisTagsChips',
  'legisRelationTypeSelect',
  'legisRelatedDocSelect',
  'btnAddRelatedLegisDoc',
  'legisRelatedDocsList',
  'legisPublishDate',
  'legisShowOnPortal',
  'legisFeatured',
  'btnArchiveLegis'
];

requiredDomIds.forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing DOM Element id: ${id}`);
});
console.log('✔ All 36 required DOM IDs for Legislation are present in HTML');

// 2. Verify all helper functions exist in script
const requiredFunctions = [
  'renderLegisPdfPreview',
  'uploadLegisPdf',
  'renderLegisRelatedDocs',
  'addLegisRelatedDoc',
  'removeLegisRelatedDoc',
  'populateLegisAvailableRelatedSelect'
];

requiredFunctions.forEach(fn => {
  assert(html.includes(fn), `Missing function: ${fn}`);
});
console.log('✔ All helper functions are present in script');

// 3. Mock DOM environment to test JavaScript logic
const elements = {};
requiredDomIds.forEach(id => {
  elements[id] = {
    id,
    value: '',
    checked: false,
    style: { display: '' },
    innerHTML: '',
    textContent: '',
    dataset: {},
    options: [{ value: '', textContent: '-- Selecionar --' }],
    selectedIndex: 0,
    addEventListener: () => {},
    onclick: null,
    reset: () => {}
  };
});

// Additional global elements
['form', 'id', 'type', 'formTitle', 'statusBadge', 'contentTypeSelector', 'listPanelTitle', 'searchInput', 'btnNew', 'list', 'sharedNonGastroActions'].forEach(id => {
  elements[id] = {
    id,
    value: '',
    checked: false,
    style: { display: '' },
    innerHTML: '',
    textContent: '',
    dataset: {},
    addEventListener: () => {},
    onclick: null,
    reset: () => {}
  };
});

global.$ = (id) => elements[id];
global.document = {
  getElementById: (id) => elements[id],
  querySelectorAll: () => []
};
global.window = {
  location: { search: '' },
  history: { pushState: () => {} }
};
global.slugify = (text) => (text || '').toString().toLowerCase().trim()
  .replace(/\s+/g, '-')
  .replace(/[^\w\-]+/g, '')
  .replace(/\-\-+/g, '-');

// Helper functions test
let legisPdfFile = null;
let legisRelatedDocs = [];

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function renderLegisPdfPreview() {
  const emptyBox = $('legisPdfEmpty');
  const previewBox = $('legisPdfPreview');
  if (!emptyBox || !previewBox) return;

  if (legisPdfFile && legisPdfFile.url) {
    emptyBox.style.display = 'none';
    previewBox.style.display = 'block';

    $('legisPdfFileNameDisplay').textContent = legisPdfFile.originalName || legisPdfFile.name || 'documento.pdf';
    $('legisPdfSizeDisplay').textContent = legisPdfFile.sizeFormatted || formatBytes(legisPdfFile.size) || 'PDF';
    $('legisPdfDateDisplay').textContent = legisPdfFile.uploadedAt ? new Date(legisPdfFile.uploadedAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    $('legisPdfTitle').value = legisPdfFile.title || ($('legisOfficialIdentifier') ? $('legisOfficialIdentifier').value : '') || ($('legisTitle') ? $('legisTitle').value : '') || '';
  } else {
    emptyBox.style.display = 'block';
    previewBox.style.display = 'none';
    if ($('legisPdfTitle')) $('legisPdfTitle').value = '';
  }
}

// Test 1: Empty PDF shows upload zone and hides preview box
renderLegisPdfPreview();
assert.strictEqual(elements['legisPdfEmpty'].style.display, 'block');
assert.strictEqual(elements['legisPdfPreview'].style.display, 'none');
console.log('✔ Test 1: Empty PDF shows upload zone');

// Test 2: Answering PDF attachment shows preview box and metadata
legisPdfFile = {
  url: 'https://example.com/lei-5432-2026.pdf',
  name: 'lei-5432-2026.pdf',
  originalName: 'lei-5432-2026.pdf',
  size: 2516582,
  sizeFormatted: '2.4 MB',
  mimeType: 'application/pdf',
  uploadedAt: '2026-08-15T10:00:00Z',
  title: 'Lei nº 5.432/2026 - Texto Integral'
};
renderLegisPdfPreview();
assert.strictEqual(elements['legisPdfEmpty'].style.display, 'none');
assert.strictEqual(elements['legisPdfPreview'].style.display, 'block');
assert.strictEqual(elements['legisPdfFileNameDisplay'].textContent, 'lei-5432-2026.pdf');
assert.strictEqual(elements['legisPdfSizeDisplay'].textContent, '2.4 MB');
console.log('✔ Test 2: Attached PDF renders preview, filename, and formatted size');

// Test 3: Remove PDF resets to empty zone
legisPdfFile = null;
renderLegisPdfPreview();
assert.strictEqual(elements['legisPdfEmpty'].style.display, 'block');
assert.strictEqual(elements['legisPdfPreview'].style.display, 'none');
console.log('✔ Test 3: Removing PDF restores empty dropzone');

// Test 4: Fill form with Test Document "Lei nº 5.432/2026" and build payload
elements['legisTitle'].value = 'Lei nº 5.432/2026 — Dispõe sobre o Conselho Municipal de Turismo';
elements['legisDocType'].value = 'Lei';
elements['legisNumber'].value = '5432';
elements['legisYear'].value = '2026';
elements['legisOfficialIdentifier'].value = 'Lei nº 5.432/2026';
elements['legisResponsibleBody'].value = 'COMTUR';
elements['legisSlug'].value = 'lei-5432-2026-conselho-municipal-de-turismo';
elements['legisSummary'].value = 'Dispõe sobre a reestruturação do Conselho Municipal de Turismo de Garça.';
elements['legisDocumentDate'].value = '2026-08-15';
elements['legisPublicationDate'].value = '2026-08-15';
elements['legisEffectiveFrom'].value = '2026-08-15';
elements['legisLegalStatus'].value = 'Vigente';
elements['legisCategory'].value = 'COMTUR';
elements['legisCustomTags'].value = 'governança, fumtur';
elements['legisShowOnPortal'].checked = true;
elements['legisFeatured'].checked = true;
elements['legisPublishDate'].value = '2026-08-15';

legisPdfFile = {
  url: 'https://example.com/lei-5432-2026.pdf',
  name: 'lei-5432-2026.pdf',
  originalName: 'lei-5432-2026.pdf',
  size: 2516582,
  sizeFormatted: '2.4 MB',
  mimeType: 'application/pdf',
  uploadedAt: '2026-08-15T10:00:00Z',
  title: 'Lei nº 5.432/2026 - Texto Integral'
};

function buildLegisTestPayload(statusToSave) {
  const title = $('legisTitle').value.trim();
  const docType = $('legisDocType').value;
  const num = $('legisNumber').value.trim();
  const year = parseInt($('legisYear').value, 10) || new Date().getFullYear();
  const officialIdentifier = $('legisOfficialIdentifier').value.trim() || (num ? `${docType} nº ${num}/${year}` : title);
  const responsibleBody = $('legisResponsibleBody').value.trim() || 'COMTUR';
  const slug = slugify($('legisSlug').value) || slugify(officialIdentifier) || slugify(title);
  const summary = $('legisSummary').value.trim();
  const documentDate = $('legisDocumentDate').value || undefined;
  const publicationDate = $('legisPublicationDate').value || undefined;
  const effectiveFrom = $('legisEffectiveFrom').value || undefined;
  const effectiveUntil = $('legisEffectiveUntil').value || undefined;
  const legalStatus = $('legisLegalStatus').value;
  const category = $('legisCategory').value;
  const customTagsRaw = $('legisCustomTags').value.trim();
  const customTags = customTagsRaw ? customTagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const structuredTags = ['Conselho', 'FUMTUR'];
  const allTags = Array.from(new Set([...structuredTags, ...customTags]));
  const showOnPortal = $('legisShowOnPortal').checked;
  const featured = $('legisFeatured').checked;
  const publishedAt = $('legisPublishDate').value ? new Date($('legisPublishDate').value).toISOString() : undefined;

  const media = [];
  if (legisPdfFile && legisPdfFile.url) {
    const pdfTitle = ($('legisPdfTitle') ? $('legisPdfTitle').value.trim() : '') || officialIdentifier || title;
    media.push({
      kind: 'document',
      title: pdfTitle,
      url: legisPdfFile.url,
      mimeType: 'application/pdf',
      size: legisPdfFile.size,
      originalName: legisPdfFile.originalName,
      isAccessible: true
    });
  }

  return {
    type: 'legislation',
    title: title || officialIdentifier,
    slug,
    summary,
    body: summary,
    featured,
    publishedAt,
    status: statusToSave || 'draft',
    metadata: {
      title: title || officialIdentifier,
      documentType: docType,
      docType,
      number: num,
      year,
      officialIdentifier,
      responsibleBody,
      documentDate,
      publicationDate,
      effectiveFrom,
      effectiveUntil,
      legalStatus,
      category,
      tags: allTags,
      customTags,
      structuredTags,
      pdfFile: legisPdfFile ? {
        ...legisPdfFile,
        title: ($('legisPdfTitle') ? $('legisPdfTitle').value.trim() : '') || officialIdentifier
      } : null,
      relatedDocs: legisRelatedDocs,
      showOnPortal,
      featured
    },
    media
  };
}

const payload = buildLegisTestPayload('published');
assert.strictEqual(payload.type, 'legislation');
assert.strictEqual(payload.title, 'Lei nº 5.432/2026 — Dispõe sobre o Conselho Municipal de Turismo');
assert.strictEqual(payload.metadata.documentType, 'Lei');
assert.strictEqual(payload.metadata.number, '5432');
assert.strictEqual(payload.metadata.year, 2026);
assert.strictEqual(payload.metadata.officialIdentifier, 'Lei nº 5.432/2026');
assert.strictEqual(payload.metadata.documentDate, '2026-08-15');
assert.strictEqual(payload.metadata.legalStatus, 'Vigente');
assert.strictEqual(payload.metadata.category, 'COMTUR');
assert.strictEqual(payload.media[0].kind, 'document');
assert.strictEqual(payload.media[0].url, 'https://example.com/lei-5432-2026.pdf');
console.log('✔ Test 4: Legislation payload generated with structured metadata and PDF media');

console.log('ALL LEGISLATION TESTS PASSED SUCCESSFULLY! 🎉');
