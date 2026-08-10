// 1) Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();
const isProd = process.env.NODE_ENV === 'production';
console.log('CORS_ORIGIN =>', process.env.CORS_ORIGIN);
console.log('CORS_ORIGIN_REGEX =>', process.env.CORS_ORIGIN_REGEX);

// 2) Importa módulos
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');

// + segurança
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// const mongoSanitize = require('express-mongo-sanitize');
// const hpp = require('hpp');

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

// 4.2) Sanitização e anti-poluição
// app.use(mongoSanitize());
// app.use(hpp());

// 4.3) Rate limit “leve” global
// Rate limit desativado em dev; em produção usar RATE_LIMIT_MAX
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '0', 10);
if (rateLimitMax > 0) {
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
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
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

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
const MedicamentosRoutes = require('./routes/MedicamentosRoutes');

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(['/users/login', '/users/register'], authLimiter);
app.use(['/api/users/login', '/api/users/register'], authLimiter);

// Rotas da API: /users, /sepultados, etc (usado quando Nginx faz proxy /api -> backend)
app.use('/users', UserRoutes);
app.use('/sepultados', SepultadoRoutes);
app.use('/dloc', dlocRoutes);
app.use('/services', ServiceRoutes);
app.use('/forms-garca', FormsGarcaRoutes); // <--- NOVO MODULO

// >>> ROTAS SEMIT_A_PET <<<
app.use('/pets', PetRoutes);
app.use('/arvores', ArvoreRoutes);
app.use('/denounces', DenounceRoutes);
app.use('/settings', SystemSettingRoutes);
app.use('/medicamentos', MedicamentosRoutes);

// (compat) prefixo /api — usar Router explícito para garantir que /api/users/login etc funcionem
const apiRouter = express.Router();
apiRouter.use('/users', UserRoutes);
apiRouter.use('/sepultados', SepultadoRoutes);
apiRouter.use('/dloc', dlocRoutes);
apiRouter.use('/services', ServiceRoutes);
apiRouter.use('/forms-garca', FormsGarcaRoutes);
apiRouter.use('/pets', PetRoutes);
apiRouter.use('/arvores', ArvoreRoutes);
apiRouter.use('/denounces', DenounceRoutes);
apiRouter.use('/settings', SystemSettingRoutes);
apiRouter.use('/medicamentos', MedicamentosRoutes);
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
app.use(['/images_semit_a_pet', '/images/pets', '/images/misc', '/sama/images', '/sama/images_semit_a_pet'], express.static(path.join(BASE_DIR, 'images_semit_a_pet'), { maxAge: '7d', etag: true }));
app.use('/images', express.static(BASE_DIR, { maxAge: '7d', etag: true }));
app.use(['/sama', '/semit-a-pet'], express.static(path.join(__dirname, 'public', 'sama'), { maxAge: '0', etag: false }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '0', etag: false }));

// 9) Healthchecks e métricas
app.get('/health', (_req, res) => res.status(200).json({ status: 'UP' }));

app.get('/stats', (_req, res) => {
  try {
    return res.json(getStats());
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao obter métricas' });
  }
});

app.get('/readyz', (_req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  if (isMongoConnected) return res.status(200).json({ ready: true, database: 'connected' });
  return res.status(503).json({ ready: false, database: 'disconnected' });
});

// 10) SPA fallback para SAMA/SEMIT_A_PET (mesmo app, paths /sama e /semit-a-pet)
app.get(/\/(?:sama|semit-a-pet|castracao|adocao|pets?|arvores?|arvore|denuncias?)(?:\/.*)?$/, (_req, res) => {
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
app.get(/^\/(?!api|images|sama|health|readyz|stats|dloc|users|sepultados|services|medicamentos|pets|arvores|denounces|settings|shift-handovers|app).*/, (_req, res) => {
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

// 10.5) Error handler global (evita HTML 500 em APIs como /api/pets/create)
app.use((err, req, res, next) => {
  if (!err) return next();

  // Falhas de upload (multer/fileFilter) retornam erro de validação em JSON
  if (err instanceof multer.MulterError || err.message?.includes('Por favor, envie apenas arquivos')) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo muito grande. Tamanho máximo: 10MB.'
      : (err.message || 'Falha ao processar upload.');
    return res.status(422).json({ message });
  }

  // Mantém resposta JSON para rotas da API e evita erro de parse no frontend
  if (req.path.startsWith('/api/') || req.path.startsWith('/pets') || req.path.startsWith('/arvores') || req.path.startsWith('/denounces') || req.path.startsWith('/settings')) {
    return res.status(500).json({ message: err.message || 'Erro interno do servidor.' });
  }

  return res.status(500).send('Internal Server Error');
});

// 11) Conexão com Mongo e inicialização do servidor
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://mongo:27017/apicemiterio';

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// Tentativas de conexão ao Mongo
(async () => {
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      console.log(` [Mongo] Tentando conectar (${attempt}/10)...`);
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
      console.log(' Conectado ao MongoDB!');
      return;
    } catch (err) {
      console.error(` Falha na conexão com o Mongo (${attempt}/10):`, err.message);
      if (attempt < 10) await new Promise(r => setTimeout(r, 5000));
    }
  }
  console.error(' Não foi possível conectar ao MongoDB após várias tentativas. A API continuará rodando, mas rotas que dependem do banco falharão.');
})();

// 12) Desligamento gracioso
const shutdown = async (signal) => {
  try {
    console.log(`\n${signal} recebido. Encerrando...`);
    await mongoose.connection.close();
  } catch (e) {
    console.error('Erro fechando Mongo:', e.message);
  } finally {
    server.close(() => process.exit(0));
  }
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));