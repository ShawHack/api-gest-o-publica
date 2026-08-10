/** Campos estruturados de unidades escolares (EducationEntity). */

const { SCHOOL_UNIT_TYPES } = require('./education-constants')

const ADDR_META = '@@EDU_ADDR@@'

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function stripAddressMeta(description = '') {
  const text = String(description || '')
  if (!text.startsWith(ADDR_META)) {
    return { meta: null, description: text }
  }
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

function buildFullAddress(addressDetails = {}, neighborhood = '') {
  const street = addressDetails.street || ''
  const number = addressDetails.number || ''
  const complement = addressDetails.complement || ''
  const city = addressDetails.city || ''
  const state = addressDetails.state || ''
  const cep = addressDetails.cep || ''

  const line1 = [street, number].filter(Boolean).join(', ')
  const line1c = complement ? `${line1} - ${complement}` : line1
  return [
    line1c,
    neighborhood,
    [city, state].filter(Boolean).join('/'),
    cep ? `CEP ${cep}` : '',
  ].filter(Boolean).join(' — ')
}

function resolveAddressDetails(entity = {}) {
  if (entity.addressDetails && (
    entity.addressDetails.street ||
    entity.addressDetails.cep ||
    entity.addressDetails.city
  )) {
    return {
      cep: formatCep(entity.addressDetails.cep || ''),
      street: entity.addressDetails.street || '',
      number: entity.addressDetails.number || '',
      complement: entity.addressDetails.complement || '',
      city: entity.addressDetails.city || 'Garça',
      state: entity.addressDetails.state || 'SP',
    }
  }

  const { meta } = stripAddressMeta(entity.description || '')
  if (meta) {
    return {
      cep: formatCep(meta.cep || ''),
      street: meta.street || '',
      number: meta.number || '',
      complement: meta.complement || '',
      city: meta.city || 'Garça',
      state: meta.state || 'SP',
    }
  }

  return {
    cep: '',
    street: entity.address || '',
    number: '',
    complement: '',
    city: 'Garça',
    state: 'SP',
  }
}

function resolveDescription(entity = {}) {
  const { description } = stripAddressMeta(entity.description || '')
  return description
}

function resolveWhatsapp(entity = {}) {
  if (entity.whatsapp) return entity.whatsapp
  if (entity.openingHours && onlyDigits(entity.openingHours).length >= 10) {
    return entity.openingHours
  }
  return ''
}

function parseAddressDetailsFromBody(body = {}) {
  const nested = body.addressDetails && typeof body.addressDetails === 'object'
    ? body.addressDetails
    : {}

  let parsedNested = nested
  if (typeof body.addressDetails === 'string') {
    try {
      parsedNested = JSON.parse(body.addressDetails)
    } catch {
      parsedNested = {}
    }
  }

  return {
    cep: formatCep(body.cep || parsedNested.cep || ''),
    street: (body.street || parsedNested.street || '').trim(),
    number: (body.number || parsedNested.number || '').trim(),
    complement: (body.complement || parsedNested.complement || '').trim(),
    city: (body.city || parsedNested.city || 'Garça').trim(),
    state: (body.state || parsedNested.state || 'SP').trim().toUpperCase().slice(0, 2),
  }
}

function applySchoolUnitFields(entity, body = {}) {
  const scalarFields = [
    'name', 'description', 'neighborhood', 'phone', 'email',
    'managerName', 'managerRole', 'openingHours',
  ]
  for (const field of scalarFields) {
    if (body[field] !== undefined) entity[field] = body[field]
  }

  if (body.whatsapp !== undefined) {
    entity.whatsapp = body.whatsapp
  } else if (body.openingHours !== undefined && onlyDigits(body.openingHours).length >= 10) {
    entity.whatsapp = body.openingHours
  }

  if (
    body.addressDetails !== undefined ||
    body.cep !== undefined ||
    body.street !== undefined ||
    body.number !== undefined ||
    body.complement !== undefined ||
    body.city !== undefined ||
    body.state !== undefined
  ) {
    const current = entity.addressDetails?.toObject?.() || entity.addressDetails || resolveAddressDetails(entity)
    entity.addressDetails = {
      ...current,
      ...parseAddressDetailsFromBody({ ...current, ...body }),
    }
    entity.address = buildFullAddress(entity.addressDetails, entity.neighborhood || body.neighborhood || '')
  } else if (body.address !== undefined) {
    entity.address = body.address
  }

  if (body.neighborhood !== undefined && entity.addressDetails) {
    entity.address = buildFullAddress(entity.addressDetails, entity.neighborhood)
  }

  if (body.description !== undefined) {
    const clean = stripAddressMeta(body.description).description
    entity.description = clean
  }

  return entity
}

function serializeSchoolUnit(entity) {
  const raw = entity?.toObject ? entity.toObject() : { ...entity }
  const addressDetails = resolveAddressDetails(raw)
  return {
    ...raw,
    description: resolveDescription(raw),
    whatsapp: resolveWhatsapp(raw),
    addressDetails,
    fullAddress: buildFullAddress(addressDetails, raw.neighborhood),
    imageUrl: raw.coverImageUrl || raw.logoUrl || '',
  }
}

function isSchoolUnitType(type) {
  return SCHOOL_UNIT_TYPES.includes(type)
}

module.exports = {
  ADDR_META,
  SCHOOL_UNIT_TYPES,
  formatCep,
  buildFullAddress,
  resolveAddressDetails,
  resolveDescription,
  resolveWhatsapp,
  parseAddressDetailsFromBody,
  applySchoolUnitFields,
  serializeSchoolUnit,
  isSchoolUnitType,
  stripAddressMeta,
}
