const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = fs.existsSync('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html')
  ? '/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html'
  : path.join(__dirname, '../comtur-next/portal/comtur-content-admin.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('=== TESTE DE NAVEGAÇÃO E REGISTRY — TODOS OS 17 TIPOS DE CONTEÚDO ===\n');

const testTypes = [
  'event',
  'attraction',
  'gastronomy',
  'news',
  'lodging',
  'route',
  'shopping',
  'service',
  'council_member',
  'legislation',
  'work_plan',
  'accountability',
  'indicator',
  'research',
  'open_data',
  'qr_point',
  'integration'
];

const typesToCheckGeneric = [
  'research',
  'open_data',
  'qr_point',
  'integration'
];

let allPassed = true;

function setupEnvironment(initialSearch = '?type=event') {
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

  const windowMock = {
    location: { search: initialSearch, href: `http://localhost/comtur-content-admin.html${initialSearch}`, replace() {} },
    history: { pushState(state, title, url) { this.state = state; } },
    addEventListener() {},
    document: documentMock,
    fetch: async () => ({ ok: true, json: async () => [] }),
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
      fetchAuth: async () => ({ ok: true, json: async () => [] })
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

  return { elements, windowMock, documentMock };
}

// TEST 1: Direct URL Refresh for all 17 types
console.log('--- TESTE 1: REFRESH DIRETO VIA URL (?type=...) ---');
testTypes.forEach(type => {
  try {
    const { elements } = setupEnvironment(`?type=${type}`);

    const currentType = elements['type'].value;
    const selectorValue = elements['contentTypeSelector'].value;
    const listPanelTitle = elements['listPanelTitle'].textContent;
    const formTitle = elements['formTitle'].textContent;

    const visibleFields = Object.values(elements)
      .filter(el => el.id && el.id.endsWith('Fields') && el.style.display === 'block')
      .map(el => el.id);

    const isMatch = (currentType === type && selectorValue === type);
    if (!isMatch) {
      console.error(`❌ [${type}] Falha: currentType=${currentType}, selector=${selectorValue}`);
      allPassed = false;
    } else {
      console.log(`✅ [${type}] URL param ?type=${type} -> currentType: "${currentType}", Título lista: "${listPanelTitle}", Título form: "${formTitle}", Container: [${visibleFields.join(', ')}]`);
    }
  } catch (err) {
    console.error(`❌ [${type}] Erro de execução:`, err.message);
    allPassed = false;
  }
});

// TEST 2: Sequential Switching
console.log('\n--- TESTE 2: TROCA SEQUENCIAL DE CATEGORIAS NO SELECT ---');
try {
  const { elements, windowMock } = setupEnvironment('?type=event');

  const sequence = [
    'event',
    'work_plan',
    'accountability',
    'indicator',
    'research',
    'open_data',
    'qr_point',
    'integration',
    'event'
  ];

  sequence.forEach((t, idx) => {
    windowMock.onContentTypeChange(t, true);

    const currentType = elements['type'].value;
    const selectorValue = elements['contentTypeSelector'].value;
    const listPanelTitle = elements['listPanelTitle'].textContent;
    const formTitle = elements['formTitle'].textContent;
    const activeContainers = Object.values(elements)
      .filter(el => el.id && el.id.endsWith('Fields') && el.style.display === 'block')
      .map(el => el.id);

    console.log(`Passo ${idx + 1}: Selecionado "${t}" -> currentType: "${currentType}", Select: "${selectorValue}", Painel: "${listPanelTitle}", Containers: [${activeContainers.join(', ')}]`);

    if (currentType !== t || selectorValue !== t) {
      console.error(`❌ Falha no passo ${idx + 1}: esperado ${t}, obteve ${currentType}`);
      allPassed = false;
    }
  });
} catch (err) {
  console.error('❌ Erro no teste sequencial:', err);
  allPassed = false;
}

// TEST 3: Specific Verification of the 7 Problematic Types (Fallback banner and fields)
console.log('\n--- TESTE 3: VERIFICAÇÃO DOS 7 TIPOS NO FORMULÁRIO GENÉRICO ---');
typesToCheckGeneric.forEach(type => {
  const { elements } = setupEnvironment(`?type=${type}`);

  const isStdVisible = elements['standardFields'] && elements['standardFields'].style.display === 'block';
  const isSharedVisible = elements['sharedNonGastroActions'] && elements['sharedNonGastroActions'].style.display === 'block';

  if (isStdVisible && isSharedVisible) {
    console.log(`✅ [${type}] Formulário genérico padrão ativado com botões de ação e campos padrão.`);
  } else {
    console.error(`❌ [${type}] Falha na ativação do formulário genérico: stdVisible=${isStdVisible}, sharedVisible=${isSharedVisible}`);
    allPassed = false;
  }
});

console.log('\n==================================================');
if (allPassed) {
  console.log('🎉 TODOS OS 17 TIPOS DE CONTEÚDO FORAM TESTADOS E VALIDADOS COM 100% DE SUCESSO!');
} else {
  console.log('⚠️ ALGUNS TESTES FALHARAM. VERIFIQUE OS LOGS ACIMA.');
}
console.log('==================================================');
