const { buildPublicMeetingQuery, buildMeetingPayload, canTransitionStatus, escapeRegex } = require('../../helpers/comtur-query')
const { normalizeBranding, safeUrl } = require('../../helpers/comtur-branding')

describe('consulta pública de reuniões do COMTUR', () => {
  test('mantém publicação como filtro obrigatório e aplica filtros válidos', () => {
    const result = buildPublicMeetingQuery({ year: '2026', type: 'ordinaria', page: '2', limit: '10' })
    expect(result).toMatchObject({
      filter: { status: 'published', year: 2026, type: 'ordinaria' },
      page: 2,
      limit: 10,
      skip: 10,
    })
  })

  test('limita paginação e rejeita ano ou tipo inválidos', () => {
    expect(buildPublicMeetingQuery({ limit: '1000' }).limit).toBe(20)
    expect(buildPublicMeetingQuery({ year: '1999' })).toEqual({ error: 'Ano inválido' })
    expect(buildPublicMeetingQuery({ type: 'secreta' })).toEqual({ error: 'Tipo de reunião inválido' })
  })

  test('trata a busca como texto literal e limita seu tamanho', () => {
    expect(escapeRegex('ata (final).pdf')).toBe('ata \\(final\\)\\.pdf')
    const result = buildPublicMeetingQuery({ q: 'ata (final).pdf' })
    expect(result.filter.$or).toHaveLength(3)
    expect(result.filter.$or[0].summary).toBeInstanceOf(RegExp)
    expect(result.filter.$or[0].summary.test('ATA (FINAL).PDF aprovada')).toBe(true)
  })

  test('não aceita parâmetros herdados pelo protótipo', () => {
    const input = Object.create({ year: '2026', type: 'ordinaria' })
    const result = buildPublicMeetingQuery(input)
    expect(result.filter).toEqual({ status: 'published' })
  })
})

describe('white label do COMTUR', () => {
  test('normaliza identidade visual e recursos habilitados', () => {
    const result=normalizeBranding({organizationName:'Prefeitura Exemplo',councilName:'Conselho de Turismo',portalTitle:'Visite Exemplo',primaryColor:'#123ABC',fontFamily:'Montserrat',features:{meetings:true,documents:false}})
    expect(result.error).toBeUndefined();expect(result.value.primaryColor).toBe('#123abc');expect(result.value.features.documents).toBe(false)
  })
  test('rejeita cores, protocolos e tipografias não permitidos', () => {
    expect(normalizeBranding({primaryColor:'red'}).error).toMatch(/Cor inválida/)
    expect(normalizeBranding({fontFamily:'Comic Sans'}).error).toBe('Tipografia inválida')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
  })
})

describe('edição administrativa do COMTUR', () => {
  test('normaliza uma reunião válida sem aceitar estado editorial do cliente', () => {
    const result = buildMeetingPayload({
      slug: 'reuniao-01-2026', number: 1, year: 2026, type: 'ordinaria',
      startsAt: '2026-09-20T13:00:00-03:00', location: 'Paço Municipal', summary: 'Pauta oficial',
      status: 'published', documents: [{ kind: 'pauta', title: 'Pauta', url: 'https://www.garca.sp.gov.br/pauta.pdf' }],
    })
    expect(result.error).toBeUndefined()
    expect(result.payload.status).toBeUndefined()
    expect(result.payload.documents[0].kind).toBe('pauta')
  })

  test('rejeita URLs perigosas e campos obrigatórios ausentes', () => {
    expect(buildMeetingPayload({}).error).toMatch(/Campos obrigatórios/)
    const result = buildMeetingPayload({ documents: [{ kind: 'ata', title: 'Ata', url: 'javascript:alert(1)' }] }, { partial: true })
    expect(result).toEqual({ error: 'URL de documento inválida' })
  })

  test('aceita somente o caminho interno gerado pelo armazenamento do COMTUR', () => {
    const accepted = buildMeetingPayload({ documents: [{ kind: 'ata', title: 'Ata assinada.pdf', url: '/images/comtur/123-abc.pdf', mimeType: 'application/pdf', sizeBytes: 2048 }] }, { partial: true })
    expect(accepted.error).toBeUndefined()
    expect(accepted.payload.documents[0].url).toBe('/images/comtur/123-abc.pdf')
    expect(buildMeetingPayload({ documents: [{ kind: 'ata', title: 'Ata', url: '/images/outro/ata.pdf' }] }, { partial: true })).toEqual({ error: 'URL de documento inválida' })
  })

  test('permite somente transições editoriais explícitas', () => {
    expect(canTransitionStatus('draft', 'review')).toBe(true)
    expect(canTransitionStatus('review', 'published')).toBe(true)
    expect(canTransitionStatus('draft', 'published')).toBe(false)
    expect(canTransitionStatus('published', 'draft')).toBe(false)
  })
})
