/**
 * Endpoint de envio de emails para a API da Prefeitura de Garça
 * 
 * Adicione este código na sua API Node.js
 * 
 * Rota: POST /api/email/send
 * 
 * Body esperado:
 * {
 *   "to": "usuario@email.com",
 *   "subject": "Assunto do email",
 *   "html": "<p>Conteúdo HTML</p>"
 * }
 */

const nodemailer = require('nodemailer');

// Cria o transporter uma vez (reutilizável)
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

/**
 * Endpoint POST /api/email/send
 * 
 * Exemplo de uso no Express:
 * 
 * const express = require('express');
 * const router = express.Router();
 * 
 * router.post('/email/send', async (req, res) => {
 *   try {
 *     const { to, subject, html } = req.body;
 *     
 *     // Validação básica
 *     if (!to || !subject || !html) {
 *       return res.status(400).json({
 *         success: false,
 *         error: 'Campos obrigatórios: to, subject, html'
 *       });
 *     }
 *     
 *     const mailTransporter = getTransporter();
 *     
 *     const mailOptions = {
 *       from: process.env.MAIL_FROM || 'Prefeitura M. de Garça <cgp@garca.sp.gov.br>',
 *       to: to,
 *       subject: subject,
 *       html: html,
 *     };
 *     
 *     const info = await mailTransporter.sendMail(mailOptions);
 *     
 *     console.log('✅ Email enviado:', info.messageId);
 *     console.log('   Para:', to);
 *     console.log('   Assunto:', subject);
 *     
 *     res.json({
 *       success: true,
 *       messageId: info.messageId
 *     });
 *   } catch (error) {
 *     console.error('❌ Erro ao enviar email:', error);
 *     res.status(500).json({
 *       success: false,
 *       error: error.message
 *     });
 *   }
 * });
 * 
 * module.exports = router;
 */

// ============================================
// IMPLEMENTAÇÃO COMPLETA PARA EXPRESS
// ============================================

/**
 * Se você usa Express, adicione este código no seu arquivo de rotas
 * (ex: routes/email.js ou routes/index.js)
 */

const express = require('express');
const router = express.Router();

router.post('/email/send', async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    
    // Validação básica
    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: to, subject, html'
      });
    }
    
    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
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
    console.log('   Para:', to);
    console.log('   Assunto:', subject);
    
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

module.exports = router;

// ============================================
// COMO USAR NO APP PRINCIPAL
// ============================================
// 
// No seu app.js ou server.js:
// 
// const emailRoutes = require('./routes/email'); // ou o caminho correto
// app.use('/api', emailRoutes);
// 
// Isso criará o endpoint: POST /api/email/send
// ============================================

