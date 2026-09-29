const fs = require('fs')
const path = require('path')
const validateCPF = require('./validate-cpf')
const {
  onlyDigits,
  normalizeMatricula,
  matriculaLookupValues,
  normalizeNomeForLogin,
  computeCpfHash,
  computeServidorIdentityHash,
  computeNomeLoginHash,
  syntheticMatriculaFromNome,
  computeNomeIdentityHash,
  cpfLast4,
} = require('./voting-identity-hash')

const DEFAULT_CSV = path.resolve(__dirname, '../../vota-func/Funcionario.csv')

const PHONE_AT_END =
  /(?:^|[\s\t]+)(\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}|\d{10,13})\s*$/

function normalizeLine(line) {
  return String(line || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .trim()
}

function parseDelimitedCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  const raw = String(line || '')
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]
    if (ch === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        cur += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if ((ch === ';' || ch === ',' || ch === '\t') && !inQuotes) {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

/** Separa nome e telefone: ; , tab, espaços ou telefone no final da linha. */
function splitNomeTelefone(line) {
  const raw = normalizeLine(line)
  if (!raw) return ['', '']

  const parts = parseDelimitedCsvLine(raw).filter((p) => p !== '')
  if (parts.length >= 2) {
    const phone = parts[parts.length - 1]
    const phoneDigits = onlyDigits(phone)
    if (phoneDigits.length >= 10 && phoneDigits.length <= 13) {
      const nome = parts.slice(0, -1).join(' ').trim()
      if (nome.length >= 3) return [nome, phone]
    }
  }

  const m = raw.match(PHONE_AT_END)
  if (m) {
    const phone = m[1]
    const nome = raw.slice(0, m.index).trim()
    if (nome.length >= 3 && onlyDigits(phone).length >= 10) {
      return [nome, phone]
    }
  }

  return [raw, '']
}

function looksLikeNomeTelefoneLine(line) {
  const [nome, phone] = splitNomeTelefone(line)
  return !!(nome && nome.length >= 3 && onlyDigits(phone).length >= 10)
}

function isHeaderNomeTelefone(line) {
  const cells = parseDelimitedCsvLine(line).map((h) =>
    String(h || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim(),
  )
  if (cells.length < 2) {
    const joined = cells.join(' ')
    return /^nome\b/.test(joined) && /(telefone|celular|whatsapp|fone)/.test(joined)
  }
  const hasNome = cells.some((h) => h === 'nome' || h === 'name')
  const hasPhone = cells.some((h) => /(telefone|celular|whatsapp|fone)/.test(h))
  return hasNome && hasPhone
}

function isHeaderLegadoCpf(line) {
  return /matr[ií]cula/i.test(line) && /cpf/i.test(line)
}

function parseFuncionarioCsv(content) {
  const lines = String(content || '')
    .replace(/^\uFEFF/, '')
    .split(/\n/)
    .map(normalizeLine)
    .filter(Boolean)

  if (!lines.length) return { rows: [], errors: [], headers: [], mode: 'empty' }

  let dataStart = 0
  if (isHeaderLegadoCpf(lines[0])) {
    // formato antigo com CPF — tratado abaixo
  } else if (isHeaderNomeTelefone(lines[0])) {
    dataStart = 1
  }

  // Detecta se o conteúdo é nome+telefone (com ou sem cabeçalho)
  const probe = lines.slice(dataStart, dataStart + Math.min(12, lines.length - dataStart))
  const nomeTelHits = probe.filter(looksLikeNomeTelefoneLine).length
  const forceNomeTelefone =
    !isHeaderLegadoCpf(lines[0]) &&
    (nomeTelHits >= Math.max(1, Math.ceil(probe.length * 0.5)) ||
      (probe.length === 0 && looksLikeNomeTelefoneLine(lines[0])))

  const rows = []
  const errors = []
  const seenNome = new Set()

  if (forceNomeTelefone || (isHeaderNomeTelefone(lines[0]) && !isHeaderLegadoCpf(lines[0]))) {
    for (let i = dataStart; i < lines.length; i += 1) {
      if (i === 0 && isHeaderNomeTelefone(lines[i])) continue
      const [nome, whatsappRaw] = splitNomeTelefone(lines[i])
      const whatsapp = onlyDigits(whatsappRaw)

      if (!nome && !whatsapp) continue
      if (!nome || nome.length < 3) {
        errors.push({ line: i + 1, reason: 'Nome ausente ou incompleto', raw: lines[i] })
        continue
      }
      if (whatsapp.length < 10) {
        errors.push({
          line: i + 1,
          reason: 'Telefone inválido (mín. 10 dígitos)',
          nome,
          raw: lines[i],
        })
        continue
      }
      const nomeNorm = normalizeNomeForLogin(nome)
      if (seenNome.has(nomeNorm)) {
        errors.push({ line: i + 1, reason: 'Nome duplicado no arquivo', nome })
        continue
      }
      seenNome.add(nomeNorm)

      const matricula = syntheticMatriculaFromNome(nome, whatsapp)
      rows.push({
        line: i + 1,
        nome,
        matricula,
        cpf: '',
        setor: '',
        cargo: '',
        whatsapp,
        cpfHash: computeNomeLoginHash(nome),
        cpfLast4: whatsapp.slice(-4),
        matriculaHash: computeNomeIdentityHash(nome, whatsapp),
        identityMode: 'nome',
      })
    }

    return {
      rows,
      errors,
      headers: ['nome', 'telefone'],
      mode: 'nome_telefone',
    }
  }

  // Legado: Nome;Empresa;...;Matrícula;CPF
  let headerIdx = lines.findIndex(isHeaderLegadoCpf)
  if (headerIdx < 0) headerIdx = 0
  const headers = parseDelimitedCsvLine(lines[headerIdx]).map((h) =>
    String(h || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim(),
  )
  const col = (names) => {
    for (const n of names) {
      const i = headers.findIndex((h) => h === n || h.includes(n))
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

  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    // Se a linha for claramente nome+telefone, aceita mesmo no fluxo legado
    if (looksLikeNomeTelefoneLine(lines[i])) {
      const [nome, whatsappRaw] = splitNomeTelefone(lines[i])
      const whatsapp = onlyDigits(whatsappRaw)
      const nomeNorm = normalizeNomeForLogin(nome)
      if (seenNome.has(nomeNorm)) {
        errors.push({ line: i + 1, reason: 'Nome duplicado no arquivo', nome })
        continue
      }
      seenNome.add(nomeNorm)
      const matricula = syntheticMatriculaFromNome(nome, whatsapp)
      rows.push({
        line: i + 1,
        nome,
        matricula,
        cpf: '',
        setor: '',
        cargo: '',
        whatsapp,
        cpfHash: computeNomeLoginHash(nome),
        cpfLast4: whatsapp.slice(-4),
        matriculaHash: computeNomeIdentityHash(nome, whatsapp),
        identityMode: 'nome',
      })
      continue
    }

    const parts = parseDelimitedCsvLine(lines[i])
    const nome = String(idxNome >= 0 ? parts[idxNome] || '' : '').trim()
    const whatsappRaw = idxWhatsapp >= 0 ? parts[idxWhatsapp] : ''
    const whatsapp = onlyDigits(whatsappRaw)
    const matricula = idxMat >= 0 ? normalizeMatricula(parts[idxMat]) : ''
    const cpf = idxCpf >= 0 ? onlyDigits(parts[idxCpf]) : ''
    const setor = idxDepto >= 0 ? parts[idxDepto] : idxEmpresa >= 0 ? parts[idxEmpresa] : ''
    const cargo = idxCargo >= 0 ? parts[idxCargo] : ''

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
      identityMode: 'cpf',
    })
  }

  return {
    rows,
    errors,
    headers,
    mode: rows.some((r) => r.identityMode === 'nome') ? 'nome_telefone' : 'legado_cpf',
  }
}

async function importVotersFromCsv(VotingServidor, options = {}) {
  const filePath = options.filePath || DEFAULT_CSV
  let content = options.content
  if (content == null || !String(content).trim()) {
    if (options.allowFileFallback && fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8')
    } else {
      const err = new Error('CSV vazio ou nao enviado. Cole o conteudo no campo e tente novamente.')
      err.statusCode = 400
      err.code = 'CSV_REQUIRED'
      throw err
    }
  }
  const { rows, errors, mode } = parseFuncionarioCsv(content)
  if (!rows.length && !errors.length) {
    const err = new Error(
      'Nenhuma linha valida encontrada. Use Nome e Telefone (separador ; , tab ou espaço).',
    )
    err.statusCode = 400
    err.code = 'CSV_EMPTY_ROWS'
    throw err
  }

  let deactivated = 0
  const replace = options.replace !== false
  if (replace) {
    const result = await VotingServidor.updateMany(
      { active: { $ne: false } },
      { $set: { active: false } },
    )
    deactivated = result.modifiedCount || result.nModified || 0
  }

  const hashes = rows.map((r) => r.cpfHash).filter(Boolean)
  const mats = rows.map((r) => r.matricula).filter(Boolean)
  const existingDocs = await VotingServidor.find({
    $or: [
      ...(hashes.length ? [{ cpfHash: { $in: hashes } }] : []),
      ...(mats.length ? [{ matricula: { $in: mats } }] : []),
    ],
  })

  const byCpfHash = new Map()
  const byMatricula = new Map()
  for (const doc of existingDocs) {
    if (doc.cpfHash) byCpfHash.set(doc.cpfHash, doc)
    if (doc.matricula) byMatricula.set(String(doc.matricula), doc)
  }

  const bcrypt = require('bcrypt')
  // Senha automática compartilhada — login do eleitor é por nome, não por senha.
  const sharedPasswordHash = await bcrypt.hash(`auto-import:${Date.now()}`, 4)

  const bulk = []
  let imported = 0
  let updated = 0
  let skipped = 0
  const usedIds = new Set()

  for (const row of rows) {
    let existing = byCpfHash.get(row.cpfHash) || byMatricula.get(String(row.matricula))
    if (existing && usedIds.has(String(existing._id))) {
      existing = null
    }

    if (existing) {
      const sameIdentity =
        existing.cpfHash === row.cpfHash || existing.matriculaHash === row.matriculaHash
      if (!sameIdentity && existing.matricula === row.matricula && existing.cpfHash !== row.cpfHash) {
        errors.push({
          line: row.line,
          reason: 'Matrícula já cadastrada com outra identidade',
          matricula: row.matricula,
        })
        skipped += 1
        continue
      }
      usedIds.add(String(existing._id))
      bulk.push({
        updateOne: {
          filter: { _id: existing._id },
          update: {
            $set: {
              nome: row.nome,
              setor: row.setor,
              cargoFuncao: row.cargo,
              matricula: row.matricula,
              matriculaHash: row.matriculaHash,
              cpfHash: row.cpfHash,
              cpfLast4: row.cpfLast4,
              active: true,
              ...(row.whatsapp
                ? { whatsapp: row.whatsapp, whatsappOptIn: true }
                : {}),
            },
          },
        },
      })
      updated += 1
      continue
    }

    bulk.push({
      insertOne: {
        document: {
          matricula: row.matricula,
          cpfHash: row.cpfHash,
          cpfLast4: row.cpfLast4,
          matriculaHash: row.matriculaHash,
          password: sharedPasswordHash,
          nome: row.nome,
          setor: row.setor,
          cargoFuncao: row.cargo,
          whatsapp: row.whatsapp || '',
          whatsappOptIn: true,
          active: true,
        },
      },
    })
    imported += 1
  }

  if (bulk.length) {
    try {
      await VotingServidor.bulkWrite(bulk, { ordered: false })
    } catch (e) {
      if (e.code !== 11000 && e.name !== 'MongoBulkWriteError') throw e
      const writeErrors = e.writeErrors || e.result?.getWriteErrors?.() || []
      skipped += writeErrors.length || 0
      for (const we of writeErrors) {
        errors.push({
          line: null,
          reason: 'Duplicidade no banco',
          detail: we?.errmsg || String(we),
        })
      }
      // Contagens aproximadas quando há conflito parcial
      const ok = (e.result && (e.result.nInserted + e.result.nModified)) || 0
      if (ok && imported + updated > ok) {
        const diff = imported + updated - ok
        skipped += diff
        imported = Math.max(0, imported - diff)
      }
    }
  }

  const activeAfter = await VotingServidor.countDocuments({ active: { $ne: false } })

  return {
    mode,
    replace,
    deactivated,
    totalRows: rows.length,
    imported,
    updated,
    skipped,
    errors,
    activeAfter,
  }
}

module.exports = {
  DEFAULT_CSV,
  parseFuncionarioCsv,
  importVotersFromCsv,
  splitNomeTelefone,
}
