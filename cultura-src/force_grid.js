const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'admin.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Force the grid to be side by side
const eventsTabAnchor = `<section id="tab-events" class="tab-pane">\n        <div class="dashboard-grid">`;
const eventsTabInjection = `<section id="tab-events" class="tab-pane">\n        <div class="dashboard-grid" style="display: grid !important; grid-template-columns: 1.2fr 1fr !important; align-items: start !important;">`;
content = content.replace(eventsTabAnchor, eventsTabInjection);

// 2. Fix the missing closing div for form-grid
const descAnchor = `              <div class="form-group">\n                <label>Descrição Completa</label>`;
if (content.includes(descAnchor) && !content.includes(`</div>\n` + descAnchor)) {
    content = content.replace(descAnchor, `              </div>\n` + descAnchor);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Forced grid side-by-side and fixed unclosed div!');
