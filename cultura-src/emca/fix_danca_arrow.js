const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the image path for Dança
content = content.replace(/Alice não País das Maravilhas \(Ballet\)/g, 'Alice_Ballet');
// Just in case it was written as "no Pais"
content = content.replace(/Alice no País das Maravilhas \(Ballet\)/g, 'Alice_Ballet');
content = content.replace(/Alice no Pas das Maravilhas \(Ballet\)/g, 'Alice_Ballet');

// 2. Fix the arrows
// In my revert_cursos.js, I wrote:
// <button class="carousel-btn prev-btn-cursos"><i class="fa-solid fa-chevron-left"></i></button>
// <button class="carousel-btn next-btn-cursos"><i class="fa-solid fa-chevron-right"></i></button>
// Let's check if the FontAwesome is somehow missing by replacing them with Lucide icons (since Lucide is definitely working).
// Actually, Lucide is included: <script src="https://unpkg.com/lucide@latest"></script>
// And the user's screenshot has a tiny '<' which looks exactly like lucide "chevron-left".
// Maybe FontAwesome isn't loading, so we use Lucide icons!
content = content.replace(/<i class="fa-solid fa-chevron-left"><\/i>/g, '<i data-lucide="chevron-left"></i>');
content = content.replace(/<i class="fa-solid fa-chevron-right"><\/i>/g, '<i data-lucide="chevron-right"></i>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Danca path and arrows!');
