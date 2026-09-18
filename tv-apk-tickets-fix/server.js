const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

const app = express();
const PORT = process.env.PORT || 3050;

// Garantir que diretórios de dados existam
const DATA_DIR = path.join(__dirname, 'data');
const CACHE_DIR = path.join(__dirname, 'data', 'cache');
const MEDIA_DIR = path.join(__dirname, 'data', 'media');

[DATA_DIR, CACHE_DIR, MEDIA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// -------------------------------------------------------------
// Helpers de Múltiplos Displays / Telas
// -------------------------------------------------------------
function sanitizeDisplayId(displayId) {
    if (!displayId || displayId === 'default' || displayId === 'tv1' || displayId === 'prototipo1') {
        return 'default';
    }
    return displayId.toString().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

function getDisplayConfigFile(displayId) {
    const safeId = sanitizeDisplayId(displayId);
    if (safeId === 'default') return path.join(DATA_DIR, 'config.json');
    return path.join(DATA_DIR, `config_${safeId}.json`);
}

function getDisplayPlaylistFile(displayId) {
    const safeId = sanitizeDisplayId(displayId);
    if (safeId === 'default') return path.join(DATA_DIR, 'playlist.json');
    const specific = path.join(DATA_DIR, `playlist_${safeId}.json`);
    if (fs.existsSync(specific)) return specific;
    return path.join(DATA_DIR, 'playlist.json'); // fallback
}

function loadConfig(displayId = 'default') {
    const safeId = sanitizeDisplayId(displayId);
    const configFile = getDisplayConfigFile(safeId);
    const mainConfigFile = path.join(DATA_DIR, 'config.json');
    
    let baseConfig = {};
    if (fs.existsSync(mainConfigFile)) {
        try {
            baseConfig = JSON.parse(fs.readFileSync(mainConfigFile, 'utf8'));
        } catch (e) {}
    }

    if (fs.existsSync(configFile)) {
        try {
            const loaded = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            return { ...baseConfig, ...loaded, displayId: safeId };
        } catch (e) {
            console.error(`Erro ao ler ${configFile}:`, e);
        }
    }

    const defaultHwKey = safeId === 'default'
        ? (baseConfig.hardwareKey || 'tv_corp_' + Math.random().toString(36).substring(2, 10))
        : `tv_corp_${safeId}`;

    const defaultDisplayName = safeId === 'default'
        ? (baseConfig.displayName || 'SEMIT TV 01')
        : `SEMIT TV - ${safeId.toUpperCase()}`;

    const newConfig = {
        cmsUrl: baseConfig.cmsUrl || process.env.XIBO_CMS_URL || 'http://10.15.25.29',
        serverKey: baseConfig.serverKey || process.env.SERVER_KEY || 'semit',
        hardwareKey: defaultHwKey,
        displayName: defaultDisplayName,
        displayId: safeId,
        orientation: baseConfig.orientation || 'landscape',
        activeLayout: baseConfig.activeLayout || '3-zone-corporate',
        weatherCity: baseConfig.weatherCity || 'Garça',
        weatherLat: baseConfig.weatherLat || -22.2139,
        weatherLon: baseConfig.weatherLon || -49.6558,
        newsFeedUrl: baseConfig.newsFeedUrl || 'https://g1.globo.com/rss/g1/',
        syncIntervalSec: baseConfig.syncIntervalSec || 60,
        enableEmergencyAlert: false,
        emergencyMessage: baseConfig.emergencyMessage || 'Atenção: Comunicado oficial em andamento.',
        resolution: baseConfig.resolution || 'auto'
    };

    fs.writeFileSync(configFile, JSON.stringify(newConfig, null, 2));
    return newConfig;
}

function getCachedMediaList() {
    try {
        const files = fs.readdirSync(MEDIA_DIR);
        return files.filter(f => !f.startsWith('.')).map(f => {
            const fullPath = path.join(MEDIA_DIR, f);
            const stat = fs.statSync(fullPath);
            const isVideo = f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv');
            const isImage = f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.gif') || f.endsWith('.webp');
            return {
                fileName: f,
                sizeBytes: stat.size,
                sizeFormatted: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
                type: isVideo ? 'video' : (isImage ? 'image' : 'file'),
                updatedAt: stat.mtime.toISOString(),
                url: `data/media/${f}`
            };
        });
    } catch (e) {
        return [];
    }
}

function listKnownDisplays() {
    const displays = new Set(['default']);
    try {
        const files = fs.readdirSync(DATA_DIR);
        for (const file of files) {
            const m = file.match(/^config_(.+)\.json$/);
            if (m) displays.add(m[1]);
        }
    } catch (e) {}

    const cachedMedia = getCachedMediaList();

    return Array.from(displays).map(id => {
        const cfg = loadConfig(id);
        const playlist = loadPlaylist(id);
        const state = syncStates[id] || { status: 'idle', lastSync: null, layoutName: 'Layout SEMIT TV' };
        
        let lastSyncTime = state.lastSync;
        const lastSyncFile = path.join(DATA_DIR, `last_sync_${id}.json`);
        if (fs.existsSync(lastSyncFile)) {
            try {
                const info = JSON.parse(fs.readFileSync(lastSyncFile, 'utf8'));
                if (info.lastSync) lastSyncTime = info.lastSync;
            } catch (e) {}
        }

        return {
            id,
            displayName: cfg.displayName || (id === 'default' ? 'Protótipo 01 (Principal)' : `TV Corporativa - ${id.toUpperCase()}`),
            hardwareKey: cfg.hardwareKey,
            orientation: cfg.orientation || 'landscape',
            activeLayout: cfg.activeLayout || '3-zone-corporate',
            resolution: cfg.resolution || 'auto',
            cmsUrl: cfg.cmsUrl || 'http://10.15.25.29',
            playlistCount: playlist.length,
            cachedMediaCount: cachedMedia.length,
            lastSync: lastSyncTime || new Date().toISOString(),
            syncStatus: state.status || 'idle',
            directUrl: id === 'default' ? '/tv/' : `/tv/?display=${id}`
        };
    });
}

// Carrega config default inicial
let defaultAppConfig = loadConfig('default');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
}));
app.use('/data/media', express.static(path.join(__dirname, 'data', 'media'), {
    maxAge: '7d',
    immutable: true,
    acceptRanges: true,
    setHeaders: (res, filePath) => {
        res.set('Accept-Ranges', 'bytes');
        res.set('Cache-Control', 'public, max-age=604800, immutable');
        res.set('Access-Control-Allow-Origin', '*');
    }
}));
app.use('/sdk', express.static(path.join(__dirname, 'xiboplayer', 'packages')));

// XML Parser & Builder
const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const xmlBuilder = new XMLBuilder({ ignoreAttributes: false });

// -------------------------------------------------------------
// Endpoints de Status e Configuração Multi-Display
// -------------------------------------------------------------

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.2.0' });
});

app.get('/api/displays', (req, res) => {
    res.json(listKnownDisplays());
});

app.post('/api/displays', async (req, res) => {
    try {
        const { name, id, orientation, activeLayout } = req.body;
        const displayName = name ? name.trim() : '';
        const rawId = id || displayName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const safeId = sanitizeDisplayId(rawId);
        
        const configFile = getDisplayConfigFile(safeId);
        let cfg = loadConfig(safeId);
        if (displayName) cfg.displayName = displayName;
        if (orientation) cfg.orientation = orientation;
        if (activeLayout) cfg.activeLayout = activeLayout;

        fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));

        // Enviar auto-registro ao Xibo
        sendXiboHeartbeatForDisplay(cfg).catch(() => {});

        res.json({ success: true, display: cfg, message: `Display ${cfg.displayName} cadastrado com sucesso!` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/displays/:id', (req, res) => {
    try {
        const safeId = sanitizeDisplayId(req.params.id);
        if (safeId === 'default') {
            return res.status(400).json({ success: false, error: 'O Display Principal (default) não pode ser excluído.' });
        }
        const configFile = getDisplayConfigFile(safeId);
        const playlistFile = path.join(DATA_DIR, `playlist_${safeId}.json`);
        const syncFile = path.join(DATA_DIR, `last_sync_${safeId}.json`);

        if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
        if (fs.existsSync(playlistFile)) fs.unlinkSync(playlistFile);
        if (fs.existsSync(syncFile)) fs.unlinkSync(syncFile);

        res.json({ success: true, message: `Display ${safeId} excluído com sucesso.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/config', (req, res) => {
    const displayId = req.query.display || req.query.id || 'default';
    const config = loadConfig(displayId);
    res.json(config);
});

app.post('/api/config', (req, res) => {
    try {
        const displayId = req.query.display || req.body.displayId || 'default';
        const safeId = sanitizeDisplayId(displayId);
        const configFile = getDisplayConfigFile(safeId);
        
        let current = loadConfig(safeId);
        current = { ...current, ...req.body, displayId: safeId };
        
        fs.writeFileSync(configFile, JSON.stringify(current, null, 2));
        if (safeId === 'default') {
            defaultAppConfig = current;
        }
        res.json({ success: true, config: current });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// -------------------------------------------------------------
// Integração Xibo CMS (XMDS SOAP Bridge) Multi-Display
// -------------------------------------------------------------

app.get('/api/xibo/status', async (req, res) => {
    const displayId = req.query.display || 'default';
    const cfg = loadConfig(displayId);
    try {
        const start = Date.now();
        const response = await axios.get(cfg.cmsUrl, { timeout: 4000 });
        res.json({
            online: true,
            statusCode: response.status,
            latencyMs: Date.now() - start,
            cmsUrl: cfg.cmsUrl,
            serverKey: cfg.serverKey ? 'Configurada' : 'Não configurada',
            displayName: cfg.displayName,
            hardwareKey: cfg.hardwareKey,
            displayId: cfg.displayId
        });
    } catch (err) {
        res.json({
            online: false,
            error: err.message,
            cmsUrl: cfg.cmsUrl
        });
    }
});

// Registro do Display no Xibo CMS via XMDS SOAP
app.post('/api/xibo/register', async (req, res) => {
    const displayId = req.query.display || req.body.displayId || 'default';
    const cfg = loadConfig(displayId);

    try {
        const key = req.body.serverKey || cfg.serverKey;
        const hwKey = req.body.hardwareKey || cfg.hardwareKey;
        const name = req.body.displayName || cfg.displayName;

        const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="urn:xmds">
  <SOAP-ENV:Body>
    <ns1:RegisterDisplay>
      <serverKey>${key}</serverKey>
      <hardwareKey>${hwKey}</hardwareKey>
      <displayName>${name}</displayName>
      <clientType>android</clientType>
      <clientVersion>300</clientVersion>
      <clientCode>300</clientCode>
      <operatingSystem>Android</operatingSystem>
      <macAddress>00:11:22:33:44:55</macAddress>
    </ns1:RegisterDisplay>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

        const response = await axios.post(`${cfg.cmsUrl}/xmds.php?v=5`, soapEnvelope, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'urn:xmds#RegisterDisplay'
            },
            timeout: 8000
        });

        const parsed = xmlParser.parse(response.data);
        res.json({ success: true, message: `Display ${name} (${hwKey}) registrado com sucesso no Xibo CMS!`, parsed });
    } catch (err) {
        let errorDetail = err.message;
        if (err.response && err.response.data) {
            try {
                const parsedError = xmlParser.parse(err.response.data);
                const fault = parsedError['SOAP-ENV:Envelope']?.['SOAP-ENV:Body']?.['SOAP-ENV:Fault'] ||
                              parsedError['soap:Envelope']?.['soap:Body']?.['soap:Fault'];
                if (fault && fault.faultstring) {
                    errorDetail = fault.faultstring;
                }
            } catch (e) {}
        }
        res.json({
            success: false,
            message: `Resposta do Xibo CMS: ${errorDetail}`,
            error: errorDetail
        });
    }
});

// -------------------------------------------------------------
// Heartbeat Periódico Completo para manter o Player ONLINE no Xibo CMS
// -------------------------------------------------------------
async function sendXiboHeartbeatForDisplay(cfg) {
    if (!cfg.serverKey || !cfg.hardwareKey) return;

    const safeId = sanitizeDisplayId(cfg.displayId || 'default');
    const macSuffix = (safeId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 89 + 10).toString();
    const macAddress = `00:11:22:33:44:${macSuffix}`;

    // 1. Sempre enviar RegisterDisplay primeiro ou em paralelo para manter o CMS atualizado
    try {
        const soapReg = `<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="urn:xmds">
  <SOAP-ENV:Body>
    <ns1:RegisterDisplay>
      <serverKey>${cfg.serverKey}</serverKey>
      <hardwareKey>${cfg.hardwareKey}</hardwareKey>
      <displayName>${cfg.displayName}</displayName>
      <clientType>android</clientType>
      <clientVersion>300</clientVersion>
      <clientCode>300</clientCode>
      <operatingSystem>Android</operatingSystem>
      <macAddress>${macAddress}</macAddress>
    </ns1:RegisterDisplay>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
        await axios.post(`${cfg.cmsUrl}/xmds.php?v=5`, soapReg, {
            headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': 'urn:xmds#RegisterDisplay' },
            timeout: 5000
        });
    } catch (e) {}

    // 2. Enviar Schedule (Atualiza o Último Acesso e Status Online no Xibo CMS)
    try {
        const soapSchedule = `<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="urn:xmds">
  <SOAP-ENV:Body>
    <ns1:Schedule>
      <serverKey>${cfg.serverKey}</serverKey>
      <hardwareKey>${cfg.hardwareKey}</hardwareKey>
      <clientVersion>300</clientVersion>
    </ns1:Schedule>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

        const res = await axios.post(`${cfg.cmsUrl}/xmds.php?v=5`, soapSchedule, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'urn:xmds#Schedule'
            },
            timeout: 5000
        });

        console.log(`💓 [ONLINE] Heartbeat Schedule Xibo enviado: ${cfg.displayName} (${cfg.hardwareKey}) -> HTTP ${res.status}`);
    } catch (err) {
        if (err.response && err.response.data && err.response.data.includes('not authorised')) {
            console.log(`⚠️ Display ${cfg.displayName} (${cfg.hardwareKey}) aguardando autorização no Xibo CMS.`);
        } else {
            console.warn(`Falha no Heartbeat Xibo (${cfg.displayName}):`, err.message);
        }
    }
}

async function sendAllHeartbeats() {
    const displays = listKnownDisplays();
    await Promise.allSettled(displays.map(d => {
        const cfg = loadConfig(d.id);
        return sendXiboHeartbeatForDisplay(cfg);
    }));
}

// -------------------------------------------------------------
// Monitoramento e Download de Layouts/Mídias do Xibo CMS
// -------------------------------------------------------------
const syncStates = {};

function getSyncState(displayId = 'default') {
    const safeId = sanitizeDisplayId(displayId);
    if (!syncStates[safeId]) {
        syncStates[safeId] = {
            status: 'idle',
            progress: 100,
            currentFile: '',
            totalFiles: 0,
            completedFiles: 0,
            lastSync: new Date().toISOString(),
            layoutName: 'Ouvidoria'
        };
    }
    return syncStates[safeId];
}

app.get('/api/xibo/sync-status', (req, res) => {
    const displayId = req.query.display || 'default';
    const safeId = sanitizeDisplayId(displayId);
    const state = getSyncState(safeId);
    const cachedMedia = getCachedMediaList();
    const playlist = loadPlaylist(safeId);
    const cfg = loadConfig(safeId);

    const lastSyncFile = path.join(DATA_DIR, `last_sync_${safeId}.json`);
    let persistedInfo = {};
    if (fs.existsSync(lastSyncFile)) {
        try {
            persistedInfo = JSON.parse(fs.readFileSync(lastSyncFile, 'utf8'));
        } catch (e) {}
    }

    res.json({
        ...state,
        displayId: safeId,
        displayName: cfg.displayName,
        hardwareKey: cfg.hardwareKey,
        lastSync: state.lastSync || persistedInfo.lastSync || new Date().toISOString(),
        cachedMedia,
        cachedMediaCount: cachedMedia.length,
        playlistCount: playlist.length,
        playlistItems: playlist,
        serverTime: new Date().toISOString()
    });
});

async function downloadXmdsFile(cfg, fileId, fileType, savePath, expectedSize = 0) {
    let offset = 0;
    const chunkSize = 1048576; // 1MB por chunk (super estável no PHP/Apache do Xibo)
    const chunks = [];

    while (true) {
        let attempts = 0;
        let success = false;
        let response = null;

        while (attempts < 3 && !success) {
            attempts++;
            try {
                const soap = `<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="urn:xmds">
  <SOAP-ENV:Body>
    <ns1:GetFile>
      <serverKey>${cfg.serverKey}</serverKey>
      <hardwareKey>${cfg.hardwareKey}</hardwareKey>
      <fileId>${fileId}</fileId>
      <fileType>${fileType}</fileType>
      <chunkOffset>${offset}</chunkOffset>
      <chunkSize>${chunkSize}</chunkSize>
      <chuckSize>${chunkSize}</chuckSize>
    </ns1:GetFile>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

                response = await axios.post(`${cfg.cmsUrl}/xmds.php?v=5`, soap, {
                    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': 'urn:xmds#GetFile' },
                    timeout: 45000
                });
                success = true;
            } catch (retryErr) {
                if (attempts >= 3) throw retryErr;
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        const parsed = xmlParser.parse(response.data);
        const getFileResp = parsed['SOAP-ENV:Envelope']?.['SOAP-ENV:Body']?.['ns1:GetFileResponse'] ||
                            parsed['SOAP-ENV:Envelope']?.['SOAP-ENV:Body']?.['GetFileResponse'];
        const fileField = getFileResp?.file || getFileResp?.['fileContent'];
        const base64Str = typeof fileField === 'string' ? fileField : fileField?.['#text'];

        if (!base64Str || base64Str.length === 0) break;

        const buffer = Buffer.from(base64Str, 'base64');
        chunks.push(buffer);
        offset += buffer.length;

        if (buffer.length < chunkSize || (expectedSize > 0 && offset >= expectedSize)) {
            break;
        }
    }

    if (chunks.length > 0) {
        const fullBuffer = Buffer.concat(chunks);
        fs.writeFileSync(savePath, fullBuffer);
        console.log(`📥 Arquivo baixado e salvo com sucesso: ${path.basename(savePath)} (${fullBuffer.length} bytes)`);
        return true;
    }
    return false;
}

async function performFullXiboSync(displayId = 'default') {
    const safeId = sanitizeDisplayId(displayId);
    const cfg = loadConfig(safeId);
    const state = getSyncState(safeId);

    if (!cfg.serverKey || !cfg.hardwareKey) return;

    try {
        state.status = 'syncing';
        state.progress = 5;
        state.currentFile = 'Consultando agendamentos e layouts no CMS...';

        const reqFilesSoap = `<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="urn:xmds">
  <SOAP-ENV:Body>
    <ns1:RequiredFiles>
      <serverKey>${cfg.serverKey}</serverKey>
      <hardwareKey>${cfg.hardwareKey}</hardwareKey>
    </ns1:RequiredFiles>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

        const reqFilesRes = await axios.post(`${cfg.cmsUrl}/xmds.php?v=5`, reqFilesSoap, {
            headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': 'urn:xmds#RequiredFiles' },
            timeout: 10000
        });

        const parsedReq = xmlParser.parse(reqFilesRes.data);
        const reqResponse = parsedReq['SOAP-ENV:Envelope']?.['SOAP-ENV:Body']?.['ns1:RequiredFilesResponse'] ||
                            parsedReq['SOAP-ENV:Envelope']?.['SOAP-ENV:Body']?.['RequiredFilesResponse'];
        const reqXmlField = reqResponse?.['RequiredFilesXml'];
        const reqXmlStr = typeof reqXmlField === 'string' ? reqXmlField : reqXmlField?.['#text'];
        
        let mediaFilesToDownload = [];
        let detectedOrientation = cfg.orientation;
        let detectedLayout = cfg.activeLayout;

        if (reqXmlStr) {
            const filesObj = xmlParser.parse(reqXmlStr);
            const rawFiles = filesObj.files?.file || [];
            const filesList = Array.isArray(rawFiles) ? rawFiles : [rawFiles];

            for (const f of filesList) {
                const type = f['@_type'];
                const id = f['@_id'];
                const size = parseInt(f['@_size']) || 0;
                const pathName = f['@_path'] || `${id}`;
                
                if (type === 'media' && (pathName.endsWith('.mp4') || pathName.endsWith('.png') || pathName.endsWith('.jpg') || pathName.endsWith('.jpeg'))) {
                    mediaFilesToDownload.push({ id, type, pathName, size });
                } else if (type === 'layout') {
                    // Baixar XML do Layout para inspecionar dimensões
                    const layoutPath = path.join(CACHE_DIR, `layout_${id}.xml`);
                    try {
                        await downloadXmdsFile(cfg, id, 'layout', layoutPath, size);
                        if (fs.existsSync(layoutPath)) {
                            const layoutXml = fs.readFileSync(layoutPath, 'utf8');
                            const parsedLayout = xmlParser.parse(layoutXml);
                            const w = parseInt(parsedLayout.layout?.['@_width']) || 1920;
                            const h = parseInt(parsedLayout.layout?.['@_height']) || 1080;
                        }
                    } catch (e) {
                        console.warn('Erro ao processar layout Xibo:', e.message);
                    }
                }
            }
        }

        const total = mediaFilesToDownload.length;
        state.totalFiles = total;
        state.completedFiles = 0;

        const playlistFile = safeId === 'default'
            ? path.join(DATA_DIR, 'playlist.json')
            : path.join(DATA_DIR, `playlist_${safeId}.json`);

        let newPlaylist = [];

        // 1. Popula imediatamente com os arquivos já existentes em disco para não deixar a tela vazia
        for (const item of mediaFilesToDownload) {
            const savePath = path.join(MEDIA_DIR, item.pathName);
            if (fs.existsSync(savePath) && fs.statSync(savePath).size > 0) {
                newPlaylist.push({
                    id: 'semit-media-' + item.id,
                    type: item.pathName.endsWith('.mp4') ? 'video' : 'media',
                    title: item.pathName.endsWith('.mp4') ? 'Vídeo da Programação SEMIT TV' : 'Informativo SEMIT TV',
                    subtitle: item.pathName,
                    url: 'data/media/' + item.pathName,
                    duration: item.pathName.endsWith('.mp4') ? 20 : 12
                });
            }
        }

        if (newPlaylist.length > 0) {
            fs.writeFileSync(playlistFile, JSON.stringify(newPlaylist, null, 2));
        }

        // 2. Baixa os arquivos pendentes
        for (let i = 0; i < mediaFilesToDownload.length; i++) {
            const item = mediaFilesToDownload[i];
            const savePath = path.join(MEDIA_DIR, item.pathName);
            
            state.status = 'downloading';
            state.progress = Math.round(15 + ((i + 1) / (total || 1)) * 75);
            state.currentFile = `Baixando ${item.pathName}... (${i + 1}/${total})`;

            try {
                if (!fs.existsSync(savePath) || fs.statSync(savePath).size === 0 || (item.size > 0 && fs.statSync(savePath).size < item.size)) {
                    await downloadXmdsFile(cfg, item.id, item.type, savePath, item.size);
                }

                state.completedFiles = i + 1;

                // Adiciona à playlist se ainda não estiver
                if (!newPlaylist.some(p => p.subtitle === item.pathName)) {
                    newPlaylist.push({
                        id: 'semit-media-' + item.id,
                        type: item.pathName.endsWith('.mp4') ? 'video' : 'media',
                        title: item.pathName.endsWith('.mp4') ? 'Vídeo da Programação SEMIT TV' : 'Informativo SEMIT TV',
                        subtitle: item.pathName,
                        url: 'data/media/' + item.pathName,
                        duration: item.pathName.endsWith('.mp4') ? 20 : 12
                    });
                    fs.writeFileSync(playlistFile, JSON.stringify(newPlaylist, null, 2));
                }
            } catch (dlErr) {
                console.warn(`Aviso: falha ao baixar ${item.pathName}:`, dlErr.message);
            }
        }

        if (newPlaylist.length > 0) {
            fs.writeFileSync(playlistFile, JSON.stringify(newPlaylist, null, 2));
            console.log(`✅ Playlist de ${cfg.displayName} atualizada com ${newPlaylist.length} mídias da SEMIT TV!`);
        }

        state.status = 'completed';
        state.progress = 100;
        state.currentFile = `Sincronização concluída com sucesso! (${newPlaylist.length} arquivos prontos)`;
        state.lastSync = new Date().toISOString();

        // Persistir registro de sincronização
        try {
            const lastSyncFile = path.join(DATA_DIR, `last_sync_${safeId}.json`);
            fs.writeFileSync(lastSyncFile, JSON.stringify({
                lastSync: state.lastSync,
                totalFiles: total,
                mediaCount: newPlaylist.length,
                layoutName: state.layoutName || 'Layout SEMIT TV',
                displayName: cfg.displayName,
                hardwareKey: cfg.hardwareKey
            }, null, 2));
        } catch (e) {}

        setTimeout(() => { state.status = 'idle'; }, 5000);
    } catch (err) {
        console.error(`Erro na sincronização Xibo (${cfg.displayName}):`, err.message);
        state.status = 'error';
        state.currentFile = 'Erro ao sincronizar com Xibo: ' + err.message;
        setTimeout(() => { state.status = 'idle'; }, 8000);
    }
}

app.post('/api/xibo/sync-now', async (req, res) => {
    const displayId = req.query.display || req.body.displayId || 'default';
    performFullXiboSync(displayId);
    res.json({ success: true, message: `Sincronização iniciada para display ${displayId}!` });
});

// -------------------------------------------------------------
// Previsão do Tempo Proxy
// -------------------------------------------------------------
let weatherCache = { data: null, timestamp: 0 };

app.get('/api/weather', async (req, res) => {
    const displayId = req.query.display || 'default';
    const cfg = loadConfig(displayId);
    const city = req.query.city || cfg.weatherCity || 'Garça';
    const lat = req.query.lat || cfg.weatherLat || -22.2139;
    const lon = req.query.lon || cfg.weatherLon || -49.6558;

    if (weatherCache.data && (Date.now() - weatherCache.timestamp < 10 * 60 * 1000) && weatherCache.city === city) {
        return res.json(weatherCache.data);
    }

    try {
        const response = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
            params: {
                latitude: lat,
                longitude: lon,
                current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
                daily: 'weather_code,temperature_2m_max,temperature_2m_min',
                timezone: 'America/Sao_Paulo'
            },
            timeout: 5000
        });

        const current = response.data.current;
        const daily = response.data.daily;

        const weatherCodes = {
            0: { desc: 'Céu Limpo', icon: 'clear' },
            1: { desc: 'Predomínio de Sol', icon: 'mostly-clear' },
            2: { desc: 'Parcialmente Nublado', icon: 'partly-cloudy' },
            3: { desc: 'Nublado', icon: 'cloudy' },
            45: { desc: 'Nevoeiro', icon: 'fog' },
            51: { desc: 'Garoa Leve', icon: 'drizzle' },
            61: { desc: 'Chuva Leve', icon: 'rain-light' },
            63: { desc: 'Chuva Moderada', icon: 'rain' },
            65: { desc: 'Chuva Forte', icon: 'rain-heavy' },
            80: { desc: 'Pancadas de Chuva', icon: 'showers' },
            95: { desc: 'Tempestade', icon: 'thunderstorm' }
        };

        const currentCode = current.weather_code || 0;
        const condition = weatherCodes[currentCode] || { desc: 'Tempo Firme', icon: 'clear' };

        const forecast = (daily.time || []).slice(1, 4).map((dateStr, idx) => {
            const date = new Date(dateStr + 'T00:00:00');
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
            const fCode = daily.weather_code[idx + 1] || 0;
            return {
                day: dayName,
                min: Math.round(daily.temperature_2m_min[idx + 1]),
                max: Math.round(daily.temperature_2m_max[idx + 1]),
                desc: (weatherCodes[fCode] || { desc: 'Sol' }).desc,
                icon: (weatherCodes[fCode] || { icon: 'clear' }).icon
            };
        });

        const result = {
            city: city,
            temperature: Math.round(current.temperature_2m),
            condition: condition.desc,
            icon: condition.icon,
            humidity: current.relative_humidity_2m,
            windSpeed: Math.round(current.wind_speed_10m),
            min: Math.round(daily.temperature_2m_min[0]),
            max: Math.round(daily.temperature_2m_max[0]),
            forecast: forecast,
            lastUpdated: new Date().toISOString()
        };

        weatherCache = { data: result, timestamp: Date.now(), city: city };
        res.json(result);
    } catch (err) {
        console.warn('Erro ao consultar Open-Meteo:', err.message);
        res.json({
            city: city,
            temperature: 24,
            condition: 'Parcialmente Nublado',
            icon: 'partly-cloudy',
            humidity: 65,
            windSpeed: 12,
            min: 19,
            max: 28,
            forecast: [
                { day: 'AMANHÃ', min: 18, max: 29, desc: 'Sol com Nuvens', icon: 'mostly-clear' },
                { day: 'QUI', min: 20, max: 31, desc: 'Sol', icon: 'clear' },
                { day: 'SEX', min: 21, max: 27, desc: 'Pancadas de Chuva', icon: 'rain' }
            ],
            lastUpdated: new Date().toISOString()
        });
    }
});

// -------------------------------------------------------------
// Notícias RSS Proxy
// -------------------------------------------------------------
let newsCache = { data: null, timestamp: 0 };

app.get('/api/news', async (req, res) => {
    const feedUrl = req.query.url || defaultAppConfig.newsFeedUrl;

    if (newsCache.data && (Date.now() - newsCache.timestamp < 5 * 60 * 1000)) {
        return res.json(newsCache.data);
    }

    try {
        const response = await axios.get(feedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) XiboTVPlayer/1.0' },
            timeout: 6000
        });

        const parsed = xmlParser.parse(response.data);
        const channel = parsed.rss ? parsed.rss.channel : (parsed.feed || {});
        const rawItems = channel.item || channel.entry || [];
        const items = (Array.isArray(rawItems) ? rawItems : [rawItems]).slice(0, 15).map(item => ({
            title: item.title || '',
            description: typeof item.description === 'string' ? item.description.replace(/<[^>]*>?/gm, '').trim() : '',
            pubDate: item.pubDate || item.updated || '',
            link: item.link || ''
        }));

        const result = {
            title: channel.title || 'Notícias Corporativas',
            items: items.length > 0 ? items : [
                { title: 'Bem-vindo ao canal de TV Corporativa e Comunicação Interna', description: 'Fique informado sobre os principais comunicados da nossa organização.' }
            ]
        };

        newsCache = { data: result, timestamp: Date.now() };
        res.json(result);
    } catch (err) {
        console.warn('Erro ao carregar RSS feed:', err.message);
        res.json({
            title: 'Informativo Corporativo',
            items: [
                { title: 'Bem-vindo ao novo Player de TV Corporativa', description: 'Sistema integrado de exibição e comunicação interna.' },
                { title: 'Dica de Ergonomia', description: 'Faça pausas regulares e mantenha a postura correta durante o trabalho.' },
                { title: 'Campanha de Segurança da Informação', description: 'Nunca compartilhe suas senhas de acesso aos sistemas.' }
            ]
        });
    }
});

// -------------------------------------------------------------
// Playlists Locais Multi-Display
// -------------------------------------------------------------
function loadPlaylist(displayId = 'default') {
    const playlistFile = getDisplayPlaylistFile(displayId);
    if (fs.existsSync(playlistFile)) {
        try {
            return JSON.parse(fs.readFileSync(playlistFile, 'utf8'));
        } catch (e) {}
    }
    return [
        {
            id: 'item-1',
            type: 'announcement',
            title: 'Comunicado Institucional',
            subtitle: 'Transparência e Inovação',
            body: 'Bem-vindos ao nosso canal de TV Corporativa integrada ao Xibo CMS. Acompanhe os avisos, metas e novidades da instituição.',
            tag: 'DESTAQUE',
            duration: 12,
            bgTheme: 'gradient-blue'
        }
    ];
}

app.get('/api/playlist', (req, res) => {
    const displayId = req.query.display || 'default';
    res.json(loadPlaylist(displayId));
});

app.post('/api/playlist', (req, res) => {
    try {
        const displayId = req.query.display || req.body.displayId || 'default';
        const safeId = sanitizeDisplayId(displayId);
        const playlistFile = safeId === 'default'
            ? path.join(DATA_DIR, 'playlist.json')
            : path.join(DATA_DIR, `playlist_${safeId}.json`);
        fs.writeFileSync(playlistFile, JSON.stringify(req.body, null, 2));
        res.json({ success: true, count: req.body.length });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/playlist/item', (req, res) => {
    try {
        const displayId = req.query.display || req.body.displayId || 'default';
        const safeId = sanitizeDisplayId(displayId);
        const playlistFile = safeId === 'default'
            ? path.join(DATA_DIR, 'playlist.json')
            : path.join(DATA_DIR, `playlist_${safeId}.json`);

        const playlist = loadPlaylist(safeId);
        const newItem = {
            id: 'item-' + Date.now(),
            ...req.body
        };
        playlist.push(newItem);
        fs.writeFileSync(playlistFile, JSON.stringify(playlist, null, 2));
        res.json({ success: true, item: newItem });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/playlist/item/:id', (req, res) => {
    try {
        const displayId = req.query.display || 'default';
        const safeId = sanitizeDisplayId(displayId);
        const playlistFile = safeId === 'default'
            ? path.join(DATA_DIR, 'playlist.json')
            : path.join(DATA_DIR, `playlist_${safeId}.json`);

        let playlist = loadPlaylist(safeId);
        playlist = playlist.filter(item => item.id !== req.params.id);
        fs.writeFileSync(playlistFile, JSON.stringify(playlist, null, 2));
        res.json({ success: true, count: playlist.length });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Compatibilidade dos painéis Android e desktop com o NovoSGA.
// A rota fica neste serviço porque /tv/* é encaminhado para tv-semit pelo Nginx.
app.get('/api/tickets', async (req, res) => {
    try {
        const unitId = Number(req.query.unitId || 0);
        if (!Number.isInteger(unitId) || unitId <= 0) {
            return res.status(400).json({ message: 'unitId obrigatorio' });
        }

        const slugByUnit = { 4: 'sedetur', 5: 'semads', 6: 'semit', 7: 'saae' };
        const requestedSlug = String(req.query.slug || '').trim().toLowerCase();
        const slug = requestedSlug || slugByUnit[unitId] || 'semit';
        let serviceIds = [];

        const panelResponse = await fetch(
            `http://10.15.25.31:8088/api/panels/${encodeURIComponent(slug)}`,
            { signal: AbortSignal.timeout(8000) },
        );
        if (panelResponse.ok) {
            const panel = await panelResponse.json();
            const unit = Array.isArray(panel.units)
                ? panel.units.find((candidate) => Number(candidate.id) === unitId)
                : null;
            serviceIds = Array.isArray(unit?.serviceIds)
                ? [...new Set(unit.serviceIds.map(Number).filter((id) => id > 0))]
                : [];
        }

        const tokenResponse = await fetch(
            `http://10.15.25.31:8088/api/panels/${encodeURIComponent(slug)}/token`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
                signal: AbortSignal.timeout(8000),
            },
        );
        if (!tokenResponse.ok) {
            console.error('[api/tickets] token status', tokenResponse.status, 'slug', slug);
            return res.status(200).json([]);
        }
        const tokenData = await tokenResponse.json();
        const accessToken = String(tokenData.accessToken || '');
        if (!accessToken) return res.status(200).json([]);

        const services = serviceIds.join(',');
        const novosgaResponse = await fetch(
            `http://10.15.25.31/api/unidades/${unitId}/painel?servicos=${encodeURIComponent(services)}`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
                signal: AbortSignal.timeout(8000),
            },
        );
        if (!novosgaResponse.ok) {
            console.error(
                '[api/tickets] novosga status',
                novosgaResponse.status,
                'unit',
                unitId,
                'slug',
                slug,
            );
            return res.status(200).json([]);
        }

        const data = await novosgaResponse.json();
        const list = Array.isArray(data) ? data : [];
        return res.status(200).json(
            list.map((item) => ({
                ...item,
                ...(item?.id !== undefined && item?.id !== null
                    ? { id: String(item.id) }
                    : {}),
                local: item?.local || 'Guiche',
            })),
        );
    } catch (error) {
        console.error('[api/tickets]', error.message);
        return res.status(200).json([]);
    }
});

// Voz usada pelos clientes Android e desktop. Mantida como rota aditiva,
// independente do player web e da playlist da TV Corporativa.
app.get('/api/speech', async (req, res) => {
    try {
        const text = String(req.query.text || '').trim();
        if (!text) return res.status(400).send('Texto obrigatorio');
        const upstreamUrl =
            'https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=' +
            encodeURIComponent(text.slice(0, 200));
        const upstream = await fetch(upstreamUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Safari/537.36',
                Referer: 'https://translate.google.com/',
            },
            signal: AbortSignal.timeout(10000),
        });
        if (!upstream.ok) return res.status(upstream.status).send('Erro TTS upstream');
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
        console.error('[api/speech]', error.message);
        return res.status(502).send('Erro no sintetizador');
    }
});

// Inicialização do Servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 Xibo TV Player Multi-Display rodando na porta ${PORT}`);
    console.log(`📺 Player URL Padrão: http://localhost:${PORT}/`);
    console.log(`📺 Player Protótipo 2: http://localhost:${PORT}/?display=prototipo2`);
    console.log(`⚙️  Admin Studio: http://localhost:${PORT}/admin.html`);
    console.log(`🔗 Xibo CMS Conectado em: ${defaultAppConfig.cmsUrl}`);
    console.log(`====================================================`);

    // Sincronização inicial
    setTimeout(() => {
        performFullXiboSync('default');
    }, 3000);

    // Heartbeat periódico (a cada 20 segundos para manter status ONLINE no CMS)
    setTimeout(() => {
        sendAllHeartbeats();
    }, 1000);

    setInterval(() => {
        sendAllHeartbeats();
    }, 20000);

    // Sincronização automática contínua com o Xibo CMS (a cada 60 segundos)
    setInterval(async () => {
        const displays = listKnownDisplays();
        for (const d of displays) {
            await performFullXiboSync(d.id);
        }
    }, 60000);
});
