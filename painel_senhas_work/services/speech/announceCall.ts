import type { DisplayCall } from '../../types/call'
import { numberToWordsPtBr, spellPrefix } from './numberToWordsPtBr'

/** Locais femininos comuns no NovoSGA — usa "dirigir-se à". */
const FEMININE_LOCALS = /^(sala|mesa|secretaria|recepção|recepcao|portaria)/i

function normalizeLocalName(localName: string): string {
  return localName.trim().toLowerCase()
}

/** Ex.: "dirigir-se ao guichê quatro" / "dirigir-se à sala dois" */
export function formatDestinationPhrase(localName: string, localNumber: number): string {
  const local = normalizeLocalName(localName)
  const numberWords = numberToWordsPtBr(localNumber)

  if (!local) {
    return numberWords
  }

  const prep = FEMININE_LOCALS.test(local) ? 'à' : 'ao'
  return `dirigir-se ${prep} ${local} ${numberWords}`
}

/**
 * Segmentos falados em sequência:
 * alerta → "Senha" → sigla soletrada ("P R O") → número → destino
 * Ex.: ["Senha", "P R O", "cento e vinte e três", "dirigir-se ao guichê quatro"]
 */
export function buildAnnouncementParts(call: DisplayCall): string[] {
  const cleanName = (call.clientName || '').trim()
  const isAgendamento = call.prefix?.toUpperCase() === 'AG' || (call.priorityName || '').toLowerCase().includes('agend')

  if (cleanName) {
    if (isAgendamento) {
      return ['Agendamento', cleanName, formatDestinationPhrase(call.localName, call.localNumber)]
    }
    const parts: string[] = ['Senha']
    const spelled = spellPrefix(call.prefix)
    if (spelled) parts.push(spelled)
    parts.push(numberToWordsPtBr(call.number))
    parts.push(cleanName)
    parts.push(formatDestinationPhrase(call.localName, call.localNumber))
    return parts
  }

  const parts: string[] = ['Senha']
  const spelled = spellPrefix(call.prefix)
  if (spelled) parts.push(spelled)

  parts.push(numberToWordsPtBr(call.number))
  parts.push(formatDestinationPhrase(call.localName, call.localNumber))

  return parts
}

/** Frase única (legado / debug). Preferir `buildAnnouncementParts` na voz. */
export function buildAnnouncementText(call: DisplayCall): string {
  return buildAnnouncementParts(call).join(' ')
}
