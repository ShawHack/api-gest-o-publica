const mongoose = require('../db/conn')
const OrdemServico = require('../models/OrdemServico')
const { TIPOS_OS, STATUS_OS, SECRETARIAS } = require('../helpers/ordem-servico-constants')

function parseDate(value) {
  if (!value) return undefined
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const raw = String(value).trim()
  if (!raw) return undefined
  const day = raw.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return new Date(`${day}T12:00:00.000Z`)
  }
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function userId(user) {
  return user?._id || user?.id
}

function composeAddressTexto(endereco = {}) {
  if (endereco.texto) return endereco.texto
  const parts = [endereco.rua, endereco.numero].filter(Boolean)
  const left = parts.join(', ')
  if (left && endereco.bairro) return `${left} - ${endereco.bairro}`
  return left || endereco.bairro || ''
}

function pickPayload(body = {}) {
  const enderecoIn = body.endereco && typeof body.endereco === 'object' ? body.endereco : {}
  const endereco = {
    cep: String(enderecoIn.cep || body.cep || '').replace(/\D/g, '').slice(0, 8),
    rua: String(enderecoIn.rua || body.rua || ''),
    numero: String(enderecoIn.numero || body.numero || ''),
    bairro: String(enderecoIn.bairro || body.bairro || ''),
    complemento: String(enderecoIn.complemento || ''),
    texto: String(enderecoIn.texto || body.enderecoColeta || body.enderecoUpa || (typeof body.endereco === 'string' ? body.endereco : '') || ''),
  }
  if (!endereco.texto) endereco.texto = composeAddressTexto(endereco)

  const tipoServicoDetalhe = body.tipoServicoDetalhe || body.tipoServico || ''

  return {
    tipo: body.tipo,
    status: body.status,
    funcionarioResponsavel: String(body.funcionarioResponsavel || '').trim(),
    dataTrabalho: parseDate(body.dataTrabalho),
    dataSla: parseDate(body.dataSla),
    observacoes: String(body.observacoes || ''),
    ocorrencia: String(body.ocorrencia || ''),
    nomeCidadao: String(body.nomeCidadao || ''),
    nomeSolicitante: String(body.nomeSolicitante || ''),
    nomePropriedade: String(body.nomePropriedade || ''),
    endereco,
    tipoMaterial: String(body.tipoMaterial || ''),
    porteAnimal: String(body.porteAnimal || ''),
    tipoServicoDetalhe: String(tipoServicoDetalhe),
    secretaria: body.secretaria || '',
    departamento: String(body.departamento || ''),
  }
}

function applyStatusDates(doc, nextStatus) {
  const now = new Date()
  if (nextStatus === 'Andamento' && !doc.dataEmAndamento) {
    doc.dataEmAndamento = now
  }
  if (nextStatus === 'Concluído' && !doc.dataConclusao) {
    doc.dataConclusao = now
  }
}

async function nextNumero() {
  const year = new Date().getFullYear()
  const prefix = `OS-${year}-`
  const last = await OrdemServico.findOne({ numero: new RegExp(`^${prefix}`) })
    .sort({ numero: -1 })
    .select('numero')
    .lean()
  let seq = 1
  if (last?.numero) {
    const n = parseInt(String(last.numero).split('-').pop(), 10)
    if (Number.isFinite(n)) seq = n + 1
  }
  return `${prefix}${String(seq).padStart(6, '0')}`
}

module.exports = class OrdemServicoController {
  static async meta(_req, res) {
    return res.status(200).json({ tipos: TIPOS_OS, status: STATUS_OS, secretarias: SECRETARIAS })
  }

  static async list(req, res) {
    try {
      const { tipo, status, dataInicio, dataFim, funcionario, incluirConcluidos } = req.query
      const filter = {}

      if (tipo) filter.tipo = tipo
      if (funcionario) {
        filter.funcionarioResponsavel = { $regex: String(funcionario).trim(), $options: 'i' }
      }

      if (status && status !== 'all') {
        filter.status = status
      } else if (String(incluirConcluidos) !== 'true' && status !== 'all') {
        filter.status = { $ne: 'Concluído' }
      }

      if (dataInicio || dataFim) {
        filter.createdAt = {}
        if (dataInicio) filter.createdAt.$gte = parseDate(dataInicio)
        if (dataFim) {
          const end = parseDate(dataFim)
          if (end) {
            end.setUTCHours(23, 59, 59, 999)
            filter.createdAt.$lte = end
          }
        }
      }

      const ordens = await OrdemServico.find(filter).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ ordens })
    } catch (error) {
      console.error('[ordens-servico.list]', error)
      return res.status(500).json({ message: 'Erro ao listar ordens de serviço.' })
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(422).json({ message: 'ID inválido.' })
      }
      const ordem = await OrdemServico.findById(id).lean()
      if (!ordem) return res.status(404).json({ message: 'Ordem de serviço não encontrada.' })
      return res.status(200).json({ ordem })
    } catch (error) {
      console.error('[ordens-servico.getById]', error)
      return res.status(500).json({ message: 'Erro ao buscar ordem de serviço.' })
    }
  }

  static async create(req, res) {
    try {
      const payload = pickPayload(req.body)
      if (!TIPOS_OS.includes(payload.tipo)) {
        return res.status(422).json({ message: 'Tipo de ordem de serviço inválido.' })
      }
      if (!payload.funcionarioResponsavel) {
        return res.status(422).json({ message: 'O funcionário responsável é obrigatório.' })
      }
      if (payload.status && !STATUS_OS.includes(payload.status)) {
        return res.status(422).json({ message: 'Status inválido.' })
      }
      if (payload.secretaria && !SECRETARIAS.includes(payload.secretaria)) {
        return res.status(422).json({ message: 'Secretaria inválida.' })
      }

      const doc = new OrdemServico({
        ...payload,
        status: payload.status || 'Pendente',
        numero: await nextNumero(),
        criadoPor: userId(req.user),
        atualizadoPor: userId(req.user),
      })
      applyStatusDates(doc, doc.status)
      const saved = await doc.save()
      return res.status(201).json({
        message: 'Ordem de serviço cadastrada com sucesso.',
        ordem: saved,
      })
    } catch (error) {
      console.error('[ordens-servico.create]', error)
      return res.status(500).json({ message: error.message || 'Erro ao cadastrar ordem de serviço.' })
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(422).json({ message: 'ID inválido.' })
      }
      const doc = await OrdemServico.findById(id)
      if (!doc) return res.status(404).json({ message: 'Ordem de serviço não encontrada.' })

      const payload = pickPayload({ ...doc.toObject(), ...req.body, tipo: doc.tipo })
      if (!payload.funcionarioResponsavel) {
        return res.status(422).json({ message: 'O funcionário responsável é obrigatório.' })
      }
      if (payload.status && !STATUS_OS.includes(payload.status)) {
        return res.status(422).json({ message: 'Status inválido.' })
      }
      if (payload.secretaria && !SECRETARIAS.includes(payload.secretaria)) {
        return res.status(422).json({ message: 'Secretaria inválida.' })
      }

      const nextStatus = payload.status || doc.status
      doc.funcionarioResponsavel = payload.funcionarioResponsavel
      doc.dataTrabalho = payload.dataTrabalho
      doc.dataSla = payload.dataSla
      doc.observacoes = payload.observacoes
      doc.ocorrencia = payload.ocorrencia
      doc.nomeCidadao = payload.nomeCidadao
      doc.nomeSolicitante = payload.nomeSolicitante
      doc.nomePropriedade = payload.nomePropriedade
      doc.endereco = payload.endereco
      doc.tipoMaterial = payload.tipoMaterial
      doc.porteAnimal = payload.porteAnimal
      doc.tipoServicoDetalhe = payload.tipoServicoDetalhe
      doc.secretaria = payload.secretaria || ''
      doc.departamento = payload.departamento
      applyStatusDates(doc, nextStatus)
      doc.status = nextStatus
      doc.atualizadoPor = userId(req.user)
      await doc.save()

      return res.status(200).json({
        message: 'Ordem de serviço atualizada com sucesso.',
        ordem: doc,
      })
    } catch (error) {
      console.error('[ordens-servico.update]', error)
      return res.status(500).json({ message: 'Erro ao atualizar ordem de serviço.' })
    }
  }

  static async updateStatus(req, res) {
    try {
      const { id } = req.params
      const { status } = req.body || {}
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(422).json({ message: 'ID inválido.' })
      }
      if (!STATUS_OS.includes(status)) {
        return res.status(422).json({ message: 'Status inválido.' })
      }
      const doc = await OrdemServico.findById(id)
      if (!doc) return res.status(404).json({ message: 'Ordem de serviço não encontrada.' })

      applyStatusDates(doc, status)
      doc.status = status
      doc.atualizadoPor = userId(req.user)
      await doc.save()
      return res.status(200).json({
        message: 'Status atualizado com sucesso.',
        ordem: doc,
      })
    } catch (error) {
      console.error('[ordens-servico.updateStatus]', error)
      return res.status(500).json({ message: 'Erro ao atualizar status.' })
    }
  }
}
