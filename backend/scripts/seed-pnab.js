#!/usr/bin/env node
/**
 * Seed inicial do módulo PNAB (anos e programas).
 *
 * Uso:
 *   cd backend && node scripts/seed-pnab.js
 *
 * Requer MONGODB_URI ou MONGO_URI apontando para o MongoDB acessível
 * (em máquina local, use mongodb://127.0.0.1:27017/semit se mongo:27017 não resolver).
 */
require('dotenv').config()
const mongoose = require('mongoose')

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/apicemiterio'

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
  } catch (err) {
    if (String(err.message || '').includes('ENOTFOUND mongo')) {
      console.error('[seed-pnab] Não foi possível resolver o host "mongo".')
      console.error('  Esse hostname só funciona dentro da rede Docker.')
      console.error('  Opções:')
      console.error('    docker compose exec api node scripts/seed-pnab.js')
      console.error('    MONGO_URI=mongodb://127.0.0.1:27019/semit node backend/scripts/seed-pnab.js')
    }
    throw err
  }

  console.log('[seed-pnab] Conectado ao MongoDB.')

  const PnabYear = require('../models/PnabYear')
  const PnabProgram = require('../models/PnabProgram')
  const PnabCycle = require('../models/PnabCycle')
  const PnabCycleArea = require('../models/PnabCycleArea')
  const { DEFAULT_CYCLE_AREAS } = require('../helpers/pnab-cycle-defaults')

  const yearsToSeed = [
    { nome: '2024', descricao: 'Exercício fiscal e editais de fomento PNAB referente ao ano de 2024.', status: 'ativo', ordem: 2 },
    { nome: '2025', descricao: 'Exercício fiscal e editais de fomento PNAB referente ao ano de 2025.', status: 'ativo', ordem: 1 },
    { nome: '2026', descricao: 'Exercício fiscal planejado para 2026.', status: 'inativo', ordem: 3 },
  ]

  for (const year of yearsToSeed) {
    const exists = await PnabYear.findOne({ nome: year.nome })
    if (!exists) {
      await new PnabYear(year).save()
      console.log(`Ano ${year.nome} inserido.`)
    } else {
      console.log(`Ano ${year.nome} já existe.`)
    }
  }

  const programsToSeed = [
    { nome: 'PNAB', descricao: 'Política Nacional Aldir Blanc de Fomento à Cultura.' },
    { nome: 'Lei Aldir Blanc', descricao: 'Ações e editais referentes à Lei de Emergência Cultural Aldir Blanc.' },
    { nome: 'Cultura Viva', descricao: 'Fomento a Pontos e Pontões de Cultura.' },
  ]

  for (const prog of programsToSeed) {
    const exists = await PnabProgram.findOne({ nome: prog.nome })
    if (!exists) {
      await new PnabProgram(prog).save()
      console.log(`Programa ${prog.nome} inserido.`)
    } else {
      console.log(`Programa ${prog.nome} já existe.`)
    }
  }

  const cyclesToSeed = [
    {
      codigo: 1,
      nome: 'Ciclo 1',
      subtitulo: 'Repasses 2023–2024',
      descricao:
        'Primeiro ciclo de execução e repasse da PNAB, com obrigações próprias de plano, editais, execução e prestação de contas.',
      anosAbrangidos: ['2023', '2024'],
      status: 'prestacao_contas',
      ordem: 1,
      ativo: true,
      requisitosProximoCiclo:
        'Para receber recursos do ciclo seguinte, o ente deve executar ao menos 60% dos recursos do ciclo anterior e comprovar investimento próprio em cultura, conforme regulamentação vigente.',
    },
    {
      codigo: 2,
      nome: 'Ciclo 2',
      subtitulo: 'Iniciado em 2025 — Decreto nº 12.409/2025',
      descricao:
        'Ciclo contínuo de execução com novas regras de adesão e execução. Maior flexibilidade aos entes federativos na utilização dos recursos.',
      anosAbrangidos: ['2025', '2026'],
      decretoReferencia: 'Decreto nº 12.409/2025',
      status: 'em_execucao',
      ordem: 2,
      ativo: true,
      requisitosProximoCiclo:
        'Cumprimento dos requisitos mínimos de execução e investimento próprio previstos na regulamentação do ciclo.',
    },
  ]

  for (const c of cyclesToSeed) {
    let ciclo = await PnabCycle.findOne({ codigo: c.codigo, deleted: { $ne: true } })
    if (!ciclo) {
      ciclo = await new PnabCycle(c).save()
      console.log(`Ciclo ${c.codigo} inserido.`)
    } else {
      console.log(`Ciclo ${c.codigo} já existe.`)
    }

    const areaCount = await PnabCycleArea.countDocuments({ ciclo: ciclo._id, deleted: false })
    if (areaCount === 0) {
      for (const area of DEFAULT_CYCLE_AREAS) {
        await PnabCycleArea.create({
          ciclo: ciclo._id,
          ...area,
          statusWorkflow: 'Rascunho',
          publicado: false,
          autor: 'seed',
        })
      }
      console.log(`Áreas padrão do Ciclo ${c.codigo} inseridas.`)
    } else {
      console.log(`Ciclo ${c.codigo} já possui ${areaCount} área(s).`)
    }

    // Ponte anos → ciclo (sem sobrescrever se já ligado)
    for (const anoNome of c.anosAbrangidos) {
      await PnabYear.updateOne(
        { nome: anoNome, $or: [{ ciclo: { $exists: false } }, { ciclo: null }] },
        { $set: { ciclo: ciclo._id } }
      )
    }
  }

  console.log('[seed-pnab] Seeding concluído.')
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('[seed-pnab] Falha:', err.message || err)
  process.exit(1)
})
