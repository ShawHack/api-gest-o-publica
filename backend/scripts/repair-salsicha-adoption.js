#!/usr/bin/env node
/**
 * Reparo pontual: restaura adoção aprovada do pet Salsicha para MARJORIE TALBERG
 * quando a solicitação foi indevidamente marcada como cancelada_doador após aprovação.
 *
 * Uso: node scripts/repair-salsicha-adoption.js
 * (no container api: docker compose exec api node scripts/repair-salsicha-adoption.js)
 */
require('../models/Pet')
require('../models/AdoptionRequest')
require('../models/User')

const mongoose = require('../db/conn')
const Pet = mongoose.model('Pet')
const AdoptionRequest = mongoose.model('AdoptionRequest')
const { syncPetLegacyFields } = require('../helpers/adoption-request-service')

const PET_ID = '6a1982e532e0555afb2f21c6'
const REQUEST_ID = '6a19833432e0555afb2f222c'
const ADOPTER_ID = '68fa29e2f79757dbee40bfe2'

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI
    if (!uri) {
        console.error('MONGODB_URI não definida.')
        process.exit(1)
    }

    await mongoose.connect(uri)

    const request = await AdoptionRequest.findById(REQUEST_ID)
    if (!request) {
        console.error('Solicitação não encontrada:', REQUEST_ID)
        process.exit(1)
    }

    console.log('Status anterior:', request.status)

    if (request.status === 'aprovada' || request.status === 'concluida') {
        console.log('Solicitação já está em estado final positivo. Sincronizando pet...')
    } else {
        request.status = 'aprovada'
        request.messages.push({
            role: 'system',
            message: 'Status restaurado para Aprovado (reparo administrativo — cancelamento pós-aprovação revertido).',
            createdAt: new Date(),
        })
        await request.save()
        console.log('Solicitação restaurada para: aprovada')
    }

    const pet = await syncPetLegacyFields(PET_ID)
    if (pet) {
        console.log('Pet após sync:', {
            name: pet.name,
            available: pet.available,
            adopterStatus: pet.adopterStatus,
            adopter: String(pet.adopter),
        })
    }

    await mongoose.disconnect()
    console.log('Reparo concluído.')
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
