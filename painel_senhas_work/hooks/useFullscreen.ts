import { useCallback, useEffect, useState } from 'react'

export function useFullscreen(target?: HTMLElement | null) {
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenElement),
  )

  const sync = useCallback(() => {
    setIsFullscreen(Boolean(document.fullscreenElement))
  }, [])

  useEffect(() => {
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [sync])

  const enter = useCallback(async () => {
    const el = target ?? document.documentElement
    if (!document.fullscreenElement) {
      await el.requestFullscreen()
    }
    sync()
  }, [target, sync])

  const exit = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
    sync()
  }, [sync])

  const toggle = useCallback(async () => {
    if (document.fullscreenElement) {
      await exit()
    } else {
      await enter()
    }
  }, [enter, exit])

  return { isFullscreen, enter, exit, toggle, sync }
}
