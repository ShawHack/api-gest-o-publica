const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const blobsHTML = `
  <style>
    /* Animated Background Blobs */
    .hero-section {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    }
    .hero-section::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at top right, rgba(255, 113, 110, 0.05), transparent 50%),
                  radial-gradient(circle at bottom left, rgba(54, 75, 163, 0.05), transparent 50%);
      z-index: 0;
      pointer-events: none;
    }
    
    .blob-bg {
      position: absolute;
      filter: blur(80px);
      z-index: 0;
      opacity: 0.6;
      animation: float-blob 20s infinite ease-in-out alternate;
    }
    .blob-bg-1 {
      top: -10%;
      left: -10%;
      width: 500px;
      height: 500px;
      background: rgba(255, 113, 110, 0.15); /* Coral */
      animation-delay: 0s;
      border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
    }
    .blob-bg-2 {
      bottom: -20%;
      right: -10%;
      width: 600px;
      height: 600px;
      background: rgba(54, 75, 163, 0.12); /* Blue */
      animation-delay: -5s;
      border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
    }
    .blob-bg-3 {
      top: 40%;
      left: 40%;
      width: 400px;
      height: 400px;
      background: rgba(255, 181, 131, 0.15); /* Peach */
      animation-delay: -10s;
      border-radius: 50% 50% 30% 70% / 50% 40% 60% 50%;
    }
    
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
    
    .hero-container {
      position: relative;
      z-index: 1; /* Keep content above blobs */
    }
  </style>
  
  <div class="blob-bg blob-bg-1"></div>
  <div class="blob-bg blob-bg-2"></div>
  <div class="blob-bg blob-bg-3"></div>
`;

if (!content.includes('blob-bg')) {
    content = content.replace(/<main class="hero-section">/, `<main class="hero-section">\n${blobsHTML}`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Background blobs added to index.html!');
} else {
    console.log('Background blobs already exist.');
}
