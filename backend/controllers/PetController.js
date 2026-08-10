const Pet = require("../models/Pet")
const PetVaccine = require("../models/PetVaccine")
const AdoptionRequest = require("../models/AdoptionRequest")
const AdoptionRequestController = require("./AdoptionRequestController")

// helpers 
const getToken = require("../helpers/get-token")
const getUserByToken = require("../helpers/get-user-by-token")
const ObjectId = require('mongoose').Types.ObjectId
const { sendMail } = require('../helpers/mailer')
const { recordAudit, recordChange, filesFromMulter } = require('../helpers/audit-log')
const {
    attachApplicantsCountsToPets,
    attachAdoptionEligibilityToPets,
    attachAdoptionQueuesToPets,
    getPublicCatalogQuery,
    getActiveRequestForUserOnPet,
    syncPetLegacyFields,
    QUEUE_POSITION_STATUSES,
} = require('../helpers/adoption-request-service')

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())

const PET_GENDERS = ['Macho', 'Fêmea']
const ACTIVE_ADOPTION_STATUSES = ['Pendente', 'Em análise', 'Aprovado']

function normalizeChip(value) {
    if (value === undefined || value === null) return null
    const chip = String(value).trim()
    return chip.length ? chip : null
}

/** Índice único sparse indexa `null`; pets sem chip não devem gravar o campo. */
function applyChipToDocument(target, normalizedChip) {
    if (normalizedChip) {
        target.chip = normalizedChip
        return
    }
    if (target.chip !== undefined) {
        delete target.chip
    }
}

function toIdString(value) {
    if (!value) return null
    if (typeof value === 'string') return value
    if (value._id) return String(value._id)
    return String(value)
}

function getPetOwnerId(pet) {
    return toIdString(pet?.user)
}

function getPetAdopterId(pet) {
    return toIdString(pet?.adopter)
}

function validateGenderAndBreed(gender, breed) {
    if (!gender || !PET_GENDERS.includes(gender)) {
        return 'O gênero é obrigatório (Macho ou Fêmea).'
    }
    if (!breed || !String(breed).trim()) {
        return 'A raça é obrigatória!'
    }
    return null
}

/**
 * Nível de exposição de perfil:
 * - public: sem telefone/e-mail
 * - participant: doador/adotante do processo
 * - admin: equipe autorizada
 */
function toPublicProfile(user, level = 'public') {
    if (!user) return null
    const base = {
        _id: user._id,
        name: user.name,
        image: user.image,
        userType: user.userType,
        instituteName: user.instituteName,
    }
    if (level === 'participant' || level === 'admin') {
        return {
            ...base,
            phone: user.phone,
            email: user.email,
        }
    }
    return base
}

async function resolvePetVisibilityLevel(pet, viewer) {
    if (!viewer?._id) return 'public'
    const viewerId = String(viewer._id)
    if (viewer.isAdmin || viewer.canManageTrees) return 'admin'
    const ownerId = getPetOwnerId(pet)
    if (ownerId === viewerId) return 'participant'
    const adopterId = getPetAdopterId(pet)
    if (adopterId === viewerId) return 'participant'
    const myReq = await getActiveRequestForUserOnPet(pet._id, viewer._id)
    if (myReq) return 'participant'
    return 'public'
}

function mapVaccinesCompat(vaccinations) {
    return (vaccinations || []).map(v => ({
        _id: v._id,
        vaccineName: v.nomeVacina,
        applicationDate: v.dataAplicacao,
        nextDueDate: v.proximaDose || null,
        notes: v.observacoes || '',
        dose: v.dose || '1a dose',
        status: v.status || 'aplicada',
    }))
}

function toPublicPet(pet, visibilityLevel = 'public') {
    // Campos calculados em runtime (não estão no schema Pet) — ler antes do toObject()
    const runtimeExtras = {
        applicantsCount: pet.applicantsCount,
        hasApplicants: pet.hasApplicants,
        hasApprovedAdoption: pet.hasApprovedAdoption,
        isAdoptedListing: pet.isAdoptedListing,
        acceptingApplications: pet.acceptingApplications,
        myQueuePosition: pet.myQueuePosition,
        myQueueTotal: pet.myQueueTotal,
        adoptionQueue: pet.adoptionQueue,
        isOwnPet: pet.isOwnPet,
        hasActiveRequestForMe: pet.hasActiveRequestForMe,
        canRequestAdoption: pet.canRequestAdoption,
        blockReason: pet.blockReason,
    }

    const base = typeof pet.toObject === 'function' ? pet.toObject() : { ...pet }
    const vaccinations = Array.isArray(base.vaccinations) ? base.vaccinations : []
    const vaccinesCompat = mapVaccinesCompat(vaccinations)

    const isRestricted = visibilityLevel === 'public'
    const adopterStatus = base.adopterStatus
    const hasActiveAdoption =
        !!getPetAdopterId(base) &&
        ACTIVE_ADOPTION_STATUSES.includes(adopterStatus)

    const applicantsCount =
        runtimeExtras.applicantsCount ?? base.applicantsCount ?? 0
    const hasApplicants =
        runtimeExtras.hasApplicants ?? applicantsCount > 0
    const hasApprovedAdoption =
        runtimeExtras.hasApprovedAdoption ??
        base.hasApprovedAdoption ??
        base.adopterStatus === 'Aprovado'
    const isAdoptedListing =
        runtimeExtras.isAdoptedListing ??
        base.isAdoptedListing ??
        (base.adopterStatus === 'Finalizado' || base.available === false)
    const acceptingApplications =
        runtimeExtras.acceptingApplications ??
        (base.available !== false &&
            !isAdoptedListing &&
            !hasApprovedAdoption &&
            base.adopterStatus !== 'Finalizado')

    const payload = {
        ...base,
        vaccinations,
        vaccines: vaccinesCompat,
        vaccinesCount: vaccinesCompat.length,
        user: toPublicProfile(base.user, visibilityLevel),
        applicantsCount,
        hasApplicants,
        hasApprovedAdoption,
        isAdoptedListing,
        acceptingApplications,
        hasActiveAdoption: isRestricted
            ? applicantsCount > 0 || hasApprovedAdoption || hasActiveAdoption
            : undefined,
        myQueuePosition: runtimeExtras.myQueuePosition ?? base.myQueuePosition,
        myQueueTotal: runtimeExtras.myQueueTotal ?? base.myQueueTotal,
        isOwnPet: runtimeExtras.isOwnPet ?? false,
        hasActiveRequestForMe: runtimeExtras.hasActiveRequestForMe ?? false,
        canRequestAdoption: runtimeExtras.canRequestAdoption,
        blockReason: runtimeExtras.blockReason ?? null,
    }

    if (visibilityLevel === 'participant' || visibilityLevel === 'admin') {
        payload.adoptionQueue = runtimeExtras.adoptionQueue ?? []
    }

    if (isRestricted) {
        payload.adopter = null
        payload.deliveryAddress = undefined
        payload.adopterMessages = []
    } else {
        payload.adopter = toPublicProfile(base.adopter, visibilityLevel)
    }

    return payload
}

async function getOptionalViewer(req) {
    const token = getToken(req)
    if (!token) return null
    try {
        return await getUserByToken(token)
    } catch (_) {
        return null
    }
}

function toValidDate(value) {
    if (!value) return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

function parseVaccinationsInput(value) {
    if (value === undefined || value === null || value === '') return []
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed : []
        } catch (_) {
            return []
        }
    }
    return []
}

function normalizeVaccination(item = {}) {
    const nomeVacina = String(item.nomeVacina || item.vaccineName || '').trim()
    const dataAplicacaoRaw = item.dataAplicacao || item.applicationDate
    const proximaDoseRaw = item.proximaDose || item.nextDueDate
    const observacoes = String(item.observacoes || item.notes || '').trim()

    const touched = !!(nomeVacina || dataAplicacaoRaw || proximaDoseRaw || observacoes)
    if (!touched) return null
    if (!nomeVacina) throw new Error('nomeVacina é obrigatório ao cadastrar vacina.')
    const dataAplicacao = toValidDate(dataAplicacaoRaw)
    if (!dataAplicacao) throw new Error('dataAplicacao é obrigatória e deve ser válida.')

    const proximaDose = proximaDoseRaw ? toValidDate(proximaDoseRaw) : null
    if (proximaDoseRaw && !proximaDose) throw new Error('proximaDose inválida.')

    return { nomeVacina, dataAplicacao, proximaDose, observacoes }
}

function normalizeVaccinationsList(rawVaccinations) {
    const incoming = parseVaccinationsInput(rawVaccinations)
    const out = []
    for (const item of incoming) {
        const normalized = normalizeVaccination(item)
        if (normalized) out.push(normalized)
    }
    return out
}

async function attachVaccinesToPets(pets) {
    if (!pets || pets.length === 0) return
    const idsNeedingLegacy = pets.filter(p => !(Array.isArray(p.vaccinations) && p.vaccinations.length)).map(p => p._id)
    let legacyByPet = new Map()
    if (idsNeedingLegacy.length) {
        const legacy = await PetVaccine.find({ pet: { $in: idsNeedingLegacy } }).sort({ applicationDate: -1 }).lean()
        legacyByPet = new Map()
        legacy.forEach(v => {
            const key = String(v.pet)
            if (!legacyByPet.has(key)) legacyByPet.set(key, [])
            legacyByPet.get(key).push({
                nomeVacina: v.vaccineName,
                dataAplicacao: v.applicationDate,
                proximaDose: v.nextDueDate || null,
                observacoes: v.notes || '',
            })
        })
    }

    pets.forEach(p => {
        if (!Array.isArray(p.vaccinations) || !p.vaccinations.length) {
            p.vaccinations = legacyByPet.get(String(p._id)) || []
        }
        const vaccinesCompat = (p.vaccinations || []).map(v => ({
            _id: v._id,
            vaccineName: v.nomeVacina,
            applicationDate: v.dataAplicacao,
            nextDueDate: v.proximaDose || null,
            notes: v.observacoes || '',
            dose: '1a dose',
            status: 'aplicada',
        }))
        p.vaccines = vaccinesCompat
        p.vaccinesCount = vaccinesCompat.length
    })
}

async function notifyAdoptionRequested({ owner, adopter, petName }) {
    if (!owner?.email || !isValidEmail(owner.email)) return

    const subject = `Nova solicitação de adoção - ${petName}`
    const text = [
        `Olá ${owner.name || 'responsável'},`,
        '',
        `Você recebeu uma nova solicitação de adoção para o pet "${petName}".`,
        `Adotante: ${adopter?.name || 'Não informado'}`,
        '',
        'Acesse o Garça Pet para analisar a solicitação. Os dados de contato do adotante ficam disponíveis no sistema após sua análise.',
    ].join('\n')

    await sendMail({
        to: owner.email,
        subject,
        text,
        html: text.replace(/\n/g, '<br/>'),
    })
}

async function notifyAdoptionStatusUpdated({ adopter, owner, petName, status, message }) {
    if (!adopter?.email || !isValidEmail(adopter.email)) return

    const statusLabel = status || 'Atualizado'
    const ownerName = owner?.name || 'Responsável pelo pet'
    const lines = [
        `Olá ${adopter.name || 'adotante'},`,
        '',
        `O responsável (${ownerName}) respondeu sua solicitação de adoção do pet "${petName}".`,
        `Status: ${statusLabel}`,
        message ? `Mensagem: ${message}` : null,
    ]

    if (status === 'Aprovado' || status === 'Finalizado') {
        lines.push(
            '',
            'Seu pedido foi aprovado. Dados para contato:',
            `Responsável: ${ownerName}`,
            owner?.phone ? `Telefone: ${owner.phone}` : null,
            owner?.email ? `E-mail: ${owner.email}` : null,
            'Combine a entrega do animal pelo Garça Pet ou pelos canais informados.'
        )
    } else {
        lines.push('', 'Acompanhe os detalhes em Garça Pet.')
    }

    const text = lines.filter(Boolean).join('\n')

    await sendMail({
        to: adopter.email,
        subject: `Atualização da solicitação de adoção - ${petName}`,
        text,
        html: text.replace(/\n/g, '<br/>'),
    })
}

async function notifyAdoptionConcluded({ adopter, owner, petName }) {
    if (!adopter?.email || !isValidEmail(adopter.email)) return

    const text = [
        `Olá ${adopter.name || 'adotante'},`,
        '',
        `Sua adoção do pet "${petName}" foi confirmada por ${owner?.name || 'o responsável'}.`,
        'Parabéns! Entre em contato para alinhar os próximos passos.',
    ].join('\n')

    await sendMail({
        to: adopter.email,
        subject: `Adoção confirmada - ${petName}`,
        text,
        html: text.replace(/\n/g, '<br/>'),
    })
}

module.exports = class PetController {
    // create a pet
    static async create(req, res) {

        const { name, age, weight, color, gender, breed, type, size, chip, vaccinations, vaccines } = req.body

        const images = req.files

        const available = true

        // validations
        if (!name) {
            res.status(422).json({ message: 'O nome é obrigatório!' })
            return
        }

        if (!type) {
            res.status(422).json({ message: 'O tipo (Cachorro/Gato/Outros) é obrigatório!' })
            return
        }

        if (!size) {
            res.status(422).json({ message: 'O porte é obrigatório!' })
            return
        }

        if (!age) {
            res.status(422).json({ message: 'A idade é obrigatória!' })
            return
        }

        if (!weight) {
            res.status(422).json({ message: 'O peso é obrigatório!' })
            return
        }

        if (!color) {
            res.status(422).json({ message: 'A cor é obrigatória!' })
            return
        }

        if (images.length === 0) {
            res.status(422).json({ message: 'A imagem é obrigatória!' })
            return
        }

        const genderBreedError = validateGenderAndBreed(gender, breed)
        if (genderBreedError) {
            res.status(422).json({ message: genderBreedError })
            return
        }

        // get user
        const token = getToken(req)
        const user = await getUserByToken(token)

        const normalizedChip = normalizeChip(chip)
        if (normalizedChip) {
            const chipInUse = await Pet.findOne({ chip: normalizedChip })
            if (chipInUse) {
                return res.status(422).json({ message: 'Chip já cadastrado para outro pet.' })
            }
        }

        let normalizedVaccinations = []
        try {
            normalizedVaccinations = normalizeVaccinationsList(vaccinations !== undefined ? vaccinations : vaccines)
        } catch (error) {
            return res.status(422).json({ message: error.message })
        }

        const petPayload = {
            name,
            age,
            weight,
            color,
            gender,
            breed,
            type,
            size,
            available,
            images: [],
            user: user._id,
            vaccinations: normalizedVaccinations,
        }
        applyChipToDocument(petPayload, normalizedChip)
        const pet = new Pet(petPayload)

        images.map((image) => {
            pet.images.push(image.filename)
        })

        try {
            const newPet = await pet.save()
            await recordAudit(req, {
                action: 'pet.create',
                resourceType: 'pet',
                resourceId: newPet._id,
                module: 'garca_pet',
                eventType: 'CREATE',
                files: filesFromMulter(images),
                metadata: { type: newPet.type, size: newPet.size, imageCount: images.length },
            })

            res.status(201).json({
                message: 'Pet cadastrado com sucesso!',
                newPet: newPet,
            })
        } catch (error) {
            if (error?.code === 11000 && error?.keyPattern?.chip) {
                return res.status(422).json({ message: 'Chip já cadastrado para outro pet.' })
            }
            res.status(500).json({ message: error })
        }
    }

    // get all pets (catálogo público — disponíveis; exibe contagem de pretendentes)
    // Sem query page/limit: resposta legada (lista completa). Com page ou limit: paginação.
    static async getAll(req, res) {
        try {
            const baseQuery = getPublicCatalogQuery()
            const usePagination =
                req.query.page !== undefined || req.query.limit !== undefined

            let finder = Pet.find(baseQuery)
                .populate('user', 'name image userType instituteName')
                .populate('adopter', 'name image')
                .sort('-createdAt')

            let page
            let limit
            let total
            let pages

            if (usePagination) {
                page = Math.max(1, parseInt(req.query.page || '1', 10))
                limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)))
                const skip = (page - 1) * limit
                total = await Pet.countDocuments(baseQuery)
                finder = finder.skip(skip).limit(limit)
                pages = Math.max(1, Math.ceil(total / limit))
            }

            const pets = await finder
            await attachVaccinesToPets(pets)
            await attachApplicantsCountsToPets(pets)

            const viewer = await getOptionalViewer(req)
            await attachAdoptionEligibilityToPets(pets, viewer)

            const body = {
                pets: pets.map((p) => toPublicPet(p, 'public')),
            }
            if (usePagination) {
                body.page = page
                body.limit = limit
                body.total = total
                body.pages = pages
            }

            res.status(200).json(body)
        } catch (error) {
            console.error('[getAll pets] Erro:', error)
            res.status(500).json({ message: 'Erro ao listar pets.' })
        }
    }

    // get all user pets
    static async getAllUserPets(req, res) {
        // get user
        const token = getToken(req)
        const user = await getUserByToken(token)

        // Gestão do doador: todos os anúncios não finalizados (inclui adoção aprovada com available=false)
        const query = {
            user: new ObjectId(user._id),
            adopterStatus: { $ne: 'Finalizado' },
        }

        const pets = await Pet.find(query)
            .populate('user', 'name phone email image')
            .populate('adopter', 'name phone email image')
            .sort('-createdAt')
        await attachVaccinesToPets(pets)
        await attachApplicantsCountsToPets(pets)
        await attachAdoptionQueuesToPets(pets)

        res.status(200).json({
            pets: pets.map((p) => toPublicPet(p, 'participant')),
        })
    }

    // get all user adoptions (fila — adoption_requests)
    static async getAllUserAdoptions(req, res) {
        return AdoptionRequestController.listMine(req, res)
    }

    // get a specific pet
    static async getPetById(req, res) {
        const id = req.params.id

        // check if id is valid
        if (!ObjectId.isValid(id)) {
            res.status(422).json({ message: 'ID inválido!' })
            return
        }

        // check if pet exists
        const pet = await Pet.findOne({ _id: id })
            .populate('user', 'name image phone email userType instituteName')
            .populate('adopter', 'name image phone email userType instituteName')
        if (pet) await attachVaccinesToPets([pet])

        if (!pet) {
            res.status(404).json({ message: 'Pet não encontrado!' })
            return
        }

        await attachVaccinesToPets([pet])
        await attachApplicantsCountsToPets([pet])

        const viewer = await getOptionalViewer(req)
        const visibilityLevel = await resolvePetVisibilityLevel(pet, viewer)
        await attachAdoptionEligibilityToPets([pet], viewer)

        res.status(200).json({
            pet: toPublicPet(pet, visibilityLevel),
        })
    }

    // remove a pet
    static async removePetById(req, res) {
        const id = req.params.id

        // check if id is valid
        if (!ObjectId.isValid(id)) {
            res.status(422).json({ message: 'ID inválido!' })
            return
        }

        // check if pet exists
        const pet = await Pet.findOne({ _id: id })

        if (!pet) {
            res.status(404).json({ message: 'Pet não encontrado!' })
            return
        }

        // check if logged-in user registered the pet
        const token = getToken(req)
        const user = await getUserByToken(token)

        if (pet.user.toString() != user._id.toString()) {
            res.status(404).json({
                message:
                    'Solicitação inválida, tente novamente mais tarde!'
            })
            return
        }

        await Pet.findByIdAndDelete(id)
        await PetVaccine.deleteMany({ pet: id })
        await recordAudit(req, {
            action: 'pet.delete',
            resourceType: 'pet',
            resourceId: id,
            module: 'garca_pet',
            eventType: 'DELETE',
        })

        res.status(200).json({ message: 'Pet removido com sucesso!' })
    }

    // update a pet
    static async updatePet(req, res) {
        const id = req.params.id
        const { name, age, weight, color, gender, breed, type, size, available, chip, vaccinations, vaccines } = req.body

        const images = req.files

        const updatedData = {}

        // check if pet exists
        const pet = await Pet.findOne({ _id: id })

        if (!pet) {
            res.status(404).json({ message: 'Pet não encontrado!' })
            return
        }

        if (!pet.available) {
            res.status(422).json({
                message: 'Este pet já foi adotado e não pode mais ser editado!'
            })
            return
        }

        // check if logged-in user registered the pet
        const token = getToken(req)
        const user = await getUserByToken(token)

        if (pet.user.toString() != user._id.toString()) {
            res.status(404).json({
                message:
                    'Solicitação inválida, tente novamente mais tarde!'
            })
            return
        }

        // validations
        if (!name) {
            res.status(422).json({ message: 'O nome é obrigatório!' })
            return
        } else {
            updatedData.name = name
        }

        if (!type) {
            res.status(422).json({ message: 'O tipo (Cachorro/Gato/Outros) é obrigatório!' })
            return
        } else {
            updatedData.type = type
        }

        if (!size) {
            res.status(422).json({ message: 'O porte é obrigatório!' })
            return
        } else {
            updatedData.size = size
        }

        if (!age) {
            res.status(422).json({ message: 'A idade é obrigatória!' })
            return
        } else {
            updatedData.age = age
        }

        if (!weight) {
            res.status(422).json({ message: 'O peso é obrigatório!' })
            return
        } else {
            updatedData.weight = weight
        }

        if (!color) {
            res.status(422).json({ message: 'A cor é obrigatória!' })
            return
        } else {
            updatedData.color = color
        }

        if (gender !== undefined || breed !== undefined) {
            const genderBreedError = validateGenderAndBreed(
                gender !== undefined ? gender : pet.gender,
                breed !== undefined ? breed : pet.breed
            )
            if (genderBreedError) {
                return res.status(422).json({ message: genderBreedError })
            }
        }
        if (gender !== undefined) updatedData.gender = gender
        if (breed !== undefined) updatedData.breed = breed

        const normalizedChip = normalizeChip(chip)
        if (normalizedChip) {
            const chipInUse = await Pet.findOne({
                chip: normalizedChip,
                _id: { $ne: id }
            })
            if (chipInUse) {
                return res.status(422).json({ message: 'Chip já cadastrado para outro pet.' })
            }
            updatedData.chip = normalizedChip
        } else if (chip !== undefined) {
            delete updatedData.chip
        }

        if (images.length > 0) {
            updatedData.images = []
            images.map((image) => {
                updatedData.images.push(image.filename)
            })
        }

        if (available !== undefined) {
            updatedData.available = available
        }

        if (vaccinations !== undefined || vaccines !== undefined) {
            try {
                updatedData.vaccinations = normalizeVaccinationsList(vaccinations !== undefined ? vaccinations : vaccines)
            } catch (error) {
                return res.status(422).json({ message: error.message })
            }
        }

        const before = {
            name: pet.name,
            age: pet.age,
            weight: pet.weight,
            color: pet.color,
            gender: pet.gender,
            breed: pet.breed,
            type: pet.type,
            size: pet.size,
            available: pet.available,
            chip: pet.chip,
        }

        try {
            const updateOp = {}
            if (Object.keys(updatedData).length > 0) {
                updateOp.$set = updatedData
            }
            if (chip !== undefined && !normalizedChip) {
                updateOp.$unset = { chip: '' }
            }
            await Pet.findByIdAndUpdate(id, updateOp)
        } catch (error) {
            if (error?.code === 11000 && error?.keyPattern?.chip) {
                return res.status(422).json({ message: 'Chip já cadastrado para outro pet.' })
            }
            return res.status(500).json({ message: 'Erro ao atualizar pet.' })
        }
        const after = { ...before, ...updatedData }
        if (images.length > 0) {
            after.images = updatedData.images
            before.images = pet.images
        }
        await recordChange(req, {
            action: 'pet.update',
            resourceType: 'pet',
            resourceId: id,
            module: 'garca_pet',
            eventType: images.length > 0 ? 'UPLOAD' : 'UPDATE',
            before,
            after,
            fields: ['name', 'age', 'weight', 'color', 'gender', 'breed', 'type', 'size', 'available', 'chip', 'images'],
            files: images.length > 0 ? filesFromMulter(images) : undefined,
        })

        res.status(200).json({ message: 'Pet atualizado com sucesso!', updatedData })
    }

    // schedule — compat: cria entrada na fila (adoption_requests)
    static async schedule(req, res) {
        req.params.petId = req.params.id
        return AdoptionRequestController.create(req, res)
    }

    // CONCLUDE ADOPTION
    static async concludeAdoption(req, res) {
        const id = req.params.id

        // check if pet exists
        const pet = await Pet.findOne({ _id: id })
            .populate('user', 'name email')
            .populate('adopter', 'name email')

        if (!pet) {
            return res.status(404).json({ message: 'Pet não encontrado!' })
        }

        // check if logged-in user registered the pet
        const token = getToken(req)
        const user = await getUserByToken(token)

        const ownerId = pet.user?._id ? pet.user._id.toString() : pet.user?.toString()
        const isOwner = ownerId === user._id.toString()

        if (!user.isAdmin && !user.canManageTrees && !isOwner) {
            return res.status(422).json({
                message: 'Somente o dono do pet ou um administrador autorizado pode concluir a adoção.'
            })
        }

        let request = null
        const bodyRequestId = req.body?.requestId
        if (bodyRequestId && ObjectId.isValid(bodyRequestId)) {
            request = await AdoptionRequest.findOne({ _id: bodyRequestId, pet: id })
        }
        if (!request) {
            request =
                (await AdoptionRequest.findOne({ pet: id, status: 'aprovada' }).sort('createdAt')) ||
                (await AdoptionRequest.findOne({
                    pet: id,
                    status: { $in: QUEUE_POSITION_STATUSES },
                }).sort('createdAt'))
        }

        if (!request && !pet.adopter) {
            return res.status(422).json({ message: 'Nenhuma solicitação encontrada para concluir.' })
        }

        if (request) {
            req.params.requestId = request._id
            return AdoptionRequestController.updateStatus(
                { ...req, body: { status: 'concluida', message: req.body?.message } },
                res
            )
        }

        await Pet.findByIdAndUpdate(id, {
            $set: { available: false, adopterStatus: 'Finalizado' },
            $push: {
                adopterMessages: {
                    role: 'system',
                    message: 'Adoção finalizada com sucesso!',
                    createdAt: new Date(),
                },
            },
        })

        await notifyAdoptionConcluded({
            adopter: pet.adopter,
            owner: pet.user,
            petName: pet.name,
        })

        void recordAudit(req, {
            action: 'pet.conclude_adoption_legacy',
            resourceType: 'pet',
            resourceId: id,
            module: 'garca_pet',
            eventType: 'UPDATE',
            metadata: { legacy: true },
        })

        return res.status(200).json({ message: 'Adoção finalizada com sucesso!' })
    }

    // UPDATE ADOPTER STATUS (Em análise, etc)
    static async updateAdopterStatus(req, res) {
        const { id } = req.params
        const { status, message } = req.body

        const pet = await Pet.findById(id)
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado.' })

        const token = getToken(req)
        const user = await getUserByToken(token)

        const isOwner = pet.user.toString() === user._id.toString()

        if (!user.isAdmin && !user.canManageTrees && !isOwner) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }

        const legacyToNew = {
            Pendente: 'enviada',
            'Em análise': 'em_analise',
            Aprovado: 'aprovada',
            Recusado: 'recusada',
            Finalizado: 'concluida',
        }

        const validStatuses = ['Pendente', 'Em análise', 'Aprovado', 'Recusado', 'Finalizado']
        if (status && !validStatuses.includes(status)) {
            return res.status(422).json({ message: 'Status inválido.' })
        }

        const requestId = req.body.requestId
        let request = null
        if (requestId && ObjectId.isValid(requestId)) {
            request = await AdoptionRequest.findOne({ _id: requestId, pet: id })
        }
        if (!request) {
            request = await AdoptionRequest.findOne({
                pet: id,
                status: { $in: QUEUE_POSITION_STATUSES },
            }).sort('createdAt')
        }

        if (request && status) {
            req.params.requestId = request._id
            return AdoptionRequestController.updateStatus(
                {
                    ...req,
                    body: { status: legacyToNew[status] || status, message },
                },
                res
            )
        }

        if (!pet.adopter) {
            return res.status(422).json({ message: 'Nenhum pretendente na fila para atualizar.' })
        }

        return res.status(422).json({
            message: 'Use GET /pets/:id/adoption-requests para listar a fila e informe requestId ao atualizar.',
        })
    }

    // SEND MESSAGE (Interno no histórico)
    static async sendMessage(req, res) {
        const { id } = req.params
        const { message } = req.body

        if (!message || message.trim() === '') {
            return res.status(422).json({ message: 'A mensagem não pode estar vazia.' })
        }

        const token = getToken(req)
        const user = await getUserByToken(token)

        let request = null
        if (req.body.requestId && ObjectId.isValid(req.body.requestId)) {
            request = await AdoptionRequest.findById(req.body.requestId)
        }
        if (!request) {
            request = await AdoptionRequest.findOne({
                pet: id,
                $or: [{ adopter: user._id }, { status: { $in: QUEUE_POSITION_STATUSES } }],
            }).sort('createdAt')
        }

        if (request) {
            req.params.requestId = request._id
            return AdoptionRequestController.sendMessage(req, res)
        }

        const pet = await Pet.findById(id)
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado.' })

        const isOwner = getPetOwnerId(pet) === user._id.toString()
        const isAdopter = getPetAdopterId(pet) === user._id.toString()
        if (!isOwner && !isAdopter) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }

        const role = isOwner ? 'donor' : 'adopter'
        const trimmed = message.trim()
        await Pet.findByIdAndUpdate(id, {
            $push: {
                adopterMessages: {
                    role,
                    message: trimmed,
                    createdAt: new Date(),
                },
            },
        })
        void recordAudit(req, {
            action: 'pet.message_send_legacy',
            resourceType: 'pet',
            resourceId: id,
            module: 'garca_pet',
            eventType: 'CREATE',
            metadata: { role, messageLength: trimmed.length, legacy: true },
        })
        return res.status(200).json({ message: 'Mensagem enviada com sucesso!' })
    }

    // CANCEL ADOPTION (doador ou admin)
    static async cancelAdoption(req, res) {
        const { id } = req.params
        const pet = await Pet.findById(id)
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado.' })

        const token = getToken(req)
        const user = await getUserByToken(token)

        const isOwner = getPetOwnerId(pet) === user._id.toString()
        if (!user.isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }

        const requests = await AdoptionRequest.find({
            pet: id,
            status: { $in: QUEUE_POSITION_STATUSES },
        })

        if (requests.length) {
            await AdoptionRequest.updateMany(
                { pet: id, status: { $in: QUEUE_POSITION_STATUSES } },
                {
                    $set: { status: 'cancelada_doador' },
                    $push: {
                        messages: {
                            role: 'system',
                            message: 'Solicitação cancelada pelo responsável ou equipe.',
                            createdAt: new Date(),
                        },
                    },
                }
            )
        }

        await syncPetLegacyFields(id)
        await recordAudit(req, {
            action: 'pet.cancel_adoption',
            resourceType: 'pet',
            resourceId: id,
            module: 'garca_pet',
            eventType: 'UPDATE',
            metadata: { cancelledCount: requests.length },
        })

        return res.status(200).json({ message: 'Solicitações canceladas com sucesso!' })
    }

    // CANCEL ADOPTION (adotante desiste)
    static async cancelAdoptionByAdopter(req, res) {
        const { id } = req.params
        const user = await getUserByToken(getToken(req))

        const request = await getActiveRequestForUserOnPet(id, user._id)
        if (!request) {
            return res.status(404).json({ message: 'Você não possui solicitação ativa para este pet.' })
        }

        req.params.requestId = request._id
        return AdoptionRequestController.cancelByAdopter(req, res)
    }

    // LIST PET VACCINES
    static async listVaccines(req, res) {
        const { id } = req.params

        if (!ObjectId.isValid(id)) {
            return res.status(422).json({ message: 'ID inválido!' })
        }

        const pet = await Pet.findById(id)
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado!' })

        const vaccinations = Array.isArray(pet.vaccinations) ? pet.vaccinations : []
        const vaccines = vaccinations.map(v => ({
            _id: v._id,
            vaccineName: v.nomeVacina,
            applicationDate: v.dataAplicacao,
            nextDueDate: v.proximaDose || null,
            notes: v.observacoes || '',
        }))
        return res.status(200).json({ vaccines, vaccinations })
    }

    // ADD PET VACCINE
    static async addVaccine(req, res) {
        const { id } = req.params
        if (!ObjectId.isValid(id)) return res.status(422).json({ message: 'ID inválido!' })

        const pet = await Pet.findById(id)
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado!' })

        const token = getToken(req)
        const user = await getUserByToken(token)
        if (pet.user.toString() !== user._id.toString() && !user.isAdmin) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }

        let normalized
        try {
            normalized = normalizeVaccination(req.body)
        } catch (error) {
            return res.status(422).json({ message: error.message })
        }
        if (!normalized) return res.status(422).json({ message: 'Informe nome da vacina e data de aplicação válidos.' })

        pet.vaccinations = Array.isArray(pet.vaccinations) ? pet.vaccinations : []
        pet.vaccinations.push(normalized)
        await pet.save()
        const vaccine = pet.vaccinations[pet.vaccinations.length - 1]
        await recordAudit(req, {
            action: 'pet.vaccine.create',
            resourceType: 'pet',
            resourceId: id,
            metadata: { vaccineName: vaccine.nomeVacina },
        })

        return res.status(201).json({ message: 'Vacina registrada com sucesso!', vaccine })
    }

    // UPDATE PET VACCINE
    static async updateVaccine(req, res) {
        const { id, vaccineId } = req.params
        if (!ObjectId.isValid(id) || !ObjectId.isValid(vaccineId)) {
            return res.status(422).json({ message: 'ID inválido!' })
        }

        const pet = await Pet.findById(id)
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado!' })

        const token = getToken(req)
        const user = await getUserByToken(token)
        if (pet.user.toString() !== user._id.toString() && !user.isAdmin) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }

        pet.vaccinations = Array.isArray(pet.vaccinations) ? pet.vaccinations : []
        const existing = pet.vaccinations.id(vaccineId)
        if (!existing) return res.status(404).json({ message: 'Registro de vacina não encontrado.' })

        const nomeVacina = req.body.nomeVacina ?? req.body.vaccineName
        const dataAplicacao = req.body.dataAplicacao ?? req.body.applicationDate
        const proximaDose = req.body.proximaDose ?? req.body.nextDueDate
        const observacoes = req.body.observacoes ?? req.body.notes

        if (nomeVacina !== undefined) {
            const n = String(nomeVacina).trim()
            if (!n) return res.status(422).json({ message: 'nomeVacina não pode ser vazio.' })
            existing.nomeVacina = n
        }
        if (dataAplicacao !== undefined) {
            const d = toValidDate(dataAplicacao)
            if (!d) return res.status(422).json({ message: 'dataAplicacao inválida.' })
            existing.dataAplicacao = d
        }
        if (proximaDose !== undefined) {
            if (!proximaDose) existing.proximaDose = null
            else {
                const d = toValidDate(proximaDose)
                if (!d) return res.status(422).json({ message: 'proximaDose inválida.' })
                existing.proximaDose = d
            }
        }
        if (observacoes !== undefined) existing.observacoes = String(observacoes || '').trim()

        await pet.save()
        const vaccine = pet.vaccinations.id(vaccineId)

        await recordAudit(req, {
            action: 'pet.vaccine.update',
            resourceType: 'pet',
            resourceId: id,
            metadata: { vaccineId },
        })

        return res.status(200).json({ message: 'Vacina atualizada com sucesso!', vaccine })
    }

    // DELETE PET VACCINE
    static async removeVaccine(req, res) {
        const { id, vaccineId } = req.params
        if (!ObjectId.isValid(id) || !ObjectId.isValid(vaccineId)) {
            return res.status(422).json({ message: 'ID inválido!' })
        }

        const pet = await Pet.findById(id)
        if (!pet) return res.status(404).json({ message: 'Pet não encontrado!' })

        const token = getToken(req)
        const user = await getUserByToken(token)
        if (pet.user.toString() !== user._id.toString() && !user.isAdmin) {
            return res.status(403).json({ message: 'Acesso negado.' })
        }

        pet.vaccinations = Array.isArray(pet.vaccinations) ? pet.vaccinations : []
        const existing = pet.vaccinations.id(vaccineId)
        if (!existing) return res.status(404).json({ message: 'Registro de vacina não encontrado.' })
        existing.deleteOne()
        await pet.save()

        await recordAudit(req, {
            action: 'pet.vaccine.delete',
            resourceType: 'pet',
            resourceId: id,
            metadata: { vaccineId },
        })

        return res.status(200).json({ message: 'Vacina removida com sucesso!' })
    }
}
