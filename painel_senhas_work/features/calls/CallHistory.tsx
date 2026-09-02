import type { DisplayCall } from '../../types/call'
import { formatCallTime } from '../../utils/format'
import './CallHistory.css'

export function CallHistory({ items }: { items: DisplayCall[] }) {
  return (
    <aside className="call-history" aria-label="Histórico de chamadas">
      <h2 className="call-history__title">Últimas chamadas</h2>
      {items.length === 0 ? (
        <p className="call-history__empty">Nenhuma chamada anterior</p>
      ) : (
        <ul className="call-history__list">
          {items.map((item) => (
            <li key={`${item.id}-${item.calledAt}`} className="call-history__item">
              <div className="call-history__ticket">{item.ticket}</div>
              <div className="call-history__local">{item.localLabel}</div>
              <div className="call-history__service">
                {item.serviceName}
                {item.unitName ? ` · ${item.unitName}` : ''}
              </div>
              <div className="call-history__time">{formatCallTime(item.calledAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
