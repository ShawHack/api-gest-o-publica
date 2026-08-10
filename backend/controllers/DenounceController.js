const Denounce = require('../models/Denounce')
const getToken = require('../helpers/get-token')
const getUserByToken = require('../helpers/get-user-by-token')
const { recordAudit } = require('../helpers/audit-log')

function toPublicReporter(user) {
    if (!user) return null
    return {
        _id: user._id,
        name: user.name,
        image: user.image,
    }
}

function toSafeDenounce(denounce) {
    const item = typeof denounce.toObject === 'function' ? denounce.toObject() : denounce
    return {
        ...item,
        user: toPublicReporter(item.user),
    }
}

module.exports = class DenounceController {
    static async createDenounce(req, res) {
        const { name, type, address, description } = req.body

        // validations
        if (!type) {
            res.status(422).json({ message: 'O tipo da denúncia é obrigatório!' })
            return
        }
        if (!address) {
            res.status(422).json({ message: 'O endereço é obrigatório!' })
            return
        }
        if (!description) {
            res.status(422).json({ message: 'A descrição é obrigatória!' })
            return
        }

        const images = req.files || []

        // Get user if authenticated (optional for denounces)
        let userId = null
        try {
            if (req.headers.authorization) {
                const token = getToken(req)
                const user = await getUserByToken(token)
                if (user) userId = user._id
            }
        } catch (err) {
            // User not authenticated, continue as anonymous
        }

        const denounce = new Denounce({
            name: name || 'Anônimo',
            type,
            address,
            description,
            images: [],
            user: userId
        })

        if (images && images.length > 0) {
            images.map((image) => {
                denounce.images.push(image.filename)
            })
        }

        try {
            const newDenounce = await denounce.save()
            await recordAudit(req, {
                action: 'denounce.create',
                resourceType: 'denounce',
                resourceId: newDenounce._id,
                metadata: { type: newDenounce.type },
            })
            res.status(201).json({
                message: 'Denúncia recebida com sucesso! Obrigado pela sua atitude.',
                newDenounce: toSafeDenounce(newDenounce),
            })
        } catch (error) {
            console.error('Error saving denounce:', error)
            res.status(500).json({ message: 'Erro ao processar sua denúncia no servidor: ' + error.message })
        }
    }

    static async getAllDenounces(req, res) {
        try {
            const denounces = await Denounce.find()
                .populate('user', 'name image')
                .sort('-createdAt')
            await recordAudit(req, {
                action: 'denounce.list',
                resourceType: 'denounce',
            })
            res.status(200).json({ denounces: denounces.map(toSafeDenounce) })
        } catch (error) {
            console.error('Error fetching denounces:', error)
            res.status(500).json({ message: 'Erro ao buscar denúncias.' })
        }
    }

    static async updateDenounceStatus(req, res) {
        try {
            const { id } = req.params
            const { status } = req.body

            if (!['Pendente', 'Em Análise', 'Resolvido'].includes(status)) {
                return res.status(422).json({ message: 'Status inválido.' })
            }

            const denounce = await Denounce.findByIdAndUpdate(
                id,
                { status },
                { new: true }
            )

            if (!denounce) {
                return res.status(404).json({ message: 'Denúncia não encontrada.' })
            }
            await recordAudit(req, {
                action: 'denounce.update_status',
                resourceType: 'denounce',
                resourceId: id,
                metadata: { status },
            })

            res.status(200).json({
                message: 'Status atualizado com sucesso!',
                denounce: toSafeDenounce(denounce)
            })
        } catch (error) {
            console.error('Error updating denounce status:', error)
            res.status(500).json({ message: 'Erro ao atualizar status.' })
        }
    }
}
