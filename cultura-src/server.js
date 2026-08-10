const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Post = require('./models/Post');
const Category = require('./models/Category');
const multer = require('multer');
const crypto = require('crypto');

// PNAB Models
const PnabYear = require('./models/PnabYear');
const PnabEdital = require('./models/PnabEdital');
const PnabDocument = require('./models/PnabDocument');
const PnabMedia = require('./models/PnabMedia');
const PnabComunicado = require('./models/PnabComunicado');
const PnabCronograma = require('./models/PnabCronograma');
const PnabFaq = require('./models/PnabFaq');
const PnabLegislacao = require('./models/PnabLegislacao');
const PnabNoticia = require('./models/PnabNoticia');
const PnabAudit = require('./models/PnabAudit');
const path = require('path');
const fs = require('fs');

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS) from the root directory
app.use(express.static('./'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/teatro_db';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB Conectado na porta 27017'))
  .catch(err => console.log('Erro ao conectar ao MongoDB:', err));

// Routes

// 1. Register User
app.post('/api/register', async (req, res) => {
  try {
    const { nome, email, senha, receberNotificacoes } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'E-mail já está cadastrado.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senha, salt);

    // Create new user
    const newUser = new User({
      nome,
      email,
      senha: hashedPassword,
      receberNotificacoes: receberNotificacoes === true || receberNotificacoes === 'on' || receberNotificacoes === 'true'
    });

    await newUser.save();
    res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });

  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 2. Login User
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'E-mail não encontrado.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(senha, user.senha);
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha incorreta.' });
    }

    // Login successful
    res.status(200).json({
      message: 'Login bem-sucedido!',
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        receberNotificacoes: user.receberNotificacoes,
        isAdmin: user.isAdmin,
        eventosSalvos: user.eventosSalvos || []
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 3. Get all Posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ dataCriacao: -1 });
    res.status(200).json(posts);
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 3.5 Get a Single Post by ID
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Postagem não encontrada.' });
    res.status(200).json(post);
  } catch (error) {
    console.error('Erro ao buscar post único:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 4. Create a Post
app.post('/api/posts', upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'imagens', maxCount: 10 }]), async (req, res) => {
  try {
    const { titulo, tipo, formato, descricao, datasHorarios, corTituloCapa, emCartazTeatro, videoUrl } = req.body;
    
    if (!titulo || !tipo || !descricao || !formato) {
      return res.status(400).json({ message: 'Título, Tipo, Formato e Descrição são obrigatórios.' });
    }

    let imagensUrl = [];
    let bannerUrl = "";

    if (req.files) {
      if (req.files['banner'] && req.files['banner'].length > 0) {
        bannerUrl = '/uploads/' + req.files['banner'][0].filename;
      }
      if (req.files['imagens'] && req.files['imagens'].length > 0) {
        imagensUrl = req.files['imagens'].map(f => '/uploads/' + f.filename);
      }
    }

    let parsedDatas = [];
    if(datasHorarios) {
      try { parsedDatas = JSON.parse(datasHorarios); } catch(e) { console.error('Erro ao parsear datas:', e); }
    }

    let parsedFormato = [];
    try { parsedFormato = JSON.parse(formato); } catch(e) { console.error('Erro ao parsear formato:', e); }

    const newPost = new Post({ 
      titulo, 
      tipo, 
      formato: parsedFormato, 
      descricao, 
      imagensUrl, 
      bannerUrl, 
      corTituloCapa, 
      videoUrl,
      datasHorarios: parsedDatas,
      emCartazTeatro: emCartazTeatro === 'true'
    });
    await newPost.save();
    res.status(201).json({ message: 'Postagem criada com sucesso!', post: newPost });
  } catch (error) {
    console.error('Erro ao criar post:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 4.5 Update a Post
app.put('/api/posts/:id', upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'imagens', maxCount: 10 }]), async (req, res) => {
  try {
    const { titulo, tipo, formato, descricao, datasHorarios, corTituloCapa, emCartazTeatro, videoUrl } = req.body;
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Postagem não encontrada.' });

    if (titulo) post.titulo = titulo;
    if (tipo) post.tipo = tipo;
    if (formato) { try { post.formato = JSON.parse(formato); } catch(e) { console.error('Erro formato:', e); } }
    if (descricao) post.descricao = descricao;
    if (corTituloCapa) post.corTituloCapa = corTituloCapa;
    if (videoUrl !== undefined) post.videoUrl = videoUrl;
    if (emCartazTeatro !== undefined) post.emCartazTeatro = emCartazTeatro === 'true';

    if (req.files) {
      if (req.files['banner'] && req.files['banner'].length > 0) {
        post.bannerUrl = '/uploads/' + req.files['banner'][0].filename;
      }
      if (req.files['imagens'] && req.files['imagens'].length > 0) {
        post.imagensUrl = req.files['imagens'].map(f => '/uploads/' + f.filename);
      }
    }

    if (datasHorarios) {
      try { post.datasHorarios = JSON.parse(datasHorarios); } catch(e) { console.error('Erro ao parsear datas:', e); }
    }

    await post.save();
    res.status(200).json({ message: 'Postagem atualizada com sucesso!', post });
  } catch (error) {
    console.error('Erro ao atualizar post:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 5. Delete a Post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) {
      return res.status(404).json({ message: 'Postagem não encontrada.' });
    }
    res.status(200).json({ message: 'Postagem deletada com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar post:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 6. Get all Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-senha').sort({ dataCriacao: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 7. Promote User to Admin
app.put('/api/users/:id/admin', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { isAdmin: true },
      { new: true }
    ).select('-senha');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    res.status(200).json({ message: 'Usuário promovido a administrador.', user: updatedUser });
  } catch (error) {
    console.error('Erro ao promover usuário:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 8. Get all Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ dataCriacao: -1 });
    res.status(200).json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 9. Create Category
app.post('/api/categories', async (req, res) => {
  try {
    const { nome, cor } = req.body;
    if (!nome) return res.status(400).json({ message: 'Nome é obrigatório.' });
    
    const categoryExists = await Category.findOne({ nome: new RegExp(`^${nome}$`, 'i') });
    if(categoryExists) {
      return res.status(400).json({ message: 'Categoria já existe.' });
    }

    const newCategory = new Category({ nome, cor: cor || '#3b82f6' });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 10. Delete Category
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Categoria não encontrada.' });
    res.status(200).json({ message: 'Categoria apagada.' });
  } catch (error) {
    console.error('Erro ao apagar categoria:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 11. Toggle Event Notification
app.post('/api/users/:id/events', async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ message: 'ID do evento é obrigatório.' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    // Toggle logic
    let index = user.eventosSalvos.indexOf(eventId);
    if (index > -1) {
      user.eventosSalvos.splice(index, 1);
    } else {
      user.eventosSalvos.push(eventId);
    }

    await user.save();
    res.status(200).json({ message: 'Eventos atualizados', eventosSalvos: user.eventosSalvos });
  } catch (error) {
    console.error('Erro ao atualizar eventos do usuário:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// =========================================================================
// PNAB MODULE ENDPOINTS & UTILITIES
// =========================================================================

// Middleware for Admin/Staff Authorization
async function checkAdminCultura(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ message: 'Acesso não autorizado. ID do usuário não fornecido.' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }
    if (user.isAdmin || user.role === 'admin_cultura') {
      req.user = user;
      return next();
    }
    return res.status(403).json({ message: 'Acesso negado. Requer permissão admin_cultura.' });
  } catch (error) {
    console.error('Erro na autorização:', error);
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
}

// Audit logger helper
async function logAudit(req, action, contentType, contentId, details) {
  try {
    const userId = req.headers['x-user-id'] || null;
    const userEmail = req.user ? req.user.email : 'system@garca.sp.gov.br';
    const userName = req.user ? req.user.nome : 'Sistema';
    
    const audit = new PnabAudit({
      userId,
      userEmail,
      userName,
      action,
      contentType,
      contentId,
      details
    });
    await audit.save();
  } catch (error) {
    console.error('Erro ao gravar log de auditoria:', error);
  }
}

// Media library dynamic upload handler
async function organizeAndIndexFile(file, req, customCat = null) {
  const tempPath = file.path;
  const fileContent = fs.readFileSync(tempPath);
  const hash = crypto.createHash('sha256').update(fileContent).digest('hex');

  // Check if file already exists in library
  const existingMedia = await PnabMedia.findOne({ hash, deleted: false });
  if (existingMedia) {
    try { fs.unlinkSync(tempPath); } catch (e) { console.error('Erro ao excluir arquivo temporário:', e); }
    return existingMedia.url;
  }

  // Determine Category based on file extension
  const ext = path.extname(file.originalname).toLowerCase();
  let categoria = customCat || 'Imagem';
  if (['.pdf'].includes(ext)) categoria = 'PDF';
  else if (['.doc', '.docx'].includes(ext)) categoria = 'Word';
  else if (['.xls', '.xlsx', '.ods'].includes(ext)) categoria = 'Planilhas';
  else if (['.zip', '.rar'].includes(ext)) categoria = 'ZIP';
  else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) categoria = 'Imagem';
  else if (['.mp4', '.avi', '.mov'].includes(ext)) categoria = 'Vídeo';
  else if (['.mp3', '.wav', '.ogg'].includes(ext)) categoria = 'Áudio';
  else if (['.svg'].includes(ext)) categoria = 'SVG';

  const ano = req.body.anoName || 'geral';
  const edital = req.body.editalTitle || 'geral';
  const safeAno = ano.toString().replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeEdital = edital.toString().replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeCat = categoria.replace(/[^a-zA-Z0-9_-]/g, '_');

  const targetDir = path.join(__dirname, 'uploads', 'pnab', safeAno, safeEdital, safeCat);
  fs.mkdirSync(targetDir, { recursive: true });

  const finalPath = path.join(targetDir, file.filename);
  fs.renameSync(tempPath, finalPath);

  const relativeUrl = '/uploads/pnab/' + safeAno + '/' + safeEdital + '/' + safeCat + '/' + file.filename;

  const newMedia = new PnabMedia({
    filename: file.filename,
    originalName: file.originalname,
    url: relativeUrl,
    sizeBytes: file.size,
    mimeType: file.mimetype,
    categoria,
    ano: req.body.anoName || 'geral',
    programa: req.body.programa || 'PNAB',
    hash
  });
  await newMedia.save();

  return relativeUrl;
}

// -------------------------------------------------------------------------
// 1. ANOS (EXERCÍCIOS) ENDPOINTS
// -------------------------------------------------------------------------
app.get('/api/pnab/anos', async (req, res) => {
  try {
    const list = await PnabYear.find({ deleted: false }).sort({ ordem: 1, nome: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar anos.' });
  }
});

app.post('/api/pnab/anos', checkAdminCultura, async (req, res) => {
  try {
    const { nome, descricao, bannerUrl, imagemUrl, status, ordem } = req.body;
    if (!nome) return res.status(400).json({ message: 'Nome é obrigatório.' });

    const exists = await PnabYear.findOne({ nome, deleted: false });
    if (exists) return res.status(400).json({ message: 'Exercício já cadastrado.' });

    const newYear = new PnabYear({ nome, descricao, bannerUrl, imagemUrl, status, ordem });
    await newYear.save();

    await logAudit(req, 'CREATE', 'PnabYear', newYear._id, `Criou o exercício ${nome}`);
    res.status(201).json(newYear);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao cadastrar ano.' });
  }
});

app.put('/api/pnab/anos/:id', checkAdminCultura, async (req, res) => {
  try {
    const updated = await PnabYear.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Ano não encontrado.' });

    await logAudit(req, 'UPDATE', 'PnabYear', updated._id, `Atualizou o exercício ${updated.nome}`);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar ano.' });
  }
});

app.delete('/api/pnab/anos/:id', checkAdminCultura, async (req, res) => {
  try {
    const item = await PnabYear.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Ano não encontrado.' });
    
    item.deleted = true;
    await item.save();

    await logAudit(req, 'DELETE', 'PnabYear', item._id, `Moveu para lixeira o exercício ${item.nome}`);
    res.json({ message: 'Exercício movido para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir ano.' });
  }
});

// -------------------------------------------------------------------------
// 2. EDITAIS ENDPOINTS
// -------------------------------------------------------------------------
app.get('/api/pnab/editais', async (req, res) => {
  try {
    const { ano, programa, busca, statusWorkflow, destacado } = req.query;
    let query = { deleted: false };

    if (ano) query.ano = ano;
    if (programa) query.programa = programa;
    if (destacado) query.destacado = destacado === 'true';
    if (busca) {
      query.$or = [
        { titulo: new RegExp(busca, 'i') },
        { descricao: new RegExp(busca, 'i') },
        { tags: new RegExp(busca, 'i') }
      ];
    }

    // Role check to filter rascunhos and scheduled events for citizens
    const userId = req.headers['x-user-id'];
    let isStaff = false;
    if (userId) {
      const user = await User.findById(userId);
      if (user && (user.isAdmin || user.role === 'admin_cultura')) {
        isStaff = true;
      }
    }

    if (!isStaff) {
      query.statusWorkflow = 'Publicado';
      query.dataPublicacao = { $lte: new Date() };
    } else if (statusWorkflow) {
      query.statusWorkflow = statusWorkflow;
    }

    const editais = await PnabEdital.find(query).populate('ano').sort({ ordem: 1, dataCriacao: -1 });
    res.json(editais);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar editais.' });
  }
});

app.get('/api/pnab/editais/:id', async (req, res) => {
  try {
    const edital = await PnabEdital.findById(req.params.id).populate('ano');
    if (!edital || edital.deleted) return res.status(404).json({ message: 'Edital não encontrado.' });
    res.json(edital);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao detalhar edital.' });
  }
});

app.post('/api/pnab/editais', checkAdminCultura, upload.any(), async (req, res) => {
  try {
    const { titulo, programa, ano, descricao, statusEdital, statusWorkflow, destacado, ordem, tags, observacoes, dataPublicacao } = req.body;
    if (!titulo || !ano || !descricao) {
      return res.status(400).json({ message: 'Título, Ano e Descrição são obrigatórios.' });
    }

    let bannerUrl = '';
    let imagemUrl = '';
    let galeriaUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await organizeAndIndexFile(file, req);
        if (file.fieldname === 'banner') {
          bannerUrl = url;
        } else if (file.fieldname === 'imagem') {
          imagemUrl = url;
        } else if (file.fieldname === 'galeria') {
          galeriaUrls.push(url);
        }
      }
    }

    let parsedTags = [];
    if (tags) {
      try { parsedTags = JSON.parse(tags); } catch(e) { parsedTags = tags.split(',').map(t => t.trim()); }
    }

    const edital = new PnabEdital({
      titulo,
      programa: programa || 'PNAB',
      ano,
      descricao,
      statusEdital: statusEdital || 'Aberto',
      statusWorkflow: statusWorkflow || 'Rascunho',
      destacado: destacado === 'true',
      ordem: Number(ordem) || 0,
      bannerUrl,
      imagemUrl,
      galeriaUrls,
      tags: parsedTags,
      observacoes,
      dataPublicacao: dataPublicacao ? new Date(dataPublicacao) : new Date(),
      autor: req.user.nome
    });

    await edital.save();
    await logAudit(req, 'CREATE', 'PnabEdital', edital._id, `Criou o edital ${titulo}`);
    res.status(201).json(edital);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao criar edital.' });
  }
});

app.put('/api/pnab/editais/:id', checkAdminCultura, upload.any(), async (req, res) => {
  try {
    const edital = await PnabEdital.findById(req.params.id);
    if (!edital) return res.status(404).json({ message: 'Edital não encontrado.' });

    const fields = ['titulo', 'programa', 'ano', 'descricao', 'statusEdital', 'statusWorkflow', 'destacado', 'ordem', 'observacoes', 'dataPublicacao'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        if (f === 'destacado') edital[f] = req.body[f] === 'true';
        else if (f === 'ordem') edital[f] = Number(req.body[f]);
        else if (f === 'dataPublicacao') edital[f] = new Date(req.body[f]);
        else edital[f] = req.body[f];
      }
    });

    if (req.body.tags) {
      try { edital.tags = JSON.parse(req.body.tags); } catch(e) { edital.tags = req.body.tags.split(',').map(t => t.trim()); }
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await organizeAndIndexFile(file, req);
        if (file.fieldname === 'banner') {
          edital.bannerUrl = url;
        } else if (file.fieldname === 'imagem') {
          edital.imagemUrl = url;
        } else if (file.fieldname === 'galeria') {
          edital.galeriaUrls.push(url);
        }
      }
    }

    edital.dataAtualizacao = Date.now();
    await edital.save();

    await logAudit(req, 'UPDATE', 'PnabEdital', edital._id, `Atualizou o edital ${edital.titulo}`);
    res.json(edital);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao atualizar edital.' });
  }
});

app.delete('/api/pnab/editais/:id', checkAdminCultura, async (req, res) => {
  try {
    const edital = await PnabEdital.findById(req.params.id);
    if (!edital) return res.status(404).json({ message: 'Edital não encontrado.' });

    edital.deleted = true;
    await edital.save();

    await logAudit(req, 'DELETE', 'PnabEdital', edital._id, `Moveu edital para a lixeira: ${edital.titulo}`);
    res.json({ message: 'Edital movido para a lixeira com sucesso.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir edital.' });
  }
});

app.post('/api/pnab/editais/:id/duplicate', checkAdminCultura, async (req, res) => {
  try {
    const edital = await PnabEdital.findById(req.params.id);
    if (!edital) return res.status(404).json({ message: 'Edital de origem não encontrado.' });

    // 1. Duplicate Edital itself
    const newEdital = new PnabEdital({
      titulo: edital.titulo + ' (Cópia)',
      programa: edital.programa,
      ano: edital.ano,
      descricao: edital.descricao,
      statusEdital: 'Aberto',
      statusWorkflow: 'Rascunho',
      destacado: false,
      ordem: edital.ordem + 1,
      bannerUrl: edital.bannerUrl,
      imagemUrl: edital.imagemUrl,
      galeriaUrls: edital.galeriaUrls,
      tags: edital.tags,
      observacoes: edital.observacoes,
      autor: req.user.nome
    });
    await newEdital.save();

    // 2. Duplicate FAQs associated
    const faqs = await PnabFaq.find({ edital: edital._id, deleted: false });
    for (const faq of faqs) {
      const newFaq = new PnabFaq({
        edital: newEdital._id,
        pergunta: faq.pergunta,
        resposta: faq.resposta,
        ordem: faq.ordem,
        categoria: faq.categoria,
        autor: req.user.nome
      });
      await newFaq.save();
    }

    // 3. Duplicate Timeline Cronogramas associated
    const cronogramas = await PnabCronograma.find({ edital: edital._id, deleted: false });
    for (const cron of cronogramas) {
      const newCron = new PnabCronograma({
        edital: newEdital._id,
        data: cron.data,
        evento: cron.evento,
        descricao: cron.descricao,
        status: 'Agendado',
        ordem: cron.ordem,
        autor: req.user.nome
      });
      await newCron.save();
    }

    await logAudit(req, 'DUPLICATE', 'PnabEdital', newEdital._id, `Duplicou o edital ${edital.titulo} para ${newEdital.titulo}`);
    res.status(201).json(newEdital);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao duplicar edital.' });
  }
});

// -------------------------------------------------------------------------
// 3. DOCUMENTOS ENDPOINTS
// -------------------------------------------------------------------------
app.get('/api/pnab/documentos', async (req, res) => {
  try {
    const { edital } = req.query;
    let query = { deleted: false };
    if (edital) query.edital = edital;

    const list = await PnabDocument.find(query).sort({ dataCriacao: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar documentos.' });
  }
});

app.post('/api/pnab/documentos', checkAdminCultura, upload.any(), async (req, res) => {
  try {
    const { edital, titulo, descricao, tipo, versao } = req.body;
    if (!edital || !titulo) return res.status(400).json({ message: 'Edital e Título são obrigatórios.' });

    const file = req.files && req.files[0];
    if (!file) return res.status(400).json({ message: 'Arquivo do documento é obrigatório.' });

    // Fetch related edital for dynamic folders
    const edObj = await PnabEdital.findById(edital).populate('ano');
    if (!edObj) return res.status(400).json({ message: 'Edital inválido.' });
    
    // Inject values for folder structure
    req.body.anoName = edObj.ano.nome;
    req.body.editalTitle = edObj.titulo;

    const fileUrl = await organizeAndIndexFile(file, req, 'PDF');

    const doc = new PnabDocument({
      edital,
      titulo,
      descricao,
      tipo: tipo || 'Anexo',
      versao: versao || '1.0',
      arquivoUrl: fileUrl,
      autor: req.user.nome
    });

    await doc.save();
    await logAudit(req, 'CREATE', 'PnabDocument', doc._id, `Cadastrou documento ${titulo} no edital ${edObj.titulo}`);
    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao cadastrar documento.' });
  }
});

app.put('/api/pnab/documentos/:id', checkAdminCultura, upload.any(), async (req, res) => {
  try {
    const doc = await PnabDocument.findById(req.params.id).populate({ path: 'edital', populate: { path: 'ano' } });
    if (!doc) return res.status(404).json({ message: 'Documento não encontrado.' });

    const { titulo, descricao, tipo, versao, descricaoAlteracao } = req.body;
    if (titulo) doc.titulo = titulo;
    if (descricao !== undefined) doc.descricao = descricao;
    if (tipo) doc.tipo = tipo;

    const file = req.files && req.files[0];
    if (file) {
      // 1. Archive the current file and version inside the array
      doc.historicoVersoes.push({
        versao: doc.versao,
        arquivoUrl: doc.arquivoUrl,
        dataUpload: doc.dataAtualizacao || doc.dataCriacao,
        publicadoPor: doc.autor,
        descricaoAlteracao: descricaoAlteracao || 'Atualização de arquivo'
      });

      // 2. Move file and update main fields
      req.body.anoName = doc.edital.ano.nome;
      req.body.editalTitle = doc.edital.titulo;
      const fileUrl = await organizeAndIndexFile(file, req, 'PDF');

      doc.arquivoUrl = fileUrl;
      doc.versao = versao || (parseFloat(doc.versao) + 1.0).toFixed(1).toString();
      doc.autor = req.user.nome;
    } else if (versao) {
      doc.versao = versao;
    }

    doc.dataAtualizacao = Date.now();
    await doc.save();

    await logAudit(req, 'UPDATE', 'PnabDocument', doc._id, `Atualizou o documento ${doc.titulo}`);
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao editar documento.' });
  }
});

app.delete('/api/pnab/documentos/:id', checkAdminCultura, async (req, res) => {
  try {
    const doc = await PnabDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Documento não encontrado.' });

    doc.deleted = true;
    await doc.save();

    await logAudit(req, 'DELETE', 'PnabDocument', doc._id, `Moveu documento para a lixeira: ${doc.titulo}`);
    res.json({ message: 'Documento movido para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir documento.' });
  }
});

// Restore previous version of a document
app.post('/api/pnab/documentos/:id/restore-version', checkAdminCultura, async (req, res) => {
  try {
    const { versaoIndex } = req.body;
    if (versaoIndex === undefined) return res.status(400).json({ message: 'Índice da versão é obrigatório.' });

    const doc = await PnabDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Documento não encontrado.' });

    const versionToRestore = doc.historicoVersoes[versaoIndex];
    if (!versionToRestore) return res.status(404).json({ message: 'Versão histórica não encontrada.' });

    // Store current version in variables
    const currentUrl = doc.arquivoUrl;
    const currentVersao = doc.versao;
    const currentUpload = doc.dataAtualizacao || doc.dataCriacao;
    const currentAutor = doc.autor;

    // Swap values
    doc.arquivoUrl = versionToRestore.arquivoUrl;
    doc.versao = versionToRestore.versao;
    doc.autor = req.user.nome;
    doc.dataAtualizacao = Date.now();

    // Replace historical item with the archived current version
    doc.historicoVersoes[versaoIndex] = {
      versao: currentVersao,
      arquivoUrl: currentUrl,
      dataUpload: currentUpload,
      publicadoPor: currentAutor,
      descricaoAlteracao: `Restaurada versão ${versionToRestore.versao}`
    };

    await doc.save();
    await logAudit(req, 'RESTORE', 'PnabDocument', doc._id, `Restaurou a versão ${doc.versao} do documento ${doc.titulo}`);
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao restaurar versão do documento.' });
  }
});

// Counter of downloads
app.post('/api/pnab/documentos/:id/download', async (req, res) => {
  try {
    const doc = await PnabDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Documento não encontrado.' });
    doc.downloadsCount += 1;
    await doc.save();
    res.json({ downloadsCount: doc.downloadsCount });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao incrementar downloads.' });
  }
});

// -------------------------------------------------------------------------
// 4. COMUNICADOS ENDPOINTS
// -------------------------------------------------------------------------
app.get('/api/pnab/comunicados', async (req, res) => {
  try {
    const { edital } = req.query;
    let query = { deleted: false };
    if (edital) query.edital = edital;

    // Citizens only see published and within period
    const userId = req.headers['x-user-id'];
    let isStaff = false;
    if (userId) {
      const user = await User.findById(userId);
      if (user && (user.isAdmin || user.role === 'admin_cultura')) isStaff = true;
    }

    if (!isStaff) {
      query.statusWorkflow = 'Publicado';
      const now = new Date();
      query.$and = [
        { $or: [{ dataInicioExibicao: null }, { dataInicioExibicao: { $lte: now } }] },
        { $or: [{ dataFimExibicao: null }, { dataFimExibicao: { $gte: now } }] }
      ];
    }

    const list = await PnabComunicado.find(query).sort({ fixado: -1, dataCriacao: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar comunicados.' });
  }
});

app.post('/api/pnab/comunicados', checkAdminCultura, upload.any(), async (req, res) => {
  try {
    const { edital, titulo, descricao, dataInicioExibicao, dataFimExibicao, fixado, statusWorkflow } = req.body;
    if (!edital || !titulo || !descricao) return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });

    let imagemUrl = '';
    if (req.files && req.files[0]) {
      const edObj = await PnabEdital.findById(edital).populate('ano');
      req.body.anoName = edObj.ano.nome;
      req.body.editalTitle = edObj.titulo;
      imagemUrl = await organizeAndIndexFile(req.files[0], req, 'Imagem');
    }

    const item = new PnabComunicado({
      edital,
      titulo,
      descricao,
      imagemUrl,
      dataInicioExibicao: dataInicioExibicao ? new Date(dataInicioExibicao) : null,
      dataFimExibicao: dataFimExibicao ? new Date(dataFimExibicao) : null,
      fixado: fixado === 'true',
      statusWorkflow: statusWorkflow || 'Rascunho',
      autor: req.user.nome
    });

    await item.save();
    await logAudit(req, 'CREATE', 'PnabComunicado', item._id, `Criou comunicado ${titulo}`);
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar comunicado.' });
  }
});

app.put('/api/pnab/comunicados/:id', checkAdminCultura, upload.any(), async (req, res) => {
  try {
    const item = await PnabComunicado.findById(req.params.id).populate({ path: 'edital', populate: { path: 'ano' } });
    if (!item) return res.status(404).json({ message: 'Comunicado não encontrado.' });

    const fields = ['titulo', 'descricao', 'fixado', 'statusWorkflow'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        if (f === 'fixado') item[f] = req.body[f] === 'true';
        else item[f] = req.body[f];
      }
    });

    if (req.body.dataInicioExibicao !== undefined) item.dataInicioExibicao = req.body.dataInicioExibicao ? new Date(req.body.dataInicioExibicao) : null;
    if (req.body.dataFimExibicao !== undefined) item.dataFimExibicao = req.body.dataFimExibicao ? new Date(req.body.dataFimExibicao) : null;

    if (req.files && req.files[0]) {
      req.body.anoName = item.edital.ano.nome;
      req.body.editalTitle = item.edital.titulo;
      item.imagemUrl = await organizeAndIndexFile(req.files[0], req, 'Imagem');
    }

    item.dataAtualizacao = Date.now();
    await item.save();

    await logAudit(req, 'UPDATE', 'PnabComunicado', item._id, `Atualizou comunicado ${item.titulo}`);
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao editar comunicado.' });
  }
});

app.delete('/api/pnab/comunicados/:id', checkAdminCultura, async (req, res) => {
  try {
    const item = await PnabComunicado.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Comunicado não encontrado.' });
    
    item.deleted = true;
    await item.save();

    await logAudit(req, 'DELETE', 'PnabComunicado', item._id, `Moveu comunicado para a lixeira: ${item.titulo}`);
    res.json({ message: 'Comunicado movido para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir comunicado.' });
  }
});

// -------------------------------------------------------------------------
// 5. CRONOGRAMAS ENDPOINTS
// -------------------------------------------------------------------------
app.get('/api/pnab/cronogramas', async (req, res) => {
  try {
    const { edital } = req.query;
    let query = { deleted: false };
    if (edital) query.edital = edital;

    const list = await PnabCronograma.find(query).sort({ ordem: 1, data: 1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar cronograma.' });
  }
});

app.post('/api/pnab/cronogramas', checkAdminCultura, async (req, res) => {
  try {
    const { edital, data, evento, descricao, status, ordem } = req.body;
    if (!edital || !data || !evento) return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });

    const item = new PnabCronograma({
      edital, data, evento, descricao, status, ordem: Number(ordem) || 0, autor: req.user.nome
    });
    await item.save();

    await logAudit(req, 'CREATE', 'PnabCronograma', item._id, `Criou item de cronograma: ${evento}`);
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar cronograma.' });
  }
});

app.put('/api/pnab/cronogramas/:id', checkAdminCultura, async (req, res) => {
  try {
    const item = await PnabCronograma.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Cronograma não encontrado.' });

    await logAudit(req, 'UPDATE', 'PnabCronograma', item._id, `Atualizou item de cronograma: ${item.evento}`);
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao editar cronograma.' });
  }
});

app.delete('/api/pnab/cronogramas/:id', checkAdminCultura, async (req, res) => {
  try {
    const item = await PnabCronograma.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item não encontrado.' });
    
    item.deleted = true;
    await item.save();

    await logAudit(req, 'DELETE', 'PnabCronograma', item._id, `Moveu item de cronograma para a lixeira: ${item.evento}`);
    res.json({ message: 'Item removido do cronograma.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir cronograma.' });
  }
});

// -------------------------------------------------------------------------
// 6. FAQ ENDPOINTS
// -------------------------------------------------------------------------
app.get('/api/pnab/faq', async (req, res) => {
  try {
    const { edital } = req.query;
    let query = { deleted: false };
    if (edital) query.edital = edital;

    const list = await PnabFaq.find(query).sort({ ordem: 1, pergunta: 1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar FAQ.' });
  }
});

app.post('/api/pnab/faq', checkAdminCultura, async (req, res) => {
  try {
    const { edital, pergunta, resposta, ordem, categoria } = req.body;
    if (!edital || !pergunta || !resposta) return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });

    const item = new PnabFaq({ edital, pergunta, resposta, ordem: Number(ordem) || 0, categoria, autor: req.user.nome });
    await item.save();

    await logAudit(req, 'CREATE', 'PnabFaq', item._id, `Criou FAQ: ${pergunta}`);
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar FAQ.' });
  }
});

app.put('/api/pnab/faq/:id', checkAdminCultura, async (req, res) => {
  try {
    const item = await PnabFaq.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'FAQ não encontrado.' });

    await logAudit(req, 'UPDATE', 'PnabFaq', item._id, `Atualizou FAQ: ${item.pergunta}`);
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao editar FAQ.' });
  }
});

app.delete('/api/pnab/faq/:id', checkAdminCultura, async (req, res) => {
  try {
    const item = await PnabFaq.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'FAQ não encontrado.' });

    item.deleted = true;
    await item.save();

    await logAudit(req, 'DELETE', 'PnabFaq', item._id, `Moveu FAQ para a lixeira: ${item.pergunta}`);
    res.json({ message: 'FAQ movido para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir FAQ.' });
  }
});

// -------------------------------------------------------------------------
// 7. LEGISLAÇÃO ENDPOINTS
// -------------------------------------------------------------------------
app.get('/api/pnab/legislacao', async (req, res) => {
  try {
    const { edital } = req.query;
    let query = { deleted: false };
    if (edital) query.edital = edital;

    const list = await PnabLegislacao.find(query).sort({ tipo: 1, titulo: 1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar legislação.' });
  }
});

app.post('/api/pnab/legislacao', checkAdminCultura, upload.any(), async (req, res) => {
  try {
    const { edital, titulo, tipo, linkOficial } = req.body;
    if (!titulo || !tipo) return res.status(400).json({ message: 'Título e tipo são obrigatórios.' });

    let arquivoUrl = '';
    if (req.files && req.files[0]) {
      if (edital) {
        const edObj = await PnabEdital.findById(edital).populate('ano');
        req.body.anoName = edObj.ano.nome;
        req.body.editalTitle = edObj.titulo;
      }
      arquivoUrl = await organizeAndIndexFile(req.files[0], req, 'PDF');
    }

    const item = new PnabLegislacao({
      edital: edital || null,
      titulo,
      tipo,
      linkOficial,
      arquivoUrl,
      autor: req.user.nome
    });

    await item.save();
    await logAudit(req, 'CREATE', 'PnabLegislacao', item._id, `Criou legislação ${titulo}`);
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao criar legislação.' });
  }
});

app.put('/api/pnab/legislacao/:id', checkAdminCultura, upload.any(), async (req, res) => {
  try {
    const item = await PnabLegislacao.findById(req.params.id).populate({ path: 'edital', populate: { path: 'ano' } });
    if (!item) return res.status(404).json({ message: 'Legislação não encontrada.' });

    const fields = ['titulo', 'tipo', 'linkOficial', 'edital'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) item[f] = req.body[f] || null;
    });

    if (req.files && req.files[0]) {
      if (item.edital) {
        req.body.anoName = item.edital.ano.nome;
        req.body.editalTitle = item.edital.titulo;
      }
      item.arquivoUrl = await organizeAndIndexFile(req.files[0], req, 'PDF');
    }

    item.dataAtualizacao = Date.now();
    await item.save();

    await logAudit(req, 'UPDATE', 'PnabLegislacao', item._id, `Atualizou legislação ${item.titulo}`);
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao editar legislação.' });
  }
});

app.delete('/api/pnab/legislacao/:id', checkAdminCultura, async (req, res) => {
  try {
    const item = await PnabLegislacao.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Legislação não encontrada.' });

    item.deleted = true;
    await item.save();

    await logAudit(req, 'DELETE', 'PnabLegislacao', item._id, `Moveu legislação para a lixeira: ${item.titulo}`);
    res.json({ message: 'Legislação movida para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir legislação.' });
  }
});

// -------------------------------------------------------------------------
// 8. NOTÍCIAS ENDPOINTS
// -------------------------------------------------------------------------
app.get('/api/pnab/noticias', async (req, res) => {
  try {
    const { edital } = req.query;
    let query = { deleted: false };
    if (edital) query.edital = edital;

    // Citizens only see published
    const userId = req.headers['x-user-id'];
    let isStaff = false;
    if (userId) {
      const user = await User.findById(userId);
      if (user && (user.isAdmin || user.role === 'admin_cultura')) isStaff = true;
    }

    if (!isStaff) {
      query.statusWorkflow = 'Publicado';
    }

    const list = await PnabNoticia.find(query).sort({ dataCriacao: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar notícias.' });
  }
});

app.post('/api/pnab/noticias', checkAdminCultura, upload.any(), async (req, res) => {
  try {
    const { edital, titulo, resumo, texto, tags, statusWorkflow } = req.body;
    if (!titulo || !texto) return res.status(400).json({ message: 'Título e conteúdo são obrigatórios.' });

    let imagemUrl = '';
    let galeriaUrls = [];
    
    if (req.files && req.files.length > 0) {
      if (edital) {
        const edObj = await PnabEdital.findById(edital).populate('ano');
        req.body.anoName = edObj.ano.nome;
        req.body.editalTitle = edObj.titulo;
      }
      for (const file of req.files) {
        const url = await organizeAndIndexFile(file, req);
        if (file.fieldname === 'imagem') {
          imagemUrl = url;
        } else if (file.fieldname === 'galeria') {
          galeriaUrls.push(url);
        }
      }
    }

    let parsedTags = [];
    if (tags) {
      try { parsedTags = JSON.parse(tags); } catch(e) { parsedTags = tags.split(',').map(t => t.trim()); }
    }

    const item = new PnabNoticia({
      edital: edital || null,
      titulo,
      resumo,
      texto,
      imagemUrl,
      galeriaUrls,
      tags: parsedTags,
      statusWorkflow: statusWorkflow || 'Rascunho',
      autor: req.user.nome
    });

    await item.save();
    await logAudit(req, 'CREATE', 'PnabNoticia', item._id, `Criou notícia ${titulo}`);
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao criar notícia.' });
  }
});

app.put('/api/pnab/noticias/:id', checkAdminCultura, upload.any(), async (req, res) => {
  try {
    const item = await PnabNoticia.findById(req.params.id).populate({ path: 'edital', populate: { path: 'ano' } });
    if (!item) return res.status(404).json({ message: 'Notícia não encontrada.' });

    const fields = ['titulo', 'resumo', 'texto', 'statusWorkflow', 'edital'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) item[f] = req.body[f] || null;
    });

    if (req.body.tags) {
      try { item.tags = JSON.parse(req.body.tags); } catch(e) { item.tags = req.body.tags.split(',').map(t => t.trim()); }
    }

    if (req.files && req.files.length > 0) {
      if (item.edital) {
        req.body.anoName = item.edital.ano.nome;
        req.body.editalTitle = item.edital.titulo;
      }
      for (const file of req.files) {
        const url = await organizeAndIndexFile(file, req);
        if (file.fieldname === 'imagem') {
          item.imagemUrl = url;
        } else if (file.fieldname === 'galeria') {
          item.galeriaUrls.push(url);
        }
      }
    }

    item.dataAtualizacao = Date.now();
    await item.save();

    await logAudit(req, 'UPDATE', 'PnabNoticia', item._id, `Atualizou notícia ${item.titulo}`);
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao editar notícia.' });
  }
});

app.delete('/api/pnab/noticias/:id', checkAdminCultura, async (req, res) => {
  try {
    const item = await PnabNoticia.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Notícia não encontrada.' });

    item.deleted = true;
    await item.save();

    await logAudit(req, 'DELETE', 'PnabNoticia', item._id, `Moveu notícia para a lixeira: ${item.titulo}`);
    res.json({ message: 'Notícia movida para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir notícia.' });
  }
});

// -------------------------------------------------------------------------
// 9. BIBLIOTECA DE MÍDIAS (MEDIA LIBRARY) ENDPOINTS
// -------------------------------------------------------------------------
app.get('/api/pnab/midias', checkAdminCultura, async (req, res) => {
  try {
    const list = await PnabMedia.find({ deleted: false }).sort({ dataCriacao: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao listar mídias.' });
  }
});

app.post('/api/pnab/midias', checkAdminCultura, upload.single('arquivo'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });

    const url = await organizeAndIndexFile(file, req, req.body.categoria);
    const media = await PnabMedia.findOne({ url });

    await logAudit(req, 'UPLOAD', 'PnabMedia', media._id, `Enviou arquivo ${file.originalname} para biblioteca`);
    res.status(201).json(media);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao processar mídia.' });
  }
});

app.delete('/api/pnab/midias/:id', checkAdminCultura, async (req, res) => {
  try {
    const item = await PnabMedia.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Arquivo não encontrado.' });

    item.deleted = true;
    await item.save();

    // Note: we soft-delete from the database index so it doesn't appear in the reusable library list.
    await logAudit(req, 'DELETE', 'PnabMedia', item._id, `Removeu arquivo da biblioteca indexada: ${item.originalName}`);
    res.json({ message: 'Mídia removida da biblioteca.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir mídia.' });
  }
});

// -------------------------------------------------------------------------
// 10. LIXEIRA (RECYCLE BIN) ENDPOINTS
// -------------------------------------------------------------------------
app.get('/api/pnab/lixeira', checkAdminCultura, async (req, res) => {
  try {
    // Queries all models looking for deleted=true items
    const anos = await PnabYear.find({ deleted: true });
    const editais = await PnabEdital.find({ deleted: true });
    const documentos = await PnabDocument.find({ deleted: true });
    const comunicados = await PnabComunicado.find({ deleted: true });
    const cronogramas = await PnabCronograma.find({ deleted: true });
    const faqs = await PnabFaq.find({ deleted: true });
    const legislacoes = await PnabLegislacao.find({ deleted: true });
    const noticias = await PnabNoticia.find({ deleted: true });

    // Format output
    let items = [];
    anos.forEach(x => items.push({ id: x._id, tipo: 'PnabYear', nome: x.nome, details: 'Exercício / Ano' }));
    editais.forEach(x => items.push({ id: x._id, tipo: 'PnabEdital', nome: x.titulo, details: 'Edital de Incentivo' }));
    documentos.forEach(x => items.push({ id: x._id, tipo: 'PnabDocument', nome: x.titulo, details: 'Documento / Arquivo' }));
    comunicados.forEach(x => items.push({ id: x._id, tipo: 'PnabComunicado', nome: x.titulo, details: 'Comunicado / Aviso' }));
    cronogramas.forEach(x => items.push({ id: x._id, tipo: 'PnabCronograma', nome: x.evento, details: 'Item de Timeline' }));
    faqs.forEach(x => items.push({ id: x._id, tipo: 'PnabFaq', nome: x.pergunta, details: 'Pergunta Frequente' }));
    legislacoes.forEach(x => items.push({ id: x._id, tipo: 'PnabLegislacao', nome: x.titulo, details: 'Lei / Decreto' }));
    noticias.forEach(x => items.push({ id: x._id, tipo: 'PnabNoticia', nome: x.titulo, details: 'Notícia Relacionada' }));

    res.json(items);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar lixeira.' });
  }
});

app.post('/api/pnab/lixeira/:id/restore', checkAdminCultura, async (req, res) => {
  try {
    const { tipo } = req.body;
    if (!tipo) return res.status(400).json({ message: 'Tipo do conteúdo é obrigatório.' });

    let model;
    if (tipo === 'PnabYear') model = PnabYear;
    else if (tipo === 'PnabEdital') model = PnabEdital;
    else if (tipo === 'PnabDocument') model = PnabDocument;
    else if (tipo === 'PnabComunicado') model = PnabComunicado;
    else if (tipo === 'PnabCronograma') model = PnabCronograma;
    else if (tipo === 'PnabFaq') model = PnabFaq;
    else if (tipo === 'PnabLegislacao') model = PnabLegislacao;
    else if (tipo === 'PnabNoticia') model = PnabNoticia;
    else return res.status(400).json({ message: 'Tipo inválido.' });

    const item = await model.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item não encontrado.' });

    item.deleted = false;
    await item.save();

    await logAudit(req, 'RESTORE', tipo, item._id, `Restaurou o item ${item.titulo || item.nome || item.evento || item.pergunta}`);
    res.json({ message: 'Item restaurado com sucesso!' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao restaurar item.' });
  }
});

// -------------------------------------------------------------------------
// 11. AUDITORIA ENDPOINTS
// -------------------------------------------------------------------------
app.get('/api/pnab/auditoria', checkAdminCultura, async (req, res) => {
  try {
    const list = await PnabAudit.find().sort({ timestamp: -1 }).limit(100);
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao listar auditoria.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse o site em: http://localhost:${PORT}`);
});
