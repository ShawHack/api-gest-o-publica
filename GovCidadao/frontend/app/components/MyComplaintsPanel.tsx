'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    citizenMessageForStatus,
    citizenStatusHeadline,
    filterMineByTab,
    formatProtocol,
    type MineFilterKey,
} from '../../lib/citizenStatus'

export type MineOccurrence = {
    id: string
    external_id?: string
    title: string
    description?: string
    status: 'open' | 'in_progress' | 'resolved' | 'canceled'
    urgency: string
    secretariat_id: string | null
    category_id: string | null
    address: string | null
    number?: string | null
    neighborhood: string | null
    created_at: string
    updated_at?: string
    priority_score: number
}

export type HistoryEntry = {
    id: string
    message: string
    created_at: string
    event_type: string
}

type Props = {
    apiBase: string
    getHeaders: () => Record<string, string>
    fetchJson: (url: string, headers: Record<string, string>, timeoutMs?: number) => Promise<unknown>
    secretariatName: (id: string | null) => string
    categoryName: (id: string | null) => string
    initialOccurrenceId?: string | null
    unreadCount?: number
    onRefreshNotifications?: () => void
}

const URGENCY_LABEL: Record<string, string> = {
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
}

const FILTER_TABS: { key: MineFilterKey; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'active', label: 'Ativas' },
    { key: 'in_progress', label: 'Em Execução' },
    { key: 'closed', label: 'Encerradas' },
]

function formatDt(value: string | undefined): string {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function composeAddress(occ: MineOccurrence): string {
    const parts = [occ.address, occ.number, occ.neighborhood].filter((p) => p && String(p).trim())
    return parts.length ? parts.join(', ') : '—'
}

export function MyComplaintsPanel({
    apiBase,
    getHeaders,
    fetchJson,
    secretariatName,
    categoryName,
    initialOccurrenceId,
    unreadCount = 0,
    onRefreshNotifications,
}: Props) {
    const [items, setItems] = useState<MineOccurrence[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<MineFilterKey>('all')
    const [protocolSearch, setProtocolSearch] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(initialOccurrenceId ?? null)
    const [history, setHistory] = useState<HistoryEntry[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)

    const loadMine = useCallback(async () => {
        setLoading(true)
        try {
            const q = protocolSearch.trim() ? `?protocol=${encodeURIComponent(protocolSearch.trim())}` : ''
            const data = await fetchJson(`${apiBase}/occurrences/mine${q}`, getHeaders(), 20000)
            if (Array.isArray(data)) setItems(data as MineOccurrence[])
        } finally {
            setLoading(false)
        }
    }, [apiBase, fetchJson, getHeaders, protocolSearch])

    useEffect(() => {
        loadMine()
        const timer = window.setInterval(loadMine, 60000)
        return () => window.clearInterval(timer)
    }, [loadMine])

    useEffect(() => {
        if (initialOccurrenceId) setSelectedId(initialOccurrenceId)
    }, [initialOccurrenceId])

    const filtered = useMemo(() => filterMineByTab(items, filter), [items, filter])
    const selected = filtered.find((o) => o.id === selectedId) ?? items.find((o) => o.id === selectedId) ?? null

    useEffect(() => {
        if (!selected) {
            setHistory([])
            return
        }
        let cancelled = false
        const loadHistory = async () => {
            setHistoryLoading(true)
            try {
                const data = await fetchJson(`${apiBase}/occurrences/${selected.id}/history`, getHeaders(), 15000)
                if (!cancelled && Array.isArray(data)) setHistory(data as HistoryEntry[])
            } finally {
                if (!cancelled) setHistoryLoading(false)
            }
        }
        loadHistory()
        return () => {
            cancelled = true
        }
    }, [apiBase, fetchJson, getHeaders, selected])

    return (
        <div className="garca-minhas-wrap">
            <div className="garca-minhas-header">
                <div>
                    <h2 className="garca-minhas-title">Minhas Reclamações</h2>
                    <p className="garca-minhas-sub">
                        Acompanhe todas as suas solicitações e o histórico de movimentações.
                    </p>
                </div>
                {unreadCount > 0 && (
                    <div className="garca-minhas-badge" role="status">
                        {unreadCount === 1
                            ? 'Você possui uma nova atualização'
                            : `Você possui ${unreadCount} atualizações`}
                    </div>
                )}
            </div>

            <div className="garca-minhas-toolbar">
                <div className="garca-minhas-filters" role="tablist" aria-label="Filtrar solicitações">
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={filter === tab.key}
                            className={`garca-minhas-filter${filter === tab.key ? ' is-active' : ''}`}
                            onClick={() => setFilter(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="garca-minhas-search">
                    <input
                        type="search"
                        placeholder="Buscar por protocolo"
                        value={protocolSearch}
                        onChange={(e) => setProtocolSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') loadMine()
                        }}
                        aria-label="Buscar por protocolo"
                    />
                    <button type="button" onClick={() => loadMine()}>
                        Buscar
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="garca-minhas-empty">Carregando suas solicitações...</p>
            ) : filtered.length === 0 ? (
                <p className="garca-minhas-empty">Nenhuma solicitação encontrada para este filtro.</p>
            ) : (
                <div className="garca-minhas-grid">
                    <div className="garca-minhas-list">
                        {filtered.map((occ) => {
                            const isSelected = selectedId === occ.id
                            return (
                                <button
                                    key={occ.id}
                                    type="button"
                                    className={`garca-minhas-card${isSelected ? ' is-selected' : ''}`}
                                    onClick={() => {
                                        setSelectedId(occ.id)
                                        onRefreshNotifications?.()
                                    }}
                                >
                                    <div className="garca-minhas-card-top">
                                        <span className="garca-minhas-protocol">{formatProtocol(occ.external_id)}</span>
                                        <span
                                            className={`garca-minhas-status garca-minhas-status--${occ.status}`}
                                            aria-label={`Situação: ${citizenStatusHeadline(occ.status)}`}
                                        >
                                            {citizenStatusHeadline(occ.status)}
                                        </span>
                                    </div>
                                    <h3>{occ.title}</h3>
                                    <p className="garca-minhas-meta">
                                        {categoryName(occ.category_id)} · {secretariatName(occ.secretariat_id)}
                                    </p>
                                    <div
                                        className={`garca-minhas-card-msg garca-minhas-card-msg--${occ.status}`}
                                        role="status"
                                        aria-live="polite"
                                    >
                                        {citizenMessageForStatus(occ.status)}
                                    </div>
                                    <p className="garca-minhas-meta">
                                        Abertura: {formatDt(occ.created_at)} · Atualização:{' '}
                                        {formatDt(occ.updated_at || occ.created_at)}
                                    </p>
                                    <p className="garca-minhas-meta">
                                        Prioridade: {URGENCY_LABEL[occ.urgency] ?? occ.urgency} · {composeAddress(occ)}
                                    </p>
                                </button>
                            )
                        })}
                    </div>

                    <div className="garca-minhas-detail">
                        {!selected ? (
                            <p className="garca-minhas-empty">Selecione uma solicitação para ver detalhes.</p>
                        ) : (
                            <>
                                <h3>{selected.title}</h3>
                                <p className="garca-minhas-detail-headline">{citizenStatusHeadline(selected.status)}</p>
                                <p className="garca-minhas-citizen-msg">{citizenMessageForStatus(selected.status)}</p>
                                <dl className="garca-minhas-detail-meta">
                                    <div>
                                        <dt>Protocolo</dt>
                                        <dd>{formatProtocol(selected.external_id)}</dd>
                                    </div>
                                    <div>
                                        <dt>Situação</dt>
                                        <dd>{citizenStatusHeadline(selected.status)}</dd>
                                    </div>
                                    <div>
                                        <dt>Endereço</dt>
                                        <dd>{composeAddress(selected)}</dd>
                                    </div>
                                </dl>
                                <h4 className="garca-minhas-timeline-title">Histórico de movimentações</h4>
                                {historyLoading ? (
                                    <p className="garca-minhas-empty">Carregando histórico...</p>
                                ) : history.length === 0 ? (
                                    <p className="garca-minhas-empty">Nenhum evento registrado ainda.</p>
                                ) : (
                                    <ol className="garca-minhas-timeline">
                                        {history.map((entry) => (
                                            <li key={entry.id}>
                                                <time dateTime={entry.created_at}>{formatDt(entry.created_at)}</time>
                                                <span>{entry.message}</span>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
