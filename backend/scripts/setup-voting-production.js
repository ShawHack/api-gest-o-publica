#!/usr/bin/env node
/**
 * Importa eleitores, cria pleito inicial (rascunho → ativo) e categorias/candidatos de exemplo.
 * Uso: node scripts/setup-voting-production.js [caminho.csv]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('../db/conn')
const Votation = require('../models/Votation')
const VotingCategory = require('../models/VotingCategory')
const VotingCandidate = require('../models/VotingCandidate')
const VotingServidor = require('../models/VotingServidor')
const { importVotersFromCsv, DEFAULT_CSV } = require('../helpers/voting-csv-import')

const PLEITO = {
  title: 'Eleição Interna — Servidores Municipais 2026',
  description:
    'Consulta eletrônica para servidores da Prefeitura. Valide matrícula e CPF para acessar a cédula.',
  daysOpen: 30,
}

const CATEGORIES = [
  {
    name: 'Administrador',
    description: 'Cargo de Administrador',
    order: 1,
    candidates: [
      { number: 10, name: 'Candidato Administrador 1' },
      { number: 11, name: 'Candidato Administrador 2' },
    ],
  },
  {
    name: 'Secretário',
    description: 'Cargo de Secretário',
    order: 2,
    candidates: [
      { number: 20, name: 'Candidato Secretário 1' },
      { number: 21, name: 'Candidato Secretário 2' },
    ],
  },
  {
    name: 'Diretor',
    description: 'Cargo de Diretor',
    order: 3,
    candidates: [
      { number: 30, name: 'Candidato Diretor 1' },
      { number: 31, name: 'Candidato Diretor 2' },
    ],
  },
]

async function ensurePleito() {
  let vot = await Votation.findOne({ title: PLEITO.title })
  const now = Date.now()
  const start = new Date(now - 60 * 60 * 1000)
  const end = new Date(now + PLEITO.daysOpen * 24 * 60 * 60 * 1000)

  if (!vot) {
    vot = await Votation.create({
      title: PLEITO.title,
      description: PLEITO.description,
      startDate: start,
      endDate: end,
      status: 'draft',
      allowPartialResults: true,
    })
    console.log('[pleito] Criado:', vot._id.toString())
  } else {
    console.log('[pleito] Já existe:', vot._id.toString(), `status=${vot.status}`)
  }

  for (const catDef of CATEGORIES) {
    let cat = await VotingCategory.findOne({ votationId: vot._id, name: catDef.name })
    if (!cat) {
      cat = await VotingCategory.create({
        votationId: vot._id,
        name: catDef.name,
        description: catDef.description,
        order: catDef.order,
        active: true,
      })
      console.log('[categoria] Criada:', cat.name)
    }

    for (const candDef of catDef.candidates) {
      const exists = await VotingCandidate.findOne({
        votationId: vot._id,
        categoryId: cat._id,
        number: candDef.number,
      })
      if (!exists) {
        await VotingCandidate.create({
          votationId: vot._id,
          categoryId: cat._id,
          candidateId: `v2-${cat._id}-n${candDef.number}`,
          number: candDef.number,
          name: candDef.name,
          active: true,
        })
        console.log('[candidato]', cat.name, candDef.number, candDef.name)
      }
    }
  }

  if (vot.status !== 'active') {
    console.log('[pleito] Mantido em rascunho — ative manualmente pelo admin quando estiver pronto.')
  }

  return vot
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI não configurado.')
  await mongoose.connect(uri)

  const filePath = process.argv[2] || DEFAULT_CSV
  console.log('=== Setup votação — produção ===')
  console.log('CSV:', filePath)

  const importResult = await importVotersFromCsv(VotingServidor, { filePath })
  console.log('[import]', JSON.stringify({
    totalRows: importResult.totalRows,
    imported: importResult.imported,
    updated: importResult.updated,
    skipped: importResult.skipped,
    errors: importResult.errors.length,
  }))

  const vot = await ensurePleito()
  const voters = await VotingServidor.countDocuments({ active: { $ne: false } })
  const cats = await VotingCategory.countDocuments({ votationId: vot._id })
  const cands = await VotingCandidate.countDocuments({ votationId: vot._id })

  console.log('=== Resumo ===')
  console.log({
    pleitoId: vot._id.toString(),
    status: vot.status,
    eleitoresAtivos: voters,
    categorias: cats,
    candidatos: cands,
    portalEleitor: '/votacao/',
    portalAdmin: '/votacao/admin.html',
  })

  if (importResult.errors.length) {
    console.log('Primeiros erros de importação:', importResult.errors.slice(0, 5))
  }

  await mongoose.connection.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
