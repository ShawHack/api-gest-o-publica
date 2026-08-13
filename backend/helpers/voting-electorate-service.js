const validateCPF = require('./validate-cpf')
const { onlyDigits, computeCpfHash, cpfLast4, normalizeNomeForLogin } = require('./voting-identity-hash')
const VotingServidor = require('../models/VotingServidor')
const VotingElector = require('../models/VotingElector')

function normalizeHeader(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function detectDelimiter(line) {
  return (String(line).match(/;/g) || []).length >= (String(line).match(/,/g) || []).length ? ';' : ','
}

function parseLine(line, delimiter) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i += 1 }
      else quoted = !quoted
    } else if (ch === delimiter && !quoted) { out.push(cur.trim()); cur = '' }
    else cur += ch
  }
  out.push(cur.trim())
  return out
}

function parseElectorCsv(content) {
  const lines = String(content || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { rows: [], errors: [{ line: 1, reason: 'Arquivo vazio' }] }
  const delimiter = detectDelimiter(lines[0])
  const headers = parseLine(lines[0], delimiter).map(normalizeHeader)
  const index = (...names) => headers.findIndex((h) => names.some((n) => h === n || h.includes(n)))
  const idxName = index('nome', 'name')
  const idxCpf = index('cpf')
  const idxIdentifier = index('identificador', 'matricula', 'codigo', 'id')
  const idxEmail = index('email', 'e-mail')
  const idxPhone = index('telefone', 'celular', 'whatsapp')
  const idxGroup = index('grupo', 'setor', 'entidade')
  const idxRole = index('cargo', 'funcao')
  if (idxName < 0 || idxCpf < 0) {
    return { rows: [], errors: [{ line: 1, reason: 'Cabeçalho deve conter Nome e CPF' }] }
  }
  const rows = []
  const errors = []
  const seenCpf = new Set()
  const seenId = new Set()
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseLine(lines[i], delimiter)
    const name = String(cols[idxName] || '').trim()
    const cpf = onlyDigits(cols[idxCpf])
    const identifier = String((idxIdentifier >= 0 ? cols[idxIdentifier] : '') || cpfLast4(cpf)).trim()
    if (!name || !cpf || !validateCPF(cpf)) {
      errors.push({ line: i + 1, reason: !name ? 'Nome ausente' : 'CPF inválido' }); continue
    }
    const cpfHash = computeCpfHash(cpf)
    if (seenCpf.has(cpfHash) || seenId.has(identifier)) {
      errors.push({ line: i + 1, reason: 'CPF ou identificador duplicado no arquivo' }); continue
    }
    seenCpf.add(cpfHash); seenId.add(identifier)
    rows.push({
      line: i + 1, name, identifier, cpfHash, cpfLast4: cpfLast4(cpf),
      identityHash: computeCpfHash(`${cpf}|${identifier}`),
      email: idxEmail >= 0 ? String(cols[idxEmail] || '').trim().toLowerCase() : '',
      phone: idxPhone >= 0 ? onlyDigits(cols[idxPhone]) : '',
      group: idxGroup >= 0 ? String(cols[idxGroup] || '').trim() : '',
      role: idxRole >= 0 ? String(cols[idxRole] || '').trim() : '',
    })
  }
  return { rows, errors }
}

async function findEligibleVoter(votation, { cpf, name, identifier } = {}) {
  const cpfClean = onlyDigits(cpf)
  if (!cpfClean || !validateCPF(cpfClean)) return null
  const cpfHash = computeCpfHash(cpfClean)
  if (!votation.electorateBaseId) {
    const rows = await VotingServidor.find({ cpfHash, active: { $ne: false } })
    return rows.find((d) => !name || normalizeNomeForLogin(d.nome) === normalizeNomeForLogin(name)) || null
  }
  const query = { electorateBaseId: votation.electorateBaseId, cpfHash, active: { $ne: false } }
  if (identifier) query.identifier = String(identifier).trim()
  const rows = await VotingElector.find(query)
  return rows.find((d) => !name || normalizeNomeForLogin(d.name) === normalizeNomeForLogin(name)) || null
}

module.exports = { parseElectorCsv, findEligibleVoter }
