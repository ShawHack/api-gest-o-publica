const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Extract the Impacto section
const impactoRegex = /(<!-- Impacto \/ Estatísticas -->[\s\S]*?<\/section>)/;
const match = content.match(impactoRegex);

if (match) {
    let impactoSection = match[1];

    // Remove it from the current position
    content = content.replace(impactoRegex, '');

    // Add counting classes and attributes
    impactoSection = impactoSection.replace(/>\+500<\/h3>/, '>+<span class="count-up" data-target="500">0</span></h3>');
    impactoSection = impactoSection.replace(/>5<\/h3>/, '><span class="count-up" data-target="5">0</span></h3>');
    impactoSection = impactoSection.replace(/>\+20<\/h3>/, '>+<span class="count-up" data-target="20">0</span></h3>');
    impactoSection = impactoSection.replace(/>20\+<\/h3>/, '><span class="count-up" data-target="20">0</span>+</h3>');

    // Remove the top border and add a subtle box shadow or something since it's now under the hero
    impactoSection = impactoSection.replace(/border-top: 1px solid #fce8df;/, 'box-shadow: 0 10px 30px rgba(0,0,0,0.05); position: relative; z-index: 10;');

    // Find the end of the Hero section.
    // It ends with:
    //                 <div class="carousel-indicators" style="display: none;">
    //                 </div>
    //             </div>
    //         </section>
    
    // So we can insert it right before "<!-- Cursos Oferecidos Section -->"
    const insertPoint = '<!-- Cursos Oferecidos Section -->';
    content = content.replace(insertPoint, impactoSection + '\n\n        ' + insertPoint);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Impacto section moved and prepared for counting!');
} else {
    console.log('Impacto section not found.');
}
