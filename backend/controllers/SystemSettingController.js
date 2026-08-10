const SystemSetting = require('../models/SystemSetting')
const getToken = require('../helpers/get-token')
const getUserByToken = require('../helpers/get-user-by-token')
const { recordAudit } = require('../helpers/audit-log')
const {
  CASTRATION_KEY,
  toPublicCampaign,
  syncCampaignFromLegacyToggle,
  resolveCampaignForPublicStatus,
} = require('../helpers/castration-campaign-service')


function canManageGarcaPetSettings(user) {
    if (!user) return false
    return !!(user.isAdmin || user.isSamaMember || user.canManageTrees)
}

function parseCastrationValue(body) {
    const payload = body || {}
    if (payload.value !== undefined) return !!payload.value
    if (payload.closed !== undefined) return !!payload.closed
    if (payload.status !== undefined) {
        const status = String(payload.status).trim().toLowerCase()
        return status === 'closed' || status === 'encerrada' || status === 'encerrado' || status === 'true' || status === '1'
    }
    return undefined
}

module.exports = class SystemSettingController {
    static async getSetting(req, res) {
        try {
            const { key } = req.params
            const setting = await SystemSetting.findOne({ key })

            if (!setting) {
                return res.status(404).json({ message: 'Configuração não encontrada.' })
            }

            // Compatível com o front GarçaPet (espera data.value no GET de castration_closed).
            res.status(200).json({ setting, value: setting.value })
        } catch (error) {
            console.error('Error fetching setting:', error)
            res.status(500).json({ message: 'Erro ao buscar configuração.' })
        }
    }

    static async getAllSettings(req, res) {
        try {
            const settings = await SystemSetting.find()
            res.status(200).json({ settings })
        } catch (error) {
            console.error('Error fetching settings:', error)
            res.status(500).json({ message: 'Erro ao buscar configurações.' })
        }
    }

    static async updateSetting(req, res) {
        const { key } = req.params
        const { value, description } = req.body
        return SystemSettingController.upsertByKey(req, res, key, value, description)
    }

    /** PATCH /settings/update — corpo: { key, value } (front GarçaPet legado) */
    static async updateFromBody(req, res) {
        const { key, value, description } = req.body || {}
        if (!key) {
            return res.status(422).json({ message: 'O campo key é obrigatório.' })
        }
        return SystemSettingController.upsertByKey(req, res, key, value, description)
    }

    /** POST|PATCH /api/v1/castracao/update — compat legado */
    static async updateCastrationCompat(req, res) {
        const value = parseCastrationValue(req.body)
        if (value === undefined) {
            return res.status(422).json({ message: 'Informe value (boolean) ou closed.' })
        }
        return SystemSettingController.upsertByKey(req, res, CASTRATION_KEY, value, req.body?.description)
    }

    static async upsertByKey(req, res, key, value, description) {
        try {
            if (!key) {
                return res.status(422).json({ message: 'Chave da configuração é obrigatória.' })
            }

            const token = getToken(req)
            const user = await getUserByToken(token)

            if (!canManageGarcaPetSettings(user)) {
                return res.status(403).json({
                    message: 'Acesso negado. Apenas administradores ou equipe SAMA podem alterar configurações.',
                })
            }

            const setting = await SystemSetting.findOneAndUpdate(
                { key },
                { value, description },
                { new: true, upsert: true }
            )

            if (key === CASTRATION_KEY) {
                await syncCampaignFromLegacyToggle(!!value, user?._id)
                void recordAudit(req, {
                    action: 'castration_campaign.legacy_toggle',
                    resourceType: 'castration_campaign',
                    module: 'sama',
                    eventType: 'UPDATE',
                    metadata: { closed: !!value },
                })
            }

            return res.status(200).json({
                message: 'Configuração atualizada com sucesso!',
                setting,
                value: setting.value,
            })
        } catch (error) {
            console.error('Error updating setting:', error)
            return res.status(500).json({ message: 'Erro ao atualizar configuração.' })
        }
    }

    /** GET /api/v1/castracao/status — compat legado */
    static async getCastrationCompat(req, res) {
        try {
            const setting = await SystemSetting.findOne({ key: CASTRATION_KEY })
            const { campaign, legacyClosed } = await resolveCampaignForPublicStatus()
            const closed = legacyClosed || !campaign || campaign.status !== 'open'
            return res.status(200).json({
                value: closed,
                closed,
                setting,
                campaign: toPublicCampaign(campaign),
            })
        } catch (error) {
            console.error('Error fetching castration status:', error)
            return res.status(500).json({ message: 'Erro ao buscar status da castração.' })
        }
    }
}
