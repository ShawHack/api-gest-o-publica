const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'admin.html');
let content = fs.readFileSync(filePath, 'utf8');

// Replace relative API paths with absolute ones pointing to the backend
content = content.replace(/'\/api\//g, "'http://localhost:3000/api/");
content = content.replace(/`\/api\//g, "`http://localhost:3000/api/");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed API URLs in admin.html!');
