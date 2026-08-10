require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado com sucesso!'))
  .catch(err => console.error('❌ Erro ao conectar MongoDB:', err));

// Schema - Ponto Turístico
const PontoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  categoria: { 
    type: String, 
    enum: ['atracao', 'restaurante', 'hotel', 'comercio', 'cultura', 'natureza', 'servico'],
    default: 'atracao'
  },
  descricao: { type: String },
  endereco: { type: String },
  telefone: { type: String },
  site: { type: String },
  horario: { type: String },
  foto: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  ativo: { type: Boolean, default: true },
  destaque: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Ponto = mongoose.model('Ponto', PontoSchema);

// ==================== API ROUTES ====================

// GET - Listar todos os pontos ativos
app.get('/api/pontos', async (req, res) => {
  try {
    const pontos = await Ponto.find({ ativo: true }).sort({ destaque: -1, nome: 1 });
    res.json({ success: true, data: pontos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Listar todos (admin)
app.get('/api/admin/pontos', async (req, res) => {
  try {
    const pontos = await Ponto.find().sort({ createdAt: -1 });
    res.json({ success: true, data: pontos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Buscar um ponto
app.get('/api/pontos/:id', async (req, res) => {
  try {
    const ponto = await Ponto.findById(req.params.id);
    if (!ponto) return res.status(404).json({ success: false, error: 'Ponto não encontrado' });
    res.json({ success: true, data: ponto });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Criar ponto
app.post('/api/pontos', async (req, res) => {
  try {
    let fotoPath = null;

    if (req.files && req.files.foto) {
      const file = req.files.foto;
      const ext = path.extname(file.name);
      const filename = `${uuidv4()}${ext}`;
      const uploadPath = path.join(uploadsDir, filename);
      await file.mv(uploadPath);
      fotoPath = `/uploads/${filename}`;
    }

    const ponto = new Ponto({
      ...req.body,
      foto: fotoPath,
      latitude: parseFloat(req.body.latitude),
      longitude: parseFloat(req.body.longitude),
      ativo: req.body.ativo === 'true' || req.body.ativo === true,
      destaque: req.body.destaque === 'true' || req.body.destaque === true
    });

    await ponto.save();
    res.status(201).json({ success: true, data: ponto });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT - Atualizar ponto
app.put('/api/pontos/:id', async (req, res) => {
  try {
    const ponto = await Ponto.findById(req.params.id);
    if (!ponto) return res.status(404).json({ success: false, error: 'Ponto não encontrado' });

    let fotoPath = ponto.foto;

    if (req.files && req.files.foto) {
      // Delete old photo
      if (ponto.foto) {
        const oldPath = path.join(__dirname, ponto.foto);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const file = req.files.foto;
      const ext = path.extname(file.name);
      const filename = `${uuidv4()}${ext}`;
      const uploadPath = path.join(uploadsDir, filename);
      await file.mv(uploadPath);
      fotoPath = `/uploads/${filename}`;
    }

    const updated = await Ponto.findByIdAndUpdate(req.params.id, {
      ...req.body,
      foto: fotoPath,
      latitude: parseFloat(req.body.latitude),
      longitude: parseFloat(req.body.longitude),
      ativo: req.body.ativo === 'true' || req.body.ativo === true,
      destaque: req.body.destaque === 'true' || req.body.destaque === true,
      updatedAt: new Date()
    }, { new: true });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE - Remover ponto
app.delete('/api/pontos/:id', async (req, res) => {
  try {
    const ponto = await Ponto.findById(req.params.id);
    if (!ponto) return res.status(404).json({ success: false, error: 'Ponto não encontrado' });

    if (ponto.foto) {
      const filePath = path.join(__dirname, ponto.foto);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Ponto.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Ponto removido com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Seed inicial de exemplo
app.post('/api/seed', async (req, res) => {
  try {
    const count = await Ponto.countDocuments();
    if (count > 0) return res.json({ success: false, message: 'Banco já possui dados' });

    const pontos = [
      {
        nome: 'Parque Municipal Prefeito Milton Manente',
        categoria: 'natureza',
        descricao: 'Belo parque urbano com lago artificial, estrutura para caminhada, anfiteatro e espaços de lazer para toda a família. Um dos cartões postais da cidade.',
        endereco: 'Av. Pres. Vargas, Garça - SP',
        telefone: '(14) 3407-8000',
        horario: 'Todos os dias das 6h às 22h',
        foto: null,
        latitude: -22.2100,
        longitude: -49.6560,
        ativo: true,
        destaque: true
      },
      {
        nome: 'Museu Municipal de Garça',
        categoria: 'cultura',
        descricao: 'Acervo histórico com fotos, documentos e objetos que contam a história da colonização e desenvolvimento da cidade de Garça.',
        endereco: 'Rua Coronel Pinto, Centro, Garça - SP',
        telefone: '(14) 3407-8050',
        horario: 'Seg a Sex: 8h às 17h | Sáb: 8h às 12h',
        foto: null,
        latitude: -22.2115,
        longitude: -49.6548,
        ativo: true,
        destaque: false
      },
      {
        nome: 'Igreja Matriz Nossa Senhora das Graças',
        categoria: 'cultura',
        descricao: 'Igreja histórica no coração do centro de Garça. Construída no início do século XX, é um símbolo religioso e cultural da cidade.',
        endereco: 'Praça Coronel Pinto, Centro, Garça - SP',
        telefone: '(14) 3407-2500',
        horario: 'Todos os dias: 7h às 19h',
        foto: null,
        latitude: -22.2108,
        longitude: -49.6555,
        ativo: true,
        destaque: true
      },
      {
        nome: 'Estádio Municipal Itamar Oliveira',
        categoria: 'atracao',
        descricao: 'Principal estádio da cidade, sede dos jogos do futebol local e eventos esportivos regionais.',
        endereco: 'Rua do Estádio, Garça - SP',
        telefone: '(14) 3407-8000',
        horario: 'Conforme programação de eventos',
        foto: null,
        latitude: -22.2085,
        longitude: -49.6590,
        ativo: true,
        destaque: false
      },
      {
        nome: 'Feira do Produtor Rural',
        categoria: 'comercio',
        descricao: 'Feira semanal com produtos frescos diretamente dos produtores rurais da região. Frutas, verduras, artesanato e comidas típicas.',
        endereco: 'Praça Central, Garça - SP',
        horario: 'Sábados das 6h às 12h',
        foto: null,
        latitude: -22.2120,
        longitude: -49.6540,
        ativo: true,
        destaque: false
      }
    ];

    await Ponto.insertMany(pontos);
    res.json({ success: true, message: `${pontos.length} pontos inseridos com sucesso!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🗺️  Mapa Turístico de Garça rodando em http://localhost:${PORT}`);
});
