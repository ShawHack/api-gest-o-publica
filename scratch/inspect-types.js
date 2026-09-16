const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const ctIdx = content.indexOf('const CONTENT_TYPES = [');
if (ctIdx !== -1) {
  console.log('CONTENT_TYPES:\n', content.substring(ctIdx, ctIdx + 1200));
}

const onCtIdx = content.indexOf('function onContentTypeChange(');
if (onCtIdx !== -1) {
  console.log('onContentTypeChange:\n', content.substring(onCtIdx, onCtIdx + 1200));
}
