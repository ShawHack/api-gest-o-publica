const SystemSetting = require('../models/SystemSetting')
const CastrationCampaign = require('../models/CastrationCampaign')

const CASTRATION_KEY = 'castration_closed'

function slotsAvailable(campaign) {
  if (!campaign) return 0
  return Math.max(0, (campaign.maxAnimals || 0) - (campaign.reservedAnimals || 0))
}

function campaignAcceptsRequests(campaign) {
  return campaign && campaign.status === 'open' && slotsAvailable(campaign) > 0
}

function toPublicCampaign(campaign) {
  if (!campaign) return null
  const available = slotsAvailable(campaign)
  return {
    id: campaign._id,
    name: campaign.name,
    year: campaign.year,
    status: campaign.status,
    opensAt: campaign.opensAt,
    closesAt: campaign.closesAt,
    surgeryDate: campaign.surgeryDate,
    location: campaign.location,
    notes: campaign.notes,
    maxAnimals: campaign.maxAnimals,
    reservedAnimals: campaign.reservedAnimals,
    slotsAvailable: available,
    acceptsRequests: campaignAcceptsRequests(campaign),
  }
}

async function syncLegacyClosedFlag(closed) {
  await SystemSetting.findOneAndUpdate(
    { key: CASTRATION_KEY },
    { value: !!closed, description: 'Compat legado castração' },
    { upsert: true }
  )
}

async function getLegacyClosedFlag() {
  const row = await SystemSetting.findOne({ key: CASTRATION_KEY }).lean()
  return !!row?.value
}

async function getActiveCampaign() {
  return CastrationCampaign.findOne({ status: { $in: ['open', 'full'] } })
    .sort({ createdAt: -1 })
    .lean()
}

function defaultMaxAnimals() {
  const n = parseInt(process.env.CASTRATION_DEFAULT_MAX_ANIMALS || '100', 10)
  return Number.isFinite(n) && n > 0 ? n : 100
}

/** Abre campanha existente ou cria uma padrão quando o toggle legado é ligado para "aberto". */
async function syncCampaignFromLegacyToggle(closed, createdBy) {
  if (closed) {
    const active = await CastrationCampaign.findOne({ status: { $in: ['open', 'full'] } }).sort({
      createdAt: -1,
    })
    if (!active) return null
    active.status = 'closed'
    active.closedAt = new Date()
    active.closedReason = 'legacy_toggle'
    await active.save()
    return active
  }

  let active = await CastrationCampaign.findOne({ status: { $in: ['open', 'full'] } }).sort({
    createdAt: -1,
  })
  if (active) {
    if (active.reservedAnimals >= active.maxAnimals) {
      active.status = 'full'
    } else {
      active.status = 'open'
      active.closedAt = null
      active.closedReason = undefined
    }
    await active.save()
    await syncLegacyClosedFlag(false)
    return active
  }

  const draft = await CastrationCampaign.findOne({ status: 'draft' }).sort({ createdAt: -1 })
  if (draft) {
    return openCampaign(draft)
  }

  const year = new Date().getFullYear()
  const campaign = await CastrationCampaign.create({
    name: `Campanha de Castração ${year}`,
    year,
    status: 'open',
    maxAnimals: defaultMaxAnimals(),
    reservedAnimals: 0,
    createdBy: createdBy || undefined,
  })
  await syncLegacyClosedFlag(false)
  return campaign
}

/** Garante campanha ativa quando o legado está aberto (corrige estados inconsistentes). */
async function resolveCampaignForPublicStatus() {
  const legacyClosed = await getLegacyClosedFlag()
  if (legacyClosed) {
    return { campaign: await getActiveCampaign(), legacyClosed: true }
  }

  let campaign = await CastrationCampaign.findOne({ status: { $in: ['open', 'full'] } })
    .sort({ createdAt: -1 })
  if (!campaign) {
    campaign = await syncCampaignFromLegacyToggle(false)
  }
  return { campaign: campaign ? (campaign.toObject ? campaign.toObject() : campaign) : null, legacyClosed: false }
}

async function getOpenCampaignForRequests() {
  const campaign = await CastrationCampaign.findOne({ status: 'open' }).sort({ createdAt: -1 })
  if (!campaign || slotsAvailable(campaign) <= 0) return null
  const legacyClosed = await getLegacyClosedFlag()
  if (legacyClosed) return null
  return campaign
}

async function reserveCampaignSlots(campaignId, count) {
  const updated = await CastrationCampaign.findOneAndUpdate(
    {
      _id: campaignId,
      status: 'open',
      $expr: {
        $lte: [{ $add: ['$reservedAnimals', count] }, '$maxAnimals'],
      },
    },
    { $inc: { reservedAnimals: count } },
    { new: true }
  )
  if (!updated) return null

  if (updated.reservedAnimals >= updated.maxAnimals) {
    updated.status = 'full'
    updated.closedAt = new Date()
    updated.closedReason = 'full'
    await updated.save()
    await syncLegacyClosedFlag(true)
  }
  return updated
}

async function releaseCampaignSlots(campaignId, count) {
  const campaign = await CastrationCampaign.findById(campaignId)
  if (!campaign) return
  campaign.reservedAnimals = Math.max(0, (campaign.reservedAnimals || 0) - count)
  if (campaign.status === 'full' && campaign.reservedAnimals < campaign.maxAnimals) {
    campaign.status = 'open'
    campaign.closedAt = null
    campaign.closedReason = undefined
    await syncLegacyClosedFlag(false)
  }
  await campaign.save()
}

async function closeCampaign(campaign, reason = 'manual') {
  campaign.status = 'closed'
  campaign.closedAt = new Date()
  campaign.closedReason = reason
  await campaign.save()
  await syncLegacyClosedFlag(true)
  return campaign
}

async function openCampaign(campaign) {
  campaign.status = 'open'
  campaign.closedAt = null
  campaign.closedReason = undefined
  await campaign.save()
  await syncLegacyClosedFlag(false)
  return campaign
}

async function getCampaignStats(campaignId) {
  const CastrationRequest = require('../models/CastrationRequest')
  const campaign = await CastrationCampaign.findById(campaignId).lean()
  if (!campaign) return null
  const cid = campaign._id
  const [totalRequests, byStatus, bySpecies] = await Promise.all([
    CastrationRequest.countDocuments({ campaignId: cid }),
    CastrationRequest.aggregate([
      { $match: { campaignId: cid } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    CastrationRequest.aggregate([
      { $match: { campaignId: cid } },
      { $unwind: '$animals' },
      { $group: { _id: '$animals.species', count: { $sum: 1 } } },
    ]),
  ])
  const totalAnimals = await CastrationRequest.aggregate([
    { $match: { campaignId: cid } },
    { $group: { _id: null, total: { $sum: '$animalCount' } } },
  ])
  const realized = await CastrationRequest.countDocuments({ campaignId: cid, status: 'realizada' })
  return {
    campaign: toPublicCampaign(campaign),
    totalRequests,
    totalAnimals: totalAnimals[0]?.total || 0,
    animalsRealized: realized,
    byStatus: byStatus.map((r) => ({ status: r._id, count: r.count })),
    bySpecies: bySpecies.map((r) => ({ species: r._id, count: r.count })),
  }
}

module.exports = {
  CASTRATION_KEY,
  slotsAvailable,
  campaignAcceptsRequests,
  toPublicCampaign,
  syncLegacyClosedFlag,
  getLegacyClosedFlag,
  getActiveCampaign,
  syncCampaignFromLegacyToggle,
  resolveCampaignForPublicStatus,
  getOpenCampaignForRequests,
  reserveCampaignSlots,
  releaseCampaignSlots,
  closeCampaign,
  openCampaign,
  getCampaignStats,
}
