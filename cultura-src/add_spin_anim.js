const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const newStyles = `
    @keyframes float-blob {
      0% {
        transform: translate(0, 0) rotate(0deg) scale(1);
      }
      33% {
        transform: translate(30px, -50px) rotate(10deg) scale(1.1);
      }
      66% {
        transform: translate(-20px, 20px) rotate(-5deg) scale(0.9);
      }
      100% {
        transform: translate(0, 0) rotate(0deg) scale(1);
      }
    }
    
    @keyframes spinEntrance {
      0% { 
        transform: rotate(-180deg) scale(0.2); 
        opacity: 0; 
      }
      60% {
        transform: rotate(10deg) scale(1.1);
        opacity: 1;
      }
      100% { 
        transform: rotate(0deg) scale(1); 
        opacity: 1; 
      }
    }
    
    .hero-title {
      animation: spinEntrance 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      display: inline-block;
      transform-origin: center center;
    }
`;

content = content.replace(/@keyframes float-blob \{[\s\S]*?100% \{\s*transform: translate\(0, 0\) rotate\(0deg\) scale\(1\);\s*\}\s*\}/, newStyles);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Added spinning animation to SECULT title!');
