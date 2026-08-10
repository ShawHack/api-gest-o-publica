const router = require('express').Router()

const verifyToken = require('../helpers/verify-token')
const { attachCulturaContext, requireCulturaAdmin } = require('../helpers/cultura-auth')
const { optionalCulturaAuth } = require('../helpers/pnab-auth')
const { pnabUpload } = require('../helpers/pnab-upload')
const { pnabUserName, isPnabStaff, logPnabAudit, organizeAndIndexFile } = require('../helpers/pnab-service')

const PnabYear = require('../models/PnabYear')
const PnabCycle = require('../models/PnabCycle')
const PnabCycleArea = require('../models/PnabCycleArea')
const { AREA_TIPOS } = require('../models/PnabCycleArea')
const { DEFAULT_CYCLE_AREAS } = require('../helpers/pnab-cycle-defaults')
const PnabEdital = require('../models/PnabEdital')
const PnabDocument = require('../models/PnabDocument')
const PnabMedia = require('../models/PnabMedia')
const PnabComunicado = require('../models/PnabComunicado')
const PnabCronograma = require('../models/PnabCronograma')
const PnabFaq = require('../models/PnabFaq')
const PnabLegislacao = require('../models/PnabLegislacao')
const PnabNoticia = require('../models/PnabNoticia')
const PnabAudit = require('../models/PnabAudit')

const adminChain = [verifyToken, attachCulturaContext, requireCulturaAdmin]

async function ensureDefaultAreas(cicloId, autor) {
  const existing = await PnabCycleArea.countDocuments({ ciclo: cicloId, deleted: false })
  if (existing > 0) return []
  const created = []
  for (const area of DEFAULT_CYCLE_AREAS) {
    const doc = await PnabCycleArea.create({
      ciclo: cicloId,
      ...area,
      statusWorkflow: 'Rascunho',
      publicado: false,
      autor: autor || 'sistema',
    })
    created.push(doc)
  }
  return created
}

// -------------------------------------------------------------------------
// 0. CICLOS PNAB (entidade principal)
// -------------------------------------------------------------------------
router.get('/ciclos', async (req, res) => {
  try {
    const list = await PnabCycle.find({ deleted: false }).sort({ ordem: 1, codigo: 1 })
    res.json(list)
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar ciclos.' })
  }
})

router.get('/ciclos/:id', async (req, res) => {
  try {
    const ciclo = await PnabCycle.findOne({ _id: req.params.id, deleted: false })
    if (!ciclo) return res.status(404).json({ message: 'Ciclo não encontrado.' })
    const areas = await PnabCycleArea.find({ ciclo: ciclo._id, deleted: false }).sort({ ordem: 1 })
    res.json({ ...ciclo.toObject(), areas })
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar ciclo.' })
  }
})

router.post('/ciclos', ...adminChain, async (req, res) => {
  try {
    const {
      codigo,
      nome,
      subtitulo,
      descricao,
      bannerUrl,
      imagemUrl,
      dataInicio,
      dataFim,
      anosAbrangidos,
      decretoReferencia,
      status,
      requisitosProximoCiclo,
      ordem,
      ativo,
      seedAreas = true,
    } = req.body

    if (codigo == null || !nome) {
      return res.status(400).json({ message: 'codigo e nome são obrigatórios.' })
    }

    const codigoNum = Number(codigo)
    if (!Number.isFinite(codigoNum) || codigoNum < 1) {
      return res.status(400).json({ message: 'codigo inválido.' })
    }

    const anosNorm = Array.isArray(anosAbrangidos)
      ? anosAbrangidos
      : String(anosAbrangidos || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)

    const active = await PnabCycle.findOne({ codigo: codigoNum, deleted: false })
    if (active) {
      return res.status(400).json({
        message: `Já existe um ciclo ativo com o código ${codigoNum}. Edite o ciclo existente ou use outro código.`,
      })
    }

    // Soft-deleted with same codigo: restore instead of insert (unique index on codigo).
    const trashed = await PnabCycle.findOne({ codigo: codigoNum, deleted: true })
    if (trashed) {
      trashed.deleted = false
      trashed.nome = nome
      if (subtitulo !== undefined) trashed.subtitulo = subtitulo
      if (descricao !== undefined) trashed.descricao = descricao
      if (bannerUrl !== undefined) trashed.bannerUrl = bannerUrl
      if (imagemUrl !== undefined) trashed.imagemUrl = imagemUrl
      trashed.dataInicio = dataInicio ? new Date(dataInicio) : trashed.dataInicio
      trashed.dataFim = dataFim ? new Date(dataFim) : trashed.dataFim
      trashed.anosAbrangidos = anosNorm
      if (decretoReferencia !== undefined) trashed.decretoReferencia = decretoReferencia
      if (status) trashed.status = status
      if (requisitosProximoCiclo !== undefined) trashed.requisitosProximoCiclo = requisitosProximoCiclo
      trashed.ordem = Number(ordem) || Number(codigoNum) || 0
      trashed.ativo = ativo !== false && ativo !== 'false'
      trashed.dataAtualizacao = Date.now()
      await trashed.save()

      await PnabCycleArea.updateMany(
        { ciclo: trashed._id },
        { $set: { deleted: false, dataAtualizacao: Date.now() } }
      )

      let areas = await PnabCycleArea.find({ ciclo: trashed._id, deleted: false }).sort({ ordem: 1 })
      if ((!areas.length) && seedAreas !== false && seedAreas !== 'false') {
        areas = await ensureDefaultAreas(trashed._id, pnabUserName(req.user))
      }

      await logPnabAudit(
        req,
        'UPDATE',
        'PnabCycle',
        trashed._id,
        `Restaurou o ciclo ${trashed.nome} (código ${codigoNum}) da lixeira`
      )
      return res.status(200).json({ ...trashed.toObject(), areas, restored: true })
    }

    const ciclo = new PnabCycle({
      codigo: codigoNum,
      nome,
      subtitulo,
      descricao,
      bannerUrl,
      imagemUrl,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
      anosAbrangidos: anosNorm,
      decretoReferencia,
      status: status || 'planejamento',
      requisitosProximoCiclo,
      ordem: Number(ordem) || Number(codigoNum) || 0,
      ativo: ativo !== false && ativo !== 'false',
      autor: pnabUserName(req.user),
    })
    await ciclo.save()

    let areas = []
    if (seedAreas !== false && seedAreas !== 'false') {
      areas = await ensureDefaultAreas(ciclo._id, pnabUserName(req.user))
    }

    await logPnabAudit(req, 'CREATE', 'PnabCycle', ciclo._id, `Criou o ciclo ${ciclo.nome}`)
    res.status(201).json({ ...ciclo.toObject(), areas })
  } catch (e) {
    console.error(e)
    if (e && (e.code === 11000 || e.code === '11000')) {
      return res.status(400).json({
        message: 'Já existe um ciclo com este código. Edite o existente ou escolha outro código.',
      })
    }
    res.status(500).json({ message: 'Erro ao cadastrar ciclo.' })
  }
})

router.put('/ciclos/:id', ...adminChain, async (req, res) => {
  try {
    const ciclo = await PnabCycle.findOne({ _id: req.params.id, deleted: false })
    if (!ciclo) return res.status(404).json({ message: 'Ciclo não encontrado.' })

    const fields = [
      'nome',
      'subtitulo',
      'descricao',
      'bannerUrl',
      'imagemUrl',
      'decretoReferencia',
      'status',
      'requisitosProximoCiclo',
      'ordem',
      'ativo',
    ]
    for (const f of fields) {
      if (req.body[f] !== undefined) ciclo[f] = req.body[f]
    }
    if (req.body.codigo != null) ciclo.codigo = Number(req.body.codigo)
    if (req.body.dataInicio !== undefined) {
      ciclo.dataInicio = req.body.dataInicio ? new Date(req.body.dataInicio) : null
    }
    if (req.body.dataFim !== undefined) {
      ciclo.dataFim = req.body.dataFim ? new Date(req.body.dataFim) : null
    }
    if (req.body.anosAbrangidos !== undefined) {
      ciclo.anosAbrangidos = Array.isArray(req.body.anosAbrangidos)
        ? req.body.anosAbrangidos
        : String(req.body.anosAbrangidos || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
    }
    ciclo.dataAtualizacao = Date.now()
    await ciclo.save()

    await logPnabAudit(req, 'UPDATE', 'PnabCycle', ciclo._id, `Atualizou o ciclo ${ciclo.nome}`)
    res.json(ciclo)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Erro ao atualizar ciclo.' })
  }
})

router.delete('/ciclos/:id', ...adminChain, async (req, res) => {
  try {
    const ciclo = await PnabCycle.findOne({ _id: req.params.id, deleted: false })
    if (!ciclo) return res.status(404).json({ message: 'Ciclo não encontrado.' })
    ciclo.deleted = true
    ciclo.dataAtualizacao = Date.now()
    await ciclo.save()
    await PnabCycleArea.updateMany({ ciclo: ciclo._id }, { $set: { deleted: true, dataAtualizacao: Date.now() } })
    await logPnabAudit(req, 'DELETE', 'PnabCycle', ciclo._id, `Moveu ciclo ${ciclo.nome} para lixeira`)
    res.json({ message: 'Ciclo movido para a lixeira.' })
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir ciclo.' })
  }
})

router.post('/ciclos/:id/seed-areas', ...adminChain, async (req, res) => {
  try {
    const ciclo = await PnabCycle.findOne({ _id: req.params.id, deleted: false })
    if (!ciclo) return res.status(404).json({ message: 'Ciclo não encontrado.' })
    const areas = await ensureDefaultAreas(ciclo._id, pnabUserName(req.user))
    if (!areas.length) {
      return res.json({ message: 'Ciclo já possui áreas.', areas: await PnabCycleArea.find({ ciclo: ciclo._id, deleted: false }).sort({ ordem: 1 }) })
    }
    await logPnabAudit(req, 'CREATE', 'PnabCycleArea', ciclo._id, `Seed de áreas padrão no ciclo ${ciclo.nome}`)
    res.status(201).json({ message: 'Áreas padrão criadas.', areas })
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar áreas padrão.' })
  }
})

// Áreas do ciclo (cards)
router.get('/ciclos/:cicloId/areas', optionalCulturaAuth, async (req, res) => {
  try {
    const query = { ciclo: req.params.cicloId, deleted: false }
    if (!isPnabStaff(req)) query.publicado = true
    const list = await PnabCycleArea.find(query).sort({ ordem: 1, titulo: 1 })
    res.json(list)
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar áreas do ciclo.' })
  }
})

router.get('/areas/:id', optionalCulturaAuth, async (req, res) => {
  try {
    const area = await PnabCycleArea.findOne({ _id: req.params.id, deleted: false }).populate('ciclo')
    if (!area) return res.status(404).json({ message: 'Área não encontrada.' })
    if (!area.publicado && !isPnabStaff(req)) {
      return res.status(404).json({ message: 'Área não encontrada.' })
    }
    res.json(area)
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar área.' })
  }
})

router.post('/ciclos/:cicloId/areas', ...adminChain, async (req, res) => {
  try {
    const ciclo = await PnabCycle.findOne({ _id: req.params.cicloId, deleted: false })
    if (!ciclo) return res.status(404).json({ message: 'Ciclo não encontrado.' })

    const { tipo, titulo, descricao, imagemUrl, bannerUrl, ordem, statusWorkflow, publicado } = req.body
    if (!titulo) return res.status(400).json({ message: 'titulo é obrigatório.' })
    if (tipo && !AREA_TIPOS.includes(tipo)) {
      return res.status(400).json({ message: `tipo inválido. Use: ${AREA_TIPOS.join(', ')}` })
    }

    const area = await PnabCycleArea.create({
      ciclo: ciclo._id,
      tipo: tipo || 'Outro',
      titulo,
      descricao,
      imagemUrl,
      bannerUrl,
      ordem: Number(ordem) || 0,
      statusWorkflow: statusWorkflow || 'Rascunho',
      publicado: !!publicado,
      autor: pnabUserName(req.user),
    })
    await logPnabAudit(req, 'CREATE', 'PnabCycleArea', area._id, `Criou área ${titulo} no ciclo ${ciclo.nome}`)
    res.status(201).json(area)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Erro ao criar área.' })
  }
})

router.put('/areas/:id', ...adminChain, async (req, res) => {
  try {
    const area = await PnabCycleArea.findOne({ _id: req.params.id, deleted: false })
    if (!area) return res.status(404).json({ message: 'Área não encontrada.' })

    const fields = ['titulo', 'descricao', 'imagemUrl', 'bannerUrl', 'statusWorkflow', 'publicado']
    for (const f of fields) {
      if (req.body[f] !== undefined) area[f] = req.body[f]
    }
    if (req.body.tipo !== undefined) {
      if (!AREA_TIPOS.includes(req.body.tipo)) {
        return res.status(400).json({ message: `tipo inválido. Use: ${AREA_TIPOS.join(', ')}` })
      }
      area.tipo = req.body.tipo
    }
    if (req.body.ordem !== undefined) area.ordem = Number(req.body.ordem) || 0
    area.dataAtualizacao = Date.now()
    await area.save()
    await logPnabAudit(req, 'UPDATE', 'PnabCycleArea', area._id, `Atualizou área ${area.titulo}`)
    res.json(area)
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar área.' })
  }
})

router.delete('/areas/:id', ...adminChain, async (req, res) => {
  try {
    const area = await PnabCycleArea.findOne({ _id: req.params.id, deleted: false })
    if (!area) return res.status(404).json({ message: 'Área não encontrada.' })
    area.deleted = true
    area.dataAtualizacao = Date.now()
    await area.save()
    await logPnabAudit(req, 'DELETE', 'PnabCycleArea', area._id, `Moveu área ${area.titulo} para lixeira`)
    res.json({ message: 'Área movida para a lixeira.' })
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir área.' })
  }
})

router.get('/area-tipos', (_req, res) => {
  res.json(AREA_TIPOS)
})

const PnabDocCategory = require('../models/PnabDocCategory')
const { DEFAULT_DOC_CATEGORIES } = require('../helpers/pnab-doc-category-defaults')

// -------------------------------------------------------------------------
// 0b. ANOS DENTRO DO CICLO + CATEGORIAS DE DOCUMENTOS (cards)
// -------------------------------------------------------------------------
router.get('/ciclos/:cicloId/anos', async (req, res) => {
  try {
    const list = await PnabYear.find({ deleted: false, ciclo: req.params.cicloId }).sort({
      ordem: 1,
      nome: -1,
    })
    res.json(list)
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar anos do ciclo.' })
  }
})

router.post('/ciclos/:cicloId/anos', ...adminChain, async (req, res) => {
  try {
    const ciclo = await PnabCycle.findOne({ _id: req.params.cicloId, deleted: false })
    if (!ciclo) return res.status(404).json({ message: 'Ciclo não encontrado.' })

    const { nome, descricao, bannerUrl, imagemUrl, status, ordem } = req.body
    if (!nome) return res.status(400).json({ message: 'Nome do ano é obrigatório.' })

    const exists = await PnabYear.findOne({ nome, deleted: false })
    if (exists) {
      if (exists.ciclo && String(exists.ciclo) !== String(ciclo._id)) {
        return res.status(400).json({ message: 'Este ano já está vinculado a outro ciclo.' })
      }
      exists.ciclo = ciclo._id
      if (descricao !== undefined) exists.descricao = descricao
      if (bannerUrl !== undefined) exists.bannerUrl = bannerUrl
      if (imagemUrl !== undefined) exists.imagemUrl = imagemUrl
      if (status) exists.status = status
      if (ordem !== undefined) exists.ordem = Number(ordem) || 0
      exists.dataAtualizacao = Date.now()
      await exists.save()
      await logPnabAudit(req, 'UPDATE', 'PnabYear', exists._id, `Vinculou ano ${nome} ao ciclo ${ciclo.nome}`)
      return res.json(exists)
    }

    const year = await PnabYear.create({
      nome: String(nome).trim(),
      descricao,
      bannerUrl,
      imagemUrl,
      status: status || 'ativo',
      ordem: Number(ordem) || 0,
      ciclo: ciclo._id,
    })
    await logPnabAudit(req, 'CREATE', 'PnabYear', year._id, `Criou ano ${nome} no ciclo ${ciclo.nome}`)
    res.status(201).json(year)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Erro ao cadastrar ano no ciclo.' })
  }
})

router.get('/categorias', optionalCulturaAuth, async (req, res) => {
  try {
    const { ciclo, ano } = req.query
    const query = { deleted: false }
    if (ciclo) query.ciclo = ciclo
    if (ano) query.ano = ano
    if (!isPnabStaff(req)) query.publicado = true
    const list = await PnabDocCategory.find(query)
      .populate('ano', 'nome')
      .populate('ciclo', 'nome codigo')
      .sort({ ordem: 1, titulo: 1 })
    res.json(list)
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar categorias.' })
  }
})

router.get('/categorias/:id', optionalCulturaAuth, async (req, res) => {
  try {
    const cat = await PnabDocCategory.findOne({ _id: req.params.id, deleted: false })
      .populate('ano', 'nome')
      .populate('ciclo', 'nome codigo')
    if (!cat) return res.status(404).json({ message: 'Categoria não encontrada.' })
    if (!cat.publicado && !isPnabStaff(req)) {
      return res.status(404).json({ message: 'Categoria não encontrada.' })
    }
    res.json(cat)
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar categoria.' })
  }
})

router.post('/categorias', ...adminChain, async (req, res) => {
  try {
    const { ciclo, ano, titulo, subtitulo, descricao, iconeUrl, corAccent, ordem, publicado } = req.body
    if (!ciclo || !ano || !titulo) {
      return res.status(400).json({ message: 'ciclo, ano e titulo são obrigatórios.' })
    }
    const [cicloOk, anoOk] = await Promise.all([
      PnabCycle.findOne({ _id: ciclo, deleted: false }),
      PnabYear.findOne({ _id: ano, deleted: false }),
    ])
    if (!cicloOk) return res.status(400).json({ message: 'Ciclo inválido.' })
    if (!anoOk) return res.status(400).json({ message: 'Ano inválido.' })

    const cat = await PnabDocCategory.create({
      ciclo,
      ano,
      titulo: String(titulo).trim(),
      subtitulo: subtitulo || '',
      descricao: descricao || '',
      iconeUrl: iconeUrl || '',
      corAccent: corAccent || '',
      ordem: Number(ordem) || 0,
      publicado: !!publicado,
      autor: pnabUserName(req.user),
    })
    await logPnabAudit(req, 'CREATE', 'PnabDocCategory', cat._id, `Criou categoria ${cat.titulo}`)
    res.status(201).json(cat)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Erro ao criar categoria.' })
  }
})

router.put('/categorias/:id', ...adminChain, async (req, res) => {
  try {
    const cat = await PnabDocCategory.findOne({ _id: req.params.id, deleted: false })
    if (!cat) return res.status(404).json({ message: 'Categoria não encontrada.' })
    const fields = ['titulo', 'subtitulo', 'descricao', 'iconeUrl', 'corAccent', 'publicado']
    for (const f of fields) {
      if (req.body[f] !== undefined) cat[f] = req.body[f]
    }
    if (req.body.ordem !== undefined) cat.ordem = Number(req.body.ordem) || 0
    cat.dataAtualizacao = Date.now()
    await cat.save()
    await logPnabAudit(req, 'UPDATE', 'PnabDocCategory', cat._id, `Atualizou categoria ${cat.titulo}`)
    res.json(cat)
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar categoria.' })
  }
})

router.delete('/categorias/:id', ...adminChain, async (req, res) => {
  try {
    const cat = await PnabDocCategory.findOne({ _id: req.params.id, deleted: false })
    if (!cat) return res.status(404).json({ message: 'Categoria não encontrada.' })
    cat.deleted = true
    cat.dataAtualizacao = Date.now()
    await cat.save()
    await logPnabAudit(req, 'DELETE', 'PnabDocCategory', cat._id, `Moveu categoria ${cat.titulo} para lixeira`)
    res.json({ message: 'Categoria movida para a lixeira.' })
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir categoria.' })
  }
})

router.post('/ciclos/:cicloId/anos/:anoId/seed-categorias', ...adminChain, async (req, res) => {
  try {
    const ciclo = await PnabCycle.findOne({ _id: req.params.cicloId, deleted: false })
    const ano = await PnabYear.findOne({ _id: req.params.anoId, deleted: false })
    if (!ciclo || !ano) return res.status(404).json({ message: 'Ciclo ou ano não encontrado.' })

    const existing = await PnabDocCategory.countDocuments({
      ciclo: ciclo._id,
      ano: ano._id,
      deleted: false,
    })
    if (existing > 0) {
      const list = await PnabDocCategory.find({ ciclo: ciclo._id, ano: ano._id, deleted: false }).sort({
        ordem: 1,
      })
      return res.json({ message: 'Ano já possui categorias.', categorias: list })
    }

    const created = []
    for (const item of DEFAULT_DOC_CATEGORIES) {
      created.push(
        await PnabDocCategory.create({
          ciclo: ciclo._id,
          ano: ano._id,
          ...item,
          publicado: false,
          autor: pnabUserName(req.user),
        })
      )
    }
    await logPnabAudit(
      req,
      'CREATE',
      'PnabDocCategory',
      ano._id,
      `Seed de categorias no ano ${ano.nome} / ciclo ${ciclo.nome}`
    )
    res.status(201).json({ message: 'Categorias padrão criadas.', categorias: created })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Erro ao gerar categorias.' })
  }
})

// 1. ANOS (EXERCÍCIOS) ENDPOINTS — legado; preferir /ciclos/:id/anos
// -------------------------------------------------------------------------
router.get('/anos', async (req, res) => {
  try {
    const query = { deleted: false }
    if (req.query.ciclo) query.ciclo = req.query.ciclo
    const list = await PnabYear.find(query).sort({ ordem: 1, nome: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar anos.' });
  }
});

router.post('/anos', ...adminChain, async (req, res) => {
  try {
    const { nome, descricao, bannerUrl, imagemUrl, status, ordem, ciclo } = req.body;
    if (!nome) return res.status(400).json({ message: 'Nome é obrigatório.' });

    const exists = await PnabYear.findOne({ nome, deleted: false });
    if (exists) return res.status(400).json({ message: 'Exercício já cadastrado.' });

    const newYear = new PnabYear({ nome, descricao, bannerUrl, imagemUrl, status, ordem, ciclo: ciclo || undefined });
    await newYear.save();

    await logPnabAudit(req, 'CREATE', 'PnabYear', newYear._id, `Criou o exercício ${nome}`);
    res.status(201).json(newYear);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao cadastrar ano.' });
  }
});

router.put('/anos/:id', ...adminChain, async (req, res) => {
  try {
    const updated = await PnabYear.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Ano não encontrado.' });

    await logPnabAudit(req, 'UPDATE', 'PnabYear', updated._id, `Atualizou o exercício ${updated.nome}`);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar ano.' });
  }
});

router.delete('/anos/:id', ...adminChain, async (req, res) => {
  try {
    const item = await PnabYear.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Ano não encontrado.' });
    
    item.deleted = true;
    await item.save();

    await logPnabAudit(req, 'DELETE', 'PnabYear', item._id, `Moveu para lixeira o exercício ${item.nome}`);
    res.json({ message: 'Exercício movido para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir ano.' });
  }
});

// -------------------------------------------------------------------------
// 2. EDITAIS ENDPOINTS
// -------------------------------------------------------------------------
router.get('/editais', optionalCulturaAuth, async (req, res) => {
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

    const isStaff = isPnabStaff(req);

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

router.get('/editais/:id', async (req, res) => {
  try {
    const edital = await PnabEdital.findById(req.params.id).populate('ano');
    if (!edital || edital.deleted) return res.status(404).json({ message: 'Edital não encontrado.' });
    res.json(edital);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao detalhar edital.' });
  }
});

router.post('/editais', ...adminChain, pnabUpload.any(), async (req, res) => {
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
      autor: pnabUserName(req.user)
    });

    await edital.save();
    await logPnabAudit(req, 'CREATE', 'PnabEdital', edital._id, `Criou o edital ${titulo}`);
    res.status(201).json(edital);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao criar edital.' });
  }
});

router.put('/editais/:id', ...adminChain, pnabUpload.any(), async (req, res) => {
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

    await logPnabAudit(req, 'UPDATE', 'PnabEdital', edital._id, `Atualizou o edital ${edital.titulo}`);
    res.json(edital);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao atualizar edital.' });
  }
});

router.delete('/editais/:id', ...adminChain, async (req, res) => {
  try {
    const edital = await PnabEdital.findById(req.params.id);
    if (!edital) return res.status(404).json({ message: 'Edital não encontrado.' });

    edital.deleted = true;
    await edital.save();

    await logPnabAudit(req, 'DELETE', 'PnabEdital', edital._id, `Moveu edital para a lixeira: ${edital.titulo}`);
    res.json({ message: 'Edital movido para a lixeira com sucesso.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir edital.' });
  }
});

router.post('/editais/:id/duplicate', ...adminChain, async (req, res) => {
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
      autor: pnabUserName(req.user)
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
        autor: pnabUserName(req.user)
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
        autor: pnabUserName(req.user)
      });
      await newCron.save();
    }

    await logPnabAudit(req, 'DUPLICATE', 'PnabEdital', newEdital._id, `Duplicou o edital ${edital.titulo} para ${newEdital.titulo}`);
    res.status(201).json(newEdital);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao duplicar edital.' });
  }
});

// -------------------------------------------------------------------------
// 3. DOCUMENTOS ENDPOINTS
// -------------------------------------------------------------------------
router.get('/documentos', async (req, res) => {
  try {
    const { edital, cicloArea, categoria, busca } = req.query;
    let query = { deleted: false };
    if (edital) query.edital = edital;
    if (cicloArea) query.cicloArea = cicloArea;
    if (categoria) query.categoria = categoria;
    if (busca && String(busca).trim()) {
      const q = String(busca).trim()
      query.$or = [
        { titulo: { $regex: q, $options: 'i' } },
        { descricao: { $regex: q, $options: 'i' } },
        { nomeOriginal: { $regex: q, $options: 'i' } },
        { tipo: { $regex: q, $options: 'i' } },
      ]
    }

    const list = await PnabDocument.find(query).sort({ dataCriacao: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar documentos.' });
  }
});

function normalizeDocArquivoUrl(raw) {
  if (raw == null) return ''
  const url = String(raw).trim()
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url
  return ''
}

function nomeFromArquivoUrl(url) {
  try {
    const pathPart = url.startsWith('http') ? new URL(url).pathname : url
    const base = decodeURIComponent(pathPart.split('/').filter(Boolean).pop() || '')
    return base || ''
  } catch (e) {
    return ''
  }
}

router.post('/documentos', ...adminChain, pnabUpload.any(), async (req, res) => {
  try {
    const { edital, cicloArea, categoria, titulo, descricao, tipo, versao } = req.body;
    if (!titulo) return res.status(400).json({ message: 'Título é obrigatório.' });
    if (!edital && !cicloArea && !categoria) {
      return res.status(400).json({ message: 'Informe edital, cicloArea ou categoria.' });
    }

    const file = req.files && req.files[0];
    const linkUrl = normalizeDocArquivoUrl(req.body.arquivoUrl)
    if (!file && !linkUrl) {
      return res.status(400).json({
        message: 'Informe o arquivo (upload) ou o link do arquivo (arquivoUrl).',
      })
    }

    let folderLabel = 'geral';
    let auditLabel = ''

    if (categoria) {
      const cat = await PnabDocCategory.findById(categoria).populate('ciclo').populate('ano')
      if (!cat || cat.deleted) return res.status(400).json({ message: 'Categoria inválida.' })
      req.body.anoName = cat.ano?.nome || cat.ciclo?.nome || 'categoria'
      req.body.editalTitle = cat.titulo
      folderLabel = cat.titulo
      auditLabel = `${cat.titulo} (${cat.ano?.nome || ''})`
    } else if (cicloArea) {
      const area = await PnabCycleArea.findById(cicloArea).populate('ciclo')
      if (!area || area.deleted) return res.status(400).json({ message: 'Área de ciclo inválida.' })
      req.body.anoName = area.ciclo?.nome || `ciclo-${area.ciclo?.codigo || 'x'}`
      req.body.editalTitle = area.titulo
      folderLabel = area.titulo
      auditLabel = `${area.titulo} (${area.ciclo?.nome || 'ciclo'})`
    } else {
      const edObj = await PnabEdital.findById(edital).populate('ano');
      if (!edObj) return res.status(400).json({ message: 'Edital inválido.' });
      req.body.anoName = edObj.ano.nome;
      req.body.editalTitle = edObj.titulo;
      folderLabel = edObj.titulo
      auditLabel = edObj.titulo
    }

    let fileUrl = linkUrl
    let nomeOriginal = nomeFromArquivoUrl(linkUrl)
    if (file) {
      fileUrl = await organizeAndIndexFile(file, req, 'PDF')
      nomeOriginal = file.originalname || nomeOriginal || ''
    }

    const doc = new PnabDocument({
      edital: edital || undefined,
      cicloArea: cicloArea || undefined,
      categoria: categoria || undefined,
      titulo,
      descricao,
      tipo: tipo || 'Anexo',
      versao: versao || '1.0',
      arquivoUrl: fileUrl,
      nomeOriginal,
      autor: pnabUserName(req.user)
    });

    await doc.save();
    await logPnabAudit(
      req,
      'CREATE',
      'PnabDocument',
      doc._id,
      `Cadastrou documento ${titulo} em ${auditLabel || folderLabel}${file ? ' (upload)' : ' (link)'}`
    );
    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Erro ao cadastrar documento.' });
  }
});

router.put('/documentos/:id', ...adminChain, pnabUpload.any(), async (req, res) => {
  try {
    const doc = await PnabDocument.findById(req.params.id)
      .populate({ path: 'edital', populate: { path: 'ano' } })
      .populate({ path: 'cicloArea', populate: { path: 'ciclo' } })
      .populate({ path: 'categoria', populate: [{ path: 'ciclo' }, { path: 'ano' }] })
    if (!doc) return res.status(404).json({ message: 'Documento não encontrado.' });

    const { titulo, descricao, tipo, versao, descricaoAlteracao } = req.body;
    if (titulo) doc.titulo = titulo;
    if (descricao !== undefined) doc.descricao = descricao;
    if (tipo) doc.tipo = tipo;

    const file = req.files && req.files[0];
    const linkUrl = normalizeDocArquivoUrl(req.body.arquivoUrl);
    const replacingFile = !!(file || linkUrl);

    if (replacingFile) {
      doc.historicoVersoes.push({
        versao: doc.versao,
        arquivoUrl: doc.arquivoUrl,
        dataUpload: doc.dataAtualizacao || doc.dataCriacao,
        publicadoPor: doc.autor,
        descricaoAlteracao: descricaoAlteracao || (file ? 'Atualização de arquivo' : 'Atualização de link'),
      });

      if (doc.categoria) {
        req.body.anoName = doc.categoria.ano?.nome || doc.categoria.ciclo?.nome || 'categoria'
        req.body.editalTitle = doc.categoria.titulo
      } else if (doc.cicloArea) {
        req.body.anoName = doc.cicloArea.ciclo?.nome || 'ciclo'
        req.body.editalTitle = doc.cicloArea.titulo
      } else if (doc.edital) {
        req.body.anoName = doc.edital.ano.nome;
        req.body.editalTitle = doc.edital.titulo;
      } else {
        req.body.anoName = 'geral'
        req.body.editalTitle = doc.titulo
      }

      if (file) {
        doc.arquivoUrl = await organizeAndIndexFile(file, req, 'PDF');
        doc.nomeOriginal = file.originalname || doc.nomeOriginal || '';
      } else {
        doc.arquivoUrl = linkUrl;
        doc.nomeOriginal = nomeFromArquivoUrl(linkUrl) || doc.nomeOriginal || '';
      }
      doc.versao = versao || (parseFloat(doc.versao) + 1.0).toFixed(1).toString();
      doc.autor = pnabUserName(req.user);
    } else if (versao) {
      doc.versao = versao;
    }

    doc.dataAtualizacao = Date.now();
    await doc.save();

    await logPnabAudit(req, 'UPDATE', 'PnabDocument', doc._id, `Atualizou o documento ${doc.titulo}`);
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao editar documento.' });
  }
});

router.delete('/documentos/:id', ...adminChain, async (req, res) => {
  try {
    const doc = await PnabDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Documento não encontrado.' });

    doc.deleted = true;
    await doc.save();

    await logPnabAudit(req, 'DELETE', 'PnabDocument', doc._id, `Moveu documento para a lixeira: ${doc.titulo}`);
    res.json({ message: 'Documento movido para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir documento.' });
  }
});

// Restore previous version of a document
router.post('/documentos/:id/restore-version', ...adminChain, async (req, res) => {
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
    doc.autor = pnabUserName(req.user);
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
    await logPnabAudit(req, 'RESTORE', 'PnabDocument', doc._id, `Restaurou a versão ${doc.versao} do documento ${doc.titulo}`);
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao restaurar versão do documento.' });
  }
});

// Counter of downloads
router.post('/documentos/:id/download', async (req, res) => {
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
router.get('/comunicados', optionalCulturaAuth, async (req, res) => {
  try {
    const { edital } = req.query;
    let query = { deleted: false };
    if (edital) query.edital = edital;

    // Citizens only see published and within period
    const isStaff = isPnabStaff(req);

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

router.post('/comunicados', ...adminChain, pnabUpload.any(), async (req, res) => {
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
      autor: pnabUserName(req.user)
    });

    await item.save();
    await logPnabAudit(req, 'CREATE', 'PnabComunicado', item._id, `Criou comunicado ${titulo}`);
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar comunicado.' });
  }
});

router.put('/comunicados/:id', ...adminChain, pnabUpload.any(), async (req, res) => {
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

    await logPnabAudit(req, 'UPDATE', 'PnabComunicado', item._id, `Atualizou comunicado ${item.titulo}`);
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao editar comunicado.' });
  }
});

router.delete('/comunicados/:id', ...adminChain, async (req, res) => {
  try {
    const item = await PnabComunicado.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Comunicado não encontrado.' });
    
    item.deleted = true;
    await item.save();

    await logPnabAudit(req, 'DELETE', 'PnabComunicado', item._id, `Moveu comunicado para a lixeira: ${item.titulo}`);
    res.json({ message: 'Comunicado movido para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir comunicado.' });
  }
});

// -------------------------------------------------------------------------
// 5. CRONOGRAMAS ENDPOINTS
// -------------------------------------------------------------------------
router.get('/cronogramas', async (req, res) => {
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

router.post('/cronogramas', ...adminChain, async (req, res) => {
  try {
    const { edital, data, evento, descricao, status, ordem } = req.body;
    if (!edital || !data || !evento) return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });

    const item = new PnabCronograma({
      edital, data, evento, descricao, status, ordem: Number(ordem) || 0, autor: pnabUserName(req.user)
    });
    await item.save();

    await logPnabAudit(req, 'CREATE', 'PnabCronograma', item._id, `Criou item de cronograma: ${evento}`);
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar cronograma.' });
  }
});

router.put('/cronogramas/:id', ...adminChain, async (req, res) => {
  try {
    const item = await PnabCronograma.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Cronograma não encontrado.' });

    await logPnabAudit(req, 'UPDATE', 'PnabCronograma', item._id, `Atualizou item de cronograma: ${item.evento}`);
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao editar cronograma.' });
  }
});

router.delete('/cronogramas/:id', ...adminChain, async (req, res) => {
  try {
    const item = await PnabCronograma.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item não encontrado.' });
    
    item.deleted = true;
    await item.save();

    await logPnabAudit(req, 'DELETE', 'PnabCronograma', item._id, `Moveu item de cronograma para a lixeira: ${item.evento}`);
    res.json({ message: 'Item removido do cronograma.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir cronograma.' });
  }
});

// -------------------------------------------------------------------------
// 6. FAQ ENDPOINTS
// -------------------------------------------------------------------------
router.get('/faq', async (req, res) => {
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

router.post('/faq', ...adminChain, async (req, res) => {
  try {
    const { edital, pergunta, resposta, ordem, categoria } = req.body;
    if (!edital || !pergunta || !resposta) return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });

    const item = new PnabFaq({ edital, pergunta, resposta, ordem: Number(ordem) || 0, categoria, autor: pnabUserName(req.user) });
    await item.save();

    await logPnabAudit(req, 'CREATE', 'PnabFaq', item._id, `Criou FAQ: ${pergunta}`);
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao criar FAQ.' });
  }
});

router.put('/faq/:id', ...adminChain, async (req, res) => {
  try {
    const item = await PnabFaq.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'FAQ não encontrado.' });

    await logPnabAudit(req, 'UPDATE', 'PnabFaq', item._id, `Atualizou FAQ: ${item.pergunta}`);
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao editar FAQ.' });
  }
});

router.delete('/faq/:id', ...adminChain, async (req, res) => {
  try {
    const item = await PnabFaq.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'FAQ não encontrado.' });

    item.deleted = true;
    await item.save();

    await logPnabAudit(req, 'DELETE', 'PnabFaq', item._id, `Moveu FAQ para a lixeira: ${item.pergunta}`);
    res.json({ message: 'FAQ movido para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir FAQ.' });
  }
});

// -------------------------------------------------------------------------
// 7. LEGISLAÇÃO ENDPOINTS
// -------------------------------------------------------------------------
router.get('/legislacao', async (req, res) => {
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

router.post('/legislacao', ...adminChain, pnabUpload.any(), async (req, res) => {
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
      autor: pnabUserName(req.user)
    });

    await item.save();
    await logPnabAudit(req, 'CREATE', 'PnabLegislacao', item._id, `Criou legislação ${titulo}`);
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao criar legislação.' });
  }
});

router.put('/legislacao/:id', ...adminChain, pnabUpload.any(), async (req, res) => {
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

    await logPnabAudit(req, 'UPDATE', 'PnabLegislacao', item._id, `Atualizou legislação ${item.titulo}`);
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao editar legislação.' });
  }
});

router.delete('/legislacao/:id', ...adminChain, async (req, res) => {
  try {
    const item = await PnabLegislacao.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Legislação não encontrada.' });

    item.deleted = true;
    await item.save();

    await logPnabAudit(req, 'DELETE', 'PnabLegislacao', item._id, `Moveu legislação para a lixeira: ${item.titulo}`);
    res.json({ message: 'Legislação movida para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir legislação.' });
  }
});

// -------------------------------------------------------------------------
// 8. NOTÍCIAS ENDPOINTS
// -------------------------------------------------------------------------
router.get('/noticias', optionalCulturaAuth, async (req, res) => {
  try {
    const { edital } = req.query;
    let query = { deleted: false };
    if (edital) query.edital = edital;

    // Citizens only see published
    const isStaff = isPnabStaff(req);

    if (!isStaff) {
      query.statusWorkflow = 'Publicado';
    }

    const list = await PnabNoticia.find(query).sort({ dataCriacao: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar notícias.' });
  }
});

router.post('/noticias', ...adminChain, pnabUpload.any(), async (req, res) => {
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
      autor: pnabUserName(req.user)
    });

    await item.save();
    await logPnabAudit(req, 'CREATE', 'PnabNoticia', item._id, `Criou notícia ${titulo}`);
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao criar notícia.' });
  }
});

router.put('/noticias/:id', ...adminChain, pnabUpload.any(), async (req, res) => {
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

    await logPnabAudit(req, 'UPDATE', 'PnabNoticia', item._id, `Atualizou notícia ${item.titulo}`);
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao editar notícia.' });
  }
});

router.delete('/noticias/:id', ...adminChain, async (req, res) => {
  try {
    const item = await PnabNoticia.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Notícia não encontrada.' });

    item.deleted = true;
    await item.save();

    await logPnabAudit(req, 'DELETE', 'PnabNoticia', item._id, `Moveu notícia para a lixeira: ${item.titulo}`);
    res.json({ message: 'Notícia movida para a lixeira.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir notícia.' });
  }
});

// -------------------------------------------------------------------------
// 9. BIBLIOTECA DE MÍDIAS (MEDIA LIBRARY) ENDPOINTS
// -------------------------------------------------------------------------
router.get('/midias', ...adminChain, async (req, res) => {
  try {
    const list = await PnabMedia.find({ deleted: false }).sort({ dataCriacao: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao listar mídias.' });
  }
});

router.post('/midias', ...adminChain, pnabUpload.single('arquivo'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });

    const url = await organizeAndIndexFile(file, req, req.body.categoria);
    const media = await PnabMedia.findOne({ url });

    await logPnabAudit(req, 'UPLOAD', 'PnabMedia', media._id, `Enviou arquivo ${file.originalname} para biblioteca`);
    res.status(201).json(media);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro ao processar mídia.' });
  }
});

router.delete('/midias/:id', ...adminChain, async (req, res) => {
  try {
    const item = await PnabMedia.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Arquivo não encontrado.' });

    item.deleted = true;
    await item.save();

    // Note: we soft-delete from the database index so it doesn't appear in the reusable library list.
    await logPnabAudit(req, 'DELETE', 'PnabMedia', item._id, `Removeu arquivo da biblioteca indexada: ${item.originalName}`);
    res.json({ message: 'Mídia removida da biblioteca.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir mídia.' });
  }
});

// -------------------------------------------------------------------------
// 10. LIXEIRA (RECYCLE BIN) ENDPOINTS
// -------------------------------------------------------------------------
router.get('/lixeira', ...adminChain, async (req, res) => {
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

router.post('/lixeira/:id/restore', ...adminChain, async (req, res) => {
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

    await logPnabAudit(req, 'RESTORE', tipo, item._id, `Restaurou o item ${item.titulo || item.nome || item.evento || item.pergunta}`);
    res.json({ message: 'Item restaurado com sucesso!' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao restaurar item.' });
  }
});

// -------------------------------------------------------------------------
// 11. AUDITORIA ENDPOINTS
// -------------------------------------------------------------------------
router.get('/auditoria', ...adminChain, async (req, res) => {
  try {
    const list = await PnabAudit.find().sort({ timestamp: -1 }).limit(100);
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao listar auditoria.' });
  }
});


module.exports = router
