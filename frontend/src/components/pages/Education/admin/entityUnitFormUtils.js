const ADDR_META = '@@EDU_ADDR@@'

export const SCHOOL_UNIT_TYPES = [
  'escola',
  'creche',
  'emei',
  'centro_educacional',
  'projeto_educacional',
]

/** Unidades exibidas na aba admin (todas exceto conselhos). */
export function isSchoolUnit(entity) {
  const type = entity?.type
  return Boolean(type && type !== 'conselho')
}

export function filterSchoolUnits(entities = []) {
  return entities.filter(isSchoolUnit)
}

export function filterCouncils(entities = []) {
  return entities.filter((e) => e?.type === 'conselho')
}

/** Caminho da imagem da unidade (capa, imageUrl legado ou logo). */
export function getUnitImagePath(entity) {
  if (!entity) return ''
  return entity.coverImageUrl || entity.imageUrl || entity.logoUrl || ''
}

export const EMPTY_UNIT_FORM = {
  name: '',
  type: 'escola',
  slug: '',
  description: '',
  phone: '',
  whatsapp: '',
  email: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: 'Garça',
  state: 'SP',
  councilCode: '',
  competencies: '',
  legalBasis: '',
  institutionalAbout: '',
  managerName: '',
  managerRole: 'Diretor(a)',
  isActive: true,
}

export function formatCep(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function stripAddressMeta(description = '') {
  const text = String(description)
  if (!text.startsWith(ADDR_META)) return { meta: null, description: text }
  const end = text.indexOf('\n')
  const jsonPart = end === -1 ? text.slice(ADDR_META.length) : text.slice(ADDR_META.length, end)
  try {
    const meta = JSON.parse(jsonPart)
    const rest = end === -1 ? '' : text.slice(end + 1)
    return { meta, description: rest }
  } catch {
    return { meta: null, description: text }
  }
}

function buildAddressMeta(parts) {
  return `${ADDR_META}${JSON.stringify({
    cep: parts.cep || '',
    street: parts.street || '',
    number: parts.number || '',
    complement: parts.complement || '',
    city: parts.city || 'Garça',
    state: parts.state || 'SP',
  })}`
}

export function buildReadableAddress(parts) {
  const line1 = [parts.street, parts.number].filter(Boolean).join(', ')
  const line1c = parts.complement ? `${line1} - ${parts.complement}` : line1
  const chunks = [
    line1c,
    parts.neighborhood,
    [parts.city, parts.state].filter(Boolean).join('/'),
    parts.cep ? `CEP ${parts.cep}` : '',
  ].filter(Boolean)
  return chunks.join(' — ')
}

export function entityToUnitForm(entity) {
  if (!entity) return { ...EMPTY_UNIT_FORM }
  const addressDetails = entity.addressDetails || {}
  const { meta, description } = stripAddressMeta(entity.description || '')
  const legacyAddr = meta || {}
  return {
    ...EMPTY_UNIT_FORM,
    name: entity.name || '',
    type: entity.type || 'escola',
    slug: entity.slug || '',
    description: entity.description?.startsWith(ADDR_META) ? description : (entity.description || ''),
    phone: entity.phone || '',
    whatsapp: entity.whatsapp || entity.openingHours || '',
    email: entity.email || '',
    cep: formatCep(addressDetails.cep || legacyAddr.cep || ''),
    street: addressDetails.street || legacyAddr.street || entity.address || '',
    number: addressDetails.number || legacyAddr.number || '',
    complement: addressDetails.complement || legacyAddr.complement || '',
    neighborhood: entity.neighborhood || '',
    city: addressDetails.city || legacyAddr.city || 'Garça',
    state: addressDetails.state || legacyAddr.state || 'SP',
    councilCode: entity.councilCode || '',
    competencies: entity.competencies || '',
    legalBasis: entity.legalBasis || '',
    institutionalAbout: entity.institutionalAbout || '',
    managerName: entity.managerName || '',
    managerRole: entity.managerRole || 'Diretor(a)',
    isActive: entity.isActive !== false,
  }
}

export function buildSchoolUnitFormData(form, { coverFile, managerPhotoFile, includeStatus = false } = {}) {
  const fd = new FormData()
  fd.append('name', form.name.trim())
  fd.append('type', form.type)
  if (form.slug?.trim()) fd.append('slug', form.slug.trim())
  fd.append('phone', form.phone || '')
  fd.append('whatsapp', form.whatsapp || '')
  fd.append('email', form.email || '')
  fd.append('managerName', form.managerName || '')
  fd.append('managerRole', form.managerRole || 'Diretor(a)')
  fd.append('neighborhood', form.neighborhood || '')
  fd.append('cep', form.cep || '')
  fd.append('street', form.street || '')
  fd.append('number', form.number || '')
  fd.append('complement', form.complement || '')
  fd.append('city', form.city || 'Garça')
  fd.append('state', form.state || 'SP')
  fd.append('address', buildReadableAddress(form))
  if (form.description?.trim()) fd.append('description', form.description.trim())

  if (includeStatus) {
    fd.append('isActive', form.isActive ? 'true' : 'false')
  }

  if (coverFile) fd.append('cover', coverFile)
  if (managerPhotoFile) fd.append('managerPhoto', managerPhotoFile)
  return fd
}

export function buildCouncilFormData(form, { coverFile, includeStatus = false } = {}) {
  const fd = new FormData()
  fd.append('name', form.name.trim())
  fd.append('type', 'conselho')
  if (form.slug?.trim()) fd.append('slug', form.slug.trim())
  fd.append('councilCode', form.councilCode || '')
  fd.append('competencies', form.competencies || '')
  fd.append('legalBasis', form.legalBasis || '')
  fd.append('institutionalAbout', form.institutionalAbout || '')
  fd.append('phone', form.phone || '')
  fd.append('whatsapp', form.whatsapp || '')
  fd.append('email', form.email || '')
  fd.append('neighborhood', form.neighborhood || '')
  fd.append('cep', form.cep || '')
  fd.append('street', form.street || '')
  fd.append('number', form.number || '')
  fd.append('complement', form.complement || '')
  fd.append('city', form.city || 'Garça')
  fd.append('state', form.state || 'SP')
  fd.append('address', buildReadableAddress(form))
  if (form.description?.trim()) fd.append('description', form.description.trim())
  if (includeStatus) fd.append('isActive', form.isActive ? 'true' : 'false')
  if (coverFile) fd.append('cover', coverFile)
  return fd
}

/** @deprecated Use buildSchoolUnitFormData — mantido para compatibilidade com conselhos */
export function buildEntityFormData(form, options = {}) {
  if (form.type === 'conselho') {
    const fd = new FormData()
    fd.append('name', form.name.trim())
    fd.append('type', form.type)
    if (form.slug?.trim()) fd.append('slug', form.slug.trim())
    fd.append('councilCode', form.councilCode || '')
    fd.append('competencies', form.competencies || '')
    fd.append('legalBasis', form.legalBasis || '')
    fd.append('institutionalAbout', form.institutionalAbout || '')
    if (options.includeStatus) fd.append('isActive', form.isActive ? 'true' : 'false')
    if (options.coverFile) fd.append('cover', options.coverFile)
    return fd
  }
  return buildSchoolUnitFormData(form, options)
}

export async function fetchAddressByCep(cep) {
  const digits = String(cep || '').replace(/\D/g, '')
  if (digits.length !== 8) return null
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.erro) return null
  return {
    street: data.logradouro || '',
    neighborhood: data.bairro || '',
    city: data.localidade || 'Garça',
    state: data.uf || 'SP',
    complement: data.complemento || '',
  }
}
