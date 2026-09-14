export const BASE = '/turismo'

export const CATEGORIES = [
  { id: 'atrativos', type: 'attraction', label: 'Atrativos', blurb: 'O que ver e visitar em Garça.' },
  { id: 'eventos', type: 'event', label: 'Eventos', blurb: 'Agenda cultural e turística.' },
  { id: 'rotas', type: 'route', label: 'Rotas', blurb: 'Caminhos e roteiros sugeridos.' },
  { id: 'hospedagens', type: 'lodging', label: 'Hospedagens', blurb: 'Onde ficar.' },
  { id: 'alimentacao', type: 'gastronomy', label: 'Alimentação', blurb: 'Gastronomia local.' },
  { id: 'compras', type: 'shopping', label: 'Compras', blurb: 'Comércio e artesanato.' },
  { id: 'servicos', type: 'service', label: 'Serviços', blurb: 'Apoio ao visitante.' },
  { id: 'noticias', type: 'news', label: 'Notícias', blurb: 'Informes e matérias publicados pela gestão de turismo.' },
]

export const GOVERNANCE_TYPES = [
  { type: 'council_member', label: 'Membros do Conselho' },
  { type: 'legislation', label: 'Legislação' },
  { type: 'work_plan', label: 'Plano de trabalho' },
  { type: 'accountability', label: 'Prestação de contas' },
  { type: 'indicator', label: 'Indicadores' },
  { type: 'research', label: 'Pesquisas' },
  { type: 'open_data', label: 'Dados abertos' },
]

const GOVERNANCE_TYPE_SET = new Set(GOVERNANCE_TYPES.map((item) => item.type))

export function governanceLabel(type) {
  return GOVERNANCE_TYPES.find((item) => item.type === type)?.label || 'Documento do COMTUR'
}

export function isGovernanceContent(item) {
  return GOVERNANCE_TYPE_SET.has(item?.type)
}

export function contentLines(body) {
  return String(body || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

export function mediaAsDocuments(media) {
  return (Array.isArray(media) ? media : []).filter((item) => item?.url).map((item) => ({
    kind: item.kind === 'document' ? 'anexo' : (item.kind || 'anexo'),
    title: item.title || 'Arquivo',
    url: item.url,
  }))
}

const HEX = /^#[0-9a-f]{6}$/i
const FONTS = new Set(['Inter', 'Arial', 'Roboto', 'Montserrat', 'Open Sans', 'Source Sans 3'])
const DEFAULT_TAGLINE = 'Reuniões, documentos e deliberações publicados pelo Conselho Municipal de Turismo de Garça.'
const GOOGLE_FONTS = {
  Inter: 'Inter:wght@400;500;700',
  Roboto: 'Roboto:wght@400;500;700',
  Montserrat: 'Montserrat:wght@400;600;700',
  'Open Sans': 'Open+Sans:wght@400;600;700',
  'Source Sans 3': 'Source+Sans+3:wght@400;600;700',
}

export function parsePath(pathname, search = '') {
  const raw = String(pathname || '').replace(/^\/turismo\/?/, '')
  const parts = raw.split('/').filter(Boolean)
  const params = new URLSearchParams(search)
  if (!parts.length) return { view: 'home', query: params.get('q') || '' }
  if (parts[0] === 'buscar') return { view: 'search', query: params.get('q') || '' }
  if (parts[0] === 'mapa') return { view: 'map' }
  if (parts[0] === 'legislacao' && parts[1]) return { view: 'content', slug: parts[1] }
  if (parts[0] === 'legislacao') return { view: 'legislation', query: params.get('q') || '' }
  if (parts[0] === 'comtur' && parts[1] === 'doc' && parts[2]) return { view: 'content', slug: parts[2] }
  if (parts[0] === 'comtur' && parts[1]) return { view: 'meeting', slug: parts[1] }
  if (parts[0] === 'comtur') return { view: 'comtur' }
  if (parts[0] === 'entrar') return { view: 'login' }
  if (parts[0] === 'cadastro') return { view: 'register' }
  if (parts[0] === 'p' && parts[1]) return { view: 'detail', slug: parts[1] }
  const category = CATEGORIES.find((item) => item.id === parts[0])
  if (category) return { view: 'category', category }
  return { view: 'notfound' }
}

export function href(path = '') {
  const clean = String(path).replace(/^\//, '')
  return clean ? `${BASE}/${clean}` : `${BASE}/`
}

export const AMENITIES_CATALOG = {
  wifi: { id: 'wifi', label: 'Wi-Fi gratuito', icon: '📶' },
  parking: { id: 'parking', label: 'Estacionamento', icon: '🚗' },
  breakfast: { id: 'breakfast', label: 'Café da manhã', icon: '☕' },
  pool: { id: 'pool', label: 'Piscina', icon: '🏊' },
  ac: { id: 'ac', label: 'Ar-condicionado', icon: '❄️' },
  accessibility: { id: 'accessibility', label: 'Acessibilidade PCD', icon: '♿' },
  pet_friendly: { id: 'pet_friendly', label: 'Aceita pets', icon: '🐾' },
  restaurant: { id: 'restaurant', label: 'Restaurante / Bar', icon: '🍽️' },
  reception_24h: { id: 'reception_24h', label: 'Recepção 24h', icon: '🕒' },
  room_service: { id: 'room_service', label: 'Serviço de quarto', icon: '🛎️' },
  tv: { id: 'tv', label: 'TV nos quartos', icon: '📺' },
  gym: { id: 'gym', label: 'Academia', icon: '🏋️' },
}

export const GASTRO_SERVICES_CATALOG = {
  dine_in: { id: 'dine_in', label: 'Consumo no local', icon: '🍽️' },
  takeout: { id: 'takeout', label: 'Retirada no balcão', icon: '🛍️' },
  delivery: { id: 'delivery', label: 'Delivery / Entrega', icon: '🛵' },
  reservations: { id: 'reservations', label: 'Aceita reservas', icon: '📅' },
  outdoor_seating: { id: 'outdoor_seating', label: 'Área externa', icon: '🌳' },
  wifi: { id: 'wifi', label: 'Wi-Fi gratuito', icon: '📶' },
  parking: { id: 'parking', label: 'Estacionamento', icon: '🚗' },
  accessibility: { id: 'accessibility', label: 'Acessibilidade PCD', icon: '♿' },
  kids_area: { id: 'kids_area', label: 'Espaço infantil', icon: '🧸' },
  pet_friendly: { id: 'pet_friendly', label: 'Aceita pets', icon: '🐾' },
  live_music: { id: 'live_music', label: 'Música ao vivo', icon: '🎵' },
  ac: { id: 'ac', label: 'Ar-condicionado', icon: '❄️' },
}

export const PAYMENT_METHODS_CATALOG = {
  cash: { id: 'cash', label: 'Dinheiro', icon: '💵' },
  pix: { id: 'pix', label: 'Pix', icon: '💠' },
  debit_card: { id: 'debit_card', label: 'Cartão de débito', icon: '💳' },
  credit_card: { id: 'credit_card', label: 'Cartão de crédito', icon: '💳' },
  meal_voucher: { id: 'meal_voucher', label: 'Vale-refeição / Alimentação', icon: '🎟️' },
}

export const PRICE_RANGE_LABELS = {
  $: '$ · Econômico',
  $$: '$$ · Moderado',
  $$$: '$$$ · Alto',
  $$$$: '$$$$ · Premium',
}

export const DAYS_OF_WEEK_MAP = [
  { id: 'monday', label: 'Segunda-feira', short: 'Seg' },
  { id: 'tuesday', label: 'Terça-feira', short: 'Ter' },
  { id: 'wednesday', label: 'Quarta-feira', short: 'Qua' },
  { id: 'thursday', label: 'Quinta-feira', short: 'Qui' },
  { id: 'friday', label: 'Sexta-feira', short: 'Sex' },
  { id: 'saturday', label: 'Sábado', short: 'Sáb' },
  { id: 'sunday', label: 'Domingo', short: 'Dom' },
  { id: 'holidays', label: 'Feriados', short: 'Feriados' },
]

export const EVENT_FEATURES_CATALOG = {
  accessibility: { id: 'accessibility', label: 'Acessibilidade PCD', icon: '♿' },
  parking: { id: 'parking', label: 'Estacionamento', icon: '🚗' },
  food_area: { id: 'food_area', label: 'Praça de alimentação', icon: '🍔' },
  restrooms: { id: 'restrooms', label: 'Sanitários', icon: '🚻' },
  covered_area: { id: 'covered_area', label: 'Área coberta', icon: '⛺' },
  outdoor: { id: 'outdoor', label: 'Ao ar livre', icon: '🌳' },
  pet_friendly: { id: 'pet_friendly', label: 'Aceita pets', icon: '🐾' },
  kids_area: { id: 'kids_area', label: 'Espaço infantil', icon: '🧸' },
  box_office: { id: 'box_office', label: 'Ingressos no local', icon: '🎟️' },
  security: { id: 'security', label: 'Segurança / Apoio', icon: '🛡️' },
  wifi: { id: 'wifi', label: 'Wi-Fi disponível', icon: '📶' },
}

export const EVENT_AGE_RATINGS_CATALOG = {
  Livre: { label: 'Classificação Livre', icon: '🟢', badge: 'L' },
  '10 anos': { label: '10 anos', icon: '🔵', badge: '10' },
  '12 anos': { label: '12 anos', icon: '🟡', badge: '12' },
  '14 anos': { label: '14 anos', icon: '🟠', badge: '14' },
  '16 anos': { label: '16 anos', icon: '🔴', badge: '16' },
  '18 anos': { label: '18 anos (Adulto)', icon: '⚫', badge: '18' },
}

export function eventTemporalStatus(startsAtStr, endsAtStr, allDay = false) {
  if (!startsAtStr) return null
  const now = new Date()
  const start = new Date(startsAtStr)
  const end = endsAtStr ? new Date(endsAtStr) : new Date(start.getTime() + 4 * 3600 * 1000)

  if (Number.isNaN(start.getTime())) return null

  // If finished
  if (end < now) {
    return { status: 'past', label: 'Evento encerrado', variant: 'ended' }
  }

  // If ongoing right now
  if (start <= now && end >= now) {
    return { status: 'today', label: 'Acontecendo hoje!', variant: 'today' }
  }

  // Day calculation
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((startDay.getTime() - todayDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return { status: 'today', label: 'Hoje!', variant: 'today' }
  }
  if (diffDays === 1) {
    return { status: 'tomorrow', label: 'Amanhã', variant: 'tomorrow' }
  }

  // Check this weekend
  const currentDayOfWeek = now.getDay() // 0 is Sun, 5 is Fri, 6 is Sat
  const daysUntilFriday = (5 - currentDayOfWeek + 7) % 7
  const thisFriday = new Date(todayDay.getTime() + daysUntilFriday * 24 * 3600 * 1000)
  const thisSunday = new Date(thisFriday.getTime() + 2 * 24 * 3600 * 1000)

  if (startDay >= thisFriday && startDay <= thisSunday && diffDays <= 6) {
    return { status: 'weekend', label: 'Neste fim de semana', variant: 'weekend' }
  }

  return { status: 'future', label: 'Em breve', variant: 'future' }
}

export function formatEventDateTime(startsAtStr, endsAtStr, allDay = false) {
  if (!startsAtStr) return ''
  const start = new Date(startsAtStr)
  if (Number.isNaN(start.getTime())) return ''

  const dateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const startFormattedDate = dateFmt.format(start)
  const capitalizedDate = startFormattedDate.charAt(0).toUpperCase() + startFormattedDate.slice(1)

  if (allDay) {
    if (endsAtStr) {
      const end = new Date(endsAtStr)
      if (!Number.isNaN(end.getTime()) && (end.getDate() !== start.getDate() || end.getMonth() !== start.getMonth())) {
        const endDateFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
        return `${start.getDate()} a ${endDateFmt.format(end)}`
      }
    }
    return capitalizedDate
  }

  const startTime = timeFmt.format(start)

  if (endsAtStr) {
    const end = new Date(endsAtStr)
    if (!Number.isNaN(end.getTime())) {
      const isSameDay = end.getDate() === start.getDate() && end.getMonth() === start.getMonth() && end.getFullYear() === start.getFullYear()
      if (isSameDay) {
        const endTime = timeFmt.format(end)
        return `${capitalizedDate} · ${startTime} às ${endTime}`
      }
      const endDateFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
      return `${start.getDate()} de ${start.toLocaleString('pt-BR', { month: 'short' })} às ${startTime} até ${endDateFmt.format(end)} às ${timeFmt.format(end)}`
    }
  }

  return `${capitalizedDate} às ${startTime}`
}

export function coverImage(item) {
  if (item?.metadata?.coverUrl) return item.metadata.coverUrl
  const media = item?.media?.find((entry) => entry?.kind === 'image' && entry?.url)
  return media?.url || ''
}

export function galleryImages(item) {
  return (Array.isArray(item?.media) ? item.media : []).filter((entry) => entry?.kind === 'image' && entry?.url)
}

export const ATTRACTION_FEATURES_CATALOG = {
  parking: { id: 'parking', label: 'Estacionamento', icon: '🚗' },
  accessibility: { id: 'accessibility', label: 'Acessibilidade PCD', icon: '♿' },
  restrooms: { id: 'restrooms', label: 'Sanitários', icon: '🚻' },
  drinking_water: { id: 'drinking_water', label: 'Bebedouro', icon: '🚰' },
  food_service: { id: 'food_service', label: 'Alimentação no local', icon: '🍔' },
  rest_area: { id: 'rest_area', label: 'Área para descanso', icon: '🪑' },
  kids_area: { id: 'kids_area', label: 'Área infantil / Kids', icon: '🧸' },
  wifi: { id: 'wifi', label: 'Wi-Fi disponível', icon: '📶' },
  guided_tour: { id: 'guided_tour', label: 'Visita guiada', icon: '🚩' },
  souvenir_shop: { id: 'souvenir_shop', label: 'Loja de souvenirs', icon: '🛍️' },
  pet_friendly: { id: 'pet_friendly', label: 'Aceita pets', icon: '🐾' },
  covered_area: { id: 'covered_area', label: 'Área coberta', icon: '⛺' },
  outdoor: { id: 'outdoor', label: 'Área ao ar livre', icon: '🌳' },
}

export const ATTRACTION_ACCESS_CATALOG = {
  wheelchair_ramp: { id: 'wheelchair_ramp', label: 'Rampa / Acesso cadeirantes', icon: '♿' },
  accessible_restroom: { id: 'accessible_restroom', label: 'Banheiro acessível PCD', icon: '🚻' },
  accessible_parking: { id: 'accessible_parking', label: 'Vagas PCD', icon: '🚗' },
  tactile_paving: { id: 'tactile_paving', label: 'Piso tátil / Rota acessível', icon: '🦯' },
}

export const ATTRACTION_AUDIENCES_CATALOG = {
  families: { id: 'families', label: 'Famílias', icon: '👨‍👩‍👧‍👦' },
  kids: { id: 'kids', label: 'Crianças', icon: '🧒' },
  couples: { id: 'couples', label: 'Casais', icon: '👫' },
  seniors: { id: 'seniors', label: 'Idosos', icon: '👵' },
  groups: { id: 'groups', label: 'Grupos / Excursões', icon: '🚌' },
  schools: { id: 'schools', label: 'Escolas / Estudantes', icon: '🎓' },
  cyclists: { id: 'cyclists', label: 'Ciclistas', icon: '🚴' },
  reduced_mobility: { id: 'reduced_mobility', label: 'Mobilidade reduzida', icon: '♿' },
}

export function cleanWhatsapp(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

export function categoryLabel(item) {
  if (item?.metadata?.categoryLabel) return String(item.metadata.categoryLabel)
  if (item?.type === 'attraction' && item?.metadata?.attractionCategory) return String(item.metadata.attractionCategory)
  if (item?.type === 'event' && item?.metadata?.eventCategory) return String(item.metadata.eventCategory)
  if (item?.type === 'lodging' && item?.metadata?.lodgingType) return String(item.metadata.lodgingType)
  if (item?.type === 'gastronomy' && item?.metadata?.gastronomyCategory) return String(item.metadata.gastronomyCategory)
  const found = CATEGORIES.find((entry) => entry.type === item?.type)
  return found?.label || governanceLabel(item?.type)
}

export function categoryId(item) {
  const found = CATEGORIES.find((entry) => entry.type === item?.type)
  return found?.id || ''
}

export function accessFlags(item) {
  const meta = item?.metadata || {}
  const amenities = Array.isArray(meta.amenities) ? meta.amenities : (Array.isArray(meta.services) ? meta.services : [])
  return {
    wheelchair: meta.wheelchair === true || amenities.includes('accessibility') || item?.media?.some((entry) => entry?.isAccessible),
    petFriendly: meta.petFriendly === true || amenities.includes('pet_friendly'),
  }
}

export function parseHex(hex) {
  if (!HEX.test(hex || '')) return null
  return [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((part) => parseInt(part, 16))
}

export function relativeLuma(hex) {
  const rgb = parseHex(hex)
  if (!rgb) return 0
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
}

export function onColor(hex) {
  return relativeLuma(hex) > 0.55 ? '#14202b' : '#ffffff'
}

export function mixWhite(hex, amount) {
  const rgb = parseHex(hex) || [128, 171, 194]
  return `#${rgb.map((value) => Math.round(value + (255 - value) * amount).toString(16).padStart(2, '0')).join('')}`
}

export function mixBlack(hex, amount) {
  const rgb = parseHex(hex) || [61, 110, 133]
  return `#${rgb.map((value) => Math.round(value * (1 - amount)).toString(16).padStart(2, '0')).join('')}`
}

function set(root, name, value) {
  if (value) root.style.setProperty(name, value)
}

export function applyTheme(branding = {}, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root?.style) return
  const primary = HEX.test(branding.primaryColor || '') ? branding.primaryColor : '#3d6e85'
  const secondary = HEX.test(branding.secondaryColor || '') ? branding.secondaryColor : '#2fa79d'
  const accent = HEX.test(branding.accentColor || '') ? branding.accentColor : primary
  const ink = mixBlack(primary, 0.72)
  const paper = mixWhite(primary, 0.94)
  const onBrand = onColor(primary)
  set(root, '--brand', primary)
  set(root, '--brand-2', secondary)
  set(root, '--brand-3', accent)
  set(root, '--on-brand', onBrand)
  set(root, '--paper', paper)
  set(root, '--card', '#ffffff')
  set(root, '--ink', ink)
  set(root, '--muted', mixWhite(ink, 0.35))
  set(root, '--line', mixWhite(primary, 0.78))
  set(root, '--coffee', primary)
  set(root, '--leaf', secondary)
  set(root, '--clay', accent)
  const font = branding.fontFamily
  const doc = root.ownerDocument
  if (FONTS.has(font) && doc?.body) {
    doc.body.style.fontFamily = `"${font}", "Segoe UI", sans-serif`
    const family = GOOGLE_FONTS[font]
    if (family && doc.head) {
      let link = doc.querySelector('link[data-comtur-font]')
      if (!link) {
        link = doc.createElement('link')
        link.rel = 'stylesheet'
        link.dataset.comturFont = '1'
        doc.head.appendChild(link)
      }
      link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`
    }
  }
  if (branding.faviconUrl && doc?.head) {
    let icon = doc.querySelector('link[rel="icon"][data-comtur]')
    if (!icon) {
      icon = doc.createElement('link')
      icon.rel = 'icon'
      icon.dataset.comtur = '1'
      doc.head.appendChild(icon)
    }
    icon.href = branding.faviconUrl
  }
  if (doc) doc.title = `${portalName(branding)} — ${branding.organizationName || 'Prefeitura Municipal'}`
}

export function portalName(branding = {}) {
  const title = String(branding.portalTitle || '').trim()
  if (title && title !== 'COMTUR') return title
  return 'Turismo Garça'
}

export function portalHeadline(branding = {}) {
  const tagline = String(branding.tagline || '').trim()
  if (tagline && tagline !== DEFAULT_TAGLINE) return tagline
  return 'Garça para quem visita, com a voz da Prefeitura'
}

export function portalLead(branding = {}) {
  const lead = String(branding.heroLead || '').trim()
  if (lead) return lead
  return 'Portal oficial de turismo do município: o que ver, onde ficar, o que comer e a transparência do Conselho Municipal de Turismo.'
}

export function portalFooter(branding = {}) {
  const custom = String(branding.footerText || '').trim()
  if (custom) return custom
  return `${branding.organizationName || 'Prefeitura Municipal de Garça'} — ${portalName(branding)}`
}

export function portalKicker(branding = {}) {
  const short = String(branding.shortName || '').trim()
  if (short && short !== 'COMTUR') return short
  return 'Garça · São Paulo'
}

export function displayHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return 'Site oficial'
  }
}

export function footerContacts(branding = {}) {
  const items = []
  const phone = String(branding.contactPhone || '').trim()
  const email = String(branding.contactEmail || '').trim()
  const website = String(branding.websiteUrl || '').trim()
  const instagram = String(branding.instagramUrl || '').trim()
  const facebook = String(branding.facebookUrl || '').trim()
  if (phone) items.push({ kind: 'text', label: phone })
  if (email) items.push({ kind: 'link', href: `mailto:${email}`, label: email })
  if (website) items.push({ kind: 'link', href: website, label: displayHost(website), external: true })
  if (instagram) items.push({ kind: 'link', href: instagram, label: 'Instagram', external: true })
  if (facebook) items.push({ kind: 'link', href: facebook, label: 'Facebook', external: true })
  return items
}

export const MEETING_DOC_LABELS = {
  convocacao: 'Convocação',
  pauta: 'Pauta',
  ata: 'Ata',
  lista_presenca: 'Lista de presença',
  anexo: 'Anexo',
  gravacao: 'Gravação',
}

export function meetingTitle(item) {
  const kind = item?.type === 'extraordinaria' ? 'extraordinária' : 'ordinária'
  return `${item?.number}ª reunião ${kind} de ${item?.year}`
}

export function meetingHeadline(item) {
  const official = meetingTitle(item)
  const summary = String(item?.summary || '').trim()
  if (!summary || summary === item?.slug || /^reuniao-\d+/i.test(summary)) return official
  return summary
}

export function meetingWhen(item) {
  if (!item?.startsAt) return ''
  const date = new Date(item.startsAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function fileNameFromUrl(url, fallback = 'documento') {
  try {
    const path = String(url || '').split('?')[0]
    const name = path.split('/').filter(Boolean).pop()
    return name || fallback
  } catch {
    return fallback
  }
}
