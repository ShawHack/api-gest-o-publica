import { useContext } from 'react'
import { PanelContext, type PanelContextValue } from './panelContextValue'

export function usePanel(): PanelContextValue {
  const ctx = useContext(PanelContext)
  if (!ctx) {
    throw new Error('usePanel deve ser usado dentro de PanelProvider')
  }
  return ctx
}
