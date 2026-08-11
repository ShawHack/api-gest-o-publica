/* Ambiente local e descartavel para homologar o Portal do Produtor Rural. */
const path = require('path')

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'rural-homologation-local-secret-32-chars'
process.env.PORT = process.env.PORT || '5000'
process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR
  || path.join(__dirname, '..', '..', '.cache', 'mongodb-binaries')

const { MongoMemoryServer } = require('mongodb-memory-server')
const bcrypt = require('bcrypt')

async function main() {
  const mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri('rural-homologation')

  const mongoose = require('../db/conn')
  await mongoose.connect(process.env.MONGODB_URI)

  const User = require('../models/User')
  const RuralProperty = require('../models/RuralProperty')
  const operatorPassword = 'RuralTeste@123'
  const operator = await User.create({
    name: 'Operador Rural Homologacao',
    email: 'operador.rural@teste.local',
    password: await bcrypt.hash(operatorPassword, 12),
    phone: '16999990001',
    role: 'rotas_operador',
    emailVerified: true,
  })

  await RuralProperty.create({
    codigoUpa: 'UPA-HML-001',
    plusCode: '58M5+CFGH',
    name: 'Sitio de Homologacao',
    source: 'operator',
    status: 'active',
    createdBy: operator._id,
  })

  const { createApp } = require('../server')
  const server = createApp().listen(Number(process.env.PORT), '127.0.0.1', () => {
    console.log('\nHomologacao rural iniciada em http://localhost:5000')
    console.log('Operador: operador.rural@teste.local')
    console.log(`Senha: ${operatorPassword}`)
    console.log('UPA de teste: 58M5+CFGH')
    console.log('Use Ctrl+C para encerrar e apagar todos os dados.\n')
  })

  const shutdown = async () => {
    await new Promise((resolve) => server.close(resolve))
    await mongoose.disconnect()
    await mongo.stop()
    process.exit(0)
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error('Falha ao iniciar a homologacao rural:', error)
  process.exit(1)
})
