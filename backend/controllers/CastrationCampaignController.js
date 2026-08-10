const CastrationCampaign = require('../models/CastrationCampaign')
const getToken = require('../helpers/get-token')
const getUserByToken = require('../helpers/get-user-by-token')
const { recordAudit } = require('../helpers/audit-log')
const {
  toPublicCampaign,
  syncLegacyClosedFlag,
  getLegacyClosedFlag,
  openCampaign,
  closeCampaign,
  getCampaignStats,
  resolveCampaignForPublicStatus,
} = require('../helpers/castration-campaign-service')

const { isCastrationStaffUser } = require('../helpers/castration-auth')

function isSamaUser(user) {
  return isCastrationStaffUser(user)
}

function parseCampaignBody(body = {}) {
  const maxAnimals = parseInt(body.maxAnimals, 10)
  return {
    name: String(body.name || '').trim(),
    year: parseInt(body.year, 10) || new Date().getFullYear(),
    opensAt: body.opensAt ? new Date(body.opensAt) : undefined,
    closesAt: body.closesAt ? new Date(body.closesAt) : undefined,
    surgeryDate: body.surgeryDate ? new Date(body.surgeryDate) : undefined,
    location: String(body.location || '').trim(),
    notes: String(body.notes || '').trim(),
    maxAnimals: Number.isFinite(maxAnimals) && maxAnimals > 0 ? maxAnimals : undefined,
  }
}

module.exports = class CastrationCampaignController {
  /** GET público — campanha ativa + contador de vagas */
  static async getActive(req, res) {
    try {
      const { campaign, legacyClosed } = await resolveCampaignForPublicStatus()
      const publicCampaign = toPublicCampaign(campaign)
      const accepts =
        !legacyClosed && publicCampaign && publicCampaign.status === 'open' && publicCampaign.slotsAvailable > 0
      return res.status(200).json({
        campaign: publicCampaign,
        legacyClosed,
        acceptsRequests: accepts,
      })
    } catch (error) {
      console.error('[CastrationCampaign.getActive]', error)
      return res.status(500).json({ message: 'Erro ao buscar campanha de castração.' })
    }
  }

  static async list(req, res) {
    try {
      const { status, year } = req.query
      const filter = {}
      if (status) filter.status = status
      if (year) filter.year = parseInt(year, 10)
      const items = await CastrationCampaign.find(filter).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ items: items.map(toPublicCampaign) })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar campanhas.' })
    }
  }

  static async create(req, res) {
    try {
      const data = parseCampaignBody(req.body)
      if (!data.name) return res.status(422).json({ message: 'Nome da campanha é obrigatório.' })
      if (!data.maxAnimals) return res.status(422).json({ message: 'maxAnimals deve ser maior que zero.' })

      const token = getToken(req)
      const user = await getUserByToken(token)

      const campaign = await CastrationCampaign.create({
        ...data,
        status: 'draft',
        reservedAnimals: 0,
        createdBy: user?._id,
      })

      void recordAudit(req, {
        action: 'castration_campaign.create',
        resourceType: 'castration_campaign',
        resourceId: campaign._id,
        module: 'sama',
        eventType: 'CREATE',
        metadata: { name: campaign.name, maxAnimals: campaign.maxAnimals },
      })

      return res.status(201).json({ campaign: toPublicCampaign(campaign) })
    } catch (error) {
      console.error('[CastrationCampaign.create]', error)
      return res.status(500).json({ message: 'Erro ao criar campanha.' })
    }
  }

  static async update(req, res) {
    try {
      const campaign = await CastrationCampaign.findById(req.params.id)
      if (!campaign) return res.status(404).json({ message: 'Campanha não encontrada.' })

      const data = parseCampaignBody(req.body)
      if (data.name) campaign.name = data.name
      if (data.year) campaign.year = data.year
      if (data.opensAt !== undefined) campaign.opensAt = data.opensAt
      if (data.closesAt !== undefined) campaign.closesAt = data.closesAt
      if (data.surgeryDate !== undefined) campaign.surgeryDate = data.surgeryDate
      if (data.location !== undefined) campaign.location = data.location
      if (data.notes !== undefined) campaign.notes = data.notes
      if (data.maxAnimals) {
        if (data.maxAnimals < campaign.reservedAnimals) {
          return res.status(422).json({ message: 'maxAnimals não pode ser menor que vagas já reservadas.' })
        }
        campaign.maxAnimals = data.maxAnimals
      }
      await campaign.save()

      void recordAudit(req, {
        action: 'castration_campaign.update',
        resourceType: 'castration_campaign',
        resourceId: campaign._id,
        module: 'sama',
        eventType: 'UPDATE',
      })

      return res.status(200).json({ campaign: toPublicCampaign(campaign) })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao atualizar campanha.' })
    }
  }

  static async open(req, res) {
    try {
      const campaign = await CastrationCampaign.findById(req.params.id)
      if (!campaign) return res.status(404).json({ message: 'Campanha não encontrada.' })

      await CastrationCampaign.updateMany(
        { _id: { $ne: campaign._id }, status: { $in: ['open', 'full'] } },
        { status: 'closed', closedAt: new Date(), closedReason: 'manual' }
      )

      if (campaign.reservedAnimals >= campaign.maxAnimals) {
        campaign.status = 'full'
        campaign.closedAt = new Date()
        campaign.closedReason = 'full'
        await campaign.save()
        await syncLegacyClosedFlag(true)
      } else {
        await openCampaign(campaign)
      }

      void recordAudit(req, {
        action: 'castration_campaign.open',
        resourceType: 'castration_campaign',
        resourceId: campaign._id,
        module: 'sama',
        eventType: 'UPDATE',
      })

      return res.status(200).json({ campaign: toPublicCampaign(campaign) })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao abrir campanha.' })
    }
  }

  static async close(req, res) {
    try {
      const campaign = await CastrationCampaign.findById(req.params.id)
      if (!campaign) return res.status(404).json({ message: 'Campanha não encontrada.' })
      await closeCampaign(campaign, 'manual')

      void recordAudit(req, {
        action: 'castration_campaign.close',
        resourceType: 'castration_campaign',
        resourceId: campaign._id,
        module: 'sama',
        eventType: 'UPDATE',
      })

      return res.status(200).json({ campaign: toPublicCampaign(campaign) })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao encerrar campanha.' })
    }
  }

  static async stats(req, res) {
    try {
      const stats = await getCampaignStats(req.params.id)
      if (!stats) return res.status(404).json({ message: 'Campanha não encontrada.' })
      return res.status(200).json(stats)
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao gerar estatísticas.' })
    }
  }

  static requireSama(req, res, next) {
    if (!isSamaUser(req.user)) {
      return res.status(403).json({ message: 'Acesso restrito à equipe SAMA.' })
    }
    return next()
  }
}
