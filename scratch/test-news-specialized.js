const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('=== TEST: SPECIALIZED NEWS MODULE (type=news) ===');

const htmlPath = fs.existsSync('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html')
  ? '/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html'
  : path.join(__dirname, '../comtur-next/portal/comtur-content-admin.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 1. Static DOM Structure Checks
console.log('1. Verifying HTML markup for #newsFields...');
assert(htmlContent.includes('id="newsFields"'), 'Missing #newsFields container');
assert(htmlContent.includes('id="newsTitle"'), 'Missing #newsTitle');
assert(htmlContent.includes('id="newsSlug"'), 'Missing #newsSlug');
assert(htmlContent.includes('id="newsSummary"'), 'Missing #newsSummary');
assert(htmlContent.includes('id="newsSummaryCount"'), 'Missing #newsSummaryCount');
assert(htmlContent.includes('id="newsBody"'), 'Missing #newsBody');
assert(htmlContent.includes('id="newsCoverEmpty"'), 'Missing #newsCoverEmpty');
assert(htmlContent.includes('id="newsCoverPreview"'), 'Missing #newsCoverPreview');
assert(htmlContent.includes('id="newsCoverFileInput"'), 'Missing #newsCoverFileInput');
assert(htmlContent.includes('id="newsCoverImgDisplay"'), 'Missing #newsCoverImgDisplay');
assert(htmlContent.includes('id="newsPhotoCredit"'), 'Missing #newsPhotoCredit');
assert(htmlContent.includes('id="newsPhotoCaption"'), 'Missing #newsPhotoCaption');
assert(htmlContent.includes('id="newsPhotoAlt"'), 'Missing #newsPhotoAlt');
assert(htmlContent.includes('id="newsPublishedAt"'), 'Missing #newsPublishedAt');
assert(htmlContent.includes('id="newsAuthor"'), 'Missing #newsAuthor');
assert(htmlContent.includes('id="newsCategory"'), 'Missing #newsCategory');
assert(htmlContent.includes('id="newsLocation"'), 'Missing #newsLocation');
assert(htmlContent.includes('id="newsFeatured"'), 'Missing #newsFeatured');
assert(htmlContent.includes("'news': 'newsFields'"), 'specializedMap must map news to newsFields');
console.log(' -> DOM elements & specializedMap verified!');

// 2. Categories Verification
console.log('2. Verifying News Categories...');
const expectedCategories = [
  'Turismo', 'Eventos', 'COMTUR', 'Cultura', 'Gastronomia',
  'Meio Ambiente', 'Desenvolvimento Turístico', 'Institucional', 'Outros'
];
expectedCategories.forEach(cat => {
  assert(htmlContent.includes(`<option value="${cat}"`), `Missing category: ${cat}`);
});
console.log(' -> All 9 suggested categories present in #newsCategory select!');

// 3. VM Lifecycle & Logic Simulation
console.log('3. Running VM simulation for News module...');

const scriptMatches = [...htmlContent.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
const mainScript = scriptMatches[scriptMatches.length - 1][1];

const elements = {};
function createEl(id) {
  return {
    id,
    value: '',
    dataset: {},
    style: { display: '' },
    checked: false,
    innerHTML: '',
    textContent: '',
    src: '',
    classList: {
      add: () => {},
      remove: () => {}
    },
    addEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => ({ checked: false }),
    appendChild: () => {},
    options: [],
    selectedIndex: 0,
    scrollIntoView: () => {},
    reset: function() {
      this.value = '';
    }
  };
}

function getEl(id) {
  if (!elements[id]) {
    elements[id] = createEl(id);
  }
  return elements[id];
}

let fetchCalls = [];
let mockFetchResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    data: [
      {
        _id: 'news1',
        type: 'news',
        title: 'Festival de Inverno de Garça bate recorde de público',
        slug: 'festival-inverno-garca-recorde',
        summary: 'Mais de 15 mil pessoas prestigiaram o evento turístico gastronômico no Bosque Municipal.',
        status: 'published',
        publishedAt: '2026-07-20T10:00:00.000Z',
        featured: true,
        media: [
          { kind: 'image', url: '/uploads/comtur/news-festival.jpg', title: 'Público no Festival' }
        ],
        metadata: {
          category: 'Eventos',
          coverUrl: '/uploads/comtur/news-festival.jpg',
          author: 'Secretaria de Turismo'
        }
      }
    ]
  })
};

const domMock = {
  window: {
    location: { href: 'http://localhost/comtur-content-admin.html?type=news', search: '?type=news' },
    addEventListener: () => {},
    scrollTo: () => {}
  },
  document: {
    getElementById: (id) => getEl(id),
    querySelectorAll: () => [],
    querySelector: () => ({ checked: false }),
    addEventListener: () => {}
  },
  fetch: async (url, opts) => {
    fetchCalls.push({ url, opts });
    if (!mockFetchResponse.ok) {
      return {
        ok: false,
        status: mockFetchResponse.status,
        json: async () => ({ error: 'Fetch Error' })
      };
    }
    return mockFetchResponse;
  },
  console: {
    log: () => {},
    error: console.error,
    warn: console.warn
  },
  URLSearchParams: URLSearchParams,
  URL: URL,
  history: { pushState: () => {} },
  FormData: class FormData { append() {} },
  Date: Date,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
domMock.window.document = domMock.document;
domMock.window.history = domMock.history;

vm.runInNewContext(mainScript, domMock);

async function runTests() {
  // Test 3.1: Initial load of news list
  console.log('3.1 Testing loadItems with 1 news item...');
  await domMock.window.loadItems();
  const listHtml = getEl('list').innerHTML;
  assert(listHtml.includes('Festival de Inverno de Garça'), 'News title must appear in sidebar');
  assert(listHtml.includes('src="/uploads/comtur/news-festival.jpg"'), 'Cover thumbnail must appear in sidebar');
  assert(listHtml.includes('DESTAQUE'), 'Featured badge must appear');
  console.log(' -> News list rendering with thumbnail verified!');

  // Test 3.2: Empty state for news
  console.log('3.2 Testing empty state for news...');
  mockFetchResponse = { ok: true, status: 200, json: async () => ({ data: [] }) };
  await domMock.window.loadItems();
  assert(getEl('list').innerHTML.includes('Nenhuma notícia cadastrada.'), 'Should show "Nenhuma notícia cadastrada."');
  console.log(' -> Empty state verified!');

  // Test 3.3: Reset Form for News
  console.log('3.3 Testing resetForm for news...');
  domMock.window.onContentTypeChange('news', true);
  assert.strictEqual(getEl('newsTitle').value, '', 'newsTitle should be empty');
  assert.strictEqual(getEl('newsSummary').value, '', 'newsSummary should be empty');
  assert.strictEqual(getEl('newsCategory').value, 'Turismo', 'newsCategory should default to Turismo');
  assert.strictEqual(getEl('newsFeatured').checked, false, 'newsFeatured should default to false');
  console.log(' -> resetForm defaults verified!');

  // Test 3.4: Mandatory cover image validation for published & review
  console.log('3.4 Testing required cover image for publication & review...');
  getEl('newsTitle').value = 'Notícia de teste COMTUR';
  getEl('newsSummary').value = 'Publicação criada para validação do módulo de notícias.';
  getEl('newsBody').value = 'Texto completo da notícia de teste para homologação.';

  fetchCalls = [];
  // Try saving as published without image -> must be blocked
  await domMock.window.saveContent('published');
  let postCall = fetchCalls.find(c => c.opts && c.opts.method === 'POST');
  assert(!postCall, 'Published save without image must be blocked');
  assert(getEl('notice').textContent.includes('Adicione uma imagem de capa antes de publicar a notícia.'), 'Notice must explain missing cover image');

  // Try saving as review without image -> must be blocked
  fetchCalls = [];
  await domMock.window.saveContent('review');
  postCall = fetchCalls.find(c => c.opts && c.opts.method === 'POST');
  assert(!postCall, 'Review save without image must be blocked');

  // Try saving as draft without image -> allowed
  fetchCalls = [];
  await domMock.window.saveContent('draft');
  postCall = fetchCalls.find(c => c.opts && c.opts.method === 'POST');
  assert(postCall, 'Draft save without image must be allowed');
  const draftPayload = JSON.parse(postCall.opts.body);
  assert.strictEqual(draftPayload.type, 'news');
  assert.strictEqual(draftPayload.title, 'Notícia de teste COMTUR');
  assert.strictEqual(draftPayload.status, 'draft');
  console.log(' -> Image requirements for draft vs published verified!');

  // Test 3.5: Uploading cover image and publishing
  console.log('3.5 Testing image upload and publishing...');
  fetchCalls = [];
  mockFetchResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      url: '/uploads/comtur/noticia-teste.jpg'
    })
  };

  await domMock.window.uploadNewsCover({
    name: 'noticia-teste.jpg',
    type: 'image/jpeg',
    size: 2048500
  });

  assert.strictEqual(getEl('newsCoverPreview').style.display, 'block');
  assert.strictEqual(getEl('newsCoverEmpty').style.display, 'none');
  assert.strictEqual(getEl('newsCoverImgDisplay').src, '/uploads/comtur/noticia-teste.jpg');

  getEl('newsPhotoCredit').value = 'Secretaria Municipal de Turismo / João Silva';
  getEl('newsPhotoCaption').value = 'Público durante o evento realizado no centro de Garça.';
  getEl('newsPhotoAlt').value = 'Público reunido durante evento turístico em Garça.';
  getEl('newsAuthor').value = 'Redação COMTUR';
  getEl('newsLocation').value = 'Bosque Municipal';
  getEl('newsFeatured').checked = true;

  fetchCalls = [];
  mockFetchResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      _id: 'news-created-1',
      type: 'news',
      title: 'Notícia de teste COMTUR',
      status: 'published'
    })
  };

  await domMock.window.saveContent('published');
  postCall = fetchCalls.find(c => c.opts && c.opts.method === 'POST');
  assert(postCall, 'Save with cover image must succeed');
  const pubPayload = JSON.parse(postCall.opts.body);
  assert.strictEqual(pubPayload.type, 'news');
  assert.strictEqual(pubPayload.title, 'Notícia de teste COMTUR');
  assert.strictEqual(pubPayload.status, 'published');
  assert.strictEqual(pubPayload.featured, true);
  assert.strictEqual(pubPayload.metadata.author, 'Redação COMTUR');
  assert.strictEqual(pubPayload.metadata.location, 'Bosque Municipal');
  assert.strictEqual(pubPayload.metadata.photoCredit, 'Secretaria Municipal de Turismo / João Silva');
  assert.strictEqual(pubPayload.metadata.photoCaption, 'Público durante o evento realizado no centro de Garça.');
  assert.strictEqual(pubPayload.metadata.photoAlt, 'Público reunido durante evento turístico em Garça.');
  assert.strictEqual(pubPayload.metadata.coverUrl, '/uploads/comtur/noticia-teste.jpg');
  assert.strictEqual(pubPayload.media.length, 1);
  assert.strictEqual(pubPayload.media[0].kind, 'image');
  assert.strictEqual(pubPayload.media[0].url, '/uploads/comtur/noticia-teste.jpg');
  assert.strictEqual(pubPayload.media[0].credit, 'Secretaria Municipal de Turismo / João Silva');
  console.log(' -> Publication with cover image and metadata verified!');

  // Test 3.6: Editing existing news and keeping image if not changed
  console.log('3.6 Testing loadItemForEdit and preserving existing image...');
  const existingItem = {
    _id: 'news-edit-1',
    type: 'news',
    title: 'Notícia Antiga Publicada',
    slug: 'noticia-antiga-publicada',
    summary: 'Resumo da matéria já cadastrada anteriormente no portal.',
    body: 'Corpo da matéria já cadastrada.',
    location: 'Centro de Garça',
    status: 'published',
    featured: false,
    publishedAt: '2026-05-10T12:00:00.000Z',
    media: [
      {
        kind: 'image',
        url: '/uploads/comtur/antiga-capa.jpg',
        title: 'Foto Antiga',
        caption: 'Legenda antiga',
        credit: 'Fotógrafo Antigo',
        alt: 'Alt antigo'
      }
    ],
    metadata: {
      category: 'Cultura',
      author: 'Assessoria de Imprensa',
      coverUrl: '/uploads/comtur/antiga-capa.jpg',
      photoCredit: 'Fotógrafo Antigo',
      photoCaption: 'Legenda antiga',
      photoAlt: 'Alt antigo'
    }
  };

  domMock.window.loadItemForEdit(existingItem);
  assert.strictEqual(getEl('newsTitle').value, 'Notícia Antiga Publicada');
  assert.strictEqual(getEl('newsCategory').value, 'Cultura');
  assert.strictEqual(getEl('newsAuthor').value, 'Assessoria de Imprensa');
  assert.strictEqual(getEl('newsPhotoCredit').value, 'Fotógrafo Antigo');
  assert.strictEqual(getEl('newsCoverPreview').style.display, 'block');
  assert.strictEqual(getEl('newsCoverImgDisplay').src, '/uploads/comtur/antiga-capa.jpg');

  // Edit without changing image -> save PUT
  fetchCalls = [];
  getEl('newsTitle').value = 'Notícia Antiga Publicada - Atualizada';
  await domMock.window.saveContent('published');
  const putCall = fetchCalls.find(c => c.opts && c.opts.method === 'PUT');
  assert(putCall, 'Update must send PUT request');
  const putPayload = JSON.parse(putCall.opts.body);
  assert.strictEqual(putPayload.title, 'Notícia Antiga Publicada - Atualizada');
  assert.strictEqual(putPayload.metadata.coverUrl, '/uploads/comtur/antiga-capa.jpg');
  assert.strictEqual(putPayload.media[0].url, '/uploads/comtur/antiga-capa.jpg');
  console.log(' -> Preserving image during edit verified!');

  console.log('\n==================================================');
  console.log('✅ ALL SPECIALIZED NEWS TESTS PASSED WITH 100% SUCCESS!');
  console.log('==================================================');
}

runTests().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
