const {
  ALLOWED_TRANSITIONS,
  SPECIES_OPTIONS,
  SEX_OPTIONS,
} = require('./castration-constants')

function normalizeBool(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === '1' || value === 1) return true
  if (value === 'false' || value === '0' || value === 0) return false
  return fallback
}

function buildApplicantSnapshot(user) {
  const cpf = user.cpf_cnpj || user.cpf || ''
  return {
    name: user.name || '',
    cpf,
    phone: user.phone || '',
    whatsapp: user.whatsapp || user.phone || '',
    email: user.email || '',
    city: user.city || '',
    address: user.address || '',
  }
}

function validateAnimal(raw, index) {
  const errors = []
  const label = `Animal ${index + 1}`
  const species = String(raw?.species || '').trim().toLowerCase()
  if (!SPECIES_OPTIONS.includes(species)) {
    errors.push(`${label}: espécie inválida.`)
  }
  const speciesOther = String(raw?.speciesOther || '').trim()
  if (species === 'outro' && !speciesOther) {
    errors.push(`${label}: especifique a espécie.`)
  }
  const birthYearOrAge = String(raw?.birthYearOrAge || '').trim()
  if (!birthYearOrAge) errors.push(`${label}: informe idade ou ano de nascimento.`)
  const weightKg = Number(raw?.weightKg)
  if (!Number.isFinite(weightKg) || weightKg < 0) errors.push(`${label}: peso inválido.`)
  const breed = String(raw?.breed || '').trim()
  if (!breed) errors.push(`${label}: raça obrigatória.`)
  const sex = String(raw?.sex || '').trim().toLowerCase()
  if (!SEX_OPTIONS.includes(sex)) errors.push(`${label}: sexo inválido.`)
  if (raw?.previouslyCastrated === undefined) {
    errors.push(`${label}: informe se já foi castrado.`)
  }

  return {
    errors,
    animal: {
      species,
      speciesOther: species === 'outro' ? speciesOther : '',
      name: String(raw?.name || '').trim(),
      birthYearOrAge,
      weightKg,
      breed,
      sex,
      previouslyCastrated: normalizeBool(raw?.previouslyCastrated),
      notes: String(raw?.notes || '').trim(),
      isCommunityAnimal: normalizeBool(raw?.isCommunityAnimal),
      hasGuardian: normalizeBool(raw?.hasGuardian, true),
      isPregnant: sex === 'femea' ? normalizeBool(raw?.isPregnant) : false,
      inHeat: sex === 'femea' ? normalizeBool(raw?.inHeat) : false,
      hasDiseases: normalizeBool(raw?.hasDiseases),
      diseasesDetail: normalizeBool(raw?.hasDiseases) ? String(raw?.diseasesDetail || '').trim() : '',
      onContinuousMedication: normalizeBool(raw?.onContinuousMedication),
      medicationDetail: normalizeBool(raw?.onContinuousMedication)
        ? String(raw?.medicationDetail || '').trim()
        : '',
      isAggressive: normalizeBool(raw?.isAggressive),
    },
  }
}

function validateAnimals(animals) {
  if (!Array.isArray(animals) || animals.length < 1) {
    return { errors: ['Informe ao menos um animal.'], normalized: [] }
  }
  if (animals.length > 20) {
    return { errors: ['Máximo de 20 animais por solicitação.'], normalized: [] }
  }
  const allErrors = []
  const normalized = []
  animals.forEach((raw, idx) => {
    const { errors, animal } = validateAnimal(raw, idx)
    allErrors.push(...errors)
    normalized.push(animal)
  })
  return { errors: allErrors, normalized }
}

function canTransition(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || []
  return allowed.includes(toStatus)
}

function parseClientMeta(req) {
  return {
    app: req.headers['x-client-app'] || '',
    platform: req.headers['x-client-platform'] || '',
    version: req.headers['x-client-version'] || '',
    screen: req.headers['x-screen-id'] || '',
    requestId: req.headers['x-request-id'] || '',
  }
}

module.exports = {
  buildApplicantSnapshot,
  validateAnimals,
  canTransition,
  parseClientMeta,
}
