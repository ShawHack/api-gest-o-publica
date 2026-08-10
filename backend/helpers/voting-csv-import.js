const fs = require('fs')
const path = require('path')
const validateCPF = require('./validate-cpf')
const {
  onlyDigits,
  normalizeMatricula,
  matriculaLookupValues,
  computeCpfHash,
  computeServidorIdentityHash,
  cpfLast4,
} = require('./voting-identity-hash')

const DEFAULT_CSV = path.resolve(__dirname, '../../vota-func/Funcionario.csv')

function parseSemicolonCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ';' && !inQuotes) {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

function parseFuncionarioCsv(content) {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  let headerIdx = lines.findIndex((l) => /matr[ií]cula/i.test(l) && /cpf/i.test(l))
  if (headerIdx < 0) headerIdx = 0

  const headers = parseSemicolonCsvLine(lines[headerIdx]).map((h) =>
    String(h)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  )

  const col = (names) => {
    for (const n of names) {
      const i = headers.findIndex((h) => h.includes(n))
      if (i >= 0) return i
    }
    return -1
  }

  const idxNome = col(['nome'])
  const idxEmpresa = col(['empresa'])
  const idxDepto = col(['departamento'])
  const idxCargo = col(['cargo'])
  const idxMat = col(['matricula'])
  const idxCpf = col(['cpf'])
  const idxWhatsapp = col(['whatsapp', 'celular', 'telefone', 'fone'])

  const rows = []
  const errors = []

  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const parts = parseSemicolonCsvLine(lines[i])
    const nome = idxNome >= 0 ? parts[idxNome] : ''
    const matricula = idxMat >= 0 ? normalizeMatricula(parts[idxMat]) : ''
    const cpf = idxCpf >= 0 ? onlyDigits(parts[idxCpf]) : ''
    const setor = idxDepto >= 0 ? parts[idxDepto] : idxEmpresa >= 0 ? parts[idxEmpresa] : ''
    const cargo = idxCargo >= 0 ? parts[idxCargo] : ''
    const whatsappRaw = idxWhatsapp >= 0 ? parts[idxWhatsapp] : ''
    const whatsapp = String(whatsappRaw || '').replace(/\D/g, '')

    if (!nome && !matricula && !cpf) continue

    if (!matricula) {
      errors.push({ line: i + 1, reason: 'Matrícula ausente', nome })
      continue
    }
    if (!cpf || !validateCPF(cpf)) {
      errors.push({ line: i + 1, reason: 'CPF inválido', matricula, nome })
      continue
    }

    rows.push({
      line: i + 1,
      nome: String(nome || '').trim(),
      matricula,
      cpf,
      setor: String(setor || '').trim(),
      cargo: String(cargo || '').trim(),
      whatsapp: whatsapp.length >= 10 ? whatsapp : '',
      cpfHash: computeCpfHash(cpf),
      cpfLast4: cpfLast4(cpf),
      matriculaHash: computeServidorIdentityHash(cpf, matricula),
    })
  }

  return { rows, errors, headers }
}

async function importVotersFromCsv(VotingServidor, options = {}) {
  const filePath = options.filePath || DEFAULT_CSV
  const content = options.content || fs.readFileSync(filePath, 'utf8')
  const { rows, errors } = parseFuncionarioCsv(content)

  let imported = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const existing = await VotingServidor.findOne({
      matricula: { $in: matriculaLookupValues(row.matricula) },
    })
    if (existing) {
      const sameCpf = existing.cpfHash === row.cpfHash
      if (!sameCpf) {
        errors.push({
          line: row.line,
          reason: 'Matrícula já cadastrada com outro CPF',
          matricula: row.matricula,
        })
        skipped += 1
        continue
      }
      existing.nome = row.nome
      existing.setor = row.setor
      existing.cargoFuncao = row.cargo
      existing.matriculaHash = row.matriculaHash
      existing.cpfLast4 = row.cpfLast4
      existing.active = true
      if (row.whatsapp) {
        existing.whatsapp = row.whatsapp
        existing.whatsappOptIn = true
      }
      await existing.save()
      updated += 1
      continue
    }

    const bcrypt = require('bcrypt')
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(`auto:${Date.now()}:${row.matriculaHash}`, salt)

    try {
      await VotingServidor.create({
        matricula: row.matricula,
        cpfHash: row.cpfHash,
        cpfLast4: row.cpfLast4,
        matriculaHash: row.matriculaHash,
        password: passwordHash,
        nome: row.nome,
        setor: row.setor,
        cargoFuncao: row.cargo,
        whatsapp: row.whatsapp || '',
        whatsappOptIn: true,
        active: true,
      })
      imported += 1
    } catch (e) {
      if (e.code === 11000) {
        skipped += 1
        errors.push({ line: row.line, reason: 'Duplicidade no banco', matricula: row.matricula })
      } else {
        throw e
      }
    }
  }

  return {
    totalRows: rows.length,
    imported,
    updated,
    skipped,
    errors,
  }
}

module.exports = {
  DEFAULT_CSV,
  parseFuncionarioCsv,
  importVotersFromCsv,
}
