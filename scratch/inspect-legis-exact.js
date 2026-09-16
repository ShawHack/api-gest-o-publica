const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');
const start = content.indexOf('id="legislationFields"');
const end = content.indexOf('</div>\n\n          <!-- ================================================================= -->\n          <!-- 9.', start);
// Let's find the closing </div> of legislationFields
let nextCategory = content.indexOf('class="comtur-category-fields"', start + 30);
console.log('legislationFields HTML:');
console.log(content.substring(start - 200, nextCategory > 0 ? nextCategory : start + 3000));
