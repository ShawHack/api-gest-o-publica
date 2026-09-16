const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const onCtIdx = content.indexOf('window.onContentTypeChange = function(');
if (onCtIdx !== -1) {
  console.log('window.onContentTypeChange:\n', content.substring(onCtIdx, onCtIdx + 2000));
}
