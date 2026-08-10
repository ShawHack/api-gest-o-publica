const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'teatro.html');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of #d4af37 with #ffffff
content = content.replace(/#d4af37/g, '#ffffff');

// Update the comment so it doesn't say "Dourado"
content = content.replace('--municipal-accent: #ffffff; /* Dourado */', '--municipal-accent: #ffffff; /* Branco */');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Yellow replaced with white!');
