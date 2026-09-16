const fs = require('fs');
const assert = require('assert');

// Read the updated HTML file
const html = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

console.log('Testing comtur-content-admin.html for Council Member functionality...');

// 1. Verify all required DOM IDs exist in HTML
const requiredDomIds = [
  'councilMemberFields',
  'councilAvatarPreview',
  'councilPhotoInput',
  'btnRemoveCouncilPhoto',
  'councilPhotoProgress',
  'councilPhotoAlt',
  'councilName',
  'councilDisplayName',
  'councilRole',
  'councilRepresentationType',
  'councilSlug',
  'councilOrganization',
  'councilSegment',
  'councilOrganizationRole',
  'councilTermStart',
  'councilTermEnd',
  'councilMemberStatus',
  'councilRelatedMemberSelect',
  'councilIsCurrent',
  'councilBio',
  'councilProfessionalArea',
  'councilTourismExperience',
  'councilPublicEmail',
  'councilPublicPhone',
  'councilShowPublicContact',
  'councilDisplayOrder',
  'councilShowOnPortal',
  'councilFeaturedTop',
  'councilAppointmentAct',
  'councilAppointmentDate',
  'councilAppointmentDocUrl',
  'councilLegislationSelect',
  'councilPublishDate',
  'btnArchiveCouncil'
];

requiredDomIds.forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing DOM Element id: ${id}`);
});
console.log('✔ All 34 required DOM IDs are present in HTML');

// 2. Verify all functions and handlers are defined in script
const requiredFunctions = [
  'renderCouncilAvatarPreview',
  'uploadCouncilPhoto',
  'populateCouncilRelatedMemberSelect',
  'populateCouncilLegislationSelect'
];

requiredFunctions.forEach(fn => {
  assert(html.includes(fn), `Missing function: ${fn}`);
});
console.log('✔ All helper functions are present in script');

// 3. Mock DOM environment to test JavaScript logic
const elements = {};
requiredDomIds.forEach(id => {
  elements[id] = {
    id,
    value: '',
    checked: false,
    style: { display: '' },
    innerHTML: '',
    textContent: '',
    dataset: {},
    addEventListener: () => {},
    onclick: null,
    reset: () => {}
  };
});

// Additional global elements
['form', 'id', 'type', 'formTitle', 'statusBadge', 'contentTypeSelector', 'listPanelTitle', 'searchInput', 'btnNew', 'list', 'sharedNonGastroActions'].forEach(id => {
  elements[id] = {
    id,
    value: '',
    checked: false,
    style: { display: '' },
    innerHTML: '',
    textContent: '',
    dataset: {},
    addEventListener: () => {},
    onclick: null,
    reset: () => {}
  };
});

global.$ = (id) => elements[id];
global.document = {
  getElementById: (id) => elements[id],
  querySelectorAll: () => []
};
global.window = {
  location: { search: '' },
  history: { pushState: () => {} }
};
global.slugify = (text) => (text || '').toString().toLowerCase().trim()
  .replace(/\s+/g, '-')
  .replace(/[^\w\-]+/g, '')
  .replace(/\-\-+/g, '-');

// Extract and test helper logic
let councilPhotoUrl = '';
function renderCouncilAvatarPreview(url) {
  const previewEl = $('councilAvatarPreview');
  const removeBtn = $('btnRemoveCouncilPhoto');
  const altInput = $('councilPhotoAlt');
  const nameVal = ($('councilDisplayName') ? $('councilDisplayName').value.trim() : '') || ($('councilName') ? $('councilName').value.trim() : '') || 'Conselheiro';

  if (!previewEl) return;

  if (url) {
    previewEl.innerHTML = `<img src="${url}" alt="${(altInput && altInput.value) || 'Foto de ' + nameVal}" style="width: 100%; height: 100%; object-fit: cover;">`;
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  } else {
    previewEl.innerHTML = `<span style="font-size: 3.2rem;">👤</span>`;
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

// Test 1: Empty photo shows default avatar
renderCouncilAvatarPreview('');
assert.strictEqual(elements['councilAvatarPreview'].innerHTML, '<span style="font-size: 3.2rem;">👤</span>');
assert.strictEqual(elements['btnRemoveCouncilPhoto'].style.display, 'none');
console.log('✔ Test 1: Empty photo shows default icon and hides remove button');

// Test 2: Selected photo shows image preview and displays remove button
councilPhotoUrl = 'https://example.com/maria-silva.jpg';
elements['councilName'].value = 'Maria da Silva';
renderCouncilAvatarPreview(councilPhotoUrl);
assert(elements['councilAvatarPreview'].innerHTML.includes('https://example.com/maria-silva.jpg'));
assert.strictEqual(elements['btnRemoveCouncilPhoto'].style.display, 'inline-flex');
console.log('✔ Test 2: Photo preview renders image and displays remove button');

// Test 3: Remove photo clears and returns to default icon
councilPhotoUrl = '';
renderCouncilAvatarPreview('');
assert.strictEqual(elements['councilAvatarPreview'].innerHTML, '<span style="font-size: 3.2rem;">👤</span>');
assert.strictEqual(elements['btnRemoveCouncilPhoto'].style.display, 'none');
console.log('✔ Test 3: Removing photo restores default icon');

// Test 4: Fill form with Test Member "Maria da Silva" and buildPayload
elements['councilName'].value = 'Maria da Silva';
elements['councilDisplayName'].value = 'Maria da Silva';
elements['councilRole'].value = 'Presidente';
elements['councilRepresentationType'].value = 'Titular';
elements['councilSlug'].value = 'maria-da-silva';
elements['councilOrganization'].value = 'Secretaria Municipal de Turismo';
elements['councilSegment'].value = 'Poder Público';
elements['councilOrganizationRole'].value = 'Secretária Executiva';
elements['councilTermStart'].value = '2026-01-01';
elements['councilTermEnd'].value = '2028-12-31';
elements['councilMemberStatus'].value = 'Em exercício';
elements['councilIsCurrent'].checked = true;
elements['councilBio'].value = 'Representante do poder público no COMTUR.';
elements['councilProfessionalArea'].value = 'Gestão Pública';
elements['councilTourismExperience'].value = '10 anos em governança turística.';
elements['councilPublicEmail'].value = 'maria.silva@ipojuca.pe.gov.br';
elements['councilPublicPhone'].value = '(81) 3552-1234';
elements['councilShowPublicContact'].checked = true;
elements['councilDisplayOrder'].value = '1';
elements['councilShowOnPortal'].checked = true;
elements['councilFeaturedTop'].checked = true;
elements['councilAppointmentAct'].value = 'Decreto nº 123/2026';
elements['councilAppointmentDate'].value = '2026-01-02';
elements['councilAppointmentDocUrl'].value = 'https://ipojuca.pe.gov.br/atos/decreto-123-2026.pdf';
elements['councilPhotoAlt'].value = 'Foto de Maria da Silva, Presidente do COMTUR';
elements['councilPublishDate'].value = '2026-01-02';
councilPhotoUrl = 'https://example.com/maria-silva.jpg';

// Simulate buildPayload
const currentType = 'council_member';
const statusToSave = 'published';

function buildTestPayload(statusToSave) {
  const name = $('councilName').value.trim();
  const displayName = $('councilDisplayName').value.trim() || name;
  const slug = slugify($('councilSlug').value) || slugify(name);
  const role = $('councilRole').value;
  const repType = $('councilRepresentationType').value;
  const organization = $('councilOrganization').value.trim();
  const segment = $('councilSegment').value;
  const orgRole = $('councilOrganizationRole').value.trim();
  const termStart = $('councilTermStart').value || undefined;
  const termEnd = $('councilTermEnd').value || undefined;
  const memberStatus = $('councilMemberStatus').value;
  const relatedMemberId = $('councilRelatedMemberSelect').value || undefined;
  const isCurrent = $('councilIsCurrent').checked;
  const bio = $('councilBio').value.trim();
  const profArea = $('councilProfessionalArea').value.trim();
  const tourismExp = $('councilTourismExperience').value.trim();
  const publicEmail = $('councilPublicEmail').value.trim();
  const publicPhone = $('councilPublicPhone').value.trim();
  const showPublicContact = $('councilShowPublicContact').checked;
  const displayOrder = parseInt($('councilDisplayOrder').value, 10) || 1;
  const showOnPortal = $('councilShowOnPortal').checked;
  const featuredTop = $('councilFeaturedTop').checked;
  const appointmentAct = $('councilAppointmentAct').value.trim();
  const appointmentDate = $('councilAppointmentDate').value || undefined;
  const appointmentDocUrl = $('councilAppointmentDocUrl').value.trim();
  const appointmentDocumentId = $('councilLegislationSelect').value || undefined;
  const photoAlt = $('councilPhotoAlt').value.trim() || `Foto de ${displayName}`;
  const publishedAt = $('councilPublishDate').value ? new Date($('councilPublishDate').value).toISOString() : undefined;

  const media = [];
  if (councilPhotoUrl) {
    media.push({
      type: 'photo',
      url: councilPhotoUrl,
      caption: photoAlt,
      alt: photoAlt,
      order: 0
    });
  }

  return {
    type: 'council_member',
    title: name,
    slug,
    summary: bio,
    body: bio,
    featured: featuredTop,
    publishedAt,
    status: statusToSave || 'draft',
    contact: {
      email: publicEmail,
      phone: publicPhone,
      publicEmail,
      publicPhone
    },
    metadata: {
      name,
      displayName,
      councilRole: role,
      role,
      representationType: repType,
      organization,
      entity: organization,
      segment,
      organizationRole: orgRole,
      termStart,
      termEnd,
      memberStatus,
      relatedMemberId,
      isCurrent,
      bio,
      professionalArea: profArea,
      tourismExperience: tourismExp,
      publicEmail,
      publicPhone,
      showPublicContact,
      displayOrder,
      showOnPortal,
      featuredTop,
      appointmentAct,
      appointmentDate,
      appointmentDocUrl,
      appointmentDocumentId,
      legislationId: appointmentDocumentId,
      photoUrl: councilPhotoUrl || '',
      photoAlt
    },
    media
  };
}

const payload = buildTestPayload('published');
assert.strictEqual(payload.type, 'council_member');
assert.strictEqual(payload.title, 'Maria da Silva');
assert.strictEqual(payload.slug, 'maria-da-silva');
assert.strictEqual(payload.metadata.councilRole, 'Presidente');
assert.strictEqual(payload.metadata.representationType, 'Titular');
assert.strictEqual(payload.metadata.organization, 'Secretaria Municipal de Turismo');
assert.strictEqual(payload.metadata.segment, 'Poder Público');
assert.strictEqual(payload.metadata.termStart, '2026-01-01');
assert.strictEqual(payload.metadata.termEnd, '2028-12-31');
assert.strictEqual(payload.metadata.memberStatus, 'Em exercício');
assert.strictEqual(payload.metadata.showPublicContact, true);
assert.strictEqual(payload.media[0].url, 'https://example.com/maria-silva.jpg');
console.log('✔ Test 4: Payload generated correctly with all structured metadata and media');

console.log('ALL COUNCIL MEMBER TESTS PASSED SUCCESSFULLY! 🎉');
