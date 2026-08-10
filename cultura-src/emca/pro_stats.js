const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

// The line we want to replace
const oldDivStyle = /<div style="background: rgba\(255, 255, 255, 0\.45\); backdrop-filter: blur\(10px\); border-radius: 20px; box-shadow: 0 15px 40px rgba\(0,0,0,0\.08\); padding: 40px 20px; display: flex; flex-wrap: wrap; justify-content: space-around; gap: 20px; text-align: center; border: 1px solid rgba\(255, 159, 102, 0\.2\);">/;

const newDivStyle = '<div style="background: #ffffff; border-radius: 12px; box-shadow: 0 15px 35px rgba(10, 25, 47, 0.08); padding: 40px 20px; display: flex; flex-wrap: wrap; justify-content: space-around; gap: 20px; text-align: center; border: 1px solid rgba(0, 0, 0, 0.04); border-top: 4px solid #ff716e; position: relative;">';

content = content.replace(oldDivStyle, newDivStyle);

// Also let's adjust the margin-top slightly to make it overlap just a bit less so it's less jarring
// old: margin-top: -60px;
// new: margin-top: -40px;
content = content.replace(/margin-top: -60px;/, 'margin-top: -40px;');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Stats card made more professional!');
