const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'admin.html');
let content = fs.readFileSync(filePath, 'utf8');

const descAnchor = `              <div class="form-group">
                <label>Descrição Completa</label>`;
if (!content.includes('</div>\n              <div class="form-group">\n                <label>Descrição Completa</label>')) {
    content = content.replace(descAnchor, `              </div>\n` + descAnchor);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed missing closing div for form-grid!');
} else {
    console.log('Div already closed!');
}
