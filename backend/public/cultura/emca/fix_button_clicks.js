const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'emca.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Ensure button icons are not clickable and inherit color properly
const cssFix = `

/* =========================================
   Button Fixes for Arrow Icons
========================================= */
.carousel-btn i, .carousel-btn svg {
    pointer-events: none; /* Prevents the SVG from capturing the click */
    stroke: currentColor; /* Ensures it always uses the button's text color */
}

/* Ensure the active state (when clicked) maintains the color and looks good */
.prev-btn-cursos:active, .next-btn-cursos:active,
.prev-btn-fotos:active, .next-btn-fotos:active,
.prev-btn-galeria:active, .next-btn-galeria:active {
    background: linear-gradient(135deg, var(--lavender), var(--coral)) !important;
    color: white !important;
    transform: translateY(-50%) scale(0.95) !important;
    box-shadow: 0 4px 12px rgba(116, 129, 209, 0.4) !important;
}

/* Fallback for basic carousel buttons */
.carousel-btn:active {
    background: rgba(255, 255, 255, 0.4) !important;
    transform: translateY(-50%) scale(0.95);
}
`;

cssContent += cssFix;
fs.writeFileSync(cssPath, cssContent, 'utf8');
console.log('CSS fixes applied for button active states and SVG pointer events');
