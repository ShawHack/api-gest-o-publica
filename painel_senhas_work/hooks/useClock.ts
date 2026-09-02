import { useEffect, useState } from 'react'
import { formatClock } from '../utils/format'

export function useClock(intervalMs = 1000): { time: string; date: string } {
  const [now, setNow] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const id = setInterval(() => setNow(formatClock(new Date())), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
