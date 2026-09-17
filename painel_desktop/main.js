const { app, BrowserWindow, ipcMain, protocol, net } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')
const { MediaSyncManager } = require('./media-sync')

// Flags de Compatibilidade Universal para Notebooks e GPUs Fracas
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling')

// Registrar esquema de protocolo de mídia personalizado antes do ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media-cache',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
    },
  },
])

let mainWindow = null
let syncManager = null

// Configurações persistentes simples
const configPath = path.join(app.getPath('userData'), 'panel-config.json')

function loadConfig() {
  const defaults = {
    serverUrl: 'https://api.garca.sp.gov.br',
    panelSlug: 'semit',
    displayId: 'semit',
    novosgaUnitId: '1',
    tvLayoutEnabled: true,
    speechRate: 0.95,
    speechVolume: 1.0,
    tvVolume: 1.0,
    kiosk: true,
  }
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      return { ...defaults, ...data }
    }
  } catch (err) {
    console.error('[Config] Erro ao carregar config:', err)
  }
  return defaults
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8')
  } catch (err) {
    console.error('[Config] Erro ao salvar config:', err)
  }
}

let appConfig = loadConfig()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: appConfig.kiosk,
    kiosk: appConfig.kiosk,
    autoHideMenuBar: true,
    backgroundColor: '#0a0f1d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))

  mainWindow.on('enter-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen-change', true)
    }
  })

  mainWindow.on('leave-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen-change', false)
    }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen-change', mainWindow.isFullScreen())
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // 1. Inicializa o gerenciador de sincronização de mídias em disco
  syncManager = new MediaSyncManager({
    serverUrl: appConfig.serverUrl,
    displayId: appConfig.displayId,
  })

  // 2. Registra o manipulador de protocolo media-cache://
  protocol.handle('media-cache', (request) => {
    try {
      const parsedUrl = new URL(request.url)
      const filename = decodeURIComponent(parsedUrl.host || parsedUrl.pathname.replace(/^\//, ''))
      const filePath = path.join(syncManager.storageDir, filename)

      if (fs.existsSync(filePath)) {
        return net.fetch(pathToFileURL(filePath).toString())
      }
      return new Response('Mídia não encontrada em cache', { status: 404 })
    } catch (err) {
      console.error('[Protocol] Erro ao servir mídia:', err)
      return new Response('Erro interno', { status: 500 })
    }
  })

  // 3. Listener de atualização de playlist para notificar o frontend
  syncManager.onPlaylistUpdate((playlist) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('playlist-updated', playlist)
    }
  })

  syncManager.start()

  // 4. Criação da Janela
  createWindow()

  // 5. IPC Handlers
  ipcMain.handle('get-config', () => appConfig)
  ipcMain.handle('save-config', (event, newConfig) => {
    appConfig = { ...appConfig, ...newConfig }
    saveConfig(appConfig)
    syncManager.updateConfig(appConfig.serverUrl, appConfig.displayId)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setKiosk(appConfig.kiosk)
      mainWindow.setFullScreen(appConfig.kiosk)
    }
    return appConfig
  })

  ipcMain.handle('get-cached-playlist', () => {
    return syncManager.playlist.length > 0 ? syncManager.playlist : syncManager.loadLocalCacheFiles()
  })

  ipcMain.handle('force-sync-media', () => {
    return syncManager.sync()
  })

  ipcMain.handle('toggle-fullscreen', () => {
    if (!mainWindow) return false
    const isFull = !mainWindow.isFullScreen()
    mainWindow.setFullScreen(isFull)
    return isFull
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (syncManager) syncManager.stop()
  if (process.platform !== 'darwin') app.quit()
})
