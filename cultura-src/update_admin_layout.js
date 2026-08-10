const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'admin.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update dashboard-grid layout
const oldGrid = `    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: 40px;
    }`;
const newGrid = `    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }`;
content = content.replace(oldGrid, newGrid);

// 2. Change absolute URLs to relative
content = content.replace(/http:\/\/localhost:3000/g, '');

// 3. Improve .list-item styling slightly
const oldHover = `    .list-item:hover {
      border-color: #cbd5e1;
      background: white;
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 15px 35px -10px rgba(0,0,0,0.08);
    }`;
const newHover = `    .list-item:hover {
      border-color: #ff716e;
      background: white;
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 15px 35px -10px rgba(255,113,110,0.15);
    }`;
content = content.replace(oldHover, newHover);

fs.writeFileSync(filePath, content, 'utf8');
console.log('admin.html updated successfully!');
