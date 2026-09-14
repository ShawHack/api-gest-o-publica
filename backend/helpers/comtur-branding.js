const COLOR = /^#[0-9a-f]{6}$/i
const FONTS = new Set(['Inter', 'Arial', 'Roboto', 'Montserrat', 'Open Sans', 'Source Sans 3'])
const URL_FIELDS = ['logoUrl', 'faviconUrl', 'heroImageUrl']

const DEFAULT_BRANDING = {
  organizationName: 'Prefeitura Municipal de Garça',
  councilName: 'Conselho Municipal de Turismo de Garça',
  portalTitle: 'COMTUR',
  shortName: 'COMTUR',
  tagline: 'Reuniões, documentos e deliberações publicados pelo Conselho Municipal de Turismo de Garça.',
  heroLead: '',
  footerText: 'Prefeitura Municipal de Garça — Transparência e governança do turismo',
  primaryColor: '#075985', secondaryColor: '#0f766e', accentColor: '#0ea5e9',
  fontFamily: 'Inter', logoUrl: '', faviconUrl: '', heroImageUrl: '',
  contactEmail: '', contactPhone: '', websiteUrl: '', instagramUrl: '', facebookUrl: '',
  features: { meetings: true, documents: true, legislation: true, council: true, planning: true, accountability: true },
}

function text(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function safeUrl(value, { allowRelative = true } = {}) {
  const result = text(value, 1000)
  if (!result) return ''
  if (allowRelative && /^\/[a-z0-9/_\-.]+$/i.test(result)) return result
  try { const parsed = new URL(result); return ['http:', 'https:'].includes(parsed.protocol) ? result : null } catch (_) { return null }
}

function normalizeBranding(input = {}) {
  const value = { ...DEFAULT_BRANDING }
  const fields = [['organizationName',160],['councilName',180],['portalTitle',100],['shortName',80],['tagline',300],['heroLead',400],['footerText',240],['contactEmail',180],['contactPhone',60]]
  for (const [field,max] of fields) if (input[field] !== undefined) value[field] = text(input[field],max)
  for (const field of ['primaryColor','secondaryColor','accentColor']) {
    if (input[field] !== undefined) { if (!COLOR.test(input[field])) return { error: `Cor inválida em ${field}` }; value[field] = input[field].toLowerCase() }
  }
  if (input.fontFamily !== undefined) { if (!FONTS.has(input.fontFamily)) return { error: 'Tipografia inválida' }; value.fontFamily = input.fontFamily }
  for (const field of URL_FIELDS) { if (input[field] !== undefined) { const url=safeUrl(input[field]); if (url===null) return { error:`URL inválida em ${field}` }; value[field]=url } }
  for (const field of ['websiteUrl','instagramUrl','facebookUrl']) { if (input[field] !== undefined) { const url=safeUrl(input[field],{allowRelative:false}); if (url===null) return { error:`URL inválida em ${field}` }; value[field]=url } }
  if (input.features !== undefined) value.features = Object.fromEntries(Object.keys(DEFAULT_BRANDING.features).map(key => [key, input.features[key] !== false]))
  if (!value.organizationName || !value.councilName || !value.portalTitle) return { error: 'Organização, Conselho e título do portal são obrigatórios' }
  return { value }
}

function mergeBranding(current = {}, input = {}) {
  const base = { ...DEFAULT_BRANDING, ...(current || {}) }
  const payload = { ...base, ...input }
  for (const field of URL_FIELDS) {
    if (!text(input[field] || '')) payload[field] = base[field] || ''
  }
  return normalizeBranding(payload)
}

module.exports = { DEFAULT_BRANDING, normalizeBranding, mergeBranding, safeUrl, URL_FIELDS }
