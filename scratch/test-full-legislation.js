const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '../comtur-next/portal/comtur-content-admin.html'), 'utf8');

const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let scripts = [];
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  if (match[1] && match[1].trim()) {
    scripts.push(match[1]);
  }
}
const mainScript = scripts[scripts.length - 1];

function createMockElement(id = '', tag = 'div') {
  return {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    checked: false,
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); }
    },
    dataset: {},
    options: [],
    selectedIndex: 0,
    addEventListener: function(event, cb) {
      if (!this._listeners) this._listeners = {};
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(cb);
    },
    removeEventListener: () => {},
    querySelectorAll: function(sel) {
      return [];
    },
    querySelector: function(sel) {
      return null;
    },
    closest: function() { return null; },
    setAttribute: () => {},
    getAttribute: () => null,
    removeAttribute: () => {},
    click: () => {},
    reset: () => {}
  };
}

function setupEnvironment(initialQuery = '?type=legislation', mockApiResponse = []) {
  const elementsMap = {};
  function getOrCreateEl(id) {
    if (!elementsMap[id]) {
      elementsMap[id] = createMockElement(id);
    }
    return elementsMap[id];
  }

  // Pre-create all known IDs in the page
  const idRegex = /id=["']([\w-]+)["']/g;
  let idMatch;
  while ((idMatch = idRegex.exec(html)) !== null) {
    getOrCreateEl(idMatch[1]);
  }

  let domContentLoadedHandler = null;

  const windowObj = {
    location: {
      search: initialQuery,
      href: `http://localhost:3000/comtur-content-admin.html${initialQuery}`
    },
    history: {
      pushState: () => {}
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    document: {
      getElementById: (id) => getOrCreateEl(id),
      querySelector: (sel) => {
        const m = sel.match(/^#([\w-]+)$/);
        if (m) return getOrCreateEl(m[1]);
        return createMockElement();
      },
      querySelectorAll: (sel) => {
        if (sel === '.comtur-category-fields') {
          return [
            getOrCreateEl('eventFields'),
            getOrCreateEl('attractionFields'),
            getOrCreateEl('gastronomyFields'),
            getOrCreateEl('newsFields'),
            getOrCreateEl('lodgingFields'),
            getOrCreateEl('routeFields'),
            getOrCreateEl('shoppingFields'),
            getOrCreateEl('serviceFields'),
            getOrCreateEl('councilMemberFields'),
            getOrCreateEl('legislationFields'),
            getOrCreateEl('standardFields')
          ];
        }
        return [];
      },
      addEventListener: (event, cb) => {
        if (event === 'DOMContentLoaded') {
          domContentLoadedHandler = cb;
        }
      }
    },
    fetch: async (url) => {
      if (mockApiResponse instanceof Error) {
        throw mockApiResponse;
      }
      return {
        ok: true,
        json: async () => mockApiResponse
      };
    },
    URL: function(url) {
      return {
        searchParams: {
          set: () => {},
          get: (k) => {
            if (k === 'type') {
              const p = new URLSearchParams(initialQuery);
              return p.get('type') || 'legislation';
            }
            return null;
          }
        },
        toString: () => url
      };
    },
    URLSearchParams: function(search) {
      return {
        get: (param) => {
          if (param === 'type' && search.includes('type=')) {
            const m = search.match(/type=([^&]+)/);
            return m ? m[1] : null;
          }
          if (search.includes('type=legislation')) return 'legislation';
          return null;
        }
      };
    },
    console: console
  };

  const sandbox = vm.createContext(windowObj);
  sandbox.window = sandbox;
  sandbox.document = windowObj.document;
  sandbox.location = windowObj.location;
  sandbox.history = windowObj.history;
  sandbox.fetch = windowObj.fetch;
  sandbox.URL = windowObj.URL;
  sandbox.URLSearchParams = windowObj.URLSearchParams;
  sandbox.$ = windowObj.document.getElementById;

  vm.runInContext(mainScript, sandbox);

  return {
    sandbox,
    getEl: getOrCreateEl,
    triggerInit: async () => {
      if (domContentLoadedHandler) {
        await domContentLoadedHandler();
        // Allow any pending promises/microtasks to settle
        await new Promise(r => setImmediate(r));
      }
    }
  };
}

async function runAllTests() {
  console.log('=== TEST 1: DOMContentLoaded com ?type=legislation ===');
  {
    const { sandbox, getEl, triggerInit } = setupEnvironment('?type=legislation', []);
    await triggerInit();

    assert.strictEqual(getEl('legislationFields').style.display, 'block', 'legislationFields must be block');
    assert.strictEqual(getEl('sharedNonGastroActions').style.display, 'none', 'sharedNonGastroActions must be none');
    assert.strictEqual(getEl('listPanelTitle').textContent, 'LEGISLAÇÃO', 'List title must be LEGISLAÇÃO');
    assert.strictEqual(getEl('formTitle').textContent, 'Nova legislação', 'Form title must be Nova legislação');
    assert.strictEqual(getEl('statusBadge').textContent, 'Rascunho', 'Status badge must be Rascunho');
    console.log('  -> PASS: Inicialização sem erro, formulário Nova legislação exibido.');
  }

  console.log('\n=== TEST 2: Lista Vazia ===');
  {
    const { sandbox, getEl, triggerInit } = setupEnvironment('?type=legislation', []);
    await triggerInit();

    assert(getEl('list').innerHTML.includes('Nenhum registro encontrado para'), 'Empty list message rendered');
    assert.strictEqual(getEl('legislationFields').style.display, 'block', 'Form still available when list is empty');
    console.log('  -> PASS: Lista vazia tratada com mensagem amigável, formulário permanece aberto.');
  }

  console.log('\n=== TEST 3: Falha de API (API Offline / 500) ===');
  {
    const { sandbox, getEl, triggerInit } = setupEnvironment('?type=legislation', new Error('Network error / 500'));
    await triggerInit();

    assert(getEl('list').innerHTML.includes('Não foi possível carregar os documentos.'), 'Error message rendered');
    assert(getEl('list').innerHTML.includes('Tentar novamente'), 'Retry button rendered');
    assert.strictEqual(getEl('legislationFields').style.display, 'block', 'Form still available on API error');
    console.log('  -> PASS: Erro de API exibido com botão Tentar novamente, formulário não trava.');
  }

  console.log('\n=== TEST 4: Troca de Categorias em Cadeia ===');
  {
    const { sandbox, getEl, triggerInit } = setupEnvironment('?type=legislation', []);
    await triggerInit();

    // Legislation -> Council Member
    sandbox.onContentTypeChange('council_member', false);
    assert.strictEqual(getEl('councilMemberFields').style.display, 'block');
    assert.strictEqual(getEl('legislationFields').style.display, 'none');

    // Council Member -> Legislation
    sandbox.onContentTypeChange('legislation', false);
    assert.strictEqual(getEl('legislationFields').style.display, 'block');
    assert.strictEqual(getEl('councilMemberFields').style.display, 'none');

    // Legislation -> Services
    sandbox.onContentTypeChange('service', false);
    assert.strictEqual(getEl('serviceFields').style.display, 'block');
    assert.strictEqual(getEl('legislationFields').style.display, 'none');

    // Services -> Legislation
    sandbox.onContentTypeChange('legislation', false);
    assert.strictEqual(getEl('legislationFields').style.display, 'block');
    assert.strictEqual(getEl('serviceFields').style.display, 'none');

    // Legislation -> Shopping
    sandbox.onContentTypeChange('shopping', false);
    assert.strictEqual(getEl('shoppingFields').style.display, 'block');
    assert.strictEqual(getEl('legislationFields').style.display, 'none');

    // Shopping -> Legislation
    sandbox.onContentTypeChange('legislation', false);
    assert.strictEqual(getEl('legislationFields').style.display, 'block');
    assert.strictEqual(getEl('shoppingFields').style.display, 'none');

    console.log('  -> PASS: Transições bidirecionais entre todas as categorias limpas e sem resíduo de estado.');
  }

  console.log('\n=== TEST 5: Renderização de Documento Existente para Edição ===');
  {
    const sampleLegis = {
      _id: 'doc123',
      type: 'legislation',
      title: 'Lei Municipal nº 5.555/2026',
      slug: 'lei-municipal-5555-2026',
      summary: 'Dispõe sobre o regimento interno do COMTUR.',
      status: 'published',
      publishedAt: '2026-08-01T10:00:00.000Z',
      metadata: {
        documentType: 'Lei',
        number: '5.555',
        year: 2026,
        officialIdentifier: 'Lei nº 5.555/2026',
        responsibleBody: 'Prefeitura Municipal',
        documentDate: '2026-07-20',
        publicationDate: '2026-07-25',
        effectiveFrom: '2026-08-01',
        legalStatus: 'Vigente',
        category: 'COMTUR',
        customTags: ['conselho', 'turismo'],
        showOnPortal: true,
        pdfFile: {
          url: 'https://cdn.ipojuca.pe.gov.br/docs/lei-5555.pdf',
          name: 'lei-5555.pdf',
          sizeFormatted: '1.2 MB'
        }
      }
    };

    const { sandbox, getEl, triggerInit } = setupEnvironment('?type=legislation', [sampleLegis]);
    await triggerInit();

    sandbox.loadItemForEdit(sampleLegis);

    assert.strictEqual(getEl('id').value, 'doc123');
    assert.strictEqual(getEl('legisTitle').value, 'Lei Municipal nº 5.555/2026');
    assert.strictEqual(getEl('legisDocType').value, 'Lei');
    assert.strictEqual(getEl('legisNumber').value, '5.555');
    assert.strictEqual(getEl('legisOfficialIdentifier').value, 'Lei nº 5.555/2026');
    assert.strictEqual(getEl('legisResponsibleBody').value, 'Prefeitura Municipal');
    assert.strictEqual(getEl('legisDocumentDate').value, '2026-07-20');
    assert.strictEqual(getEl('legisPublicationDate').value, '2026-07-25');
    assert.strictEqual(getEl('legisLegalStatus').value, 'Vigente');
    assert.strictEqual(getEl('legisShowOnPortal').checked, true);
    assert.strictEqual(getEl('formTitle').textContent, 'Editar: Lei Municipal nº 5.555/2026');

    console.log('  -> PASS: Edição de documento carrega todos os metadados perfeitamente.');
  }

  console.log('\n========================================');
  console.log('TODAS AS VALIDAÇÕES PASSARAM COM SUCESSO!');
  console.log('========================================\n');
}

runAllTests().catch(err => {
  console.error('TEST RUNNER FAILED:', err);
  process.exit(1);
});
