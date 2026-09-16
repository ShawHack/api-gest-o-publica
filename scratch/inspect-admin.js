const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

// Find all Fields containers
const matches = content.match(/id="[a-zA-Z0-9_-]*Fields"/g);
console.log('Fields IDs:', matches);

// Check if councilMemberFields already exists
console.log('Includes councilMemberFields?', content.includes('councilMemberFields'));

// Find onContentTypeChange implementation
const onContentIdx = content.indexOf('function onContentTypeChange');
if (onContentIdx !== -1) {
  console.log('onContentTypeChange snippet:\n', content.substring(onContentIdx, onContentIdx + 1500));
}

// Find buildPayload implementation
const buildPayloadIdx = content.indexOf('function buildPayload');
if (buildPayloadIdx !== -1) {
  console.log('buildPayload snippet:\n', content.substring(buildPayloadIdx, buildPayloadIdx + 1500));
}
