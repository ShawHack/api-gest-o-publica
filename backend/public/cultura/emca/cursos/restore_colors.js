const fs = require('fs');
let content = fs.readFileSync('c:/Users/marjorie.talberg/Desktop/teatro/emca/cursos/danca.html', 'utf8');

// Reverse replacements
content = content.replace(/#1e293b/gi, '#a02e2e');
content = content.replace(/#7481d1/gi, '#ff716e');
content = content.replace(/#909ce0/gi, '#ff8e8c');
content = content.replace(/rgba\(116, 129, 209/gi, 'rgba(255, 113, 110');
content = content.replace(/#f1f5f9/gi, '#ffeef2');

// Fix specific original items
content = content.replace(/\.btn-lavender \{[\s\S]*?\}/g, (match) => {
    return match.replace(/#ff716e/gi, '#7481d1').replace(/#ff8e8c/gi, '#909ce0').replace(/rgba\(255, 113, 110/gi, 'rgba(116, 129, 209');
});
content = content.replace(/\.btn-lavender:hover \{[\s\S]*?\}/g, (match) => {
    return match.replace(/#ff716e/gi, '#7481d1').replace(/#ff8e8c/gi, '#909ce0').replace(/rgba\(255, 113, 110/gi, 'rgba(116, 129, 209');
});

content = content.replace(/\.modalidade-text-item\.item-lavender:hover \{ border-left-color: #[a-zA-Z0-9]+; \}/g, '.modalidade-text-item.item-lavender:hover { border-left-color: #7481d1; }');
content = content.replace(/\.icon-lavender \{ background-color: #[a-zA-Z0-9]+; \}/g, '.icon-lavender { background-color: #7481d1; }');
content = content.replace(/\.lightbox-nav:hover \{\s+background: #[a-zA-Z0-9]+;/g, '.lightbox-nav:hover {\n            background: #7481d1;');

// Fix original #1e293b
// header text
content = content.replace(/color: #a02e2e; letter-spacing: 2px;'>EMCA<\/span>/g, "color: #1e293b; letter-spacing: 2px;'>EMCA</span>");
content = content.replace(/color: #a02e2e; text-decoration: none; font-weight: 600; font-family: 'Rubik', sans-serif; transition: background 0\.3s;'>\s+<i data-lucide="map"><\/i> <span class="hide-mobile">Voltar ao <\/span>Mapa/g, "color: #1e293b; text-decoration: none; font-weight: 600; font-family: 'Rubik', sans-serif; transition: background 0.3s;'>\n          <i data-lucide=\"map\"></i> <span class=\"hide-mobile\">Voltar ao </span>Mapa");
content = content.replace(/color: #a02e2e; cursor: pointer; display: none;'>/g, "color: #1e293b; cursor: pointer; display: none;'>");

// A Trajetoria Niveis do Jazz
content = content.replace(/<h2 class="minimalist-title" style="font-family: 'Rubik', sans-serif !important; font-weight: 700 !important; font-size: 2\.5rem; color: #a02e2e; margin-bottom: 25px; line-height: 1\.2;">([\s\S]*?)A Trajetória([\s\S]*?)Níveis do Jazz/g, "<h2 class=\"minimalist-title\" style=\"font-family: 'Rubik', sans-serif !important; font-weight: 700 !important; font-size: 2.5rem; color: #1e293b; margin-bottom: 25px; line-height: 1.2;\">$1A Trajetória$2Níveis do Jazz");

// Galeria de Fotos
content = content.replace(/color: #a02e2e !important; margin-bottom: 15px; line-height: 1\.2;">Galeria de Fotos<\/h2>/g, 'color: #1e293b !important; margin-bottom: 15px; line-height: 1.2;">Galeria de Fotos</h2>');

// Footer original was #ff716e. I will change it to whatever they want, but first let's just make it NOT red, e.g. #1e293b.
content = content.replace(/\.biblio-footer \{\s+background: #ff716e;/g, '.biblio-footer {\n        background: #1e293b;');

fs.writeFileSync('c:/Users/marjorie.talberg/Desktop/teatro/emca/cursos/danca.html', content);
console.log('Reverse replaced successfully');
