import type { DisplayCall } from '../../types/call'

let demoSeq = 900000

export function createDemoCall(overrides: Partial<DisplayCall> = {}): DisplayCall {
  demoSeq += 1
  const prefixes = ['A', 'B', 'P', 'SG']
  const locals = ['Guichê', 'Sala', 'Box']
  const services = [
    { id: 1, nome: 'Atendimento Geral' },
    { id: 2, nome: 'Protocolo' },
    { id: 3, nome: 'Triagem' },
  ]
  const prefix = overrides.prefix ?? prefixes[demoSeq % prefixes.length]
  const number = overrides.number ?? (demoSeq % 900) + 1
  const localName = overrides.localName ?? locals[demoSeq % locals.length]
  const localNumber = overrides.localNumber ?? (demoSeq % 12) + 1
  const service = services[demoSeq % services.length]

  return {
    id: overrides.id ?? demoSeq,
    ticket: `${prefix}${String(number).padStart(3, '0')}`,
    prefix,
    number,
    localName,
    localNumber,
    localLabel: `${localName} ${String(localNumber).padStart(2, '0')}`,
    serviceId: overrides.serviceId ?? service.id,
    serviceName: overrides.serviceName ?? service.nome,
    priorityName: overrides.priorityName ?? (demoSeq % 5 === 0 ? 'Prioridade' : 'Normal'),
    priorityWeight: overrides.priorityWeight ?? (demoSeq % 5 === 0 ? 1 : 0),
    priorityColor: overrides.priorityColor ?? '#e67e22',
    clientName: null,
    calledAt: overrides.calledAt ?? new Date().toISOString(),
    source: 'demo',
    ...overrides,
  }
}
