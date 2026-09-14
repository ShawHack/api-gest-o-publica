import { describe, expect, test, vi } from 'vitest'
import { accessFlags, applyTheme, CATEGORIES, categoryLabel, contentLines, coverImage, footerContacts, href, isGovernanceContent, meetingHeadline, meetingTitle, onColor, parsePath, portalFooter, portalHeadline, portalKicker, portalLead, portalName } from './catalog.js'

describe('roteamento do portal Visit Garça', () => {
  test('interpreta home, categorias e ficha', () => {
    expect(parsePath('/turismo/').view).toBe('home')
    expect(parsePath('/turismo/atrativos').category.type).toBe('attraction')
    expect(parsePath('/turismo/compras').category.type).toBe('shopping')
    expect(parsePath('/turismo/p/jardim-oriental').slug).toBe('jardim-oriental')
    expect(parsePath('/turismo/mapa').view).toBe('map')
    expect(parsePath('/turismo/comtur').view).toBe('comtur')
    expect(parsePath('/turismo/comtur/doc/membros')).toEqual({ view: 'content', slug: 'membros' })
    expect(parsePath('/turismo/comtur/reuniao-01-2026')).toEqual({ view: 'meeting', slug: 'reuniao-01-2026' })
    expect(parsePath('/turismo/entrar').view).toBe('login')
    expect(parsePath('/turismo/cadastro').view).toBe('register')
    expect(parsePath('/turismo/inexistente').view).toBe('notfound')
  })

  test('monta URLs estáveis e lê mídia e acessibilidade', () => {
    expect(href('atrativos')).toBe('/turismo/atrativos')
    expect(CATEGORIES).toHaveLength(8)
    expect(parsePath('/turismo/noticias').category.type).toBe('news')
    expect(coverImage({ media: [{ kind: 'image', url: '/images/comtur/a.webp' }] })).toBe('/images/comtur/a.webp')
    expect(accessFlags({ metadata: { wheelchair: true, petFriendly: true } })).toEqual({ wheelchair: true, petFriendly: true })
  })
})

describe('white label', () => {
  test('aplica o sistema visual completo da marca', () => {
    const root = { style: { setProperty: vi.fn() }, ownerDocument: { body: { style: {} }, title: '' } }
    applyTheme({ primaryColor: '#80abc2', secondaryColor: '#2fa79d', accentColor: '#3d6e85', fontFamily: 'Montserrat', organizationName: 'Prefeitura Municipal de Garça', portalTitle: 'Turismo Garça' }, root)
    expect(root.style.setProperty).toHaveBeenCalledWith('--brand', '#80abc2')
    expect(root.style.setProperty).toHaveBeenCalledWith('--brand-2', '#2fa79d')
    expect(root.style.setProperty).toHaveBeenCalledWith('--on-brand', '#14202b')
    expect(onColor('#80abc2')).toBe('#14202b')
    expect(onColor('#3d6e85')).toBe('#ffffff')
    expect(portalName({ portalTitle: 'Garça Turismo' })).toBe('Garça Turismo')
    expect(portalName({ portalTitle: 'COMTUR' })).toBe('Turismo Garça')
    expect(portalHeadline({ tagline: 'Venha conhecer Garça' })).toBe('Venha conhecer Garça')
    expect(portalLead({ heroLead: 'Texto de apoio da capa' })).toBe('Texto de apoio da capa')
    expect(portalLead({})).toMatch(/Portal oficial de turismo/)
    expect(portalFooter({ footerText: 'Rodapé oficial' })).toBe('Rodapé oficial')
    expect(portalKicker({ shortName: 'Visit Garça' })).toBe('Visit Garça')
  })

  test('monta título público da reunião sem usar o slug', () => {
    expect(meetingTitle({ number: 1, year: 2026, type: 'ordinaria' })).toBe('1ª reunião ordinária de 2026')
    expect(meetingHeadline({ number: 1, year: 2026, type: 'ordinaria', slug: 'reuniao-01-2026', summary: 'reuniao-01-2026' })).toBe('1ª reunião ordinária de 2026')
    expect(meetingHeadline({ number: 1, year: 2026, type: 'ordinaria', slug: 'reuniao-01-2026', summary: 'Abertura do ano' })).toBe('Abertura do ano')
    expect(categoryLabel({ type: 'council_member' })).toBe('Membros do Conselho')
    expect(isGovernanceContent({ type: 'council_member' })).toBe(true)
    expect(contentLines('Carlos jose\nFulano da Silva\n\nMussum')).toEqual(['Carlos jose', 'Fulano da Silva', 'Mussum'])
  })

  test('só lista no rodapé os contatos definidos no white label', () => {
    expect(footerContacts({})).toEqual([])
    expect(footerContacts({ websiteUrl: '' })).toEqual([])
    expect(footerContacts({
      contactPhone: ' (14) 3406-2000 ',
      contactEmail: 'turismo@exemplo.gov.br',
      websiteUrl: 'https://www.exemplo.gov.br/turismo',
      instagramUrl: 'https://instagram.com/turismo',
      facebookUrl: 'https://facebook.com/turismo',
    })).toEqual([
      { kind: 'text', label: '(14) 3406-2000' },
      { kind: 'link', href: 'mailto:turismo@exemplo.gov.br', label: 'turismo@exemplo.gov.br' },
      { kind: 'link', href: 'https://www.exemplo.gov.br/turismo', label: 'exemplo.gov.br', external: true },
      { kind: 'link', href: 'https://instagram.com/turismo', label: 'Instagram', external: true },
      { kind: 'link', href: 'https://facebook.com/turismo', label: 'Facebook', external: true },
    ])
  })
})
