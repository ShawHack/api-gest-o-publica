const fs = require('fs');
const html = fs.readFileSync('C:/Users/marjorie.talberg/Desktop/teatro/admin.html', 'utf8');

const startIndex = html.indexOf('<section id="tab-events" class="tab-pane">');
const endIndex = html.indexOf('<section id="tab-users" class="tab-pane">');
const sectionHtml = html.substring(startIndex, endIndex);

console.log(sectionHtml);
