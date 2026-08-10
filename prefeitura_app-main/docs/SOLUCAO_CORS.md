# 🚨 Solução para Erro de CORS

## O que é CORS?

**CORS (Cross-Origin Resource Sharing)** é uma política de segurança dos navegadores que bloqueia requisições HTTP de um domínio para outro domínio diferente.

### Exemplo do Problema:

```
Aplicativo Web (localhost:XXXX ou file://)
        ↓ Tenta fazer requisição
API (https://api.garca.sp.gov.br)
        ↓ Bloqueia por CORS
❌ ERRO: "CORS bloqueado"
```

## Por que acontece?

Quando você executa o app Flutter na **versão web** (navegador), ele tenta fazer requisições para `https://api.garca.sp.gov.br/api/users/login`, mas o servidor **não está configurado para aceitar requisições de outros domínios**.

### Versões Afetadas:

- ✅ **Mobile (Android/iOS)**: NÃO tem problema de CORS
- ❌ **Web (Chrome/Firefox/etc)**: TEM problema de CORS

## Soluções

### 1️⃣ **Solução Recomendada: Use o Aplicativo Mobile**

O CORS é uma restrição **apenas do navegador**. No mobile não existe esse problema.

```bash
# Execute no Android
flutter run

# Execute no iOS
flutter run -d ios
```

**Vantagens:**
- ✅ Funciona imediatamente
- ✅ Sem necessidade de configuração no servidor
- ✅ Melhor experiência do usuário

---

### 2️⃣ **Solução para Servidor: Configurar CORS na API**

Se você tem acesso ao servidor da API, configure os headers CORS:

#### Backend Node.js/Express:

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['http://localhost:XXXX', 'https://seu-dominio.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
```

#### Backend com Nginx:

```nginx
location /api {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, Accept';
    add_header 'Access-Control-Allow-Credentials' 'true';
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
    
    proxy_pass http://backend;
}
```

#### Backend Python/Flask:

```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=['http://localhost:XXXX', 'https://seu-dominio.com'])
```

---

### 3️⃣ **Solução Temporária: Proxy Local**

Crie um proxy local que redireciona as requisições:

#### Usando Node.js:

```javascript
// proxy.js
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());

app.use('/api', createProxyMiddleware({
  target: 'https://api.garca.sp.gov.br',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  }
}));

app.listen(3000, () => {
  console.log('Proxy rodando em http://localhost:3000');
});
```

Execute:
```bash
npm install express cors http-proxy-middleware
node proxy.js
```

Depois, altere a URL da API no código:
```dart
// lib/services/auth_service.dart
static const String kApiBase = 'http://localhost:3000/api';
```

---

### 4️⃣ **Solução para Desenvolvimento: Desabilitar CORS no Chrome**

⚠️ **ATENÇÃO: Use apenas para desenvolvimento! Nunca em produção!**

#### Windows:
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir="C:\chrome-dev-session"
```

#### macOS:
```bash
open -n -a /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --args --user-data-dir="/tmp/chrome_dev_test" --disable-web-security
```

#### Linux:
```bash
google-chrome --disable-web-security --user-data-dir="/tmp/chrome_dev_test"
```

---

### 5️⃣ **Solução para Produção: Deploy da Web em Mesmo Domínio**

Se você fizer deploy da versão web no **mesmo domínio** da API, não haverá problema de CORS:

```
https://api.garca.sp.gov.br/api     ← API
https://api.garca.sp.gov.br/app     ← App Web
```

Ambos estão no mesmo domínio (`api.garca.sp.gov.br`), então não há CORS.

---

## Como Testar se CORS está Funcionando

### Teste 1: Via curl (não tem CORS)
```bash
curl -X POST https://api.garca.sp.gov.br/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","password":"senha123"}'
```

Se retornar JSON (mesmo que erro 422), a API está funcionando.

### Teste 2: Via navegador (tem CORS)
Abra o console do navegador (F12) e execute:
```javascript
fetch('https://api.garca.sp.gov.br/api/users/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'teste@teste.com', password: 'senha123'})
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Se der erro de CORS, o servidor precisa ser configurado.

---

## Resumo

| Solução | Dificuldade | Recomendado | Observações |
|---------|-------------|-------------|-------------|
| **1. Usar Mobile** | ⭐ Fácil | ✅ SIM | Melhor opção |
| **2. Configurar CORS no Servidor** | ⭐⭐⭐ Difícil | ✅ SIM | Solução definitiva |
| **3. Proxy Local** | ⭐⭐ Médio | ⚠️ Apenas dev | Temporário |
| **4. Desabilitar CORS** | ⭐ Fácil | ❌ NÃO | Inseguro |
| **5. Deploy Mesmo Domínio** | ⭐⭐⭐ Difícil | ✅ SIM | Para produção |

---

## Contato com Administrador

Se você não tem acesso ao servidor, entre em contato com o administrador e envie esta mensagem:

```
Olá,

Estou desenvolvendo um aplicativo Flutter que consome a API em:
https://api.garca.sp.gov.br/api

Para que a versão web funcione, preciso que os seguintes headers CORS sejam configurados:

Access-Control-Allow-Origin: * (ou domínios específicos)
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Accept
Access-Control-Allow-Credentials: true

Endpoints afetados:
- POST /api/users/login
- POST /api/users/resend-verification
- POST /api/users/forgot-password
- GET /api/users/checkuser

Obrigado!
```

---

## Mais Informações

- [MDN: CORS](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/CORS)
- [Enable CORS](https://enable-cors.org/)
- [Flutter Web CORS](https://docs.flutter.dev/platform-integration/web/faq#how-do-i-configure-cors)

