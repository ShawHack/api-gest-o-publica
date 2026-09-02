import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createPanel,
  deletePanel,
  listPanels,
} from '../services/api/panelsApi'
import {
  getStoredAdminPinHash,
  verifyAdminPin,
} from '../services/storage/localConfig'
import { isAdminUnlocked, setAdminUnlocked } from '../services/storage/sessionAuth'
import type { ManagedPanel } from '../types/panel'
import './AdminPanelsPage.css'

export function AdminPanelsPage() {
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked())
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [panels, setPanels] = useState<ManagedPanel[]>([])
  const [status, setStatus] = useState('')
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const list = await listPanels()
      setPanels(list)
      setStatus('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao listar painéis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (unlocked) void refresh()
  }, [unlocked])

  async function handleUnlock(event: FormEvent) {
    event.preventDefault()
    const ok = await verifyAdminPin(pin)
    if (!ok) {
      setPinError('PIN incorreto')
      return
    }
    setAdminUnlocked(true)
    setUnlocked(true)
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    try {
      const panel = await createPanel({
        name: newName.trim(),
        panelTitle: newName.trim(),
        units: [],
        status: 'publicado',
      })
      setNewName('')
      await refresh()
      navigate(`/admin/paineis/${panel.id}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao criar painel')
    }
  }

  async function handleDelete(panel: ManagedPanel) {
    if (!confirm(`Excluir o painel "${panel.name}"?`)) return
    try {
      await deletePanel(panel.id)
      await refresh()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao excluir')
    }
  }

  if (!unlocked) {
    const hasPin = Boolean(getStoredAdminPinHash())
    return (
      <div className="admin-gate">
        <form className="admin-card" onSubmit={(e) => void handleUnlock(e)}>
          <h1>Administração de painéis</h1>
          <p>
            {hasPin
              ? 'Informe o PIN local para gerenciar os painéis da SEMIT.'
              : 'Nenhum PIN definido. Continue para gerenciar os painéis.'}
          </p>
          {hasPin ? (
            <label>
              PIN
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} required />
            </label>
          ) : null}
          {pinError ? <p className="admin-error">{pinError}</p> : null}
          <button type="submit">Entrar</button>
        </form>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Prefeitura de Garça — SEMIT</p>
          <h1>Painéis</h1>
          <p>Gerencie quantos painéis forem necessários (um por setor, TV ou conjunto de unidades).</p>
        </div>
        <form className="admin-create" onSubmit={(e) => void handleCreate(e)}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do novo painel (ex.: SEDETUR)"
            required
          />
          <button type="submit">+ Novo painel</button>
        </form>
      </header>

      {status ? <p className="admin-status">{status}</p> : null}
      {loading ? <p className="admin-hint">Carregando…</p> : null}

      <section className="admin-table-wrap">
        <h2>Meus painéis</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Slug</th>
              <th>Unidades</th>
              <th>Situação</th>
              <th>Link</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {panels.length === 0 ? (
              <tr>
                <td colSpan={7}>Nenhum painel ainda. Crie o primeiro acima.</td>
              </tr>
            ) : (
              panels.map((panel, index) => (
                <tr key={panel.id}>
                  <td>{index + 1}</td>
                  <td>{panel.name}</td>
                  <td>
                    <code>{panel.slug}</code>
                  </td>
                  <td>{panel.units?.length || 0}</td>
                  <td>
                    <span className={`admin-badge admin-badge--${panel.status}`}>
                      {panel.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td>
                    <Link to={`/p/${panel.slug}`} target="_blank" rel="noreferrer">
                      /p/{panel.slug}
                    </Link>
                  </td>
                  <td className="admin-actions">
                    <Link to={`/admin/paineis/${panel.id}`}>Editar</Link>
                    <Link to={`/p/${panel.slug}`}>Abrir</Link>
                    <button type="button" onClick={() => void handleDelete(panel)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
