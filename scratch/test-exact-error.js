const fs = require('fs');

const html = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

// Extract all element IDs from the HTML
const idRegex = /id=["']([^"']+)["']/g;
const domIds = new Set();
let match;
while ((match = idRegex.exec(html)) !== null) {
  domIds.add(match[1]);
}

console.log('Total DOM IDs found in HTML:', domIds.size);

// Extract the script contents
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
const scriptContent = html.substring(scriptStart + 8, scriptEnd);

console.log('Script length:', scriptContent.length);

// Build mock DOM
const mockElements = {};
domIds.forEach(id => {
  mockElements[id] = {
    id,
    value: '',
    checked: false,
    style: { display: '' },
    innerHTML: '',
    textContent: '',
    dataset: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    options: [{ value: '', textContent: '--' }],
    selectedIndex: 0,
    addEventListener: (evt, fn) => {},
    querySelectorAll: () => [],
    closest: () => null,
    reset: () => {}
  };
});

// Run script in mock VM
const vm = require('vm');

const context = {
  console: {
    log: console.log,
    error: console.error,
    warn: console.warn
  },
  document: {
    getElementById: (id) => {
      if (!mockElements[id]) {
        console.warn('WARNING: document.getElementById returned null for id:', id);
        return null;
      }
      return mockElements[id];
    },
    querySelectorAll: (selector) => {
      if (selector === '.comtur-category-fields') {
        return Object.values(mockElements).filter(el => el.id && el.id.endsWith('Fields'));
      }
      if (selector === '.comtur-list-item') {
        return [];
      }
      return [];
    },
    addEventListener: (evt, fn) => {
      if (evt === 'DOMContentLoaded') {
        context._domReadyHandler = fn;
      }
    }
  },
  window: {
    location: {
      search: '?type=legislation',
      href: 'http://localhost/comtur-content-admin.html?type=legislation'
    },
    history: {
      pushState: () => {}
    },
    addEventListener: () => {},
    dispatchEvent: () => {}
  },
  URL: class {
    constructor(url) {
      this.searchParams = new Map();
    }
  },
  URLSearchParams: class {
    constructor(search) {
      this.params = new Map();
      if (search && search.includes('type=legislation')) {
        this.params.set('type', 'legislation');
      }
    }
    get(k) { return this.params.get(k); }
    set(k, v) { this.params.set(k, v); }
  },
  FormData: class {
    append() {}
  },
  fetch: async () => {
    console.log('fetch() called in mock');
    return {
      ok: true,
      json: async () => []
    };
  },
  setTimeout: (fn) => fn(),
  clearTimeout: () => {}
};

vm.createContext(context);

try {
  console.log('Executing script in VM...');
  vm.runInContext(scriptContent, context);
  console.log('Script loaded! Now calling DOMContentLoaded handler...');
  if (context._domReadyHandler) {
    context._domReadyHandler();
    console.log('DOMContentLoaded handler executed successfully!');
  } else {
    console.log('No DOMContentLoaded handler found');
  }
} catch (err) {
  console.error('=== CAUGHT ERROR IN VM ===');
  console.error('Message:', err.message);
  console.error('Stack:\n', err.stack);
}
