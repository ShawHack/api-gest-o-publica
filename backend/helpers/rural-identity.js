const { onlyDigits, computeCpfHash, cpfLast4 } = require('./voting-identity-hash')

function normalizePlusCode(value) {
  const raw = String(value || '').trim().toUpperCase()
  const alphabet = '23456789CFGHJMPQRVWX'
  const globalCode = new RegExp(`[${alphabet}]{4}\\s?[${alphabet}]{4}\\s*\\+\\s*[${alphabet}]{2,}`)
  const shortCode = new RegExp(`[${alphabet}]{2,6}\\s*\\+\\s*[${alphabet}]{2,}`)
  const match = raw.match(globalCode) || raw.match(shortCode)
  return (match?.[0] || raw).replace(/\s+/g, '')
}

function isPlausiblePlusCode(value) {
  return /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,}$/.test(
    normalizePlusCode(value),
  )
}

function normalizeCpf(value) {
  return onlyDigits(value)
}

function isValidCpf(value) {
  const cpf = normalizeCpf(value)
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = (length) => {
    let sum = 0
    for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

function ruralCpfIdentity(value) {
  const cpf = normalizeCpf(value)
  return { cpfHash: computeCpfHash(cpf), cpfLast4: cpfLast4(cpf) }
}

module.exports = {
  normalizePlusCode,
  isPlausiblePlusCode,
  normalizeCpf,
  isValidCpf,
  ruralCpfIdentity,
}
