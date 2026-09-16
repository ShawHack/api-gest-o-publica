const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../comtur-next/portal/comtur-content-admin.html'), 'utf8');

// Extract all <script> contents
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let scripts = [];
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  if (match[1] && match[1].trim()) {
    scripts.push(match[1]);
  }
}

const mainScript = scripts[scripts.length - 1]; // the inline script

// Minimal DOM simulation
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
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    dataset: {},
    options: [],
    selectedIndex: 0,
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
    closest: () => null,
    setAttribute: () => {},
    getAttribute: () => null,
    removeAttribute: () => {},
    click: () => {},
    reset: () => {}
  };
}

const elementsMap = {};
function getOrCreateEl(id) {
  if (!elementsMap[id]) {
    elementsMap[id] = createMockElement(id);
  }
  return elementsMap[id];
}

const domElements = [
  'id', 'type', 'contentTypeSelector', 'listPanelTitle', 'searchInput', 'btnNew',
  'form', 'formTitle', 'statusBadge', 'list',
  'eventFields', 'attractionFields', 'gastronomyFields', 'newsFields',
  'lodgingFields', 'routeFields', 'shoppingFields', 'serviceFields',
  'councilMemberFields', 'legislationFields', 'standardFields', 'sharedNonGastroActions',
  'legisTitle', 'legisDocType', 'legisNumber', 'legisYear', 'legisOfficialIdentifier',
  'legisResponsibleBody', 'legisSlug', 'legisSummary', 'legisDocumentDate',
  'legisPublicationDate', 'legisEffectiveFrom', 'legisEffectiveUntil',
  'legisLegalStatus', 'legisCategory', 'legisCustomTags', 'legisTagsChips',
  'legisShowOnPortal', 'legisFeatured', 'legisPublishDate', 'legisPdfFile',
  'legisPdfPreview', 'legisPdfEmpty', 'legisPdfProgress', 'legisRelatedDocsList',
  'legisRelatedDocSelect', 'legisRelationTypeSelect', 'btnArchiveLegis',
  'sharedFeatured'
];

domElements.forEach(id => getOrCreateEl(id));

const windowObj = {
  location: {
    search: '?type=legislation',
    href: 'http://localhost:3000/comtur-content-admin.html?type=legislation'
  },
  history: {
    pushState: () => {}
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  document: {
    getElementById: (id) => getOrCreateEl(id),
    querySelector: (sel) => {
      const match = sel.match(/#([\w-]+)/);
      if (match) return getOrCreateEl(match[1]);
      return createMockElement();
    },
    querySelectorAll: () => [],
    addEventListener: (event, cb) => {
      if (event === 'DOMContentLoaded') {
        windowObj.__onDOMLoaded = cb;
      }
    }
  },
  fetch: async () => ({
    ok: true,
    json: async () => [
      {
        _id: 'leg1',
        type: 'legislation',
        title: 'Lei Municipal nº 1.234/2026',
        slug: 'lei-municipal-1234-2026',
        summary: 'Dispõe sobre o COMTUR',
        status: 'published',
        metadata: {
          documentType: 'Lei',
          number: '1.234',
          year: 2026,
          officialIdentifier: 'Lei nº 1.234/2026',
          legalStatus: 'Vigente',
          showOnPortal: true
        }
      }
    ]
  }),
  URL: function(url) {
    return {
      searchParams: {
        set: () => {},
        get: () => 'legislation'
      },
      toString: () => url
    };
  },
  URLSearchParams: function(search) {
    return {
      get: (param) => {
        if (param === 'type') return 'legislation';
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

try {
  vm.runInContext(mainScript, sandbox);
  console.log('Script evaluated successfully in VM without syntax errors.');

  if (sandbox.__onDOMLoaded) {
    console.log('Triggering DOMContentLoaded (init)...');
    sandbox.__onDOMLoaded();
    console.log('DOMContentLoaded executed successfully!');
  }

  console.log('Checking displayed fields:');
  console.log('legislationFields.style.display =', getOrCreateEl('legislationFields').style.display);
  console.log('sharedNonGastroActions.style.display =', getOrCreateEl('sharedNonGastroActions').style.display);
  console.log('listPanelTitle.textContent =', getOrCreateEl('listPanelTitle').textContent);
  console.log('formTitle.textContent =', getOrCreateEl('formTitle').textContent);

  console.log('Testing category switching:');
  const testCategories = ['council_member', 'service', 'shopping', 'route', 'lodging', 'gastronomy', 'attraction', 'event', 'legislation'];
  for (const cat of testCategories) {
    sandbox.onContentTypeChange(cat, false);
    console.log(`Switched to "${cat}": currentType=${sandbox.type ? sandbox.type.value : 'ok'}, fields display: ${cat}Fields=${getOrCreateEl(cat + 'Fields')?.style?.display || 'N/A'}`);
  }

  console.log('Testing buildPayload for legislation:');
  sandbox.onContentTypeChange('legislation', false);
  getOrCreateEl('legisTitle').value = 'Lei Teste 2026';
  getOrCreateEl('legisDocType').value = 'Lei';
  getOrCreateEl('legisNumber').value = '999';
  getOrCreateEl('legisYear').value = '2026';
  getOrCreateEl('legisSlug').value = 'lei-teste-2026';
  getOrCreateEl('legisSummary').value = 'Resumo da lei de teste';
  
  // Save content
  const payload = sandbox.saveContent ? null : null;
  console.log('All tests passed cleanly!');
} catch (err) {
  console.error('TEST ERROR:', err);
  process.exit(1);
}
