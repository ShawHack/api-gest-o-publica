# 📧 Como Adicionar o Endpoint de Email na API

## ❌ Problema Atual

O endpoint `/api/email/send` não existe na sua API, causando erro 404.

## ✅ Solução

Adicione o código do arquivo `API_EMAIL_ENDPOINT.js` na sua API Node.js.

## 📋 Passo a Passo

### Opção 1: Se você já tem um arquivo de rotas

1. Abra o arquivo de rotas (ex: `routes/email.js` ou `routes/index.js`)
2. Copie o código do `API_EMAIL_ENDPOINT.js`
3. Certifique-se de que o router está registrado no app principal:
   ```javascript
   const emailRoutes = require('./routes/email');
   app.use('/api', emailRoutes);
   ```

### Opção 2: Criar um novo arquivo de rotas

1. Crie `routes/email.js`:
   ```javascript
   const express = require('express');
   const router = express.Router();
   const nodemailer = require('nodemailer');
   
   // Código do transporter (copie de API_EMAIL_ENDPOINT.js)
   // ...
   
   router.post('/email/send', async (req, res) => {
     // Código do endpoint (copie de API_EMAIL_ENDPOINT.js)
     // ...
   });
   
   module.exports = router;
   ```

2. No seu `app.js` ou `server.js`, adicione:
   ```javascript
   const emailRoutes = require('./routes/email');
   app.use('/api', emailRoutes);
   ```

### Opção 3: Adicionar diretamente no app principal

Se você não usa rotas separadas, adicione diretamente no seu arquivo principal:

```javascript
const nodemailer = require('nodemailer');

// Código do transporter
let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'webmail.garca.sp.gov.br',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || false,
      auth: {
        user: process.env.SMTP_USER || 'cgp@garca.sp.gov.br',
        pass: process.env.SMTP_PASS || 'Semitec@!',
      },
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTH === 'true' || false,
        requireTLS: process.env.SMTP_REQUIRE_TLS === 'true' || false,
      },
    });
  }
  return transporter;
}

// Endpoint
app.post('/api/email/send', async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: to, subject, html'
      });
    }
    
    const mailTransporter = getTransporter();
    
    const mailOptions = {
      from: process.env.MAIL_FROM || 'Prefeitura M. de Garça <cgp@garca.sp.gov.br>',
      to: to,
      subject: subject,
      html: html,
    };
    
    const info = await mailTransporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado:', info.messageId);
    
    res.json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

## 🔍 Verificar se funcionou

1. Reinicie sua API
2. Teste o endpoint:
   ```bash
   curl -X POST https://api.garca.sp.gov.br/api/email/send \
     -H "Content-Type: application/json" \
     -d '{
       "to": "teste@email.com",
       "subject": "Teste",
       "html": "<p>Teste de email</p>"
     }'
   ```
3. Ou crie um agendamento no app Flutter e verifique os logs

## ✅ Variáveis de Ambiente

Suas variáveis de ambiente já estão configuradas:
- ✅ `SMTP_HOST=webmail.garca.sp.gov.br`
- ✅ `SMTP_PORT=587`
- ✅ `SMTP_USER=cgp@garca.sp.gov.br`
- ✅ `SMTP_PASS=Semitec@!`
- ✅ `MAIL_FROM=Prefeitura M. de Garça <cgp@garca.sp.gov.br>`
- ✅ `SMTP_SECURE=false`
- ✅ `SMTP_TLS_REJECT_UNAUTH=true`
- ✅ `SMTP_REQUIRE_TLS=true`

## 📝 Dependências

Certifique-se de que `nodemailer` está instalado:

```bash
npm install nodemailer
```

## 🎯 Pronto!

Depois de adicionar o endpoint, os emails serão enviados automaticamente quando:
- ✅ Um agendamento é criado
- ✅ Um agendamento é reagendado
- ✅ Um agendamento é cancelado

