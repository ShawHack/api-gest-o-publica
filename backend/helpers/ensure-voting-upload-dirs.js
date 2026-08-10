const fs = require('fs')
const path = require('path')
const { BASE_DIR } = require('./image-upload')

function ensureVotingUploadDirs() {
  const dirs = [
    path.join(BASE_DIR, 'votacao', 'candidates'),
    path.join(BASE_DIR, 'votacao', 'banners'),
  ]
  for (const dir of dirs) {
    try {
      fs.mkdirSync(dir, { recursive: true })
      fs.accessSync(dir, fs.constants.W_OK)
    } catch (err) {
      console.warn(`[Voting upload] Diretório sem permissão de escrita: ${dir} (${err.message})`)
      return false
    }
  }
  return true
}

module.exports = { ensureVotingUploadDirs }
