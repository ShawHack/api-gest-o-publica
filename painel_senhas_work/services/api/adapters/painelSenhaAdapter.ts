import type { DisplayCall } from '../../../types/call'
import type { NovoSgaPainelSenhaRaw } from '../../../types/novosga'
import { painelSenhaSchema } from './schemas'

function padLocal(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDisplayCall(
  raw: NovoSgaPainelSenhaRaw,
  source: DisplayCall['source'] = 'api',
  calledAt?: string,
): DisplayCall {
  return {
    id: raw.id,
    ticket: raw.senha,
    prefix: raw.siglaSenha,
    number: raw.numeroSenha,
    localName: raw.local,
    localNumber: raw.numeroLocal,
    localLabel: `${raw.local} ${padLocal(raw.numeroLocal)}`,
    serviceId: raw.servico.id,
    serviceName: raw.servico.nome,
    priorityName: raw.prioridade,
    priorityWeight: raw.peso,
    priorityColor: raw.corPrioridade ?? null,
    clientName: raw.nomeCliente ?? null,
    calledAt: calledAt || '',
    source,
  }
}

export function parsePainelSenha(input: unknown, source: DisplayCall['source'] = 'api'): DisplayCall {
  const parsed = painelSenhaSchema.parse(input)
  const normalized: NovoSgaPainelSenhaRaw = {
    ...parsed,
    corPrioridade: parsed.corPrioridade ?? null,
    nomeCliente: parsed.nomeCliente ?? null,
    documentoCliente: parsed.documentoCliente ?? null,
  }
  return toDisplayCall(normalized, source)
}

export function parsePainelSenhaList(input: unknown, source: DisplayCall['source'] = 'api'): DisplayCall[] {
  if (!Array.isArray(input)) {
    throw new Error('Resposta do painel não é uma lista')
  }
  return input.map((item) => parsePainelSenha(item, source))
}
