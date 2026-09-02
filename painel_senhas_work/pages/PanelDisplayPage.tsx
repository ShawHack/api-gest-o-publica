import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePanel } from '../features/calls/usePanel'
import { getPanel } from '../services/api/panelsApi'
import { DisplayPage } from './DisplayPage'

export function PanelDisplayPage() {
  const { slug = '' } = useParams()
  const { bootstrapManagedPanel } = usePanel()
  const [error, setError] = useState<string | null>(null)
  const [readySlug, setReadySlug] = useState<string | null>(null)
  const bootstrapRef = useRef(bootstrapManagedPanel)
  bootstrapRef.current = bootstrapManagedPanel

  useEffect(() => {
    let cancelled = false
    setError(null)
    setReadySlug(null)

    void getPanel(slug)
      .then(async (panel) => {
        if (cancelled) return
        if (panel.status === 'rascunho') {
          setError('Este painel está em rascunho. Publique-o na administração.')
          return
        }
        await bootstrapRef.current(panel)
        if (cancelled) return
        setReadySlug(slug)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Painel não encontrado')
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  if (error) {
    return (
      <div className="admin-page">
        <h1>Painel indisponível</h1>
        <p>{error}</p>
        <Link to="/admin">Ir para administração</Link>
      </div>
    )
  }

  if (readySlug !== slug) {
    return (
      <div className="admin-page">
        <p>Carregando painel <strong>{slug}</strong>…</p>
      </div>
    )
  }

  return <DisplayPage />
}
