const Arvore = require("../models/Arvore")
const getToken = require("../helpers/get-token")
const getUserByToken = require("../helpers/get-user-by-token")
const ObjectId = require('mongoose').Types.ObjectId
const { recordAudit } = require('../helpers/audit-log')

function toPublicProfile(user) {
    if (!user) return null
    return {
        _id: user._id,
        name: user.name,
        image: user.image,
    }
}

function toPublicTree(tree) {
    const base = typeof tree.toObject === 'function' ? tree.toObject() : tree
    return {
        ...base,
        user: toPublicProfile(base.user),
        requester: toPublicProfile(base.requester),
        adopter: toPublicProfile(base.adopter),
    }
}

module.exports = class ArvoreController {

    // CREATE
    static async create(req, res) {
        const { species, scientificName, origin, age, height, location, quantity, description, allowsWiring } = req.body
        const images = req.files

        if (!species) return res.status(422).json({ message: 'Por favor, informe o nome da árvore.' })
        if (!scientificName) return res.status(422).json({ message: 'Por favor, informe o nome científico da árvore.' })
        if (!origin) return res.status(422).json({ message: 'Por favor, informe a origem da árvore.' })
        if (!age) return res.status(422).json({ message: 'Por favor, informe a idade da árvore.' })
        if (!height) return res.status(422).json({ message: 'Por favor, informe a altura da árvore.' })
        if (!location) return res.status(422).json({ message: 'Por favor, informe a localização da árvore.' })
        if (!description) return res.status(422).json({ message: 'Por favor, informe a descrição da árvore. ' })
        if (allowsWiring === undefined || allowsWiring === '') return res.status(422).json({ message: 'Informe se a árvore aceita fiação.' })

        const quantityNum = parseInt(quantity)
        if (!quantity || isNaN(quantityNum) || quantityNum < 1) {
            return res.status(422).json({ message: 'Informe a quantidade de árvores disponível (número maior que 0).' })
        }

        if (!images || images.length === 0) return res.status(422).json({ message: 'Por favor, adicione pelo menos uma imagem da árvore.' })

        const token = getToken(req)
        const user = await getUserByToken(token)

        const canManageTreesAccess = user.isAdmin || user.canManageTrees || user.role === 'sama'
        if (!canManageTreesAccess) {
            return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para cadastrar árvores.' })
        }

        const arvoreData = {
            species, scientificName, origin, age, height, location, description, quantity: quantityNum, images: images.map(img => img.filename),
            allowsWiring: allowsWiring === 'true' || allowsWiring === true,
            available: true,
            user: user._id
        }

        const arvore = new Arvore(arvoreData)

        try {
            const newTree = await arvore.save()
            await recordAudit(req, {
                action: 'tree.create',
                resourceType: 'tree',
                resourceId: newTree._id,
                metadata: { quantity: newTree.quantity },
            })
            res.status(201).json({ message: '🌳 Muda cadastrada com sucesso no catálogo SAMA!', newTree })
        } catch (error) {
            res.status(500).json({ message: 'Erro ao cadastrar a árvore: ' + error })
        }
    }

    // GET ALL
    static async getAll(req, res) {
        try {
            const { search } = req.query
            let query = {}

            if (search) {
                query.species = { $regex: search, $options: 'i' }
            }

            const arvores = await Arvore.find(query)
                .populate('user', 'name image')
                .populate('requester', 'name image')
                .populate('adopter', 'name image')
                .sort({ available: -1, createdAt: -1 })
            res.status(200).json({ arvores: arvores.map(toPublicTree) })
        } catch (error) {
            console.error('Error in getAll:', error)
            res.status(500).json({ message: 'Erro ao buscar árvores.' })
        }
    }

    // GET MY TREES
    static async getAllUserTrees(req, res) {
        try {
            const user = await getUserByToken(getToken(req))
            if (!user) {
                return res.status(401).json({ message: 'Acesso Negado!' })
            }

            let allTrees = []

            if (user.isAdmin || user.isSamaMember || user.canManageTrees) {
                allTrees = await Arvore.find()
                    .populate('user', 'name image phone')
                    .populate('requester', 'name phone email')
                    .populate('adopter', 'name phone email')
                    .sort('-createdAt')
            } else {
                const registeredTrees = await Arvore.find({ 'user': user._id })
                    .populate('user', 'name image phone')
                    .populate('requester', 'name phone email')
                    .populate('adopter', 'name phone email')
                    .sort('-createdAt')
                const adoptedTrees = await Arvore.find({ 'adopter': user._id })
                    .populate('user', 'name image phone')
                    .populate('requester', 'name phone email')
                    .populate('adopter', 'name phone email')
                    .sort('-createdAt')
                const requestedTrees = await Arvore.find({
                    'requester': user._id,
                    available: true
                })
                    .populate('user', 'name image phone')
                    .populate('requester', 'name phone email')
                    .populate('adopter', 'name phone email')
                    .sort('-createdAt')
                allTrees = [...requestedTrees, ...registeredTrees, ...adoptedTrees]
            }

            res.status(200).json({ arvores: allTrees })
        } catch (error) {
            console.error('Error in getAllUserTrees:', error)
            res.status(500).json({ message: 'Erro ao buscar suas árvores.' })
        }
    }

    // GET ONE
    static async getTreeById(req, res) {
        const { id } = req.params
        if (!ObjectId.isValid(id)) return res.status(422).json({ message: 'ID inválido.' })

        const arvore = await Arvore.findById(id)
            .populate('user', 'name image')
            .populate('requester', 'name image')
            .populate('adopter', 'name image')
        if (!arvore) return res.status(404).json({ message: 'Árvore não encontrada.' })

        res.status(200).json({ arvore: toPublicTree(arvore) })
    }

    // DELETE
    static async removeTreeById(req, res) {
        const { id } = req.params
        if (!ObjectId.isValid(id)) return res.status(422).json({ message: 'ID inválido.' })

        const arvore = await Arvore.findById(id)
        if (!arvore) return res.status(404).json({ message: 'Árvore não encontrada.' })

        const user = await getUserByToken(getToken(req))
        const isOwner = arvore.user.toString() === user._id.toString()
        const canManageTreesAccess = user.isAdmin || user.canManageTrees || user.role === 'sama'

        if (!canManageTreesAccess && !isOwner) {
            return res.status(403).json({ message: 'Acesso negado! Você não tem permissão para remover esta árvore.' })
        }

        await Arvore.findByIdAndDelete(id)
        await recordAudit(req, {
            action: 'tree.delete',
            resourceType: 'tree',
            resourceId: id,
        })
        res.status(200).json({ message: `Árvore "${arvore.species}" removida com sucesso!` })
    }

    // UPDATE
    static async updateTree(req, res) {
        const { id } = req.params
        const { species, scientificName, origin, age, height, location, description, quantity, allowsWiring } = req.body
        const images = req.files

        const arvore = await Arvore.findById(id)
        if (!arvore) return res.status(404).json({ message: 'Árvore não encontrada.' })

        const user = await getUserByToken(getToken(req))
        const isOwner = arvore.user.toString() === user._id.toString()
        const canManageTreesAccess = user.isAdmin || user.canManageTrees || user.role === 'sama'

        if (!canManageTreesAccess && !isOwner) {
            return res.status(403).json({ message: 'Acesso negado! Você não tem permissão para atualizar as árvores.' })
        }

        const updatedData = {}
        if (!species) return res.status(422).json({ message: 'Digite o nome da árvore.' })
        updatedData.species = species
        if (!scientificName) return res.status(422).json({ message: 'Digite o nome científo da árvore.' })
        updatedData.scientificName = scientificName
        if (!origin) return res.status(422).json({ message: 'Digite a origem da árvore.' })
        updatedData.origin = origin
        if (!age) return res.status(422).json({ message: 'Digite a idade da árvore.' })
        updatedData.age = age
        if (!height) return res.status(422).json({ message: 'Digite a altura da árvore.' })
        updatedData.height = height
        if (!location) return res.status(422).json({ message: 'Digite a localização da árvore.' })
        updatedData.location = location
        if (!description) return res.status(422).json({ message: 'Digite a descrição da árvore' })
        updatedData.description = description
        if (!quantity || isNaN(quantity) || quantity < 1) return res.status(422).json({ message: 'Informe a quantidade disponível corretamente.' })
        updatedData.quantity = quantity
        if (allowsWiring === undefined) return res.status(422).json({ message: 'Informe se a árvore aceita fiação.' })
        updatedData.allowsWiring = allowsWiring === 'true' || allowsWiring === true

        if (images && Array.isArray(images) && images.length > 0) {
            updatedData.images = images.map(img => img.filename)
        }

        await Arvore.findByIdAndUpdate(id, updatedData)
        await recordAudit(req, {
            action: 'tree.update',
            resourceType: 'tree',
            resourceId: id,
            metadata: { quantity: updatedData.quantity },
        })
        res.status(200).json({ message: `Árvore "${species}" atualizada com sucesso!`, updatedData })
    }

    // REQUEST TREE
    static async requestTree(req, res) {
        const { id } = req.params
        const arvore = await Arvore.findById(id)
        if (!arvore) return res.status(404).json({ message: 'Árvore não encontrada.' })

        const user = await getUserByToken(getToken(req))

        if (arvore.user.toString() === user._id.toString()) {
            return res.status(422).json({ message: 'Você não pode solicitar sua própria árvore.' })
        }

        if (arvore.quantity <= 0) {
            return res.status(422).json({ message: 'Não há mais unidades disponíveis para solicitação.' })
        }

        await Arvore.findByIdAndUpdate(id, { requester: user._id, requestedAt: new Date() })
        await recordAudit(req, {
            action: 'tree.request',
            resourceType: 'tree',
            resourceId: id,
            metadata: { requesterId: user._id },
        })

        const updatedTree = await Arvore.findById(id)
            .populate('user', 'name image phone')
            .populate('requester', 'name phone email image')

        return res.status(200).json({
            message: '✅ Solicitação enviada com sucesso! Em breve, nossa equipe irá analisar seu pedido.',
            arvore: updatedTree
        })
    }

    // CONCLUDE REQUEST
    static async concludeRequest(req, res) {
        const { id } = req.params
        const arvore = await Arvore.findById(id)
        if (!arvore) return res.status(404).json({ message: 'Árvore não encontrada.' })

        const user = await getUserByToken(getToken(req))
        const isOwner = arvore.user.toString() === user._id.toString()

        const canManageTreesAccess = user.isAdmin || user.canManageTrees || user.role === 'sama'
        if (!canManageTreesAccess && !isOwner) {
            return res.status(422).json({ message: 'Acesso negado! Somente administradores ou gestores autorizados podem concluir solicitações.' })
        }

        if (!arvore.requester) {
            return res.status(422).json({ message: 'Nenhuma solicitação encontrada para concluir.' })
        }

        const newQuantity = arvore.quantity - 1
        const isAvailable = newQuantity > 0

        await Arvore.findByIdAndUpdate(id, {
            quantity: newQuantity,
            available: isAvailable,
            adopter: arvore.requester,
            requester: null
        })
        await recordAudit(req, {
            action: 'tree.conclude_request',
            resourceType: 'tree',
            resourceId: id,
            metadata: { remainingQuantity: newQuantity },
        })

        return res.status(200).json({
            message: `A solicitação foi concluída com sucesso! A muda de "${arvore.species}" foi entregue ao solicitante.`
        })
    }

    // CANCEL REQUEST
    static async cancelRequest(req, res) {
        const { id } = req.params
        const arvore = await Arvore.findById(id)
        if (!arvore) return res.status(404).json({ message: 'Árvore não encontrada.' })

        const user = await getUserByToken(getToken(req))
        const isOwner = arvore.user.toString() === user._id.toString()

        const canManageTreesAccess = user.isAdmin || user.canManageTrees || user.role === 'sama'
        if (!canManageTreesAccess && !isOwner) {
            return res.status(422).json({ message: 'Acesso negado! Você não possui permissão para apagar esta solicitação.' })
        }

        await Arvore.findByIdAndUpdate(id, { requester: null, requesterStatus: 'Pendente', requesterMessage: '', requestedAt: null })
        await recordAudit(req, {
            action: 'tree.cancel_request',
            resourceType: 'tree',
            resourceId: id,
        })

        return res.status(200).json({
            message: 'Solicitação removida com sucesso!',
        })
    }

    // UPDATE REQUESTER STATUS (Em análise, etc)
    static async updateRequesterStatus(req, res) {
        const { id } = req.params
        const { status, adminMessage } = req.body

        const arvore = await Arvore.findById(id)
        if (!arvore) return res.status(404).json({ message: 'Árvore não encontrada.' })

        const user = await getUserByToken(getToken(req))
        const isOwner = arvore.user.toString() === user._id.toString()
        const canManageTreesAccess = user.isAdmin || user.canManageTrees || user.role === 'sama'

        if (!canManageTreesAccess && !isOwner) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }

        if (!arvore.requester) {
            return res.status(422).json({ message: 'Nenhum solicitante encontrado para atualizar.' })
        }

        const validStatuses = ['Pendente', 'Em análise', 'Aprovado', 'Recusado']
        if (status && !validStatuses.includes(status)) {
            return res.status(422).json({ message: 'Status inválido.' })
        }

        const update = {}
        if (status) update.requesterStatus = status
        if (adminMessage !== undefined) update.requesterMessage = adminMessage

        await Arvore.findByIdAndUpdate(id, update)
        await recordAudit(req, {
            action: 'tree.update_requester_status',
            resourceType: 'tree',
            resourceId: id,
            metadata: { status },
        })

        return res.status(200).json({ message: `Status atualizado para "${status}" com sucesso!` })
    }

}
