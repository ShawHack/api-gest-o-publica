const fs = require('fs')
const path = require('path')
const { BASE_DIR } = require('./image-upload')

function ensureEducationUploadDirs() {
  const dirs = [
    path.join(BASE_DIR, 'education'),
    path.join(BASE_DIR, 'education', 'documents'),
  ]
  for (const dir of dirs) {
    try {
      fs.mkdirSync(dir, { recursive: true })
      fs.accessSync(dir, fs.constants.W_OK)
    } catch (err) {
      console.warn(`[Education upload] Diretório sem permissão de escrita: ${dir} (${err.message})`)
      return false
    }
  }
  return true
}

module.exports = { ensureEducationUploadDirs }
