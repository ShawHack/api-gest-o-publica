const fs = require('fs');

const filePath = 'comtur-next/portal/comtur-content-admin.html';
let content = fs.readFileSync(filePath, 'utf8');

// Replace window.onContentTypeChange = function with function onContentTypeChange
content = content.replace('window.onContentTypeChange = function(', 'function onContentTypeChange(');
// Also ensure window.onContentTypeChange = onContentTypeChange
if (!content.includes('window.onContentTypeChange = onContentTypeChange;')) {
  content = content.replace('window.loadItems = loadItems;', 'window.loadItems = loadItems;\n  window.onContentTypeChange = onContentTypeChange;');
}

// Replace window.saveContent = async function with async function saveContent
content = content.replace('window.saveContent = async function(', 'async function saveContent(');
if (!content.includes('window.saveContent = saveContent;')) {
  content = content.replace('window.loadItems = loadItems;', 'window.loadItems = loadItems;\n  window.saveContent = saveContent;');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed onContentTypeChange and saveContent scopes!');
