const fs = require('fs');

let content = fs.readFileSync('emca/emca.html', 'utf8');

// 1. Remove the navbar dropdown
const navDropdownRegex = /<div class="nav-item-dropdown">[\s\S]*?<a href="\.\/emca\.html#cursos" class="nav-link"[\s\S]*?Cursos.*?<i.*?<\/i><\/a>\s*<div class="dropdown-menu">[\s\S]*?<\/div>\s*<\/div>/;
const simpleNav = `<a href="./emca.html#cursos" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: 'Rubik', sans-serif; transition: color 0.3s;">Cursos</a>`;
content = content.replace(navDropdownRegex, simpleNav);

// 2. Change hero "Ver Mais" links to "#cursos"
content = content.replace(/href="cursos\/ballet\.html"/g, 'href="#cursos"');
content = content.replace(/href="cursos\/musica\.html"/g, 'href="#cursos"');
content = content.replace(/href="cursos\/circo\.html"/g, 'href="#cursos"');

// 3. Remove <a> wrappers around images/titles in "Cursos Oferecidos"
content = content.replace(/<a href="cursos\/[a-z]+\.html">\s*(<div class="curso-circle-img"[\s\S]*?<\/div>)\s*(<h3 class="curso-column-title">.*?<\/h3>)\s*<\/a>/g, '$1\n                                        $2');

// 4. Remove "Ver mais detalhes" buttons in "Cursos Oferecidos"
content = content.replace(/<a href="cursos\/[a-z]+\.html" class="btn-ver-mais">Ver mais detalhes<\/a>\s*/g, '');

fs.writeFileSync('emca/emca.html', content);
console.log('emca.html updated successfully.');
