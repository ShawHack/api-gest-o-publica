const crypto = require('crypto')
const mongoose = require('../db/conn')
const User = require('../models/User')
const AgendaUnit = require('../models/AgendaUnit')
const AgendaService = require('../models/AgendaService')
const AgendaAppointment = require('../models/AgendaAppointment')
const AgendaUserAssignment = require('../models/AgendaUserAssignment')
const AgendaAvailabilityException = require('../models/AgendaAvailabilityException')
const {
  validateBookableStart,
  zonedParts,
  zonedDateTimeToUtc,
  timeToMinutes,
} = require('../helpers/agenda-time')
const { recordAudit } = require('../helpers/audit-service')

function actorId(req) {
  return req.user?._id || req.user?.id
}

function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

function protocol() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `AGD-${date}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

function validTimezone(value) {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: value }).format(new Date())
    return true
  } catch (_error) {
    return false
  }
}

function validAvailability(entries) {
  if (!Array.isArray(entries) || !entries.length) return false
  const seenDays = new Set()
  for (const entry of entries) {
    if (!Number.isInteger(entry.dayOfWeek) || entry.dayOfWeek < 0 || entry.dayOfWeek > 6) return false
    if (seenDays.has(entry.dayOfWeek) || !Array.isArray(entry.periods) || !entry.periods.length) return false
    seenDays.add(entry.dayOfWeek)
    const periods = entry.periods
      .map((period) => ({ start: timeToMinutes(period.start), end: timeToMinutes(period.end) }))
      .sort((a, b) => a.start - b.start)
    if (periods.some((period) => !Number.isFinite(period.start) || !Number.isFinite(period.end) || period.start >= period.end)) return false
    if (periods.some((period, index) => index > 0 && period.start < periods[index - 1].end)) return false
  }
  return true
}

function validPeriods(periods) {
  return validAvailability([{ dayOfWeek: 0, periods }])
}

function validDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function unitAllowed(req, unitId) {
  if (req.agenda?.isGlobalAdmin) return true
  return req.agenda?.assignments?.some((assignment) => (
    assignment.role === 'agenda_admin'
    && (!assignment.unitId || String(assignment.unitId) === String(unitId))
  ))
}

module.exports = class AgendaController {
  static async me(req, res) {
    const user = await User.findById(actorId(req)).select('_id name email phone role emailVerified').lean()
    if (!user) return res.status(401).json({ message: 'Usuário central não encontrado.' })
    return res.status(200).json({
      user,
      agenda: {
        isGlobalAdmin: !!req.agenda?.isGlobalAdmin,
        assignments: req.agenda?.assignments || [],
      },
      identitySource: 'users',
    })
  }

  static async listServices(_req, res) {
    const services = await AgendaService.find({ active: true })
      .select('unitId name slug description durationMinutes slotIntervalMinutes minimumNoticeMinutes bookingWindowDays cancellationNoticeMinutes weeklyAvailability')
      .populate('unitId', 'name slug timezone address')
      .sort({ name: 1 })
      .lean()
    return res.status(200).json({ items: services })
  }

  static async availability(req, res) {
    try {
      const serviceId = String(req.params.id || '')
      const dateKey = String(req.query?.date || '')
      if (!mongoose.Types.ObjectId.isValid(serviceId) || !validDateKey(dateKey)) {
        return res.status(422).json({ message: 'Serviço ou data inválida.' })
      }
      const service = await AgendaService.findOne({ _id: serviceId, active: true }).populate('unitId')
      if (!service || !service.unitId?.active) return res.status(404).json({ message: 'Serviço indisponível.' })
      const timezone = service.unitId.timezone || 'America/Sao_Paulo'
      const exception = await AgendaAvailabilityException.findOne({ serviceId, date: dateKey, active: true }).lean()
      let periods = []
      if (exception?.type === 'custom') {
        periods = exception.periods || []
      } else if (exception?.type !== 'closed') {
        const noon = zonedDateTimeToUtc(dateKey, '12:00', timezone)
        const dayOfWeek = zonedParts(noon, timezone).dayOfWeek
        periods = service.weeklyAvailability.find((entry) => entry.dayOfWeek === dayOfWeek)?.periods || []
      }

      const candidates = []
      for (const period of periods) {
        const periodStart = timeToMinutes(period.start)
        const periodEnd = timeToMinutes(period.end)
        for (let minute = periodStart; minute + service.durationMinutes <= periodEnd; minute += service.slotIntervalMinutes) {
          const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
          const startsAt = zonedDateTimeToUtc(dateKey, time, timezone)
          if (!validateBookableStart(service, service.unitId, startsAt)) candidates.push({ time, startsAt })
        }
      }

      const occupied = candidates.length
        ? await AgendaAppointment.find({
          serviceId,
          startsAt: { $in: candidates.map((slot) => slot.startsAt) },
          reservationKey: { $exists: true },
        }).select('startsAt').lean()
        : []
      const occupiedTimes = new Set(occupied.map((item) => item.startsAt.toISOString()))
      return res.status(200).json({
        service: { id: service._id, name: service.name, durationMinutes: service.durationMinutes },
        unit: { id: service.unitId._id, name: service.unitId.name, timezone },
        date: dateKey,
        exception: exception ? { type: exception.type, reason: exception.reason || '' } : null,
        slots: candidates.map((slot) => ({
          time: slot.time,
          startsAt: slot.startsAt,
          available: !occupiedTimes.has(slot.startsAt.toISOString()),
        })),
      })
    } catch (error) {
      return res.status(500).json({ message: 'Não foi possível consultar a disponibilidade.' })
    }
  }

  static async listMine(req, res) {
    const appointments = await AgendaAppointment.find({ userId: actorId(req) })
      .select('-reservationKey -identitySnapshot.email -identitySnapshot.phone')
      .populate('unitId', 'name slug timezone address')
      .populate('serviceId', 'name slug durationMinutes')
      .sort({ startsAt: -1 })
      .limit(200)
      .lean()
    return res.status(200).json({ items: appointments })
  }

  static async createAppointment(req, res) {
    try {
      const serviceId = String(req.body?.serviceId || '')
      const startsAt = new Date(req.body?.startsAt)
      if (!mongoose.Types.ObjectId.isValid(serviceId) || Number.isNaN(startsAt.getTime())) {
        return res.status(422).json({ message: 'Serviço, data ou horário inválido.' })
      }

      const service = await AgendaService.findOne({ _id: serviceId, active: true }).populate('unitId')
      if (!service || !service.unitId?.active) return res.status(404).json({ message: 'Serviço indisponível.' })
      const timeError = validateBookableStart(service, service.unitId, startsAt)
      if (timeError) return res.status(422).json({ message: timeError })

      const user = await User.findById(actorId(req)).select('_id name email phone emailVerified').lean()
      if (!user) return res.status(401).json({ message: 'Usuário central não encontrado.' })
      if (!user.emailVerified) return res.status(403).json({ message: 'Confirme seu e-mail antes de agendar.' })

      const appointment = await AgendaAppointment.create({
        userId: user._id,
        unitId: service.unitId._id,
        serviceId: service._id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + service.durationMinutes * 60000),
        reservationKey: `${service._id}:${startsAt.toISOString()}`,
        protocol: protocol(),
        source: ['web', 'mobile'].includes(req.body?.source) ? req.body.source : 'web',
        identitySnapshot: { name: user.name, email: user.email, phone: user.phone || '' },
        notes: String(req.body?.notes || '').trim(),
      })
      void recordAudit(req, {
        action: 'agenda.appointment.create',
        resourceType: 'agenda_appointment',
        resourceId: appointment._id,
        module: 'agenda-garca',
        eventType: 'CREATE',
        metadata: { serviceId: String(service._id), unitId: String(service.unitId._id), source: appointment.source },
      })
      const safeAppointment = appointment.toObject()
      delete safeAppointment.reservationKey
      return res.status(201).json({ appointment: safeAppointment })
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ message: 'Este horário acabou de ser reservado. Escolha outro.' })
      if (error?.name === 'ValidationError') return res.status(422).json({ message: 'Dados do agendamento inválidos.' })
      return res.status(500).json({ message: 'Não foi possível criar o agendamento.' })
    }
  }

  static async cancelMine(req, res) {
    try {
      const appointment = await AgendaAppointment.findOne({ _id: req.params.id, userId: actorId(req) }).populate('serviceId')
      if (!appointment) return res.status(404).json({ message: 'Agendamento não encontrado.' })
      if (!['booked', 'confirmed'].includes(appointment.status)) return res.status(409).json({ message: 'Este agendamento não pode mais ser cancelado.' })
      const cancellationLimit = Date.now() + appointment.serviceId.cancellationNoticeMinutes * 60000
      if (appointment.startsAt.getTime() < cancellationLimit) {
        return res.status(422).json({ message: 'O prazo para cancelamento online foi encerrado.' })
      }
      appointment.status = 'cancelled'
      appointment.cancelledAt = new Date()
      appointment.cancelledBy = actorId(req)
      appointment.cancellationReason = String(req.body?.reason || '').trim()
      appointment.reservationKey = undefined
      await appointment.save()
      void recordAudit(req, {
        action: 'agenda.appointment.cancel',
        resourceType: 'agenda_appointment',
        resourceId: appointment._id,
        module: 'agenda-garca',
        eventType: 'UPDATE',
      })
      return res.status(200).json({ appointment })
    } catch (error) {
      if (error?.name === 'CastError') return res.status(404).json({ message: 'Agendamento não encontrado.' })
      return res.status(500).json({ message: 'Não foi possível cancelar o agendamento.' })
    }
  }

  static async createUnit(req, res) {
    try {
      const name = String(req.body?.name || '').trim()
      const slug = normalizeSlug(req.body?.slug || name)
      const timezone = String(req.body?.timezone || 'America/Sao_Paulo').trim()
      if (!name || !slug) return res.status(422).json({ message: 'Informe nome e identificador da unidade.' })
      if (!validTimezone(timezone)) return res.status(422).json({ message: 'Fuso horário inválido.' })
      const unit = await AgendaUnit.create({
        name,
        slug,
        description: String(req.body?.description || '').trim(),
        timezone,
        address: String(req.body?.address || '').trim(),
        createdBy: actorId(req),
      })
      void recordAudit(req, {
        action: 'agenda.unit.create', resourceType: 'agenda_unit', resourceId: unit._id,
        module: 'agenda-garca', eventType: 'CREATE',
      })
      return res.status(201).json({ unit })
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ message: 'Já existe uma unidade com esse identificador.' })
      return res.status(500).json({ message: 'Não foi possível criar a unidade.' })
    }
  }

  static async createService(req, res) {
    try {
      const unitId = String(req.body?.unitId || '')
      const name = String(req.body?.name || '').trim()
      const slug = normalizeSlug(req.body?.slug || name)
      if (!mongoose.Types.ObjectId.isValid(unitId) || !name || !slug) return res.status(422).json({ message: 'Unidade e serviço são obrigatórios.' })
      if (!unitAllowed(req, unitId)) return res.status(403).json({ message: 'Sem permissão para esta unidade.' })
      if (!validAvailability(req.body?.weeklyAvailability)) return res.status(422).json({ message: 'A disponibilidade semanal é inválida.' })
      const unit = await AgendaUnit.findOne({ _id: unitId, active: true })
      if (!unit) return res.status(404).json({ message: 'Unidade não encontrada.' })
      const service = await AgendaService.create({
        unitId,
        name,
        slug,
        description: String(req.body?.description || '').trim(),
        durationMinutes: req.body?.durationMinutes,
        slotIntervalMinutes: req.body?.slotIntervalMinutes,
        minimumNoticeMinutes: req.body?.minimumNoticeMinutes,
        bookingWindowDays: req.body?.bookingWindowDays,
        cancellationNoticeMinutes: req.body?.cancellationNoticeMinutes,
        weeklyAvailability: req.body.weeklyAvailability,
        createdBy: actorId(req),
      })
      void recordAudit(req, {
        action: 'agenda.service.create', resourceType: 'agenda_service', resourceId: service._id,
        module: 'agenda-garca', eventType: 'CREATE', metadata: { unitId },
      })
      return res.status(201).json({ service })
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ message: 'Já existe esse serviço na unidade.' })
      if (error?.name === 'ValidationError') return res.status(422).json({ message: 'Configuração do serviço inválida.' })
      return res.status(500).json({ message: 'Não foi possível criar o serviço.' })
    }
  }

  static async createAssignment(req, res) {
    try {
      const userId = String(req.body?.userId || '')
      const unitId = req.body?.unitId ? String(req.body.unitId) : undefined
      const role = String(req.body?.role || '')
      if (!mongoose.Types.ObjectId.isValid(userId) || !['agenda_admin', 'agenda_manager', 'agenda_attendant'].includes(role)) {
        return res.status(422).json({ message: 'Usuário ou perfil inválido.' })
      }
      if (unitId && !mongoose.Types.ObjectId.isValid(unitId)) return res.status(422).json({ message: 'Unidade inválida.' })
      if (role !== 'agenda_admin' && !unitId) return res.status(422).json({ message: 'A unidade é obrigatória para gerente e atendente.' })
      if (!(await User.exists({ _id: userId }))) return res.status(404).json({ message: 'Usuário central não encontrado.' })
      if (unitId && !(await AgendaUnit.exists({ _id: unitId, active: true }))) return res.status(404).json({ message: 'Unidade não encontrada.' })
      const assignment = await AgendaUserAssignment.findOneAndUpdate(
        { userId, unitId: unitId || null, role },
        { $set: { active: true, grantedBy: actorId(req) }, $unset: { revokedBy: 1, revokedAt: 1 } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      )
      void recordAudit(req, {
        action: 'agenda.assignment.grant',
        resourceType: 'agenda_assignment',
        resourceId: assignment._id,
        module: 'agenda-garca',
        eventType: 'PERMISSION_CHANGE',
        metadata: { userId, unitId, role },
      })
      return res.status(201).json({ assignment })
    } catch (error) {
      return res.status(500).json({ message: 'Não foi possível conceder a permissão.' })
    }
  }

  static async upsertAvailabilityException(req, res) {
    try {
      const serviceId = String(req.params.id || '')
      const date = String(req.body?.date || '')
      const type = String(req.body?.type || '')
      const periods = Array.isArray(req.body?.periods) ? req.body.periods : []
      if (!mongoose.Types.ObjectId.isValid(serviceId) || !validDateKey(date) || !['closed', 'custom'].includes(type)) {
        return res.status(422).json({ message: 'Serviço, data ou tipo de exceção inválido.' })
      }
      if (type === 'custom' && !validPeriods(periods)) return res.status(422).json({ message: 'Os horários especiais são inválidos.' })
      if (type === 'closed' && periods.length) return res.status(422).json({ message: 'Uma data fechada não pode possuir horários.' })
      const service = await AgendaService.findById(serviceId).select('unitId active').lean()
      if (!service?.active) return res.status(404).json({ message: 'Serviço não encontrado.' })
      if (!unitAllowed(req, service.unitId)) return res.status(403).json({ message: 'Sem permissão para esta unidade.' })
      const exception = await AgendaAvailabilityException.findOneAndUpdate(
        { serviceId, date },
        {
          $set: {
            unitId: service.unitId,
            type,
            periods: type === 'custom' ? periods : [],
            reason: String(req.body?.reason || '').trim(),
            active: true,
            updatedBy: actorId(req),
          },
          $setOnInsert: { createdBy: actorId(req) },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      )
      void recordAudit(req, {
        action: 'agenda.availability_exception.upsert',
        resourceType: 'agenda_availability_exception',
        resourceId: exception._id,
        module: 'agenda-garca',
        eventType: 'UPDATE',
        metadata: { serviceId, date, type },
      })
      return res.status(200).json({ exception })
    } catch (error) {
      if (error?.name === 'ValidationError') return res.status(422).json({ message: 'Exceção de disponibilidade inválida.' })
      return res.status(500).json({ message: 'Não foi possível salvar a exceção de disponibilidade.' })
    }
  }
}
