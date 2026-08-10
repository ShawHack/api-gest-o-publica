const AuditLog = require('../models/AuditLog')
const { notifyHighComplianceAlert } = require('../helpers/compliance-notifier')
const { getMonitoringInfo } = require('../helpers/monitoring-info')

module.exports = class AuditLogController {
  static _severityByRatio(count, threshold) {
    const ratio = threshold > 0 ? count / threshold : 0
    if (ratio >= 2) return 'high'
    if (ratio >= 1) return 'medium'
    return 'low'
  }

  static _requiresAction(severity) {
    return severity === 'high' || severity === 'medium'
  }

  static _recommendation(type, severity) {
    if (type === 'denied_spike') {
      return severity === 'high'
        ? {
            recommendedAction: 'Abrir incidente de seguranca e aplicar mitigacao imediata de acesso.',
            playbook: ['validar origem do pico', 'aplicar rate limit emergencial', 'revisar regras de RBAC', 'notificar responsavel de seguranca'],
          }
        : {
            recommendedAction: 'Investigar aumento de negacoes e revisar permissoes por rota.',
            playbook: ['analisar endpoints mais negados', 'verificar alteracoes recentes', 'ajustar perfil de acesso se necessario'],
          }
    }

    if (type === 'repeated_actor_denied') {
      return severity === 'high'
        ? {
            recommendedAction: 'Suspender temporariamente o usuario e validar tentativa de abuso.',
            playbook: ['identificar ator', 'revisar trilha completa', 'bloquear sessao/token', 'solicitar justificativa formal'],
          }
        : {
            recommendedAction: 'Notificar gestor e revisar perfil de acesso do usuario.',
            playbook: ['confirmar necessidade de acesso', 'ajustar role/permissoes', 'registrar orientacao ao usuario'],
          }
    }

    if (type === 'repeated_ip_denied') {
      return severity === 'high'
        ? {
            recommendedAction: 'Bloquear IP em camada de borda e monitorar tentativas subsequentes.',
            playbook: ['aplicar bloqueio temporario no nginx/waf', 'verificar distribuicao por rotas', 'manter monitoramento por 24h'],
          }
        : {
            recommendedAction: 'Monitorar IP e aplicar limitacao progressiva.',
            playbook: ['habilitar throttle por IP', 'acompanhar recorrencia', 'elevar para bloqueio se persistir'],
          }
    }

    if (type === 'offhours_critical') {
      return {
        recommendedAction: 'Validar atividade fora de horario com aprovacao formal.',
        playbook: ['confirmar janela autorizada', 'validar identidade do ator', 'abrir incidente se nao autorizado'],
      }
    }

    return {
      recommendedAction: 'Investigar evento e registrar tratativa.',
      playbook: ['coletar evidencias', 'avaliar impacto', 'definir acao corretiva'],
    }
  }

  static async list(req, res) {
    try {
      const {
        action,
        resourceType,
        status,
        actorId,
        ip,
        module,
        eventType,
        clientApp,
        from,
        to,
        page = 1,
        limit = 50,
      } = req.query

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50))
      const skip = (pageNum - 1) * limitNum

      const filter = {}
      if (action) filter.action = action
      if (resourceType) filter.resourceType = resourceType
      if (status) filter.status = status
      if (actorId) filter.actorId = actorId
      if (ip) filter.ip = ip
      if (module) filter.module = module
      if (eventType) filter.eventType = eventType
      if (clientApp) filter['client.app'] = clientApp
      if (from || to) {
        filter.createdAt = {}
        if (from) filter.createdAt.$gte = new Date(from)
        if (to) filter.createdAt.$lte = new Date(to)
      }

      const [items, total] = await Promise.all([
        AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        AuditLog.countDocuments(filter),
      ])

      return res.status(200).json({
        items,
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.max(1, Math.ceil(total / limitNum)),
      })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao buscar trilha de auditoria.' })
    }
  }

  static async summary(req, res) {
    try {
      const { from, to } = req.query
      const dateFilter = {}
      if (from) dateFilter.$gte = new Date(from)
      if (to) dateFilter.$lte = new Date(to)

      const filter = {}
      if (Object.keys(dateFilter).length) {
        filter.createdAt = dateFilter
      }

      const [totalEvents, deniedEvents, errorEvents, byAction, deniedByAction, byModule, daily] = await Promise.all([
        AuditLog.countDocuments(filter),
        AuditLog.countDocuments({ ...filter, status: 'denied' }),
        AuditLog.countDocuments({ ...filter, status: 'error' }),
        AuditLog.aggregate([
          { $match: filter },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ]),
        AuditLog.aggregate([
          { $match: { ...filter, status: 'denied' } },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ]),
        AuditLog.aggregate([
          { $match: filter },
          { $group: { _id: '$module', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 15 },
        ]),
        AuditLog.aggregate([
          { $match: filter },
          {
            $group: {
              _id: {
                day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                status: '$status',
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.day': 1 } },
        ]),
      ])

      return res.status(200).json({
        totals: {
          events: totalEvents,
          denied: deniedEvents,
          errors: errorEvents,
          success: Math.max(totalEvents - deniedEvents - errorEvents, 0),
        },
        topActions: byAction.map((x) => ({ action: x._id || 'unknown', count: x.count })),
        topDeniedActions: deniedByAction.map((x) => ({ action: x._id || 'unknown', count: x.count })),
        byModule: byModule.map((x) => ({ module: x._id || 'api', count: x.count })),
        daily,
      })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao gerar resumo de compliance.' })
    }
  }

  static async alerts(req, res) {
    try {
      const {
        lookbackHours = 24,
        deniedSpikeThreshold = 30,
        repeatedDeniedThreshold = 10,
        offHoursStart = 20,
        offHoursEnd = 6,
        notifyHigh = 'false',
        notifyCooldownMinutes = 15,
      } = req.query

      const now = new Date()
      const hours = Math.max(1, Math.min(168, parseInt(lookbackHours, 10) || 24))
      const since = new Date(now.getTime() - hours * 60 * 60 * 1000)
      const spikeThreshold = Math.max(1, parseInt(deniedSpikeThreshold, 10) || 30)
      const repeatedThreshold = Math.max(1, parseInt(repeatedDeniedThreshold, 10) || 10)
      const offStart = Math.max(0, Math.min(23, parseInt(offHoursStart, 10) || 20))
      const offEnd = Math.max(0, Math.min(23, parseInt(offHoursEnd, 10) || 6))

      const baseFilter = { createdAt: { $gte: since } }

      const [
        deniedPerHour,
        repeatedDeniedByActor,
        repeatedDeniedByIp,
        offHoursCritical,
      ] = await Promise.all([
        AuditLog.aggregate([
          { $match: { ...baseFilter, status: 'denied' } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' },
                hour: { $hour: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gte: spikeThreshold } } },
          { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.hour': -1 } },
          { $limit: 50 },
        ]),
        AuditLog.aggregate([
          { $match: { ...baseFilter, status: 'denied', actorId: { $ne: null } } },
          { $group: { _id: '$actorId', count: { $sum: 1 }, lastAt: { $max: '$createdAt' } } },
          { $match: { count: { $gte: repeatedThreshold } } },
          { $sort: { count: -1 } },
          { $limit: 50 },
        ]),
        AuditLog.aggregate([
          { $match: { ...baseFilter, status: 'denied', ip: { $ne: null, $ne: '' } } },
          { $group: { _id: '$ip', count: { $sum: 1 }, lastAt: { $max: '$createdAt' } } },
          { $match: { count: { $gte: repeatedThreshold } } },
          { $sort: { count: -1 } },
          { $limit: 50 },
        ]),
        AuditLog.aggregate([
          {
            $match: {
              ...baseFilter,
              action: {
                $in: [
                  'user.delete',
                  'user.admin_delete',
                  'form.delete',
                  'form.inscription_delete',
                  'sepultado.delete',
                  'tree.delete',
                  'pet.delete',
                  'denounce.update_status',
                ],
              },
            },
          },
          {
            $addFields: {
              hour: { $hour: '$createdAt' },
            },
          },
          {
            $match: offStart > offEnd
              ? { $or: [{ hour: { $gte: offStart } }, { hour: { $lte: offEnd } }] }
              : { hour: { $gte: offStart, $lte: offEnd } },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 100 },
        ]),
      ])

      const responsePayload = {
        window: { since, until: now, lookbackHours: hours },
        thresholds: {
          deniedSpikeThreshold: spikeThreshold,
          repeatedDeniedThreshold: repeatedThreshold,
          offHoursStart: offStart,
          offHoursEnd: offEnd,
        },
        alerts: {
          deniedSpikes: deniedPerHour.map((x) => {
            const severity = AuditLogController._severityByRatio(x.count, spikeThreshold)
            const recommendation = AuditLogController._recommendation('denied_spike', severity)
            return {
            bucket: x._id,
            count: x.count,
            severity,
            requiresAction: AuditLogController._requiresAction(severity),
            ...recommendation,
            }
          }),
          repeatedDeniedByActor: repeatedDeniedByActor.map((x) => {
            const severity = AuditLogController._severityByRatio(x.count, repeatedThreshold)
            const recommendation = AuditLogController._recommendation('repeated_actor_denied', severity)
            return {
            actorId: x._id,
            count: x.count,
            lastAt: x.lastAt,
            severity,
            requiresAction: AuditLogController._requiresAction(severity),
            ...recommendation,
            }
          }),
          repeatedDeniedByIp: repeatedDeniedByIp.map((x) => {
            const severity = AuditLogController._severityByRatio(x.count, repeatedThreshold)
            const recommendation = AuditLogController._recommendation('repeated_ip_denied', severity)
            return {
            ip: x._id,
            count: x.count,
            lastAt: x.lastAt,
            severity,
            requiresAction: AuditLogController._requiresAction(severity),
            ...recommendation,
            }
          }),
          offHoursCriticalActions: offHoursCritical.map((x) => ({
            ...x,
            severity: 'high',
            requiresAction: true,
            ...AuditLogController._recommendation('offhours_critical', 'high'),
          })),
        },
        overview: {
          requiresActionCount:
            deniedPerHour.length +
            repeatedDeniedByActor.length +
            repeatedDeniedByIp.length +
            offHoursCritical.length,
          highestSeverity:
            offHoursCritical.length > 0 ||
            deniedPerHour.some((x) => AuditLogController._severityByRatio(x.count, spikeThreshold) === 'high') ||
            repeatedDeniedByActor.some((x) => AuditLogController._severityByRatio(x.count, repeatedThreshold) === 'high') ||
            repeatedDeniedByIp.some((x) => AuditLogController._severityByRatio(x.count, repeatedThreshold) === 'high')
              ? 'high'
              : (deniedPerHour.length + repeatedDeniedByActor.length + repeatedDeniedByIp.length) > 0
                ? 'medium'
                : 'low',
        },
      }

      const shouldNotify = String(notifyHigh).toLowerCase() === 'true'
      if (shouldNotify && responsePayload.overview.highestSeverity === 'high') {
        const cooldownMin = Math.max(1, Math.min(1440, parseInt(notifyCooldownMinutes, 10) || 15))
        const cooldownSince = new Date(Date.now() - cooldownMin * 60 * 1000)

        const lastNotification = await AuditLog.findOne({
          action: 'compliance.high_alert_notification_sent',
          createdAt: { $gte: cooldownSince },
        })
          .sort({ createdAt: -1 })
          .lean()

        if (lastNotification) {
          responsePayload.notification = {
            skipped: true,
            reason: 'cooldown_active',
            cooldownMinutes: cooldownMin,
            lastSentAt: lastNotification.createdAt,
          }
        } else {
          const notificationResult = await notifyHighComplianceAlert(responsePayload)
          responsePayload.notification = notificationResult
          await AuditLog.create({
            action: 'compliance.high_alert_notification_sent',
            resourceType: 'compliance_alert',
            status: 'success',
            metadata: {
              highestSeverity: responsePayload.overview.highestSeverity,
              requiresActionCount: responsePayload.overview.requiresActionCount,
              cooldownMinutes: cooldownMin,
            },
          })
        }
      } else {
        responsePayload.notification = { skipped: true }
      }

      return res.status(200).json(responsePayload)
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao gerar alertas de compliance.' })
    }
  }

  static async monitoringInfo(_req, res) {
    try {
      return res.status(200).json(getMonitoringInfo())
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao obter informações de monitoramento.' })
    }
  }
}
