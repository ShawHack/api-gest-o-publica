function formatWhen(date) {
  return new Date(date).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildVoucherEmail({ name, serviceName, unitName, address, startsAt, endsAt, protocol, panelTicket }) {
  const when = formatWhen(startsAt)
  const until = new Date(endsAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  const subject = `Comprovante de Agendamento — ${protocol}`
  const text = [
    `Olá, ${name || 'Cidadão'}.`,
    '',
    'Seu agendamento na Agenda Garça está CONFIRMADO.',
    `Protocolo: ${protocol}`,
    panelTicket ? `Senha no painel da TV: ${panelTicket}` : '',
    `Serviço: ${serviceName}`,
    `Local: ${unitName}${address ? ` — ${address}` : ''}`,
    `Data e Horário: ${when} até ${until}`,
    '',
    panelTicket
      ? `No dia do atendimento, aguarde a chamada da senha ${panelTicket} no painel da recepção.`
      : 'Guarde este comprovante. Chegue com 10 minutos de antecedência portando documento oficial com foto.',
    'Prefeitura Municipal de Garça — SEMIT',
  ].filter(Boolean).join('\n')

  const html = `
    <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:580px;margin:0 auto;color:#0f172a;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
      <div style="background:linear-gradient(135deg,#0b5fff,#1e40af);padding:24px 28px;color:#ffffff">
        <h1 style="font-size:22px;margin:0;font-weight:700">Prefeitura Municipal de Garça</h1>
        <p style="margin:4px 0 0;font-size:14px;opacity:0.9">Comprovante Oficial de Agendamento</p>
      </div>
      <div style="padding:28px">
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center">
          <span style="font-size:18px;margin-right:8px">✅</span>
          <strong style="color:#065f46;font-size:15px">Atendimento Confirmado com Sucesso</strong>
        </div>
        <p style="font-size:15px;margin:0 0 16px">Olá, <strong>${escapeHtml(name || 'Cidadão')}</strong>,</p>
        <p style="font-size:14px;color:#475569;margin:0 0 20px">Seu atendimento foi agendado. Confira as informações abaixo:</p>
        
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:24px">
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600;width:35%">Protocolo</td>
            <td style="padding:10px 0;color:#0f172a;font-weight:700;font-size:15px"><code style="background:#f1f5f9;padding:3px 8px;border-radius:4px;color:#0b5fff">${escapeHtml(protocol)}</code></td>
          </tr>
          ${panelTicket ? `
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600">Senha no Painel</td>
            <td style="padding:10px 0"><code style="background:#eff6ff;padding:6px 12px;border-radius:6px;color:#1d4ed8;font-size:22px;font-weight:800;letter-spacing:.06em">${escapeHtml(panelTicket)}</code></td>
          </tr>` : ''}
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600">Serviço</td>
            <td style="padding:10px 0;color:#0f172a;font-weight:600">${escapeHtml(serviceName)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600">Local / Unidade</td>
            <td style="padding:10px 0;color:#0f172a">${escapeHtml(unitName)}${address ? `<br><small style="color:#64748b">${escapeHtml(address)}</small>` : ''}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600">Quando</td>
            <td style="padding:10px 0;color:#0f172a;font-weight:700;color:#1e3a8a">${escapeHtml(when)} às ${escapeHtml(until)}</td>
          </tr>
        </table>

        <div style="background:#f8fafc;border-left:4px solid #0b5fff;padding:12px 16px;border-radius:4px;margin-bottom:24px">
          <strong style="color:#1e293b;font-size:13px;display:block;margin-bottom:4px">📌 Instruções importantes:</strong>
          <ul style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:1.5">
            <li>Compareça com 10 minutos de antecedência.</li>
            <li>Apresente este protocolo e documento oficial com foto.</li>
            ${panelTicket ? `<li>No painel da TV da recepção, aguarde a chamada da senha <strong>${escapeHtml(panelTicket)}</strong>.</li>` : ''}
            <li>Caso precise reagendar ou cancelar, acesse a Agenda com antecedência.</li>
          </ul>
        </div>
      </div>
      <div style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
        Prefeitura Municipal de Garça — SEMIT · Secretaria Municipal de Informação e Tecnologia
      </div>
    </div>
  `
  return { subject, text, html }
}

function buildVoucherWhatsAppMessage({ name, serviceName, unitName, address, startsAt, endsAt, protocol, panelTicket }) {
  const when = formatWhen(startsAt)
  const until = new Date(endsAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

  const lines = [
    '🏛️ *PREFEITURA MUNICIPAL DE GARÇA*',
    '*Comprovante Oficial de Agendamento*',
    '',
    '✅ *Atendimento Confirmado com Sucesso!*',
    '',
    `Olá, *${name || 'Cidadão'}*!`,
    'Seu agendamento na *Agenda Garça* foi registrado com sucesso. Confira os detalhes:',
    '',
    `📌 *Protocolo:* ${protocol}`,
  ]

  if (panelTicket) {
    lines.push(`🎟️ *Senha no Painel:* *${panelTicket}*`)
  }

  lines.push(
    `📋 *Serviço:* ${serviceName || 'Atendimento Geral'}`,
    `📍 *Local:* ${unitName || 'Unidade de Atendimento'}${address ? ` — _${address}_` : ''}`,
    `📅 *Data e Horário:* ${when} às ${until}`,
    '',
    '📌 *Instruções importantes:*',
    '• Compareça com 10 minutos de antecedência.',
    '• Apresente este protocolo e documento oficial com foto.'
  )

  if (panelTicket) {
    lines.push(`• No painel da recepção, acompanhe a chamada da sua senha *${panelTicket}*.`)
  }

  lines.push(
    '• Caso precise reagendar ou cancelar, acesse a Agenda Garça com antecedência.',
    '',
    '_SEMIT · Secretaria Municipal de Informação e Tecnologia_'
  )

  return lines.join('\n')
}

function buildRescheduledEmail({ name, serviceName, unitName, address, startsAt, endsAt, previousStartsAt, protocol }) {
  const when = formatWhen(startsAt)
  const until = new Date(endsAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  const prev = previousStartsAt ? formatWhen(previousStartsAt) : null
  const subject = `Reagendamento Confirmado — ${protocol}`
  const text = [
    `Olá, ${name || 'Cidadão'}.`,
    '',
    'Seu atendimento na Agenda Garça foi REAGENDADO com sucesso.',
    `Protocolo: ${protocol}`,
    `Serviço: ${serviceName}`,
    `Local: ${unitName}${address ? ` — ${address}` : ''}`,
    `Novo Horário: ${when} até ${until}`,
    prev ? `Horário Anterior: ${prev}` : '',
    '',
    'O horário anterior foi liberado e seu novo horário já está garantido.',
    'Prefeitura Municipal de Garça — SEMIT',
  ].filter(Boolean).join('\n')

  const html = `
    <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:580px;margin:0 auto;color:#0f172a;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
      <div style="background:linear-gradient(135deg,#0284c7,#0369a1);padding:24px 28px;color:#ffffff">
        <h1 style="font-size:22px;margin:0;font-weight:700">Prefeitura Municipal de Garça</h1>
        <p style="margin:4px 0 0;font-size:14px;opacity:0.9">Comprovante de Reagendamento</p>
      </div>
      <div style="padding:28px">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center">
          <span style="font-size:18px;margin-right:8px">🔄</span>
          <strong style="color:#1e40af;font-size:15px">Atendimento Reagendado com Sucesso</strong>
        </div>
        <p style="font-size:15px;margin:0 0 16px">Olá, <strong>${escapeHtml(name || 'Cidadão')}</strong>,</p>
        <p style="font-size:14px;color:#475569;margin:0 0 20px">Seu agendamento foi alterado para uma nova data. Confira os detalhes atualizados:</p>
        
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:24px">
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600;width:35%">Protocolo</td>
            <td style="padding:10px 0;color:#0f172a;font-weight:700;font-size:15px"><code style="background:#f1f5f9;padding:3px 8px;border-radius:4px;color:#0284c7">${escapeHtml(protocol)}</code></td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600">Serviço</td>
            <td style="padding:10px 0;color:#0f172a;font-weight:600">${escapeHtml(serviceName)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600">Local / Unidade</td>
            <td style="padding:10px 0;color:#0f172a">${escapeHtml(unitName)}${address ? `<br><small style="color:#64748b">${escapeHtml(address)}</small>` : ''}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600">NOVO Horário</td>
            <td style="padding:10px 0;color:#047857;font-weight:700;font-size:15px">📅 ${escapeHtml(when)} às ${escapeHtml(until)}</td>
          </tr>
          ${prev ? `
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#94a3b8;font-weight:600">Horário Anterior</td>
            <td style="padding:10px 0;color:#94a3b8;text-decoration:line-through">${escapeHtml(prev)}</td>
          </tr>` : ''}
        </table>

        <div style="background:#f8fafc;border-left:4px solid #0284c7;padding:12px 16px;border-radius:4px;margin-bottom:24px">
          <strong style="color:#1e293b;font-size:13px;display:block;margin-bottom:4px">📌 Importante:</strong>
          <p style="margin:0;color:#475569;font-size:13px;line-height:1.5">
            O horário anterior foi liberado para outros cidadãos. Compareça no novo horário com documento com foto e este protocolo.
          </p>
        </div>
      </div>
      <div style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
        Prefeitura Municipal de Garça — SEMIT · Secretaria Municipal de Informação e Tecnologia
      </div>
    </div>
  `
  return { subject, text, html }
}

function buildRescheduledWhatsAppMessage({ name, serviceName, unitName, address, startsAt, endsAt, previousStartsAt, protocol }) {
  const when = formatWhen(startsAt)
  const until = new Date(endsAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  const prev = previousStartsAt ? formatWhen(previousStartsAt) : null

  const lines = [
    '🏛️ *PREFEITURA MUNICIPAL DE GARÇA*',
    '*Comprovante de Reagendamento*',
    '',
    '🔄 *Atendimento Reagendado com Sucesso!*',
    '',
    `Olá, *${name || 'Cidadão'}*!`,
    'Seu atendimento na *Agenda Garça* foi alterado para uma nova data. Confira os dados atualizados:',
    '',
    `📌 *Protocolo:* ${protocol}`,
    `📋 *Serviço:* ${serviceName || 'Atendimento Geral'}`,
    `📍 *Local:* ${unitName || 'Unidade de Atendimento'}${address ? ` — _${address}_` : ''}`,
    `📅 *NOVO Horário:* ${when} às ${until}`,
  ]

  if (prev) {
    lines.push(`🕒 *Horário Anterior:* ~${prev}~`)
  }

  lines.push(
    '',
    '📌 *Importante:*',
    '• O horário anterior foi liberado para outros cidadãos.',
    '• Compareça no novo horário com documento com foto e este protocolo.',
    '',
    '_SEMIT · Secretaria Municipal de Informação e Tecnologia_'
  )

  return lines.join('\n')
}

function buildCancellationEmail({ name, serviceName, unitName, address, startsAt, protocol, reason }) {
  const when = formatWhen(startsAt)
  const subject = `Agendamento Cancelado — ${protocol}`
  const text = [
    `Olá, ${name || 'Cidadão'}.`,
    '',
    'Informamos que o seu atendimento na Agenda Garça foi CANCELADO.',
    `Protocolo: ${protocol}`,
    `Serviço: ${serviceName}`,
    `Local: ${unitName}${address ? ` — ${address}` : ''}`,
    `Data do Agendamento: ${when}`,
    reason ? `Motivo: ${reason}` : '',
    '',
    'Caso deseje um novo atendimento, basta acessar novamente o portal de agendamentos e escolher um novo horário.',
    'Prefeitura Municipal de Garça — SEMIT',
  ].filter(Boolean).join('\n')

  const html = `
    <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:580px;margin:0 auto;color:#0f172a;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
      <div style="background:linear-gradient(135deg,#e11d48,#be123c);padding:24px 28px;color:#ffffff">
        <h1 style="font-size:22px;margin:0;font-weight:700">Prefeitura Municipal de Garça</h1>
        <p style="margin:4px 0 0;font-size:14px;opacity:0.9">Aviso de Cancelamento</p>
      </div>
      <div style="padding:28px">
        <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center">
          <span style="font-size:18px;margin-right:8px">❌</span>
          <strong style="color:#9f1239;font-size:15px">Agendamento Cancelado</strong>
        </div>
        <p style="font-size:15px;margin:0 0 16px">Olá, <strong>${escapeHtml(name || 'Cidadão')}</strong>,</p>
        <p style="font-size:14px;color:#475569;margin:0 0 20px">Informamos que o seguinte agendamento foi cancelado:</p>
        
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:24px">
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600;width:35%">Protocolo</td>
            <td style="padding:10px 0;color:#0f172a;font-weight:700;font-size:15px"><code style="background:#f1f5f9;padding:3px 8px;border-radius:4px;color:#e11d48">${escapeHtml(protocol)}</code></td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600">Serviço</td>
            <td style="padding:10px 0;color:#0f172a;font-weight:600">${escapeHtml(serviceName)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600">Local</td>
            <td style="padding:10px 0;color:#0f172a">${escapeHtml(unitName)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600">Horário Cancelado</td>
            <td style="padding:10px 0;color:#e11d48;font-weight:600">${escapeHtml(when)}</td>
          </tr>
          ${reason ? `
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#64748b;font-weight:600">Motivo</td>
            <td style="padding:10px 0;color:#475569">${escapeHtml(reason)}</td>
          </tr>` : ''}
        </table>

        <div style="background:#f8fafc;border-left:4px solid #64748b;padding:12px 16px;border-radius:4px;margin-bottom:24px">
          <p style="margin:0;color:#475569;font-size:13px;line-height:1.5">
            Caso deseje realizar um novo agendamento, você pode acessar a qualquer momento o portal da <b>Agenda Garça</b> e selecionar um novo dia e horário de sua preferência.
          </p>
        </div>
      </div>
      <div style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
        Prefeitura Municipal de Garça — SEMIT · Secretaria Municipal de Informação e Tecnologia
      </div>
    </div>
  `
  return { subject, text, html }
}

function buildCancellationWhatsAppMessage({ name, serviceName, unitName, address, startsAt, protocol, reason }) {
  const when = formatWhen(startsAt)

  const lines = [
    '🏛️ *PREFEITURA MUNICIPAL DE GARÇA*',
    '*Aviso de Cancelamento de Agendamento*',
    '',
    '❌ *Agendamento Cancelado*',
    '',
    `Olá, *${name || 'Cidadão'}*!`,
    'Informamos que o seguinte agendamento na *Agenda Garça* foi cancelado:',
    '',
    `📌 *Protocolo:* ${protocol}`,
    `📋 *Serviço:* ${serviceName || 'Atendimento Geral'}`,
    `📍 *Local:* ${unitName || 'Unidade de Atendimento'}${address ? ` — _${address}_` : ''}`,
    `🕒 *Data do Agendamento:* ${when}`,
  ]

  if (reason) {
    lines.push(`📝 *Motivo:* ${reason}`)
  }

  lines.push(
    '',
    'ℹ️ Caso deseje realizar um novo agendamento, acesse o portal da *Agenda Garça* e selecione uma nova data e horário de sua preferência.',
    '',
    '_SEMIT · Secretaria Municipal de Informação e Tecnologia_'
  )

  return lines.join('\n')
}

function getSendMailFn() {
  try {
    const { sendMailDirect, sendMail } = require('./mailer')
    return sendMailDirect || sendMail
  } catch {
    return null
  }
}

function getNotifyWhatsappFn() {
  try {
    const { notifyWhatsapp } = require('./whatsapp-notifier')
    return notifyWhatsapp
  } catch {
    return null
  }
}

function sendAgendaVoucher(payload) {
  const to = payload?.to
  const phone = payload?.phone
  if (!to && !phone) return Promise.resolve({ ignored: true })

  const promises = []

  if (to) {
    const sendMail = getSendMailFn()
    if (sendMail) {
      const message = buildVoucherEmail(payload)
      promises.push(
        sendMail({ to, subject: message.subject, html: message.html, text: message.text }).catch((error) => {
          console.error('[sendAgendaVoucher] Falha ao enviar voucher por e-mail para', to, error?.message)
          return { error: true, channel: 'email', message: error?.message }
        })
      )
    }
  }

  if (phone) {
    const notifyWhatsapp = getNotifyWhatsappFn()
    if (notifyWhatsapp) {
      const messageText = buildVoucherWhatsAppMessage(payload)
      promises.push(
        notifyWhatsapp({ phone, message: messageText, module: 'agenda_voucher' }).catch((error) => {
          console.error('[sendAgendaVoucher] Falha ao enviar voucher por WhatsApp para', phone, error?.message)
          return { error: true, channel: 'whatsapp', message: error?.message }
        })
      )
    }
  }

  return Promise.allSettled(promises)
}

function sendAgendaReschedule(payload) {
  const to = payload?.to
  const phone = payload?.phone
  if (!to && !phone) return Promise.resolve({ ignored: true })

  const promises = []

  if (to) {
    const sendMail = getSendMailFn()
    if (sendMail) {
      const message = buildRescheduledEmail(payload)
      promises.push(
        sendMail({ to, subject: message.subject, html: message.html, text: message.text }).catch((error) => {
          console.error('[sendAgendaReschedule] Falha ao enviar reagendamento por e-mail para', to, error?.message)
          return { error: true, channel: 'email', message: error?.message }
        })
      )
    }
  }

  if (phone) {
    const notifyWhatsapp = getNotifyWhatsappFn()
    if (notifyWhatsapp) {
      const messageText = buildRescheduledWhatsAppMessage(payload)
      promises.push(
        notifyWhatsapp({ phone, message: messageText, module: 'agenda_reschedule' }).catch((error) => {
          console.error('[sendAgendaReschedule] Falha ao enviar reagendamento por WhatsApp para', phone, error?.message)
          return { error: true, channel: 'whatsapp', message: error?.message }
        })
      )
    }
  }

  return Promise.allSettled(promises)
}

function sendAgendaCancellation(payload) {
  const to = payload?.to
  const phone = payload?.phone
  if (!to && !phone) return Promise.resolve({ ignored: true })

  const promises = []

  if (to) {
    const sendMail = getSendMailFn()
    if (sendMail) {
      const message = buildCancellationEmail(payload)
      promises.push(
        sendMail({ to, subject: message.subject, html: message.html, text: message.text }).catch((error) => {
          console.error('[sendAgendaCancellation] Falha ao enviar cancelamento por e-mail para', to, error?.message)
          return { error: true, channel: 'email', message: error?.message }
        })
      )
    }
  }

  if (phone) {
    const notifyWhatsapp = getNotifyWhatsappFn()
    if (notifyWhatsapp) {
      const messageText = buildCancellationWhatsAppMessage(payload)
      promises.push(
        notifyWhatsapp({ phone, message: messageText, module: 'agenda_cancellation' }).catch((error) => {
          console.error('[sendAgendaCancellation] Falha ao enviar cancelamento por WhatsApp para', phone, error?.message)
          return { error: true, channel: 'whatsapp', message: error?.message }
        })
      )
    }
  }

  return Promise.allSettled(promises)
}

module.exports = {
  buildVoucherEmail,
  buildVoucherWhatsAppMessage,
  buildRescheduledEmail,
  buildRescheduledWhatsAppMessage,
  buildCancellationEmail,
  buildCancellationWhatsAppMessage,
  sendAgendaVoucher,
  sendAgendaReschedule,
  sendAgendaCancellation,
}
