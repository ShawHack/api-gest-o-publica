/**
 * Identidade anonimizada para voto e login (servidor público).
 * HMAC-SHA256 com segredo do servidor (pepper) — não armazenar matrícula em texto puro.
 * O mesmo valor é usado como user_hash em `votes` e como matriculaHash em `VotingServidor`.
 */
const crypto = require('crypto')

function onlyDigits(s) {
  return String(s || '').replace(/\D/g, '')
}

function normalizeMatricula(s) {
  const raw = String(s || '').trim().toUpperCase()
  const digits = onlyDigits(raw)
  if (digits && digits === raw.replace(/\s/g, '')) {
    return String(parseInt(digits, 10))
  }
  return raw
}

/** Comparação tolerante para login (maiúsculas, acentos e espaços). */
function normalizeNomeForLogin(s) {
  return String(s || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/** Valores equivalentes para busca (ex.: 39832 e 039832). */
function matriculaLookupValues(s) {
  const canonical = normalizeMatricula(s)
  const digits = onlyDigits(canonical)
  if (!digits) return [canonical]

  const set = new Set([canonical, digits])
  for (let len = digits.length; len <= Math.max(6, digits.length + 2); len += 1) {
    set.add(digits.padStart(len, '0'))
  }
  return [...set]
}

/**
 * Hash estável por pessoa (CPF + matrícula). Nunca logar em claro.
 */
function votingPepper(kind) {
  if (kind === 'cpf') {
    return (
      process.env.VOTACAO_CPF_PEPPER ||
      process.env.VOTACAO_MATRICULA_PEPPER ||
      process.env.JWT_SECRET ||
      'votacao-dev-pepper-defina-env'
    )
  }
  return (
    process.env.VOTACAO_MATRICULA_PEPPER ||
    process.env.JWT_SECRET ||
    'votacao-dev-pepper-defina-env'
  )
}

function computeServidorIdentityHash(cpf, matricula) {
  const cpfClean = onlyDigits(cpf)
  const mat = normalizeMatricula(matricula)
  return crypto.createHmac('sha256', votingPepper('matricula')).update(`${cpfClean}|${mat}`).digest('hex')
}

/** Hash irreversível do CPF para busca/login (LGPD — não armazenar CPF em claro). */
function computeCpfHash(cpf) {
  const cpfClean = onlyDigits(cpf)
  if (!cpfClean) return ''
  return crypto.createHmac('sha256', votingPepper('cpf')).update(cpfClean).digest('hex')
}

function cpfLast4(cpf) {
  const d = onlyDigits(cpf)
  return d.length >= 4 ? d.slice(-4) : ''
}

function maskCpfDisplay(doc) {
  const last4 = doc?.cpfLast4 || cpfLast4(doc?.cpf) || '????'
  return `***.***.***-${last4}`
}

async function findServidorByCpf(VotingServidor, cpfClean) {
  const cpfHash = computeCpfHash(cpfClean)
  return VotingServidor.findOne({
    $or: [{ cpfHash }, { cpf: cpfClean }],
  })
}

module.exports = {
  onlyDigits,
  normalizeMatricula,
  normalizeNomeForLogin,
  matriculaLookupValues,
  computeServidorIdentityHash,
  computeCpfHash,
  cpfLast4,
  maskCpfDisplay,
  findServidorByCpf,
}
