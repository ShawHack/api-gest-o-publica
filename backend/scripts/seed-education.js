/**
 * Seed inicial do módulo Portal Municipal da Educação.
 *
 * Uso:
 *   cd backend && node scripts/seed-education.js
 *
 * Requer MONGODB_URI (ou padrão do projeto).
 */
require('dotenv').config()
const mongoose = require('mongoose')

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://mongo:27017/apicemiterio'

async function seed() {
  await mongoose.connect(MONGODB_URI)

  const EducationEntity = require('../models/EducationEntity')
  const EducationCalendarEvent = require('../models/EducationCalendarEvent')
  const EducationDocumentCategory = require('../models/EducationDocumentCategory')
  const EducationCouncilMember = require('../models/EducationCouncilMember')

  const DEFAULT_CATEGORIES = [
    { slug: 'atas', label: 'Atas de reunião', documentTypes: ['ata'] },
    { slug: 'pareceres', label: 'Pareceres', documentTypes: ['parecer'] },
    { slug: 'resolucoes', label: 'Resoluções e deliberações', documentTypes: ['resolucao', 'deliberacao'] },
    { slug: 'relatorios', label: 'Relatórios e prestação de contas', documentTypes: ['relatorio', 'prestacao_contas'] },
  ]

  const COUNCIL_CONTENT = {
    cme: {
      competencies: 'Deliberar sobre a política municipal de educação, aprovar o plano municipal de educação e zelar pelo cumprimento das normas educacionais.',
      legalBasis: 'Lei de Diretrizes e Bases da Educação (LDB) e legislação municipal correlata.',
      institutionalAbout: 'O Conselho Municipal de Educação é o órgão colegiado de formulação e deliberação da política educacional do município.',
    },
    cae: {
      competencies: 'Fiscalizar e acompanhar a execução do Programa Nacional de Alimentação Escolar (PNAE) no município.',
      legalBasis: 'Resoluções do FNDE e legislação do PNAE.',
      institutionalAbout: 'O CAE acompanha a aplicação dos recursos e a qualidade da alimentação escolar oferecida na rede municipal.',
    },
    'cacs-fundeb': {
      competencies: 'Acompanhar e controlar socialmente a aplicação dos recursos do FUNDEB no município.',
      legalBasis: 'Lei do FUNDEB e normativas do Conselho Nacional de Educação.',
      institutionalAbout: 'O CACS-FUNDEB promove a transparência e o controle social dos recursos vinculados à educação básica pública.',
    },
  }

  const entities = [
    {
      name: 'Secretaria Municipal de Educação',
      slug: 'secretaria-educacao',
      type: 'secretaria',
      description: 'Órgão central da política educacional municipal.',
      address: 'Rua Exemplo, 100 - Centro',
      neighborhood: 'Centro',
      phone: '(14) 3471-0000',
      email: 'educacao@garca.sp.gov.br',
      openingHours: 'Segunda a sexta, 8h às 17h',
      managerName: 'Secretário(a) Municipal de Educação',
      managerRole: 'Secretário(a)',
      isActive: true,
    },
    {
      name: 'Conselho Municipal de Educação — CME',
      slug: 'cme',
      type: 'conselho',
      councilCode: 'CME',
      description: 'Órgão deliberativo da política educacional municipal.',
      isActive: true,
    },
    {
      name: 'Conselho de Alimentação Escolar — CAE',
      slug: 'cae',
      type: 'conselho',
      councilCode: 'CAE',
      description: 'Fiscalização da alimentação escolar.',
      isActive: true,
    },
    {
      name: 'Conselho do FUNDEB — CACS-FUNDEB',
      slug: 'cacs-fundeb',
      type: 'conselho',
      councilCode: 'CACS-FUNDEB',
      description: 'Acompanhamento e controle social dos recursos do FUNDEB.',
      isActive: true,
    },
    {
      name: 'EMEI Profª Maria Silva',
      slug: 'emei-maria-silva',
      type: 'emei',
      description: 'Educação infantil municipal.',
      address: 'Rua das Flores, 50',
      neighborhood: 'Jardim Primavera',
      phone: '(14) 3471-1001',
      isActive: true,
    },
    {
      name: 'EMEF João da Silva',
      slug: 'emef-joao-silva',
      type: 'escola',
      description: 'Ensino fundamental municipal.',
      address: 'Av. Brasil, 200',
      neighborhood: 'Vila Nova',
      phone: '(14) 3471-1002',
      isActive: true,
    },
    {
      name: 'Creche Municipal Pequenos Passos',
      slug: 'creche-pequenos-passos',
      type: 'creche',
      description: 'Atendimento à primeira infância.',
      address: 'Rua do Sol, 30',
      neighborhood: 'Centro',
      phone: '(14) 3471-1003',
      isActive: true,
    },
    {
      name: 'Centro Educacional Integrado',
      slug: 'centro-educacional-integrado',
      type: 'centro_educacional',
      description: 'Atividades complementares e projetos educacionais.',
      isActive: true,
    },
    {
      name: 'Projeto Leitura na Escola',
      slug: 'projeto-leitura-na-escola',
      type: 'projeto_educacional',
      description: 'Incentivo à leitura nas unidades municipais.',
      isActive: true,
    },
  ]

  for (const data of entities) {
    const extra = COUNCIL_CONTENT[data.slug] || {}
    await EducationEntity.findOneAndUpdate(
      { slug: data.slug },
      { $setOnInsert: data, $set: extra },
      { upsert: true, new: true }
    )
    console.log(`✓ Entidade: ${data.name}`)
  }

  for (const data of entities.filter((e) => e.type === 'conselho')) {
    const council = await EducationEntity.findOne({ slug: data.slug })
    if (!council) continue
    for (const cat of DEFAULT_CATEGORIES) {
      await EducationDocumentCategory.findOneAndUpdate(
        { educationEntityId: council._id, slug: cat.slug },
        { $setOnInsert: { ...cat, educationEntityId: council._id, isActive: true } },
        { upsert: true }
      )
    }
    if (data.slug === 'cme') {
      const exists = await EducationCouncilMember.countDocuments({ educationEntityId: council._id })
      if (exists === 0) {
        await EducationCouncilMember.insertMany([
          { educationEntityId: council._id, name: 'Presidente do CME', role: 'presidente', segment: 'poder_publico', order: 1 },
          { educationEntityId: council._id, name: 'Representante dos professores', role: 'membro_titular', segment: 'profissionais_educacao', order: 2 },
          { educationEntityId: council._id, name: 'Representante dos pais', role: 'membro_titular', segment: 'pais_alunos', order: 3 },
        ])
        console.log('✓ Membros exemplo: CME')
      }
    }
  }

  const secretaria = await EducationEntity.findOne({ slug: 'secretaria-educacao' })
  if (secretaria) {
    const events = [
      {
        educationEntityId: secretaria._id,
        title: 'Início do Ano Letivo',
        description: 'Retorno das atividades escolares.',
        startDate: new Date(new Date().getFullYear(), 1, 3),
        type: 'calendario_letivo',
        isPublic: true,
      },
      {
        educationEntityId: secretaria._id,
        title: 'Reunião de Planejamento Pedagógico',
        startDate: new Date(new Date().getFullYear(), 0, 15, 14, 0),
        type: 'formacao',
        location: 'Auditório da Secretaria',
        isPublic: true,
      },
      {
        educationEntityId: null,
        title: 'Feriado Nacional',
        startDate: new Date(new Date().getFullYear(), 8, 7),
        type: 'feriado',
        isPublic: true,
      },
    ]

    for (const ev of events) {
      const exists = await EducationCalendarEvent.findOne({
        title: ev.title,
        startDate: ev.startDate,
      })
      if (!exists) {
        await EducationCalendarEvent.create(ev)
        console.log(`✓ Evento: ${ev.title}`)
      }
    }
  }

  console.log('\nSeed do módulo Educação concluído.')
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Erro no seed:', err)
  process.exit(1)
})
