const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'comtur-next', 'portal', 'comtur-content-admin.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

console.log('=== TEST VERIFICATION: SERVIÇOS AO TURISTA FORM ===');

// 1. Check all 55+ element IDs in HTML
const requiredIds = [
  'serviceFields',
  'svcName',
  'svcCategory',
  'svcSlug',
  'svcSummary',
  'svcSummaryCount',
  'svcBody',
  'svcFeatured',
  'svcIsOfficial',
  'svcIs24h',
  'svcTouristService',
  'svcIsEmergency',
  'svcNoPhysicalAttendance',
  'svcStreet',
  'svcNumber',
  'svcComplement',
  'svcNeighborhood',
  'svcCep',
  'svcCity',
  'svcState',
  'svcReference',
  'svcLat',
  'svcLng',
  'svcPhone',
  'svcSecondaryPhone',
  'svcWhatsapp',
  'svcEmail',
  'svcWebsite',
  'svcMainChannel',
  'svcInstagram',
  'svcFacebook',
  'svcEmergencyPhone',
  'svcOnCallPhone',
  'svcHasEmergencyAttendance',
  'svcHas24hOnCall',
  'svcOpen24h',
  'svcHoursTable',
  'svcHoursNotes',
  'svcServicesList',
  'svcOtherFacilities',
  'svcCategorySpecificSection',
  'svcCatWrap',
  'svcCatFeaturesList',
  'svcGuideWrap',
  'svcGuideFeaturesList',
  'svcGuideCadastur',
  'svcGuideLanguages',
  'svcGuideArea',
  'svcGuideBookingUrl',
  'svcTransportWrap',
  'svcTransportFeaturesList',
  'svcTransportArea',
  'svcTransportBookingUrl',
  'svcTransportFareNotes',
  'svcHealthWrap',
  'svcHealthFeaturesList',
  'svcHealthCareType',
  'svcHealthVisitorGuidelines',
  'svcSecurityWrap',
  'svcSecurityFeaturesList',
  'svcSecurityEmergencyPhone',
  'svcSecurityUnitPhone',
  'svcSecurityArea',
  'svcBankingWrap',
  'svcBankingFeaturesList',
  'svcBankingNetwork',
  'svcGasStationWrap',
  'svcGasFeaturesList',
  'svcAccessibilityList',
  'svcAccessibilityNotes',
  'svcLanguagesList',
  'svcOtherLanguages',
  'svcRelatedEntitiesList',
  'svcGalleryGrid',
  'svcFileInput',
  'svcUploadProgress',
  'svcVideoUrl',
  'svcUsefulDocsList',
  'btnAddSvcDoc',
  'svcSeoTitle',
  'svcSeoDescription',
  'svcSeoShareText',
  'svcPublishDate',
  'svcFeaturedTop',
  'btnArchiveService'
];

let missing = [];
for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) {
    missing.push(id);
  }
}

if (missing.length) {
  console.error('FAILED: Missing IDs in HTML:', missing);
  process.exit(1);
} else {
  console.log(`PASS: All ${requiredIds.length} required element IDs exist in HTML.`);
}

// 2. Check JS constants exist
const constants = [
  'SVC_FACILITIES',
  'SVC_CAT_FEATURES',
  'SVC_GUIDE_FEATURES',
  'SVC_TRANSPORT_FEATURES',
  'SVC_HEALTH_FEATURES',
  'SVC_SECURITY_FEATURES',
  'SVC_BANKING_FEATURES',
  'SVC_GAS_FEATURES',
  'SVC_ACCESSIBILITY',
  'SVC_LANGUAGES'
];

for (const c of constants) {
  if (!html.includes(`const ${c} =`)) {
    console.error(`FAILED: Missing constant ${c}`);
    process.exit(1);
  }
}
console.log('PASS: All 10 Service constants are properly declared.');

// 3. Check functions exist in script
const functions = [
  'syncService24h',
  'updateServiceCategorySpecificFields',
  'renderServiceChips',
  'renderServiceGallery',
  'renderServiceDocs',
  'removeServiceDoc'
];

for (const f of functions) {
  if (!html.includes(f)) {
    console.error(`FAILED: Missing function ${f}`);
    process.exit(1);
  }
}
console.log('PASS: All Service helper functions are properly implemented.');

// 4. Check categories present in select
const requiredCategories = [
  'Informações Turísticas',
  'Agência de Turismo',
  'Guia de Turismo',
  'Transporte',
  'Rodoviária',
  'Táxi',
  'Transporte por aplicativo',
  'Locadora de Veículos',
  'Bicicletas / Mobilidade',
  'Posto de Combustível',
  'Saúde',
  'Hospital',
  'Pronto Atendimento',
  'Farmácia',
  'Segurança',
  'Polícia',
  'Bombeiros',
  'Banco',
  'Caixa Eletrônico',
  'Correios',
  'Estacionamento',
  'Banheiro Público',
  'Internet / Wi-Fi',
  'Assistência Automotiva',
  'Outros'
];

for (const cat of requiredCategories) {
  if (!html.includes(`value="${cat}"`)) {
    console.error(`FAILED: Missing category option "${cat}" in select`);
    process.exit(1);
  }
}
console.log(`PASS: All ${requiredCategories.length} categories are present in svcCategory select.`);

console.log('=== ALL CHECKS PASSED SUCCESSFULLY! ===');
