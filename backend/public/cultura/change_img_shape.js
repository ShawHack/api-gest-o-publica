const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca', 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

const targetImg = `<img src="imagesemca/emca_fachada.png" alt="Fachada da EMCA" style="width: 100%; max-width: 480px; aspect-ratio: 1/1; object-fit: cover; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.15); border: 8px solid #fff;">`;

const newImg = `<img src="imagesemca/emca_fachada.png" alt="Fachada da EMCA" style="width: 100%; max-width: 480px; aspect-ratio: 1/1; object-fit: cover; border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; box-shadow: 0 15px 35px rgba(0,0,0,0.15); border: 8px solid #fff; transition: border-radius 0.5s ease-in-out;" onmouseover="this.style.borderRadius='60% 40% 30% 70% / 60% 30% 70% 40%'" onmouseout="this.style.borderRadius='40% 60% 70% 30% / 40% 50% 60% 50%'">`;

if(content.includes(targetImg)) {
    content = content.replace(targetImg, newImg);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Image shape changed to an organic blob!');
} else {
    console.log('Target image not found!');
}
