const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Alinhado com image-upload: local=public, Docker=UPLOAD_DIR
const BASE_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../public');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      console.log('🔍 [Multer Log] Destination called. Body:', req.body);

      let folder = 'others';

      // Organiza por tipo de upload baseado na rota ou campos
      // Verifica req.baseUrl ou req.url dependendo de onde o middleware é montado
      const url = req.baseUrl || req.url || '';
      if (url.includes('forms-garca') || req.body.formId) {
        folder = 'forms-garca';
        // Se tiver formId e inscriptionId, cria subpastas para organizar melhor
        if (req.body.formId) {
          folder = path.join(folder, req.body.formId);
        }
        if (req.body.inscriptionId) {
          folder = path.join(folder, req.body.inscriptionId);
        }
      }

      const uploadDir = path.join(BASE_DIR, folder);
      console.log('📂 [Multer Log] Creating directory:', uploadDir);

      ensureDir(uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      console.error('❌ [Multer Error] Failed to determine destination:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Mantém extensão original e adiciona timestamp para evitar colisão
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Aceita imagens e documentos comuns
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo inválido. Apenas imagens e documentos (PDF, Doc, XLS) são permitidos.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  },
  fileFilter: fileFilter
});

module.exports = { upload, BASE_DIR };
