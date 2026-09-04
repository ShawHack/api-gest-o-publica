const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove the inline color for "NOSSOS CURSOS" and use the peach color
content = content.replace(/<h2 class="cursos-title-img" style="font-size: 3rem; color: #ff716e; font-weight: 800;">NOSSOS CURSOS<\/h2>/, '<h2 class="cursos-title-img" style="font-size: 3rem; color: #ffad85; font-weight: 800; text-transform: uppercase;">Cursos</h2>');

// 2. Change "Conheça a EMCA" to use the peach color
content = content.replace(/<h2 style="font-size: 2.8rem; color: #1e293b; font-weight: 800; margin-bottom: 10px;">Conheça a EMCA<\/h2>/, '<h2 style="font-size: 2.8rem; color: #ffad85; font-weight: 800; margin-bottom: 10px; font-family: \'Rubik\', sans-serif;">Conheça a EMCA</h2>');

// 3. Change subtitle "Onde o talento ganha forma" to peach/orange
content = content.replace(/<h3 class="subtitle" style="font-size: 1.2rem; color: #ff716e; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 25px;">Onde o talento ganha forma<\/h3>/, '<h3 class="subtitle" style="font-size: 1.2rem; color: #ffad85; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 25px;">Nossa História de Cultura e Arte</h3>');

// 4. Change the background of the "Diferenciais" section to a softer color (or a warm orange gradient)
content = content.replace(/style="background: linear-gradient\(135deg, #1e293b 0%, #0f172a 100%\); padding: 100px 0; color: white;"/, 'style="background: linear-gradient(135deg, #ff9f66 0%, #e65c00 100%); padding: 100px 0; color: white;"');

// 5. Change the little divider in Diferenciais to white
content = content.replace(/<div style="width: 60px; height: 4px; background: #ff716e; margin: 15px auto;"><\/div>/, '<div style="width: 60px; height: 4px; background: #ffffff; margin: 15px auto;"></div>');

// 6. Change the icons in Diferenciais to white
content = content.replace(/color: #ff716e;/g, 'color: #ffffff;');
content = content.replace(/color: #3b82f6;/g, 'color: #ffffff;');
content = content.replace(/color: #d4af37;/g, 'color: #ffffff;');

// 7. Make the button in "Sobre" white text on orange, or orange text on white
content = content.replace(/style="background: linear-gradient\(135deg, #ff9f66 0%, #e65c00 100%\); color: white;/g, 'style="background: #ffad85; color: white;');

// 8. Fix the text of course duration
content = content.replace(/style="color: #ff716e; font-weight: bold;"/g, 'style="color: #e65c00; font-weight: bold;"');
content = content.replace(/style="border: 2px solid #ff716e; color: #ff716e; border-radius: 30px; padding: 8px 20px;"/g, 'style="border: 2px solid #ffad85; background-color: #ffad85; color: #ffffff; border-radius: 30px; padding: 8px 20px;"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Palette fixed!');
