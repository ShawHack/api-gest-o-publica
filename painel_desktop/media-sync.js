const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const crypto = require('crypto')

class MediaSyncManager {
  constructor(options = {}) {
    this.storageDir = options.storageDir || path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share'), 'painel-semit', 'media')
    this.serverUrl = (options.serverUrl || 'https://api.garca.sp.gov.br').replace(/\/$/, '')
    this.displayId = options.displayId || 'semit'
    this.pollIntervalMs = options.pollIntervalMs || 60000
    this.isSyncing = false
    this.playlist = []
    this.listeners = new Set()

    this._ensureDir(this.storageDir)
  }

  _ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  onPlaylistUpdate(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  _notify(playlist) {
    this.playlist = playlist
    for (const cb of this.listeners) {
      try {
        cb(playlist)
      } catch (err) {
        console.error('[MediaSync] Erro no callback do listener:', err)
      }
    }
  }

  updateConfig(serverUrl, displayId) {
    if (serverUrl) this.serverUrl = serverUrl.replace(/\/$/, '')
    if (displayId) this.displayId = displayId
    this.sync()
  }

  getHash(str) {
    return crypto.createHash('md5').update(str).digest('hex')
  }

  async sync() {
    if (this.isSyncing) return
    this.isSyncing = true
    try {
      const playlistUrl = `${this.serverUrl}/tv/api/playlist?display=${encodeURIComponent(this.displayId)}&t=${Date.now()}`
      console.log(`[MediaSync] Verificando playlist: ${playlistUrl}`)

      const items = await this._fetchJson(playlistUrl).catch((err) => {
        console.warn(`[MediaSync] Falha ao consultar servidor (${err.message}). Usando cache local.`)
        return null
      })

      if (items && Array.isArray(items)) {
        const localItems = []
        const activeFileNames = new Set()

        for (const item of items) {
          if (!item.url) continue
          if (item.url.includes('29.png') || item.url.toLowerCase().includes('logo') || item.url.toLowerCase().includes('watermark')) {
            continue
          }
          const rawUrl = item.url.startsWith('http') ? item.url : `${this.serverUrl}/tv/${item.url.replace(/^\//, '')}`
          const ext = path.extname(item.url.split('?')[0]) || '.mp4'
          const filename = `${this.getHash(rawUrl)}${ext}`
          const targetPath = path.join(this.storageDir, filename)
          activeFileNames.add(filename)
          activeFileNames.add(`${filename}.complete`)

          // Arquivo só é reaproveitado quando recebeu marcador após download integral.
          const exists = fs.existsSync(targetPath) &&
            fs.existsSync(`${targetPath}.complete`) &&
            fs.statSync(targetPath).size > 1024
          if (!exists) {
            console.log(`[MediaSync] Baixando mídia para cache local: ${rawUrl} -> ${filename}`)
            const downloaded = await this._downloadFile(rawUrl, targetPath)
            if (!downloaded) {
              console.warn(`[MediaSync] Não foi possível baixar ${rawUrl}, pulando...`)
              continue
            }
          }

          localItems.push({
            id: item.id || filename,
            title: item.title || 'Mídia Institucional',
            type: item.type || (ext.match(/\.(png|jpe?g|gif|webp)/i) ? 'image' : 'video'),
            localPath: targetPath,
            mediaUrl: `media-cache://${filename}`,
            duration: item.duration || 15,
          })
        }

        // Limpeza de mídias antigas removidas da programação
        this._cleanupObsoleteFiles(activeFileNames)

        if (localItems.length > 0) {
          this._notify(localItems)
          return
        }
      }

      // Se servidor indisponível ou lista vazia, carregar arquivos locais existentes
      const cached = this.loadLocalCacheFiles()
      if (cached.length > 0) {
        this._notify(cached)
      }
    } catch (err) {
      console.error('[MediaSync] Erro no ciclo de sincronização:', err)
    } finally {
      this.isSyncing = false
    }
  }

  loadLocalCacheFiles() {
    try {
      const files = fs.readdirSync(this.storageDir)
      const valid = files.filter(f =>
        !f.endsWith('.tmp') &&
        !f.endsWith('.complete') &&
        !f.toLowerCase().endsWith('.png') &&
        fs.existsSync(path.join(this.storageDir, `${f}.complete`)) &&
        fs.statSync(path.join(this.storageDir, f)).size > 1024,
      )
      return valid.map((filename) => {
        const ext = path.extname(filename)
        return {
          id: filename,
          title: 'Mídia em Cache',
          type: ext.match(/\.(png|jpe?g|gif|webp)/i) ? 'image' : 'video',
          localPath: path.join(this.storageDir, filename),
          mediaUrl: `media-cache://${filename}`,
          duration: 15,
        }
      })
    } catch {
      return []
    }
  }

  _cleanupObsoleteFiles(activeFilenames) {
    try {
      const files = fs.readdirSync(this.storageDir)
      for (const file of files) {
        if (!activeFilenames.has(file) && !file.endsWith('.tmp')) {
          console.log(`[MediaSync] Removendo mídia desatualizada do cache: ${file}`)
          try {
            fs.unlinkSync(path.join(this.storageDir, file))
          } catch {}
        }
      }
    } catch {}
  }

  _fetchJson(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http
      const req = client.get(url, { timeout: 10000 }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Status HTTP ${res.statusCode}`))
        }
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
      })
      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Timeout de conexão'))
      })
    })
  }

  _downloadFile(url, destPath) {
    return new Promise((resolve) => {
      const tempPath = `${destPath}.tmp`
      const client = url.startsWith('https') ? https : http
      let settled = false

      const finish = (ok) => {
        if (settled) return
        settled = true
        resolve(ok)
      }

      const discardTemp = () => {
        try { fs.unlinkSync(tempPath) } catch {}
      }

      const makeRequest = (currentUrl, redirects = 0) => {
        if (redirects > 5) {
          console.error('[MediaSync] Muitos redirecionamentos para:', url)
          return finish(false)
        }

        const req = client.get(currentUrl, { timeout: 30000 }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, currentUrl).href
            return makeRequest(nextUrl, redirects + 1)
          }

          if (res.statusCode !== 200) {
            console.error(`[MediaSync] Falha HTTP ao baixar: ${res.statusCode} para ${currentUrl}`)
            return finish(false)
          }

          const fileStream = fs.createWriteStream(tempPath)
          const expectedBytes = Number(res.headers['content-length'] || 0)
          let receivedBytes = 0
          let responseFailed = false

          res.on('data', (chunk) => {
            receivedBytes += chunk.length
          })
          res.on('aborted', () => {
            responseFailed = true
            fileStream.destroy()
          })
          res.on('error', () => {
            responseFailed = true
            fileStream.destroy()
          })
          res.pipe(fileStream)

          fileStream.on('finish', () => {
            fileStream.close(() => {
              try {
                // Renomeia o arquivo temporário para o destino definitivo após 100% de download
                if (responseFailed || (expectedBytes > 0 && receivedBytes !== expectedBytes)) {
                  console.error(`[MediaSync] Download incompleto: ${path.basename(destPath)} (${receivedBytes}/${expectedBytes || '?' } bytes)`)
                  discardTemp()
                  return finish(false)
                }
                // Substitui um arquivo legado sem marcador somente depois de concluir o novo.
                try { fs.unlinkSync(destPath) } catch {}
                fs.renameSync(tempPath, destPath)
                fs.writeFileSync(`${destPath}.complete`, JSON.stringify({ bytes: receivedBytes, completedAt: Date.now() }))
                console.log(`[MediaSync] Download 100% concluído: ${path.basename(destPath)}`)
                finish(true)
              } catch (err) {
                console.error('[MediaSync] Erro ao renomear arquivo baixado:', err)
                discardTemp()
                finish(false)
              }
            })
          })

          fileStream.on('error', (err) => {
            console.error('[MediaSync] Erro na gravação do arquivo:', err)
            discardTemp()
            finish(false)
          })
        })

        req.on('error', (err) => {
          console.error('[MediaSync] Erro na requisição de download:', err)
          discardTemp()
          finish(false)
        })

        req.on('timeout', () => {
          req.destroy()
          discardTemp()
          finish(false)
        })
      }

      makeRequest(url)
    })
  }

  start() {
    this.sync()
    this.timer = setInterval(() => this.sync(), this.pollIntervalMs)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
  }
}

module.exports = { MediaSyncManager }
