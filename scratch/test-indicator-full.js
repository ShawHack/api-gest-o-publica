const fs = require('fs');
const assert = require('assert');

console.log('=== TEST: INDICATOR MODULE VALIDATION ===');

const htmlContent = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

// 1. Verify markup
console.log('1. Checking HTML markup for #indicatorFields...');
assert(htmlContent.includes('id="indicatorFields"'), 'Missing #indicatorFields');
assert(htmlContent.includes('id="indName"'), 'Missing #indName');
assert(htmlContent.includes('id="indCategory"'), 'Missing #indCategory');
assert(htmlContent.includes('id="indStatusSelect"'), 'Missing #indStatusSelect');
assert(htmlContent.includes('id="indDescription"'), 'Missing #indDescription');
assert(htmlContent.includes('id="indMetricKey"'), 'Missing #indMetricKey');
assert(htmlContent.includes('id="indAutoPreviewCard"'), 'Missing #indAutoPreviewCard');
assert(htmlContent.includes('id="indUnit"'), 'Missing #indUnit');
assert(htmlContent.includes('id="indPeriodicity"'), 'Missing #indPeriodicity');
assert(htmlContent.includes('id="indSource"'), 'Missing #indSource');
assert(htmlContent.includes('id="indHistorySection"'), 'Missing #indHistorySection');
assert(htmlContent.includes('id="indMeasurementsTableBody"'), 'Missing #indMeasurementsTableBody');
assert(htmlContent.includes('id="indVisType"'), 'Missing #indVisType');
assert(htmlContent.includes('id="indShowObservatory"'), 'Missing #indShowObservatory');
assert(htmlContent.includes('id="indFeatured"'), 'Missing #indFeatured');
console.log(' -> DOM elements present.');

// 2. Check category options and status options
console.log('2. Checking Category and Status options...');
assert(htmlContent.includes('<option value="Atrativos Turísticos" selected>Atrativos Turísticos</option>'), 'Missing Atrativos Turísticos category');
assert(htmlContent.includes('<option value="published" selected>Ativo</option>'), 'Status published should be simple "Ativo"');
assert(htmlContent.includes('<option value="draft">Inativo</option>'), 'Status draft should be simple "Inativo"');
assert(!htmlContent.includes('🟢 Ativo (publicado no Observatório)'), 'Old complex status label should be removed');
console.log(' -> Category and status options verified.');

// 3. Check error and empty states
console.log('3. Checking empty and error state strings...');
assert(htmlContent.includes("Não foi possível carregar os indicadores."), 'Missing indicator specific error message');
assert(htmlContent.includes("Nenhum indicador cadastrado."), 'Missing indicator specific empty state');
assert(htmlContent.includes("Nenhum indicador encontrado."), 'Missing indicator specific query empty state');
console.log(' -> Empty and error state texts verified.');

// 4. Check all 9 automatic metrics
console.log('4. Checking all 9 authorized automatic metrics...');
const expectedMetrics = [
  'attractions.total',
  'lodging.total',
  'lodging.units',
  'lodging.beds',
  'lodging.capacity',
  'gastronomy.total',
  'events.total',
  'routes.total',
  'services.total'
];

expectedMetrics.forEach(m => {
  assert(htmlContent.includes(`key: '${m}'`), `Missing metric key in AUTOMATIC_METRIC_CONFIGS: ${m}`);
});
console.log(' -> All 9 metrics present in AUTOMATIC_METRIC_CONFIGS.');

// 5. Run VM simulation to test JavaScript execution
console.log('5. Testing JavaScript execution in VM...');
const scriptMatches = [...htmlContent.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
const mainScript = scriptMatches[scriptMatches.length - 1][1];

const vm = require('vm');
const elements = {};
function getEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id,
      value: '',
      dataset: {},
      style: {},
      addEventListener: () => {},
      querySelectorAll: () => [],
      querySelector: () => ({ checked: false }),
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      innerHTML: '',
      textContent: '',
      reset: () => {},
      checked: false
    };
  }
  return elements[id];
}

const domMock = {
  window: {
    location: { search: '?type=indicator' },
    addEventListener: () => {},
    scrollTo: () => {}
  },
  document: {
    getElementById: (id) => getEl(id),
    querySelectorAll: () => [],
    querySelector: () => ({ checked: true, value: 'automatic' }),
    addEventListener: () => {}
  },
  fetch: async (url) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { _id: '1', type: 'attraction', status: 'published', title: 'Lago Artificial' },
          { _id: '2', type: 'lodging', status: 'published', title: 'Hotel Garça', metadata: { totalUnits: '20', totalBeds: '50', maxGuests: '60' } }
        ]
      })
    };
  },
  console: {
    log: () => {},
    error: console.error,
    warn: console.warn
  },
  URLSearchParams: URLSearchParams,
  Date: Date,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
domMock.window.document = domMock.document;

vm.runInNewContext(mainScript, domMock);

// Test loadItems
domMock.window.loadItems().then(() => {
  console.log(' -> loadItems executed successfully.');
  
  // List should say "Nenhum indicador cadastrado." because 0 indicators in mock data
  const listHtml = getEl('list').innerHTML;
  console.log(' -> List empty state rendered:', listHtml);
  assert(listHtml.includes('Nenhum indicador cadastrado.'), 'List should show "Nenhum indicador cadastrado."');
  
  console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
}).catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
