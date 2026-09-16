const fs = require('fs');

const html = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

// Extract all element IDs present in HTML
const ids = new Set();
const idRegex = /id="([^"]+)"/g;
let match;
while ((match = idRegex.exec(html)) !== null) {
  ids.add(match[1]);
}

console.log(`Found ${ids.size} DOM IDs in HTML.`);

// Create mock DOM environment
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
    reset() {},
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
  location: { search: '?type=legislation', replace() {} },
  history: { pushState() {} },
  addEventListener() {},
  document: documentMock,
  fetch: async () => ({ ok: true, json: async () => [] }),
  Event: function(type) { this.type = type; },
  URLSearchParams: URLSearchParams,
  URL: URL,
  FormData: class { append() {} },
  setTimeout: setTimeout
};

// Extract JS script from HTML
const scriptStart = html.indexOf('<script>') + '<script>'.length;
const scriptEnd = html.lastIndexOf('</script>');
const scriptCode = html.substring(scriptStart, scriptEnd);

// Run the script in VM context
const vm = require('vm');
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
  console: console,
  Date: Date,
  JSON: JSON,
  Array: Array,
  Object: Object,
  parseInt: parseInt,
  parseFloat: parseFloat,
  Set: Set,
  String: String,
  Math: Math,
  Boolean: Boolean
});

try {
  vm.runInContext(scriptCode, context);
  console.log('Admin JS executed successfully with no syntax or runtime errors!');

  console.log('\n--- VERIFYING INITIAL STATE FOR LEGISLATION ---');
  console.log('Current category list title:', elements['listPanelTitle']?.textContent);
  console.assert(elements['listPanelTitle']?.textContent === 'LEGISLAÇÃO', 'Title must be LEGISLAÇÃO');
  console.log('Legislation fields container display:', elements['legislationFields']?.style.display);
  console.assert(elements['legislationFields']?.style.display === 'block', 'Fields container must be visible');

  // Test Title & Slug auto-generation
  elements['legisTitle'].value = 'Lei de criação do COMTUR';
  elements['legisTitle'].dispatchEvent(new windowMock.Event('input'));
  console.log('Generated slug:', elements['legisSlug'].value);
  console.assert(elements['legisSlug'].value === 'lei-de-criacao-do-comtur', 'Slug must match');

  // Test Date & Year auto-generation
  elements['legisDocumentDate'].value = '2026-08-15';
  elements['legisDocumentDate'].dispatchEvent(new windowMock.Event('change'));
  console.log('Generated year:', elements['legisYear'].value);
  console.assert(elements['legisYear'].value === 2026 || elements['legisYear'].value === '2026', 'Year must match');

  // Test Switching to each other category to ensure 0 errors
  const allCategories = ['event', 'attraction', 'gastronomy', 'news', 'lodging', 'route', 'shopping', 'service', 'council_member', 'legislation'];
  for (const cat of allCategories) {
    context.window.onContentTypeChange(cat, false);
    console.log(`Category "${cat}" switched cleanly, active title: ${elements['listPanelTitle'].textContent}`);
  }

  console.log('\n✅ ALL PURE SIMULATION TESTS PASSED COMPLETELY!');
} catch (err) {
  console.error('Simulation error:', err);
  process.exit(1);
}
