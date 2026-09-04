const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'museu', 'museu.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update the layout CSS
const oldMuseumContentCss = /\.museum-content {\s*max-width: 1200px;\s*margin: -100px auto 100px;\s*position: relative;\s*z-index: 20;\s*padding: 0 20px;\s*display: grid;\s*grid-template-columns: 2fr 1fr;\s*gap: 40px;\s*}/;
const newMuseumContentCss = `.museum-content {
      max-width: 1200px;
      margin: -100px auto 100px;
      position: relative;
      z-index: 20;
      padding: 0 20px;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }`;
content = content.replace(oldMuseumContentCss, newMuseumContentCss);

const oldInfoSidebarCss = /\.info-sidebar {\s*display: flex;\s*flex-direction: column;\s*gap: 20px;\s*}/;
const newInfoSidebarCss = `.info-sidebar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 30px;
      margin-top: 20px;
    }`;
content = content.replace(oldInfoSidebarCss, newInfoSidebarCss);

const oldMediaQuery = /@media \(max-width: 992px\) {\s*\.museum-content {\s*grid-template-columns: 1fr;\s*margin-top: 40px;\s*}/;
const newMediaQuery = `@media (max-width: 992px) {
      .museum-content {
        margin-top: 40px;
      }`;
content = content.replace(oldMediaQuery, newMediaQuery);

// 2. Adjust HTML if needed
// Actually, no HTML changes needed for the flex column layout! The aside will just stack below the main content naturally because of flex-direction: column.
// Wait, is there any specific alignment needed? The glass-card will take 100% width, which is fine, or we can center it.
// Let's verify if the flex direction handles it. Yes.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Museu layout updated: info cards moved to bottom!');
