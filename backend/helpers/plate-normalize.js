/** Normaliza placa BR: remove máscara/espaços, maiúsculas. */
function normalizePlate(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function isValidPlate(normalized) {
  // Mercosul AAA0A00 ou antigo AAA0000
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalized)
}

module.exports = { normalizePlate, isValidPlate }
