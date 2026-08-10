const {
  notifyReporterStatusChange,
  notifyReporterCreated,
  buildReceivedMessage,
  buildResolvedMessage,
} = require('../../helpers/iluminacao-notifier')
const { isAllowedStatus, statusLabel, normalizeStatus } = require('../../helpers/iluminacao-constants')

jest.mock('../../helpers/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
}))

jest.mock('../../helpers/whatsapp-notifier', () => ({
  notifyWhatsapp: jest.fn().mockResolvedValue({ ok: true, queued: false }),
  notifyWhatsappMedia: jest.fn().mockResolvedValue({ ok: true, queued: false }),
}))

const { sendMail } = require('../../helpers/mailer')
const { notifyWhatsapp, notifyWhatsappMedia } = require('../../helpers/whatsapp-notifier')

describe('iluminacao-constants', () => {
  it('aceita status novos e legados', () => {
    expect(isAllowedStatus('pending')).toBe(true)
    expect(isAllowedStatus('en_route')).toBe(true)
    expect(isAllowedStatus('foo')).toBe(false)
    expect(normalizeStatus('pending')).toBe('received')
    expect(statusLabel('assigned')).toMatch(/equipe/i)
  })
})

describe('iluminacao-notifier', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ILUMINACAO_WHATSAPP_ENABLED = 'true'
  })

  it('envia e-mail quando status muda e há e-mail válido', async () => {
    const result = await notifyReporterStatusChange({
      reportId: 'abc123',
      previousStatus: 'pending',
      newStatus: 'assigned',
      reporterEmail: 'cidadao@example.com',
      reporterName: 'João',
      poleId: '127',
      problemType: 'queimada',
      notifyByWhatsapp: false,
    })

    expect(result.email.sent).toBe(true)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'cidadao@example.com',
        subject: expect.stringContaining('Encaminhada'),
      }),
    )
  })

  it('ignora quando e-mail inválido', async () => {
    const result = await notifyReporterStatusChange({
      reportId: 'abc123',
      previousStatus: 'pending',
      newStatus: 'assigned',
      reporterEmail: 'invalido',
      poleId: '127',
      notifyByWhatsapp: false,
    })

    expect(result.email.skipped).toBe(true)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('ignora quando status não mudou', async () => {
    const result = await notifyReporterStatusChange({
      reportId: 'abc123',
      previousStatus: 'pending',
      newStatus: 'pending',
      reporterEmail: 'cidadao@example.com',
    })

    expect(result.skipped).toBe(true)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('envia WhatsApp com banner na criação', async () => {
    const result = await notifyReporterCreated({
      reportId: 'rep1',
      protocol: 'ILU-1',
      reporterName: 'Maria',
      reporterPhone: '14982170294',
      poleId: '42',
      address: 'Rua A',
      notifyByEmail: false,
      notifyByWhatsapp: true,
    })

    expect(notifyWhatsappMedia).toHaveBeenCalled()
    expect(notifyWhatsapp).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '14982170294',
        message: expect.stringContaining('ILU-1'),
        module: 'iluminacao',
      }),
    )
    expect(result.whatsapp.sent).toBe(true)
  })

  it('usa template de conclusão quando status é resolved', async () => {
    await notifyReporterStatusChange({
      reportId: 'rep2',
      previousStatus: 'in_progress',
      newStatus: 'resolved',
      reporterPhone: '5514982170294',
      reporterName: 'Ana',
      poleId: '9',
      address: 'Praça Central',
      notifyByEmail: false,
      notifyByWhatsapp: true,
    })

    expect(notifyWhatsapp).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('foi concluída'),
      }),
    )
  })

  it('monta mensagens com rodapé SEMIT', () => {
    expect(buildReceivedMessage({ reporterName: 'X', protocol: 'P', poleId: '1', address: 'Y' })).toContain(
      'Sistemas SEMIT',
    )
    expect(buildResolvedMessage({ reporterName: 'X', protocol: 'P', poleId: '1', address: 'Y' })).toContain(
      'Sua participação faz a diferença',
    )
  })
})
