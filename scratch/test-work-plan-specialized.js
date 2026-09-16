const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

console.log('=== TESTE ESPECIALIZADO — PLANO DE TRABALHO COMTUR ===\n');

function setupEnvironment(initialSearch = '?type=work_plan') {
  const ids = new Set();
  const idRegex = /id="([^"]+)"/g;
  let match;
  while ((match = idRegex.exec(html)) !== null) {
    ids.add(match[1]);
  }

  const elements = {};
  ids.forEach(id => {
    elements[id] = {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      style: {},
      checked: false,
      dataset: {},
      classList: {
        add(cls) { this.classes.add(cls); },
        remove(cls) { this.classes.delete(cls); },
        contains(cls) { return this.classes.has(cls); },
        classes: new Set()
      },
      listeners: {},
      addEventListener(event, fn) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
      },
      dispatchEvent(event) {
        const fns = this.listeners[event.type] || [];
        fns.forEach(fn => fn(event));
      },
      reset() { this.value = ''; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      closest() { return this; },
      scrollIntoView() {}
    };
  });

  const documentMock = {
    readyState: 'complete',
    getElementById(id) {
      return elements[id] || null;
    },
    querySelector(sel) {
      if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.comtur-category-fields') {
        return Object.values(elements).filter(e => e.id && e.id.endsWith('Fields'));
      }
      if (sel === '.comtur-list-item') {
        return [];
      }
      return [];
    },
    addEventListener() {}
  };

  let savedPayload = null;

  const windowMock = {
    location: { search: initialSearch, href: `http://localhost/comtur-content-admin.html${initialSearch}`, replace() {} },
    history: { pushState(state, title, url) { this.state = state; } },
    addEventListener() {},
    document: documentMock,
    fetch: async (url, options = {}) => {
      if (options.method === 'POST' || options.method === 'PUT') {
        savedPayload = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ _id: 'mock-wp-123', ...savedPayload })
        };
      }
      return { ok: true, json: async () => [] };
    },
    Event: function(type) { this.type = type; },
    URLSearchParams: URLSearchParams,
    URL: URL,
    FormData: class { append() {} },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    SemitSession: {
      restoreSync: () => {},
      readAccess: () => 'mock-token',
      readRefresh: () => 'mock-refresh',
      fetchAuth: async (url, options = {}) => {
        if (options.method === 'POST' || options.method === 'PUT') {
          savedPayload = JSON.parse(options.body);
          return {
            ok: true,
            json: async () => ({ _id: 'mock-wp-123', ...savedPayload })
          };
        }
        return { ok: true, json: async () => [] };
      }
    }
  };

  const scriptStart = html.indexOf('<script>') + '<script>'.length;
  const scriptEnd = html.lastIndexOf('</script>');
  const scriptCode = html.substring(scriptStart, scriptEnd);

  const context = vm.createContext({
    window: windowMock,
    document: documentMock,
    location: windowMock.location,
    history: windowMock.history,
    fetch: windowMock.fetch,
    Event: windowMock.Event,
    URLSearchParams: windowMock.URLSearchParams,
    URL: windowMock.URL,
    FormData: windowMock.FormData,
    setTimeout: windowMock.setTimeout,
    clearTimeout: windowMock.clearTimeout,
    SemitSession: windowMock.SemitSession,
    console: { log() {}, error: console.error, warn: console.warn }
  });

  vm.runInContext(scriptCode, context);

  return { elements, windowMock, documentMock, getSavedPayload: () => savedPayload };
}

let allOk = true;

// 1. Direct Access Test
console.log('1. Testando acesso direto ?type=work_plan...');
const env = setupEnvironment('?type=work_plan');
const { elements, windowMock } = env;

const wpFields = elements['workPlanFields'];
if (wpFields && wpFields.style.display === 'block') {
  console.log('✅ Container workPlanFields está visível por padrão.');
} else {
  console.error('❌ Container workPlanFields NÃO está visível.');
  allOk = false;
}

if (elements['wpResponsibleBody'].value === 'COMTUR') {
  console.log('✅ Órgão responsável padrão é "COMTUR".');
} else {
  console.error('❌ Órgão responsável não inicializou com COMTUR.');
  allOk = false;
}

// 2. Navigation transitions
console.log('\n2. Testando alternância entre categorias...');
windowMock.onContentTypeChange('event', false);
console.log('Mudou para event -> workPlanFields display:', elements['workPlanFields'].style.display, '| eventFields:', elements['eventFields'].style.display);

windowMock.onContentTypeChange('work_plan', false);
console.log('Mudou para work_plan -> workPlanFields display:', elements['workPlanFields'].style.display, '| eventFields:', elements['eventFields'].style.display);

windowMock.onContentTypeChange('legislation', false);
console.log('Mudou para legislation -> workPlanFields display:', elements['workPlanFields'].style.display, '| legislationFields:', elements['legislationFields'].style.display);

windowMock.onContentTypeChange('work_plan', false);
console.log('Retornou para work_plan -> workPlanFields display:', elements['workPlanFields'].style.display);

if (elements['workPlanFields'].style.display === 'block') {
  console.log('✅ Navegação e alternância entre categorias validada com sucesso.');
} else {
  console.error('❌ Falha na alternância para workPlanFields.');
  allOk = false;
}

// 3. Fill and Save Content
console.log('\n3. Preenchendo formulário de Plano de Trabalho e salvando...');
elements['wpTitle'].value = 'Plano de Trabalho do COMTUR — 2026';
elements['wpTitle'].dispatchEvent({ type: 'input' });
elements['wpYear'].value = '2026';
elements['wpPeriodType'].value = 'Anual';
elements['wpResponsibleBody'].value = 'COMTUR';
elements['wpStartDate'].value = '2026-01-01';
elements['wpEndDate'].value = '2026-12-31';
elements['wpSummary'].value = 'Plano de ações e metas do Conselho Municipal de Turismo para o exercício de 2026.';

// Simular anexo PDF
windowMock.wpPdfFile = {
  url: '/uploads/plano-trabalho-2026.pdf',
  name: 'plano-de-trabalho-comtur-2026.pdf',
  originalName: 'plano-de-trabalho-comtur-2026.pdf',
  size: 2411724,
  sizeFormatted: 'PDF | 2,3 MB',
  mimeType: 'application/pdf'
};

windowMock.saveContent('draft');
const payload = env.getSavedPayload();

console.log('Payload gerado:', JSON.stringify(payload, null, 2));

if (payload && payload.type === 'work_plan' && payload.title === 'Plano de Trabalho do COMTUR — 2026' && payload.metadata.year === 2026 && payload.metadata.responsibleBody === 'COMTUR' && payload.metadata.startDate === '2026-01-01' && payload.metadata.endDate === '2026-12-31') {
  console.log('✅ Payload estruturado corretamente conforme a modelagem documental!');
} else {
  console.error('❌ Falha no payload gerado.');
  allOk = false;
}

// 4. Test Edit Loading
console.log('\n4. Testando carregamento de item para edição...');
const itemToEdit = {
  _id: 'mock-wp-123',
  type: 'work_plan',
  title: 'Plano de Trabalho do COMTUR — 2026',
  slug: 'plano-de-trabalho-do-comtur-2026',
  summary: 'Plano de ações e metas do Conselho Municipal de Turismo para o exercício de 2026.',
  status: 'published',
  publishedAt: '2026-01-15T10:00:00.000Z',
  metadata: {
    year: 2026,
    periodType: 'Anual',
    responsibleBody: 'COMTUR',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    description: 'Plano de ações e metas do Conselho Municipal de Turismo para o exercício de 2026.',
    pdfFile: {
      url: '/uploads/plano-trabalho-2026.pdf',
      originalName: 'plano-de-trabalho-comtur-2026.pdf',
      size: 2411724,
      sizeFormatted: 'PDF | 2,3 MB'
    }
  }
};

windowMock.loadItemForEdit(itemToEdit);

if (elements['wpTitle'].value === 'Plano de Trabalho do COMTUR — 2026' && elements['wpYear'].value == 2026 && elements['wpPeriodType'].value === 'Anual' && elements['wpResponsibleBody'].value === 'COMTUR' && elements['wpStartDate'].value === '2026-01-01' && elements['wpEndDate'].value === '2026-12-31' && elements['wpSummary'].value.includes('Plano de ações')) {
  console.log('✅ Edição carregou todos os campos com sucesso!');
} else {
  console.error('❌ Falha ao carregar campos na edição.');
  allOk = false;
}

console.log('\n==================================================');
if (allOk) {
  console.log('🎉 TODOS OS TESTES DO FORMULÁRIO ESPECIALIZADO DE PLANO DE TRABALHO PASSARAM COM SUCESSO!');
} else {
  console.log('⚠️ ALGUNS TESTES FALHARAM.');
}
console.log('==================================================');
