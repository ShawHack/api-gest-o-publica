const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=== COMPREHENSIVE TEST: INDICATOR SPECIALIZED MODULE ===');

const htmlContent = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

// 1. Static Checks
console.log('1. Verifying HTML and static rules...');
assert(htmlContent.includes('id="indicatorFields"'), 'Missing #indicatorFields');
assert(!htmlContent.includes('🟢 Ativo (publicado no Observatório)'), 'Must not contain old status description');
assert(htmlContent.includes('<option value="published" selected>Ativo</option>'), 'Must have simple "Ativo"');
assert(htmlContent.includes('<option value="draft">Inativo</option>'), 'Must have simple "Inativo"');
assert(htmlContent.includes('placeholder="Ex.: Total de atrativos turísticos"'), 'Must have correct placeholder for name');
assert(htmlContent.includes('placeholder="Ex.: Total de atrativos turísticos ativos publicados no portal."'), 'Must have correct placeholder for description');
assert(htmlContent.includes('Não foi possível carregar os indicadores.'), 'Must have indicator-specific error');
assert(htmlContent.includes('Nenhum indicador cadastrado.'), 'Must have indicator-specific empty state');

// 2. VM Simulation
console.log('2. Running VM with DOM mock...');

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
    classList: {
      add: () => {},
      remove: () => {}
    },
    addEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => ({ checked: false }),
    appendChild: () => {},
    options: [{ value: 'published', text: 'Ativo' }, { value: 'draft', text: 'Inativo' }],
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

const radios = [
  { name: 'indSourceTypeRadio', value: 'automatic', checked: true, addEventListener: () => {} },
  { name: 'indSourceTypeRadio', value: 'manual', checked: false, addEventListener: () => {} }
];

let mockFetchResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    data: [
      { _id: 'att1', type: 'attraction', status: 'published', title: 'Bosque Municipal' },
      { _id: 'att2', type: 'attraction', status: 'published', title: 'Lago Artificial' },
      { _id: 'lod1', type: 'lodging', status: 'published', title: 'Hotel Garça Plaza', metadata: { totalUnits: '20', totalBeds: '50', maxGuests: '70' } },
      { _id: 'gas1', type: 'gastronomy', status: 'published', title: 'Cafeteria do Lago' },
      { _id: 'eve1', type: 'event', status: 'published', title: 'Cerejeiras Festival' },
      { _id: 'rou1', type: 'route', status: 'published', title: 'Caminhos do Café' },
      { _id: 'svc1', type: 'service', status: 'published', title: 'Guia Local' }
    ]
  })
};

let fetchCalls = [];

const domMock = {
  window: {
    location: { href: 'http://localhost/comtur-content-admin.html?type=indicator', search: '?type=indicator' },
    addEventListener: () => {},
    scrollTo: () => {}
  },
  document: {
    getElementById: (id) => getEl(id),
    querySelectorAll: (selector) => {
      if (selector === 'input[name="indSourceTypeRadio"]') return radios;
      return [];
    },
    querySelector: (selector) => {
      if (selector === 'input[name="indSourceTypeRadio"]:checked') {
        return radios.find(r => r.checked) || radios[0];
      }
      if (selector === 'input[name="indSourceTypeRadio"][value="automatic"]') return radios[0];
      if (selector === 'input[name="indSourceTypeRadio"][value="manual"]') return radios[1];
      return { checked: false };
    },
    addEventListener: () => {}
  },
  fetch: async (url, opts) => {
    fetchCalls.push({ url, opts });
    if (!mockFetchResponse.ok) {
      return {
        ok: false,
        status: mockFetchResponse.status,
        json: async () => ({ error: 'Error' })
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
  Date: Date,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
domMock.window.document = domMock.document;
domMock.window.history = domMock.history;

vm.runInNewContext(mainScript, domMock);

async function runTests() {
  // Test 2.1: initial loadItems with no indicators in data
  console.log('2.1 Testing initial loadItems with 0 indicators...');
  await domMock.window.loadItems();
  assert(getEl('list').innerHTML.includes('Nenhum indicador cadastrado.'), 'Should show "Nenhum indicador cadastrado."');
  console.log(' -> Empty state verified!');

  // Test 2.2: error handling in loadItems
  console.log('2.2 Testing error handling in loadItems...');
  mockFetchResponse = { ok: false, status: 500 };
  await domMock.window.loadItems();
  assert(getEl('list').innerHTML.includes('Não foi possível carregar os indicadores.'), 'Should show "Não foi possível carregar os indicadores." on error');
  assert(getEl('list').innerHTML.includes('loadItems()'), 'Should contain retry button with loadItems()');
  console.log(' -> Error handling verified!');

  // Restore mock
  mockFetchResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      data: [
        { _id: 'att1', type: 'attraction', status: 'published', title: 'Bosque Municipal' },
        { _id: 'att2', type: 'attraction', status: 'published', title: 'Lago Artificial' },
        { _id: 'lod1', type: 'lodging', status: 'published', title: 'Hotel Garça Plaza', metadata: { totalUnits: '20', totalBeds: '50', maxGuests: '70' } },
        { _id: 'gas1', type: 'gastronomy', status: 'published', title: 'Cafeteria do Lago' },
        { _id: 'eve1', type: 'event', status: 'published', title: 'Cerejeiras Festival' },
        { _id: 'rou1', type: 'route', status: 'published', title: 'Caminhos do Café' },
        { _id: 'svc1', type: 'service', status: 'published', title: 'Guia Local' }
      ]
    })
  };
  await domMock.window.loadItems();

  // Test 2.3: New indicator form reset
  console.log('2.3 Testing onContentTypeChange and resetForm...');
  domMock.window.onContentTypeChange('indicator', true);
  assert.strictEqual(getEl('indName').value, '', 'indName should be empty on reset');
  assert.strictEqual(getEl('indCategory').value, 'Atrativos Turísticos', 'indCategory should default to Atrativos Turísticos');
  assert.strictEqual(getEl('indStatusSelect').value, 'published', 'indStatusSelect should default to published (Ativo)');
  assert.strictEqual(getEl('indShowObservatory').checked, true, 'indShowObservatory should be checked');
  console.log(' -> Reset form defaults verified!');

  // Test 2.4: Metric calculations
  console.log('2.4 Testing automatic metric calculations...');
  getEl('indMetricKey').value = 'attractions.total';
  domMock.window.onContentTypeChange('indicator', true);
  assert.strictEqual(getEl('indAutoMetricValue').textContent, '2', 'Attractions total should be 2');

  getEl('indMetricKey').value = 'lodging.units';
  domMock.window.onContentTypeChange('indicator', true);
  assert.strictEqual(getEl('indAutoMetricValue').textContent, '20', 'Lodging units should be 20');

  getEl('indMetricKey').value = 'lodging.beds';
  domMock.window.onContentTypeChange('indicator', true);
  assert.strictEqual(getEl('indAutoMetricValue').textContent, '50', 'Lodging beds should be 50');

  getEl('indMetricKey').value = 'gastronomy.total';
  domMock.window.onContentTypeChange('indicator', true);
  assert.strictEqual(getEl('indAutoMetricValue').textContent, '1', 'Gastronomy total should be 1');

  getEl('indMetricKey').value = 'events.total';
  domMock.window.onContentTypeChange('indicator', true);
  assert.strictEqual(getEl('indAutoMetricValue').textContent, '1', 'Events total should be 1');
  console.log(' -> Metric preview calculations verified!');

  // Test 2.5: Saving automatic indicator
  console.log('2.5 Testing saving Automatic Indicator...');
  getEl('indName').value = 'Total de Atrativos Turísticos de Garça';
  getEl('indCategory').value = 'Atrativos Turísticos';
  getEl('indDescription').value = 'Total de pontos turísticos ativos no catálogo municipal.';
  getEl('indMetricKey').value = 'attractions.total';
  radios[0].checked = true;
  radios[1].checked = false;

  await domMock.window.saveContent('published');
  const postCall = fetchCalls.find(c => c.opts && c.opts.method === 'POST' && c.url === '/api/comtur/admin/content');
  assert(postCall, 'Must make POST request to /api/comtur/admin/content');
  const savedData = JSON.parse(postCall.opts.body);
  assert.strictEqual(savedData.type, 'indicator');
  assert.strictEqual(savedData.title, 'Total de Atrativos Turísticos de Garça');
  assert.strictEqual(savedData.metadata.sourceType, 'automatic');
  assert.strictEqual(savedData.metadata.metricKey, 'attractions.total');
  assert.strictEqual(savedData.metadata.unit, 'atrativos');
  assert.strictEqual(savedData.metadata.category, 'Atrativos Turísticos');
  assert.strictEqual(savedData.status, 'published');
  console.log(' -> Automatic indicator payload & save verified!');

  // Test 2.6: Manual indicator with measurements
  console.log('2.6 Testing Manual Indicator saving...');
  radios[0].checked = false;
  radios[1].checked = true;

  fetchCalls = [];
  getEl('indName').value = 'Taxa de Ocupação Hoteleira';
  getEl('indUnit').value = '%';
  getEl('indPeriodicity').value = 'Mensal';
  getEl('indSource').value = 'Pesquisa Direta COMTUR';

  await domMock.window.saveContent('published');
  const manualPost = fetchCalls.find(c => c.opts && c.opts.method === 'POST' && c.url === '/api/comtur/admin/content');
  assert(manualPost, 'Must make POST request to /api/comtur/admin/content for manual indicator');
  const manualData = JSON.parse(manualPost.opts.body);
  assert.strictEqual(manualData.metadata.sourceType, 'manual');
  assert.strictEqual(manualData.metadata.unit, '%');
  assert.strictEqual(manualData.metadata.periodicity, 'Mensal');
  console.log(' -> Manual indicator payload & save verified!');

  // Test 2.7: Loading item for edit
  console.log('2.7 Testing loadItemForEdit for indicator...');
  const itemToEdit = {
    _id: 'ind123',
    type: 'indicator',
    title: 'Taxa Média de Ocupação Hoteleira',
    slug: 'taxa-media-ocupacao-hoteleira',
    status: 'published',
    summary: 'Monitoramento mensal de leitos ocupados.',
    metadata: {
      category: 'Hospedagem & Ocupação',
      sourceType: 'manual',
      unit: '%',
      periodicity: 'Mensal',
      source: 'COMTUR / ABIH',
      measurements: [
        { period: 'Jan/2026', value: '75.0' }
      ]
    }
  };
  domMock.window.loadItemForEdit(itemToEdit);
  assert.strictEqual(getEl('indName').value, 'Taxa Média de Ocupação Hoteleira');
  assert.strictEqual(getEl('indCategory').value, 'Hospedagem & Ocupação');
  assert.strictEqual(getEl('indUnit').value, '%');
  console.log(' -> loadItemForEdit verified!');

  console.log('\n==================================================');
  console.log('✅ ALL COMPREHENSIVE TESTS PASSED WITH 100% SUCCESS!');
  console.log('==================================================');
}

runTests().catch(e => {
  console.error('FATAL TEST ERROR:', e);
  process.exit(1);
});
