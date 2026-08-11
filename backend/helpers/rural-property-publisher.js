const admin = require('firebase-admin')

const DATABASE_URL = process.env.ROTAS_FIREBASE_DATABASE_URL || 'https://upa-rural-default-rtdb.firebaseio.com'
const APP_NAME = 'rotas-rurais-admin'

function credential() {
  const raw = process.env.ROTAS_FIREBASE_SERVICE_ACCOUNT_JSON
  if (raw) return admin.credential.cert(JSON.parse(raw))
  return admin.credential.applicationDefault()
}

function getDatabase() {
  let app = admin.apps.find((candidate) => candidate.name === APP_NAME)
  if (!app) app = admin.initializeApp({ credential: credential(), databaseURL: DATABASE_URL }, APP_NAME)
  return admin.database(app)
}

function firebaseKey(property) {
  if (property.firebaseKey) return property.firebaseKey
  return `portal_${String(property._id).replace(/[^a-zA-Z0-9_-]/g, '')}`
}

async function publishRuralProperty(property) {
  const key = firebaseKey(property)
  const payload = {
    codigo_upa: property.codigoUpa,
    nome_upa: property.name || '',
    global_code: property.plusCode,
    origem: 'portal_produtor_rural',
    atualizado_em: new Date().toISOString(),
  }
  if (property.location?.latitude != null) payload.latitude = property.location.latitude
  if (property.location?.longitude != null) payload.longitude = property.location.longitude
  await getDatabase().ref(`upas/${key}`).set(payload)
  return key
}

module.exports = { publishRuralProperty }
