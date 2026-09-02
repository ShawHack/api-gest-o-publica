import type { DisplayCall } from '../../types/call'
import { formatCallTime } from '../../utils/format'
import './CurrentCall.css'

export function CurrentCall({
  call,
  highlight,
  unitName,
}: {
  call: DisplayCall | null
  highlight: boolean
  unitName: string
}) {
  if (!call) {
    return (
      <section className="current-call current-call--empty" aria-label="Senha atual">
        <p className="current-call__waiting">Aguardando chamada</p>
        {unitName ? <p className="current-call__unit">{unitName}</p> : null}
      </section>
    )
  }

  const priority = call.priorityWeight > 0

  return (
    <section
      className={[
        'current-call',
        highlight ? 'current-call--flash' : '',
        priority ? 'current-call--priority' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-live="assertive"
      aria-label="Senha atual"
      style={priority && call.priorityColor ? { ['--priority-accent' as string]: call.priorityColor } : undefined}
    >
      <p className="current-call__eyebrow">{call.serviceName}</p>
      {call.clientName ? (
        <div style={{ margin: '.4rem 0', padding: '.3rem .8rem', background: 'rgba(255,255,255,0.14)', borderRadius: '.75rem', display: 'inline-block' }}>
          <span style={{ fontSize: 'clamp(1.3rem, 3vw, 2.4rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            👤 {call.clientName}
          </span>
        </div>
      ) : null}
      <h1 className="current-call__ticket">
        <span className="current-call__prefix">{call.prefix}</span>
        <span className="current-call__number">{String(call.number).padStart(3, '0')}</span>
      </h1>
      <p className="current-call__local">{call.localLabel}</p>
      <div className="current-call__meta">
        <span>{unitName || 'Unidade'}</span>
        {formatCallTime(call.calledAt) ? <span>{formatCallTime(call.calledAt)}</span> : null}
        {priority ? <span className="current-call__priority">{call.priorityName}</span> : null}
      </div>
    </section>
  )
}
