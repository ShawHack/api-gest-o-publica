const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'teatro.html');
let content = fs.readFileSync(filePath, 'utf8');

// The issue is that the section from </style> (line 367) to </section> (line 441) was duplicated inside the <style> block or something similar.
// Actually, let's just find the index of the FIRST "</head>" and the LAST "</head>" ? No, there's only one </head> at line 445.
// Let's look for the body tag. There are TWO body tags! One at line 371 and one at 446.

const firstBodyIdx = content.indexOf('<body>');
const secondBodyIdx = content.indexOf('<body>', firstBodyIdx + 1);

if (secondBodyIdx !== -1) {
    // We have a duplicate.
    // The duplicate block starts somewhere around line 367 (</style>) and ends at 441 (</section>).
    // Actually, looking at the view:
    // 367: </style>
    // ...
    // 441:         </section>
    // 442: </style>
    // 443:   <script ...
    // 444:   <link ...
    // 445: </head>
    // 446: <body>
    
    // It seems the first </style> (at 367) is a stray closing tag that shouldn't be there, 
    // OR the second </style> (at 442) is the real one, and the stuff between 367 and 441 is garbage.
    // Wait, the stuff between 367 and 441 is the actual Navbar and Hero! 
    // If the stuff between 367 and 441 is the Navbar and Hero, then the stuff AFTER line 446 is ALSO the Navbar and Hero!
    
    // Let's just find the first "<style>" tag and the REAL "</style>" tag.
    // We can just construct the file from scratch up to the <main> tag to be safe, but let's just remove the duplicate parts.
    
    // Let's use regex to remove everything from the FIRST `</style>` that is immediately followed by `<script src="https://unpkg.com/lucide@latest"></script>` 
    // Wait! The real `</style>` is at 442, which is followed by the `<script>` tag.
    // So the text from `</style>` at line 367 to `        </section>\n</style>` at 441-442 is the duplication.
    // Actually, I will just extract the `newCss` block, and the `body` block, and reconstruct it.
    
    const cssStart = content.indexOf('<style>');
    const headEnd = content.lastIndexOf('</head>');
    
    // The safest way is to find the LAST <body> and use everything from there down.
    const lastBodyIdx = content.lastIndexOf('<body>');
    const bodyContent = content.substring(lastBodyIdx);
    
    // And for the head, take everything from 0 to `<style>`, then insert the CSS, then `</style><script...></head>`
    const beforeStyle = content.substring(0, cssStart + 7);
    
    // Let's extract the CSS rules from the file, we know it's the Teatro theme.
    // The Teatro theme CSS starts with `/* New Styles for Teatro (Theater Theme) */`
    const themeCssStart = content.indexOf('/* New Styles for Teatro (Theater Theme) */');
    const mediaQueryEnd = content.indexOf('padding: 30px 15px; }', themeCssStart) + 21;
    // We add the closing brace for the media query
    const closingBraces = '\n        }\n';
    
    const cleanCss = content.substring(themeCssStart, mediaQueryEnd) + closingBraces;
    
    // The scripts and links
    const scriptsAndLinks = `
  <script src="https://unpkg.com/lucide@latest"></script>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap" rel="stylesheet">
</head>
`;

    const newContent = beforeStyle + '\n' + cleanCss + '</style>\n' + scriptsAndLinks + bodyContent;
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Fixed duplication!');
} else {
    console.log('No duplication found.');
}
