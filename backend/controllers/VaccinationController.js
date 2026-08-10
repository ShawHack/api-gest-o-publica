const ObjectId = require('mongoose').Types.ObjectId

const Pet = require('../models/Pet')
const Vaccination = require('../models/Vaccination')

const getToken = require('../helpers/get-token')
const getUserByToken = require('../helpers/get-user-by-token')
const { recordAudit } = require('../helpers/audit-log')

function parseDate(value, fieldLabel) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${fieldLabel} inválida.`)
    }
    return date
}

function validateVaccinationPayload(body) {
    const nomeVacina = String(body?.nomeVacina || '').trim()
    const dataAplicacaoRaw = body?.dataAplicacao
    const proximaDoseRaw = body?.proximaDose
    const observacoes = body?.observacoes === undefined ? '' : String(body.observacoes).trim()

    if (!nomeVacina) {
        throw new Error('O nome da vacina é obrigatório.')
    }
    if (!dataAplicacaoRaw) {
        throw new Error('A data de aplicação é obrigatória.')
    }

    const dataAplicacao = parseDate(dataAplicacaoRaw, 'Data de aplicação')
    let proximaDose = null
    if (proximaDoseRaw) {
        proximaDose = parseDate(proximaDoseRaw, 'Próxima dose')
    }

    return {
        nomeVacina,
        dataAplicacao,
        proximaDose,
        observacoes,
    }
}

module.exports = class VaccinationController {
    static async createVaccination(req, res) {
        const { petId } = req.params

        if (!ObjectId.isValid(petId)) {
            return res.status(422).json({ message: 'petId inválido.' })
        }

        const pet = await Pet.findById(petId)
        if (!pet) {
            return res.status(404).json({ message: 'Pet não encontrado.' })
        }

        const token = getToken(req)
        const user = await getUserByToken(token)
        const isOwner = pet.user.toString() === user._id.toString()
        if (!user.isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Acesso negado para registrar vacinação neste pet.' })
        }

        let payload
        try {
            payload = validateVaccinationPayload(req.body)
        } catch (error) {
            return res.status(422).json({ message: error.message })
        }

        const vaccination = await Vaccination.create({
            petId,
            ...payload,
        })

        await recordAudit(req, {
            action: 'vaccination.create',
            resourceType: 'vaccination',
            resourceId: vaccination._id,
            metadata: { petId, nomeVacina: payload.nomeVacina },
        })

        return res.status(201).json({
            message: 'Vacinação registrada com sucesso!',
            vaccination,
        })
    }

    static async getVaccinationsByPet(req, res) {
        const { petId } = req.params

        if (!ObjectId.isValid(petId)) {
            return res.status(422).json({ message: 'petId inválido.' })
        }

        const pet = await Pet.findById(petId).select('name')
        if (!pet) {
            return res.status(404).json({ message: 'Pet não encontrado.' })
        }

        const vaccinations = await Vaccination.find({ petId }).sort({ dataAplicacao: -1, createdAt: -1 })

        return res.status(200).json({
            petId,
            petName: pet.name,
            count: vaccinations.length,
            vaccinations,
        })
    }

    static async updateVaccination(req, res) {
        const { id } = req.params

        if (!ObjectId.isValid(id)) {
            return res.status(422).json({ message: 'ID de vacinação inválido.' })
        }

        const vaccination = await Vaccination.findById(id)
        if (!vaccination) {
            return res.status(404).json({ message: 'Vacinação não encontrada.' })
        }

        const pet = await Pet.findById(vaccination.petId).select('user')
        if (!pet) {
            return res.status(404).json({ message: 'Pet vinculado à vacinação não encontrado.' })
        }

        const token = getToken(req)
        const user = await getUserByToken(token)
        const isOwner = pet.user.toString() === user._id.toString()
        if (!user.isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Acesso negado para editar vacinação deste pet.' })
        }

        let payload
        try {
            payload = validateVaccinationPayload(req.body)
        } catch (error) {
            return res.status(422).json({ message: error.message })
        }

        await Vaccination.findByIdAndUpdate(id, payload)

        await recordAudit(req, {
            action: 'vaccination.update',
            resourceType: 'vaccination',
            resourceId: id,
            metadata: { nomeVacina: payload.nomeVacina },
        })

        const updated = await Vaccination.findById(id)
        return res.status(200).json({
            message: 'Vacinação atualizada com sucesso!',
            vaccination: updated,
        })
    }

    static async deleteVaccination(req, res) {
        const { id } = req.params

        if (!ObjectId.isValid(id)) {
            return res.status(422).json({ message: 'ID de vacinação inválido.' })
        }

        const vaccination = await Vaccination.findById(id)
        if (!vaccination) {
            return res.status(404).json({ message: 'Vacinação não encontrada.' })
        }

        const pet = await Pet.findById(vaccination.petId).select('user')
        if (!pet) {
            return res.status(404).json({ message: 'Pet vinculado à vacinação não encontrado.' })
        }

        const token = getToken(req)
        const user = await getUserByToken(token)
        const isOwner = pet.user.toString() === user._id.toString()
        if (!user.isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Acesso negado para remover vacinação deste pet.' })
        }

        await Vaccination.findByIdAndDelete(id)

        await recordAudit(req, {
            action: 'vaccination.delete',
            resourceType: 'vaccination',
            resourceId: id,
            metadata: { petId: vaccination.petId },
        })

        return res.status(200).json({ message: 'Vacinação removida com sucesso!' })
    }
}
