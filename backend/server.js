// 1) Carrega variáveis de ambiente do arquivo .env (exceto em testes)
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}
const { initSentry, setupSentryExpress } = require('./helpers/sentry-init');
initSentry();

const isProd = process.env.NODE_ENV === 'production';
if (!isProd && process.env.NODE_ENV !== 'test') {
  console.log('CORS_ORIGIN =>', process.env.CORS_ORIGIN);
  console.log('CORS_ORIGIN_REGEX =>', process.env.CORS_ORIGIN_REGEX);
}

// 2) Importa módulos
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');

// + segurança
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

/** Express 5: req.query é somente leitura — sanitizar só body/params. */
function sanitizeMongoInputs(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = mongoSanitize.sanitize(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = mongoSanitize.sanitize(req.params);
  }
  next();
}

// 3) Inicializa a aplicação Express
const app = express();

// 3.1) Estamos atrás do Nginx/HTTPS → confia no proxy
app.set('trust proxy', parseInt(process.env.TRUST_PROXY || '1', 10));

// 3.2) Oculta fingerprint do Express
app.disable('x-powered-by');

// 4) Middlewares essenciais (com limites de body)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4.1) Hardening de HTTP
app.use(helmet({
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // está servindo /images publicamente
  contentSecurityPolicy: false, // Desativa CSP restritivo que bloqueia scripts inline (Flutter/bootstrap)
}));
// HSTS só em produção e atrás de HTTPS
if (isProd) {
  app.use(helmet.hsts({ maxAge: 15552000, includeSubDomains: true, preload: false }));
}

// 4.2) Sanitização e anti-poluição (compat Express 5)
app.use(sanitizeMongoInputs);
app.use(hpp());

// 4.3) Rate limit “leve” global
// Rate limit desativado em dev; em produção usar RATE_LIMIT_MAX
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '0', 10);
if (rateLimitMax > 0) {
  const { recordSecurity } = require('./helpers/audit-service');
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      const path = req.path || '';
      const method = req.method;
      if (
        path.endsWith('/users/login') ||
        path.endsWith('/users/register') ||
        path.endsWith('/users/refresh')
      ) {
        return true;
      }
      if (method !== 'GET' && method !== 'HEAD') return false;
      if (
        path === '/health' ||
        path === '/readyz' ||
        path === '/dashboard.html' ||
        path === '/endpoints.html'
      ) {
        return true;
      }
      if (path.startsWith('/admin/dashboard/content')) return true;
      if (path.startsWith('/sama/') || path.startsWith('/images/') || path.startsWith('/images_semit_a_pet/')) {
        return true;
      }
      if (path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.map')) {
        return true;
      }
      if (path.endsWith('/users/checkuser')) return true;
      if (path.endsWith('/castration-campaigns/active')) return true;
      return path === '/v1/castracao/status';
    },
    handler: (req, res, _next, options) => {
      void recordSecurity(req, {
        action: 'security.rate_limit',
        resourceType: 'security',
        module: 'auth',
        metadata: { scope: 'global', limit: options.max, windowMs: options.windowMs },
      });
      res.status(options.statusCode).json({
        message: 'Muitas requisições. Tente novamente mais tarde.',
      });
    },
  }));
}

// 5) CORS multiorigem (CORS_ORIGIN fixo + CORS_ORIGIN_REGEX para localhost:*)
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const regexPatterns = (process.env.CORS_ORIGIN_REGEX || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(p => new RegExp(p));

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);

    // Força liberação manual de localhost e IPs locais se o .env falhar
    const isLocal = origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('http://192.168.');

    const matchesFixed = allowedOrigins.includes(origin);
    const matchesRegex = regexPatterns.some(rx => rx.test(origin));

    console.log('[DEBUG CORS] origin:', origin, '| local:', isLocal, '| fixed:', matchesFixed, '| regex:', matchesRegex);

    if (isLocal || matchesFixed || matchesRegex) {
      return cb(null, true);
    }

    console.log('[DEBUG CORS] REJECTED!');
    return cb(new Error('CORS_NOT_ALLOWED'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
    'X-Client-App',
    'X-Client-Platform',
    'X-Client-Version',
    'X-Client-Module',
    'X-Screen-Id',
    'X-Request-Id',
  ],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

const { clientAppAuditMiddleware } = require('./helpers/client-app-audit');
app.use(clientAppAuditMiddleware);

// (opcional) Log do Origin para diagnóstico (evitar em produção)
if (!isProd) {
  app.use((req, _res, next) => {
    console.log('[Req]', req.method, req.path, 'Origin:', req.headers.origin || '(sem origin)');
    next();
  });
}

// Error handler de CORS → responde JSON 403 sem vazar política
app.use((err, req, res, next) => {
  if (err && (err.message === 'CORS_NOT_ALLOWED' || err.message === 'CORS bloqueado')) {
    const { recordSecurity } = require('./helpers/audit-service');
    void recordSecurity(req, {
      action: 'security.cors_denied',
      resourceType: 'security',
      module: 'auth',
      metadata: { origin: req.headers.origin || null },
    });
    return res.status(403).json({
      error: 'CORS bloqueado',
      origin: req.headers.origin || null,
    });
  }
  return next(err);
});

// 5.4) Métricas de uso e desempenho
const { metricsMiddleware, getStats } = require('./helpers/metrics');
app.use(metricsMiddleware);

// 5.1) /api/users/* — middleware que encaminha (Express 5 pode ter routing diferente)
const UserController = require('./controllers/UserController');
app.use('/api/users/login', (req, res, next) => {
  if (req.method === 'POST') return UserController.login(req, res, next);
  next();
});
app.use('/api/users/register', (req, res, next) => {
  if (req.method === 'POST') return UserController.register(req, res, next);
  next();
});
app.use('/api/users/checkuser', (req, res, next) => {
  if (req.method === 'GET') return UserController.checkUser(req, res, next);
  next();
});
app.use('/api/users/check', (req, res, next) => {
  if (req.method === 'GET') return UserController.checkUser(req, res, next);
  next();
});

// 6) Rotas da API (ANTES de static para evitar 404)
const UserRoutes = require('./routes/UserRoutes');
const SepultadoRoutes = require('./routes/SepultadoRoutes');
const dlocRoutes = require('./routes/dlocRoutes');
const ServiceRoutes = require('./routes/ServiceRoutes');
const FormsGarcaRoutes = require('./routes/FormsGarcaRoutes');
const PetRoutes = require('./routes/PetRoutes');
const ArvoreRoutes = require('./routes/ArvoreRoutes');
const DenounceRoutes = require('./routes/DenounceRoutes');
const SystemSettingRoutes = require('./routes/SystemSettingRoutes');
const SystemSettingController = require('./controllers/SystemSettingController');
const verifyToken = require('./helpers/verify-token');
const MedicamentosRoutes = require('./routes/MedicamentosRoutes');
const votacaoRoutes = require('./routes/votacaoRoutes');
const PontoTuristicoRoutes = require('./routes/PontoTuristicoRoutes');
const AuditLogRoutes = require('./routes/AuditLogRoutes');
const VaccinationRoutes = require('./routes/VaccinationRoutes');
const AdoptionRequestRoutes = require('./routes/AdoptionRequestRoutes');
const LgpdRoutes = require('./routes/LgpdRoutes');
const EducationRoutes = require('./routes/EducationRoutes');
const CulturaRoutes = require('./routes/CulturaRoutes');
const PnabRoutes = require('./routes/PnabRoutes');
const CulturaLegacyApiRoutes = require('./routes/CulturaLegacyApiRoutes');
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');
const { requireRole } = require('./helpers/authz');

const { recordSecurity: recordSecurityAuth } = require('./helpers/audit-service');
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    void recordSecurityAuth(req, {
      action: 'security.rate_limit',
      resourceType: 'security',
      module: 'auth',
      metadata: { scope: 'auth_routes', limit: options.max },
    });
    res.status(options.statusCode).json({
      message: 'Muitas tentativas. Aguarde alguns minutos.',
    });
  },
});
app.use(['/users/login', '/users/register', '/users/refresh'], authLimiter);
app.use(['/api/users/login', '/api/users/register', '/api/users/refresh'], authLimiter);

// Dashboard administrativa — gate público mínimo; conteúdo e métricas só para admin
app.get('/dashboard.html', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  return res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
// Nginx repassa /api/* como /* (proxy_pass com barra final); rotas sem prefixo /api no Express
app.use('/admin/dashboard', adminDashboardRoutes);

// Rotas da API: /users, /sepultados, etc (usado quando Nginx faz proxy /api -> backend)
app.use('/users', UserRoutes);
app.use('/sepultados', SepultadoRoutes);
app.use('/dloc', dlocRoutes);
app.use('/services', ServiceRoutes);
app.use('/forms-garca', FormsGarcaRoutes); // <--- NOVO MODULO

// >>> ROTAS SEMIT_A_PET <<<
app.use('/pets', PetRoutes);
app.use('/adoption-requests', AdoptionRequestRoutes);
app.use('/arvores', ArvoreRoutes);
app.use('/denounces', DenounceRoutes);
app.use('/settings', SystemSettingRoutes);
const CastrationCampaignRoutes = require('./routes/CastrationCampaignRoutes');
const CastrationRequestRoutes = require('./routes/CastrationRequestRoutes');
const IluminacaoRoutes = require('./routes/IluminacaoRoutes');
const RotasRuraisRoutes = require('./routes/RotasRuraisRoutes');
const WhatsappRoutes = require('./routes/WhatsappRoutes');
app.use('/castration-campaigns', CastrationCampaignRoutes);
app.use('/castration-requests', CastrationRequestRoutes);
app.use('/iluminacao', IluminacaoRoutes);
app.use('/rotas-rurais', RotasRuraisRoutes);
app.use('/whatsapp', WhatsappRoutes);
// GarçaPet — castração (front chama /api/v1/...; nginx repassa como /v1/...)
app.get('/v1/castracao/status', SystemSettingController.getCastrationCompat);
app.post('/v1/castracao/update', verifyToken, SystemSettingController.updateCastrationCompat);
app.patch('/v1/castracao/update', verifyToken, SystemSettingController.updateCastrationCompat);
app.use('/medicamentos', MedicamentosRoutes);
app.use('/votacao', votacaoRoutes);
app.use('/mapaturistico', PontoTuristicoRoutes);
app.use('/audit-logs', AuditLogRoutes);
app.use('/lgpd', LgpdRoutes);
app.use('/education', EducationRoutes);
app.use('/cultura', CulturaRoutes);
app.use('/pnab', PnabRoutes);
app.use('/', CulturaLegacyApiRoutes);
app.use('/', VaccinationRoutes);

// (compat) prefixo /api — usar Router explícito para garantir que /api/users/login etc funcionem
const apiRouter = express.Router();
apiRouter.use('/users', UserRoutes);
apiRouter.use('/sepultados', SepultadoRoutes);
apiRouter.use('/dloc', dlocRoutes);
apiRouter.use('/services', ServiceRoutes);
apiRouter.use('/forms-garca', FormsGarcaRoutes);
apiRouter.use('/pets', PetRoutes);
apiRouter.use('/adoption-requests', AdoptionRequestRoutes);
apiRouter.use('/arvores', ArvoreRoutes);
apiRouter.use('/denounces', DenounceRoutes);
apiRouter.use('/settings', SystemSettingRoutes);
apiRouter.use('/castration-campaigns', CastrationCampaignRoutes);
apiRouter.use('/castration-requests', CastrationRequestRoutes);
apiRouter.use('/iluminacao', IluminacaoRoutes);
apiRouter.use('/rotas-rurais', RotasRuraisRoutes);
apiRouter.use('/whatsapp', WhatsappRoutes);
apiRouter.use('/medicamentos', MedicamentosRoutes);
apiRouter.use('/votacao', votacaoRoutes);
apiRouter.use('/mapaturistico', PontoTuristicoRoutes);
apiRouter.use('/audit-logs', AuditLogRoutes);
apiRouter.use('/lgpd', LgpdRoutes);
apiRouter.use('/education', EducationRoutes);
apiRouter.use('/cultura', CulturaRoutes);
apiRouter.use('/pnab', PnabRoutes);
apiRouter.use('/', CulturaLegacyApiRoutes);
apiRouter.use('/', VaccinationRoutes);
app.use('/api', apiRouter);

// (compat) prefixo alternativo usado no seu front
app.use('/app/users', UserRoutes);

// 7.5) Redirecionar apps Flutter para o frontend principal (porta 80 via Nginx)
// ANTES do static para garantir que /servicos na API vá para localhost
const APP_BASE = process.env.APP_URL || 'http://localhost';
['servicos', 'agendamentos', 'formularios', 'iluminacao'].forEach((name) => {
  app.get(`/${name}`, (_req, res) => res.redirect(302, `${APP_BASE}/${name}/`));
  app.get(new RegExp(`^/${name}/.*`), (req, res) => res.redirect(302, `${APP_BASE}${req.path}`));
});

// 7.9) Rota raiz da API (previne serving de index.html na raiz)
app.get('/', (req, res) => {
  res.json({
    message: 'API Online',
    version: '1.0.0',
    docs: '/endpoints.html',
    health: '/health'
  });
});

// 8) Static de imagens e frontends (DEPOIS das rotas API)
const { BASE_DIR } = require('./helpers/image-upload');
app.use(['/images_semit_a_pet', '/images/arvores', '/images/pets', '/images/misc', '/sama/images', '/sama/images_semit_a_pet'], express.static(path.join(BASE_DIR, 'images_semit_a_pet'), { maxAge: '7d', etag: true }));
app.use('/images', express.static(BASE_DIR, { maxAge: '7d', etag: true }));
app.use('/uploads/pnab', express.static(path.join(BASE_DIR, 'cultura', 'pnab'), { maxAge: '7d', etag: true }));
app.use('/mapaturistico', express.static('/mapaturistico-public', { maxAge: '0', etag: false }));
app.use(['/sama', '/semit-a-pet'], express.static(path.join(__dirname, 'public', 'sama'), { maxAge: '0', etag: false }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '0', etag: false }));

// 8.1) OpenAPI (gerado de public/routes.json — scripts/build-openapi.js)
app.get('/openapi.json', (_req, res) => {
  res.type('application/json');
  res.sendFile(path.join(__dirname, 'public', 'openapi.json'));
});
app.get('/api/openapi.json', (_req, res) => res.redirect(302, '/openapi.json'));

// 9) Healthchecks e métricas
app.get('/health', (_req, res) => res.status(200).json({ status: 'UP' }));

const { buildPrometheusBody } = require('./helpers/prometheus-metrics');
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.send(await buildPrometheusBody());
  } catch (e) {
    return res.status(500).send('# error generating metrics\n');
  }
});

const adminStatsHandler = (_req, res) => {
  try {
    return res.json(getStats());
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao obter métricas' });
  }
};
app.get('/stats', verifyToken, requireRole('admin'), adminStatsHandler);
app.get('/api/stats', verifyToken, requireRole('admin'), adminStatsHandler);

app.get('/readyz', (_req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  if (isMongoConnected) return res.status(200).json({ ready: true, database: 'connected' });
  return res.status(503).json({ ready: false, database: 'disconnected' });
});

// 10) SPA Admin Votação — workspace por pleito (/votacao/admin/pleitos/:id/...)
const sendVotingAdminShell = (_req, res) => {
  const adminPath = path.join(__dirname, 'public', 'votacao', 'admin', 'index.html')
  try {
    const fs = require('fs')
    if (fs.existsSync(adminPath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.sendFile(adminPath)
    }
    return res.status(404).json({ error: 'Admin votação not found' })
  } catch (e) {
    return res.status(404).json({ error: 'Not found' })
  }
}
app.get(/^\/votacao\/admin\/?$/, (_req, res) => res.redirect(302, '/votacao/admin/pleitos'))
app.get(/^\/votacao\/admin\/(?!assets\/).+/, sendVotingAdminShell)

app.get(/^\/votacao\/p\/[^/]+\/?$/, (_req, res) => {
  const pleitoPath = path.join(__dirname, 'public', 'votacao', 'pleito.html')
  try {
    const fs = require('fs')
    if (fs.existsSync(pleitoPath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.sendFile(pleitoPath)
    }
    return res.status(404).json({ error: 'Landing do pleito não encontrada' })
  } catch (e) {
    return res.status(404).json({ error: 'Not found' })
  }
})

app.get(/^\/votacao\/?$/, (_req, res) => {
  const indexPath = path.join(__dirname, 'public', 'votacao', 'index.html')
  try {
    const fs = require('fs')
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.sendFile(indexPath)
    }
    return res.status(404).json({ error: 'Votação frontend not found' })
  } catch (e) {
    return res.status(404).json({ error: 'Not found' })
  }
})

// 10.1) Página institucional de vacinação (evita tela em branco no fallback da SPA)
app.get(/^\/(?:garcapet|sama|semit-a-pet)\/vacinacao(?:\/.*)?$/, (_req, res) => {
  const indexPath = path.join(__dirname, 'public', 'vacinacao', 'index.html')
  try {
    const fs = require('fs')
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.sendFile(indexPath)
    }
    return res.status(404).json({ error: 'Vacinação page not found' })
  } catch (e) {
    return res.status(404).json({ error: 'Not found' })
  }
})

// 10) SPA fallback para SAMA/SEMIT_A_PET (mesmo app, paths /sama e /semit-a-pet)
app.get(/\/(?:sama|semit-a-pet)(?:\/.*)?$/, (_req, res) => {
  const indexPath = path.join(__dirname, 'public', 'sama', 'index.html')
  try {
    const fs = require('fs')
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath)
    } else {
      res.status(404).json({ error: 'SAMA frontend not found' })
    }
  } catch (e) {
    res.status(404).json({ error: 'Not found' })
  }
})

// SPA fallback para outros frontends
app.get(/^\/(?!api|images|sama|semit-a-pet|votacao|mapaturistico|health|readyz|stats|dloc|users|sepultados|services|medicamentos|pets|arvores|denounces|settings|shift-handovers|app).*/, (_req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html')
  try {
    if (require('fs').existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.sendFile(indexPath)
    } else {
      res.status(404).json({ error: 'Not found' })
    }
  } catch (e) {
    res.status(404).json({ error: 'Not found' })
  }
})

// 10.5) Sentry (antes do handler customizado)
setupSentryExpress(app);

// 10.6) Error handler global (evita HTML 500 em APIs como /api/pets/create)
app.use((err, req, res, next) => {
  if (!err) return next();

  // Falhas de upload (multer/fileFilter) retornam erro de validação em JSON
  const uploadMessage = (() => {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return 'Arquivo muito grande. Tamanho máximo: 500MB.'
    }
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      return 'Sem permissão para salvar arquivo no servidor. Contate o administrador.'
    }
    if (String(err.message || '').includes('Unexpected end of form')) {
      return 'Falha ao processar o formulário com arquivos. Tente novamente ou salve sem anexos.'
    }
    if (String(err.message || '').includes('Unexpected field')) {
      return 'Campo de arquivo não reconhecido pelo servidor. Atualize a API e tente novamente.'
    }
    return err.message || 'Falha ao processar upload.'
  })()

  if (
    err instanceof multer.MulterError ||
    err.message?.toLowerCase?.().includes('arquivo') ||
    err.message?.toLowerCase?.().includes('upload') ||
    err.message?.includes('Unexpected end of form') ||
    err.message?.includes('Unexpected field') ||
    err.code === 'EACCES' ||
    err.code === 'EPERM'
  ) {
    const field = err.field || 'upload'
    return res.status(422).json({
      success: false,
      message: 'Erro de validação',
      error: 'Erro de validação',
      errors: {
        [field]: [uploadMessage],
      },
    })
  }

  const isApiPath =
    req.path.startsWith('/api/') ||
    req.path.startsWith('/votacao') ||
    req.path.startsWith('/pets') ||
    req.path.startsWith('/arvores') ||
    req.path.startsWith('/denounces') ||
    req.path.startsWith('/settings') ||
    req.path.startsWith('/medicamentos') ||
    req.path.startsWith('/users') ||
    req.path.startsWith('/lgpd') ||
    req.path.startsWith('/education');

  if (isApiPath) {
    const clientMessage = isProd
      ? 'Erro interno do servidor.'
      : (err.message || 'Erro interno do servidor.');
    if (!isProd) console.error('[API Error]', err);
    return res.status(500).json({ message: clientMessage });
  }

  return res.status(500).send(isProd ? 'Internal Server Error' : (err.message || 'Internal Server Error'));
});

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://mongo:27017/apicemiterio';

async function connectMongo() {
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      if (mongoose.connection.readyState === 1) return true;
      console.log(` [Mongo] Tentando conectar (${attempt}/10)...`);
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
      console.log(' Conectado ao MongoDB!');
      try {
        const { ensurePetChipIndex } = require('./helpers/ensure-pet-chip-index');
        await ensurePetChipIndex(mongoose);
      } catch (chipIdxErr) {
        console.warn('[Pet chip] Migração de índice chip:', chipIdxErr.message);
      }
      try {
        const { ensureVotingCpfHash } = require('./helpers/ensure-voting-cpf-hash');
        await ensureVotingCpfHash(mongoose);
      } catch (votingCpfErr) {
        console.warn('[Voting CPF] Migração cpfHash:', votingCpfErr.message);
      }
      try {
        const { ensureVotingUploadDirs } = require('./helpers/ensure-voting-upload-dirs');
        ensureVotingUploadDirs();
      } catch (votingDirErr) {
        console.warn('[Voting upload] Diretórios:', votingDirErr.message);
      }
      try {
        const { ensureVotingSlugs } = require('./helpers/ensure-voting-slugs');
        const n = await ensureVotingSlugs(mongoose);
        if (n > 0) console.log(`[Voting] Slugs gerados para ${n} pleito(s).`);
      } catch (votingSlugErr) {
        console.warn('[Voting] Slugs:', votingSlugErr.message);
      }
      try {
        const { ensureVotingVoteIndexes } = require('./helpers/ensure-voting-vote-indexes');
        await ensureVotingVoteIndexes(mongoose);
      } catch (votingIdxErr) {
        console.warn('[Voting votes] Índices:', votingIdxErr.message);
      }
      try {
        const { ensureEducationIndexes } = require('./helpers/ensure-education-indexes');
        await ensureEducationIndexes(mongoose);
      } catch (eduIdxErr) {
        console.warn('[Education] Índices:', eduIdxErr.message);
      }
      try {
        const { ensureEducationUploadDirs } = require('./helpers/ensure-education-upload-dirs');
        ensureEducationUploadDirs();
      } catch (uploadDirErr) {
        console.warn('[Education upload] Diretórios:', uploadDirErr.message);
      }
      try {
        const { ensureCulturaIndexes } = require('./helpers/ensure-cultura-indexes');
        await ensureCulturaIndexes(mongoose);
      } catch (culturaIdxErr) {
        console.warn('[Cultura] Índices:', culturaIdxErr.message);
      }
      try {
        const { ensureCulturaUploadDirs } = require('./helpers/cultura-upload');
        ensureCulturaUploadDirs();
      } catch (culturaUploadErr) {
        console.warn('[Cultura upload] Diretórios:', culturaUploadErr.message);
      }
      try {
        const { ensurePnabUploadDirs } = require('./helpers/pnab-service');
        ensurePnabUploadDirs();
      } catch (pnabUploadErr) {
        console.warn('[PNAB upload] Diretórios:', pnabUploadErr.message);
      }
      return true;
    } catch (err) {
      console.error(` Falha na conexão com o Mongo (${attempt}/10):`, err.message);
      if (attempt < 10) await new Promise(r => setTimeout(r, 5000));
    }
  }
  console.error(' Não foi possível conectar ao MongoDB após várias tentativas. A API continuará rodando, mas rotas que dependem do banco falharão.');
  return false;
}

function startServer() {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
  connectMongo();
  return { app, server };
}

function createApp() {
  return app;
}

module.exports = { app, createApp, connectMongo, startServer };