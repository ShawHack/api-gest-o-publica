const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'comtur-next', 'portal', 'comtur-content-admin.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

function setupEnvironment(initialSearch = '?type=accountability') {
  let payload = null;
  const elements = {};
  function createElement(id, tagName = 'div') {
    return {
      id,
      tagName: tagName.toUpperCase(),
      value: '',
      textContent: '',
      innerHTML: '',
      style: {},
      dataset: {},
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      querySelectorAll(selector) {
        return [];
      },
      addEventListener(event, handler) {
        this['on' + event] = handler;
      },
      click() {
        if (this.onclick) this.onclick();
      },
      reset() {},
      scrollIntoView() {},
      files: []
    };
  }

  // Register expected elements
  const ids = [
    'form', 'id', 'type', 'contentTypeSelector', 'listPanelTitle', 'searchInput', 'btnNew', 'list', 'formTitle', 'status',
    'notice', 'standardFields', 'standardNotice', 'sharedNonGastroActions',
    'eventFields', 'attractionFields', 'gastronomyFields', 'lodgingFields', 'routeFields',
    'shoppingFields', 'serviceFields', 'councilMemberFields', 'legislationFields', 'workPlanFields', 'accountabilityFields',
    'accTitle', 'accSlug', 'accDocType', 'accYear', 'accPeriodType', 'accPeriodRef', 'accPeriodRefGroup', 'accCustomDatesWrap',
    'accStartDate', 'accEndDate', 'accDocumentDate', 'accSummary', 'accPublishDate', 'btnArchiveAcc',
    'accPdfFileInput', 'accPdfEmpty', 'accPdfPreview', 'accPdfFileNameDisplay', 'accPdfSizeDisplay', 'accPdfProgress',
    'btnViewAccPdf', 'btnReplaceAccPdf', 'btnRemoveAccPdf',
    'wpTitle', 'wpSlug', 'wpYear', 'wpPeriodType', 'wpResponsibleBody', 'wpStartDate', 'wpEndDate', 'wpSummary', 'wpPublishDate', 'btnArchiveWp',
    'wpPdfFileInput', 'wpPdfEmpty', 'wpPdfPreview', 'wpPdfFileNameDisplay', 'wpPdfSizeDisplay', 'wpPdfProgress',
    'legisTitle', 'legisSlug', 'legisDocType', 'legisDocumentDate', 'legisYear', 'legisSummary',
    'legisPdfFileInput', 'legisPdfEmpty', 'legisPdfPreview', 'legisPdfFileNameDisplay', 'legisPdfSizeDisplay', 'legisPdfProgress'
  ];

  ids.forEach(id => {
    elements[id] = createElement(id);
  });

  const dom = {
    getElementById: (id) => {
      if (!elements[id]) elements[id] = createElement(id);
      return elements[id];
    },
    querySelectorAll: (selector) => {
      if (selector === '.comtur-category-fields') {
        return [
          elements['eventFields'], elements['attractionFields'], elements['gastronomyFields'],
          elements['lodgingFields'], elements['routeFields'], elements['shoppingFields'],
          elements['serviceFields'], elements['councilMemberFields'], elements['legislationFields'],
          elements['workPlanFields'], elements['accountabilityFields'], elements['standardFields']
        ].filter(Boolean);
      }
      if (selector === '.comtur-list-item') {
        return [];
      }
      return [];
    },
    createElement: (tag) => createElement('dynamic_' + Date.now(), tag),
    addEventListener: () => {},
    readyState: 'complete'
  };

  const windowMock = {
    location: {
      search: initialSearch,
      pathname: '/comtur-content-admin.html',
      replace: () => {}
    },
    history: {
      pushState: (state, title, url) => {
        const urlObj = new URL('http://localhost' + url);
        windowMock.location.search = urlObj.search;
      }
    },
    addEventListener: () => {},
    scrollTo: () => {},
    open: () => {},
    document: dom,
    sessionStorage: {
      getItem: (key) => key === 'semit_dashboard_token' ? 'fake-token-123' : null,
      removeItem: () => {}
    },
    SemitSession: {
      restoreSync: () => true,
      getToken: () => 'fake-token-123',
      readAccess: () => 'fake-access-123',
      readRefresh: () => 'fake-refresh-123',
      getUser: () => ({ name: 'Admin' }),
      fetchWithAuth: async (url, options) => {
        if (options && options.body && typeof options.body === 'string') {
          payload = JSON.parse(options.body);
        }
        return {
          ok: true,
          json: async () => ({ url: 'https://api.garca.sp.gov.br/uploads/comtur/prestacao-contas-1-quadrimestre-2026.pdf', _id: 'acc-123', ...(payload || {}) })
        };
      },
      fetchAuth: async (url, options) => {
        if (options && options.body && typeof options.body === 'string') {
          payload = JSON.parse(options.body);
        }
        return {
          ok: true,
          json: async () => ({ url: 'https://api.garca.sp.gov.br/uploads/comtur/prestacao-contas-1-quadrimestre-2026.pdf', _id: 'acc-123', ...(payload || {}) })
        };
      }
    },
    fetch: async () => ({
      ok: true,
      json: async () => ({ data: [] })
    }),
    FormData: class FormData {
      append(k, v) { this[k] = v; }
    }
  };

  const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/) || htmlContent.match(/<script>([\s\S]*?)<\/script>\s*$/);
  if (!scriptMatch) {
    throw new Error('Script tag não encontrada');
  }

  const scriptCode = scriptMatch[1];
  const context = vm.createContext({
    window: windowMock,
    document: dom,
    sessionStorage: windowMock.sessionStorage,
    SemitSession: windowMock.SemitSession,
    fetch: windowMock.fetch,
    FormData: windowMock.FormData,
    URLSearchParams: URLSearchParams,
    console: console,
    setTimeout: (fn) => fn(),
    Date: Date,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    parseInt: parseInt,
    parseFloat: parseFloat
  });

  vm.runInContext(scriptCode, context);
  return { context, elements, windowMock };
}

console.log('--- TESTANDO FORMULÁRIO ESPECIALIZADO DE PRESTAÇÃO DE CONTAS ---');

// 1. Direct Access ?type=accountability
console.log('\n1. Testando acesso direto ?type=accountability...');
const env = setupEnvironment('?type=accountability');
const { elements, windowMock } = env;

console.log('display accountabilityFields:', elements['accountabilityFields'].style.display);
console.log('display standardFields:', elements['standardFields'].style.display);
console.log('display sharedNonGastroActions:', elements['sharedNonGastroActions'].style.display);

if (elements['accountabilityFields'].style.display !== 'block') {
  throw new Error('FALHA: accountabilityFields deveria estar com display: block');
}
if (elements['standardFields'].style.display !== 'none') {
  throw new Error('FALHA: standardFields deveria estar com display: none');
}
console.log('✅ Acesso direto ?type=accountability OK!');

// 2. Switching between categories
console.log('\n2. Testando troca entre categorias...');
windowMock.onContentTypeChange('event', false);
console.log('Mudou para event -> accountabilityFields display:', elements['accountabilityFields'].style.display, '| eventFields:', elements['eventFields'].style.display);
if (elements['accountabilityFields'].style.display !== 'none' || elements['eventFields'].style.display !== 'block') {
  throw new Error('FALHA: troca para event não exibiu eventFields');
}

windowMock.onContentTypeChange('accountability', false);
console.log('Retornou para accountability -> accountabilityFields display:', elements['accountabilityFields'].style.display);
if (elements['accountabilityFields'].style.display !== 'block') {
  throw new Error('FALHA: retorno para accountability não exibiu accountabilityFields');
}
console.log('✅ Roteamento/Registry de tipos OK!');

// 3. Testing Period Reference dynamic options
console.log('\n3. Testando opções dinâmicas de período...');
elements['accPeriodType'].value = 'Quadrimestral';
if (elements['accPeriodType'].onchange) elements['accPeriodType'].onchange();
console.log('Quadrimestral -> refGroup display:', elements['accPeriodRefGroup'].style.display, '| ref options HTML:', elements['accPeriodRef'].innerHTML);

elements['accPeriodType'].value = 'Período personalizado';
if (elements['accPeriodType'].onchange) elements['accPeriodType'].onchange();
console.log('Período personalizado -> refGroup display:', elements['accPeriodRefGroup'].style.display, '| customWrap display:', elements['accCustomDatesWrap'].style.display);
if (elements['accPeriodRefGroup'].style.display !== 'none' || elements['accCustomDatesWrap'].style.display !== 'block') {
  throw new Error('FALHA: Período personalizado não alternou campos de data');
}
console.log('✅ Opções de período dinâmicas OK!');

// 4. Testing PDF upload and preview
console.log('\n4. Testando upload de PDF e preview...');
elements['accTitle'].value = 'Prestação de Contas — 1º Quadrimestre de 2026';
elements['accDocType'].value = 'Prestação de Contas';
elements['accYear'].value = '2026';
elements['accPeriodType'].value = 'Quadrimestral';
elements['accPeriodRef'].value = '1º Quadrimestre';
elements['accDocumentDate'].value = '2026-09-08';
elements['accSummary'].value = 'Relatório referente à execução financeira do 1º quadrimestre de 2026.';

// Upload PDF
const fakePdfFile = {
  name: 'prestacao-contas-1-quadrimestre-2026.pdf',
  size: 15728640, // 15 MB
  type: 'application/pdf'
};
// Simulating upload handler
windowMock.fetch = async () => ({
  ok: true,
  json: async () => ({ url: 'https://api.garca.sp.gov.br/uploads/comtur/prestacao-contas-1-quadrimestre-2026.pdf' })
});

// Trigger change event
(async () => {
  elements['accPdfFileInput'].onchange({ target: { files: [fakePdfFile], value: '' } });
  await new Promise(r => setTimeout(r, 50));

  console.log('PDF Preview display:', elements['accPdfPreview'].style.display);
  console.log('PDF FileName display:', elements['accPdfFileNameDisplay'].textContent);
  console.log('PDF Size display:', elements['accPdfSizeDisplay'].textContent);

  if (elements['accPdfPreview'].style.display !== 'block' || !elements['accPdfFileNameDisplay'].textContent.includes('prestacao-contas-1-quadrimestre-2026.pdf')) {
    throw new Error('FALHA: Preview do PDF não exibiu nome correto');
  }
  console.log('✅ Upload e preview de PDF OK!');

  // 5. Testing Save Draft and Publish Payload
  console.log('\n5. Testando geração de payload para publicação...');
  windowMock.SemitSession.fetchAuth = async (url, options) => {
    if (options && options.body && typeof options.body === 'string') {
      payload = JSON.parse(options.body);
    }
    return {
      ok: true,
      json: async () => ({ _id: 'acc-123', ...(payload || {}) })
    };
  };

  await windowMock.saveContent('published');
  console.log('Payload gerado:', JSON.stringify(payload, null, 2));

  if (payload && payload.type === 'accountability' && payload.title === 'Prestação de Contas — 1º Quadrimestre de 2026' && payload.metadata.year === 2026 && payload.metadata.documentType === 'Prestação de Contas' && payload.metadata.period === '1º Quadrimestre' && payload.metadata.pdfFile && payload.metadata.pdfFile.url) {
    console.log('✅ Payload estruturado e validado com sucesso!');
  } else {
    throw new Error('FALHA: Estrutura do payload para accountability incorreta!');
  }

  // 6. Testing loadItemForEdit (Simulating F5 / item reload)
  console.log('\n6. Testando carregamento de item existente (loadItemForEdit)...');
  const itemToEdit = {
    _id: 'acc-123',
    type: 'accountability',
    title: 'Prestação de Contas — 1º Quadrimestre de 2026',
    slug: 'prestacao-de-contas-1-quadrimestre-de-2026',
    status: 'published',
    publishedAt: '2026-09-08T10:00:00.000Z',
    summary: 'Relatório referente à execução financeira do 1º quadrimestre de 2026.',
    metadata: {
      title: 'Prestação de Contas — 1º Quadrimestre de 2026',
      documentType: 'Prestação de Contas',
      year: 2026,
      periodType: 'Quadrimestral',
      period: '1º Quadrimestre',
      documentDate: '2026-09-08',
      summary: 'Relatório referente à execução financeira do 1º quadrimestre de 2026.',
      pdfFile: {
        url: 'https://api.garca.sp.gov.br/uploads/comtur/prestacao-contas-1-quadrimestre-2026.pdf',
        name: 'prestacao-contas-1-quadrimestre-2026.pdf',
        originalName: 'prestacao-contas-1-quadrimestre-2026.pdf',
        size: 23141384,
        sizeFormatted: 'PDF | 22,07 MB'
      }
    },
    media: [
      {
        kind: 'document',
        title: 'Prestação de Contas — 1º Quadrimestre de 2026',
        url: 'https://api.garca.sp.gov.br/uploads/comtur/prestacao-contas-1-quadrimestre-2026.pdf',
        mimeType: 'application/pdf',
        size: 23141384
      }
    ]
  };

  windowMock.loadItemForEdit(itemToEdit);
  console.log('accTitle value após loadItemForEdit:', elements['accTitle'].value);
  console.log('accDocType value:', elements['accDocType'].value);
  console.log('accYear value:', elements['accYear'].value);
  console.log('accPeriodType value:', elements['accPeriodType'].value);
  console.log('accPeriodRef value:', elements['accPeriodRef'].value);
  console.log('accPdfPreview display:', elements['accPdfPreview'].style.display);
  console.log('accPdfFileNameDisplay:', elements['accPdfFileNameDisplay'].textContent);

  if (elements['accTitle'].value !== 'Prestação de Contas — 1º Quadrimestre de 2026' || elements['accPdfPreview'].style.display !== 'block') {
    throw new Error('FALHA: loadItemForEdit não repopulou corretamente!');
  }
  console.log('✅ loadItemForEdit e persistência validados!');

  console.log('\n=============================================');
  console.log('TODOS OS TESTES LOCAIS PASSARAM COM SUCESSO! 🎉');
  console.log('=============================================');
})();
