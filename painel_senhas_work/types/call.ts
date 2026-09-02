export interface DisplayCall {
  /** ID de PainelSenha (API). */
  id: number
  ticket: string
  prefix: string
  number: number
  localName: string
  localNumber: number
  localLabel: string
  serviceId: number
  serviceName: string
  unitId?: number
  unitName?: string
  priorityName: string
  priorityWeight: number
  priorityColor: string | null
  clientName: string | null
  calledAt: string
  /** Fonte: api | mercure-refetch | demo | poll */
  source: 'api' | 'mercure' | 'demo' | 'poll'
}

export function callDedupeKey(
  call: Pick<DisplayCall, 'prefix' | 'number' | 'localName' | 'localNumber' | 'serviceId' | 'unitId'>,
): string {
  return [call.unitId ?? '', call.prefix, call.number, call.localName, call.localNumber, call.serviceId].join('|')
}
