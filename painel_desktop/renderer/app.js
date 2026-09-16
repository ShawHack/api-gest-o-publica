// Estado do Painel Desktop
let appConfig = {
  serverUrl: 'https://api.garca.sp.gov.br',
  panelSlug: 'semit',
  displayId: 'semit',
  hardwareKey: '',
  weatherCity: 'Garça',
  rssFeedUrl: 'https://g1.globo.com/rss/g1/sp/bauru-marilia/',
  novosgaUrl: 'http://10.15.25.31',
  mercureUrl: 'http://10.15.25.31:3000/.well-known/mercure',
  clientId: 'projetolapide@gmail.com',
  clientSecret: '',
  username: 'admin',
  password: '',
  novosgaUnitId: '6',
  novosgaServices: '82,83,84',
  tvLayoutEnabled: true,
  voiceEnabled: true,
  selectedVoiceURI: 'google-tts',
  speechRate: 0.95,
  speechVolume: 1.0,
  tvVolume: 1.0,
  kiosk: true,
}

let loadedPanels = []
let loadedDisplays = []
let availableVoices = []
let playlist = []
let currentMediaIndex = 0
let mediaTimer = null
let lastAnnouncedId = null
let eventSource = null
let mercureSource = null
let pollTimer = null
let weatherTimer = null
let tickerTimer = null
let isSpeaking = false

// Elementos DOM
const appContainer = document.getElementById('app')
const clockDisplay = document.getElementById('clockDisplay')
const connectionBadge = document.getElementById('connectionBadge')
const connectionText = document.getElementById('connectionText')
const headerPanelTitle = document.getElementById('headerPanelTitle')
const headerPanelSubtitle = document.getElementById('headerPanelSubtitle')

const tvColumn = document.getElementById('tvColumn')
const tvVideoPlayer = document.getElementById('tvVideoPlayer')
const tvImagePlayer = document.getElementById('tvImagePlayer')
const tvEmptyState = document.getElementById('tvEmptyState')

const cardCurrentCall = document.getElementById('cardCurrentCall')
const currentServiceBadge = document.getElementById('currentServiceBadge')
const currentTicket = document.getElementById('currentTicket')
const currentLocal = document.getElementById('currentLocal')
const currentCitizen = document.getElementById('currentCitizen')
const historyList = document.getElementById('historyList')

const weatherTemp = document.getElementById('weatherTemp')
const weatherCity = document.getElementById('weatherCity')
const weatherCondition = document.getElementById('weatherCondition')
const weatherDetails = document.getElementById('weatherDetails')
const tickerContent = document.getElementById('tickerContent')

const settingsModal = document.getElementById('settingsModal')
const settingsForm = document.getElementById('settingsForm')
const btnSettings = document.getElementById('btnSettings')
const btnCloseModal = document.getElementById('btnCloseModal')
const btnCancelSettings = document.getElementById('btnCancelSettings')
const btnFullscreen = document.getElementById('btnFullscreen')
const btnForceSync = document.getElementById('btnForceSync')
const btnFetchServerData = document.getElementById('btnFetchServerData')
const btnTestVoice = document.getElementById('btnTestVoice')

// Inputs das Abas
const inputServerUrl = document.getElementById('inputServerUrl')
const selectPanelSlug = document.getElementById('selectPanelSlug')
const inputPanelSlugManual = document.getElementById('inputPanelSlugManual')
const selectTvDisplay = document.getElementById('selectTvDisplay')
const inputDisplayIdManual = document.getElementById('inputDisplayIdManual')
const inputWeatherCity = document.getElementById('inputWeatherCity')
const inputRssFeedUrl = document.getElementById('inputRssFeedUrl')
const checkTvEnabled = document.getElementById('checkTvEnabled')

const inputNovosgaUrl = document.getElementById('inputNovosgaUrl')
const inputMercureUrl = document.getElementById('inputMercureUrl')
const inputClientId = document.getElementById('inputClientId')
const inputClientSecret = document.getElementById('inputClientSecret')
const inputUsername = document.getElementById('inputUsername')
const inputPassword = document.getElementById('inputPassword')
const inputNovosgaUnit = document.getElementById('inputNovosgaUnit')
const inputNovosgaServices = document.getElementById('inputNovosgaServices')

const checkVoiceEnabled = document.getElementById('checkVoiceEnabled')
const selectVoice = document.getElementById('selectVoice')
const rangeSpeechRate = document.getElementById('rangeSpeechRate')
const valSpeechRate = document.getElementById('valSpeechRate')
const rangeTvVolume = document.getElementById('rangeTvVolume')
const valTvVolume = document.getElementById('valTvVolume')
const checkKiosk = document.getElementById('checkKiosk')

// 1. RELÓGIO EM TEMPO REAL
function updateClock() {
  const now = new Date()
  if (clockDisplay) {
    clockDisplay.textContent = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }
}
setInterval(updateClock, 1000)
updateClock()

// 2. CONTROLE DE VOLUME ESTÁVEL DA TV (SILÊNCIO TOTAL 100% DURANTE CHAMADAS)
function applyTvVolume() {
  if (!tvVideoPlayer) return
  if (isSpeaking) {
    tvVideoPlayer.volume = 0
    tvVideoPlayer.muted = true
    return
  }
  const cfgVol = typeof appConfig.tvVolume === 'number' ? appConfig.tvVolume : 1.0
  tvVideoPlayer.volume = Math.max(0, Math.min(1, cfgVol))
  tvVideoPlayer.muted = cfgVol === 0
}

tvVideoPlayer.addEventListener('loadedmetadata', applyTvVolume)
tvVideoPlayer.addEventListener('canplay', applyTvVolume)
tvVideoPlayer.addEventListener('play', applyTvVolume)
tvVideoPlayer.addEventListener('timeupdate', () => {
  if (isSpeaking) {
    if (tvVideoPlayer.volume !== 0 || !tvVideoPlayer.muted) {
      tvVideoPlayer.volume = 0
      tvVideoPlayer.muted = true
    }
    return
  }
  const cfgVol = typeof appConfig.tvVolume === 'number' ? appConfig.tvVolume : 1.0
  if (Math.abs(tvVideoPlayer.volume - cfgVol) > 0.05) {
    tvVideoPlayer.volume = cfgVol
    tvVideoPlayer.muted = cfgVol === 0
  }
})

// 3. SISTEMA DE REPRODUÇÃO DE MÍDIA LOCAL (100% OFFLINE DISK CACHE)
function applyTvLayout(enabled) {
  if (enabled) {
    appContainer.classList.remove('layout-no-tv')
    appContainer.classList.add('layout-with-tv')
    tvColumn.style.display = 'flex'
    playCurrentMedia()
  } else {
    appContainer.classList.remove('layout-with-tv')
    appContainer.classList.add('layout-no-tv')
    tvColumn.style.display = 'none'
    tvVideoPlayer.pause()
    tvVideoPlayer.src = ''
    tvImagePlayer.src = ''
    if (mediaTimer) clearTimeout(mediaTimer)
  }
}

function updatePlaylist(newPlaylist) {
  if (!Array.isArray(newPlaylist)) return
  console.log(`[Player] Playlist atualizada com ${newPlaylist.length} mídias locais:`, newPlaylist)
  playlist = newPlaylist
  if (playlist.length === 0) {
    tvEmptyState.style.display = 'flex'
    tvVideoPlayer.style.display = 'none'
    tvImagePlayer.style.display = 'none'
    return
  }
  tvEmptyState.style.display = 'none'
  if (!tvVideoPlayer.src && !tvImagePlayer.src) {
    currentMediaIndex = 0
    playCurrentMedia()
  }
}

function playCurrentMedia() {
  if (!appConfig.tvLayoutEnabled || playlist.length === 0) return
  if (currentMediaIndex >= playlist.length) currentMediaIndex = 0

  const item = playlist[currentMediaIndex]
  if (!item) return

  if (mediaTimer) clearTimeout(mediaTimer)

  const isVideo = item.type === 'video' || item.mediaUrl.match(/\.(mp4|webm|mov)$/i)

  if (isVideo) {
    tvImagePlayer.classList.remove('active')
    tvImagePlayer.style.display = 'none'
    tvVideoPlayer.style.display = 'block'

    if (tvVideoPlayer.getAttribute('src') !== item.mediaUrl) {
      tvVideoPlayer.src = item.mediaUrl
    }
    applyTvVolume()

    tvVideoPlayer.play().then(() => {
      tvVideoPlayer.classList.add('active')
      applyTvVolume()
    }).catch((err) => {
      console.warn('[Player] Erro ao reproduzir vídeo local, avançando...', err)
      advanceNextMedia()
    })
  } else {
    // Imagem
    tvVideoPlayer.classList.remove('active')
    tvVideoPlayer.pause()
    tvVideoPlayer.style.display = 'none'
    tvImagePlayer.style.display = 'block'

    tvImagePlayer.src = item.mediaUrl
    tvImagePlayer.classList.add('active')

    const duration = (item.duration || 15) * 1000
    mediaTimer = setTimeout(advanceNextMedia, duration)
  }
}

function advanceNextMedia() {
  if (playlist.length === 0) return
  currentMediaIndex = (currentMediaIndex + 1) % playlist.length
  playCurrentMedia()
}

tvVideoPlayer.addEventListener('ended', advanceNextMedia)
tvVideoPlayer.addEventListener('error', (e) => {
  console.warn('[Player] Erro no elemento de vídeo, avançando...', e)
  advanceNextMedia()
})

// 4. NÚMEROS POR EXTENSO E TRATAMENTO SEGURO DE STRINGS
const NUM_UNITS = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'
]
const NUM_TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const NUM_HUNDREDS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'
]

function numberToWordsPtBr(value) {
  const n = Math.trunc(Math.abs(Number(value) || 0))
  if (n === 0) return 'zero'
  if (n === 100) return 'cem'
  if (n < 20) return NUM_UNITS[n]
  if (n < 100) {
    const ten = Math.floor(n / 10)
    const unit = n % 10
    return unit === 0 ? NUM_TENS[ten] : `${NUM_TENS[ten]} e ${NUM_UNITS[unit]}`
  }
  if (n < 1000) {
    const hundred = Math.floor(n / 100)
    const rest = n % 100
    if (rest === 0) return NUM_HUNDREDS[hundred]
    return `${NUM_HUNDREDS[hundred]} e ${numberToWordsPtBr(rest)}`
  }
  const thousand = Math.floor(n / 1000)
  const rest = n % 1000
  const thousandPart = thousand === 1 ? 'mil' : `${numberToWordsPtBr(thousand)} mil`
  if (rest === 0) return thousandPart
  return `${thousandPart} e ${numberToWordsPtBr(rest)}`
}

function spellPrefix(prefix) {
  if (!prefix) return ''
  const trimmed = String(prefix).trim().toUpperCase()
  return trimmed.split('').join(' ')
}

function parseTicketComponents(call) {
  if (!call) return { prefix: '', number: 0, text: 'AG01' }

  let raw = ''
  if (typeof call.senha === 'string' && call.senha.trim()) raw = call.senha.trim()
  else if (typeof call.ticket === 'string' && call.ticket.trim()) raw = call.ticket.trim()
  else if (call.siglaSenha || call.numeroSenha || call.numSenha) {
    const p = String(call.siglaSenha || '').trim()
    const n = parseInt(call.numeroSenha || call.numSenha || 0, 10)
    return {
      prefix: p,
      number: n,
      text: `${p}${String(n).padStart(2, '0')}`
    }
  }

  // Regex para separar letras e números (ex: DAS06 -> prefix: DAS, num: 6)
  const match = raw.match(/^([A-Za-z]+)?[-_\s]*(\d+)$/)
  if (match) {
    const p = match[1] || ''
    const n = parseInt(match[2], 10)
    return {
      prefix: p,
      number: n,
      text: `${p}${String(n).padStart(2, '0')}`
    }
  }

  return { prefix: '', number: 0, text: raw || 'AG01' }
}

function safeServiceLabel(call) {
  if (!call) return 'ATENDIMENTO'
  if (typeof call.servico === 'string' && !call.servico.includes('[object')) {
    return call.servico.toUpperCase()
  }
  if (call.servico && typeof call.servico === 'object') {
    const sName = call.servico.nome || call.servico.name || call.servico.descricao || call.servico.title
    if (sName && typeof sName === 'string') return sName.toUpperCase()
  }
  if (typeof call.serviceName === 'string' && !call.serviceName.includes('[object')) {
    return call.serviceName.toUpperCase()
  }
  if (typeof call.prioridade === 'string' && !call.prioridade.includes('[object')) {
    return call.prioridade.toUpperCase()
  }
  if (call.prioridade && typeof call.prioridade === 'object') {
    const pName = call.prioridade.nome || call.prioridade.name
    if (pName && typeof pName === 'string') return pName.toUpperCase()
  }
  return 'ATENDIMENTO'
}

function safeTicketString(call) {
  const comp = parseTicketComponents(call)
  return comp.text
}

function safeCitizenName(call) {
  if (!call) return ''
  const name = call.nomeCliente || call.clientName || ''
  if (typeof name === 'string' && !name.includes('[object')) return name.trim()
  return ''
}

// 5. SISTEMA DE VOZ (GOOGLE TTS + WEB SPEECH API) E SILENCIAMENTO DA TV
let historyCalls = []

function playChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const now = audioCtx.currentTime

    // Tom 1 (587.33 Hz - D5)
    const osc1 = audioCtx.createOscillator()
    const gain1 = audioCtx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now)
    gain1.gain.setValueAtTime(0.35, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    osc1.connect(gain1)
    gain1.connect(audioCtx.destination)
    osc1.start(now)
    osc1.stop(now + 0.5)

    // Tom 2 (880.00 Hz - A5)
    const osc2 = audioCtx.createOscillator()
    const gain2 = audioCtx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880.00, now + 0.2)
    gain2.gain.setValueAtTime(0.4, now + 0.2)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
    osc2.connect(gain2)
    gain2.connect(audioCtx.destination)
    osc2.start(now + 0.2)
    osc2.stop(now + 0.8)
  } catch (_e) {}
}

function triggerAudioDucking(enable) {
  isSpeaking = enable
  applyTvVolume()
}

function getPreferredVoice() {
  if (!('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (appConfig.selectedVoiceURI && appConfig.selectedVoiceURI !== 'google-tts') {
    const found = voices.find(v => v.voiceURI === appConfig.selectedVoiceURI || v.name === appConfig.selectedVoiceURI)
    if (found) return found
  }
  // Melhores opções em Português
  return voices.find(v => (v.lang.includes('pt-BR') || v.lang.includes('pt')) && (v.name.includes('Google') || v.name.includes('Maria') || v.name.includes('Luciana') || v.name.includes('Brazil')))
    || voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt'))
    || null
}

function buildSpokenAnnouncement(call) {
  const { prefix, number, text } = parseTicketComponents(call)
  const clientName = safeCitizenName(call)
  const localName = (call.local || call.localName || 'Guichê').trim()
  const localNum = Number(call.numeroLocal || call.localNumber || 1)
  const localNumWords = numberToWordsPtBr(localNum)

  const isFeminine = /^(sala|mesa|secretaria|recepção|recepcao|portaria)/i.test(localName)
  const prep = isFeminine ? 'à' : 'ao'
  const destination = `dirigir-se ${prep} ${localName} ${localNumWords}`

  const isAgendamento = prefix.toUpperCase() === 'AG' || (call.prioridade && String(call.prioridade).toLowerCase().includes('agend'))

  let parts = []
  if (clientName && isAgendamento) {
    parts = ['Agendamento', clientName, destination]
  } else {
    parts = ['Senha']
    if (prefix) {
      parts.push(spellPrefix(prefix))
    }
    if (number > 0) {
      parts.push(numberToWordsPtBr(number))
    } else {
      parts.push(text)
    }
    if (clientName) {
      parts.push(clientName)
    }
    parts.push(destination)
  }

  return parts.join(', ') + '.'
}

function playSpeechWithGoogleTts(phrase) {
  return new Promise((resolve) => {
    const base = appConfig.serverUrl.replace(/\/$/, '')
    const serverUrl = `${base}/tv/api/speech?text=${encodeURIComponent(phrase)}`
    const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=${encodeURIComponent(phrase)}`

    let completed = false
    const finish = () => {
      if (!completed) {
        completed = true
        resolve()
      }
    }

    const audio = new Audio(serverUrl)
    audio.volume = appConfig.speechVolume || 1.0

    audio.onended = finish
    audio.onerror = () => {
      const fallbackAudio = new Audio(directUrl)
      fallbackAudio.volume = appConfig.speechVolume || 1.0
      fallbackAudio.onended = finish
      fallbackAudio.onerror = () => {
        playSpeechWithWebSpeech(phrase).then(finish)
      }
      fallbackAudio.play().catch(() => {
        playSpeechWithWebSpeech(phrase).then(finish)
      })
    }

    audio.play().catch(() => {
      const fallbackAudio = new Audio(directUrl)
      fallbackAudio.volume = appConfig.speechVolume || 1.0
      fallbackAudio.onended = finish
      fallbackAudio.onerror = () => {
        playSpeechWithWebSpeech(phrase).then(finish)
      }
      fallbackAudio.play().catch(() => {
        playSpeechWithWebSpeech(phrase).then(finish)
      })
    })
  })
}

function playSpeechWithWebSpeech(phrase) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      setTimeout(resolve, 2000)
      return
    }

    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(phrase)
      utterance.lang = 'pt-BR'
      utterance.rate = appConfig.speechRate || 0.95
      utterance.volume = appConfig.speechVolume || 1.0

      const voice = getPreferredVoice()
      if (voice) utterance.voice = voice

      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()

      window.speechSynthesis.speak(utterance)
    } catch {
      resolve()
    }
  })
}

function speakTicket(call) {
  if (!appConfig.voiceEnabled) return

  const spokenPhrase = buildSpokenAnnouncement(call)
  console.log('[Speech] Chamada falada:', spokenPhrase)

  // 1. BLOQUEIA TOTALMENTE (100% MUDO) O ÁUDIO DA TV E TOCA O SINO
  triggerAudioDucking(true)
  playChime()

  setTimeout(async () => {
    try {
      if (!appConfig.selectedVoiceURI || appConfig.selectedVoiceURI === 'google-tts') {
        await playSpeechWithGoogleTts(spokenPhrase)
      } else {
        await playSpeechWithWebSpeech(spokenPhrase)
      }
    } catch (err) {
      console.warn('[Speech] Erro ao reproduzir áudio da chamada:', err)
    } finally {
      // 2. DESBLOQUEIA E RESTAURA O VOLUME DA TV
      setTimeout(() => triggerAudioDucking(false), 500)
    }
  }, 400)
}

function renderCurrentCall(call) {
  if (!call) return

  currentServiceBadge.textContent = safeServiceLabel(call)
  currentTicket.textContent = safeTicketString(call)
  currentLocal.textContent = `${call.local || call.localName || 'Guichê'} ${String(call.numeroLocal || call.localNumber || 1).padStart(2, '0')}`
  const citizen = safeCitizenName(call)
  currentCitizen.textContent = citizen ? `👤 ${citizen}` : '👤 Cidadão'

  // Animação de Destaque
  cardCurrentCall.classList.add('highlight')
  setTimeout(() => cardCurrentCall.classList.remove('highlight'), 8000)
}

function renderHistory() {
  if (!historyList) return
  if (historyCalls.length === 0) {
    historyList.innerHTML = '<div class="history-empty">Nenhuma chamada anterior</div>'
    return
  }

  historyList.innerHTML = historyCalls.map((item, idx) => {
    const ticketStr = safeTicketString(item)
    const citizen = safeCitizenName(item)
    const service = safeServiceLabel(item)
    const localStr = `${item.local || item.localName || 'Guichê'} ${String(item.numeroLocal || item.localNumber || 1).padStart(2, '0')}`

    return `
      <div class="history-item ${idx === 0 ? 'latest' : ''}">
        <div class="history-item-left">
          <span class="history-item-ticket">${ticketStr}</span>
          <span class="history-item-local">${localStr}</span>
        </div>
        <span class="history-item-citizen">${citizen || service}</span>
      </div>
    `
  }).join('')
}

function handleNewCall(call) {
  if (!call || call.id === lastAnnouncedId) return
  lastAnnouncedId = call.id

  renderCurrentCall(call)
  historyCalls = [call, ...historyCalls.filter(c => c.id !== call.id)].slice(0, 5)
  renderHistory()
  speakTicket(call)
}

// 6. PREVISÃO DO TEMPO & LETREIRO DE NOTÍCIAS
const WMO_DESCRIPTIONS = {
  0: 'Céu limpo',
  1: 'Principalmente limpo',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Neblina',
  48: 'Nevoeiro',
  51: 'Garoa leve',
  53: 'Garoa moderada',
  55: 'Garoa densa',
  61: 'Chuva fraca',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  71: 'Neve fraca',
  73: 'Neve moderada',
  75: 'Neve forte',
  80: 'Pancadas de chuva leves',
  81: 'Pancadas de chuva moderadas',
  82: 'Pancadas de chuva fortes',
  95: 'Tempestade com trovoadas',
  96: 'Tempestade com granizo'
}

async function fetchWeather() {
  const city = appConfig.weatherCity || 'Garça'
  if (!weatherTemp || !weatherCity) return

  weatherCity.textContent = `${city} - SP`

  try {
    let data = null
    // 1. Tenta API central se disponível
    try {
      const resp = await fetch(`${appConfig.serverUrl}/api/weather?city=${encodeURIComponent(city)}`, { signal: AbortSignal.timeout(5000) })
      if (resp.ok) data = await resp.json()
    } catch {}

    // 2. Se falhar ou estiver offline da API central, usa Open-Meteo direto (Garça: -22.2139, -49.6547)
    if (!data || !data.temperature) {
      const resp = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-22.2139&longitude=-49.6547&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=America%2FSao_Paulo', { signal: AbortSignal.timeout(6000) })
      if (resp.ok) {
        const raw = await resp.json()
        const cur = raw?.current
        if (cur) {
          data = {
            temperature: cur.temperature_2m,
            humidity: cur.relative_humidity_2m,
            windSpeed: cur.wind_speed_10m,
            weatherCode: cur.weather_code
          }
        }
      }
    }

    if (data && typeof data.temperature === 'number') {
      weatherTemp.textContent = `${Math.round(data.temperature)}°`
      weatherCondition.textContent = WMO_DESCRIPTIONS[data.weatherCode] || 'Tempo estável'
      weatherDetails.textContent = `Umidade ${data.humidity || '--'}% · Vento ${Math.round(data.windSpeed || 0)} km/h`
    }
  } catch (err) {
    console.warn('[Weather] Erro ao carregar previsão:', err)
    if (weatherCondition) weatherCondition.textContent = 'Previsão indisponível'
  }
}

async function fetchNewsTicker() {
  if (!tickerContent) return
  const feedUrl = appConfig.rssFeedUrl || 'https://g1.globo.com/rss/g1/sp/bauru-marilia/'
  const base = appConfig.serverUrl.replace(/\/$/, '')

  try {
    let titles = []

    // 1. Tenta API de RSS centralizada do servidor
    try {
      const resp = await fetch(`${base}/api/rss?url=${encodeURIComponent(feedUrl)}&t=${Date.now()}`, { signal: AbortSignal.timeout(6000) })
      if (resp.ok) {
        const json = await resp.json()
        if (Array.isArray(json.titles) && json.titles.length > 0) {
          titles = json.titles
        }
      }
    } catch (e) {
      console.warn('[Ticker] Falha na API central de RSS:', e)
    }

    // 2. Se falhar ou estiver offline da API central, busca diretamente o RSS
    if (titles.length === 0) {
      try {
        const respDirect = await fetch(feedUrl, { signal: AbortSignal.timeout(6000) })
        if (respDirect.ok) {
          const xmlText = await respDirect.text()
          const parser = new DOMParser()
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
          const items = xmlDoc.querySelectorAll('item > title, entry > title')
          titles = Array.from(items).map(el => el.textContent.trim()).filter(Boolean)
        }
      } catch (errDirect) {
        console.warn('[Ticker] Falha no parse direto do XML:', errDirect)
      }
    }

    if (titles.length > 0) {
      const text = titles.join('   •   ') + '   •   '
      tickerContent.innerHTML = `<span>${text}</span>`
    }
  } catch (err) {
    console.error('[Ticker] Erro geral ao buscar notícias:', err)
  }
}

// 7. CONEXÃO EM TEMPO REAL MULTI-CANAL
// 7. CONEXÃO EM TEMPO REAL MULTI-CANAL & STATUS DE REDE
let isOnline = false

function setOnlineStatus(online) {
  isOnline = online
  if (connectionBadge && connectionText) {
    if (online) {
      connectionBadge.className = 'badge badge-online'
      connectionText.textContent = 'ONLINE'
    } else {
      connectionBadge.className = 'badge badge-offline'
      connectionText.textContent = 'RECONECTANDO'
    }
  }
}

function connectRealtime() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  if (mercureSource) {
    mercureSource.close()
    mercureSource = null
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }

  const base = appConfig.serverUrl.replace(/\/$/, '')
  console.log(`[Realtime] Iniciando conexões em tempo real para: ${base}`)

  // 1. Conexão Mercure SSE do NovoSGA (se configurado)
  if (appConfig.mercureUrl) {
    try {
      const uId = appConfig.novosgaUnitId || '6'
      const hubUrl = new URL(appConfig.mercureUrl)
      hubUrl.searchParams.append('topic', `http://10.15.25.31/unidades/${uId}/painel`)
      hubUrl.searchParams.append('topic', `/unidades/${uId}/painel`)
      hubUrl.searchParams.append('topic', '/paineis')

      mercureSource = new EventSource(hubUrl.toString())
      mercureSource.onopen = () => {
        setOnlineStatus(true)
      }
      mercureSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data && (data.senha || data.numSenha || data.numeroSenha || data.siglaSenha)) {
            setOnlineStatus(true)
            handleNewCall({
              id: data.id || Date.now(),
              senha: data.senha || `${data.siglaSenha || ''}${String(data.numSenha || data.numeroSenha || 1).padStart(2, '0')}`,
              local: data.local || 'Guichê',
              numeroLocal: data.numLocal || data.numeroLocal || 1,
              nomeCliente: data.nomeCliente || '',
              servico: { nome: data.servico || 'Atendimento' },
            })
          }
        } catch {}
      }
    } catch (_e) {}
  }

  // 2. Polling Ativo de Alta Frequência (NovoSGA / Agenda / TV API)
  let failureCount = 0

  const fetchRecent = async () => {
    let anySuccess = false

    try {
      const uId = appConfig.novosgaUnitId || '6'
      const pSlug = appConfig.panelSlug || 'semit'

      // Consulta tickets da Unidade / Painel
      const resTv = await fetch(`${base}/tv/api/tickets?unitId=${encodeURIComponent(uId)}&slug=${encodeURIComponent(pSlug)}&t=${Date.now()}`, { signal: AbortSignal.timeout(3000) }).catch(() => null)
      if (resTv && resTv.ok) {
        anySuccess = true
        const tickets = await resTv.json()
        if (Array.isArray(tickets) && tickets.length > 0) {
          const latest = tickets[0]
          if (latest && latest.id !== lastAnnouncedId) {
            handleNewCall({
              id: latest.id,
              senha: latest.senha || `${latest.sigla || ''}${latest.numero || ''}`,
              local: latest.local || 'Guichê',
              numeroLocal: latest.numeroLocal || 1,
              nomeCliente: latest.nomeCliente || '',
              servico: { nome: latest.servico || 'Atendimento' },
            })
          }
        }
      }

      // Consulta chamadas do Agenda
      const resAgenda = await fetch(`${base}/api/agenda/public/panels/calls?slug=${encodeURIComponent(pSlug)}&t=${Date.now()}`, { signal: AbortSignal.timeout(3000) }).catch(() => null)
      if (resAgenda && resAgenda.ok) {
        anySuccess = true
        const data = await resAgenda.json()
        if (data.items && data.items.length > 0) {
          const latest = data.items[0]
          if (latest && latest.id !== lastAnnouncedId) {
            handleNewCall(latest)
          }
        }
      }

      if (anySuccess) {
        failureCount = 0
        setOnlineStatus(true)
      } else {
        failureCount++
        if (failureCount >= 3) {
          setOnlineStatus(false)
        }
      }
    } catch {
      failureCount++
      if (failureCount >= 3) {
        setOnlineStatus(false)
      }
    }
  }

  fetchRecent()
  pollTimer = setInterval(fetchRecent, 2000)
}

// 8. CARREGAMENTO DINÂMICO DE VOZES (GOOGLE TTS + VOZES DO SISTEMA)
function populateVoices() {
  if (!selectVoice) return
  let sysVoices = []
  if ('speechSynthesis' in window) {
    sysVoices = window.speechSynthesis.getVoices() || []
  }

  const options = []
  const isGoogleSelected = !appConfig.selectedVoiceURI || appConfig.selectedVoiceURI === 'google-tts' || appConfig.selectedVoiceURI.includes('Google')

  options.push(`
    <option value="google-tts" ${isGoogleSelected ? 'selected' : ''}>
      Google Português do Brasil (Padrão Oficial TV Box) ★
    </option>
  `)

  sysVoices.forEach(v => {
    const isPt = v.lang.includes('pt-BR') || v.lang.includes('pt')
    const selected = (v.voiceURI === appConfig.selectedVoiceURI || v.name === appConfig.selectedVoiceURI)
    options.push(`
      <option value="${v.voiceURI || v.name}" ${selected ? 'selected' : ''}>
        ${v.name} (${v.lang})${isPt ? ' ★ Sistema' : ''}
      </option>
    `)
  })

  selectVoice.innerHTML = options.join('')
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = populateVoices
  populateVoices()
}

// 9. CARREGAMENTO DE DISPLAYS & PAINÉIS DO SERVIDOR
async function fetchServerDisplaysAndPanels() {
  const base = (inputServerUrl.value || appConfig.serverUrl).replace(/\/$/, '')
  btnFetchServerData.textContent = '⏳ Carregando...'

  try {
    const resDisplays = await fetch(`${base}/tv/api/displays?t=${Date.now()}`).catch(() => null)
    if (resDisplays && resDisplays.ok) {
      const displays = await resDisplays.json()
      if (Array.isArray(displays)) {
        loadedDisplays = displays
        selectTvDisplay.innerHTML = displays.map(d => `
          <option value="${d.id}" ${d.id === (inputDisplayIdManual.value || appConfig.displayId) ? 'selected' : ''}>
            ${d.displayName || d.name || d.id} (${d.orientation || 'Vertical 9:16'}${d.hardwareKey ? ' • ' + d.hardwareKey : ''})
          </option>
        `).join('')
      }
    }

    const resPanels = await fetch(`${base}/painel-senhas/api/panels?t=${Date.now()}`).catch(() => null)
    if (resPanels && resPanels.ok) {
      const panelsData = await resPanels.json()
      const list = Array.isArray(panelsData) ? panelsData : (panelsData.panels || [])
      if (Array.isArray(list) && list.length > 0) {
        loadedPanels = list
        selectPanelSlug.innerHTML = list.map(p => `
          <option value="${p.slug || p.id}" ${(p.slug || p.id) === (inputPanelSlugManual.value || appConfig.panelSlug) ? 'selected' : ''}>
            ${p.name || p.panelTitle || p.slug} (slug: ${p.slug || p.id})
          </option>
        `).join('')
      }
    }

    btnFetchServerData.textContent = '✅ Atualizado!'
    setTimeout(() => { btnFetchServerData.textContent = '🔄 Carregar Dados' }, 2000)
  } catch (err) {
    console.error('[Discovery] Erro ao carregar dados do servidor:', err)
    btnFetchServerData.textContent = '⚠️ Erro ao buscar'
    setTimeout(() => { btnFetchServerData.textContent = '🔄 Carregar Dados' }, 2000)
  }
}

selectPanelSlug.addEventListener('change', () => {
  const selectedSlug = selectPanelSlug.value
  inputPanelSlugManual.value = selectedSlug
  const p = loadedPanels.find(item => (item.slug || item.id) === selectedSlug)
  if (p) {
    if (p.novosgaApiUrl) inputNovosgaUrl.value = p.novosgaApiUrl
    if (p.mercurePublicUrl) inputMercureUrl.value = p.mercurePublicUrl
    if (p.oauth?.clientId) inputClientId.value = p.oauth.clientId
    if (p.oauth?.clientSecret) inputClientSecret.value = p.oauth.clientSecret
    if (p.oauth?.username) inputUsername.value = p.oauth.username
    if (p.oauth?.password) inputPassword.value = p.oauth.password
    if (p.units && p.units.length > 0) {
      inputNovosgaUnit.value = p.units.map(u => u.id).join(',')
      const allServices = p.units.flatMap(u => u.serviceIds || []).filter(Boolean)
      if (allServices.length > 0) inputNovosgaServices.value = allServices.join(',')
    }
    if (p.displayLayout) {
      checkTvEnabled.checked = p.displayLayout === 'programacao'
    }
    if (p.weatherCity) inputWeatherCity.value = p.weatherCity
    if (p.rssFeedUrl) inputRssFeedUrl.value = p.rssFeedUrl
  }
})

selectTvDisplay.addEventListener('change', () => {
  inputDisplayIdManual.value = selectTvDisplay.value
})

btnFetchServerData.addEventListener('click', fetchServerDisplaysAndPanels)

// 10. NAVEGAÇÃO POR ABAS DO MODAL
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))
    btn.classList.add('active')
    const tabId = btn.getAttribute('data-tab')
    const content = document.getElementById(tabId)
    if (content) content.classList.add('active')
  })
})

// 11. MODAL DE CONFIGURAÇÕES & ATALHOS
function openSettings() {
  inputServerUrl.value = appConfig.serverUrl
  inputPanelSlugManual.value = appConfig.panelSlug
  inputDisplayIdManual.value = appConfig.displayId
  inputWeatherCity.value = appConfig.weatherCity || 'Garça'
  inputRssFeedUrl.value = appConfig.rssFeedUrl || 'https://www.garca.sp.gov.br/portal/noticias/feed'
  checkTvEnabled.checked = appConfig.tvLayoutEnabled

  inputNovosgaUrl.value = appConfig.novosgaUrl || 'http://10.15.25.31'
  inputMercureUrl.value = appConfig.mercureUrl || 'http://10.15.25.31:3000/.well-known/mercure'
  inputClientId.value = appConfig.clientId || 'projetolapide@gmail.com'
  inputClientSecret.value = appConfig.clientSecret || ''
  inputUsername.value = appConfig.username || 'admin'
  inputPassword.value = appConfig.password || ''
  inputNovosgaUnit.value = appConfig.novosgaUnitId || '6'
  inputNovosgaServices.value = appConfig.novosgaServices || '82,83,84'

  checkVoiceEnabled.checked = appConfig.voiceEnabled !== false
  checkKiosk.checked = appConfig.kiosk
  rangeSpeechRate.value = appConfig.speechRate
  valSpeechRate.textContent = `${appConfig.speechRate}x`
  rangeTvVolume.value = appConfig.tvVolume
  valTvVolume.textContent = `${Math.round(appConfig.tvVolume * 100)}%`

  settingsModal.style.display = 'flex'
  populateVoices()
  fetchServerDisplaysAndPanels()
}

function closeSettings() {
  settingsModal.style.display = 'none'
}

btnSettings.addEventListener('click', openSettings)
btnCloseModal.addEventListener('click', closeSettings)
btnCancelSettings.addEventListener('click', closeSettings)

btnFullscreen.addEventListener('click', () => {
  if (window.desktopApi) window.desktopApi.toggleFullscreen()
})

btnForceSync.addEventListener('click', async () => {
  btnForceSync.textContent = '⏳ Sincronizando...'
  if (window.desktopApi) {
    await window.desktopApi.forceSync()
    const p = await window.desktopApi.getCachedPlaylist()
    updatePlaylist(p)
  }
  btnForceSync.textContent = '✅ Sincronizado!'
  setTimeout(() => { btnForceSync.textContent = '🔄 Forçar Sincronização e Download de Mídias em Disco' }, 2000)
})

btnTestVoice.addEventListener('click', () => {
  triggerAudioDucking(true)
  playChime()
  setTimeout(async () => {
    const testText = buildSpokenAnnouncement({
      senha: 'DAS06',
      local: 'Guichê',
      numeroLocal: 10,
      nomeCliente: '',
      servico: { nome: 'Atendimento' }
    })
    const selected = selectVoice.value
    if (!selected || selected === 'google-tts') {
      await playSpeechWithGoogleTts(testText)
    } else {
      await playSpeechWithWebSpeech(testText)
    }
    setTimeout(() => triggerAudioDucking(false), 500)
  }, 350)
})

rangeSpeechRate.addEventListener('input', (e) => {
  valSpeechRate.textContent = `${e.target.value}x`
})

rangeTvVolume.addEventListener('input', (e) => {
  const vol = parseFloat(e.target.value)
  appConfig.tvVolume = vol
  valTvVolume.textContent = `${Math.round(vol * 100)}%`
  applyTvVolume()
})

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  appConfig.serverUrl = inputServerUrl.value.trim()
  appConfig.panelSlug = inputPanelSlugManual.value.trim() || selectPanelSlug.value || 'semit'
  appConfig.displayId = inputDisplayIdManual.value.trim() || selectTvDisplay.value || 'semit'
  appConfig.weatherCity = inputWeatherCity.value.trim() || 'Garça'
  appConfig.rssFeedUrl = inputRssFeedUrl.value.trim() || 'https://www.garca.sp.gov.br/portal/noticias/feed'
  appConfig.tvLayoutEnabled = checkTvEnabled.checked

  appConfig.novosgaUrl = inputNovosgaUrl.value.trim()
  appConfig.mercureUrl = inputMercureUrl.value.trim()
  appConfig.clientId = inputClientId.value.trim()
  appConfig.clientSecret = inputClientSecret.value.trim()
  appConfig.username = inputUsername.value.trim()
  appConfig.password = inputPassword.value
  appConfig.novosgaUnitId = inputNovosgaUnit.value.trim()
  appConfig.novosgaServices = inputNovosgaServices.value.trim()

  appConfig.voiceEnabled = checkVoiceEnabled.checked
  appConfig.selectedVoiceURI = selectVoice.value
  appConfig.kiosk = checkKiosk.checked
  appConfig.speechRate = parseFloat(rangeSpeechRate.value)
  appConfig.tvVolume = parseFloat(rangeTvVolume.value)

  applyTvVolume()

  if (window.desktopApi) {
    await window.desktopApi.saveConfig(appConfig)
  }

  headerPanelTitle.textContent = `PAINEL DE ATENDIMENTO — ${appConfig.panelSlug.toUpperCase()}`
  applyTvLayout(appConfig.tvLayoutEnabled)
  fetchWeather()
  fetchNewsTicker()
  connectRealtime()
  closeSettings()
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'F2') {
    e.preventDefault()
    openSettings()
  } else if (e.key === 'Escape' && settingsModal.style.display === 'flex') {
    closeSettings()
  }
})

// 12. INICIALIZAÇÃO GERAL DO APP
async function init() {
  if (window.desktopApi) {
    const saved = await window.desktopApi.getConfig()
    if (saved) appConfig = { ...appConfig, ...saved }

    const initialPlaylist = await window.desktopApi.getCachedPlaylist()
    updatePlaylist(initialPlaylist)

    window.desktopApi.onPlaylistUpdated((newP) => {
      updatePlaylist(newP)
    })
  }

  if (appConfig.panelSlug) {
    headerPanelTitle.textContent = `PAINEL DE ATENDIMENTO — ${appConfig.panelSlug.toUpperCase()}`
  }

  applyTvVolume()
  applyTvLayout(appConfig.tvLayoutEnabled)
  fetchWeather()
  fetchNewsTicker()
  weatherTimer = setInterval(fetchWeather, 10 * 60 * 1000)
  tickerTimer = setInterval(fetchNewsTicker, 10 * 60 * 1000)

  connectRealtime()
  populateVoices()
}

init()
