describe('votacao notifier — capa do pleito', () => {
  const previousAppUrl = process.env.APP_URL
  const previousFallback = process.env.VOTACAO_WHATSAPP_BANNER_URL

  beforeEach(() => {
    jest.resetModules()
    process.env.APP_URL = 'https://api.garca.sp.gov.br'
    delete process.env.VOTACAO_WHATSAPP_BANNER_URL
  })

  afterAll(() => {
    process.env.APP_URL = previousAppUrl
    if (previousFallback == null) delete process.env.VOTACAO_WHATSAPP_BANNER_URL
    else process.env.VOTACAO_WHATSAPP_BANNER_URL = previousFallback
  })

  test('usa a mesma capa relativa cadastrada no pleito', () => {
    const { resolveVotationBannerUrl } = require('../../helpers/votacao-notifier')
    expect(resolveVotationBannerUrl({ bannerUrl: '/images/votacao/banners/pleito-1.png' }))
      .toBe('https://api.garca.sp.gov.br/images/votacao/banners/pleito-1.png')
  })

  test('aceita capa absoluta somente no domínio oficial', () => {
    const { resolveVotationBannerUrl } = require('../../helpers/votacao-notifier')
    expect(resolveVotationBannerUrl({ bannerUrl: 'https://api.garca.sp.gov.br/images/votacao/banners/pleito-2.jpg' }))
      .toBe('https://api.garca.sp.gov.br/images/votacao/banners/pleito-2.jpg')
  })

  test('usa fallback para URL externa ou arquivo fora da pasta de pleitos', () => {
    const { resolveVotationBannerUrl } = require('../../helpers/votacao-notifier')
    const fallback = 'https://api.garca.sp.gov.br/notificacao-banner/not-votacao.png'
    expect(resolveVotationBannerUrl({ bannerUrl: 'https://exemplo.com/capa.png' })).toBe(fallback)
    expect(resolveVotationBannerUrl({ bannerUrl: '/images/outro-modulo/capa.png' })).toBe(fallback)
  })
})
