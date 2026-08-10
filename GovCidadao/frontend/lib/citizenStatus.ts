export type OccurrenceStatusKey = 'open' | 'in_progress' | 'resolved' | 'canceled'

export const CITIZEN_STATUS_MESSAGES: Record<OccurrenceStatusKey, string> = {
    open:
        '📨 Sua solicitação foi recebida com sucesso.\n\nA Prefeitura de Garça já encaminhou sua manifestação para análise do setor responsável.\n\nEm breve teremos novas atualizações.',
    in_progress:
        '🚧 Seu atendimento está em andamento.\n\nNossa equipe já está trabalhando para resolver a situação informada.\n\nA Prefeitura de Garça agradece sua colaboração.',
    resolved:
        '✅ O problema informado foi resolvido.\n\nObrigado por colaborar com a melhoria da nossa cidade.\n\nA Prefeitura de Garça leva sua participação a sério e conta com você para continuar identificando situações que precisam de atenção.',
    canceled:
        'Sua solicitação foi cancelada. Em caso de dúvida, entre em contato com a Prefeitura de Garça.',
}

export const CITIZEN_STATUS_LABEL: Record<OccurrenceStatusKey, string> = {
    open: 'Ativa',
    in_progress: 'Em Execução',
    resolved: 'Encerrada',
    canceled: 'Cancelada',
}

export function formatProtocol(externalId: string | undefined): string {
    const short = (externalId || '').replace(/-/g, '').toUpperCase().slice(0, 8)
    return short ? `#${short}` : '#—'
}

export function citizenMessageForStatus(status: string): string {
    return CITIZEN_STATUS_MESSAGES[status as OccurrenceStatusKey] ?? 'A Prefeitura de Garça mantém você informado sobre sua solicitação.'
}

/** Título curto para badge (linguagem do cidadão, não código técnico). */
export function citizenStatusHeadline(status: string): string {
    const map: Record<OccurrenceStatusKey, string> = {
        open: 'Recebida — em análise',
        in_progress: 'Em atendimento',
        resolved: 'Concluída',
        canceled: 'Cancelada',
    }
    return map[status as OccurrenceStatusKey] ?? 'Em acompanhamento'
}

export type MineFilterKey = 'all' | 'active' | 'in_progress' | 'closed'

export function filterMineByTab<T extends { status: string }>(items: T[], tab: MineFilterKey): T[] {
    if (tab === 'all') return items
    if (tab === 'active') return items.filter((o) => o.status === 'open')
    if (tab === 'in_progress') return items.filter((o) => o.status === 'in_progress')
    return items.filter((o) => o.status === 'resolved' || o.status === 'canceled')
}
