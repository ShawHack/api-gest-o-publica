const validateCPF = require('./validate-cpf')
const {
  onlyDigits,
  computeCpfHash,
  computeNomeLoginHash,
  cpfLast4,
  normalizeNomeForLogin,
  syntheticMatriculaFromNome,
  computeNomeIdentityHash,
} = require('./voting-identity-hash')
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
  let headers = parseLine(lines[0], delimiter).map(normalizeHeader)
  const index = (...names) => headers.findIndex((h) => names.some((n) => h === n || h.includes(n)))
  let idxName = index('nome', 'name')
  let idxCpf = index('cpf')
  let idxIdentifier = index('identificador', 'matricula', 'codigo', 'id')
  let idxEmail = index('email', 'e-mail')
  let idxPhone = index('telefone', 'celular', 'whatsapp')
  let idxGroup = index('grupo', 'setor', 'entidade')
  let idxRole = index('cargo', 'funcao')

  let dataStart = 1
  const firstParts = parseLine(lines[0], delimiter)
  const headerLooksLikeData =
    idxName < 0 &&
    idxCpf < 0 &&
    firstParts.length >= 2 &&
    onlyDigits(firstParts[1]).length >= 10

  if (headerLooksLikeData) {
    idxName = 0
    idxPhone = 1
    dataStart = 0
    headers = ['nome', 'telefone']
  }

  const nomeTelefoneMode = idxName >= 0 && idxPhone >= 0 && idxCpf < 0
  if (!nomeTelefoneMode && (idxName < 0 || idxCpf < 0)) {
    return {
      rows: [],
      errors: [{ line: 1, reason: 'Cabeçalho deve conter Nome e Telefone (ou Nome e CPF no formato legado)' }],
    }
  }

  const rows = []
  const errors = []
  const seenKey = new Set()
  const seenId = new Set()

  for (let i = dataStart; i < lines.length; i += 1) {
    const cols = parseLine(lines[i], delimiter)
    const name = String(cols[idxName] || '').trim()
    const phone = idxPhone >= 0 ? onlyDigits(cols[idxPhone]) : ''

    if (nomeTelefoneMode) {
      if (!name && !phone) continue
      if (!name || name.length < 3) {
        errors.push({ line: i + 1, reason: 'Nome ausente ou incompleto' })
        continue
      }
      if (phone.length < 10) {
        errors.push({ line: i + 1, reason: 'Telefone inválido (mín. 10 dígitos)' })
        continue
      }
      const cpfHash = computeNomeLoginHash(name)
      const identifier = String(
        (idxIdentifier >= 0 ? cols[idxIdentifier] : '') || syntheticMatriculaFromNome(name, phone),
      ).trim()
      if (seenKey.has(cpfHash) || seenId.has(identifier)) {
        errors.push({ line: i + 1, reason: 'Nome ou identificador duplicado no arquivo' })
        continue
      }
      seenKey.add(cpfHash)
      seenId.add(identifier)
      rows.push({
        line: i + 1,
        name,
        identifier,
        cpfHash,
        cpfLast4: phone.slice(-4),
        identityHash: computeNomeIdentityHash(name, phone),
        email: idxEmail >= 0 ? String(cols[idxEmail] || '').trim().toLowerCase() : '',
        phone,
        group: idxGroup >= 0 ? String(cols[idxGroup] || '').trim() : '',
        role: idxRole >= 0 ? String(cols[idxRole] || '').trim() : '',
      })
      continue
    }

    const cpf = onlyDigits(cols[idxCpf])
    const identifier = String((idxIdentifier >= 0 ? cols[idxIdentifier] : '') || cpfLast4(cpf)).trim()
    if (!name || !cpf || !validateCPF(cpf)) {
      errors.push({ line: i + 1, reason: !name ? 'Nome ausente' : 'CPF inválido' })
      continue
    }
    const cpfHash = computeCpfHash(cpf)
    if (seenKey.has(cpfHash) || seenId.has(identifier)) {
      errors.push({ line: i + 1, reason: 'CPF ou identificador duplicado no arquivo' })
      continue
    }
    seenKey.add(cpfHash)
    seenId.add(identifier)
    rows.push({
      line: i + 1,
      name,
      identifier,
      cpfHash,
      cpfLast4: cpfLast4(cpf),
      identityHash: computeCpfHash(`${cpf}|${identifier}`),
      email: idxEmail >= 0 ? String(cols[idxEmail] || '').trim().toLowerCase() : '',
      phone: idxPhone >= 0 ? onlyDigits(cols[idxPhone]) : '',
      group: idxGroup >= 0 ? String(cols[idxGroup] || '').trim() : '',
      role: idxRole >= 0 ? String(cols[idxRole] || '').trim() : '',
    })
  }
  return { rows, errors }
}

async function findEligibleVoter(votation, { cpf, name, identifier, phone } = {}) {
  const nomeNorm = normalizeNomeForLogin(name)
  const cpfClean = onlyDigits(cpf)
  const hasValidCpf = !!(cpfClean && validateCPF(cpfClean))

  // Acesso por nome (substitui CPF)
  if (nomeNorm && !hasValidCpf) {
    const nomeHash = computeNomeLoginHash(name)
    if (!votation.electorateBaseId) {
      let doc = await VotingServidor.findOne({ cpfHash: nomeHash, active: { $ne: false } })
      if (!doc) {
        const phoneDigits = onlyDigits(phone)
        if (phoneDigits.length >= 10) {
          doc = await VotingServidor.findOne({
            whatsapp: phoneDigits,
            active: { $ne: false },
          })
          if (doc && normalizeNomeForLogin(doc.nome) !== nomeNorm) doc = null
        }
      }
      return doc || null
    }

    let doc = await VotingElector.findOne({
      electorateBaseId: votation.electorateBaseId,
      cpfHash: nomeHash,
      active: { $ne: false },
    })
    if (!doc && identifier) {
      doc = await VotingElector.findOne({
        electorateBaseId: votation.electorateBaseId,
        identifier: String(identifier).trim(),
        active: { $ne: false },
      })
      if (doc && normalizeNomeForLogin(doc.name) !== nomeNorm) doc = null
    }
    return doc || null
  }

  if (!hasValidCpf) return null
  const cpfHash = computeCpfHash(cpfClean)
  if (!votation.electorateBaseId) {
    const rows = await VotingServidor.find({ cpfHash, active: { $ne: false } })
    return rows.find((d) => !name || normalizeNomeForLogin(d.nome) === nomeNorm) || null
  }
  const query = { electorateBaseId: votation.electorateBaseId, cpfHash, active: { $ne: false } }
  if (identifier) query.identifier = String(identifier).trim()
  const rows = await VotingElector.find(query)
  return rows.find((d) => !name || normalizeNomeForLogin(d.name) === nomeNorm) || null
}

function accentInsensitivePattern(value) {
  const groups = {
    a: '[aáàâãä]',
    e: '[eéèêë]',
    i: '[iíìîï]',
    o: '[oóòôõö]',
    u: '[uúùûü]',
    c: '[cç]',
  }
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split('')
    .map((ch) => {
      const g = groups[ch.toLowerCase()]
      if (g) return g
      return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('')
}

/**
 * Sugestões públicas de nome completo (autocomplete).
 * Retorna apenas nomes — sem telefone/CPF.
 */
async function suggestVoterNames(votation, q, { limit = 8 } = {}) {
  const raw = String(q || '').trim()
  if (raw.length < 2) return []
  const pattern = accentInsensitivePattern(raw)
  if (!pattern) return []
  const regex = new RegExp(pattern, 'i')
  const max = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 15)

  if (votation?.electorateBaseId) {
    const rows = await VotingElector.find({
      electorateBaseId: votation.electorateBaseId,
      active: { $ne: false },
      name: regex,
    })
      .select({ name: 1 })
      .sort({ name: 1 })
      .limit(max)
      .lean()
    return [...new Set(rows.map((r) => String(r.name || '').trim()).filter(Boolean))]
  }

  const rows = await VotingServidor.find({
    active: { $ne: false },
    nome: regex,
  })
    .select({ nome: 1 })
    .sort({ nome: 1 })
    .limit(max)
    .lean()
  return [...new Set(rows.map((r) => String(r.nome || '').trim()).filter(Boolean))]
}

module.exports = { parseElectorCsv, findEligibleVoter, suggestVoterNames }
