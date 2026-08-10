const AdoptionRequest = require('../models/AdoptionRequest')
const Pet = require('../models/Pet')
const ObjectId = require('mongoose').Types.ObjectId

/** Pretendentes aguardando decisão (selo "N na fila" no catálogo) */
const OPEN_QUEUE_COUNT_STATUSES = ['enviada', 'em_analise']

/** Contagem legada (inclui aprovada — evitar no card público) */
const QUEUE_COUNT_STATUSES = ['enviada', 'em_analise', 'aprovada']

/** Solicitações que ocupam vaga na fila (para posição / painel do doador) */
const QUEUE_POSITION_STATUSES = ['enviada', 'em_analise', 'aprovada']

const LEGACY_STATUS_MAP = {
    enviada: 'Pendente',
    em_analise: 'Em análise',
    aprovada: 'Aprovado',
    recusada: 'Recusado',
    concluida: 'Finalizado',
}

/** Considerado "online" se heartbeat nos últimos 60s */
const ONLINE_THRESHOLD_MS = 60 * 1000

function toIdString(value) {
    if (!value) return null
    if (typeof value === 'string') return value
    if (value._id) return String(value._id)
    return String(value)
}

function isParticipantOnline(lastActiveAt) {
    if (!lastActiveAt) return false
    return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS
}

function resolveViewerRole(pet, request, user) {
    if (!pet || !request || !user) return null
    if (toIdString(pet.user) === user._id.toString()) return 'donor'
    if (toIdString(request.adopter) === user._id.toString()) return 'adopter'
    if (user.isAdmin || user.canManageTrees) return 'admin'
    return null
}

function buildChatPresence(request, viewerRole) {
    const donor = {
        lastSeenAt: request.donorLastSeenAt,
        lastActiveAt: request.donorLastActiveAt,
        online: isParticipantOnline(request.donorLastActiveAt),
    }
    const adopter = {
        lastSeenAt: request.adopterLastSeenAt,
        lastActiveAt: request.adopterLastActiveAt,
        online: isParticipantOnline(request.adopterLastActiveAt),
    }
    const other = viewerRole === 'donor' ? adopter : donor
    return { donor, adopter, other, viewerRole }
}

async function touchPresence(requestId, role, opts = {}) {
    const heartbeat = opts.heartbeat !== false
    const markSeen = opts.markSeen !== false
    const updates = {}
    const now = new Date()
    if (role === 'donor') {
        if (heartbeat) updates.donorLastActiveAt = now
        if (markSeen) updates.donorLastSeenAt = now
    } else if (role === 'adopter') {
        if (heartbeat) updates.adopterLastActiveAt = now
        if (markSeen) updates.adopterLastSeenAt = now
    }
    if (Object.keys(updates).length) {
        await AdoptionRequest.findByIdAndUpdate(requestId, { $set: updates })
    }
}

async function countApplicantsForPet(petId) {
    return AdoptionRequest.countDocuments({
        pet: petId,
        status: { $in: QUEUE_COUNT_STATUSES },
    })
}

async function countOpenApplicantsForPet(petId) {
    return AdoptionRequest.countDocuments({
        pet: petId,
        status: { $in: OPEN_QUEUE_COUNT_STATUSES },
    })
}

async function attachApplicantsCountsToPets(pets) {
    if (!pets?.length) return
    const ids = pets.map((p) => p._id)
    const [openRows, approvedPetIds, concludedPetIds] = await Promise.all([
        AdoptionRequest.aggregate([
            {
                $match: {
                    pet: { $in: ids },
                    status: { $in: OPEN_QUEUE_COUNT_STATUSES },
                },
            },
            { $group: { _id: '$pet', applicantsCount: { $sum: 1 } } },
        ]),
        AdoptionRequest.distinct('pet', { pet: { $in: ids }, status: 'aprovada' }),
        AdoptionRequest.distinct('pet', { pet: { $in: ids }, status: 'concluida' }),
    ])
    const openMap = new Map(openRows.map((r) => [String(r._id), r.applicantsCount]))
    const approvedSet = new Set(approvedPetIds.map((id) => String(id)))
    const concludedSet = new Set(concludedPetIds.map((id) => String(id)))
    const legacyQueueStatuses = ['Pendente', 'Em análise']

    pets.forEach((p) => {
        const petKey = String(p._id)
        let openCount = openMap.get(petKey) || 0
        const adopterId = toIdString(p.adopter)
        if (
            openCount === 0 &&
            adopterId &&
            legacyQueueStatuses.includes(p.adopterStatus)
        ) {
            openCount = 1
        }

        const hasApprovedAdoption =
            approvedSet.has(petKey) || p.adopterStatus === 'Aprovado'
        const isAdopted =
            concludedSet.has(petKey) ||
            p.adopterStatus === 'Finalizado' ||
            p.available === false

        p.openApplicantsCount = openCount
        p.applicantsCount = openCount
        p.hasApplicants = openCount > 0
        p.hasApprovedAdoption = hasApprovedAdoption
        p.isAdoptedListing = isAdopted
        p.acceptingApplications =
            !!p.available &&
            !isAdopted &&
            !hasApprovedAdoption &&
            p.adopterStatus !== 'Finalizado'
    })
}

async function getQueueMetaForRequest(request) {
    const petId = request.pet
    const createdAt = request.createdAt
    const position = await AdoptionRequest.countDocuments({
        pet: petId,
        status: { $in: QUEUE_POSITION_STATUSES },
        createdAt: { $lte: createdAt },
    })
    const total = await countApplicantsForPet(petId)
    return { position, total }
}

async function getActiveRequestForUserOnPet(petId, userId) {
    return AdoptionRequest.findOne({
        pet: petId,
        adopter: userId,
        status: { $in: QUEUE_POSITION_STATUSES },
    }).sort('createdAt')
}

/**
 * Mantém campos legados no Pet para compatibilidade com o front React atual.
 * Prioridade: aprovada > mais antiga na fila ativa.
 */
async function syncPetLegacyFields(petId) {
    const pet = await Pet.findById(petId)
    if (!pet) return null

    const approved = await AdoptionRequest.findOne({
        pet: petId,
        status: 'aprovada',
    }).sort('createdAt')

    const primary =
        approved ||
        (await AdoptionRequest.findOne({
            pet: petId,
            status: { $in: ['enviada', 'em_analise'] },
        }).sort('createdAt'))

    const concluded = await AdoptionRequest.findOne({
        pet: petId,
        status: 'concluida',
    })

    if (concluded) {
        pet.available = false
        pet.adopter = concluded.adopter
        pet.adopterStatus = 'Finalizado'
        pet.deliveryAddress = concluded.initialMessage || pet.deliveryAddress
        await pet.save()
        return pet
    }

    if (primary) {
        pet.adopter = primary.adopter
        pet.adopterStatus = LEGACY_STATUS_MAP[primary.status] || 'Pendente'
        pet.deliveryAddress = primary.initialMessage
        pet.adopterMessages = primary.messages
        // Aprovado: sai do catálogo público; pendente/em análise: continua disponível para novas solicitações
        pet.available = primary.status !== 'aprovada'
        await pet.save()
        return pet
    }

    pet.adopter = null
    pet.adopterStatus = null
    pet.deliveryAddress = null
    pet.available = true
    await pet.save()
    return pet
}

async function closeOtherActiveRequests(petId, exceptRequestId, finalStatus = 'encerrada_outro_aprovado') {
    await AdoptionRequest.updateMany(
        {
            pet: petId,
            _id: { $ne: exceptRequestId },
            status: { $in: QUEUE_POSITION_STATUSES },
        },
        {
            $set: { status: finalStatus },
            $push: {
                messages: {
                    role: 'system',
                    message:
                        'A solicitação foi encerrada porque outro pretendente foi selecionado para adoção.',
                    createdAt: new Date(),
                },
            },
        }
    )
}

function getPublicCatalogQuery() {
    return {
        available: true,
        adopterStatus: { $nin: ['Finalizado', 'Aprovado'] },
    }
}

/** Fila ativa por pet (tela Meus Pets / Gerenciar Pets) */
/**
 * Flags por pet para o viewer autenticado (catálogo e detalhe).
 * Não impede doador de adotar outros pets — só bloqueia próprio pet e duplicata na fila.
 */
async function attachAdoptionEligibilityToPets(pets, viewer) {
    if (!pets?.length) return

    if (!viewer?._id) {
        pets.forEach((p) => {
            p.isOwnPet = false
            p.hasActiveRequestForMe = false
            p.canRequestAdoption = false
            p.blockReason = 'login_required'
        })
        return
    }

    const viewerId = String(viewer._id)
    const petIds = pets.map((p) => p._id)
    const myRequests = await AdoptionRequest.find({
        pet: { $in: petIds },
        adopter: viewer._id,
        status: { $in: QUEUE_POSITION_STATUSES },
    }).sort('createdAt')

    const reqByPet = new Map()
    for (const r of myRequests) {
        const key = String(r.pet)
        if (!reqByPet.has(key)) reqByPet.set(key, r)
    }

    await Promise.all(
        pets.map(async (p) => {
            const ownerId = toIdString(p.user)
            p.isOwnPet = ownerId === viewerId
            const myReq = reqByPet.get(String(p._id))
            p.hasActiveRequestForMe = !!myReq

            const accepting =
                p.acceptingApplications !== undefined
                    ? !!p.acceptingApplications
                    : !!p.available &&
                      p.adopterStatus !== 'Finalizado' &&
                      !p.hasApprovedAdoption

            if (p.isOwnPet) {
                p.canRequestAdoption = false
                p.blockReason = 'own_pet'
            } else if (myReq && myReq.status === 'aprovada') {
                p.canRequestAdoption = false
                p.blockReason = 'adoption_approved'
                p.adoptionRequestId = myReq._id
                p.adopterStatus = LEGACY_STATUS_MAP.aprovada
                p.hasApprovedAdoption = true
                const meta = await getQueueMetaForRequest(myReq)
                p.myQueuePosition = meta.position
                p.myQueueTotal = meta.total
            } else if (!accepting) {
                p.canRequestAdoption = false
                p.blockReason = 'not_available'
            } else if (myReq) {
                p.canRequestAdoption = false
                p.blockReason = 'already_in_queue'
                p.adoptionRequestId = myReq._id
                const meta = await getQueueMetaForRequest(myReq)
                p.myQueuePosition = meta.position
                p.myQueueTotal = meta.total
                p.adopterStatus = LEGACY_STATUS_MAP[myReq.status] || myReq.status
            } else {
                p.canRequestAdoption = true
                p.blockReason = null
            }
        })
    )
}

async function attachAdoptionQueuesToPets(pets) {
    if (!pets?.length) return

    const ids = pets.map((p) => p._id)
    const requests = await AdoptionRequest.find({
        pet: { $in: ids },
        status: { $in: QUEUE_POSITION_STATUSES },
    })
        .populate('adopter', 'name phone email image userType instituteName')
        .sort('createdAt')

    const byPet = new Map()
    for (const r of requests) {
        const key = String(r.pet)
        if (!byPet.has(key)) byPet.set(key, [])
        byPet.get(key).push(r)
    }

    await Promise.all(
        pets.map(async (p) => {
            const list = byPet.get(String(p._id)) || []
            p.adoptionQueue = await Promise.all(
                list.map(async (r) => {
                    const meta = await getQueueMetaForRequest(r)
                    return {
                        _id: r._id,
                        status: r.status,
                        legacyStatus: LEGACY_STATUS_MAP[r.status] || r.status,
                        position: meta.position,
                        total: meta.total,
                        initialMessage: r.initialMessage,
                        messages: Array.isArray(r.messages) ? r.messages : [],
                        adopter: r.adopter,
                        createdAt: r.createdAt,
                    }
                })
            )
        })
    )
}

module.exports = {
    OPEN_QUEUE_COUNT_STATUSES,
    QUEUE_COUNT_STATUSES,
    QUEUE_POSITION_STATUSES,
    LEGACY_STATUS_MAP,
    toIdString,
    countApplicantsForPet,
    countOpenApplicantsForPet,
    attachApplicantsCountsToPets,
    attachAdoptionEligibilityToPets,
    attachAdoptionQueuesToPets,
    ONLINE_THRESHOLD_MS,
    isParticipantOnline,
    resolveViewerRole,
    buildChatPresence,
    touchPresence,
    getQueueMetaForRequest,
    getActiveRequestForUserOnPet,
    syncPetLegacyFields,
    closeOtherActiveRequests,
    getPublicCatalogQuery,
}
