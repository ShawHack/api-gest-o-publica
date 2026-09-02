import { useClock } from '../hooks/useClock'
import './Clock.css'

export function Clock() {
  const { time, date } = useClock()
  return (
    <div className="panel-clock" aria-live="polite">
      <div className="panel-clock__time">{time}</div>
      <div className="panel-clock__date">{date}</div>
    </div>
  )
}
