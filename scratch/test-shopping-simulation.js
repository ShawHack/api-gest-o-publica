const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../comtur-next/portal/comtur-content-admin.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('=== TEST SIMULATION: COMPRAS FORM (SHOPPING) ===');

// 1. Parse DOM
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/comtur-content-admin.html?type=shopping' });
const { window } = dom;
const { document } = window;

// 2. Check essential IDs in HTML
const requiredIds = [
  'shoppingFields',
  'shopName',
  'shopCategory',
  'shopSlug',
  'shopSummary',
  'shopSummaryCount',
  'shopBody',
  'shopFeatured',
  'shopIsTouristTrade',
  'shopHasLocalProducts',
  'shopHasArtisanalProducts',
  'shopTouristService',
  'shopStreet',
  'shopNumber',
  'shopComplement',
  'shopNeighborhood',
  'shopCep',
  'shopCity',
  'shopState',
  'shopReference',
  'shopLat',
  'shopLng',
  'shopPhone',
  'shopWhatsapp',
  'shopEmail',
  'shopWebsite',
  'shopInstagram',
  'shopFacebook',
  'shopCatalogUrl',
  'shopOnlineStoreUrl',
  'shopOpen24h',
  'shopHoursTable',
  'shopServicesList',
  'shopOtherServices',
  'shopMainProducts',
  'shopSpecialties',
  'shopLocalBrands',
  'shopTypicalProducts',
  'shopProductSegmentsList',
  'shopOtherSegments',
  'shopPaymentMethodsList',
  'shopInstallmentsAvailable',
  'shopPaymentNotes',
  'shopAccessibilityList',
  'shopAccessibilityNotes',
  'shopTouristFacilitiesList',
  'shopTouristNotes',
  'shopRelatedEntitiesList',
  'shopFileInput',
  'shopUploadProgress',
  'shopGalleryGrid',
  'shopVideoUrl',
  'shopSeoTitle',
  'shopSeoDescription',
  'shopSeoShareText',
  'shopPublishDate',
  'shopFeaturedTop',
  'btnArchiveShopping'
];

let missing = [];
for (const id of requiredIds) {
  const el = document.getElementById(id);
  if (!el) missing.push(id);
}

if (missing.length) {
  console.error('FAILED: Missing IDs in HTML:', missing);
  process.exit(1);
} else {
  console.log('PASS: All 56 required Compras DOM elements exist.');
}

// 3. Test onContentTypeChange('shopping')
window.onContentTypeChange('shopping', false);
console.log('PASS: onContentTypeChange("shopping") executed successfully.');
console.log('Active Form container display:', document.getElementById('shoppingFields').style.display);
console.log('Sidebar Title:', document.getElementById('listPanelTitle').textContent);
console.log('Search Placeholder:', document.getElementById('searchInput').placeholder);
console.log('New Button Label:', document.getElementById('btnNew').textContent);

// 4. Fill form with test data
document.getElementById('shopName').value = 'Casa do Café e Artesanato Garça';
document.getElementById('shopSlug').value = 'casa-do-cafe-e-artesanato-garca';
document.getElementById('shopCategory').value = 'Produtos locais';
document.getElementById('shopSummary').value = 'A melhor seleção de cafés premiados e artesanato autoral de Garça.';
document.getElementById('shopBody').value = 'História fundada em 1998, promovendo produtores e artesãos locais da região.';
document.getElementById('shopFeatured').checked = true;
document.getElementById('shopFeaturedTop').checked = true;
document.getElementById('shopIsTouristTrade').checked = true;
document.getElementById('shopHasLocalProducts').checked = true;
document.getElementById('shopHasArtisanalProducts').checked = true;
document.getElementById('shopTouristService').checked = true;

document.getElementById('shopStreet').value = 'Rua das Flores';
document.getElementById('shopNumber').value = '150';
document.getElementById('shopComplement').value = 'Loja 2';
document.getElementById('shopNeighborhood').value = 'Centro';
document.getElementById('shopCep').value = '17400-000';
document.getElementById('shopCity').value = 'Garça';
document.getElementById('shopState').value = 'SP';
document.getElementById('shopReference').value = 'Em frente ao Lago Artificial';
document.getElementById('shopLat').value = '-22.213';
document.getElementById('shopLng').value = '-49.654';

document.getElementById('shopPhone').value = '(14) 3471-0000';
document.getElementById('shopWhatsapp').value = '(14) 99999-0000';
document.getElementById('shopEmail').value = 'contato@casadocafe.com.br';
document.getElementById('shopWebsite').value = 'https://www.casadocafe.com.br';
document.getElementById('shopInstagram').value = '@casadocafe_garca';
document.getElementById('shopFacebook').value = 'https://facebook.com/casadocafe';
document.getElementById('shopCatalogUrl').value = 'https://catalogo.casadocafe.com.br';
document.getElementById('shopOnlineStoreUrl').value = 'https://loja.casadocafe.com.br';

document.getElementById('shopOtherServices').value = 'Moagem de café na hora e degustação guiada';
document.getElementById('shopMainProducts').value = 'Café em grãos, café moído, cerâmica e compotas';
document.getElementById('shopSpecialties').value = 'Café arábica premiado 86+ pontos';
document.getElementById('shopLocalBrands').value = 'Garça Real, Café do Vale, Doces da Vovó';
document.getElementById('shopTypicalProducts').value = 'Café cereja descascado, licor de café';
document.getElementById('shopOtherSegments').value = 'Acessórios para preparo de cafés especiais';

document.getElementById('shopInstallmentsAvailable').checked = true;
document.getElementById('shopPaymentNotes').value = 'Em até 3x sem juros no cartão nas compras acima de R$ 100';
document.getElementById('shopAccessibilityNotes').value = 'Rampa de acesso frontal e corredor amplo';
document.getElementById('shopTouristNotes').value = 'Embalagens especiais a vácuo para viagem';

// Test Select chips
const selectChip = (containerId, chipId) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  const input = container.querySelector(`input[value="${chipId}"]`);
  if (input) {
    input.checked = true;
    input.closest('.comtur-chip-btn').classList.add('is-checked');
  }
};

selectChip('shopServicesList', 'wifi');
selectChip('shopServicesList', 'parking');
selectChip('shopServicesList', 'delivery');
selectChip('shopServicesList', 'whatsapp_service');

selectChip('shopProductSegmentsList', 'coffee');
selectChip('shopProductSegmentsList', 'local_crafts');
selectChip('shopProductSegmentsList', 'souvenirs');

selectChip('shopPaymentMethodsList', 'pix');
selectChip('shopPaymentMethodsList', 'credit_card');
selectChip('shopPaymentMethodsList', 'cash');

selectChip('shopAccessibilityList', 'accessible_entrance');
selectChip('shopAccessibilityList', 'wheelchair_access');

selectChip('shopTouristFacilitiesList', 'tourist_service');
selectChip('shopTouristFacilitiesList', 'local_identity_products');
selectChip('shopTouristFacilitiesList', 'travel_packaging');

// 5. Test buildPayload
// We can extract buildPayload from document script or test with window helper
// Let's check window.saveContent or evaluate payload building
const payload = window.eval(`buildPayload('draft')`);
console.log('PASS: buildPayload("draft") returned valid payload:');
console.log('Type:', payload.type);
console.log('Title:', payload.title);
console.log('Slug:', payload.slug);
console.log('Status:', payload.status);
console.log('Featured:', payload.featured);
console.log('Metadata keys:', Object.keys(payload.metadata));
console.log('Services selected:', payload.metadata.services);
console.log('Product segments:', payload.metadata.productSegments);
console.log('Payment methods:', payload.metadata.paymentMethods);
console.log('Accessibility:', payload.metadata.accessibility);
console.log('Tourist facilities:', payload.metadata.touristFacilities);
console.log('Address:', payload.metadata.address);
console.log('Contact:', payload.metadata.contact);

// Verify required values in payload
if (payload.type !== 'shopping') throw new Error('Expected payload.type to be shopping');
if (payload.title !== 'Casa do Café e Artesanato Garça') throw new Error('Title mismatch');
if (!payload.metadata.services.includes('wifi')) throw new Error('wifi not in services');
if (!payload.metadata.services.includes('delivery')) throw new Error('delivery not in services');
if (!payload.metadata.productSegments.includes('coffee')) throw new Error('coffee not in product segments');
if (!payload.metadata.paymentMethods.includes('pix')) throw new Error('pix not in payment methods');
if (!payload.metadata.accessibility.includes('wheelchair_access')) throw new Error('wheelchair_access not in accessibility');
if (!payload.metadata.touristFacilities.includes('travel_packaging')) throw new Error('travel_packaging not in tourist facilities');

// 6. Test round-trip loadItemForEdit
const mockItem = {
  _id: 'mock_shop_123',
  type: 'shopping',
  title: payload.title,
  slug: payload.slug,
  summary: payload.summary,
  body: payload.body,
  featured: payload.featured,
  status: 'published',
  publishedAt: new Date().toISOString(),
  media: [{ url: 'https://example.com/fachada.jpg', title: 'Fachada da Loja', credit: 'Turismo Garça' }],
  metadata: payload.metadata
};

// Reset form first
window.eval(`resetForm(true)`);
console.log('PASS: resetForm() cleared form.');

// Load mock item
window.eval(`loadItemForEdit(${JSON.stringify(mockItem)})`);
console.log('PASS: loadItemForEdit() populated form.');

// Re-check loaded inputs
const reloadedName = document.getElementById('shopName').value;
const reloadedCategory = document.getElementById('shopCategory').value;
const reloadedStreet = document.getElementById('shopStreet').value;
const reloadedPhone = document.getElementById('shopPhone').value;
const reloadedMainProducts = document.getElementById('shopMainProducts').value;
const reloadedPublishDate = document.getElementById('shopPublishDate').value;
const btnArchiveDisplay = document.getElementById('btnArchiveShopping').style.display;

console.log('Reloaded Name:', reloadedName);
console.log('Reloaded Category:', reloadedCategory);
console.log('Reloaded Street:', reloadedStreet);
console.log('Reloaded Phone:', reloadedPhone);
console.log('Reloaded Main Products:', reloadedMainProducts);
console.log('Reloaded Publish Date:', reloadedPublishDate);
console.log('Btn Archive Display:', btnArchiveDisplay);

if (reloadedName !== 'Casa do Café e Artesanato Garça') throw new Error('Reloaded name mismatch');
if (reloadedCategory !== 'Produtos locais') throw new Error('Reloaded category mismatch');
if (reloadedStreet !== 'Rua das Flores') throw new Error('Reloaded street mismatch');
if (reloadedPhone !== '(14) 3471-0000') throw new Error('Reloaded phone mismatch');
if (reloadedMainProducts !== 'Café em grãos, café moído, cerâmica e compotas') throw new Error('Reloaded products mismatch');

// Rebuild payload after edit and check persistence of chips
const reloadedPayload = window.eval(`buildPayload('published')`);
if (!reloadedPayload.metadata.services.includes('wifi')) throw new Error('wifi chip lost after reload');
if (!reloadedPayload.metadata.productSegments.includes('coffee')) throw new Error('coffee chip lost after reload');
if (!reloadedPayload.metadata.paymentMethods.includes('pix')) throw new Error('pix chip lost after reload');
if (!reloadedPayload.metadata.accessibility.includes('wheelchair_access')) throw new Error('wheelchair_access chip lost after reload');
if (!reloadedPayload.metadata.touristFacilities.includes('travel_packaging')) throw new Error('travel_packaging chip lost after reload');

console.log('=== ALL COMPRAS FORM TESTS PASSED PERFECTLY ===');
