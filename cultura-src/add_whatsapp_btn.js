const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const targetString = `<button type="submit" class="newsletter-btn">Cadastrar <i data-lucide="send"></i></button>
          </form>`;

const replacementString = `<button type="submit" class="newsletter-btn">Cadastrar <i data-lucide="send"></i></button>
          </form>

          <div class="whatsapp-group-container" style="margin-top: 25px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
            <p style="font-size: 0.95rem; margin-bottom: 12px; opacity: 0.9;">Ou receba as novidades pelo WhatsApp:</p>
            <a href="https://chat.whatsapp.com/LvbTMjtWSvC7PRTDzXOUx2" target="_blank" class="whatsapp-btn" style="display: flex; align-items: center; justify-content: center; gap: 10px; background-color: #25D366; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; transition: transform 0.3s ease, box-shadow 0.3s ease; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(37, 211, 102, 0.6)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(37, 211, 102, 0.4)';">
              <i data-lucide="message-circle"></i>
              Entrar no Grupo
            </a>
          </div>`;

if(content.includes(targetString)) {
    content = content.replace(targetString, replacementString);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('WhatsApp button added to the newsletter modal!');
} else {
    console.log('Target string not found in index.html!');
}
