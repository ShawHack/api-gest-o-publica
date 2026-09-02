import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID, createHmac } from 'node:crypto'
import { Readable } from 'node:stream'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data')
const DATA_FILE = join(DATA_DIR, 'panels.json')
const PORT = Number(process.env.PORT || 80)
const TV_PLAYER_UPSTREAM = 'https://api.garca.sp.gov.br/tv/'
const MERCURE_HUB_URL = 'http://10.15.25.31:3000/.well-known/mercure'
const MERCURE_SECRET = '!ChangeThisMercureHubJWTSecretKey!'

function makeMercureToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    mercure: { publish: ['*'], subscribe: ['*'] },
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url')
  const signature = createHmac('sha256', MERCURE_SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

function broadcastMercure(unitId, payload) {
  const topics = [
    `http://10.15.25.31/unidades/${unitId}/painel`,
    `/unidades/${unitId}/painel`,
    '/paineis',
    'http://10.15.25.31/paineis',
  ]
  const data = JSON.stringify({
    '@type': 'PainelSenha',
    ...payload,
  })
  const token = makeMercureToken()
  for (const topic of topics) {
    try {
      const body = new URLSearchParams()
      body.set('topic', topic)
      body.set('data', data)
      fetch(MERCURE_HUB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${token}`,
        },
        body: body.toString(),
        signal: AbortSignal.timeout(2000),
      }).catch(() => {})
    } catch (_e) {}
  }
}
let mysqlModule = null
let dbPool = null

async function getDbPool() {
  if (dbPool) return dbPool
  try {
    if (!mysqlModule) {
      mysqlModule = await import('mysql2/promise')
    }
    const createPool = mysqlModule.default?.createPool || mysqlModule.createPool
    dbPool = createPool({
      host: process.env.MYSQL_HOST || '10.15.25.31',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'novosga',
      password: process.env.MYSQL_PASSWORD || 'admin',
      database: process.env.MYSQL_DATABASE || 'novosga2',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 2000,
    })
    return dbPool
  } catch (err) {
    console.error('[MySQL] Falha ao inicializar pool:', err.message)
    return null
  }
}

async function insertPainelSenha(unitId, payload) {
  try {
    const pool = await getDbPool()
    if (!pool) return
    const servicoId = Number(payload.servico?.id) || (unitId === 4 ? 85 : 82)
    const numSenha = Number(payload.numeroSenha) || 1
    const sigSenha = String(payload.siglaSenha || 'AG').slice(0, 3)
    const msgSenha = ''
    const local = String(payload.local || 'Guichê').slice(0, 20)
    const numLocal = Number(payload.numeroLocal) || 1
    const peso = Number(payload.peso) || 1
    const prioridade = String(payload.prioridade || 'Agendamento Web').slice(0, 100)
    const nomeCliente = payload.nomeCliente ? String(payload.nomeCliente).slice(0, 100) : null
    const documentoCliente = payload.documentoCliente ? String(payload.documentoCliente).slice(0, 30) : null

    await pool.execute(
      `INSERT INTO painel_senha (servico_id, unidade_id, num_senha, sig_senha, msg_senha, local, num_local, peso, prioridade, nome_cliente, documento_cliente)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [servicoId, unitId, numSenha, sigSenha, msgSenha, local, numLocal, peso, prioridade, nomeCliente, documentoCliente]
    )
    console.log(`[MySQL] Inserido com sucesso em painel_senha: ${sigSenha}${numSenha} (unidade ${unitId}, local ${numLocal})`)
  } catch (err) {
    console.error('[MySQL] Erro ao inserir em painel_senha:', err.message)
  }
}
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true })
  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify({ panels: [] }, null, 2), 'utf8')
  }
}

async function readStore() {
  await ensureStore()
  const raw = await readFile(DATA_FILE, 'utf8')
  const parsed = JSON.parse(raw)
  return { panels: Array.isArray(parsed.panels) ? parsed.panels : [] }
}

async function writeStore(store) {
  await ensureStore()
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8')
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve(null)
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function normalizeOauth(input, existing) {
  const incoming = input?.oauth
  if (!incoming || typeof incoming !== 'object') {
    return existing?.oauth || null
  }
  const clientId = String(incoming.clientId || '').trim()
  const clientSecret = String(incoming.clientSecret || '').trim()
  const username = String(incoming.username || '').trim()
  const password = String(incoming.password || '')
  const prev = existing?.oauth || null

  // Campos vazios preservam o que já estava gravado (evita apagar ao salvar só unidades).
  const next = {
    clientId: clientId || prev?.clientId || '',
    clientSecret: clientSecret || prev?.clientSecret || '',
    username: username || prev?.username || '',
    password: password || prev?.password || '',
  }
  if (!next.clientId || !next.clientSecret || !next.username || !next.password) {
    return prev
  }
  return next
}

function sanitizePanel(input, existing) {
  const now = new Date().toISOString()
  const name = String(input?.name || existing?.name || 'Novo painel').trim()
  let slug = slugify(input?.slug || existing?.slug || name) || randomUUID().slice(0, 8)
  const units = Array.isArray(input?.units)
    ? input.units
        .filter((u) => u && Number(u.id) > 0)
        .map((u) => ({
          id: Number(u.id),
          name: String(u.name || `Unidade ${u.id}`),
          serviceIds: (u.serviceIds || []).map(Number).filter((id) => id > 0),
        }))
    : existing?.units || []

  return {
    id: existing?.id || randomUUID(),
    name,
    slug,
    status: input?.status === 'rascunho' ? 'rascunho' : 'publicado',
    novosgaApiUrl: String(input?.novosgaApiUrl || existing?.novosgaApiUrl || ''),
    mercurePublicUrl: String(input?.mercurePublicUrl || existing?.mercurePublicUrl || ''),
    units,
    panelTitle: String(input?.panelTitle || existing?.panelTitle || name),
    institutionName: String(input?.institutionName || existing?.institutionName || 'Prefeitura de Garça — SEMIT'),
    logoUrl: String(input?.logoUrl || existing?.logoUrl || ''),
    primaryColor: String(input?.primaryColor || existing?.primaryColor || '#0b5fff'),
    theme: input?.theme === 'light' ? 'light' : 'dark',
    displayLayout:
      (input?.displayLayout ?? existing?.displayLayout) === 'programacao' ? 'programacao' : 'classic',
    historySize: Number(input?.historySize || existing?.historySize || 6),
    speechEnabled: input?.speechEnabled !== false,
    speechVolume: Number(input?.speechVolume ?? existing?.speechVolume ?? 1),
    speechRate: Number(input?.speechRate ?? existing?.speechRate ?? 1),
    speechVoice: String(input?.speechVoice || existing?.speechVoice || 'auto-female'),
    mediaEnabled: input?.mediaEnabled !== false,
    mediaDurationMs: Number(input?.mediaDurationMs || existing?.mediaDurationMs || 12000),
    mediaItems: Array.isArray(input?.mediaItems) ? input.mediaItems : existing?.mediaItems || [],
    widgetsEnabled: input?.widgetsEnabled !== false,
    weatherCity: String(input?.weatherCity || existing?.weatherCity || 'Garça').trim() || 'Garça',
    rssFeedUrl: String(
      input?.rssFeedUrl ?? existing?.rssFeedUrl ?? 'https://g1.globo.com/rss/g1/',
    ).trim(),
    oauth: normalizeOauth(input, existing),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
}

/** Resposta pública: nunca inclui segredos OAuth. */
function publicPanel(panel) {
  const { oauth, ...rest } = panel
  return {
    ...rest,
    hasOauth: Boolean(
      oauth?.clientId && oauth?.clientSecret && oauth?.username && oauth?.password,
    ),
  }
}

async function requestNovoSgaToken(apiUrl, oauth, refreshToken) {
  const base = String(apiUrl || '').replace(/\/$/, '')
  if (!base) throw new Error('URL do NovoSGA não configurada no painel')
  if (!oauth?.clientId || !oauth?.clientSecret || !oauth?.username || !oauth?.password) {
    throw new Error('Credenciais OAuth não configuradas neste painel')
  }

  const params = new URLSearchParams()
  if (refreshToken) {
    params.set('grant_type', 'refresh_token')
    params.set('client_id', oauth.clientId)
    params.set('client_secret', oauth.clientSecret)
    params.set('refresh_token', refreshToken)
  } else {
    params.set('grant_type', 'password')
    params.set('client_id', oauth.clientId)
    params.set('client_secret', oauth.clientSecret)
    params.set('username', oauth.username)
    params.set('password', oauth.password)
  }

  const response = await fetch(`${base}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`OAuth NovoSGA: resposta inválida (${response.status})`)
  }
  if (!response.ok) {
    throw new Error(data.error_description || data.error || `OAuth falhou (${response.status})`)
  }
  if (!data.access_token) {
    throw new Error('OAuth NovoSGA não retornou access_token')
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresIn: Number(data.expires_in || 3600),
  }
}

async function fetchWeather(city) {
  const q = String(city || '').trim()
  if (!q) throw new Error('Informe a cidade')

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=pt&format=json`,
  )
  if (!geoRes.ok) throw new Error(`Geocoding falhou (${geoRes.status})`)
  const geo = await geoRes.json()
  const place = geo?.results?.[0]
  if (!place) throw new Error(`Cidade não encontrada: ${q}`)

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=America%2FSao_Paulo`,
  )
  if (!weatherRes.ok) throw new Error(`Clima falhou (${weatherRes.status})`)
  const weather = await weatherRes.json()
  const current = weather?.current
  if (!current) throw new Error('Resposta de clima inválida')

  return {
    city: place.name,
    admin1: place.admin1 || '',
    country: place.country || '',
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    weatherCode: current.weather_code,
    updatedAt: current.time || new Date().toISOString(),
  }
}

function decodeXml(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim()
}

function parseRssTitles(xml, limit = 12) {
  const titles = []
  const itemRegex = /<item[\s\S]*?<\/item>/gi
  const items = xml.match(itemRegex) || []
  for (const item of items) {
    const match = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (!match) continue
    const title = decodeXml(match[1]).replace(/\s+/g, ' ')
    if (title && !titles.includes(title)) titles.push(title)
    if (titles.length >= limit) break
  }
  if (!titles.length) {
    const entryRegex = /<entry[\s\S]*?<\/entry>/gi
    const entries = xml.match(entryRegex) || []
    for (const entry of entries) {
      const match = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      if (!match) continue
      const title = decodeXml(match[1]).replace(/\s+/g, ' ')
      if (title && !titles.includes(title)) titles.push(title)
      if (titles.length >= limit) break
    }
  }
  return titles
}

async function fetchRss(feedUrl) {
  const url = String(feedUrl || '').trim()
  if (!url) throw new Error('Informe a URL do feed RSS')
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('URL do feed RSS inválida')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('URL do feed deve ser http(s)')
  }

  const response = await fetch(url, {
    headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
  })
  if (!response.ok) throw new Error(`RSS falhou (${response.status})`)
  const xml = await response.text()
  const titles = parseRssTitles(xml)
  if (!titles.length) throw new Error('Nenhuma manchete encontrada no feed')
  return { url, titles, fetchedAt: new Date().toISOString() }
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  const parts = url.pathname.split('/').filter(Boolean) // api, panels, :id?

  if (req.method === 'GET' && parts.length === 2 && parts[1] === 'weather') {
    try {
      const data = await fetchWeather(url.searchParams.get('city') || 'Garça')
      sendJson(res, 200, data)
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'Falha no clima' })
    }
    return
  }

  if (req.method === 'GET' && parts.length === 2 && parts[1] === 'rss') {
    try {
      const data = await fetchRss(url.searchParams.get('url') || '')
      sendJson(res, 200, data)
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'Falha no RSS' })
    }
    return
  }

  const store = await readStore()

  if (req.method === 'GET' && parts.length === 2 && parts[1] === 'panels') {
    sendJson(res, 200, store.panels.map(publicPanel))
    return
  }

  if (req.method === 'GET' && parts.length === 3 && parts[1] === 'panels') {
    const key = decodeURIComponent(parts[2])
    const panel = store.panels.find((p) => p.id === key || p.slug === key)
    if (!panel) return sendJson(res, 404, { error: 'Painel não encontrado' })
    sendJson(res, 200, publicPanel(panel))
    return
  }

  // TV/kiosk: obtém token OAuth usando credenciais gravadas no servidor.
  if (req.method === 'POST' && parts.length === 4 && parts[1] === 'panels' && parts[3] === 'token') {
    const key = decodeURIComponent(parts[2])
    const panel = store.panels.find((p) => p.id === key || p.slug === key)
    if (!panel) return sendJson(res, 404, { error: 'Painel não encontrado' })
    try {
      const body = await readBody(req)
      const tokens = await requestNovoSgaToken(
        panel.novosgaApiUrl,
        panel.oauth,
        body?.refreshToken || null,
      )
      sendJson(res, 200, tokens)
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'Falha OAuth' })
    }
    return
  }

  if (req.method === 'POST' && parts.length === 2 && parts[1] === 'panels') {
    const body = await readBody(req)
    let panel = sanitizePanel(body, null)
    if (store.panels.some((p) => p.slug === panel.slug)) {
      panel = { ...panel, slug: `${panel.slug}-${panel.id.slice(0, 4)}` }
    }
    store.panels.push(panel)
    await writeStore(store)
    sendJson(res, 201, publicPanel(panel))
    return
  }

  if ((req.method === 'PUT' || req.method === 'PATCH') && parts.length === 3 && parts[1] === 'panels') {
    const key = decodeURIComponent(parts[2])
    const idx = store.panels.findIndex((p) => p.id === key || p.slug === key)
    if (idx < 0) return sendJson(res, 404, { error: 'Painel não encontrado' })
    const body = await readBody(req)
    let panel = sanitizePanel(body, store.panels[idx])
    const clash = store.panels.find((p, i) => i !== idx && p.slug === panel.slug)
    if (clash) panel = { ...panel, slug: `${panel.slug}-${panel.id.slice(0, 4)}` }
    store.panels[idx] = panel
    await writeStore(store)
    sendJson(res, 200, publicPanel(panel))
    return
  }

  // SSE e chamadas nativas em tempo real
  const sseClients = globalThis.__sseClients || (globalThis.__sseClients = new Map())
  const recentCalls = globalThis.__recentCalls || (globalThis.__recentCalls = new Map())

  // 1. Inscrição SSE da TV: GET /api/panels/:slug/events
  if (req.method === 'GET' && parts.length === 4 && parts[1] === 'panels' && parts[3] === 'events') {
    const key = decodeURIComponent(parts[2])
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })
    res.write(`data: ${JSON.stringify({ type: 'connected', panel: key })}\n\n`)

    if (!sseClients.has(key)) sseClients.set(key, new Set())
    const panelSet = sseClients.get(key)
    panelSet.add(res)

    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n')
    }, 15000)

    req.on('close', () => {
      clearInterval(keepAlive)
      panelSet.delete(res)
    })
    return
  }

  // 2. Consulta de chamadas recentes: GET /api/panels/:slug/calls
  if (req.method === 'GET' && parts.length === 4 && parts[1] === 'panels' && parts[3] === 'calls') {
    const key = decodeURIComponent(parts[2])
    const list = recentCalls.get(key) || []
    sendJson(res, 200, list)
    return
  }

  // 3. Emissão de chamada em tempo real: POST /api/panels/:slug/call
  if (req.method === 'POST' && parts.length === 4 && parts[1] === 'panels' && parts[3] === 'call') {
    const key = decodeURIComponent(parts[2])
    try {
      const callData = await readBody(req)
      if (!callData) return sendJson(res, 400, { error: 'Payload de chamada ausente' })
      
      const payload = {
        id: callData.id || Date.now(),
        senha: callData.senha || 'AG01',
        siglaSenha: callData.siglaSenha || 'AG',
        numeroSenha: Number(callData.numeroSenha) || 1,
        local: callData.local || 'Guichê',
        numeroLocal: Number(callData.numeroLocal) || 1,
        peso: 1,
        prioridade: 'Agendamento',
        corPrioridade: callData.corPrioridade || '#0b5fff',
        nomeCliente: callData.nomeCliente || 'Cidadão',
        documentoCliente: callData.documentoCliente || '',
        servico: {
          id: Number(callData.servico?.id) || 1,
          nome: callData.servico?.nome || 'Atendimento',
        },
        calledAt: new Date().toISOString(),
      }

      if (!recentCalls.has(key)) recentCalls.set(key, [])
      const list = recentCalls.get(key)
      list.unshift(payload)
      if (list.length > 20) list.pop()

      // Broadcast para todos os clientes conectados neste painel e globais
      const targets = [sseClients.get(key), sseClients.get('*'), sseClients.get('all')].filter(Boolean)
      let deliveredCount = 0
      for (const group of targets) {
        for (const clientRes of group) {
          try {
            clientRes.write(`data: ${JSON.stringify(payload)}\n\n`)
            deliveredCount++
          } catch (_e) {
            // falha em cliente individual
          }
        }
      }

      const panel = store.panels.find((p) => p.id === key || p.slug === key)
      const unitId = Number(callData.novosgaUnitId || panel?.units?.[0]?.id || (key === 'sedetur' ? 4 : 6))

      // 1. Inserir no banco de dados do NovoSGA (painel_senha) para atender apps mobile e TVs oficiais
      await insertPainelSenha(unitId, payload)

      // 2. Broadcast também no Mercure Hub para clientes e apps mobile do NovoSGA
      broadcastMercure(unitId, payload)

      sendJson(res, 200, { success: true, deliveredTo: deliveredCount, payload })
    } catch (err) {
      sendJson(res, 500, { error: err instanceof Error ? err.message : 'Falha ao processar chamada' })
    }
    return
  }

  sendJson(res, 404, { error: 'Rota não encontrada' })
}

function serveStatic(req, res, pathname) {
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(DIST, safePath === '/' ? 'index.html' : safePath)
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403).end('Forbidden')
    return
  }
  if (!existsSync(filePath) || !extname(filePath)) {
    filePath = join(DIST, 'index.html')
  }
  if (!existsSync(filePath)) {
    res.writeHead(404).end('Not found')
    return
  }
  const type = MIME[extname(filePath)] || 'application/octet-stream'
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': type }
  const ext = extname(filePath)
  if (ext === '.html' || filePath.endsWith('index.html')) {
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
    headers.Pragma = 'no-cache'
  } else if (['.js', '.css', '.woff2', '.png', '.jpg', '.jpeg', '.svg', '.ico'].includes(ext)) {
    headers['Cache-Control'] = 'public, max-age=604800, immutable'
  }
  res.writeHead(200, headers)
  createReadStream(filePath).pipe(res)
}

async function proxyTvPlayer(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    res.end('Method not allowed')
    return
  }

  const relativePath = url.pathname.slice('/tv-player/'.length)
  const upstreamUrl = new URL(relativePath + url.search, TV_PLAYER_UPSTREAM)
  const response = await fetch(upstreamUrl, {
    method: req.method,
    headers: {
      Accept: req.headers.accept || '*/*',
      'Accept-Language': req.headers['accept-language'] || 'pt-BR',
    },
    redirect: 'follow',
  })

  const blockedHeaders = new Set([
    'connection',
    'content-encoding',
    'content-length',
    'content-security-policy',
    'keep-alive',
    'transfer-encoding',
    'x-frame-options',
  ])
  const headers = {}
  response.headers.forEach((value, name) => {
    if (!blockedHeaders.has(name.toLowerCase())) headers[name] = value
  })
  headers['Cache-Control'] = 'no-store'
  res.writeHead(response.status, headers)

  if (req.method === 'HEAD' || !response.body) {
    res.end()
    return
  }
  Readable.fromWeb(response.body).pipe(res)
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('ok')
      return
    }
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url)
      return
    }
    if (url.pathname === '/tv-player') {
      res.writeHead(302, { Location: `/tv-player/${url.search}` })
      res.end()
      return
    }
    if (url.pathname.startsWith('/tv-player/')) {
      await proxyTvPlayer(req, res, url)
      return
    }
    serveStatic(req, res, url.pathname)
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { error: 'Erro interno' })
  }
})

await ensureStore()
server.listen(PORT, () => {
  console.log(`painel-semit listening on :${PORT} (data: ${DATA_FILE})`)
})
