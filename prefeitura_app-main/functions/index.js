// ============================================
// FIREBASE CLOUD FUNCTIONS - PROCESSAMENTO DE EMAILS
// ============================================
// 
// Este arquivo deve ser colocado na pasta 'functions' do seu projeto Firebase
// 
// Para configurar:
// 1. Instale as dependências: cd functions && npm install
// 2. Configure o sendMail (use o mesmo helper do seu backend)
// 3. Faça deploy: firebase deploy --only functions
//
// ============================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Importe sua função sendMail do backend
// Opção 1: Se você tem o helper disponível, copie a lógica aqui
// Opção 2: Use um serviço de email como nodemailer, sendgrid, etc.

// Exemplo com nodemailer (instale: npm install nodemailer)
const nodemailer = require('nodemailer');

// Configure o transporter usando as credenciais da Prefeitura de Garça
// Credenciais configuradas via: firebase functions:config:set
let transporter = null;

function getTransporter() {
  if (!transporter) {
    const functionsConfig = functions.config();
    transporter = nodemailer.createTransport({
      host: functionsConfig.smtp?.host || 'webmail.garca.sp.gov.br',
      port: parseInt(functionsConfig.smtp?.port || '587'),
      secure: functionsConfig.smtp?.secure === 'true' || false,
      auth: {
        user: functionsConfig.smtp?.user || 'cgp@garca.sp.gov.br',
        pass: functionsConfig.smtp?.pass,
      },
      tls: {
        rejectUnauthorized: false, // Para servidores com certificado auto-assinado
      },
    });
  }
  return transporter;
}

// Função para enviar email (mantida para compatibilidade, mas não é mais usada diretamente)
async function sendEmail({ to, subject, html }) {
  try {
    const mailTransporter = getTransporter();
    const functionsConfig = functions.config();
    
    const mailOptions = {
      from: functionsConfig.mail?.from || 'Prefeitura M. de Garça <cgp@garca.sp.gov.br>',
      to: to,
      subject: subject,
      html: html,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    console.log('Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
}

// ============================================
// CLOUD FUNCTION: Processa fila de emails
// ============================================
// Esta função é acionada quando um novo documento é adicionado em 'email_queue'

exports.processEmailQueue = functions.firestore
  .document('email_queue/{emailId}')
  .onCreate(async (snap, context) => {
    const emailData = snap.data();
    const emailId = context.params.emailId;

    // Ignora se não estiver pendente
    if (emailData.status !== 'pending') {
      console.log(`Email ${emailId} não está pendente, ignorando.`);
      return null;
    }

    try {
      // Atualiza status para "processing"
      await snap.ref.update({
        status: 'processing',
        lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
        attempts: admin.firestore.FieldValue.increment(1),
      });

      // Envia o email usando o transporter
      const mailTransporter = getTransporter();
      const functionsConfig = functions.config();
      
      const mailOptions = {
        from: functionsConfig.mail?.from || 'Prefeitura M. de Garça <cgp@garca.sp.gov.br>',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      };

      const info = await mailTransporter.sendMail(mailOptions);
      console.log('Email enviado:', info.messageId);

      // Marca como enviado
      await snap.ref.update({
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Email ${emailId} enviado com sucesso para ${emailData.to}`);
      return null;
    } catch (error) {
      console.error(`❌ Erro ao enviar email ${emailId}:`, error);

      // Marca como falha (após 3 tentativas, marca como failed permanentemente)
      const attempts = (emailData.attempts || 0) + 1;
      const status = attempts >= 3 ? 'failed' : 'pending';

      await snap.ref.update({
        status: status,
        lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
        attempts: attempts,
        error: error.message,
      });

      // Se ainda não atingiu 3 tentativas, agenda nova tentativa (opcional)
      if (attempts < 3) {
        // Pode usar Cloud Tasks ou simplesmente deixar para próxima execução manual
        console.log(`Email ${emailId} será tentado novamente (tentativa ${attempts}/3)`);
      }

      return null;
    }
  });

// ============================================
// CLOUD FUNCTION: Envia lembretes diários
// ============================================
// Esta função executa diariamente e envia lembretes 24h antes

exports.sendDailyReminders = functions.pubsub
  .schedule('0 9 * * *') // Executa todo dia às 9h
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const tomorrowStart = admin.firestore.Timestamp.fromDate(tomorrow);
    const tomorrowEnd = admin.firestore.Timestamp.fromDate(dayAfterTomorrow);

    try {
      // Busca agendamentos que são amanhã e ainda não receberam lembrete
      const appointmentsSnapshot = await db
        .collection('appointments')
        .where('date', '>=', tomorrowStart)
        .where('date', '<', tomorrowEnd)
        .where('status', '==', 'pending')
        .get();

      let sentCount = 0;

      for (const doc of appointmentsSnapshot.docs) {
        const appointment = doc.data();

        // Verifica se já recebeu lembrete
        if (appointment.reminderSent) {
          continue;
        }

        // Adiciona na fila de emails
        await db.collection('email_queue').add({
          type: 'reminder',
          to: appointment.userEmail,
          subject: `Lembrete: Seu agendamento é amanhã - Prefeitura Municipal de Garça`,
          html: `
            <p>Olá ${appointment.userName},</p>
            <p>Este é um lembrete de que você tem um agendamento amanhã:</p>
            <p><strong>📅 Data:</strong> ${formatDate(appointment.date.toDate())}<br>
            <strong>🕐 Horário:</strong> ${appointment.timeSlot}<br>
            ${appointment.serviceName ? `<strong>🏥 Serviço:</strong> ${appointment.serviceName}<br>` : ''}</p>
            <p>Por favor, compareça no horário agendado.</p>
            <p>Atenciosamente,<br>Prefeitura Municipal de Garça</p>
          `,
          status: 'pending',
          createdAt: now,
          attempts: 0,
        });

        // Marca como enviado
        await doc.ref.update({
          reminderSent: true,
          updatedAt: now,
        });

        sentCount++;
      }

      console.log(`✅ ${sentCount} lembretes adicionados na fila`);
      return null;
    } catch (error) {
      console.error('❌ Erro ao processar lembretes:', error);
      return null;
    }
  });

// Helper para formatar data
function formatDate(date) {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const day = days[date.getDay()];
  const dayNum = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${dayNum}/${month}/${year} (${day})`;
}

// ============================================
// CONFIGURAÇÃO - PREFEITURA DE GARÇA
// ============================================
//
// 1. Instale as dependências:
//    cd functions && npm install
//
// 2. Configure as credenciais (use o script):
//    Windows: configurar_email_garca.bat
//
//    Ou manualmente:
//    firebase functions:config:set smtp.host="webmail.garca.sp.gov.br"
//    firebase functions:config:set smtp.port="587"
//    firebase functions:config:set smtp.user="cgp@garca.sp.gov.br"
//    firebase functions:config:set smtp.pass="Semitec@!"
//    firebase functions:config:set smtp.secure="false"
//    firebase functions:config:set mail.from="Prefeitura M. de Garça <cgp@garca.sp.gov.br>"
//
// 3. Faça deploy:
//    firebase deploy --only functions
//
// ============================================

