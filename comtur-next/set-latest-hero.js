const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
require('/app/models/ComturBranding')

function latestBanner() {
  const dir = '/data/apicemiterio/comtur'
  const found = fs.readdirSync(dir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .map((name) => ({ name, time: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time)[0]
  if (!found) throw new Error('no banner file')
  return '/images/comtur/' + found.name
}

async function ready() {
  if (mongoose.connection.readyState === 1) return
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI
  if (uri && mongoose.connection.readyState === 0) await mongoose.connect(uri)
  if (mongoose.connection.readyState === 1) return
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('mongo timeout')), 20000)
    mongoose.connection.once('open', () => { clearTimeout(timer); resolve() })
    mongoose.connection.once('error', (error) => { clearTimeout(timer); reject(error) })
  })
}

async function main() {
  await ready()
  const Branding = mongoose.model('ComturBranding')
  const doc = await Branding.findOne({ key: 'default' })
  if (!doc) throw new Error('branding missing')
  const url = latestBanner()
  doc.value = { ...(doc.value?.toObject ? doc.value.toObject() : doc.value), heroImageUrl: url }
  doc.markModified('value')
  doc.version = (doc.version || 1) + 1
  await doc.save()
  console.log('HERO_SET', url, 'v' + doc.version)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
