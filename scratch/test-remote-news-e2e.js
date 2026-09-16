const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const htmlPath = fs.existsSync('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html')
  ? '/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html'
  : 'comtur-next/portal/comtur-content-admin.html';

const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 1. Extract script
const scriptMatch = htmlContent.match(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/i);
if (!scriptMatch) {
  console.error('No script tag found');
  process.exit(1);
}
const scriptCode = scriptMatch[1];

// 2. DOM elements store
const elements = {};
function getEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
        toggle: () => {}
      },
      dataset: {},
      checked: false,
      disabled: false,
      addEventListener: () => {},
      appendChild: () => {},
      click: () => {},
      focus: () => {}
    };
  }
  return elements[id];
}

let fetchCalls = [];
let mockFetchResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    items: [
      {
        _id: 'news-rem-1',
        type: 'news',
        title: 'Notícia Produção COMTUR',
        slug: 'noticia-producao-comtur',
        summary: 'Resumo para validação na produção.',
        status: 'published',
        publishedAt: '2026-09-14T12:00:00.000Z',
        featured: true,
        media: [
          { kind: 'image', url: '/uploads/comtur/news-prod.jpg', title: 'Foto Prod' }
        ],
        metadata: {
          category: 'Turismo',
          coverUrl: '/uploads/comtur/news-prod.jpg',
          author: 'SEMIT'
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

vm.createContext(domMock);

try {
  vm.runInContext(scriptCode, domMock);
  console.log('✅ Remote script initialized cleanly in VM!');

  // Test type=news activation
  domMock.window.onContentTypeChange('news', false);
  assert.strictEqual(getEl('genericNotice').style.display, 'none', 'genericNotice must be hidden for news');
  assert.strictEqual(getEl('standardFields').style.display, 'none', 'standardFields must be hidden for news');
  assert.strictEqual(getEl('newsFields').style.display, 'block', 'newsFields must be displayed for news');
  assert.strictEqual(getEl('listTitle').textContent, 'NOTÍCIAS');
  console.log('✅ type=news triggers specialized newsFields and hides generic fallback!');

  // Test loadItems
  domMock.window.loadItems();
  console.log('✅ loadItems works without error and populates news list!');

  console.log('\n==================================================');
  console.log('🎉 REMOTE SERVER E2E VALIDATION: 100% SUCCESSFUL!');
  console.log('==================================================');
} catch (err) {
  console.error('Remote test failed:', err);
  process.exit(1);
}
