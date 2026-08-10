'use client'

import { formatProtocol } from '../../lib/citizenStatus'

export type SuccessOccurrencePayload = {
    id: string
    external_id?: string
    created_at: string
    secretariatName: string
}

type Props = {
    open: boolean
    occurrence: SuccessOccurrencePayload | null
    onTrack: () => void
    onHome: () => void
}

export function CitizenSuccessModal({ open, occurrence, onTrack, onHome }: Props) {
    if (!open || !occurrence) return null

    const created = new Date(occurrence.created_at)
    const dateLabel = Number.isNaN(created.getTime())
        ? '—'
        : created.toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })

    return (
        <div className="garca-success-overlay" role="dialog" aria-modal="true" aria-labelledby="garca-success-title">
            <div className="garca-success-card">
                <div className="garca-success-icon" aria-hidden="true">
                    ✅
                </div>
                <h2 id="garca-success-title" className="garca-success-title">
                    Sua reclamação foi registrada com sucesso
                </h2>
                <p className="garca-success-lead">
                    A Prefeitura de Garça leva sua manifestação a sério e sua solicitação já foi encaminhada ao setor
                    responsável.
                </p>
                <p className="garca-success-lead garca-success-lead--muted">
                    Você poderá acompanhar o andamento diretamente pelo aplicativo e também receberá atualizações por
                    notificações e e-mail.
                </p>
                <dl className="garca-success-meta">
                    <div>
                        <dt>Protocolo</dt>
                        <dd>{formatProtocol(occurrence.external_id)}</dd>
                    </div>
                    <div>
                        <dt>Data e hora</dt>
                        <dd>{dateLabel}</dd>
                    </div>
                    <div>
                        <dt>Secretaria responsável</dt>
                        <dd>{occurrence.secretariatName || '—'}</dd>
                    </div>
                </dl>
                <div className="garca-success-actions">
                    <button type="button" className="garca-success-btn garca-success-btn--primary" onClick={onTrack}>
                        Acompanhar solicitação
                    </button>
                    <button type="button" className="garca-success-btn garca-success-btn--ghost" onClick={onHome}>
                        Voltar ao início
                    </button>
                </div>
            </div>
        </div>
    )
}
