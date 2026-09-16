const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const scriptStart = content.indexOf('<script>');
console.log('Script tag starts at:', scriptStart);
console.log(content.substring(scriptStart, scriptStart + 2000));
