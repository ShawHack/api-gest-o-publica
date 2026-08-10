const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'login.html');
let content = fs.readFileSync(filePath, 'utf8');

const targetCSS = `    body {
      background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-main);
      overflow-x: hidden;
    }
    .auth-container {
      width: 100%;
      max-width: 1100px;
      min-height: 650px;
      display: flex;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 28px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.1);
      overflow: hidden;
      margin: 20px;
    }
    .auth-image {
      flex: 1;
      background: linear-gradient(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.15)), url('modal_banner.png');
      background-size: cover;
      background-position: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 40px;
      color: white;
      text-align: center;
      position: relative;
    }
    .auth-image h2 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 10px;
    }
    .auth-image p {
      font-size: 1.1rem;
      opacity: 0.9;
    }
    .auth-form-wrapper {
      flex: 1;
      padding: 60px 50px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }`;

const newCSS = `    body {
      background: #ffffff;
      min-height: 100vh;
      display: flex;
      margin: 0;
      color: var(--text-main);
      overflow-x: hidden;
    }
    .auth-container {
      width: 100%;
      max-width: 100%;
      min-height: 100vh;
      display: flex;
      background: #ffffff;
      border-radius: 0;
      box-shadow: none;
      margin: 0;
    }
    .auth-image {
      flex: 1.2;
      background: linear-gradient(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.15)), url('modal_banner.png');
      background-size: cover;
      background-position: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 40px;
      color: white;
      text-align: center;
      position: relative;
    }
    .auth-image h2 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 10px;
    }
    .auth-image p {
      font-size: 1.1rem;
      opacity: 0.9;
    }
    .auth-form-wrapper {
      flex: 1;
      padding: 60px 8%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      max-width: 700px;
    }`;

if(content.includes(targetCSS)) {
    content = content.replace(targetCSS, newCSS);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Login layout changed to full screen split!');
} else {
    console.log('Target CSS block not found!');
}
