const AdoptionRequest = require('../models/AdoptionRequest')
const Pet = require('../models/Pet')
const User = require('../models/User')
const PetReport = require('../models/PetReport')
const getToken = require('../helpers/get-token')
const getUserByToken = require('../helpers/get-user-by-token')
const { sendMail } = require('../helpers/mailer')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const ObjectId = require('mongoose').Types.ObjectId
const {
    toIdString,
    attachApplicantsCountsToPets,
    getQueueMetaForRequest,
    getActiveRequestForUserOnPet,
    syncPetLegacyFields,
    closeOtherActiveRequests,
    QUEUE_POSITION_STATUSES,
    LEGACY_STATUS_MAP,
    resolveViewerRole,
    buildChatPresence,
    touchPresence,
} = require('../helpers/adoption-request-service')

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())

async function notifyOwnerNewRequest({ owner, adopter, petName, applicantsCount }) {
    if (!owner?.email || !isValidEmail(owner.email)) return
    const text = [
        `Olá ${owner.name || 'responsável'},`,
        '',
        `Nova solicitação de adoção para "${petName}".`,
        `Pretendente: ${adopter?.name || 'Não informado'}.`,
        `Total na fila: ${applicantsCount} pretendente(s).`,
        '',
        'Acesse Garça Pet > Meus pets para analisar a fila.',
    ].join('\n')
    await sendMail({
        to: owner.email,
        subject: `Nova solicitação de adoção - ${petName}`,
        text,
        html: text.replace(/\n/g, '<br/>'),
    })
}

function getGarcaPetPanelUrl(path) {
    const base = (process.env.APP_URL || 'https://api.garca.sp.gov.br').replace(/\/$/, '')
    const p = path.startsWith('/') ? path : `/${path}`
    return `${base}/garcapet${p}`
}

/** E-mail ao pretendente quando o doador envia recado na fila */
async function notifyAdopterNewMessage({ adopter, owner, petName, messageText }) {
    if (!adopter?.email || !isValidEmail(adopter.email)) {
        console.warn('[adoption] Pretendente sem e-mail válido; recado não notificado por e-mail.')
        return
    }
    const panelUrl = getGarcaPetPanelUrl('/pet/myadoptions')
    const text = [
        `Olá ${adopter.name || 'adotante'},`,
        '',
        `Você recebeu um novo recado do responsável pelo animal "${petName}" na Garça Pet:`,
        '',
        `"${messageText}"`,
        '',
        'Para ver o histórico e responder, acesse:',
        panelUrl,
        '',
        'Não responda este e-mail diretamente; use o link acima.',
        '',
        'Garça Pet — Prefeitura Municipal de Garça',
    ].join('\n')
    const result = await sendMail({
        to: adopter.email,
        subject: `Novo recado sobre a adoção de ${petName}`,
        text,
        html: text.replace(/\n/g, '<br/>'),
    })
    if (result?.error) {
        console.error('[adoption] Falha ao enviar e-mail ao pretendente:', result.message)
    }
}

/** E-mail ao doador quando o pretendente envia mensagem */
async function notifyOwnerNewMessage({ owner, adopter, petName, messageText }) {
    if (!owner?.email || !isValidEmail(owner.email)) {
        console.warn('[adoption] Doador sem e-mail válido; recado não notificado por e-mail.')
        return
    }
    const panelUrl = getGarcaPetPanelUrl('/pet/mypets')
    const text = [
        `Olá ${owner.name || 'responsável'},`,
        '',
        `${adopter?.name || 'Um pretendente'} enviou uma mensagem sobre a adoção de "${petName}":`,
        '',
        `"${messageText}"`,
        '',
        'Para responder, acesse:',
        panelUrl,
        '',
        'Garça Pet — Prefeitura Municipal de Garça',
    ].join('\n')
    const result = await sendMail({
        to: owner.email,
        subject: `Nova mensagem na fila de adoção — ${petName}`,
        text,
        html: text.replace(/\n/g, '<br/>'),
    })
    if (result?.error) {
        console.error('[adoption] Falha ao enviar e-mail ao doador:', result.message)
    }
}

async function notifyAdopterStatus({ adopter, owner, petName, status, message, position, total }) {
    if (!adopter?.email || !isValidEmail(adopter.email)) return
    const lines = [
        `Olá ${adopter.name || 'adotante'},`,
        '',
        `Atualização da sua solicitação para "${petName}".`,
        `Status: ${LEGACY_STATUS_MAP[status] || status}`,
        position && total ? `Sua posição na fila: ${position} de ${total}.` : null,
        message ? `Mensagem: ${message}` : null,
    ]
    if (status === 'aprovada' || status === 'concluida') {
        lines.push(
            '',
            'Contato do responsável:',
            owner?.phone ? `Telefone: ${owner.phone}` : null,
            owner?.email ? `E-mail: ${owner.email}` : null
        )
    }
    const text = lines.filter(Boolean).join('\n')
    await sendMail({
        to: adopter.email,
        subject: `Atualização — adoção de ${petName}`,
        text,
        html: text.replace(/\n/g, '<br/>'),
    })
}

module.exports = class AdoptionRequestController {
    /** POST /pets/:petId/adoption-requests */
    static async create(req, res) {
        const petId = req.params.petId || req.params.id
        const { deliveryAddress, message } = req.body
        const initialMessage = String(deliveryAddress || message || '').trim()

        if (!ObjectId.isValid(petId)) {
            return res.status(422).json({ message: 'ID inválido.' })
        }
        if (!initialMessage) {
            return res.status(422).json({
                message: 'Informe uma mensagem para o responsável analisar sua solicitação.',
            })
        }

        const pet = await Pet.findById(petId)
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado.' })
        if (!pet.available || pet.adopterStatus === 'Finalizado') {
            return res.status(422).json({ message: 'Este pet não está disponível para adoção.' })
        }

        const user = await getUserByToken(getToken(req))
        if (!user) return res.status(401).json({ message: 'Não autenticado.' })

        if (toIdString(pet.user) === user._id.toString()) {
            return res.status(422).json({ message: 'Você não pode solicitar adoção do seu próprio pet.' })
        }

        const existing = await getActiveRequestForUserOnPet(petId, user._id)
        if (existing) {
            const meta = await getQueueMetaForRequest(existing)
            return res.status(422).json({
                message: 'Você já está na fila para este pet.',
                adoptionRequest: existing,
                position: meta.position,
                total: meta.total,
            })
        }

        const request = await AdoptionRequest.create({
            pet: petId,
            adopter: user._id,
            status: 'enviada',
            initialMessage,
            messages: [
                {
                    role: 'system',
                    message: `Solicitação registrada por ${user.name}.`,
                    createdAt: new Date(),
                },
                {
                    role: 'adopter',
                    message: initialMessage,
                    createdAt: new Date(),
                },
            ],
        })

        await syncPetLegacyFields(petId)
        const meta = await getQueueMetaForRequest(request)
        const applicantsCount = meta.total

        const petPop = await Pet.findById(petId).populate('user', 'name email')
        await notifyOwnerNewRequest({
            owner: petPop?.user,
            adopter: user,
            petName: pet.name,
            applicantsCount,
        })

        await recordAudit(req, {
            action: 'adoption_request.create',
            resourceType: 'adoption_request',
            resourceId: request._id,
            metadata: { petId, position: meta.position, total: meta.total },
        })

        return res.status(201).json({
            message: `Você entrou na fila (${meta.position}º de ${meta.total}). Aguarde a análise do responsável.`,
            adoptionRequest: request,
            position: meta.position,
            total: meta.total,
            applicantsCount,
        })
    }

    /** GET /pets/:petId/adoption-requests — fila para doador/admin */
    static async listForPet(req, res) {
        const petId = req.params.petId || req.params.id
        if (!ObjectId.isValid(petId)) {
            return res.status(422).json({ message: 'ID inválido.' })
        }

        const pet = await Pet.findById(petId)
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado.' })

        const user = await getUserByToken(getToken(req))
        const isOwner = toIdString(pet.user) === user._id.toString()
        if (!user.isAdmin && !user.canManageTrees && !isOwner) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }

        const requests = await AdoptionRequest.find({
            pet: petId,
            status: { $in: [...QUEUE_POSITION_STATUSES, 'recusada', 'cancelada_adotante', 'cancelada_doador'] },
        })
            .populate('adopter', 'name image phone email userType instituteName')
            .sort('createdAt')

        const withMeta = await Promise.all(
            requests.map(async (r, index) => {
                const meta = await getQueueMetaForRequest(r)
                return {
                    ...r.toObject(),
                    queuePosition: meta.position,
                    applicantsCount: meta.total,
                    queueOrder: index + 1,
                }
            })
        )

        return res.status(200).json({
            applicantsCount: withMeta.filter((r) => QUEUE_POSITION_STATUSES.includes(r.status)).length,
            requests: withMeta,
        })
    }

    /** GET /adoption-requests/my — minhas solicitações */
    static async listMine(req, res) {
        const user = await getUserByToken(getToken(req))
        const requests = await AdoptionRequest.find({ adopter: user._id })
            .populate({
                path: 'pet',
                populate: { path: 'user', select: 'name image phone email userType instituteName' },
            })
            .sort('-createdAt')

        const items = await Promise.all(
            requests.map(async (r) => {
                const meta = await getQueueMetaForRequest(r)
                const pet = r.pet
                if (pet) {
                    pet.applicantsCount = meta.total
                }
                return {
                    adoptionRequest: {
                        _id: r._id,
                        status: r.status,
                        legacyStatus: LEGACY_STATUS_MAP[r.status] || r.status,
                        position: meta.position,
                        total: meta.total,
                        initialMessage: r.initialMessage,
                        createdAt: r.createdAt,
                    },
                    pet,
                }
            })
        )

        const pets = items
            .map((item) => {
                if (!item.pet) return null
                const p = item.pet.toObject ? item.pet.toObject() : { ...item.pet }
                const reqStatus = item.adoptionRequest.status
                const donor = p.user || {}
                p.adopterStatus = item.adoptionRequest.legacyStatus
                p.myQueuePosition = item.adoptionRequest.position
                p.myQueueTotal = item.adoptionRequest.total
                p.adoptionRequestId = item.adoptionRequest._id
                p.adoptionRequestStatus = reqStatus
                p.hasApprovedAdoption = reqStatus === 'aprovada'
                p.donorName = donor.name || null
                p.donorPhone = donor.phone || null
                p.donorEmail = donor.email || null
                if (reqStatus === 'aprovada') {
                    p.adoptionStage = 'handover_pending'
                    p.blockReason = 'adoption_approved'
                } else if (reqStatus === 'concluida') {
                    p.adoptionStage = 'completed'
                } else {
                    p.adoptionStage = 'pending'
                }
                return p
            })
            .filter(Boolean)

        return res.status(200).json({ adoptions: items, pets })
    }

    /** PATCH /adoption-requests/:requestId/status */
    static async updateStatus(req, res) {
        const { requestId } = req.params
        const { status, message } = req.body

        const valid = [
            'enviada',
            'em_analise',
            'aprovada',
            'recusada',
            'cancelada_doador',
            'concluida',
        ]
        if (!valid.includes(status)) {
            return res.status(422).json({ message: 'Status inválido.' })
        }

        const request = await AdoptionRequest.findById(requestId).populate('adopter')
        if (!request) return res.status(404).json({ message: 'Solicitação não encontrada.' })

        const pet = await Pet.findById(request.pet).populate('user')
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado.' })

        const user = await getUserByToken(getToken(req))
        const isOwner = toIdString(pet.user) === user._id.toString()
        if (!user.isAdmin && !user.canManageTrees && !isOwner) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }

        const lockedStatuses = ['aprovada', 'concluida']
        if (
            ['cancelada_doador', 'recusada'].includes(status) &&
            lockedStatuses.includes(request.status)
        ) {
            return res.status(422).json({
                message:
                    'Não é possível remover ou recusar uma solicitação já aprovada ou concluída. Use "Concluir adoção" se a entrega já foi feita.',
            })
        }

        const previousStatus = request.status
        request.status = status
        if (message) {
            request.messages.push({
                role: 'donor',
                message,
                createdAt: new Date(),
            })
        }
        request.messages.push({
            role: 'system',
            message: `Status alterado para: ${LEGACY_STATUS_MAP[status] || status}`,
            createdAt: new Date(),
        })

        if (status === 'aprovada') {
            await closeOtherActiveRequests(pet._id, request._id)
        }
        if (status === 'concluida') {
            request.concludedAt = new Date()
            pet.available = false
            await pet.save()
            await closeOtherActiveRequests(pet._id, request._id, 'encerrada_outro_aprovado')
        }
        if (status === 'recusada' || status === 'cancelada_doador') {
            // mantém histórico; não remove documento
        }

        await request.save()
        await syncPetLegacyFields(pet._id)

        const meta = await getQueueMetaForRequest(request)
        await notifyAdopterStatus({
            adopter: request.adopter,
            owner: pet.user,
            petName: pet.name,
            status,
            message,
            position: meta.position,
            total: meta.total,
        })

        const eventType =
            status === 'aprovada' ? 'APPROVE' : status === 'recusada' ? 'REJECT' : status === 'concluida' ? 'UPDATE' : 'UPDATE'
        await recordChange(req, {
            action: 'adoption_request.update_status',
            resourceType: 'adoption_request',
            resourceId: requestId,
            module: 'garca_pet',
            eventType,
            before: { status: previousStatus },
            after: { status },
            fields: ['status'],
            metadata: { petId: String(request.pet), message: message ? '[provided]' : undefined },
        })

        return res.status(200).json({
            message: 'Status atualizado.',
            adoptionRequest: request,
            position: meta.position,
            total: meta.total,
        })
    }

    /** PATCH /adoption-requests/:requestId/cancel — adotante desiste */
    static async cancelByAdopter(req, res) {
        const { requestId } = req.params
        const request = await AdoptionRequest.findById(requestId)
        if (!request) return res.status(404).json({ message: 'Solicitação não encontrada.' })

        const user = await getUserByToken(getToken(req))
        if (toIdString(request.adopter) !== user._id.toString()) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }
        if (request.status === 'concluida') {
            return res.status(422).json({ message: 'Adoção já concluída.' })
        }

        request.status = 'cancelada_adotante'
        request.messages.push({
            role: 'system',
            message: 'O pretendente cancelou a solicitação.',
            createdAt: new Date(),
        })
        await request.save()
        await syncPetLegacyFields(request.pet)

        void recordAudit(req, {
            action: 'adoption_request.cancel_by_adopter',
            resourceType: 'adoption_request',
            resourceId: requestId,
            module: 'garca_pet',
            eventType: 'UPDATE',
            metadata: { petId: String(request.pet) },
        })

        return res.status(200).json({ message: 'Solicitação cancelada.' })
    }

    /** GET /adoption-requests/:requestId/chat — mensagens + presença (online / última visualização) */
    static async getChat(req, res) {
        try {
            const { requestId } = req.params
            if (!ObjectId.isValid(requestId)) {
                return res.status(422).json({ message: 'ID inválido.' })
            }

            const request = await AdoptionRequest.findById(requestId)
            if (!request) return res.status(404).json({ message: 'Solicitação não encontrada.' })

            const pet = await Pet.findById(request.pet)
                .populate('user', 'name image phone email')
            if (!pet) return res.status(404).json({ message: 'Pet não encontrado.' })

            const user = await getUserByToken(getToken(req))
            if (!user) return res.status(401).json({ message: 'Não autenticado.' })

            const viewerRole = resolveViewerRole(pet, request, user)
            if (!viewerRole) return res.status(403).json({ message: 'Acesso negado.' })

            const roleForPresence = viewerRole === 'admin' ? 'donor' : viewerRole
            await touchPresence(requestId, roleForPresence, { heartbeat: true, markSeen: true })

            const fresh = await AdoptionRequest.findById(requestId)
            const adopterUser = await User.findById(request.adopter).select('name image email phone')

            const presence = buildChatPresence(fresh, roleForPresence)
            const otherName =
                viewerRole === 'donor' || viewerRole === 'admin'
                    ? adopterUser?.name || 'Pretendente'
                    : pet.user?.name || 'Responsável'

            void recordAudit(req, {
                action: 'adoption_request.chat_view',
                resourceType: 'adoption_request',
                resourceId: requestId,
                module: 'garca_pet',
                eventType: 'VIEW',
                metadata: { viewerRole, petId: String(request.pet), messageCount: (fresh.messages || []).length },
            })

            return res.status(200).json({
                adoptionRequestId: requestId,
                petName: pet.name,
                status: fresh.status,
                legacyStatus: LEGACY_STATUS_MAP[fresh.status] || fresh.status,
                viewerRole,
                otherPartyName: otherName,
                messages: fresh.messages || [],
                presence,
            })
        } catch (err) {
            console.error('[AdoptionRequest.getChat]', err)
            return res.status(500).json({ message: 'Erro ao carregar conversa.' })
        }
    }

    /** POST /adoption-requests/:requestId/presence — heartbeat / marcar como visto */
    static async postPresence(req, res) {
        try {
            const { requestId } = req.params
            if (!ObjectId.isValid(requestId)) {
                return res.status(422).json({ message: 'ID inválido.' })
            }

            const request = await AdoptionRequest.findById(requestId)
            if (!request) return res.status(404).json({ message: 'Solicitação não encontrada.' })

            const pet = await Pet.findById(request.pet)
            if (!pet) return res.status(404).json({ message: 'Pet não encontrado.' })

            const user = await getUserByToken(getToken(req))
            if (!user) return res.status(401).json({ message: 'Não autenticado.' })

            const viewerRole = resolveViewerRole(pet, request, user)
            if (!viewerRole) return res.status(403).json({ message: 'Acesso negado.' })

            const roleForPresence = viewerRole === 'admin' ? 'donor' : viewerRole
            const heartbeat = req.body?.heartbeat !== false
            const markSeen = req.body?.markSeen !== false

            await touchPresence(requestId, roleForPresence, { heartbeat, markSeen })

            const fresh = await AdoptionRequest.findById(requestId)
            const presence = buildChatPresence(fresh, roleForPresence)

            return res.status(200).json({ presence })
        } catch (err) {
            console.error('[AdoptionRequest.postPresence]', err)
            return res.status(500).json({ message: 'Erro ao atualizar presença.' })
        }
    }

    /** POST /adoption-requests/:requestId/messages */
    static async sendMessage(req, res) {
        try {
            const { requestId } = req.params
            const { message } = req.body
            if (!message?.trim()) {
                return res.status(422).json({ message: 'Mensagem vazia.' })
            }

            const request = await AdoptionRequest.findById(requestId)
            if (!request) {
                return res.status(404).json({ message: 'Solicitação não encontrada.' })
            }

            const pet = await Pet.findById(request.pet)
            if (!pet) {
                return res.status(404).json({ message: 'Pet não encontrado.' })
            }

            const user = await getUserByToken(getToken(req))
            if (!user) {
                return res.status(401).json({ message: 'Não autenticado.' })
            }

            const isOwner = toIdString(pet.user) === user._id.toString()
            const isAdopter = toIdString(request.adopter) === user._id.toString()
            if (!user.isAdmin && !user.canManageTrees && !isOwner && !isAdopter) {
                return res.status(403).json({ message: 'Acesso negado.' })
            }

            const role = isOwner ? 'donor' : 'adopter'
            const entry = {
                role,
                message: message.trim(),
                createdAt: new Date(),
            }
            request.messages.push(entry)
            await request.save()
            await syncPetLegacyFields(request.pet)

            await touchPresence(requestId, role, { heartbeat: true, markSeen: true })

            const petDoc = await Pet.findById(request.pet).populate(
                'user',
                'name email phone'
            )
            const adopterUser = await User.findById(request.adopter).select('name email phone')

            if (role === 'donor') {
                await notifyAdopterNewMessage({
                    adopter: adopterUser,
                    owner: petDoc?.user,
                    petName: petDoc?.name || 'Pet',
                    messageText: entry.message,
                })
            } else {
                await notifyOwnerNewMessage({
                    owner: petDoc?.user,
                    adopter: adopterUser,
                    petName: petDoc?.name || 'Pet',
                    messageText: entry.message,
                })
            }

            void recordAudit(req, {
                action: 'adoption_request.message_send',
                resourceType: 'adoption_request',
                resourceId: requestId,
                module: 'garca_pet',
                eventType: 'CREATE',
                metadata: { role, petId: String(request.pet), messageLength: entry.message.length },
            })

            return res.status(200).json({
                message: 'Mensagem enviada. O destinatário foi notificado por e-mail.',
                adoptionRequest: {
                    _id: request._id,
                    messages: request.messages,
                },
                emailNotified: true,
            })
        } catch (err) {
            console.error('[AdoptionRequest.sendMessage]', err)
            return res.status(500).json({ message: 'Erro ao enviar mensagem.' })
        }
    }

    /** POST /adoption-requests/:requestId/conclude */
    static async conclude(req, res) {
        const { requestId } = req.params
        return AdoptionRequestController.updateStatus(
            {
                ...req,
                params: { requestId },
                body: { status: 'concluida', message: req.body?.message },
            },
            res
        )
    }

    /** GET /pets/admin/adoption-queue — admin */
    static async adminQueue(req, res) {
        const user = await getUserByToken(getToken(req))
        if (!user.isAdmin && !user.canManageTrees) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }

        const requests = await AdoptionRequest.find({
            status: { $in: ['enviada', 'em_analise'] },
        })
            .populate('adopter', 'name email phone')
            .populate('pet', 'name type available')
            .sort('createdAt')
            .limit(200)

        void recordAudit(req, {
            action: 'adoption_request.admin_queue_view',
            resourceType: 'adoption_request',
            module: 'garca_pet',
            eventType: 'VIEW',
            metadata: { count: requests.length },
        })

        return res.status(200).json({ requests })
    }

    /** POST /pets/:petId/report */
    static async reportPet(req, res) {
        const petId = req.params.petId || req.params.id
        const { reason, description } = req.body
        if (!reason?.trim()) {
            return res.status(422).json({ message: 'Informe o motivo da denúncia.' })
        }

        const pet = await Pet.findById(petId)
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado.' })

        const user = await getUserByToken(getToken(req))
        const report = await PetReport.create({
            pet: petId,
            reporter: user?._id || null,
            reason: reason.trim(),
            description: String(description || '').trim(),
        })

        await recordAudit(req, {
            action: 'pet.report',
            resourceType: 'pet_report',
            resourceId: report._id,
            module: 'garca_pet',
            eventType: 'CREATE',
            metadata: { petId },
        })

        return res.status(201).json({ message: 'Denúncia registrada. Nossa equipe irá analisar.', report })
    }

    /** GET /pets/admin/reports */
    static async adminReports(req, res) {
        const user = await getUserByToken(getToken(req))
        if (!user.isAdmin && !user.canManageTrees) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }
        const reports = await PetReport.find({ status: { $in: ['aberta', 'em_analise'] } })
            .populate('pet', 'name images available')
            .populate('reporter', 'name email')
            .sort('-createdAt')
            .limit(100)

        void recordAudit(req, {
            action: 'pet.admin_reports_view',
            resourceType: 'pet_report',
            module: 'garca_pet',
            eventType: 'VIEW',
            metadata: { count: reports.length },
        })

        return res.status(200).json({ reports })
    }

    /** PATCH /pets/admin/:petId/suspend */
    static async suspendPet(req, res) {
        const petId = req.params.petId
        const user = await getUserByToken(getToken(req))
        if (!user.isAdmin && !user.canManageTrees) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }
        const pet = await Pet.findByIdAndUpdate(
            petId,
            { available: false },
            { new: true }
        )
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado.' })
        await recordAudit(req, {
            action: 'pet.suspend',
            resourceType: 'pet',
            resourceId: petId,
        })
        return res.status(200).json({ message: 'Anúncio suspenso.', pet })
    }
}
